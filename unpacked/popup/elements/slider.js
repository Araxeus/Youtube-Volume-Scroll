customElements.define(
    'custom-slider',
    class Slider extends HTMLElement {
        input;

        get min() {
            return this.getAttribute('min') || '0';
        }

        set min(value) {
            this.setAttribute('min', value);
        }

        get max() {
            return this.getAttribute('max') || '100';
        }

        set max(value) {
            this.setAttribute('max', value);
        }

        get step() {
            return this.getAttribute('step') || '1';
        }

        set step(value) {
            this.setAttribute('step', value);
        }

        set value(value) {
            this.setAttribute('value', value);
            this.input.value = value;
            this.style.setProperty('--value', value);
            this.style.setProperty('--text-value', `"${value}"`);

            this.dispatchEvent(new Event('input'));
        }

        get value() {
            return this.getAttribute('value') || '1';
        }

        constructor() {
            super();
        }

        connectedCallback() {
            this.classList.add('range-slider');

            // Transform attributes
            this.style.setProperty('--min', this.min);
            this.style.setProperty('--max', this.max);
            this.style.setProperty('--step', this.step);
            this.style.setProperty('--value', this.value);

            // Create elements
            this.input = this.#createInput();

            const output = document.createElement('output');

            const progress = document.createElement('div');
            progress.setAttribute('class', 'range-slider__progress');

            this.append(this.input, output, progress);
        }

        #createInput() {
            const input = document.createElement('input');
            input.setAttribute('type', 'range');
            input.setAttribute('min', this.min);
            input.setAttribute('max', this.max);
            input.setAttribute('step', this.step);
            input.value = this.value;

            input.addEventListener('input', () => {
                this.value = input.value;
            });

            const inc = (n) =>
                (input.value =
                    parseFloat(input.value) + parseFloat(this.step) * n);

            input.addEventListener('wheel', (e) => {
                // Event.deltaY < 0 means wheel-up (increase), > 0 means wheel-down (decrease)
                if (e.deltaY !== 0) inc(e.deltaY < 0 ? 1 : -1);
                // Event.deltaX < 0 means wheel-left (decrease), > 0 means wheel-right (increase)
                if (e.deltaX !== 0) inc(e.deltaX < 0 ? -1 : 1);

                this.value = input.value;
            });

            return input;
        }
    },
);
