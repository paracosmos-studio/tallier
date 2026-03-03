<script lang="ts">
    import { settings } from '$lib/config';
    import Icon from '$lib/components/icon.svelte';
    import { ChatBubble, Donate, ShieldPerson, Contract } from '$lib/icons';

    let currentYear: number = new Date().getFullYear();
    let year: string = "2026 - Present";
</script>

<footer>
    <div>
        <p>Tally (v{settings.version})</p>
        {#if currentYear < 2026}
            <p>© {year}</p>
            <p>
                <a
                    href={settings.urls.paracosmos}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Paracosmos Studio Inc.
                </a>
            </p>
        {:else}
            <p>
                © {currentYear}
                <a
                    href={settings.urls.paracosmos}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Paracosmos Studio Inc.
                </a>
            </p>
        {/if}
    </div>
    <nav>
        <div class="nav-col">
            <a
                href={settings.urls.feedback}
                target="_blank"
                rel="noopener noreferrer"
                class="nav-item"
            >
                <Icon path={ChatBubble} size="14" fill="currentColor" />
                Feedback
            </a>
            <a
                href={settings.urls.donate}
                target="_blank"
                rel="noopener noreferrer"
                class="nav-item"
            >
                <Icon path={Donate} size="14" fill="currentColor" />
                Donate
            </a>
        </div>
        <div class="nav-col">
            <a
                href={settings.urls.privacy}
                target="_blank"
                rel="noopener noreferrer"
                class="nav-item"
            >
                <Icon path={ShieldPerson} size="14" fill="currentColor" />
                Privacy Policy
            </a>
            <a
                href={settings.urls.terms}
                target="_blank"
                rel="noopener noreferrer"
                class="nav-item"
            >
                <Icon path={Contract} size="14" fill="currentColor" />
                Terms of Service
            </a>
        </div>
    </nav>
</footer>

<style>
    footer {
        position: absolute;
        bottom: 0px;
        left: 0;
        right: 0;
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        margin: 16px auto 0 auto;
        padding: 1rem;
        background-color: var(--color-background);
        color: var(--gray-40);
        font-size: 0.65rem;
        border-top: 1px solid var(--gray-70);
        border-bottom-left-radius: 16px;
        border-bottom-right-radius: 16px;
        box-sizing: border-box;
    }

    footer > div p,
    footer > div p a {
        margin: 0;
        color: var(--gray-40);
    }

    footer > nav {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        align-items: center;
    }

    .nav-col {
        width: auto;
        display: flex;
        flex-direction: column;
        margin-left: 1rem;
    }

    .nav-item {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.3rem;
        color: var(--gray-40);
        transition: color 0.2s ease;
    }

    .nav-item:hover {
        color: var(--gray-10);
        text-decoration: none;
    }

    @media screen and (min-width: 800px) {
        footer {
            width: 400px;
        }
    }
</style>