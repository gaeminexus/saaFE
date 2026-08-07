# CLAUDE.md

Este archivo proporciona guía a Claude Code (claude.ai/code) para trabajar con el código de este repositorio.

## Identidad del proyecto

Este es **saaFE**, la mitad frontend de **SAA** (Sistema de Administración de Aportes), un sistema empresarial de contabilidad/finanzas construido por **GAEMI NEXUS S.A.S.** para el cliente **ASOPREP-FCPC**, un Fondo Complementario Previsional Cerrado (FCPC) ecuatoriano. El backend, **saaBE**, es un repositorio/código base separado en `C:\work\saaBE\v1\saaBE` (con su propio historial de git) — la mayoría de las funcionalidades requieren leer ambos repositorios para entender el comportamiento de extremo a extremo.

Una nota de alcance orientada al cliente (`docs/ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md`) ya distingue entre "ajustes menores dentro del alcance actual" y "ampliaciones de alcance que requieren una conversación de presupuesto aparte" — ten presente ese marco cuando una solicitud parezca un módulo/integración nuevo en lugar de una corrección o un refinamiento.

Existe una revisión completa y bilingüe de arquitectura/código en `docs/SAA-ARCHITECTURE-REVIEW-2026-07-28.md` (inglés) y `docs/REVISION-ARQUITECTURA-SAA-2026-07-28.md` (español), que cubre ambos repositorios con citas de archivo:línea. **Léela antes de hacer trabajo relacionado con seguridad, autenticación o pagos de CRD** — documenta hallazgos sin resolver (sin autenticación real del lado del servidor en el backend, un endpoint no autenticado con vulnerabilidad de path traversal de archivos, cinco bugs conocidos de fallo silencioso en el flujo de pagos de CRD) que son fáciles de terminar construyendo encima sin darse cuenta. Trata ese documento como una fotografía en el tiempo, no como una fuente de verdad viva — verifica contra el código actual antes de confiar en un número de línea específico, ya que pueden haberse aplicado correcciones desde entonces.

## Comandos

```bash
npm start              # servidor de desarrollo con proxy (ng serve --proxy-config proxy.conf.js), http://localhost:4200
npm run build           # build de desarrollo
npm run build:prod      # build de producción — ejecuta build-production.ps1, que hace ng-build, aplana dist/saaFE/browser dentro de dist/saaFE, y genera un WEB-INF/web.xml (la app se despliega como artefacto estático estilo WAR en WildFly junto al backend, no como un servidor Node independiente)
npm run watch            # build de desarrollo incremental (ng build --watch --configuration development)
npm test                 # tests unitarios con Karma/Jasmine
ng test --include='**/mi-componente.spec.ts'   # ejecutar un solo archivo de spec
```

No existe ningún script `lint`, `format:check`, `test:ci`, `analyze` ni `e2e` en `package.json`. **`.github/workflows/ci-cd.yml` existe pero no está conectado a este repositorio** — invoca esos cinco scripts inexistentes más una ejecución de e2e con Cypress y un paso de despliegue a Heroku, ninguno de los cuales tiene configuración correspondiente en el repositorio (sin configuración de ESLint, sin configuración de Cypress, el destino de despliegue real es WildFly vía `build-production.ps1`). Fallaría en su primer paso si se activara. No trates su presencia como evidencia de que lint/tests/e2e se ejecutan automáticamente en algún lugar — no es así.

Backend local para el proxy de desarrollo: `proxy.conf.js`/`proxy.conf.json` redirigen `/api` (o `/SaaBE`, ver ambos archivos) a `http://127.0.0.1:8080`, donde se espera un despliegue de WildFly + `saaBE` ejecutándose localmente. `start-with-proxy.ps1` verifica si ese backend es alcanzable antes de iniciar `ng serve`.

## Arquitectura

### Flujo de solicitudes entre repositorios
```
Angular component → Angular service (HTTP) → JAX-RS REST endpoint (saaBE) → EJB Service → EJB DAO → JPA Entity → Oracle
```
Ambos repositorios reflejan de forma independiente los mismos límites de dominio de negocio. Carpetas de módulos del frontend bajo `src/app/modules/`: `cnt` (contabilidad), `crd` (créditos/préstamos/aportes — históricamente el módulo de mayor prioridad), `cxc` (cuentas por cobrar — el esquema de BD es en realidad `CBR`), `cxp` (cuentas por pagar — el esquema de BD es en realidad `PGS`), `tsr` (tesorería — actualmente el módulo más grande por cantidad de pantallas), `rpr` (reportes — informes regulatorios/mensuales de crédito para la Superintendencia de Bancos, con sus propias carpetas `forms/menu/model/service`, p. ej. `informes-mensuales-credito`, `reportes-super-bancos`), `rrh` (recursos humanos — **nota:** el backend usa `rhh` para el mismo dominio, un desajuste de nombres conocido), `dash` (shell de login/menú), `asoprep` (integración con Petrocomercial — solo servicios, sin componentes de UI pese a contarse como "módulo"). Cada módulo sigue `forms/ menu/ model/ service/ resolver/ dialog/`.

### Enrutamiento
Archivo único, `src/app/app.routes.ts` (más de 1000 líneas) — todas las rutas se registran aquí, en español, anidadas por menú de nivel superior. Las rutas protegidas llevan `canActivate: [authGuard]`; los formularios de edición llevan `canDeactivate: [canDeactivateGuard]`. La mayoría de las rutas son eager (`component:`); solo una minoría usa `loadComponent`. Al agregar una pantalla: crea el componente bajo `modules/<domain>/forms/`, regístralo aquí, y agrega una entrada de menú en el componente `modules/<domain>/menu/` correspondiente.

