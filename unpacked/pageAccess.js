
// set last active time to now every 15min (blocks "are you there?" popup)
setInterval(() => window._lact = Date.now(), 9e5);

class ytvs {
    static $ = document.querySelector.bind(document);
    static isMusic = window.location.href.includes('music.youtube');
    static oneMonth = 2592e6;
    static hudTypes = {
        custom: 0,
        native: 1,
        none: 2
    };

    static isLoaded = false;

    static #steps = null;
    static #hud = null;
    static get steps() {
        return this.#steps ?? 1;
    }
    static get hud() {
        return this.#hud ?? ytvs.hudTypes.custom;
    }

    static #initDone = false;
    static init() {
        if (this.#initDone) return console.warn('ytvs.init() was already called');
        window.addEventListener('message', event => {
            if (event.data.type === 'YoutubeVolumeScroll-config' && typeof event.data.config === 'object') {
                this.#steps = event.data.config.steps;
                this.#hud = event.data.config.hud;
            }
        }, false);
        this.#initDone = true;
    }

    static getCookie(n) {
        return document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${n}=`));
    }
}


class YoutubeVolumeScroll {
    volume = null;
    hudFadeTimeout = null;

    isShorts = false;
    api = null;
    scrollTarget = null;
    hudContainer = null;
    hudAfter = null;

    static run() {
        if (ytvs.isLoaded) return;
        if (ytvs.isMusic) {
            this.newMusic();
        } else {
            this.newYoutube();
        }
    }

    static newYoutube() {
        return new this({
            api: ytvs.$('#movie_player'),
            scrollTarget: '#movie_player',
            hudContainer: '#movie_player',
            hudAfter: '#movie_player .html5-video-container',
            customFunction: () => {
                ytvs.$('.ytp-cards-button-icon').style.display = 'none';
                ytvs.$('.ytp-chrome-top-buttons').style.display = 'none';
                // remove the real native volume hud
                ytvs.$('.ytp-bezel-text-wrapper').parentElement.remove();
            }
        });
    }

    static newYoutubeShorts() {
        return new this({
            api: ytvs.$('#shorts-player'),
            scrollTarget: 'ytd-player.ytd-shorts',
            hudContainer: 'ytd-player.ytd-shorts',
            hudAfter: 'ytd-player.ytd-shorts div',
            isShorts: true
        });
    }

    static newMusic() {
        return new this({
            api: ytvs.$('#movie_player'),
            scrollTarget: '#main-panel',
            hudContainer: 'ytmusic-player',
            hudAfter: '#song-video',
        });
    }

    constructor({ api, scrollTarget, hudContainer, hudAfter, isShorts, customFunction }) {
        this.api = api;
        // Saves the volume locally so that hudOnVolume doesn't show hud if volume wasn't actually changed 
        // (e.g. the sponsorblock skip function triggers a volume change without actually changing the volume)
        this.volume = this.api.getVolume();
        if (!isShorts && !ytvs.isLoaded) {
            this.#setupIncognito();
        }

        this.scrollTarget = scrollTarget;
        this.hudContainer = hudContainer;
        this.hudAfter = hudAfter;
        this.isShorts = isShorts;

        this.setupOnWheel();
        customFunction?.(this);

        this.setupHudOnVolume();
        if (!isShorts) {
            ytvs.isLoaded = true;
        }
    }

    printIncognitoError() {
        console.error('Youtube-Volume-Scroll: Could not save volume in incognito mode');
    }

    #setupIncognito() {
        let volumeCookie;
        try {
            volumeCookie = JSON.parse(window.localStorage.getItem('Youtube-Volume-Scroll'));
        } catch {
            this.printIncognitoError();
        }
        if (volumeCookie) {
            if (volumeCookie.incognito === true && volumeCookie.savedVolume !== this.api.getVolume()) {
                this.api.setVolume(volumeCookie.savedVolume);
                this.saveNativeVolume(volumeCookie.savedVolume);
            }
        }
    }

    setupOnWheel() {
        ytvs.$(this.scrollTarget).onwheel = event => {
            // Event.deltaY < 0 means wheel-up (increase), > 0 means wheel-down (decrease)
            if (event.deltaY !== 0) this.changeVolume(event.deltaY < 0, event.shiftKey ? 2 : 1);
            // Event.deltaX < 0 means wheel-left (decrease), > 0 means wheel-right (increase)
            if (event.deltaX !== 0) this.changeVolume(event.deltaX > 0, event.shiftKey ? 2 : 1);
            return false;
        };
    }

    changeVolume(toIncrease, modifier) {
        const newVolume = Math.round(
            toIncrease ?
                Math.min(this.api.getVolume() + (ytvs.steps * modifier), 100) :
                Math.max(this.api.getVolume() - (ytvs.steps * modifier), 0)
        );

        // Have to manually mute/unmute on youtube.com
        if (!ytvs.isMusic && newVolume > 0 && this.api.isMuted()) {
            this.api.unMute();
        }

        this.api.setVolume(newVolume);

        if (this.isShorts) return;

        this.saveNativeVolume(newVolume);

        window.postMessage({ type: 'YoutubeVolumeScroll-volume', newVolume }, '*');
    }

    saveNativeVolume(volume) {
        if (!ytvs.isMusic) this.saveVolumeToStorage(volume);

        const pref = ytvs.getCookie('PREF');
        if (pref) {
            document.cookie = pref.replace(/volume=(\d+)/, 'volume=' + volume) + ';domain=.youtube.com';
        }
    }

    saveVolumeToStorage(volume) {
        const data = JSON.stringify({
            volume,
            muted: volume <= 0,
        });
        const timeNow = Date.now();

        try {
            window.localStorage.setItem('yt-player-volume', JSON.stringify({
                data: data,
                expiration: timeNow + ytvs.oneMonth,
                creation: timeNow,
            }));

            window.sessionStorage.setItem('yt-player-volume', JSON.stringify({
                data: data,
                creation: timeNow,
            }));
        } catch {
            this.printIncognitoError();
        }
    }

    getVolumeHud() {
        const selector = ytvs.hud === ytvs.hudTypes.native ? '.volume-hud-native' : '.volume-hud-custom';
        let volumeHud = ytvs.$(`${this.hudContainer} ${selector}`);

        if (volumeHud === null) {
            this.injectVolumeHud();
            volumeHud = ytvs.$(`${this.hudContainer} ${selector}`);
        }
        if (volumeHud === null) {
            console.error('Cannot Create Youtube-Volume-Scroll HUD', `$('${this.hudContainer} ${selector}')`);
            return null;
        }
        return volumeHud;
    }

    injectVolumeHud() {
        const getWrapper = () => {
            let volumeHudWrapper = ytvs.$(`${this.hudContainer} .volume-hud-wrapper`);
            if (!volumeHudWrapper) {
                volumeHudWrapper = document.createElement('div');
                volumeHudWrapper.classList.add('volume-hud-wrapper');
                ytvs.$(this.hudAfter).insertAdjacentElement('afterend', volumeHudWrapper);
            }
            return volumeHudWrapper;
        };

        const createNative = () => {
            const volumeHudNativeWrapper = document.createElement('div');
            volumeHudNativeWrapper.style.opacity = 0;
            volumeHudNativeWrapper.classList.add('ytp-bezel-text-wrapper', 'volume-hud-native-wrapper');
            const volumeHudNative = document.createElement('div');
            volumeHudNative.classList.add('ytp-bezel-text', 'volume-hud-native');
            volumeHudNativeWrapper.appendChild(volumeHudNative);
            const volumeHudWrapper = getWrapper();
            volumeHudWrapper.appendChild(volumeHudNativeWrapper);
        };

        const createCustom = () => {
            const volumeHud = document.createElement('span');
            volumeHud.classList.add('volume-hud', 'volume-hud-custom');
            if (ytvs.isMusic) volumeHud.classList.add('music');

            const volumeHudWrapper = getWrapper();
            volumeHudWrapper.appendChild(volumeHud);
        };

        switch (ytvs.hud) {
            case ytvs.hudTypes.none:
                break;
            case ytvs.hudTypes.native:
                if (!ytvs.$(`${this.hudContainer} .volume-hud-native`)) {
                    createNative();
                }
                break;
            case ytvs.hudTypes.custom:
            default:
                if (!ytvs.$(`${this.hudContainer} .volume-hud-custom`)) {
                    createCustom();
                }
        }
    }

    setupHudOnVolume() {
        const video = ytvs.$(`${this.hudContainer} video`);
        setTimeout(() => {
            video.addEventListener('volumechange', () => {
                if (ytvs.hud !== ytvs.hudTypes.none && this.volume !== this.api.getVolume()) {
                    this.showVolume(Math.round(this.api.getVolume()));
                }
                this.volume = this.api.getVolume();
            });
        });
    }

    checkWrapperClass() {
        const volumeHudWrapper = ytvs.$(`${this.hudContainer} .volume-hud-wrapper`);

        if (ytvs.hud === ytvs.hudTypes.native) {
            volumeHudWrapper.setAttribute('type', 'native');
        } else if (ytvs.hud === ytvs.hudTypes.custom) {
            volumeHudWrapper.setAttribute('type', 'custom');
        }
    }

    showVolume(volume) {
        const volumeHud = this.getVolumeHud();
        if (volumeHud === null) return;

        const hudTimes = {
            [ytvs.hudTypes.none]: 0,
            [ytvs.hudTypes.native]: 1e3,
            [ytvs.hudTypes.custom]: 1.5e3,
        };

        const setOpacity = (opacity) => {
            volumeHud.style.opacity = opacity;
            if (ytvs.hud === ytvs.hudTypes.native) {
                volumeHud.parentElement.style.opacity = opacity;
            }
        };

        this.checkWrapperClass();

        volumeHud.textContent = volume + '%';
        setOpacity(1);

        if (this.hudFadeTimeout) clearTimeout(this.hudFadeTimeout);
        this.hudFadeTimeout = setTimeout(() => {
            setOpacity(0);
            this.hudFadeTimeout = null;
        }, hudTimes[ytvs.hud]);
    }
}

ytvs.init();

if (ytvs.$('#movie_player:not(.unstarted-mode) video')) {
    YoutubeVolumeScroll.run();
} else {
    const documentObserver = new MutationObserver(() => {
        if (ytvs.$('#movie_player:not(.unstarted-mode) video')) {
            documentObserver.disconnect();
            YoutubeVolumeScroll.run();
        }
    });

    documentObserver.observe(ytvs.$('ytd-page-manager'), { childList: true, subtree: true });
}

if (!ytvs.isMusic) {
    if (ytvs.$('ytd-player.ytd-shorts video')) {
        YoutubeVolumeScroll.newYoutubeShorts();
    } else {
        const shortsListener = new MutationObserver((m) => {
            if (m[0].addedNodes[0].tagName === 'YTD-SHORTS') {
                shortsListener.disconnect();
                const shortsVideoListener = new MutationObserver(() => {
                    if (ytvs.$('ytd-player.ytd-shorts video')) {
                        YoutubeVolumeScroll.newYoutubeShorts();
                        shortsVideoListener.disconnect();
                    }
                });
                shortsVideoListener.observe(ytvs.$('ytd-page-manager ytd-shorts'), { childList: true, subtree: true });
            }
        });
        shortsListener.observe(ytvs.$('ytd-page-manager'), { childList: true });
    }
}
