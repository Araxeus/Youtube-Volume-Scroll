const $ = document.querySelector.bind(document);
const oneMonth = 2592e6;

const api = $('#movie_player');

const isMusic = window.location.href.includes('music.youtube');

let steps = 1;

// listen for 'steps' change
window.addEventListener('message', event => {
    if (event.data.type === 'Youtube-Volume-Scroll' && typeof event.data.steps === 'number') {
        steps = event.data.steps;
    }
}, false);

let volumeCookie = window.localStorage.getItem('Youtube-Volume-Scroll');

let hudFadeTimeout;

// incognito setup
if (volumeCookie) {
    volumeCookie = JSON.parse(volumeCookie);
    if (volumeCookie.incognito === true && volumeCookie.savedVolume !== api.getVolume()) {
        api.setVolume(volumeCookie.savedVolume);
        if (!isMusic) saveNativeVolume(volumeCookie.savedVolume);
    }
}

// set last active time to now every 15min (blocks "are you there?" popup)
setInterval(() => window._lact = Date.now(), 9e5);

(isMusic ?
    $('#main-panel') :
    $('.html5-video-player')
).onwheel = event => {
    event.preventDefault();
    // Event.deltaY < 0 means wheel-up
    changeVolume(event.deltaY < 0, event.shiftKey ? 2 : 1);
};

function changeVolume(toIncrease, modifier) {
    const newVolume = Math.round(toIncrease ?
        Math.min(api.getVolume() + (steps * modifier), 100) :
        Math.max(api.getVolume() - (steps * modifier), 0));

    // Have to manually mute/unmute on youtube.com
    if (!isMusic && newVolume > 0 && api.isMuted()) {
        //$('.ytp-mute-button').click();
        api.unMute();
    }

    api.setVolume(newVolume);

    showVolume(newVolume);

    if (!isMusic) saveNativeVolume(newVolume);

    window.postMessage({ type: 'Youtube-Volume-Scroll', newVolume: newVolume }, '*');
}

injectVolumeHud();

function getVolumeHud() {
    let volumeHud = $('#volumeHud');
    if (volumeHud === null) {
        injectVolumeHud();
        volumeHud = $('#volumeHud');
    }
    if (volumeHud === null) {
        console.err('Cannot Create Youtube-Volume-Scroll HUD');
        return null;
    }
    return volumeHud;
}

function injectVolumeHud() {
    if ($('#volumeHud')) return;

    if (!isMusic) {
        $('.ytp-cards-button-icon').style.display = 'none';
        $('.ytp-chrome-top-buttons').style.display = 'none';
    }

    $(isMusic ?
        '#song-video' :
        '.html5-video-container'
    ).insertAdjacentHTML('afterend', `<span id='volumeHud' ${isMusic ? "class='music'" : ''}></span>`)
}

function showVolume(volume) {
    let volumeHud = getVolumeHud();
    if (volumeHud === null) return;

    volumeHud.textContent = volume + '%';
    volumeHud.style.opacity = 1;

    if (hudFadeTimeout) clearTimeout(hudFadeTimeout);
    hudFadeTimeout = setTimeout(() => {
        volumeHud.style.opacity = 0;
        hudFadeTimeout = null;
    }, 1.5e3);
}

// save the volume to a native cookies used by youtube.com
function saveNativeVolume(newVolume) {
    const data = JSON.stringify({
        volume: newVolume,
        muted: newVolume <= 0
    })
    const timeNow = Date.now();

    window.localStorage.setItem('yt-player-volume', JSON.stringify({
        data: data,
        expiration: timeNow + oneMonth,
        creation: timeNow
    }));

    window.sessionStorage.setItem('yt-player-volume', JSON.stringify({
        data: data,
        creation: timeNow
    }));
}
