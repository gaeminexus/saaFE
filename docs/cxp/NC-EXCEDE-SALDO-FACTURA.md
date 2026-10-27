# Nota de crédito de compra que excede el saldo de su factura: el excedente queda como saldo de la NC

**Equipo:** `omen-saa-2` · **Escrito:** 2026-10-27 por `omen-saa-2-arb`, antes de despachar (regla 7).
**Reescrito el mismo día** por decisión del usuario: la primera versión dejaba la factura en negativo, y eso **no
va**. **Espejo FE:** `saaFE/docs/cxp/NC-EXCEDE-SALDO-FACTURA.md`. **DDL:** `cxp/sql/e2-109` (va **antes** del WAR).

## 1. El pedido

Correo de Katherine Pardo (asistente contable), 27-10, «Apoyo para registro de nota de crédito». En Gestión de
Documentos (`cxp`), registrar la NC **002-002-000035370** de **GENERALI ECUADOR** (22/10/2026, **85,32**) falla con:

> *El valor a aplicar ($85.32) supera el saldo pendiente de la factura N° 002-002-000137309 ($0.00).*

La factura ya está pagada; la NC genera un saldo a favor con el proveedor.

**Decisiones del usuario (2026-10-27):**

1. *«Que el sistema alerte pero no detenga.»*
2. *«No debería quedar la factura en negativo. Si excede el valor, debe registrarse cuánto de la nota de crédito
   se cruzó y el saldo quedar en la nota de crédito.»*
3. *«Si tiene saldo a favor, que existan dos opciones: que cruce ese saldo de la nota de crédito con otra factura,
   o que se pague ese saldo con un pago en transferencia o cheque.»*
   → Lectura del árbitro: **el proveedor nos devuelve** el saldo (nos transfiere o nos da un cheque que se
   deposita). Es el mismo caso que la Devolución de Anticipo (`API-DEVOLUCION-ANTICIPO-PROVEEDOR.md`).
   **Confirmado por el usuario el 2026-10-27:** el proveedor nos devuelve el dinero, y se registra **a qué cuenta
   bancaria propia** hizo el pago (`DVPR.DVPRCNBC`, ya obligatorio en la devolución) para cruzar ese saldo.

## 2. Lo medido en el código (2026-10-27)

- `ProcesoCargaDocumentosServiceImpl.registrarAplicacionPagoCxp` (~l.5040) llama a
  `AplicacionPagoCxpServiceImpl.aplicarNotaCredito` (l.235), **en la misma transacción que el asiento**.
  Es su **único** llamador. `aplicarNotaCredito` llama a `validaMontoContraSaldo` (l.1517), que lanza
  `IncomeException` y revierte todo (NC + asiento + aplicación).
- `validaMontoContraSaldo` lo usan además retenciones, anticipos, transferencias y caja chica: **no cambia**.
- El asiento de la NC (`AsientoContableServiceImpl.generarAsientoNotaCreditoCompra`, l.3000) debita **la CxP del
  proveedor** (`obtenerCuentaProveedor`, `PRCC` tipo 1) por el **total** de la NC. La factura acredita **esa
  misma cuenta**. Consecuencia: el saldo de la NC **ya está en contabilidad** como débito en la CxP del proveedor,
  y cruzarlo contra **otra factura del mismo proveedor** es un movimiento de auxiliar **sin asiento** (DEBE y
  HABER serían la misma cuenta).
- `PGS.APLP` ya tiene la FK a la NC: `APLPNTCC` → `AplicacionPagoCxp.notaCredito`. Por eso **el saldo de la NC se
  calcula, no se guarda** (mismo principio que el saldo de la factura, §50.3 del estado):

  ```
  saldoNC = NTCC.TOTAL
          − Σ APLP.APLPMAPL   (APLPNTCC = nc, APLPESTD = ACTIVO)
          − Σ DDPR.DDPRVLOR   (DDPRNTCC = nc, DVPR.DVPRESTD = ACTIVA)
  ```

