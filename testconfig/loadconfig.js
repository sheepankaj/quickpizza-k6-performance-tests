import { scenarios } from './stages.js';

const mode = __ENV.TEST_MODE || 'smoke';

if (!scenarios[mode]) {
	throw new Error(`Unknown TEST_MODE "${mode}". Use "smoke", "spike", "load", or "stress".`);
}

// Smart browser options with sensible defaults
const browserOptions = {
	headless: __ENV.HEADLESS
		? String(__ENV.HEADLESS).toLowerCase() === 'true'
		: __ENV.RUN_ENV === 'docker' || __ENV.CI === 'true',
};

const hybridThresholds = {
	//API Thresholds
	http_req_duration: ['p(95)<3500', 'avg<3500'],
	http_req_failed: ['rate<0.05'], //API request failure rate < 5%
	...(['load', 'stress', 'spike'].includes(mode) ? { http_reqs: ['rate>10'] } : {}), //throughput assertion for load/stress/spike tests

	//Browser-specific Thresholds
	browser_web_vital_fcp: ['p(95)<3500', 'avg<3000'], //First Contentful Paint
	browser_web_vital_lcp: ['p(95)<3500'], //Largest Contentful Paint
	browser_web_vital_cls: ['p(95)<0.1'], //Cumulative Layout Shift
	browser_web_vital_inp: ['p(95)<200'], //measures a page’s responsiveness
	browser_web_vital_ttfb: ['p(95)<1000'], //Time to First Byte
	browser_http_req_duration: ['p(95)<3500'], //Browser page load time
	browser_http_req_failed: ['rate<0.02'], //Browser-side asset/API failure rate < 2%
	QuickPizza_UI_login_duration: ['p(95)<10000', 'avg<8000'],
	checks: ['rate>0.95'], //95% of checks should pass
};

// Apply browser options to all browser scenarios
Object.keys(scenarios[mode]).forEach((scenarioName) => {
	const scenario = scenarios[mode][scenarioName];
	if (scenario.exec === 'browserTest') {
		// Merge browser options into scenario options
		scenario.options = {
			...scenario.options,
			browser: {
				...scenario.options.browser,
				...browserOptions,
			},
		};
	}
});

// Build options for hybrid mode (Browser + HTTP scenarios)
export const options = {
	scenarios: scenarios[mode],
	thresholds: hybridThresholds,
	summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
	tags: {
		test_type: 'hybridMode',
		mode: mode,
	},
};
console.log(`[K6] Running Mode: ${mode}`);
