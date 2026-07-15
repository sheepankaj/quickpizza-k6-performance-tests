import { Trend } from 'k6/metrics';

// Shared login-duration metric. Defined here so every browser test measures
// login the same way and reports under a single metric name. Threshold is set
// once in loadconfig.js.
const quickPizzaUILoginDuration = new Trend('QuickPizza_UI_login_duration', true);

export async function measureLogin(loginPage) {
	const start = Date.now();
	await loginPage.login();
	quickPizzaUILoginDuration.add(Date.now() - start);
}
