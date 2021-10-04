const $ = document.querySelector.bind(document);

const api = $('#movie_player');

const isMusic = window.location.href.includes('music.youtube');

let hudFadeTimeout;

const oneMonth = 2592000000;

let volumeCookie = window.localStorage.getItem('Youtube-Volume-Scroll');

if (volumeCookie) {
    volumeCookie = JSON.parse(volumeCookie);
    if (volumeCookie.incognito === true && volumeCookie.savedVolume !== api.getVolume()) {
        api.setVolume(volumeCookie.savedVolume);
        if (!isMusic) saveNativeVolume(volumeCookie.savedVolume);
    }
}

window.addEventListener('message', (event) => {
    if (!event.data.type || event.data.type !== 'Youtube-Volume-Scroll' ||
        event.data.steps === undefined || typeof event.data.steps !== 'number' ||
        event.data.toIncrease === undefined || typeof event.data.toIncrease !== 'boolean') {
        return;
    }

    const newVolume = event.data.toIncrease ?
        Math.min(api.getVolume() + event.data.steps, 100) :
        Math.max(api.getVolume() - event.data.steps, 0);

    // Have to manually mute/unmute on youtube.com
    if (!isMusic && newVolume > 0 && api.isMuted()) {
        //$('.ytp-mute-button').click();
        api.unMute();
    }

    showVolume(newVolume);

    api.setVolume(newVolume);

    if (!isMusic) saveNativeVolume(newVolume);

    window.postMessage({ type: 'Youtube-Volume-Scroll', newVolume: newVolume }, '*');

}, false);

injectVolumeHud();

function getVolumeHud() {
    let volumeHud = $('#volumeHud');
    if (volumeHud === null) {
        injectVolumeHud();
        volumeHud = $('#volumeHud');
    }
    if (volumeHud === null) {
        console.err('Cannot Create BetterYoutubeVolume HUD');
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

    const elementSelector = isMusic ?
        '#song-video' :
        '.html5-video-container';

    const position = `top: ${isMusic ? '10px' : '5px'}; ${isMusic ? 'left: 10px' : 'right: 5px'}; z-index: 999; position: absolute;`;
    const mainStyle = 'font-size: xxx-large; padding: 10px; transition: opacity 0.6s; font-weight: 600; text-shadow: -1px 1px 2px #000, 1px 1px 2px #000, 1px -1px 0 #000, -1px -1px 0 #000;';

    $(elementSelector).insertAdjacentHTML('afterend', `<span id='volumeHud' style='${position + mainStyle}'></span>`)
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
    }, 1500);
}

//this function saves the volume to a native cookies used by youtube.com
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
