const selectors = {
    youtube_music: "#song-video",
    youtube: ".html5-video-container"
}

const $ = document.querySelector.bind(document);

function getVolumeHud() {
    let volumeHud = $("#volumeHud");
    if (volumeHud === null) {
        injectVolumeHud(window.location.href.includes("music.youtube"));
        volumeHud = $("#volumeHud");
    }
    if (volumeHud === null) {
        console.err("Cannot Create BetterYoutubeVolume HUD");
        return null;
    }
    return volumeHud;
}

function injectVolumeHud(isMusic) {
    if ($("#volumeHud")) return;

    if (!isMusic) {
        $(".ytp-cards-button-icon").style.display = "none";
    }

    const elementSelector = isMusic ?
        selectors.youtube_music :
        selectors.youtube;

    const position = `top: ${isMusic ? "10px" : "5px"}; ${isMusic ? "left: 10px" : "right: 5px"}; z-index: 999; position: absolute;`;
    const mainStyle = "font-size: xxx-large; padding: 10px; transition: opacity 0.6s; webkit-text-stroke: 1px black; font-weight: 600;";

    $(elementSelector).insertAdjacentHTML('afterend', `<span id="volumeHud" style="${position + mainStyle}"></span>`)
}

let fadeTimeout;

function showVolume(volume) {
    let volumeHud = getVolumeHud();
    if (volumeHud === null) return;

    volumeHud.textContent = volume + '%';
    volumeHud.style.opacity = 1;

    if (fadeTimeout) clearTimeout(fadeTimeout);
    fadeTimeout = setTimeout(() => {
        volumeHud.style.opacity = 0;
        fadeTimeout = null;
    }, 1500);
}

function register() {
    const url = window.location.href;
    if (url.includes("youtube")) {
        injectVolumeHud(url.includes("music.youtube"));
    }
}

function setVideoVolumeOnwheel(isMusic) {
    (isMusic ?
        $("#main-panel") :
        $(".html5-video-player")
    ).onwheel = event => {
        event.preventDefault();
        // Event.deltaY < 0 means wheel-up
        changeVolume(event.deltaY < 0, event.shiftKey);
    };
}

function changeVolume(toIncrease, shiftHeld = false) {
    const vid = $("video");
    const step = shiftHeld ? 0.05 : 0.01;
    vid.volume = toIncrease ?
        Math.min(vid.volume + step, 1) :
        Math.max(vid.volume - step, 0);
}


function setup() {
    const url = window.location.href;
    if (!url.includes("youtube")) {
        console.error("trying to load BetterYoutubeVolume outside of youtube domains");
        return;
    }

    const isMusic = url.includes("music.youtube");

    setVideoVolumeOnwheel(isMusic);

    injectVolumeHud(isMusic);

    if (isMusic) {
        $('video').addEventListener('volumechange',
            event => {
                const percentage = Math.round(event.target.volume * 100);
                showVolume(percentage);
                $("tp-yt-paper-slider#volume-slider.volume-slider").setAttribute("value", percentage);
                $("tp-yt-paper-slider#expand-volume-slider.expand-volume-slider").setAttribute("value", percentage);
            }
        );
    } else {
        $('video').addEventListener('volumechange',
        event => {
            showVolume(Math.round(event.target.volume * 100));
            $(".ytp-volume-slider-handle").style.left = Math.round(event.target.volume * 40) + "px";
        }
    );
    }
}

window.addEventListener('load', () => {
    try {
        setup();
    } catch {
        setTimeout(setup, 2000);
    }
}, { once: true });

/*
function test() {
    showVolume(Math.floor(Math.random() * 100));
}
*/