window.addEventListener('DOMContentLoaded', () => {
    const input = document.querySelector('#input');
    input.oninput = updateOutput;
    input.onwheel = e => {
        if (e.deltaY !== 0) e.deltaY < 0 ? input.value++ : input.value--;
        if (e.deltaX !== 0) e.deltaX < 0 ? input.value-- : input.value++;
        updateOutput();
    }
    browser.storage.sync.get('steps', data => {
        if (data?.steps) {
            input.value = data.steps;
            setValue(input);
        }
    });

    window.onblur = () => {
        browser.storage.sync.set({ steps: input.value });
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
        browser.storage.sync.set({ steps: steps });
        saveTimeout = null;
    }, 500)
}
