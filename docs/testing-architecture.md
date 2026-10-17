# 🧪 Testing System Architecture: Fintech Innovation Team Portal

## 1. Testing Philosophy & Strategy

The **Fintech Innovation Team Portal** is characterized by complex business state machines (onboarding, weekly reports, editorial workflows), strict non-self-verification policies, multi-tiered role permissions (RBAC/ABAC), and confidential student PII.

A standard "unit test only" approach is insufficient. The testing architecture follows the **Testing Trophy** philosophy, prioritizing integration and end-to-end workflow tests where security boundaries, database transactions, and role transitions interact.

```
          / \
         / E2E \           (10% - Critical Multi-Actor User Journeys)
        /-------\
       / Integration \     (50% - API + Database + Redis + State Machines)
      /---------------\
     /   Component /   \   (20% - Service orchestration & isolated modules)
    /     Contract      \
   /---------------------\
  /         Unit          \ (20% - Pure domain logic, state rules, math, Zod)
 /-------------------------\
```

---

## 2. Testing Architecture Diagram

```mermaid
graph TB
    subgraph Test Runners & Harness
        Vitest[Vitest / Jest Test Runner]
        Playwright[Playwright E2E Runner]
        K6[k6 Performance Harness]
        Stryker[Stryker Mutation Engine]
    end

    subgraph Ephemeral Environment Layer [Testcontainers]
        PG_Test[(PostgreSQL Testcontainer - Fresh DB / Schema)]
        Redis_Test[(Redis Testcontainer - Queues & Caching)]
        MinIO_Test[(MinIO Testcontainer - S3 Mock)]
        MailHog[(Mailpit / MailHog - Mock SMTP Server)]
    end

    subgraph Test Execution Layers
        L1[Unit Tests: Domain Models, Rules, Zod Schemas]
        L2[Integration Tests: Controllers, Repositories, Prisma Transactions]
        L3[Security & IDOR Tests: RBAC / ABAC Guards & Policy Enforcement]
        L4[E2E Workflow Tests: Multi-Actor State Machine Pipelines]
        L5[Load & Stress Tests: Report Generation & Concurrency]
    end

    subgraph CI/CD Quality Gates [GitHub Actions]
        Lint[ESLint & TypeScript Typecheck]
        UnitRun[Fast Unit Test Suite]
        IntegRun[Integration Test Suite with Containers]
        SecScan[Trivy & OWASP ZAP & SonarQube]
        Mutate[Mutation Score > 80%]
        ReportGen[Allure Test Reports & Coverage Artifacts]
    end

    Vitest --> L1 & L2 & L3
    Playwright --> L4
    K6 --> L5
    L2 & L3 & L4 --> PG_Test & Redis_Test & MinIO_Test & MailHog
    L1 & L2 & L3 & L4 & L5 --> CI/CD Quality Gates
```

---

## 3. Test Classification & Scope

### 3.1. Layer 1: Unit Testing (Fast, Isolated, Zero I/O)
- **Target**: Pure functions, mathematical aggregations, state transition matrices, Zod validation schemas.
- **Execution Speed**: < 15ms per test.
- **Key Suites**:
  - `weekly-update.state-machine.spec.ts`: Asserts valid state transitions (`Draft -> Submitted`, `Under Review -> Revision Required`) and prevents invalid ones (e.g. `Draft -> Verified` must throw `InvalidStateTransitionException`).
  - `certificate-verification-policy.spec.ts`: Asserts `canVerifyCertificate(verifierId, certificate)` returns `false` if `verifierId === certificate.uploadedByUserId`.
  - `zod-schemas.spec.ts`: Enforces institutional email format (`@college.edu`), password entropy, phone sanitization, and register number regex.

### 3.2. Layer 2: Integration Testing (Real DB & Services)
- **Target**: REST Controllers, Services, Repositories, Prisma Transactions, Redis Caching.
- **Environment**: Managed automatically via **Testcontainers** (ephemeral PostgreSQL and Redis spun up in Docker per test runner, guaranteed isolated state).
- **Transactional Rollback Strategy**: Each test runs inside a database transaction (`BEGIN ... ROLLBACK`) or uses truncated tables between suites to ensure absolute test isolation.
- **Key Suites**:
  - `application.service.int-spec.ts`: Submits an application, triggers admin approval, checks user creation, verifies welcome email queued in Redis BullMQ.
  - `contribution.repository.int-spec.ts`: Verifies JSONB evidence storage, complex filtering queries, and pagination indexes.
  - `report-aggregator.int-spec.ts`: Seeds 100 student records with varied weekly statuses and verifies statistical aggregations match exact calculations.

