# Devolución de un anticipo a empleado

**Equipo:** `lap-saa-1` · **2026-09-07** · Módulo `rhh` (+ `tsr` de lectura, para el ingreso)
**Estado:** contrato congelado, implementación pendiente.
Verificado contra el código el 2026-09-07, sobre `ef032c86`. `rhh` es **alcance compartido** con
`omen-saa-2`, que tocó `AnticipoEmpleadoServiceImpl` ese mismo día — coordinar antes de escribir.

---

## 0. Qué falta hoy

Un anticipo se entrega (`AnticipoEmpleadoServiceImpl`), se paga por tesorería y se recupera
**descontándolo del rol**: al confirmarse el pago se crea un `DescuentoRecurrente` (`RHH.DSRC`) con
sus `CuotaDescuento` (`RHH.CTDS`), y cada nómina toma las cuotas por vencer.

**No hay forma de que el empleado devuelva la plata.** Si deposita en la cuenta de la empresa, hoy
no hay dónde registrarlo, no se contabiliza, y **el descuento del mes se le aplica igual** — se le
cobra dos veces.

---

## 1. Decisiones del usuario — 2026-09-07

1. **Devoluciones totales y parciales, varias veces por anticipo.** De ahí que sea una tabla y no
   unas columnas en `RHH.ANTE`.
2. **Las cuotas que dejan de descontarse son las próximas por vencer, hasta cubrir el monto
   devuelto.** Si sobra un resto que no alcanza para una cuota entera, esa cuota **baja de valor**
   en lugar de cancelarse.

---

## 2. Modelo

### 2.1 `RHH.DVAN` — devolución de anticipo

Nombre verificado libre en `src/main/java/com/saa/model/`, en `docs/` y en el registro de reservas.
DDL en `sql/lap1-11-devolucion-anticipo.sql`. **Va antes del WAR.**

| Columna | Tipo | Java | Para qué |
|---|---|---|---|
| `DVANCDGO` | `NUMBER` identity | `Long codigo` | PK |
| `ANTECDGO` | `NUMBER` | `AnticipoEmpleado anticipo` | FK `RHH.ANTE` |
| `DVANFCHA` | `DATE` | `LocalDate fecha` | **Fecha del depósito**, la real, no la de captura |
| `DVANVLOR` | `NUMBER(18,2)` | `Double valor` | Lo devuelto |
| `CNBCCDGO` | `NUMBER` | `CuentaBancaria cuentaBancaria` | **La cuenta de la empresa donde depositó**. FK `TSR.CNBC` |
| `DVANRFRN` | `VARCHAR2(200)` | `String referencia` | N° de papeleta o transferencia |
| `DVANOBSR` | `VARCHAR2(2000)` | `String observacion` | |
| `INGRCDGO` | `NUMBER` | `Long idIngreso` | El `TSR.INGR` generado. **Id crudo, no `@ManyToOne`** (§5.2) |
| `DVANASNT` | `NUMBER` | `Asiento asiento` | FK `CNT.ASNT` |
| `DVANESTD` | `NUMBER` | `Long estado` | 1 Vigente · 2 Anulada |
| `DVANMTAN` | `VARCHAR2(500)` | `String motivoAnulacion` | |
| `DVANFCRG` | `TIMESTAMP` | `LocalDateTime fechaRegistro` | |
| `DVANUSAR` | `NUMBER` | `Long usuario` | |

**Sin rubro nuevo.** El estado es un flag de dos valores, no parametría de oficina: constante Java
en `com.saa.rubros.EstadoDevolucionAnticipo`, mismo criterio que `EstadoCajaChica`.

---

## 3. Contabilidad — el ingreso lo hace tesorería, no `rhh`

**No escribir un asiento a mano.** `IngresoServiceImpl.procesarIngreso` ya hace las tres cosas, en
este orden y verificado:

1. Asiento **DEBE banco / HABER la cuenta del grupo del producto** (`generarAsientoIngresoTesoreria`).
2. Registra el `TSR.INGR` ya contabilizado.
3. **Emite el movimiento bancario** (`creaMovimientoPorTransferencia`), que es lo que hace que el
   depósito aparezca en la conciliación.

