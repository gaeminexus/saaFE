# DISEÑO — Egreso pagado con el saldo de un anticipo (gasto sin sustento)

**Equipo:** `omen-saa-2` · **Escrito:** 2026-10-05 por `omen-saa-2-arb`, **antes** de despachar.
**DDL:** `tsr/sql/e2-89` (⛔ va **antes** del WAR). **Espejo FE:** `saaFE/docs/tsr/DISENO-EGRESO-CON-SALDO-DE-ANTICIPO.md`.

## 1. El caso y la decisión

> *«Se dio un anticipo a un empleado por viáticos. Se lo registró como proveedor y se entregaron $300. Al
> regresar tenía documentos que justificaban $260, que se cruzaron con el cruce de anticipo, pero los $40
> restantes no tienen sustento y se van a mandar como gasto no deducible. Necesitamos sacar egresos tomando
> saldos de anticipos, no de una cuenta de banco.»* — usuario, 2026-10-05

**Decisión del usuario: opción A**, un **egreso de tesorería** cuya forma de pago es **el saldo de un
anticipo**. El dinero ya salió al entregar el anticipo: no hay banco ni aprobación, solo se consume el saldo
del anticipo contra un gasto.

Es el mismo caso del anticipo #9 del Dr. Polit (203,17, viáticos sin respaldo; estado del equipo §58 y
correo del 2026-10-02): se resuelve con esta pantalla, sin asiento a mano.

## 2. Contabilidad

| Línea | Cuenta | De dónde |
|---|---|---|
| **DEBE** | el gasto | la cuenta del **grupo del producto de pago** del egreso (`producto.grupoProducto.planCuenta`), igual que cualquier egreso. Contabilidad crea, por ejemplo, el producto «Gastos no deducibles» |
| **HABER** | anticipos del proveedor | `PRCC` tipo 2, rol proveedor, del titular del egreso, igual que el cruce y la devolución |

Sin movimiento bancario. Se baja el **saldo del anticipo** y el **saldo global de anticipos** (`PRCC` tipo 2)
del titular, en la misma transacción.

## 3. Backend

### 3.1 Datos

`Egreso` gana `@ManyToOne AnticipoProveedor anticipo` (`EGRSANTP` → `ANTPCDGO`). Es nulo para los egresos
de siempre.

### 3.2 Registrar — `EgresoServiceImpl.procesarEgreso`

El body de `POST /egrs/procesar` gana **`idAnticipo`** (opcional). **Sin** `idAnticipo`, el flujo es el de
hoy, sin ningún cambio. **Con** `idAnticipo`, un camino nuevo que **no pasa por
`PagoProgramadoServiceImpl`**:

1. Validaciones de hoy: empresa, valor > 0, concepto, `validaProducto`.
2. **Titular obligatorio:** *«Para pagar con un anticipo hay que indicar el beneficiario.»*
3. El anticipo existe, es **del mismo titular y empresa**, y está **CONFIRMADO**. `valor <= saldo + 0.01`.
   Mensajes en el estilo de la devolución.
4. El `PRCC` tipo 2 del titular existe y su `saldoInicial >= valor`. Mismo mensaje que la devolución, con
   «no alcanza para pagar este egreso».
5. **Asiento**, con un método nuevo en `AsientoContableService`,
   `generarAsientoEgresoContraAnticipo(idProductoPago, idTitular, valor, idEmpresa, fecha, observaciones,
   usuario)`. El DEBE se resuelve igual que en `generarAsientoEgresoTesoreria`; el HABER, con
   `obtenerCuentaProveedorPorTipo(idTitular, idEmpresa, 2L)`. **Mismo tipo de asiento y módulo que
   `generarAsientoEgresoTesoreria`**. ⚠️ El archivo tiene caracteres con codificación rota que vienen de
   antes: no se tocan.
6. El egreso queda **PAGADO**, con `asiento` y `anticipo`. Saldo del anticipo `-= valor`; `PRCC` tipo 2
   `-= valor`. **No se crea `PagoProgramado` ni movimiento bancario.**
7. Respuesta: `{ exito, mensaje, egreso, asiento: numeroAlterno, idAsiento }`. Así funciona el botón
   «Imprimir asiento» que ya existe.

### 3.3 Anular — `EgresoServiceImpl.anularEgreso`

Hoy un egreso **PAGADO** no se puede anular: pide reversar el pago en tesorería. Para el egreso pagado
**con anticipo** (`anticipo != null`) no hay pago que reversar, así que se anula aquí:

- anula el asiento (`asientoService.anulaAsiento`), **sin tragarse errores**;
- repone el saldo del anticipo y el `PRCC` tipo 2;
- deja el estado en ANULADO, con el motivo.

Los egresos pagados por banco **siguen exactamente igual que hoy**.

### 3.4 Guarda en la anulación del anticipo

`AnticipoProveedorServiceImpl.anularAnticipo` ya rechaza un anticipo con devoluciones activas (§57). Se
agrega lo mismo para los egresos: si hay un egreso **no anulado** con `anticipo` = ese anticipo, se
rechaza con *«El anticipo N pagó el egreso M: anúlelo antes de anular el anticipo.»*

## 4. Frontend — Tesorería → Registrar → Egresos

- Con el beneficiario elegido, si tiene **anticipos disponibles** (`anticipoS.disponiblesProveedor`, la
  misma llamada del cruce), aparece la opción **«Pagar con el saldo de un anticipo»**.
- Al marcarla:
  - se elige el anticipo en un combo con número, fecha y saldo;
  - el valor no puede superar ese saldo;
  - **se ocultan** la cuenta de destino y la cuenta bancaria, que no aplican;
  - el aviso de éxito trae «Imprimir asiento».
- En la **consulta**, el egreso pagado con anticipo muestra «Pagado con anticipo N», y su «Anular» funciona
  aunque esté PAGADO.

## 5. Trampas

1. ⛔ **El `e2-89` va ANTES del WAR:** `Egreso` mapea `EGRSANTP`. Sin la columna, se rompe toda lectura de
   egresos.
2. **Este camino no toca `PagoProgramadoServiceImpl`.** Un egreso pagado con anticipo no tiene pago
   programado.
3. **Saldo del anticipo y `PRCC` se mueven juntos**, igual que en el cruce y la devolución. Si no, vuelve el
   descuadre del §58.
4. **El producto define la cuenta del gasto.** Si contabilidad no tiene un producto para gastos no
   deducibles, lo crea una vez en CxP → Productos.
