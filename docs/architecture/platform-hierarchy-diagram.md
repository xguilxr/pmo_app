# PMO Platform - Entity Hierarchy & Page Workflow Diagram

## 1. Organizational Hierarchy (Top-Down)

```
                        +========================+
                        |     ORGANIZATION       |
                        |  (Grupo Alfa, TechNova)|
                        |  Branding, Logo, Color |
                        +========================+
                               |            |
                 +-------------+            +-------------+
                 |                                        |
          +======v======+                         +======v=======+
          |   PROGRAM   |                         |   PROJECT    |
          | (Portafolio)|                         |  REQUEST     |
          | start/end   |                         |  (REQ-2026-) |
          +======+=====+                         |  status:     |
                 |                                |  in_review → |
                 |                                |  approved →  |
                 |                                |  rejected    |
          +======v======+                         +======+=======+
          |             |                                |
          |  (1 to many)|                         (approved →
          |             |                          creates project)
    +-----+------+------+------+                         |
    |            |             |                          |
+===v===+  +====v====+  +====v====+                     |
|PROJECT|  | PROJECT |  | PROJECT | <-------------------+
| PRJ-  |  | PRJ-    |  | PRJ-    |
| 2026- |  | 2026-   |  | 2026-   |
| 001   |  | 002     |  | 003     |
+=======+  +=========+  +=========+
```

## 2. Project Internal Structure (Per-Project Modules)

```
+==================================================================================================+
|                                        PROJECT (PRJ-2026-001)                                    |
|  folio | name | type | priority | phase | health | budget | progress | pm | org | program        |
+==================================================================================================+
    |           |           |          |          |          |          |          |
    |           |           |          |          |          |          |          |
+---v---+  +---v---+  +---v---+  +---v---+  +---v---+  +---v---+  +---v---+  +---v--------+
| AREAS |  |OBJECT-|  | RISKS |  |ISSUES |  |CHANGES|  | DOCS  |  |LESSONS|  |  MINUTES   |
| (Org  |  | IVES  |  | RSK-  |  | INC-  |  | CHG-  |  | DOC-  |  | LEC-  |  |  MIN-      |
| Chart)|  |       |  | 2026- |  | 2026- |  | 2026- |  | 2026- |  | 2026- |  |  2026-     |
+---+---+  +---+---+  +---+---+  +---+---+  +---+---+  +---+---+  +---+---+  +---+--------+
    |          |           |          |          |          |          |          |
    v          v           v          v          v          v          v          v
 User       general     P x I     AID type   scope/    plan/      success/   AI-gen /
 (resp.)    specific    matrix    action/    time/     report/    improve/   manual
            kpi         1-5x1-5  issue/     cost/     contract   error      transcript
                        sever.   decision   resource                        Ollama/Claude

    |                      |          |
    |               +------v------+   |
    |               |    TASKS    |   |
    |               | (MS Project |   |
    |               |  or manual) |   |
    |               +------+------+   |
    |                      |          |
    |               +------v-------+  |
    |               |    TASK      |  |
    |               | DEPENDENCIES |  |
    |               | (FS/SS/FF/SF)|  |
    |               +--------------+  |
    |                                 |
    +------> PROGRESS REPORTS <-------+
             (AI-generated, emailed)
```

## 3. Access Control Hierarchy

```
+==================+       +==================+       +==================+
|      USER        |<--M2M>|      ROLE        |<--M2M>|   PERMISSION     |
| username         |       | name             |       | module + action  |
| email            |       | is_system        |       |                  |
| full_name        |       +==================+       +==================+
| is_active        |
+==================+       Predefined Roles:          9 Modules x 4 Actions
                           - Administrador            = 36 Permissions
  User also linked         - PMO Manager
  to Project via           - Project Manager           modules:
  user_projects M2M        - Viewer                    projects, risks,
  (with project_role)                                  issues, changes,
                                                       documents, lessons,
                                                       minutes, users, admin

                                                       actions:
                                                       view, create,
                                                       edit, delete
```

## 4. Page Workflow & Navigation Map

