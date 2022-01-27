const setupInput = () => {
    const input = document.querySelector('#input');
    if (!input) setTimeout(setupInput, 100);
    else {
        input.oninput = () => {
            setValue(input);
            saveSteps(input.value);
        }
        chrome.storage.sync.get('steps', data => {
            if (data?.steps) {
                input.value = data.steps;
                setValue(input);
            }
        });
    }
}

function setValue(node) {
    node.parentNode.style.setProperty('--value', node.value);
    node.parentNode.style.setProperty('--text-value', JSON.stringify(node.value));
}

setupInput();

let saveTimeout;
function saveSteps(steps) {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        chrome.storage.sync.set({ steps: steps });
        saveTimeout = null;
    }, 200)
}