### 3.3. Layer 3: Security, RBAC & IDOR Testing
- **Target**: Middleware, Guards, Interceptors, Output Serializers.
- **Key Suites**:
  - **RBAC Matrix Test**: Programmatically iterates over all registered API routes against all 8 system roles to ensure no unauthorized endpoint access (`403 Forbidden` / `401 Unauthorized`).
  - **IDOR / BOLA (Insecure Direct Object Reference) Test**:
    - Student A attempts `GET /api/v1/weekly-updates/{studentB_update_id}` ➔ Must return `403 Forbidden` or `404 Not Found`.
    - Student A attempts `PATCH /api/v1/users/{studentB_id}/profile` ➔ Must return `403 Forbidden`.
    - Team Lead attempts `PATCH /api/v1/certificates/{id}/verify` on their own team ➔ Must return `403 Forbidden`.
  - **PII Leakage Prevention Test**:
    - Hits `GET /api/v1/public/innovators` and asserts payload schema has **no** occurrences of `registerNumber`, `personalEmail`, `phoneNumber`, or internal review notes.

### 3.4. Layer 4: Multi-Actor Workflow End-to-End (E2E) Testing
Multi-actor workflows simulate the asynchronous collaboration of different roles in the portal:

#### Workflow Scenario A: Student Onboarding to Active Contributor
```
[Actor: Student Applicant]
1. POST /api/v1/applications -> Returns 201 (Status: Pending)
   [System]
2. Asserts Admin notification created in DB

[Actor: Faculty Coordinator / Admin]
3. GET /api/v1/applications?status=Pending -> Sees new application
4. PATCH /api/v1/applications/:id/status (Action: Approved)
   [System]
5. Asserts User Account created, Password Setup token generated, Email dispatched

[Actor: Newly Activated Student]
6. POST /api/v1/auth/setup-password -> Sets password
7. POST /api/v1/auth/login -> Receives JWT
8. GET /api/v1/users/me -> Profile shows Role: Student, Status: Active
```

#### Workflow Scenario B: Weekly Planning, Revision & Verification Loop
```
[Actor: Student]
1. POST /api/v1/weekly-updates (Draft) -> Saved
2. PUT /api/v1/weekly-updates/:id/submit -> Status: Submitted

[Actor: Assigned Mentor]
3. GET /api/v1/weekly-updates/mentor-queue -> Item appears
4. POST /api/v1/weekly-updates/:id/reviews (Verdict: Revision Required, Feedback: "Include GitHub PR link")
   [System]
5. Status changes to Revision Required; Student notified

[Actor: Student]
6. PUT /api/v1/weekly-updates/:id/resubmit (Adds GitHub PR link) -> Status: Submitted

[Actor: Assigned Mentor]
7. POST /api/v1/weekly-updates/:id/reviews (Verdict: Verified)
   [System]
8. Status changes to Verified; immutable audit log recorded
```

#### Workflow Scenario C: Non-Self-Verifying Certificate Pipeline
```
[Actor: Team Lead]
1. POST /api/v1/hackathons/:id/certificates (Uploads on behalf of Team Member X)
   [System]
2. Certificate created with uploaded_by_id = Team Lead ID, Status: Pending_Verification

[Actor: Team Lead (Adversarial Step)]
3. PATCH /api/v1/certificates/:certId/verify -> FAILS with 403 Forbidden ("Self-verification forbidden")

[Actor: Faculty Coordinator]
4. PATCH /api/v1/certificates/:certId/verify -> SUCCEEDS (Status: Verified, Verification Hash issued)

[Actor: Public Visitor]
5. GET /api/v1/public/verify-certificate/:hash -> Returns 200 OK with valid authenticity badge
```

### 3.5. Layer 5: Performance, Concurrency & Load Testing (k6)
- **Scenarios**:
  1. **Public Showcase High Concurrency**: 500 Virtual Users (VUs) browsing `/api/v1/public/projects` and `/api/v1/public/magazine`. Target: p95 latency < 150ms.
  2. **Concurrent Weekly Submission Rush**: 200 students submitting weekly progress updates simultaneously at the Sunday deadline (23:50 UTC). Asserts zero deadlocks, zero lost updates (`409 Conflict` handled with retry), queue absorption in Redis.
  3. **Bulk Institutional Report Generation**: 20 coordinators requesting institutional PDF/Excel reports simultaneously. Asserts workers queue properly without OOM crashes on the Node.js API server.

---

## 4. Test Data Management & Fixture Architecture

To ensure deterministic, reproducible test runs, the framework utilizes **Type-Safe Factory Builders** and **Database Seeding Fixtures**.