```
                                    +==============+
                                    |    LOGIN     |
                                    | /login       |
                                    | JWT auth     |
                                    +======+=======+
                                           |
                                    +======v=======+
                                    |  APP LAYOUT  |
                                    | (Sidebar +   |
                                    |  TopBar +    |
                                    |  Content)    |
                                    +==+===+=======+
                                       |   |
                    +------------------+   +------------------+
                    |                                         |
             +======v=======+                          +======v=======+
             |  DASHBOARD   |                          |   SIDEBAR    |
             |  / (home)    |                          |  Navigation  |
             +==============+                          +==============+
             | 8 KPI Cards -----> click ----+               |
             | 4 Charts     |               |               |
             | Plan vs Real |               |          +----+----+----+
             | Matrix -------> click --+    |          |         |    |
             +==============+          |    |       Main      Modules Admin
                                       |    |       Links     Dropdown Dropdown
                                       v    v
         +===========================================+
         |              PROJECTS LIST                |
         |  /projects                                |
         |  Filters: phase, company, folio, type,    |
         |           priority, date range            |
         |  Table: folio, name, type/priority,       |
         |         company, phase, progress, budget  |
         +===================+=======================+
                             |
                      click row / link
                             |
         +===================v=======================+
         |           PROJECT DETAIL                  |
         |  /projects/:id                            |
         |  Header: folio, phase badge, health badge |
         |  Quick Stats: company, timeline,          |
         |               budget, progress            |
         +===========================================+
         |  8 TABS:                                  |
         |                                           |
         |  +----------+  +---------+  +----------+  |
         |  | Info     |  | Areas   |  | Risks    |  |
         |  | general, |  | org     |  | P x I    |  |
         |  | costs,   |  | chart,  |  | matrix,  |  |
         |  | timeline,|  | roles,  |  | filters, |  |
         |  | objects. |  | users   |  | CRUD     |  |
         |  +----------+  +---------+  +----------+  |
         |                                           |
         |  +----------+  +---------+  +----------+  |
         |  | Issues   |  | Changes |  | Documents|  |
         |  | AID type,|  | scope/  |  | upload,  |  |
         |  | priority,|  | time/   |  | category,|  |
         |  | CRUD     |  | cost,   |  | version  |  |
         |  |          |  | approval|  |          |  |
         |  +----------+  +---------+  +----------+  |
         |                                           |
         |  +----------+  +---------+                |
         |  | Lessons  |  | Minutes |                |
         |  | success/ |  | AI gen/ |                |
         |  | improve/ |  | manual, |                |
         |  | error    |  | detail  |                |
         |  +----------+  +---------+                |
         +===========================================+


  GLOBAL MODULE PAGES (cross-project views):

  +============+  +============+  +============+
  | /risks     |  | /issues    |  | /changes   |
  | All risks  |  | All issues |  | All changes|
  | across     |  | across     |  | across     |
  | projects   |  | projects   |  | projects   |
  | + filters  |  | + filters  |  | + filters  |
  +============+  +============+  +============+

  +============+  +============+  +============+
  | /documents |  | /lessons   |  | /minutes   |
  | All docs   |  | All lessons|  | All minutes|
  | across     |  | across     |  | + AI gen   |
  | projects   |  | projects   |  | from       |
  | + filters  |  | + filters  |  | transcript |
  +============+  +============+  +============+

  +============+
  | /requests  |
  | Project    |
  | approval   |
  | workflow:  |
  | submit ->  |
  | review ->  |
  | approve/   |
  | reject     |
  +============+


  ADMIN PAGES:

  +================+  +================+  +===================+
  | /admin/users   |  | /admin/roles   |  | /admin/orgs       |
  | CRUD users     |  | CRUD roles     |  | CRUD organizations|
  | assign roles   |  | 36-permission  |  | industry, country |
  | active/lock    |  | checkbox matrix|  | branding config   |
  +================+  +================+  +===================+
```

## 5. Complete Entity Relationship Diagram

