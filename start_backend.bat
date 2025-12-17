@echo off
echo ===================================
echo DocFlow Backend Starter
echo ===================================

cd /d "%~dp0\backend"

echo.
echo [1/3] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo Error: Python is not found in PATH. Please install Python.
    pause
    exit /b
)

echo.
echo [2/3] Installing/Updating Dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo Warning: Failed to install dependencies. Trying to proceed anyway...
)

echo.
echo [3/3] Starting Server...
echo API will be available at http://localhost:8000
echo.
python run.py

if %errorlevel% neq 0 (
    echo.
    echo ===================================
    echo SERVER CRASHED OR STOPPED
    echo ===================================
    echo Please read the error message above.
    pause
)
