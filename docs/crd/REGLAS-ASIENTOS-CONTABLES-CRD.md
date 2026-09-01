# Asientos contables de CRD — qué se genera, qué contiene y con qué reglas

**Fecha:** 2026-09-01 · **Árbitro:** equipo A de `crd`
**Estado:** vigente. Verificado **leyendo el código**, no la documentación previa.
**Espejo:** `saaFE/docs/crd/REGLAS-ASIENTOS-CONTABLES-CRD.md`

---

## 0. Cómo leer este documento

`crd` genera **dieciocho asientos distintos**, repartidos en siete procesos. No hay un único
"asiento de créditos": cada proceso arma el suyo, con su propia plantilla, sus propias reglas de
cuenta y su propio reverso — o sin reverso, que es parte de lo que hay que saber.

Todo lo que sigue tiene **clase y línea**. Donde no se pudo confirmar leyendo el código, dice
**«no verificado»** en vez de completarse por analogía. Un documento de reglas contables con una
fila inventada es peor que uno con un hueco declarado.

> ⚠️ **La regla que gobierna todo:** ningún asiento se genera si el flag de contabilidad
> (rubro **237**, `ConfiguracionContabilidadService.contabilidadActiva()`) está apagado. **El
> proceso de negocio corre igual** — el cobro se registra, el cierre se calcula, la devolución se
> paga — y solo se omite la contabilidad, informándolo. Apagar el flag no detiene la operación:
> la deja sin asientos.

---

## 1. El mapa completo

| # | Proceso | Asiento | Cuándo | Dónde se guarda |
|---|---|---|---|---|
| 1 | Cobro (CBCR) | **Transitorio** | al registrar | `CBCR.CBCRASN1` |
| 2 | Cobro (CBCR) | **Reparto** | al procesar | `CBCR.CBCRASRP` |
| 3 | Cobro (CBCR) | **Definitivo** | al procesar | `CBCR.CBCRASN2` |
| 4 | Abono a capital | **Re-bandeo** | al aplicar | `EVPR.numeroAsiento` + `PGPR.asiento` |
| 5 | Precancelación | **Cruce de aportes** | al precancelar (solo caso directo) | `EVPR.numeroAsiento` |
| 6 | Condonación | **Condonación** | al aplicar el acuerdo | ⚠️ **en ningún lado** |
| 7 | Condonación | **Cruce de aportes** | al aplicar (solo 100 % aportes) | ⚠️ **en ningún lado** |
| 8 | Devolución de aportes | **Reclasificación** | al registrar | `DVAP.DVAPNMRC` |
| 9 | Cierre de cartera | **Vencidos** | al ejecutar | `CRD.ANCC` |
| 10 | Cierre de cartera | **Cambio de bandas (por vencer)** | al ejecutar | `CRD.ANCC` |
| 11 | Cierre de cartera | **Cambio de bandas (vencido)** | al ejecutar | `CRD.ANCC` |
| 12 | Cierre de cartera | **Apertura** | al ejecutar | `CRD.ANCC` |
| 13 | Cierre de cartera | **Devengo de intereses** | al ejecutar | `CRD.ANCC` |
| 14 | Cierre de cartera | **Neteo** | al ejecutar | `CRD.ANCC` |
| 15 | Petro | **Transitorio** | al confirmar recepción | `CRD.ANCP` |
| 16 | Petro | **Reparto** | al procesar el archivo | `CRD.ANCP` |
| 17 | Petro | **Aplicación** | al procesar el archivo | `CRD.ANCP` |
| 18 | Jubilación | **Traslado a pensión** | al procesar la jubilación | ⚠️ **en ningún lado** |

---

## 2. ⚠️ La trampa central: hay DOS formas de resolver las cuentas

Esto es lo que más cuesta entender del sistema, y lo que más tiempo hace perder cuando no se sabe.

**Forma A — catálogo semántico (`com.saa.rubros.CrdLineaAsiento`).** El código pide **un papel**,
no una posición:

