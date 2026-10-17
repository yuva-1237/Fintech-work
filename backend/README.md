# Prathyusha FinTech Innovation Team Portal — Backend API

Production-ready backend engineered with Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL. It strictly adheres to the architectural specifications, entities, role permissions, and workflow states detailed in the requirements report.

---

## 🏗️ Architecture & Tech Stack

- **Runtime & Language:** Node.js (v20+) with TypeScript (ES2022 / NodeNext, strict mode)
- **Web Framework:** Express 4.x with Helmet, CORS, and Winston/Morgan structured logging
- **Database ORM:** Prisma ORM 5.x with PostgreSQL 15
- **Authentication:** JSON Web Tokens (JWT) with bcrypt salt hashing
- **Authorization:** Role-Based Access Control (RBAC) middleware supporting 8 system roles
- **Reporting Engine:**
  - **ExcelJS:** Dynamic, multi-column spreadsheets with audit/verification columns
  - **PDFKit:** Executive management summary reports highlighting verified vs. unverified metrics
- **Containerization:** Docker Compose configuration with PostgreSQL 15 and pgAdmin 4

---

## 📁 Repository Structure

```
backend/
├── docker-compose.yml          # PostgreSQL 15 & pgAdmin 4 container service
├── package.json                # Dependencies, Prisma scripts & TS build commands
├── tsconfig.json               # Strict TypeScript configuration (zero any types)
├── .env.example                # Example environment configuration
├── .env                        # Local development environment variables
├── prisma/
│   ├── schema.prisma           # Complete entity models, enums & relational integrity
│   └── seed.ts                 # Full database seeder with institutional accounts & sample data
├── src/
│   ├── app.ts                  # Express application setup, security & middleware stack
│   ├── server.ts               # HTTP server entrypoint & graceful shutdown handlers
│   ├── lib/
│   │   ├── prisma.ts           # PrismaClient singleton with connection lifecycle
│   │   └── logger.ts           # Winston logger with colorized timestamp formatting
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication & requireRoles() guard
│   │   └── errorHandler.ts     # Global exception & Prisma error handler
│   ├── types/
│   │   └── index.ts            # Type definitions, interfaces & enums
│   ├── controllers/
│   │   ├── auth.controller.ts          # Login, profile & password management
│   │   ├── membership.controller.ts    # Student applications & automatic user provisioning
│   │   ├── project.controller.ts       # Projects, tasks, and contribution logs
│   │   ├── weeklyUpdate.controller.ts  # Weekly submissions & mentor reviews
│   │   ├── hackathon.controller.ts     # Hackathon registration, outcomes & certificates
│   │   ├── magazine.controller.ts      # Editorial queue, articles & issue publishing
│   │   ├── reports.controller.ts       # Excel exports & PDF summaries
│   │   ├── showcase.controller.ts      # Public endpoints with privacy sanitization
│   │   ├── notification.controller.ts  # In-app notifications
│   │   └── audit.controller.ts         # Administrative audit trails
│   └── routes/
│       └── index.ts            # Master routing table mapped to frontend expectations
└── dist/                       # Compiled production JavaScript bundle
```

---

## 🚀 Quick Start Guide

### 1. Start PostgreSQL with Docker Compose
Run the following in the `backend/` directory:
```bash
docker compose up -d
```
This starts:
- **PostgreSQL 15** on `localhost:5432` (User: `postgres`, Password: `postgres`, DB: `fintech_portal`)
- **pgAdmin 4** on `http://localhost:5050` (User: `admin@prathyusha.edu.in`, Password: `admin`)

### 2. Configure Environment
Verify `.env` has:
```env
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/fintech_portal?schema=public
JWT_SECRET=super-secret-jwt-key-for-fintech-portal-change-in-production-2026
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

### 3. Run Prisma Migrations & Seed
```bash
# Push schema to database
npm run prisma:migrate

# Seed with institutional accounts, sample projects & updates
npm run prisma:seed
```

### 4. Start Development Server
```bash
npm run dev
```
The server will be running at `http://localhost:5000` with API endpoints prefixed at `/api/v1`.

---

