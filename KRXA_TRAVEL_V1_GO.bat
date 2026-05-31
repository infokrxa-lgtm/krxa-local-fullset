@echo off
chcp 65001
title KRXA Travel V1 GO

cd /d C:\Users\aaa\KRXA_LOCAL_FULLSET

echo.
echo ========================================
echo KRXA Travel V1 GO
echo GO = KRXA_VOICE_LOOP_V1
echo ========================================
echo.

echo [1] Git status
git status

echo.
echo [2] Add all changes
git add .

echo.
set /p MSG=Commit message 입력 후 Enter: 

if "%MSG%"=="" (
  set MSG=update krxa travel v1
)

echo.
echo [3] Commit
git commit -m "%MSG%"

echo.
echo [4] Push to GitHub
git push

echo.
echo ========================================
echo 완료.
echo Render 배포 확인:
echo https://dashboard.render.com
echo.
echo 서비스 확인:
echo https://krxa-local-fullset.onrender.com/control
echo https://krxa-local-fullset.onrender.com/test_voice
echo https://krxa-local-fullset.onrender.com/app?service=food
echo ========================================
echo.

pause