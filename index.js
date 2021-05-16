let savedVolume;
let isMusic;

const selectors = {
    youtube_music: "#song-video",
    youtube: ".html5-video-container"
}

const $ = document.querySelector.bind(document);

chrome.storage.sync.get("savedVolume", data => {
    if (data && (data.savedVolume || data.savedVolume === 0)) {
        savedVolume = data.savedVolume
    }
});

window.addEventListener('load', () => {
    try {
        setup();
    } catch {
        setTimeout(setup, 2000);
    }
}, { once: true });

function setup() {
    const url = window.location.href;
    if (!url.includes("youtube")) {
        console.error("trying to load Youtube-Volume-Scroll outside of youtube domains");
        return;
    }

    isMusic = url.includes("music.youtube");

    setVideoVolumeOnwheel();

    injectVolumeHud();

    setupVolumeChangeListener();

    overrideVideoVolume();

    console.log("loaded Youtube-Volume-Scroll");
}

function getVolumeHud() {
    let volumeHud = $("#volumeHud");
    if (volumeHud === null) {
        injectVolumeHud();
        volumeHud = $("#volumeHud");
    }
    if (volumeHud === null) {
        console.err("Cannot Create BetterYoutubeVolume HUD");
        return null;
    }
    return volumeHud;
}

function injectVolumeHud() {
    if ($("#volumeHud")) return;

    if (!isMusic) {
        $(".ytp-cards-button-icon").style.display = "none";
        $(".ytp-chrome-top-buttons").style.display = "none";
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

function setVideoVolumeOnwheel() {
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
    let newVolume = (toIncrease ?
        Math.min(vid.volume + step, 1) :
        Math.max(vid.volume - step, 0)).toFixed(2);

    // Have to manually mute/unmute on youtube.com
    if (!isMusic && (
        (newVolume <= 0 && !vid.muted) ||
        (newVolume > 0 && vid.muted))) {
        $(".ytp-mute-button").click();
    }

    setVolumeSliderPosition(newVolume);

    vid.volume = newVolume;

    showVolume(Math.round(vid.volume * 100));

}

function setVolumeSliderPosition(volume) {
    let percentage = Math.round(volume * 100);
    if (isMusic) {
        if (percentage < 5 && percentage > 0) percentage = 5;
        $("tp-yt-paper-slider#volume-slider.volume-slider").setAttribute("value", percentage);
        $("tp-yt-paper-slider#expand-volume-slider.expand-volume-slider").setAttribute("value", percentage);
    } else {
        $(".ytp-volume-slider-handle").style.left = Math.round(volume * 40) + "px";
    }
}

function setupVolumeChangeListener() {
    const video = $('video');

    video.addEventListener('volumechange', event =>
        saveVolume(Math.round(event.target.volume * 100))
    );

    video.addEventListener(isMusic ? "canplay" : "loadeddata", () =>
        overrideVideoVolume()
    );
}

function overrideVideoVolume() {
    const video = $('video');

    if ((savedVolume || savedVolume === 0)) {
        const newVolume = savedVolume / 100;
        video.volume = newVolume;
        setVolumeSliderPosition(newVolume);
        const volumeOverrideInterval = setInterval(() => {
            video.volume = newVolume;
        }, 4);
        setTimeout((interval) => {
            setVolumeSliderPosition(newVolume);
            clearInterval(interval);
        }, 500, volumeOverrideInterval);
    }
}

let saveTimeout;

function saveVolume(percentage) {
    if (savedVolume !== percentage) {
        savedVolume = percentage;
    }

    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        chrome.storage.sync.set({ savedVolume: percentage });
        saveTimeout = null;
    }, 1500)
}
