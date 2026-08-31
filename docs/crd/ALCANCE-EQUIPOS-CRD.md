# Alcance de los equipos de CRD

**Fecha:** 2026-08-30 · Escrito por el árbitro `saabe-4b` antes de repartir el trabajo.
**Cada árbitro lee su sección completa antes de escribir un solo prompt.**

> ## ⚠️ REESTRUCTURADO EL 2026-08-30 — SON **DOS** EQUIPOS, NO CUATRO
>
> **Motivo:** con cuatro equipos (12 sesiones más la del árbitro) la máquina del usuario, de 16 GB,
> se volvió inusable. Cada sesión es un proceso con su propio contexto en memoria. El techo
> práctico son **seis sesiones**: dos equipos completos.
>
> Los cuatro frentes **siguen existiendo y no cambian de contenido** — se agrupan de a dos, por
> **los archivos que tocan**, que es lo que evita que se pisen:
>
> | | Equipo | Frentes, en orden | Rangos |
> |---|---|---|---|
> | **A** | Cobros, contabilidad y jubilados | 1) cutover + `COBRO_MIXTO` · 2) contabilidad de lo existente · 3) jubilados | PRBR 250-269 · PDTR 1200-1299 |
> | **B** | Ciclo del crédito y seguros | 1) otorgamiento · 2) reestructuración · 3) seguros | PRBR 270-289 · PDTR 1300-1399 |
>
> **Por qué ese corte y no otro.** El equipo A queda con todo lo que toca el área de
> pagos / aportes / contabilidad: el cutover, los asientos de lo que ya existe, y jubilados —que
> **orquesta** el cruce de valores y la devolución de aportes, archivos del propio equipo A—. El
> equipo B queda con el área de generación de cartera: el motor de amortización, que otorgamiento y
> reestructuración comparten, y seguros, cuyos importes viven en las cuotas que ese motor escribe.
>
> Así **ningún archivo tiene dos dueños**, que es la única forma de que dos equipos en paralelo no
> se rompan en silencio.
>
> **Cada equipo trabaja sus frentes EN SERIE**, en el orden de la tabla. No arranques el segundo
> hasta cerrar el primero: el objetivo de tener dos equipos es paralelismo entre áreas, no cuatro
> cosas a medias.
>
> Las secciones de abajo siguen siendo válidas tal cual: son el detalle de cada frente. Solo cambia
> quién lo hace y cuándo.

**Leer también, en este orden:**
1. `saaBE/CLAUDE.md` — convenciones y trampas del sistema
2. `docs/logica-negocio/ESQUEMA-DE-TRABAJO.md` — cómo trabaja un equipo de tres
3. `docs/logica-negocio/REGISTRO-RESERVAS-EQUIPOS.md` — **antes de asignar cualquier código**
4. `docs/logica-negocio/crd/LEVANTAMIENTO-TRES-FRENTES-2026-08-30.md` — el estado real verificado
5. `docs/logica-negocio/crd/LEVANTAMIENTO-ALIMENTACION-CONTABLE-CREDITOS.md` — **los asientos ya
   están levantados ahí**, con las cuentas resueltas contra `CNT.PLNN`. No los inventes.

---

## Regla que aplica a los cuatro

**La contabilidad de cada proceso la construye el equipo que construye el proceso**, en el mismo
cambio. No se difiere a "un frente de contabilidad" posterior.

Es la lección más cara de esta semana: el circuito de cobros se construyó dejando el asiento
definitivo para después, y hoy hay procesos corriendo a diario en producción que no dejan ningún
asiento. **Un asiento que se difiere no se hace.**

**El flag de contabilidad de CRD (rubro 237) está en 0.** Se escribe el asiento completo igual, y
se prueba cuando se encienda.

---

## Equipo 1 — Jubilados

### Entra
- **Proceso de jubilación** con su pantalla de decisión (ver §"flujo completo" del levantamiento):
  muestra los totales de **todas** las cuentas del partícipe; permite **cruzar contra préstamos**
  y/o **pedir devolución en efectivo** desde **cualquier** cuenta; **solo el remanente de cesantía
  y jubilación** pasa a **PENSIÓN COMPLEMENTARIA** (tipo de aporte **23**).
