/* ==========================================================================
   Component
   @author Adam Havel <adam.havel@heureka.cz>
   ========================================================================== */

import utils from 'utils';

const Element = {
    /**
     * Initialize the element.
     * @param {Component} component Parent component
     */
    init(component) {
        let template = this.template;
        let defaultSelector = (this.name === 'self') ? component.selector : (component.selector + '__' + this.name);
        let defaultActions = {
            isActive(index = 0) {
                return this.get(index).classList.contains('is-active');
            },
            activate(index = 0) {
                this.get(index).classList.add('is-active');
            },
            deactivate(index = 0) {
                this.get(index).classList.remove('is-active');
            }
        };

        this.component = component;
        this.selector = this.selector || defaultSelector;
        this.className = (this.selector.indexOf('.') === 0) ? this.selector.substr(1) : null;
        this.handlers = Object.assign(Object.create(null), this.handlers);
        this.actions = Object.assign(Object.create(null), defaultActions, this.actions);

        // Bind actions to the element.
        for (let action in this.actions) {
            this.actions[action] = this.actions[action].bind(this);
        }

        if (template) {
            this.template = (...args) => {
                let node = utils.createNode(template(...args));

                node.classList.add(this.className);

                return node.outerHTML;
            }
        }

        // Set the component actions to the special 'self' element actions.
        if (this.name === 'self') {
            component.actions = this.actions;
        }

        this.resolveNodes();
    },
    /**
     * Bind the element to all relevant DOM nodes.
     *
     * @return {Array} DOM nodes representing the element
     */
    resolveNodes() {
        if (this.name === 'self') {
            this.nodes = [this.component.container];
        } else {
            this.nodes = utils.queryAll(this.selector, this.component.container);
        }

        return this.nodes;
    },
    /**
     * Return a DOM node for a given index.
     * @param {number} index
     *
     * @return {Node}
     */
    get(index = 0) {
        return this.getAll()[index];
    },
    /**
     * Return all DOM nodes belonging to the element.
     * Try to resolve the nodes beforehand if none exist or the element is transient.
     *
     * @return {Array}
     */
    getAll() {
        if (!this.nodes.length || this.template) {
            this.resolveNodes();
        }

        return this.nodes;
    },
    /**
     * Filter element nodes for all nodes satisfying a given selector.
     * @param {String} selector
     *
     * @return {Array}
     */
    filter(selector) {
        return this.nodes.filter(node => utils.matches(node, selector));
    },
    /**
     * Remove a node at a given index from the DOM.
     * @param {number} index
     */
    remove(index = 0) {
        let node = this.get(index);

        node.parentNode.removeChild(node);
        this.resolveNodes();
    },
    /**
     * Remove all element nodes from the DOM.
     */
    removeAll() {
        this.nodes.forEach(node => node.parentNode.removeChild(node));
        this.nodes = [];
    },
    /**
     * Create a node if a template function is available.
     * @param {...Object} args Arguments passed to the template function
     *
     * @return {Node}
     */
    render(...args) {
        if (this.template) {
            let renderedEl = utils.createNode(this.template(...args));

            return renderedEl;
        }
    },
    /**
     * Create a node and append it to a given target.
     * @param {Node}      target
     * @param {...Object} args   Arguments passed to the template function
     *
     * @return {Node}
     */
    renderTo(target, ...args) {
        let renderedEl = this.render(...args);

        if (target && renderedEl) {
            target.appendChild(renderedEl);

            for (let element of this.component.elements.values()) {
                if (!element.nodes.length || element.template) element.resolveNodes();
            }
        }
    }
};

