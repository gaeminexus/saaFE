# Plan de las correcciones pendientes del motor de nómina

**Escrito el 2026-08-25, al cerrar la carga histórica.** Actualizado el mismo día: la **16** se cerró y está en producción, y nació la **23**. Quedan **16 pendientes**. La lista de qué es cada corrección vive en
[`ESTADO-RRHH.md`](ESTADO-RRHH.md), sección «LA LISTA DE CORRECCIONES DEL MOTOR». **Este documento
no la repite: la ordena.**

**Los números no se renumeran nunca.** Están citados desde el `PLAN-PASO-A-PRODUCCION`, los seis
guiones y los esperados. Los huecos 5, 8, 13 y 15 se quedan vacíos.

## Lo que cambió el 2026-08-25, y reordena la lista entera

Hasta hoy las 15 se iban a aplicar **juntas al final de la calibración**, para que los siete meses
quedaran con las mismas reglas. **Esa regla ya se cumplió y caducó**: los siete meses están cerrados
y no se recalculan.

Lo que la sustituye es otra cosa: **a partir de agosto el sistema lo opera el cliente.** Eso cambia
el criterio de prioridad, y no por poco:

| Antes | Ahora |
|---|---|
| El riesgo era que un defecto ensuciara la calibración | El riesgo es que **un defecto le explote al contador** y no sepa diagnosticarlo |
| Nosotros ejecutábamos todo, con un guion delante | **Él crea períodos, registra novedades, calcula, aprueba y contabiliza** |
| Los asientos quedaban en nulo | **Agosto genera contabilidad de verdad** |

**Un defecto que sólo nos molestaba a nosotros pasa a segundo plano. Un defecto que él puede
alcanzar desde la pantalla sube al primero**, aunque su daño sea menor, porque nosotros lo
detectábamos y él no.

## Dónde se trabajan, y con qué red

**En LOCAL.** Es donde se puede recalcular, y por eso `sql/68` **no se corre allí**: los siete meses
de `RHH.CTRL` de local son el banco de regresión. El ciclo por corrección es:

1. Se aplica la corrección.
2. Se **recalculan los siete meses** en local.
3. Se contrasta cada uno con `CONTRASTE_MES_CONTRA_ROL_REAL.sql`.
4. **Lo que se mueva, se explica antes de seguir.** Una corrección que cambia un mes que no debía
   tocar es un hallazgo, no un efecto colateral aceptable.

Los esperados de los siete meses están escritos y son firmes: cinco en cero, junio en −44,60 y julio
en +31,43 antes del ajuste. **Es la única vez que vamos a tener siete meses conocidos al céntimo
contra los que probar un cambio de motor.** No se desaprovecha.

---

## FASE 1 — Lo que el cliente puede alcanzar

**Cuatro correcciones, y las cuatro son alcanzables desde la pantalla que Steven va a usar en
agosto.** Ésta es la fase que tiene urgencia real. **La 16 ya está cerrada y desplegada.**

| # | Qué | Por qué ahora |
|---|---|---|
| **16** | `PeriodoNominaServiceImpl.saveSingle` **no valida nada**: ni que las fechas correspondan al año y mes declarados, ni que el rango sea un mes | **Él crea los períodos desde septiembre.** Y el defecto de pantalla D15 sustituye una fecha inválida por la de HOY sin marcar error. Un período del 1 de septiembre al 25 de octubre calcula sin quejarse, con los días que salgan, para todo el mundo. **Nada lo avisa** |
| **12** | La cuota de `CTDS` se aplica pero **no se marca**: `CTDSESTD` se queda PENDIENTE, `CTDSVLDS` en cero y `DSRCSLDD` no baja | **Prerrequisito de agosto** en la propia lista. Cuando los préstamos del IESS pasen de `NVNM` a `DSRC`/`CTDS`, un préstamo de doce cuotas **nunca bajaría de saldo**: se cobraría indefinidamente |
| **19** | `/rest/lqdc/calcular` y `/simular` reciben **sólo `idContrato`**, así que el backend no puede validar que el contrato pertenezca al colaborador elegido en pantalla | **La pantalla enseña un nombre y el finiquito liquida al dueño del contrato.** El registro sale internamente coherente, así que **ninguna comprobación de datos lo detecta**. Es el peor de los quince por consecuencia |
| **20** | `generarAvisoSalida` **no es idempotente**: crea una `NovedadIess` nueva sin comprobar si ya existe | **Es un doble clic.** `ejecutarSalida` exige APROBADA de entrada y no mueve el estado al terminar, así que nada impide pulsarlo dos veces, y la pantalla tampoco puede protegerlo. De los seis pasos de la salida, cinco aguantan la repetición; **éste es el único que no** |