- La mecánica del traslado: aporte **negativo** en cesantía y jubilación con **glosa**, aporte
  **positivo** en pensión complementaria, tipo de movimiento **JUBILACION** (rubro 235, alterno 7 —
  script `sql/81` ya escrito, sin correr).
- Estado del partícipe a **JUBILADO COMPLEMENTARIO**.
- **Pago mensual de pensiones como PROCESO**, no como tabla de valores: generar los pagos del mes
  e integrarlos con la solicitud a tesorería.
- El asiento: **§3.1 del levantamiento contable + plantilla alterno 29** (decisión D1: ganan las
  cuentas diferenciadas de la plantilla, no la transitoria única de la pizarra).

### NO entra
- Modificar el cruce de valores ni la devolución de aportes. **La pantalla los ORQUESTA, no los
  reimplementa.**
- El pago de la prima de nada, ni tesorería: eso es de otro módulo.

### ⛔ Dos trampas verificadas
1. **`jubilar-participe.component.ts:452` tiene un TODO OBSOLETO** que dice que no existe servicio
   para "retiro efectivo". **Era cierto cuando se escribió y dejó de serlo**: la devolución de
   aportes se construyó y desplegó después. Un agente que le crea va a construir por segunda vez
   algo que ya está en producción, con su propio circuito de aprobación. **Borrar el comentario,
   no implementarlo.**
2. La pantalla decide elegibilidad con el **saldo crudo del préstamo**, que puede estar
   desactualizado. Hoy es inofensivo porque no persiste nada; **se vuelve peligroso el día que se
   conecte el endpoint real.** Corregirlo en el mismo cambio.

### Duda abierta, no bloquea
- Si el pago mensual de pensiones pasa por la bandeja de aprobación de tesorería como el resto.

---

## Equipo 2 — Seguros por pólizas anuales

### Entra
- **Modelo de póliza**: aseguradora, número, vigencia, tipo, tasa, suma asegurada.
- **Inscripción de préstamos en la póliza de INCENDIO**, con su **renovación anual**.
- **Vincular los importes por cuota con la póliza** que los origina — hoy están huérfanos.
- **Reembolsos a la aseguradora** cuando un abono a capital acorta el plazo y quedan cuotas con
  seguro de incendio ya cobrado (pendiente registrado de una decisión anterior).
- El asiento: **§3.2 ⑤ del levantamiento contable**.

### ⚠️ La asimetría define el modelo — no la aplanes
- **Incendio:** se declara **qué préstamos entran**, y se **renueva cada año**. Necesita tabla de
  inscripción con vigencia.
- **Desgravamen:** cubre **por toda la vida de la póliza**, sin re-inscripción anual por préstamo.
  **No necesita esa tabla.**

**No son dos variantes de lo mismo bajo un campo `tipo`.** Modelarlas así deja la mitad de las
columnas vacías en cada fila y obliga a que todo lector recuerde cuáles aplican.

### NO entra
- **El pago de la prima a la aseguradora** — eso es cuentas por pagar, del otro equipo.
- **Tocar el motor de amortización.** Ya calcula bien los importes de seguro por cuota; el problema
  no es el cálculo, es que **no existe el hecho administrativo** detrás.

### Dato de partida
Hoy el sistema **cobra un seguro que no tiene registrado**: los importes viven por cuota en
`CRD.DTPR` (`desgravamen`, `desgravamenFirmado`, `desgravamenDiferido`, `desgravamenOriginal`,
`desgravamenPagado`, y el de incendio) y nadie sabe qué póliza los respalda.
La pantalla `forms/asignacion-seguros` es un **cascarón**: lee préstamos, exporta CSV y **no
persiste** (TODO en la línea 305).

### Dudas abiertas, no bloquean
- ¿Un préstamo puede quedar sin póliza y seguir cobrando seguro? (hoy es lo que pasa)
- ¿La tasa de desgravamen sale de la póliza o sigue saliendo del producto?
- ¿Los préstamos migrados se inscriben retroactivamente o desde la próxima renovación?

---

## Equipo 3 — Ciclo del crédito (otorgamiento + reestructuración)

