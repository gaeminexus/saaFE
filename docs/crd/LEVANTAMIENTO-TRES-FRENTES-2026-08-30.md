# Levantamiento — jubilados, seguros y contabilidad completa

**Fecha:** 2026-08-30 · **Módulo:** CRD · Escrito por el árbitro `saabe-4b`
**Para qué:** que estos tres frentes puedan arrancar con **sesiones nuevas** sin perder lo que ya
se sabe. Todo lo de acá está **verificado contra el código**, no contra documentación.

---

## 0. El hallazgo que cambia el plan

Los tres se pidieron como proyectos paralelos. **No lo son: están en capas.**

```
        Frente 3 — CONTABILIDAD COMPLETA
                    ▲            ▲            ▲
                    │            │            │
   ┌────────────────┘            │            └──────────────┐
   │                             │                           │
Frente 1                    Frente 2                   OTORGAMIENTO
JUBILADOS                   SEGUROS                    DE CRÉDITOS
(no existe)                 (no existe)                (NO EXISTE)
```

**No se puede contabilizar un proceso que no existe.** Hoy no hay jubilación, no hay pólizas y no
hay otorgamiento de créditos — así que "conectar contabilidad con todos los procesos de crd" es, en
buena parte, **construir primero esos procesos**.

Y hay un cuarto integrante que el usuario nombró de pasada y es el más grande de todos:
**otorgar créditos no existe en el sistema.** Confirmado: no hay entidad de solicitud, ni de
otorgamiento, ni de desembolso, ni servicio que los maneje. La cartera actual es **migrada**.

---

## 1. Frente — Administración de jubilados

### Qué hay hoy

| Pieza | Estado |
|---|---|
| `model/crd/ValorPagoPensionComplementaria.java` + service + REST | ✅ Existe. Es **una tabla de valores**, no un proceso |
| FE `jubilados/jubilar-participe` | ⚠️ **CASCARÓN.** La jubilación está *simulada* |
| FE `jubilados/proceso-pago-jubilados` | ⚠️ Solo mantiene la tabla de valores. **No genera pagos** |
| Proceso de jubilación en backend | ❌ **No existe** |
| Traslado de cuentas a pensión complementaria | ❌ **No existe** |

**`jubilar-participe.component.ts:459`** lo dice con todas las letras:

```
// TODO(pendiente-backend): reemplazar este stub por la llamada real una vez el equipo de
console.warn('[Jubilar Participe] Jubilación simulada — endpoint real pendiente...')
```

La pantalla **lee de verdad** (entidad, aportes, préstamos, estados) y **al confirmar no hace
nada**. Alguien puede usarla hoy, ver que "funciona", y no haber jubilado a nadie.

⚠️ **Y hay un defecto latente ya detectado:** esa pantalla decide la elegibilidad con el **saldo
crudo del préstamo**, que puede estar desactualizado. Hoy es inofensivo porque no persiste nada —
**se vuelve peligroso el día que se conecte el endpoint real.** Hay que corregirlo en el mismo
cambio, no después.

### Lo que hay que construir

1. **El proceso de jubilación**: qué valida, qué estados mueve, qué pasa con los préstamos vigentes
   del partícipe, y qué registro deja.
2. **El traslado de cuentas a pensión complementaria** — el usuario lo pidió explícitamente
   ("que mande sus cuentas a pensión complementaria"). Falta definir qué significa exactamente:
   ¿los aportes cambian de tipo?, ¿se cierra una cuenta y se abre otra?, ¿se conserva el histórico?
3. **El pago mensual a jubilados como proceso**, no como tabla: generar los pagos del mes,
   integrarlos con la solicitud a tesorería (que ya es el circuito estándar), y su reverso.

### ✅ Decisiones — RESUELTAS el 2026-08-30

Lo que aquí figuraba como pendiente está contestado en **§4.b (J1–J7)** y en el flujo completo que
sigue a esa sección. **No volver a preguntarlo.**

Queda una sola duda menor, que no bloquea el arranque:

- Si el **pago mensual de pensiones** pasa por la bandeja de aprobación de tesorería como el resto
  de pagos. Lo más probable que sí, por coherencia con lo decidido el 2026-08-30 para todos los
  módulos, pero conviene confirmarlo antes de construir esa parte.

---

## 2. Frente — Seguros de desgravamen e incendio por pólizas anuales

