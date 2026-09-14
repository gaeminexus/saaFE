# API — Pagar liquidaciones de compra y notas de venta

**Equipo:** `omen-saa-2` · **Congelado:** 2026-09-14 · **Diseño:** `cxp/PLAN-PAGO-LIQUIDACION-Y-NOTA-VENTA.md`
**Espejo:** `saaFE/docs/pagos/API-PAGO-LIQUIDACION-Y-NOTA-VENTA.md`

Base: `/SaaBE/rest`. Los errores de negocio llegan como **texto** en el cuerpo (ver registro de reservas §8.3).

> ⚠️ **Dos tablas de liquidación, y el pago va contra UNA sola.** `CBR.LQCS` (`/lqcs`, cxc) es la
> liquidación **emitida** al SRI y no tiene cuenta por pagar. **`PGS.LQCC` (`/lqcc`, cxp)** es el
> documento CXP que se crea con «Generar documento CXP», y **es la que se paga**. Todo `id` de
> liquidación en este contrato es un **id de `LQCC`**.

> La **nota de venta** es una `FacturaCompra` con `tipoComprobante = '02'`. Se paga **exactamente
> igual que una factura**, con `idFacturaCompra`. No hay endpoint nuevo para ella.

---

## 1. `POST /pgtr` — registrar el pago (CAMBIA: acepta liquidación)

### Cuerpo
Uno y solo uno de `idFacturaCompra` / `idLiquidacionCompra`. El resto, igual que hoy.

```json
{
  "idLiquidacionCompra": 57,
  "idCuentaDestinoTitular": 12,
  "valor": 350.00,
  "fechaProgramada": "2026-09-14",
  "idEmpresa": 1,
  "idUsuario": 5,
  "observacion": "Pago liquidación 001-002-000000123"
}
```

| Campo | Tipo | Regla |
|---|---|---|
| `idFacturaCompra` | number | Id de `FacturaCompra` — **factura o nota de venta**. Excluyente con `idLiquidacionCompra` |
| `idLiquidacionCompra` | number | **NUEVO.** Id de `LiquidacionCompraCompra` (`PGS.LQCC`). Excluyente con `idFacturaCompra` |
| `valor`, `idEmpresa` | | Obligatorios, como hoy |
| `idCuentaDestinoTitular`, `fechaProgramada`, `idUsuario`, `observacion`, `idCuentaBancariaOrigen`, `formaPago`, `debitoAutomatico`, `referencia` | | Sin cambios. La Solicitud de pago **no** manda `idCuentaBancariaOrigen` ni `formaPago`: el pago nace `POR_APROBAR` |

### Respuestas

| Código | Cuándo | Cuerpo |
|---|---|---|
| **201** | Registrado | JSON (abajo) |
| **400** | Ninguno de los dos ids, **o los dos a la vez**, o falta `valor`/`idEmpresa` | Texto: `Debe enviar idFacturaCompra o idLiquidacionCompra (uno solo), valor e idEmpresa.` |
| **500** | Regla de negocio: documento inexistente o anulado, sin proveedor, cuenta de destino de otro titular, valor mayor al disponible | Texto: `Error al registrar el pago: {mensaje}` |

### 201 — pago de **factura / nota de venta** (sin cambios)
```json
{ "exito": true, "mensaje": "...", "pago": 812, "estado": 0,
  "facturaId": 3301, "numeroFactura": "001-001-000004567",
  "total": 1200.0, "totalAplicado": 0.0, "saldoPendiente": 1200.0, "estadoPago": 1 }
```

