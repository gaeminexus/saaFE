# SAA System — Architecture & Code Review

**Prepared for:** GAEMI NEXUS S.A.S. development team
**Client system:** SAA (Sistema de Administración/Ahorro) — ASOPREP-FCPC
**Date:** July 28, 2026
**Scope:** `saaBE` (backend, `C:\work\saaBE\saaBE`) and `saaFE` (frontend, `C:\work\saaFE\v1\saaFE`)
**Method:** Direct code inspection (not documentation-only) across both repositories — every claim below cites a file and line so it can be independently verified. Findings are separated into "confirmed by reading code" vs. "inferred from docs" wherever relevant.

---

## 1. Executive Summary

SAA is a mature, full-stack enterprise accounting/finance system: a Jakarta EE 10 backend (336 JPA entities, 330 REST endpoints across 8 modules) and an Angular 20 frontend (196 screen components across 9 modules), covering accounting, treasury, loans/member contributions, receivables, payables, payroll, and SRI electronic-invoicing compliance for an Ecuadorian financial institution.

The architecture is **consistent and disciplined at the structural level**: both repos mirror the same module boundaries, both use a uniform layered pattern, and a strict 4-letter DB naming convention holds across 336 entities and 8 schemas without exception. The team has clearly delivered a large amount of working functionality quickly — the module-completion figures in the client-facing `ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md` were independently verified against actual component counts and are accurate, not inflated.

However, that same "one entity → one hand-rolled REST/Service/DAO/Angular-service quartet, repeated ~330 times" pattern is also the root cause of most of the weaknesses below. **Correction (verified 2026-07-28 via direct code read, flagged by the team):** this doesn't hold uniformly across all four layers. The **DAO layer** does have a real, shared generic base class (`EntityDao<T>`/`EntityDaoImpl<T>`, see H14) that implements all query/CRUD logic exactly once — a fix there propagates automatically to all ~330 entities. The **Service layer** (shares only a generic *interface*, `EntityService<T>`, with no shared implementation), the **REST layer**, and the **Angular frontend services** genuinely lack any shared abstraction, and in those three layers **every fix to error handling, logging, or security has to be applied to hundreds of files individually**. Combined with **zero automated tests on both repositories** and **no CI pipeline**, the system currently has no safety net to catch regressions when those fixes are made.

**The most urgent finding is a security one, not a style one:** the backend's file-handling REST endpoint (`FileRest.java` / `FileServiceImpl.java`) accepts raw, unauthenticated, client-supplied file paths for download, delete, and directory listing, with no path containment check — this is an exploitable arbitrary file read/delete vulnerability reachable by anyone who can reach the API, independent of anything the Angular app does. It sits alongside a broader finding that **the backend does not independently enforce authentication on any of its ~330 endpoints** — login never issues a real credential, and the frontend's own "session" is a literal string that is never sent back on subsequent requests. This combination should be treated as a pre-production blocker, not a backlog item.

Section 5 turns these findings into a prioritized, incremental action plan that respects what's already built and already committed to the client (per the scope note in `ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md` §7) rather than proposing a rewrite.

---

## 2. System Overview

### 2.1 Two repositories, one system

| | Backend — `saaBE` | Frontend — `saaFE` |
|---|---|---|
| Path | `C:\work\saaBE\saaBE` | `C:\work\saaFE\v1\saaFE` |
| Stack | Java 21, Jakarta EE 10, WildFly, EJB 4.0, JPA, JAX-RS | Angular 20 (standalone components), Angular Material 20, TypeScript 5.9 (strict) |
| Packaging | Maven → WAR | Angular CLI → static bundle |
| DB | Oracle (local dev: Oracle 23ai via `docker-compose.yml`) | — (consumes REST) |
| Reporting | JasperReports 7.0.3 + Apache POI | jsPDF (client-side export) |
| Size | 336 JPA entities, 330 REST classes, ~688 `@Stateless` EJBs | 219 components, 340 services, 196 routed screens |
| Automated tests | **None** (`src/test` does not exist) | **Scaffolding only** — 286 spec files, 82.5% are default `toBeTruthy()` stubs |
| CI/CD | None found | None found |

