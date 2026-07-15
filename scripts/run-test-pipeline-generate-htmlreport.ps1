param (
    [string]$ScriptsDir = "./tests",
    [string]$TestType = "smoke",
    [string]$Environment = "grafana",
    [string]$TestsToRun = "all"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "K6 Hybrid Performance Test Runner (Pipeline)" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 0: Bearer Token" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Token is generated fresh by the dedicated Playwright step in build.yml immediately
# before this script runs — it is always valid for the full pipeline duration.
$bearerToken = (Get-Content ".token" -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($bearerToken)) {
    Write-Error "Bearer token is empty. Ensure the Playwright token step ran successfully before this step."
    exit 1
}
Write-Host "Token loaded: $($bearerToken.Substring(0, 15))..." -ForegroundColor Green

# Step 1: Load .env variables (if file exists)
if (Test-Path -Path ".env") {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+?)\s*=\s*(.*)\s*$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim().Trim("'").Trim('"')
            [System.Environment]::SetEnvironmentVariable($key, $value, "Process")
            Write-Host "  Loaded: $key" -ForegroundColor Gray
        }
    }
}
else {
    Write-Host ".env file not found. Using pipeline environment variables." -ForegroundColor Yellow
}

# Step 2: Validate testEnv
$testEnv = $Environment
Write-Host "`ntestEnv: $testEnv" -ForegroundColor Green

# Step 3: Set HEADLESS to true for CI/pipeline (always headless in pipeline)
if (-not $env:HEADLESS) {
    $env:HEADLESS = "true"
    Write-Host "HEADLESS: true (CI/Pipeline mode)" -ForegroundColor Green
}

# Step 4: Check if k6 is installed
if (-not (Get-Command "k6" -ErrorAction SilentlyContinue)) {
    Write-Host "`nERROR: K6 is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Install from: https://k6.io/docs/getting-started/installation/" -ForegroundColor Yellow
    exit 1
}

# Step 5: Create reports folder if it doesn't exist
if (-not (Test-Path -Path "./reports")) {
    New-Item -ItemType Directory -Path "./reports" | Out-Null
    Write-Host "`nCreated reports directory" -ForegroundColor Green
}

# Step 6: Locate test files
if ($TestsToRun -eq "all") {
    Write-Host "`nRunning all test files in $ScriptsDir..." -ForegroundColor Cyan
    $testFiles = Get-ChildItem -Path $ScriptsDir -Filter *.test.js
}
else {
    Write-Host "`nRunning tests matching: $TestsToRun" -ForegroundColor Cyan
    $testFiles = Get-ChildItem -Path $ScriptsDir -Filter "$TestsToRun*.test.js"
}

if ($testFiles.Count -eq 0) {
    Write-Host "`nERROR: No test files found in $ScriptsDir matching filter: $TestsToRun" -ForegroundColor Red
    exit 1
}

Write-Host "Found $($testFiles.Count) test file(s)" -ForegroundColor Green

# Step 7: Run all tests in hybrid mode and generate HTML reports
foreach ($test in $testFiles) {
    $testName = $test.BaseName.Replace(".test", "")
    $testPath = $test.FullName

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "Running: $testName" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Test Type: $TestType" -ForegroundColor Gray
    Write-Host "Environment: $testEnv" -ForegroundColor Gray
    Write-Host "Mode: Hybrid (Browser + HTTP)" -ForegroundColor Gray
    Write-Host "Headless: $($env:HEADLESS -eq 'true')" -ForegroundColor Gray

    # Enable HTML report generation
    $env:REPORT_HTML = "true"

    # Run k6 test
    k6 run $testPath `
        -e testEnv=$testEnv `
        -e bearerToken=$bearerToken `
        -e TEST_MODE=$TestType `
        -e K6_TEST_TYPE=$TestType `
        -e TEST_NAME=$testName `
        -e REPORT_HTML=$env:REPORT_HTML `
        -e HEADLESS=$env:HEADLESS
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "All tests completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "HTML reports available in: ./reports/" -ForegroundColor Cyan