### 201 — pago de **liquidación** (NUEVO)
Mismas claves de control. **El bloque de saldo usa los nombres de `saldoLiquidacion`**:
```json
{ "exito": true, "mensaje": "Pago registrado, pendiente de aprobación: tesorería debe asignar cuenta y forma de pago.",
  "pago": 813, "estado": 0, "tipoDocumento": "LIQUIDACION_COMPRA",
  "liquidacionId": 57, "numeroLiquidacion": "001-002-000000123",
  "total": 350.0, "totalAplicado": 0.0, "saldoPendiente": 350.0, "estadoPago": 1 }
```
`tipoDocumento` viene también en el pago de factura, con valor `"FACTURA_COMPRA"` (clave nueva y aditiva).

⚠️ **Trampa:** leer `facturaId`/`numeroFactura` en el pago de una liquidación devuelve `undefined`. Mapear por tipo.

---

## 2. Listar los documentos pendientes de un proveedor (EXISTENTES)

| Tipo en pantalla | Endpoint | Filtro |
|---|---|---|
| Factura | `POST /fctc/selectByCriteria` | `titular.codigo = idTitular`; en el cliente, `tipoComprobante !== '02'` |
| Nota de venta | `POST /fctc/selectByCriteria` | `titular.codigo = idTitular`; en el cliente, `tipoComprobante === '02'` |
| Liquidación de compra | **`POST /lqcc/selectByCriteria`** | `titular.codigo = idTitular` |

En los tres, se descartan en el cliente: `estado` distinto de 1 (inactivo o anulado), `estadoPago === 3` (pagada) y los ids del §3. Un `estadoPago` nulo **no** descarta la fila: la nota de venta manual nace con estado de pago nulo.

⚠️ **No usar `/lqcs`** (liquidación emitida). No tiene cuenta por pagar y su id no es el que acepta `POST /pgtr`.

---

## 3. `GET /pgtr/facturasComprometidas/{idTitular}` (CAMBIA: aditivo)

```json
{ "idTitular": 44, "idsFacturas": [3301, 3302], "idsLiquidaciones": [57] }
```
`idsLiquidaciones` es **NUEVO**: liquidaciones del proveedor sin saldo libre, porque ya está todo comprometido en pagos `POR_APROBAR`/`REGISTRADO`/`EN_ARCHIVO`. `idsFacturas` incluye las notas de venta (son `FacturaCompra`).

---

## 4. Saldo del documento elegido (EXISTENTES)

| Documento | Endpoint | Claves |
|---|---|---|
| Factura / nota de venta | `GET /aplp/saldo/{idFactura}` | `facturaId, numeroFactura, total, totalAplicado, saldoPendiente, estadoPago` |
| Liquidación | `GET /aplp/saldoLiquidacion/{idLiquidacion}` | **`liquidacionId, numeroLiquidacion`**`, total, totalAplicado, saldoPendiente, estadoPago` |

Lo **disponible** para el tope del campo es `saldoPendiente − comprometido`, igual que hoy con la factura. El comprometido de una liquidación sale de los pagos de `GET /pgtr/listar` cuyo `liquidacionCompra.id` coincide.

---

## 5. Cambios visibles en Tesorería (bandeja, lotes, confirmación)

- El `PagoProgramado` serializado trae la clave nueva **`liquidacionCompra`** (objeto `LiquidacionCompraCompra` o `null`).
- `GET /pgtr/porAprobar`: `origen = "LIQUIDACION_COMPRA"`, `concepto = "Liquidación {numero}"`.
- El filtro `?origen=LIQUIDACION_COMPRA` es válido en `/pgtr/porAprobar` y `/pgtr/listar`. **El FE agrega esa opción** donde hoy ofrece `FACTURA_COMPRA`.
- Al confirmar, el asiento es el mismo que el de una factura (DEBE CxP proveedor / HABER banco), la aplicación cae sobre la liquidación y su `estadoPago` pasa a 2 o 3.

## 6. Orden de despliegue
`e2-41` (SQL) → WAR → FE. WAR nuevo con FE viejo es inofensivo. **FE nuevo con WAR viejo:** pagar una liquidación da **400** (`Debe enviar idFacturaCompra…`); factura y nota de venta siguen funcionando.
