/** Where a popup goes: on the page, or inside whatever is full screen (nothing outside it shows). */
export const popupRoot = () => document.fullscreenElement ?? document.body;
