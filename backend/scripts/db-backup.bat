@echo off
REM Database Backup Script for Fintech Innovation Portal (Windows)
setlocal enabledelayedexpansion

set BACKUP_DIR=.\backups
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (set mydate=%%c%%a%%b)
for /f "tokens=1-2 delims=/:" %%a in ('time /t') do (set mytime=%%a%%b)
set TIMESTAMP=%mydate%_%mytime: =0%

set DB_NAME=fintech_portal
set DB_USER=postgres
set BACKUP_FILE=%BACKUP_DIR%\%DB_NAME%_backup_%TIMESTAMP%.sql

echo [%DATE% %TIME%] Starting PostgreSQL database backup...
docker exec -t fintech_postgres pg_dump -U %DB_USER% %DB_NAME% > "%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo [%DATE% %TIME%] Backup completed successfully: %BACKUP_FILE%
) else (
    echo [%DATE% %TIME%] Database backup failed!
    exit /b 1
)