### Qué hay hoy

**En el backend, NADA.** Verificado: cero entidades, cero services, cero REST con `seguro`,
`poliza`, `desgravamen`, `incendio` o `aseguradora` en el nombre.

| Pieza | Estado |
|---|---|
| Modelo de póliza / aseguradora / vigencia | ❌ **No existe** |
| FE `forms/asignacion-seguros` | ⚠️ **CASCARÓN.** Lee préstamos, exporta CSV, **no persiste** (TODO en la línea 305) |
| Valores de seguro por cuota | ✅ Existen, en `DetallePrestamo` |

Los importes viven **por cuota** en `CRD.DTPR`: `desgravamen`, `desgravamenFirmado`,
`desgravamenDiferido`, `desgravamenOriginal`, `desgravamenPagado`, más el seguro de incendio. Los
escribe el motor de amortización.

**Entonces "se quedó a medias" es exacto, y conviene ser claro sobre dónde quedó:** existe el
*resultado* (importes por cuota, que se cobran y se contabilizan) pero **no existe el hecho
administrativo** — quién es la aseguradora, qué póliza cubre a quién, desde y hasta cuándo, con qué
tasa y qué suma asegurada. Hoy el sistema **cobra un seguro que no tiene registrado**.

### Lo que hay que construir

1. **Modelo de póliza anual**: aseguradora, número, vigencia, tipo (desgravamen / incendio), tasa,
   y su relación con los préstamos cubiertos.
2. **La renovación anual**, que es la razón del cambio: al vencer una póliza hay que reasignar la
   cartera vigente a la nueva. Es el proceso, no la tabla, lo que importa.
3. **Conectar los importes por cuota con la póliza** que los origina — hoy están huérfanos.
4. **Reembolsos a la aseguradora**: ya hay un pendiente registrado de cuando se decidió que un
   abono a capital que acorta el plazo deja cuotas con seguro de incendio ya cobrado que hay que
   reclamar. Ese pendiente **encaja en este frente**, no es un tema aparte.

### ❓ Decisiones que faltan

**Ya respondido (S1/S2, §4.b), y es una asimetría que define el modelo:**

- **Incendio:** se declara **qué préstamos entran** en la póliza, y **se renueva anualmente**. O
  sea, inscripción explícita préstamo por préstamo, con vigencia anual.
- **Desgravamen:** se hace **por toda la vida de la póliza**, sin re-inscripción anual por préstamo.

⚠️ **No son dos variantes de lo mismo: son dos modelos distintos** bajo el mismo concepto de
"seguro". El de incendio necesita una tabla de inscripción con vigencia; el de desgravamen no.
Modelarlos como una sola cosa con un campo "tipo" va a forzar a que la mitad de las columnas estén
vacías en cada fila.

**Siguen abiertas, y no bloquean el arranque:**

- ¿Un préstamo puede quedar **sin póliza** y seguir cobrando seguro? (hoy, de hecho, es lo que
  pasa). ¿Se bloquea, se avisa, se tolera?
- ¿La tasa de desgravamen sale de la **póliza** o sigue saliendo del producto/rubro como hoy?
- Los préstamos **migrados**: ¿se inscriben retroactivamente en una póliza de incendio, o arrancan
  desde la próxima renovación?

---

## 3. Frente — Contabilidad en todos los procesos de crd

### Qué está conectado hoy

Solo **cuatro** servicios generan asientos:

| Servicio | Plantilla | Estado |
|---|---|---|
| `CierreCarteraServiceImpl` | 1 apertura, 17 devengo, 33 neteo | ✅ En producción |
| `CobroPetroContableServiceImpl` | 19 transitorio, 20 reparto, 21 aplicación | ✅ En producción |
| `CobroCreditoServiceImpl` | 25 | ⚠️ **Solo el transitorio** |
| `AcuerdoCondonacionServiceImpl` | 25 (línea de gasto 70) | ✅ Construido, sin probar |

### ⛔ El agujero abierto: el asiento definitivo de los cobros

`CobroCreditoServiceImpl.procesarCobro` **no genera `CBCRASN2`**. Está documentado en el código
como pendiente de una decisión del árbitro.

