# Ingresos y Egresos de Tesorería (sin documento físico)

> **Documento para el frontend.**
> Fecha: 2026-08-12
> Backend: `com.saa.ws.rest.tsr.EgresoRest` (`/egrs`), `com.saa.ws.rest.tsr.IngresoRest` (`/ingr`).
> Script SQL: `docs/scripts/sql-ingresos-egresos-tesoreria.sql` (tablas `TSR.EGRS`, `TSR.INGR`, ALTER a `PGS.PGTR`).

---

## 1. El problema de negocio

Hay pagos y cobros que **no tienen un documento físico** que los respalde
(factura, nota de crédito, etc.): débitos por administración de cuentas
bancarias, comisiones, intereses ganados, créditos del banco. Estas pantallas
los registran con su contabilidad correcta:

- **Egreso** (`/egrs`) — plata que sale. **Sí pasa por el circuito de pagos**:
  registrar el egreso crea automáticamente su pago en `/pgtr`, que aparece en
  el listado de pagos a realizar, entra al lote/archivo del banco y se
  confirma con la respuesta — exactamente igual que el pago de una factura.
  Si es **débito automático** (el banco ya lo debitó), no pasa por nada de
  eso: nace confirmado y contabiliza al registrarse.
- **Ingreso** (`/ingr`) — plata que entra. Se registra cuando el dinero **ya
  está en la cuenta**: en un solo paso graba, genera asiento y movimiento
  bancario.

### La cuenta contable sale del producto

En ambas pantallas el usuario **elige un producto** (de CXP para egresos, de
CXC para ingresos). La cuenta contable la da el **grupo** de ese producto
(`GrupoProducto*.planCuenta`) — no se pide ninguna cuenta en el formulario.
Si el producto no tiene grupo, o el grupo no tiene cuenta contable, el
registro falla con un mensaje que dice exactamente qué configurar.

- Selector de productos CXP: `GET /prdp/...` (los mismos de facturas de compra)
- Selector de productos CXC: `GET /prdc/...`

---

## 2. Egresos — `/egrs`

### Estados (`estado` del egreso)

| Valor | Texto sugerido | Qué significa | Acciones |
|---|---|---|---|
| 1 | Pendiente de pago | Registrado; su pago está en el circuito de `/pgtr` | Anular |
| 2 | Pagado | El pago se confirmó: asiento + movimiento bancario generados | (revertir desde `/pgtr`) |
| 3 | Anulado | Anulado por el usuario | — |

### 2.1 Registrar egreso — `POST /egrs/procesar`

```json
{
  "idEmpresa": 1,
  "idTitular": 25,
  "idProductoPago": 7,
  "descripcion": "Administración cuenta corriente agosto",
  "valor": 12.50,
  "fecha": "2026-08-12",
  "idCuentaBancariaOrigen": 4,
  "idCuentaDestinoTitular": 9,
  "debitoAutomatico": false,
  "referencia": "DEB-ADM-0812",
  "observacion": "...",
  "idUsuario": 5
}
```

Requeridos siempre: `idEmpresa`, `idProductoPago`, `valor`,
`idCuentaBancariaOrigen`, `descripcion`.

**Dos variantes, según `debitoAutomatico`:**

| | `false` (transferencia) | `true` (débito automático) |
|---|---|---|
| `idTitular` + `idCuentaDestinoTitular` | **Obligatorios** (el archivo del banco necesita el destino) | No hacen falta |
| `fecha` | Fecha programada del pago | **Fecha del débito** (fecha del asiento) |
| Resultado | Egreso Pendiente + pago Registrado en `/pgtr` | Egreso **Pagado** + pago Confirmado + asiento + movimiento bancario |
| Siguiente paso | Aparece en el listado de pagos a realizar (`/pgtr/listar?estado=1`) | Nada — ya está todo hecho |

**Response 201 — transferencia:**
```json
{
  "exito": true,
  "mensaje": "Pago del egreso registrado. Queda pendiente de incluirse en un archivo de pagos.",
  "egreso": 10,
  "pago": 512,
  "debitoAutomatico": false
}
```

**Response 201 — débito automático:**
```json
{
  "exito": true,
  "mensaje": "Egreso pagado por débito automático. El asiento contable y el movimiento bancario fueron generados.",
  "egreso": 11,
  "pago": 513,
  "debitoAutomatico": true,
  "asiento": "TEG-2026-08-0021"
}
```

Si algo falla (producto sin grupo, grupo sin cuenta, cuenta bancaria sin plan
de cuentas, período cerrado) **no queda nada grabado** y el mensaje de error se
muestra tal cual.

