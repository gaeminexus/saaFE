# Propuesta: Personal Tax Compliance App (Ecuador SRI)

> **Note:** This is an unrelated, standalone product concept — not part of the SAA/ASOPREP-FCPC engagement. It's captured here only because this repo was the working context when the idea was discussed. It borrows architectural lessons from SAA but targets a different audience (general public, multi-tenant SaaS) and a different domain (personal income tax compliance with Ecuador's SRI).

## Goal

A consumer app for individuals earning over ~$12k/year (Ecuador's SRI reporting threshold) to track income and expenses throughout the year, and at year-end automatically prepare (not auto-submit) their tax declaration — computing the right values for Formulario 102/102A or RIMPE, applying SRI's personal-deduction categories and caps, and guiding the user through filing in SRI's own portal.

Two scope decisions made up front:
- **Multi-tenant product** for unrelated users, not a single-user personal tool — so it needs real auth, per-tenant data isolation, and consumer-grade security (SAA's known auth gaps are a explicit non-goal to repeat).
- **Auto-prepare only, not auto-submit.** SRI does not expose a public API for individuals to submit declarations. Final filing happens in SRI's own portal; the app's job ends at "here are the exact numbers, enter them here." Browser-automation submission is deliberately out of initial scope (see Phase 5).

## Architecture

| Layer | Choice | Why |
|---|---|---|
| Frontend | Angular + Angular Material, packaged with Capacitor for mobile | Reuses the team's existing Angular skillset; consumer app needs to be phone-first for receipt capture |
| Backend | Quarkus | Same JPA/JAX-RS/CDI mental model as SAA's Jakarta EE stack, but cloud-native and built for multi-tenant SaaS rather than a single WildFly deployment. See "Quarkus vs. Jakarta EE" below. |
| Database | PostgreSQL | Oracle's per-core licensing model fits one enterprise client paying for their own instance (SAA's actual situation) — it doesn't fit a vendor bearing DB cost across many unrelated public users. Postgres has everything this domain needs (JPA/Hibernate, JSONB, full-text search) with no license cost. |
| Auth | Self-hosted Keycloak (OIDC, JWT access+refresh, MFA) | Free forever, and directly fixes SAA's biggest flaw: no real server-side session tokens today. Avoided a paid managed provider (Auth0/Okta) since their per-MAU pricing gets expensive fast for a public consumer app. |
| Multi-tenancy | `tenant_id`/row-level security in Postgres | Simpler than SAA's implicit single-org model; needed since this app serves many independent users, not one client org. |

### Quarkus vs. Jakarta EE — learning curve for an expert

Carries over almost unchanged: JAX-RS annotations, JPA/Hibernate mapping and JPQL, CDI (`@Inject`, scopes), Bean Validation.

Genuinely different:
1. **No EJB** — `@Stateless`/`@Singleton` don't exist; replaced by CDI scopes + `@Transactional`. Mechanical but non-trivial at volume (SAA has ~688 EJBs).
2. **Build-time CDI (ArC)** — the bean graph resolves at build time, not runtime; some dynamic/reflection-heavy CDI tricks behave differently.
3. **Extensions instead of app-server modules** — Maven/Gradle extensions + `application.properties` config instead of WildFly's `standalone.xml`.
4. **Dev mode** (`quarkus:dev`) with live reload — new, faster workflow.
5. **Native image (GraalVM)** is optional — skip initially; only matters for sub-100ms cold starts, not needed for a typical web backend.

Estimate: a working REST+JPA+CDI service within a day or two; comfortable/idiomatic Quarkus within one to two weeks of regular use.

### Tooling cost summary

Fully free at any scale: Angular, Angular Material, Capacitor, Quarkus, PostgreSQL, Hibernate/JAX-RS/CDI, GraalVM Community Edition, Keycloak (self-hosted), SRI's public comprobantes lookup service.

Costs money: cloud hosting (compute/storage/bandwidth — unavoidable for any hosted SaaS), and optionally a paid OCR API (Google Vision/AWS Textract) if free/self-hosted Tesseract accuracy proves insufficient (see P2-15).

### Compliance note

This app handles PII/financial data for the general public, which brings Ecuador's LOPDP (data protection law) into scope in a way SAA's internal single-client tool never had to address — consent, retention, and deletion flows need to be designed in from Phase 0, not bolted on later.

## Domain model

- Two ledgers: `ingreso` and `gasto`, each tagged to SRI categories.
- Income types: relación de dependencia, honorarios/servicios profesionales, arriendo, rentas de capital.
- Expense categories (with yearly caps): vivienda, salud, educación, alimentación, vestimenta.
- Yearly-versioned config tables for caps/rates and tax brackets — SRI updates these annually, so they must be data, not hardcoded constants.
- Regime detection: RIMPE emprendedor/negocio popular vs. régimen general, since it changes which form and rules apply.
- Electronic invoice lookups via SRI's public clave-de-acceso service — the one piece of "automatic" that's genuinely feasible via API, distinct from filing itself.

## Phased Build Plan

### Phase 0 — Foundations (2-4 weeks)

Get the skeleton right before any tax-specific feature work.

- Quarkus backend scaffold, Angular + Capacitor frontend scaffold, Postgres with `tenant_id`-based row-level security
- Self-hosted Keycloak: real OIDC, JWT access+refresh tokens, MFA
- Containerized deploy pipeline (CI/CD)
- LOPDP-compliant basics: consent flow, data retention/deletion policy, encryption at rest

**Exit criteria:** a user can sign up, log in with a real session, and see an empty dashboard securely.

### Phase 1 — Manual Tracking + SRI Classifier (4-6 weeks)

Core value with zero external dependencies — validate the domain model before adding integrations.

**Data model**
- P1-01 *(M)* Design core schema — `usuario`, `ingreso`, `gasto`, `categoria_sri`, `config_anual_sri`, all ledger rows carrying `tenant_id`/`usuario_id` and `anio_fiscal`.
- P1-02 *(S)* Seed `categoria_sri` reference data (vivienda, salud, educación, alimentación, vestimenta; relación de dependencia, honorarios, arriendo, capital).
- P1-03 *(S)* Seed `config_anual_sri` — per-year deduction caps and fracción básica desgravada, structured so a new year is a new row, not a code change.

**Backend (Quarkus)**
- P1-04 *(M)* `IngresoResource` — CRUD REST endpoints, scoped to authenticated user, validated against `categoria_sri`.
- P1-05 *(M)* `GastoResource` — same CRUD pattern, plus flagging (not enforcing) cap warnings.
- P1-06 *(M)* `ResumenAnualResource` — aggregate a user's ingresos/gastos by category for a given fiscal year.
- P1-07 *(S)* Tenant/user scoping enforcement — verify every query filters by the authenticated principal's `usuario_id` from the JWT, not a trusted request param. (Directly addresses the class of bug SAA's review flagged.)
- P1-08 *(S)* Input validation & error handling — no negative amounts, no future-dated entries, fiscal-year bounds.

