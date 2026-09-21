# Recepción de valores de seguro (sepelio) — plan por fases y contrato de API

**Equipo:** `omen-saa-1` · **Fecha:** 2026-09-21 · **URGENTE**
**Motivo del apuro (usuario, 2026-09-21):** *«necesitan realizar al menos 4 registros de lo de
sepelio»*. El dinero de esos casos **ya está en la cuenta del fondo**.
**Diseño de fondo:** `crd/DISENO-BENEFICIARIOS-Y-VALORES-DE-SEGURO.md` — leerlo antes que esto.

---

## 0. Por qué va en dos fases

Los 4 casos que corren son **recepciones**: el dinero entró y hay que dejarlo registrado,
contabilizado y asignado al partícipe. **Pagarle a los familiares es un segundo momento**, que
necesita la tabla de beneficiarios y el reparto por porcentaje.

| Fase | Qué entrega | Necesita |
|---|---|---|
| **1 — URGENTE** | Registrar la recepción, que contabilidad la apruebe, que se genere el asiento **D Banco / H 2.3.90.90.11** y que el valor quede en la cuenta del partícipe | `CRD.RVSG` + tipo de aporte + `CTAP` |
| **2** | Cargar beneficiarios con su certificado y **pagar por porcentaje** | `CRD.CBBP` (ya autorizada) + reparto |

⇒ **La fase 1 NO necesita `CRD.CBBP`.** Se puede registrar hoy y pagar cuando la fase 2 esté lista:
el dinero queda en el saldo del partícipe mientras tanto, que es exactamente donde tiene que estar.

---

## 1. Tabla nueva `CRD.RVSG` — Recepción de Valores de Seguro

⛔ **DDL sobre `CRD`: necesita el OK del usuario**, igual que `CBBP`. Nombre verificado libre contra
los `@Table` de `src/main/java/com/saa/model/` (cero ocurrencias, igual que `RCSG`, `VSGR`, `RSGR`).
El control contra `ALL_TABLES` va como bloque 0 del propio DDL.

**Se calca de `CRD.CBCR` (`CobroCredito`)**, que ya tiene el ciclo registro → aprobación → asiento
probado en producción. Mismos nombres de campo, mismo estilo:

| Campo Java | Columna | Copiado de | Notas |
|---|---|---|---|
| `codigo` | `RVSGCDGO` | `CBCRCDGO` | PK, `SQ_RVSGCDGO` |
| `entidad` | `ENTDCDGO` | igual | El partícipe fallecido |
| `tipoAporte` | `TPAPCDGO` | — | A qué tipo entra el valor. **No se quema el código en Java** |
| `estado` | `RVSGESTD` | `CBCRESTD` | 1 REGISTRADO · 2 APROBADO · 3 RECHAZADO · 4 ANULADO |
| `cuentaBancaria` | `CNBCCDGO` | igual | Cuenta ASOPREP donde entró el dinero (`CuentaBancaria`) |
| `referencia` | `RVSGRFRN` | `CBCRRFRN` | `VARCHAR2(100)` |
| `rutaRespaldo` | `RVSGRTRS` | `CBCRRTRS` | `VARCHAR2(2000)` — **es una ruta, no un adjunto de `ADJN`** |
| `valor` | `RVSGVLRR` | `CBCRVLRR` | |
| `fecha` | `RVSGFCHA` | `CBCRFCHA` | Fecha de recepción |
| `observacion` | `RVSGOBSR` | `CBCROBSR` | `VARCHAR2(2000)` |
| `asiento` | `ASNTCDGO` | — | El asiento generado al aprobar |
| `usuarioRegistro` / `fechaRegistro` | `RVSGUSRG` / `RVSGFCRG` | igual | |
| `usuarioAprobacion` / `fechaAprobacion` | `RVSGUSAP` / `RVSGFCAP` | igual | |
| `usuarioRechazo` / `fechaRechazo` / `motivoRechazo` | `RVSGUSRC` / `RVSGFCRC` / `RVSGMTRC` | igual | |
| `usuarioAnulacion` / `fechaAnulacion` / `motivoAnulacion` | `RVSGUSAN` / `RVSGFCAN` / `RVSGMTAN` | igual | |

---

## 2. Configuración que va por datos, no por código

