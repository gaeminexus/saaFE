# API — Reporte de préstamos cancelados (pantalla, PDF y CSV)

**Equipo:** omen-saa-1 (árbitro `omen-saa-1-arb`) · **Creado:** 2026-11-24 · **Estado:** contrato congelado para
implementar (BE y FE). Espejo en `saaFE/docs/crd/API-REPORTE-PRESTAMOS-CANCELADOS.md` — si cambia uno, cambia el otro.

> Pedido del usuario (2026-11-24): «un reporte en pantalla, pdf y exportado a csv de todos los prestamos cancelados en
> un rango de fechas, con el mayor detalle posible sobre la forma de cancelación y los valores del prestamo, pero que
> cuando se exporte a csv salga en columnas la información para poder filtrarla y organizarla como se desee».

Solo lectura. **No hay DDL**: todo se deriva de tablas que ya existen. No graba nada, no toca contabilidad.

---

## 1. Lo que hay que saber antes de leer el resto (verificado en el código el 2026-11-24)

1. **`CRD.PRST` no tiene columna de fecha de cancelación.** Se **deriva** (§3). `PRSTFCFN` es el fin del plazo, no la
   cancelación; `PRSTFCMD` la mueven la huella, el reverso y la reapertura: **ninguna de las dos sirve**.
2. **Estados terminales que entran** (`rubros/EstadoPrestamo`, columna `PRSTIDST`, nunca `ESPSCDGO`):
   `3 CANCELADO`, `4 CANCELADO_ANTICIPADO`, `5 CANCELADO_POR_NOVACION`, `13 CANCELADO_POR_REESTRUCTURACION`.
   El 9 (`CANCELADO_POR_REVISAR`) no lo escribe ningún proceso: **no entra**. 12 ANULADO no es una cancelación: **no entra**.
3. **Los seis únicos escritores de esos estados** (no hay `UPDATE` nativo ni JPQL sobre `PRSTIDST`):

   | # | Camino | Archivo:línea | EVPR | PGPR |
   |---|---|---|---|---|
   | A | Pago de la última cuota (caja/cobro, pago con aportes, pensión) | `MotorPagoPrestamoServiceImpl:826` | `PAGO_MANUAL` / `PAGO_APORTES` | mismo tipo, con evento |
   | A' | Carga Petro/ARCH por el motor | `CargaArchivoPetroServiceImpl:6057` | **ninguno** | `tipo` **NULL**, `CRARCDGO` lleno, fecha = fin de mes 23:59:59 |
   | B | Carga Petro vía alterna | `ProcesoCargaPetroServiceImpl:604` | ninguno | `DESCUENTO_NOMINA`, `CRARCDGO`, `PGPRANUL` **NULL** |
   | C | Precancelación (3 si no había cuotas futuras, si no 4) | `ProcesoPagoPrestamoServiceImpl:1563` | `PRECANCELACION` | `PRECANCELACION`; el capital futuro va en **`PGPRSLOT` con `PGPRCPPG = 0`** |
   | D | Precancelación pagada con un préstamo nuevo (4) | `ProcesoPagoPrestamoServiceImpl:2025` | `PRECANCELACION` con la marca **`[D-021 préstamo nuevo N]`** en `EVPROBSR` | `PRECANCELACION` |
   | E | Acuerdo con condonación (3) | `AcuerdoCondonacionServiceImpl:648` | `ACUERDO_CONDONACION` (valor = lo pagado) | un único `ACUERDO_CONDONACION`; lo condonado está en `CRD.ACCN.ACCNVLCN` |
   | F | Novación (5) / reestructuración (13) | `SustitucionPrestamoServiceImpl:318` | `NOVACION` / `REESTRUCTURACION`, **fecha = `now()`** | **ninguno** (no entra dinero) |

   Más los pagos de migración: `PGPR.tipo` = `MIGRACION` (fecha = vencimiento de la cuota) o `DEP`, sin evento.
