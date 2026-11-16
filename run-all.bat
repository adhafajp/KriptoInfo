@echo off
title PIKATAN // KRYPTOINFO - Launcher
color 0A

echo ============================================================================
echo   PIKATAN // KRYPTOINFO - Sistem Keamanan Jurnalisme Investigasi
echo   Three-Layer Secure Digital Vault (Argon2id + Ed25519 + ResNet-34)
echo ============================================================================
echo.

cd /d "%~dp0"

:: 1. Pastikan Node.js terpasang
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    color 0C
    echo [ERROR] Node.js tidak ditemukan di PATH. Silakan instal Node.js ^>= 20.19.0.
    pause
    exit /b 1
)

:: 2. Cek apakah port 3306 (MariaDB / XAMPP) sudah aktif; jika belum, nyalakan otomatis
netstat -ano | findstr ":3306 " | findstr "LISTENING" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Port 3306 ^(MariaDB / XAMPP^) belum aktif. Mencoba menyalakan XAMPP MySQL otomatis...
    if exist "E:\xampp\mysql\bin\mysqld.exe" (
        start "PIKATAN - MariaDB Server (Port 3306)" /min "E:\xampp\mysql\bin\mysqld.exe" --defaults-file="E:\xampp\mysql\bin\my.ini" --standalone
        timeout /t 3 /nobreak >nul
    ) else if exist "C:\xampp\mysql\bin\mysqld.exe" (
        start "PIKATAN - MariaDB Server (Port 3306)" /min "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini" --standalone
        timeout /t 3 /nobreak >nul
    ) else if exist "D:\xampp\mysql\bin\mysqld.exe" (
        start "PIKATAN - MariaDB Server (Port 3306)" /min "D:\xampp\mysql\bin\mysqld.exe" --defaults-file="D:\xampp\mysql\bin\my.ini" --standalone
        timeout /t 3 /nobreak >nul
    )
)

netstat -ano | findstr ":3306 " | findstr "LISTENING" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [PERINGATAN] Port 3306 ^(MariaDB / XAMPP^) masih belum terdeteksi LISTENING.
    echo Silakan buka XAMPP Control Panel dan klik Start pada modul MySQL!
    echo.
) else (
    echo [OK] MariaDB / MySQL aktif pada port 3306.
)

:: 3. Cek dan install dependencies jika node_modules belum ada
if not exist "backend\node_modules" (
    echo [INFO] Menginstal dependensi Backend...
    cd /d "%~dp0backend" && call npm install
    cd /d "%~dp0"
)

if not exist "usb-agent\node_modules" (
    echo [INFO] Menginstal dependensi USB Agent...
    cd /d "%~dp0usb-agent" && call npm install
    cd /d "%~dp0"
)

if not exist "frontend\node_modules" (
    echo [INFO] Menginstal dependensi Frontend...
    cd /d "%~dp0frontend" && call npm install
    cd /d "%~dp0"
)

:: 4. Jalankan ketiga layanan di jendela terminal terpisah
echo [1/3] Menjalankan Express Backend API ^(Port 3001^)...
start "PIKATAN - Backend API (Port 3001)" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo [2/3] Menjalankan USB Companion Agent ^(Port 8787^)...
start "PIKATAN - USB Agent (Port 8787)" cmd /k "cd /d "%~dp0usb-agent" && npm run dev"

echo [3/3] Menjalankan React Vite Frontend ^(Port 5173^)...
start "PIKATAN - Frontend UI (Port 5173)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Menunggu server siap ^(3 detik^)...
timeout /t 3 /nobreak >nul

echo Membuka http://localhost:5173 di browser...
start "" "http://localhost:5173"

echo.
echo ============================================================================
echo   Seluruh layanan telah dijalankan:
echo   - Frontend UI  : http://localhost:5173
echo   - Backend API  : http://localhost:3001
echo   - USB Agent    : http://127.0.0.1:8787
echo ============================================================================
timeout /t 4 >nul
