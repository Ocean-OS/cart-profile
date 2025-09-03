import { signal, derived, effect } from './reactivity.js';

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
    static observedAttributes = /** @type {const} */ (['value', 'parameter']);

    /** @type {HTMLSpanElement} */
    #value;

    /** @type {HTMLSpanElement} */
    #param;

    connectedCallback() {
        const { value = '', parameter = '' } = attributes(this);
        const val = (this.#value = element(
            'span',
            { className: 'value' },
            value
        ));
        const param = (this.#param = element('span', {
            className: 'parameter'
        }));
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

    /**
     * @param {(typeof Stat)['observedAttributes'][number]} name
     * @param {string} _
     * @param {string} curr
     */
    attributeChangedCallback(name, _, curr) {
        // `attributeChangedCallback` is called on initialization, when we haven't set `#value` or `#param`
        if (!this.#value || !this.#param) {
            return;
        }
        if (name === 'value') {
            /** @type {Text} */ (this.#value.firstChild).textContent = curr;
        } else {
            this.#param.replaceChildren();
            const lines = curr.split(/\\n/g);
            const len = lines.length;
            for (let i = 0; i < len; i++) {
                append.apply(
                    this.#param,
                    i < len - 1 ? [lines[i], element('br')] : [lines[i]]
                );
            }
        }
    }
}

customElements.define('stat-element', Stat);

class GithubStats extends HTMLElement {
    async connectedCallback() {
        const stats = element('stat-element', {
            parameter: 'GitHub Contributions\\nThis Week',
            value: 'Loading...'
        });
        append.call(this, stats);
        try {
            const url = 'https://api.github.com/users/Ocean-OS/events/public';
            const res = await fetch(url, {
                headers: {
                    Accept: 'application/vnd.github+json'
                }
            });
            const contributions =
                /** @type {Array<Record<string, any> & { created_at: string }>} */ (
                    await res.json()
                );
            const week = contributions.filter(contribution => {
                const date = new Date(contribution.created_at).getTime();
                const days = date / ms_to_days;
                return days - days_since_epoch <= 7;
            });
            stats.setAttribute('value', String(week.length));
        } catch {
            stats.setAttribute('value', '20+');
        }
    }
}

customElements.define('github-stats', GithubStats);
console.log('%cpssst...', 'color: gray');
console.log(
    '%cup up down down left right left right b a enter',
    'color: #aabbff'
);
let keys = 0;
document.body.addEventListener('keydown', e => {
    switch (keys) {
        case 0:
        case 1:
            if (e.key === 'ArrowUp') {
                keys++;
                e.preventDefault();
            } else {
                keys = 0;
            }
            return;
        case 2:
        case 3:
            if (e.key === 'ArrowDown') {
                keys++;
                e.preventDefault();
            } else {
                keys = 0;
            }
            return;
        case 4:
        case 6:
            if (e.key === 'ArrowLeft') {
                keys++;
                e.preventDefault();
            } else {
                keys = 0;
            }
            return;
        case 5:
        case 7:
            if (e.key === 'ArrowRight') {
                keys++;
                e.preventDefault();
            } else {
                keys = 0;
            }
            return;
        case 8:
            if (e.key === 'b') {
                keys++;
                e.preventDefault();
            } else {
                keys = 0;
            }
            return;
        case 9:
            if (e.key === 'a') {
                keys++;
                e.preventDefault();
            } else {
                keys = 0;
            }
            return;
        case 10:
            if (e.key === 'Enter') {
                keys++;
                e.preventDefault();
                console.log('yippee');
                keys = 0;
                do_the_thing();
            } else {
                keys = 0;
            }
            return;
        default:
            keys = 0;
    }
});