4. **Anulación de pagos:** el reverso pone `PGPRANUL = 1` y **deja `PGPRESTD = 1`**. El camino B deja `PGPRANUL` NULL.
   ⇒ **todo filtro de pago vigente es `NVL(PGPRANUL, 0) = 0`**, nunca `PGPRESTD`. Evento vigente = `EVPRESTD = 1`.
5. **Vínculo «cancelado por el préstamo N»:**
   - F: el nuevo tiene `PRSTPROR = original` (y `PRSTVLSS`, `PRSTESNV=1`/`PRSTMNNV` o `PRSTRSTR=1`).
   - D: **no** hay `PRSTPROR`; solo la marca `[D-021 préstamo nuevo N]` en `EVPROBSR` (mismo criterio que
     `ProcesoPagoPrestamoServiceImpl.buscarPrecancelacionConPrestamo` ~:1809).
   - `CRD.RLPR` no lo escribe ningún proceso (solo el CRUD `/rlpr`): **no se usa**.
6. **Origen del dinero:**
   - Cobro de caja: `CRD.DCBC.EVPRCDGO` → `CRD.CBCR` (`CBCRTPOO`, `CBCRASN2` = asiento real del cobro).
   - Aportes: `CRD.PGAP.PGPRCDGO` → el PGPR de la operación; `CRD.PGAP.APRTCDGO` → `CRD.APRT`. **Si la entidad del
     APRT es distinta del deudor, son aportes del garante.**
   - Petro/ARCH: `PGPR.CRARCDGO` → `CRD.CRAR`; ARCH es la carga con `CRAR.FLLLCDGO = Filiales.ARCH` (2).
   - Acuerdo: `CRD.ACCN` (`ACCNVLPG` pagado, `ACCNVLCN` condonado, `ACCNVLAP` aportes, `ACCNVLDP` depósito), por `ACCN.EVPRCDGO`.
7. **Un préstamo puede reabrirse** (`anularOperacion` 4→2 / 3→2, `ReaperturaVigenteAlCorteServiceImpl`,
   `ReprocesoCargaPetroServiceImpl`). Si hoy no está en 3/4/5/13, **no entra**, aunque haya estado cancelado antes.
   El reporte refleja el estado de **hoy**, no un estado al corte.

---

## 2. Endpoints

Clase nueva `ws/rest/crd/PrestamoCanceladoRest.java`, `@Path("prcn")` (ruta de reporte, **no es tabla**; verificada
libre en `ws/` y `model/` el 2026-11-24). URL real: `/SaaBE/rest/prcn/...`.

| Método | Ruta | Cuerpo | Respuesta |
|---|---|---|---|
| `POST` | `/rest/prcn/consultar` | `FiltroPrestamosCancelados` | `200` JSON `ReportePrestamosCancelados` |
| `POST` | `/rest/prcn/pdf` | `FiltroPrestamosCancelados` | `200` `application/pdf`, `Content-Disposition: attachment; filename="prestamos-cancelados-{desde}-a-{hasta}.pdf"` |

**El CSV no tiene endpoint:** lo arma el FE con las `filas` de `/consultar` (§6).

### 2.1 Cuerpo — `FiltroPrestamosCancelados`

```json
{
  "fechaDesde": "2026-10-01",
  "fechaHasta": "2026-10-31",
  "idProducto": null,
  "idFilial": null,
  "estados": [3, 4, 5, 13],
  "formas": null,
  "usuario": "jperez"
}
```

| Campo | Tipo | Obligatorio | Regla |
|---|---|---|---|
| `fechaDesde`, `fechaHasta` | `String` `yyyy-MM-dd` | sí | rango **inclusivo** sobre la fecha de cancelación derivada (§3), `desde <= hasta` |
| `idProducto` | `Long` | no | `PRST.PRDCCDGO` |
| `idFilial` | `Long` | no | `PRST.FLLLCDGO` |
| `estados` | `Long[]` | no | subconjunto de `{3,4,5,13}`; null o vacío = los cuatro; cualquier otro valor → 400 |
| `formas` | `String[]` | no | subconjunto de los códigos de §4; null o vacío = todas; código desconocido → 400 |
| `usuario` | `String` | no | solo para el encabezado del PDF; no se valida ni se graba |

