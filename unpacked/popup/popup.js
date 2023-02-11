const browserApi = globalThis.browser ?? globalThis.chrome ?? null;
if (!browserApi) throw new Error('Youtube-Volume-Scroll could not find a browser api to use');

const $ = document.querySelector.bind(document);
const $$ = document.querySelectorAll.bind(document);

const hudTypes = {
    custom: 0,
    native: 1,
    none: 2
};

const defaultConfig = {
    steps: 1,
    hud: hudTypes.native,
    hudSize: '46px',
    hudPositionMode: false,
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

let config;

let saveTimeout;
function sendConfig(timeout = 0) {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        browserApi.storage.local.set({ config });
        saveTimeout = null;
    }, timeout);
}

browserApi.storage.sync.get('config', data => {
    const res = data.config;
    if (res) config = { ...defaultConfig, ...res }; // merge with default config
    if ($('#steps_slider')) init();
    else {
        window.addEventListener('DOMContentLoaded', init, { once: true });
    }
});

function init() {
    window.onblur = () => {
        browserApi.storage.sync.set({ config });
    };

    setupStepsSlider();
    setupHudRadio();

    // only shown if custom hud is selected
    setupSizeSlider();
    setupHudPositionModeCheckbox();

    const permissions = {
        origins: ['https://www.youtube.com/*', 'https://music.youtube.com/*']
    };
    browserApi.permissions.contains(permissions, result => {
        if (!result) {
            $('#permissions_wrapper').style.display = 'flex';
            $$('div:not(#permissions_wrapper)').forEach(node => node.style.display = 'none');
            $('body').style.setProperty('min-height', '145px');
            $('#permissions_button').onclick = () => {
                browserApi.permissions.request(permissions, granted => {
                    if (granted) {
                        $('#permissions_wrapper').style.display = 'none';
                        $$('div:not(#permissions_wrapper)').forEach(node => node.style.display = 'flex');
                        $('body').style.setProperty('height', '250px');
                    }
                });
                window.close();
            };
        }
    });
}

const setCustomOptionsEnabled = (b) => $('body').classList[b ? 'add' : 'remove']('custom-options-enabled');

function setupHudRadio() {
    const radios = $$('input[name="hud"]');
    radios.forEach(radio => {
        radio.onchange = () => {
            config.hud = parseInt(radio.value, 10);
            setCustomOptionsEnabled(config.hud === hudTypes.custom);
            sendConfig();
        };
    });
    radios[config.hud].checked = true;
    setCustomOptionsEnabled(config.hud === hudTypes.custom);
}

function setupStepsSlider() {
    const slider = $('#steps_slider');
    slider.oninput = updateOutput;
    slider.onwheel = e => {
        // Event.deltaY < 0 means wheel-up (increase), > 0 means wheel-down (decrease)
        if (e.deltaY !== 0) e.deltaY < 0 ? slider.value++ : slider.value--;
        // Event.deltaX < 0 means wheel-left (decrease), > 0 means wheel-right (increase)
        if (e.deltaX !== 0) e.deltaX < 0 ? slider.value-- : slider.value++;
        updateOutput();
    };

    slider.value = config.steps;
    setSliderValue(slider, 500);

    function updateOutput() {
        config.steps = slider.value;
        setSliderValue(slider, 500);
    }
}

function setupSizeSlider() {
    const slider = $('#hud_size_slider');
    slider.oninput = updateOutput;
    slider.onwheel = e => {
        // Event.deltaY < 0 means wheel-up (increase), > 0 means wheel-down (decrease)
        if (e.deltaY !== 0) e.deltaY < 0 ? slider.value++ : slider.value--;
        // Event.deltaX < 0 means wheel-left (decrease), > 0 means wheel-right (increase)
        if (e.deltaX !== 0) e.deltaX < 0 ? slider.value-- : slider.value++;
        updateOutput();
    };

    slider.value = parseFloat(config.hudSize);
    setSliderValue(slider);

    function updateOutput() {
        config.hudSize = slider.value + 'px';
        setSliderValue(slider);
    }
}

function setSliderValue(node, saveTimeout = 0) {
    node.parentNode.style.setProperty('--value', node.value);
    node.parentNode.style.setProperty('--text-value', JSON.stringify(node.value));
    sendConfig(saveTimeout);
}

function setupHudPositionModeCheckbox() {
    const checkbox = $('#hud_position_mode_checkbox');
    checkbox.onchange = () => {
        config.hudPositionMode = checkbox.checked;
        sendConfig();
    };
    checkbox.checked = config.hudPositionMode;
}
