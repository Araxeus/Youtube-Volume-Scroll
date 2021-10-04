let isMusic;

const $ = document.querySelector.bind(document);

// save volume after a delay to avoid throttle limit
// https://developer.chrome.com/docs/extensions/reference/storage/#storage-and-throttling-limits
let saveTimeout;

window.addEventListener('load', () => {
    try {
        setup();
    } catch {
        setTimeout(setup, 2000);
    }
}, { once: true });

function setup() {
    const url = window.location.href;
    if (!url.includes('youtube')) {
        console.error('trying to load Youtube-Volume-Scroll outside of youtube domains');
        return;
    }

    isMusic = url.includes('music.youtube');

    if (chrome.extension.inIncognitoContext) {
        chrome.storage.sync.get('savedVolume', data => {
            if (data && (data.savedVolume !== undefined)) {
                window.localStorage.setItem('Youtube-Volume-Scroll', JSON.stringify({
                    incognito: true,
                    savedVolume: data.savedVolume
                }));
            }
        });
    }

    loadPageAccess();

    setVideoVolumeOnwheel();

    window.addEventListener('message', (event) => {
        if (event.data.type && event.data.type === 'Youtube-Volume-Scroll' &&
            event.data.newVolume !== null && typeof event.data.newVolume === 'number') {
            saveVolume(event.data.newVolume)
        }
    })

    console.log('loaded Youtube-Volume-Scroll');

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
    window.postMessage({ type: 'Youtube-Volume-Scroll', steps: shiftHeld ? 5 : 1, toIncrease: toIncrease }, '*');
}

function saveVolume(newVolume) {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        chrome.storage.sync.set({ savedVolume: newVolume });
        saveTimeout = null;
    }, 1000)
}
