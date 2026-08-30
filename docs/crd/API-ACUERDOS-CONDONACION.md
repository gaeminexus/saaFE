# API — Acuerdos de pago con condonación (`CRD.ACCN`)

**Fecha:** 2026-08-30 · **Módulo:** CRD · **Base URL:** `/SaaBE/rest/accn`
**Estado:** contrato CONGELADO. Backend construido, **no desplegado**. DDL **no corrido en producción**.
**Espejo:** `saaFE/docs/crd/API-ACUERDOS-CONDONACION.md`
**Diseño y decisiones:** `PLAN-ACUERDOS-PAGO-CONDONACION.md` (K1–K11)

---

## 0. Qué es, en una frase

Perdonar parte de lo que debe un préstamo **en mora o de plazo vencido**, cobrando el resto en el
acto. El préstamo queda **liquidado**.

**No hay aprobación de la condonación.** La **previsualización en pantalla es el control** — el
operador ve exactamente qué se perdona por concepto antes de confirmar. Lo que sí se aprueba,
después, es que **el dinero haya entrado**, por la bandeja de contabilidad como cualquier cobro.

```
Crédito previsualiza y CONFIRMA  →  acuerdo VIGENTE + cobro en CBCR (mismo acto)
Contabilidad APRUEBA el cobro    →  la plata está verificada
Crédito PROCESA el cobro         →  cuotas cerradas, condonación, préstamo CANCELADO
```

⚠️ **La pantalla del acuerdo NO tiene botón de procesar.** El acuerdo se registra acá; se aplica
desde la pantalla de **proceso de crédito** del circuito de cobros, como cualquier otro cobro.

---

## 1. Los cinco conceptos

Rubro alterno **248** (`CrdConceptoPrestamo`). Cada uno lleva **adeudado**, **pagado** y
**condonado**.

| `concepto` | Nombre | ¿Condonable? |
|---|---|---|
| 1 | Capital | Sí |
| 2 | Interés | Sí |
| 3 | Mora | Sí |
| 4 | Desgravamen | **No** — `valorCondonado` siempre 0 |
| 5 | Seguro de incendio | **No** — `valorCondonado` siempre 0 |

**Los 5 van siempre, sin repetir**, aunque un concepto valga 0. En cada uno,
`valorPagado + valorCondonado` debe cubrir **exacto** `valorAdeudado` (tolerancia $0.01): el
acuerdo liquida el préstamo completo, no deja remanente (K1).

⚠️ **Los seguros no son editables en pantalla y su suma es el PISO del monto a pagar** (K3). No es
una validación cosmética: el backend la rechaza, y la base tiene un `CHECK` que la respalda.

## 2. Estados del acuerdo (rubro alterno **247**)

| Valor | Estado | Cuándo |
|---|---|---|
| 1 | `VIGENTE` | Recién confirmado, esperando que su cobro se procese |
| 2 | `APLICADO` | El proceso del cobro corrió (K11) |
| 3 | `ANULADO` | Se anuló el cobro antes de procesarlo — en cascada, nunca por sí solo |

---

## 3. Endpoints

| Verbo | Ruta | Devuelve |
|---|---|---|
| `GET` | `/rest/accn/previsualizar/{idPrestamo}?fecha=yyyy-MM-dd` | `DesgloseConceptosPrestamo`. `fecha` opcional, default hoy |
| `POST` | `/rest/accn/registrar` | **201** + la entidad `AcuerdoCondonacion` con su `cobroCredito` ya enlazado |
| `GET` | `/rest/accn/getId/{id}` | `{ cabecera, detalle }` |
| `GET` | `/rest/accn/bandeja/{estado}` | Lista por estado (1/2/3) |
| `GET` | `/rest/accn/porPrestamo/{idPrestamo}` | Historial del préstamo |
| `GET` | `/rest/accn/porEntidad/{idEntidad}` | Historial del partícipe |
| `GET` | `/rest/accn/getAll` | Todos. Diagnóstico, no pantalla |

**No existen `/aprobar` ni `/rechazar`.** Se eliminaron al derogarse K4.

### `GET /previsualizar/{idPrestamo}` — el control

```jsonc
{ "idPrestamo": 67830, "fecha": "2026-08-30",
  "capitalPendiente": 1250.00, "interesPendiente": 84.30,
  "moraPendiente": 12.50, "desgravamenPendiente": 6.00,
  "seguroIncendioPendiente": 0.00 }
```

Solo lectura, no registra nada. **La mora viene recalculada a `fecha`**, no leída de lo persistido.

