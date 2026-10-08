// SPDX-License-Identifier: AGPL-3.0-only
// SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

//! the segment state machine. pure: it is driven by `on_event` / `on_tick`
//! with explicit timestamps and writes through `Store`, so the tests below run
//! it against an in-memory store with a scripted clock.
//!
//! one open segment at a time. a segment is `(timer, kind, app)`; the open one
//! is closed and a new one inserted whenever that triple changes. idle, sleep
//! and lock are `idle` segments named `Idle` / `Sleep` / `Locked`; the first
//! two are "system idle" and only end on wake / unlock, `Idle` ends on input.

use std::collections::HashSet;

use super::denylist;
use super::platform::{ForegroundApp, PlatformEvent};
use super::store::{Kind, Store};

/// seconds without input before the active segment turns into `Idle`
pub(crate) const IDLE_THRESHOLD_SECS: f64 = 180.0;
/// how often the open row's `last_seen_at` is refreshed
pub(crate) const HEARTBEAT_MS: i64 = 15_000;
/// a tick this late means the os suspended us. mirrors `tray.rs`.
pub(crate) const SLEEP_GAP_MS: i64 = 45_000;
/// icons older than this are captured again
pub(crate) const ICON_TTL_MS: i64 = 30 * 24 * 60 * 60 * 1000;

const NAME_IDLE: &str = "Idle";
const NAME_SLEEP: &str = "Sleep";
const NAME_LOCKED: &str = "Locked";
const NAME_UNKNOWN: &str = "Unknown";

struct Open {
    id: i64,
    kind: Kind,
    app_id: String,
    name: String,
    started_at: i64,
    last_beat: i64,
}

impl Open {
    fn is_idle(&self) -> bool {
        self.kind == Kind::Idle
    }

    /// sleep / locked: ends on an os event, not on input
    fn is_system_idle(&self) -> bool {
        self.kind == Kind::Idle && self.name != NAME_IDLE
    }
}

/// apps whose icon should be captured, returned by every entry point
pub(crate) type IconRequests = Vec<ForegroundApp>;

pub(crate) struct Tracker<S: Store> {
    store: S,
    timer_id: i64,
    open: Option<Open>,
    /// one icon lookup per app per session
    seen_icons: HashSet<String>,
    prev_tick: Option<i64>,
    /// most recent real app, used to resume after idle / wake / unlock
    last_app: Option<ForegroundApp>,
    /// windows wakes to the lock screen; a wake while locked stays `Locked`
    locked: bool,
}

impl<S: Store> Tracker<S> {
    pub(crate) fn new(store: S, timer_id: i64) -> Self {
        Self {
            store,
            timer_id,
            open: None,
            seen_icons: HashSet::new(),
            prev_tick: None,
            last_app: None,
            locked: false,
        }
    }

    /// sweeps crash leftovers and opens the first segment from `polled`
    pub(crate) fn start(&mut self, now: i64, polled: Option<ForegroundApp>) -> Result<IconRequests, String> {
        self.store.sweep_open()?;
        self.prev_tick = Some(now);
        let mut requests = Vec::new();
        match polled.filter(|app| !denylist::is_denied(&app.id)) {
            Some(app) => self.switch_to_app(app, now, &mut requests)?,
            None => {
                self.set_segment(now, Kind::Unknown, "", NAME_UNKNOWN)?;
            }
        }
        Ok(requests)
    }

    pub(crate) fn on_event(&mut self, event: PlatformEvent, now: i64, polled: Option<ForegroundApp>) -> Result<IconRequests, String> {
        let mut requests = Vec::new();
        match event {
            PlatformEvent::Foreground(app) => self.on_foreground(app, now, &mut requests)?,
            PlatformEvent::Sleep => {
                self.set_segment(now, Kind::Idle, "", NAME_SLEEP)?;
            }
            PlatformEvent::Lock => {
                self.locked = true;
                self.set_segment(now, Kind::Idle, "", NAME_LOCKED)?;
            }
            PlatformEvent::Unlock => {
                self.locked = false;
                if self.open.as_ref().is_some_and(Open::is_system_idle) {
                    self.resume(now, polled, &mut requests)?;
                }
            }
            PlatformEvent::Wake => {
                if self.open.as_ref().is_some_and(Open::is_system_idle) {
                    if self.locked {
                        self.set_segment(now, Kind::Idle, "", NAME_LOCKED)?;
                    } else {
                        self.resume(now, polled, &mut requests)?;
                    }
                }
            }
            PlatformEvent::Icon { app_id, png, size } => self.store.upsert_icon(&app_id, png.as_deref(), size, now)?,
            PlatformEvent::Stop => {}
        }
        Ok(requests)
    }

