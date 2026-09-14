# Invariante — el saldo de un aporte NUNCA queda negativo

**Fecha:** 2026-09-14 · **Árbitro:** `omen-saa-1-arb` · **Origen:** H60 (jubilado de agosto 2026 con
su pensión complementaria en negativo). Regla del usuario, textual:

> *«Tenemos que asegurarnos que jamás vuelva a pasar que se pague más de lo que el saldo de la cuenta
> del partícipe lo permite.»* — *«el sistema no debe permitir devolver más dinero o cruzarlo con
> préstamos del que un partícipe tenga.»*

## 1. La regla

Para todo partícipe `e` y todo tipo de aporte `t`, **después de cualquier operación**:

```
SUM(CRD.APRT.APRTVLRR) WHERE ENTDCDGO = e AND TPAPCDGO = t   ≥   0   (tolerancia 0,01)
```

El saldo es exactamente ese `SUM`, sin filtro de estado (`AporteDaoServiceImpl.sumValorByEntidadYTipo`),
y `CRD.APRT` es **append-only**: una corrección es una fila nueva (reverso), nunca un `UPDATE` del
valor ni un `DELETE`.

## 2. Qué la hacía cumplir y qué no — medido el 2026-09-14

| Operación que resta de un aporte | Validaba saldo | Bajo carrera (dos transacciones a la vez) |
|---|---|---|
| Cruce contra préstamo, precancelación, acuerdo de condonación (`consumirAportes`) | ✅ dos veces | ⛔ sin bloqueo |
| **Devolución de aportes** (`registrarDevolucion`) | ✅ dos veces, y descuenta **al registrar**, no al pagar | ⛔ sin bloqueo |
| Pago de pensión y seguro de jubilados (`crearMovimientoNegativo`) | ⛔ no → ✅ desde `1dbd4e0c` | ⛔ sin bloqueo |
| Traslado de jubilación (`procesarJubilacion`) | ✅ traslada exactamente el saldo leído | ⛔ sin bloqueo |
| Reverso de un aporte positivo (`reversarAporte`, lo usa la anulación de cobros) | ⛔ no | ⛔ |
| `PUT /rest/aprt` (`saveSingle`) | ⛔ acepta cualquier `valor`, tipo o entidad | ⛔ |
| `POST /rest/aprt` (`saveSingle`) | ⛔ acepta `valor` negativo | ⛔ |
| `DELETE /rest/aprt/{id}` | ⛔ borra cualquier fila | ⛔ |

### 2.1 La devolución de aportes está bien — y por qué no alcanza

`DevolucionAporteServiceImpl.registrarDevolucion` valida el saldo por tipo al validar (`:295`) y lo
**revalida dentro de la transacción** antes de insertar cada fila negativa (`:420`). Los negativos se
crean **al registrar la devolución**, y la orden de pago sale por exactamente lo descontado: no hay
ventana entre "se aprobó" y "se descontó". Anular está bloqueado si el pago está `CONFIRMADO` o
`EN_ARCHIVO`, y el contra-movimiento sólo se genera si el dinero no salió.

**Lo que no cubre ninguna de las validaciones:** dos operaciones **simultáneas** sobre el mismo
partícipe. Las dos leen el mismo saldo antes de que la otra inserte y las dos pasan. La
"revalidación anti-carrera" de los comentarios sólo protege dentro de la **misma** transacción: con
Oracle en `READ COMMITTED`, la otra transacción no ve el negativo hasta que confirma. Casos reales:
dos operadores, dos pestañas, una devolución mientras corre la pensión o una carga de cobros.

### 2.2 Las puertas traseras

`saveSingle` sólo lo llama `AporteRest` (verificado con grep). El frontend usa `PUT` **para cambiar
el estado** de un aporte (`participe-dash.component.ts:3219`, manda la entidad completa con el mismo
`valor`) y no usa `POST` ni `DELETE` desde ninguna pantalla (sólo el service-locator genérico, sin
pantalla que lo invoque). Pero los tres endpoints están abiertos. Un `DELETE` de una fila **negativa**
—el descuento de una devolución ya pagada— le devuelve el saldo al partícipe y le permite cobrar dos
veces, sin ningún error.

## 3. Diseño del cierre

### 3.1 Un bloqueo por partícipe, antes de leer el saldo

Nuevo método en `AporteDaoService` / `AporteDaoServiceImpl`:

```java
void bloquearAportesEntidad(Long idEntidad) throws Throwable;
// em.createNativeQuery("SELECT ENTDCDGO FROM CRD.ENTD WHERE ENTDCDGO = :id FOR UPDATE WAIT 30")
```

