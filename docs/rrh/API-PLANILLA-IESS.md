# Planillas del IESS: captura, conciliación y pago

**Equipo:** `lap-saa-1` · **2026-09-07** · Módulo `rhh` (+ `cnt` para el asiento)
**Estado:** Fase 1 implementada y commiteada (`b5ddf6bf`). **Fase 2 (pago) decidida y especificada en
§6: va por tesorería.** Verificado contra el código el 2026-09-07. `rhh` es **alcance compartido**
con `omen-saa-2`, pero esta fase **no toca `cxp`** — ver §6.0.

---

## 0. La brecha real, medida hoy — no la del documento de agosto

`NORMATIVA-IESS-NOVEDADES.md` (2026-08-21) listaba una brecha grande. **Casi toda se cerró desde
entonces**, y conviene decirlo para que nadie reconstruya lo que ya existe:

| Lo que pedía la normativa | Hoy |
|---|---|
| Los 11 tipos de novedad (faltaban 6) | ✅ `RhhTipoNovedadIess` los tiene todos |
| 11 columnas nuevas en `NVIS` (días, causa IESS, fallecimiento, período FR, lote, respuesta) | ✅ todas mapeadas |
| Pantalla «Novedades del mes» | ✅ `rrh/forms/procesos/novedades-iess` |
| Exportador batch | ✅ `ExportacionNovedadesIessService` |
| No cerrar período con novedades pendientes | ✅ |
| Planilla de control con comprobante completo | ✅ backend — **sin pantalla** |

**Lo que falta de verdad son dos cosas:**

1. **La planilla de control no tiene UI.** `GET /rest/plie/getPeriodo/{idPeriodo}` funciona y ningún
   componente lo consume. Es lo que habría evitado los 208,22 de marzo: cuadrar contra el portal
   **antes** de pagar.
2. **El pago no existe en ninguna parte del sistema.** Cero referencias a IESS en `cxp`, `tsr` y
   `cnt`. La nómina provisiona las cuentas por pagar y **nada las salda**.

---

## 1. Decisiones del usuario — 2026-09-07

No re-preguntar, no reinterpretar:

1. **El IESS debita de la cuenta** (débito automático). El pago no se ordena al banco: se registra
   un hecho ya ocurrido, así que nace confirmado y se contabiliza en el acto.
2. **Se captura la planilla que emite el portal y se concilia** contra la planilla de control,
   mostrando las diferencias. **Sin bloquear el pago**: una diferencia legítima no debe trabar el mes.
3. **Son varias planillas por período, una por rubro** — el usuario lo precisó al revisar el diseño:
   rol normal, préstamos quirografarios, préstamos hipotecarios y fondos de reserva. **Cada una
   tiene su propio comprobante y su propio pago.**

---

## 2. Las cuatro planillas y contra qué cuenta paga cada una

Esto es lo primero que hay que resolver, porque **la contabilidad de hoy no las distingue a todas**:

| Planilla | Qué cobra el IESS | Cuenta por pagar que la nómina ya provisiona |
|---|---|---|
| **Rol normal (aportes)** | Aporte personal + patronal + IECE/SECAP + CCC 1 % + seguro de tiempo parcial | `IESS_POR_PAGAR_APORTE_PERSONAL` (10) y `..._PATRONAL` (11) |
| **Préstamos quirografarios** | Cuotas descontadas al empleado | `IESS_POR_PAGAR_PRESTAMOS` (12) |
| **Préstamos hipotecarios** | Cuotas descontadas al empleado | `IESS_POR_PAGAR_PRESTAMOS` (12) — **la misma** |
| **Fondos de reserva** | FR de quien eligió acumular en el IESS | `FONDOS_DE_RESERVA_POR_PAGAR` (16) |

### 2.1 🔴 Quirografarios e hipotecarios comparten cuenta, y son dos pagos distintos

`RhhLineaAsiento` tiene **una sola** línea 12 para todos los préstamos del IESS. Si son dos
planillas con dos débitos distintos, **esa cuenta no se puede cuadrar por planilla**: los dos pagos
debitan el mismo saldo y una diferencia en uno se compensa con el otro sin que nadie la vea.