⚠️ **Esto es lo que reemplaza a la aprobación de un segundo usuario, así que mostralo tal cual y
completo.** Los cinco conceptos visibles, con lo adeudado al lado de lo que el operador decide
pagar, y el condonado calculándose a la vista. Un resumen que esconda conceptos convierte el
control en un trámite.

### `POST /registrar`

```jsonc
{
  "idPrestamo": 67830,
  "fecha": "2026-08-30",
  "observacion": "",
  "usuario": "GROBAYO",
  "idCuentaBancaria": 7,
  "referencia": "TRF-1204",
  "rutaRespaldo": "acuerdos/2026/08/comprobante.pdf",
  "detalles": [
    { "concepto": 1, "valorAdeudado": 1250.00, "valorPagado": 1250.00, "valorCondonado": 0.00 },
    { "concepto": 2, "valorAdeudado": 84.30,   "valorPagado": 34.30,   "valorCondonado": 50.00 },
    { "concepto": 3, "valorAdeudado": 12.50,   "valorPagado": 0.00,    "valorCondonado": 12.50 },
    { "concepto": 4, "valorAdeudado": 6.00,    "valorPagado": 6.00,    "valorCondonado": 0.00 },
    { "concepto": 5, "valorAdeudado": 0.00,    "valorPagado": 0.00,    "valorCondonado": 0.00 }
  ]
}
```

**`idCuentaBancaria`, `referencia` y `rutaRespaldo` son obligatorios**: el registro crea el acuerdo
**y su cobro en `CBCR` en el mismo acto**, y ese cobro necesita su respaldo como cualquier otro.

⚠️ **`valorAdeudado` NO es una decisión del operador, es un hecho del préstamo.** Mandá exactamente
lo que devolvió `previsualizar` **para la misma `fecha`** que enviás en el registro. Si previsualizás
con una fecha y registrás con otra, los adeudados no van a corresponder.

### Respuesta de `registrar`

La entidad `AcuerdoCondonacion` completa: `codigo`, `entidad`, `prestamo`, `estado` (1),
`valorPagar`, `valorCondonar`, `fecha`, `observacion`, `usuarioRegistro`, `fechaRegistro`,
`eventoPrestamo` (null hasta procesar), y **`cobroCredito` ya enlazado** — de ahí sale el
`codigo` del cobro que va a aparecer en la bandeja de contabilidad.

⚠️ **`valorPagar` y `valorCondonar` NO se envían: el backend los calcula sumando el detalle.** No
son datos de entrada independientes, por diseño, así que cabecera y detalle no pueden divergir.

### ⛔ Tres campos con nombre engañoso

`usuarioRechazo` / `fechaRechazo` / `motivoRechazo` **significan ANULACIÓN, no rechazo.** El nombre
quedó del diseño anterior (K10, derogada). Se llenan **solo** cuando se anula el cobro, copiados de
la anulación del `CBCR`. **No los muestres como "motivo del rechazo"** — un acuerdo nunca se
rechaza.

`usuarioAprobacion` / `fechaAprobacion` **están sin uso y siempre vienen null** desde que se derogó
K4. No los muestres.

### Errores

**Siempre HTTP 500** con `{"mensaje": "..."}`. `registrar` es el único **201**; las lecturas, 200.
`FAIL_ON_UNKNOWN_PROPERTIES` activo: un campo de más devuelve **400**.

⚠️ Fechas: `LocalDate` → `"yyyy-MM-dd"`. Los `fecha*` de traza son `LocalDateTime` → ISO local
**sin zona**. Nunca un `Date` crudo ni nada terminado en `Z`.

---

## 4. Universo: qué préstamos admiten acuerdo

Solo **`EN_MORA (11)`** o **`DE_PLAZO_VENCIDO (8)`**, decidido por **`PRSTIDST`** — nunca por
`ESPSCDGO`, que es la FK al catálogo y no el estado operativo. El backend lo valida; la pantalla
debería filtrar antes para no ofrecer lo que va a ser rechazado.

## 5. Lo que la pantalla NO hace

- **No procesa.** Eso vive en la pantalla de proceso de crédito del circuito de cobros.
- **No aprueba nada.** No hay bandeja de acuerdos pendientes de aprobación: no existe ese estado.
- **No anula el acuerdo directamente.** La anulación llega en cascada al anular su cobro, desde la
  pantalla de cobros. No hay endpoint propio, y es deliberado: evita que quede un acuerdo anulado
  con su cobro vivo.