- `PGS.DVPR`/`DDPR` (Devolución de Anticipo, `e2-78`) ya resuelve «el proveedor nos deposita»: asiento DEBE banco /
  HABER cuenta del proveedor, movimiento bancario por el total, anulación si no está conciliada. Se **extiende**
  para aceptar líneas de NC, en vez de crear otra tabla.

## 3. Al registrar la NC (Gestión de Documentos)

En `aplicarNotaCredito`:

1. `saldoFactura = total − sumaAplicadoByFactura` (lo mismo que calcula `validaMontoContraSaldo`).
2. `montoAplicar = min(NC.total, max(saldoFactura, 0))`, redondeado a 2 decimales.
3. Si `montoAplicar > 0.01`: se crea **una** aplicación por `montoAplicar` (no por el total). Si
   `montoAplicar <= 0.01` (factura ya pagada): **no se crea aplicación**, no es un error.
4. **La factura nunca queda en negativo.** `recalcularEstadoPago` se sigue llamando igual que hoy.
5. Si `NC.total − montoAplicar > 0.01`, la respuesta de `registrarBD` trae **`advertenciaAplicacion`**:
   `«La nota de crédito N° {nc} ($85.32) supera el saldo pendiente de la factura N° {factura} ($0.00). Se aplicaron
   $0.00 a la factura y quedan $85.32 como saldo a favor en la nota de crédito.»`
   Si no excede, la clave **no viene**. **El registro no falla.**
6. Factura no encontrada → sigue fallando como hoy. No se toca `validaMontoContraSaldo`, ni `cxc`.

## 4. Cruzar el saldo de la NC con otra factura

**`POST /rest/aplp/cruzarNotaCredito`**

```jsonc
{ "idNotaCredito": 512, "idFacturaCompra": 9031, "valor": 85.32,
  "fecha": "2026-10-27", "idEmpresa": 1236, "idUsuario": 5, "observacion": "…" }
```

Validaciones, en orden, todas con `IncomeException` → 400:

1. `valor > 0`; `idNotaCredito`, `idFacturaCompra`, `idEmpresa` presentes.
2. La NC existe, es de la empresa, está **registrada y vigente** (tiene asiento, no anulada; el ejecutor mide qué
   estado lo dice y lo reporta), y `valor <= saldoNC + 0.01`.
3. La factura existe, es **del mismo titular y la misma empresa** que la NC, no está anulada, y
   `valor <= saldoFactura + 0.01`.

Si pasa: **una** fila de `APLP` con `tipoDocPago = NOTA_CREDITO (2)`, `facturaCompra` = la factura nueva,
`notaCredito` = la NC, `montoAplicado = valor`, **sin asiento** (`APLPASNT` nulo, ver §2), observación
`«Cruce de saldo de la NC N° {nc}»` + la del usuario. Después `recalcularEstadoPago(factura)`.

Respuesta 200: `{ exito, mensaje, aplicacion: id, saldoNotaCredito, saldoFactura }`.

**Reverso:** con el endpoint de reverso de aplicación que ya existe. El ejecutor verifica que una aplicación
`NOTA_CREDITO` **sin asiento** se reverse sin intentar anular asiento ni movimiento bancario, y que el saldo de la
NC vuelva (sale solo, porque se calcula). Si no es así, **reporta y se detiene**.

### 4.1 Cruzar contra una NOTA DE DÉBITO del proveedor — decidido por el usuario el 2026-10-27

**Lo medido:** una ND de compra **no tiene saldo propio**. Al registrarse, `aplicarNotaDebito` crea en `APLP` una
aplicación **negativa** (`tipoDocPago = NOTA_DEBITO (5)`, `APLPNTDC`) sobre **la factura que modifica**: el valor
de la ND pasa a ser saldo de esa factura. Ningún pago se aplica a la ND directamente. Por eso cruzar el saldo
de la NC «contra la ND» es cruzarlo contra **su factura**.

