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
    hudSize: '50px',
    hudColor: '#eee',
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
    setupColorPicker();

    const permissions = {
        origins: ['https://www.youtube.com/*', 'https://music.youtube.com/*']
    };
    browserApi.permissions.contains(permissions, result => {
        if (!result) {
            $('body').classList.add('permissions-mode');
            $('#permissions_button').onclick = () => {
                browserApi.permissions.request(permissions, granted => {
                    if (granted) {
                        $('body').classList.remove('permissions-mode');
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

function setupColorPicker() {
    document.addEventListener('coloris:pick', ({detail}) => {
        console.log('New color', detail.color); // DELETE
        config.hudColor = detail.color;
        sendConfig();
    });
    const colorInput = $('input[data-coloris');
    colorInput.value = config.hudColor;
    colorInput.dispatchEvent(new Event('input', { bubbles: true }));

    // eslint-disable-next-line no-undef
    Coloris({
        // Available themes: default, large, polaroid, pill (horizontal).
        // More themes might be added in the future.
        theme: 'large',

        // Set the theme to light or dark mode:
        // * light: light mode (default).
        // * dark: dark mode.
        // * auto: automatically enables dark mode when the user prefers a dark color scheme.
        themeMode: 'auto',

        // The margin in pixels between the input fields and the color picker's dialog.
        margin: 10,

        // Set the preferred color string format:
        // * hex: outputs #RRGGBB or #RRGGBBAA (default).
        // * rgb: outputs rgb(R, G, B) or rgba(R, G, B, A).
        // * hsl: outputs hsl(H, S, L) or hsla(H, S, L, A).
        // * auto: guesses the format from the active input field. Defaults to hex if it fails.
        // * mixed: outputs #RRGGBB when alpha is 1; otherwise rgba(R, G, B, A).
        format: 'auto',

        // Set to true to enable format toggle buttons in the color picker dialog.
        // This will also force the format option (above) to auto.
        formatToggle: false,

        // Enable or disable alpha support.
        // When disabled, it will strip the alpha value from the existing color string in all formats.
        alpha: false,

        // Set to true to always include the alpha value in the color value even if the opacity is 100%.
        forceAlpha: false,

        // Set to true to hide all the color picker widgets (spectrum, hue, ...) except the swatches.
        swatchesOnly: false,

        // Focus the color value input when the color picker dialog is opened.
        focusInput: true,

        // Select and focus the color value input when the color picker dialog is opened.
        selectInput: false,

        // Show an optional clear button
        clearButton: false,

        // Set the label of the clear button
        //clearLabel: 'Clear',

        // Show an optional close button
        //closeButton: false,

        // Set the label of the close button
        //closeLabel: 'Close',

        // An array of the desired color swatches to display. If omitted or the array is empty,
        // the color swatches will be disabled.
        swatches: [
            'rgb(238,238,238)',
            '#264653',
            '#2a9d8f',
            '#e9c46a',
            'rgb(244,162,97)',
            '#e76f51',
            '#d62828',
            'navy',
            '#07b',
            '#0096c7',
            '#00b4d880'
        ],

        // Set to true to use the color picker as an inline widget. In this mode the color picker is
        // always visible and positioned statically within its container, which is by default the body
        // of the document. Use the "parent" option to set a custom container.
        // Note: In this mode, the best way to get the picked color, is listening to the "coloris:pick"
        // event and reading the value from the event detail (See example in the Events section). The
        // other way is to read the value of the input field with the id "clr-color-value".
        inline: false,

        // In inline mode, this is the default color that is set when the picker is initialized.
        //defaultColor: '#000000'
    });
}
