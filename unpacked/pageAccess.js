
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
    static get hudTypes() {
        return this.#hudTypes;
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

    static #activeObjects = new Set();
    static get activeObjects() {
        return this.#activeObjects;
    }
    static addActiveObject(ytvsObject) {
        if (!(ytvsObject instanceof YoutubeVolumeScroll)) {
            console.error('ytvs.addActiveObject() expects a YoutubeVolumeScroll object');
            return;
        }
        this.#activeObjects.add(ytvsObject);
    }

    static #positionMode = false;
    static get positionMode() {
        return this.#positionMode;
    }

    static #positionModeSubscribers = new Set();
    static subscribeToPositionMode(fn) {
        if (typeof fn !== 'function') return console.error('ytvs.subscribeToPositionMode() expects a function');
        this.#positionModeSubscribers.add(fn);
    }

    static #steps = undefined;
    static #hud = undefined;
    static #position = {
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
    }; // TODO implement defaults

    static get position() {
        return this.#position;
    }

    static set position(value) {
        const [type, position] = Object.entries(value)[0];
        if (!this.#position[type]) {
            console.error(`ytvs.position.${type} is not a valid type`);
            return;
        }
        if (typeof position !== 'object') {
            console.error(`ytvs.position.${type} expects an object`);
            return;
        }

        this.#position[type] = position;
        this.#save();
    }

    static #saveTimeout = undefined;

    static #save() {
        if (this.#saveTimeout) clearTimeout(this.#saveTimeout);
        this.#saveTimeout = setTimeout(() => {
            console.log('ytvs.save'); // DELETE
            // send a message to the background script to save the config
            window.postMessage({
                type: 'YoutubeVolumeScroll-config-save',
                config: {
                    positionMode: this.#positionMode,
                    position: this.position,
                    steps: this.steps,
                    hud: this.hud
                }
            }, '*');
        }, 500);
    }

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
            if (event.data.type === 'YoutubeVolumeScroll-config-change' && typeof event.data.config === 'object') {
                console.log('got config', event.data.config); // DELETE
                this.#steps = event.data.config.steps;
                this.#hud = event.data.config.hud;
                if (event.data.config.positionMode !== this.positionMode) {
                    this.#positionMode = event.data.config.positionMode;
                    this.#positionModeSubscribers.forEach(fn => fn(this.positionMode));
                }
                if (event.data.config.position && !this.simpleAreEqual(event.data.config.position, this.position)) {
                    console.log('event.data.config.position', event.data.config.position, 'this.position', this.position); // DELETE
                    this.#position = event.data.config.position;
                    //setTimeout(() => this.activeObjects.forEach(obj => obj.updatePosition()));
                    this.activeObjects.forEach(obj => obj.updatePosition());
                } else {//DELETE
                    console.log('got config but position are the same', 'event.data.config.position', event.data.config.position, 'this.position', this.position, this.simpleAreEqual(event.data.config.position, this.position)); // DELETE
                }
            }
        }, false);
        this.#initDone = true;
    }

    static getCookie(n) {
        return document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${n}=`));
    }


    // recursive function to compare two position objects
    static simpleAreEqual(pos1, pos2) {
        //return JSON.stringify(pos1) === JSON.stringify(pos2); // this is too slow
        if (typeof pos1 !== typeof pos2) return false;

        switch (typeof pos1) {
            case 'object':
                for (const p of Object.keys(pos1)) {
                    if (!this.simpleAreEqual(pos1[p], pos2[p])) return false;
                }
                break;
            case 'string':
            case 'number':
            case 'boolean':
                if (pos1 !== pos2) return false;
                break;
            default:
                throw new Error(`ytvs.simpleAreEqual() encountered an unknown type: {${typeof (pos1)}} pos1: ${pos1}, pos2: ${pos2}`);
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

    volume = undefined;
    hudFadeTimeout = undefined;

    isShorts = false;
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
                // remove the real native volume hud
                ytvs.$('.ytp-bezel-text-wrapper').parentElement.remove();
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
            isShorts: true
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

    constructor({ type, api, scrollTarget, hudContainer, hudAfter, isShorts, customFunction }) {
        this.type = type;
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

        ytvs.subscribeToPositionMode(p => this.changePositionMode(p));

        ytvs.addActiveObject(this);

        if (!isShorts) {
            ytvs.isLoaded = true;
        }
    }

    updatePosition() {
        const newPosition = ytvs.position[this.type];

        console.log('updatePosition', this.type, newPosition); //DELETE

        const hud = this.getVolumeHud();
        if (!hud) {
            console.error('updatePosition: hud not found', this.hudContainer);
            return;
        }

        Object.keys(newPosition).forEach(key => {
            hud.style[key] = newPosition[key];
            console.log('updatePosition', key, newPosition[key]); //DELETE
        });
    }

    changePositionMode(positionMode) {
        positionMode ??= ytvs.positionMode;

        const dragTarget = ytvs.$(this.hudContainer);
        if (!dragTarget) return console.error('dragTarget not found', this.hudContainer);

        const getDraggedElement = () => ytvs.$(`${this.hudContainer} .volume-hud-custom`);
        let draggedElement = getDraggedElement();
        if (!draggedElement && ytvs.hudTypes.custom === ytvs.hud) {
            this.injectVolumeHud();
            draggedElement = getDraggedElement();
        }
        if (!draggedElement) return console.error('draggedElement not found', `${this.hudContainer} .volume-hud-custom`);

        if (positionMode) {
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
                // const { width, height } = window.getComputedStyle(draggedElement, undefined);
                // ev.dataTransfer.setDragImage(draggedElement, parseFloat(width) / 2, parseFloat(height) / 2);

                const rect = ev.target.getBoundingClientRect();

                dragOffsetX = ev.clientX - rect.x;
                dragOffsetY = ev.clientY - rect.y;

                setShortsControlsPointerEvents('none');
            };

            dragTarget.ondrop = (ev) => {
                ev.preventDefault();

                const dragTargetRect = dragTarget.getBoundingClientRect();

                draggedElement.style.position = 'absolute';

                const newLeft = ev.clientX - dragTargetRect.x - dragOffsetX;
                const newTop = ev.clientY - dragTargetRect.y - dragOffsetY;

                const padding = parseFloat(window.getComputedStyle(draggedElement, undefined).padding) - 2;

                const controlsHeight = ytvs.$('.ytp-chrome-bottom')?.clientHeight || 0;

                const pxToPercent_width = x => (x / dragTargetRect.width) * 100;
                const pxToPercent_height = y => (y / dragTargetRect.height) * 100;

                const ogStyle = draggedElement.style;
                const position = { left: ogStyle.left, right: ogStyle.right, top: ogStyle.top, bottom: ogStyle.bottom };

                if (newLeft < dragTargetRect.width / 2) {
                    const x = Math.max(newLeft, 0 - padding);
                    position.left = pxToPercent_width(x) + '%';
                    position.right = 'unset';
                } else {
                    const x = Math.min(newLeft + draggedElement.clientWidth, dragTargetRect.width + padding);
                    position.right = (100 - pxToPercent_width(x)) + '%';
                    position.left = 'unset';
                }

                if (newTop < dragTargetRect.height / 2) {
                    const y = Math.max(newTop, 0 - padding);
                    position.top = pxToPercent_height(y) + '%';
                    position.bottom = 'unset';
                } else {
                    const y = Math.min(newTop + draggedElement.clientHeight, dragTargetRect.height + padding - controlsHeight);
                    position.bottom = (100 - pxToPercent_height(y)) + '%';
                    position.top = 'unset';
                }

                Object.keys(position).forEach(pos => draggedElement.style[pos] = position[pos]);

                const positionToSend = {};
                positionToSend[this.type] = position;
                ytvs.position = positionToSend;

                setShortsControlsPointerEvents('auto');
            };

            dragTarget.ondragover = (ev) => {
                ev.preventDefault();
                ev.dataTransfer.dropEffect = 'move';
            };
        } else {
            draggedElement.draggable = false;
            draggedElement.style.pointerEvents = 'none';
            setTimeout(() => draggedElement.style.opacity = 0); // DELETE testing
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

        if (!volumeHud) {
            this.injectVolumeHud();
            volumeHud = ytvs.$(`${this.hudContainer} ${selector}`);
        }
        if (!volumeHud) {
            console.error('Cannot Create Youtube-Volume-Scroll HUD', `$('${this.hudContainer} ${selector}')`);
            return undefined;
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
        if (!volumeHud) return;

        const hudTimes = {
            [ytvs.hudTypes.none]: 0,
            [ytvs.hudTypes.native]: 1e3,
            [ytvs.hudTypes.custom]: 1.5e3,
        };

        const setOpacity = (opacity) => {
            if (opacity === 0 && ytvs.positionMode) return;
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
            this.hudFadeTimeout = undefined;
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