- **Consulta nativa, no `em.find(..., PESSIMISTIC_WRITE)`:** `Entidad` arrastra `@ManyToOne` EAGER, y
  en Oracle un `FOR UPDATE` sobre un `JOIN` bloquea **las filas de todas las tablas del join** (la
  filial, etc.). Serializaría a medio sistema.
- **`WAIT 30`:** sin él, un proceso largo con el partícipe tomado cuelga la pantalla del operador sin
  límite. Si se vence el tiempo (`ORA-30006`) → `IncomeException` con un mensaje claro: «otra operación
  está moviendo los aportes del partícipe N; intente de nuevo en unos segundos».
- **No atrapa excepciones**, a diferencia de sus vecinos del DAO. Un bloqueo que falla en silencio es
  un bloqueo que no existe.
- Sin filas → `IncomeException` (el partícipe no existe).
- Se libera solo al confirmar o revertir la transacción. Todas las operaciones de la tabla del §2 son
  `REQUIRED`, así que bloquear dos veces en la misma transacción (la pensión llama al cruce) es
  reentrante en Oracle y no se auto-bloquea.

**Dónde se llama** (siempre **antes** de la primera lectura de saldo de esa operación):

| Método | Punto |
|---|---|
| `ProcesoPagoPrestamoServiceImpl.consumirAportes` | al entrar, antes del bucle |
| `DevolucionAporteServiceImpl.registrarDevolucion` | justo después de encontrar la entidad (paso 2) |
| `PagoPensionComplementariaServiceImpl.generarMesesRetroactivos` | antes de leer `saldoRestante` |
| `PagoPensionComplementariaServiceImpl.generarSeguroIndividual` | antes de leer el saldo |
| `PagoPensionComplementariaServiceImpl.crearMovimientoNegativo` | antes del guardarraíl |
| `AporteServiceImpl.procesarJubilacion` | antes de leer los saldos de cesantía y jubilación |
| `AporteServiceImpl.reversarAporte` | antes de validar (§3.2) |

`validarDesgloseAportes` (`ProcesoPagoPrestamoServiceImpl:~656`) **no** se bloquea: es público y
puede llamarse fuera de una transacción, y la decisión real la toma `consumirAportes`, que revalida
ya con el bloqueo tomado.

Riesgo aceptado: dos procesos masivos que tomen los mismos partícipes en orden inverso pueden chocar
(`ORA-00060`, deadlock). Oracle aborta uno y el otro sigue. Es preferible a un sobrepago silencioso.

### 3.2 `reversarAporte` no puede dejar el saldo negativo

Con el bloqueo tomado: si `saldo(entidad, tipo) − valorOriginal < −0,01` → `IncomeException`:
«no se puede reversar el aporte N por $X: el partícipe ya usó ese dinero (saldo actual $Y). Anule
primero la devolución, el cruce o el pago que lo consumió.»

⚠️ **Cambia un comportamiento visible:** `CobroCreditoServiceImpl.reversarLineasProcesadas` (anular
o reversar un cobro) usa este método. Un cobro cuyo aporte ya se devolvió o se cruzó **ya no se podrá
anular** hasta anular primero lo que consumió ese dinero. Es la consecuencia directa de la regla: si
el depósito se cae y la plata ya salió, anularlo dejaría la cuenta en negativo.

### 3.3 Las puertas del CRUD genérico

- **`DELETE /rest/aprt/{id}`** y `AporteServiceImpl.remove` → rechazan siempre: `CRD.APRT` es
  append-only; para corregir, un reverso. El REST responde `400` con ese texto.
- **`POST /rest/aprt`** (`saveSingle` con `codigo == null`) → rechaza `valor < 0`. Los descuentos sólo
  nacen de los procesos de la tabla del §2.
- **`PUT /rest/aprt`** (`saveSingle` con `codigo != null`) → lee la fila guardada **antes** del merge y
  rechaza si cambia `valor` (tolerancia 0,01), el tipo de aporte o la entidad. Cambiar el estado sigue
  funcionando: es lo único que hace el frontend.

### 3.4 Lo que NO se toca

Los procesos que sólo **suman** (cargas Petro, `registrarAporte`, contra-movimientos de reversos y
rechazos), y el cálculo del saldo. La regla §1 no cambia qué es el saldo: cambia quién puede dejarlo
bajo cero, que desde ahora es nadie.

## 4. Lo que queda afuera de este cierre

- **Los saldos que YA están negativos** (agosto 2026). El bloqueo no los arregla. Se miden con
  `crd/sql/222` (bloque 1) y lo que se haga con ellos es decisión de negocio.
- **Un `UPDATE`/`DELETE` directo por SQL** sobre `CRD.APRT`. Eso lo previene la base (un trigger o
  quitar permisos de escritura al usuario de la aplicación), no Java. Queda como propuesta.
