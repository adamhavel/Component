# Component

*Component* is a library for creating and managing front-end components.

## Purpose

In this context, a front-end component means a widget, like a date picker or video player, that has a clearly defined structure and use. Creating such components using native JavaScript requires solving a similar set of problems, even if the components themselves are quite different. One of these problems is event delegation — it is a good practice to set one event listener on a parent element, instead of polluting the memory by putting a listener on each of the element's children. By following this principle, all event handling is delegated to the outermost element. The downside of this approach is that you have to deal with several non-trivial aspects of the JavaScript event model, such as bubbling or capturing phases.

Another problem relates to structuring code. How are components initialized? At what place and time do you create the references to elements? Where do you put event handling definitions? These questions, trivial at first sight, quickly lead to badly structured code if left unanswered.

The purpose of the *Component* library is to hide the imperative mechanisms (such as the event delegation) behind a declarative facade that is easy to use and understand. By defining a component declaratively, you don't have to specify the *how* (how to deal with event bubbling?), but only the *what* (what happens when an element is clicked?). The library also requires a certain structure, making components more predictable and readable.

*Component* is not a framework — it does not care about where or when you create a component, nor does it handle a component's life cycle. It simply provides means to define a component in a predictable and declarative way.

## Usage

*Component* is a module per *ECMAScript 2015* specification. If used in an environment without support for native modules and *ECMAScript 2015* syntax, it is necessary to define a transpilation and import process. One possible solution is a combination of *BabelJS* and *SystemJS*, but many other exist.

To use *Component*, you must declare it as a dependency. Note that you can name the import in any way you want and not necessarily `Hub`:
```
import Hub from 'component';
```

### Setup

Let's say you have a following HTML structure:
```
<form class="js-component">
    <ul>
        <li><input class="js-component__input"></li>
        <li><input class="js-component__input"></li>
        <li><input class="js-component__input"></li>
    </ul>
    <a class="js-component__link">Cupiditate</a>
    <button type="submit">Submit</button>
</form>
```

To create a new component, you need a DOM node, name, and selector. All of these are then passed to the `create(name, node, selector)` method:
```
let selector = '.js-component';
let node = document.querySelector(selector);

const Component = Hub.create('My Component', node, selector);
```

### Define

To make use of the new component, you must define its behavior using `define(...)`:
```
Component.define(
    {
        name: 'self',
        handlers: {
            submit(ev) {
                ev.preventDefault();
                ...
            }
        },
        actions: {
            validate() {
                let isValid = this.element('input').getAll().every(input => input.checkValidity());

                if (!isValid) {
                    let title = 'Error';
                    let message = 'Minima veniam totam quam, deserunt.'

                    Component.element('dialog').renderTo(this.get(), title, message);
                }

                Component.emit('validation', { isValid });
            }
        },
        startup() {
            this.get().setAttribute('novalidate', 'true');
        }
    }
    {
        name: 'input',
        handlers: {
            click(ev, index) {
                this.actions.toggle(index);
            }
        },
        actions: {
            toggle(index) {
                this.get(index).classList.toggle('is-active');
            }
        }
    },
    {
        name: 'link',
        handlers: {
            focus() {
                Component.actions.validate();
            }
        }
    },
    {
        name: 'dialog',
        template(title, message) {
            return `
                <section role="alert">
                    <h3>${title}</h3>
                    <p>${message}</p>
                </section>
            `;
        }
    }
);
```

In this example, each object passed to `define(...)` represents an element. An exemption is the object named `self` that stands for the component itself. Its presence is optional and it is identified solely by using the reserved keyword `self`. Other elements must be named according to their HTML class names, which in turn must strictly adhere to the *BEM* methodology. The reason is simple: nodes are targeted using selectors created by gluing an element's name to its parent component's selector using the *BEM* `__` operator. To give an example, an element with a name `input` represents all DOM nodes matching the selector `.js-component__input`. That means an element is by design always a *collection* of DOM nodes, even if representing only one node. To get an element, use the component's `element(name)` method. If you need to obtain a reference to the underlying DOM node/s, then call either `get(index)` or `getAll()` on the element itself.

### Handlers and actions

Each element can have both handlers and actions. Handlers are essentially event listeners that are fired whenever a particular interaction occurs. Their names correspond to the event types for which they are to be called. Handlers are passed the original `Event` object and an index of the source DOM node, i.e. the event's `target`. Note that the `this` reference inside a handler is set to the element itself, *not* the event's `target` as in normal event listeners.

Actions are functions that are set at an element's level for the purpose of logical separation and convenience, and can be called at any place and at any time. They can be defined with an arbitrary number of parameters, and similar to handlers, their `this` reference is set to the parent element.

Last, elements can define a `startup()` method that is automatically called at the end of the `define()` process. At that time, all elements are already created and ready — in case you need them.

### Templates and rendering

Some elements are dynamic by nature — they are created and deleted at various times and not necessarily available from the start. These are easily identified by the presence of a `template(...)` method. The method receives any number of parameters, but must return a string containing a HTML template of the element. Contrary to static elements, there is no need to use the class name normally required by *BEM*; it is added automatically on the outermost node in the template. You can, however, define any additional classes you might need.

If you wish to create a dynamic element, you can either call the element's `render(...)` method and place the returned node in the document yourself, or use the method `renderTo(targetNode, ...)`, which puts the result in the parent node of your choice. In case you want to remove an element's node from the DOM, use `remove(index)` to delete a specific node, or `removeAll()` to delete them all.

### Signaling

Components can communicate with each other by subscribing to and broadcasting events. An event is sent using the component's method `emit(name, payload)`, where `name` stands for the event's name and `payload` represents an optional object used to transmit arbitrary data. On the other end, a component must explicitly subscribe to an event to receive the message:

```
Component.listen(
    {
        event: 'alert',
        handler(payload) {
            this.element('dialog').renderTo(this.get(), payload.title, payload.message);
        }
    }
);
```

## Test

Run `make test`.