// This file is only included in the firefox version of the extension
// Purpose: Prompt the user to grant the extension permission to access youtube.com and music.youtube.com
// This is essential on firefox since the browser doesn't ask for permission by itself

const browserApi = globalThis.browser ?? globalThis.chrome ?? null;

const permissions = {
    origins: ['https://www.youtube.com/*', 'https://music.youtube.com/*'],
};
browserApi.permissions.contains(permissions, (result) => {
    if (!result) {
        browserApi.browserAction?.openPopup?.() ??
            browserApi.action?.openPopup?.() ??
            browserApi.tabs.create({
                url: browserApi.runtime.getURL('popup/popup.html'),
            });
    }
});
