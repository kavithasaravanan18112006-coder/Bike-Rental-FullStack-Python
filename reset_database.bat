@echo off
setlocal
cd /d "%~dp0"
if exist "data\bikerental.db" del /q "data\bikerental.db"
echo BikeRental database reset. Start run_backend.bat again to recreate the database.
pause