    /// once a second: suspend detection, idle transitions, poll reconciliation, heartbeat
    pub(crate) fn on_tick(&mut self, now: i64, idle_secs: Option<f64>, polled: Option<ForegroundApp>) -> Result<IconRequests, String> {
        let mut requests = Vec::new();
        let prev = self.prev_tick.replace(now);

        // the os slept without telling us (no event arrived, or the platform
        // has none). the gap itself is the sleep segment.
        if let Some(prev) = prev
            && now - prev >= SLEEP_GAP_MS
            && !self.open.as_ref().is_some_and(Open::is_system_idle)
        {
            self.close_open(prev)?;
            let sleep = self.store.insert_segment(self.timer_id, Kind::Idle, "", NAME_SLEEP, prev)?;
            self.store.close_segment(sleep, now)?;
            self.resume(now, polled, &mut requests)?;
            return Ok(requests);
        }

        if self.open.as_ref().is_some_and(Open::is_system_idle) {
            self.heartbeat_if_due(now)?;
            return Ok(requests);
        }

        if let Some(secs) = idle_secs {
            let in_idle = self.open.as_ref().is_some_and(Open::is_idle);
            if secs >= IDLE_THRESHOLD_SECS && !in_idle {
                // the idle segment starts when input stopped, not when we noticed
                let since = now - (secs * 1000.0) as i64;
                let at = self.open.as_ref().map_or(since, |open| since.max(open.started_at));
                self.close_open(at)?;
                self.open_segment(at, Kind::Idle, "", NAME_IDLE)?;
            } else if secs < IDLE_THRESHOLD_SECS && in_idle {
                self.resume(now, polled.clone(), &mut requests)?;
            }
        }

        if !self.open.as_ref().is_some_and(Open::is_idle) {
            // catches activations the event path missed (full-screen spaces,
            // a busy hook thread) and corrects the first segment after start
            self.on_foreground(polled, now, &mut requests)?;
        }
        self.heartbeat_if_due(now)?;
        Ok(requests)
    }

    fn on_foreground(&mut self, app: Option<ForegroundApp>, now: i64, requests: &mut IconRequests) -> Result<(), String> {
        // `None` is a transient no-window state, not something the user did
        let Some(app) = app else { return Ok(()) };
        // dock, spotlight, lock screen: the time stays with the previous app
        if denylist::is_denied(&app.id) {
            return Ok(());
        }
        self.last_app = Some(app.clone());
        // while idle nothing is attributed; `resume` picks `last_app` up
        if self.open.as_ref().is_some_and(Open::is_idle) {
            return Ok(());
        }
        self.switch_to_app(app, now, requests)
    }

    /// leaves an idle segment: back to the polled app, else the last one seen
    fn resume(&mut self, now: i64, polled: Option<ForegroundApp>, requests: &mut IconRequests) -> Result<(), String> {
        self.close_open(now)?;
        let app = polled.filter(|app| !denylist::is_denied(&app.id)).or_else(|| self.last_app.clone());
        match app {
            Some(app) => self.switch_to_app(app, now, requests),
            None => self.set_segment(now, Kind::Unknown, "", NAME_UNKNOWN).map(|_| ()),
        }
    }

    fn switch_to_app(&mut self, app: ForegroundApp, now: i64, requests: &mut IconRequests) -> Result<(), String> {
        let opened = self.set_segment(now, Kind::Active, &app.id, &app.name)?;
        if opened && self.needs_icon(&app.id, now)? {
            requests.push(app);
        }
        Ok(())
    }