| Constante | Valor | Cuenta |
|---|---|---|
| `APORTES_POR_COBRAR` | 1 | `1.4.05.05` |
| `PRESTAMOS_POR_COBRAR` | 2 | `1.4.05.10` |
| `APORTES_POR_APLICAR` | 3 | `2.3.02.05` |
| `PRESTAMOS_POR_APLICAR` | 4 | `2.3.02.10` |
| `INTERES_ORDINARIO_POR_COBRAR` | 10 | varias, por tipo de préstamo |
| `INTERES_MORA_POR_COBRAR` | 20 | varias |
| `APORTES_CESANTIA` / `APORTES_JUBILACION` | 50 / 51 | `2.1.01.05.01` / `2.1.02.05.01` |

Lo usan **apertura (plantilla 1)**, **aplicación (21)** y **neteo (33)**, y las tres coinciden:
para cada papel dan la misma cuenta. Verificado contra la base el 2026-08-31.

**Forma B — posicional.** El código pide **la línea número N** de la plantilla, y lo que esa línea
signifique depende de cómo esté configurada. Lo usan el **transitorio (19)**, el **reparto (20)** y
la **jubilación (29)**.

> ⚠️ **Y las dos numeraciones CHOCAN.** En la plantilla 20, el `aux1 = 2` es **aportes** y el
> `aux1 = 3` es **préstamos**. En el catálogo semántico, el 2 es *préstamos por cobrar* y el 3 es
> *aportes por aplicar*. **Usar las constantes de `CrdLineaAsiento` contra la plantilla 20 devuelve
> la cuenta equivocada, sin ningún error.** Las dos configuraciones son correctas para lo que cada
> una hace; lo peligroso es mezclarlas.

**Forma C — sin plantilla.** Tres procesos resuelven la cuenta directamente del dato: el
**re-bandeo del abono**, el **cierre de cartera** (bandas de `CRD.BNDP`) y la **devolución de
aportes** (`CRD.CTAP`, una fila por tipo de aporte y empresa).

### Las plantillas

| Alterno | Constante | Uso |
|---|---|---|
| 1 | `APERTURA_PLANILLA_MENSUAL` | apertura del cierre |
| 17 | `DEVENGO_INTERESES` | devengo del cierre |
| 19 | `COBRO_TRANSITORIO_PETRO` | transitorio de CBCR **y** de Petro |
| 20 | `REPARTO_TRANSITORIA` | reparto de CBCR **y** de Petro |
| 21 | `APLICACION_PETRO` | definitivo de CBCR **y** aplicación de Petro |
| 25 | `COBRO_INDIVIDUAL_PRESTAMO` | gasto de condonación |
| 29 | `JUBILACION` | traslado a pensión complementaria |
| 33 | `NETEO_PLANILLAS` | neteo del cierre |

**Que CBCR y Petro compartan las plantillas 19, 20 y 21 es deliberado**: son el mismo hecho
económico por dos puertas distintas. Y en el reparto comparten **el mismo método**
(`ContabilizacionIndividualCreditoService#lineasReparto`), no una copia.

---

## 3. El circuito de cobros: tres asientos, y por qué son tres

`CobroCreditoServiceImpl`. Es el circuito más importante y el que más cambió.

### ① Transitorio — al registrar (`:1320`, llamado desde `:257`)

```
DEBE   cuenta de la CuentaBancaria del cobro      cobro.getValor()
HABER  2.3.01.15.01  transitoria                  cobro.getValor()
```

El dinero entró al banco, pero **todavía no se sabe a qué se aplica** — eso lo decide contabilidad
al aprobar. La transitoria es el estacionamiento.

### ② Reparto — al procesar (`:1471`, llamado desde `:877`)

```
DEBE   2.3.01.15.01  transitoria                  cobro.getValor()
HABER  1.4.05.05  aportes    /  1.4.05.10  préstamos
```

