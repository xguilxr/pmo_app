"""TC-MT-001 — Multi-tenant isolation smoke.

Garantiza que tenant A no lee/edita datos de tenant B. Estos tests son la
regresión principal de los C1–C4 del roadmap.
"""
from __future__ import annotations


def test_projects_list_filtered_by_tenant(
    client, db_session, org_a, org_b, user_admin_a, user_member_b,
    headers_admin_a, headers_member_b,
):
    from app.models.project import Project

    p_a = Project(folio="A-001", name="Secret A", type="internal", phase="execution", organization_id=org_a.id)
    p_b = Project(folio="B-001", name="Secret B", type="internal", phase="execution", organization_id=org_b.id)
    db_session.add_all([p_a, p_b])
    db_session.commit()

    res_a = client.get("/api/projects", headers=headers_admin_a)
    res_b = client.get("/api/projects", headers=headers_member_b)

    assert res_a.status_code == 200
    assert res_b.status_code == 200

    folios_a = {p["folio"] for p in res_a.json()}
    folios_b = {p["folio"] for p in res_b.json()}

    assert "A-001" in folios_a and "B-001" not in folios_a
    assert "B-001" in folios_b and "A-001" not in folios_b


def test_cannot_read_other_tenant_project_by_id(
    client, db_session, org_a, org_b, headers_admin_a,
):
    from app.models.project import Project

    p_b = Project(folio="B-SECRET", name="Top Secret B", type="internal", phase="execution", organization_id=org_b.id)
    db_session.add(p_b)
    db_session.commit()
    db_session.refresh(p_b)

    res = client.get(f"/api/projects/{p_b.id}", headers=headers_admin_a)
    # Must not leak — 404 (not found for this tenant) is the expected shape.
    assert res.status_code in (403, 404), res.text
