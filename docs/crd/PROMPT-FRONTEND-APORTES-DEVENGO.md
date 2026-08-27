# PROMPT — **FRONTEND** — Contratos con vigencias, estado de cuenta por devengo e interruptor contable

> **Eres el agente de FRONTEND** del repositorio `saaFE`. Trabajas en paralelo con un agente de
> BACKEND que toca `saaBE`. **No edites nada fuera de `saaFE`.**
>
> **Documento obligatorio antes de escribir código:**
> `docs/logica-negocio/crd/PLAN-APORTES-DEVENGO-CONTRATOS.md` (espejado en este repo) — decisiones
> cerradas y, sobre todo, el **contrato de API congelado (§4)**.
>
> **El backend todavía no ha publicado estos endpoints.** No los esperes: el contrato de §4 está
> congelado y es la especificación. Trabaja contra él con datos simulados detrás de un flag de
> desarrollo, de modo que apagarlo apunte al backend real sin tocar los componentes.
>
> **Regla dura: no cambies el contrato de §4 por tu cuenta.** Si algo no te cuadra, reporta
> `BLOQUEADA` y espera. Un cambio unilateral rompe al otro agente en silencio.
>
> Reporta al terminar **cada pantalla** con el formato de §5 del plan.

---

## Qué cambia conceptualmente (léelo, cambia cómo se diseñan las pantallas)

Un aporte pasa a tener **dos fechas distintas y las dos son correctas**:

- **Fecha de transacción** — cuándo entró la plata. Es la que ve contabilidad.
- **Periodo de devengo** — a qué mes pertenece el aporte.

Antes eran la misma. Dejaron de serlo porque un partícipe que se pone al día paga varios meses de
una vez: todos entran en agosto (una sola fecha de transacción) pero cubren mayo, junio y julio (tres
periodos de devengo). Y al revés: si le descuentan de más, el excedente se anticipa al mes siguiente.

**En pantalla, el agrupador siempre es el periodo de devengo; la fecha de transacción es un dato de
detalle.** No las mezcles en la misma columna ni las llames igual.

Los datos anteriores a este cambio no tienen devengo. El backend los devuelve con `periodo: null` y
`estado: "SIN PERIODO"`. **No los escondas ni los trates como error**: son la historia del partícipe.

---

## PANTALLA 1 — Contrato de adhesión con historial de vigencias

**Endpoints:** §4.1 del plan. **Ruta sugerida:** dentro de la ficha del partícipe, pestaña "Contrato".

### Cabecera (solo lectura, viene de `GET /rest/cntr/porEntidad/{idEntidad}`)

Identificación, razón social, estado del contrato, y los **montos vigentes** de jubilación y cesantía.
Junto a cada monto, el porcentaje y la remuneración **cuando existan** — pueden venir `null` y eso es
normal: significa que ese partícipe está en modo FIJO. **Si vienen null, muestra un guion, no un
cero**: un cero dice "no aporta" y es falso.

### Historial de vigencias (`GET /rest/vgcn/porContrato/{idContrato}`)

Tabla, más reciente arriba, con: tipo de aporte, desde, hasta (`null` = **"Vigente"**, no vacío),
monto, porcentaje, remuneración, modo y observación.

Agrupa visualmente por tipo de aporte (Jubilación / Cesantía): son dos líneas de tiempo
independientes y un partícipe puede tener una sola.

Distingue la fila vigente del resto (fondo o etiqueta). El usuario tiene que ver de un vistazo qué se
le está cobrando hoy.

### Nueva vigencia (`POST /rest/vgcn`)

Formulario con: tipo de aporte, fecha de inicio, modo, monto, porcentaje, observación.

- **Modo CALCULADO:** se pide el porcentaje, y el monto se muestra calculado
  (`remuneración × porcentaje / 100`, a 2 decimales) **como campo de solo lectura**. Si el partícipe
  no tiene remuneración, este modo se deshabilita con el motivo a la vista.
- **Modo FIJO:** se pide el monto directamente y el porcentaje se oculta.
- Avisa antes de guardar, con las fechas concretas: *"Esto cierra la vigencia actual de {tipo} el
  {fechaInicio − 1 día} y abre una nueva desde el {fechaInicio}."*
- La fecha de inicio no puede ser anterior a la fecha de inicio de la vigencia abierta.

Anular (`DELETE /rest/vgcn/{id}`) sólo se ofrece sobre la vigencia abierta.

### Añadido: última actualización del partícipe (pedido 9)

En la pantalla de **actualización de datos del partícipe**, muestra la última fecha de actualización y
el usuario que la hizo. Hoy no aparece porque **el dato no existía en la base**; el backend lo agrega
al DTO como `ultimaActualizacion` y `usuarioUltimaActualizacion`.

Es **una sola marca para toda la pantalla**: se actualiza al guardar cualquiera de las secciones
(datos personales, dirección, referencias, cónyuge, perfil económico…), no una por pestaña. Tras un
guardado exitoso, refréscala sin recargar la pantalla. Si viene `null` (partícipe que nadie ha
modificado desde el cambio), muestra "—", no la fecha de creación.

> **Por qué es un historial y no un campo editable:** para saber si un mes pasado quedó cubierto hay
> que compararlo contra el monto que regía **ese** mes. Editar un monto en sitio haría que los meses
> viejos aparecieran incompletos y se los volvieran a cobrar al partícipe. Esto explica por qué el
> formulario no es un "editar" sino un "abrir vigencia nueva" — dilo en la interfaz.

---

## PANTALLA 2 — Estado de cuenta de aportes por devengo

**Endpoint:** §4.2 del plan. Reemplaza al listado plano de aportes por partícipe.

### Filtros

