# API — Abono a capital con aportes del partícipe

**Estado:** CONTRATO CONGELADO, sin implementar (2026-10-12) · **Dueño:** `omen-saa-1`
**Diseño y decisiones:** `docs/logica-negocio/crd/DISENO-ABONO-CAPITAL-CON-APORTES.md` (AA1–AA8, solo en saaBE).
**Espejo:** `saaFE/docs/crd/API-ABONO-CAPITAL-CON-APORTES.md`. Si los dos difieren, manda el de saaBE.

Base: `/SaaBE/rest`. Las fechas viajan como `yyyy-MM-dd`, nunca como `Date` crudo ni con `Z`.

---

## 0. Qué cambia, en una tabla

| Cómo paga el socio | Camino | ¿Aprueba contabilidad? | Endpoint |
|---|---|---|---|
| 100% depósito | CBCR `ABONO_CAPITAL` | Sí | `POST /cbcr/registrar` — **sin cambios** |
| Depósito + aportes | CBCR `ABONO_CAPITAL` con `detalles[0].aportes` | Sí | `POST /cbcr/registrar` — **NUEVO: ahora admite `aportes`** |
| 100% aportes | Directo, se aplica en el acto | No | `POST /prst/abonarCapitalConAportes` — **NUEVO** |

- `POST /prst/abonarCapital` **sigue respondiendo 409.** No se reabre.
- La simulación no cambia. Se simula con el **total** del abono (depósito + aportes): `GET /prst/simularAbonoCapital/{idPrestamo}?valor={total}&modalidad={1|2}`.
- Los tipos de aporte y su saldo salen de `GET /aprt/saldosPorEntidad/{idEntidad}`, igual que en la precancelación.

---

## 1. Abono mixto por CBCR — `POST /cbcr/registrar`

Es el mismo cuerpo que el abono de hoy, más `aportes` en la única línea:

```json
{
  "idEntidad": 1234,
  "tipoOperacion": "ABONO_CAPITAL",
  "idCuentaBancaria": 7,
  "referencia": "DEP-998877",
  "rutaRespaldo": "crd/cobros/....pdf",
  "valor": 300.00,
  "fecha": "2026-10-12",
  "fechaAfectacion": "2026-10-12",
  "observacion": null,
  "usuario": "jperez",
  "detalles": [{
    "idPrestamo": 5555,
    "valor": 300.00,
    "modalidad": 1,
    "aportes": [ { "idTipoAporte": 11, "valor": 150.00 },
                 { "idTipoAporte": 9,  "valor": 50.00 } ]
  }]
}
```

**Reglas:**
- **`valor` (cabecera y línea) es SOLO el depósito**, igual que en la precancelación mixta. El abono total es `valor + Σ aportes`; en el ejemplo, 500,00.
- El depósito sigue siendo **obligatorio y > 0**, con cuenta bancaria, referencia y respaldo. Si el socio paga todo con aportes, el abono **no va por aquí**: va por §2.
- `aportes` se valida al registrar con las mismas reglas que la precancelación:
  - lista no vacía;
  - cada `valor` > 0;
  - sin tipos repetidos;
  - tipo vigente;
  - saldo suficiente, con tolerancia de 0,01.
- `aportes` **sigue rechazándose** en `PAGO_CUOTA`, `PAGO_MULTIPLE`, `COBRO_MIXTO`, `REGISTRO_APORTE` y los demás tipos. Ahora se admite **solo en `PRECANCELACION` y `ABONO_CAPITAL`**.
- **El saldo de aportes NO se reserva al registrar.** Al **procesar** se valida otra vez el saldo y se vuelve a simular el abono con el total. Si alguna de las dos cosas falla, el cobro pasa a **RECHAZADO** con usuario `SISTEMA` y el motivo, y `procesar` responde `procesado=false`. Es el mismo comportamiento que la precancelación mixta.
- Al procesar se consume el aporte: se escribe un APRT negativo en estado CONSUMIDO y un `PagoAporte` enlazado al pago del abono.
- Si se **anula o reversa** el cobro, el aporte **se restituye** con un APRT positivo de tipo REVERSO.
- **Respuestas:** las mismas de `/cbcr/registrar` de hoy (`API-COBROS-APROBACION-CONTABILIDAD.md`). Un desglose inválido da 422 con el motivo en `mensaje`.

### 1.1 La bandeja ve los aportes — `GET /cbcr/getId/{id}`

La respuesta suma un campo nuevo. Los dos que ya tenía no cambian:

```json
{
  "cabecera": { ... },
  "detalle": [ ... ],
  "aportesConsumidos": [
    { "idDetalleCobro": 901, "idTipoAporte": 11, "nombreTipoAporte": "CESANTIA", "valor": 150.00 },
    { "idDetalleCobro": 901, "idTipoAporte": 9,  "nombreTipoAporte": "JUBILACION", "valor": 50.00 }
  ]
}
```

- Un cobro sin aportes devuelve `"aportesConsumidos": []`, nunca `null`.
- El campo también aparece en las precancelaciones mixtas, que hasta hoy tampoco mostraban sus aportes.

### 1.2 Editar y reenviar un cobro rechazado — `POST /cbcr/{id}/reenviar`

