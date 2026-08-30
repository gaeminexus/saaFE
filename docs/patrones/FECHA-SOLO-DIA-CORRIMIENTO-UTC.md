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
  vigencias de contrato (§4.1 del plan de devengo) — ya contra el backend real (el flag
  `environment.mockDevengoContratos` se retiró al conectar la pantalla al endpoint publicado).
  Protegida por el fix del helper compartido.

## Barrido completo por escritura — 2026-08-27

El fix de `convertirFechaDesdeBackend()` protege todo lo que **lee**. Faltaba barrer el lado que
**escribe**: código que arma una fecha a mano para mandarla al backend sin pasar por
`FuncionesDatosService.formatearFechaParaBackend()`/`formatearFechasParaBackend()`. Ahí aparecen
dos variantes del mismo bug, además de una tercera que no se había documentado:

- **`new Date().toISOString()`** (o `.slice(0,10)`/`.substring(0,10)` sobre el resultado): siempre
  UTC. Con Ecuador en UTC−5, el string completo (termina en `"Z"`) hace que el backend descarte el
  offset y el dato quede 5 horas corrido — **siempre**, no solo cerca de medianoche. El recorte a
  solo fecha (`.slice(0,10)`) hereda además el corrimiento de día ya documentado arriba.
- **Un objeto `Date` crudo puesto directo en el payload** (sin ningún `.toISOString()` explícito):
  `HttpClient` serializa el body con `JSON.stringify`, que internamente llama a
  `Date.prototype.toJSON()` — que es `.toISOString()` por dentro. Mismo bug, sin que el código lo
  deje ver a simple vista. Encontrado en `cobros-ingresar.component.ts:270`
  (`fecha: this.fecha() ?? new Date()`, `TempCobro.fecha` es `LocalDateTime`).

**Corregidos** (todos verificados contra el tipo real del campo en el backend — `LocalDate`/
`LocalDateTime` — antes de aplicar el fix; ninguno se probó en navegador, la verificación
funcional queda pendiente):

| Archivo | Campo(s) | Backend |
|---|---|---|
| `cxp/forms/negociaciones/negociaciones.component.ts` | `fechaRegistro`/`fechaModif` (vía `now`), fallback de `fechaNegociacion` | `NegociacionProveedor.fechaRegistro`/`fechaModif` `LocalDateTime` |
| `cxc/forms/gestionar/anticipo/anticipo.component.ts` | `fechaRegistro`, `fechaAnticipo`, `fechaRecepcion` | `LocalDateTime`/`LocalDate` (AnticipoCliente) |
| `cxp/forms/negociaciones/dialogs/pago-dialog/pago-dialog.component.ts` | fallback de `fechaPago`, `fechaRegistro` | `PagoNegociacion` |
| `cxp/forms/negociaciones/dialogs/adendum-dialog/adendum-dialog.component.ts` | fallback de `fechaAdendum`, `fechaRegistro` | `AdendumNegociacion` |
| `tsr/forms/cuentas-bancarias/cuentas-bancarias.component.ts` | `fechaIngreso` (creación) | `CuentaBancaria.fechaIngreso` |
| `rrh/forms/gestion/permisos-licencias/permisos-licencias-form.component.ts` | `fechaInicio`, `fechaFin`, `fechaRegistro` | `Peticiones` (RHH.PTCN) — todos `LocalDate` |
| `tsr/forms/cajas-logicas/grupos/grupos-cajas.component.ts` | `fechaInactivo`, `fechaIngreso` (alta) | `GrupoCaja` `LocalDateTime` |
| `tsr/forms/cajas-logicas/cajas-por-grupo/cajas-por-grupo.component.ts` | ídem | `CajaLogica` `LocalDateTime` |
| `tsr/forms/cajas-logicas/cajas-fisicas/cajas-fisicas.component.ts` | ídem | `CajaFisica` `LocalDateTime` |
| `tsr/forms/anticipos/anticipos-proveedores/anticipos-proveedores.component.ts` | `fechaAnticipo` | vía `AnticipoService.procesarProveedor` |
| `tsr/forms/anticipos/anticipos-clientes/anticipos-clientes.component.ts` | `fechaAnticipo` | vía `AnticipoService.procesarCliente` |
| `crd/forms/entidad-participe/jubilados/proceso-pago-jubilados/proceso-pago-jubilados.component.ts` | `fechaModificacion`, `fechaIngreso` | `ValorPagoPensionComplementaria` `LocalDateTime` |
| `tsr/forms/cobros/ingresar/cobros-ingresar.component.ts` | `fecha` (objeto `Date` crudo, no `.toISOString()` explícito) | `TempCobro.fecha` `LocalDateTime` |

**Encontrados, NO corregidos — reportados para que se verifiquen antes de tocarlos** (mismo patrón
superficial, pero con una duda concreta que hace que "corregirlo a ciegas" pueda cambiar el bug en
vez de arreglarlo):