**Este es el asiento que hace que la transitoria cierre en cero.** El ① la carga, el ② la descarga,
por el mismo monto. Sin él, la transitoria acumula sin techo — que es exactamente lo que venía
pasando: al 2026-09-01 arrastra **−$2.973.328,49 sobre 521 líneas** de la época en que el circuito
tenía solo dos asientos.

> El monto es **`cobro.getValor()`**: solo lo depositado, nunca lo que se pagó consumiendo aportes.
> La transitoria cierra exactamente lo que abrió.

### ③ Definitivo — al procesar (`:1544`, llamado desde `:879`)

```
DEBE   2.3.02.05 / 2.3.02.10   (por aplicar)      totales de aportes y préstamos
HABER  desglose real: capital por banda, interés, mora, seguros, aportes por tipo
```

**El debe se corrigió el 2026-08-31.** Antes debitaba **otra vez** la transitoria, que el ② ya
había cerrado, dejándola en `−cobro.getValor()` en vez de en cero. Ahora usa las mismas cuentas
"por aplicar" que apertura, resueltas por el catálogo semántico.

> **Los totales del debe salen de la misma función que el haber del ②**
> (`totalesAportesPrestamos`). No son dos cálculos que deberían coincidir: es el mismo, usado dos
> veces. No pueden derivar.

**Los tres llevan en la observación** cédula, nombre del partícipe e `idAsoprep` del préstamo
(`observacionEnriquecida`, `:1440`). Es lo que permite rastrear un asiento hasta la persona.

### Reverso

`anularCobro` (`:417`) anula los tres **en orden 3 → 2 → 1**. Con una restricción importante: un
cobro **procesado** de tipo PAGO_CUOTA, ABONO_CAPITAL, PRECANCELACIÓN o CONDONACIÓN **no se anula
desde acá** — hay que reversar la operación sobre el préstamo (`anularOperacion`). Los tipos
multilínea (COBRO_MIXTO, PAGO_MULTIPLE, REGISTRO_APORTE) sí reversan los tres completos.

---

## 4. Abono a capital — el asiento que NO lleva plata

`ContabilidadPrestamoServiceImpl.contabilizarAbonoCapital` (`:216`).

Un abono genera **dos** hechos contables, y confundirlos es el error clásico:

1. **La plata que sale de la cartera** → ya la contabiliza el **asiento ③ del cobro**, repartida
   entre las bandas de las cuotas que el abono efectivamente canceló.
2. **El saldo que queda vivo se reclasifica entre bandas** → **este** asiento.

```
Diferencias NETAS por banda entre la distribución vieja y la nueva.
Suma cero. Es puro débito y crédito entre cuentas de banda del mismo préstamo.
```

> ⚠️ **Este asiento no toca Banco ni cuentas por cobrar, y no debe hacerlo nunca.** Si alguien "lo
> completa" agregando el movimiento de caja, la plata del abono queda contabilizada dos veces. El
> invariante de suma cero es lo que lo detecta: si no neta cero, el cálculo está mal.

Si ninguna banda cambió lo suficiente, **no genera asiento y devuelve `null`** — es un abono chico
que no cruzó ningún límite de banda, y es correcto.

**La puerta directa está cerrada.** `PrestamoRest.abonarCapital` responde **409**: un abono por ahí
generaría este asiento **sin** el ③ que lo origina — media contabilidad, cuadrada y falsa.

---

## 5. Precancelación — dos circuitos, un solo asiento posible

`ProcesoPagoPrestamoServiceImpl.precancelar` (`:994`) es único; lo que cambia es si viene con
depósito.

| | Cómo llega | Quién contabiliza |
|---|---|---|
| **Con depósito** (por CBCR) | `idCobroCredito` seteado (`CobroCreditoServiceImpl:725`) | **el asiento ③ del cobro**; `contabilizarPrecancelacion` devuelve `null` |
| **100 % aportes** (directo) | sin `idCobroCredito` | **`contabilizarPrecancelacion`** genera el cruce de aportes |

