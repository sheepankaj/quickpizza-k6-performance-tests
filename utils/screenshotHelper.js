// Limits screenshots to the first 2 VUs on their first iteration only.
// Prevents screenshot floods during load/stress runs (e.g. 30 browser VUs × many iterations).
const MAX_SCREENSHOT_VUS = 2;

export async function takeScreenshot(page, name = 'failure') {
	if (__VU > MAX_SCREENSHOT_VUS || __ITER > 0) {
		console.log(
			`[SCREENSHOT] Skipped — VU ${__VU}, iter ${__ITER} (cap: first ${MAX_SCREENSHOT_VUS} VUs, first iteration only)`
		);
		return;
	}

	const path = `screenshots/${name}-vu${__VU}-iter${__ITER}-${Date.now()}.png`;
	try {
		await page.screenshot({ path });
		console.log(`[SCREENSHOT] Saved: ${path}`);
	} catch (err) {
		console.error(`[SCREENSHOT] Failed to capture: ${err?.message || String(err)}`);
	}
}