> **RESUELTO — decisión del usuario, 2026-09-07:** *«hipotecarios y quirografarios van a cuentas
> diferentes»*. **Hay que separarlas.**

**Es viable**: el motor de nómina **ya los distingue** como conceptos separados
(`RhhRolConceptoMotor.PRESTAMO_QUIROGRAFARIO = 12` y `PRESTAMO_HIPOTECARIO = 13`). Lo que los junta
es una sola línea de `ContabilizacionNominaServiceImpl.lineaDeDescuento:937-940`, que devuelve
`IESS_POR_PAGAR_PRESTAMOS` para los dos.

Qué hace falta, en orden:

1. Una línea de asiento nueva, `IESS_POR_PAGAR_PRESTAMOS_HIPOTECARIOS`, en `RhhLineaAsiento`.
2. Ramificar ese `if` para que el hipotecario vaya a la nueva.
3. Parametrizar la línea nueva en las plantillas contables con su cuenta (`sql/lap1-10`).
4. Dos productos de pago en vez de uno: `IESS-PRSQ` y `IESS-PRSH`.

⚠️ **El punto 2 cambia el asiento mensual de nómina**, y `rhh` está en calibración con meses ya
cerrados en producción. **Aplicar desde un período nuevo, nunca reprocesando uno cerrado**: un mes
cerrado que se recalcule con la línea nueva deja de cuadrar contra lo que ya se declaró.

⚠️ Y **la provisión histórica no se reparte sola**: todo lo acumulado hasta hoy en la cuenta 12 es
de los dos préstamos mezclados. Separar de aquí en adelante no separa el saldo anterior; ese saldo
se arrastra hasta que se consuma o se reclasifique a mano. Es una consulta a la contadora, no algo
que el sistema deba adivinar.

### 2.2 Qué es el CCC, y por qué esta sección se corrigió DOS veces

**Qué es.** `CCC` = **Contribución de Fomento de Capacidades y Conocimientos Ciudadanos**
(disposición general undécima del Código Orgánico Monetario y Financiero): **1 % de la masa
salarial**, que se reparte **0,5 % al IECE** y **0,5 % al SECAP**. Verificado además contra la
planilla real de ASOPREP: 205,60 sobre 20 560,00 en abril.

**Y eso cambia todo, porque el sistema ya lo contabiliza — con otro nombre.**

| Primera versión | Segunda versión | Lo verificado hoy |
|---|---|---|
| «Quedan dentro del aporte patronal» — suposición, sin verificar | «No se provisionan»: grep de `CCC`/`contribucion` en la contabilización dio cero | **El CCC sí se provisiona: se llama `IECE` y `SECAP`** |

`ContabilizacionNominaServiceImpl:872-881` lo dice explícitamente: *«separando el IESS del IECE y el
SECAP porque son dos cuentas de gasto distintas. HABER: los tres van al IESS, que es quien los
recauda en la misma planilla»*. El DEBE va a `GASTO_IECE_Y_SECAP` (4) y **el HABER a
`IESS_POR_PAGAR_APORTE_PATRONAL` (11)** — la misma cuenta que el aporte patronal.

> **La lección, y por eso queda escrita en vez de borrada:** el segundo grep buscaba el **acrónimo**
> (`CCC`) y no el **concepto**. El sistema lo tenía, con el nombre de sus dos destinatarios legales.
> Buscar por el nombre que usa el documento y no por el que usa el código es exactamente cómo se
> "descubre" que algo falta cuando está ahí.

**Consecuencia práctica: `IESS-CCC` debe apuntar a la MISMA cuenta que `IESS-APAT`**, porque ahí está
provisionado. No es un pliegue en el código —cada concepto conserva su producto— sino dos grupos
apuntando a la misma cuenta, que es exactamente para lo que se separaron (§6.5).

### 2.2bis 🔴 El seguro de salud de tiempo parcial sí queda sin provisión

