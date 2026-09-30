# API — Cartera por pagar y por cobrar: todos los documentos pendientes, con saldo y antigüedad

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-30 por `omen-saa-2-arb`, **antes** de despachar.
**Espejo FE:** `saaFE/docs/cxp/API-CARTERA-CXP-CXC.md` y `saaFE/docs/cxc/API-CARTERA-CXP-CXC.md`
(el mismo archivo en las dos carpetas).
**Retoma** el frente que quedó en stand by el 2026-09-22 (estado del equipo §50).

---

## 1. El pedido, y las decisiones del usuario

> *«Se requieren pantallas donde pueda consultar todos los documentos que no he pagado y todos los que
> no me han pagado… que lea de las tablas de documentos y me permita saber cuántos valores tengo por
> cobrar y por pagar, me diga el número de documento, titular y el detalle de valores.»*

| Pregunta | Decisión (2026-09-30) |
|---|---|
| ¿A qué fecha se calcula el saldo? | **Fecha de corte elegible**, por defecto hoy |
| ¿Antigüedad? | **Sí**, por tramos: por vencer · 1-30 · 31-60 · 61-90 · más de 90 días |
| ¿Cómo se ve? | **Resumen por titular + detalle**, exportable a CSV **a nivel de resumen o con el detalle completo** de todos los documentos |
| ¿Qué resta del saldo? | NC, retenciones, anticipos cruzados y **todo lo que el sistema ya resta hoy** |

## 2. Lo que se midió en el código antes de diseñar

1. **Todo lo que mueve el saldo es una fila de aplicación.** Pagos, notas de crédito, retenciones,
   anticipos cruzados, notas de débito y caja chica se registran en `PGS.APLP` (CxP) o `CBR.APLC`
   (CxC), cada una con su tipo (`tipoDocPago`) y su monto:

   | `tipoDocPago` | Qué es | Efecto sobre el saldo |
   |:--:|---|---|
   | 1 | Pago o cobro directo | resta |
   | 2 | Nota de crédito | resta |
   | 3 | Retención | resta |
   | 4 | Anticipo cruzado | resta |
   | 5 | Nota de débito, **grabada con monto negativo** | **suma** |
   | 6 | Caja chica (solo CxP) | resta |

   Por eso «lo que el sistema ya resta» y las cuatro cosas que eligió el usuario son **una sola
   suma**: `saldo = total − Σ montoAplicado` de las aplicaciones activas. Es la fórmula de
   `/aplp/saldo` (`AplicacionPagoCxpServiceImpl:1089-1108`) y de `/aplc/saldo`
   (`AplicacionPagoCxcServiceImpl:817-840`). Solo cuenta `estado = 1`; el 2 es reversado.
2. **La fecha de corte es viable**: toda aplicación tiene `fechaAplicacion` (`APLPFAPL` / `APLCFAPL`).
3. **No hay columna de vencimiento.** Lo único que hay es el `PLAZO` + `UNIDADTIEMPO` de la forma de
   pago que trae el XML (`PGS.FPFM`, `PGS.FPLM`, `CBR.FPFC`). La regla de la §3.4 lo usa cuando existe.
4. **No existe ninguna consulta que agregue saldos**, ni por titular ni global. Hoy todo es documento
   por documento. El estado de cuenta de un titular (`tsr/service/estado-cuenta-titular.service.ts`)
   pide el saldo **de cada factura por separado**. Multiplicado por todos los titulares, eso no
   escala (§50). **Este frente necesita consultas agregadas en la base, no un bucle.**
5. **Dos antecedentes de rendimiento en este mismo modelo**: el `ORA-04036` por expansión del grafo
   EAGER (el modelo no tiene un solo `LAZY`), y los `in :ids` sin techo (§12). Por eso la §3.2 exige
   **proyecciones escalares** y **agregaciones sin listas de ids**.

## 3. Backend

### 3.1 Endpoints

```
GET /SaaBE/rest/aplp/cartera?idEmpresa=1&fechaCorte=2026-09-30[&idTitular=187]    ← por pagar
GET /SaaBE/rest/aplc/cartera?idEmpresa=1&fechaCorte=2026-09-30[&idTitular=187]    ← por cobrar
```

