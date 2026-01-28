@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem -----------------------------------------------------------------------------
rem find-stash-and-patch.cmd
rem
rem Marker assumption:
rem   - A valid Stash data/config directory contains "config.yml".
rem     This aligns with Stash defaults like %USERPROFILE%\.stash\config.yml.
rem
rem Mapping assumptions:
rem   - Define MAP_COUNT and MAP_# entries below as explicit source=>destination
rem     mappings. The destination directory must already exist or the script will
rem     fail fast to avoid accidental mis-targeting.
rem -----------------------------------------------------------------------------

set "MARKER_FILE=config.yml"
set "STASH_ENV_VAR=STASH_DIR"
set "STASH_PATH_FILE=%APPDATA%\stash\stash-path.txt"

rem === Explicit mappings ===
set "MAP_COUNT=0"
rem set "MAP_1=tools\example.txt=>plugins\example.txt"
rem set "MAP_2=tools\example-dir=>plugins\example-dir"

call :log "Stage 1: Known path check"
set "ENV_VALUE="
call set "ENV_VALUE=%%%STASH_ENV_VAR%%%"
if defined ENV_VALUE call :try_dir "%ENV_VALUE%" "%STASH_ENV_VAR%"
if not defined STASH_DIR if defined STASH_CONFIG_FILE call :try_dir_from_config "!STASH_CONFIG_FILE!" "STASH_CONFIG_FILE"
if not defined STASH_DIR if exist "%STASH_PATH_FILE%" call :read_path_file "%STASH_PATH_FILE%"

call :log "Stage 2: Process inspection fallback"
if not defined STASH_DIR call :process_inspection

call :log "Stage 3: Common locations fallback"
if not defined STASH_DIR call :common_locations

call :log "Stage 4: Prompt fallback"
if not defined STASH_DIR call :prompt_for_path

if not defined STASH_DIR (
  call :fail "Unable to determine a valid Stash directory."
)

call :log "Stage 5: Apply patch mappings"
call :apply_mappings

call :log "Stage 6: Persist path"
call :persist_path

call :log "All done."
exit /b 0

:log
echo [INFO] %~1
exit /b 0

:warn
echo [WARN] %~1
exit /b 0

:fail
echo [ERROR] %~1
exit /b 1

:normalize_path
set "NORMALIZED=%~f1"
exit /b 0

:validate_dir
set "CANDIDATE=%~1"
if not defined CANDIDATE exit /b 1
call :normalize_path "%CANDIDATE%"
if not exist "%NORMALIZED%\NUL" exit /b 1
if not exist "%NORMALIZED%\%MARKER_FILE%" exit /b 1
set "STASH_DIR=%NORMALIZED%"
exit /b 0

:try_dir
set "CANDIDATE=%~1"
set "SOURCE=%~2"
if not defined CANDIDATE exit /b 0
call :validate_dir "%CANDIDATE%"
if defined STASH_DIR (
  call :log "Found Stash directory from %SOURCE%: %STASH_DIR%"
) else (
  call :warn "Invalid Stash directory from %SOURCE%: %CANDIDATE%"
)
exit /b 0

:try_dir_from_config
set "CONFIG_FILE=%~1"
set "SOURCE=%~2"
if not defined CONFIG_FILE exit /b 0
if not exist "%CONFIG_FILE%" exit /b 0
for %%I in ("%CONFIG_FILE%") do set "CONFIG_DIR=%%~dpI"
call :try_dir "%CONFIG_DIR%" "%SOURCE%"
exit /b 0

:read_path_file
set "FILE_PATH=%~1"
for /f "usebackq delims=" %%A in ("%FILE_PATH%") do (
  call :try_dir "%%A" "stash-path.txt"
  goto :read_path_file_done
)
:read_path_file_done
exit /b 0

:process_inspection
set "FOUND_CMD=0"
for /f "usebackq delims=" %%A in (`powershell -NoProfile -Command "Get-CimInstance Win32_Process | Where-Object { $_.Name -match 'stash' } | ForEach-Object { $_.CommandLine }"`) do (
  set "FOUND_CMD=1"
  call :extract_path_from_cmdline "%%A"
  if defined STASH_DIR exit /b 0
)
if "%FOUND_CMD%"=="0" call :warn "No running stash-related processes found."
if not defined STASH_DIR call :warn "No valid stash directory found from process inspection."
exit /b 0

