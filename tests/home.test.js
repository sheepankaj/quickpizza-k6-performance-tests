import { getRequestEndpointAndValidateResponse } from '../utils/httpHelper.js';
import { options as sharedOptions } from '../testconfig/loadconfig.js';
import { check, group, sleep } from 'k6';
import { browser } from 'k6/browser';
import { Trend } from 'k6/metrics';
import { generateSummary } from '../utils/reportHelper.js';
import { takeScreenshot } from '../utils/screenshotHelper.js';
import { capturePageWebVitals } from '../utils/webVitalsHelper.js';
import {
	recordBrowserIterationStart,
	recordApiIterationStart,
	recordBrowserIterationSuccess,
	recordBrowserIterationFailure,
} from '../utils/iterationFailureHelper.js';
import { measureLogin } from '../utils/loginHelper.js';
import {
	loginEndpoint,
	detailsAboutQuickPizzaComEndpoint,
	pizzaRatingsEndpoint,
	//pickRandomCarCompanyName,
} from '../testconfig/constants.js';
import { HomePage } from '../pages/homepage.js';
import { LoginPage } from '../pages/loginPage.js';

// Custom Trend metrics — Home page only
const DetailsAboutQuickPizzaComApiDuration = new Trend('details_about_QuickPizzaCom_api_duration', true);
const quickPizzaHomePageYourPizzaRatingsListApiDuration = new Trend(
	'quick_pizza_homepage_yourpizza_ratingslist_api_duration',
	true
);
const quickPizzaHomePageUILoadDuration = new Trend('quick_pizza_home_page_UI_load_duration', true);
const loginPageBackFromHomePageNavigationDuration = new Trend('loginPage_back_from_homepage_navigation_duration', true);

// Per-page web vitals — isolated to the Home page (vs the global
// browser_web_vital_* which blends login + portal + app pages).
const homeFCP = new Trend('home_fcp', true);
const homeLCP = new Trend('home_lcp', true);
const homeCLS = new Trend('home_cls');

// Extend shared options with Home-specific Trend thresholds
export const options = {
	...sharedOptions,
	thresholds: {
		...sharedOptions.thresholds,
		details_about_QuickPizzaCom_api_duration: ['p(95)<3500', 'avg<3000'],
		quick_pizza_homepage_yourpizza_ratingslist_api_duration: ['p(95)<3500', 'avg<3000'],
		quick_pizza_home_page_UI_load_duration: ['p(95)<3500', 'avg<3000'],
		loginPage_back_from_homepage_navigation_duration: ['p(95)<3500', 'avg<3000'],
		home_fcp: ['p(95)<3500', 'avg<3000'],
		home_lcp: ['p(95)<3500'],
		home_cls: ['p(95)<0.1'],
		browser_iteration_failed: ['rate<0.05'],
	},
};

// Browser test scenario (for hybrid mode)
export async function browserTest() {
	const context = await browser.newContext();
	const page = await context.newPage();
	try {
		recordBrowserIterationStart();

		const loginPage = new LoginPage(page);
		const homePage = new HomePage(page);
		// Login to establish an authenticated session
		await measureLogin(loginPage);

		// Navigate to home page and measure load duration (authenticated)
		const navStart = Date.now();
		await homePage.navigateToHomePage();
		quickPizzaHomePageUILoadDuration.add(Date.now() - navStart);

		// Capture Home-page-only web vitals (separate from global browser_web_vital_*)
		await capturePageWebVitals(page, { fcp: homeFCP, lcp: homeLCP, cls: homeCLS });

		// Verify page elements
		const yourPizzaRatingsTextVisible = await homePage.PizzaRatingsText.isVisible();
		const ratingsTableVisible = await homePage.RatingsTableinHomepage.isVisible();

		// FrontEnd Perform checks for the Home Page
		let allPassed;
		group('Quick Pizza (Pizza Ratings) Home Page after login Browser Performance Test', () => {
			allPassed = check(page, {
				'Browser: QuickPizza HomePage: QuickPizza Home page Your  Pizza Ratings title is visible': () =>
					yourPizzaRatingsTextVisible,
				'Browser: QuickPizza HomePage: Ratings Table is visible': () => ratingsTableVisible,
			});
		});

		if (!allPassed) {
			await takeScreenshot(page, 'quickpizza_home-check-failure');
		}

		// Click Logout, then navigate back to quick pizza home to validate the Looking to break out of your pizza routine text
		const backNavStart = Date.now();
		//await homePage.(pickRandomCarCompanyName());
		await homePage.clickLogout();
		const quickPizzaLandingPagePizzaRoutineTextVisible = await homePage.PizzaRoutineText.isVisible();
		loginPageBackFromHomePageNavigationDuration.add(Date.now() - backNavStart);

		let landingQuickPizzaPagePaased;
		group('Quick Pizza landing page Test', () => {
			landingQuickPizzaPagePaased = check(page, {
				'Browser: QuickPizza Landing Page: Looking to break out of your pizza routine text is visible after logout':
					() => quickPizzaLandingPagePizzaRoutineTextVisible,
			});
		});

		if (!landingQuickPizzaPagePaased) {
			await takeScreenshot(page, 'quickpizza-landingpage-check-failure');
		}

		recordBrowserIterationSuccess('HomePage');
	} catch (err) {
		recordBrowserIterationFailure('HomePage', err);
		await takeScreenshot(page, 'home-error');
		throw err;
	} finally {
		await page.close();
		await context.close();
	}
}

// HTTP test scenario (for hybrid mode)
export function apiTest() {
	recordApiIterationStart();

	group('Quick Pizza Home Page API Performance Test', () => {
		// Details About QuickPizza.com JSON API validation
		const data = getRequestEndpointAndValidateResponse(
			detailsAboutQuickPizzaComEndpoint,
			{},
			{},
			{ name: 'DetailsAboutQuickPizzaComApi' }
		);
		DetailsAboutQuickPizzaComApiDuration.add(data.res.timings.duration);

		check(data.res, {
			'HTTP: Details About QuickPizza.com API Endpoint status is 200': (r) => r.status === 200,
			'HTTP: Details About QuickPizza.com API Response is JSON': () => data.isJson === true,
		});

		// Your Pizza Ratings JSON API validation
		const pizzaRatingsData = getRequestEndpointAndValidateResponse(
			pizzaRatingsEndpoint,
			{},
			{},
			{ name: 'PizzaRatingsListApi' }
		);
		quickPizzaHomePageYourPizzaRatingsListApiDuration.add(pizzaRatingsData.res.timings.duration);

		check(pizzaRatingsData.res, {
			'HTTP: Your Pizza Ratings List API Endpoint status is 200': (r) => r.status === 200,
			'HTTP: Your Pizza Ratings List API Response is JSON': () => pizzaRatingsData.isJson === true,
		});
	});
	sleep(Math.random() * 3 + 1);
}

export function handleSummary(data) {
	return generateSummary(data);
}
