// @ts-check
const add_event_listener = EventTarget.prototype.addEventListener;
const append = Element.prototype.append;
const object_entries = Object.entries;

// Select the elements we need to manipulate
const button = /** @type {HTMLButtonElement} */ (document.getElementById('button'));
const panels = /** @type {NodeListOf<HTMLParagraphElement>} */ (document.querySelectorAll('.panel'));
const close_button = /** @type {HTMLButtonElement} */ (document.getElementById('close'));

add_event_listener.call(document.body, 'click', ({ target }) => {
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
 * @returns {HTMLElementTagNameMap[Tag]}
 */
function element(type, props = null, ...children) {
    const elem = document.createElement(type);
    for (const [key, value] of object_entries(props ?? {})) {
        if (key.match(/^on/)) {
            add_event_listener.call(elem, key.slice(2), /** @type {(this: HTMLElementTagNameMap[Tag], event: Event) => void} */ (value));
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
    append.call(elem, ...children);
    return elem;
}


class List extends HTMLElement {
    connectedCallback() {
        const { elements = '', ...rest } = attributes(this);
        /** @type {Node | null} */
        let first = null;
        for (const text of elements.split(' ')) {
            const div = element('div', rest, text);
            first ??= div.cloneNode(true);
            append.call(this, div);
        }
        if (first !== null) {
            append.call(this, first.cloneNode(true));
        }
    }
}

customElements.define('list-elements', List);

class Stat extends HTMLElement {
    connectedCallback() {
        const { value = '', parameter = '' } = attributes(this);
        const val = element('span', { className: 'value' }, value);
        const param = element('span', { className: 'parameter' });
        const lines = parameter.split(/\\n/g);
        const len = lines.length;
        for (let i = 0; i < len; i++) {
            append.apply(param, (i < len - 1) ? [lines[i], element('br')] : [lines[i]]);
        }
        append.call(this, element('div', { className: 'box' }, val, param));
    }
}

customElements.define('stat-element', Stat);