En `AplicacionPagoCxpRest` (`@Path("aplp")`) y `AplicacionPagoCxcRest` (`@Path("aplc")`). Los dos
llevan `@QueryParam` y siguen la forma del resto de esos REST. Servicios:

- Se devuelve un **DTO** (§4), no un `Map<String,Object>`. Va en `com.saa.ejb.cxp.service.dto`
  (ya existe: tiene `BeneficiarioOcasional`, `LineaContablePago` y `ResultadoAutorizacionSri`). El
  lado CxC usa **esos mismos DTO**: no se duplican en `cxc`.
- `ReporteCartera carteraPorPagar(Long idEmpresa, LocalDate fechaCorte, Long idTitular) throws Throwable`
  en `AplicacionPagoCxpService`/`Impl`.
- `ReporteCartera carteraPorCobrar(Long idEmpresa, LocalDate fechaCorte, Long idTitular) throws Throwable`
  en `AplicacionPagoCxcService`/`Impl`.

**Un solo DTO para los dos**, porque la forma es la misma. Los campos que solo aplican a un lado van
nulos en el otro.

| HTTP | Cuándo | Cuerpo |
|---|---|---|
| 200 | siempre que se pudo calcular, **aunque no haya documentos pendientes** | `ReporteCartera` |
| 400 | falta `idEmpresa`, o `fechaCorte` no es `yyyy-MM-dd` (`IncomeException` o `DateTimeParseException`) | texto |
| 500 | otra cosa | `"Error al consultar la cartera: " + mensaje` |

`fechaCorte` omitida → **hoy**. `idTitular` omitido → todos.

### 3.2 Las consultas: tres por lado, todas agregadas, ninguna carga entidades

⛔ **Nada de `select f from FacturaCompra f`**: cargaría el grafo EAGER entero de cada documento.
Todo es **proyección escalar** (`select f.id, f.secuencial, t.codigo, … from … join f.titular t`) y
**agregación** (`group by`). ⛔ **Nada de `in :ids`.** Las aplicaciones y los plazos se filtran por
las **mismas condiciones del documento** (empresa, estado, fecha), con un join, no con una lista.

Métodos DAO nuevos en `AplicacionPagoCxpDaoService`/`Impl` y `AplicacionPagoCxcDaoService`/`Impl`,
con JavaDoc en la interfaz y `List<Object[]>` como retorno, en el estilo de las consultas
personalizadas de ese DAO.

**Por pagar (CxP):**

| # | Consulta | Condiciones |
|---|---|---|
| P1 | **Documentos**: `FacturaCompra` (factura y nota de venta, `tipoComprobante`) + `LiquidacionCompraCompra`. Columnas: `id`, `tipoComprobante`, `numEstablecimiento`, `numPtoEmision`, `secuencial`, `fecha`, `total`, `esIntermediario` (solo FCTC), `titular.codigo`, `titular.identificacion`, `titular.razonSocial`, `titular.nombre` | `empresa.codigo = :idEmpresa`, `estado = 1`, `estadoEmision` nulo o `<> 3`, **`fecha < :corte + 1 día`** (`fecha` es `LocalDateTime`), y `titular.codigo = :idTitular` si viene |
| P2 | **Aplicaciones por documento y tipo**: `select a.facturaCompra.id, a.tipoDocPago, sum(a.montoAplicado) … group by a.facturaCompra.id, a.tipoDocPago`. La misma consulta para `a.liquidacionCompra.id` | `a.estado = 1`, `a.fechaAplicacion <= :corte`, y **las mismas condiciones de P1 sobre el documento** (`a.facturaCompra.empresa.codigo`, `.estado`, …) |
| P3 | **Plazo por documento**: `FormaPagoFacturaCompra` / `FormaPagoLiquidacionCompraCompra`, `select p.factura.id, p.plazo, p.unidadTiempo` | las mismas condiciones de P1 sobre `p.factura` / `p.liquidacion` |
| P4 | **Anticipos disponibles por titular**: `select a.titular.codigo, sum(a.saldo) from AnticipoProveedor a … group by a.titular.codigo` | **copiar la condición** de `AnticipoProveedorDaoServiceImpl.sumaSaldoDisponible:88-93` (empresa, `estado = CONFIRMADO`, `valor > 0`), sin el filtro por titular salvo que venga `idTitular` |