Both repositories independently organize code by the same business domains, which is a real strength for onboarding and cross-team communication:

`CRD` (créditos/loans & member contributions) · `CNT` (contabilidad/accounting) · `CXC` (cuentas por cobrar/receivables) · `CXP` (cuentas por pagar/payables) · `TSR` (tesorería/treasury) · `RHH`/`RRH` (recursos humanos/HR — note the naming inconsistency, backend uses `rhh`, frontend uses `rrh`) · `SCP`/`BASICO` (core: company, users, catalogs) · `ASOPREP` (integration with the Petrocomercial payroll/contributions system, backend only — the frontend module has no UI components, only shared services).

### 2.2 Layering

Both sides follow a clean, consistent layered flow:

```
Angular component → Angular service (HTTP) → JAX-RS REST endpoint → EJB Service → EJB DAO → JPA Entity → Oracle
```

This is documented accurately in both `ALCANCE-SISTEMA.md` (frontend) and `docs/general/ARQUITECTURA_SISTEMA.md` (backend), and matches what the code review agents confirmed by direct inspection.

### 2.3 Documentation quality note

Both repos are unusually well-documented for a project of this size — `saaFE/docs/` and `saaBE/docs/` together hold dozens of dated planning, standards, and status documents, which is itself worth recognizing as a team practice. That said, a few of these documents have drifted from the current code and should be refreshed (see §4.4 "Documentation drift").

---

## 3. Strengths

These are genuine, code-verified positives — not boilerplate praise:

1. **Disciplined, uniform DB naming convention.** Every one of 336 entities across 8 schemas (`CRD`, `CNT`, `CBR`, `PGS`, `TSR`, `RHH`, `RPR`, `SCP`) follows the 4-letter table/column code standard without exception. This kind of consistency at scale is rare and makes cross-module SQL/debugging much easier than it would otherwise be.
2. **Correct, disciplined use of container-managed transactions.** Of ~688 `@Stateless` EJBs, only 8 explicitly override the default transaction attribute, and every override is in exactly the right place: report generation/cleanup and signature processing use `REQUIRES_NEW` so failures there don't roll back the caller; the TSR bank-reconciliation matcher and the ASOPREP Petro import pipeline — the two genuinely complex multi-step batch processes in the system — use explicit `REQUIRED` batching. This is the correct instinct applied only where it's actually needed.
3. **A real domain exception type exists and is used.** `IncomeException` (337 uses) cleanly separates business-rule violations from technical exceptions at the service layer — the modeling is sound even though the REST layer currently discards the distinction (§4.3).
4. **The reporting module shows what "done right" looks like elsewhere.** `ReporteServiceImpl.java` is the only part of the backend using a real logging framework (`java.util.logging`) with proper severity levels, and a recent refactor of the ASOPREP import path explicitly replaced `selectAll()`-then-filter-in-memory with targeted queries, with a comment documenting the performance reasoning. This shows the team is capable of the more disciplined pattern when it's applied — the gap is consistency, not knowledge.
5. **Near-complete, disciplined Angular 20 standalone-component migration.** 216 of 219 components use `standalone: true`; only 2 legacy `@NgModule` files remain in the whole tree.
6. **`FuncionesDatosService.convertirFechaDesdeBackend()`** is a genuinely well-built shared utility that correctly normalizes three different serializations of Java `LocalDateTime` (array, string, native `Date`) including nanosecond conversion and 0-based-month adjustment — exactly the kind of shared abstraction the rest of the codebase would benefit from having more of.
7. **The delivered functionality is real and matches what's claimed.** Independently counting component files against `ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md`'s per-module figures (CNT 26, CRD 46, CXC 17, CXP 13, TSR 49, RHH 38 = 196 total) produced an **exact match**. The claimed module-completion progress since the January 2026 report is not marketing — it's verifiable in the code.
8. **Stored-procedure and JPQL value binding is done correctly** everywhere it was sampled (login, password validation, permission checks) — real SQL injection via bound *values* was not found anywhere in the sampled code.