    /// closes the open segment and opens a new one unless it already matches.
    /// returns whether a new segment was opened.
    fn set_segment(&mut self, now: i64, kind: Kind, app_id: &str, name: &str) -> Result<bool, String> {
        let same = self.open.as_ref().is_some_and(|open| open.kind == kind && open.app_id == app_id && open.name == name);
        if same {
            return Ok(false);
        }
        self.close_open(now)?;
        self.open_segment(now, kind, app_id, name)?;
        Ok(true)
    }

    fn open_segment(&mut self, at: i64, kind: Kind, app_id: &str, name: &str) -> Result<(), String> {
        let id = self.store.insert_segment(self.timer_id, kind, app_id, name, at)?;
        self.open = Some(Open { id, kind, app_id: app_id.to_string(), name: name.to_string(), started_at: at, last_beat: at });
        Ok(())
    }

    fn close_open(&mut self, at: i64) -> Result<(), String> {
        if let Some(open) = self.open.take() {
            self.store.close_segment(open.id, at.max(open.started_at))?;
        }
        Ok(())
    }

    fn heartbeat_if_due(&mut self, now: i64) -> Result<(), String> {
        if let Some(open) = self.open.as_mut()
            && now - open.last_beat >= HEARTBEAT_MS
        {
            self.store.heartbeat(open.id, now)?;
            open.last_beat = now;
        }
        Ok(())
    }

