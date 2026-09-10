# Contrato — saldos vigentes de préstamos en lote (`POST /rest/prst/saldos`)

**Equipo:** `omen-saa-1` (omen1) · **Fecha:** 2026-09-10 · **Pedido por:** el usuario, urgente.
**Verificado contra el código, no contra documentación.**

---

## 1. El defecto que resuelve

La consulta de préstamos (`crd/forms/prestamo/prestamo-consulta`) muestra en la columna
**«Saldo Total»** de la tabla, en el CSV/PDF exportado y en la cabecera del diálogo de detalle el
valor de **`Prestamo.saldoTotal` (`PRST.PRSTSLTT`)**. Esa columna, igual que `saldoCapital`
(`PRSTSLCP`), **no la escribe ninguna línea del backend**: conserva el valor que dejó la migración
o el alta y no se mueve con ningún pago. Está documentado como «campo muerto» en
`petro/REGLAS-GENERALES-PETRO.md` §10 (medido en producción el 2026-09-01: 28,5 millones de saldo
en préstamos cancelados). La pantalla `cobros-personales` ya lo esquiva reconstruyendo el saldo
desde las cuotas; la consulta de préstamos quedó leyendo el valor congelado.

**No se corrige «actualizando la columna».** Mantenerla viva exigiría tocar todos los caminos que
mueven capital (motor de pago, abono, precancelación, condonación, reversos, Petro, mora diaria) y
cualquiera que se olvide la vuelve a congelar en silencio. Se corrige **calculando el saldo desde
las cuotas con la lógica que ya es autoritativa en el sistema** y exponiéndolo en lote.

## 2. La lógica autoritativa — reusar, no reescribir

`MotorPagoPrestamoServiceImpl.calcularTotalPendientePrestamo(idPrestamo)` (línea ~249) recorre
`detallePrestamoDaoService.selectCuotasPendientesByPrestamoOrdenadas(id)` y suma
`calcularSaldosRealesCuota(cuota).getTotalPendiente()`. `calcularSaldosRealesCuota` devuelve un
`SaldosCuota` que **también trae `saldoCapital`** por cuota, calculado contra los pagos vigentes.

⛔ **No replicar la fórmula en SQL ni en el frontend.** `SaldoPrestamoService` del frontend advierte
que en los créditos migrados `DetallePrestamo.capitalPagado` no es confiable y el saldo se
reconstruye desde los pagos (`PGPR`); el motor ya encapsula ese criterio. Una réplica que se desvíe
un centavo produce dos «saldos» distintos en dos pantallas, que es exactamente la clase de defecto
que motivó este contrato.

## 3. Endpoint

```
POST /SaaBE/rest/prst/saldos
Content-Type: application/json
```

**Cuerpo:** arreglo de códigos de préstamo (`PRSTCDGO`). Máximo **500** por llamada; con más,
`400` y mensaje. El frontend fragmenta.

```json
[8157, 8078, 8085]
```

**Respuesta `200`:** un objeto por préstamo solicitado, **en cualquier orden**. Un código que no
existe **no** aparece en la respuesta (no es error).

```json
[
  { "idPrestamo": 8157, "saldoCapital": 1250.40, "saldoTotal": 1311.02, "cuotasEnMora": 2 },
  { "idPrestamo": 8078, "saldoCapital": 0.00,    "saldoTotal": 0.00,    "cuotasEnMora": 0 }
]
```

| Campo | Tipo | Significado |
|---|---|---|
| `idPrestamo` | `number` | `PRSTCDGO` |
| `saldoCapital` | `number` | Σ `SaldosCuota.saldoCapital` sobre las cuotas pendientes del préstamo (las que devuelve `selectCuotasPendientesByPrestamoOrdenadas`). Redondeado a 2 decimales. |
| `saldoTotal` | `number` | Exactamente `calcularTotalPendientePrestamo(id)`: Σ `getTotalPendiente()` sobre las mismas cuotas. |
| `capitalPagado` | `number` | **Regla mixta, por estado de la cuota** (decisión del usuario, 2026-09-10 — ver §3bis). Cuota **liquidada** (`DTPRESTD` 4 PAGADA o 7 CANCELADA_ANTICIPADA) → aporta el **capital de la cuota** (`DTPRCPTL`). Cuota **no liquidada** (parcial, en mora, pendiente, o estado nulo) → aporta el **capital abonado en `PGPR`** (`SUM(PGPRCPPG)` de sus pagos vigentes). La columna en pantalla se llama **«Capital Pagado»**. ⛔ NO es la suma de los seis componentes ni `PGPRVLRR`: incluirían interés, mora y seguros, y la fila dejaría de cuadrar. Se obtiene con **dos `SUM(...) GROUP BY`** en la base — una fila por préstamo cada uno, nunca las filas de pagos. |
| `cuotasEnMora` | `number` | Cuotas pendientes con `fechaVencimiento < inicio del día de hoy` — el mismo criterio del proceso diario de mora (`DTPRFCVN < corte`, estado no PAGADA ni CANCELADA_ANTICIPADA). La cuota que vence hoy **no** está en mora. |

**Préstamos en estado terminal** (cancelado, etc.): se devuelven igual, con lo que sumen sus cuotas
pendientes (normalmente 0). No se filtra por estado del préstamo: la pantalla ya muestra el estado.

## 3bis. Por qué el capital pagado NO sale sólo de la tabla de pagos

**La base viene de una migración y los registros de pago de cuota no siempre están completos.**
Decisión del usuario, textual (2026-09-10):

> *«si una cuota está pagada, entonces se suma como capital pagado el valor de capital de esa
> cuota; sólo si está en parcial o en mora, ahí sí debe buscar el capital abonado de esa cuota en
> la tabla de pago y sumarlo».*

