# API — Resumen por bandas de CCPM y empresa en la generación de informes mensuales

**Equipo:** `lap-saa-1` · **Fecha:** 2026-10-13 · **Backend en `origin/main`:** `65e3f978`
**Diseño:** `saaBE/docs/logica-negocio/reportes/DISENO-CCPM-BANDAS-COMO-EL-CIERRE.md` · **Original:** `saaBE/docs/logica-negocio/reportes/API-RESUMEN-BANDAS-CCPM.md` (este archivo es el espejo para el frontend)

> El application path de JAX-RS es `/rest`: las URL reales son `/SaaBE/rest/...`. No `/api/...`.
> Verificado contra `CreditoCuotasPrestamosMensualRest.java` y `EjecucionReporteCarteraRest.java`
> del commit indicado, no contra documentación previa.

---

## 0. Qué cambia para el frontend, en tres líneas

1. **`POST /rest/ejcc/ejecutar` acepta `idEmpresa`** en el cuerpo. Hoy es opcional (el backend la
   resuelve sola si hay una única empresa con bandas parametrizadas); el frontend **debe mandarla**
   desde ya, igual que lo hace la pantalla del cierre de cartera.
2. **Nuevo `GET /rest/ccpm/resumenBandas/{idEjcc}`**: el reparto de capital por producto, tipo de
   cartera y banda, **calculado en el backend con la regla del cierre**. Reemplaza las secciones
   «… POR VENCER» / «… VENCIDOS» que hoy arma `calcularResumenFinanciero` en el navegador con
   cortes fijos y nombres de producto quemados.
3. Las columnas `capitalPorVencer1a30 … Mas360` de CCPM **cambian de significado** (antes: por
   número de cuota; ahora: por días al vencimiento, banda 1…5 de la configuración del producto).
   La pantalla las muestra igual; sólo cambia el valor. `estadoDesglose` siempre viene `1`.

---

## 1. `POST /rest/ejcc/ejecutar` — cuerpo con empresa

```json
{ "mes": 9, "anio": 2026, "usuario": "GROBAYO", "idEmpresa": 1236 }
```

| Campo | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `mes` | number 1-12 | sí | sin cambios |
| `anio` | number | sí | sin cambios |
| `usuario` | string | sí | sin cambios |
| **`idEmpresa`** | number | **sí para el frontend** (el backend lo tolera nulo mientras tanto) | `PJRQCDGO` de la empresa de la sesión — la misma que usa `cierre-cartera.component.ts` (`appState.getEmpresa()?.codigo`, con respaldo en `sessionStorage['idEmpresa']`) |

Respuestas: sin cambios (`200` con el `Ejcc`, o `200` con `{ "mensaje": "... ya fueron generados ..." }`,
`500` con texto de error). **Trampa nueva:** si el backend no puede resolver la empresa (nula y
ninguna o más de una con bandas vigentes) la generación de CCPM falla con `IncomeException`; el
`Ejcc` igual se crea, y el mensaje queda en `observaciones` como `CCPM: ERROR - ...`. Mandar
`idEmpresa` evita ese caso.

`POST /rest/ejcc/regenerar` **no** recibe empresa: vuelve a resolverla sola. No cambia.

---

## 2. `GET /rest/ccpm/resumenBandas/{idEjcc}`

Una fila por **(producto, tipo de cartera, banda)** de la parametrización vigente de la empresa,
**incluidas las bandas en cero**. Ordenadas por `idProducto`, `tipoCartera`, `numeroBanda`.

### 2.1 Respuesta `200` — `ResumenBandaCcpm[]`

| Campo | Tipo | Qué es |
|---|---|---|
| `idProducto` | number | `CRD.PRDC.PRDCCDGO` |
| `nombreProducto` | string | `PRDCNMBR` (`EMERGENTE`, `QUIROGRAFARIO`, `HIPOTECARIO`, …) |
| `tipoCartera` | number | `1` = por vencer, `2` = vencido (`TipoCarteraBanda`) |
| `nombreTipoCartera` | string | `"POR VENCER"` / `"VENCIDO"` |
| `numeroBanda` | number | 1…n dentro de la configuración del producto y tipo |
| `etiquetaBanda` | string | `"1 - 30"`, `"31 - 90"`, …, `"mas de 360 (resto)"` — la etiqueta la genera `ClasificadorBandaService.derivarRangos`; **no la reconstruyan en el cliente** |
| `cuenta` | string | cuenta contable de la banda (`CNT.PLNN.PLNNCNTA`), p. ej. `"1.3.01.05"` |
| `nombreCuenta` | string | `PLNNNMBR`, p. ej. `"DE 1 A 30 DIAS"` |
| `capital` | number | capital pendiente clasificado en la banda, 2 decimales |
| `cantidad` | number | cuotas en la banda |
| `fuente` | `"CIERRE"` \| `"PRELIMINAR"` | ver 2.2 |
| `idCorrida` | number \| null | `CRD.CRCT.CRCTCDGO` cuando `fuente = "CIERRE"`; `null` si preliminar |
| `fechaCorte` | fecha | último día del mes del EJCC. ⚠️ **Jackson serializa `LocalDate` como arreglo:** `[2026, 9, 30]`, no `"2026-09-30"` (`saaBE/CLAUDE.md` «Serialización»). Tratar como `[anio, mes, dia]` |

