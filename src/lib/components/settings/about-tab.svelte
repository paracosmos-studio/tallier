<!--
    @component
    About panel for the Settings page. Surfaces app version, copyright, and
    external links (feedback, support, privacy, terms).
-->
<script lang="ts">
    import Icon from "$lib/components/icon.svelte";
    import IconGithub from "$lib/components/icons/icon-github.svelte";
    import IconStudio from "$lib/components/icons/icon-studio.svelte";
    import Button from "$lib/components/button.svelte";
    import { settings } from "$lib/config";
    import { ChatBubble, Donate, ShieldPerson, Contract, Refresh } from "$lib/icons";

    const currentYear: number = new Date().getFullYear();
    const copyrightYear: number = Math.max(currentYear, settings.releaseYear);
</script>

<section>
    <div class="card">
        <div class="card-col">
            <p class="app-name">
                <img src="/favicon.png" alt="" width="18" height="18" />
                <span>Tallier</span>
            </p>
            <p class="line">version {settings.version}</p>
        </div>
        <div class="card-col right">
            <a href={settings.urls.homepage} target="_blank" rel="noopener noreferrer">
                https://tallier.app
            </a>
            <a href={settings.urls.license} target="_blank" rel="noopener noreferrer">
                view license
            </a>
        </div>
    </div>

    <div class="update-row">
        <Button
            size="xs"
            title="Check for updates"
            bgColor={"var(--gray-60)"}
            fgColor={"var(--gray-10)"}
            onclick={() => {}}
        >
            <Icon path={Refresh} size="14" fill="currentColor" />
            <span>Check for updates</span>
        </Button>
    </div>

    <div id="about-links" class="link-groups">
        <nav>
            <a href={settings.urls.github} target="_blank" rel="noopener noreferrer">
                <IconGithub size="14" />
                <span>GitHub</span>
            </a>
            <a href={settings.urls.paracosmos} target="_blank" rel="noopener noreferrer">
                <IconStudio size="14" />
                <span>Studio</span>
            </a>
        </nav>
        <nav>
            <a href={settings.urls.feedback} target="_blank" rel="noopener noreferrer">
                <Icon path={ChatBubble} size="14" fill="currentColor" />
                <span>Feedback</span>
            </a>
            <a href={settings.urls.support} target="_blank" rel="noopener noreferrer">
                <Icon path={Donate} size="14" fill="currentColor" />
                <span>Support</span>
            </a>
        </nav>
        <nav>
            <a href={settings.urls.privacy} target="_blank" rel="noopener noreferrer">
                <Icon path={ShieldPerson} size="14" fill="currentColor" />
                <span>Privacy Policy</span>
            </a>
            <a href={settings.urls.terms} target="_blank" rel="noopener noreferrer">
                <Icon path={Contract} size="14" fill="currentColor" />
                <span>Terms of Service</span>
            </a>
        </nav>
    </div>

    <div class="meta">
        <br />
        <p class="line">
            <span>
                All rights reserved © {copyrightYear}
                <a href={settings.urls.paracosmos} target="_blank" rel="noopener noreferrer">
                    Paracosmos Studio Inc.
                </a>
            </span>
        </p>
    </div>
</section>

<style>
    .card {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem;
        background-color: var(--gray-90);
        border: 1px solid var(--gray-70);
        border-radius: 6px;
    }

    .card-col {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .card-col.right {
        align-items: flex-end;
        text-align: right;
        font-size: 0.75rem;
    }

    .card-col p {
        margin: 0;
    }

    .card-col a {
        color: var(--gray-20);
    }

    .app-name {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        color: var(--gray-10);
        font-weight: 500;
        font-size: 0.95rem;
    }

    .app-name img {
        display: block;
        border-radius: 4px;
    }

    .line {
        font-size: 0.75rem;
        color: var(--gray-20);
    }

    .meta {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
    }

    .meta p {
        margin: 0;
    }

    .meta a {
        color: var(--gray-20);
    }

    .update-row {
        display: flex;
        margin-top: 0.75rem;
    }

    .link-groups {
        display: flex;
        flex-direction: row;
        gap: 2rem;
        margin-top: 30px;
    }

    nav {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    nav a {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--gray-20);
        font-size: 0.8rem;
        transition: color 0.2s ease;
    }

    nav a:hover {
        color: var(--gray-10);
        text-decoration: none;
    }
</style>
