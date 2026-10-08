# 💳 Fintech Innovation Team Portal

> A unified digital platform for showcasing student innovation, managing team membership, tracking projects and contributions, monitoring weekly progress, managing hackathons, publishing achievements, and generating institutional reports.

![Status](https://img.shields.io/badge/Status-In%20Development-orange)
![Project](https://img.shields.io/badge/Project-Student%20Innovation%20Portal-blue)
![Domain](https://img.shields.io/badge/Domain-FinTech-green)
![Frontend](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB)
![Backend](https://img.shields.io/badge/Backend-Node.js-339933)
![Database](https://img.shields.io/badge/Database-PostgreSQL%20%2F%20MySQL-336791)

---

## 📌 Architecture Documentation

Comprehensive system and testing architecture specifications have been designed and documented:

- 🏗️ **[Backend System Architecture](docs/backend-architecture.md)**: Clean modular monolith, Hexagonal architecture, RBAC/ABAC access control, BullMQ async worker queues, PostgreSQL relational schema, S3 document security, and audit trails.
- 🧪 **[Testing System Architecture](docs/testing-architecture.md)**: Testing Trophy strategy, ephemeral Testcontainers (PostgreSQL, Redis, MinIO, Mailpit), state machine validation, IDOR/security penetration testing, k6 load testing, and CI/CD quality gates.

---

## 📌 Project Overview

The **Fintech Innovation Team Portal** is a centralized web-based platform designed for students, mentors, faculty coordinators, administrators, management, and public visitors.

The system combines a public-facing innovation showcase with a secure authenticated portal for:

- Student membership & onboarding
- Student profiles (public vs private PII)
- Project management & milestone tracking
- Individual contribution tracking with evidence
- Weekly progress planning & mentor reviews
- Hackathon lifecycle management
- Non-self-verifying certificate verification
- Institutional reports (PDF/Excel generation)
- Monthly digital magazine editorial workflow
- Notifications (in-portal & email)
- Role-based access control & audit trails

---

## 🏗️ Technology Stack

### Frontend
- React 18+ with TypeScript
- CSS3 / Modern Responsive Design
- Semantic HTML5 & Accessibility (WCAG 2.1 AA)

### Backend
- Node.js (v20+ LTS) with TypeScript
- Modular Monolith Architecture
- Zod schema validation & RFC 7807 error format
- PostgreSQL 16+ via Prisma/Drizzle ORM
- Redis 7+ & BullMQ for background workers
- Private S3 / MinIO storage with pre-signed URLs

### Testing
- Vitest / Jest test runner
- Ephemeral PostgreSQL & Redis via Testcontainers
- Supertest for HTTP integration tests
- Playwright for multi-actor E2E workflows
- k6 for stress and concurrency testing
- Stryker for mutation testing
