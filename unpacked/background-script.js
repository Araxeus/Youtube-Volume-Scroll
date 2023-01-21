const browserApi = globalThis.browser ?? globalThis.chrome ?? null;

const permissions = {
    origins: ['https://www.youtube.com/*', 'https://music.youtube.com/*']
};
browserApi.permissions.contains(permissions, result => {
    if (!result) {
        browserApi.browserAction?.openPopup?.()
            ?? browserApi.action?.openPopup?.()
            ??
            browserApi.tabs.create({ url: browserApi.runtime.getURL('popup/popup.html') });
    }
});