Es el reverso exacto de cómo salió la plata: la entrega del anticipo debitó **cuentas por cobrar
empleados** (`RhhLineaAsiento.CUENTAS_POR_COBRAR_EMPLEADOS` = 14); la devolución la acredita.

**Parametrización necesaria:** un producto de cobro cuyo **grupo** apunte a esa misma cuenta por
cobrar. Va en `lap1-11`, leyendo la cuenta de la plantilla contable en vez de teclearla — si la
devolución acreditara una cuenta distinta de la que se debitó al entregar, el saldo del empleado
nunca se cerraría y no se vería hasta un cierre.

`idTitular` de `procesarIngreso` **es opcional y va en `null`**: el empleado no es un `TSR.TTLR` y no
hay que inventarle uno. Verificado en `IngresoServiceImpl:141-148`.

---

## 4. Efecto sobre el descuento — lo que el usuario pidió

**El objetivo es que ese mes no se le descuente.** El mecanismo exacto, verificado:
`CuotaDescuentoDaoServiceImpl.selectPendientesPorVencer` filtra
`estado in (PENDIENTE, PARCIAL)` **y** `descuentoRecurrente.estado = 1`. O sea que una cuota sale
del cálculo de nómina si se la marca `ANULADA` (4), o si se desactiva el descuento entero.

Al registrar una devolución, sobre las cuotas **`PENDIENTE`/`PARCIAL` ordenadas por vencimiento**:

1. Mientras el monto restante **cubra la cuota entera**: `estado = ANULADA (4)`, y se deja dicho en
   su observación que fue por devolución (no por anulación manual).
2. Si queda un resto **menor** que la cuota siguiente: esa cuota **baja de valor** por el resto y
   **sigue `PENDIENTE`**. No se marca parcial: `PARCIAL` significa «se descontó una parte y el resto
   se reintenta», que es otra cosa.
3. Se descuenta el mismo monto del saldo del anticipo (`ANTESLDD`) y del `DescuentoRecurrente`
   (`DSRCSLDD`).
4. Si tras la devolución el saldo del anticipo queda en **cero** (con tolerancia de un centavo): el
   anticipo pasa a `CANCELADO (5)` y el `DescuentoRecurrente` se desactiva, lo que saca de una vez
   todas las cuotas que quedaran.

⚠️ **Las cuotas ya `DESCONTADA` no se tocan.** Ese dinero ya se le retuvo en un rol cerrado;
"devolver" sobre eso sería otra operación —un reintegro al empleado— y no es lo que se pidió.

⚠️ **Si el período en curso ya está calculado**, anular la cuota ahora **no cambia ese rol**: el
cálculo ya la tomó. El endpoint debe **avisarlo en la respuesta** (no rechazar): quien registre la
devolución tiene que saber que hay que recalcular el período o que el descuento sale igual este mes.

---

## 5. Endpoints

Base `/rest/dvan`.

### 5.1 `POST /rest/dvan/registrar`

```json
{
  "idAnticipo": 12, "fecha": "2026-09-05", "valor": 150.00,
  "idCuentaBancaria": 4, "referencia": "DEP 998877",
  "observacion": "Devuelve la cuota de septiembre", "idUsuario": 12
}
```

**Validaciones, en orden y con mensaje propio:**

| # | Regla | Mensaje |
|---|---|---|
| 1 | El anticipo existe | la excepción de `selectById` sube |
| 2 | Está en estado `PAGADO (3)` o `EN_DESCUENTO (4)` | «El anticipo N está en estado E: sólo se puede devolver uno ya pagado.» |
| 3 | `valor > 0` | «El valor devuelto debe ser mayor a cero.» |
| 4 | `valor` no supera el saldo pendiente | «Devuelve $X y el anticipo sólo tiene $Y pendiente.» |
| 5 | Cuenta bancaria existe y es de la empresa | reusar el mensaje de `procesarIngreso` |
| 6 | `fecha` presente | «Debe indicar la fecha del depósito.» |

**Respuesta 200**

