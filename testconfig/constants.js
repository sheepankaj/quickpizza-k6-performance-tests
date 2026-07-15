// __ENV is injected by the k6 runtime; fall back to process.env when this module
// is loaded under Node (e.g. the Playwright setup script in setup/getTokenViaLogin.spec.js).
const testEnv = typeof __ENV !== 'undefined' ? __ENV.testEnv : process.env.testEnv;

export const baseUIUrlForQuickPizza = `https://quickpizza.${testEnv}.com`;
export const baseAPIUrlForQuickPizza = `https://quickpizza.${testEnv}.com/api`;
export const loginEndpoint = '/login';
export const detailsAboutQuickPizzaComEndpoint = '/config';
export const pizzaRatingsEndpoint = '/ratings';
export const loginTokenApiEndpoint = '/api/users/token/login';

// Browser-test car company rotation (Batch 4-C Option A) — searches one of these
// per iteration to defeat server-side cache warming on a single test car company.
// API tests still use their respective endpoint above for their endpoint paths.
//Below is optional for any search functionality in your home page
export const carCompanyNamePool = [
	'Honda',
	'Toyotta',
	'Tata',
	'Tesla',
	'Volkswagen',
	'Hyundai',
	'Skoda',
	'Peugeot',
	'Seat',
	'Ford',
	'Land Rover',
	'BMW',
	'Audi',
	'Ferrari',
];

export function pickRandomCarCompanyName() {
	return carCompanyNamePool[Math.floor(Math.random() * carCompanyNamePool.length)];
}