**Orden dentro de la fase: 16 → 12 → 19 → 20.** El 16 primero porque es el más barato y el más
alcanzable —una validación en el `saveSingle`—, y porque un período mal creado envenena todo lo que
venga después.

> **El 19 merece una nota aparte.** Su arreglo **no es sólo de backend**: hay que añadir el
> colaborador al contrato de la petición, y eso toca el contrato REST y la pantalla. Es la única de
> la fase 1 que necesita a los dos agentes coordinados, así que conviene abrirla con tiempo aunque
> se cierre después que las otras tres.

---

## FASE 2 — La familia de los valores tragados

**Tres correcciones de la familia**, una vez el 16 se hizo en la fase 1. La lista ya las
agrupa, y el motivo es que **comparten forma, no sólo síntoma**: *un valor que el motor acepta sin
protestar y cuyo daño aparece meses después, lejos de su causa.*

| # | Qué | Estado |
|---|---|---|
| **17** | `generaProvision` acepta el **concepto nulo** sin decir nada y escribe `PVNM.CPNMCDGO` en nulo: la provisión queda **sin cuenta contable** | El dato se reparó con `sql/54`; **la guarda del motor no**. Y ahora pesa más: **agosto contabiliza**, así que una provisión sin cuenta ya no es un hueco cosmético |
| **18** | Se puede registrar una **novedad a quien no está en el período**. Nada comprueba que el empleado tenga contrato vigente en la ventana | Inofensivo por accidente: `calcularPeriodo` pregunta por contrato procesado, así que la fila queda huérfana y no se lee jamás. **No puede alterar ningún número** — pero sí confundir a quien la registre |
| **23** | **La aprobación de una novedad no deja autor ni momento.** `NVNMUSAP` y `NVNMFCAP` existen en el modelo y **nadie los escribe nunca**; aprobar es editar un campo más en el formulario de captura | **Abierto el 2026-08-25 por decisión de Mike, para hacerse DESPUÉS del rediseño de pantallas.** No es un hueco de pantalla sino de **control interno**: hoy nadie puede responder quién autorizó un descuento y cuándo, y quien captura aprueba en el mismo acto |

> **El 23 se hace después del rediseño de Novedades y Períodos**, por decisión del 2026-08-25. Y el
> orden funciona sin coste **porque el rediseño se encargó preparado para él**: al agente de
> frontend se le pidió que la **aprobación en lote** quede diseñada de forma que se le pueda poner
> permiso y auditoría encima **sin rehacer la pantalla**. Cuando el 23 aterrice, la pantalla sólo
> tiene que apuntar a la operación nueva.
>
> **Las tres partes del arreglo, y la segunda es la que se olvida:**
> **(a)** una operación `aprobar(ids, usuario)` que escriba los tres campos a la vez, en vez de que
> aprobar sea un efecto lateral de un `save` genérico; **(b)** que `saveSingle` **no deje cambiar
> `NVNMAPRB` por la puerta de atrás** sin mover `NVNMUSAP` y `NVNMFCAP` con él — si no, el hueco se
> reabre solo el día que alguien edite la novedad desde otro sitio; **(c)** el permiso separado de
> la captura, que es lo que convierte la bandera en una separación de funciones de verdad.

**Se hacen con el mismo patrón de guarda.** Cuando se aborden, **la guarda importa tanto
como el arreglo**: los tres se cazaron por un control externo —el guion, el contraste— y no por el
motor. Si el arreglo no deja al motor protestando, la próxima vez volverá a cazarlo un humano.

---

## FASE 3 — La estructural, que resuelve dos de una

| # | Qué | |
|---|---|---|
| **11** | **`ContratoEmpleado` no tiene historia de vigencias.** La jornada parcial se modela partiendo el sueldo —Méndez 241 sobre 30 días— cuando el IESS pide **referencial 482, 15 días, seguro TP 10,63** | **Bloqueante del exportador de la planilla del IESS.** Mientras no exista, el contrato se baila a mano entre meses, como se hizo con `sql/48` y `sql/49` |
| **14** | El motor lee **`CNTESLRB` de HOY** al recalcular un mes pasado. No falla, no avisa, y el mes queda cerrado con un sueldo que nunca se pagó | **Lo resuelve el 11.** Con vigencias, el motor lee el sueldo del período y no el de hoy. Mientras tanto rige el detector del `PLAN-PASO-A-PRODUCCION` §4 bis, **antes** de recalcular |

