# PROMPT — **FRONTEND** — Contratos con vigencias, estado de cuenta por devengo e interruptor contable

> **Eres el agente de FRONTEND**, repositorio `saaFE` (`C:\work\saaFE\v1\saaFE`). Trabajas en
> paralelo con un agente de BACKEND que toca `saaBE`. **No edites nada fuera de `saaFE`.**
>
> **Lee antes de escribir código:**
> 1. `docs/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md` (espejado en este repo) — sobre
>    todo el **contrato de API congelado, §4**.
> 2. `CLAUDE.md` de este repositorio — Angular 20 standalone, signals, servicios por entidad,
>    `ws-crd.ts`, `FuncionesDatosService`, y las trampas conocidas.
>
> **El backend todavía no publicó estos endpoints.** No los esperes: §4 del plan es la
> especificación y está congelada. Trabaja contra ella con datos simulados detrás de un flag de
> desarrollo, de forma que apagarlo apunte al backend real sin tocar los componentes.
>
> **Regla dura: no cambies el contrato de §4 por tu cuenta.** Si algo no cuadra, reporta
> `BLOQUEADA` y espera. Un cambio unilateral rompe al otro agente en silencio.
>
> Reporta al terminar **cada pantalla** con el formato de §5 del plan.

---

## Qué cambia conceptualmente — léelo, cambia cómo se diseñan las pantallas

Un aporte pasa a tener **dos fechas distintas, y las dos son correctas**:

- **Fecha de transacción** (`APRTFCTR`) — cuándo entró la plata. Es la que usa contabilidad.
- **Periodo de devengo** (`APRTPRDV`, nuevo) — a qué mes pertenece el aporte.

Antes eran lo mismo. Dejaron de serlo porque un partícipe que se pone al día paga varios meses de
una vez: todos entran en agosto (una fecha de transacción) pero cubren mayo, junio y julio (tres
periodos de devengo). Y al revés: si le descuentan de más, el excedente se anticipa al mes siguiente.

**En pantalla el agrupador siempre es el periodo de devengo; la fecha de transacción es un dato de
detalle.** No las mezcles en una misma columna ni las llames igual.

Los datos anteriores a este cambio no tienen devengo: el backend los devuelve con `periodo: null` y
`estado: "SIN PERIODO"`. **No los escondas ni los trates como error** — son la historia del partícipe.

---

## Orden de trabajo — **de lo más rápido a lo más complejo**

Sigue este orden exacto. Está pensado para **despachar entregas pequeñas cuanto antes**, no por
afinidad de pantalla.

| Orden | Qué | Sección | Esfuerzo | Independiente del backend |
|---|---|---|---|---|
| 1 | Pedido 1 — mensaje de "sin aportes / sin préstamos" | §1.1 | muy bajo | **Sí, entero** |
| 2 | Pedido 9 — mostrar última actualización del partícipe | §3.4 | muy bajo | Necesita 2 campos del DTO |
| 3 | Pedido 4 — nombre de filial en las tarjetas de generación | §1.3 | muy bajo | Necesita `nombreFilial` |
| 4 | Interruptor de contabilidad CRD | §4 | bajo | Contrato §4.3, mock |
| 5 | Pedido 5 — botón de devolución por transferencia | §1.2 | **incierto** — diagnostica primero | Sí |
| 6 | Estado de cuenta de aportes por devengo | §2 | medio-alto | Contrato §4.2, mock |
| 7 | Contrato con historial de vigencias | §3 | alto | Contrato §4.1, mock |

**El pedido 9 (§3.4) se hace en el orden 2, suelto — no esperes a construir toda la pantalla de
contratos.** Está escrito dentro de §3 porque comparte módulo, pero es independiente.

El pedido 5 va en el 5 y no antes **porque no se sabe cuánto es** hasta diagnosticarlo. Si al
diagnosticarlo resulta trivial, resuélvelo ahí mismo; si resulta ser un bug de fondo, repórtalo y
**sigue con el 6** en vez de quedarte atascado.

