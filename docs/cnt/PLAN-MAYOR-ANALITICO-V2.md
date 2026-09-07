# Plan — pantalla V2 de Mayor Analítico

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-07 · **Módulo:** `cnt`
**Pedido del usuario:** la pantalla actual *«es muy limitada por scroll y le resulta algo incómoda
al usuario»*. Se crea una **nueva**, con toda la funcionalidad de la anterior, navegación, búsqueda
y ordenamiento mucho más ágiles, `numeroAlterno` siempre visible y exportable, y export a CSV en
todas las vistas.

Contrato de los endpoints: [`API-MAYOR-ANALITICO-V2.md`](API-MAYOR-ANALITICO-V2.md).

---

## 1. Decisión de base: se crea, no se reemplaza

La pantalla vieja (`cnt/forms/reporte-mayor-analitico/`) **no se borra ni se toca**, y su ruta
`/cnt/reporte-mayor-analitico` sigue viva. La V2 entra como pantalla nueva, en paralelo.

**Por qué.** Es el mismo criterio que ya aplicó este equipo al partir el circuito de pagos (§30.5
del estado): un componente que la gente usa todos los días no se apaga el mismo día que nace su
reemplazo. La baja de la vieja es un ítem aparte, después de que el usuario valide la nueva.

Además `cnt` está **compartido con `lap-saa-1`**: archivos nuevos son cero riesgo de colisión;
reescribir el componente existente no lo es.

---

## 2. Inventario de lo que hace la pantalla actual — nada de esto se puede perder

Sale de leer los 419 del `.ts` y los 272 del `.html`. **Es la lista de aceptación.**

| # | Funcionalidad | Dónde está hoy |
|---|---|---|
| 1 | Filtros: fecha inicio/fin (obligatorias), cuenta inicio/fin, centro inicio/fin, tipo distribución, tipo acumulación | `form` en `ngOnInit` |
| 2 | Datepickers con tipeo manual `dd/mm/aaaa` **además** del calendario | `capturarFechaInicioRaw` / `syncFechaInicioFromRaw` / `onFechaInicioPickerChange` (y sus gemelos de fecha fin) |
| 3 | Validación: fecha inicio no puede ser mayor que fecha fin | `generar()` |
| 4 | Selector de plan de cuentas por diálogo, para cuenta inicio y cuenta fin | `abrirSelectorCuentaInicio/Fin` con `PlanCuentaSelectorDialogComponent` |
| 5 | Chips de resumen: fecha de proceso, total de cuentas, total de movimientos | `rm-reporte-info` |
| 6 | Maestro: lista de cuentas con N° cuenta, nombre, saldo anterior | `colsCabecera` |
| 7 | Detalle: fecha, N° asiento + tipo, descripción, observación, debe, haber, saldo, estado | `colsDetalle` |
| 8 | Totales de debe y haber al pie del detalle | `totalDebe()` / `totalHaber()` computed |
| 9 | Chip de color por estado del asiento | `rm-estado-chip` |
| 10 | Clic en un movimiento abre el asiento completo en diálogo | `abrirAsientoRelacionado` → `MayorAnaliticoAsientoDialogComponent` |
| 11 | Export CSV del detalle de la cuenta seleccionada | `exportarDetalleCSV()` |
| 12 | Export CSV de **todas** las cuentas con sus movimientos | `exportarTodasCuentasCSV()` |
| 13 | Selección automática de la primera cuenta al generar | `cargarCabeceras()` |
| 14 | Limpieza del reporte temporal al salir y al regenerar | `ngOnDestroy` + `generar()` |

⛔ **Las 14 van a la V2.** Cualquiera que no entre, se reporta como BLOQUEADO; no se descarta sola.

---

## 3. Por qué la actual se siente incómoda — el diagnóstico, no la queja

1. **Dos tablas apiladas sin altura propia.** El maestro y el detalle viven en un `div` que crece
   con el contenido: con 87 cuentas y 300 movimientos, la página entera se vuelve una tira larga y
   el encabezado se pierde. El único paliativo que se le puso fue *«agrega scroll horizontal al
   panel de movimientos»* (commit `449d209`) — un parche al síntoma.
2. **No hay paginación ni scroll virtual.** Se renderiza **cada fila** en el DOM.
3. **No hay ordenamiento.** Ninguna columna es clicable; el orden es el que devuelve el backend.
4. **No hay búsqueda.** Ni sobre las cuentas ni sobre los movimientos.
5. **No se puede mirar el reporte completo.** Los movimientos sólo se ven de a una cuenta.
6. **`numeroAlterno` no aparece nunca**, ni en pantalla ni en los CSV: se muestra `numeroAsiento`,
   que es el consecutivo interno y no es el número con el que el contador identifica el asiento.

---

## 4. Qué construye la V2

Ruta: **`/cnt/mayor-analitico-v2`** · Componente: `cnt/forms/mayor-analitico-v2/`
Selector: `cnt-mayor-analitico-v2`.