```
  +===============+         +===============+         +=================+
  | AuditLog      |         |  Organization |<-----+  |   Permission    |
  | - timestamp   |         |  - name       |      |  |   - module      |
  | - action      |         |  - legal_name |      |  |   - action      |
  | - module      |         |  - industry   |      |  |   (9 x 4 = 36) |
  | - record_id   |         |  - country    |      |  +=======+=========+
  | - details     |         |  - logo_url   |      |          |
  +======+========+         |  - is_active  |      |        M2M
         |                  +=======+=======+      |   role_permissions
      FK |                          |              |          |
   +-----v-----+             +-----+------+       |  +=======v=========+
   |   User     |<--+  1:N   |            |  1:N  |  |     Role        |
   | - username |   |  +-----v------+  +--v---+   |  | - name          |
   | - email    |   |  |  Program   |  | Proj.|   |  | - is_system     |
   | - full_name|   |  | - name     |  | Req  |   |  +=================+
   | - is_active|   |  | - status   |  | REQ- |   |          |
   +====+=======+   |  | - start/end|  +--+---+   |        M2M
        |           |  +-----+------+     |        |    user_roles
      M2M           |        |         approved    |          |
   user_roles       |      1:N         creates     +----------+
   user_projects    |        |            |
        |           |  +-----v------------v--------+
        +---------->+  |         PROJECT           |
                    |  |  PRJ-2026-XXX             |
                    |  |  - folio, name, type       |
                    |  |  - priority, phase, health |
                    |  |  - budget, real_budget     |
                    |  |  - progress, planned_prog. |
                    |  +--+--+--+--+--+--+--+--+---+
                    |     |  |  |  |  |  |  |  |
         +---------+-----+  |  |  |  |  |  |  +--------+---------+
         |         |         |  |  |  |  |  |          |         |
    +----v---+ +---v----+ +--v--++ +v--++ +v---+ +-----v--+ +---v-----+
    | Area   | |Object. | |Risk | |Iss.| |Chg.| | Doc.   | | Lesson  |
    | - name | |- desc. | |RSK- | |INC-| |CHG-| | DOC-   | | LEC-    |
    | - role | |- type  | |- P  | |- ty| |- ty| | - cat. | | - cat.  |
    | - resp.| |- target| |- I  | |- pr| |- st| | - file | | - recom.|
    +--------+ +--------+ |- sev| +----+ +----+ | - ver. | +---------+
                           +-----+               +--------+
         |                                                       |
    +----v------+     +----------+     +----------+         +----v-------+
    |  Minute   |     |   Task   |<--->| Task     |         |  Progress  |
    |  MIN-     |     | - name   |     | Depend.  |         |  Report    |
    | - source: |     | - wbs    |     | (FS/SS/  |         | - HTML     |
    |   ai/man. |     | - dates  |     |  FF/SF)  |         | - period   |
    | - Ollama/ |     | - parent |     +----------+         | - AI gen   |
    |   Claude  |     | - level  |                          | - emailed  |
    +-----------+     +----------+                          +------------+
```

## 6. Data Flow: Request-to-Project Lifecycle

```
  [User submits]          [PMO reviews]           [Project created]
       |                       |                        |
  +----v----+            +-----v-----+            +-----v-----+
  | REQUEST |  ------>>  |  REVIEW   |  ------>>  |  PROJECT  |
  | REQ-    |            | approve / |            | PRJ-      |
  | 2026-001|            | reject /  |            | 2026-001  |
  |         |            | ask info  |            |           |
  +---------+            +-----------+            +-----+-----+
                                                        |
              +-----+-----+-----+-----+-----+-----+----+----+
              |     |     |     |     |     |     |          |
              v     v     v     v     v     v     v          v
           Areas  Obj.  Risks Issues Chgs  Docs  Lessons  Minutes
              |                 |                              |
              v                 v                              v
           Users            Tasks                          AI Engine
           (actors)        (MS Proj.)                    (Ollama/Claude)
                              |
                              v
                        Dependencies
                        (Gantt chart)
```

## 7. Folio System

```
  Module          Prefix    Pattern           Example
  ──────────────  ────────  ────────────────  ──────────────
  Projects        PRJ       PRJ-YYYY-NNN     PRJ-2026-001
  Requests        REQ       REQ-YYYY-NNN     REQ-2026-001
  Risks           RSK       RSK-YYYY-NNN     RSK-2026-003
  Issues          INC       INC-YYYY-NNN     INC-2026-001
  Changes         CHG       CHG-YYYY-NNN     CHG-2026-001
  Documents       DOC       DOC-YYYY-NNN     DOC-2026-004
  Lessons         LEC       LEC-YYYY-NNN     LEC-2026-002
  Minutes         MIN       MIN-YYYY-NNN     MIN-2026-001
  Areas           ARE       ARE-YYYY-NNN     ARE-2026-001
```

## 8. Multi-Tenant Branding Flow

```
  +================+     +=================+     +==================+
  |  Organization  |     | BrandingConfig  |     |  React Context   |
  |  DB record     |---->| - orgId         |---->| BrandingProvider |
  |  - logo_url    |     | - logoUrl       |     | - branding state |
  |  - name        |     | - logoText      |     | - colors map     |
  +================+     | - primaryColor  |     | - switchBranding |
                          | - accentColor   |     +========+=========+
                          +=================+              |
                                                    useBranding()
                                                           |
                          +--------------------------------+--------+
                          |                |                         |
                    +-----v-----+   +------v------+          +------v------+
                    |  Sidebar  |   | Login Page  |          |  All Pages  |
                    | logo/text |   | branded btn |          | accent clrs |
                    | nav colors|   | org subtitle|          | highlights  |
                    +-----------+   +-------------+          +-------------+
```