---

## 4. Weaknesses

Ordered by severity/urgency, not by module.

### 4.1 Critical — Security (recommend addressing before any further production exposure)

**F1. Unauthenticated arbitrary file read / delete / directory listing.**
`saaBE/src/main/java/com/saa/ws/rest/files/FileRest.java` (`downloadFile` line 130, `deleteFile` line 172, `listFiles` line 208, `getFileInfo` line 235, `uploadFileCustomPath` line 83) all accept a raw, client-supplied file path with no authentication check. The implementation, `FileServiceImpl.java` (lines 58-163), calls `Paths.get(filePath)` directly with no canonicalization or base-directory containment check. **Concrete impact:** any caller who can reach the API — no login required — can read arbitrary files the app-server process can access, enumerate directories, and delete arbitrary files. This is the single highest-severity, most concretely exploitable finding in this review.

**F2. No server-side authentication/authorization exists on any endpoint.**
`saaBE` has zero uses of `@RolesAllowed`, `@PermitAll`, or any `ContainerRequestFilter` anywhere in 330 REST classes; there is no `web.xml`; `beans.xml` is empty. Login (`UsuarioRest.java:83-103`) is a one-shot credential check that returns a plain success/error string — no session, no token is issued. On the frontend, that response is then stored verbatim as `token` in `sessionStorage`/`localStorage` (`login.component.ts:154-155`), meaning **`token` literally equals the string `"OK"` for every user**. That value is never attached to any subsequent HTTP request (confirmed by a repo-wide grep for `Authorization`/`Bearer`/`withCredentials` — zero matches). **Net effect: every one of the ~330 backend endpoints across all modules — payments, payroll, accounting entries — is reachable by anyone who can route a request to the app server, regardless of what the Angular login screen shows.**

**F3. Login sends the password in a GET URL, not a POST body.**
`saaFE/src/app/shared/services/usuario.service.ts:90-94` builds `GET /rest/usro/validaUsuario/{idUsuario}/{clave}`. Plaintext passwords in a URL are written to server access logs, browser history, and any intermediate proxy/CDN logs.

**F4. CORS is configured as wildcard origin *with* credentials enabled simultaneously.**
`saaBE/config/standalone-cors.cli/standalone-cors.cli:7,10` — `Access-Control-Allow-Origin: *` together with `Access-Control-Allow-Credentials: true`. The file's own comment acknowledges this needs to change for production, but ships as the reference config.

**F5. Deployment credentials committed in plaintext.**
`saaBE/pom.xml:218-220` hardcodes WildFly management-console credentials (`gaemi`/`nexus`) for the Maven deploy plugin. Should move to `settings.xml` server credentials or a CI secret.

