# Documentación de saaFE

Índice de la documentación del proyecto, organizada por carpeta. Para configuración de GitHub (templates, CI, instrucciones de Copilot), ver [`.github/`](../.github/README.md).

## `transversal/` — todo el sistema, no un módulo específico

- [ALCANCE-SISTEMA.md](transversal/ALCANCE-SISTEMA.md) — Fotografía de arquitectura del frontend (jul. 2025). Su afirmación de que el backend es "Spring Boot" es incorrecta (es Jakarta EE/WildFly/EJB); el resto del inventario de módulos/rutas sigue siendo útil.
- [BACKEND-REQUIREMENTS-TSR-CXP-CXC.md](transversal/BACKEND-REQUIREMENTS-TSR-CXP-CXC.md) — Spec de backend que cruza los módulos TSR/CXP/CXC (Secuencia Numeración, Caja Chica, Proposición de Pago).
- [ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md](transversal/ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md) — Reporte de entregable v2.0 al cliente; distingue ajustes menores de ampliaciones de alcance.
- [REVISION-ARQUITECTURA-SAA-2026-07-28.md](transversal/REVISION-ARQUITECTURA-SAA-2026-07-28.md) — Revisión de arquitectura/seguridad con citas archivo:línea (español).
- [SAA-ARCHITECTURE-REVIEW-2026-07-28.md](transversal/SAA-ARCHITECTURE-REVIEW-2026-07-28.md) — Misma revisión, versión en inglés.
- [guia-selectByCriteria.md](transversal/guia-selectByCriteria.md) — Guía del patrón `selectByCriteria`/`DatosBusqueda` usado en todos los módulos.

## `patrones/` — guías técnicas de patrones Angular de este código

- [ANALISIS_ARQUITECTURA.md](patrones/ANALISIS_ARQUITECTURA.md) — Recetario de patrones (signals, resolvers, tablas) extraído de crd/dash/shared.
- [CAMPOS-FECHA-DATEPICKER.md](patrones/CAMPOS-FECHA-DATEPICKER.md) — Patrón FormControl+ViewChild para bugs del datepicker de Material.
- [DETALLE-RUBROS.md](patrones/DETALLE-RUBROS.md) — Uso de `DetalleRubroService` y convención de campos P/H.
- [DEVELOPMENT_STANDARDS.md](patrones/DEVELOPMENT_STANDARDS.md) — Estándares de desarrollo: carpetas, patrón HTTP, checklist de componentes.
- [DIALOG-CAMBIO-ESTADO.md](patrones/DIALOG-CAMBIO-ESTADO.md) — Uso de `AuditoriaDialogComponent`.
- [FECHA-ARRAY-BACKEND.md](patrones/FECHA-ARRAY-BACKEND.md) — Bug de serialización de `LocalDateTime` como array.
- [FORMATEO-FECHAS.md](patrones/FORMATEO-FECHAS.md) — Helpers de formateo de fechas hacia el backend.
- [FORMULARIOS-DINAMICOS-FECHAS.md](patrones/FORMULARIOS-DINAMICOS-FECHAS.md) — Configuración de campos de fecha en formularios dinámicos.
- [GUARDS-AUTENTICACION-NAVEGACION.md](patrones/GUARDS-AUTENTICACION-NAVEGACION.md) — Referencia de `authGuard`/`canDeactivateGuard`.
- [MANEJO-SNACKBAR.md](patrones/MANEJO-SNACKBAR.md) — Implementación de SnackBar global.
- [REFACTORIZACION-PLAN-CUENTAS.md](patrones/REFACTORIZACION-PLAN-CUENTAS.md) — Refactor de `PlanCuentaUtilsService` y dedup de plan-cuentas.
- [TABLE-BASIC-HIJOS.md](patrones/TABLE-BASIC-HIJOS.md) — Guía para registrar una entidad CRUD con `TableBasicHijosComponent`.

## `propuestas/` — fuera del alcance actual de SAA/ASOPREP-FCPC

Análisis de mercado y propuestas de arquitectura para productos nuevos y separados (no forman parte del proyecto SAA). Cada par ES/EN es traducción paralela, no versiones distintas.

- [ANALISIS-MERCADO-MARKETING-APP-SRI-2026-07-28-ES.md](propuestas/ANALISIS-MERCADO-MARKETING-APP-SRI-2026-07-28-ES.md) / [.md (EN)](propuestas/ANALISIS-MERCADO-MARKETING-APP-SRI-2026-07-28.md) — Análisis de mercado para una app personal de declaración SRI.
- [ANALISIS-MERCADO-SUITE-CONTABLE-SRI-2026-07-28-ES.md](propuestas/ANALISIS-MERCADO-SUITE-CONTABLE-SRI-2026-07-28-ES.md) / [.md (EN)](propuestas/ANALISIS-MERCADO-SUITE-CONTABLE-SRI-2026-07-28.md) — Análisis de mercado para productizar SAA como suite contable comercial.
- [PROPUESTA-APP-PERSONAL-DECLARACION-SRI-2026-07-28-ES.md](propuestas/PROPUESTA-APP-PERSONAL-DECLARACION-SRI-2026-07-28-ES.md) / [.md (EN)](propuestas/PROPUESTA-APP-PERSONAL-DECLARACION-SRI-2026-07-28.md) — Propuesta de arquitectura/plan de construcción de la app personal SRI.

