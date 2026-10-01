# API — Devolución del saldo de anticipos de un proveedor (el proveedor deposita en nuestro banco)

**Equipo:** `omen-saa-2` · **Escrito:** 2026-10-01 por `omen-saa-2-arb`, **antes** de despachar.
**Espejo FE:** `saaFE/docs/cxp/API-DEVOLUCION-ANTICIPO-PROVEEDOR.md`. **DDL:** `cxp/sql/e2-78` (va **antes** del WAR).

---

## 1. El pedido, y lo que midió el `e2-77`

> *«Hay casos en los que se paga la totalidad de una factura, y luego se emite la retención, y eso me
> deja un saldo a favor en el estado de cuenta del proveedor. El proveedor devuelve ese dinero
> depositándolo en la cuenta bancaria. Debe existir una opción que me permita registrar la devolución
> de ese saldo a favor, que pueda conciliar correctamente los movimientos bancarios y me dé de baja el
> valor en el estado de cuenta.»* — usuario, 2026-09-30

**El saldo a favor es el saldo que le queda a un ANTICIPO.** Se pagó el total de la factura como
anticipo **antes** de restar la retención; la retención se aplicó bien y el cruce consumió solo el neto:

| Proveedor | Anticipo | Pagado | Cruzado | Saldo = retención |
|---|---|---:|---:|---:|
| JLCONTROL (1391904274001) | #6 | 3,05 | — | **3,05** |
| EXPOAUTOPARTS (1791242963001) | #7 | 165,58 | 156,94 | **8,64** |
| EXPOAUTOPARTS | #10 | 293,25 | 277,95 | **15,30** |

Las facturas están bien y en 0. El estado de cuenta muestra ese saldo en «Saldo a favor (anticipos)»,
que suma `PGS.ANTP.ANTPSALD`. **Devolver = bajar el saldo del anticipo**, con la contabilidad y el
movimiento bancario que correspondan.

**Contabilidad:** el anticipo nació con DEBE Anticipos del proveedor / HABER Banco. La devolución es el
espejo: **DEBE Banco / HABER Anticipos del proveedor** (`PRCC` tipo 2, rol proveedor). Deja la cuenta de
anticipos en cero por el monto devuelto.

## 2. Decisiones del usuario (2026-10-01)

| Pregunta | Decisión |
|---|---|
| ¿Un depósito puede devolver varios anticipos del mismo proveedor? | **Sí.** Un asiento y un movimiento bancario por el **total del depósito**, para que la conciliación encuentre exactamente el valor del extracto |
| ¿Devolución parcial? | **Sí**, hasta el saldo de cada anticipo |
| ¿Anular? | **Sí**, solo si el movimiento todavía no está conciliado |
| ¿Dónde? | **CxP → Pagos**, junto a Cruce de Anticipo |

## 3. Datos — `e2-78`

- **`PGS.DVPR`** (cabecera = el depósito): `DVPRCDGO` (IDENTITY), `DVPRPJRQ` (empresa), `DVPRTTLR`
  (proveedor), `DVPRCNBC` (cuenta bancaria propia), `DVPRFCHA` (fecha del depósito), `DVPRVLOR`
  (total), `DVPRREFR` (referencia del depósito), `DVPROBSR`, `DVPRASNT` (asiento), `DVPRESTD` (1 ACTIVA,
  2 ANULADA), `DVPRMTAN` (motivo de anulación), `DVPRFCAN` (fecha de anulación), `DVPRUSAR` (usuario),
  `DVPRFCRG` (fecha de registro).
- **`PGS.DDPR`** (detalle): `DDPRCDGO` (IDENTITY), `DVPRCDGO` (FK), `ANTPCDGO` (FK a `PGS.ANTP`),
  `DDPRVLOR`. Un mismo anticipo no se repite dentro de una devolución.
- Sin FK hacia TSR, CNT ni SCP, a propósito (lo explica la cabecera del script).

## 4. Backend

### 4.1 Capas, según `ESTANDAR_MAPEO_CAPAS.md` y copiando las de `AnticipoProveedor`

- Entidades `model/cxp/DevolucionAnticipoProveedor` (DVPR) y `model/cxp/DetalleDevolucionAnticipo`
  (DDPR). PK `Long codigo` con `@GeneratedValue(strategy = GenerationType.IDENTITY)`.
  - Relaciones:
    - `@ManyToOne` a `Empresa` (`DVPRPJRQ` → `PJRQCDGO`), `Titular` (`DVPRTTLR` → `TTLRCDGO`),
      `CuentaBancaria` (`DVPRCNBC` → `CNBCCDGO`), `Asiento` (`DVPRASNT` → `ASNTCDGO`) y `Usuario`
      (`DVPRUSAR` → `PJRQCDGO`), **igual que `AnticipoProveedor:67-160`**;
    - el detalle con `@ManyToOne` a la cabecera y a `AnticipoProveedor`.
  - Fechas: `DVPRFCHA` → `LocalDate`, `DVPRFCAN` y `DVPRFCRG` → `LocalDateTime`.
