import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

/**
 * Returns a handleSummary-compatible object for HTML and console reports.
 * @param {Object} data - k6 summary data object
 * @param {string} testFilePath - Full __FILE__ path from the caller test
 * @returns {Object} Summary outputs
 */
export function generateSummary(data) {
	const testType = __ENV.K6_TEST_TYPE || 'smoke';
	const testName = __ENV.TEST_NAME || 'unnamed';
	const testEnv = __ENV.testEnv || 'qa';
	const generateHtmlReport = __ENV.REPORT_HTML === 'true';

	// Format current date & time as YYYY-MM-DD HH:mm
	const currentSystemDate = new Date();
	const formattedDate =
		currentSystemDate.getFullYear() +
		'-' +
		String(currentSystemDate.getMonth() + 1).padStart(2, '0') +
		'-' +
		String(currentSystemDate.getDate()).padStart(2, '0') +
		' ' +
		String(currentSystemDate.getHours()).padStart(2, '0') +
		':' +
		String(currentSystemDate.getMinutes()).padStart(2, '0');

	const outputs = {
		stdout: textSummary(data, { indent: ' ', enableColors: true }),
	};

	if (generateHtmlReport) {
		const reportsDir = __ENV.RUN_ENV === 'docker' ? '/reports' : './reports';
		const fileName = `${reportsDir}/${testType}_${testName}_${testEnv}-summary.html`;
		outputs[fileName] = htmlReport(data, {
			title: `[${testEnv.toUpperCase()}] ${testType}-${testName}: ${formattedDate}`,
		});
	}

	return outputs;
}
