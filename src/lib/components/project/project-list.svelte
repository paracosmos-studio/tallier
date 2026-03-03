<script lang="ts">
    import type { Project } from "$lib/types";
    import Icon from "$lib/components/icon.svelte";
    import { CheckCircle, CloseCircle, Tune, Edit, Delete, Drag } from "$lib/icons";

    type Props = {
        projects: Project[];
        onrename: (id: number, name: string) => void;
        onconfigure: (project: Project) => void;
        ondelete: (id: number) => void;
        onreorder: (projects: Project[]) => void;
    };

    let { projects, onrename, onconfigure, ondelete, onreorder }: Props = $props();

    let editingId: number | null = $state(null);
    let editingName: string = $state("");
    let dragIdx: number | null = $state(null);
    let overIdx: number | null = $state(null);
    let dragging: boolean = $state(false);

    function startRename(project: Project) {
        editingId = project.id!;
        editingName = project.name;
    }

    function cancelEdit() {
        editingId = null;
        editingName = "";
    }

    function saveEdit() {
        if (editingId === null || !editingName.trim()) return;
        onrename(editingId, editingName.trim());
        cancelEdit();
    }

    function handlePointerDown(idx: number) {
        dragIdx = idx;
        dragging = true;

        function handlePointerMove(e: PointerEvent) {
            const list = document.querySelector('.pr-list');
            if (!list) return;
            const items = list.querySelectorAll('.pr-item');
            let closest: number = 0;
            let minDist: number = Infinity;
            for (let i = 0; i < items.length; i++) {
                const rect = items[i].getBoundingClientRect();
                const mid = rect.top + rect.height / 2;
                const dist = Math.abs(e.clientY - mid);
                if (dist < minDist) {
                    minDist = dist;
                    closest = i;
                }
            }
            overIdx = closest;
        }

        function handlePointerUp() {
            if (dragIdx !== null && overIdx !== null && dragIdx !== overIdx) {
                const reordered = [...projects];
                const [moved] = reordered.splice(dragIdx, 1);
                reordered.splice(overIdx, 0, moved);
                onreorder(reordered);
            }
            dragIdx = null;
            overIdx = null;
            dragging = false;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        }

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    }
</script>

<!--
    @component
    Displays a draggable list of projects with inline edit, configure, and delete actions.

    @param {Project[]} projects - Array of projects to display.
    @param {(id: number, name: string) => void} onrename - Callback when a project name is saved.
    @param {(project: Project) => void} onconfigure - Callback when configure is clicked.
    @param {(id: number) => void} ondelete - Callback when delete is clicked.
    @param {(projects: Project[]) => void} onreorder - Callback with reordered project array after drag.
-->
<section>
    {#if projects.length === 0}
        <p class="empty">No projects yet.</p>
    {:else}
        <ul class="pr-list">
            {#each projects as project, idx (project.id)}
                <li
                    class="pr-item"
                    class:drag-over-top={dragging && overIdx === idx && dragIdx !== null && dragIdx !== idx && dragIdx > idx}
                    class:drag-over-bottom={dragging && overIdx === idx && dragIdx !== null && dragIdx !== idx && dragIdx < idx}
                    class:dragging={dragging && dragIdx === idx}
                >
                    {#if editingId === project.id}
                        <div class="pr-info">
                            <input
                                type="text"
                                class="pr-name-input"
                                bind:value={editingName}
                                onkeydown={(e: KeyboardEvent) => {
                                    if (e.key === "Enter") saveEdit();
                                    if (e.key === "Escape") cancelEdit();
                                }}
                            />
                        </div>
                        <div class="pr-actions">
                            <button title="Save Changes" class="save" onclick={saveEdit}>
                                <Icon path={CheckCircle} size="20" fill="currentColor" />
                            </button>
                            <button title="Cancel Edit" class="cancel" onclick={cancelEdit}>
                                <Icon path={CloseCircle} size="20" fill="currentColor" />
                            </button>
                        </div>
                    {:else}
                        <div class="pr-info">
                            <span
                                class="drag-handle"
                                onpointerdown={() => handlePointerDown(idx)}
                                role="button"
                                tabindex="0"
                                aria-label="Drag to reorder"
                            >
                                <Icon path={Drag} size="20" fill="var(--gray-60)" />
                            </span>
                            <span class="pr-name">{project.name}</span>
                        </div>
                        <div class="pr-actions">
                            <button title="Rename" class="rename" onclick={() => startRename(project)}>
                                <Icon path={Edit} size="20" fill="currentColor" />
                            </button>
                            <button title="Configure" class="configure" onclick={() => onconfigure(project)}>
                                <Icon path={Tune} size="20" fill="currentColor" />
                            </button>
                            <button title="Delete" class="delete" onclick={() => ondelete(project.id!)}>
                                <Icon path={Delete} size="20" fill="currentColor" />
                            </button>
                        </div>
                    {/if}
                </li>
            {/each}
        </ul>
    {/if}
</section>

<style>
    p.empty {
        font-size: 14px;
        color: var(--gray-40);
        text-align: center;
        margin: 2rem 0;
    }

    .pr-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        list-style: none;
        padding: 0;
        margin: 0;
    }

    .pr-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 5px;
        border-radius: 4px;
        background-color: var(--gray-90);
        transition: opacity 0.15s ease;
    }

    .pr-item.dragging {
        opacity: 0.4;
    }

    .pr-item.drag-over-top {
        border-top: 2px solid var(--yellow);
        padding-top: 3px;
        border-top-left-radius: 0;
        border-top-right-radius: 0;
    }

    .pr-item.drag-over-bottom {
        border-bottom: 2px solid var(--yellow);
        padding-bottom: 3px;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    .drag-handle {
        display: flex;
        cursor: grab;
        touch-action: none;
    }

    .pr-info {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
    }

    .pr-info input {
        background: none;
        border: none;
        border-radius: 4px;
        padding: 6px;
        color: var(--gray-20);
        font-size: 14px;
        width: 100%;
        margin: 0;
        outline: none;
    }

    .pr-name {
        font-size: 14px;
        color: var(--gray-20);
    }

    .pr-actions button {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: var(--gray-30);
        transition: all 0.2s ease;
    }

    .pr-actions button.save {
        color: var(--green);
    }

    .pr-actions button.cancel {
        color: var(--red);
    }

    .pr-actions button.delete:hover {
        color: var(--red);
    }

    .pr-actions button.configure:hover {
        color: var(--yellow);
    }

    .pr-actions button.rename:hover {
        color: var(--gray-20);
    }
</style>
