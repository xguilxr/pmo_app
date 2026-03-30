from datetime import date, datetime, timezone
from typing import Optional
import csv
import io
import os

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.task import Task
from app.auth.security import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])


class TaskCreate(BaseModel):
    name: str
    description: Optional[str] = None
    wbs: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    progress: float = 0
    status: str = "pending"
    priority: Optional[str] = None
    is_milestone: bool = False
    outline_level: int = 1
    notes: Optional[str] = None
    parent_task_id: Optional[int] = None
    responsible_id: Optional[int] = None
    responsible_name: Optional[str] = None


class TaskUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    wbs: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    progress: Optional[float] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    is_milestone: Optional[bool] = None
    outline_level: Optional[int] = None
    notes: Optional[str] = None
    parent_task_id: Optional[int] = None
    responsible_id: Optional[int] = None
    responsible_name: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    wbs: Optional[str]
    start_date: Optional[date]
    end_date: Optional[date]
    duration_days: Optional[int]
    progress: float
    status: str
    priority: Optional[str]
    is_milestone: bool
    outline_level: int
    notes: Optional[str]
    source: str
    was_delayed: bool
    original_end_date: Optional[date]
    parent_task_id: Optional[int]
    project_id: int
    responsible_id: Optional[int]
    responsible_name: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class TaskImportItem(BaseModel):
    name: str
    wbs: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    progress: float = 0
    outline_level: int = 1
    is_milestone: bool = False
    responsible_id: Optional[int] = None


class TaskImportPayload(BaseModel):
    items: list[TaskImportItem]


