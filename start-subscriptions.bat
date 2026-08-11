@echo off
chcp 65001 >nul
title Flowmusic - Subscription Server
type "C:\\Users\\xeenj\\Desktop\\flowmusicc — копия\\README.md" | find "Flowmusic - Subscription Server" >nul
if %errorlevel% neq 0 (
    echo Flowmusic - Subscription Server
    echo ================================
    echo.
)

echo [*] Starting FlowMusic Subscription Server on port 3001...
echo [*] API: http://localhost:3001

echo [*] Checking Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js не найден!
    echo Скачай Node.js с https://nodejs.org/
    pause
    exit /b 1
)

echo [*] Checking dependencies...
if not exist "C:\\Users\\xeenj\\Desktop\\flowmusicc — копия\\node_modules\" (
    echo [*] Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Ошибка установки зависимостей!
        pause
        exit /b 1
    )
    echo [OK] Dependencies установлены!
    echo.
)

rem Set environment variables if not set
if not defined SUBSCRIPTION_PRICE set SUBSCRIPTION_PRICE=99
if not defined SUBSCRIPTION_CURRENCY set SUBSCRIPTION_CURRENCY=RUB
if not defined SUBSCRIPTION_DAYS set SUBSCRIPTION_DAYS=30

rem Check for required payment configuration
if not defined ROBOKASSA_MERCHANT_LOGIN (
    echo [*] Robokassa не настроена - запустите с переменными окружения
    echo [*] ROBOKASSA_MERCHANT_LOGIN - LOGIN
    echo [*] ROBOKASSA_PASSWORD_1 - PASSWORD_1
    echo [*] ROBOKASSA_PASSWORD_2 - PASSWORD_2
    echo [*] ADMIN_PASSWORD - Пароль для панели управления
)

echo [*] Запуск сервера на ${BASE_URL:-http://localhost:3001}...
echo [*] Нажми Ctrl+C для остановки
echo.

node "C:\Users\\xeenj\\Desktop\\flowmusicc — копия\\server\\index.js"