Los ítems 2 y 3 dependen de campos que el backend todavía no publica: **impleméntalos igual** contra
el contrato, con el mock. Se verán vacíos hasta que el backend entregue, y eso es correcto.

> **Reporta cada ítem apenas lo termines, no esperes a cerrar la sección.** El objetivo de este orden
> es que haya algo entregable temprano y seguido.

---

## §1 — Arreglos puntuales (órdenes 1, 3 y 5)

### §1.1 · Pedido 1 — "Error al cargar" cuando no hay nada que mostrar · **ORDEN 1**

**Archivo:** `src/app/modules/crd/forms/entidad-participe/participe-dash/participe-dash.component.ts`

Un partícipe sin aportes o sin préstamos muestra **"ERROR AL CARGAR"**. Debe decir **"No tiene
aportes registrados"** / **"No tiene préstamos registrados"**, con el estado vacío que ya usa el resto
de la aplicación.

> ⚠ Este componente tiene ~3.700 líneas y es donde se han acumulado bugs. **Sé conservador con el
> alcance:** toca sólo el manejo de respuesta de esas dos cargas. No refactorices el componente.

La causa está en el backend: el estilo de la casa lanza `IncomeException` cuando una búsqueda no
devuelve filas, y sale como `500`. El backend lo está corrigiendo para esos endpoints, **pero el
frontend tiene que distinguir igual los tres estados** —cargando / vacío / error real— y no
colapsarlos en uno. Si mañana otro endpoint vuelve a lanzar excepción por lista vacía, la pantalla no
debe volver a mentir. Un `500` genuino sigue mostrando error, con el `mensaje` que devuelve el
backend.

### §1.2 · Pedido 5 — El botón de devolución por transferencia no funciona · **ORDEN 5**

**Archivos:** `src/app/modules/crd/forms/devolucion-aportes/devolucion-aportes.component.{ts,html}`
y `confirmar-devolucion-dialog.component.ts`.

**Diagnostica antes de tocar.** El botón principal es `registrar()`, con
`[disabled]="!puedeRegistrar()"` (~línea 246 del HTML), y el selector de cuenta del partícipe está
condicionado por `cargandoCuentasParticipe()` y `cuentasParticipe().length` (~línea 171). La
hipótesis más probable es que `puedeRegistrar()` exige una cuenta bancaria activa
(`CRD.CNBP`) y el partícipe no la tiene, dejando el botón muerto **sin decir por qué**. Verifícalo
en el código antes de asumirlo.

**Reporta la causa que encontraste, no sólo el arreglo.** Y si el botón queda deshabilitado por una
validación, **el motivo tiene que estar visible junto al botón** — un botón muerto sin explicación es
el mismo defecto con otra cara.

> El backend está modificando `DevolucionAporteServiceImpl` en esta misma ola: una devolución que
> consume aportes anticipados ahora puede generar **varias filas negativas, una por periodo**. Si el
> resultado o el historial muestran el detalle, tienen que soportar N líneas por tipo de aporte, no
> una.

### §1.3 · Pedido 4 — Nombre de la filial en la consulta de generación Petro · **ORDEN 3**

**Archivo:**
`src/app/modules/crd/forms/archivos-petro/generar/consulta-generacion-archivo/consulta-generacion-archivo.component.*`

En las tarjetas que devuelve la consulta, muestra el **nombre** de la filial junto al periodo. El
backend agrega `nombreFilial` al DTO de `GNAP`. Hoy sólo llega el código y obliga a adivinar si la
tarjeta es de Petrocomercial o de ARCH — que es justo lo que distingue un archivo de otro.

---

## §2 — Estado de cuenta de aportes por devengo · **ORDEN 6**

**Endpoint:** §4.2 del plan. **Base:** `modules/crd/forms/contrato/aportes-dash/`, que hoy muestra el
listado plano de aportes.

Servicio: agrega el método en `modules/crd/service/aporte.service.ts` usando `WS.RS_APRT` de
`ws-crd.ts` (ya existe). No crees un servicio nuevo.

### Filtros

