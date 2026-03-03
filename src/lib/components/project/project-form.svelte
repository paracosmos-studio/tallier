<script lang="ts">
    import type { Project } from "$lib/types";

    type Props = {
        project?: Project;
        name: string;
        onsave: (name: string) => void;
        oncancel: () => void;
    };

    let { project, name = $bindable(""), onsave, oncancel }: Props = $props();

    let isEdit: boolean = $derived(!!project);

    function handleSubmit(e: SubmitEvent) {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onsave(trimmed);
    }
</script>

<!--
    @component
    Form for adding or editing a project.

    @param {Project} [project] - Project to edit. Omit for add mode.
    @param {(name: string) => void} onsave - Callback with the project name on save.
    @param {() => void} oncancel - Callback when the form is cancelled.
-->
<section>
    <p class="title">{isEdit ? "Edit" : "New"} Project</p>
    <form onsubmit={handleSubmit}>
        <input
            type="text"
            name="pr-name"
            placeholder="Title"
            maxlength="30"
            bind:value={name}
            onkeydown={(e: KeyboardEvent) => {
                if (e.key === "Escape") oncancel();
            }}
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
