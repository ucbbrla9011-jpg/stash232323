@echo off
setlocal enableextensions enabledelayedexpansion

rem ==============================================================================
rem Stash patch helper
rem - Copies customization files into the Stash config directory.
rem - Provide the config directory as the first argument or via STASH_CONFIG_DIR.
rem ==============================================================================

set "SCRIPT_DIR=%~dp0"
set "PATCH_ROOT=%SCRIPT_DIR%patches"

if not "%~1"=="" (
  set "CONFIG_DIR=%~1"
) else if not "%STASH_CONFIG_DIR%"=="" (
  set "CONFIG_DIR=%STASH_CONFIG_DIR%"
) else (
  echo [ERROR] Missing Stash config directory. Pass it as the first argument or set STASH_CONFIG_DIR.
  exit /b 1
)

if not exist "%CONFIG_DIR%" (
  echo [ERROR] Config directory not found: "%CONFIG_DIR%"
  exit /b 1
)

if not exist "%PATCH_ROOT%" (
  echo [ERROR] Patch source directory not found: "%PATCH_ROOT%"
  exit /b 1
)

rem ==============================================================================
rem Mapping table (source -> destination)
rem Destinations are relative to the Stash config directory.
rem ==============================================================================
set "MAP_0=custom.css|custom.css"
set "MAP_1=custom.js|custom.js"
set "MAP_2=custom-locales.json|custom-locales.json"
set "MAP_3=plugins|plugins"
set "MAP_4=scrapers|scrapers"

set /a MAP_COUNT=5
set /a COPIED_COUNT=0

for /l %%I in (0,1,%MAP_COUNT%-1) do (
  for /f "tokens=1,2 delims=|" %%A in ("!MAP_%%I!") do (
    call :copy_item "%%~A" "%%~B"
    if errorlevel 1 exit /b 1
    set /a COPIED_COUNT+=1
  )
)

echo.
echo [INFO] Completed %COPIED_COUNT% copy action(s).
exit /b 0

:copy_item
set "SRC_REL=%~1"
set "DEST_REL=%~2"
set "SRC_PATH=%PATCH_ROOT%\%SRC_REL%"
set "DEST_PATH=%CONFIG_DIR%\%DEST_REL%"

if not exist "%SRC_PATH%" (
  echo [ERROR] Source not found: "%SRC_PATH%"
  exit /b 1
)

if exist "%SRC_PATH%\*" (
  call :copy_directory "%SRC_PATH%" "%DEST_PATH%"
  exit /b %ERRORLEVEL%
)

call :copy_file "%SRC_PATH%" "%DEST_PATH%"
exit /b %ERRORLEVEL%

:copy_directory
set "SRC_DIR=%~1"
set "DEST_DIR=%~2"

if not exist "%DEST_DIR%" (
  echo [ERROR] Destination directory missing: "%DEST_DIR%"
  exit /b 1
)

echo [COPY] "%SRC_DIR%" ^> "%DEST_DIR%"
robocopy "%SRC_DIR%" "%DEST_DIR%" /E /R:0 /W:0 /COPY:DAT /DCOPY:T /NFL /NDL /NJH /NJS /NP
call :check_robocopy_errorlevel
exit /b %ERRORLEVEL%

:copy_file
set "SRC_FILE=%~1"
set "DEST_FILE=%~2"
for %%D in ("%DEST_FILE%") do set "DEST_DIR=%%~dpD"
for %%S in ("%SRC_FILE%") do (
  set "SRC_DIR=%%~dpS"
  set "SRC_NAME=%%~nxS"
)

if not exist "%DEST_DIR%" (
  echo [ERROR] Destination directory missing: "%DEST_DIR%"
  exit /b 1
)

echo [COPY] "%SRC_FILE%" ^> "%DEST_FILE%"
robocopy "%SRC_DIR%" "%DEST_DIR%" "%SRC_NAME%" /R:0 /W:0 /COPY:DAT /DCOPY:T /NFL /NDL /NJH /NJS /NP
call :check_robocopy_errorlevel
exit /b %ERRORLEVEL%

:check_robocopy_errorlevel
set "RC=%ERRORLEVEL%"
if %RC% GEQ 8 (
  echo [ERROR] Copy failed with exit code %RC%.
  exit /b %RC%
)
exit /b 0
