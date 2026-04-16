"""
AI Engine: generates meeting minutes and project reports from data using
Ollama (local), Claude API or Gemini API.
"""
import time
import httpx

from app.config import get_settings

settings = get_settings()

# ─── MINUTES PROMPTS ────────────────────────────────────────────────────────

MINUTES_PROMPT_ES = """Eres un asistente de PMO experto. A partir de la siguiente transcripción de reunión, genera una minuta estructurada en español con el siguiente formato exacto:

## Minuta de Reunión

### Resumen Ejecutivo
[2-3 párrafos resumiendo los puntos más importantes de la reunión]

### Participantes Detectados
- [Nombre 1]
- [Nombre 2]
- ...

### Temas Tratados
1. **[Tema]** — [Resumen breve de lo discutido, contexto y conclusión]
2. ...

### Acuerdos y Compromisos
| # | Acuerdo/Compromiso | Responsable | Fecha Compromiso |
|---|-------------------|-------------|------------------|
| 1 | ... | ... | ... |

### Decisiones Tomadas
- **[Decisión 1]** — [Justificación breve]
- ...

### Próximos Pasos
| # | Paso | Responsable | Fecha Tentativa |
|---|------|-------------|-----------------|
| 1 | ... | ... | ... |

### Riesgos o Bloqueos Mencionados
- **[Riesgo/bloqueo]** — Impacto: [descripción del impacto potencial]
- ...

### Elementos RAID Identificados
**Riesgos:**
- [Riesgo identificado con responsable si aplica]

**Acciones:**
- [Acción pendiente] — Responsable: [nombre]

**Issues/Problemas:**
- [Problema reportado con contexto]

**Decisiones:**
- [Decisión final tomada]

TRANSCRIPCIÓN:
{transcript}

Genera la minuta completa ahora:"""

MINUTES_PROMPT_EN = """You are an expert PMO assistant. From the following meeting transcript, generate structured meeting minutes in English with this exact format:

## Meeting Minutes

### Executive Summary
[2-3 paragraphs summarizing the key points of the meeting]

### Detected Participants
- [Name 1]
- [Name 2]
- ...

### Topics Discussed
1. **[Topic]** — [Brief summary of discussion, context and conclusion]
2. ...

### Agreements and Commitments
| # | Agreement/Commitment | Responsible | Due Date |
|---|---------------------|-------------|----------|
| 1 | ... | ... | ... |

### Decisions Made
- **[Decision 1]** — [Brief justification]
- ...

### Next Steps
| # | Step | Responsible | Tentative Date |
|---|------|-------------|----------------|
| 1 | ... | ... | ... |

### Risks or Blockers Mentioned
- **[Risk/blocker]** — Impact: [description of potential impact]
- ...

### RAID Items Identified
**Risks:**
- [Risk identified with responsible if applicable]

**Actions:**
- [Pending action] — Responsible: [name]

**Issues:**
- [Reported problem with context]

**Decisions:**
- [Final decision made]

TRANSCRIPT:
{transcript}

Generate the complete minutes now:"""


# ─── REPORT PROMPTS ─────────────────────────────────────────────────────────

REPORT_AVANCE_PROMPT = """Eres un asistente de PMO experto. Con los siguientes datos del proyecto, genera un **Reporte de Avance** ejecutivo y profesional en español con formato HTML.

DATOS DEL PROYECTO:
{project_data}

Genera el reporte con la siguiente estructura exacta en HTML (usa etiquetas <h2>, <h3>, <table>, <p>, <ul>):

<h2>Resumen Ejecutivo</h2>
[Párrafo de 3-5 líneas con el estado general del proyecto, highlights y puntos de atención]

<h2>Estado General</h2>
[Tabla con: Avance Real vs Planeado, Salud, Fase actual, Presupuesto ejecutado vs planeado]

<h2>Avance de Actividades</h2>
[Análisis del progreso de tareas: completadas, en progreso, pendientes, retrasadas. Incluir observaciones relevantes]

<h2>Riesgos Activos</h2>
[Lista de riesgos abiertos con severidad y estrategia de mitigación]

<h2>Issues y Problemas</h2>
[Lista de issues abiertos con prioridad y estado]

<h2>Solicitudes de Cambio</h2>
[Cambios pendientes o recientemente aprobados]

<h2>Conclusiones y Recomendaciones</h2>
[2-3 recomendaciones basadas en el análisis de los datos]

Genera SOLO el HTML del contenido (sin <html>, <head>, <body>). Usa estilos inline mínimos para tablas."""