### 2.2 Errores

| HTTP | Cuándo | Cuerpo |
|---|---|---|
| 400 | falta una fecha, fecha mal formada, `desde > hasta`, estado o forma inválidos | `{"mensaje": "…"}` (el texto dice qué campo) |
| 500 | cualquier otra falla | `{"mensaje": "Error al generar el reporte de préstamos cancelados: …"}` |

Un rango sin cancelados **no es error**: `200` con `cantidad = 0` y `filas = []`. `/pdf` con cero filas devuelve el
PDF con el encabezado y «Sin préstamos cancelados en el rango» (no un PDF en blanco).

### 2.3 Respuesta — `ReportePrestamosCancelados`

```json
{
  "fechaDesde": "2026-10-01",
  "fechaHasta": "2026-10-31",
  "generado": "2026-11-24T10:15:00",
  "cantidad": 87,
  "canceladosSinFecha": 3,
  "resumenPorForma": [ { "forma": "PAGO_ULTIMA_CUOTA", "descripcion": "Pago de la última cuota", "cantidad": 61,
                         "montoSolicitado": 0.0, "totalPagado": 0.0, "totalCapitalPagado": 0.0,
                         "totalInteresPagado": 0.0, "totalMoraPagada": 0.0, "totalCondonado": 0.0 } ],
  "totales": { "cantidad": 87, "montoSolicitado": 0.0, "totalPagado": 0.0, "totalCapitalPagado": 0.0,
               "totalInteresPagado": 0.0, "totalMoraPagada": 0.0, "totalCondonado": 0.0 },
  "filas": [ { "…": "ver §5" } ]
}
```

- **Todas las fechas del reporte viajan como `String`** (`yyyy-MM-dd`; `generado` como ISO local sin zona). A propósito:
  no son entidades, y así el FE no tiene que lidiar con el arreglo `[2026,8,10]` de Jackson (CLAUDE.md, Serialización).
- Montos `Double` redondeados a 2 decimales (`HALF_UP`); conteos `Long`. Null solo donde §5 lo dice.
- `canceladosSinFecha`: préstamos en estado terminal **que pasan los demás filtros** y a los que no se les pudo derivar
  ninguna fecha (§3). No están en `filas` (no se pueden ubicar en un rango); se informan para que no desaparezcan.
- `filas` ordenadas por `fechaCancelacion` ascendente y luego `numeroOperacion`.
- `resumenPorForma`: una entrada por forma con al menos una fila, en el orden de la tabla de §4.
- `totales` es del mismo tipo que una entrada de `resumenPorForma` (`ResumenFormaCancelacion`): trae `forma` y `descripcion` en null. El FE no los lee.

---

## 3. Fecha de cancelación (regla única, para la pantalla, el PDF y el CSV)

Para cada préstamo en estado terminal:

| Estado | `fechaCancelacion` | `origenFecha` |
|---|---|---|
| 5, 13 | fecha (`TRUNC`) del EVPR vigente `NOVACION`/`REESTRUCTURACION` del préstamo (el último si hubiera varios) | `SUSTITUCION` |
| 3, 4 | fecha (`TRUNC`) de la **operación final** (§4.1) | `EVENTO`, `PAGO_CARGA` o `MIGRACION`, según de dónde salió la operación final |
| cualquiera, si lo anterior no da nada | `MAX(DTPRFCPG)` de sus cuotas en `DTPRESTD IN (4, 7)` | `CUOTA` |
| nada de lo anterior | **null** → no entra a `filas`; suma a `canceladosSinFecha` | — |

Para un 5/13 sin evento de sustitución (dato legado), se cae directamente a la fila de `CUOTA`.