**Consecuencia:** el día que se encienda el flag de contabilidad de CRD (rubro 237, hoy en 0),
**cada cobro va a dejar un asiento transitorio que nunca se cierra.** La cuenta transitoria acumula
sin techo y no se nota hasta que alguien concilia.

**Por qué no se resolvió copiando lo de Petro** — dos razones que encontró el agente de backend y
que hay que respetar al construirlo:
1. La clasificación de Petro lee `capitalPagado`, pero **el abono a capital graba en
   `saldoOtros`**: lo contabilizaría en $0, en silencio.
2. Solo reconoce aportes de tipo **jubilación (9) y cesantía (11)**; cualquier otro tipo quedaría
   fuera del asiento.

**Esto es lo primero que hay que hacer de este frente**, antes que cualquier proceso nuevo: es un
defecto de algo que ya está en producción, no una función nueva.

### ⛔ Lo que YA FUNCIONA y no contabiliza nada

Verificado el 2026-08-30 recorriendo `ejb/crd/serviceImpl` completo: **solo cuatro archivos
contienen `generarAsiento`.** Todo lo demás mueve dinero sin dejar asiento.

| Proceso en producción | Servicio | ¿Asiento? |
|---|---|---|
| Pago de cuota (efectivo/transferencia/depósito) | `ProcesoPagoPrestamoServiceImpl` | ❌ |
| Pago múltiple a varios préstamos | `ProcesoPagoPrestamoServiceImpl` | ❌ |
| Pago con aportes (débito) y **cruce de valores** | `ProcesoPagoPrestamoServiceImpl` | ❌ |
| Precancelación | `ProcesoPagoPrestamoServiceImpl` | ❌ |
| Abono a capital | `AbonoCapitalPrestamoServiceImpl` | ❌ |
| Registro de aportes del socio | `AporteServiceImpl` | ❌ |
| **Devolución de aportes** (sale dinero) | `DevolucionAporteServiceImpl` | ❌ |

**Toda la pantalla de cobros personales está en esta tabla.** Con el flag de contabilidad
encendido, hoy **no se genera un solo asiento** por ninguna de esas operaciones.

**No es un olvido, es una consecuencia del diseño del circuito de cobros:** el asiento iba a
generarse en `CobroCreditoServiceImpl` cuando esas pantallas registraran ahí. Como el **cutover no
se hizo** (ver `PLAN-CUTOVER-COBROS-POR-CONTABILIDAD.md`), siguen aplicando directo y sin contabilizar.

⚠️ **Por eso el cutover deja de ser una fase opcional y pasa a ser parte de este frente.** Es lo que
hace que la contabilidad de cobros exista, no solo lo que ordena la autorización.

### ⚠️ La reestructuración NO EXISTE como proceso

Solo hay **DTOs de simulación** (`SolicitudReestructuracion`, `ResultadoSimulacionReestructuracion`)
usados por `SimulacionPrestamoServiceImpl`. **No hay ningún método que aplique una
reestructuración** — se busca `aplicarReestructuracion`/`reestructurar(` en todo `src/main/java` y
no aparece nada.

O sea: se puede simular una reestructuración, mostrarla, imprimirla, capitalizar intereses en la
proyección… y **no se puede ejecutar**. Antes de contabilizarla hay que construirla, igual que
jubilación, seguros y otorgamiento.

### Lo que falta conectar, y de qué depende

| Proceso | ¿Existe el proceso? | ¿Contabiliza? |
|---|---|---|
| Cierre de cartera (apertura/devengo/neteo) | ✅ | ✅ en producción |
| Cobro Petro | ✅ | ✅ en producción |
| Cobros por el circuito nuevo | ✅ | ⚠️ solo transitorio, **falta `CBCRASN2`** |
| Condonación | ✅ | ✅ construido, sin probar |
| **Cobros personales** (cuota, múltiple, abono, precancelación, aportes) | ✅ **en producción** | ❌ **nada** — depende del cutover |
| **Cruce de valores / pago con aportes** | ✅ **en producción** | ❌ **nada** |
| **Devolución de aportes** | ✅ **en producción** | ❌ **nada** |
| **Reestructuración** | ❌ **solo simulador** | — |
| **Otorgar crédito** | ❌ **NO EXISTE** | — |
| Jubilación | ❌ no existe (Frente 1) | — |
| Pago a jubilados | ❌ no existe como proceso (Frente 1) | — |
| Seguros / pólizas | ❌ no existe (Frente 2) | — |

