@echo off
title FlowMusic - Local Server (Admin)
color 0B

rem Go to the folder where this bat lives (works even with unicode folder name)
cd /d "%~dp0"
set "SERVER_DIR=%CD%\server"

echo ========================================
echo    FlowMusic - local server (Admin)
echo ========================================
echo.

rem 1. Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js not found! Install from https://nodejs.org/
    pause
    exit /b 1
)

rem 2. Check server dependencies
if not exist "%SERVER_DIR%\node_modules\" (
    echo [*] Installing server dependencies...
    pushd "%SERVER_DIR%"
    call npm install
    popd
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
    echo [OK] Dependencies installed.
) else (
    echo [OK] Dependencies present.
)

rem 3. Check MySQL on port 3306
echo.
echo [*] Checking MySQL (port 3306)...
netstat -an | findstr ":3306" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] MySQL is running.
) else (
    color 0E
    echo [WARN] MySQL not found on port 3306!
    echo        Start MySQL - XAMPP / OpenServer / MAMP first.
    echo        Otherwise the server cannot connect to the DB.
    echo.
    color 0B
)

rem 4. Auto-open admin panel 3 seconds after start
start "" /b cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:3001/admin"

rem 5. Start the server
echo.
echo [*] Server:       http://localhost:3001
echo [*] Admin panel:  http://localhost:3001/admin
echo [*] Admin pass:   ADMIN_PASSWORD in server\.env (now 2009)
echo [*] Stop:         Ctrl+C in this window
echo.

pushd "%SERVER_DIR%"
node index.js
popd

echo.
echo Server stopped.
pause