**El capital se reparte por bandas**, corregido el 2026-09-01: cada cuota cancelada aporta **su
propio capital a su propia banda**, sin prorrateo — en una precancelación se cancelan todas, así
que no hay nada que repartir proporcionalmente. Antes, el capital **por vencer** caía entero en la
banda de una sola cuota ancla.

> Precancelación **no historiza** a `CRD.HDTP` (a diferencia del abono): las cuotas futuras quedan
> vivas en `CRD.DTPR` con estado **`CANCELADA_ANTICIPADA (7)`**. Ese estado es la fuente de la
> clasificación por bandas.

---

## 6. Condonación — dos asientos, y ninguno se puede reversar

`AcuerdoCondonacionServiceImpl`.

**① Condonación** (`:643`)

```
DEBE   gasto de condonación (plantilla 25, aux1 = 70)
HABER  capital condonado por banda (más antigua primero) + interés condonado
```

**② Cruce de aportes** (`:862`) — **solo** si el acuerdo es 100 % aportes. Con depósito parcial,
esa mitad la genera el asiento ③ del cobro.

> 🔴 **HUECO CONFIRMADO: ninguno de los dos guarda su número de asiento.** Los dos métodos son
> `private void`. `contabilizarReverso` solo anula si `evento.getNumeroAsiento() != null`, y
> `aplicarAcuerdo` nunca lo setea. **Al reversar una condonación, el préstamo y las cuotas se
> revierten bien, pero los asientos quedan huérfanos, sin anular y sin que nada avise.**

---

## 7. Devolución de aportes — dos asientos, dos módulos

`DevolucionAporteServiceImpl.generarAsientoReclasificacion` (`:1062`).

```
DEBE   cuentaPasivo        (lo que el fondo le debe al socio)
HABER  cuentaLiquidacion   (nace la obligación de pagarle)
```

Las cuentas salen de **`CRD.CTAP`**, una fila por tipo de aporte y empresa. **No hay plantilla.**

**El asiento del pago** (débito de liquidación contra Banco) lo genera **CXP**, no CRD, y se guarda
en una columna distinta: `DVAPNMAS` frente a `DVAPNMRC`. Dos asientos, dos columnas, dos módulos.
El reverso de CRD anula **solo** el suyo; el otro lo reversa CXP.

> ⚠️ **Regla de todo o nada, y falla en silencio.** Si **ningún** tipo de aporte de la devolución
> tiene producto de pago parametrizado, la devolución **se registra, se paga y no genera ninguna
> contabilidad** — sin error, sin aviso en pantalla, solo una línea en el log del servidor. Si
> **algunos sí y otros no**, se rechaza (un desglose parcial daría un asiento descuadrado).
>
> **Pasó de verdad el 2026-09-01.** `APORTE PERSONALES` (tipo 1) sigue sin cuenta ni producto:
> **hasta que se defina, no devolver ese tipo.**

Desde el 2026-09-01 la orden de pago a CXP se pide **antes** del asiento, y el control de "ya hay un
pago vigente" corre **al principio**, antes de generar nada.

---

## 8. Cierre de cartera — seis asientos, no uno

`CierreCarteraServiceImpl`. **No es un asiento combinado: son seis asientos reales e
independientes**, cada uno con su fila en `CRD.ANCC`.

| # | Sub-proceso | Qué mueve | Cuentas |
|---|---|---|---|
| ① | **Vencidos** (`:599`) | capital no pagado: por vencer → vencido | `CRD.BNDP` |
| ② | **Cambio de bandas, por vencer** (`:668`) | reclasificación del mes que **abre** | `CRD.BNDP` |
| ①.1 | **Cambio de bandas, vencido** | reclasificación del mes que **cierra** | `CRD.BNDP` |
| ③ | **Apertura** (`:783`) | genera las cuentas por cobrar del mes que abre | catálogo semántico, plantilla 1 |
| ④ | **Devengo de intereses** (`:860`) | interés ordinario y mora de las cuotas **del mes que abre** | catálogo semántico, plantilla 17 |
| ⑥ | **Neteo** (`:919`) | reversa lo **no cobrado** del mes que cierra | catálogo semántico, plantilla 33 |

