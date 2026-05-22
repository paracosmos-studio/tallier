<script lang="ts">
    import { untrack } from "svelte";
    import type { Project, ProjectLimits } from "$lib/types";
    import ProjectLimit from "./project-limit.svelte";

    type Props = {
        project?: Project;
        name: string;
        onsave: (name: string, limits: ProjectLimits) => void;
        oncancel: () => void;
    };

    let { project, name = $bindable(""), onsave, oncancel }: Props = $props();

    let isEdit: boolean = $derived(!!project);

    function secToHms(s: number | null): string {
        if (!s) return '00:00:00';
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    function hmsToSec(v: string): number | null {
        const [h, m, s] = v.split(':').map(Number);
        const total = h * 3600 + m * 60 + s;
        return total || null;
    }

    let maxEnabled: boolean = $state(untrack(() => project?.max_daily_enabled ?? false));
    let notifyEnabled: boolean = $state(untrack(() => project?.max_weekly_enabled ?? false));
    let maxDaily: string = $state(untrack(() => secToHms(project?.max_daily ?? null)));
    let maxWeekly: string = $state(untrack(() => secToHms(project?.max_weekly ?? null)));
    let notifyDaily: string = $state(untrack(() => secToHms(project?.max_daily_alert ?? null)));
    let notifyWeekly: string = $state(untrack(() => secToHms(project?.max_weekly_alert ?? null)));

    function buildLimits(): ProjectLimits {
        return {
            maxDaily: maxEnabled ? hmsToSec(maxDaily) : null,
            maxDailyAlert: notifyEnabled ? hmsToSec(notifyDaily) : null,
            maxWeekly: maxEnabled ? hmsToSec(maxWeekly) : null,
            maxWeeklyAlert: notifyEnabled ? hmsToSec(notifyWeekly) : null,
            maxDailyEnabled: maxEnabled,
            maxWeeklyEnabled: notifyEnabled,
        };
    }

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onsave(trimmed, buildLimits());
    }
</script>

<!--
    @component
    Form for adding or editing a project with optional timer limits.

    @param {Project} [project] - Project to edit. Omit for add mode.
    @param {string} name - Bindable project name.
    @param {(name: string, limits: ProjectLimits) => void} onsave - Callback with name and limits on save.
    @param {() => void} oncancel - Callback when the form is cancelled.
-->
<section>
    <p class="title">{isEdit ? "Edit" : "New"} Project</p>
    <form id="project-form" onsubmit={handleSubmit}>
        <input
            type="text"
            name="pr-name"
            placeholder="title"
            maxlength="30"
            bind:value={name}
            onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Escape") oncancel();
            }}
        />
        <ProjectLimit
            bind:maxEnabled
            bind:notifyEnabled
            bind:maxDaily
            bind:maxWeekly
            bind:notifyDaily
            bind:notifyWeekly
        />
    </form>
</section>

<style>
    p {
        font-size: 16px;
        font-weight: 500;
        color: var(--gray-10);
        margin-bottom: 5px;
    }

    p.title {
        font-size: 0.875rem;
        color: var(--yellow);
        margin-bottom: 0.75rem;
    }

    form input {
        width: 100%;
        padding: 6px;
        border: 1px solid var(--gray-70);
        border-radius: 4px;
        background-color: var(--gray-90);
        box-sizing: border-box;
        color: var(--gray-10);
        font-size: 0.9rem;
        font-weight: 300;
        outline: none;
    }

    form input::placeholder {
        color: var(--gray-40);
    }

    form input:focus {
        border-color: var(--gray-60);
    }
</style>
