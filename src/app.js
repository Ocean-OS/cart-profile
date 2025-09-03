// @ts-check
// cache prototype methods to improve inlining/IC
const add_event_listener = EventTarget.prototype.addEventListener;
const append = Element.prototype.append;
const object_entries = Object.entries;
const set_attribute = Element.prototype.setAttribute;
const clone_node = Node.prototype.cloneNode;

const ms_to_days = 1000 * 60 * 60 * 24;
const days_since_epoch = new Date().getTime() / ms_to_days;

const button = /** @type {HTMLButtonElement} */ (
    document.querySelector('#button')
);
const panels = /** @type {NodeListOf<HTMLParagraphElement>} */ (
    document.querySelectorAll('.panel')
);
const close_button = /** @type {HTMLButtonElement} */ (
    document.querySelector('#close')
);
const github_button = /** @type {HTMLButtonElement} */ (
    document.querySelector('.actions > button')
);

// delegate `click` events from the body to the open and close buttons
add_event_listener.call(
    document.body,
    'click',
    (/** @type {{ target: ParentNode }} */ { target }) => {
        if (target === button || button.contains(target)) {
            for (const panel of panels) {
                panel.classList.add('open');
            }
        } else if (target === close_button || close_button.contains(target)) {
            for (const panel of panels) {
                panel.classList.remove('open');
            }
        } else if (target === github_button || github_button.contains(target)) {
            window.open('https://github.com/Ocean-OS', '_blank');
        }
    }
);

/**
 * @param {HTMLElement} element
 * @returns {Record<string, string>}
 */
function attributes(element) {
    return [...element.attributes].reduce(
        (acc, { name, value }) => ({ ...acc, [name]: value }),
        {}
    );
}

/**
 * @template {string} Tag
 * @param {Tag} type
 * @param {Record<string, unknown> | null} [props]
 * @param {Array<Node | string>} children
 * @returns {Tag extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[Tag] : HTMLElement}
 */
function element(type, props = null, ...children) {
    /** @typedef {Tag extends keyof HTMLElementTagNameMap ? HTMLElementTagNameMap[Tag] : HTMLElement} This */
    const elem = /** @type {This} */ (document.createElement(type));
    for (const [key, value] of object_entries(props ?? {})) {
        if (key.slice(0, 2) === 'on') {
            add_event_listener.call(
                elem,
                key.slice(2),
                /** @type {(this: This, event: Event) => void} */ (value)
            );
        } else if (key === 'style') {
            elem.style.cssText = /** @type {string} */ (value);
        } else if (key === 'class') {
            elem.className = /** @type {string} */ (value);
        } else if (key in elem) {
            elem[key] = value;
        } else {
            set_attribute.call(elem, key, /** @type {string} */ (value));
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
        for (const text of elements.split('|')) {
            const div = element('div', rest, text);
            first ??= clone_node.call(div, true);
            append.call(this, div);
        }
        if (first !== null) {
            append.call(this, first);
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
            append.apply(
                param,
                i < len - 1 ? [lines[i], element('br')] : [lines[i]]
            );
        }
        append.call(this, element('div', { className: 'box' }, val, param));
    }
}

customElements.define('stat-element', Stat);

class GithubStats extends HTMLElement {
    async connectedCallback() {
        try {
            const url = 'https://api.github.com/users/Ocean-OS/events/public';
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/vnd.github+json',
                },
            });
            const contributions =
                /** @type {Array<Record<string, any> & { created_at: string }>} */ (
                    await res.json()
                );
            const week = contributions.filter((contribution) => {
                const date = new Date(contribution.created_at).getTime();
                const days = date / ms_to_days;
                return days - days_since_epoch <= 7;
            });
            const stats = element('stat-element', {
                parameter: 'GitHub Contributions\\nThis Week',
                value: week.length,
            });
            append.call(this, stats);
        } catch {
            append.call(
                this,
                element('stat-element', {
                    parameter: 'GitHub Contributions\\nThis Week',
                    value: '20+',
                })
            );
        }
    }
}

customElements.define('github-stats', GithubStats);