**Por cobrar (CxC):** las mismas cuatro, con `Factura` (`CBR.FCTR`), `AplicacionPagoCxc` (`a.factura`),
`FormaPagoFactura` (`CBR.FPFC`) y `AnticipoCliente` (copiando la condición de la
`sumaSaldoDisponible` de `AnticipoClienteDaoServiceImpl`). Diferencias:

- **Vigente** = `estado = 5` **y** `estadoEmision` nulo o `<> 3`. Es `CriterioVentaVigente`
  (`ejb/sri/serviceImpl/CriterioVentaVigente.java`): se **usan sus constantes**, no los literales.
- `Factura.fecha` es `LocalDate`: `fecha <= :corte`.
- Sin liquidaciones: `CBR.LQCS` es una liquidación **emitida por nosotros**, o sea una compra. Su
  deuda es la `PGS.LQCC` que la referencia, y esa ya está en CxP.
- Sin caja chica (el tipo 6 no existe en CxC).

### 3.3 Cálculo por documento, en el service

Para cada documento de P1, con sus filas de P2:

```
pagado        = Σ tipo 1          notasCredito = Σ tipo 2       retenciones = Σ tipo 3
anticipos     = Σ tipo 4          notasDebito  = |Σ tipo 5|     cajaChica   = Σ tipo 6 (solo CxP)
aplicado      = Σ de TODOS los montos tal como están grabados (el 5 va negativo)
saldo         = total − aplicado
```

- Cada monto se redondea a 2 decimales (`Math.round(x * 100.0) / 100.0`) **antes** de sumarlo a los
  totales del titular y del reporte.
- **Entra al reporte solo si `|saldo| > 0.01`**. Es la `TOLERANCIA` que ya usan los dos
  `AplicacionPago*ServiceImpl:53`.
- Un saldo **negativo** (pagado de más) **entra** con `sobrepagado = true`. No se esconde: es un dato
  que hay que corregir.
- Un tipo de aplicación desconocido (fuera de 1-6) **suma igual a `aplicado`**, para que el saldo
  coincida con `/aplp/saldo`, y agrega un aviso con el documento y el tipo.

### 3.4 Vencimiento y antigüedad

1. **Plazo en días** = el **mayor** de los plazos de P3 de ese documento, convertido según
   `UNIDADTIEMPO` en mayúsculas y sin espacios:
   - contiene `DIA` → días;
   - contiene `SEMANA` → × 7;
   - contiene `MES` → × 30;
   - contiene `ANIO`, `AÑO` o `ANO` → × 365.
   - Plazo nulo o 0 → **sin plazo**.
   - Una unidad que no encaja en ninguna → sin plazo, **y un aviso por cada unidad distinta**, no uno
     por documento.
2. **`fechaVencimiento`** = fecha de emisión + plazo en días. Sin plazo, es la **fecha de emisión**:
   el documento se considera exigible desde que se emitió.
3. **`diasVencido`** = `fechaCorte − fechaVencimiento`, en días.
4. **`tramo`**: `POR_VENCER` si `diasVencido <= 0`; `D1_30`; `D31_60`; `D61_90`; `MAS_90`.
5. Los importes por tramo **del titular y del reporte** suman el `saldo` de cada documento en su tramo.

## 4. Contrato de la respuesta — `ReporteCartera`

```jsonc
{
  "tipo": "POR_PAGAR",              // o "POR_COBRAR"
  "fechaCorte": [2026, 9, 30],      // LocalDate: Jackson lo manda como arreglo
  "totales": { /* TotalesCartera */ },
  "resumen":    [ /* ResumenTitularCartera, ordenado por saldo DESC */ ],
  "documentos": [ /* DocumentoCartera, ordenado por titular y luego por fechaEmision */ ],
  "avisos": [ "..." ]
}
```

