import { getCurrentWindow, LogicalSize, PhysicalSize } from '@tauri-apps/api/window';

const appWindow = getCurrentWindow();


/**
 * Sets the current window size to the specified width and height
 *
 * @param {number} width The desired width of the window
 * @param {number} height The desired height of the window
 */
async function resizeWindow(width: number, height: number): Promise<void> {
    const physicalSize: PhysicalSize = await appWindow.innerSize();
    const scaleFactor = await appWindow.scaleFactor();
    const currentWindowSize = physicalSize.toLogical(scaleFactor);

    if (currentWindowSize && currentWindowSize.width <= width) {
        await appWindow.setSize(new LogicalSize(width, height));
    }
}

export { resizeWindow };