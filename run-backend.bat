@echo off
REM ============================================================================
REM  PMO Backend - Arranque local en Windows
REM ============================================================================
REM  Activa el venv y levanta uvicorn. Se usa tanto para pruebas en primer
REM  plano como para el servicio Windows instalado con NSSM.
REM
REM  Uso manual:
REM      .\run-backend.bat
REM
REM  Requisitos previos:
REM      - Python 3.11+ instalado y en PATH
REM      - venv creado en .\venv, ..\venv, o apuntado con VENV_DIR
REM        (python -m venv venv)
REM      - Dependencias instaladas (pip install -r backend\requirements.txt)
REM      - Archivo .env configurado en la raiz del repo
REM
REM  Ver docs\deploy-self-hosted.md para la guia completa.
REM ============================================================================

REM Movernos a la carpeta donde esta este .bat (raiz del repo)
cd /d "%~dp0"

REM Localizar el venv. Se respeta VENV_DIR si esta definido; en caso
REM contrario probamos .\venv y luego ..\venv (venv hermano del repo).
if defined VENV_DIR (
    set "_VENV_ACTIVATE=%VENV_DIR%\Scripts\activate.bat"
) else if exist "venv\Scripts\activate.bat" (
    set "_VENV_ACTIVATE=venv\Scripts\activate.bat"
) else if exist "..\venv\Scripts\activate.bat" (
    set "_VENV_ACTIVATE=..\venv\Scripts\activate.bat"
) else (
    set "_VENV_ACTIVATE="
)

if not defined _VENV_ACTIVATE (
    echo [ERROR] No se encuentra el venv.
    echo Buscado en: .\venv, ..\venv, y VENV_DIR=%VENV_DIR%
    echo Crea el venv con: python -m venv venv
    echo O define VENV_DIR apuntando a la carpeta del venv.
    exit /b 1
)
if not exist "%_VENV_ACTIVATE%" (
    echo [ERROR] No se encuentra %_VENV_ACTIVATE%
    echo Revisa VENV_DIR o crea el venv con: python -m venv venv
    exit /b 1
)
call "%_VENV_ACTIVATE%"

REM Entrar a backend y arrancar uvicorn
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080 --log-config log_config.yaml