Esto sobrevive a la corrección: **el 4,41 % sobre (SBU − sueldo real) no se calcula ni se contabiliza
en la nómina.** No existe como concepto del motor (`RhhRolConceptoMotor`, cero resultados) ni aparece
en la contabilización. Sólo lo calcula la planilla de control, para cuadrar el comprobante.

**Por qué importa:** si el pago lo debitara contra «IESS por pagar aporte patronal», estaría
debitando un pasivo que **por esa parte nunca se acreditó**. Esa cuenta se iría a saldo deudor por
ese monto **todos los meses**, creciendo, y no lo notaría nadie hasta un cierre — y ahí el descuadre
no apuntaría a su causa. Es el patrón de siempre: **un lector apuntando a donde nadie escribe.**

Es un monto chico —sólo aplica a quien tiene jornada parcial— y por eso es más fácil que pase
inadvertido durante meses.

**Decisión pendiente del usuario, y es contable, no técnica.** Dos salidas:

- **Reconocerlos como gasto al pagar**: el DEBE va a una cuenta de gasto, no al pasivo. Correcto si
  nunca se devengaron, y no toca la nómina.
- **Provisionarlos en la nómina**: líneas de asiento nuevas más su parametrización, y cambia el
  asiento mensual de nómina. Es lo correcto por devengado, y es un cambio de criterio contable.

**Mientras no se decida, el código no debe elegir por su cuenta.** El mapeo `conceptoTipo` → producto
es **1:1 y parametrizado** (§6.5): existen productos propios `IESS-CCC` e `IESS-STP`, y a qué cuenta
apuntan sus grupos lo define `lap1-09`, no el Java. Sea cual sea la decisión, se implementa
cambiando la cuenta de un grupo.

---

## 3. Modelo — Fase 1

Dos tablas nuevas. DDL en `docs/logica-negocio/rhh/sql/lap1-08-planilla-iess.sql`.
**Va antes del WAR**: las entidades mapean estas columnas y una columna ausente rompe toda lectura
con `ORA-00904`.

### 3.1 `RHH.PLIS` — la planilla que emitió el IESS

Nombre verificado libre en `src/main/java/com/saa/model/`, en `docs/` y en el registro de reservas.
**No confundir con el `@Path("plie")` del REST**: ése es la planilla de *control*, que es un POJO
calculado y no tiene tabla.

| Columna | Tipo | Java | Para qué |
|---|---|---|---|
| `PLISCDGO` | `NUMBER` identity | `Long codigo` | PK |
| `PJRQCDGO` | `NUMBER` | `Empresa empresa` | FK `SCP.PJRQ` |
| `PRDNCDGO` | `NUMBER` | `PeriodoNomina periodo` | FK `RHH.PRDN` |
| `PLISTIPO` | `NUMBER` | `Long tipo` | Rubro nuevo (§3.3): 1 rol · 2 quirografarios · 3 hipotecarios · 4 fondos de reserva |
| `PLISNMCM` | `VARCHAR2(50)` | `String numeroComprobante` | El del portal. **Único por empresa+tipo** |
| `PLISFCEM` | `DATE` | `LocalDate fechaEmision` | |
| `PLISFCMX` | `DATE` | `LocalDate fechaMaximaPago` | Vencimiento del comprobante |
| `PLISVLIS` | `NUMBER(18,2)` | `Double valorIess` | Total que cobra el IESS |
| `PLISVLCT` | `NUMBER(18,2)` | `Double valorControl` | Nuestro total al conciliar — **snapshot**, no se recalcula después |
| `PLISDIFR` | `NUMBER(18,2)` | `Double diferencia` | `valorIess − valorControl`. Se graba, no se calcula al vuelo: hay que poder auditar qué diferencia se aceptó |
| `PLISESTD` | `NUMBER` | `Long estado` | 1 Registrada · 2 Conciliada · 3 Pagada · 4 Anulada |
| `PLISFCPG` | `DATE` | `LocalDate fechaPago` | Fecha real del débito |
| `PLISASNT` | `NUMBER` | `Asiento asiento` | FK `CNT.ASNT`, se llena al pagar |
| `PLISOBSR` | `VARCHAR2(1000)` | `String observacion` | |
| `PLISMTAN` | `VARCHAR2(500)` | `String motivoAnulacion` | |
| `PLISFCRG` | `TIMESTAMP` | `LocalDateTime fechaRegistro` | |
| `PLISUSAR` | `NUMBER` | `Long usuario` | |

