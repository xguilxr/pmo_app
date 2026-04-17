"""TC-011 — Super Admin tenant detail endpoint.

Reproduces the 2026-04-17 regression: GET /api/superadmin/tenants/{id}/detail
returned 500 with 9 Pydantic v2 validation errors because
``TenantDetailResponse.model_validate(org)`` pulled SQLAlchemy relationships
(``org.programs`` / ``org.projects``) as ORM instances and tried to validate
them against ``list[dict]``.

See docs/testing/user-stories/US002-superadmin.md#us002-b.
"""
from __future__ import annotations


def test_tenant_detail_happy_path(client, org_a, headers_superadmin):
    res = client.get(f"/api/superadmin/tenants/{org_a.id}/detail", headers=headers_superadmin)
    assert res.status_code == 200, res.text
    data = res.json()

    # Tenant fields round-trip
    assert data["id"] == org_a.id
    assert data["name"] == "Tenant A"
    assert data["slug"] == "tenant-a"

    # Collections must be JSON arrays of objects (not ORM instances)
    assert isinstance(data["programs"], list)
    assert isinstance(data["projects"], list)
    assert isinstance(data["users"], list)
    assert isinstance(data["requests"], list)

    # Counts must be integers (from_attributes would leave them None if misnamed)
    assert isinstance(data["user_count"], int)
    assert isinstance(data["project_count"], int)


def test_tenant_detail_with_programs_and_projects(
    client, db_session, org_a, headers_superadmin
):
    """Regression: ensure related records serialize as dicts, not ORM models."""
    from app.models.program import Program
    from app.models.project import Project

    prog = Program(
        name="Programa 2026",
        organization_id=org_a.id,
        status="active",
    )
    db_session.add(prog)
    db_session.flush()

    proj = Project(
        folio="PRJ-001",
        name="Proyecto Alfa",
        type="internal",
        phase="execution",
        organization_id=org_a.id,
        program_id=prog.id,
    )
    db_session.add(proj)
    db_session.commit()

    res = client.get(f"/api/superadmin/tenants/{org_a.id}/detail", headers=headers_superadmin)
    assert res.status_code == 200, res.text
    data = res.json()

    assert len(data["programs"]) == 1
    assert data["programs"][0]["name"] == "Programa 2026"
    assert data["programs"][0]["project_count"] == 1

    assert len(data["projects"]) == 1
    assert data["projects"][0]["folio"] == "PRJ-001"
    assert data["projects"][0]["program_name"] == "Programa 2026"


def test_tenant_detail_404_when_missing(client, headers_superadmin):
    res = client.get("/api/superadmin/tenants/99999/detail", headers=headers_superadmin)
    assert res.status_code == 404


def test_tenant_detail_requires_superadmin(client, org_a, headers_admin_a):
    """Tenant admin (not superadmin) must get 403, not 200."""
    res = client.get(f"/api/superadmin/tenants/{org_a.id}/detail", headers=headers_admin_a)
    assert res.status_code == 403


def test_tenant_detail_does_not_require_x_tenant_id(client, org_a, token_superadmin):
    """Regression: superadmin endpoints MUST NOT depend on get_current_tenant.

    The reported bug "Super admin debe especificar X-Tenant-ID" must NOT
    appear when calling /superadmin/* without the header.
    """
    headers = {"Authorization": f"Bearer {token_superadmin}"}  # no X-Tenant-ID
    res = client.get(f"/api/superadmin/tenants/{org_a.id}/detail", headers=headers)
    assert res.status_code == 200, res.text
    # Defense-in-depth: make sure the specific error message never surfaces here.
    detail = res.json() if res.headers.get("content-type", "").startswith("application/json") else {}
    assert "X-Tenant-ID" not in str(detail)