El **estado de la cuota es el dato confiable**; `PGPR` sólo lo es para lo que se pagó de forma
parcial. Una primera versión sumaba `PGPRCPPG` de todos los pagos y devolvía de menos —o cero— en
los préstamos migrados cuyas cuotas figuran pagadas sin pago registrado. Se detectó en préstamos
con **cuota 0**, pero la causa no es la cuota 0: es la migración.

⭐ **La regla mantiene la fila cuadrada, y ése es el argumento que la sostiene.** El motor calcula
el saldo **sólo sobre las cuotas no liquidadas**, así que:

```
Σ capital de cuotas liquidadas  +  Σ abonado en PGPR de las no liquidadas   (= capitalPagado)
+ Σ (capital − abonado) de las no liquidadas                                (= saldoCapital)
= Σ capital de todas las cuotas                                             (= capital del préstamo)
```

Cualquier otra combinación —sumar `PGPR` también en las liquidadas, o el capital también en las
parciales— rompe esa identidad y hace que **Monto − Capital Pagado ≠ Saldo Capital** en pantalla.

⚠️ **`CANCELADA_ANTICIPADA` (7) cuenta como liquidada**, igual que `PAGADA` (4): en una
precancelación el capital se paga. Es el mismo par de estados que ya usan
`selectCuotasPendientesByPrestamoOrdenadas` en el backend y `esCuotaLiquidada` en el frontend, así
que las tres definiciones de «liquidada» siguen coincidiendo. Si alguna vez se separan, este
cálculo deja de cuadrar con el saldo.

**Errores:** `400` si el cuerpo es nulo, vacío o supera 500 códigos; `500` con
`"Error al calcular saldos: <mensaje>"` (estilo de la casa). Un préstamo que falle al calcular
**no aborta el lote**: se omite de la respuesta y se registra en el log del servidor.

## 4. Qué cambia en el frontend

`prestamo-consulta`:

1. Tras cargar las filas (`prestamoService.selectByCriteria`), pedir `/prst/saldos` con los
   códigos **de la página visible** (mismo patrón perezoso que hoy usa `cargarCuotasMora`), en
   fragmentos de hasta 500. Mientras no llega, la celda muestra **«…»**, nunca `0`: un cero es un
   dato en un reporte de cartera.
2. Columna nueva **«Saldo Capital»** ← `saldoCapital`. La columna **«Saldo Total»** deja de leer
   `p.saldoTotal` y pasa a leer `saldoTotal` de la respuesta. El filtro «Saldo desde / hasta» sigue
   operando sobre el criterio del backend (`saldoTotal` de la entidad) — **queda documentado como
   limitación conocida**, no se toca en este cambio.
3. **Exportar CSV/PDF**: antes de exportar, resolver los saldos de **todas** las filas (mismo
   patrón que `conCuotasMoraResueltas`). Las dos columnas van al archivo con los valores
   calculados.
4. `cuotasEnMora` de la respuesta **reemplaza** la consulta por préstamo que hoy hace
   `consultarCuotasEnMora` (N+1 sobre `detallePrestamoService.selectByCriteria`): mismo número,
   una sola llamada por página.
5. Diálogo de detalle (`dialog/prestamo-detalle-dialog`): la cabecera «Saldo Total» deja de leer
   `prestamo.saldoTotal` y muestra el `saldoTotal` calculado (se lo pasa la consulta en `data`, o el
   diálogo lo pide a `/prst/saldos` con un solo código).

## 5. Qué NO se toca

- `Prestamo.saldoTotal` / `Prestamo.saldoCapital` **siguen existiendo** y siguen muertos. No se
  borran, no se rellenan, no se «sincronizan». Cualquier pantalla que los lea es un defecto aparte.
- `MotorPagoPrestamoServiceImpl`: se **llama**, no se modifica.
- `ProcesoCargaPetroServiceImpl.procesarPrestamo` (vía alterna de Petro, sin llamadores) escribe
  `DTPRSLCP` con semántica por cuota, distinta de la del resto del sistema. **Es una mina dormida
  y no es este defecto**; queda anotada, no se toca (regla de los docs de Petro).
- La app móvil (`MovilMappers:34-38`) sirve las mismas columnas muertas. Es alcance de
  `omen-app-1`; se avisa, no se toca desde acá.

## 6. Trampas

- **Jackson serializa los `Double` como número JSON**; `null` no debe aparecer: si una cuota no
  tiene datos, el motor ya devuelve 0.
- **Fecha de corte de `cuotasEnMora`**: `LocalDate.now().atStartOfDay()` del servidor. Si el
  servidor está en UTC, el corte se corre cinco horas (mismo riesgo ya señalado para el timer de
  mora). No inventar una zona en el código: usar la misma convención que `ProcesoMoraPrestamo`.
- ⛔ **El cálculo va EN LOTE, y no es optativo.** La primera versión (2026-09-10, `20b10b49`)
  llamaba `calcularSaldosCuota(cuota)` por cuota, y ese método del motor **consulta los pagos de
  cada cuota** (`selectVigentesByIdDetallePrestamo`, `MotorPagoPrestamoServiceImpl:116`): una
  página de 100 préstamos eran miles de consultas y la pantalla quedó inusable. El árbitro aceptó
  «una lectura de cuotas por préstamo» sin verificar qué hacía el método por dentro. La versión
  vigente trae en **tres consultas** los préstamos existentes, todas las cuotas pendientes y todos
  los pagos vigentes (fragmentando los `IN` de a 900 por el tope de Oracle), y calcula en memoria
  con la sobrecarga pura `calcularSaldosCuota(cuota, pagosVigentes)`, que es la misma matemática.
  Si alguien vuelve al bucle «porque es más simple», reaparece el problema.
