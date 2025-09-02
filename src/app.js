// @ts-check
// Select the elements we need to manipulate
const button = /** @type {HTMLButtonElement} */ (document.getElementById('button'));
const panels = /** @type {NodeListOf<HTMLParagraphElement>} */ (document.querySelectorAll('.panel'));
const close_button = /** @type {HTMLButtonElement} */ (document.getElementById('close'));

document.body.addEventListener('click', ({ target }) => {
    if (target === button) {
        for (const panel of panels) {
            panel.classList.add('open');
        }
    } else if (target === close_button) {
        for (const panel of panels) {
            panel.classList.remove('open');
        }
    }
});

/**
 * @param {HTMLElement} element
 * @returns {Record<string, string>}
 */
function attributes(element) {
    return [...element.attributes].reduce((acc, { name, value }) => ({ ...acc, [name]: value }), {});
}

/**
 * @template {keyof HTMLElementTagNameMap} Tag
 * @param {Tag} type
 * @param {Record<string, unknown> | null} [props]
 * @param {Array<Node | string>} children
 */
function element(type, props = null, ...children) {
    const elem = document.createElement(type);
    for (const [key, value] of Object.entries(props ?? {})) {
        if (key.match(/^on/)) {
            elem.addEventListener(key.slice(2), /** @type {(this: HTMLElementTagNameMap[Tag], event: Event) => void} */ (value));
        } else if (key === 'style') {
            elem.style.cssText = /** @type {string} */ (value);
        } else if (key === 'class') {
            elem.className = /** @type {string} */ (value);
        } else if (key in elem) {
            elem[key] = value;
        } else {
            elem.setAttribute(key, /** @type {string} */ (value));
        }
    }
    elem.append(...children);
    return elem;
}

/** @typedef {HTMLDivElement & { firstChild: Text; cloneNode(deep?: boolean): DivWithText }} DivWithText */

class List extends HTMLElement {
    #div = /** @type {DivWithText} */ (element('div', null, ''));
    connectedCallback() {
        const fragment = document.createDocumentFragment();
        const { elements = '', ...rest } = attributes(this);
        /** @type {DivWithText | null} */
        let first = null;
        for (const element of elements.split(' ')) {
            const div = /** @type {DivWithText} */ (this.#div.cloneNode(true));
            if (div.firstChild) {
                div.firstChild.textContent = element;
            }
            for (const [name, value] of Object.entries(rest)) {
                div.setAttribute(name, value);
            }
            if (first === null) {
                first = /** @type {DivWithText} */ (div.cloneNode(true));
            }
            fragment.append(div);
        }
        if (first !== null) {
            fragment.append(first.cloneNode(true));
        }
        this.append(fragment);
    }
}
customElements.define('list-elements', List);

class Stat extends HTMLElement {
    connectedCallback() {
        const { value = '', parameter = '' } = attributes(this);
        const val = element('span', { className: 'value' }, value);
        const param = element('span', { className: 'parameter' });
        const div = element('div', { className: 'box' }, val, param);
        const lines = parameter.split(/\\n/g);
        for (let i = 0; i < lines.length; i++) {
            const is_last = i === lines.length - 1;
            param.append(lines[i]);
            if (!is_last) {
                param.append(element('br'));
            }
        }
        this.append(div);
    }
}

customElements.define('stat-element', Stat);