*(F1–F5 compound each other: because F2 means nothing is authenticated, F1's file endpoints, and every financial-write endpoint, are open to anyone who can reach the network path to the app server. Fixing F2 with a real, enforced session token would substantially reduce the blast radius of F1 even before F1 itself is patched.)*

### 4.2 High — Data integrity & correctness

**F6. Five confirmed, still-present silent-failure bugs in the CRD (loans/contributions) module**, independently re-verified in this review at the exact lines from the earlier `docs/crd/CRD-CODE-REVIEW-2026-07-24.md`:
- `cruce-valores.component.ts:769-782` — payment persistence call is commented out; success message fires anyway.
- `proceso-pago-jubilados.component.ts:386-410` — "process payment" is a pure 5-second UI countdown timer with no backend call, ending in a fake success message.
- `detalle-consulta-carga.component.ts:1991-1993` — batch financial-impact save always writes `capitalAfectar: 0, interesAfectar: 0, desgravamenAfectar: 0` regardless of the real amounts.
- `novedad-carga.service.ts:69-94` — participant-matching reconciliation returns hardcoded mock data (`// Por ahora retornar mock data hasta que backend implemente`).
- `pago-cuotas.component.ts:583-599` — same unfinished pattern, live `TODO: Enviar datos al backend para procesar el pago`.

These are all in the loan-payment/contribution path — the module the January 2026 report explicitly called "prioridad crítica del proyecto." They fail silently (no error, no crash), so they will only surface during reconciliation, by which point the data gap has already propagated.

**F7. DB errors are deliberately caught and reinterpreted as "record not found" in the financial import pipeline.**
Documented intentionally in `saaBE/docs/general/CORRECCION_MANEJO_EXCEPCIONES_DAO.md` and confirmed live in `ProductoDaoServiceImpl.java:43-49`: a DAO catch block that used to rethrow now does `System.err.println(...); e.printStackTrace(); return null;` with the comment "NO lanzar excepción - retornar null para no detener el proceso." A transient DB error (e.g., a lock timeout) during ASOPREP loan/contribution import becomes indistinguishable from "this participant genuinely doesn't exist," which then gets recorded as a business-level "novedad" — a real correctness risk in a financial data pipeline, not just a style issue.

**F8. Client-controlled JPQL field names in the shared `selectByCriteria` path.**
`saaBE/src/main/java/com/saa/basico/utilImpl/EntityDaoImpl.java:125-286` builds JPQL by string concatenation using the *field name* from the client-supplied `DatosBusqueda` search payload (`strQuery + " (b." + aBuscar.getCampo()`). Bound *values* are parameterized correctly, but the field name is not — and since every one of the ~330 `selectByCriteria` endpoints funnels through this one method, this is a single fix location, not 330.

**F9. Client-side state fragmentation risks silent desync.**
`AppStateService` is used in only 19 of ~340 frontend files; 80+ files read `localStorage` directly instead. The service itself writes the same "current company" value under **six different key names**, across both `sessionStorage` and `localStorage` (12 writes for one logical value — `app-state.service.ts:41-61`, explicitly commented "compatibilidad módulos legacy"). Any code path that updates state through one route but not the other will silently desync the rest of the app.

**F10. No explicit JPA fetch strategy on 578 `@ManyToOne` relations**, meaning entity loads default to JPA's `EAGER` behavior with per-relation `SELECT`s (N+1 risk), and the generic `EntityDao.selectAll()`/`selectByCriteria()` used by essentially the entire backend has **no server-side pagination parameters at all** (`setMaxResults`/`setFirstResult` appear in only 18 of 2,224 files). Pagination is effectively a frontend-only concern today.

### 4.3 Medium — Maintainability & quality

**F11. No automated tests anywhere in the backend; frontend tests are mostly scaffolding, and the one CI pipeline that exists cannot run.** Backend: `src/test` doesn't exist, zero JUnit/Mockito dependencies, no CI config found. Frontend: 286 spec files exist, but 82.5% are unmodified Angular CLI stubs (`expect(component).toBeTruthy()` only) — the longest genuine spec file in the repo is 134 lines, and no e2e suite exists. `saaFE/.github/workflows/ci-cd.yml` *does* exist (correcting an earlier pass of this review, which missed it) and is a fairly elaborate 7-job pipeline (lint, test, build matrix, e2e, security audit, staging deploy, release notes) — but it is not actually wired to this repo: it calls `npm run lint`, `npm run format:check`, `npm run test:ci`, `npm run analyze`, and `npm run e2e`, none of which exist in `package.json` (confirmed — only `ng`, `start`, `build`, `build:prod`, `watch`, `test` are defined), there is no ESLint config or Cypress setup anywhere in the repo, and its deploy job targets a Heroku URL that doesn't match the actual WildFly/WAR deployment process (`build-production.ps1`). **This workflow would fail on its very first step (`npm run lint`) if it ran today** — it's effectively a template that was never finished, which is arguably worse than having no CI file at all, since its presence can create false confidence that quality gates exist. Combined with F12–F13 below, there is currently no *working* automated safety net for any change to this system.

**F12. Universal `catch (Throwable e)` with no centralized handling, on both sides.** Backend: 1,985 occurrences across 322 of 330 REST files; error responses commonly leak `e.getMessage()` straight into the HTTP body (1,702 occurrences), and the one real domain exception type (`IncomeException`) is never distinguished from a genuine crash — both come back as generic 500s (a few endpoints even map real crashes to 400). No `ExceptionMapper` exists, so this can only be fixed 330 times over, one file at a time, unless a shared handler is introduced. Frontend: 217 of 340 services share a byte-identical `handleError` block that contains apparently-dead logic (`if (+error.status === 200) { return of(null) }` inside a `catchError`, which should never fire on a real success response) — likely copy-pasted without full understanding of when it triggers.

**F13. No structured logging framework on either side.** Backend: `SLF4J` is used nowhere; diagnostics rely on 5,119 `System.out.println` calls and 169 `e.printStackTrace()` calls project-wide (the reporting module is the sole exception, see §3). Frontend: 592 `console.log/error/warn/debug` calls in production source, including a full payment payload dump left in `cruce-valores.component.ts:759-767`. In production, this means diagnosing an incident depends entirely on whoever has console/stdout access at the time, not on searchable, level-filterable logs.

**F14. Large-scale, unabstracted duplication drives up the cost of every fix above — but only in three of the four layers, not all four.** Backend DAO layer: `EntityDao<Tipo>` (`com.saa.basico.util.EntityDao`) + `EntityDaoImpl<Tipo>` (`com.saa.basico.utilImpl.EntityDaoImpl`) is a real generic base class implementing `save`, `find`, `remove`, `selectAll`, `selectById`, and a dynamic JPQL query builder for `selectByCriteria` — exactly once. The ~330 per-entity DAO classes are thin subclasses (e.g. `JerarquiaDaoServiceImpl extends EntityDaoImpl<Jerarquia>`, which in practice only overrides `obtieneCampos()`, ~15 lines total). A fix here propagates automatically to all 330 entities.

Backend Service layer: `EntityService<Tipo>` (`com.saa.basico.util.EntityService`) exists, but it's **an interface only** — there is no generic `EntityServiceImpl<Tipo>`. Each of the ~330 `XxxServiceImpl` classes (e.g. `ProvinciaServiceImpl.java`, ~90 lines) hand-implements all six methods (`save`, `saveSingle`, `selectAll`, `selectById`, `selectByCriteria`, `remove`) itself, almost always as thin delegation to the matching DAO plus the occasional entity-specific rule (e.g. `provincia.setEstado(Estado.ACTIVO)` in `saveSingle` for new records). The interface guarantees a consistent shape, but doesn't reduce how many places a fix has to touch — still ~330 files.

Backend REST layer: no shared abstraction at all, not even an interface — confirmed in `ProvinciaRest.java`, a standalone class hand-writing `@GET`/`@POST`/`@PUT`/`@DELETE` methods, the same try/catch-and-build-a-Response pattern repeated across all ~330 REST classes.

Frontend: no generic `BaseHttpService<T>` exists either — confirmed in `canton.service.ts`; all 340 services hand-repeat the same `getAll/getById/add/update/selectByCriteria/delete` shape plus a near-identical `handleError` (see F12).

This is precisely why F12 and F13 are expensive to fix today in the Service, REST, and frontend layers — introducing shared base classes there would let a single fix propagate everywhere, and should be treated as the enabling change for the other quality fixes, not a separate nice-to-have. The DAO layer has already solved this; it's the template to replicate in the other three layers, not a remaining gap itself.

**F15. Frontend bundle is a single, large, mostly-eager bundle.** The production `dist/saaFE/browser/main-*.js` is 4.6MB. Lazy route loading (`loadComponent`) is used in only 19 of ~176 route entries; `loadChildren` is never used. `angular.json`'s size budgets have already been raised well past Angular CLI defaults (4MB/7MB vs. the stock 500kB/1MB) — a clear sign the team hit the wall and widened the guardrail rather than addressing the bundle size.

**F16. A handful of god-components have accumulated.** `participe-dash.component.ts` (CRD) is 3,672 lines; four other components exceed 1,500 lines. These concentrate risk (harder to review, harder to test, more merge conflicts) and, notably, `participe-dash.component.ts` is also where a state-reset bug from the earlier CRD review was found — large components and correctness bugs are showing up together, not coincidentally.

### 4.4 Low — Documentation drift & polish

- **`ALCANCE-SISTEMA.md`** (frontend architecture doc) states 4 times that the backend is "Spring Boot" — confirmed incorrect; it's Jakarta EE/WildFly/EJB. Should be corrected since this is the document new team members are likely to read first.
- **Schema-name documentation is stale/imprecise.** The backend's own `docs/general/ARQUITECTURA_SISTEMA.md` refers to "CXC schema" and "CXP schema," but the code's actual `@Table(schema=...)` annotations resolve to `CBR` and `PGS` respectively (confirmed on multiple entities). `docs/pendientes/PLAN_IMPLEMENTACION.md`, dated two days earlier, already has this right — the two docs disagree with each other.
- **Entity/endpoint counts in the architecture doc are stale**: it states ~238 entities / ~236 REST controllers; actual counts are 336 and 330.
- **`rhh` (backend) vs. `rrh` (frontend)** module naming inconsistency — minor but worth aligning to reduce onboarding friction.
- One entity, `AnioMotor` (`saaBE/src/main/java/com/saa/model/cnt/AnioMotor.java`), uses schema `AOT` instead of `CNT` — worth confirming with the team whether this is intentional.
- 190 TODO/FIXME/HACK comments in backend source, 35 in frontend source — not alarming on their own, but the backend's cluster in `AsientoContableService.java:140-275` (incomplete accounting-entry template mappings for CXC/CXP transaction types) is worth cross-checking against the CRD-accounting item already listed as pending in `PLAN_IMPLEMENTACION.md` §8.

---

## 5. Suggested Changes

The system is delivered and in active use by ASOPREP-FCPC; this is not a proposal to rewrite anything. The scope note the team already sent the client (`ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md` §7) — distinguishing "minor adjustments within current scope" from "scope expansions requiring a separate conversation" — is the right frame, and everything below fits inside "minor adjustments/hardening," not new scope.

**Priority 0 — before the next production deploy (security, F1–F5):**
1. Lock down `FileRest.java`/`FileServiceImpl.java`: resolve and canonicalize every incoming path against a fixed base directory and reject anything that escapes it; this alone closes F1.
2. Introduce one real, server-enforced session mechanism (even a minimal signed token checked by a single `ContainerRequestFilter`) and require it on every endpoint except login. This is the single highest-leverage fix in the whole review — it closes F2 and sharply reduces the blast radius of F1 even before F1 is separately patched.
3. Change login to `POST` with a request body instead of the password-in-URL `GET` (F3), and have it return the real session token from item 2 instead of a literal `"OK"` string.
4. Restrict CORS to the actual known frontend origin(s); if credentials must stay enabled, the wildcard origin cannot (F4).
5. Move the WildFly deploy credentials in `pom.xml` out of the repo (F5).

**Priority 1 — near-term, data integrity (F6–F8):**
6. Fix the five CRD payment-path bugs (F6) — these are the most business-critical items in this whole review since they affect money already believed to be recorded.
7. Revisit the DAO exception-swallowing pattern in `CORRECCION_MANEJO_EXCEPCIONES_DAO.md` (F7): distinguish "genuinely not found" from "a technical error occurred" at the point of catch, so financial imports don't silently misclassify infrastructure failures as business novedades.
8. Fix the `selectByCriteria` field-name concatenation in `EntityDaoImpl.java` (F8) — one method, shared by all 330 endpoints, so this is a contained, high-leverage fix.

**Priority 2 — medium-term, structural (F11–F15, enabled by introducing base classes):**
9. Introduce a shared backend `ExceptionMapper` (REST layer) and a shared frontend `BaseHttpService<T>`/base error handler. Additionally, extract a generic `EntityServiceImpl<Tipo>` for the Service layer (today `EntityService<Tipo>` is an interface only, with no shared implementation — see F14), replicating the pattern that already exists and works in the DAO layer (`EntityDaoImpl<Tipo>`). This is the change that makes every future fix to logging, error shape, or auth cheap instead of a 330-file or 340-file exercise — it should be sequenced early relative to the other quality items, not last.
10. Add SLF4J (backend) and route console diagnostics through a single shared logger/interceptor pattern (frontend), starting with the financially critical modules (TSR, CXP, CRD payment paths).
11. Stand up a minimal CI pipeline (build + lint, even without full test coverage yet) as a first safety net — currently a broken build could reach `dist/`/`target/` undetected.
12. Add focused automated tests for the financial-critical paths identified in F6 first (loan payments, contribution processing, accounting-entry generation) rather than attempting broad coverage immediately — this directly prevents regressions on exactly the kind of bug found in F6.
13. Add server-side pagination (`setMaxResults`/`setFirstResult`) to the generic DAO's `selectAll`/`selectByCriteria`, prioritizing the largest tables first.
14. Consolidate on `AppStateService` as the single source of truth for shared state, retiring the legacy `localStorage` key duplicates module by module as each is touched (F9) — not a big-bang migration.
15. Expand `loadComponent` lazy-loading coverage and consider splitting the largest god-components (F15/F16) opportunistically, when those files are next modified for a feature reason — not as a standalone refactor sprint.

**Priority 3 — housekeeping (F4.4 documentation drift):**
16. Correct `ALCANCE-SISTEMA.md`'s backend description (Jakarta EE, not Spring Boot) and refresh entity/endpoint counts in both architecture docs.
17. Reconcile the CXC/CXP schema-name documentation (`CBR`/`PGS`, per code) across both architecture docs.
18. Align `rhh`/`rrh` naming, and confirm whether `AnioMotor`'s `AOT` schema is intentional.

---

## Appendix — Key files for a walkthrough with the team

If presenting this review live, these are the highest-signal files to show directly:

- `saaBE/src/main/java/com/saa/ws/rest/files/FileRest.java` + `.../basico/ejbImpl/FileServiceImpl.java` — F1, the most severe concrete finding.
- `saaFE/src/app/shared/services/usuario.service.ts:90-94` + `saaBE/src/main/java/com/saa/ws/rest/scp/UsuarioRest.java:83-103` + `saaFE/src/app/modules/dash/forms/login/login.component.ts:151-166` — F2/F3, the auth story end-to-end.
- `saaBE/docs/general/CORRECCION_MANEJO_EXCEPCIONES_DAO.md` + `saaBE/src/main/java/com/saa/ejb/crd/daoImpl/ProductoDaoServiceImpl.java:43-49` — F7.
- `saaBE/src/main/java/com/saa/basico/utilImpl/EntityDaoImpl.java:125-286` — F8, and also the sole shared DAO abstraction referenced in F14.
- Any one REST controller, e.g. `saaBE/src/main/java/com/saa/ws/rest/crd/AdjuntoRest.java`, next to `.../ws/rest/cnt/CentroCostoRest.java` — shows the copy-paste boilerplate and `catch (Throwable)` pattern side by side (F12/F14).
- `saaFE/src/app/modules/crd/forms/cruce-valores/cruce-valores.component.ts:769-782`, `.../proceso-pago-jubilados.component.ts:386-410`, `.../detalle-consulta-carga.component.ts:1991-1993`, `saaFE/src/app/modules/crd/service/novedad-carga.service.ts:69-94` — F6, the five CRD payment bugs.
- `saaFE/src/app/shared/services/app-state.service.ts:41-61` — F9.
- `saaFE/src/app/modules/crd/forms/entidad-participe/participe-dash/participe-dash.component.ts` — F16, the largest component in the codebase.

*This document was produced by direct code inspection of both repositories on 2026-07-28. A companion Spanish-language version, `REVISION-ARQUITECTURA-SAA-2026-07-28.md`, is available in the same folder.*
