class CookieBar extends Component {

	init() {
		$.cookieBar({
			message: theme.cookieMessageText,
			acceptText: theme.cookieAcceptText,
			fixed: true,
			bottom: true,
		});
	}
}

CookieBar.addComponent();
