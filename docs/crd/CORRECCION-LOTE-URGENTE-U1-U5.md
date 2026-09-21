# Lote urgente U1–U5 — diseño de la corrección

**Equipo:** `omen-saa-1` (CRD · EQUIPO B) · **Árbitro:** `omen-saa-1-arb` · **Fecha:** 2026-09-21
**Orden del usuario:** «corrige los lotes de U1 a U5».
**Origen del lote:** `ESTADO-EQUIPO-OMEN-1.md`, bloque «2026-09-15 — Lote urgente», levantado el
2026-09-15 y **nunca despachado**. Los cinco se reverificaron contra el código el 2026-09-21 y
**los cinco siguen vivos**.

> ⚠️ Las rutas de archivo del tablero del 15-09 están **abreviadas** (`forms/pago-cuotas/…`,
> `src/app/services/…`). Esas rutas **no existen**: en `saaFE` todo cuelga de
> `src/app/modules/{mod}/…`. Verificado con `git log --all`: nunca existieron, no hubo ninguna
> reorganización. **Acá van las rutas reales.**

| # | Repo | Módulo | Severidad |
|---|---|---|---|
| U1 | `saaBE` | `crd` | ⛔ plata que no sale al proveedor, sin error |
| U2 | `saaBE` | `crd` | ⛔ descuadre contable silencioso |
| U3 | `saaFE` | `crd` | pantalla que miente al usuario |
| U4 | `saaFE` | `crd` | pantalla que miente al usuario |
| U5 | `saaFE` | `cnt` | pantalla que miente, sobre las plantillas de asientos |

---

## U1 — El seguro de jubilados no se le paga al proveedor si la corrida falla a medias

**Archivo:** `src/main/java/com/saa/ejb/crd/serviceImpl/PagoPensionComplementariaServiceImpl.java`
**Método:** `generarSeguroDelMes` — bucle en `:1165-1205`, cierre en `:1205-1240`.

### La secuencia del fallo, medida (no deducida)

`generarSeguroIndividual:1007-1012` devuelve **`null`** cuando ya existe el `PagoPensionComplementaria`
del período con `valorSeguro != null` («ya tiene el seguro fijado — se omite»). El bucle sólo acumula
`totalSeguroGeneral += valorSeguro` **cuando no es null**, así que un seguro preexistente **no suma
nada al total**.

1. **Intento 1.** El bucle fija N seguros. `generarSeguroIndividual` corre `REQUIRES_NEW`: esas N
   filas quedan **commiteadas**. Después `generarOrdenPagoProveedorSeguro` lanza (CXP caído, cuenta
   del proveedor sin resolver, lo que sea) → la excepción propaga y `corrida.setEstadoSeguro(1L)`
   **no llega a correr**. CRJB queda sin cerrar. Hasta acá, bien.
2. **Intento 2.** Los N jubilados devuelven `null` → `yaGenerados = N`, **`totalSeguroGeneral = 0`**.
   `generarOrdenPagoProveedorSeguro:2505-2509` ve `totalSeguroPeriodo <= TOLERANCIA` y hace
   **`return null` sin lanzar**. Entonces sí corre el cierre: `estadoSeguro = 1`, `totalSeguro = 0`,
   `idOrdenPagoSeguro = null`, y **graba**.

⇒ **El CRJB se cierra en el REINTENTO, no en el intento fallido.** El período queda marcado como
corrido, el proveedor no cobra nunca, y no hay forma de volver a correrlo. Sin un solo error.

### Corrección

En la rama `else` del bucle (la que hoy sólo hace `yaGenerados++`), **leer el seguro ya fijado y
sumarlo al total**:

- `pagoPensionDaoService.selectByEntidadYPeriodo(jubilado.getCodigo(), anio.longValue(), mes.longValue())`
  — es la misma consulta que usa `generarSeguroIndividual:1006` para decidir que ya estaba fijado.
- Sumar su `getValorSeguro()` a `totalSeguroGeneral`.

⛔ **Si esa lectura devuelve `null`, o el valor es `null`, o revienta: LANZAR `IncomeException` y
abortar la generación.** No sumar 0 y seguir. Un total corto le paga **de menos** al proveedor, de
forma silenciosa e irreversible; abortar deja el CRJB sin cerrar y el operador reintenta. El mensaje
tiene que nombrar la entidad.

Además, en el cierre:

- `corrida.setCantidadJubiladosSeguro(...)` hoy guarda sólo `generados`. Pasar a
  **`generados + yaGenerados`**, que es la cantidad que respalda el total de la orden.
- El mensaje del resumen debe seguir distinguiendo `generados` de `yaGenerados`, pero el **total**
  que informa es el de la orden (los dos juntos).

### Lo que esta corrección NO arregla (documentarlo, no intentarlo)

