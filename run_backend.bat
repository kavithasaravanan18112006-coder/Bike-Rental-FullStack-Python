@echo off
setlocal EnableExtensions
pushd "%~dp0"

echo ================================================
echo       BikeRental Full-Stack Starter
echo ================================================
if not exist "backend\.venv\Scripts\python.exe" (
  echo Creating virtual environment...
  python -m venv backend\.venv
  if errorlevel 1 goto :error
)
call "backend\.venv\Scripts\activate.bat"
python -m pip install -r "backend\requirements.txt"
if errorlevel 1 goto :error

echo.
echo Starting backend server...
start "BikeRental Backend" /b "backend\.venv\Scripts\python.exe" -m uvicorn backend.main:app --host 127.0.0.1 --port 8000

echo Waiting for backend to become ready...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok=$false; 1..30 | %% { try { $r=Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/api/health -TimeoutSec 1; if($r.StatusCode -eq 200){$ok=$true; break} } catch {} Start-Sleep -Seconds 1 }; if($ok){exit 0}else{exit 1}"
if errorlevel 1 goto :servererror

echo Backend is ready.
echo Opening http://127.0.0.1:8000
start "" "http://127.0.0.1:8000"

echo.
echo Keep this window open while using BikeRental.
echo.
pause
popd
exit /b 0

:servererror
echo.
echo ERROR: Backend did not become ready on port 8000.
echo If another old BikeRental server is running, close it and run this file again.
pause
popd
exit /b 1

:error
echo.
echo ERROR: Setup failed. Read the message above.
pause
popd
exit /b 1
