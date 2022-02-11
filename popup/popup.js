window.addEventListener('DOMContentLoaded', () => {
    const input = document.querySelector('#input');
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
}, {once: true, });

function setValue(node) {
    node.parentNode.style.setProperty('--value', node.value);
    node.parentNode.style.setProperty('--text-value', JSON.stringify(node.value));
}

let saveTimeout;
function saveSteps(steps) {
    if (saveTimeout) clearTimeout(saveTimeout);

    saveTimeout = setTimeout(() => {
        chrome.storage.sync.set({ steps: steps });
        saveTimeout = null;
    }, 200)
}