REPORT_SEGUIMIENTO_PROMPT = """Eres un asistente de PMO experto. Con los siguientes datos del proyecto, genera un **Reporte de Seguimiento Semanal** profesional en español con formato HTML.

DATOS DEL PROYECTO:
{project_data}

Genera el reporte con la siguiente estructura exacta en HTML:

<h2>Seguimiento Semanal</h2>
<h3>¿Qué se hizo esta semana?</h3>
[Resumen de actividades completadas o avanzadas en el período, basado en las tareas en progreso y completadas]

<h3>¿Qué se hará la próxima semana?</h3>
[Próximas actividades planeadas basadas en tareas pendientes y fechas próximas]

<h3>Impedimentos y Bloqueos</h3>
[Bloqueos actuales basados en issues y riesgos de alta severidad]

<h2>Métricas Clave</h2>
[Tabla con: Avance Real, Avance Planeado, Desviación, Tareas completadas, Tareas retrasadas]

<h2>Tareas Críticas</h2>
[Tabla con tareas retrasadas o próximas a vencer]

<h2>RAID Resumen</h2>
[Resumen de Riesgos, Acciones, Issues y Decisiones activos]

Genera SOLO el HTML del contenido (sin <html>, <head>, <body>). Usa estilos inline mínimos para tablas."""

REPORT_EJECUTIVO_PROMPT = """Eres un asistente de PMO experto. Con los siguientes datos del proyecto, genera un **Reporte Ejecutivo** de alto nivel para dirección, profesional en español con formato HTML.

DATOS DEL PROYECTO:
{project_data}

Genera el reporte con la siguiente estructura exacta en HTML:

<h2>Dashboard Ejecutivo</h2>
[Resumen de 2-3 párrafos para un director ejecutivo: estado del proyecto, desviaciones importantes, necesidades de decisión]

<h2>Semáforo del Proyecto</h2>
[Tabla tipo semáforo con: Alcance, Tiempo, Costo, Calidad, Recursos — cada uno con estado Verde/Amarillo/Rojo y justificación breve]

<h2>Indicadores Clave</h2>
[Tabla con: Avance Real vs Plan, Presupuesto ejecutado vs plan, SPI, CPI si es calculable]

<h2>Hitos Próximos</h2>
[Lista de próximos hitos importantes con fechas]

<h2>Riesgos Top 3</h2>
[Los 3 riesgos más críticos con plan de mitigación]

<h2>Decisiones Requeridas</h2>
[Decisiones que requieren aprobación de dirección]

<h2>Próximos Pasos</h2>
[Lista de acciones inmediatas]

Genera SOLO el HTML del contenido (sin <html>, <head>, <body>). Usa estilos inline mínimos para tablas."""

REPORT_CIERRE_PROMPT = """Eres un asistente de PMO experto. Con los siguientes datos del proyecto, genera un **Reporte de Cierre de Proyecto** profesional en español con formato HTML.

DATOS DEL PROYECTO:
{project_data}

Genera el reporte con la siguiente estructura exacta en HTML:

<h2>Resumen del Proyecto</h2>
[Descripción general, objetivos, alcance original]

<h2>Resultados Finales</h2>
[Tabla comparativa: Planeado vs Real para tiempo, costo, alcance]

<h2>Entregables</h2>
[Lista de entregables completados]

<h2>Lecciones Aprendidas</h2>
[Análisis de qué salió bien, qué se puede mejorar, y qué se debe evitar]

<h2>Métricas de Rendimiento</h2>
[Tabla con métricas finales: avance, presupuesto, desviaciones, tareas completadas vs total]

<h2>Riesgos Materializados</h2>
[Riesgos que se convirtieron en issues durante el proyecto]

<h2>Agradecimientos y Reconocimientos</h2>
[Sección para reconocer al equipo]

<h2>Firma de Cierre</h2>
[Espacio para firmas de PM, Sponsor, Cliente]

Genera SOLO el HTML del contenido (sin <html>, <head>, <body>). Usa estilos inline mínimos para tablas."""

