/**
 * Captures FCP, LCP, CLS for the currently loaded page via the browser
 * Performance API. The default global browser_web_vital_* metrics blend
 * every page the browser visits in an iteration (login, portal, app) — this
 * helper isolates vitals to one specific page so per-page perf can be
 * reported cleanly.
 *
 * @param {object} page - k6 browser page
 * @param {object} trends - { fcp?: Trend, lcp?: Trend, cls?: Trend }
 * @param {number} settleMs - wait time for LCP/CLS observers to fire (default 1500)
 * @returns {Promise<{fcp:number, lcp:number, cls:number}>}
 */
export async function capturePageWebVitals(page, trends, settleMs = 1500) {
	const vitals = await page.evaluate((wait) => {
		return new Promise((resolve) => {
			const result = { fcp: 0, lcp: 0, cls: 0 };

			const fcpEntry = performance.getEntriesByType('paint').find((e) => e.name === 'first-contentful-paint');
			if (fcpEntry) result.fcp = fcpEntry.startTime;

			try {
				new PerformanceObserver((list) => {
					const entries = list.getEntries();
					const last = entries[entries.length - 1];
					result.lcp = last.renderTime || last.loadTime || 0;
				}).observe({ type: 'largest-contentful-paint', buffered: true });
			} catch (_) {
				// LCP observer type not supported in this browser — skip
			}

			try {
				new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) {
						if (!entry.hadRecentInput) result.cls += entry.value;
					}
				}).observe({ type: 'layout-shift', buffered: true });
			} catch (_) {
				// layout-shift observer type not supported in this browser — skip
			}

			setTimeout(() => resolve(result), wait);
		});
	}, settleMs);

	if (trends.fcp && vitals.fcp > 0) trends.fcp.add(vitals.fcp);
	if (trends.lcp && vitals.lcp > 0) trends.lcp.add(vitals.lcp);
	if (trends.cls) trends.cls.add(vitals.cls);

	return vitals;
}