### Patrón de servicio HTTP
Cada entidad recibe un servicio escrito a mano — no existe una clase base compartida, lo que genera duplicación significativa entre ~340 servicios (ver la revisión de arquitectura F14/H14). Las constantes de endpoints viven en `ws-<domain>.ts` por módulo (p. ej. `modules/crd/service/ws-crd.ts`) más `shared/services/ws-share.ts` para las transversales. Forma estándar:
```typescript
getAll(): Observable<T[]> { return this.http.get<T[]>(`${WS.RS_X}/getAll`).pipe(catchError(this.handleError)); }
selectByCriteria(datos: DatosBusqueda): Observable<T[]> { return this.http.post<T[]>(`${WS.RS_X}/selectByCriteria`, datos).pipe(catchError(this.handleError)); }
```
`DatosBusqueda` (`shared/model/datos-busqueda/`) es el payload genérico de criterios de búsqueda que se envía a cada endpoint `selectByCriteria` del backend — la paginación y el filtrado ocurren del lado del cliente después de que llega el conjunto completo de resultados (el DAO genérico del backend no tiene paginación del lado del servidor). Muchas implementaciones de `handleError` contienen `if (+error.status === 200) return of(null)` — esto parece lógica muerta (un `catchError` no debería recibir un 200) pero varios servicios la comparten byte por byte; no la "arregles" en un solo servicio sin verificar si hay llamadores que dependen de ese comportamiento.

### Autenticación — no asumas que esto es seguro
`authGuard` (`shared/guard/auth.guard.ts`) verifica `sessionStorage.getItem('logged') === 'true'` (y una copia paralela en `localStorage` para el comportamiento entre pestañas). El login (`shared/services/usuario.service.ts`, `modules/dash/forms/login/`) envía la contraseña como segmento de URL en un GET y el backend devuelve un string literal `"OK"`/error sin ningún token de sesión real; ese string se guarda como `token` pero nunca se adjunta a ninguna solicitud posterior. El backend, de forma independiente, no aplica nada — cada endpoint REST es alcanzable sin un login válido. No construyas funcionalidades nuevas asumiendo que un estado de sesión iniciada, una verificación de "autorizado" o un token significan algo en términos de seguridad hasta que esto se corrija (ver la revisión F2/H2).

### Estado
`AppStateService` (`shared/services/app-state.service.ts`) está pensado como la única fuente de verdad para el estado transversal (la `Empresa` y el `Usuario` actuales) pero solo se usa en una minoría de archivos — la mayoría de los componentes leen las claves de `localStorage`/`sessionStorage` directamente, y el propio servicio escribe el mismo valor de "empresa actual" bajo seis nombres de clave legados distintos por compatibilidad hacia atrás. Al tocar estado compartido, prefiere pasar por `AppStateService` en lugar de agregar otra lectura/escritura directa de `localStorage`, pero ten en cuenta que el código existente no recogerá un cambio hecho solo en un lado.

### Contrato de datos del backend
Las tablas/columnas de la BD del backend usan una convención estricta de código de 4 letras (p. ej. `PRDC` = Producto, `TPPR` = TipoProducto); las interfaces de modelo del frontend bajo `modules/<domain>/model/` están pensadas para reflejar esto 1:1, a menudo documentado en comentarios. Las fechas que llegan del backend vienen como `LocalDateTime` de Java en una de tres formas (arreglo `[y,m,d,h,mi,s,ns]`, string formateado, o ya como un `Date`) — normalízalas siempre a través de `FuncionesDatosService.convertirFechaDesdeBackend()` (`shared/services/funciones-datos.service.ts`) en lugar de parsear fechas de forma ad hoc.

### Convenciones de Angular realmente en uso
Angular 20, standalone components en todo el proyecto (solo quedan 2 archivos legados de `@NgModule`: `shared/modules/material-form.module.ts`, `shared/shared.module.ts`). Signals (`signal`/`computed`) para el estado local de componentes; `BehaviorSubject` al estilo de `AppStateService` para estado compartido/global — sin NgRx. Material se provee globalmente vía `provideMaterial()` (`shared/providers/material.providers.ts`). Un puñado de componentes han crecido demasiado (`crd/forms/entidad-participe/participe-dash/participe-dash.component.ts` tiene ~3,700 líneas) — al trabajar en uno de estos, sé conservador con el alcance; también son donde se han acumulado bugs en el pasado.

### Lecturas adicionales ya presentes en este repositorio
- `.github/copilot-instructions.md` — patrones de código específicos de Angular (signals, guards, trackBy, boilerplate de testing) con más detalle que aquí.
- `.github/DEVELOPMENT_STANDARDS.md` — checklist de componentes/servicios y convenciones de layout de UI (paneles maestro-detalle, patrones de badge/status).
- `ALCANCE-SISTEMA.md` — fotografía anterior (jul. 2025) de la arquitectura del frontend; **su afirmación de que el backend es "Spring Boot" es incorrecta** (es Jakarta EE/WildFly/EJB) — no repitas eso.
- `docs/CRD-CODE-REVIEW-2026-07-24.md` — análisis detallado de los bugs conocidos de fallo silencioso del módulo CRD.
- `docs/PLAN-DESARROLLO-TSR-CXP-CXC.md` y otros archivos `docs/PLAN-*`/`docs/RESUMEN-*` con fecha — historial de planificación de funcionalidades de tesorería/CXC/CXP; revisa las fechas, varios están reemplazados por otros posteriores sobre el mismo tema.
