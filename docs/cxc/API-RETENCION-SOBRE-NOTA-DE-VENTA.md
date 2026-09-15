# API — Retención emitida sobre una nota de venta

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-15 · **Estado:** congelado, verificado contra el código
**Diseño:** `saaBE/docs/logica-negocio/cxc/PLAN-RETENCION-SOBRE-NOTA-DE-VENTA.md`
**Espejo:** `saaFE/docs/cxc/API-RETENCION-SOBRE-NOTA-DE-VENTA.md`

> **No hay endpoint nuevo.** Este contrato fija cómo se usan los que ya existen para que una nota de
> venta sea documento sustento, y qué hace el backend con ella. Verificado leyendo el `.java`, no el plan.

---

## 1. Qué es una nota de venta para el sistema

Una fila de `PGS.FCTC` (`FacturaCompra`) con **`tipoComprobante = "02"`**. Llega por
`GET /rest/fctc/...` y `POST /rest/fctc/selectByCriteria` junto con las facturas, **en el mismo arreglo**.

| Campo del JSON | En una nota de venta |
|---|---|
| `tipoComprobante` | `"02"` — ⚠️ es lo **único** que la distingue de una factura |
| `numero` | `"EEE-PPP-SSSSSSSSS"` con guiones |
| `autorizacion` | número de autorización **preimpreso** (no único por documento) |
| `clave`, `ambiente`, `fechaAutorizacion` | `null` |
| `subtotal` | base de la nota |
| `subcero`, `vIVA`, `pIVA` | `0` (no lleva IVA) |
| `total` | total de la nota |
| `estadoPago` | `1` pendiente · `2` parcial · `3` pagada (puede venir `null` en filas viejas) |

## 2. Buscar las notas de venta de un proveedor

```
POST /SaaBE/rest/fctc/selectByCriteria
body: [ criterio titular.codigo IGUAL <idProveedor> ]
```

El backend **no** filtra por tipo. **El cliente filtra**:

- nota de venta: `tipoComprobante === '02'`
- factura: `tipoComprobante !== '02'` (una fila vieja con `tipoComprobante` nulo cuenta como factura)

Precedente ya en producción: `saaFE` `cxp/forms/pagos/solicitud-pago/solicitud-pago.component.ts:313-317`.

Respuesta sin filas: el `selectByCriteria` puede responder **error** con
`{ "mensaje": "...no devolvio ningun registro" }` en vez de `[]` (§8.4 del registro de reservas). Tratarlo
como lista vacía, no como fallo.

## 3. Emitir la retención

```
POST /SaaBE/rest/rtv2/procesarCompleta
```

**Mismo cuerpo que para una factura.** Lo único que cambia está en cada elemento de
`retencion.detalleRetencionV2[]`:

| Campo | Valor para nota de venta |
|---|---|
| `tipoDocReten` | **`"02"`** — ⛔ nunca `"01"`: va tal cual al XML como `codDocSustento` |
| `numDocReten` | `numero` de la nota, con o sin guiones (el backend los quita) |
| `fechaEmiDoc` | fecha de la nota, `yyyy-MM-dd` |
| `docResAutorizacion` | `autorizacion` de la nota (no hay `clave`) |
| `docResTSinImpuestos` | `subtotal + subcero` |
| `docResIVACero` | `subcero` |
| `docResTotalIVA` | `vIVA` (`0`) |
| `docResPorIVA` | `pIVA` (`0`) |
| `docResTotal` | `total` |

## 4. Qué hace el backend (medido)

1. **Antes de firmar**, si el facturador genera contabilidad: busca la `FacturaCompra` por
   `numDocReten` sin guiones + proveedor + empresa, **sin mirar el tipo** — encuentra la nota de venta.
   Si no existe o hay más de una con ese número, responde sin emitir, con `etapa: "VALIDACION_FACTURA"` y
   `mensaje` (el texto dice «factura de compra» también para la nota de venta).
2. Genera el XML con `codDocSustento = tipoDocReten`, lo firma y lo envía al SRI.
3. Autorizada: genera el asiento y registra el cruce (`PGS.APLP`) contra esa `FacturaCompra`. El saldo
   de la nota de venta **baja** en el total retenido y su `estadoPago` se recalcula.

Respuestas y códigos HTTP: **idénticos** a los de una factura — ver
`cxc/API-REENVIAR-RETENCION-AL-SRI.md` §3 para la forma de la respuesta de `procesarCompleta`.

## 5. Trampas

- ⛔ **Nunca derivar el `tipoDocReten` del combo si el documento se eligió de una lista mezclada.** Hoy el
  modo «Factura» del selector trae también las notas de venta; elegir una ahí manda `"01"` y el SRI
  recibe una nota de venta declarada como factura, sin ningún error.
- El combo de tipos sale de `GET /rest/tsri/getAll` filtrado por `lsri.tabla === '3'`. **Si ahí no hay
  `codigo = '02'` activo, la opción no aparece** — no es un defecto del frontend.
- El RIDE rotula el documento sustento según `TIPODOCRETEN` desde el WAR que incluya este frente; con un
  WAR anterior dice «Factura» siempre.
- **ATS:** hasta que se corrija el enlace (Fase 2 del plan), una retención sobre una nota de venta cuya
  autorización comparten otras notas del mismo proveedor puede declararse repetida. No afecta a la
  emisión ni al saldo.
