export const scenarios = {
	smoke: {
		// Browser duration set longer than login's 60s timeout (pages/loginPage.js) so pipeline iterations can complete.
		browser: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '10s', target: 1 }, // Ramp up browser VUs
				{ duration: '90s', target: 2 }, // Sustain — long enough for login + iteration to complete
			],
			gracefulRampDown: '60s',
			exec: 'browserTest',
			options: {
				browser: {
					type: 'chromium',
				},
			},
		},

		api: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '5s', target: 5 }, // Ramp up API VUs
			],
			gracefulRampDown: '2s',
			exec: 'apiTest',
		},
	},

	spike: {
		browser: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '20s', target: 2 }, // Gradual ramp — each Chromium needs time to start
				{ duration: '2m', target: 5 }, // Sustain spike
				{ duration: '20s', target: 0 }, // Ramp down
			],
			gracefulRampDown: '60s', // Login flow can take up to 30s in CI — give iterations room to finish
			exec: 'browserTest',
			options: {
				browser: {
					type: 'chromium',
				},
			},
		},
		api: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '5s', target: 10 },
				{ duration: '2m', target: 20 },
				{ duration: '5s', target: 0 },
			],
			gracefulRampDown: '10s',
			exec: 'apiTest',
		},
	},

	load: {
		// Browser VUs capped at 5 — pipeline infrastructure limit. API stays at
		// full intended load and carries the actual backend stress.
		browser: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '1m', target: 2 }, // Warm up
				{ duration: '3m', target: 4 }, // Ramp up to peak
				{ duration: '1m', target: 5 }, // Hold at peak
				{ duration: '10m', target: 5 }, // Sustained load
				{ duration: '4m', target: 2 }, // Ramp down
				{ duration: '1m', target: 0 }, // Cool down
			],
			gracefulRampDown: '60s',
			exec: 'browserTest',
			options: {
				browser: {
					type: 'chromium',
				},
			},
		},
		api: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '1m', target: 10 },
				{ duration: '3m', target: 30 },
				{ duration: '1m', target: 50 },
				{ duration: '10m', target: 60 },
				{ duration: '4m', target: 30 },
				{ duration: '1m', target: 0 },
			],
			gracefulRampDown: '30s',
			exec: 'apiTest',
		},
	},

	stress: {
		// Browser VUs capped at 5 — pipeline infrastructure limit. API VUs carry
		// the real stress load.
		browser: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '1m', target: 2 }, // Minimal load
				{ duration: '2m', target: 3 }, // Normal load
				{ duration: '2m', target: 4 }, // High load
				{ duration: '2m', target: 5 }, // Stress point
				{ duration: '6m', target: 5 }, // Sustained stress
				{ duration: '2m', target: 2 }, // Recovery
				{ duration: '1m', target: 0 }, // Cool down
			],
			gracefulRampDown: '60s',
			exec: 'browserTest',
			options: {
				browser: {
					type: 'chromium',
				},
			},
		},
		api: {
			executor: 'ramping-vus',
			startVUs: 0,
			stages: [
				{ duration: '1m', target: 10 },
				{ duration: '2m', target: 50 },
				{ duration: '2m', target: 100 },
				{ duration: '2m', target: 100 },
				{ duration: '6m', target: 100 },
				{ duration: '2m', target: 100 },
				{ duration: '2m', target: 100 },
				{ duration: '2m', target: 50 },
				{ duration: '1m', target: 0 },
			],
			gracefulRampDown: '30s',
			exec: 'apiTest',
		},
	},
};
