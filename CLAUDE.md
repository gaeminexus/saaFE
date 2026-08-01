# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project identity

This is **saaFE**, the frontend half of **SAA** (Sistema de Administración/Ahorro), an enterprise accounting/finance system built by **GAEMI NEXUS S.A.S.** for client **ASOPREP-FCPC**, an Ecuadorian financial cooperative/association. The backend, **saaBE**, is a separate repository/codebase at `C:\work\saaBE\saaBE` (own git history) — most features require reading both to understand end-to-end behavior.

A client-facing scope note (`docs/ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md`) already distinguishes "minor adjustments within current scope" from "scope expansions requiring a separate budget conversation" — keep that framing in mind when a request looks like a new module/integration rather than a fix or refinement.

A full bilingual architecture/code review exists at `docs/SAA-ARCHITECTURE-REVIEW-2026-07-28.md` (English) and `docs/REVISION-ARQUITECTURA-SAA-2026-07-28.md` (Spanish), covering both repos with file:line citations. **Read it before doing security-, auth-, or CRD-payment-adjacent work** — it documents unresolved findings (no real server-side auth on the backend, an unauthenticated file-path-traversal endpoint, five known silent-failure bugs in the CRD payment path) that are easy to accidentally build on top of otherwise. Treat that document as a snapshot, not a live source of truth — verify against current code before relying on a specific line number, since fixes may have landed since.

## Commands

```bash
npm start              # dev server with proxy (ng serve --proxy-config proxy.conf.js), http://localhost:4200
npm run build           # dev build
npm run build:prod      # production build — runs build-production.ps1, which ng-builds, flattens dist/saaFE/browser into dist/saaFE, and generates a WEB-INF/web.xml (the app is deployed as a static WAR-style artifact on WildFly alongside the backend, not as a standalone Node server)
npm run watch            # incremental dev build (ng build --watch --configuration development)
npm test                 # Karma/Jasmine unit tests
ng test --include='**/mi-componente.spec.ts'   # run a single spec file
```

There is no `lint`, `format:check`, `test:ci`, `analyze`, or `e2e` script in `package.json`. **`.github/workflows/ci-cd.yml` exists but is not wired to this repo** — it invokes those five nonexistent scripts plus a Cypress e2e run and a Heroku deploy step, none of which have any corresponding config in the repo (no ESLint config, no Cypress setup, actual deploy target is WildFly via `build-production.ps1`). It would fail on its first step if triggered. Don't treat its presence as evidence that lint/tests/e2e run automatically anywhere — they don't.

Local backend for dev proxy: `proxy.conf.js`/`proxy.conf.json` forward `/api` (or `/SaaBE`, see both files) to `http://127.0.0.1:8080`, where a locally-running WildFly + `saaBE` deployment is expected. `start-with-proxy.ps1` checks whether that backend is reachable before starting `ng serve`.

## Architecture

### Cross-repo request flow
```
Angular component → Angular service (HTTP) → JAX-RS REST endpoint (saaBE) → EJB Service → EJB DAO → JPA Entity → Oracle
```
Both repos independently mirror the same business-domain boundaries. Frontend module folders under `src/app/modules/`: `cnt` (contabilidad), `crd` (créditos/préstamos/aportes — historically the highest-priority module), `cxc` (cuentas por cobrar — DB schema is actually `CBR`), `cxp` (cuentas por pagar — DB schema is actually `PGS`), `tsr` (tesorería — now the largest module by screen count), `rrh` (recursos humanos — **note:** backend uses `rhh` for the same domain, a known naming mismatch), `dash` (login/menu shell), `asoprep` (Petrocomercial integration — services only, no UI components despite being counted as a "module"). Each module follows `forms/ menu/ model/ service/ resolver/ dialog/`.

### Routing
Single file, `src/app/app.routes.ts` (1000+ lines) — all routes are registered here, in Spanish, nested by top-level menu. Protected routes carry `canActivate: [authGuard]`; edit forms carry `canDeactivate: [canDeactivateGuard]`. Most routes are eager (`component:`); only a minority use `loadComponent`. When adding a screen: create the component under `modules/<domain>/forms/`, register it here, and add a menu entry in the relevant `modules/<domain>/menu/` component.

