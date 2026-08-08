@echo off
cd /d "%~dp0"
set PYTHONPATH=.
python -m vault.ipc.register_native_host
pause
