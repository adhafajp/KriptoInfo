@echo off
title PIKATAN // KRYPTOINFO - Stop Services
color 0E

echo ============================================================================
echo   Menghentikan layanan PIKATAN // KRYPTOINFO (Port 3001, 8787, 5173)...
echo ============================================================================
echo.

for %%P in (3001 8787 5173) do (
    for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
        echo Menghentikan proses pada port %%P ^(PID: %%A^)...
        taskkill /F /PID %%A >nul 2>nul
    )
)

echo.
echo [SELESAI] Semua layanan pada port 3001, 8787, dan 5173 telah dihentikan.
timeout /t 3 >nul
