@echo off
REM Database Restore Script for Fintech Innovation Portal (Windows)
if "%~1"=="" (
    echo Usage: scripts\db-restore.bat ^<path_to_backup_file.sql^>
    exit /b 1
)

set BACKUP_FILE=%~1
set DB_NAME=fintech_portal
set DB_USER=postgres

if not exist "%BACKUP_FILE%" (
    echo Error: Backup file not found: %BACKUP_FILE%
    exit /b 1
)

echo [%DATE% %TIME%] Starting PostgreSQL database restore from %BACKUP_FILE%...
docker exec -i fintech_postgres psql -U %DB_USER% -d %DB_NAME% < "%BACKUP_FILE%"

if %ERRORLEVEL% equ 0 (
    echo [%DATE% %TIME%] Database restoration completed successfully.
) else (
    echo [%DATE% %TIME%] Database restoration failed!
    exit /b 1
)
