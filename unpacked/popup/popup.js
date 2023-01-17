const browserApi = globalThis.browser ?? globalThis.chrome ?? null;
if (!browserApi) throw new Error('Youtube-Volume-Scroll could not find a browser api to use');

const hudTypes = {
    custom: 0,
    native: 1,
    none: 2
};

let config = {
    steps: 1,
    hud: hudTypes.native,
}

let saveTimeout;
function saveConfig() {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        browserApi.storage.sync.set({ config });
        saveTimeout = null;
    }, 500)
}

browserApi.storage.sync.get('config', data => {
    res = data.config;
    if (res) config = {...config, ...res}; // merge with default config
    window.addEventListener('DOMContentLoaded', init, { once: true });
});

function init() {
    window.onblur = () => {
        browserApi.storage.sync.set({ config });
    };
    setupStepsSlider();
    setupHudRadio();
}

function setupHudRadio() {
    const radios = document.querySelectorAll('input[name="hud"]');
    radios.forEach(radio => {
        radio.onchange = () => {
            config.hud = parseInt(radio.value);
            saveConfig();
        }
    });
    radios[config.hud].checked = true;
}

function setupStepsSlider() {
    const slider = document.querySelector('#input');
    slider.oninput = updateOutput;
    slider.onwheel = e => {
        // Event.deltaY < 0 means wheel-up (increase), > 0 means wheel-down (decrease)
        if (e.deltaY !== 0) e.deltaY < 0 ? slider.value++ : slider.value--;
        // Event.deltaX < 0 means wheel-left (decrease), > 0 means wheel-right (increase)
        if (e.deltaX !== 0) e.deltaX < 0 ? slider.value-- : slider.value++;
        updateOutput();
    }

    slider.value = config.steps;
    setValue(slider);

    function updateOutput() {
        setValue(slider);
        config.steps = slider.value;
        saveConfig();
    }

    function setValue(node) {
        node.parentNode.style.setProperty('--value', node.value);
        node.parentNode.style.setProperty('--text-value', JSON.stringify(node.value));
    }
}