Ejemplo (valores ilustrativos; los nombres de campo son los reales):

```json
[
  { "idProducto": 2, "nombreProducto": "EMERGENTE", "tipoCartera": 1, "nombreTipoCartera": "POR VENCER",
    "numeroBanda": 1, "etiquetaBanda": "1 - 30", "cuenta": "1.3.01.05", "nombreCuenta": "DE 1 A 30 DIAS",
    "capital": 22494.46, "cantidad": 153, "fuente": "CIERRE", "idCorrida": 4, "fechaCorte": [2026, 9, 30] },
  { "idProducto": 2, "nombreProducto": "EMERGENTE", "tipoCartera": 1, "nombreTipoCartera": "POR VENCER",
    "numeroBanda": 5, "etiquetaBanda": "mas de 360 (resto)", "cuenta": "1.3.01.25", "nombreCuenta": "DE MAS DE 360 DIAS",
    "capital": 3082104.08, "cantidad": 19634, "fuente": "CIERRE", "idCorrida": 4, "fechaCorte": [2026, 9, 30] },
  { "idProducto": 7, "nombreProducto": "HIPOTECARIO", "tipoCartera": 2, "nombreTipoCartera": "VENCIDO",
    "numeroBanda": 6, "etiquetaBanda": "mas de 720 (resto)", "cuenta": "1.3.12.25", "nombreCuenta": "DE MAS DE 720 DIAS",
    "capital": 660808.85, "cantidad": 2393, "fuente": "CIERRE", "idCorrida": 4, "fechaCorte": [2026, 9, 30] }
]
```

### 2.2 Regla de fuente — es lo que garantiza el centavo

- Si el mes del EJCC tiene una corrida **EJECUTADA** del cierre de cartera, el resumen es **el
  snapshot de esa corrida** (`CRD.BDCC`): la foto que se contabilizó, congelada. Cuadra al centavo
  con los asientos del cierre por definición. `fuente = "CIERRE"`, `idCorrida` informado.
- Si no hay corrida, o está `PREPARADA`/`REVERSADA`, se calcula **en vivo** con el mismo núcleo
  (universo del cierre + clasificación por días al corte) sobre la cartera de hoy.
  `fuente = "PRELIMINAR"`, `idCorrida = null`. **La pantalla tiene que decirlo**: «preliminar — sin
  cierre de cartera ejecutado para este mes».
- Varias cuentas contables se repiten entre productos (p. ej. `1.3.01.xx` la comparten EMERGENTE,
  QUIROGRAFARIO, CENAPRO, EXPRESS, SUSTITUCIÓN…; `1.3.04.xx` es el vencido de todos ellos). **Para
  comparar contra el mayor, agrupar por `cuenta`** y sumar `capital`; para mostrar por producto,
  agrupar por `idProducto`.

### 2.3 Errores

| HTTP | Cuándo | Cuerpo |
|---|---|---|
| `404` | el EJCC no existe | `{ "mensaje": "No existe la ejecucion de reportes de cartera (EJCC) 999" }` — el backend emite un `String` y `MensajeErrorJsonFilter` lo envuelve en `{mensaje}` |
| `500` | no se pudo resolver la empresa; un producto con cartera sin configuración de bandas; cualquier otra falla | `{ "mensaje": "Error en resumenBandas CreditoCuotasPrestamosMensual: ..." }` |

El `handleError` estándar de los servicios `rpr` (`if (+error.status === 200) return of(null)`)
no aplica a nada de esto; dejarlo como está.

---

## 3. Lo que NO cambia

- `POST /rest/ccpm/selectByCriteria` y las columnas de CCPM que la pantalla lista: mismos nombres.
  `capitalPorVencer1a30…Mas360` ahora son por días; `valorPorVencer` = Σ de las cinco, siempre.
- Las secciones del Resumen Financiero que salen de CCPM/CPRM y no son bandas (intereses, seguros,
  provisiones, ingresos, aportes) siguen calculándose como hoy en el navegador. **Esta entrega no las
  toca.**
- `GET /rest/ejcc/getByMesAnio/{mes}/{anio}`, `DELETE /rest/ejcc/{id}`: sin cambios.

---

## 4. Trampas conocidas

- **Fecha como arreglo** (`fechaCorte`): ver 2.1. Si la pantalla la muestra, convertir
  `[a, m, d]`; no `new Date(valor)`.
- **Mes sin cierre y con pagos posteriores:** el preliminar cambia cada vez que se consulta (es la
  cartera de hoy, clasificada al corte). No es un defecto; por eso se rotula preliminar.
- **Un producto con cartera y sin configuración de bandas** hace fallar el endpoint con `500`
  (a propósito: el informe no puede inventar una banda). Hoy no ocurre (28 configuraciones cubren
  todos los productos con cartera viva).