### 3.2 `RHH.DLIS` — renglones del comprobante

Un renglón por concepto que trae el comprobante del portal. Es donde vive el valor real de la
conciliación: el total puede cuadrar y estar mal por dentro.

| Columna | Tipo | Java |
|---|---|---|
| `DLISCDGO` | `NUMBER` identity | `Long codigo` |
| `PLISCDGO` | `NUMBER` | `PlanillaIess planilla` (FK) |
| `DLISCNCP` | `VARCHAR2(200)` | `String concepto` — texto del renglón tal como lo trae el portal |
| `DLISCNCT` | `NUMBER` | `Long conceptoTipo` — **concepto normalizado**, rubro 331 (§3.4). `null` = sin clasificar |
| `DLISVLIS` | `NUMBER(18,2)` | `Double valorIess` |
| `DLISVLCT` | `NUMBER(18,2)` | `Double valorControl` |
| `DLISDIFR` | `NUMBER(18,2)` | `Double diferencia` |

### 3.3 Rubro nuevo — tipo de planilla IESS

Del bloque reservado para este equipo (`PRBR` 330-349 / `PDTR` 1600-1699):

- `PRBR` **330** — `RHH_TIPO_PLANILLA_IESS`, con `PRBRALTR = 330` (convención del equipo).
- `PDTR` **1600-1603** — 1 Rol normal · 2 Préstamos quirografarios · 3 Préstamos hipotecarios ·
  4 Fondos de reserva.

**El `MAX` se revalida con el usuario justo antes de ejecutar**, y se anota en
`REGISTRO-RESERVAS-EQUIPOS.md` en el mismo cambio.

### 3.4 Rubro nuevo — concepto normalizado del renglón

- `PRBR` **331** — `RHH_CONCEPTO_PLANILLA_IESS`, `PRBRALTR = 331`.
- `PDTR` **1604-1608** — 1 Aporte personal · 2 Aporte patronal · 3 Contribución CCC 1 % ·
  4 Seguro salud tiempo parcial · 5 Otro.

**Por qué existe, y es la corrección de un diseño anterior que iba a fallar en silencio.** El
comprobante del portal trae texto libre; la planilla de control expone cuatro totales con nombre.
Emparejarlos **buscando palabras dentro del texto** («contiene PERSONAL» → aporte personal) parece
razonable y rompe callado: dos renglones que contengan la misma palabra reciben **los dos** el mismo
total de control, **la suma de las diferencias por renglón deja de cuadrar con la diferencia de
cabecera**, y quien concilia no tiene cómo saber que la comparación está mal hecha — está mirando
justamente esa pantalla para detectar un descuadre.

**El concepto lo elige quien captura la planilla**, de una lista de cinco. Un dato explícito en vez
de una adivinanza. El texto original del portal se conserva igual en `DLISCNCP`, porque es lo que el
usuario ve en su comprobante y necesita reconocer.

---

## 4. Ciclo

```
   El portal emite la planilla
            ↓
   [1] REGISTRADA   ← se captura comprobante, fechas, total y renglones
            ↓
   [2] CONCILIADA   ← se enfrenta contra la planilla de control del período;
                       se congelan valorControl y diferencia
            ↓
   [3] PAGADA       ← el IESS debitó; se registra la fecha real y se contabiliza
```

`[4] ANULADA` es salida desde 1 o 2. **Desde 3 no se anula: se reversa**, que deshace el asiento.

Conciliar **no bloquea** por diferencia (decisión 2 del usuario): la muestra, la graba y deja
seguir. Lo que sí hace es dejar constancia auditable de qué diferencia se aceptó y quién.

