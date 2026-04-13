"""Structured request logging middleware with tenant context.

Emits one JSON log line per request containing:
- timestamp, method, path, status, duration
- tenant_id and tenant_slug (from TenantMiddleware)
- user_id (from JWT, if present)
- client IP and user-agent
"""

import json
import logging
import time
from typing import Optional

from jose import jwt, JWTError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.config import get_settings

logger = logging.getLogger("pmo.access")
settings = get_settings()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Structured JSON access logging with tenant context."""

    async def dispatch(self, request: Request, call_next) -> Response:
        start = time.perf_counter()

        # Extract tenant info (set by TenantMiddleware which runs before us)
        tenant = getattr(request.state, "tenant", None)
        tenant_id: Optional[int] = tenant["id"] if tenant else None
        tenant_slug: Optional[str] = tenant.get("slug") if tenant else None

        # Extract user ID from JWT (without full DB lookup)
        user_id: Optional[int] = _extract_user_id(request)

        response = await call_next(request)

        duration_ms = round((time.perf_counter() - start) * 1000, 2)

        log_entry = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "tenant_id": tenant_id,
            "tenant_slug": tenant_slug,
            "user_id": user_id,
            "ip": _get_client_ip(request),
            "ua": request.headers.get("user-agent", "")[:200],
        }

        # Log level based on status code
        if response.status_code >= 500:
            logger.error(json.dumps(log_entry))
        elif response.status_code >= 400:
            logger.warning(json.dumps(log_entry))
        else:
            logger.info(json.dumps(log_entry))

        return response


def _extract_user_id(request: Request) -> Optional[int]:
    """Try to decode user_id from the Authorization header without a DB hit."""
    auth = request.headers.get("authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth[7:]
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        sub = payload.get("sub")
        return int(sub) if sub is not None else None
    except (JWTError, ValueError):
        return None


def _get_client_ip(request: Request) -> str:
    """Return the client IP, respecting X-Forwarded-For from reverse proxy."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"