Al corregir un abono o una precancelación mixta rechazada, se borran los aportes anteriores de la línea y se graban los que trae la corrección. Hoy se pierden, o el reenvío revienta por la FK.

---

## 2. Abono 100% aportes — `POST /prst/abonarCapitalConAportes`

```json
{
  "idEmpresa": 1,
  "idPrestamo": 5555,
  "modalidad": 1,
  "aportes": [ { "idTipoAporte": 11, "valor": 500.00 } ],
  "usuario": "jperez",
  "observacion": "Abono con cesantía",
  "fecha": "2026-10-12",
  "fechaAfectacion": "2026-10-12",
  "rutaDocumentoRespaldo": null
}
```

**Reglas:**
- **No hay campo `valor`.** El abono es `Σ aportes`; mandarlo aparte solo abriría la puerta a que no cuadre.
- `idEmpresa`, `idPrestamo`, `modalidad` (1 o 2), `aportes` (no vacío) y `usuario` son obligatorios.
- `fechaAfectacion` sigue las reglas de la precancelación directa (`API-FECHA-AFECTACION-COBRO.md` §2bis): obligatoria, no menor a `fecha`, no futura, y en un período abierto.
- `rutaDocumentoRespaldo` es **opcional**. No entra dinero de afuera, así que no hay comprobante bancario.
- Las validaciones del abono son las mismas de la simulación: préstamo al día, abono menor al capital pendiente, y la cuota nueva tiene que cubrir el interés.
- Se aplica en el acto. Genera **un solo asiento**: Debe las cuentas de aporte; Haber el capital por banda; más el re-bandeo del saldo que queda.
- El abono se anula con `POST /prst/anularOperacion` `{ idEvento, usuario, motivo }`, igual que un pago con aportes. La anulación restaura la tabla, restituye el aporte y anula el asiento.

**200 OK:**
```json
{
  "exito": true,
  "etapa": "APLICACION",
  "mensaje": "Abono a capital con aportes aplicado por $500.00. Plazo: 48 → 41 cuotas.",
  "resultado": { /* ResultadoAbonoCapital: el mismo objeto que hoy devuelve el abono procesado por CBCR */
    "idPrestamo": 5555, "idEvento": 7777, "idPagoPrestamo": 8888, "valorAbono": 500.00,
    "modalidad": 1, "plazoAnterior": 48, "plazoNuevo": 41, "cuotaAnterior": 210.33, "cuotaNueva": 210.33,
    "cuotasHistorizadas": 41, "cuotasGeneradas": 41, "...": "..." },
  "movimientosAporte": [ { "idTipoAporte": 11, "valor": -500.00, "...": "..." } ]
}
```
`movimientosAporte` tiene la misma forma que en `POST /prst/pagarConAportes`.

**Errores.** Todos con `{ exito:false, etapa, mensaje, error }`:

| HTTP | `error` | Cuándo | Qué hace la pantalla |
|---|---|---|---|
| 400 | `PARAMETRO_INVALIDO` o el mensaje | Falta un campo obligatorio, modalidad fuera de 1/2, o `aportes` vacío | Muestra el mensaje |
| 400 | `FECHA_AFECTACION_OBLIGATORIA` / `FECHA_AFECTACION_MENOR_A_PAGO` / `FECHA_AFECTACION_FUTURA` / `PERIODO_CERRADO` | Fecha de afectación inválida | Muestra el mensaje |
| 404 | `PRESTAMO_NO_ENCONTRADO` | — | Muestra el mensaje |
| 422 | `SALDO_APORTES_INSUFICIENTE` / `TIPO_APORTE_NO_VIGENTE` | El desglose no se puede financiar | Recarga los saldos y muestra el mensaje |
| 422 | `PRESTAMO_NO_AL_DIA` | Hay una cuota vencida o parcial | Ofrece «Pagar cuotas» (`ir-a-pagar`), igual que hoy |
| 422 | `ABONO_CUBRE_CAPITAL` | El abono cubre todo el capital | Ofrece «Precancelar» (`ir-a-precancelar`), igual que hoy |
| 422 | `CUOTA_NO_CUBRE_INTERES`, `SIN_CUOTAS_PENDIENTES`, `POLIZA_SIN_CUOTAS_EN_VIGENCIA` | Las mismas reglas del abono de hoy | Muestra el mensaje |
| 500 | — | Imprevisto | Muestra el mensaje |

---

## 3. Trampas

- **`aportes` en `ABONO_CAPITAL` CONSUME saldo del socio.** Lo mismo pasa en `PRECANCELACION`. Es lo **opuesto** a una línea de aporte en `COBRO_MIXTO`, donde el socio entrega plata y su saldo sube (`API-COBROS-APROBACION-CONTABILIDAD.md`).
- **En CBCR, `valor` es solo el depósito.** Si el FE manda el total, el banco recibe un asiento por plata que nunca entró.
- **La simulación se hace con el total**, no con el depósito. Simular con el depósito muestra una tabla que no es la que se va a aplicar.
- El saldo de aportes que se ve al registrar puede cambiar antes de que contabilidad procese. Un rechazo por `SISTEMA` en ese momento **no es un error**: es la guarda.
