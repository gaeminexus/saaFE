# API — Cruzar el anticipo de un proveedor contra la factura de OTRO proveedor

**Equipo:** `omen-saa-2` · **Escrito:** 2026-09-30 por `omen-saa-2-arb`, **antes** de despachar.
**Espejo FE:** `saaFE/docs/cxp/API-CRUCE-ANTICIPO-OTRO-PROVEEDOR.md`.

---

## 1. El pedido, textual

> *«Hay ocasiones en las que un anticipo a un proveedor se puede cruzar con facturas que no hayan sido
> emitidas por ese proveedor. […] En la pantalla de cruce de anticipos, al escoger un proveedor, el
> siguiente combo muestra solo las facturas pendientes de ese proveedor. Debe existir un check que
> permita desplegar todas las facturas pendientes, filtrar por proveedor o número de factura y
> seleccionar una factura aunque no sea de ese proveedor, para cruzarla con el anticipo, y que el cruce
> se efectúe y se contabilice normalmente.»* — usuario, 2026-09-30

## 2. Por qué no alcanza con abrir la pantalla — medido antes de diseñar

Hoy **todo** el cruce supone que el anticipo y la factura son del mismo proveedor, en tres capas:

| Capa | Dónde | Qué supone |
|---|---|---|
| Pantalla | `documento-cruce-selector-dialog` filtra `titular.codigo = proveedor` | solo facturas del proveedor elegido |
| Validación | `AplicacionPagoCxpServiceImpl.validaAnticipoCruzable:441-445` | rechaza *«El anticipo N no pertenece al proveedor de la factura»* |
| **Contabilidad y saldos** | `aplicaCruces:535-616` y `AsientoContableServiceImpl.generarAsientoAplicacionAnticipoProveedor:794-828` | **un solo titular, el de la factura**, para el DEBE, el HABER y el `PRCC` |

**Lo peligroso es la tercera.** Si solo se quita la validación, un cruce del anticipo de **A** contra
una factura de **B**:

- acreditaría la **cuenta de anticipos de B** (`obtenerCuentaProveedorPorTipo(idTitularFactura, …, 2L)`),
  no la de A;
- descontaría el saldo de anticipos (`PRCC.saldoInicial`, tipo 2) **de B** (`:615-616`), mientras el
  `AnticipoProveedor.saldo` que baja es el **de A** (`:587`);
- y el reverso (`revierteUnaAplicacion:1532-1548`) le devolvería ese `PRCC` a B.

Resultado: **los dos proveedores quedarían descuadrados** en el seguimiento de anticipos
(`AnticipoProveedorServiceImpl.seguimiento:831-848`, que compara la suma de los saldos de los
anticipos contra el `PRCC` de cada titular). Y sin ningún error.

**«Contabilizar normalmente» un cruce entre proveedores significa:** DEBE a la **cuenta por pagar del
proveedor de la FACTURA** y HABER a la **cuenta de anticipos del proveedor del ANTICIPO**, y el `PRCC`
que baja (y el que se repone al reversar) es el **del anticipo**.

## 3. Backend

### 3.1 La regla: cada lado con su titular

En `aplicaCruces` hay dos titulares:

- **`titularFactura`** = el del documento (factura o liquidación). Es el que ya se usa hoy.
- **`titularAnticipo`** = `anticipo.getTitular()`, **por cada anticipo del reparto**.

Cuando los dos coinciden, todo tiene que comportarse **exactamente como hoy**: mismo asiento, mismos
textos, mismo `PRCC`. Es el caso del 100% de los cruces que existen.

### 3.2 `POST /aplp/anticipos` — un flag opcional

El body gana `permitirOtroProveedor` (boolean, opcional, por defecto `false`):

```jsonc
{ "idFacturaCompra": 512, "anticipos": [{ "idAnticipo": 88, "valor": 150.00 }],
  "fechaAplicacion": "2026-09-30", "idEmpresa": 1236, "idUsuario": 5, "observacion": "…",
  "permitirOtroProveedor": true }
```

- El REST lo lee del `Map` como `Boolean.TRUE.equals(datos.get("permitirOtroProveedor"))` y lo pasa
  a `aplicarAnticipos`.
- `aplicarAnticipos` y `validaAnticipoCruzable` ganan el parámetro. Con `false`, la validación de
  titular (`:441-445`) queda **igual que hoy**. Con `true`, **se salta solo esa validación**. Empresa,
  estado CONFIRMADO y saldo del anticipo se siguen validando.
- ⛔ **`POST /aplp/anticipo` (FIFO) NO cambia.** Busca los anticipos del titular del documento, y así
  debe seguir.