## 🔑 Seed User Accounts

All seed accounts are initialized with password: **`ChangeMe123!`**

| Role | Email | Description |
|---|---|---|
| **SUPER_ADMIN** | `superadmin@prathyusha.edu.in` | Complete administrative authority |
| **FACULTY_ADMIN** | `coordinator@prathyusha.edu.in` | Application reviews, verifications & issue release |
| **MENTOR** | `mentor@prathyusha.edu.in` | Weekly update reviews & contribution sign-offs |
| **TEAM_LEAD** | `teamlead@prathyusha.edu.in` | Project management & hackathon outcomes |
| **STUDENT** | `priyan@prathyusha.edu.in` | Student profile (Priyan A), updates, contributions |
| **MAGAZINE_EDITOR** | `editor@prathyusha.edu.in` | Editorial review, article curation & issue creation |
| **MANAGEMENT_VIEWER**| `management@prathyusha.edu.in` | Read-only executive reports & Excel/PDF downloads |

---

## 📡 API Endpoint Reference

### Public Routes
- `GET  /api/v1/public/showcase` — Landing page showcase (projects, consented innovators, verified wins)
- `GET  /api/v1/public/projects` — Approved and public projects
- `GET  /api/v1/public/innovators` — Consented student profiles (omits private IDs)
- `GET  /api/v1/public/achievements` — Verified hackathon achievements
- `GET  /api/v1/public/magazine` — Published magazine issues and articles
- `POST /api/v1/public/apply` — Student membership application submission
- `GET  /api/v1/public/application-status` — Check status by email or ID
- `POST /api/v1/public/application-clarify/:id` — Respond to clarification requests
- `POST /api/v1/auth/login` — Member authentication (returns JWT & role)

### Authenticated Routes (`Authorization: Bearer <token>`)
- `GET  /api/v1/profile/me` — Authenticated user profile and assigned projects
- `PUT  /api/v1/profile/me` — Update bio, skills, interests, portfolio links & public visibility toggle
- `POST /api/v1/profile/change-password` — Secure password update
- `GET  /api/v1/admin/dashboard-metrics` — Management KPI aggregation endpoint *(Section 11)*
- `GET  /api/v1/admin/kpis` — Alias for KPI aggregation endpoint *(Admins & Management)*

### Project & Task Management
- `GET  /api/v1/projects` — List projects (with status/domain filter)
- `POST /api/v1/projects` — Propose/create project *(SUPER_ADMIN, FACULTY_ADMIN, TEAM_LEAD)*
- `GET  /api/v1/projects/:id` — Detailed project with team members, tasks & updates
- `PUT  /api/v1/projects/:id` — Update project metadata *(Admins / Leads)*
- `POST /api/v1/projects/:id/members` — Assign team member *(Admins / Leads)*
- `POST /api/v1/projects/:id/tasks` — Create task *(Admins / Leads)*
- `PUT  /api/v1/tasks/:taskId` — Update task status
- `POST /api/v1/contributions` — Submit contribution log with evidence link
- `PUT  /api/v1/contributions/:id/review` — Verify/reject contribution *(Admins / Mentors)*

### Weekly Progress Tracking
- `POST /api/v1/weekly-updates` — Submit weekly plan/update (Draft or Submitted)
- `GET  /api/v1/weekly-updates/my` — Get logged-in student's update history
- `GET  /api/v1/weekly-updates/project/:projectId` — Project-wide updates
- `GET  /api/v1/weekly-updates/review-queue` — Updates awaiting review *(Admins / Mentors)*
- `POST /api/v1/weekly-updates/:id/review` — Review update (VERIFIED / REVISION_REQUIRED)

### Hackathons & Certification
- `GET  /api/v1/hackathons` — List hackathons
- `POST /api/v1/hackathons` — Register event & team *(Admins / Leads)*
- `GET  /api/v1/hackathons/:id` — Hackathon details & team documents
- `PUT  /api/v1/hackathons/:id/outcomes` — Submit outcomes & prototype URL *(Admins / Leads)*
- `POST /api/v1/hackathons/:id/certificates` — Upload student certificate evidence
- `POST /api/v1/hackathons/:id/verify` — Institutional verification & public release *(Admins)*
- `PUT  /api/v1/certificates/:certId/verify` — Verify document certificate *(Admins)*