### 2.2 El pago del egreso vive en `/pgtr`

En `/pgtr/listar` los pagos de egresos vienen con `egreso: {...}` y
`facturaCompra: null`. Para la columna "concepto" del listado de pagos usar:
`facturaCompra?.numero ?? egreso?.descripcion`. Todo lo demás es idéntico:
selección para el lote, archivo, respuesta del banco, seguimiento.

- **Confirmación** (respuesta del banco o débito automático): genera el
  asiento (DEBE cuenta del grupo del producto / HABER cuenta del banco), el
  movimiento bancario, y el egreso pasa a **Pagado**.
- **Reversión** (`POST /pgtr/revertirConfirmado/{idPago}`): anula asiento y
  movimiento, y el egreso **vuelve a Pendiente de pago** (se puede volver a
  pagar o anular). El pago queda Rechazado (transferencia) o Anulado (débito
  automático).

### 2.3 Anular egreso — `POST /egrs/anular/{id}`

Body: `{ "motivo": "...", "idUsuario": 5 }`

- Egreso Pendiente con pago Registrado → anula pago y egreso. ✔
- Pago En archivo → **error**: procesar la respuesta del banco primero.
- Egreso Pagado → **error**: revertir el pago primero (`/pgtr/revertirConfirmado`).

### 2.4 Consultas

- `GET /egrs/listar?idEmpresa={id}&estado={1|2|3}` (estado opcional)
- `GET /egrs/getAll` · `GET /egrs/getId/{id}` · `POST /egrs/selectByCriteria`

---

## 3. Ingresos — `/ingr`

### Estados (`estado` del ingreso)

| Valor | Texto sugerido | Acciones |
|---|---|---|
| 1 | Activo | Anular |
| 2 | Anulado | — |

### 3.1 Registrar ingreso — `POST /ingr/procesar`

Un solo paso: graba + asiento (DEBE banco / HABER cuenta del grupo del
producto) + movimiento bancario de ingreso.

```json
{
  "idEmpresa": 1,
  "idTitular": 25,
  "idProductoCobro": 12,
  "descripcion": "Intereses ganados agosto",
  "valor": 45.10,
  "fecha": "2026-08-12",
  "idCuentaBancaria": 4,
  "referencia": "NC-BANCO-123",
  "observacion": "...",
  "idUsuario": 5
}
```

Requeridos: `idEmpresa`, `idProductoCobro`, `valor`, `idCuentaBancaria`,
`descripcion`. `idTitular` y `referencia` opcionales. `fecha` = fecha en que
entró el dinero (fecha del asiento).

**Response 201:**
```json
{
  "exito": true,
  "mensaje": "Ingreso registrado. El asiento contable y el movimiento bancario fueron generados.",
  "ingreso": 7,
  "asiento": "TIN-2026-08-0009"
}
```

### 3.2 Anular ingreso — `POST /ingr/anular/{id}`

Body: `{ "motivo": "...", "idUsuario": 5 }` — reversa el asiento, anula el
movimiento bancario y deja el ingreso Anulado.

### 3.3 Consultas

- `GET /ingr/listar?idEmpresa={id}&estado={1|2}` (estado opcional)
- `GET /ingr/getAll` · `GET /ingr/getId/{id}` · `POST /ingr/selectByCriteria`

---

## 4. Contabilidad y conciliación (referencia)

| Operación | Asiento | Tipo asiento | Movimiento bancario |
|---|---|---|---|
| Pago de egreso (confirmado o débito automático) | DEBE grupo del producto CXP / HABER banco | codigoAlterno 5 (TEGRESO) | Transferencias débitos en tránsito, origen Pagos |
| Ingreso | DEBE banco / HABER grupo del producto CXC | codigoAlterno 4 (TINGRESO) | Transferencias créditos en tránsito, origen Cobros |

Mismo criterio de conciliación que los pagos de facturas y los cobros por
transferencia — los movimientos quedan "en tránsito" hasta que la conciliación
bancaria los cruce con el estado de cuenta.

---

## 5. Nota sobre las tablas legadas

`TSR.DBCR` (DebitoCredito), `TSR.PGSS` (Pago) y `TSR.CBRO` (Cobro) son el
mecanismo antiguo de débitos/créditos bancarios y pagos/cobros varios del
sistema Income (plantillas + tablas Temp, contabilización síncrona, sin
circuito de aprobación). Quedan como histórico de consulta; las pantallas
nuevas usan exclusivamente `TSR.EGRS` y `TSR.INGR`.