    fn needs_icon(&mut self, app_id: &str, now: i64) -> Result<bool, String> {
        if !self.seen_icons.insert(app_id.to_string()) {
            return Ok(false);
        }
        Ok(match self.store.icon_captured_at(app_id)? {
            Some(captured_at) => now - captured_at >= ICON_TTL_MS,
            None => true,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[derive(Clone, Debug, PartialEq)]
    struct Row {
        kind: Kind,
        app_id: String,
        name: String,
        started_at: i64,
        last_seen_at: i64,
        ended_at: Option<i64>,
    }

    #[derive(Default)]
    struct MemStore {
        rows: Vec<Row>,
        icons: HashMap<String, i64>,
        swept: bool,
    }

    impl Store for MemStore {
        fn insert_segment(&mut self, _timer_id: i64, kind: Kind, app_id: &str, app_name: &str, started_at: i64) -> Result<i64, String> {
            self.rows.push(Row { kind, app_id: app_id.into(), name: app_name.into(), started_at, last_seen_at: started_at, ended_at: None });
            Ok(self.rows.len() as i64 - 1)
        }

        fn close_segment(&mut self, id: i64, ended_at: i64) -> Result<(), String> {
            let row = &mut self.rows[id as usize];
            row.ended_at = Some(ended_at);
            row.last_seen_at = ended_at;
            Ok(())
        }

        fn heartbeat(&mut self, id: i64, at: i64) -> Result<(), String> {
            self.rows[id as usize].last_seen_at = at;
            Ok(())
        }

        fn icon_captured_at(&mut self, app_id: &str) -> Result<Option<i64>, String> {
            Ok(self.icons.get(app_id).copied())
        }

        fn upsert_icon(&mut self, app_id: &str, _png: Option<&[u8]>, _size: i64, captured_at: i64) -> Result<(), String> {
            self.icons.insert(app_id.into(), captured_at);
            Ok(())
        }

        fn sweep_open(&mut self) -> Result<(), String> {
            self.swept = true;
            Ok(())
        }
    }

    fn app(id: &str) -> ForegroundApp {
        ForegroundApp { id: id.into(), name: id.rsplit('.').next().unwrap().into(), pid: 1 }
    }

    fn tracker() -> Tracker<MemStore> {
        Tracker::new(MemStore::default(), 7)
    }

    fn summary(t: &Tracker<MemStore>) -> Vec<(Kind, &str, i64, Option<i64>)> {
        t.store.rows.iter().map(|r| (r.kind, r.name.as_str(), r.started_at, r.ended_at)).collect()
    }

    #[test]
    fn start_sweeps_and_opens_polled_app() {
        let mut t = tracker();
        let requests = t.start(1_000, Some(app("com.apple.Safari"))).unwrap();
        assert!(t.store.swept);
        assert_eq!(summary(&t), vec![(Kind::Active, "Safari", 1_000, None)]);
        assert_eq!(requests, vec![app("com.apple.Safari")]);
    }

    #[test]
    fn start_without_app_records_unknown_until_one_appears() {
        let mut t = tracker();
        t.start(1_000, None).unwrap();
        t.on_tick(2_000, Some(0.0), Some(app("com.apple.Mail"))).unwrap();
        assert_eq!(summary(&t), vec![(Kind::Unknown, "Unknown", 1_000, Some(2_000)), (Kind::Active, "Mail", 2_000, None)]);
    }

    #[test]
    fn switching_apps_closes_and_opens() {
        let mut t = tracker();
        t.start(1_000, Some(app("a.A"))).unwrap();
        t.on_event(PlatformEvent::Foreground(Some(app("b.B"))), 5_000, None).unwrap();
        t.on_event(PlatformEvent::Foreground(Some(app("b.B"))), 6_000, None).unwrap();
        t.on_event(PlatformEvent::Foreground(Some(app("a.A"))), 9_000, None).unwrap();
        assert_eq!(
            summary(&t),
            vec![(Kind::Active, "A", 1_000, Some(5_000)), (Kind::Active, "B", 5_000, Some(9_000)), (Kind::Active, "A", 9_000, None)]
        );
    }

    #[test]
    fn none_and_denylisted_are_ignored() {
        let mut t = tracker();
        t.start(1_000, Some(app("a.A"))).unwrap();
        t.on_event(PlatformEvent::Foreground(None), 2_000, None).unwrap();
        t.on_event(PlatformEvent::Foreground(Some(app("com.apple.dock"))), 3_000, None).unwrap();
        t.on_tick(4_000, Some(0.0), None).unwrap();
        t.on_tick(5_000, Some(0.0), Some(app("com.apple.Spotlight"))).unwrap();
        assert_eq!(summary(&t), vec![(Kind::Active, "A", 1_000, None)]);
    }

    /// ticks every 20s from `from` to `to` inclusive; input stopped at `input_until`
    fn tick_through(t: &mut Tracker<MemStore>, from: i64, to: i64, input_until: i64, polled: &str) {
        let mut now = from;
        while now <= to {
            let idle = ((now - input_until).max(0) as f64) / 1000.0;
            t.on_tick(now, Some(idle), Some(app(polled))).unwrap();
            now += 20_000;
        }
    }

    #[test]
    fn idle_enters_retroactively_and_resumes_on_input() {
        let mut t = tracker();
        t.start(0, Some(app("a.A"))).unwrap();
        // input stops at 20s; the threshold is crossed at the 200s tick, and
        // the idle segment starts when input stopped, not when we noticed
        tick_through(&mut t, 20_000, 200_000, 20_000, "a.A");
        assert_eq!(summary(&t), vec![(Kind::Active, "A", 0, Some(20_000)), (Kind::Idle, "Idle", 20_000, None)]);
        // activations while idle are remembered, not recorded
        t.on_event(PlatformEvent::Foreground(Some(app("b.B"))), 210_000, None).unwrap();
        assert_eq!(t.store.rows.len(), 2);
        // input returns; resume with the polled app
        t.on_tick(220_000, Some(0.5), Some(app("b.B"))).unwrap();
        assert_eq!(summary(&t)[1..], [(Kind::Idle, "Idle", 20_000, Some(220_000)), (Kind::Active, "B", 220_000, None)]);
    }

    #[test]
    fn idle_start_never_precedes_the_open_segment() {
        let mut t = tracker();
        t.start(0, Some(app("a.A"))).unwrap();
        // no input since 0; B steals focus at 100s without any input
        tick_through(&mut t, 20_000, 80_000, 0, "a.A");
        t.on_event(PlatformEvent::Foreground(Some(app("b.B"))), 100_000, None).unwrap();
        // threshold crossed at 180s would put idle at 0, before B began at 100s
        tick_through(&mut t, 100_000, 180_000, 0, "b.B");
        assert_eq!(summary(&t)[1..], [(Kind::Active, "B", 100_000, Some(100_000)), (Kind::Idle, "Idle", 100_000, None)]);
    }

    #[test]
    fn sleep_and_wake_events() {
        let mut t = tracker();
        t.start(0, Some(app("a.A"))).unwrap();
        t.on_event(PlatformEvent::Sleep, 10_000, None).unwrap();
        // idle checks do nothing while the system sleeps
        t.on_tick(11_000, Some(500.0), None).unwrap();
        t.on_event(PlatformEvent::Wake, 500_000, Some(app("a.A"))).unwrap();
        assert_eq!(
            summary(&t),
            vec![(Kind::Active, "A", 0, Some(10_000)), (Kind::Idle, "Sleep", 10_000, Some(500_000)), (Kind::Active, "A", 500_000, None)]
        );
    }

    #[test]
    fn wake_while_locked_stays_locked_until_unlock() {
        let mut t = tracker();
        t.start(0, Some(app("a.A"))).unwrap();
        t.on_event(PlatformEvent::Lock, 10_000, None).unwrap();
        t.on_event(PlatformEvent::Sleep, 20_000, None).unwrap();
        t.on_event(PlatformEvent::Wake, 30_000, Some(app("a.A"))).unwrap();
        assert_eq!(summary(&t).last().unwrap(), &(Kind::Idle, "Locked", 30_000, None));
        t.on_event(PlatformEvent::Unlock, 40_000, Some(app("a.A"))).unwrap();
        assert_eq!(summary(&t).last().unwrap(), &(Kind::Active, "A", 40_000, None));
    }

    #[test]
    fn tick_gap_without_event_is_a_sleep_segment() {
        let mut t = tracker();
        t.start(0, Some(app("a.A"))).unwrap();
        t.on_tick(1_000, Some(0.0), Some(app("a.A"))).unwrap();
        t.on_tick(61_000, Some(0.0), Some(app("a.A"))).unwrap();
        assert_eq!(
            summary(&t),
            vec![(Kind::Active, "A", 0, Some(1_000)), (Kind::Idle, "Sleep", 1_000, Some(61_000)), (Kind::Active, "A", 61_000, None)]
        );
    }

    #[test]
    fn tick_gap_during_event_sleep_is_not_doubled() {
        let mut t = tracker();
        t.start(0, Some(app("a.A"))).unwrap();
        t.on_event(PlatformEvent::Sleep, 1_000, None).unwrap();
        t.on_tick(61_000, Some(0.0), Some(app("a.A"))).unwrap();
        assert_eq!(t.store.rows.len(), 2);
        assert_eq!(summary(&t)[1], (Kind::Idle, "Sleep", 1_000, None));
    }

    #[test]
    fn heartbeat_every_fifteen_seconds() {
        let mut t = tracker();
        t.start(0, Some(app("a.A"))).unwrap();
        t.on_tick(14_000, Some(0.0), Some(app("a.A"))).unwrap();
        assert_eq!(t.store.rows[0].last_seen_at, 0);
        t.on_tick(15_000, Some(0.0), Some(app("a.A"))).unwrap();
        assert_eq!(t.store.rows[0].last_seen_at, 15_000);
        t.on_tick(29_000, Some(0.0), Some(app("a.A"))).unwrap();
        assert_eq!(t.store.rows[0].last_seen_at, 15_000);
    }

    #[test]
    fn icon_requested_once_per_app_and_refreshed_after_ttl() {
        let mut t = tracker();
        t.store.icons.insert("fresh.F".into(), 0);
        t.store.icons.insert("stale.S".into(), -ICON_TTL_MS);
        let mut requests = t.start(0, Some(app("fresh.F"))).unwrap();
        requests.extend(t.on_event(PlatformEvent::Foreground(Some(app("stale.S"))), 1_000, None).unwrap());
        requests.extend(t.on_event(PlatformEvent::Foreground(Some(app("new.N"))), 2_000, None).unwrap());
        requests.extend(t.on_event(PlatformEvent::Foreground(Some(app("stale.S"))), 3_000, None).unwrap());
        assert_eq!(requests, vec![app("stale.S"), app("new.N")]);
        t.on_event(PlatformEvent::Icon { app_id: "new.N".into(), png: Some(vec![1]), size: 128 }, 4_000, None).unwrap();
        assert_eq!(t.store.icons["new.N"], 4_000);
    }
}