1. **Tipo de aporte nuevo** en `CRD.TPAP` — p. ej. «VALOR DE SEGURO POR ENTREGAR A BENEFICIARIOS».
2. **Fila en `CRD.CTAP`** para ese tipo y la empresa: `cuentaPasivo = 2.3.90.90.11`.
3. `CTAP` ya tiene REST (`CuentaTipoAporteRest`), así que el paso 2 se puede hacer por pantalla.

⛔ **Ningún código de tipo de aporte quemado en Java.** El service lee el tipo de la fila `RVSG`.

---

## 3. Contrato de API — `/rest/rvsg`

Todas las respuestas siguen el estilo de `PrestamoRest`:
`{ "exito": bool, "etapa": "...", "mensaje": "...", "resultado": {...} }`.

### `POST /rest/rvsg/registrar`

```json
{ "idEntidad": 1234, "idTipoAporte": 26, "idEmpresa": 1, "valor": 1000.00,
  "fecha": "2026-09-21", "idCuentaBancaria": 5, "referencia": "004512873",
  "rutaRespaldo": "/uploads/...", "observacion": "Sepelio — póliza 998",
  "usuario": "LCALDERON" }
```

- **201/200** → la recepción queda en estado **1 REGISTRADO**. ⛔ **No genera asiento y no toca el
  saldo del partícipe todavía.**
- **400** si falta cualquier obligatorio, si `valor <= 0`, o si la fecha es futura.
- **409** si el partícipe no existe o el tipo de aporte no está vigente.

### `POST /rest/rvsg/{id}/aprobar`

```json
{ "usuario": "CONTABILIDAD", "idEmpresa": 1 }
```

Acá pasa **todo** lo que importa, y en una sola transacción:

1. Genera **un** asiento: **DEBE** la cuenta contable de `cuentaBancaria`, **HABER** la
   `cuentaPasivo` de `CTAP` para ese tipo de aporte y empresa (**2.3.90.90.11**).
2. Registra el **aporte positivo** del tipo indicado a nombre del partícipe, para que el valor
   quede en su saldo.
3. Pasa a estado **2 APROBADO** y guarda `asiento`, `usuarioAprobacion` y `fechaAprobacion`.

- **409** si no está en estado 1, o si `CTAP` no tiene cuenta configurada para ese tipo y empresa
  (mensaje que **nombre el tipo y la empresa**, como hace `generarAsientoReclasificacion:1305`).
- ⛔ **Un solo asiento.** Nada de transitorio + definitivo: el usuario pidió dos asientos en todo el
  ciclo y el segundo es el del pago (fase 2).

### `POST /rest/rvsg/{id}/rechazar` · `POST /rest/rvsg/{id}/anular`

Cuerpo: `{ "usuario": "...", "motivo": "..." }`.
- **rechazar**: sólo desde estado 1. No hay asiento que revertir.
- **anular**: desde estado 2. **Reversa el asiento y el aporte**; si el saldo del partícipe ya no
  alcanza porque se pagó, **rechaza con 409** en vez de dejar el saldo negativo (mismo criterio que
  H61 / `INVARIANTE-SALDO-APORTES.md`).

### Consultas

- `GET /rest/rvsg/porEntidad/{idEntidad}` — todas las recepciones de un partícipe.
- `GET /rest/rvsg/pendientes` — las de estado 1, para la bandeja de contabilidad.
- `POST /rest/rvsg/selectByCriteria` — estándar de la casa.

---

## 4. Frontend — fase 1

1. **Pantalla de registro** en el menú de Créditos: buscar partícipe, valor, fecha, cuenta ASOPREP
   donde entró el dinero, referencia, respaldo digitalizado y observación.
   El respaldo se sube igual que en `Registrar pago de cuotas` (`rutaRespaldo`, no `ADJN`).
2. **Aprobación**: agregar las recepciones pendientes a la bandeja de contabilidad, o una pestaña
   propia si mezclarlas con los cobros complica la que ya existe. **Reusar el patrón, no inventarlo.**
3. La pantalla debe decir claramente que **al aprobar recién ahí entra el dinero a la cuenta del
   partícipe**, igual que el aviso que ya tiene el diálogo de cobro.

---

## 5. Lo que NO se hace en la fase 1

- ⛔ Nada de `CRD.CBBP`, beneficiarios ni reparto por porcentaje: es la fase 2.
- ⛔ No se toca `DevolucionAporteServiceImpl` todavía.
- ⛔ No se toca `cxp`, `cxc`, `pagos`, `tsr`, `rhh`, `sri`.
