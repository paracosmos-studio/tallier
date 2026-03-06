<script lang="ts">
    import { onMount } from "svelte";
    import type { Project, ProjectLimits } from "$lib/types";
    import { getProjects, createProject, updateProject, updateProjectName, deleteProject, reorderProjects } from "$lib/db";
    import Button from "$lib/components/button.svelte";
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import ProjectList from "$lib/components/project/project-list.svelte";
    import ProjectForm from "$lib/components/project/project-form.svelte";
    import DialogConfirm from "$lib/components/dialogs/dialog-confirm.svelte";

    type View = "list" | "add" | "edit";

    let view: View = $state("list");
    let projects: Project[] = $state([]);
    let editingProject: Project | undefined = $state(undefined);
    let formName: string = $state("");
    let deleteTarget: Project | undefined = $state(undefined);

    onMount(loadProjects);

    async function loadProjects() {
        projects = await getProjects();
    }

    function showAdd() {
        editingProject = undefined;
        formName = "";
        view = "add";
    }

    function showEdit(project: Project) {
        editingProject = project;
        formName = project.name;
        view = "edit";
    }

    function showList() {
        editingProject = undefined;
        view = "list";
    }

    async function handleFormSave(name: string, limits: ProjectLimits) {
        if (view === "edit" && editingProject?.id != null) {
            await updateProject(editingProject.id, name, limits);
        } else {
            await createProject(name, limits);
        }
        await loadProjects();
        showList();
    }

    async function handleRename(id: number, name: string) {
        await updateProjectName(id, name);
        await loadProjects();
    }

    async function handleReorder(reordered: Project[]) {
        const order = reordered.map((p, i) => ({ id: p.id!, position: i }));
        await reorderProjects(order);
        await loadProjects();
    }

    function requestDelete(project: Project) {
        deleteTarget = project;
    }

    async function confirmDelete() {
        if (deleteTarget?.id == null) return;
        await deleteProject(deleteTarget.id);
        deleteTarget = undefined;
        await loadProjects();
    }

    function cancelDelete() {
        deleteTarget = undefined;
    }
</script>

<main>
    <PageNavigation previousPage="/settings">
        {#if view === "list"}
            <Button size="xs" title="Add New Project" onclick={showAdd}>
                + Add New
            </Button>
        {:else}
            <div class="actions">
                <Button size="xs" title="Cancel" bgColor={"var(--gray-60)"} fgColor={"var(--gray-10)"} onclick={showList}>
                    Cancel
                </Button>
                <Button size="xs" title="Save Project" onclick={() => {
                    document.getElementById('project-form')?.dispatchEvent(new Event('submit', { cancelable: true }));
                }}>
                    Save
                </Button>
            </div>
        {/if}
    </PageNavigation>

    <div class="pr-container">
        {#if view === "list"}
            <ProjectList
                {projects}
                onrename={handleRename}
                onconfigure={showEdit}
                ondelete={requestDelete}
                onreorder={handleReorder}
            />
        {:else}
            <ProjectForm
                project={editingProject}
                bind:name={formName}
                onsave={handleFormSave}
                oncancel={showList}
            />
        {/if}
    </div>

    <DialogConfirm
        open={deleteTarget != null}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.name ?? ""}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onconfirm={confirmDelete}
        oncancel={cancelDelete}
    />
</main>

<style>
    .pr-container {
        margin: 1rem auto;
    }

    .actions {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
    }
</style>