**Frontend (Angular)**
- P1-09 *(M)* Auth-gated dashboard shell showing current fiscal-year totals.
- P1-10 *(S)* Ingreso entry form.
- P1-11 *(S)* Gasto entry form with category-specific hint text.
- P1-12 *(M)* Ledger history/list view — paginated, filterable, editable.
- P1-13 *(M)* Yearly summary screen consuming `ResumenAnualResource`.
- P1-14 *(S)* Responsive/mobile layout pass — phone-first, one-handed entry.

**QA / cross-cutting**
- P1-15 *(M)* Multi-tenant isolation test — prove User A can never read/write User B's data, even via crafted requests.
- P1-16 *(S)* Fiscal-year rollover test.
- P1-17 *(S)* Seed-data update runbook — how to add next year's `config_anual_sri` row without a code deploy.

**Sequencing note:** P1-07 and P1-15 (tenant isolation) should be done first, not last.

### Phase 2 — Automatic Invoice Capture (4-6 weeks)

**Capture & OCR**
- P2-01 *(M)* Camera capture UI (Capacitor camera plugin), retake option, basic image-quality check.
- P2-02 *(M)* OCR pipeline — self-hosted Tesseract, extracts raw text from the receipt image.
- P2-03 *(M)* Clave-de-acceso extraction — parse the 49-digit access key out of noisy OCR text, tolerant of OCR errors.
- P2-04 *(S)* Manual fallback entry — type/paste the code, or fully hand-enter a non-electronic receipt.

**SRI integration**
- P2-05 *(M)* SRI comprobantes electrónicos client — look up an invoice by clave de acceso.
- P2-06 *(S)* Response mapping — normalize SRI's schema into the internal `gasto`/`ingreso` model.
- P2-07 *(M)* Caching + resilience — cache lookups, degrade to manual entry on SRI timeout/downtime rather than blocking the user.
- P2-08 *(S)* Duplicate detection — unique constraint on (usuario, clave de acceso).