- Los otros llamadores de `aplicarAnticipos` y `validaAnticipoCruzable`, si los hay, mantienen su
  comportamiento con `false`. **Buscarlos con grep antes de cambiar la firma.** Si prefieres una
  sobrecarga para no tocarlos, también vale.

### 3.3 `aplicaCruces` — el titular del anticipo en el HABER y en el `PRCC`

1. **`PRCC` de anticipos:** hoy se lee una vez para `idProveedor` (el de la factura) y se valida
   `saldoInicial >= total`. Cambia a: **agrupar el reparto por `titularAnticipo`**, y por cada titular
   leer **su** `PRCC` tipo 2 (`obtenerCuentaAnticipos(idTitularAnticipo, idEmpresa)`), validar
   `saldoInicial >= suma de ese titular` con **el mismo mensaje que hoy** (nombrando al proveedor del
   anticipo) y, al final, descontar esa suma de **ese** `PRCC`. Con un solo titular igual al de la
   factura, es lo mismo que hoy.
2. **Asiento, uno por anticipo como hoy:** se llama a la variante de dos titulares de la §3.4, con
   `(idTitularFactura, idTitularAnticipo, …)`.
3. **Observación del cruce** (`:575-578` y `observacionCruce:644-654`): si los titulares difieren, se
   agrega `" | anticipo de <nombre del proveedor del anticipo>"`. Si coinciden, **igual que hoy**.
4. La fila `APLP` no cambia: sigue colgando del documento y con `anticipoOrigen` = el anticipo. De ahí
   se reconstruye todo lo demás.

### 3.4 `AsientoContableServiceImpl` — una sobrecarga, sin tocar la actual

```java
// AsientoContableService (interfaz) + Impl
Asiento generarAsientoAplicacionAnticipoProveedor(Long idTitularFactura, Long idTitularAnticipo,
        Double valor, Long idEmpresa, int codigoAltTipoAsiento, LocalDate fechaAsiento,
        String observaciones, String usuario) throws Throwable;
```

- **DEBE:** `obtenerCuentaProveedorPorTipo(idTitularFactura, idEmpresa, 1L)`. Descripción de la línea:
  `"Cruce anticipo proveedor: " + nombre del proveedor de la factura`, igual que hoy.
- **HABER:** `obtenerCuentaProveedorPorTipo(idTitularAnticipo, idEmpresa, 2L)`. Descripción:
  `"Anticipo aplicado: " + nombre del proveedor del anticipo`.
- Los mensajes de «no tiene cuenta configurada» nombran **al proveedor que corresponde** a cada
  línea.
- **El método de un titular que existe hoy pasa a delegar** en el nuevo con
  `(idTitular, idTitular, …)`. Resultado idéntico para todo lo que ya lo llama.
- ⚠️ **Este archivo tiene 210 caracteres con codificación rota que vienen de antes** (`TesorerÃ­a`,
  `â”€â”€`). **No se tocan**: «arreglarlos» metería cientos de líneas ajenas al cambio en el diff. Se
  edita solo el método, conservando **UTF-8 y los finales de línea CRLF** del archivo.
- `cnt` se comparte con `lap-saa-1`. Antes de editar: `git status` y `git log -3` del archivo, y si
  tiene cambios sin commitear que no son nuestros, **parar y avisar**.

### 3.5 Reverso — devolver el `PRCC` al proveedor del anticipo

En `revierteUnaAplicacion` (`:1495-1599`), la reposición del `PRCC` tipo 2 (`:1532-1548`) usa el
**titular del `anticipoOrigen`** si la aplicación tiene `anticipoOrigen`. Si **no** lo tiene (cruces
viejos), usa el del documento, como hoy. Lo demás del reverso no cambia: el saldo del anticipo, la
anulación del movimiento y la anulación del asiento.

⚠️ **Verificar además**, y **reportar sin corregir**, si `AnticipoProveedorServiceImpl.anularAnticipo`
(`:587-729`) o `analizarCruces` (`:982-1033`) quedan descuadrados con un cruce entre proveedores.
Hoy leen el `PRCC` **del titular del anticipo**, y con la §3.5 el reverso le devuelve a **ese mismo**
titular, así que deberían cuadrar. Pero hay que confirmarlo leyendo el código, no suponerlo.

## 4. Frontend

### 4.1 Diálogo de selección de documentos (`cxp/dialog/documento-cruce-selector-dialog/`)

⚠️ **Lo usa también la caja chica** (`tsr/forms/caja-chica/gastos/gastos-caja-chica.component.ts`).
Todo lo nuevo es **opcional y viene apagado**. La caja chica no cambia.

