class Theme extends Component {

	init() {
		this.addMenuClass();
		//this.bindUIActions();
		// this.addOpenClass();
	}

	addMenuClass() {
		$( document ).on( 'ready', () => {
			$( 'li.menu-item:has( ul.sub-menu )' ).addClass( 'menu-item-has-children' );
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

Theme.addComponent( 'body' );