---

## 5. Endpoints — Fase 1

Base `/rest/plis`. Estilo de la casa: `@EJB` del DAO y del Service, lectura por DAO, escritura por
Service, `catch (Throwable)` → 500 con `"Error ...: " + mensaje`, que llega al cliente como JSON
`{mensaje}` (lo envuelve `MensajeErrorJsonFilter`; **no es texto plano**).

| Verbo | Ruta | Qué hace |
|---|---|---|
| `GET` | `/plis/getAll` | Estándar |
| `GET` | `/plis/getId/{id}` | Con sus renglones |
| `GET` | `/plis/porPeriodo/{idPeriodo}` | Las planillas de un período (hasta cuatro) |
| `POST` | `/plis/registrar` | Captura la planilla del portal |
| `POST` | `/plis/conciliar/{id}` | Enfrenta contra la planilla de control |
| `POST` | `/plis/anular/{id}` | Body `{motivo, idUsuario}`. Solo en estado 1 o 2 |
| `PUT` | `/plis` | Edición estándar |
| `DELETE` | `/plis/{id}` | Estándar |

### 5.1 `POST /plis/registrar`

```json
{
  "idEmpresa": 1236, "idPeriodo": 42, "tipo": 1,
  "numeroComprobante": "2026090012345",
  "fechaEmision": "2026-09-05", "fechaMaximaPago": "2026-09-15",
  "valorIess": 12345.67,
  "renglones": [ { "concepto": "APORTE PERSONAL", "conceptoTipo": 1, "valorIess": 4000.00 } ],
  "idUsuario": 12
}
```

Validaciones, en orden y cada una con su mensaje: período existe y está calculado · tipo válido
contra el rubro 330 · no existe ya una planilla activa del mismo período y tipo (el comprobante es
único por empresa y tipo) · `valorIess > 0` · si vienen renglones, su suma cuadra con `valorIess`
dentro de un centavo.

Nace en estado **1 Registrada**.

### 5.2 `POST /plis/conciliar/{id}`

Body `{"idUsuario": 12}`. Llama a `PlanillaControlIessService.generar(idPeriodo)`, toma el total que
corresponde al tipo de la planilla, lo graba en `PLISVLCT`, calcula `PLISDIFR` y pasa a estado 2.

Responde con el detalle de la comparación, renglón por renglón:

```json
{
  "idPlanilla": 7, "tipo": 1, "valorIess": 12345.67, "valorControl": 12137.45,
  "diferencia": 208.22, "hayDiferencia": true,
  "renglones": [ { "concepto": "APORTE PERSONAL", "valorIess": 4000.00, "valorControl": 3900.00, "diferencia": 100.00 } ],
  "mensaje": "Planilla conciliada con una diferencia de $208.22 a favor del IESS."
}
```

**La correspondencia renglón ↔ total de control se resuelve por `conceptoTipo` (§3.4), nunca por el
texto del renglón.** Un renglón con `conceptoTipo` nulo o `5 Otro` queda con `valorControl` en
`null`, no en cero: no tiene contraparte, que no es lo mismo que tener una contraparte de cero.

⚠️ **La planilla de control solo cubre hoy el tipo 1 (rol normal).** Para quirografarios,
hipotecarios y fondos de reserva no hay contraparte calculada: en esos tipos la conciliación graba
`valorControl = null` y responde diciendo que no hay control disponible. **No inventar un total.**
Construir esos tres controles es trabajo aparte y depende de §2.1.

---

## 6. El pago — Fase 2. DECIDIDO: por tesorería

> **Decisión del usuario, 2026-09-07:** *«Todo pago se gestiona por TSR, para luego poder realizar la
> conciliación bancaria y demás.»* Es la opción A de las que se plantearon abajo. **No re-abrir.**

### 6.0 Cómo se implementa sin tocar el archivo compartido

