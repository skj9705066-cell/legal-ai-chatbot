@echo off
setlocal EnableExtensions
title 내보험 통합 점검 - 데모 실행
rem ============================================================
rem  내보험 통합 점검 - Windows 데모 실행 파일
rem  더블클릭하면: Node.js 확인 - 설치(처음 1회) - 데모 설정(처음 1회)
rem               - 서버 실행 - 준비되면 브라우저 자동 열기
rem  항상 데모 모드로만 실행된다. 운영 설정이 감지되면 멈춘다.
rem  (이 파일은 한글 Windows용 CP949 인코딩 + CRLF로 저장되어 있다)
rem ============================================================
cd /d "%~dp0"

echo.
echo  ==========================================================
echo    내보험 통합 점검 - 데모 실행
echo    데모 모드: 실제로 접수되지 않아요. 실제 개인정보는 입력하지 마세요.
echo  ==========================================================
echo.

if not exist "package.json" goto :wrong_folder

where node >nul 2>nul
if errorlevel 1 goto :no_node
where npm >nul 2>nul
if errorlevel 1 goto :no_node

set "NODE_MAJOR="
for /f "tokens=1 delims=." %%v in ('node -v') do set "NODE_MAJOR=%%v"
set "NODE_MAJOR=%NODE_MAJOR:v=%"
if "%NODE_MAJOR%"=="" goto :no_node
if %NODE_MAJOR% LSS 20 goto :old_node
echo  [확인] Node.js %NODE_MAJOR% 버전이 설치되어 있어요.

netstat -ano | findstr /r /c:":3100 .*LISTENING" >nul
if not errorlevel 1 goto :already_running

if exist "node_modules\next\package.json" goto :env
echo.
echo  [1/3] 처음 한 번만 필요한 파일을 설치합니다. 1~3분 정도 걸려요.
echo        노란 WARN 문구는 무시해도 됩니다.
echo.
call npm install
if errorlevel 1 goto :install_failed

:env
if exist ".env.local" goto :check_env
echo.
echo  [2/3] 데모 설정 파일을 만듭니다.
call npm run setup:demo
if errorlevel 1 goto :fail

:check_env
findstr /b /c:"APP_MODE=production" ".env.local" >nul
if not errorlevel 1 goto :production_env
set "ADMIN_PW="
for /f "tokens=1,* delims==" %%a in ('findstr /b /c:"DEMO_ADMIN_PASSWORD=" ".env.local"') do set "ADMIN_PW=%%b"
if "%ADMIN_PW%"=="" set "ADMIN_PW=(없음 - .env.local 파일의 DEMO_ADMIN_PASSWORD 값을 확인하세요)"

echo.
echo  [3/3] 서버를 켭니다. 준비되면 브라우저가 자동으로 열려요.
echo.
echo    고객 화면       : http://localhost:3100
echo    관리자 CRM      : http://localhost:3100/admin/login
echo    관리자 비밀번호 : %ADMIN_PW%
echo                      (로그인 화면에서 데모 역할은 '관리자'를 고르세요)
echo.
echo    ※ 이 창을 닫으면 사이트도 꺼져요. 끝낼 때는 이 창을 닫으면 됩니다.
echo.

rem 서버가 응답할 때까지 기다렸다가(최대 약 3분) 브라우저를 연다.
start "" /min powershell -NoProfile -ExecutionPolicy Bypass -Command "for($i=0;$i -lt 90;$i++){try{Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 'http://localhost:3100' | Out-Null; break}catch{Start-Sleep -Seconds 2}}; Start-Process 'http://localhost:3100'"

call npm run dev
echo.
echo  서버가 종료되었습니다.
goto :end

:already_running
echo.
echo  [안내] 이미 실행 중이에요. 브라우저를 엽니다.
echo         관리자 CRM: http://localhost:3100/admin/login
start "" "http://localhost:3100"
goto :end

:wrong_folder
echo  [오류] 이 파일은 insurance-check 폴더 안에서 실행해야 해요.
echo         ZIP으로 받았다면 먼저 '압축 풀기'를 한 뒤,
echo         풀린 폴더의 insurance-check 안에서 이 파일을 더블클릭하세요.
goto :fail

:no_node
echo  [오류] Node.js를 찾을 수 없어요.
echo         1) https://nodejs.org 에서 LTS 버전을 설치하세요. (브라우저로 열어 드릴게요)
echo         2) 설치가 끝나면 이 파일을 다시 더블클릭하세요.
echo            설치 직후 계속 안 되면 컴퓨터를 한 번 재시작해 주세요.
start "" "https://nodejs.org"
goto :fail

:old_node
echo  [오류] Node.js 버전이 낮아요. (현재 %NODE_MAJOR%, 필요 20 이상)
echo         https://nodejs.org 에서 LTS 버전을 다시 설치하세요.
start "" "https://nodejs.org"
goto :fail

:install_failed
echo.
echo  [오류] 설치 중 문제가 생겼어요.
echo         - 위쪽의 빨간 ERR 문구가 보이는 화면을 캡처해서 보내주세요.
echo         - 인터넷 연결을 확인하세요. 회사 PC라면 보안 프로그램이 막을 수 있어요.
goto :fail

:production_env
echo  [중단] .env.local 이 운영 모드(APP_MODE=production)로 되어 있어요.
echo         이 파일은 데모 전용이라 실행하지 않습니다.
goto :fail

:fail
echo.
echo  창을 닫으려면 아무 키나 누르세요.
pause >nul
exit /b 1

:end
echo.
pause
exit /b 0