Si el intento 1 **sí alcanzó a crear la orden** y falló después, el intento 2 encuentra la orden
vigente por `selectVigentesByOrigen(CRD_SEGURO_JUBILADOS, anio*100+mes)` y **devuelve la existente
con su total viejo** — no la corrige. Eso es deliberado: tesorería pudo haberla aprobado ya, y
modificar una orden aprobada es peor que el problema. `generarOrdenPagoProveedorSeguro:2511-2519`
ya es idempotente por `(origen, período)`; esa idempotencia se conserva **sin tocar**.

---

## U2 — «Anular» en Historial de operaciones descuadra un cobro CBCR

**Archivo:** `src/main/java/com/saa/ws/rest/crd/PrestamoRest.java` — método `anularOperacion`,
`:1222-1264`.

### Qué pasa hoy

`/rest/prst/anularOperacion` valida cuerpo, `idEvento`, `usuario` y `motivo` (`:1229-1244`) y llama
derecho al service. **No tiene ninguna guarda** sobre el origen del evento. Si el evento vino de un
cobro (`CRD.DCBC` con `EVPRCDGO` apuntándole):

- anula el `PagoPrestamo` y recalcula cuotas;
- `ContabilidadPrestamoServiceImpl:744-749` (`contabilizarReverso`) **no hace nada**, porque el
  asiento vive en el CBCR, no en el evento;
- el cobro queda **PROCESADO**, con sus asientos y su distribución de bandas vivos;
- y después `/cbcr/{id}/reversar` queda bloqueado con `ERR_EVENTO_YA_ANULADO`.

Sin error para el usuario.

### Corrección — va en el REST, NO en el service

Guarda nueva **después** de la validación del motivo (`:1244`) y **antes** del `try` (`:1246`):
leer los `DetalleCobroCredito` enlazados al evento; si hay alguno, **rechazar** con
`respuestaFallo(Response.Status.CONFLICT.getStatusCode(), ETAPA_VALIDACION, <mensaje>, null)`
(verificar la firma real de `respuestaFallo` en el archivo y respetarla).

El mensaje tiene que **nombrar el cobro** (`linea.getCobroCredito().getCodigo()`) y **remitir al
camino correcto**: `POST /rest/cbcr/{id}/reversar`. Ejemplo del contenido, no del texto literal:

> «El evento 1234 pertenece al cobro 57: anúlelo desde el reverso del cobro
> (`POST /rest/cbcr/57/reversar`), no desde el historial de operaciones del préstamo.»

⛔ **NO poner la guarda en `ProcesoPagoPrestamoServiceImpl.anularOperacion`.** Medido: su otro
llamador es `CobroCreditoServiceImpl:577-590` (`reversarLineasProcesadas`), que lo invoca **con el
enlace `EVPRCDGO` todavía puesto**. Una guarda en el service rompe el reverso de cobros, que es
justamente el camino al que esta corrección manda al usuario.

### Query que falta (hay que crearla)

`CRD.DCBC` sólo tiene las dos NamedQuery genéricas. Hace falta:

- `src/main/java/com/saa/ejb/crd/dao/DetalleCobroCreditoDaoService.java`
  → `List<DetalleCobroCredito> selectByEvento(Long idEvento) throws Throwable;` con su JavaDoc.
- `src/main/java/com/saa/ejb/crd/daoImpl/DetalleCobroCreditoDaoServiceImpl.java`
  → **copiar literal el patrón de `selectByPrestamo` (`:52-62`)**, cambiando `d.prestamo.codigo`
  por `d.eventoPrestamo.codigo`. Misma línea de traza `System.out.println`, mismo `em.createQuery`.
  El campo existe: `DetalleCobroCredito:79-80`, `@JoinColumn(name = "EVPRCDGO")`.

### Contrato que cambia

`POST /rest/prst/anularOperacion` **empieza a devolver 409** en un caso donde antes devolvía 200 y
descuadraba. El FE **no necesita cambios**: el diálogo `historial-operaciones-dialog` ya muestra
`mensajeDeRespuesta`. Es el único cambio de contrato del lote.

---

## U3 — «Pago Cuota» simula el pago

**Archivo:** `src/app/modules/crd/forms/pago-cuotas/pago-cuotas.component.ts`
`:606` muestra `Pago de $X registrado exitosamente…` y `:610` es el `// TODO: Enviar datos al backend`.
Nunca hay HTTP, y las cuentas son mock.

**Corrección:** retirar la pantalla del acceso del usuario.

- Menú: `src/app/modules/crd/menucreditos/menucreditos.component.ts:260-265` (entrada `Pago Cuota`).
- Ruta: `src/app/app.routes.ts:1127` (`path: 'pago-cuotas'`).

