[smoke_home_grafana-summary.html](https://github.com/user-attachments/files/30055767/smoke_home_grafana-summary.html)
# QuickPizza K6 Performance Testing Framework

A scalable **hybrid load testing framework** built with [K6](https://k6.io/) against the [QuickPizza](https://quickpizza.grafana.com/) demo app (Grafana's k6 example application). It combines browser-based (Core Web Vitals) and API performance testing, supports multiple load profiles, and integrates with Azure DevOps CI/CD pipelines with automated HTML report generation.

---

## Introduction

This framework provides end-to-end performance and load testing for the **QuickPizza** web app. It uses a **hybrid testing model** that runs browser-based and API tests simultaneously, giving both real-user-experience metrics and backend performance data in a single test run.

### Key Features

- **Hybrid Testing** — Browser automation (Core Web Vitals) + API performance in one run
- **Page Object Model (POM)** — Maintainable, reusable page selectors and interactions
- **Multiple Load Profiles** — Smoke, Spike, Load, and Stress test configurations
- **Automated HTML Reports** — Generated locally and published as Azure DevOps artifacts in pipeline
- **CI/CD Ready** — Native Azure DevOps pipeline integration
- **Performance Threshold Enforcement** — Build fails automatically if thresholds are breached

### Application Under Test

| Environment | URL |
|---|---|
| grafana | `https://quickpizza.grafana.com` |

> QuickPizza's login page publishes its own demo credentials as hints: username `default`, password `12345678`.

---

## Prerequisites

Ensure the following tools are installed before getting started:

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/) | v18+ | Package management, NPM scripts |
| [K6](https://k6.io/docs/get-started/installation/) | v1.6.1+ | Load test runner |
| [PowerShell](https://learn.microsoft.com/en-us/powershell/) | v5.1+ | Script execution (Windows) |

### Verify Installations

```
node --version
k6 version
```

---

## Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd practiceperformancetesting-quickpizza-k6
```

### 2. Install Dependencies

```bash
npm install
npx playwright install chromium
```

### 3. Configure Environment Variables

Copy `example.env` to `.env` and adjust as needed:

```env
testEnv=grafana     # Target environment: grafana | qa (see build.yml)
HEADLESS=true       # Browser mode: true (headless) | false (visible)
loginId=default
loginPassword=12345678
```

## Environment Configuration

| Variable | Description | Values | Default |
|---|---|---|---|
| `testEnv` | Target environment | `grafana` | `qa` |
| `loginId` | Login username for authentication | string | `default` |
| `loginPassword` | Login password for authentication | string | `12345678` |
| `bearerToken` | Bearer token for authenticated API calls | string | auto-generated |
| `HEADLESS` | Browser headless mode | `true`, `false` | `true` |
| `TEST_MODE` | Load profile type | `smoke`, `spike`, `load`, `stress` | `smoke` |
| `REPORT_HTML` | Enable HTML report generation | `true`, `false` | — |
| `CI` | CI environment flag | `true` | — |
| `RUN_ENV` | Runtime environment | `docker` | — |
| `K6_TEST_TYPE` | Test type for report naming | any string | — |
| `TEST_NAME` | Test name for report naming | any string | — |

---

## Build and Test

### Running Tests Locally — npm (recommended)

Use `npm run` commands from any terminal (PowerShell, cmd, or bash). These handle all environment variable setup automatically via the scripts in `package.json`.

```bash
# Smoke (default) — headed (visible browser) for quick local validation
npm test                        # All tests — headed, smoke mode
npm run test:headed             # Same as above (explicit)
npm run test:headless           # All tests — headless, smoke mode

# Spike — headless by default (runs 5+ minutes, no need to watch the browser)
npm run test:spike              # All tests — headless, spike mode

# Load — headless by default
npm run test:load               # All tests — headless, load mode

# Stress — headless by default
npm run test:stress             # All tests — headless, stress mode

# Pipeline / CI
npm run test:runpipeline        # Pipeline-mode execution (headless, CI flags)
```
You can also pass extra parameters to any script using `--` followed by the argument:

```bash
# Run only the home test in spike mode
npm run test:spike -- -TestsToRun home
```
**Script parameters:**

| Parameter | Description | Default |
|---|---|---|
| `-ScriptsDir` | Path to test file or directory | `./tests` |
| `-TestType` | Load profile (`smoke`, `spike`, `load`, `stress`) | `smoke` |
| `-TestsToRun` | Tests to run (`all`, `home`) | `all` |

---

### Running Tests in CI/CD Pipeline

```powershell
.\scripts\run-test-pipeline-generate-htmlreport.ps1 `
  -TestType smoke `
  -Environment grafana `
  -TestsToRun all
```
> In CI, browser always runs in **headless mode** (`HEADLESS=true`) regardless of `.env`.

---

## Authentication & Bearer Token

The framework uses a **Bearer token** for authenticated API and browser tests. The token is generated automatically via a Playwright login flow before tests run.

- **Token file:** `.token` (git-ignored) — read by k6 tests at runtime
- **Auto-refresh:** If the cached token is less than 60 minutes old, login is skipped. Otherwise `setup/getTokenViaLogin.spec.js` runs a headful Playwright login to capture a fresh token.
- **CI:** Token is always refreshed at pipeline start. The `.token` file is passed as a pipeline variable.

## Page Object Model

The framework uses the **Page Object Model (POM)** pattern to separate test logic from UI selectors, making tests maintainable and reusable. Page objects live in `pages/` (`loginPage.js`, `homepage.js`).

## Performance Thresholds

### Custom Trend Metrics

Custom `Trend` metrics capture per-page timing data independently of K6's built-in metrics, providing page-level granularity in reports.

Each test file defines its own `Trend` metrics for page-level granularity. The pattern is consistent across all tests:

| Metric pattern | What it measures |
|---|---|
| `*_api_duration` | HTTP response time for a page's JSON API endpoint |
| `*_page_UI_load_duration` | Browser wall-clock time to navigate to and load the page |
| `*_fcp` / `*_lcp` / `*_cls` | Per-page Core Web Vitals captured via the browser Performance API in `utils/webVitalsHelper.js`. Isolated to the target page (e.g. `home_lcp`) — distinct from the global `browser_web_vital_*` which blends every URL visited in the iteration. |
| `QuickPizza_UI_login_duration` | Full QuickPizza login flow duration. Measured on every browser test via `utils/loginHelper.js`. |
| `browser_iteration_failures` (Counter) | Count of browser iterations that threw before completing end-to-end (e.g. Chromium process died mid-iteration). Defined in `utils/iterationFailureHelper.js`. |
| `browser_iteration_failed` (Rate) | Failure rate of browser iterations. Threshold: `< 5%`. Catches silent crashes that would otherwise vanish from the report. |
| `browser_total_iterations_attempted` (Counter) | Total browser iterations started (pass or fail). Lets you read total UI test count directly without summing checks. |
| `api_total_iterations_attempted` (Counter) | Total API iterations started (pass or fail). Same purpose, API scenario side. |

### Browser VU caps

Browser scenarios in `load` and `stress` modes are capped at **5 concurrent VUs** to fit pipeline infrastructure limits. API scenarios run at full intended VU count (60 for load, 100 for stress) — they carry the real backend load. The smoke browser scenario uses extended duration (90s sustain + 60s gracefulRampDown) so iterations have time to complete the login flow in pipeline.

---

## Metrics Reference

Plain-language explanation of every metric that appears in K6 reports.

### Browser Metrics

| Metric | What it measures |
|---|---|
| `browser_http_req_duration` | Total time the browser spent on each HTTP request — from sending it to receiving the full response. The browser's equivalent of `http_req_duration`. |
| `browser_web_vital_fcp` | **First Contentful Paint** — time until the user sees the *first thing* on screen (any text, image, or element). The moment the page stops looking blank. |
| `browser_web_vital_lcp` | **Largest Contentful Paint** — time until the *biggest visible element* (hero image, headline) finishes loading. What users perceive as "the page is ready". |
| `browser_web_vital_cls` | **Cumulative Layout Shift** — how much the page *jumps around* while loading (e.g. a button that moves when an image loads above it). Lower is better — 0 means nothing moved. |
| `browser_web_vital_ttfb` | **Time to First Byte** (browser side) — how long until the browser receives the *very first byte* from the server. Reflects server response speed and network latency. |
| `browser_web_vital_fid` | **First Input Delay** — how long before the page responds to the user's *first click or tap*. High values mean the browser is still busy loading JavaScript. |
| `browser_web_vital_inp` | **Interaction to Next Paint** — how quickly the page *visually responds* to every user interaction (click, tap, key press). The modern replacement for FID. |

### API / HTTP Metrics

| Metric | What it measures |
|---|---|
| `http_req_duration` | **Total round-trip time** per request — sum of all phases below. The primary API performance indicator. |
| `http_req_blocked` | Time the request spent *waiting in queue* before it could start, usually because there were no free TCP connections. High values indicate server overload. |
| `http_req_connecting` | Time spent *establishing the TCP connection* to the server. Only incurred on new connections, not reused ones. |
| `http_req_tls_handshaking` | Time spent on the *HTTPS security handshake* — exchanging certificates and encryption keys. Only happens on new HTTPS connections. |
| `http_req_sending` | Time spent *uploading the request* (headers + body). Usually near-zero for GET requests with no body. |
| `http_req_waiting` | Time spent *waiting for the server to start responding* after the request was sent. This is where server-side processing time shows up. |
| `http_req_receiving` | Time spent *downloading the response body*. Can be high for large HTML pages or heavy JSON payloads. |
| `http_req_failed` | Rate of failed requests (non-2xx or network errors). Threshold: < 5%. |
| `browser_http_req_failed` | Rate of HTTP requests made by the headless browser that failed (assets, JS, CSS, app APIs during page render). Threshold: < 2%. |
| `http_reqs` | Total number of HTTP requests made per second (throughput). |

> **Request timing breakdown:**
> `blocked` + `connecting` + `tls_handshaking` + `sending` + `waiting` + `receiving` = `http_req_duration`

### Control Metrics

| Metric | What it measures |
|---|---|
| `iteration_duration` | How long one *full test iteration* took for a virtual user — everything from start to finish including navigation, checks, API calls, and waits. |
| `group_duration` | How long an entire `group(...)` block took. Wraps the full API sequence per page (e.g. *"Home Page API Performance Test"*). |
| `checks` | Pass rate of all `check()` assertions across the test. Threshold: > 95% must pass. |

---

## Reports

### Local Reports

HTML reports are generated automatically after each test run in the `./reports/` directory.

**Filename format:** `{testMode}_{testName}_{testEnv}-summary.html`

### Pipeline Reports

In Azure DevOps, reports are published as **pipeline artifacts** under the `K6-Report-*` artifact name and are retained with each build for historical comparison. Failure screenshots (captured on check failure, capped to the first 2 VUs / first iteration) are published under `K6-BrowserTestsScreenshots-*`.

---

### Pipeline Parameters

| Parameter | Description | Options | Default |
|---|---|---|---|
| `environment` | Target environment | `grafana`, `qa` | `grafana` |
| `testMode` | Load profile | `smoke`, `spike`, `load`, `stress` | `smoke` |
| `testsToRun` | Test selection | `all`, `home` | `all` |

### Triggering a Pipeline Run

```
1. Navigate to the pipeline in Azure DevOps
2. Click "Run pipeline"
3. Select: environment, testMode, testsToRun
4. Click "Run"
```

## Contributing

### Code Style

All code must be formatted with Prettier before committing:

```bash
npm run prettier
npm run lint
```
### Report Example Screenshots
<img width="719" height="897" alt="image" src="https://github.com/user-attachments/assets/9719c6d0-07bd-4c2c-9075-82f2eca7c1de" />
<img width="1306" height="830" alt="image" src="https://github.com/user-attachments/assets/7fb040bf-c556-456c-8fb9-0288b35ed161" />
<img width="716" height="764" alt="image" src="https://github.com/user-attachments/assets/329534f9-29b6-48aa-9e15-b7dbc641211f" />



