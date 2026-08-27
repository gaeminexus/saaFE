# Regla: una fecha sin hora ("yyyy-MM-dd") NUNCA se parsea con `new Date(string)`

## La regla

> **`new Date("yyyy-MM-dd")` (sin hora) se interpreta como MEDIANOCHE UTC, no medianoche
> local.** Es el único caso especial de todo el estándar ISO 8601 en JavaScript: un string
> con hora (`"yyyy-MM-ddTHH:mm:ss"`, sin `Z`) se interpreta en hora LOCAL, pero un string de
> solo fecha se interpreta en UTC. Con Ecuador en UTC−5, leer los componentes locales de esa
> fecha (`.getDate()`, `.getMonth()`, `.getFullYear()`) da **el día anterior**.
>
> Nunca pases un string de solo fecha a `new Date(...)` ni dejes que caiga a ese
> constructor por descarte. Extrae año/mes/día con una regex y arma la fecha con
> `new Date(year, month - 1, day)` — construir con componentes numéricos es siempre local,
> nunca pasa por parseo de string.

## El caso real

`FuncionesDatosService.convertirFechaDesdeBackend()` (`shared/services/funciones-datos.service.ts`)
es la función que **todo el proyecto** usa para normalizar fechas del backend (CLAUDE.md lo exige
explícitamente). Antes del fix, su manejo de strings era:

```typescript
// Intenta un regex que EXIGE hora (HH:mm:ss)…
const regexFecha = /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?/;
const match = fechaLimpia.match(regexFecha);
if (match) { /* arma con componentes numéricos: correcto */ }

// …y si el string NO tiene hora, cae acá:
const fechaConvertida = new Date(fechaLimpia);   // ❌ "yyyy-MM-dd" se parsea como UTC
```

Un string **con** hora (`"1800-01-01T00:00:00"` o `"1800-01-01 00:00:00"`) matchea el regex y se
arma con componentes numéricos — correcto, sin UTC de por medio. Pero un string **sin** hora
(`"1800-01-01"`, un `LocalDate` puro o una columna `String` que solo guarda la fecha) no matchea
nada y cae al `new Date(fechaLimpia)` de JavaScript — ahí es donde entra el corrimiento.

### Por qué esto corrompía datos, no solo la pantalla

`Entidad.fechaNacimiento` (`ENTDFCNC`) está mapeada en el backend como `private String
fechaNacimiento;` (`com.saa.model.crd.Entidad`, saaBE) — **no** `LocalDate`. Al ser un `String`
suelto, el backend graba y devuelve exactamente lo que el frontend mandó la última vez, sin
normalizar nada. `entidad-participe-info.component.ts` guarda ese campo con
`TipoFormatoFechaBackend.SOLO_FECHA` (`"yyyy-MM-dd"`, sin hora) — así que **un solo guardado**
bastaba para que el próximo `GET` devolviera la fecha sin hora, el bug de arriba la corriera un
día al mostrarla, y el siguiente guardado grabara ya ese día corrido. Cada ciclo
`GET → mostrar → Guardar` perdía un día más — verificado en vivo contra el backend real
(entidad 6305, dev DB): `1800-01-01` → `1799-12-31` → `1799-12-30` → `1799-12-29` en tres
guardados sucesivos, sin ningún error visible en ningún punto del camino.

## La forma correcta

```typescript
// Antes del fallback de new Date(string), un branch explícito para fecha sin hora:
const regexSoloFecha = /^(\d{4})-(\d{2})-(\d{2})$/;
const matchSoloFecha = fechaLimpia.match(regexSoloFecha);
if (matchSoloFecha) {
  const [, year, month, day] = matchSoloFecha;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)); // ✅ siempre local
}
```

Con el fix, verificado con dos guardados reales consecutivos sobre la entidad 6305: la fecha se
queda estable (`1800-01-01` en el backend, `01/01/1800` en pantalla) — no vuelve a correrse.

## Alcance — a quién más podía afectar

El fix vive en la función compartida, así que **no hace falta tocar ningún llamador**: todo lo
que ya pasa por `convertirFechaDesdeBackend()` (directamente o a través de `formatoFecha()`)
queda corregido de una sola vez. Lo que sigue es el inventario de dónde este bug **ya** era un
riesgo, para que quede documentado qué pudo haberse corrompido antes del fix — no es trabajo
pendiente de este fix, es la superficie que hay que tener en cuenta si algún dato aparece
corrido un día.