```typescript
// Example: Test Factory Pattern (src/test/factories/student.factory.ts)
import { faker } from '@faker-js/faker';
import { prisma } from '../test-client';

export const createTestStudent = async (overrides = {}) => {
  return await prisma.user.create({
    data: {
      email: faker.internet.email({ provider: 'college.edu' }),
      passwordHash: '$2b$10$e8w.mockhashedpassword',
      role: 'STUDENT',
      status: 'ACTIVE',
      studentProfile: {
        create: {
          registerNumber: `REG${faker.number.int({ min: 100000, max: 999999 })}`,
          fullName: faker.person.fullName(),
          displayName: faker.person.firstName(),
          department: 'Computer Science',
          yearOfStudy: 3,
          skills: ['React', 'TypeScript', 'Solidity'],
          fintechInterests: ['AI in Finance', 'Blockchain'],
          publicConsent: true,
          ...overrides,
        },
      },
    },
    include: { studentProfile: true },
  });
};
```

---

## 5. Mocking Strategy & Boundaries

| Component | Test Environment Strategy | Rationale |
|---|---|---|
| **Database (PostgreSQL)** | Real ephemeral database via **Testcontainers** | Mocking ORM/SQL hides schema constraint violations, transactional rollbacks, and indexing failures. |
| **Cache & Queue (Redis)** | Real ephemeral Redis via **Testcontainers** | Verifies BullMQ queue mechanics, atomic locks, and Redis TTL expiration. |
| **Object Storage (S3)** | Real S3 API via **MinIO Testcontainer** | Verifies pre-signed URL signatures, binary uploads, and bucket ACLs without AWS cost or internet dependency. |
| **Email Service (SMTP)** | Real local SMTP via **Mailpit / MailHog container** | Intercepts all sent activation/alert emails; tests subject and HTML link contents via HTTP API. |
| **PDF Engine (Puppeteer)** | Mocked in unit/integration; Real in specific worker integration test | Chromium generation is CPU-heavy; test HTML template rendering separately from PDF binary generation. |
| **ClamAV Antivirus** | Mock daemon in standard CI; real container in nightly security run | Validates file quarantine flow without overhead on every PR. |

---

## 6. Continuous Integration (CI) Pipeline & Quality Gates

### CI Pipeline Architecture (GitHub Actions)

```mermaid
graph LR
    Push[Push / Pull Request] --> Stage1[Stage 1: Lint & Typecheck]
    Stage1 --> Stage2[Stage 2: Fast Unit Tests]
    Stage2 --> Stage3[Stage 3: Integration Tests + Containers]
    Stage3 --> Stage4[Stage 4: Security Scans & E2E Workflows]
    Stage4 --> Stage5[Stage 5: Quality Gate Evaluation]

    subgraph Quality Gates
        Gate1[Coverage: Domain > 90%, Overall > 80%]
        Gate2[Mutation Score: Stryker > 75%]
        Gate3[Security: 0 High/Critical Vulnerabilities]
        Gate4[E2E: 100% Pass Rate]
    end

    Stage5 --> Quality Gates
```

### CI Quality Gates Matrix
1. **Static Analysis**: ESLint 0 warnings, TypeScript strict mode 0 errors.
2. **Code Coverage Targets**:
   - `domain/` (Entities, State Machines, Policies): **> 90% branch coverage**.
   - `services/` (Application Use Cases): **> 85% branch coverage**.
   - `controllers/` & `dtos/`: **> 80% line coverage**.
3. **Mutation Testing (Stryker)**:
   - Verifies test quality by injecting bugs (mutants). Mutation score threshold: **>= 75%** on domain logic.
4. **Security Analysis (SAST & DAST)**:
   - SonarQube quality gate: Passed.
   - Trivy container scan: 0 critical/high CVEs.
   - Snyk / npm audit: 0 high vulnerabilities in dependencies.

---

## 7. Traceability Matrix: Requirements to Test Suites

| Requirement Section | Business Invariant | Automated Test Suite | Test Type |
|---|---|---|---|
| **Student Registration** | Only institutional email allowed, duplicates rejected | `applications.controller.spec.ts` | Integration |
| **Admin Approval** | Admin can approve/reject; creates student account | `onboarding-flow.e2e-spec.ts` | E2E |
| **Student Profile** | Student can edit own bio; cannot edit other profiles | `profile-authorization.guard.spec.ts` | Security / RBAC |
| **Weekly Updates** | Workflow: Draft ➔ Submit ➔ Mentor Review ➔ Verified | `weekly-progress.e2e-spec.ts` | E2E |
| **Mentor Review** | Mentor only reviews assigned students/teams | `mentor-assignment.policy.spec.ts` | Integration / ABAC |
| **Certificate Verification** | Team lead cannot self-verify uploaded certificate | `certificate-anti-tamper.spec.ts` | Unit / Security |
| **Public Visibility** | Private student PII strictly masked without consent | `public-data-sanitization.spec.ts` | Integration |
| **Institutional Reports** | Multi-filter aggregations consistent across date ranges | `report-generation.worker.spec.ts` | Integration |
| **Audit Logs** | All state changes record Actor, Action, Target, Timestamp | `audit-trail.interceptor.spec.ts` | Integration |