**Auto-categorization**
- P2-09 *(S)* Merchant → category seed mapping.
- P2-10 *(M)* Low-confidence review prompt — ask the user to confirm category when the merchant isn't recognized.
- P2-11 *(S)* Per-user override memory — remember a user's category corrections going forward.

**Bank reconciliation**
- P2-12 *(M)* Bank statement import (CSV/OFX), conceptually reusing the extracto-bancario upload pattern from TSR.
- P2-13 *(L)* Transaction-matching engine — match bank transactions to ledger entries by amount+date proximity, flag unmatched ones.
- P2-14 *(M)* Unmatched-transaction review screen — one-click convert to a new ledger entry.

**QA**
- P2-15 *(M)* OCR accuracy benchmark — real Ecuadorian facturas test set; the go/no-go data for Phase 5's paid OCR decision.
- P2-16 *(S)* SRI outage resilience test.
- P2-17 *(S)* Upload security review — validate/sanitize uploaded images (file type, size caps, no arbitrary path handling). Directly relevant given the unauthenticated file-handling vulnerability found in SAA's `FileRest`/`FileServiceImpl` — don't repeat that pattern.

**Sequencing note:** build the SRI client (P2-05/06/07) before the OCR/camera work — it's the higher-risk unknown.

### Phase 3 — Tax Computation Engine (3-5 weeks)

**Regime detection**
- P3-01 *(M)* Regime classification rules engine (RIMPE emprendedor/negocio popular vs. régimen general).
- P3-02 *(S)* Regime override UI for edge cases.

**Deduction cap enforcement**
- P3-03 *(M)* Cap enforcement engine using `config_anual_sri`.
- P3-04 *(M)* Real-time cap-usage UI — running total vs. cap per category as the user enters gastos.
- P3-05 *(S)* Fracción básica desgravada calculation.

**Formulario computation**
- P3-06 *(L)* Formulario 102 module (régimen general / relación de dependencia).
- P3-07 *(L)* Formulario 102A module (honorarios/servicios profesionales, other income).
- P3-08 *(M)* RIMPE calculation module.
- P3-09 *(S)* Progressive tax bracket seed data, versioned like `config_anual_sri`.
- P3-10 *(M)* Validation against SRI's published worked examples — confirm the engine's output before trusting it with real filings.

**Deadlines & reminders**
- P3-11 *(S)* Filing calendar by 9th digit of cédula/RUC.
- P3-12 *(M)* Reminder notifications (push/email).
- P3-13 *(S)* Notification preferences UI.

**QA**
- P3-14 *(M)* Yearly-update regression suite — next year's rate change must not silently break prior-year archived calculations.
- P3-15 *(M)* Edge-case testing — multiple income sources, mid-year regime change, partial-year residency.

**Dependency note:** Phase 3 can't start meaningfully until Phase 1's `config_anual_sri` structure is solid.

### Phase 4 — Filing-Ready Output (2-3 weeks)

**PDF/summary generation**
- P4-01 *(M)* PDF generation service — render computed values into a downloadable summary.
- P4-02 *(S)* Field-mapping data — map each computed value to its exact SRI portal field, maintained as data since SRI changes their portal periodically.
- P4-03 *(S)* Downloadable summary screen.

**Guided walkthrough**
- P4-04 *(M)* Step-by-step filing guide UI driven by the field-mapping data.
- P4-05 *(M)* Annotated SRI portal reference content (screenshots/instructions).
- P4-06 *(S)* "Mark as filed" archive step — locks the year's data read-only.

**QA**
- P4-07 *(M)* End-to-end walkthrough validation with a real (test) SRI account.
- P4-08 *(S)* Content-update runbook for when SRI changes their portal UI.

**Dependency note:** Phase 4 depends on Phase 3's calculation engine being validated (P3-10) first.

### Phase 5 — Optional/Future (gated, not committed)

- P5-01 *(S, external)* Legal review of SRI's ToS regarding automation — blocks P5-03 entirely.
- P5-02 *(M)* Paid OCR API evaluation (Google Vision/AWS Textract) — only if P2-15's benchmark shows Tesseract's accuracy is inadequate.
- P5-03 *(L, high risk of being throwaway)* Browser-automation submission prototype — isolated spike only, never merged into the main product until P5-01 clears it and the prototype proves durable against portal changes.

## Summary

~60 tickets across Phases 0-4, roughly 4-5 months for a small team before considering Phase 5. Each phase ships something independently usable — Phase 1 alone is already a working expense tracker even before any SRI integration exists.
