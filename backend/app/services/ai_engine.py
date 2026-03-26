"""
AI Engine: generates meeting minutes from transcripts using Ollama (local) or Claude API.
"""
import time
import httpx

from app.config import get_settings

settings = get_settings()

MINUTES_PROMPT_ES = """Eres un asistente de PMO experto. A partir de la siguiente transcripción de reunión, genera una minuta estructurada en español con el siguiente formato exacto:

## Minuta de Reunión

### Resumen Ejecutivo
[2-3 párrafos resumiendo los puntos más importantes]

### Participantes Detectados
[Lista de nombres mencionados en la transcripción]

### Temas Tratados
1. [Tema] - [Resumen breve]
2. ...

### Acuerdos y Compromisos
| # | Acuerdo/Compromiso | Responsable | Fecha Compromiso |
|---|-------------------|-------------|------------------|
| 1 | ... | ... | ... |

### Decisiones Tomadas
- [Decisión 1]
- ...

### Próximos Pasos
- [Paso] - [Responsable]
- ...

### Riesgos o Bloqueos Mencionados
- [Riesgo/bloqueo 1]
- ...

TRANSCRIPCIÓN:
{transcript}

Genera la minuta ahora:"""

MINUTES_PROMPT_EN = """You are an expert PMO assistant. From the following meeting transcript, generate a structured meeting minutes in English with this exact format:

## Meeting Minutes

### Executive Summary
[2-3 paragraphs summarizing the key points]

### Detected Participants
[List of names mentioned in the transcript]

### Topics Discussed
1. [Topic] - [Brief summary]
2. ...

### Agreements and Commitments
| # | Agreement/Commitment | Responsible | Due Date |
|---|---------------------|-------------|----------|
| 1 | ... | ... | ... |

### Decisions Made
- [Decision 1]
- ...

### Next Steps
- [Step] - [Responsible]
- ...

### Risks or Blockers Mentioned
- [Risk/blocker 1]
- ...

TRANSCRIPT:
{transcript}

Generate the minutes now:"""


def get_prompt(transcript: str, language: str = "es") -> str:
    template = MINUTES_PROMPT_ES if language == "es" else MINUTES_PROMPT_EN
    return template.replace("{transcript}", transcript)


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


async def generate_minutes(transcript: str, language: str = "es") -> dict:
    """
    Generate meeting minutes from transcript.
    Uses the configured AI engine (ollama or claude_api).
    """
    if not settings.ai_enabled:
        raise RuntimeError("AI engine is disabled. Enable it in .env (AI_ENABLED=true)")

    prompt = get_prompt(transcript, language)
    engine = settings.ai_default_engine

    if engine == "ollama":
        try:
            return await generate_with_ollama(prompt)
        except Exception as e:
            # Fallback to Claude if Ollama fails and API key is configured
            if settings.anthropic_api_key:
                return await generate_with_claude(prompt)
            raise RuntimeError(f"Ollama error: {e}. Configure ANTHROPIC_API_KEY for fallback.")

    elif engine == "claude_api":
        if not settings.anthropic_api_key:
            raise RuntimeError("Claude API key not configured. Set ANTHROPIC_API_KEY in .env")
        return await generate_with_claude(prompt)

    else:
        raise RuntimeError(f"Unknown AI engine: {engine}")