- `POST /rest/aplp/cruzarNotaCredito` acepta, **en lugar de** `idFacturaCompra`, **`idNotaDebito`** (exactamente
  uno de los dos; si vienen ambos o ninguno → 400).
- Con `idNotaDebito`: la ND existe, es de la empresa y **del mismo titular** que la NC, está registrada y vigente
  (mismo criterio que la NC: asiento, estado activo, no anulada), y **no** está BLOQUEADA por seguros
  (`EstadoSeguroDocumentoCxp.BLOQUEADO`: no subió el saldo de su factura, así que no hay nada que cruzar) → si lo
  está, 400 *«La nota de débito N° X está bloqueada hasta que crédito la libere.»*
- La factura se resuelve **igual que al registrar la ND**: `resolverFacturaCompraPorNumero(nd.numDocModificado,
  idTitular, idEmpresa)`. Desde ahí, mismas validaciones y misma fila de `APLP` que el cruce contra factura
  (`facturaCompra` = la de la ND, `notaCredito` = la NC), con observación
  `«Cruce de saldo de la NC N° {nc} contra la ND N° {nd}»`.
- ⛔ **No** se llena `APLPNTDC` en la fila del cruce: esa FK identifica la aplicación negativa **propia** de la ND,
  y `selectActivasByDocumento("NOTA_DEBITO")` la usa para reversarla al anular la ND. Una fila de cruce con esa
  FK se reversaría junto con ella y confundiría las dos cosas.
- `valor <= saldoFactura`: si la factura ya está cubierta por otros pagos, el cruce contra la ND no tiene nada que
  cubrir y se rechaza con el mismo mensaje del cruce contra factura.
- **Disponibles:** `GET /rest/ntdc/pendientes/{idTitular}/{idEmpresa}` — ND registradas y vigentes, no bloqueadas,
  cuya factura tiene saldo > 0,01. Proyección `{ idNotaDebito, numero, fecha, total, idFacturaCompra,
  numeroFactura, saldoFactura }`. Consulta agregada, sin N+1.
- **FE (Cruce de Nota de Crédito):** el destino se elige entre **Factura** o **Nota de débito** (toggle). Con ND, la
  tabla de destino es `ntdc/pendientes`; el valor por defecto es `min(saldo NC, total ND, saldo de su factura)`.

Fuera de alcance: cruzar contra una **liquidación de compra** o contra la factura de **otro proveedor**.

## 5. Devolución del saldo: el proveedor nos paga por transferencia o cheque

Se extiende la Devolución de Anticipo (`PGS.DVPR`/`DDPR`, `DevolucionAnticipoProveedorServiceImpl`,
`REST @Path("dvpr")`).

### 5.1 Datos — `e2-109`

- `DDPR.ANTPCDGO` pasa a aceptar NULL. **`DDPR.DDPRNTCC`** nueva (FK a `PGS.NTCC.ID`). CHECK: exactamente uno de
  los dos. La UK `(DVPRCDGO, ANTPCDGO)` se reemplaza por `(DVPRCDGO, ANTPCDGO, DDPRNTCC)`.
- **`DVPR.DVPRFPAG`** nueva, `1 TRANSFERENCIA` · `2 CHEQUE`, default 1. Constantes en un `rubros/` nuevo
  (`FormaDevolucionProveedor`), no catálogo.
- Entidades: `DetalleDevolucionAnticipo` gana `@ManyToOne NotaCreditoCompra notaCredito` (`DDPRNTCC` → `ID`);
  `DevolucionAnticipoProveedor` gana `Long formaPago` (`DVPRFPAG`).

### 5.2 `POST /rest/dvpr/registrar` — cambios aditivos

```jsonc
{ "idEmpresa": 1236, "idTitular": 187, "idCuentaBancaria": 417, "fecha": "2026-10-27",
  "formaPago": 2,                          // NUEVO, opcional, default 1
  "referencia": "CHQ 001234 Pichincha", "observacion": "…", "idUsuario": 5,
  "anticipos":    [ { "idAnticipo": 7, "valor": 8.64 } ],     // puede venir vacío
  "notasCredito": [ { "idNotaCredito": 512, "valor": 85.32 } ] // NUEVO, puede venir vacío
}
```

