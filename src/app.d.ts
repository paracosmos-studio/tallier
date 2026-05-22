import type { WindowProfile } from '$lib/window';

declare global {
    namespace App {
        interface PageData {
            window?: WindowProfile;
        }
    }
}

export {};
