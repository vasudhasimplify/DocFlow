# Start DocFlow Backend Server
$ErrorActionPreference = "Stop"

Write-Host "Starting DocFlow Backend Server..." -ForegroundColor Green
Write-Host "Directory: $PSScriptRoot" -ForegroundColor Cyan

Set-Location $PSScriptRoot

Write-Host "Running uvicorn..." -ForegroundColor Yellow
py -3.14 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
