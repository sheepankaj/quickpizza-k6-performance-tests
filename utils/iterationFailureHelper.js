import { Counter, Rate } from 'k6/metrics';
import { check } from 'k6';

// Shared browser iteration metrics. Defined here so every browser test uses
// the same metric names. Tests call recordBrowserIterationSuccess/Failure to
// keep the success vs failure intent explicit at the call site.
const browserIterationFailures = new Counter('browser_iteration_failures');
const browserIterationFailed = new Rate('browser_iteration_failed');

// Per-scenario attempt counters — surfaced in the report's Counters section
// so you can read total browser/API iterations directly without summing checks.
const browserTotalIterationsAttempted = new Counter('browser_total_iterations_attempted');
const apiTotalIterationsAttempted = new Counter('api_total_iterations_attempted');

export function recordBrowserIterationStart() {
	browserTotalIterationsAttempted.add(1);
}

export function recordApiIterationStart() {
	apiTotalIterationsAttempted.add(1);
}

export function recordBrowserIterationSuccess(pageName) {
	browserIterationFailed.add(false);
	check(null, { [`Browser: ${pageName}: Iteration completed end-to-end`]: () => true });
}

export function recordBrowserIterationFailure(pageName, err) {
	browserIterationFailures.add(1);
	browserIterationFailed.add(true);
	check(null, { [`Browser: ${pageName}: Iteration completed end-to-end`]: () => false });
	console.error(`[BROWSER-FAIL] VU=${__VU} iter=${__ITER}: ${err?.message || String(err)}`);
}