**Las tres filas del medio son las importantes**, porque son procesos que **ya corren en
producción todos los días** y no dejan asiento. Las de abajo al menos no engañan a nadie: no
existen.

### El otorgamiento de créditos es un proyecto entero

No es "una opción que falta": no hay solicitud, ni evaluación, ni aprobación, ni otorgamiento, ni
desembolso. La cartera actual entró por **migración**.

Construirlo implica, como mínimo: solicitud, evaluación de capacidad, aprobación (¿con cuántos
niveles?), generación de la tabla de amortización —el motor **sí existe** y ya fue auditado—,
desembolso hacia tesorería, y su asiento.

⚠️ **Y toca lo más delicado del sistema:** hoy el motor de amortización solo se usa en
simuladores. El día que genere cartera real, sus defectos **sí** hacen daño.

---

## 4. Orden recomendado

1. **`CBCRASN2` + el cutover, juntos y primero.** El asiento definitivo de los cobros es un defecto
   en producción, y el cutover es lo que hace que los procesos que hoy corren a diario —cobros
   personales, cruce de valores— pasen por él y **empiecen a contabilizar**. Separarlos no tiene
   sentido: uno sin el otro no cambia nada. **Antes de encender el flag de contabilidad.**
   ⚠️ Falta decidir qué pasa con **devolución de aportes**, que no entra por el circuito de cobros
   (sale dinero, no entra) y hoy tampoco contabiliza.
2. **Frente 1 (jubilados)** y **Frente 2 (seguros)** en paralelo, cada uno con su equipo: no se
   pisan (tablas distintas, pantallas distintas) y ninguno depende del otro.
3. **La contabilidad de cada uno**, dentro de su propio frente y no como proyecto aparte — el
   asiento se diseña junto con el proceso que lo origina, no después. Es la lección de los cobros.
4. **Otorgamiento de créditos**, como proyecto propio, al final o con un tercer equipo.

**Por qué no arrancar por contabilidad**, aunque sea lo que el usuario nombró como tercer punto:
porque dos tercios de lo que habría que conectar **todavía no existe**, y el tercio que sí existe
ya tiene su agujero identificado (punto 1).

---

## 4.b Decisiones del usuario del 2026-08-30

| # | Decisión |
|---|---|
| J1 | **La pantalla de jubilación es de DECISIÓN, no un botón.** El cruce y el retiro pueden consumir de **CUALQUIER** cuenta del partícipe; solo **cesantía y jubilación** pasan a pensión complementaria. El préstamo **no se cancela automáticamente**: queda como quede según lo decidido ahí. Ver el flujo completo abajo |
| J2 | **Jubilar = mover saldos entre cuentas de aporte.** Se suma el total de jubilación + cesantía y se traslada a un aporte de tipo **PENSIÓN COMPLEMENTARIA** |
| J3 | **Mecánica exacta:** aporte **NEGATIVO** en cesantía y en jubilación (si solo tiene una, en esa), con **glosa** indicando que el partícipe se jubiló por el total de esa cuenta a la fecha; y aporte **POSITIVO** con tipo PENSIÓN COMPLEMENTARIA indicando que es por jubilación. **Los tipos de aporte no cambian**: se mueven los saldos |
| J4 | El estado del partícipe pasa a **JUBILADO COMPLEMENTARIO** |
| J5 | Las **pensiones mensuales se descuentan de la pensión complementaria** |
| S1 | **Seguro de incendio:** se declara qué préstamos entran en la póliza, y **se renueva anualmente** |
| S2 | **Desgravamen:** se hace **por toda la vida de la póliza** (sin re-inscripción anual por préstamo) |
| O1 | **Otorgamiento de créditos: ENTRA AHORA** |
| R1 | **Reestructuración: ENTRA AHORA**, como proceso ejecutable y no solo simulador |
| C1 | **Devolución de aportes lleva asiento propio** |
| J6 | **PENSIÓN COMPLEMENTARIA es el tipo de aporte `TPAPCDGO = 23`** (confirmado por el usuario) |
| J7 | **Se agrega JUBILACION como tipo de movimiento de aporte** (rubro 235, alterno 7) — script `sql/81_RUBRO_MOVIMIENTO_JUBILACION.sql`. Sin él los movimientos quedarían como AJUSTE_MANUAL, indistinguibles de una corrección a mano |