**El 14 no se aborda por separado.** Es un síntoma del 11, y arreglarlo aparte sería escribir dos
veces la misma cuenta —que es exactamente lo que había pasado con el 22 y el 10, y por eso se
arreglaron juntos.

**Es la fase más cara de las cinco** y la única que toca el modelo de datos. Conviene abrirla cuando
las dos primeras estén cerradas y agosto haya pasado.

---

## FASE 4 — Coherencia del recálculo

**Ninguna de las dos muerde hoy**, y las dos son la misma preocupación: qué pasa cuando un mes se
vuelve a calcular.

| # | Qué | Estado |
|---|---|---|
| **9** | La cabecera del período **se acumula en memoria** sobre los contratos procesados, no desde `NMNA`. Si alguien deja de estar activo entre dos cálculos, la cabecera baja y el detalle no, y divergen **sin ruido** | Mitigado por la corrección C —hoy no quedan huérfanas—, pero la raíz sigue. Lo detecta el cruce cabecera↔detalle de los guiones |
| **6** | `reabrirPeriodo` **no avisa** cuando hay un mes posterior ya calculado. Los acumulados del posterior quedan viejos en silencio | Es la razón por la que se contrasta **en estado 3**, antes de cerrar |

> **El 9 tiene un pariente nuevo que conviene mirar con él:** el ajuste de julio destapó que
> `cerrarPeriodo` escribe los `ACMN` desde los **totalizadores propios de `NMNA`**
> —`NMNAAPPR`, `NMNAFNRS`— y no desde `RNGL`. Es la misma familia de «dos representaciones del
> mismo número que pueden divergir». Ver la lección al final del `ESTADO`.

---

## FASE 5 — Inertes hoy

**Cinco correcciones que hoy no cambian ningún resultado.** Se hacen cuando toquen, o cuando el
cliente las alcance.

| # | Qué | Por qué no corre prisa |
|---|---|---|
| **21** | `LQDCESTD` colapsa **tres hitos en el mismo 3**: aprobada, salida ejecutada y contabilizada | Es el 20 por su otro lado, y **arreglar el 20 cubre el daño real** sin tocar la máquina de estados. Queda como deuda de diseño, no como defecto |
| **3** | Falta el **patronal del finiquito**: el rol 32 y su rama en `calculaFiniquito` | `CPNMROLM` 32 no existe en el catálogo. Necesita dato antes que código |
| **4** | `RhhTipoDescuentoRecurrente` **6 y 7 sin rol equivalente**: `rolDelDescuento` lanza excepción ante seguro privado u «otros» | ASOPREP no los usa. **Sube de prioridad el día que los use** |
| **7** | `cancelaDescuentos` escribe `fechaFin = LocalDate.now()`, no la fecha de salida del finiquito | Inofensivo hoy: a quien sale no le queda nómina. **Rompería cualquier consulta por rango de fechas** |
| **2** | La **proyección anual del IR** de quien entra a mitad de mes no descuenta que el primer mes es parcial | Hoy no cambia resultados: la rebaja lo cubre. Misma causa raíz que el 1, ya corregido |

---

## Resumen

| Fase | Correcciones | Cuándo |
|---|---|---|
| **1 · Lo que el cliente alcanza** | ~~16~~ ✅ · **12 · 19 · 20** | La **16** se cerró el 2026-08-25 y está en producción |
| **2 · Valores tragados** | 17 · 18 · **23** | A continuación. El **23 va después del rediseño de pantallas** |
| **3 · Estructural** | 11 *(y con ella la 14)* | Cuando agosto haya pasado |
| **4 · Recálculo** | 9 · 6 | Sin urgencia |
| **5 · Inertes** | 21 · 3 · 4 · 7 · 2 | Cuando toquen |

**Y una regla que se mantiene de la etapa anterior:** cada corrección se cierra recalculando los
siete meses en local y contrastándolos. **No se acumulan correcciones sin contrastar entre medias**
— si se aplican tres y algo se mueve, no habrá forma de saber cuál fue.