> **Diferencia deliberada con la G49** (`CancelacionG49DaoServiceImpl.selectCancelacionReal`): la G49 busca dentro
> **del mes** que reporta y prioriza `CRD.RLPR`. Este reporte busca en **toda la vida** del préstamo, usa la última
> operación real y no usa RLPR (§1.5). En un mes cualquiera los dos deberían coincidir salvo en préstamos legados; si
> no coinciden, el que manda para la Superintendencia sigue siendo la G49.

**Nota para quien lea el reporte:** en las cargas Petro/ARCH la fecha es el **último día del mes de afectación** (así
se graba el pago), no el día en que se procesó la carga. Y en la migración es el vencimiento de la cuota.

---

## 4. Forma de cancelación (`forma`) y origen del dinero (`canal`)

| `forma` | `descripcion` | Cuándo |
|---|---|---|
| `PAGO_ULTIMA_CUOTA` | Pago de la última cuota | estado 3 y la operación final es `PAGO_MANUAL`, `PAGO_APORTES`, un PGPR de carga (`CRARCDGO` no nulo o `DESCUENTO_NOMINA`) o de migración |
| `ABONO_CAPITAL` | Abono a capital que terminó la deuda | la operación final es un EVPR `ABONO_CAPITAL` |
| `PRECANCELACION` | Precancelación | la operación final es un EVPR `PRECANCELACION` **sin** la marca D-021 |
| `PRECANCELACION_CON_PRESTAMO` | Precancelado con un préstamo nuevo | EVPR `PRECANCELACION` **con** `[D-021 préstamo nuevo N]` en la observación |
| `ACUERDO_CONDONACION` | Acuerdo con condonación | la operación final es un EVPR `ACUERDO_CONDONACION` |
| `NOVACION` | Novación | estado 5 |
| `REESTRUCTURACION` | Reestructuración | estado 13 |
| `SIN_DETERMINAR` | Sin operación registrada | estado 3/4 sin ninguna operación vigente (préstamo legado) |

### 4.1 La operación final

Para 3/4: el **más reciente** entre a) los EVPR vigentes del préstamo (`EVPRESTD = 1`) y b) los PGPR vigentes
**sin evento** (`EVPRCDGO IS NULL AND NVL(PGPRANUL,0) = 0`: carga y migración). Se ordena por fecha, y a igual fecha
por código, descendente. Los PGPR **con** evento no compiten: los representa su EVPR.

Si hay un EVPR `NOVACION`/`REESTRUCTURACION` vigente en un préstamo 3/4, se ignora para elegir la operación final
(no debería ocurrir; si ocurre, `observacionReporte` lo dice).

### 4.2 Canal (origen del dinero de la operación final)

| `canal` | Regla |
|---|---|
| `PRESTAMO_NUEVO` | NOVACION, REESTRUCTURACION o PRECANCELACION_CON_PRESTAMO |
| `CONDONACION` | ACUERDO_CONDONACION (el efectivo, los aportes y lo condonado van en sus columnas) |
| `DESCUENTO_ROL_PETRO` | PGPR de carga cuya `CRAR.FLLLCDGO <> 2`, o `DESCUENTO_NOMINA` |
| `ARCH` | PGPR de carga con `CRAR.FLLLCDGO = 2` (`Filiales.ARCH`) |
| `MIGRACION` | PGPR `MIGRACION` o `DEP` |
| `APORTES_GARANTE` | hay aportes en la operación final y **alguno** es de una entidad distinta del deudor (no hay efectivo) |
| `APORTES` | toda la operación final se pagó con aportes del propio deudor |
| `MIXTO` | efectivo > 0 **y** aportes > 0 en la operación final, o `CBCRTPOO = COBRO_MIXTO` |
| `CAJA` | efectivo y sin aportes (cobro de caja, depósito, transferencia registrada por cobros) |
| `SIN_DATO` | SIN_DETERMINAR, o no se pudo establecer |

`efectivoOperacionFinal = valorOperacionFinal − aportesOperacionFinal` (nunca negativo; en el acuerdo es `ACCNVLDP`).

---

## 5. Fila — `PrestamoCanceladoFila` (el CSV es exactamente esta lista, en este orden)