@router.get("", response_model=list[TaskResponse])
def list_tasks(
    project_id: int,
    status_filter: str | None = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Task).filter(Task.deleted_at.is_(None), Task.project_id == project_id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    return query.order_by(Task.wbs, Task.id).all()


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = Task(
        name=data.name,
        description=data.description,
        wbs=data.wbs,
        start_date=data.start_date,
        end_date=data.end_date,
        duration_days=data.duration_days,
        progress=data.progress,
        status=data.status,
        priority=data.priority,
        is_milestone=data.is_milestone,
        outline_level=data.outline_level,
        notes=data.notes,
        parent_task_id=data.parent_task_id,
        responsible_id=data.responsible_id,
        responsible_name=data.responsible_name,
        project_id=project_id,
        source="manual",
        created_by_id=current_user.id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(task_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id, Task.deleted_at.is_(None)).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    task.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/import", response_model=list[TaskResponse], status_code=status.HTTP_201_CREATED)
def import_tasks(
    project_id: int,
    payload: TaskImportPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bulk create/update tasks from an imported file (e.g. MS Project)."""
    created = []
    for item in payload.items:
        task = Task(
            name=item.name,
            wbs=item.wbs,
            start_date=item.start_date,
            end_date=item.end_date,
            duration_days=item.duration_days,
            progress=item.progress,
            outline_level=item.outline_level,
            is_milestone=item.is_milestone,
            responsible_id=item.responsible_id,
            project_id=project_id,
            source="ms_project_import",
            created_by_id=current_user.id,
        )
        db.add(task)
        created.append(task)
    db.commit()
    for t in created:
        db.refresh(t)
    return created


@router.post("/import-file", response_model=list[TaskResponse], status_code=status.HTTP_201_CREATED)
async def import_tasks_from_file(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import tasks from a CSV or XLSX file.

    Expected columns (case-insensitive, flexible matching):
    WBS, Nombre/Name/Task, Inicio/Start, Fin/End/Finish, Duracion/Duration,
    Avance/Progress/%, Hito/Milestone, Nivel/Level/Outline, Responsable/Resource
    """
    filename = (file.filename or "").lower()
    content = await file.read()

    if filename.endswith(".mpp") or filename.endswith(".mpx") or filename.endswith(".xml") and b"<Project" in content[:500]:
        rows = _parse_mpp(content, filename)
    elif filename.endswith(".xlsx"):
        rows = _parse_xlsx(content)
    elif filename.endswith(".csv"):
        rows = _parse_csv(content)
    else:
        raise HTTPException(status_code=400, detail="Formato no soportado. Use .mpp, .xlsx o .csv")

    if not rows:
        raise HTTPException(status_code=400, detail="No se encontraron tareas en el archivo")

    created = []
    for row in rows:
        task = Task(
            name=row["name"],
            wbs=row.get("wbs"),
            start_date=row.get("start_date"),
            end_date=row.get("end_date"),
            duration_days=row.get("duration_days"),
            progress=row.get("progress", 0),
            outline_level=row.get("outline_level", 1),
            is_milestone=row.get("is_milestone", False),
            responsible_name=row.get("responsible_name"),
            status="pending",
            project_id=project_id,
            source="file_import",
            created_by_id=current_user.id,
        )
        db.add(task)
        created.append(task)
    db.commit()
    for t in created:
        db.refresh(t)
    return created


def _normalize_header(h: str) -> str:
    """Map various column name variations to standard keys."""
    h = h.strip().lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u")
    mappings = {
        "wbs": "wbs", "edt": "wbs",
        "nombre": "name", "name": "name", "task": "name", "tarea": "name", "task name": "name",
        "inicio": "start_date", "start": "start_date", "start date": "start_date", "fecha inicio": "start_date",
        "fin": "end_date", "end": "end_date", "finish": "end_date", "end date": "end_date", "fecha fin": "end_date",
        "duracion": "duration_days", "duration": "duration_days", "dias": "duration_days",
        "avance": "progress", "progress": "progress", "%": "progress", "% completado": "progress", "% complete": "progress",
        "hito": "is_milestone", "milestone": "is_milestone",
        "nivel": "outline_level", "level": "outline_level", "outline level": "outline_level", "outline_level": "outline_level",
        "responsable": "responsible_name", "resource": "responsible_name", "resource names": "responsible_name", "recurso": "responsible_name",
    }
    return mappings.get(h, "")


def _parse_date(val: str | None) -> date | None:
    if not val or not val.strip():
        return None
    val = val.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(val, fmt).date()
        except ValueError:
            continue
    return None


def _parse_float(val: str | None, default: float = 0) -> float:
    if not val:
        return default
    val = val.strip().replace("%", "").replace(",", ".")
    try:
        return float(val)
    except ValueError:
        return default


def _parse_int(val: str | None, default: int = 1) -> int:
    if not val:
        return default
    val = val.strip().replace("d", "").replace("D", "")
    try:
        return int(float(val))
    except ValueError:
        return default


def _parse_bool(val: str | None) -> bool:
    if not val:
        return False
    return val.strip().lower() in ("si", "sí", "yes", "true", "1", "x")


def _row_to_task(row_dict: dict[str, str], header_map: dict[int, str]) -> dict | None:
    """Convert a mapped row to a task dict."""
    name = row_dict.get("name", "").strip()
    if not name:
        return None
    return {
        "name": name,
        "wbs": row_dict.get("wbs", "").strip() or None,
        "start_date": _parse_date(row_dict.get("start_date")),
        "end_date": _parse_date(row_dict.get("end_date")),
        "duration_days": _parse_int(row_dict.get("duration_days"), 0) or None,
        "progress": _parse_float(row_dict.get("progress")),
        "outline_level": _parse_int(row_dict.get("outline_level")),
        "is_milestone": _parse_bool(row_dict.get("is_milestone")),
        "responsible_name": row_dict.get("responsible_name", "").strip() or None,
    }


def _parse_csv(content: bytes) -> list[dict]:
    """Parse CSV file content into task dicts."""
    # Try UTF-8 with BOM, then latin-1
    for encoding in ("utf-8-sig", "utf-8", "latin-1"):
        try:
            text = content.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        text = content.decode("latin-1")

    reader = csv.reader(io.StringIO(text))
    rows_iter = iter(reader)

    # Find header row
    header_map: dict[int, str] = {}
    for raw_row in rows_iter:
        for i, cell in enumerate(raw_row):
            key = _normalize_header(cell)
            if key:
                header_map[i] = key
        if "name" in header_map.values():
            break

    if "name" not in header_map.values():
        return []

    tasks = []
    for raw_row in rows_iter:
        row_dict = {header_map[i]: raw_row[i] if i < len(raw_row) else "" for i in header_map}
        task = _row_to_task(row_dict, header_map)
        if task:
            tasks.append(task)
    return tasks


def _find_mpxj_jars() -> str:
    """Find mpxj JAR files - check pip package or local lib directory."""
    import glob
    import subprocess as _sp

    # Option 1: locate mpxj pip package via 'pip show' (works even without jpype1)
    try:
        result = _sp.run(
            ["pip", "show", "mpxj"], capture_output=True, text=True, timeout=10
        )
        for line in result.stdout.splitlines():
            if line.startswith("Location:"):
                loc = line.split(":", 1)[1].strip()
                mpxj_dir = os.path.join(loc, "mpxj")
                jars = glob.glob(os.path.join(mpxj_dir, "lib", "*.jar"))
                if not jars:
                    jars = glob.glob(os.path.join(mpxj_dir, "*.jar"))
                if jars:
                    return os.pathsep.join(jars)
    except Exception:
        pass

    # Option 2: try direct import (works if jpype1 is installed)
    try:
        import mpxj as mpxj_mod
        mpxj_dir = os.path.dirname(mpxj_mod.__file__)
        jars = glob.glob(os.path.join(mpxj_dir, "lib", "*.jar"))
        if not jars:
            jars = glob.glob(os.path.join(mpxj_dir, "*.jar"))
        if jars:
            return os.pathsep.join(jars)
    except ImportError:
        pass

    # Option 3: local lib/ directory next to backend
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    lib_dir = os.path.join(backend_dir, "lib")
    if os.path.isdir(lib_dir):
        jars = glob.glob(os.path.join(lib_dir, "*.jar"))
        if jars:
            return os.pathsep.join(jars)

    return ""


def _ensure_mpp_helper_compiled(utils_dir: str, classpath: str) -> str:
    """Compile MppToJson.java if .class doesn't exist yet. Returns utils_dir."""
    class_file = os.path.join(utils_dir, "MppToJson.class")
    java_file = os.path.join(utils_dir, "MppToJson.java")

    if os.path.exists(class_file):
        return utils_dir

    if not os.path.exists(java_file):
        raise HTTPException(
            status_code=500,
            detail="Archivo MppToJson.java no encontrado en el servidor"
        )

    import subprocess
    result = subprocess.run(
        ["javac", "-cp", classpath, java_file],
        capture_output=True, text=True, timeout=30
    )
    if result.returncode != 0:
        raise HTTPException(
            status_code=500,
            detail=f"Error al compilar MppToJson.java: {result.stderr[:500]}"
        )
    return utils_dir


def _parse_mpp(content: bytes, filename: str) -> list[dict]:
    """Parse MS Project (.mpp/.mpx/.xml) using mpxj via subprocess (requires Java)."""
    import tempfile
    import subprocess
    import json

    # Check Java is available
    try:
        subprocess.run(["java", "-version"], capture_output=True, timeout=10)
    except FileNotFoundError:
        raise HTTPException(
            status_code=400,
            detail="Se requiere Java (JDK/JRE) instalado para leer archivos .mpp. "
                   "Descargalo de https://adoptium.net/"
        )

    # Find mpxj JARs
    classpath = _find_mpxj_jars()
    if not classpath:
        raise HTTPException(
            status_code=400,
            detail="mpxj no encontrado. Ejecute: pip install mpxj --no-deps"
        )

    # Compile helper if needed
    utils_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "utils")
    _ensure_mpp_helper_compiled(utils_dir, classpath)

    # Full classpath = mpxj jars + utils dir (for MppToJson.class)
    full_cp = classpath + os.pathsep + utils_dir

    # Write uploaded file to temp
    suffix = os.path.splitext(filename)[1] or ".mpp"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            ["java", "-cp", full_cp, "MppToJson", tmp_path],
            capture_output=True, text=True, timeout=60
        )

        if result.returncode != 0:
            err_msg = result.stderr.strip()[:500] if result.stderr else "Error desconocido"
            raise HTTPException(
                status_code=400,
                detail=f"Error al leer archivo MS Project: {err_msg}"
            )

        raw_tasks = json.loads(result.stdout)

        tasks = []
        for t in raw_tasks:
            name = (t.get("name") or "").strip()
            if not name:
                continue
            tasks.append({
                "name": name,
                "wbs": t.get("wbs") or None,
                "start_date": _parse_date(t.get("start_date")) if t.get("start_date") else None,
                "end_date": _parse_date(t.get("end_date")) if t.get("end_date") else None,
                "duration_days": t.get("duration_days"),
                "progress": t.get("progress", 0),
                "outline_level": t.get("outline_level", 1),
                "is_milestone": t.get("is_milestone", False),
                "responsible_name": t.get("responsible_name"),
            })

        return tasks

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Error al procesar la salida del archivo MS Project"
        )
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def _parse_xlsx(content: bytes) -> list[dict]:
    """Parse XLSX file content into task dicts."""
    from openpyxl import load_workbook
    wb = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
    ws = wb.active
    if not ws:
        return []

    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []

    # Find header row
    header_map: dict[int, str] = {}
    header_row_idx = 0
    for idx, row in enumerate(rows):
        for i, cell in enumerate(row):
            if cell is not None:
                key = _normalize_header(str(cell))
                if key:
                    header_map[i] = key
        if "name" in header_map.values():
            header_row_idx = idx
            break

    if "name" not in header_map.values():
        return []

    tasks = []
    for row in rows[header_row_idx + 1:]:
        row_dict = {}
        for i in header_map:
            val = row[i] if i < len(row) else None
            if isinstance(val, datetime):
                row_dict[header_map[i]] = val.strftime("%Y-%m-%d")
            elif isinstance(val, date):
                row_dict[header_map[i]] = val.strftime("%Y-%m-%d")
            else:
                row_dict[header_map[i]] = str(val) if val is not None else ""
        task = _row_to_task(row_dict, header_map)
        if task:
            tasks.append(task)
    return tasks
