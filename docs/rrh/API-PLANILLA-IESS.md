# Planillas del IESS: captura, conciliación y pago

**Equipo:** `lap-saa-1` · **2026-09-07** · Módulo `rhh` (+ `cnt` para el asiento)
**Estado:** diseño y contrato de la Fase 1 congelados. Fase 2 (pago) con una decisión abierta, en §6.
Verificado contra el código el 2026-09-07. `rhh` es **alcance compartido** con `omen-saa-2`.

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

**Hay que separarla**, y eso implica una línea de asiento nueva más su parametrización en las
plantillas contables (`CNT.PLNS` / `CNT.DTPL`). **Requiere confirmar con la contadora contra qué
cuenta del plan se registra hoy cada uno** — si hoy van a la misma cuenta contable real, separarlas
es también un cambio en el plan de cuentas, no solo en la plantilla.

⚠️ **Está sin resolver y es un prerrequisito del pago, no del registro.** La Fase 1 se puede
construir entera sin esto.

### 2.2 CCC y seguro de tiempo parcial no tienen línea propia

La planilla de control ya los calcula (`contribucionCcc`, `totalSeguroTiempoParcial`), pero
`RhhLineaAsiento` no los tiene: hoy quedan dentro del aporte patronal (11). Para conciliar el
comprobante renglón por renglón hay que saber si el plan de cuentas los separa. **Misma consulta a
la contadora que §2.1.**

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

## 6. El pago — Fase 2, con una decisión de arquitectura abierta

**No implementar sin resolver esto.** Hay dos caminos y el sistema tiene precedentes de los dos:

**A. Por el circuito de pagos (`PagoProgramado`, origen externo).** Es lo que hacen la caja chica y
el anticipo a empleado. Ventaja: el pago aparece en tesorería, genera movimiento bancario y se
reversa con lo que ya existe. Costo: los orígenes cuyo DEBE no es un producto necesitan **su propio
método de contabilización dentro de `PagoProgramadoServiceImpl`** (`contabilizarPagoCajaChica`,
`contabilizarPagoAnticipoEmpleado`), y ese archivo es territorio compartido con `omen-saa-2` y
`omen-saa-3`. **Tocarlo exige coordinar entre árbitros antes.**

**B. Contabilizar desde `rhh` con su propia plantilla.** Es lo que hace el pago de la nómina
(`ContabilizacionNominaServiceImpl`): DEBE la cuenta por pagar, HABER el banco, resolviendo las
cuentas desde `CNT.PLNS`/`DTPL`. Ventaja: no toca `cxp` en absoluto y reusa la parametrización
contable que RRHH ya tiene, donde las cuentas del IESS **ya están configuradas**. Costo: **no genera
movimiento bancario** — verificado, el pago de nómina tampoco lo genera — así que el débito no
aparecería en la conciliación bancaria.

**Recomendación: B**, con el movimiento bancario agregado explícitamente si la conciliación lo
necesita. Razón: las cuentas ya están parametrizadas del lado de RRHH, el débito automático no
necesita la bandeja de aprobación de tesorería, y evita tocar el archivo más disputado del
repositorio. Pero **la decisión es del usuario** porque afecta si el pago del IESS se ve o no en
tesorería.

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
