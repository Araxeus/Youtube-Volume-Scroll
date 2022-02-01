const $ = document.querySelector.bind(document);
const oneMonth = 2592e6;

let isMusic;
let steps = 1;

window.addEventListener('load', start, { once: true });

// keep 'steps' in sync with extension popup
chrome.storage.sync.get('steps', data => {
    if (data.steps) steps = Number(data.steps);
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.steps?.newValue) {
        steps = Number(changes.steps.newValue);
    }
});

function start() {
    const url = window.location.href;
    if (!url.includes('youtube')) {
        console.error('trying to load Youtube-Volume-Scroll outside of youtube domains');
        return;
    }

    isMusic = url.includes('music.youtube');

    if (chrome.extension.inIncognitoContext) {
        setupIncognito();
    }

    if ($('video')) {
        checkOverlay();
        return;
    }

    const documentObserver = new MutationObserver(() => {
        if ($('video')) {
            documentObserver.disconnect();
            checkOverlay();
        }
    })

    documentObserver.observe(document.documentElement, { childList: true, subtree: true });
}

// check the extension is inside a youtube embedded iframe that isn't active yet
function checkOverlay() {
    const overlay = $('.ytp-cued-thumbnail-overlay-image');
    const noOverlay = () => !overlay || !overlay.style.backgroundImage || overlay.parentNode.style.display === 'none';
    if (noOverlay()) {
        setup();
    } else {
        const overlayObserver = new MutationObserver(() => {
            if (noOverlay()) {
                overlayObserver.disconnect();
                setup();
            }
        });

        overlayObserver.observe(overlay.parentNode, { attributeFilter: ['style'] });
    }
}

function setup() {

    loadPageAccess();

    setVideoVolumeOnwheel();

    window.addEventListener('message', (event) => {
        if (event.data.type === 'Youtube-Volume-Scroll' &&
            typeof event.data.newVolume === 'number') {
            saveVolume(event.data.newVolume)
        }
    })

    console.log('loaded Youtube-Volume-Scroll on url: ', window.location.href);
}

function loadPageAccess() {
    let pageAccess = document.createElement('script');
    pageAccess.src = chrome.runtime.getURL('pageAccess.js');
    pageAccess.onload = function () {
        this.remove();
    };
    (document.head || document.documentElement).appendChild(pageAccess);
}

function setVideoVolumeOnwheel() {
    (isMusic ?
        $('#main-panel') :
        $('.html5-video-player')
    ).onwheel = event => {
        event.preventDefault();
        // Event.deltaY < 0 means wheel-up
        changeVolume(event.deltaY < 0, event.shiftKey);
    };
}

function changeVolume(toIncrease, shiftHeld = false) {
    //post new volume to pageAccess.js
    window.postMessage({ type: 'Youtube-Volume-Scroll', steps: shiftHeld ? steps * 2 : steps, toIncrease: toIncrease }, '*');
}

function setupIncognito() {
    chrome.storage.sync.get('savedVolume', data => {
        if (data?.savedVolume !== undefined) {
            // indicate to pageAccess that we are in incognito
            window.localStorage.setItem('Youtube-Volume-Scroll', JSON.stringify({
                incognito: true,
                savedVolume: data.savedVolume
            }));
            if (!isMusic) {
                // setup native youtube volume cookie
                const cookieData = JSON.stringify({
                    volume: data.savedVolume,
                    muted: data.savedVolume <= 0
                })
                const timeNow = Date.now();

                window.localStorage.setItem('yt-player-volume', JSON.stringify({
                    data: cookieData,
                    expiration: timeNow + oneMonth,
                    creation: timeNow
                }));

                window.sessionStorage.setItem('yt-player-volume', JSON.stringify({
                    data: cookieData,
                    creation: timeNow
                }));
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
        chrome.storage.sync.set({ savedVolume: newVolume });
        saveTimeout = null;
    }, 1000)
}
