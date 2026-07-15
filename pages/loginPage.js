import { baseUIUrlForQuickPizza, loginEndpoint } from '../testconfig/constants.js';
import { expect } from '../utils/k6browsertestingpackagehelper.js';

export class LoginPage {
	constructor(page) {
		this.page = page;
	}

	// Quick Pizza login page elements
	get userLoginText() {
		return this.page.getByText('QuickPizza User Login', { exact: true });
	}

	get usernameField() {
		return this.page.locator('#username');
	}

	get passwordField() {
		return this.page.locator('#password');
	}

	get signInButton() {
		return this.page.getByText('Sign in', { exact: true });
	}

	// Quick Pizza Home page - app tile
	get yourPizzaRatings() {
		return this.page.getByText('Your Pizza Ratings:', { exact: true });
	}

	// Performs the full login flow:
	// Quick Pizaa app → Enter Username and password → Login to Quick Pizza app
	async login() {
		const username = __ENV.loginId;
		const password = __ENV.loginPassword;

		await this.page.goto(`${baseUIUrlForQuickPizza}${loginEndpoint}`);

		await this.userLoginText.waitFor({ state: 'visible' });
		// Wait for the SPA to finish hydrating before interacting — otherwise the Sign in click
		// can fire a native form submit before the app's own submit handler attaches, which
		// aborts the app's in-flight requests (including its own token/CSRF fetches) mid-flight.
		await this.page.waitForLoadState('networkidle');

		await this.usernameField.waitFor({ state: 'visible' });
		await this.usernameField.fill(username);

		await this.passwordField.waitFor({ state: 'visible' });
		await this.passwordField.fill(password);
		await this.signInButton.click();

		const yourPizzaRatingsText = await this.yourPizzaRatings.textContent();
		await expect(yourPizzaRatingsText).toContain('Your Pizza Ratings:');

		// Wait for navigation to the Your Pizza Ratings page after login
		await this.page.waitForURL(`${baseUIUrlForQuickPizza}${loginEndpoint}`);
	}
}