Rango de periodos (desde / hasta, selector de **mes-año**, no de fecha) y tipo de aporte. Por
defecto, los últimos 12 meses.

### Vista principal — una fila por periodo y tipo

| Periodo | Tipo | Esperado | Aportado | Faltante | Estado |
|---|---|---|---|---|---|

| Estado | Qué significa | Tratamiento |
|---|---|---|
| `COMPLETO` | cubrió lo esperado | neutro |
| `PARCIAL` | abonó algo pero no todo | atención — **no es mora** |
| `SIN APORTE` | no abonó nada ese mes | alerta |
| `ANTICIPADO` | aportó por un mes que aún no vence | positivo, no es un error |

`SIN PERIODO` (históricos y retiros de saldo) va en un bloque aparte al final, con su propio
encabezado. No lo mezcles con los periodos.

**No pongas un semáforo de "en mora" en esta pantalla.** Mora y deuda son cosas distintas: un mes
`PARCIAL` **no** pone al partícipe en mora — la mora sale del padrón y se calcula aparte. Confundirlas
en la interfaz llevaría al usuario a decisiones equivocadas sobre elegibilidad.

`totalFaltante` visible arriba, como **"Deuda de aportes"**.

### Detalle expandible

Al abrir un periodo, sus `movimientos`: fecha de transacción, valor, tipo de movimiento y glosa. Aquí
la fecha de transacción **sí** se muestra, etiquetada **"Fecha de cobro"**; si difiere del periodo, un
indicador discreto que lo explique (ej. *"cobrado en agosto 2026"*). Ese es exactamente el caso que
esta pantalla existe para hacer entendible.

Los movimientos negativos se muestran con su signo y su tipo (`DEVOLUCION`, `PAGO PRESTAMO`,
`REVERSO`), nunca en valor absoluto.

---

## §3 — Contrato de adhesión con historial de vigencias · **ORDEN 7** (salvo §3.4)

**Endpoints:** §4.1 del plan. **Base:** `modules/crd/forms/contrato/contrato-edit/` (detalle) y
`contrato-dash/` (lista). Servicio: `modules/crd/service/contrato.service.ts` + un
`vigencia-contrato.service.ts` nuevo; agrega `RS_VGCN` a `ws-crd.ts` siguiendo el patrón de
`RS_CNTR`.

### Cabecera (solo lectura)

Identificación, razón social, estado del contrato, y los **montos vigentes** de jubilación y cesantía.
Junto a cada monto, el porcentaje y la remuneración **cuando existan** — pueden venir `null` y es
normal: ese partícipe está en modo FIJO. **Si vienen null muestra un guion, no un cero**: un cero dice
"no aporta" y es falso.

### Historial de vigencias

Tabla, más reciente arriba: tipo de aporte, desde, hasta (`null` = **"Vigente"**, no vacío), monto,
porcentaje, remuneración, modo y observación.

Agrupa visualmente por tipo (Jubilación / Cesantía): son dos líneas de tiempo independientes y un
partícipe puede tener una sola. Distingue la fila vigente del resto — el usuario tiene que ver de un
vistazo qué se le está cobrando hoy.

### Nueva vigencia

Formulario: tipo de aporte, fecha de inicio, modo, monto, porcentaje, observación.

- **Modo CALCULADO:** se pide el porcentaje y el monto se muestra calculado
  (`remuneración × porcentaje / 100`, 2 decimales) **como campo de solo lectura**. Si el partícipe no
  tiene remuneración, este modo se deshabilita **con el motivo a la vista**.
- **Modo FIJO:** se pide el monto directamente y el porcentaje se oculta.
- Avisa antes de guardar, con las fechas concretas: *"Esto cierra la vigencia actual de {tipo} el
  {fechaInicio − 1 día} y abre una nueva desde el {fechaInicio}."*
- La fecha de inicio no puede ser anterior a la de la vigencia abierta.

Anular (`DELETE /rest/vgcn/{id}`) sólo se ofrece sobre la vigencia abierta.