### HTTP service pattern
Every entity gets a hand-written service (no shared base class exists — this is a known, deliberate-to-avoid-not source of duplication across ~340 services, see the architecture review F14/H14). Endpoint constants live in `ws-<domain>.ts` per module (e.g. `modules/crd/service/ws-crd.ts`) plus `shared/services/ws-share.ts` for cross-cutting ones. Standard shape:
```typescript
getAll(): Observable<T[]> { return this.http.get<T[]>(`${WS.RS_X}/getAll`).pipe(catchError(this.handleError)); }
selectByCriteria(datos: DatosBusqueda): Observable<T[]> { return this.http.post<T[]>(`${WS.RS_X}/selectByCriteria`, datos).pipe(catchError(this.handleError)); }
```
`DatosBusqueda` (`shared/model/datos-busqueda/`) is the generic search-criteria payload sent to every `selectByCriteria` backend endpoint — pagination and filtering happen client-side after the full result set comes back (the backend's generic DAO has no server-side pagination). Many `handleError` implementations contain `if (+error.status === 200) return of(null)` — this looks like dead logic (a `catchError` shouldn't see a 200) but multiple services share it byte-for-byte; don't "fix" it in one service without checking whether callers depend on the behavior.

### Auth — do not assume this is secure
`authGuard` (`shared/guard/auth.guard.ts`) checks `sessionStorage.getItem('logged') === 'true'` (and a parallel `localStorage` copy for cross-tab behavior). Login (`shared/services/usuario.service.ts`, `modules/dash/forms/login/`) sends the password as a GET URL segment and the backend returns a literal `"OK"`/error string with no real session token; that string is stored as `token` but is never attached to any subsequent request. The backend independently enforces nothing — every REST endpoint is reachable without a valid login. Do not build new features on the assumption that a logged-in state, an "authorized" check, or a token means anything security-wise until this is fixed (see review F2/H2).

### State
`AppStateService` (`shared/services/app-state.service.ts`) is the intended single source of truth for cross-cutting state (current `Empresa`, `Usuario`) but is only used in a minority of files — most components read `localStorage`/`sessionStorage` keys directly, and the service itself writes the same "current company" value under six different legacy key names for backward compatibility. When touching shared state, prefer routing through `AppStateService` rather than adding another direct `localStorage` read/write, but be aware existing code won't pick up a change made only on one side.

### Backend data contract
Backend DB tables/columns use a strict 4-letter code convention (e.g. `PRDC` = Producto, `TPPR` = TipoProducto); frontend model interfaces under `modules/<domain>/model/` are meant to mirror these 1:1, often documented in comments. Dates from the backend arrive as Java `LocalDateTime` in one of three shapes (array `[y,m,d,h,mi,s,ns]`, formatted string, or already a `Date`) — always normalize through `FuncionesDatosService.convertirFechaDesdeBackend()` (`shared/services/funciones-datos.service.ts`) rather than parsing dates ad hoc.

### Angular conventions actually in use
Angular 20, standalone components throughout (only 2 legacy `@NgModule` files remain: `shared/modules/material-form.module.ts`, `shared/shared.module.ts`). Signals (`signal`/`computed`) for local component state; `AppStateService`-style `BehaviorSubject` for shared/global state — no NgRx. Material provided globally via `provideMaterial()` (`shared/providers/material.providers.ts`). A handful of components have grown very large (`crd/forms/entidad-participe/participe-dash/participe-dash.component.ts` is ~3,700 lines) — when working in one of these, be conservative about scope; they're also where past bugs have clustered.

### Further reading already in this repo
- `.github/copilot-instructions.md` — Angular-specific code patterns (signals, guards, trackBy, testing boilerplate) in more detail than here.
- `.github/DEVELOPMENT_STANDARDS.md` — component/service checklist and UI layout conventions (maestro-detalle panels, badge/status patterns).
- `ALCANCE-SISTEMA.md` — earlier (Jul 2025) frontend architecture snapshot; **its claim that the backend is "Spring Boot" is wrong** (it's Jakarta EE/WildFly/EJB) — don't repeat that.
- `docs/CRD-CODE-REVIEW-2026-07-24.md` — detailed writeup of the CRD module's known silent-failure bugs.
- `docs/PLAN-DESARROLLO-TSR-CXP-CXC.md` and other dated `docs/PLAN-*`/`docs/RESUMEN-*` files — treasury/CXC/CXP feature planning history; check dates, several are superseded by later ones on the same topic.