| # | Campo JSON | Encabezado CSV/pantalla | Tipo | Fuente / regla |
|---|---|---|---|---|
| 1 | `idPrestamo` | Código préstamo | Long | `PRSTCDGO` |
| 2 | `numeroOperacion` | N° operación | Long | `PRSTIDAS` (puede ser null) |
| 3 | `cedula` | Cédula | String | `ENTD.ENTDNMID` |
| 4 | `nombreSocio` | Socio | String | `ENTD.ENTDRZNS` (razón social) |
| 5 | `filial` | Filial | String | `FLLL.FLLLNMBR` |
| 6 | `producto` | Producto | String | `PRDC.PRDCNMBR` |
| 7 | `estadoCodigo` | Código estado | Long | `PRSTIDST` |
| 8 | `estado` | Estado | String | 3 «CANCELADO», 4 «CANCELADO ANTICIPADO», 5 «CANCELADO POR NOVACION», 13 «CANCELADO POR REESTRUCTURACION» |
| 9 | `fechaCancelacion` | Fecha cancelación | String | §3 |
| 10 | `origenFecha` | Origen de la fecha | String | §3 |
| 11 | `forma` | Código forma | String | §4 |
| 12 | `formaDescripcion` | Forma de cancelación | String | §4 |
| 13 | `canal` | Origen del dinero | String | §4.2 |
| 14 | `fechaOtorgamiento` | Fecha otorgamiento | String | `PRSTFCHA` |
| 15 | `fechaInicio` | Fecha inicio | String | `PRSTFCIN` |
| 16 | `fechaFinPlazo` | Fin del plazo | String | `PRSTFCFN` |
| 17 | `plazo` | Plazo (meses) | Long | `PRSTPLZO` |
| 18 | `tasa` | Tasa | Double | `PRSTTSAA` |
| 19 | `valorCuota` | Valor cuota | Double | `PRSTVLCT` |
| 20 | `montoSolicitado` | Monto otorgado | Double | `PRSTMNSL` |
| 21 | `montoLiquido` | Monto líquido | Double | `PRSTMNLD` |
| 22 | `cuotasPagadas` | Cuotas pagadas | Long | cuotas `DTPRESTD = 4` |
| 23 | `cuotasCanceladasAnticipadas` | Cuotas canceladas anticipadas | Long | cuotas `DTPRESTD = 7` |
| 24 | `ultimaCuotaPagada` | Última cuota pagada | Long | `MAX(DTPRNMCT)` con `DTPRESTD = 4` (null si ninguna) |
| 25 | `numeroPagos` | N° de pagos | Long | PGPR vigentes |
| 26 | `fechaPrimerPago` | Primer pago | String | `MIN(PGPRFCHA)` vigentes |
| 27 | `fechaUltimoPago` | Último pago | String | `MAX(PGPRFCHA)` vigentes |
| 28 | `totalCapitalPagado` | Capital pagado | Double | `SUM(PGPRCPPG)` vigentes |
| 29 | `totalInteresPagado` | Interés pagado | Double | `SUM(PGPRINPG)` |
| 30 | `totalMoraPagada` | Mora pagada | Double | `SUM(PGPRMRPG)` |
| 31 | `totalInteresVencidoPagado` | Interés vencido pagado | Double | `SUM(PGPRINVP)` |
| 32 | `totalDesgravamenPagado` | Desgravamen pagado | Double | `SUM(PGPRDSGR)` |
| 33 | `totalSeguroIncendioPagado` | Seguro incendio pagado | Double | `SUM(PGPRVLSI)` |
| 34 | `totalSaldoOtrosPagado` | Saldo otros pagado | Double | `SUM(PGPRSLOT)` — **en una precancelación aquí va el capital futuro** (§1.3 C) |
| 35 | `totalPagado` | Total pagado | Double | `SUM(PGPRVLRR)` vigentes |
| 36 | `totalAportesUsados` | Aportes usados | Double | `SUM(PGAPVLRR)` de los PGAP de PGPR vigentes del préstamo |
| 37 | `totalAportesGarante` | Aportes del garante | Double | la parte de 36 cuyo `APRT` es de otra entidad |
| 38 | `tieneMigracion` | Con pagos de migración | String | «SI» / «NO» (PGPR `MIGRACION` o `DEP` vigentes) |
| 39 | `tipoOperacionFinal` | Operación final | String | `EVPRTPOO`, o `PGPRTPOO` (si es null: `CARGA`) |
| 40 | `fechaOperacionFinal` | Fecha operación final | String | sin truncar a día: `yyyy-MM-dd HH:mm` |
| 41 | `valorOperacionFinal` | Valor operación final | Double | `EVPRVLRR`; o `SUM(PGPRVLRR)` de los PGPR sin evento del mismo préstamo y la misma fecha |
| 42 | `efectivoOperacionFinal` | Efectivo operación final | Double | §4.2 |
| 43 | `aportesOperacionFinal` | Aportes operación final | Double | `SUM(PGAPVLRR)` de los PGPR de ese evento |
| 44 | `aportesGaranteOperacionFinal` | Aportes garante operación final | Double | la parte de 43 de otra entidad |
| 45 | `valorCondonado` | Valor condonado | Double | `ACCNVLCN` del acuerdo de la operación final; 0 si no hay |
| 46 | `usuarioOperacionFinal` | Usuario | String | `EVPRUSAR`, o `PGPRUSRG` |
| 47 | `idEvento` | Evento | Long | `EVPRCDGO` (null en carga/migración) |
| 48 | `idCobro` | Cobro | Long | `CBCRCDGO` por `DCBC.EVPRCDGO` (o `ACCN.CBCRCDGO`) |
| 49 | `idCargaArchivo` | Carga Petro/ARCH | Long | `PGPR.CRARCDGO` |
| 50 | `idAsiento` | Asiento | Long | `EVPRNMAS` si no es null; si no, `CBCRASN2` del cobro; si no, `PGPRASNT` |
| 51 | `idPrestamoNuevo` | Código préstamo nuevo | Long | F: el `PRSTCDGO` con `PRSTPROR` = este; D: el N de la marca |
| 52 | `numeroOperacionNuevo` | N° operación nuevo | Long | `PRSTIDAS` del nuevo |
| 53 | `montoPrestamoNuevo` | Monto préstamo nuevo | Double | `PRSTMNSL` del nuevo |
| 54 | `valorSustitucion` | Valor de sustitución | Double | `PRSTVLSS` del nuevo (F); en D, `EVPRVLRR` |
| 55 | `observacionOperacionFinal` | Observación | String | `EVPROBSR` o `PGPROBSR`, saltos de línea → espacio, máx. 500 caracteres |
| 56 | `observacionReporte` | Advertencia | String | null salvo inconsistencias: «estado 4 sin evento de precancelación», «evento de sustitución en un préstamo 3/4», «la fecha sale de las cuotas: sin operación registrada» |

