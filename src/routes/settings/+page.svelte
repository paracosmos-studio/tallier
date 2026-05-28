<script lang="ts">
    import { onMount } from "svelte";
    import type { Project, ProjectLimits } from "$lib/types";
    import {
        Add,
        FolderOutlined,
        FolderFilled,
        WorkOutlined,
        WorkFilled,
        Tune,
        InfoOutlined,
        InfoFilled,
    } from "$lib/icons";
    import Icon from "$lib/components/icon.svelte";
    import Button from "$lib/components/button.svelte";
    import PageNavigation from "$lib/components/page-navigation.svelte";
    import ProjectList from "$lib/components/project/project-list.svelte";
    import ProjectForm from "$lib/components/project/project-form.svelte";
    import DialogConfirm from "$lib/components/dialogs/dialog-confirm.svelte";
    import PreferenceTab from "$lib/components/settings/preference-tab.svelte";
    import AboutTab from "$lib/components/settings/about-tab.svelte";
    import {
        getProjects,
        createProject,
        updateProject,
        updateProjectName,
        deleteProject,
        reorderProjects,
    } from "$lib/db";
    import { buildProjectColorMap } from "$lib/colors";

    type Tab = "projects" | "clients" | "preference" | "about";
    type ProjectView = "list" | "add" | "edit";

    const tabs: { id: Tab; label: string; icon: string; activeIcon: string }[] = [
        { id: "projects", label: "Projects", icon: FolderOutlined, activeIcon: FolderFilled },
        { id: "clients", label: "Clients", icon: WorkOutlined, activeIcon: WorkFilled },
        { id: "preference", label: "Preference", icon: Tune, activeIcon: Tune },
        { id: "about", label: "About", icon: InfoOutlined, activeIcon: InfoFilled },
    ];

    let activeTab: Tab = $state("projects");

    // projects tab state
    let projectView: ProjectView = $state("list");
    let projects: Project[] = $state([]);
    let editingProject: Project | undefined = $state(undefined);
    let editingColor: string | undefined = $state(undefined);
    let formName: string = $state("");
    let deleteTarget: Project | undefined = $state(undefined);

    let colorMap = $derived(buildProjectColorMap(projects));

    onMount(loadProjects);

    async function loadProjects() {
        projects = await getProjects();
    }

    function showAdd() {
        editingProject = undefined;
        editingColor = undefined;
        formName = "";
        projectView = "add";
    }

    function showEdit(project: Project) {
        editingProject = project;
        editingColor = project.id != null ? colorMap.get(project.id) : undefined;
        formName = project.name;
        projectView = "edit";
    }

    function showList() {
        editingProject = undefined;
        editingColor = undefined;
        projectView = "list";
    }

    async function handleFormSave(name: string, limits: ProjectLimits, color: string) {
        if (projectView === "edit" && editingProject?.id != null) {
            await updateProject(editingProject.id, name, limits, color);
        } else {
            await createProject(name, limits, color);
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

    function submitProjectForm() {
        document
            .getElementById("project-form")
            ?.dispatchEvent(new Event("submit", { cancelable: true }));
    }

    function selectTab(id: Tab) {
        activeTab = id;
        // ensure we never linger in a project sub-view when leaving the tab
        if (id !== "projects" && projectView !== "list") showList();
    }
</script>

<main>
    <PageNavigation previousPage="/">
        {#if activeTab === "projects"}
            {#if projectView === "list"}
                <Button size="xs" title="Add New Project" onclick={showAdd}>
                    <Icon path={Add} size="14" />
                    <span>Add Project</span>
                </Button>
            {:else}
                <div class="actions">
                    <Button
                        size="xs"
                        title="Cancel"
                        bgColor={"var(--gray-60)"}
                        fgColor={"var(--gray-10)"}
                        onclick={showList}
                    >
                        Cancel
                    </Button>
                    <Button size="xs" title="Save Project" onclick={submitProjectForm}>
                        Save
                    </Button>
                </div>
            {/if}
        {/if}
    </PageNavigation>

    <div class="settings-grid">
        <nav class="tab-nav" aria-label="Settings sections">
            {#each tabs as tab (tab.id)}
                <button
                    class="tab-item"
                    class:active={activeTab === tab.id}
                    aria-current={activeTab === tab.id ? "page" : undefined}
                    onclick={() => selectTab(tab.id)}
                >
                    <Icon
                        path={activeTab === tab.id ? tab.activeIcon : tab.icon}
                        size="16"
                        fill="currentColor"
                    />
                    <span>{tab.label}</span>
                </button>
            {/each}
        </nav>

        <section class="tab-content">
            {#if activeTab === "projects"}
                {#if projectView === "list"}
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
                        currentColor={editingColor}
                        bind:name={formName}
                        onsave={handleFormSave}
                        oncancel={showList}
                    />
                {/if}
            {:else if activeTab === "clients"}
                <p class="empty">Coming soon.</p>
            {:else if activeTab === "preference"}
                <PreferenceTab />
            {:else if activeTab === "about"}
                <AboutTab />
            {/if}
        </section>
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
    .actions {
        display: flex;
        flex-direction: row;
        gap: 0.5rem;
    }

    .settings-grid {
        display: grid;
        grid-template-columns: 1fr 3fr;
        gap: 1.25rem;
        align-items: start;
    }

    .tab-nav {
        position: sticky;
        top: calc(2rem + 10px + 2.5rem);
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .tab-item {
        appearance: none;
        background: none;
        border: none;
        border-left: 2px solid transparent;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        text-align: left;
        padding: 0.45rem 0.65rem;
        color: var(--gray-30);
        font-family: inherit;
        font-size: 0.9rem;
        font-weight: 400;
        cursor: pointer;
        transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
    }

    .tab-item:hover {
        color: var(--gray-10);
        background-color: var(--gray-80);
    }

    .tab-item.active {
        color: var(--yellow);
        background-color: color-mix(in srgb, var(--yellow) 12%, transparent);
        border-left-color: var(--yellow);
    }

    .tab-content {
        min-width: 0;
        padding-bottom: 1rem;
    }

    .empty {
        color: var(--gray-40);
        font-size: 0.875rem;
        text-align: center;
        margin: 2rem 0;
    }
</style>
