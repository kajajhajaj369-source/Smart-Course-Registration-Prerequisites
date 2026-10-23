@echo off
set "SCRIPT_PATH=%~dp0START_APP.bat"
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut([System.IO.Path]::Combine([System.Environment]::GetFolderPath('Desktop'), 'Course Registration App.lnk')); $s.TargetPath = '%SCRIPT_PATH%'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = 'shell32.dll,14'; $s.Save()"
echo.
echo ==========================================================
echo [SUCCESS] Shortcut created on your Desktop!
echo Look for 'Course Registration App' on your Desktop.
echo ==========================================================
echo.
pause
