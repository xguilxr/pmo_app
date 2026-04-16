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
REM      - venv creado en .\venv (python -m venv venv)
REM      - Dependencias instaladas (pip install -r backend\requirements.txt)
REM      - Archivo .env configurado en la raiz del repo
REM
REM  Ver docs\deploy-self-hosted.md para la guia completa.
REM ============================================================================

REM Movernos a la carpeta donde esta este .bat (raiz del repo)
cd /d "%~dp0"

REM Activar el entorno virtual
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] No se encuentra venv\Scripts\activate.bat
    echo Crea el venv con: python -m venv venv
    exit /b 1
)
call venv\Scripts\activate.bat

REM Entrar a backend y arrancar uvicorn
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8080