- **Al menos una** de las dos listas con líneas. Sin repetidos dentro de cada una. Cada `valor > 0`.
- Cada NC: misma empresa y **mismo titular**, registrada y vigente, `valor <= saldoNC + 0.01`.
- Las validaciones de anticipos quedan **como están** y aplican solo si hay anticipos (incluida la del `PRCC`
  tipo 2 contra **la suma de anticipos**, no el total).
- **Asiento** (`generarAsientoDevolucionAnticipoProveedor`, se extiende o se sobrecarga):
  - **DEBE:** banco, por el **total** del depósito.
  - **HABER:** anticipos del proveedor (`PRCC` tipo 2) por la **suma de anticipos**, si es > 0.
  - **HABER:** CxP del proveedor (`obtenerCuentaProveedor`, `PRCC` tipo 1, la misma que debitó la NC) por la
    **suma de NC**, si es > 0.
  - Tipo de asiento y módulo: los mismos de hoy.
- **`PRCC` tipo 2** baja solo por la suma de anticipos. Las NC no tocan `PRCC` (su saldo es calculado).
- **Movimiento bancario por el total**, con `creaMovimientoPorTransferencia` como hoy, y el tipo según la forma:
  `1` → `TipoMovimientoConciliacion.TRANSFERENCIAS_CREDITOS_EN_TRANSITO` (como hoy) ·
  `2` → `TipoMovimientoConciliacion.DEPOSITO_EN_TRANSITO`. Si ese método no admite el tipo de depósito, o la
  conciliación trata distinto un cheque, **reporta y detente**.
- Respuesta: igual que hoy.

### 5.3 `anular` y `listar`

- **Anular:** igual que hoy (no conciliada, sin tragarse errores). Las líneas de NC no restauran nada a mano: el
  saldo de la NC se recalcula solo al quedar la devolución ANULADA.
- **Listar:** cada línea del `detalle` trae además `tipo` (`ANTICIPO` | `NOTA_CREDITO`), `idNotaCredito`,
  `numeroNotaCredito`; y la cabecera, `formaPago`.

### 5.4 Guarda en la anulación de la NC

Donde se anula una NC de compra (el ejecutor ubica el flujo; hoy termina en
`revertirAplicacionesDeDocumento`): si la NC tiene una línea `DDPR` con su `DVPR` ACTIVA →
`IncomeException` *«La nota de crédito N° X tiene la devolución M registrada: anúlela antes de anular la nota de
crédito.»* Los **cruces** contra otras facturas sí se reversan solos (`selectActivasByDocumento` trae todas las
`APLP` de la NC — el ejecutor lo confirma).

## 6. Notas de crédito con saldo

**`GET /rest/ntcc/disponibles/{idTitular}/{idEmpresa}`** — NC registradas y vigentes del proveedor con
`saldoNC > 0.01`, la más antigua primero, como **proyección**:
`{ idNotaCredito, numero, fecha, numDocModificado, total, aplicado, devuelto, saldo }`.
Consulta agregada en la base, sin `in :ids` ni N+1 (los antecedentes de caída de la base, §50).

## 7. Frontend

1. **Gestión de Documentos** (`cxp/forms/procesos/gestion-documentos/`): si la respuesta de éxito de
   `registrarBD` trae `advertenciaAplicacion`, se muestra como advertencia (`warning-snackbar`, 10 s, o un diálogo)
   además del éxito. No es un error.
2. **Pantalla nueva «Cruce de Nota de Crédito»** (CxP → Pagos, junto a Cruce de Anticipo), copiando la estructura
   de `cxp/forms/pagos/cruce-anticipo-proveedor/`: proveedor (`TitularSelectorDialogComponent`), tabla de NC con
   saldo (`GET /ntcc/disponibles`), factura pendiente **del mismo proveedor** (el selector de documentos que usa
   el cruce de anticipo, solo facturas), valor (por defecto `min(saldo NC, saldo factura)`), botón Cruzar → `POST
   /aplp/cruzarNotaCredito`. Debajo, los cruces de la NC elegida con **Revertir** (endpoint existente,
   `MotivoDialogComponent`). Etiqueta del menú ≤ 24 caracteres: `'Cruce de Nota de Crédito'` (24).
