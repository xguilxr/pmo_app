from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func


def generate_folio(db: Session, prefix: str) -> str:
    """Generate a unique folio like PRJ-2026-001, RSK-2026-015, etc."""
    year = date.today().year
    pattern = f"{prefix}-{year}-%"

    # Find the max existing folio number for this prefix and year
    from app.models.project import Project
    from app.models.modules import Risk, Issue, Change, Document, Lesson, Minute
    from app.models.project_request import ProjectRequest
    from app.models.area import ProjectArea

    model_map = {
        "PRJ": Project,
        "REQ": ProjectRequest,
        "RSK": Risk,
        "INC": Issue,
        "CHG": Change,
        "DOC": Document,
        "LEC": Lesson,
        "MIN": Minute,
        "ARE": ProjectArea,
    }

    model = model_map.get(prefix)
    if not model:
        return f"{prefix}-{year}-001"

    max_folio = db.query(func.max(model.folio)).filter(model.folio.like(pattern)).scalar()

    if max_folio:
        last_number = int(max_folio.split("-")[-1])
        next_number = last_number + 1
    else:
        next_number = 1

    return f"{prefix}-{year}-{next_number:03d}"