**Los dos van en el mismo equipo porque comparten `CalculadoraAmortizacionServiceImpl`.** Dos
equipos tocando el motor de amortización en paralelo es cómo se rompe la cartera en silencio.

**Orden: otorgamiento primero, reestructuración después.**

### Entra
- **Otorgamiento**: solicitud, evaluación, aprobación, generación de la tabla de amortización,
  desembolso hacia tesorería. **Hoy no existe nada de esto** — la cartera actual es migrada.
- **Reestructuración como proceso ejecutable.** Hoy hay **solo DTOs de simulación**
  (`SolicitudReestructuracion`, `ResultadoSimulacionReestructuracion`) y **ningún método que la
  aplique**: se puede simular, imprimir y capitalizar en la proyección, y no se puede ejecutar.
- Los asientos: **§3.8 del levantamiento contable**. Entrega de préstamo con plantillas **9**
  (prendario) y **13** (hipotecario); **la de quirografario no existe y se crea con el mismo
  patrón** (decisión **D7**). Novación/reestructuración con traslado entre familias (alternos 2–7,
  10, 11, 14, 15).

### ⛔ La advertencia más importante de los cuatro equipos
**Hoy el motor de amortización solo alimenta simuladores.** El día que genere cartera real, sus
defectos **sí** hacen daño: una tabla mal generada se cobra durante años antes de que alguien la
mire. La auditoría previa del motor encontró **10 defectos**.

**Antes de generar la primera tabla real, revisar esos hallazgos.** Que un defecto no haya hecho
daño hasta hoy no significa que esté corregido.

### NO entra
- Cobros, pagos ni contabilidad de cobros: es del equipo 4.
- Cambiar cómo se cobran los préstamos existentes.

---

## Equipo 4 — Contabilidad de lo que ya existe + cutover

**Es el más urgente: hay procesos corriendo a diario en producción que no dejan ningún asiento.**

### Entra, en este orden
1. **`CBCRASN2` — el asiento definitivo de los cobros.** `CobroCreditoServiceImpl.procesarCobro`
   no lo genera. Con el flag encendido, **cada cobro dejaría un transitorio que nunca se cierra** y
   la cuenta transitoria acumularía sin techo.
2. **El cutover** (`PLAN-CUTOVER-COBROS-POR-CONTABILIDAD.md`): migrar las 6 llamadas en 5 pantallas
   para que registren en `CBCR` en vez de aplicar directo. **Es lo que hace que la contabilidad de
   cobros exista**, no solo lo que ordena la autorización.
3. **Asiento propio de la devolución de aportes** — §3.7 del levantamiento contable, plantillas
   **27** y **28**, cuenta `2.3.01.15.04`.
4. Asientos de pagos manuales (§3.4), cruce de valores (§3.5), abono a capital (§3.6).

### ⛔ Por qué no se puede copiar la clasificación de Petro
Dos razones verificadas, y las dos producen asientos incorrectos **en silencio**:
1. Lee `capitalPagado`, pero **el abono a capital graba en `saldoOtros`**: lo contabilizaría en $0.
2. Solo reconoce aportes de tipo **jubilación (9) y cesantía (11)**; cualquier otro tipo quedaría
   fuera del asiento.

### ⚠️ El cutover cambia la rutina diaria de la gente de crédito
Hoy aprietan *Pagar* y el préstamo baja en el acto. Después van a apretar *Registrar* y **no va a
pasar nada visible**. Si la pantalla no lo dice con todas las letras, **van a registrar el pago dos
veces.** El botón deja de decir "Pagar", la confirmación dice que queda pendiente de aprobación, y
respaldo y referencia pasan a ser obligatorios.

### NO entra
- `pagarConAportes` / débito automático: queda **fuera del circuito** por decisión del usuario del
  2026-08-18, y con razón de fondo — ahí **no entra dinero al banco**, es un traslado entre saldos
  del propio socio, así que la pregunta que responde contabilidad en la bandeja no aplica.
- Retirar los endpoints viejos de pago. `procesarCobro` los usa por dentro.
- Los procesos que no existen (jubilación, seguros, otorgamiento): cada equipo hace el suyo.