### La regla de fechas, que se equivocó una vez y se corrigió

**Los cinco primeros van con la fecha del período que se ABRE** (primer día del mes nuevo).
**Solo el neteo va con el último día del mes que se CIERRA.**

### Cómo se calculan los aportes esperados

Con **el mismo algoritmo que genera el archivo Petro real**
(`GeneracionArchivoPetroService#calcularAportesEsperados`), sumado sobre **todas las filiales**. Se
descartaron dos fuentes anteriores antes de llegar a esta.

### Reverso

`reversar(idCorrida)` (`:268`) anula **todos** los asientos de la corrida. El snapshot no se borra:
queda auditable.

---

## 9. Petro — tres asientos, y solo el primero se puede reversar

`CobroPetroContableServiceImpl`.

| # | Asiento | Cuándo | Plantilla |
|---|---|---|---|
| ① | **Transitorio** (`:275`) | contabilidad confirma que el dinero entró | 19 |
| ② | **Reparto** (`:517`) | al procesar el archivo | 20 |
| ③ | **Aplicación** (`:622`) | al procesar el archivo | 21 |

Es el mismo patrón de tres pasos que CBCR, por la puerta masiva. El reparto usa **el mismo método**
que el cobro individual.

> 🔴 **HUECO CONFIRMADO: no existe reverso del paso 2.** El único método de reverso es
> `reversarRecepcion` (`:430`), que anula solo el transitorio — y **rechaza** si la carga ya está
> procesada, diciendo *"reverse primero el procesamiento del archivo"*. **Esa función no existe.**
> Una vez que una carga llega a PROCESADO, sus asientos de reparto y aplicación son permanentes:
> habría que anularlos a mano en contabilidad, por fuera de este flujo y sin actualizar `CRD.ANCP`.

> ⚠️ Las cargas **anteriores al 2026-08-28** no generan el asiento de aplicación: la trazabilidad
> (`CRARCDGO`) se agregó ese día y no se hizo backfill. **No es un error.**

> ⚠️ Un aporte de Petro que **no** sea cesantía (11) ni jubilación (9) **no se contabiliza**: solo
> imprime una advertencia. *No verificado* si es una decisión consciente o un hueco.

---

## 10. Jubilación — el asiento que nadie mencionó

`AporteServiceImpl.generarAsientoJubilacion` (`:568`), desde `procesarJubilacion` (`:429`).

```
DEBE   2.1.01.05.01  cesantía   +   2.1.02.05.01  jubilación
HABER  2.3.01.10.03  pensiones por pagar
```

Traslada el saldo del socio a pensión complementaria cuando pasa a `JUBILADO_COMPLEMENTARIO`.
Plantilla 29, posicional.

> ⚠️ **Nunca usa los aux1 3 y 4** de esa plantilla: esos son liquidación de cesantía y jubilación, y
> los usan **otros** procesos (`pagarConAportes`, devolución de aportes). Usarlos acá duplicaría la
> plata.

> 🔴 **HUECO CONFIRMADO: el número de asiento no se persiste en ninguna entidad.** Solo viaja en la
> respuesta del REST. **No hay reverso posible**, ni forma de recuperar el número de una jubilación
> pasada salvo buscándolo en `CNT.ASNT` por fecha y descripción.

---

## 11. Reglas transversales

**El gate.** Todos consultan `contabilidadActiva()` (rubro 237). Apagado, el proceso de negocio
corre igual y solo se omite la contabilidad. En el cierre se evalúa **por sub-proceso**.

