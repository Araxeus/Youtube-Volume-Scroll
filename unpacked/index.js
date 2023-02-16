const browserApi = globalThis.browser ?? globalThis.chrome ?? undefined;
if (!browserApi) throw new Error('Youtube-Volume-Scroll could not find a browser api to use');

const $ = document.querySelector.bind(document);
const oneMonth = 2592e6;
let isMusic = window.location.href.includes('music.youtube');

let configFromPageAccess = undefined;

if (browserApi.extension.inIncognitoContext) {
    setupIncognito();
}

window.addEventListener('load', start, { once: true });

// keep config in sync with extension popup
browserApi.storage.onChanged.addListener((changes, area) => {
    // sync is the main storage, local is used for instant changes
    if (area === 'sync' && changes.config?.newValue) {
        if (!simpleAreEqual(changes.config.newValue, configFromPageAccess)) {
            sendConfig(changes.config.newValue);
        }
        configFromPageAccess = undefined;
    }
    if (area === 'local' && changes.config?.newValue) {
        sendConfig(changes.config.newValue);
    }
});

function start() {
    if ($('.html5-video-player:not(.unstarted-mode)')) {
        checkOverlay();
        return;
    }

    const documentObserver = new MutationObserver(() => {
        if ($('.html5-video-player:not(.unstarted-mode)')) {
            documentObserver.disconnect();
            checkOverlay();
        }
    });

    documentObserver.observe(document.documentElement, { childList: true, subtree: true });
}

// check if the extension is inside a youtube embedded iframe that isn't active yet
function checkOverlay() {
    const overlay = $('.ytp-cued-thumbnail-overlay-image');
    const noOverlay = () => !overlay || !overlay.style.backgroundImage || overlay.parentNode.style.display === 'none';
    if (noOverlay()) {
        init();
    } else {
        const overlayObserver = new MutationObserver(() => {
            if (noOverlay()) {
                overlayObserver.disconnect();
                init();
            }
        });

        overlayObserver.observe(overlay.parentNode, { attributeFilter: ['style'] });
    }
}

function init() {
    loadPageAccess();

    window.addEventListener('message', (e) => {
        if (e.origin !== window.location.origin) return;
        if (e.data.type === 'YoutubeVolumeScroll-volume' && typeof e.data.newVolume === 'number') {
            saveVolume(e.data.newVolume);
        } else if (e.data.type === 'YoutubeVolumeScroll-config-save' && typeof e.data.config === 'object') {
            configFromPageAccess = e.data.config;
            browserApi.storage.sync.set({ config: e.data.config });
        }
    });

    console.log('loaded Youtube-Volume-Scroll on url: ', window.location.href);
}

function loadPageAccess() {
    let pageAccess = document.createElement('script');
    pageAccess.src = browserApi.runtime.getURL('pageAccess.js');
    pageAccess.onload = function () {
        this.remove();
        browserApi.storage.sync.get('config', data => {
            if (data.config) sendConfig(data.config);
        });
    };
    (document.head || document.documentElement).appendChild(pageAccess);
}

function sendConfig(config) {
    //send updated config to pageAccess.js
    window.postMessage({ type: 'YoutubeVolumeScroll-config-change', config }, window.location.origin);
}

function setupIncognito() {
    browserApi.storage.sync.get('savedVolume', data => {
        if (data?.savedVolume !== undefined) {
            try {
                // indicate to pageAccess that we are in incognito
                window.localStorage.setItem('Youtube-Volume-Scroll', JSON.stringify({
                    incognito: true,
                    savedVolume: data.savedVolume
                }));
                if (!isMusic) {
                    // setup native youtube volume cookie
                    const cookieData = JSON.stringify({
                        volume: data.savedVolume,
                        muted: data.savedVolume <= 0,
                    });
                    const timeNow = Date.now();

                    window.localStorage.setItem('yt-player-volume', JSON.stringify({
                        data: cookieData,
                        expiration: timeNow + oneMonth,
                        creation: timeNow,
                    }));

                    window.sessionStorage.setItem('yt-player-volume', JSON.stringify({
                        data: cookieData,
                        creation: timeNow,
                    }));
                }
            } catch {
                console.error('Youtube-Volume-Scroll could not save volume cookies, see https://i.stack.imgur.com/mEidB.png');
            }
        }
    });
}

// save volume after a delay to avoid throttle limit
// https://developer.chrome.com/docs/extensions/reference/storage/#storage-and-throttling-limits
let saveTimeout;

function saveVolume(newVolume) {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        browserApi.storage.sync.set({ savedVolume: newVolume });
        saveTimeout = undefined;
    }, 500);
}

function simpleAreEqual(obj1, obj2) {
    if (typeof obj1 !== typeof obj2) return false;

    switch (typeof obj1) {
        case 'object':
            for (const p of Object.keys(obj1)) {
                if (!this.simpleAreEqual(obj1[p], obj2[p])) return false;
            }
            break;
        case 'string':
        case 'number':
        case 'boolean':
            if (obj1 !== obj2) return false;
            break;
        default:
            throw new Error(`.simpleAreEqual() encountered an unknown type: {${typeof (obj1)}} pos1: ${obj1}, pos2: ${obj2}`);
    }

    return true;
}  