- Constantes en `NombreEntidadesPago`. NamedQueries `All`/`Id` como las demás.
- DAO, Service y REST `@Path("dvpr")` con el set estándar de la casa, **más** los tres endpoints de la
  §4.2.
- Estados como constantes en `rubros/EstadoDevolucionAnticipoProveedor` (`ACTIVA = 1`,
  `ANULADA = 2`), no como catálogo.

### 4.2 Endpoints de negocio

**`POST /rest/dvpr/registrar`**

```jsonc
{ "idEmpresa": 1236, "idTitular": 187, "idCuentaBancaria": 417, "fecha": "2026-09-30",
  "referencia": "DEP 12345", "observacion": "…", "idUsuario": 5,
  "anticipos": [ { "idAnticipo": 7, "valor": 8.64 }, { "idAnticipo": 10, "valor": 15.30 } ] }
```

Validaciones en orden, todas con `IncomeException`, que el REST responde con 400:

1. `anticipos` no vacío, sin `idAnticipo` repetido, cada `valor > 0`.
2. `idEmpresa`, `idTitular`, `idCuentaBancaria` y `fecha` presentes.
3. La cuenta bancaria existe y tiene `planCuenta`. Mismo mensaje que `AnticipoProveedorServiceImpl:252-262`.
4. Cada anticipo existe, es **del mismo `idTitular` y de la misma empresa**, está en estado
   **CONFIRMADO**, y `valor <= saldo + 0.01`.
5. El proveedor tiene `PRCC` tipo 2 (rol proveedor), y su `saldoInicial >= total`. Mismo mensaje que
   `AplicacionPagoCxpServiceImpl.aplicaCruces` (*«El saldo de anticipos del proveedor … no alcanza…»*).

Si pasa todo, **en una sola transacción**:

1. **Asiento**, con un método nuevo en `AsientoContableService`/`Impl`,
   `generarAsientoDevolucionAnticipoProveedor(idTitular, idCuentaBancaria, total, idEmpresa, fecha,
   observaciones, usuario)`:
   - **DEBE:** `obtenerCuentaBancaria(idCuentaBancaria)` → `cuentaBancaria.getPlanCuenta()`.
   - **HABER:** `obtenerCuentaProveedorPorTipo(idTitular, idEmpresa, 2L)`.
   - **Tipo de asiento y módulo:** **los mismos que usa `generarAsientoAnticipoProveedor`**
     (`TipoAsientos.ANTICIPOS_PROVEEDOR`, el módulo que use ese método). Así el asiento cae en la misma
     serie que el del anticipo que se está devolviendo.
   - ⚠️ `AsientoContableServiceImpl` tiene **210 caracteres con codificación rota que vienen de
     antes**. No se tocan. UTF-8 y CRLF.
2. **Cabecera y detalle** (`DVPR` + `DDPR`), con estado ACTIVA.
3. **Cada anticipo:** `saldo -= valor`. **El estado no cambia**, igual que un cruce: un anticipo en
   saldo 0 sigue CONFIRMADO.
4. **`PRCC` tipo 2 del proveedor:** `saldoInicial -= total`, como hace `aplicaCruces`.
5. **Movimiento bancario:** `movimientoBancoService.creaMovimientoPorTransferencia(idEmpresa,
   "Devolución de anticipo: <proveedor> | Ref: <referencia>", asiento, cuentaBancaria, total,
   TipoMovimientoConciliacion.TRANSFERENCIAS_CREDITOS_EN_TRANSITO, OrigenMovimientoConciliacion.COBROS)`.
   Es el mismo llamado de `IngresoServiceImpl:181-185`.

Respuesta 200: `{ exito, mensaje, devolucion: id, asiento: numeroAlterno }`.

**`POST /rest/dvpr/anular/{id}`** — body `{ motivo, idUsuario }`.

1. El motivo es obligatorio. La devolución existe y está ACTIVA.
2. ⛔ **No conciliada.** Si la línea del banco de su asiento ya está en un grupo de conciliación activo,
   o su `MovimientoBanco` tiene `conciliado = 1`, se rechaza: *«La devolución ya está conciliada con el
   extracto: desconcílela antes de anularla.»* El ejecutor busca **cómo lo verifica hoy otra anulación**
   (pagos, ingresos, anticipos) y **copia ese criterio**. Si no hay ninguno, **para y lo reporta**.
3. Anula el movimiento bancario (`actualizaEstadoMovimiento(idAsiento, ANULADO)`) y el asiento
   (`asientoService.anulaAsiento`). ⛔ **Sin tragarse errores:** `IngresoServiceImpl.anularIngreso`
   captura y solo imprime, y deja el ingreso «anulado» con el asiento vivo. Aquí un fallo **aborta**
   la anulación entera.