**El cuadre.** Todos validan débitos contra créditos antes de grabar y **revientan con
`IncomeException` si no cuadra** — nunca generan un asiento a medias. Es deliberado: un asiento
descuadrado no avisa, y se descubre semanas después.

**Los montos.** Regla única para el capital de un pago: **`saldoOtros` si es mayor que cero, si no
`capitalPagado`**. El abono a capital y el capital futuro de una precancelación graban en
`saldoOtros` con `capitalPagado = 0`; un pago normal es al revés. **Leer solo `capitalPagado` los
contabilizaría en $0, sin ningún error.**

**Un asiento vacío no es un error.** Varios devuelven `null` legítimamente cuando no hay nada que
contabilizar (un abono que no cruza bandas, una condonación sin líneas). Distinguir eso de un fallo
es importante al diagnosticar.

---

## 12. Huecos conocidos — lo que falta, con nombre

| # | Hueco | Impacto |
|---|---|---|
| 1 | **Condonación no guarda su número de asiento** | al reversar, los asientos quedan huérfanos sin aviso |
| 2 | **Petro no tiene reverso del paso 2** | reparto y aplicación son permanentes una vez procesada la carga |
| 3 | **Jubilación no persiste su asiento** | sin reverso posible ni forma de recuperarlo |
| 4 | **`contabilizarPagoCuota` está vacío** | un `pagarCuota` disparado **directo por REST** no genera **ningún** asiento, ni con el flag encendido. Lo que pasa por CBCR sí queda contabilizado. *No verificado* si ese endpoint directo se usa en producción |
| 5 | **El neteo de aportes nunca sale** | se calcula como esperado − registrado con piso en cero, y como Petro cobra atrasos, lo registrado supera casi siempre a lo esperado de un mes. La línea de aportes queda en $0 |
| 6 | **`APORTE PERSONALES` sin cuenta ni producto** | su devolución se procesa **sin contabilidad y sin avisar** |
| 7 | **Prelación del reparto Petro** | escrita y **desconectada a propósito**: no se puede validar bien del lado del servidor sin duplicar la lógica que decide qué cuota paga qué. La pantalla sí la fuerza |
| 8 | **La transitoria arrastra −$2.973.328,49** | histórico de cuando el circuito tenía dos asientos. El asiento de reparto lo frena de acá en adelante, pero **el acumulado necesita un ajuste puntual** |

### Decisiones pendientes del usuario

- **La cuenta contable de `APORTE PERSONALES`** (hueco 6).
- **El criterio del neteo de aportes** (hueco 5): la propuesta es calcular **por partícipe y sumar
  solo los faltantes**, en vez de restar agregados — así los que pagaron atrasos dejan de tapar a
  los que no pagaron nada.
- **Qué hacer con el acumulado de la transitoria** (hueco 8).
- **Si el asiento del pago de una devolución lo genera CRD o CXP** — quedó abierto el 2026-08-31.

---

## 13. Qué cambió el 2026-08-31 / 2026-09-01

- El circuito de cobros pasó de **dos asientos a tres**: nació el de reparto, que cierra la
  transitoria.
- El **debe del asiento definitivo** dejó de ser la transitoria y pasó a las cuentas de pasivo.
- El **abono a capital** dejó de mandar todo el capital a una sola banda, y ganó su asiento de
  re-bandeo.
- La **precancelación** empezó a repartir también el capital **por vencer** entre sus bandas.
- El **cobro de solo aportes** pasa por el circuito completo y admite **varias líneas** (cesantía y
  jubilación en un mismo cobro).
- La **devolución de aportes** invirtió el orden (CXP antes que el asiento) y ganó su control al
  principio.
- Los asientos de cobro, condonación y devolución llevan **cédula, nombre e `idAsoprep`** en la
  observación.
- Se cerró `PrestamoRest.abonarCapital`.
- El **timer de mora de las 02:00 quedó apagado** a pedido del usuario, hasta nuevo aviso. Los
  endpoints manuales (`POST /rest/prst/calcularMora`) siguen activos.