**`DocumentoCartera`**

| Campo | Tipo | Nota |
|---|---|---|
| `tipoDocumento` | string | `FACTURA`, `NOTA_VENTA` (FCTC con `tipoComprobante = '02'`) o `LIQUIDACION` |
| `idDocumento` | number | ⚠️ FCTC y LQCC tienen ids **independientes**: la clave es `tipoDocumento` + `idDocumento` |
| `numeroDocumento` | string | `establecimiento-puntoEmision-secuencial` |
| `fechaEmision` | LocalDate | |
| `plazoDias` | number \| null | null = sin plazo |
| `fechaVencimiento` | LocalDate | |
| `diasVencido` | number | negativo = faltan días para vencer |
| `tramo` | string | §3.4.4 |
| `idTitular` · `identificacion` · `titular` | number · string · string | `titular` = `razonSocial`; si está vacía, `nombre` |
| `total` | number | |
| `pagado` · `notasCredito` · `retenciones` · `anticipos` · `notasDebito` · `cajaChica` | number | §3.3. `cajaChica` es null en CxC |
| `aplicado` | number | |
| `saldo` | number | |
| `sobrepagado` | boolean | `saldo < 0` |
| `intermediario` | boolean \| null | solo CxP (`FCTCESIN = 1`), null en CxC |

**`ResumenTitularCartera`**: `idTitular`, `identificacion`, `titular`, `documentos` (cantidad),
`total`, `aplicado`, `saldo`, `porVencer`, `d1a30`, `d31a60`, `d61a90`, `mas90`,
`anticiposDisponibles` (P4, 0 si no tiene), `saldoNeto` = `saldo − anticiposDisponibles`.

**`TotalesCartera`**: `titulares`, `documentos`, `total`, `aplicado`, `saldo`, `porVencer`, `d1a30`,
`d31a60`, `d61a90`, `mas90`, `anticiposDisponibles`, `saldoNeto`.

DTOs: POJOs planos con getters y setters escritos a mano, **sin anotaciones de Jackson**
(`CLAUDE.md`, «Serialización»).

## 5. Frontend

### 5.1 Una sola pantalla, dos rutas

- Componente standalone `cxp/forms/reportes/cartera/` (junto a `dashboard-cxp/`), que recibe el modo
  por `data` de la ruta: `{ tipo: 'POR_PAGAR' | 'POR_COBRAR' }`. Una sola pantalla evita que las dos
  se desalineen con el tiempo.
- Rutas en `app.routes.ts`, junto a las de reportes de cada módulo:
  - `menucuentaxpagar` → `reportes/cartera`, `data: { title: 'Cuentas por Pagar', tipo: 'POR_PAGAR' }`.
  - `menucuentasxcobrar` → `reportes/cartera`, `data: { title: 'Cuentas por Cobrar', tipo: 'POR_COBRAR' }`.
- **Menú**:
  - CxP → Reportes: `'Cuentas por Pagar'` con `idPermiso: Permisos.CXP_REPORTES`.
  - CxC → Reportes: `'Cuentas por Cobrar'` con `idPermiso: Permisos.CXC_REPORTES`.
  - Los dos nombres tienen menos de 24 caracteres (`docs/patrones/NOMBRES-DE-MENU-LATERAL.md`).
  - ⛔ **Sin permiso nuevo**: se usa el de la sección de Reportes de cada módulo, que el usuario ya
    tiene. Un permiso nuevo exige un alta en el sistema de seguridades que ningún script hace.
- Servicio: dos métodos `carteraPorPagar(params)` → `GET ${RS_APLP}/cartera` y
  `carteraPorCobrar(params)` → `GET ${RS_APLC}/cartera`, en
  `cxp/service/aplicacion-pago-cxp.service.ts` y `cxc/service/aplicacion-pago-cxc.service.ts`, que ya
  llaman `/aplp/saldo` y `/aplc/saldo`. Modelo en un archivo `cartera.ts` en `cxp/model/`.

### 5.2 La pantalla