### 4.1 Filtros — colapsables

Los mismos ocho campos y la misma validación (ítems 1 a 4 del §2), dentro de un
`<mat-expansion-panel>` **abierto al entrar y colapsado automáticamente al generar**. Al colapsarse
muestra un resumen en una línea: `01/01/2026 – 07/09/2026 · Cuentas 1010101–9999999 · Sin centro de
costo`. Eso solo devuelve toda la altura de la pantalla a los datos, que es la queja de fondo.

**El `<mat-select>` de tipo de distribución se enlaza con `@for` sobre `opcionesTipoDistribucion`**,
con las **tres** opciones y `[value]` numérico — ver §3 del contrato.

### 4.2 Dos vistas conmutables, con `mat-button-toggle`

**Vista A — «Por cuenta» (maestro-detalle).** Es la de hoy, arreglada:

- Panel de cuentas y panel de movimientos, **cada uno con su altura fija y su propio scroll**
  (`height: calc(100vh - Xpx)`, `overflow: auto`), y encabezado `sticky`. **La página no scrollea;
  scrollean los paneles.** Ésta es la corrección central del pedido.
- Buscador propio arriba de la lista de cuentas: filtra por número o por nombre mientras se teclea.
- Buscador propio arriba de los movimientos.
- Ordenamiento por columna en las dos tablas (`matSort`).

**Vista B — «Todos los movimientos» (nueva).** Una sola tabla con **todo el reporte**, de la
llamada única a `/detalleReporte/{secuencial}`:

- Columnas: Cuenta · Nombre cuenta · Fecha · **N° Asiento (`numeroAlterno`)** · Tipo · Descripción ·
  Observación · Debe · Haber · Saldo · Estado · Centro de costo.
- Búsqueda global sobre todas esas columnas.
- Ordenamiento por cualquier columna.
- Paginación (`mat-paginator`, 25/50/100/200) **o** `cdk-virtual-scroll-viewport`. El `@angular/cdk`
  ya está en `package.json`; no hace falta dependencia nueva.
- Totales de debe y haber **de lo que está filtrado**, no del total, y que diga cuál de los dos es.

### 4.3 `numeroAlterno`, que es el pedido explícito

**En las dos vistas, la columna de identificación del asiento muestra `numeroAlterno`**, con el
respaldo a `numeroAsiento` del §4 del contrato. El consecutivo interno pasa a ser una columna
secundaria («N° interno»), no la principal.

**Y va en los dos CSV, como primera columna de identificación del movimiento.**

### 4.4 Exports — CSV en todas las vistas

| Botón | Qué exporta |
|---|---|
| CSV de la cuenta seleccionada | Vista A, movimientos de esa cuenta |
| CSV de todo el reporte | Todas las cuentas con sus movimientos |
| CSV de lo que está en pantalla | **Nuevo.** Respeta el filtro y el orden aplicados |

Se usa `ExportService.exportToCSV` tal cual: ya emite **BOM UTF-8** y autodetecta el separador, así
que el archivo **abre directo en Excel con los acentos correctos**. No hace falta ninguna librería
de `.xlsx`, y no se agrega ninguna: `package.json` hoy sólo tiene Angular, rxjs, tslib y zone.js.

⛔ **El export de todo el reporte deja de hacer N peticiones** y pasa a usar
`/detalleReporte/{secuencial}`, igual que la vista B.

### 4.5 Lo que se conserva idéntico

El clic en un movimiento sigue abriendo `MayorAnaliticoAsientoDialogComponent` **sin modificarlo**,
y la limpieza del reporte temporal en `ngOnDestroy` y antes de regenerar se mantiene tal cual.

---

## 5. Reparto

| Fase | Qué | Quién |
|---|---|---|
| **A** | `GET /rest/myan/detalleReporte/{secuencial}` — DAO + REST | **BE** |
| **B** | La pantalla V2 completa, con las dos vistas y los tres CSV | **FE** |
| **C** | Ruta + entrada en el menú de contabilidad | **FE** |

La fase B puede arrancar en paralelo con la A: la vista A y los dos CSV existentes no dependen del
endpoint nuevo. Sólo la vista B y el CSV de todo el reporte lo necesitan.

---

## 6. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | 🟠 `cnt` está compartido con `lap-saa-1` | La V2 es **todo archivos nuevos**. Los dos únicos compartidos son `app.routes.ts` y `menucontabilidad.component.ts`: `git status` + `git log -3` sobre ellos antes de editar |
| 2 | 🟠 Traer todo el reporte de una vez puede ser mucho dato | Por eso la vista B pagina o virtualiza. Si un reporte anual resulta impracticable, **se reporta con el número de filas medido**, no se cambia el diseño por las dudas |
| 3 | 🟡 `numeroAlterno` nulo en asientos viejos | Respaldo obligatorio del §4 del contrato |
| 4 | 🟡 Perder una de las 14 funcionalidades del §2 | La lista es el criterio de aceptación y se revisa una por una |
