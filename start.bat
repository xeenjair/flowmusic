@echo off
chcp 65001 >nul
title flowmusic Builder & Launcher
color 0A

echo ========================================
echo           flowmusic BUILDER
echo ========================================
echo.

:: Проверка наличия Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Проверка наличия npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] npm not found!
    pause
    exit /b 1
)

echo [1/4] Checking dependencies...
echo.

:: Проверка node_modules
if not exist "node_modules\" (
    echo [WARNING] node_modules not found!
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed!
) else (
    echo [OK] Dependencies already installed!
)

echo.
echo [2/4] Cleaning old build...
if exist "dist\" (
    rmdir /s /q "dist"
    echo [OK] Old build removed!
) else (
    echo [OK] No old build to clean!
)

echo.
echo [3/4] Building project...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Build failed!
    pause
    exit /b 1
)
echo [OK] Build completed!

echo.
echo [4/4] Starting flowmusic...
echo.
echo ========================================
echo           LAUNCHING flowmusic
echo ========================================
echo.

:: Запуск приложения
start /b npm start

:: Ждём 2 секунды и проверяем, запустился ли процесс
timeout /t 2 /nobreak >nul

:: Проверка, запущен ли Electron
tasklist /FI "IMAGENAME eq electron.exe" 2>NUL | find /I /N "electron.exe">NUL
if %errorlevel% equ 0 (
    echo [OK] flowmusic started successfully!
    echo.
    echo You can close this window.
) else (
    echo [WARNING] flowmusic may not have started properly.
    echo Check the console for errors.
)

echo.
echo Press any key to exit...
pause >nul