Los totales 28–37 son de **toda la vida** del préstamo (incluyen la migración si la hubo: ver `tieneMigracion`). Los
43–45 son solo de la **operación final**.

---

## 6. CSV (lo arma el FE)

Pensado para abrirse en el Excel de la oficina (configuración regional de Ecuador) y poder **filtrar y ordenar por
cualquier columna**:

- **Una fila de encabezados y nada más arriba** (sin `filasPrevias`: una fila de título encima rompe el autofiltro).
  El rango va en el nombre del archivo: `prestamos-cancelados-2026-10-01-a-2026-10-31.csv`.
- Las **56 columnas de §5, en ese orden y con esos encabezados**, aunque la pantalla muestre menos.
- Separador **`;`**, BOM UTF-8 (lo que ya hace `ExportService.exportToCSV` con navegador en español).
- **Montos como texto con coma decimal y sin separador de miles** (`1234,56`), porque `ExportService.formatCSVValue`
  escribe los números con `toFixed(2)` (punto decimal) y un Excel con coma decimal los toma como texto o los multiplica.
  Se formatean **en el componente** antes de llamar a `exportToCSV`; **`export.service.ts` no se toca** (lo usan otras
  pantallas).
- **Enteros sin decimales** (`plazo`, códigos, conteos): convertidos a `String` en el componente; si no, salen `12.00`.
- **Fechas `yyyy-MM-dd`** tal como llegan (Excel las reconoce como fecha en cualquier configuración).
- Null → celda vacía.

