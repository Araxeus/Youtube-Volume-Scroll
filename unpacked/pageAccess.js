
const $ = document.querySelector.bind(document);
const oneMonth = 2592e6;

let api = $('#movie_player');

const isMusic = window.location.href.includes('music.youtube');

const hudTypes = {
    custom: 0,
    native: 1,
    none: 2
};

let config = {
    steps: 1,
    hud: hudTypes.custom
};

// set last active time to now every 15min (blocks "are you there?" popup)
setInterval(() => window._lact = Date.now(), 9e5);

let hudFadeTimeout;

init();

function init() {
    api ??= $('#movie_player');
    if (!api) return setTimeout(init, 250);

    setupConfig();
    setupIncognito();
    setupDomTweaks();
    setupOnWheel();
    injectVolumeHud();
    setupHudOnVolume();
}

function setupConfig() {
    // listen for 'steps' change
    document.addEventListener('YoutubeVolumeScroll-config', (event) => {
        if (typeof event.detail.config === 'object') {
            config = event.detail.config;
        }
    }, false);
}

function setupIncognito() {
    let volumeCookie;
    try {
        volumeCookie = window.localStorage.getItem('Youtube-Volume-Scroll');
    } catch {
        printIncognitoError();
    }
    if (volumeCookie) {
        volumeCookie = JSON.parse(volumeCookie);
        if (volumeCookie.incognito === true && volumeCookie.savedVolume !== api.getVolume()) {
            api.setVolume(volumeCookie.savedVolume);
            if (!isMusic) saveNativeVolume(volumeCookie.savedVolume);
        }
    }
}

function setupOnWheel() {
    (isMusic ?
        $('#main-panel') :
        $('.html5-video-player#movie_player')
    ).onwheel = event => {
        event.preventDefault();
        // Event.deltaY < 0 means wheel-up (increase), > 0 means wheel-down (decrease)
        if (event.deltaY !== 0) changeVolume(event.deltaY < 0, event.shiftKey ? 2 : 1);
        // Event.deltaX < 0 means wheel-left (decrease), > 0 means wheel-right (increase)
        if (event.deltaX !== 0) changeVolume(event.deltaX > 0, event.shiftKey ? 2 : 1);
    };
}

function changeVolume(toIncrease, modifier) {
    const newVolume = Math.round(
        toIncrease
            ? Math.min(api.getVolume() + (config.steps * modifier), 100)
            : Math.max(api.getVolume() - (config.steps * modifier), 0)
    );

    // Have to manually mute/unmute on youtube.com
    if (!isMusic && newVolume > 0 && api.isMuted()) {
        api.unMute();
    }

    api.setVolume(newVolume);

    if (!isMusic) saveNativeVolume(newVolume);

    document.dispatchEvent(
        new CustomEvent('YoutubeVolumeScroll-volume', { detail: { volume: newVolume } })
    );
}

function getVolumeHud() {
    const selector = config.hud === hudTypes.native ? '#volume-hud-native' : '#volume-hud';
    let volumeHud = $(selector);
    if (volumeHud === null) {
        injectVolumeHud();
        volumeHud = $(selector);
    }
    if (volumeHud === null) {
        console.error('Cannot Create Youtube-Volume-Scroll HUD');
        return null;
    }
    return volumeHud;
}


function injectVolumeHud() {
    const hudContainer = () => $(
        isMusic ?
            '#song-video' :
            '#movie_player .html5-video-container'
    );

    switch (config.hud) {
        case hudTypes.none:
            break;
        case hudTypes.native:
            if (!$('#volume-hud-native')) {
                createNative();
            }
            break;
        case hudTypes.custom:
        default:
            if (!$('#volume-hud')) {
                createCustom();
            }
    }

    function createNative() {
        const volumeHudNativeWrapper = document.createElement('div');
        volumeHudNativeWrapper.id = 'volume-hud-native-wrapper';
        volumeHudNativeWrapper.style.opacity = 0;
        volumeHudNativeWrapper.classList.add('ytp-bezel-text-wrapper');
        const volumeHudNative = document.createElement('div');
        volumeHudNative.id = 'volume-hud-native';
        volumeHudNative.classList.add('ytp-bezel-text');
        volumeHudNativeWrapper.appendChild(volumeHudNative);
        hudContainer().insertAdjacentElement('afterend', volumeHudNativeWrapper);
    }

    function createCustom() {
        const volumeHud = document.createElement('span');
        volumeHud.id = 'volume-hud';
        if (isMusic) volumeHud.classList.add('music');
        hudContainer().insertAdjacentElement('afterend', volumeHud);
    }
}

function setupHudOnVolume() {
    $('video').addEventListener('volumechange', () => {
        if (config.hud !== hudTypes.none) {
            showVolume(Math.round(api.getVolume()));
        }
    });
}

function showVolume(volume) {
    let volumeHud = getVolumeHud();
    if (volumeHud === null) return;

    volumeHud.textContent = volume + '%';
    volumeHud.style.opacity = 1;
    if (config.hud === hudTypes.native) {
        volumeHud.parentElement.style.opacity = 1;
    }

    if (hudFadeTimeout) clearTimeout(hudFadeTimeout);
    hudFadeTimeout = setTimeout(() => {
        volumeHud.style.opacity = 0;
        if (config.hud === hudTypes.native) {
            volumeHud.parentElement.style.opacity = 0;
        }
        hudFadeTimeout = null;
    }, getHudTime());
}

function getHudTime() {
    switch (config.hud) {
        case hudTypes.none:
            return 0;
        case hudTypes.native:
            return 1e3;
        case hudTypes.custom:
        default:
            return 1.5e3;
    }
}

function setupDomTweaks() {
    if (!isMusic) {
        $('.ytp-cards-button-icon').style.display = 'none';
        $('.ytp-chrome-top-buttons').style.display = 'none';
        // remove the real native volume hud
        $('.ytp-bezel-text-wrapper').parentElement.remove();
    }
}

// save the volume to a native cookies used by youtube.com
function saveNativeVolume(newVolume) {
    const data = JSON.stringify({
        volume: newVolume,
        muted: newVolume <= 0,
    });
    const timeNow = Date.now();

    try {
        window.localStorage.setItem('yt-player-volume', JSON.stringify({
            data: data,
            expiration: timeNow + oneMonth,
            creation: timeNow,
        }));

        window.sessionStorage.setItem('yt-player-volume', JSON.stringify({
            data: data,
            creation: timeNow,
        }));
    } catch {
        printIncognitoError();
    }
}

function printIncognitoError() {
    console.error('Youtube-Volume-Scroll could not save volume to cookies, if you are in incognito mode see https://i.stack.imgur.com/mEidB.png');
}