- **Filtros:** fecha de corte (por defecto hoy), titular opcional con `TitularSelectorDialogComponent`
  (`shared/components/titular-selector-dialog/`) y un botón para quitarlo, y **Consultar**.
- **Tarjetas de totales:** saldo total, por vencer, vencido (1-30 + 31-60 + 61-90 + más de 90),
  anticipos disponibles y saldo neto.
- **Pestaña «Resumen por titular»:** una fila por titular con todas las columnas de
  `ResumenTitularCartera`, filtro de texto, orden y paginador. **Fila expandible** con los documentos
  de ese titular, filtrados de `documentos` en el cliente, sin otra llamada.
- **Pestaña «Documentos»:** todos los documentos en plano, con filtro de texto, filtro por tramo,
  orden y paginador. Resaltar `sobrepagado` y, en CxP, rotular `intermediario`.
- **CSV:** dos botones, **«Exportar resumen»** (una fila por titular) y **«Exportar detalle»** (un
  documento por fila, **todas** las columnas de `DocumentoCartera`). Exportan **todas las filas
  filtradas**, no la página visible. Con `ExportService.exportToCSV` y fechas con `fechaCsv`.
  - Archivos: `cartera-por-pagar-resumen-2026-09-30.csv`, `cartera-por-pagar-detalle-2026-09-30.csv`,
    y lo mismo con `por-cobrar`.
- **Fechas** con `FuncionesDatosService.convertirFechaDesdeBackend()`.
- **Avisos** de la respuesta en un panel plegable.
- Un 200 sin documentos muestra *«No hay documentos pendientes a la fecha de corte»*, no un error.
- Nota fija bajo los filtros: *«Los anticipos disponibles son a hoy, no a la fecha de corte»* (§6.2).

## 6. Trampas y límites, dichos antes de que los descubra el usuario

1. **Solo resta lo que está APLICADO.** Una retención autorizada que todavía no se contabilizó, o una
   nota de crédito registrada pero no aplicada, **no** reduce el saldo, ni aquí ni en `/aplp/saldo`.
   Fue el caso de Scarleth (§51): el saldo se corrigió con el botón *Contabilizar*. El reporte muestra
   exactamente lo que el sistema resta hoy, como decidió el usuario.
2. **Los anticipos disponibles son a hoy.** El saldo de un anticipo es una columna que se actualiza, y
   no hay historia para reconstruirlo a una fecha pasada.
3. **Un documento anulado después del corte no aparece**, aunque a esa fecha estaba vivo. Tampoco
   aparece una aplicación **reversada** después del corte (hoy está en estado 2). En un corte pasado,
   el saldo puede diferir unos centavos del balance de ese mes por esas dos razones.
4. **Sin plazo, un documento es exigible desde su emisión.** Una factura a crédito cuyo XML no trajo
   plazo va a aparecer vencida antes de tiempo. El bloque 3 del `e2-75` mide cuántas tienen plazo.
5. **El criterio de venta vigente está «sin confirmar contra la base»** (su propio javadoc). El
   bloque 4 del `e2-75` lo contrasta.
6. **FCTC y LQCC tienen ids independientes** (§4): nunca se identifica un documento solo por su id.

## 7. Verificación

- `pagos`/`cxp`: el **`e2-75`** (`cxp/sql/e2-75-cartera-por-pagar-y-por-cobrar.sql`, solo lectura) da,
  para la misma fecha de corte, la **cantidad y el saldo total** por tipo de documento en CxP y el
  total de CxC. **Los totales de las dos pantallas tienen que coincidir con esos números.** Es el valor
  conocido contra el que se contrasta.
- Contraste de un documento: el `saldo` de una factura en el reporte con fecha de corte de hoy tiene
  que ser igual al de `GET /aplp/saldo/{id}` (o `/aplc/saldo/{id}`).

## 8. Qué NO toca

`/aplp/saldo`, `/aplc/saldo` y todo lo que ya calcula saldos. El estado de cuenta de un titular
(`tsr/estado-cuenta-titular`). `FCTCEPAG`/`FCTREPAG`. Ningún `.sql` que escriba, ninguna entidad.
