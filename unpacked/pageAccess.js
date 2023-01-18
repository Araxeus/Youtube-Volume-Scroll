
// set last active time to now every 15min (blocks "are you there?" popup)
setInterval(() => window._lact = Date.now(), 9e5);

const YoutubeVolumeScroll = {
    $: document.querySelector.bind(document),
    oneMonth: 2592e6,
    isMusic: window.location.href.includes('music.youtube'),
    api: null,
    hudTypes: {
        custom: 0,
        native: 1,
        none: 2
    },
    config: null,
    hudFadeTimeout: null,

    printIncognitoError() {
        console.error('Youtube-Volume-Scroll: Could not save volume in incognito mode');
    },

    init() {
        this.api ??= this.$('#movie_player');
        if (!this.api) return setTimeout(this.init, 250);
        this.setupConfig();
        this.setupIncognito();
        this.setupDomTweaks();
        this.setupOnWheel();
        this.injectVolumeHud();
        this.setupHudOnVolume();
    },

    setupConfig() {
        this.config = {
            steps: 1,
            hud: this.hudTypes.custom
        }; // default config as placeholder
        document.addEventListener('YoutubeVolumeScroll-config', (event) => {
            if (typeof event.detail.config === 'object') {
                this.config = event.detail.config;
            }
        }, false);
    },

    setupIncognito() {
        let volumeCookie;
        try {
            volumeCookie = window.localStorage.getItem('Youtube-Volume-Scroll');
        } catch {
            this.printIncognitoError();
        }
        if (volumeCookie) {
            volumeCookie = JSON.parse(volumeCookie);
            if (volumeCookie.incognito === true && volumeCookie.savedVolume !== this.api.getVolume()) {
                this.api.setVolume(volumeCookie.savedVolume);
                if (!this.isMusic) this.saveNativeVolume(volumeCookie.savedVolume);
            }
        }
    },

    setupDomTweaks() {
        if (!this.isMusic) {
            this.$('.ytp-cards-button-icon').style.display = 'none';
            this.$('.ytp-chrome-top-buttons').style.display = 'none';
            // remove the real native volume hud
            this.$('.ytp-bezel-text-wrapper').parentElement.remove();
        }
    },


    setupOnWheel() {
        (this.isMusic ?
            this.$('#main-panel') :
            this.$('.html5-video-player#movie_player')
        ).onwheel = event => {
            event.preventDefault();
            // Event.deltaY < 0 means wheel-up (increase), > 0 means wheel-down (decrease)
            if (event.deltaY !== 0) this.changeVolume(event.deltaY < 0, event.shiftKey ? 2 : 1);
            // Event.deltaX < 0 means wheel-left (decrease), > 0 means wheel-right (increase)
            if (event.deltaX !== 0) this.changeVolume(event.deltaX > 0, event.shiftKey ? 2 : 1);
        };
    },

    changeVolume(toIncrease, modifier) {
        const newVolume = Math.round(
            toIncrease ?
                Math.min(this.api.getVolume() + (this.config.steps * modifier), 100) :
                Math.max(this.api.getVolume() - (this.config.steps * modifier), 0)
        );

        // Have to manually mute/unmute on youtube.com
        if (!this.isMusic && newVolume > 0 && this.api.isMuted()) {
            this.api.unMute();
        }

        this.api.setVolume(newVolume);

        if (!this.isMusic) this.saveNativeVolume(newVolume);

        document.dispatchEvent(
            new CustomEvent('YoutubeVolumeScroll-volume', { detail: { volume: newVolume } })
        );
    },

    // save the volume to a native cookies used by youtube.com
    saveNativeVolume(newVolume) {
        const data = JSON.stringify({
            volume: newVolume,
            muted: newVolume <= 0,
        });
        const timeNow = Date.now();

        try {
            window.localStorage.setItem('yt-player-volume', JSON.stringify({
                data: data,
                expiration: timeNow + this.oneMonth,
                creation: timeNow,
            }));

            window.sessionStorage.setItem('yt-player-volume', JSON.stringify({
                data: data,
                creation: timeNow,
            }));
        } catch {
            this.printIncognitoError();
        }
    },

    getVolumeHud() {
        const selector = this.config.hud === this.hudTypes.native ? '#volume-hud-native' : '#volume-hud';
        let volumeHud = this.$(selector);
        if (volumeHud === null) {
            this.injectVolumeHud();
            volumeHud = this.$(selector);
        }
        if (volumeHud === null) {
            console.error('Cannot Create Youtube-Volume-Scroll HUD');
            return null;
        }
        return volumeHud;
    },

    injectVolumeHud() {
        const hudContainer = () => this.$(this.isMusic ? '#song-video' : '#movie_player .html5-video-container');
        switch (this.config.hud) {
            case this.hudTypes.none:
                break;
            case this.hudTypes.native:
                if (!this.$('#volume-hud-native')) {
                    createNative();
                }
                break;
            case this.hudTypes.custom:
            default:
                if (!this.$('#volume-hud')) {
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
            if (YoutubeVolumeScroll.isMusic) volumeHud.classList.add('music');
            hudContainer().insertAdjacentElement('afterend', volumeHud);
        }
    },

    setupHudOnVolume() {
        this.$('video').addEventListener('volumechange', () => {
            if (this.config.hud !== this.hudTypes.none) {
                this.showVolume(Math.round(this.api.getVolume()));
            }
        });
    },

    showVolume(volume) {
        const volumeHud = this.getVolumeHud();
        if (volumeHud === null) return;

        volumeHud.textContent = volume + '%';
        volumeHud.style.opacity = 1;
        if (this.config.hud === this.hudTypes.native) {
            volumeHud.parentElement.style.opacity = 1;
        }

        if (this.hudFadeTimeout) clearTimeout(this.hudFadeTimeout);
        this.hudFadeTimeout = setTimeout(() => {
            volumeHud.style.opacity = 0;
            if (this.config.hud === this.hudTypes.native) {
                volumeHud.parentElement.style.opacity = 0;
            }
            this.hudFadeTimeout = null;
        }, getHudTime());

        function getHudTime() {
            switch (YoutubeVolumeScroll.config.hud) {
                case YoutubeVolumeScroll.hudTypes.none:
                    return 0;
                case YoutubeVolumeScroll.hudTypes.native:
                    return 1e3;
                case YoutubeVolumeScroll.hudTypes.custom:
                default:
                    return 1.5e3;
            }
        }
    }
};

YoutubeVolumeScroll.init();

