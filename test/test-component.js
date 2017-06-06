import test from 'ava';
import Hub from '../component.js';

document.body.innerHTML = `
<section class="js-component" tabindex="-1">
    <header class="js-component__header"></header>
    <div class="js-component__content">
        <p>Distinctio impedit fuga ea, reiciendis velit voluptatem officiis.</p>
        <ul class="o-block-list">
            <li><a href="" class="js-component__link">Expedita</a></li>
            <li><a href="" class="js-component__link">Tenetur</a></li>
            <li><a href="" class="js-component__link">Eum</a></li>
            <li><a href="" class="js-component__link">Neque</a></li>
        </ul>
    </div>
    <footer class="js-component__footer">
        <button class="js-component__button">Action</button>
    </footer>
</section>
<section class="js-other-component">
    <button class="js-other-component__button">Click</button>
</section>
`;

let selector = '.js-component';
let otherSelector = '.js-other-component';
let containerEl = document.querySelector(selector);
let otherContainerEl = document.querySelector(otherSelector);
let headerEl = document.querySelector('.js-component__header');
let buttonEl = document.querySelector('.js-component__button');
let otherButtonEl = document.querySelector('.js-other-component__button');
let contentEl = document.querySelector('.js-component__content');
let linkEls = document.querySelectorAll('.js-component__link');
let sources1 = ['dummy1.jpg', 'dummy2.jpg', 'dummy3.jpg', 'dummy4.jpg'];
let sources2 = ['dummy5.jpg', 'dummy6.jpg', 'dummy7.jpg'];
let Component = Hub.create('Component', containerEl, selector);
let OtherComponent = Hub.create('OtherComponent', otherContainerEl, otherSelector);

Component.define(
    {
        name: 'header'
    },
    {
        name: 'content',
        actions: {
            addGallery(sources) {
                Component.element('gallery').renderTo(this.get(), sources);
            },
            removeGallery() {
                Component.element('gallery').removeAll();
            }
        }
    },
    {
        name: 'footer',
        handlers: {
            click() {
                this.get().classList.add('is-clicked');
            }
        }
    },
    {
        name: 'link',
        handlers: {
            click(ev, index) {
                ev.preventDefault();

                Component.element('header').get().textContent = this.get(index).textContent;
            }
        }
    },
    {
        name: 'button',
        handlers: {
            click(ev) {
                ev.stopInnerPropagation();

                this.get().setAttribute('aria-pressed', 'true');
                Component.element('content').get().classList.add('is-active');
            }
        }
    },
    {
        name: 'gallery',
        template(sources) {
            let images = sources.map(src => Component.element('image').template(src)).join('');

            return `
                <section>
                    ${images}
                </section>
            `;
        }
    },
    {
        name: 'image',
        template(src) {
            return `<img src="${src}">`;
        }
    }
);

Component.listen(
    {
        event: 'testEvent',
        handler(payload) {
            this.element('content').actions.removeGallery();
            this.element('header').get().textContent = payload.key;
        }
    }
);

OtherComponent.define(
    {
        name: 'button',
        handlers: {
            click() {
                OtherComponent.emit('testEvent', { key: 'value' });
            }
        }
    }
);

test.serial('Check container and node equivalence', t => {
    t.is(containerEl, Component.container);
    t.is(otherContainerEl, OtherComponent.container);
});

test.serial('Check number of defined elements', t => {
    t.is(7, Component.elements.size);
});

test.serial('Check element and node equivalence', t => {
    t.is(buttonEl, Component.element('button').get());
});

test.serial('Check element collections', t => {
    t.is(4, Component.element('link').getAll().length);
});

test.serial('Check get() method', t => {
    t.is('Eum', Component.element('link').get(2).textContent);
});

test.serial('Check event handling and propagation', t => {

    window.addEventListener('click', ev => {

        if (ev.target === buttonEl) {
            t.fail('Propagation not stopped.');
        }

        if (Component.element('footer').get().classList.contains('is-clicked')) {
            t.fail('Inner propagation not stopped.');
        }

    });

    buttonEl.click();

    t.is('true', buttonEl.getAttribute('aria-pressed'));
    t.true(contentEl.classList.contains('is-active'));

    linkEls[1].click();

    t.is('Tenetur', headerEl.textContent);
});

test.serial('Check actions and element rendering', t => {
    Component.element('content').actions.addGallery(sources1);

    t.is(3, contentEl.children.length);
    t.is(4, Component.element('image').getAll().length);

    Component.element('content').actions.removeGallery();

    t.is(2, contentEl.children.length);

    Component.element('content').actions.addGallery(sources2);

    t.is(3, Component.element('image').getAll().length);
});

test.serial('Check event broadcasting', t => {
    otherButtonEl.click();

    t.is(Component.element('gallery').getAll().length, 0);

    t.is('value', headerEl.textContent);
});

test.serial('Check component deleting', t => {
    t.is(Hub.components.length, 2);
    t.is(Hub.observers.length, 1);

    Hub.delete(containerEl);

    t.is(Hub.components.length, 1);
    t.is(Hub.observers.length, 0);
});
