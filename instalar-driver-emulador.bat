@echo off
echo Instalando Android Emulator Hypervisor Driver...
cd /d "C:\Users\usuario 1\AppData\Local\Android\Sdk\extras\google\Android_Emulator_Hypervisor_Driver"
call silent_install.bat
echo.
echo Codigo de salida: %ERRORLEVEL%
echo.
"C:\Users\usuario 1\AppData\Local\Android\Sdk\emulator\emulator-check.exe" accel
echo.
pause