### Columnas que SIEMPRE devuelven fecha sin hora (para cualquier pantalla que las lea)

Cualquier campo `LocalDate` real en el backend serializa sin hora siempre, sin importar qué
mandó el frontend — 109 clases en `com.saa.model` de saaBE tienen al menos un campo así,
repartidas aproximadamente: `rhh` ~40, `rpr` ~25, `tsr` ~13, `cxp` ~9, `cnt` ~9, `crd` ~9,
`cxc` ~4. Con el fix aplicado, mostrarlas ya no corre el día — pero antes del fix, **cualquier**
pantalla que mostrara uno de estos campos podía estar mostrando el día anterior al real, sin
que nadie lo notara (no hay ningún error, la fecha simplemente se ve mal).

### Columnas `String` con nombre de fecha — riesgo de corrupción PERSISTENTE, no solo de pantalla

Estas son las que importan más: si alguna vez se les escribió una fecha sin hora, el dato en la
base quedó corrido de verdad, no solo mal mostrado.

- **`crd.Entidad`**: `fechaNacimiento` (ENTDFCNC — confirmado y corregido en esta sesión),
  `fechaIngreso` (ENTDFCIN), `fechaModificacion` (ENTDFCMD — ya es un campo muerto, superado por
  `ultimaActualizacion`/`usuarioUltimaActualizacion`, ver `docs/patrones/` sobre el pedido 9).
  `fechaIngreso` no se verificó puntualmente pero comparte la misma columna floja.
- **`rpr.Historico{G40,G41,G43,G44,G45,G46,G47,G48,G49,G50,G51,CJBM,CCPM}`**: ~15 campos
  `fecha*` (`fechaNacimiento`, `fechaJubilacion`, `fechaResolucion`, `fechaTraspaso`, entre
  otros) mapeados como `String`. Son snapshots de informes regulatorios para la Superintendencia
  de Bancos. **No verificado**: no se confirmó si algún formulario del módulo `rpr` en el
  frontend les escribe alguna vez una fecha sin hora — si nunca lo hace, nunca se corrompieron;
  si alguna vez lo hizo, están corridos igual que `fechaNacimiento` lo estaba. Queda marcado
  como pendiente de revisión, no como confirmado.

### Dónde el frontend ya manda `SOLO_FECHA` (fecha sin hora) hacia el backend

De los usos de `TipoFormatoFechaBackend.SOLO_FECHA` en `saaFE`, se revisaron los que podían
persistir una entidad — todos los demás (`prestamo-dash`, `prestamo-consulta`, `contrato-dash`,
`contrato-consulta`, `entidad-consulta`, `reporte-mayor-analitico`,
`reporte-listado-asientos`, `reporte-balance-general`) arman rangos de fecha para **filtros de
búsqueda o parámetros de reporte** (`DatosBusqueda` con `BETWEEN`/`MAYOR_IGUAL`/`MENOR_IGUAL`,
o parámetros de un reporte generado), no guardan ninguna entidad — no exponían al riesgo de
corrupción persistente, aunque si alguna vez redibujaban una fecha sin hora sí podían mostrarla
corrida un día antes del fix.

Los dos sitios que sí persisten una entidad con `SOLO_FECHA`:

- `entidad-participe-info.component.ts:1086` → `Entidad.fechaNacimiento` — confirmado, corregido,
  verificado con guardados reales.
- `contrato-edit.component.ts:327` → `VigenciaContrato.fechaInicio`, dentro del trabajo de
  vigencias de contrato (§4.1 del plan de devengo) — hoy detrás de
  `environment.mockDevengoContratos`, no llega todavía a un backend real. Cuando el endpoint se
  publique, esta pantalla ya está protegida por el fix del helper compartido.

## Cómo detectarlo en revisión

- Una fecha que se ve "un día antes" de lo esperado, sin ningún error en consola — es la firma
  de este bug, igual que el de Signals: no lanza excepción, silenciosamente se equivoca.
- Sospecha de esto cuando un campo de fecha del backend se guarda con `SOLO_FECHA` (o su
  equivalente) y la columna del backend es `LocalDate` o un `String` suelto que no se pasa por
  ningún formato fijo — ambos devuelven fecha sin hora, tarde o temprano.
- Si agregás un nuevo caso de parseo de fecha en cualquier parte del proyecto, no reimplementes
  esto: usá `FuncionesDatosService.convertirFechaDesdeBackend()`, que ya lo maneja.