:extract_path_from_cmdline
set "CMDLINE=%~1"
for /f "usebackq delims=" %%B in (`powershell -NoProfile -Command "param([string]$cmd) $patterns=@('(?i)--data-dir\\s+\"\"?([^\"\" ]+)\"\"?','(?i)--stash-dir\\s+\"\"?([^\"\" ]+)\"\"?','(?i)--config\\s+\"\"?([^\"\" ]+)\"\"?','(?i)-c\\s+\"\"?([^\"\" ]+)\"\"?'); foreach ($p in $patterns) { if ($cmd -match $p) { $val=$Matches[1]; if ($p -match 'config') { $val = Split-Path -Parent $val }; Write-Output $val; break } }" "%CMDLINE%"`) do (
  call :try_dir "%%B" "process args"
  if defined STASH_DIR exit /b 0
)
exit /b 0

:common_locations
call :try_dir "%USERPROFILE%\.stash" "common location"
if defined STASH_DIR exit /b 0
call :try_dir "%APPDATA%\stash" "common location"
if defined STASH_DIR exit /b 0
call :try_dir "%LOCALAPPDATA%\stash" "common location"
if defined STASH_DIR exit /b 0
call :try_dir "%USERPROFILE%\AppData\Roaming\stash" "common location"
exit /b 0

:prompt_for_path
set /a "PROMPT_ATTEMPTS=0"
:prompt_loop
set /a "PROMPT_ATTEMPTS+=1"
set "USER_PATH="
set /p "USER_PATH=Enter the path to your Stash directory (must contain %MARKER_FILE%): "
if not defined USER_PATH call :warn "No input provided."
if defined USER_PATH call :try_dir "%USER_PATH%" "manual input"
if defined STASH_DIR exit /b 0
if %PROMPT_ATTEMPTS% GEQ 3 call :fail "Too many invalid attempts."
call :warn "Invalid directory. Please try again."
goto :prompt_loop

:apply_mappings
if %MAP_COUNT% LEQ 0 call :fail "No mappings defined. Set MAP_COUNT and MAP_# entries."
for /l %%I in (1,1,%MAP_COUNT%) do (
  set "SRC="
  set "DST="
  set "MAP=!MAP_%%I!"
  if not defined MAP call :fail "Mapping MAP_%%I is empty."
  for /f "tokens=1,2 delims=>" %%A in ("!MAP!") do (
    set "SRC=%%A"
    set "DST=%%B"
  )
  if not defined SRC call :fail "Invalid mapping in MAP_%%I: !MAP!"
  if not defined DST call :fail "Invalid mapping in MAP_%%I: !MAP!"
  call :copy_mapping "!SRC!" "!DST!"
)
exit /b 0

:copy_mapping
set "SRC=%~1"
set "DST=%~2"
call :normalize_path "%SRC%"
set "SRC=%NORMALIZED%"

if exist "%SRC%\NUL" (
  if not exist "%DST%\NUL" call :fail "Destination directory does not exist: %DST%"
  call :log "Copying directory %SRC% => %DST%"
  robocopy "%SRC%" "%DST%" /e /r:0 /w:0 /njh /njs /np >nul
  if errorlevel 8 call :fail "Robocopy failed for %SRC% => %DST%"
) else (
  if not exist "%SRC%" call :fail "Source file not found: %SRC%"
  for %%I in ("%SRC%") do set "SRC_DIR=%%~dpI" & set "SRC_NAME=%%~nxI"
  for %%I in ("%DST%") do set "DST_DIR=%%~dpI"
  if not exist "%DST_DIR%\NUL" call :fail "Destination directory does not exist: %DST_DIR%"
  call :log "Copying file %SRC% => %DST%"
  robocopy "%SRC_DIR%" "%DST_DIR%" "%SRC_NAME%" /r:0 /w:0 /njh /njs /np >nul
  if errorlevel 8 call :fail "Robocopy failed for %SRC% => %DST%"
)
exit /b 0

:persist_path
if not exist "%APPDATA%\stash" mkdir "%APPDATA%\stash" >nul 2>&1
if not exist "%APPDATA%\stash" call :fail "Unable to create %APPDATA%\stash"
>"%STASH_PATH_FILE%" echo %STASH_DIR%
if errorlevel 1 call :fail "Failed to write stash-path.txt"
call :log "Saved Stash directory to %STASH_PATH_FILE%"
exit /b 0
