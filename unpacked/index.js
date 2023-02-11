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
    if (area === 'sync' && changes.config?.newValue) {
        if (!simpleAreEqual(changes.config.newValue, configFromPageAccess)) {
            sendConfig(changes.config.newValue);
        }
        configFromPageAccess = undefined;
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

// check the extension is inside a youtube embedded iframe that isn't active yet
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

    window.addEventListener('message', event => {
        if (event.data.type === 'YoutubeVolumeScroll-volume' && typeof event.data.newVolume === 'number') {
            saveVolume(event.data.newVolume);
        }
    });

    window.addEventListener('message', event => {
        if (event.data.type === 'YoutubeVolumeScroll-config-save' && typeof event.data.config === 'object') {
            configFromPageAccess = event.data.config;
            console.log('saving config from pageAccess', event.data.config); // DELETE
            browserApi.storage.sync.set({ config: event.data.config });
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
    window.postMessage({ type: 'YoutubeVolumeScroll-config-change', config }, '*');
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

// recursive function to compare two position objects
function simpleAreEqual(pos1, pos2) {
    //return JSON.stringify(pos1) === JSON.stringify(pos2); // this is too slow
    if (typeof pos1 !== typeof pos2) return false;

    switch (typeof pos1) {
        case 'object':
            for (const p of Object.keys(pos1)) {
                if (!this.simpleAreEqual(pos1[p], pos2[p])) return false;
            }
            break;
        case 'string':
        case 'number':
        case 'boolean':
            if (pos1 !== pos2) return false;
            break;
        default:
            throw new Error(`.simpleAreEqual() encountered an unknown type: {${typeof (pos1)}} pos1: ${pos1}, pos2: ${pos2}`);
    }

    return true;
}  
