import { expect } from '../utils/k6browsertestingpackagehelper.js';

export class HomePage {
	constructor(page) {
		this.page = page;
	}

	//Page elements
	get PizzaRatingsText() {
		return this.page.getByRole('heading', { name: 'Your Pizza Ratings:' });
	}

	get RatingsTableinHomepage() {
		return this.page.locator("//div[@class='mt-4 mb-12']//ul");
	}

	get PizzaRoutineText() {
		return this.page.getByText('Looking to break out of your pizza routine?', { exact: true });
	}

	get logoutButton() {
		return this.page.getByRole('button', { name: 'Logout' });
	}

	//Page actions
	async navigateToHomePage() {
		await this.PizzaRatingsText.waitFor({ state: 'visible' });
	}

	async clickLogout() {
		await this.RatingsTableinHomepage.waitFor({ state: 'visible' });
		await this.logoutButton.click();
		await this.PizzaRoutineText.waitFor({ state: 'visible' });
		const LookingToBreakOutText = await this.PizzaRoutineText.textContent();
		await expect(LookingToBreakOutText).toContain('Looking to break out of your pizza routine?');
	}
}