3. **Devolución de Anticipo** (`cxp/forms/pagos/devolucion-anticipo/`): una segunda tabla «Notas de crédito con
   saldo» (`GET /ntcc/disponibles`) con su input de valor, igual que la de anticipos; un combo **Forma**
   (Transferencia / Cheque, default Transferencia); el total suma las dos tablas; el payload manda `formaPago` y
   `notasCredito`. En el historial, la forma y el tipo de cada línea. **Decidido por el usuario (2026-10-27):** la pantalla y su entrada de menú pasan a llamarse
   `'Devolución Saldo a Favor'` (24 caracteres), porque desde ahí se devuelven anticipos y notas de crédito. La
   ruta no cambia.

4. **Estado de cuenta del proveedor** (`tsr/forms/estado-cuenta-titular/`) — **decidido por el usuario el 2026-10-27**:
   el saldo de la NC se muestra ahí.
   - En rol **Proveedor**, al cargar el titular se llama **una vez** a `GET /ntcc/disponibles/{idTitular}/{idEmpresa}`
     (nada de una llamada por NC: la pantalla ya hace N+1 con las facturas, §50).
   - Las filas de tipo NOTA_CREDITO (origen RECIBIDO) muestran en la columna **Saldo** el `saldo` del endpoint,
     buscado por `idNotaCredito`; una NC que no viene en la respuesta tiene saldo 0.
   - Tarjeta nueva **«Saldo a favor (notas de crédito)»**, al lado de la de anticipos, con la suma de esos saldos de
     las NC que pasan los filtros, y el pie «Disponible para cruzar o devolver».
   - El «Saldo por pagar» **no cambia**: sigue siendo la suma de las facturas (que ya no quedan en negativo).
   - En rol Cliente no cambia nada. Si el endpoint falla, la pantalla carga igual y la tarjeta muestra «—» con aviso.

## 8. Trampas

1. **El `e2-109` va antes del WAR** (ver su cabecera): rompe también `anularAnticipo`, que consulta `DDPR`.
2. **La UK vieja de `DDPR` rechazaría dos NC en la misma devolución** (Oracle indexa `(dvpr, NULL)` como clave).
   Por eso se reemplaza, no se deja.
3. **No crear asiento en el cruce NC→factura.** Es la misma cuenta del proveedor; un asiento DEBE X / HABER X por
   el mismo valor solo ensucia el mayor.
4. **No tocar `validaMontoContraSaldo`**: los demás llamadores siguen bloqueando.
5. **El saldo de la NC es calculado.** Ninguna pantalla lo guarda ni lo edita.

## 9. Fuera de alcance (decidible, sin prisa)

- Mostrar el saldo de las NC en la **cartera por pagar** (el estado de cuenta ya entra, §7.4).
- Lo mismo en `cxc` (`AplicacionPagoCxcServiceImpl:1030`).

## 10. Verificación

- `mvn -q compile`, `ng build`, revisión del árbitro sobre el diff.
- **Prueba del usuario**, después del `e2-109` y del despliegue:
  1. Registrar la NC 002-002-000035370 de GENERALI: registra, avisa, no aplica nada a la factura 137309 (que
     sigue en 0, no en −85,32) y la NC queda con saldo 85,32 en `GET /ntcc/disponibles`.
  2. Cruzarla contra otra factura pendiente de GENERALI, o registrar la devolución cuando GENERALI deposite o
     entregue el cheque. El saldo de la NC baja a 0; en la devolución, el asiento queda DEBE banco / HABER CxP de
     GENERALI, y el movimiento aparece en la conciliación.
