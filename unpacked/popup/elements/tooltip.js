customElements.define(
    'tooltip-icon',
    class Tooltip extends HTMLElement {
        // biome-ignore lint/complexity/noUselessConstructor: for clarity
        constructor() {
            super();
        }

        connectedCallback() {
            // Transform attributes
            if (this.hasAttribute('label'))
                this.setAttribute('aria-label', this.getAttribute('label'));

            if (this.hasAttribute('size'))
                this.setAttribute(
                    'data-cooltipz-size',
                    this.getAttribute('size'),
                );

            if (this.hasAttribute('position'))
                this.setAttribute(
                    'data-cooltipz-dir',
                    this.getAttribute('position'),
                );

            // Create elements
            const spacing = document.createElement('div');
            spacing.setAttribute('class', 'tooltip-spacing');

            const bg1 = document.createElement('div');
            bg1.setAttribute('class', 'tooltip-bg1');

            const bg2 = document.createElement('div');
            bg2.setAttribute('class', 'tooltip-bg2');

            const letter = document.createElement('div');
            letter.setAttribute('class', 'tooltip-text');
            letter.textContent = '?';

            spacing.append(bg1, bg2, letter);

            this.appendChild(spacing);
        }
    },
);