const Component = {
    /**
     * Initialize the component.
     * @param {string} name     Component name
     * @param {Node}   node     Component container
     * @param {string} selector Component container selector
     */
    init(name, node, selector) {
        this.name = name;
        this.container = node;
        this.selector = selector;
        this.elements = new Map();
        this.registeredHandlers = Object.create(null);
    },
    /**
     * Define the component through its elements.
     * @param {...Element} elements
     */
    define(...elements) {
        for (let element of elements) {
            element = Object.assign(Object.create(Element), element);
            element.init(this);

            this.elements.set(element.name, element);

            for (let eventType in element.handlers) {

                if (!this.registeredHandlers[eventType]) {
                    let capturingTypes = ['blur', 'focus', 'mouseenter', 'mouseleave'];
                    let isCapturing = capturingTypes.indexOf(eventType) > -1;
                    let handler = this.handler.bind(this);

                    this.container.addEventListener(eventType, handler, isCapturing);
                    this.registeredHandlers[eventType] = handler;

                    // Add custom handling for touch events.
                    if (eventType === 'touchmove' && !this.touches) {
                        this.touches = {};
                        this.container.addEventListener('touchstart', ev => {
                            this.touches.x = ev.touches[0].clientX;
                            this.touches.y = ev.touches[0].clientY;
                        });
                    }
                }

            }

            for (let element of this.elements.values()) {
                if (element.nodes.length && element.startup) element.startup();
            }
        }
    },
    /**
     * Get the component container.
     *
     * @return {Node}
     */
    get() {
        return this.container;
    },
    /**
     * Get an element for a given name.
     * @param {string} name
     *
     * @return {Element}
     */
    element(name) {
        return this.elements.get(name);
    },
    /**
     * Find an element and an index for a given DOM node.
     * @param {Node} node
     *
     * @return {Object}
     */
    findElement(node) {
        let elements = this.elements.values();
        let result = {};

        [...elements].some(element => {

            return element.nodes.some((item, index) => {
                if (item === node) {
                    result = { element, index };

                    return true;
                }
            });

        });

        return result;
    },
    /**
     * Generic event handler.
     * @param {Event} ev
     */
    handler(ev) {
        let currentTarget = ev.target;
        let relatedTarget = ev.relatedTarget;
        let eventType = ev.type;
        let stopPropagation = false;

        // Stop event propagation inside both the component structure and the DOM.
        ev.stopInnerPropagation = () => {
            ev.stopPropagation();
            stopPropagation = true;
        };

        // Add custom data for touch events.
        if (eventType === 'touchmove') {
            let delta = {
                x: this.touches.x - ev.touches[0].clientX,
                y: this.touches.y - ev.touches[0].clientY
            };

            ev.isHorizontal = Math.abs(delta.x) > Math.abs(delta.y);
            ev.isLeftToRight = delta.x < 0;
            ev.isBottomToTop = delta.y > 0;
        }

        while (!stopPropagation) {
            let { element = null, index = null } = this.findElement(currentTarget);
            let eventHandler = element && element.handlers[eventType];
            // Don't fire the handler for mouseover and mouseout events initiated by a movement inside an element.
            let isOutsideRelated = !relatedTarget || (
                !currentTarget.contains(relatedTarget) && currentTarget !== relatedTarget
            );

            if (element && eventHandler && isOutsideRelated) {
                eventHandler.call(element, ev, index);
            }

            // Stop propagating after reaching the container.
            if (currentTarget === this.container) {
                stopPropagation = true;
            } else {
                currentTarget = currentTarget.parentNode;
            }
        }
    },
    /**
     * Subscribe to a set of events
     * @param {...Object} events
     */
    listen(...events) {

        events.forEach(event => {
            Hub.subscribe(this, event.event, event.handler.bind(this));
        });

    },
    /**
     * Emit an event and optional payload data.
     * @param {string} event
     * @param {Object} payload
     */
    emit(event, payload) {
        Hub.broadcast(this, event, payload);
    }
};

const Hub = {
    components: [],
    observers: [],
    /**
     * Create a component.
     * @param {string} name
     * @param {Node}   node
     * @param {string} selector
     *
     * @return {Component}
     */
    create(name, node, selector) {
        let component = Object.create(Component);

        component.init(name, node, selector);
        this.components.push(component);

        return component;
    },
    /**
     * Delete a component for a given node.
     * @param {Node} node Component container
     */
    delete(node) {
        this.components.some((component, index) => {
            if (component.container === node) {
                this.components.splice(index, 1);

                return true;
            }
        });

        this.observers.some((observer, index) => {
            if (observer.component.container === node) {
                this.observers.splice(index, 1);

                return true;
            }
        });
    },
    /**
     * Subscribe a component to observe a given event.
     * @param {Component} component Component object
     * @param {string}    event     Event name
     * @param {Function}  handler   Event callback
     */
    subscribe(component, event, handler) {
        this.observers.push({ component, event, handler });
    },
    /**
     * Unsubscribe a component from observing all events or a single event.
     * @param {Component} component Component object
     * @param {string}    event     Event name
     */
    unsubscribe(component, event) {
        this.observers = this.observers.filter(observer => {
            if (
                observer.component === component
                && (!event || observer.event === event)
            ) {
                return false;
            } else {
                return true;
            }
        });
    },
    /**
     * Broadcast en event to all relevant observers.
     * @param {Component} component Component object
     * @param {string}    event     Event name
     * @param {Object}    payload   Optional payload data
     */
    broadcast(component, event, payload) {
        let defaultPayload = { target: component };

        payload = Object.assign(Object.create(null), defaultPayload, payload);

        this.observers.forEach(observer => {
            if (component !== observer.component && event === observer.event) {
                observer.handler(payload);
            }
        });
    }
};

export default Hub;