```json
{
  "idDevolucion": 3, "idAnticipo": 12, "valor": 150.00,
  "saldoAnterior": 450.00, "saldoNuevo": 300.00,
  "estadoAnticipo": 4,
  "cuotasCanceladas": [ { "numero": 3, "vencimiento": "2026-09-30", "valor": 150.00 } ],
  "cuotaAjustada": null,
  "idIngreso": 88, "idAsiento": 4412, "numeroAsiento": "2026-09-000412",
  "avisoPeriodoCalculado": "El período 2026-09 ya está calculado: la cuota anulada ya entró en ese rol. Recalcule el período o el descuento saldrá igual este mes.",
  "mensaje": "Devolución registrada. Se cancelaron 1 cuota(s) por $150.00."
}
```

`avisoPeriodoCalculado` va en `null` cuando no aplica. **No es un error**: es información que el
usuario necesita y que nadie más le va a dar.

### 5.2 `POST /rest/dvan/anular/{id}`

Cuerpo `{motivo, idUsuario}`. Deshace **todo**, en este orden:

1. `IngresoService.anularIngreso(idIngreso, motivo, idUsuario)` — anula asiento y movimiento bancario.
2. Devuelve las cuotas canceladas a `PENDIENTE` y restaura el valor de la que se hubiera ajustado.
3. Repone el saldo del anticipo y del descuento; si el anticipo había quedado `CANCELADO`, vuelve a
   `EN_DESCUENTO` y reactiva el `DescuentoRecurrente`.
4. Marca la devolución `ANULADA (2)` con su motivo.

⚠️ **`INGRCDGO` es un id crudo, no una relación.** `Ingreso` tiene varios `@ManyToOne` EAGER y
traerlo en cada fila de un listado arrastra ese grafo — el mismo patrón que causó un `ORA-04036` en
producción con `PagoProgramado` (ver el javadoc de `MovimientoCajaChica.idPago`). Para anular hace
falta el id, nada más.

### 5.3 Consultas

- `GET /rest/dvan/porAnticipo/{idAnticipo}` — las devoluciones de un anticipo, con su estado.
- `GET /rest/dvan/getId/{id}`.

---

## 6. Frontend

En la pantalla de anticipos (`rrh/forms/procesos/anticipos`), sobre un anticipo `PAGADO` o
`EN_DESCUENTO`: acción **«Registrar devolución»** con diálogo de fecha del depósito, valor, cuenta
bancaria de la empresa, referencia y observación.

Al confirmar, **mostrar qué cuotas quedaron canceladas** — no sólo «devolución registrada». El
usuario está haciendo esto para que no se le descuente a alguien; que el sistema le confirme cuáles
son las cuotas afectadas es la mitad del valor de la pantalla.

Y **si viene `avisoPeriodoCalculado`, mostrarlo destacado**, no en un snackbar que se va solo: es la
diferencia entre que el empleado cobre bien este mes o no.

En el detalle del anticipo, listar sus devoluciones con fecha, valor, cuenta y observación, y la
acción de anular.

---

## 7. Trampas verificadas

- **El descuento vive en dos tablas.** `DSRC` lleva el saldo y `CTDS` las cuotas. Tocar una sin la
  otra deja el anticipo cuadrado en un lado y no en el otro.
- **`PARCIAL` no significa «cuota reducida».** Significa que se descontó una parte y el resto se
  reintenta el período siguiente (`selectPendientesPorVencer` la vuelve a traer). Una cuota que baja
  de valor por una devolución sigue `PENDIENTE`.
- **`rhh` ya depende de `cxp`** (`PagoProgramadoService` en el mismo archivo de anticipos). Agregar
  `IngresoService` de `tsr` no abre una dirección nueva de dependencia. Lo prohibido sigue siendo que
  `rhh`, `cnt`, `tsr` o `cxp` dependan de `crd`.
- **`omen-saa-2` tocó `AnticipoEmpleadoServiceImpl` el 2026-09-07** (commit `6e646eaf`, sobre el
  control de transferencia del pago). Antes de escribir en ese archivo: `git log` y `git status`, y
  si hay algo sin reconocer, parar.
