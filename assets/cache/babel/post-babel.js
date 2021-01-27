(function (root, document, $) {
	'use strict';

	class App {

		static addComponent(className, selector) {
			if ('function' !== typeof className) {
				throw new Error('Expected "className" to be a class.');
			}

			if (!(className.prototype instanceof Component)) {
				throw new Error(`Expected ${className.name} to a subclass of Component.`);
			}

			if ('string' !== typeof selector && 'undefined' !== typeof selector) {
				throw new Error(`Expected selector "${selector}" to be a string or not defined at all.`);
			}

			if ('string' === typeof selector && 3 > selector.length) {
				throw new Error('Expected selector "${selector}" to have a length of at least 2.');
			}

			if ('undefined' === typeof App.components || !(App.components instanceof Array)) {
				App.components = [];
			}

			const component = {
				className
			};

			if (selector) {
				component.selector = selector;
			}

			App.components.push(component);
		}

		static getComponents() {
			return App.components;
		}

		static init() {
			Component.body = App.body = $(document.body);

			App.componentInstances = [];

			for (let i = App.components.length - 1; 0 <= i; i--) {
				const component = App.components[i];

				App.initClassWithSelector(component.className, component.selector);
			}

			App.body.addClass('is-loaded');
		}

		static initClassWithSelector(className, selector) {
			if ('string' === typeof selector) {
				const elements = $(selector);

				if (0 < elements.length) {
					elements.each((i, element) => {
						App.componentInstances[className.name] = App.componentInstances[className.name] || [];

						const $element = $(element);
						const instance = new className($element, selector);

						$element.data('instance', instance);
						App.componentInstances[className.name].push(instance);
					});
				}
			} else if ('undefined' === typeof selector && 0 === className.length) {
				App.componentInstances[className.name] = new className();
			}
		}
	}

	class Component {
		constructor(element, selector) {
			if ('undefined' !== typeof element && 'number' === typeof element.length) {
				this.element = element;
				this.selector = selector;
			}

			if ('function' !== typeof this.init) {
				throw new Error(`Class ${this.name} need to have a "init" function.`);
			}

			this.init();
		}

		static addComponent() {
			App.addComponent(this, ...arguments);
		}
	}

	// init
	$(() => App.init());

	class CookieBar extends Component {

		init() {
			$.cookieBar({
				message: theme.cookieMessageText,
				acceptText: theme.cookieAcceptText,
				fixed: true,
				bottom: true
			});
		}
	}

	CookieBar.addComponent();

	class Theme extends Component {

		init() {
			this.addMenuClass();
			//this.bindUIActions();
			// this.addOpenClass();
		}

		addMenuClass() {
			$(document).on('ready', () => {
				$('li.menu-item:has( ul.sub-menu )').addClass('menu-item-has-children');
			});
		}

		// addOpenClass() {
		// 	$( '.menu-item-has-children::before' ).on( 'click', () => {
		// 		console.log( e.currentTarget, this );
		// 	});
		// }

		// bindUIActions() {
		// 	this.element
		// 		.on( 'click', e => {
		// 			console.log( e.currentTarget, this );
		// 			alert( `${e.currentTarget} clicked!` );
		// 		});
		// }
	}

	Theme.addComponent('body');
})(window, document, jQuery);
