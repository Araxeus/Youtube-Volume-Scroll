const browserApi = globalThis.browser ?? globalThis.chrome ?? null;
if (!browserApi) throw new Error('Youtube-Volume-Scroll could not find a browser api to use');

window.addEventListener('DOMContentLoaded', () => {
    const input = document.querySelector('#input');
    input.oninput = updateOutput;
    input.onwheel = e => {
        // Event.deltaY < 0 means wheel-up (increase), > 0 means wheel-down (decrease)
        if (e.deltaY !== 0) e.deltaY < 0 ? input.value++ : input.value--;
        // Event.deltaX < 0 means wheel-left (decrease), > 0 means wheel-right (increase)
        if (e.deltaX !== 0) e.deltaX < 0 ? input.value-- : input.value++;
        updateOutput();
    }
    browserApi.storage.sync.get('steps', data => {
        if (data?.steps) {
            input.value = data.steps;
            setValue(input);
        }
    });

    window.onblur = () => {
        browserApi.storage.sync.set({ steps: input.value });
    };

    function updateOutput() {
        setValue(input);
        saveSteps(input.value);
    }
}, { once: true });

function setValue(node) {
    node.parentNode.style.setProperty('--value', node.value);
    node.parentNode.style.setProperty('--text-value', JSON.stringify(node.value));
}

let saveTimeout;
function saveSteps(steps) {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        browserApi.storage.sync.set({ steps: steps });
        saveTimeout = null;
    }, 500)
}