function do_the_thing() {
    const canvas = element('canvas', { width: 300, height: 200 });
    append.call(document.body, canvas);
    const ctx = canvas.getContext('2d');
    const [score, set_score] = signal(0);
    const [x, set_x] = signal(150);
    const [y, set_y] = signal(100);
    const [player, set_player] = signal(150);
    let [left, set_left] = signal(false);
    let [right, set_right] = signal(false);
    let prev_bot = 150;
    let prev_x = 150;
    /**
     * @param {number} value
     * @param {number} min
     * @param {number} max
     */
    function clamp(value, min = -Infinity, max = Infinity) {
        return Math.min(Math.max(value, min), max);
    }
    const bot = derived(() => {
        if (prev_bot < x()) {
            return (prev_bot = clamp(prev_bot + ~~(Math.random() * 2), 0, 300));
        }
        if (prev_bot > x()) {
            return (prev_bot = clamp(prev_bot - ~~(Math.random() * 2), 0, 300));
        }
        return prev_bot;
    });
    ctx.fillStyle = 'white';
    ctx.font = 'bold 30px monospace';
    function update_score() {
        erase_score();
        ctx.fillStyle = 'white';
        ctx.fillText(score(), 20, 30);
    }
    effect(update_score);
    effect(() => {
        let prev_player;
        ctx.fillStyle = 'white';
        ctx.fillRect((prev_player = player()) - 35, 180, 80, 10);
        return () => {
            ctx.fillStyle = 'black';
            ctx.fillRect(prev_player - 35, 180, 80, 10);
        };
    });
    effect(() => {
        let prev_bot;
        ctx.fillStyle = 'white';
        ctx.fillRect((prev_bot = bot()) - 35, 20, 80, 10);
        if (
            prev_bot <
            50 + 15 * ~~Math.abs(score() / 10) + (score() < 0 ? 15 : 0)
        ) {
            update_score();
        }
        return () => {
            ctx.fillStyle = 'black';
            ctx.fillRect(prev_bot - 35, 20, 80, 10);
        };
    });
    effect(() => {
        let prev_x, prev_y;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.rect((prev_x = x()), (prev_y = y()), 8, 8);
        ctx.fill();
        return () => {
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.rect(prev_x, prev_y, 8, 8);
            ctx.fill();
        };
    });
    const direction = {
        x: 1,
        y: 1
    };
    document.addEventListener('keydown', e => {
        if (e.key === 'ArrowLeft' && player() >= 50) {
            set_left(true);
            set_player(player => player - 15);
        } else if (e.key === 'ArrowRight' && player() <= 250) {
            set_right(true);
            set_player(player => player + 15);
        }
    });
    document.addEventListener('keyup', e => {
        if (e.key === 'ArrowLeft' && player() >= 35) {
            set_left(false);
        } else if (e.key === 'ArrowRight' && player() <= 265) {
            set_right(false);
        }
    });
    function erase_score() {
        ctx.fillStyle = 'black';
        ctx.fillRect(
            0,
            0,
            50 + 15 * ~~Math.abs(score() / 10) + (score() < 0 ? 15 : 0),
            50
        );
    }
    const update = () => {
        ctx.fillStyle = 'white';
        ctx.fillRect(player() - 35, 180, 80, 10);
        ctx.fillRect(bot() - 35, 20, 80, 10);
        set_x(x => x + direction.x);
        set_y(y => y + direction.y);
        if (
            y() <= 50 &&
            x() <= 50 + 15 * ~~Math.abs(score() / 10) + (score() < 0 ? 15 : 0)
        ) {
            erase_score();
            ctx.fillStyle = 'white';
            ctx.fillText(score(), 20, 30);
        }
        if (y() > 168 && y() < 180) {
            if (x() > player() - 40 && x() < player() + 40) {
                const y_edge =
                    player() - 40 - x() === 0 || player() + 40 - x() === 0
                        ? null
                        : 168 - y() < 180 - y()
                        ? 'top'
                        : 'bottom';
                const x_edge =
                    y_edge !== null
                        ? null
                        : player() - 40 - x() < player() + 40 - x()
                        ? 'left'
                        : 'right';

                if (x_edge !== null) {
                    direction.x = -direction.x;
                }
                if (y_edge !== null) {
                    direction.y = -direction.y;
                }
            }
        }
        if (y() > 18 && y() < 30) {
            if (x() > bot() - 40 && x() < bot() + 40) {
                const y_edge =
                    bot() - 40 - x() === 0 || bot() + 40 - x() === 0
                        ? null
                        : 18 - y() < 40 - y()
                        ? 'top'
                        : 'bottom';
                const x_edge =
                    y_edge !== null
                        ? null
                        : bot() - 40 - x() < bot() + 40 - x()
                        ? 'left'
                        : 'right';

                if (x_edge !== null) {
                    direction.x = -direction.x;
                }
                if (y_edge !== null) {
                    direction.y = -direction.y;
                }
            }
        }
        if (x() >= 300 || x() <= 0) {
            direction.x = -direction.x;
        }
        if (y() <= 0) {
            set_score(score => score + 1);
            set_x(150);
            set_y(100);
            direction.x = 1;
            direction.y = 1;
        }
        if (y() >= 200) {
            set_score(score => score - 1);
            set_x(150);
            set_y(100);
            direction.x = 1;
            direction.y = 1;
        }
        requestAnimationFrame(update);
    };
    update();
}
