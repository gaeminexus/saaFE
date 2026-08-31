# API — anular y recontabilizar un documento CXP

**2026-08-31 · equipo `omen-saa-3` · verificado contra el código, backend compilado.**
Diseño y razones: `DISENO-ANULAR-VS-RECONTABILIZAR-FACTURA-COMPRA.md`.

Base: `/SaaBE/rest/carga-documentos` — **no** `/api/...`.

---

## 1. Tres operaciones que NO borran nada

⛔ **No confundir con `POST /revertir/{id}`, que sí borra.** Son cuatro operaciones distintas y
elegir la equivocada es destructivo:

| Operación | Qué le pasa a la factura | Estado final del documento | ¿Reprocesable? |
|---|---|---|---|
| `/revertir/{id}` | **se borra** de la base | `REVERTIDO(6)` | sí |
| `/anularContabilidad/{id}` | intacta, sin asiento | `XML_CARGADO(2)` | sí, con `/recontabilizar` |
| `/recontabilizar/{id}` | intacta, con asiento nuevo | `REGISTRADO_BD(3)` | — |
| `/anularDocumento/{id}` | anulada, se conserva | `ANULADO(7)` | **NO — terminal** |

**El pago se anula aparte**, desde la bandeja de pagos. Los tres endpoints nuevos **verifican** que
no queden pagos vigentes y devuelven **409** si los hay; no anulan ninguno.

---

## 2. Los dos flujos

### Caso A — anulación verdadera

```
1. Anular el pago            (bandeja de pagos)
2. POST /fctc/anular         { idFacturaCompra, motivo, usuario, idUsuario, anularEnCascada }
3. POST /carga-documentos/anularDocumento/{idDocumentoCxp}   { motivo, idUsuario }
```

El paso 3 es el que marca `ANULADO(7)`. **Es terminal**: ese documento no vuelve a procesarse nunca.

### Caso B — regenerar sólo la contabilidad

```
1. Anular el pago                        (bandeja de pagos)
2. POST /carga-documentos/anularContabilidad/{id}   { motivo, idUsuario }
3. ---- corregir la cuenta contable del grupo de producto ----
4. POST /carga-documentos/recontabilizar/{id}       { idUsuario }
```

**Son dos pasos a propósito:** el arreglo del catálogo va entre el 2 y el 4. La factura no se toca
en ningún momento — sólo cambia el asiento.

---

## 3. Contrato de cada endpoint

### `POST /carga-documentos/anularContabilidad/{idDocumentoCxp}`

```jsonc
// Request
{ "motivo": "cuenta del grupo de producto mal configurada", "idUsuario": 1 }

// 200
{
  "exito": true,
  "idDocumentoCxp": 812,
  "estadoDocumento": 2,
  "mensaje": "Contabilidad anulada. Corrija las cuentas del grupo de producto y luego use Recontabilizar para generar el asiento nuevo."
}
```

- **409** si el documento no está en `REGISTRADO_BD(3)`, o si hay pagos programados vigentes.
- **500** para cualquier otro fallo.

### `POST /carga-documentos/recontabilizar/{idDocumentoCxp}`

```jsonc
// Request
{ "idUsuario": 1 }

// 200
{
  "exito": true,
  "idDocumentoCxp": 812,
  "estadoDocumento": 3,
  "asiento": "CXP-2026-08-0117",
  "mensaje": "Documento recontabilizado correctamente."
}
```

- **409** si el documento no está en `XML_CARGADO(2)`, si no es `FACTURA_COMPRA`, o si el asiento no
  se puede generar (por ejemplo, la cuenta sigue mal).
- ⚠️ **Cuando falla, el documento QUEDA en `XML_CARGADO(2)`** — no vuelve solo a `REGISTRADO_BD`.
  Es deliberado: se corrige el catálogo y se reintenta el paso 4 sin rehacer el 2. **El frontend no
  debe asumir que un 409 dejó el documento como estaba antes de llamar.**
- `asiento` puede venir **null** aunque `exito` sea `true`, si el asiento se generó sin número
  alterno. No usarlo para decidir si la operación salió bien: para eso está `exito`.

### `POST /carga-documentos/anularDocumento/{idDocumentoCxp}`

```jsonc
// Request
{ "motivo": "anulada ante el SRI", "idUsuario": 1 }

// 200
{
  "exito": true,
  "idDocumentoCxp": 812,
  "estadoDocumento": 7,
  "mensaje": "Documento anulado. Este estado es definitivo: no se puede reprocesar."
}
```

- **409** si el documento ya está anulado, o si hay pagos vigentes.
- ⚠️ **Este endpoint NO anula la factura** — sólo marca el documento. La factura se anula antes con
  `POST /fctc/anular`. Llamar sólo a éste deja una factura viva bajo un documento anulado.

### Forma del error (los tres)

```jsonc
{ "error": "No se puede anular la contabilidad: la factura tiene 1 pago(s) programado(s) vigente(s) [443 (estado 1)]. Anúlelos primero desde la bandeja de pagos." }
```

El mensaje **nombra los ids y sus estados**: mostrarlo tal cual, es lo que le dice al usuario qué
pago tiene que ir a anular.

---

## 4. Trampas

1. **`estadoDocumento` en la respuesta es el estado NUEVO**, ya aplicado. No hace falta recargar el
   documento para saber cómo quedó.
2. **`ANULADO(7)` es terminal.** La pantalla debe deshabilitar reprocesar, recontabilizar y revertir
   sobre un documento en ese estado. El backend igual lo rechaza, pero ofrecer el botón es engañoso.
3. **`XML_CARGADO(2)` es ambiguo entre dos situaciones**, y hay que mirar `observacion` para
   distinguirlas: puede ser un documento que nunca se registró, o uno **recién descontabilizado**
   (la observación arranca con `CONTABILIDAD ANULADA`). Ese estado ya se usaba antes para reembolsos
   pendientes de sustento, así que el frontend no puede inferir el caso sólo del número.
4. **La recontabilización sólo está implementada para `FACTURA_COMPRA`.** Los demás tipos devuelven
   409 con ese texto.
5. **`/revertir` ahora rechaza facturas con pagos programados en cualquier estado**, incluidos los
   anulados — antes reventaba con `ORA-02292`. El mensaje orienta a cuál de las otras operaciones
   usar.
