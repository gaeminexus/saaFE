# API — Fecha de afectación del cobro de crédito (CBCR) y provisión de intereses

**Equipo:** `omen-saa-1` · **Fecha:** 2026-10-05 · **Estado:** CONGELADO.
**Diseño, que manda:** `crd/DISENO-PROVISION-INTERESES-Y-FECHA-AFECTACION.md` (P1–P9, R1–R4).
**DDL:** `crd/sql/309` — `CBCR.CBCRFCAF` y `CRD.MVIC`. ⛔ Va antes del WAR.
Espejo: `saaFE/docs/crd/API-FECHA-AFECTACION-COBRO.md`.

---

## 1. Las dos fechas

| Campo JSON | Columna | Qué es | Para qué se usa |
|---|---|---|---|
| `fecha` (existente) | `CBCRFCHA` | **Fecha de pago REAL** del partícipe | Pagos de crédito (PGPR, EVPR, aportes), recálculo de mora (Fase 1), clasificación por banda del capital |
| **`fechaAfectacion`** (nuevo) | `CBCRFCAF` | **Fecha de afectación contable** | Fecha de **todos** los asientos del cobro: transitorio, reparto, definitivo, reverso de provisión y cobro tardío |

**Reglas, que valida el backend:**
- obligatoria;
- `fechaAfectacion ≥ fecha` → si no, **400** `FECHA_AFECTACION_MENOR_A_PAGO`;
- no futura → **400**;
- el período contable de `fechaAfectacion` tiene que estar abierto → **400** `PERIODO_CERRADO`, con el
  período.

Si se procesa después de que se cerró ese período, el proceso falla con el mensaje del período. El cobro
se **rechaza**, y crédito lo **reenvía con otra fecha de afectación**.

---

## 2. Cambios en los endpoints de `/rest/cbcr` (contrato base: `API-COBROS-APROBACION-CONTABILIDAD.md`)

| Endpoint | Cambio |
|---|---|
| `POST /cbcr/registrar` | el cuerpo gana **`fechaAfectacion`** (`yyyy-MM-dd`, obligatoria). Valida el §1. El asiento transitorio se fecha con ella |
| `POST /cbcr/{id}/reenviar` | el cuerpo **puede traer** `fechaAfectacion`. Si cambia, el transitorio se rehace, igual que hoy con el monto o la cuenta |
| `GET /cbcr/getId/{id}`, `/bandeja/{estado}`, `/porEntidad/{id}`, `/bandejaAprobacion`, `/seguimiento` | todas las filas devuelven **`fechaAfectacion`**, junto a `fecha` |
| `POST /cbcr/{id}/procesar` | la respuesta (`ResultadoProcesoCobro`) suma: `moraEliminada` (ya existe), **`provisionReversada`** (interés + mora), **`idAsientoReversoProvision`** y **`idAsientoCobroTardio`**. Los dos asientos pueden venir nulos si no hubo nada que reversar |

Los cobros viejos traen `fechaAfectacion = fecha` (los rellena el `309`).

### 2bis. Precancelación pagada con aportes (`POST /prst/precancelar`), agregado 2026-10-05

Pedido del usuario: una precancelación pagada **en todo o en parte con aportes** también puede registrarse tarde.
Cuando hay depósito, va por CBCR y ya tiene las dos fechas (§2). Cuando es **100 % con aportes**, va directo por
`/prst/precancelar`, sin bandeja.
- El cuerpo gana **`fechaAfectacion`** (`yyyy-MM-dd`), **opcional**. Si no viene, vale `fecha`: así se conserva
  el comportamiento de cualquier otro llamador.
- `fecha` (la existente) sigue siendo la **fecha de pago**: la de corte de la simulación, la de los PGPR y la del
  cálculo de mora.
- Se aplican las mismas reglas del §1, con los mismos códigos **400**.
- El asiento del pago con aportes (`contabilizarPagoConAportes`) y el reverso de la provisión se fechan con
  `fechaAfectacion`.
- Si `fecha` es anterior a hoy, se recalcula la mora a la fecha de pago, como en `procesar` (Fase 1).

---

## 3. Pantallas

1. **Cobros Personales** (registro), en todos los tipos que registran un cobro:
   - dos campos rotulados **«Fecha de pago»** (la de hoy) y **«Fecha de afectación contable»**;
   - la de afectación es nueva, por defecto **hoy**;
   - la pantalla impide afectación < pago y afectación futura;
   - si la fecha de pago es anterior al mes actual, un aviso: «Pago reportado tarde: la mora generada después
     del pago se eliminará y la contabilidad irá con la fecha de afectación».
2. **Bandeja de contabilidad**, **Proceso de crédito**, **Seguimiento** y **Consulta de cobros:** las dos
   fechas, en columnas separadas y rotuladas igual (P6). En la bandeja, resaltar cuando difieren.
3. **Precancelación** (`precancelacion-dialog`): el campo «Fecha de corte» pasa a rotularse **«Fecha de pago»**, y
   «Fecha de afectación contable» aparece **siempre**, con depósito o sin él (§2bis).
4. **Reenviar (corregir):** permite cambiar la fecha de afectación.
5. **Resultado de procesar:** si `moraEliminada > 0` o `provisionReversada > 0`, mostrarlos en el aviso de
   éxito.

---

## 4. Cierre de cartera — `/rest/cierrecartera`

- La respuesta de `ejecutar` (y la de la corrida grabada) suma el **subproceso 7, «Provisión de intereses»**,
  con el mismo formato que los demás subprocesos: asiento y totales por tipo de préstamo, interés y mora.
- La pantalla de cierre lo muestra como una fila más. **Sin endpoint nuevo.**
- Reversar una corrida anula sus movimientos del libro (`MVIC` tipos 1, 5 y 7). **Sin cambio de contrato.**

---

## 5. Lo que no tiene endpoint (interno del backend)

- El **reverso de la provisión** en Petro, cruce de valores, jubilados, precancelación y condonación: sale en el
  asiento de cada uno. No hay cambio de contrato en esos procesos.
- El **cobro tardío** (§6.2 del diseño y R1): dentro de `procesar`.
