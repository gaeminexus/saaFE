# API — Interruptor de la generación de aportes por contratos (rubro 242) + navegación de contratos

**Fecha:** 2026-09-14 · **Árbitro:** `omen-saa-1-arb` · **Sólo frontend**: los endpoints ya existen y
no cambian. Dos frentes del mismo pedido (H63 y H64).

---

## A. H63 — El lápiz de «Consulta de contratos» manda al menú principal

### Causa, verificada en el código

`app.routes.ts` tiene `menucontabilidad` (`:43`) y `menucreditos` (`:1082`) como **rutas hermanas del
primer nivel**: `menucreditos` **no** es hija de `menucontabilidad`. Las rutas de contratos
(`contrato-dash`, `aportes-dash/:codigoEntidad`, `contrato-consulta`, `contrato-edit`,
`contrato-edit/:id`, `:1238-1263`) cuelgan de `menucreditos`, así que su URL real es
**`/menucreditos/contrato-edit/:id`**.

Pero las seis navegaciones del módulo de contratos apuntan a **`/menucontabilidad/menucreditos/...`**,
una ruta que no existe. El comodín `{ path: '**', redirectTo: '' }` (`:1297`) la manda a la raíz, es
decir, al menú principal. Sin ningún error en consola.

| Archivo | Línea | Destino equivocado |
|---|---|---|
| `crd/forms/contrato/contrato-consulta/contrato-consulta.component.ts` | 338 | `contrato-edit/:id` (el lápiz) |
| `crd/forms/contrato/contrato-consulta/contrato-consulta.component.ts` | 346 | `contrato-edit` (nuevo) |
| `crd/forms/contrato/contrato-dash/contrato-dash.component.ts` | 319 | `aportes-dash/:codigoEntidad` |
| `crd/forms/contrato/contrato-dash/contrato-dash.component.ts` | 327 | `contrato-edit/:id` |
| `crd/forms/contrato/contrato-edit/contrato-edit.component.ts` | 195 | `contrato-consulta` (volver) |
| `crd/forms/contrato/aportes-dash/aportes-dash.component.ts` | 206 | `contrato-dash` (volver) |

**Corrección:** quitar el prefijo `/menucontabilidad`. El resto del módulo `crd` ya navega con
`/menucreditos/...` (p. ej. `consulta-archivos-petro.component.ts:265`). Fuera del módulo de
contratos no hay otras referencias a `/menucontabilidad/menucreditos` (grep sobre `saaFE/src`).

⚠️ El comentario de `contrato-edit.component.ts:193` dice que «la ida ya se verifica en
contrato-consulta.component.ts:331/335». Se verificó leyendo el `navigate`, no navegando. Corregir el
comentario también.

---

## B. H64 — Interruptor del rubro 242 en la pantalla de contabilidad

### B.1 Qué controla el flag, verificado contra el código

`CRD_GENERACION_POR_FALTANTE` = rubro **242**, detalle **1**
(`ConfiguracionGeneracionAportesService.porFaltanteActiva`). Lo leen **dos** procesos, los dos a
través del mismo despachador `GeneracionArchivoPetroServiceImpl.recopilarAportes`:

1. **La generación del archivo Petro**, producto AH (aportes).
2. **El asiento ③ de apertura del período del cierre de cartera** (`calcularAportesEsperados`).

| Flag | De dónde sale el aporte mensual esperado |
|---|---|
| **Apagado** (por defecto) | `CRD.HSTR` con estado 99, el más reciente por entidad, × meses adeudados |
| **Encendido** | vigencias de contrato (`CRD.VGCN`) que rigen cada mes, menos lo ya aportado (el faltante) |

No afecta la **carga** del archivo Petro, que sigue comparando contra HSTR estado 99
(`CargaArchivoPetroServiceImpl:4462`, `:4913`). Detalle en `petro/REGLAS-GENERACION-PETRO.md` §2.1.

### B.2 Endpoints — ya existen, verificados (`ConfiguracionRest.java:153`, `:173`)

**`GET /rest/cnfg/generacionPorFaltanteAh`** → `200`

```json
{ "activa": false, "usuarioUltimoCambio": "…|null", "fechaUltimoCambio": "…|[y,m,d,h,mi,s]|null", "motivoUltimoCambio": "…|null" }
```

**`PUT /rest/cnfg/generacionPorFaltanteAh`** con cuerpo `{ "activa": true, "usuario": "…", "motivo": "…" }`
→ `200 { "activa": true }` · `400` sin cuerpo · `500` con texto si falla. En particular, `500` con
*«No se encontro el detalle de rubro de generacion por faltante (rubro 242, detalle 1). Falta cargar
el catalogo…»* si el catálogo no existe en la base.

**Misma forma exacta que `/rest/cnfg/contabilidadCrd`**, que ya consume
`ConfiguracionContabilidadService` del frontend.

⚠️ **Trampa heredada, igual en los dos flags:** si la lectura del rubro falla (por ejemplo, el catálogo
no está cargado), el `GET` **no falla**: devuelve `activa: false` con la auditoría en `null`
(`ConfiguracionGeneracionAportesServiceImpl.obtenerEstado:77-93`). «Apagado» y «el catálogo no existe»
se ven igual hasta que alguien intenta encenderlo. No se corrige en este frente: se muestra en la
pantalla (B.3).

### B.3 La pantalla

`crd/forms/parametrizacion/interruptor-contabilidad/` (ruta `/menucreditos/interruptor-contabilidad`,
`authGuard` + `usuarioUnoGuard`) pasa a mostrar **dos tarjetas independientes**, cada una con su
estado, su toggle, el pedido de motivo y la auditoría del último cambio:

1. **Contabilidad de créditos (CRD)** — la de hoy, sin cambios de comportamiento.
2. **Generación de aportes por contratos (rubro 242)** — nueva, con el mismo patrón exacto de la
   primera: `cargarEstado`, `solicitarCambio` → `MotivoDialog`, `aplicarCambio`, estado desconocido
   (`null`) distinto de apagado.

Textos de la tarjeta nueva:
- Explicación: «Apagado: el archivo Petro de aportes y el asiento de apertura del cierre de cartera
  toman el monto del historial de sueldos (HSTR). Encendido: lo toman de las vigencias de los
  contratos. La carga del archivo Petro no cambia.»
- Aviso fijo mientras esté apagado: «Si nunca se encendió, confirme que el catálogo del rubro 242 esté
  cargado: con el catálogo ausente el estado también se muestra como apagado.»
- **Al encender**, antes del motivo, un aviso que hay que confirmar: «Cambia la fuente del próximo
  archivo Petro de aportes y del próximo asiento de apertura. Revise primero que los contratos
  tengan sus vigencias cargadas.»

Un cambio de un flag **nunca** toca el otro. Si el `GET` de uno falla, la otra tarjeta sigue
funcionando.

El título de la pantalla pasa a «Parámetros de créditos (CRD)», y la entrada del menú
(`menucreditos.component.ts:~379`) a «Parámetros de CRD». **Misma ruta y mismo permiso**
(`CRD_CONTABILIDAD_DE_CREDITOS`): no se crea permiso nuevo.
