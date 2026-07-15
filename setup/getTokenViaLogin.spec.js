import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { loginTokenApiEndpoint } from '../testconfig/constants.js';
require('dotenv').config({ quiet: true });

setup.setTimeout(90000);

setup('Generate Bearer Token', async ({ page }) => {
	const testEnv = process.env.testEnv || 'qa';
	const loginId = process.env.loginId;
	const loginPassword = process.env.loginPassword;

	console.log(`Generating bearer token for ${loginId} on ${testEnv}...`);

	// Set up request listener BEFORE navigating — captures token
	const usersRequestPromise = page.waitForRequest(
		(request) => request.url().includes(loginTokenApiEndpoint),
		{ timeout: 60000 }
	);

	// Quick Pizza login (same flow as loginPage.js)
	await page.goto(`https://quickpizza.${testEnv}.com/login`);

	await expect(page.getByText('QuickPizza User Login', { exact: true })).toBeVisible();
	// Wait for the SPA to finish hydrating before interacting — otherwise the Sign in click
	// can fire a native form submit before the app's own submit handler attaches, which
	// aborts the app's in-flight requests (including its own token/CSRF fetches) mid-flight.
	await page.waitForLoadState('networkidle');
	await page.locator('#username').fill(loginId);
	await page.locator('#password').fill(loginPassword);
	await page.getByText('Sign in', { exact: true }).click();

	// Wait for text to visible
	await expect(page.getByText('Your Pizza Ratings:', { exact: true })).toBeVisible();

	// Wait for the users API request — this is the real gate that signals the portal has loaded
	const usersRequest = await usersRequestPromise;
	const usersResponse = await usersRequest.response();
	const usersResponseBody = await usersResponse.json();

	const bearerToken = usersResponseBody['token'];
	if (!bearerToken) {
		throw new Error('Token not found in users API request.');
	}

	// Always write to .token — readable by both local and CI PowerShell scripts
	const tokenFilePath = path.resolve(process.cwd(), '.token');
	fs.writeFileSync(tokenFilePath, bearerToken);
	console.log('.token file written.');

	// Also update .env for local persistence (skipped in CI)
	if (!process.env.CI) {
		const envFilePath = path.resolve(process.cwd(), '.env');
		let envContent = fs.readFileSync(envFilePath, 'utf8');
		envContent = envContent.replace(/bearerToken=.*(\r?\n|$)/g, `bearerToken='${bearerToken}'$1`);
		fs.writeFileSync(envFilePath, envContent);
		console.log('.env updated with new bearerToken.');
	}

	await page.getByRole('button', { name: 'Logout' }).click();
});