REPORT_PROMPTS = {
    "avance": REPORT_AVANCE_PROMPT,
    "seguimiento": REPORT_SEGUIMIENTO_PROMPT,
    "ejecutivo": REPORT_EJECUTIVO_PROMPT,
    "cierre": REPORT_CIERRE_PROMPT,
}


def get_prompt(transcript: str, language: str = "es") -> str:
    template = MINUTES_PROMPT_ES if language == "es" else MINUTES_PROMPT_EN
    return template.replace("{transcript}", transcript)


def get_report_prompt(report_type: str, project_data: str) -> str:
    template = REPORT_PROMPTS.get(report_type, REPORT_AVANCE_PROMPT)
    return template.replace("{project_data}", project_data)


async def generate_with_ollama(prompt: str) -> dict:
    """Generate text using local Ollama instance."""
    start = time.time()
    async with httpx.AsyncClient(timeout=settings.ollama_timeout_seconds) as client:
        response = await client.post(
            f"{settings.ollama_base_url}/api/generate",
            json={
                "model": settings.ollama_model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": settings.ai_temperature,
                },
            },
        )
        response.raise_for_status()
        data = response.json()

    elapsed_ms = int((time.time() - start) * 1000)
    return {
        "text": data.get("response", ""),
        "model": settings.ollama_model,
        "generation_time_ms": elapsed_ms,
        "engine": "ollama",
    }


async def generate_with_claude(prompt: str) -> dict:
    """Generate text using Claude API."""
    start = time.time()
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": settings.claude_model,
                "max_tokens": settings.claude_max_tokens,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": settings.ai_temperature,
            },
        )
        response.raise_for_status()
        data = response.json()

    elapsed_ms = int((time.time() - start) * 1000)
    text = data.get("content", [{}])[0].get("text", "")
    return {
        "text": text,
        "model": settings.claude_model,
        "generation_time_ms": elapsed_ms,
        "engine": "claude_api",
    }


async def generate_with_gemini(prompt: str) -> dict:
    """Generate text using Google Gemini API (native REST endpoint)."""
    start = time.time()
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.gemini_model}:generateContent"
    )
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            url,
            params={"key": settings.gemini_api_key},
            headers={"content-type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": settings.ai_temperature,
                    "maxOutputTokens": settings.gemini_max_tokens,
                },
            },
        )
        response.raise_for_status()
        data = response.json()

    elapsed_ms = int((time.time() - start) * 1000)
    candidates = data.get("candidates") or []
    parts = (candidates[0].get("content", {}).get("parts", []) if candidates else [])
    text = "".join(p.get("text", "") for p in parts)
    return {
        "text": text,
        "model": settings.gemini_model,
        "generation_time_ms": elapsed_ms,
        "engine": "gemini",
    }


async def _generate(prompt: str) -> dict:
    """Route to configured AI engine with fallback."""
    if not settings.ai_enabled:
        raise RuntimeError("AI engine is disabled. Enable it in .env (AI_ENABLED=true)")

    engine = settings.ai_default_engine

    if engine == "ollama":
        try:
            return await generate_with_ollama(prompt)
        except Exception as e:
            if settings.anthropic_api_key:
                return await generate_with_claude(prompt)
            raise RuntimeError(f"Ollama error: {e}. Configure ANTHROPIC_API_KEY for fallback.")

    elif engine == "claude_api":
        if not settings.anthropic_api_key:
            raise RuntimeError("Claude API key not configured. Set ANTHROPIC_API_KEY in .env")
        return await generate_with_claude(prompt)

    elif engine == "gemini":
        if not settings.gemini_api_key:
            raise RuntimeError("Gemini API key not configured. Set GEMINI_API_KEY in .env")
        try:
            return await generate_with_gemini(prompt)
        except Exception as e:
            if settings.anthropic_api_key:
                return await generate_with_claude(prompt)
            raise RuntimeError(f"Gemini error: {e}. Configure ANTHROPIC_API_KEY for fallback.")

    else:
        raise RuntimeError(f"Unknown AI engine: {engine}")


async def generate_minutes(transcript: str, language: str = "es") -> dict:
    """Generate meeting minutes from transcript."""
    prompt = get_prompt(transcript, language)
    return await _generate(prompt)


async def generate_report(report_type: str, project_data: str) -> dict:
    """Generate a project report from structured project data."""
    prompt = get_report_prompt(report_type, project_data)
    return await _generate(prompt)
