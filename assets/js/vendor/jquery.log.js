(function( $ ) {
	$.fn.log = function() {
		console && console.log( this );

		return this;
	};
})( jQuery );