## `historico/` — material superado

Se conserva como rastro histórico; no es la fuente vigente. No borrar sin revisión.

- [PLAN-DESARROLLO-TSR-CXP-CXC.md](historico/PLAN-DESARROLLO-TSR-CXP-CXC.md) — Backlog del 8 jul. 2026 (CXC "MÍNIMO", CXP "VACÍO"). **Superado por** `transversal/ENTREGABLE-FINAL-SISTEMA-SAA-2026-07-27.md`, que 19 días después reporta ambos módulos "Completo".
- [RESUMEN-SESION-EXTRACTOS-BANCARIOS-2026-07-25.md](historico/RESUMEN-SESION-EXTRACTOS-BANCARIOS-2026-07-25.md) — Checkpoint de sesión intermedia (bloqueo de redeploy WildFly). **Superado por** `tsr/RESUMEN-MAESTRO-EXTRACTOS-BANCARIOS-2026-07-27.md`, el resumen consolidado escrito 2 días después para que una sesión futura no tenga que reconstruir el contexto.

## `cnt/` — Contabilidad

- [ASIENTOS_API_FIX.md](cnt/ASIENTOS_API_FIX.md) — Bug: `AsientosComponent` usaba GET donde el backend exige POST (errores 405).

## `crd/` — Créditos / Préstamos / Aportes

- [COINCIDENCIAS_ENTIDAD_FEATURE.md](crd/COINCIDENCIAS_ENTIDAD_FEATURE.md) — Diálogo de coincidencias para resolver novedades "PARTICIPE NO ENCONTRADO".
- [COMPONENTE-ENTIDAD-PARTICIPE.md](crd/COMPONENTE-ENTIDAD-PARTICIPE.md) — Doc del componente dual Entidad+Partícipe. Marcado PENDIENTE-ACTUALIZAR: la ruta que describe ya no coincide con la ubicación real del componente.
- [CRD-CODE-REVIEW-2026-07-24.md](crd/CRD-CODE-REVIEW-2026-07-24.md) — 19 hallazgos de severidad en el módulo CRD (bugs de fallo silencioso en pagos).

## `cxc/` — Cuentas por Cobrar

- [CXC-EMITIR-LOGICA-PANTALLAS.md](cxc/CXC-EMITIR-LOGICA-PANTALLAS.md) — Lógica de las pantallas "Emitir" de CXC.
- [CXC-FINANCIAR-FACTURA-BACKEND.md](cxc/CXC-FINANCIAR-FACTURA-BACKEND.md) — Requisitos de backend para financiar factura CXC.

## `cxp/` — Cuentas por Pagar

- [ACTUALIZACION_CARGA_DOCUMENTOS_CXP.md](cxp/ACTUALIZACION_CARGA_DOCUMENTOS_CXP.md) — Contrato del pipeline de carga TXT de documentos CXP.
- [FRONTEND_CXP_DOCUMENTACION.md](cxp/FRONTEND_CXP_DOCUMENTACION.md) — Referencia exhaustiva de entidades/endpoints de CXP.
- [NEGOCIACIONES_PROVEEDOR_CXP.md](cxp/NEGOCIACIONES_PROVEEDOR_CXP.md) — Spec del módulo de negociación con proveedores.

## `tsr/` — Tesorería

- [PLAN-DTO-CONSULTA-EXTRACTOS-2026-07-25.md](tsr/PLAN-DTO-CONSULTA-EXTRACTOS-2026-07-25.md) — Plan (pendiente, no implementado) para un DTO liviano de consulta de extractos.
- [PLAN-PANTALLAS-EXTRACTOS-BANCARIOS-2026-07-25.md](tsr/PLAN-PANTALLAS-EXTRACTOS-BANCARIOS-2026-07-25.md) — Implementación de 11 parsers bancarios + 4 pantallas Angular.
- [PROPUESTA-IMPORTACION-EDC-BANCARIOS-2026-07-25.md](tsr/PROPUESTA-IMPORTACION-EDC-BANCARIOS-2026-07-25.md) — Propuesta original de importación de extractos bancarios (precede a PLAN-PANTALLAS, activa como referencia de formatos fuente).
- [PROPUESTA-PARTIDAS-EN-TRANSITO-CHEQUES-CIRCULACION-2026-07-27.md](tsr/PROPUESTA-PARTIDAS-EN-TRANSITO-CHEQUES-CIRCULACION-2026-07-27.md) — Propuesta (no implementada) de partidas en tránsito / cheques en circulación.
- [RESUMEN-MAESTRO-EXTRACTOS-BANCARIOS-2026-07-27.md](tsr/RESUMEN-MAESTRO-EXTRACTOS-BANCARIOS-2026-07-27.md) — Resumen maestro consolidado de todo el frente de extractos bancarios / conciliación contable / cierre de mes.

## Carpetas de módulo sin documentación aún

`rpr`, `rrh`, `dash` y `asoprep` no tienen carpeta en `docs/` — ninguno de los documentos existentes trata esos dominios. Crear la carpeta correspondiente cuando exista contenido real que archivar ahí.