4. Cada anticipo: `saldo += valor`. `PRCC` tipo 2: `saldoInicial += total`.
5. Estado ANULADA, `DVPRMTAN` y `DVPRFCAN`.

**`GET /rest/dvpr/listar?idEmpresa=…&idTitular=…`** — las devoluciones del proveedor, la más reciente
primero, como **proyección** y no como entidad: `id`, `fecha`, `valor`, `referencia`, `estado`,
`cuentaBancaria` (texto banco — número), `numeroAsiento`, `motivoAnulacion`, y
`detalle: [{ idAnticipo, numeroDocAnticipo, valor }]`.

**Anticipos disponibles para devolver:** **no hay endpoint nuevo.** Se usa el que ya usa Cruce de
Anticipo, `GET /antp/disponibles/{idTitular}/{idEmpresa}` (estado CONFIRMADO, `saldo > 0`).

### 4.3 La guarda que falta en la anulación del anticipo

`AnticipoProveedorServiceImpl.anularAnticipo` reversa los **cruces** del anticipo, pero no conoce las
**devoluciones**. Si se anula un anticipo con una devolución activa, el saldo queda mal. Agregar, al
principio de `anularAnticipo`: si existe un `DDPR` del anticipo con su `DVPR` ACTIVA, `IncomeException`
*«El anticipo N tiene la devolución M registrada: anúlela antes de anular el anticipo.»*

## 5. Frontend

- **Pantalla nueva** `cxp/forms/pagos/devolucion-anticipo/`, copiando la estructura de
  `cxp/forms/pagos/cruce-anticipo-proveedor/`:
  - **proveedor:** `TitularSelectorDialogComponent` con rol proveedor, como en el cruce;
  - **anticipos disponibles:** `anticipoS.disponiblesProveedor(...)`, la misma llamada del cruce, en una
    tabla con un input de **valor a devolver** por anticipo, que por defecto viene vacío y nunca supera
    el saldo;
  - **cuenta bancaria:** combo de las cuentas propias. Se copia la carga de cuentas de
    `tsr/forms/procesos/aprobacion-pagos` (`cargarCuentas`);
  - **datos del depósito:** fecha (hoy por defecto), referencia, observación, y el **total**, que es la
    suma de lo ingresado;
  - **Registrar:** al terminar, snackbar con el asiento, y recarga de los anticipos y del historial.
- **Historial** de devoluciones del proveedor, debajo, con `GET /dvpr/listar`. Cada fila activa tiene
  **Anular**, que abre `MotivoDialogComponent` como en la bandeja de aprobación. Si el backend rechaza
  porque ya está conciliada, el mensaje se muestra tal cual.
- **Menú:** CxP → Pagos, entrada `'Devolución de Anticipo'` (23 caracteres, el límite es 24) con
  `idPermiso: Permisos.CXP_PAGOS`, sin permiso nuevo. Ruta en `app.routes.ts`, junto a la del cruce.
- Fechas con `convertirFechaDesdeBackend`, errores con `mensajeDeError`.
- **Servicio y modelo:** `cxp/service/devolucion-anticipo.service.ts` y
  `cxp/model/devolucion-anticipo.ts`, con `RS_DVPR` en `ws-cxp.ts`.

## 6. Trampas

1. **El DDL va antes del WAR.** Las entidades nuevas mapean tablas que no existen hasta el `e2-78`.
2. **Un depósito = un asiento = un movimiento por el total.** Si se registrara una devolución por
   anticipo, el extracto con 23,94 tendría que emparejarse contra dos asientos de 8,64 y 15,30.
3. **No tragar errores al anular** (§4.2).
4. **La anulación del anticipo tiene que conocer las devoluciones** (§4.3).
5. **El seguimiento de anticipos** (`AnticipoProveedorServiceImpl.seguimiento`) lista los cruces del
   anticipo, pero no sus devoluciones. Un anticipo devuelto va a mostrar menos saldo sin un cruce que
   lo explique, aunque el `PRCC` cuadra. Queda anotado; mostrar las devoluciones ahí es otro pedido.

## 7. Verificación

- `mvn -q compile` y `ng build`. Revisión del árbitro sobre el diff.
- **Prueba del usuario**, después de correr el `e2-78` y desplegar:
  1. Una devolución de EXPOAUTOPARTS por 23,94 que cubra los anticipos 7 (8,64) y 10 (15,30). En su
     estado de cuenta, «Saldo a favor (anticipos)» queda en **0,00**.
  2. El asiento queda en DEBE la cuenta del banco y HABER los anticipos del proveedor, por 23,94.
  3. En la conciliación del banco aparece un movimiento de 23,94 que se empareja con el depósito del
     extracto.
  4. Anularla devuelve los dos saldos, mientras no esté conciliada.
