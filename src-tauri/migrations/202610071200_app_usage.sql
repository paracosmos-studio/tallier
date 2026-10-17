-- SPDX-License-Identifier: AGPL-3.0-only
-- SPDX-FileCopyrightText: Copyright 2026 Paracosmos Studio Inc.

CREATE TABLE IF NOT EXISTS app_usage (
    "id"           INTEGER PRIMARY KEY AUTOINCREMENT,
    "timer_id"     INTEGER NOT NULL REFERENCES timers("id") ON DELETE CASCADE,
    "kind"         TEXT NOT NULL CHECK("kind" IN ('active', 'idle', 'unknown')),
    "app_id"       TEXT NOT NULL,
    "app_name"     TEXT NOT NULL,
    "started_at"   INTEGER NOT NULL,
    "last_seen_at" INTEGER NOT NULL,
    "ended_at"     INTEGER
);

CREATE INDEX IF NOT EXISTS idx_app_usage_timer ON app_usage("timer_id");
CREATE INDEX IF NOT EXISTS idx_app_usage_open ON app_usage("timer_id") WHERE "ended_at" IS NULL;

CREATE TABLE IF NOT EXISTS app_icons (
    "app_id"      TEXT PRIMARY KEY,
    "icon_png"    BLOB,
    "size"        INTEGER NOT NULL,
    "captured_at" INTEGER NOT NULL
);