- `cxp/forms/procesos/proposicion-pago/proposicion-pago.component.ts:397-398` — `fechaPago`,
  `fechaIngreso: new Date()`. `ProposicionPagoXCuota.fechaPago`/`.fechaIngreso` en el backend son
  `java.util.Date`, **no** `LocalDate`/`LocalDateTime` — Jackson serializa `java.util.Date` distinto
  (por defecto, timestamp epoch, salvo que el `ObjectMapper` global esté configurado con un formato
  ISO) y no se verificó esa configuración. Aplicar el mismo fix sin confirmarlo podría cambiar un
  bug por otro.
- `cxc/forms/emitir/retencionesv2/retencionesv2.component.ts:415` — `fechaReg: new Date()`, dentro
  de un objeto de detalle local (`DetalleRetencionV2Emitir`) — no se rastreó si este valor
  sobrevive hasta el guardado final o se recalcula antes, como sí pasa en otros formularios de esta
  ola (`grupos-cajas.component.ts`, por ejemplo).
- `cnt/forms/parametrizacion/plantilla-general/plantilla-general.component.ts` (`fechaCreacion`,
  `fechaInactivo` ×2, `fechaDesde`/`fechaHasta` ×2), `cnt/forms/parametrizacion/centro-arbol/centro-arbol-form.component.ts:231`
  (`fechaIngreso`), `cnt/forms/asientos-contables-dinamico/asientos-contables-dinamico.ts:808,1024`
  (`fechaIngreso`), `crd/forms/archivos-petro/carga/detalle-consulta-carga/detalle-consulta-carga.component.ts:1993`
  (`fechaAfectacion`) — mismo patrón de objeto `Date` crudo en un payload, confirmados como
  pantallas con guardado real (no mock), pero no se verificó el tipo del campo backend
  correspondiente antes de escribir esto — queda pendiente de revisión.

**Descartados — pantallas mock/placeholder, sin guardado real todavía** (0 llamadas `.subscribe()`
en el flujo de guardado, datos de muestra hardcodeados tipo "Juan Pérez"/"Banco Uno"): `tsr/forms/movimientos-bancarios/{transferencias,debitos,creditos}`,
`tsr/forms/generales/ried`, `tsr/forms/cobros/procesos/{procesos-depositos,procesos-cierres,procesos-cobros}`,
`tsr/forms/cobros/depositos/ratificacion/ratificacion-depositos`, `tsr/forms/pagos/ingresar/pagos-ingresar`,
`tsr/forms/pagos/cheques/{impresion,entrega}`, `tsr/forms/cobros/consultas/{cobros,cierres}`. No
representan riesgo de corrupción hoy — cuando se conecten a un backend real, revisar de nuevo.

**Barrido 1 (Signals que leen un FormGroup) y Barrido 2 (objetos anidados en PUT/POST)** — mismo
día, mismo formato de reporte — están documentados en el reporte de sesión, no en este archivo:
Barrido 1 encontró y corrigió `tsr/forms/titulares/titulares.component.ts:98` (`tieneCambios`);
Barrido 2 encontró y corrigió `negociaciones.component.ts` (`empresa`/`titular` sin narrow) y
descartó por verificación directa contra el backend la familia de emisión SRI (`liquidaciones`,
`facturas-ingreso`, `retenciones`, `retencionesv2`, `notas-credito`, `notas-debito`), que sí
necesita el objeto completo para generar el XML.

## Cómo detectarlo en revisión

- Una fecha que se ve "un día antes" de lo esperado, sin ningún error en consola — es la firma
  de este bug, igual que el de Signals: no lanza excepción, silenciosamente se equivoca.
- Sospecha de esto cuando un campo de fecha del backend se guarda con `SOLO_FECHA` (o su
  equivalente) y la columna del backend es `LocalDate` o un `String` suelto que no se pasa por
  ningún formato fijo — ambos devuelven fecha sin hora, tarde o temprano.
- Si agregás un nuevo caso de parseo de fecha en cualquier parte del proyecto, no reimplementes
  esto: usá `FuncionesDatosService.convertirFechaDesdeBackend()`, que ya lo maneja.
- **Del lado de escritura**: nunca armes a mano una fecha para mandarla al backend
  (`new Date().toISOString()`, `.slice(0,10)`/`.substring(0,10)` sobre eso, o un objeto `Date`
  puesto directo en un payload). Usá siempre
  `FuncionesDatosService.formatearFechaParaBackend()`/`formatearFechasParaBackend()`. Un objeto
  `Date` crudo en un payload es tan peligroso como el `.toISOString()` explícito: `HttpClient` lo
  serializa vía `Date.prototype.toJSON()`, que por dentro es `.toISOString()` — el bug no se ve en
  el código a simple vista.
