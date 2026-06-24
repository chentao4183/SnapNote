@echo off
setlocal enableextensions

REM Switch to repo root regardless of where the script is invoked from.
cd /d "%~dp0\.."

echo ============================================================
echo  StepMark release build (exe + MSI + NSIS)
echo ============================================================

REM ---------------------------------------------------------------------------
REM Close any running stepmark.exe before building.
REM
REM We intentionally do NOT use a "tasklist | find" detection here: under
REM Git-bash / MSYS the bare "find" resolves to the Unix file-finder instead
REM of Windows find.exe, so the detection silently fails and the running
REM process is never killed -- which then locks the output exe and breaks the
REM link/bundle step. Killing unconditionally (and tolerating the "no such
REM process" error) is reliable across cmd, PowerShell, and bash shells.
REM ---------------------------------------------------------------------------
echo Closing stepmark.exe if it is running...
taskkill /IM stepmark.exe /T /F >NUL 2>&1
if errorlevel 1 (
  echo   - stepmark.exe was not running.
) else (
  echo   - stepmark.exe has been closed.
  REM Give the OS a moment to release the file handle on the exe so the
  REM linker does not fail with a "file in use" error. Using "ping" instead
  REM of "timeout" because under Git-bash/MSYS the latter resolves to GNU
  REM coreutils timeout and rejects the /t flag.
  ping -n 3 127.0.0.1 >NUL
)

echo.
echo Building StepMark release exe and installers...
echo ------------------------------------------------------------
call npm.cmd run tauri build
if errorlevel 1 (
  echo.
  echo ============================================================
  echo  BUILD FAILED.
  echo ============================================================
  exit /b %errorlevel%
)

echo.
echo ============================================================
echo  BUILD SUCCEEDED.
echo ============================================================
echo Bundles on disk:
for %%F in ("src-tauri\target\release\stepmark.exe" "src-tauri\target\release\bundle\msi\*.msi" "src-tauri\target\release\bundle\nsis\*.exe") do (
  if exist "%%~fF" echo   %%~zF bytes  %%~fF
)

endlocal