Rango de periodos (desde / hasta, selector de **mes-año**, no de fecha) y tipo de aporte.
Por defecto: los últimos 12 meses.

### Vista principal — una fila por periodo y tipo

| Periodo | Tipo | Esperado | Aportado | Faltante | Estado |
|---|---|---|---|---|---|

Los cuatro estados que devuelve el backend, cada uno con su color y su significado a la vista:

| Estado | Qué significa | Tratamiento |
|---|---|---|
| `COMPLETO` | cubrió lo esperado | neutro |
| `PARCIAL` | abonó algo pero no todo | atención — **no es mora** |
| `SIN APORTE` | no abonó nada ese mes | alerta |
| `ANTICIPADO` | aportó por un mes que aún no vence | positivo, no es un error |

`SIN PERIODO` (los históricos y los retiros de saldo) va en un bloque aparte al final, con su propio
encabezado. No lo mezcles con los periodos.

**No pongas un semáforo de "en mora" en esta pantalla.** Mora y deuda son cosas distintas: un mes
`PARCIAL` **no** pone al partícipe en mora — la mora sale del padrón y se calcula aparte. Confundirlas
en la interfaz haría que el usuario tome decisiones equivocadas sobre elegibilidad.

Total de `totalFaltante` visible arriba, como "Deuda de aportes".

### Detalle expandible

Al abrir un periodo, sus `movimientos`: fecha de transacción, valor, tipo de movimiento y glosa.
Aquí la fecha de transacción **sí** se muestra, etiquetada como **"Fecha de cobro"** — y si difiere del
periodo, un indicador discreto que lo explique (ej. *"cobrado en agosto 2026"*). Ese es exactamente el
caso que la pantalla existe para hacer entendible.

Los movimientos de valor negativo se muestran con su signo y su tipo (`DEVOLUCION`, `PAGO PRESTAMO`,
`REVERSO`), nunca en valor absoluto.

---

---

## PANTALLA 2b — Arreglos puntuales que van con estas dos

Tres pedidos sueltos que caen en pantallas que ya estás tocando. **No abras otras pantallas** fuera
de estas.

### Pedido 1 — "Error al cargar" cuando no hay nada que mostrar

En `participe-dash`, un partícipe sin aportes o sin préstamos muestra **"ERROR AL CARGAR"**. Debe
decir **"No tiene aportes registrados"** / **"No tiene préstamos registrados"**, con el mismo estado
vacío que usa el resto de la aplicación.

El backend está corrigiendo los endpoints de esa pantalla para devolver `200` con lista vacía. Pero
**el frontend tiene que distinguir igual los tres casos** —lista vacía, error real, y cargando— y no
tratarlos como uno solo: si mañana otro endpoint vuelve a lanzar excepción por lista vacía, la
pantalla no debe volver a mentir. Un `500` genuino sí sigue mostrando error, con el `mensaje` que
devuelve el backend.

### Pedido 5 — El botón de devolución de aportes por transferencia no funciona

En la pantalla de **devolución de aportes**, la opción de pago por transferencia tiene el botón
inoperante. Diagnostica antes de tocar: mira si el `click` no está enlazado, si una validación lo
mantiene deshabilitado sin decir por qué, o si la llamada sale y falla. **Reporta la causa que
encontraste**, no sólo el arreglo.

Si el botón está deshabilitado por una validación, el motivo tiene que estar **visible junto al
botón** — un botón muerto sin explicación es el mismo defecto con otra cara.

> El backend está modificando `DevolucionAporteServiceImpl` en esta misma ola: una devolución que
> consume un aporte anticipado ahora puede generar **varias filas negativas, una por periodo**. Si la
> pantalla muestra el detalle del resultado, tiene que soportar N líneas por tipo de aporte, no una.

### Pedido 4 — Nombre de la filial en la consulta de generación de archivos Petro

En las tarjetas que devuelve la consulta, muestra el **nombre** de la filial junto al periodo. El
backend agrega `nombreFilial` al DTO. Hoy sólo llega el código y obliga a adivinar si la tarjeta es
de Petrocomercial o de ARCH, que es justamente lo que distingue un archivo de otro.

---

## PANTALLA 3 — Interruptor de contabilidad de CRD

**Endpoints:** §4.3 del plan. **Ubicación:** configuración/administración, **restringido a
administrador**.

Un interruptor con estado actual, que al cambiar pide **motivo obligatorio** y confirma con el alcance
real:

> *"Con la contabilidad apagada, los procesos de créditos se ejecutan y calculan normalmente pero
> **no generan asientos contables**. Es global: afecta a todos los procesos del módulo."*

Estado bien visible (encendido/apagado) y el motivo del último cambio si el backend lo devuelve.
Si `GET` falla, muestra **"desconocido"**, no "apagado": inventar un estado aquí es peor que no saberlo.

---

## Reglas de la casa

- Español en la interfaz, en el código y en los commits.
- Sigue los componentes, el estado y el estilo que ya usa `saaFE`; **no introduzcas librerías nuevas**.
- **Fechas hacia el backend:** `LocalDate` como `yyyy-MM-dd` y `LocalDateTime` como ISO local **sin
  zona**. Nunca un `Date` de JavaScript crudo ni nada terminado en `Z` — el backend descarta el offset
  en vez de convertirlo y el dato se graba corrido cinco horas, sin ningún error.
- El backend puede devolver fechas como **arreglo** (`[2026,8,10]`) además de ISO: maneja las dos.
- Los errores llegan como JSON `{"mensaje": "..."}` con estado 500. Muestra `mensaje`, no el JSON.
- Campos numéricos con 2 decimales y separador de miles.
- **No espejes archivos `.sql` a este repositorio.** Los documentos `.md` sí.