---

## 7. PDF — `rep/crd/RPRT_PRCN_LSTD.jrxml` + `.jasper`

- Se llena con `ReporteService.generarReporteDesdeColeccion("crd", "RPRT_PRCN_LSTD", parametros, filas, "PDF")` con
  **las mismas filas** de `/consultar` (sin segunda consulta y sin `<query>` en el jrxml).
- **Ordenado por `forma` (orden de §4) y luego por fecha**, con grupo por forma: cabecera con la descripción y pie con
  cantidad y totales del grupo. Total general en el `summary`.
- A4 horizontal. Columnas: Fecha canc. · N° oper. · Cédula · Socio · Producto · Estado · Origen del dinero · Monto ·
  Plazo · Capital pag. · Interés pag. · Mora pag. · Otros pag. (31+32+33+34) · Total pagado · Aportes · Condonado ·
  Préstamo nuevo (N° operación).
- Encabezado: logo, «PRÉSTAMOS CANCELADOS», rango, filtros aplicados (producto, filial, estados, formas), fecha de
  generación y usuario. Pie: «Página X de Y».
- Al final, si `canceladosSinFecha > 0`: «N préstamos cancelados no tienen fecha registrada y no se incluyen».
- Reglas de la casa (CLAUDE.md, Reportes): sintaxis **compacta**; **sin `fontName="Tahoma"`**; estilos con nombre a
  nivel de reporte; `compilar-jasper.bat` **y** `verificar-fill-jasper.bat`; y además **exportar un PDF real** por
  `generarReporteDesdeColeccion` con filas de prueba y mirar que salga el cuerpo, los grupos y los totales.

---

## 8. Pantalla (FE)

- Ruta `/menucreditos/reporte-prestamos-cancelados`, menú **Créditos › Préstamos**, después de «Repote Valores
  Insolutos», con el texto «Préstamos Cancelados» (el menú lateral corta a 24 caracteres: `docs/patrones/NOMBRES-DE-MENU-LATERAL.md` de saaFE) y `idPermiso: Permisos.CRD_PRESTAMOS_CONSULTA` (el mismo de
  «Consulta»: quien consulta préstamos puede ver este reporte; **no se crea un nodo de permiso nuevo**).
- Filtros: desde, hasta (obligatorios; por defecto el mes en curso), producto, filial, estados (multi), formas (multi).
- Resultado: tarjetas del `resumenPorForma` + `totales`; tabla paginada y ordenable con: Fecha canc., N° oper.,
  Cédula, Socio, Producto, Estado, Forma, Origen del dinero, Monto, Total pagado, Capital, Interés, Mora, Condonado,
  Préstamo nuevo; botón por fila «Ver detalle» → diálogo con **los 56 campos** agrupados (Identificación, Condiciones,
  Cancelación, Pagos de toda la vida, Operación final, Préstamo nuevo).
- Aviso visible si `canceladosSinFecha > 0`.
- Botones: «PDF» (POST `/prcn/pdf` con los mismos filtros, descarga el blob) y «CSV» (§6). Deshabilitados sin resultado.
- Fechas al backend como `yyyy-MM-dd` (nunca un `Date` crudo).

---

## 9. Verificación antes de dar por bueno

- `crd/sql/381_MEDICION_PRESTAMOS_CANCELADOS.sql` (solo lectura) da, para un rango, la cantidad por estado y por
  origen de la fecha. La cantidad de `/consultar` con los cuatro estados tiene que coincidir con la del script.
- Elegir del resultado al menos un préstamo de cada forma presente y contrastar contra la base: estado, fecha, forma,
  canal y total pagado.