### ✅ Buena noticia: la contabilidad ya está levantada

`LEVANTAMIENTO-ALIMENTACION-CONTABLE-CREDITOS.md` (del levantamiento por fotos con contabilidad,
2026-08-25) **ya tiene los asientos** de casi todo lo que hay que conectar, con las cuentas
resueltas contra `CNT.PLNN`:

| Proceso | Dónde está |
|---|---|
| Jubilación y pago de pensiones | §3.1 + plantilla alterno **29** |
| Pagos manuales | §3.4 |
| Cruce de valores | §3.5 |
| Abono a capital / precancelación parcial | §3.6 |
| Cobro en exceso y **devolución** | §3.7 + plantillas **27** y **28**, cuenta `2.3.01.15.04` |
| **Otorgamiento** | §3.8 + plantillas **9** (prendario) y **13** (hipotecario); la de quirografario **no existe y se crea con el mismo patrón** (decisión **D7**) |
| **Reestructuración / novación** | §3.8, con traslado completo entre familias (alternos 2–7, 10, 11, 14, 15) |
| Seguros | §3.2 ⑤ |

**Frente 3 no es diseño desde cero: es implementar un diseño que ya existe.** Lo que falta ahí es
sobre todo construir los procesos (frentes 1, 2, otorgamiento y reestructuración) y cerrar el
cutover.

### ✅ RESUELTO — el flujo completo de la jubilación (usuario, 2026-08-30)

Hubo una aparente contradicción con el §3.1 del levantamiento por fotos. **Quedó resuelta: las
fotos no estaban equivocadas.** El cruce contra préstamos y el retiro en efectivo **sí ocurren** —
pero son **decisiones opcionales que se toman en la pantalla**, no pasos automáticos.

**El flujo, en orden:**

1. **La pantalla muestra los totales de TODAS las cuentas del partícipe.** No solo jubilación y
   cesantía: todas. Aunque solo esas dos terminen en pensión complementaria, el operador necesita
   ver el panorama completo para decidir.
2. **Con esos valores, ahí mismo, se puede:**
   - **Cruzarlos contra préstamos** (cancelar o abonar deuda), y/o
   - **Solicitar devolución en efectivo.**
   Las dos son opcionales. Puede no hacerse ninguna.
3. **Solo lo que RESTA después de esas decisiones** se traslada: jubilación y cesantía → **pensión
   complementaria** (tipo de aporte 23), con la mecánica de J3 (negativos con glosa + positivo).
4. **Los préstamos quedan como queden** según lo decidido en el paso 2. No se cancelan por sí
   solos, pero pueden terminar cancelados si el operador lo decide.
5. El estado del partícipe pasa a **JUBILADO COMPLEMENTARIO** (J4).

**Con esto la decisión D1 sigue en pie tal cual** (§9.1 del levantamiento contable): el flujo de
las fotos vale, con las cuentas de la plantilla 29. No hay que reabrirla.

### 💡 Las dos operaciones del paso 2 YA EXISTEN — no se construyen de nuevo

Este es el hallazgo que más trabajo ahorra en este frente:

| Decisión de la pantalla | Servicio que ya existe |
|---|---|
| Cruzar aportes contra préstamos | `ProcesoPagoPrestamoServiceImpl.pagarConAportes` — es el **cruce de valores**, en producción |
| Devolución en efectivo | `DevolucionAporteServiceImpl` — frente B, **desplegado**, con su circuito de aprobación de tesorería |

⚠️ **Y por eso hay un TODO OBSOLETO que hay que borrar, no implementar.**
`jubilar-participe.component.ts:452` dice: *"no existe todavía un modelo/servicio para retiro
efectivo"*. **Era cierto cuando se escribió y dejó de serlo**: la devolución de aportes se
construyó y desplegó después. Un agente que lea ese comentario y le crea va a construir por
segunda vez algo que ya está en producción — con su propio circuito de aprobación, que sería el
segundo camino para sacar plata.

**La pantalla de jubilación ORQUESTA servicios existentes.** Lo genuinamente nuevo es el paso 3
(el traslado a pensión complementaria), el paso 5 (el estado) y el asiento.

---

## 4.c ¿Pueden trabajar en paralelo? — mapa de colisiones

Verificado el 2026-08-30 mapeando qué archivos toca cada frente.