> **Por qué es un historial y no un campo editable:** para saber si un mes pasado quedó cubierto hay
> que compararlo contra el monto que regía **ese** mes. Editar el monto en sitio haría que los meses
> viejos aparecieran incompletos y se los volvieran a cobrar al partícipe. Por eso el formulario no es
> un "editar" sino un "abrir vigencia nueva" — **dilo en la interfaz**.

### §3.4 · Pedido 9 — Última actualización del partícipe · **ORDEN 2 — hazlo suelto, antes que el resto de §3**

**Archivo:** `src/app/modules/crd/forms/entidad-participe/entidad-edit/entidad-edit.component.*`

Muestra la última fecha de actualización y el usuario que la hizo. Hoy no cambia nunca porque la
columna existe en la base pero **ninguna línea de código la escribía**; el backend la mapea y la sella,
y la devuelve en el DTO como `ultimaActualizacion` y `usuarioUltimaActualizacion`.

Es **una sola marca para toda la pantalla**: se actualiza al guardar cualquier sección (datos
personales, dirección, referencias, cónyuge, perfil económico…), no una por pestaña. Tras un guardado
exitoso, refréscala sin recargar. Si viene `null`, muestra "—", **no la fecha de creación**.

---

## §4 — Interruptor de contabilidad de CRD · **ORDEN 4**

**Endpoints:** §4.3 del plan. Pantalla nueva bajo `modules/crd/forms/parametrizacion/`, registrada en
`app.routes.ts` y en `modules/crd/menucreditos/`. **Restringida a administrador.**

Un interruptor con el estado actual que, al cambiar, pide **motivo obligatorio** y confirma con el
alcance real:

> *"Con la contabilidad apagada, los procesos de créditos se ejecutan y calculan normalmente pero
> **no generan asientos contables**. Es global: afecta a todos los procesos del módulo."*

Estado bien visible y el motivo del último cambio si el backend lo devuelve. Si el `GET` falla, muestra
**"desconocido"**, no "apagado": inventar un estado aquí es peor que no saberlo.

---

## Reglas de la casa (verificadas en este repositorio)

- **Angular 20, standalone components.** Signals (`signal`/`computed`) para estado local. Material vía
  `provideMaterial()`. **No introduzcas librerías nuevas.**
- **Servicios:** uno por entidad, escrito a mano, endpoints en `modules/crd/service/ws-crd.ts`. Sigue
  el patrón existente (`getAll`, `selectByCriteria`, `catchError(this.handleError)`).
  ⚠ Varios `handleError` traen `if (+error.status === 200) return of(null)`. Parece código muerto pero
  está replicado byte por byte en muchos servicios: **no lo "arregles"** aquí.
- **Fechas del backend:** llegan en tres formas distintas (arreglo `[y,m,d,h,mi,s,ns]`, string, o
  `Date`). Normaliza **siempre** con `FuncionesDatosService.convertirFechaDesdeBackend()`
  (`shared/services/funciones-datos.service.ts`). No parsees fechas a mano.
- **Fechas hacia el backend:** `LocalDate` como `yyyy-MM-dd` y `LocalDateTime` como ISO local **sin
  zona**. Nunca un `Date` crudo ni nada terminado en `Z` — el backend descarta el offset en vez de
  convertirlo y el dato queda cinco horas corrido, sin ningún error.
- **Errores:** llegan como JSON `{"mensaje": "..."}` con estado 500. Muestra `mensaje`, no el JSON.
- **Combos alimentados desde una tabla** (no de rubros): la búsqueda debe filtrar por **al menos dos
  campos** — `nombre` más un segundo identificatorio. Única excepción: tablas de exactamente `id`,
  `nombre` y `estado`.
- **Rutas** en `src/app/app.routes.ts`, con `canActivate: [authGuard]` y `canDeactivate:
  [canDeactivateGuard]` en los formularios de edición. Entrada de menú en `modules/crd/menucreditos/`.
- Español en interfaz, código y commits. Montos con 2 decimales y separador de miles.
- **No espejes archivos `.sql` a este repositorio.** Los `.md` sí.
