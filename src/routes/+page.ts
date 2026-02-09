import type { PageLoad } from "./$types";
import { resizeWindow } from "$lib/window";

export const load: PageLoad = async () => {
    return await resizeWindow(400, 250);
};