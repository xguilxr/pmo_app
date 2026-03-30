# Import all models so SQLAlchemy registers them with the mapper
from app.models.base import TimestampMixin  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.role import Role, Permission  # noqa: F401
from app.models.organization import Organization  # noqa: F401
from app.models.program import Program  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.project_request import ProjectRequest  # noqa: F401
from app.models.modules import Risk, Issue, Change, Document, Lesson, Minute  # noqa: F401
from app.models.task import Task, TaskDependency  # noqa: F401
from app.models.audit import AuditLog  # noqa: F401
from app.models.report import ProgressReport  # noqa: F401
from app.models.backlog import BacklogItem  # noqa: F401
from app.models.area import ProjectArea  # noqa: F401
from app.models.objective import ProjectObjective  # noqa: F401
from app.models.notification import Notification  # noqa: F401
