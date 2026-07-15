import http from 'k6/http';
import { baseAPIUrlForQuickPizza } from '../testconfig/constants.js';

export const defaultHeaders = {
	'Content-Type': 'application/json',
};

export function buildParams(paramsObj = {}) {
	const entries = Object.entries(paramsObj);
	if (entries.length === 0) return '';

	return '?' + entries.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
}

/**
 * Performs a GET request to the given path,
 * validates the response is HTML/Webpage.
 *
 * @param {string} endpoint - Relative path like '/menu'
 * @param {object} customHeaders - Optional headers
 * @returns {object} - Verify response is a HTML
 */
export function getRequestEndpointAndValidateResponse(endpoint, params = {}, customHeaders = {}, tags = {}) {
	const url = `${baseAPIUrlForQuickPizza.replace(/\/$/, '')}${endpoint}${buildParams(params)}`;

	const authHeaders = __ENV.bearerToken ? { Authorization: `Bearer ${__ENV.bearerToken}` } : {};
	const mergedHeaders = { ...defaultHeaders, ...authHeaders, ...customHeaders };
	const res = http.get(url, { headers: mergedHeaders, redirects: 4, tags: tags.name ? tags : { name: endpoint } });

	// Check if response is HTML (web page)
	const contentType = res.headers['Content-Type'] || '';
	const bodyPreview = res.body?.substring(0, 100).toLowerCase() || '';
	const isWebPage =
		contentType.includes('text/html') || bodyPreview.includes('<!doctype html>') || bodyPreview.includes('<html');

	let json = null;

	// Only try to parse JSON if it's not a web page
	if (!isWebPage) {
		try {
			json = JSON.parse(res.body);
		} catch (_error) {
			console.error(`[ERROR] Failed to parse JSON response from ${url}`);
			console.error(`[ERROR] Status: ${res.status}`);
		}
	}

	return { res, isWebPage, isJson: json !== null, json };
}