- `DocumentoCruceSelectorDialogData` gana `permitirOtrosProveedores?: boolean`. Solo con `true` aparece
  el check.
- **Check «Mostrar las facturas pendientes de todos los proveedores»**, apagado al abrir.
  - Apagado: exactamente lo de hoy, los documentos del proveedor elegido.
  - Encendido: se cargan los pendientes **de todos los proveedores** con el endpoint de cartera que ya
    existe, **`GET /aplp/cartera?idEmpresa=…`** sin `idTitular` ni fecha, o sea al día de hoy
    (`aplicacion-pago-cxp.service.ts` → `carteraPorPagar`, contrato `API-CARTERA-CXP-CXC.md`). **No**
    con `selectByCriteria` sin filtro: traería **todas** las facturas con su grafo EAGER completo,
    que es cómo se cayó la base el 03-09 (`ORA-04036`).
  - De la respuesta se usan solo los documentos con `saldo > 0`. Mapeo a `DocumentoCruceProveedor`:
    `tipoDocumento` `FACTURA` y `NOTA_VENTA` → `tipo: 'FACTURA'` (la nota de venta lleva
    `tipoComprobante: '02'`); `LIQUIDACION` → `tipo: 'LIQUIDACION'`; `idDocumento` → `id`;
    `numeroDocumento` → `numero`; `fechaEmision` → `fecha`; `total`; y `estadoPago: null`.
- `DocumentoCruceProveedor` gana tres campos opcionales: `idTitular?`, `nombreTitular?` y `saldo?`.
  En modo «todos» se llenan desde la cartera. En el modo de siempre se llenan con el proveedor del
  diálogo (sin `saldo`, como hoy).
- Con el check encendido, la tabla muestra además la columna **Proveedor**, y el filtro de texto busca
  por **proveedor, RUC o número de documento**.
- Un fallo de la cartera se muestra con `mensajeDeError` en el diálogo, y el check vuelve a apagarse.

### 4.2 Pantalla de cruce (`cxp/forms/pagos/cruce-anticipo-proveedor/`)

- Abre el diálogo con `permitirOtrosProveedores: true`.
- Si el documento elegido tiene `idTitular` **distinto** del proveedor de los anticipos, aparece un
  aviso fijo (no un snackbar):
  > *«La factura {número} es de {proveedor de la factura}. Los anticipos son de {proveedor elegido}. El
  > asiento debitará la cuenta por pagar de {proveedor de la factura} y acreditará los anticipos de
  > {proveedor elegido}.»*
- `confirmar()` manda `permitirOtroProveedor: true` **solo en ese caso**. Si son del mismo proveedor,
  el body es el de hoy.
- El saldo del documento se sigue consultando con `/aplp/saldo/{id}` o `/aplp/saldoLiquidacion/{id}`,
  como hoy. No hace falta cambiarlo.
- Al cambiar de proveedor se limpia el documento elegido, como hoy.

## 5. Trampas

1. **La contabilidad es lo que importa**, no la pantalla (§2). Un cruce entre proveedores que pase la
   validación pero use un solo titular en el asiento es **peor** que el bloqueo de hoy.
2. **Cruce del mismo proveedor = byte a byte lo de hoy**: mismo asiento, mismos textos, mismo `PRCC`.
3. **El diálogo es compartido con la caja chica**: todo lo nuevo es opt-in.
4. **Nada de `selectByCriteria` sin filtro** sobre facturas (§4.1).
5. **El estado de cuenta del proveedor de la factura** va a mostrar un abono con el número de un
   anticipo que **no es suyo** (`estado-cuenta-titular.component.ts:421-429`). No es un error, pero
   puede confundir. Queda anotado, **fuera de este frente**.
6. **El seguimiento de anticipos** (`AnticipoProveedorServiceImpl.seguimiento:803-806`) muestra la
   factura del cruce **sin su proveedor**. Anotado, fuera de este frente.

## 6. Verificación

- `mvn -q compile` y `ng build`.
- **Revisión del árbitro sobre el diff:** con titulares iguales, el camino tiene que ser el mismo que
  hoy.
- **Prueba del usuario después de desplegar:** un cruce A→B.
  1. El asiento tiene el DEBE en la cuenta tipo 1 de B y el HABER en la cuenta tipo 2 de A.
  2. El seguimiento de anticipos de A y el de B dicen **«cuadra»**.
  3. Reversarlo devuelve el saldo y el `PRCC` a A.
- Sin SQL y sin DDL.