### ⛔ La colisión dura: otorgamiento y reestructuración comparten el motor

Los dos necesitan **`CalculadoraAmortizacionServiceImpl`** — uno para generar la tabla de un
crédito nuevo, el otro para regenerarla. Hoy lo usan `PrestamoServiceImpl`,
`SimulacionPrestamoServiceImpl` y `AbonoCapitalPrestamoServiceImpl`.

**No es un archivo que se pueda repartir.** Dos equipos modificando el motor de amortización en
paralelo es la receta para que uno rompa al otro en silencio: los defectos del motor no se ven al
compilar, se ven en la tabla de un préstamo meses después.

⚠️ Y hay un agravante: **hoy el motor solo alimenta simuladores.** El día que genere cartera real,
sus defectos sí hacen daño — así que es justo el archivo donde menos conviene tener dos manos.

**→ Otorgamiento y reestructuración van en el MISMO equipo**, uno después del otro.

### El resto no se pisa

| Frente | Backend | Frontend |
|---|---|---|
| **Jubilados** | Entidades nuevas + `AporteServiceImpl`, `EntidadServiceImpl` | `forms/entidad-participe/jubilados/*` |
| **Seguros** | Entidades nuevas (póliza) + vínculo con `DetallePrestamo` | `forms/asignacion-seguros/*` |
| **Ciclo del crédito** (otorgamiento + reestructuración) | `CalculadoraAmortizacionServiceImpl`, `PrestamoServiceImpl`, `SimulacionPrestamoServiceImpl` | `forms/simulador-*` + pantallas nuevas |
| **Contabilidad + cutover** | `CobroCreditoServiceImpl` | `cobros-personales`, `cruce-de-valores`, `dialog/pagos/*` |

**En el frontend no hay solapamiento**: las pantallas de simulador y las de cobros son archivos
distintos, aunque conceptualmente vecinos.

**Jubilados llama pero no edita** `pagarConAportes` y `DevolucionAporteServiceImpl` — es
orquestación, no modificación. Y `pagarConAportes` queda **fuera** del cutover por decisión previa
(ahí no entra dinero al banco), así que ese frente no le mueve el piso.

### ⚠️ El riesgo real no son los archivos: son los catálogos

**Todos los frentes necesitan rubros nuevos (`SCP.PRBR`/`SCP.PDTR`) y plantillas (`CNT`).** Con
varios equipos, varios árbitros asignando códigos a la vez, **y los códigos se pisan sin que nadie
lo note hasta el `INSERT`**. Ya pasó una vez: se dio por libre el PDTR 1151 y estaba tomado por
las partidas en tránsito del otro equipo.

**Reglas para que no vuelva a pasar:**
1. **Rangos reservados por adelantado**, uno por frente, anotados en un solo lugar.
2. **Volver a correr el control de `MAX` justo antes de ejecutar**, nunca confiar en el rango
   escrito cuando se redactó el script.
3. **Sincronizar las secuencias** después de cada inserción con clave explícita.
4. **`cnt` sigue siendo zona compartida** también con el otro equipo (cxp/tsr): revisar
   `git status` antes de tocarlo.

### Recomendación: **cuatro equipos**

1. **Jubilados**
2. **Seguros**
3. **Ciclo del crédito** — otorgamiento primero, reestructuración después
4. **Contabilidad + cutover** — arranca por `CBCRASN2`, que es un defecto vivo

**La contabilidad de cada frente la hace su propio equipo**, dentro de su frente, con el diseño ya
levantado (§4.b). El equipo 4 se ocupa de lo que ya existe y hoy no contabiliza.

---

## 5. Lo que el usuario tiene que decidir antes de arrancar

**Bloqueantes por frente** — sin esto los equipos no pueden empezar:

- **Jubilados:** qué pasa con los préstamos vigentes al jubilar, y qué significa exactamente
  "mandar las cuentas a pensión complementaria".
- **Seguros:** si la renovación reasigna la cartera en bloque, y de dónde sale la tasa.
- **Otorgamiento:** si entra ahora o después. Es el más grande de los cuatro.

**Y una transversal:** cuántos equipos en paralelo. Con alcances disjuntos (jubilados / seguros /
otorgamiento) tres equipos funcionan; el riesgo es `cnt` y los rubros, que son zona compartida.