### Magazine Editorial
- `POST /api/v1/magazine/articles` — Submit article draft or submission
- `GET  /api/v1/magazine/articles/my` — Student's submitted articles
- `GET  /api/v1/magazine/articles` — Editorial review queue *(Editors / Admins)*
- `PUT  /api/v1/magazine/articles/:id/edit` — Edit status, add notes *(Editors / Admins)*
- `POST /api/v1/magazine/issues` — Create new magazine issue *(Editors / Admins)*
- `POST /api/v1/magazine/issues/:id/publish` — Publish issue & articles *(Admins)*

### Profiles & Data Governance
- `GET   /api/v1/profile/me` — Authenticated user profile and assigned projects
- `PUT   /api/v1/profile/me` — Update bio, skills, interests, portfolio links & public visibility toggle
- `PATCH /api/v1/profile/visibility` — Toggle public innovator visibility *(Section 5.2 & 7.3)*
- `POST  /api/v1/profile/rectification-request` — Submit sensitive record correction or removal request
- `POST  /api/v1/profile/change-password` — Secure password update
- `GET   /api/v1/admin/dashboard-metrics` — Management KPI aggregation endpoint *(Section 11)*
- `GET   /api/v1/admin/kpis` — Alias for KPI aggregation endpoint *(Admins & Management)*

### Protected File & Document Storage Layer (Section 1)
- `GET  /api/v1/documents` — List accessible certificates & documents
- `POST /api/v1/documents/upload` — Securely upload certificate/report (max 5 MB; PDF, PNG, JPG, Markdown)
- `GET  /api/v1/documents/:id/download` — Stream private file (authorized owner, mentor, or admin only)

### Administration & Governance
- `GET  /api/v1/admin/applications` — Applications review queue *(Admins)*
- `POST /api/v1/admin/applications/:id/review` — Approve/Reject application *(Admins)*
  - *Automatic Account Provisioning:* Approving an application automatically creates `UserAccount` and `StudentProfile`, sends dual-channel notification, and logs audit trail.
- `GET  /api/v1/audit-logs` — Immutable audit log trail *(Admins)*

### Management Reports & Exports
- `GET  /api/v1/reports/contributions/export` — Excel export of student contributions
- `GET  /api/v1/reports/hackathons/export` — Excel export of hackathon participation
- `GET  /api/v1/reports/summary/pdf` — PDF summary distinguishing verified vs. unverified metrics

---

## 🧪 Automated Acceptance Test Suite (Section 19)

Run acceptance tests verifying application submission, unauthorized guards, admin approval provisioning, and document protection:
```bash
npm test
```

---

## 💾 Database Backup & Disaster Recovery (Section 18)

### Backup
- **Linux / macOS / Git Bash:**
  ```bash
  chmod +x scripts/db-backup.sh
  ./scripts/db-backup.sh
  ```
- **Windows Command Prompt:**
  ```cmd
  scripts\db-backup.bat
  ```

### Restore
- **Linux / macOS / Git Bash:**
  ```bash
  chmod +x scripts/db-restore.sh
  ./scripts/db-restore.sh ./backups/fintech_portal_backup_YYYYMMDD_HHMMSS.sql
  ```
- **Windows Command Prompt:**
  ```cmd
  scripts\db-restore.bat backups\fintech_portal_backup_YYYYMMDD_HHMMSS.sql
  ```

---

## 🛡️ Security & Privacy Compliance

1. **Private Institutional Identifiers:** `registerNumber` is strictly withheld from all public endpoints.
2. **Selective Public Visibility:** Student profiles are published only when `isPublicVisible === true`.
3. **Verified Output Integrity:** Only `VERIFIED` hackathon outcomes and certificates appear in public showcases.
4. **Audit Trail:** Every approval, status change, review, and publication is written immutably to `AuditLog`.
5. **Dual-Channel Delivery:** In-portal notifications paired with institutional SMTP email alerts.
