"""Phusion Passenger entry point for cPanel Application Manager.

This file is the WSGI entry point used by HostGator / cPanel's "Application
Manager" (Phusion Passenger). FastAPI is ASGI-native, so we wrap it with
a2wsgi to expose a WSGI callable named ``application``.

Expected cPanel Application Manager settings:
    Application root:        pmo_app/backend
    Application startup file: passenger_wsgi.py
    Application entry point:  application
"""
import os
import sys

# Ensure the backend package ("app") is importable regardless of how Passenger
# invokes this file.
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Load .env from the repo root (one level up from backend/). Passenger does not
# export shell env by default, so we read the file explicitly.
try:
    from dotenv import load_dotenv

    load_dotenv(os.path.join(BACKEND_DIR, "..", ".env"))
except ImportError:
    # python-dotenv is in requirements.txt; if this import fails the venv is
    # not fully provisioned yet — let the ASGI import raise a clearer error.
    pass

from a2wsgi import ASGIMiddleware  # noqa: E402

from app.main import app as _asgi_app  # noqa: E402

# Passenger discovers the WSGI callable by this exact name.
application = ASGIMiddleware(_asgi_app)
