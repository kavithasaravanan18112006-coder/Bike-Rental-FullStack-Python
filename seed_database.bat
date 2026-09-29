@echo off
setlocal
cd /d "%~dp0"
if not exist "data" mkdir "data"
echo Seeding BikeRental database...
python -c "import sqlite3; p='data/bikerental.db'; s=open('database_seed.sql', encoding='utf-8').read(); c=sqlite3.connect(p); c.executescript(s); c.commit(); c.close(); print('Database seed completed successfully.')"
if errorlevel 1 (
  echo.
  echo Database seed failed. Make sure Python is installed and this script is run from the backend folder.
  pause
  exit /b 1
)
echo.
echo Done. You can start the backend with run_backend.bat from the project root.
pause
