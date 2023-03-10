
// set last active time to now every 15min (blocks "are you there?" popup)
setInterval(() => window._lact = Date.now(), 9e5);

class ytvs {
    static #$ = document.querySelector.bind(document);
    static get $() {
        return this.#$;
    }

    static #isMusic = window.location.href.includes('music.youtube');
    static get isMusic() {
        return this.#isMusic;
    }

    static #oneMonth = 2592e6;
    static get oneMonth() {
        return this.#oneMonth;
    }

    static #hudTypes = {
        custom: 0,
        native: 1,
        none: 2
    };
    static #reversedHudTypes = Object.fromEntries(Object.entries(this.#hudTypes).map(([key, value]) => [value, key]));

    static get hudTypes() {
        return this.#hudTypes;
    }

    static #activationModifiers = {
        none: 0,
        shift: 1,
        rightClick: 2
    };
    static get activationModifiers() {
        return this.#activationModifiers;
    }

    static #isRightMouseDown = false;
    static get isRightMouseDown() {
        return this.#isRightMouseDown;
    }

    static #isLoaded = false;
    static get isLoaded() {
        return this.#isLoaded;
    }
    static set isLoaded(value) {
        if (typeof value !== 'boolean') {
            console.error('ytvs.isLoaded expects a boolean');
            return;
        }
        this.#isLoaded = value;
    }

    static #activeInstances = [];
    static get activeInstances() {
        return this.#activeInstances;
    }
    static addInstance(instance) {
        if (!(instance instanceof YoutubeVolumeScroll)) {
            console.error('ytvs.addInstance() expects a YoutubeVolumeScroll object');
            return;
        }
        this.#activeInstances.push(instance);
    }

    static #config = {
        steps: 1,
        hud: this.hudTypes.custom,
        hudSize: '50px',
        hudColor: '#eee',
        hudPositionMode: false,
        activationModifier: this.activationModifiers.none,
        hudPosition: {
            youtube: {
                top: '5px',
                bottom: 'unset',
                left: 'unset',
                right: '5px'
            },
            music: {
                top: '10px',
                bottom: 'unset',
                left: 'unset',
                right: '6%'
            },
            shorts: {
                top: '0',
                bottom: 'unset',
                left: 'unset',
                right: '35px'
            }
        }
    };

    static get steps() {
        return this.#config.steps ?? 1;
    }

    static get activationModifier() {
        return this.#config.activationModifier ?? this.activationModifiers.none;
    }

    static get hud() {
        return this.#config.hud ?? this.hudTypes.custom;
    }

    static get hudPositionMode() {
        return this.#config.hudPositionMode;
    }

    static get hudSize() {
        return this.#config.hudSize ?? '50px';
    }

    static get hudColor() {
        return this.#config.hudColor ?? '#eee';
    }

    static get hudPosition() {
        return this.#config.hudPosition;
    }
    static set hudPosition(value) {
        const [type, hudPosition] = Object.entries(value)[0];
        if (!this.hudPosition[type]) {
            console.error(`ytvs.hudPosition.${type} is not a valid type`);
            return;
        }
        if (typeof hudPosition !== 'object') {
            console.error(`ytvs.hudPosition.${type} expects an object`);
            return;
        }

        this.#config.hudPosition[type] = hudPosition;
        this.#save();
    }

    static #saveTimeout = undefined;
    static #save() {
        if (this.#saveTimeout) clearTimeout(this.#saveTimeout);
        this.#saveTimeout = setTimeout(() => {
            window.postMessage({
                type: 'YoutubeVolumeScroll-config-save',
                config: this.#config
            }, window.location.origin);
        }, 500);
    }

    static getCookie(n) {
        return document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${n}=`));
    }

    static #setupMouseObserver = () => {
        let changedVolumeWhileRightMouseDown = false;

        document.addEventListener('mousedown', e => {
            if (e.button === 2) {
                this.#isRightMouseDown = true;
            }
        });

        document.addEventListener('mouseup', e => {
            if (e.button === 2) {
                this.#isRightMouseDown = false;
                if (changedVolumeWhileRightMouseDown) {
                    changedVolumeWhileRightMouseDown = false;
                    setTimeout(() => this.$('body').oncontextmenu = undefined);
                    if (!this.isMusic) {
                        // send left click event to movie player
                        setTimeout(() => {
                            this.$('ytd-app')?.dispatchEvent(new MouseEvent('click', {
                                view: window,
                                bubbles: true,
                                cancelable: true
                            }));
                        });
                    }
                    return false;
                }
            }
        });

        window.addEventListener('message', e => {
            if (e.origin !== window.location.origin) return;
            if (e.data.type === 'YoutubeVolumeScroll-volume') {
                if (this.#isRightMouseDown) {
                    changedVolumeWhileRightMouseDown = true;
                    this.$('body').oncontextmenu = () => false;
                }
            }
        });
    };

    static #handleDataChange = config => {
        this.#config.steps = config.steps;
        if (this.hud !== config.hud) {
            this.#config.hud = config.hud;
            if (this.#initDone) {
                document.body.setAttribute('ytvs_type', this.#reversedHudTypes[ytvs.hud]);
                this.#activeInstances.forEach(obj => obj.showVolume());
            }
        }

        if (config.activationModifier !== this.activationModifier) {
            this.#config.activationModifier = config.activationModifier;
        }

        if (config.hudPositionMode !== this.hudPositionMode) {
            this.#config.hudPositionMode = config.hudPositionMode;
            if (this.hud === this.hudTypes.custom) {
                this.#activeInstances.forEach(obj => obj.updateHudPositionMode());
            }
        }

        if (config.hudSize && config.hudSize !== this.hudSize) {
            this.#config.hudSize = config.hudSize;
            this.#activeInstances.forEach(obj => obj.updateHudSize());
        }

        if (config.hudColor && config.hudColor !== this.hudColor) {
            this.#config.hudColor = config.hudColor;
            this.#activeInstances.forEach(obj => obj.updateHudColor());
        }

        if (config.hudPosition && !this.simpleAreEqual(config.hudPosition, this.hudPosition)) {
            this.#config.hudPosition = config.hudPosition;
            this.activeInstances.forEach(obj => obj.updateHudPosition());
        }
    };

    static #initDone = false;
    static init() {
        window.addEventListener('message', (e) => {
            if (e.origin !== window.location.origin) return;
            if (e.data.type === 'YoutubeVolumeScroll-config-change' && typeof e.data.config === 'object') {
                this.#handleDataChange(e.data.config);
                this.#initDone ||= true;
            }
        }, false);

        this.#setupMouseObserver();
    }

    static simpleAreEqual(obj1, obj2) {
        if (typeof obj1 !== typeof obj2) return false;

        switch (typeof obj1) {
            case 'object':
                for (const p of Object.keys(obj1)) {
                    if (!this.simpleAreEqual(obj1[p], obj2[p])) return false;
                }
                break;
            case 'string':
            case 'number':
            case 'boolean':
                if (obj1 !== obj2) return false;
                break;
            default:
                throw new Error(`ytvs.simpleAreEqual() encountered an unknown type: {${typeof (obj1)}} pos1: ${obj1}, pos2: ${obj2}`);
        }

        return true;
    }
}

class YoutubeVolumeScroll {
    static types = {
        youtube: 'youtube',
        music: 'music',
        shorts: 'shorts'
    };
    type = undefined;

    isShorts = () => this.type === this.constructor.types.shorts;

    volume = undefined;
    hudFadeTimeout = undefined;

    api = undefined;
    scrollTarget = undefined;
    hudContainer = undefined;
    hudAfter = undefined;

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
            type: this.types.youtube,
            api: ytvs.$('#movie_player'),
            scrollTarget: '#movie_player',
            hudContainer: '#movie_player',
            hudAfter: '#movie_player .html5-video-container',
            customFunction: () => {
                ytvs.$('.ytp-cards-button-icon').style.display = 'none';
                ytvs.$('.ytp-chrome-top-buttons').style.display = 'none';

                // hide the real native volume hud when its in volume mode - aka text ends with %
                const bezelText = ytvs.$('.ytp-bezel-text');
                const parent = bezelText.parentElement.parentElement;
                const observer = new MutationObserver(() => {
                    parent.style.opacity = bezelText.textContent.endsWith('%') ? 0 : 1;
                });
                observer.observe(bezelText, { childList: true });
            }
        });
    }

    static newYoutubeShorts() {
        return new this({
            type: this.types.shorts,
            api: ytvs.$('#shorts-player'),
            scrollTarget: 'ytd-player.ytd-shorts',
            hudContainer: 'ytd-player.ytd-shorts',
            hudAfter: 'ytd-player.ytd-shorts div',
        });
    }

    static newMusic() {
        return new this({
            type: this.types.music,
            api: ytvs.$('#movie_player'),
            scrollTarget: '#main-panel',
            hudContainer: 'ytmusic-player',
            hudAfter: '#song-video',
        });
    }

    constructor({ type, api, scrollTarget, hudContainer, hudAfter, customFunction }) {
        this.type = type;
        this.api = api;
        // Saves the volume locally so that hudOnVolume doesn't show hud if volume wasn't actually changed 
        // (e.g. the sponsorblock skip function triggers a volume change without actually changing the volume)
        this.volume = this.api.getVolume();
        if (!this.isShorts() && !ytvs.isLoaded) {
            this.#setupIncognito();
        }

        this.scrollTarget = scrollTarget;
        this.hudContainer = hudContainer;
        this.hudAfter = hudAfter;

        this.setupOnWheel();
        customFunction?.(this);

        this.setupHudOnVolume();

        ytvs.addInstance(this);

        if (!this.isShorts()) {
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
            if (ytvs.activationModifier === ytvs.activationModifiers.shift && !event.shiftKey) return;
            if (ytvs.activationModifier === ytvs.activationModifiers.rightClick && !ytvs.isRightMouseDown) return;
            const multiplier = event.shiftKey && ytvs.activationModifier !== ytvs.activationModifiers.shift ? 2 : 1;
            // Event.deltaY < 0 means wheel-up (increase), > 0 means wheel-down (decrease)
            if (event.deltaY !== 0) this.changeVolume(event.deltaY < 0, multiplier);
            // Event.deltaX < 0 means wheel-left (decrease), > 0 means wheel-right (increase)
            if (event.deltaX !== 0) this.changeVolume(event.deltaX > 0, multiplier);
            return false;
        };
    }

    changeVolume(toIncrease, multiplier) {
        const newVolume = Math.round(
            toIncrease ?
                Math.min(this.api.getVolume() + (ytvs.steps * multiplier), 100) :
                Math.max(this.api.getVolume() - (ytvs.steps * multiplier), 0)
        );

        // Have to manually mute/unmute on youtube.com
        if (!ytvs.isMusic && newVolume > 0 && this.api.isMuted()) {
            this.api.unMute();
        }

        this.api.setVolume(newVolume);

        if (this.isShorts()) return;

        this.saveNativeVolume(newVolume);

        window.postMessage({ type: 'YoutubeVolumeScroll-volume', newVolume }, window.location.origin);
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

    cachedVolumeHud = undefined;
    getVolumeHud() {
        const selector = `${this.hudContainer} ${ytvs.hud === ytvs.hudTypes.native ? '.volume-hud-native' : '.volume-hud-custom'}`;

        let volumeHud = this.cachedVolumeHud?.matches(selector) ? this.cachedVolumeHud : ytvs.$(selector);

        if (!volumeHud) {
            this.injectVolumeHud();
            volumeHud = ytvs.$(selector);

            if (!volumeHud) {
                console.error('Cannot Create Youtube-Volume-Scroll HUD', `$('${selector}')`);
                return undefined;
            }
        }

        this.cachedVolumeHud = volumeHud;
        return volumeHud;
    }

    injectVolumeHud() {
        const createNative = () => {
            const volumeHudNativeWrapper = document.createElement('div');
            volumeHudNativeWrapper.style.opacity = 0;
            volumeHudNativeWrapper.classList.add('ytp-bezel-text-wrapper', 'volume-hud-native-wrapper');
            const volumeHudNative = document.createElement('div');
            volumeHudNative.classList.add('ytp-bezel-text', 'volume-hud-native');
            volumeHudNativeWrapper.appendChild(volumeHudNative);

            ytvs.$(this.hudAfter).insertAdjacentElement('afterend', volumeHudNativeWrapper);
        };

        const createCustom = () => {
            const volumeHud = document.createElement('span');
            volumeHud.classList.add('volume-hud', 'volume-hud-custom');
            if (ytvs.isMusic) volumeHud.classList.add('music');

            ytvs.$(this.hudAfter).insertAdjacentElement('afterend', volumeHud);

            return volumeHud;
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
                    const volumeHud = createCustom();
                    this.updateHudSize(volumeHud);
                    this.updateHudColor(volumeHud);
                    this.updateHudPositionMode(volumeHud);
                    this.updateHudPosition(volumeHud);
                }
        }
    }

    setupHudOnVolume() {
        const video = ytvs.$(`${this.hudContainer} video`);
        setTimeout(() => {
            video.addEventListener('volumechange', () => {
                if (ytvs.hud !== ytvs.hudTypes.none && this.volume !== this.api.getVolume()) {
                    this.showVolume();
                }
                this.volume = this.api.getVolume();
            });
        });
    }

    showVolume(volume = Math.round(this.api.getVolume())) {
        const volumeHud = this.getVolumeHud();
        if (!volumeHud) return;

        const hudTimes = {
            [ytvs.hudTypes.none]: 0,
            [ytvs.hudTypes.native]: 1e3,
            [ytvs.hudTypes.custom]: 1.5e3,
        };

        const setOpacity = (opacity) => {
            if (ytvs.hudPositionMode && opacity === 0 && ytvs.hud === ytvs.hudTypes.custom) return;
            volumeHud.style.opacity = opacity;
            if (ytvs.hud === ytvs.hudTypes.native) {
                volumeHud.parentElement.style.opacity = opacity;
            }
        };

        volumeHud.textContent = volume + '%';
        setOpacity(1);

        if (this.hudFadeTimeout) clearTimeout(this.hudFadeTimeout);
        this.hudFadeTimeout = setTimeout(() => {
            setOpacity(0);
            this.hudFadeTimeout = undefined;
        }, hudTimes[ytvs.hud]);
    }

    getCustomHud() {
        return ytvs.$(`${this.hudContainer} .volume-hud-custom`);
    }

    updateHudSize(volumeHud = this.getCustomHud()) {
        if (!volumeHud) return;

        volumeHud.style.fontSize = ytvs.hudSize;
    }

    updateHudColor(volumeHud = this.getCustomHud()) {
        if (!volumeHud) return;

        volumeHud.style.color = ytvs.hudColor;
    }

    updateHudPosition(volumeHud = this.getCustomHud()) {
        if (!volumeHud) return;

        const newHudPosition = ytvs.hudPosition[this.type];

        Object.keys(newHudPosition).forEach(key =>
            volumeHud.style[key] = newHudPosition[key]
        );
    }

    hudPositionMode = false;
    updateHudPositionMode(volumeHud) {
        if (ytvs.hudPositionMode === this.hudPositionMode) return;

        const dragTarget = ytvs.$(this.hudContainer);

        let draggedElement = volumeHud ?? this.getCustomHud();
        if (!draggedElement && ytvs.hudTypes.custom === ytvs.hud) {
            this.injectVolumeHud();
            draggedElement = this.getCustomHud();
        }
        if (!draggedElement) return;

        if (ytvs.hudPositionMode) {
            this.#enablePositionMode(draggedElement, dragTarget);
        } else {
            this.#disablePositionMode(draggedElement);
        }

        this.hudPositionMode = ytvs.hudPositionMode;
    }

    #enablePositionMode(draggedElement, dragTarget) {
        let dragOffsetX;
        let dragOffsetY;

        const setShortsControlsPointerEvents = (value) => {
            const shortsControls = [ytvs.$('.player-controls.ytd-reel-video-renderer')];
            shortsControls.forEach(c => { if (c) c.style.pointerEvents = value; });
        };

        draggedElement.draggable = true;
        draggedElement.style.pointerEvents = 'auto';

        draggedElement.style.opacity = 1;
        draggedElement.textContent ||= Math.round(this.api.getVolume()) + '%';

        draggedElement.ondragstart = (ev) => {
            const rect = ev.target.getBoundingClientRect();

            dragOffsetX = ev.clientX - rect.x;
            dragOffsetY = ev.clientY - rect.y;

            setShortsControlsPointerEvents('none');
        };

        dragTarget.ondrop = (ev) => {
            ev.preventDefault();

            const dragTargetRect = dragTarget.getBoundingClientRect();

            draggedElement.style.hudPosition = 'absolute';

            const newLeft = ev.clientX - dragTargetRect.x - dragOffsetX;
            const newTop = ev.clientY - dragTargetRect.y - dragOffsetY;

            const padding = parseFloat(window.getComputedStyle(draggedElement, undefined).padding) - 2;

            const controlsHeight = ytvs.$('.ytp-chrome-bottom')?.clientHeight || 0;

            const pxToPercent_width = x => (x / dragTargetRect.width) * 100;
            const pxToPercent_height = y => (y / dragTargetRect.height) * 100;

            const ogStyle = draggedElement.style;
            const hudPosition = { left: ogStyle.left, right: ogStyle.right, top: ogStyle.top, bottom: ogStyle.bottom };

            if (newLeft < dragTargetRect.width / 2) {
                const x = Math.max(newLeft, 0 - padding);
                hudPosition.left = pxToPercent_width(x) + '%';
                hudPosition.right = 'unset';
            } else {
                const x = Math.min(newLeft + draggedElement.clientWidth, dragTargetRect.width + padding);
                hudPosition.right = (100 - pxToPercent_width(x)) + '%';
                hudPosition.left = 'unset';
            }

            if (newTop < dragTargetRect.height / 2) {
                const y = Math.max(newTop, 0 - padding);
                hudPosition.top = pxToPercent_height(y) + '%';
                hudPosition.bottom = 'unset';
            } else {
                const y = Math.min(newTop + draggedElement.clientHeight, dragTargetRect.height + padding - controlsHeight);
                hudPosition.bottom = (100 - pxToPercent_height(y)) + '%';
                hudPosition.top = 'unset';
            }

            Object.keys(hudPosition).forEach(pos => draggedElement.style[pos] = hudPosition[pos]);

            const hudPositionToSend = {};
            hudPositionToSend[this.type] = hudPosition;
            ytvs.hudPosition = hudPositionToSend;

            setShortsControlsPointerEvents('auto');
        };

        dragTarget.ondragover = (ev) => {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';
        };
    }

    #disablePositionMode(draggedElement) {
        draggedElement.draggable = false;
        draggedElement.style.pointerEvents = 'none';
        setTimeout(() => draggedElement.style.opacity = 0, 50);
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
