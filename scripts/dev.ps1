# Bayora Local Development Launcher for Windows PowerShell
Write-Host "=== Launching BAYORA Local Development Servers ===" -ForegroundColor Cyan

$env:PYTHONPATH = "."

# Start FastAPI API in background
Write-Host "[1/2] Starting FastAPI Control Plane API on http://localhost:8000..." -ForegroundColor Green
$apiProcess = Start-Process -FilePath "python" -ArgumentList "-m uvicorn apps.api.main:app --host 0.0.0.0 --port 8000 --reload" -PassThru

# Start Web Console
Write-Host "[2/2] Starting Bayora Web Console on http://localhost:3000..." -ForegroundColor Green
$webProcess = Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "apps\web" -PassThru

Write-Host "`nBoth servers started. Press Ctrl+C or stop processes to exit." -ForegroundColor Yellow

try {
    Wait-Process -Id $apiProcess.Id, $webProcess.Id
} finally {
    Stop-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $webProcess.Id -ErrorAction SilentlyContinue
}