La opción A parecía obligar a escribir un `contabilizarPagoPlanillaIess` dentro de
`PagoProgramadoServiceImpl` — el archivo que comparten `omen-saa-2` y `omen-saa-3` — porque es lo que
hicieron la caja chica y el anticipo a empleado. **No hace falta, y se verificó:**

`contabilizarPagoOrigenExterno` tiene un **camino genérico por desglose**: si el pago trae filas de
`PGS.DPGT` (`DetallePagoOrigenExterno`), arma una línea DEBE por cada una con la cuenta contable de
su producto, cierra contra el banco, **y emite el movimiento bancario**
(`creaMovimientoPorTransferencia`, verificado el 2026-09-07). Que es exactamente lo que hace falta
para conciliar. Caja chica y anticipo tienen método propio porque su DEBE es una cuenta fija y no un
desglose; el del IESS **sí es un desglose**: una línea por concepto del comprobante.

**Consecuencia: `com.saa.ejb.cxp` no se toca.** Lo único que se agrega ahí es la constante
`RHH_PLANILLA_IESS` en `com.saa.rubros.OrigenPagoExterno`, que es aditiva. **Y por lo tanto no hace
falta coordinar con los otros árbitros para esta fase.**

⚠️ La cuenta del DEBE sale de `producto.grupoProducto.planCuenta` — del **grupo**, no del producto
(`cuentaDelProducto:3066-3080`). Así que la parametrización son grupos de producto, uno por cuenta
por pagar del IESS, y sus productos. Va en `sql/lap1-09-productos-pago-iess.sql`, que **lee las
cuentas de las plantillas contables de RRHH** (`CNT.DTPL`, líneas 10, 11, 12 y 16) en vez de
teclearlas: si el pago debitara una cuenta distinta de la que la nómina provisionó, el pasivo no se
saldaría nunca y nadie lo vería hasta un cierre.

### 6.1 `POST /rest/plis/pagar/{id}`

**Cuerpo**

```json
{ "idCuentaBancaria": 4, "fechaPago": "2026-09-12", "idUsuario": 12 }
```

La planilla debe estar en estado **2 Conciliada**. Registrar el pago desde estado 1 se rechaza: el
sentido de todo esto es no pagar sin haber cuadrado.

**Qué hace, en orden:**

1. Valida estado, cuenta bancaria y que la planilla no tenga ya un pago vivo.
2. Llama a `pagoProgramadoService.registrarPagoDeOrigenExterno` con origen `RHH_PLANILLA_IESS`,
   `idOrigen` = el `PLISCDGO`, forma de pago **débito automático** y la cuenta bancaria recibida.
   Con débito automático el pago **nace confirmado y contabiliza en el acto**, que es lo correcto:
   el IESS ya debitó, no se está ordenando un pago sino registrando un hecho.
3. Antes de que el circuito contabilice, graba el **desglose** (`PGS.DPGT`): una fila por renglón de
   la planilla, con el producto que corresponde a su `conceptoTipo` y el valor del renglón. Un
   renglón con `conceptoTipo` nulo o `5 Otro` **no tiene producto**: ver §6.2.
4. Marca la planilla en estado **3 Pagada**, graba `PLISFCPG` y enlaza `PLISASNT` con el asiento que
   devolvió el circuito.

**Respuesta 200:** `{ idPlanilla, estado, idPago, idAsiento, numeroAsiento, mensaje }`.

### 6.2 Qué hacer con un renglón sin producto

**Rechazar el pago, con el mensaje que diga qué renglón falta.** No inventar una cuenta genérica y
no omitir la línea: omitirla haría que el asiento no cuadre contra el valor del pago, y el circuito
lo rechazaría con un error de cuadre que no dice nada del renglón que lo causó. Mejor fallar
temprano y explicando.

### 6.5 El mapeo concepto → producto es 1:1 y vive en la parametrización

**Seis productos, no cuatro.** Uno por cada valor del rubro 331 que pueda pagarse, más los de los
otros tipos de planilla:

| De dónde viene la línea | Código de producto |
|---|---|
| Rol · `conceptoTipo` 1 Aporte personal | `IESS-APER` |
| Rol · `conceptoTipo` 2 Aporte patronal | `IESS-APAT` |
| Rol · `conceptoTipo` 3 Contribución CCC | `IESS-CCC` |
| Rol · `conceptoTipo` 4 Seguro tiempo parcial | `IESS-STP` |
| Planilla tipo 2 (quirografarios), línea única por el total | `IESS-PRSQ` |
| Planilla tipo 3 (hipotecarios), línea única por el total | `IESS-PRSH` |
| Planilla tipo 4 (fondos de reserva), línea única por el total | `IESS-FRES` |

⛔ **Ningún concepto se «pliega» a otro dentro del código.** Plegar CCC y seguro de tiempo parcial al
producto del aporte patronal parece inofensivo y no lo es: ver §2.2. Si dos conceptos deben terminar
en la misma cuenta, eso se resuelve **apuntando sus dos grupos a la misma cuenta** en `lap1-09` — un
`UPDATE`, visible y reversible— y no con un `switch` en Java que nadie va a releer.

**Quirografarios e hipotecarios van a productos separados** desde la decisión del usuario del
2026-09-07 (§2.1): `IESS-PRSQ` y `IESS-PRSH`, cada uno con su grupo y su cuenta. Ya no hay un
`IESS-PRST` único.

**Y `IESS-CCC` apunta a la misma cuenta que `IESS-APAT`** (§2.2), porque el CCC se provisiona bajo el
nombre IECE/SECAP con HABER a la cuenta 11. Dos grupos, una cuenta — que es la forma correcta de
expresar «van al mismo lado», en la parametrización y no en un `switch`.

### 6.3 Reverso

`POST /rest/plis/reversarPago/{id}` con `{motivo, idUsuario}`. Delega en
`pagoProgramadoService.revertirPagoConfirmado`, que anula el asiento y el movimiento bancario, y
después devuelve la planilla a estado **2 Conciliada** limpiando `PLISFCPG` y `PLISASNT`.

⚠️ A diferencia de la caja chica, `revertirPagoConfirmado` **no sabe nada de `PLIS`**: no hay ningún
`anularPlanillaIessSiAplica` del lado de `cxp`, y no hay que agregarlo. Es `rhh` quien actualiza su
propia planilla después de que el reverso vuelva.

### 6.4 Las dos opciones que se evaluaron, para no volver a discutirlas

**A. Por el circuito de pagos** — la elegida. Aparece en tesorería, genera movimiento bancario, se
reversa con lo que ya existe.

**B. Contabilizar desde `rhh` con su propia plantilla**, como el pago de la nómina. Descartada:
**no genera movimiento bancario** — verificado, el pago de nómina tampoco lo genera — así que el
débito del IESS no aparecería en la conciliación bancaria. Que es justamente lo que el usuario
necesita.

---


## 7. Frontend

**7.a — Pantalla de la planilla de control (independiente de todo lo demás, se puede hacer ya).**
Consume `GET /rest/plie/getPeriodo/{idPeriodo}`, que ya existe. Muestra líneas por afiliado, los
totales del comprobante (20,60 % + CCC 1 % + seguro de tiempo parcial) y los avisos que trae el
POJO. Va en RRHH → Procesos, al lado de «Novedades del mes».

**7.b — Pantalla de planillas del IESS.** Lista por período las hasta cuatro planillas con su tipo,
comprobante, valor, diferencia y estado; permite registrar, conciliar (mostrando la comparación
renglón por renglón) y anular. El pago se agrega cuando exista la Fase 2.

---

## 8. Lo que hay que preguntarle a la contadora antes de la Fase 2

1. ¿Quirografarios e hipotecarios van hoy a la **misma cuenta contable** o a dos? (§2.1)
2. ¿CCC y seguro de tiempo parcial tienen cuenta propia o van dentro del aporte patronal? (§2.2)
3. Fondos de reserva: ¿qué parte se paga al IESS y qué parte al empleado en el rol? De eso depende
   si la línea 16 se debita entera o en parte.
