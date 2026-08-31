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

**Lo que se paga puede salir de dos fuentes**: cruce con los saldos de aportes del socio, y/o
depósito o transferencia. **Solo la parte de depósito pasa por contabilidad**, y eso cambia el
flujo:

```
CON DEPÓSITO (valorPagarDeposito > 0)
  Crédito previsualiza y CONFIRMA  →  acuerdo VIGENTE + cobro en CBCR por la parte del depósito
  Contabilidad APRUEBA el cobro    →  la plata está verificada
  Crédito PROCESA el cobro         →  cruce de aportes, cuotas cerradas, condonación, CANCELADO

TODO CON APORTES (valorPagarDeposito = 0)
  Crédito previsualiza y CONFIRMA  →  se aplica en el acto: acuerdo APLICADO, préstamo CANCELADO
                                      Sin CBCR y sin aprobación: no hay depósito que verificar
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
| `POST` | `/rest/accn/registrar` | **201** + la entidad `AcuerdoCondonacion`. Con depósito viene VIGENTE y con `cobroCredito`; sin depósito viene ya APLICADO y `cobroCredito: null` |
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

⚠️ **El monto a pagar se compone de DOS FUENTES** (agregado el 2026-08-30): lo que se cubre
cruzando saldos de aportes del socio, y lo que se cubre con depósito o transferencia. Suman exacto
`valorPagar` (tolerancia $0.01).

```jsonc
{
  "idPrestamo": 67830,
  "idEmpresa": 1236,               // OBLIGATORIO, siempre — ver abajo
  "fecha": "2026-08-30",
  "observacion": "",
  "usuario": "GROBAYO",

  // --- Fuente 1: cruce con saldos de aportes del socio ---
  "valorPagarAportes": 400.00,
  "aportes": [ { "idTipoAporte": 11, "valor": 250.00 },
               { "idTipoAporte": 9,  "valor": 150.00 } ],

  // --- Fuente 2: depósito o transferencia. Los tres campos de abajo son
  //     OBLIGATORIOS si valorPagarDeposito > 0, y se RECHAZAN si es 0 ---
  "valorPagarDeposito": 890.30,
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

### ⛔ `idEmpresa` es OBLIGATORIO, con y sin depósito

Agregado el 2026-08-30. **Sin él, `registrar` falla.**

**Por qué no se deriva:** la contabilización necesita la empresa, y un acuerdo cubierto 100% con
aportes **no tiene cobro** del cual sacarla. No hay otra fuente — ni el préstamo, ni el producto,
ni la entidad, ni la filial la tienen. Se guarda en el acuerdo (`ACCN.PJRQCDGO`) y **los dos
caminos la leen de ahí**, nunca del cobro: así no pueden divergir.

⚠️ **Si mandás depósito, la empresa tiene que ser la misma de la cuenta bancaria elegida.** Si
difieren, el registro se rechaza — es el único momento en que esa incoherencia se puede detectar
barato; detectarla al contabilizar es tarde.

### ⛔ Las dos fuentes cambian CUÁNDO se aplica el acuerdo

| `valorPagarDeposito` | Qué pasa |
|---|---|
| **> 0** | Se crea un `CBCR` **por el monto del depósito, no por `valorPagar`**. El acuerdo queda **VIGENTE** esperando que contabilidad apruebe ese cobro; se aplica al procesarlo |
| **= 0** (todo con aportes) | **No hay `CBCR` ni aprobación de contabilidad.** El acuerdo se aplica **en el mismo acto del registro** y vuelve ya **APLICADO**, con `cobroCredito: null` |

**Por qué la diferencia, y no es una excepción arbitraria:** la regla de esperar (K11) existe porque
**el depósito podría no llegar nunca** — cancelar el préstamo antes de verificarlo dejaría una deuda
condonada contra dinero inexistente. Cuando todo sale de saldos que **ya están en el sistema**, no
hay nada que pueda no llegar, y esperar no protegería de nada.

El control sobre el perdón es el mismo en los dos caminos: la condonación **nunca** tuvo aprobación
(K4 derogada), contabilidad solo verifica el dinero.

⚠️ **El saldo de aportes se revalida al PROCESAR, no al registrar.** Entre los dos momentos puede
pasar la aprobación de contabilidad, y el socio pudo haber gastado ese saldo. Si falla, el error
nombra el tipo de aporte y el monto que faltó.

⚠️ **`valorAdeudado` NO es una decisión del operador, es un hecho del préstamo.** Mandá exactamente
lo que devolvió `previsualizar` **para la misma `fecha`** que enviás en el registro. Si previsualizás
con una fecha y registrás con otra, los adeudados no van a corresponder.

### Respuesta de `registrar`

La entidad `AcuerdoCondonacion` completa: `codigo`, `entidad`, `prestamo`, `estado` (1 VIGENTE con depósito, 2 APLICADO sin él),
`valorPagar`, `valorPagarAportes`, `valorPagarDeposito`, `valorCondonar`, `fecha`, `observacion`, `usuarioRegistro`, `fechaRegistro`,
`eventoPrestamo` (null hasta procesar), y **`cobroCredito` enlazado solo si hubo depósito** — de ahí sale el
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
