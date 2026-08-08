@echo off
echo ===================================================
echo Khởi động FixCare Project (Backend + Frontend)
echo ===================================================

echo [1/2] Khởi động Backend (FastAPI)...
cd backend
start "FixCare Backend" cmd /c "uvicorn main:app --reload --host 0.0.0.0 --port 8000"
cd ..

echo [2/2] Khởi động Frontend (Next.js)...
cd frontend
start "FixCare Frontend" cmd /c "npm start"
cd ..

echo ===================================================
echo Backend đang chạy tại: http://localhost:8000
echo Frontend đang chạy tại: http://localhost:3000
echo ===================================================

echo Dang mo trinh duyet...
timeout /t 5 /nobreak >nul
start http://localhost:3000
pause