**Conservar los archivos del componente**: no se borra nada bajo `forms/pago-cuotas/`.
**No tocar `Permisos.CRD_PAGO_CUOTA`**: el permiso puede existir en la base y lo administra el frente
de seguridad de otro equipo.

El cobro real de una cuota es **Cobros Personales**, que sí pega al backend.

---

## U4 — «Asignación de Seguros» simula

**Archivo:** `src/app/modules/crd/forms/asignacion-seguros/asignacion-seguros.component.ts:306`
→ `Seguro de … asignado correctamente (simulado)`. **No hay backend de pólizas**: verificado en
`crd/ESTADO-EQUIPO-SEGUROS.md` §1.1 — no existe entidad, ni DAO, ni service, ni un solo `@Path`.

**Corrección:** igual que U3.

- Menú: `menucreditos.component.ts:190-195`.
- Ruta: `src/app/app.routes.ts:1306-1310`.
- Conservar archivos. **No tocar `Permisos.CRD_ASIGNACION_DE_SEGUROS`.**

---

## U5 — «Plantilla general» (cnt) finge guardar

**Archivo:** `src/app/modules/cnt/forms/parametrizacion/plantilla-general/plantilla-general.component.ts`
(+ su `.html`).

⚠️ **`cnt` es un módulo compartido** (`REGISTRO-RESERVAS-EQUIPOS.md` §4). El aviso al equipo que
también lo toca lo manda el árbitro, con autorización del usuario.

**Por qué importa más que U3/U4:** las plantillas contables gobiernan los **asientos automáticos** de
todo el sistema. Una plantilla que el usuario cree que guardó y no está, o una fila fantasma en la
grilla, se paga en asientos mal armados.

### Puntos a corregir

| Línea | Qué hace hoy | Qué debe hacer |
|---|---|---|
| `:205-212` | Si el backend no responde: `mostrarBannerDemo = true` + «Usando datos de ejemplo para demostración» | Decir que **no se pudieron cargar** las plantillas. Quitar `mostrarBannerDemo`, el banner del `.html` y `cerrarBanner():1008-1010` |
| `:710-718` | Validación local falla → muestra error **y llama `agregarDetalleLocal`** | Sólo el error. Quitar la llamada |
| `:725-729` | Respuesta vacía del servidor → `agregarDetalleLocal` | Sólo el aviso. Quitar la llamada |
| `:731-765` | Error del POST → 4 ramas («guardado localmente», «para demostración») + `agregarDetalleLocal` | Mostrar el **error real**, y que el mensaje diga explícitamente **que NO se guardó**. Quitar `agregarDetalleLocal`. `analizarTipoError` se puede conservar sólo para redactar mejor el error |
| `:1258-1271` | Error del update → actualiza en memoria, «Detalle actualizado (modo demo)» | Mostrar el error. Quitar el fallback |
| `:892` `agregarDetalleLocal` | queda sin llamadores tras lo anterior | **Eliminar el método**, para que nadie lo reviva |
| `:957-967` `duplicarDetalle` | copia en memoria con `codigo: Date.now()` | **Retirar el botón y el método.** Un `codigo` inventado con el reloj puede colisionar con un PK real. Si se quiere duplicar de verdad, es un frente aparte |
| `:972-1004` `crearAsientoDesdeTemplate` | escribe `localStorage` y navega a `/menucontabilidad/asientos`, que **no existe** | **Retirar el botón y el método** |

### ⚠️ Hallazgo: este defecto ya estaba documentado por otro equipo

`crearAsientoDesdeTemplate:998-1000` trae un comentario del frente de **seguridad de `laptop1`** que
dice que la ruta no existe y apunta a `docs/seguridad/ITEM7-MAPEO-BOTONES-PERMISOS.md`. Al retirar el
botón, **ese mapeo queda desactualizado**.

⇒ El ejecutor **reporta** esto y **no toca** `docs/seguridad/`. El aviso lo manda el árbitro.

---

## Reglas para los dos ejecutores

- **Ninguno corre `git add`, `git commit` ni `git push`.** Entregan la lista exacta de archivos
  tocados, con ruta completa desde la raíz del repo. Commitea el árbitro.
- Reportar **por ítem**, sin esperar a terminar todo: `ÍTEM Un — COMPLETADO | BLOQUEADO`.
- Si algo no coincide con lo que dice este documento — un número de línea corrido, un método que no
  está donde dice — **reportarlo y seguir con el resto**; no adivinar. Las líneas son del 2026-09-21.
- El BE verifica con `mvn -q compile` (Maven 3.9.8 + JDK 21 **sí están** en esta máquina).
  El FE verifica con `ng build --configuration development`.
- Ninguno toca `cxp`, `cxc`, `pagos`, `tsr`, `rhh`, `sri`, ni `docs/seguridad/`.
