@echo off
rem DNMS Video Editing System setup for Windows 10/11.
rem Installs the system tools with winget when missing (Node.js LTS, Python 3.12, FFmpeg full build, Git),
rem then runs tools\setup\setup.mjs, which builds everything else. Safe to run again.
rem Options pass through: install.bat --no-matte   install.bat --check   install.bat --force
setlocal
cd /d "%~dp0"
echo == DNMS Video Editing System setup (Windows)

where winget >nul 2>nul
if errorlevel 1 (
  echo winget is missing. Install "App Installer" from the Microsoft Store, or install Node.js 22+, Python 3.12
  echo and an FFmpeg full build yourself ^(docs\INSTALL.md^), then run: node tools\setup\setup.mjs
  exit /b 1
)

call :need "node --version" OpenJS.NodeJS.LTS
call :need "py -3.12 --version" Python.Python.3.12
call :need "ffmpeg -version" Gyan.FFmpeg
call :need "git --version" Git.Git

rem winget changes PATH for new windows only; reload it so this window sees the new tools.
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')"`) do set "PATH=%%P"

node tools\setup\setup.mjs %*
set RC=%errorlevel%
if not "%RC%"=="0" echo Setup finished with problems: read the FAIL lines above, or docs\INSTALL.md (Troubleshooting).
exit /b %RC%

:need
%~1 >nul 2>nul
if not errorlevel 1 exit /b 0
echo Installing %2 with winget...
winget install --id %2 -e --source winget --accept-package-agreements --accept-source-agreements
exit /b 0
