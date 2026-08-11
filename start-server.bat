@echo off
chcp 65001 >nul
title Flowmusic Dev Server
color 0B

echo ========================================
echo        Flowmusic - Dev Server
echo ========================================
echo.

:: Проверка Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR] Node.js не найден!
    echo Скачай с https://nodejs.org/
    pause
    exit /b 1
)

:: Проверка node_modules
if not exist "node_modules\" (
    echo [*] Устанавливаю зависимости...
    call npm install
    if %errorlevel% neq 0 (
        color 0C
        echo [ERROR] Ошибка установки зависимостей!
        pause
        exit /b 1
    )
    echo [OK] Зависимости установлены!
    echo.
)

echo [*] Запускаю webpack dev-server...
echo [*] Сервер: http://localhost:8080
echo [*] Ctrl+C для остановки
echo.
call npm run dev
