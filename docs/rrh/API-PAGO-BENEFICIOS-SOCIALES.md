# Contrato de API — Pago de beneficios sociales (décimos acumulados)

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-01 · **Estado:** congelado antes de implementar.
**Diseño de referencia:** `docs/logica-negocio/rhh/PLAN-PAGO-BENEFICIOS-Y-SALIDA-POR-TESORERIA.md`

> **Espejo en el frontend:** `saaFE/docs/rrh/API-PAGO-BENEFICIOS-SOCIALES.md`.
> ⚠️ La carpeta de RRHH en `saaFE` es **`docs/rrh/`**, no `docs/rhh/` — existe una `docs/rhh/`
> vacía y dejar el contrato ahí lo pone donde nadie lo busca.

---

## 0. Antes de leer nada más

⚠️ **CORREGIDO el 2026-09-07.** Hasta hoy este párrafo decía *«estos endpoints todavía no
existen»*. **Era falso, y costó caro:** al abrir el frente del pago de décimos durante el mes se
diseñó desde cero algo que ya estaba construido. Verificado contra el código:
`OrdenBeneficioSocialServiceImpl` son **550 líneas implementadas**, con `generar`,
`enviarATesoreria`, `confirmarPago` y `anular`, y el REST los expone todos.

**Lo que sigue siendo cierto es que NADIE los consume:** cero apariciones de `odbs` o `lqbs` en todo
`saaFE/src`. El ciclo está entero y **nunca se estrenó**, que es distinto de no existir — y es la
razón por la que el documento pudo quedar mintiendo tanto tiempo sin que nadie lo notara.

⛔ **Antes de construir pantalla sobre esto, probar el ciclo de punta a punta.**

Si al implementar algo no cierra, se corrige **este archivo primero** y después el código.

**Application path:** `/SaaBE/rest/...`. No `/api/...`, que aparece en docs viejos y ya no existe.

**Serialización — la trampa que más caro sale:** el proveedor es **Jackson**, no JSON-B.
`LocalDate` viaja como `yyyy-MM-dd` y `LocalDateTime` como ISO **local, sin zona**.
⛔ **Nunca mandar un `Date` de JavaScript crudo ni una cadena terminada en `Z`**: Jackson
**descarta el offset en vez de convertirlo**, así que `2026-12-24T13:30:00.000Z` se graba como
`13:30` y queda cinco horas adelantado, sin ningún error.

**Trampa del `PUT` — vale para toda entidad del sistema:** `EntityDaoImpl.save()` hace `em.merge()`
con el objeto tal como llegó del JSON, sin releer la fila y sin saltar nulos. Como ningún campo
persistido del modelo es primitivo, **una clave ausente en el JSON se graba como `null`**, FKs
incluidas. **Regla para el frontend: `GET` de la entidad completa, aplicar encima sólo los campos
que el formulario edita, y mandar el objeto entero.** Nunca armar un payload «sólo con lo que
cambió». ⛔ Y **no "arreglar" `EntityDaoImpl`**: hereda de él todo el proyecto.

---

## 1. Recurso `odbs` — orden de pago de beneficio social

Cabecera consolidada que agrupa las liquidaciones (`RHH.LQBS`) de un tipo de beneficio y un año, y
las paga con **un solo** pago en tesorería.

### 1.1 Endpoints estándar

Los seis de la casa, sobre `RHH.ODBS`:

```
GET    /rest/odbs/getAll
GET    /rest/odbs/getId/{id}
POST   /rest/odbs                      (saveSingle)
PUT    /rest/odbs                      (saveSingle)
DELETE /rest/odbs/{id}
POST   /rest/odbs/selectByCriteria     (body: List<DatosBusqueda>)
```

### 1.2 `POST /rest/odbs/generar` — armar la orden

Agrupa las liquidaciones sueltas y crea la cabecera.

**Body**
```json
{
  "idEmpresa": 1,
  "tipoBeneficio": 1,
  "anio": 2026,
  "region": null,
  "usuario": "jperez"
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `idEmpresa` | number | sí | |
| `tipoBeneficio` | number | sí | `1` décimo tercero · `2` décimo cuarto · `3` fondos de reserva |
| `anio` | number | sí | |
| `region` | number \| null | **sólo si `tipoBeneficio = 2`** | Región del décimo cuarto. Para los otros tipos debe ir `null` |
| `usuario` | string | sí | |

**200 — orden creada**
```json
{
  "exito": true,
  "idOrden": 12,
  "numero": "ODBS-2026-0001",
  "tipoBeneficio": 1,
  "tipoBeneficioTexto": "DECIMO TERCERO",
  "anio": 2026,
  "region": null,
  "total": 18450.75,
  "numeroEmpleados": 37,
  "estado": 1,
  "estadoTexto": "GENERADA",
  "mensaje": "Orden generada con 37 empleados."
}
```

**200 con `exito: false`** — no hay liquidaciones sueltas para ese (empresa, tipo, año, región).
⚠️ **No alcanza con mirar el status HTTP.** Es el estilo de la casa y ya causó confusión en el
frente R; el frontend debe leer `exito` siempre.

```json
{ "exito": false, "mensaje": "No hay liquidaciones pendientes de pago para DECIMO TERCERO 2026." }
```

**409 Conflict** — ya existe una orden viva (`GENERADA` o `ENVIADA_A_TESORERIA`) para esa
combinación. Se devuelve el id de la existente para que la pantalla pueda ofrecer abrirla.
```json
{ "exito": false, "idOrdenExistente": 9, "mensaje": "Ya existe la orden 9 en estado GENERADA." }
```

**500** — ⚠️ **NO llega como texto plano, aunque el REST lo escriba así.**

El servidor arma `Response.status(500).entity("Error al generar la orden: " + e.getMessage())`, que
es el estilo de la casa. Pero existe un **filtro global** —`com.saa.ws.rest.MensajeErrorJsonFilter`,
un `@Provider ContainerResponseFilter`— que intercepta **toda** respuesta con status **≥ 400** cuya
entidad sea un `String` y cuyo tipo declarado sea JSON, y la envuelve:

```json
{ "mensaje": "Error al generar la orden: ..." }
```

Sólo la deja pasar si el texto ya empieza con `{` o `[` (para no esconder el mensaje un nivel más
abajo). O sea que **las respuestas de error de este contrato llegan siempre como objeto JSON**, no
como cadena suelta.

**No afecta a los 409 de este documento**, que ya devuelven un `Map` (`{exito, mensaje}`) y por lo
tanto el filtro ni los toca. Afecta sólo a los 500.

*Corregido el 2026-09-01: este párrafo decía «texto plano, estilo de la casa» y era falso. El
frontend no se rompió porque `shared/utils/mensaje-error.util` ya prueba `cuerpo?.mensaje` entre sus
candidatos — pero el documento inducía al error. Avisado por el árbitro de `lap-saa-1`, que perdió
una lectura de contrato con esto, y verificado leyendo el filtro.*

### 1.3 `GET /rest/odbs/detalle/{id}` — las liquidaciones de una orden

Lo que la pantalla muestra al abrir la orden.

**200**
```json
{
  "idOrden": 12,
  "numero": "ODBS-2026-0001",
  "tipoBeneficio": 1,
  "anio": 2026,
  "total": 18450.75,
  "numeroEmpleados": 37,
  "estado": 2,
  "estadoTexto": "ENVIADA_A_TESORERIA",
  "idPagoProgramado": 451,
  "estadoPago": 2,
  "estadoPagoTexto": "POR_APROBAR",
  "fechaPago": null,
  "idAsiento": null,
  "detalle": [
    {
      "idLiquidacion": 501,
      "idEmpleado": 88,
      "identificacion": "1712345678",
      "nombreEmpleado": "PEREZ JUAN",
      "fechaInicio": "2025-12-01",
      "fechaFin": "2026-11-30",
      "baseCalculo": 6000.00,
      "dias": 360,
      "valor": 500.00,
      "valorPagado": 0.00,
      "estado": 1
    }
  ]
}
```

**200 con `exito: false`** si el id no existe.

### 1.3bis `GET /rest/odbs/listar` — la bandeja de órdenes

**Agregado el 2026-09-01**, corrigiendo un hueco que detectó el frontend al revisar este contrato.

**Por qué no alcanzan los endpoints estándar.** `getAll`/`selectByCriteria` devuelven la entidad
cruda, cuya fila sólo trae `ODBSESTD` (1-4). Con eso **la lista no distingue dos situaciones muy
distintas que comparten el estado `2 ENVIADA_A_TESORERIA`**: la orden que todavía espera aprobación
de tesorería, y la que tesorería **ya pagó** pero RRHH aún no contabilizó — donde la provisión sigue
viva. Hoy esa diferencia sólo se ve abriendo la orden (`estadoPago` del §1.3), y una bandeja que no
la muestra induce al usuario a creer que no queda nada por hacer.

Es una **proyección**, no la entidad — ver `docs/estandar/ESTANDAR-PROYECCIONES-EN-LISTADOS.md` y
`com.saa.model.cxp.PagoPorAprobar`, que es el precedente exacto.

**Query params:** `idEmpresa` (obligatorio) · `anio` · `tipoBeneficio` · `estado` (todos opcionales).

**200** — arreglo de filas:
```json
[
  {
    "idOrden": 12,
    "numero": "ODBS-2026-0001",
    "tipoBeneficio": 1,
    "tipoBeneficioTexto": "DECIMO TERCERO",
    "anio": 2026,
    "region": null,
    "total": 18450.75,
    "numeroEmpleados": 37,
    "fechaEmision": "2026-12-20",
    "fechaPago": null,
    "estado": 2,
    "estadoTexto": "ENVIADA_A_TESORERIA",
    "idPagoProgramado": 451,
    "estadoPago": 4,
    "estadoPagoTexto": "CONFIRMADO",
    "idAsiento": null
  }
]
```

⚠️ **`estadoPago` e `idAsiento` son los dos campos que hacen útil esta proyección.** Sin ellos la
fila no puede pintar el estado intermedio del §3.2. `estadoPago` es `null` mientras la orden no se
haya enviado a tesorería.

**`numeroEmpleados` es columna persistida** (`ODBSNMEM`), no un calculado de la respuesta de
`generar`: se escribe al armar la orden y no cambia después. Se puede confiar en ella en la lista.

### 1.4 `POST /rest/odbs/enviarATesoreria/{id}` — registrar el pago en la bandeja

**Body**
```json
{ "idUsuario": 4, "observacion": "Décimo tercero acumulado 2026" }
```

Registra **un** `PagoProgramado` de origen `RHH_BENEFICIO_SOCIAL` por el total de la orden, con
`idCuentaBancariaOrigen = null` y **sin desglose contable**, así que:

- El pago **nace `POR_APROBAR`** y aparece en la bandeja de tesorería.
- Tesorería asigna cuenta y forma de pago con `POST /pgtr/aprobar` (endpoint existente, sin cambios).
- ⚠️ **El pago no genera asiento ni movimiento bancario al confirmarse.** Es deliberado (decisión D1
  del diseño): **la contabilidad la hace RRHH** en el paso siguiente. No es un defecto.

**200**
```json
{
  "exito": true,
  "idOrden": 12,
  "idPagoProgramado": 451,
  "estadoPago": 2,
  "estadoPagoTexto": "POR_APROBAR",
  "mensaje": "Orden enviada a tesorería. Queda pendiente de aprobación."
}
```

**409 Conflict** — la orden no está `GENERADA` (ya se envió, ya se pagó, o está anulada).

### 1.5 `POST /rest/odbs/confirmarPago/{id}` — cerrar el ciclo y contabilizar

Se llama **después** de que tesorería confirmó el pago.

**Body**
```json
{ "fechaPago": "2026-12-23", "usuario": "jperez" }
```

`fechaPago` es `LocalDate` → **`yyyy-MM-dd`**. Ver la trampa de serialización del §0.

Efectos, en este orden:
1. Exige que el `PagoProgramado` de la orden esté **`CONFIRMADO`**; si no, **409**.
2. Por cada `LQBS` de la orden: `valorPagado = valor`, `fechaPago`, `estado = PAGADO`.
3. Genera el asiento de **baja de provisión** — DEBE la línea de provisión por pagar que
   corresponda al tipo (40 décimo tercero, 41 décimo cuarto, 43 fondos de reserva), HABER banco (51).
4. `ODBS.estado = PAGADA`, `ODBSFCPG`, `ASNTCDGO`.

**200**
```json
{
  "exito": true,
  "idOrden": 12,
  "idAsiento": 7788,
  "numeroAsiento": "RH-2026-000345",
  "liquidacionesPagadas": 37,
  "total": 18450.75,
  "mensaje": "Pago confirmado y provisión dada de baja."
}
```

**409 Conflict** — el pago no está confirmado en tesorería, o la orden no está
`ENVIADA_A_TESORERIA`.
```json
{ "exito": false, "mensaje": "El pago 451 no está CONFIRMADO en tesorería (estado actual: POR_APROBAR)." }
```

### 1.6 `POST /rest/odbs/anular/{id}` — deshacer

**Body:** `{ "motivo": "...", "usuario": "jperez" }` — `motivo` obligatorio.

- Desenlaza las `LQBS` (`LQBSODBS = null`) para que puedan volver a agruparse.
- `ODBS.estado = ANULADA`.
- **409** si la orden ya está `PAGADA`: primero hay que revertir el pago en tesorería
  (`POST /pgtr/revertirConfirmado/{id}`), igual que exige el anticipo a empleado.

---

## 2. Estados

**Orden (`ODBSESTD`)** — rubro `RHH_ESTADO_ORDEN_BENEFICIO`

| Valor | Estado | Se puede |
|---|---|---|
| 1 | `GENERADA` | enviar a tesorería · anular |
| 2 | `ENVIADA_A_TESORERIA` | confirmar pago · anular |
| 3 | `PAGADA` | nada (revertir primero en tesorería) |
| 4 | `ANULADA` | nada |

**Liquidación (`LQBSESTD`)**: `1` pendiente (como nace hoy) → `2` pagada.

**Tipo de beneficio (`LQBSTPBN` / `ODBSTPBN`)** — rubro `RHH_TIPO_BENEFICIO_SOCIAL`:
`1` décimo tercero · `2` décimo cuarto · `3` fondos de reserva · `4` vacaciones · `5` utilidades.
**Esta orden sólo maneja 1, 2 y 3.**

---

## 3. Trampas que no se deducen del código

1. **`exito: false` con HTTP 200.** Varios endpoints devuelven 200 y no hicieron nada. Leer siempre
   el campo `exito`, nunca sólo el status.
2. **El pago no contabiliza; contabiliza RRHH.** Confirmar el pago en la bandeja de tesorería
   **no** genera el asiento. Hasta que no se llame `confirmarPago`, la provisión sigue viva. Una
   pantalla que muestre la orden como cerrada al ver el pago confirmado estaría mintiendo.

   **Cómo se representa — decidido el 2026-09-01, sobre la propuesta del frontend.** Son **tres**
   estados visuales, no dos, y no se pueden derivar de un solo booleano:

   | Situación | `estado` / `estadoPago` | Cómo se muestra |
   |---|---|---|
   | Esperando a tesorería | `2` / `POR_APROBAR` | badge neutro — «Enviada a tesorería» |
   | **Pagada, sin contabilizar** | `2` / `CONFIRMADO` | **badge ámbar** — «Pagado por tesorería · pendiente de contabilizar». **Nunca verde** |
   | Cerrada | `3 PAGADA` | badge verde, con `numeroAsiento` |

   En el detalle, aviso persistente mientras dure el estado intermedio: *«Tesorería confirmó el
   pago. La provisión sigue viva hasta "Confirmar pago"»*, con el botón de `confirmarPago`
   destacado. ⛔ **No usar un booleano tipo `acreditada`** (el patrón de `ordenes-pago`, que deriva
   de `!!fechaAcreditacion`): ahí hay dos estados y acá hay tres.
3. **Sin desglose no hay movimiento bancario.** Estos pagos no aparecen en `MovimientoBanco`. Es
   consecuencia aceptada de la decisión D1, no un defecto a reportar.
4. **`region` sólo aplica al décimo cuarto.** Mandarla en los otros tipos debe rechazarse, no
   ignorarse en silencio.
5. **Fechas:** `LocalDate` → `yyyy-MM-dd`. Nada con `Z`, nunca un `Date` crudo.
6. **`PUT` parcial borra columnas.** Ver §0.

---

## 4. Lo que este contrato todavía no cubre

- **Reporte del Ministerio de Trabajo (SUT).** Confirmado obligatorio, pero el formato exacto del
  CSV depende del archivo de ejemplo que hay que descargar del SUT. Cuando se tenga, se agrega acá
  como `GET /rest/odbs/reporteMdt/{id}`.
- **Vacaciones, jubilación patronal y desahucio.** Sus provisiones se dan de baja por otro camino;
  pendiente de levantamiento (§4.1 del diseño).

---

## 5. Anexo — cambio en `/rdpg` (frente 2, órdenes de pago de nómina)

**No es parte de `odbs`**, pero va acá porque este archivo es el que se espeja al frontend y el
cambio hay que hacerlo en los dos lados a la vez.

Cuando la orden de pago de nómina pase por la bandeja de tesorería, `GeneracionOrdenPagoServiceImpl`
necesita un **`idUsuario` numérico**: `registrarPagoDeOrigenExterno` lo usa como FK real
(`em.find(Usuario.class, idUsuario)`). Hoy sólo llega `usuarioRegistro`, que es texto libre.

| Endpoint | Body |
|---|---|
| `POST /rest/rdpg/generar` | `{idPeriodo, idCuentaBancaria, usuarioRegistro, `**`idUsuario`**`}` |
| `POST /rest/rdpg/confirmar/{id}` | `{fechaAcreditacion, usuarioRegistro, `**`idUsuario`**`}` |

- **`usuarioRegistro` se mantiene**: sigue alimentando las columnas de auditoría `*USRR`, que son
  texto. El campo nuevo se suma, no lo reemplaza.
- **De dónde sale `idUsuario` en el frontend:** del getter de `AppStateService:307-314`, cuyo
  Javadoc dice *«Id del usuario actual, listo para mandar como `idUsuario` en un payload»*. Ya lo
  usan otras pantallas.
- ⛔ **No resolver el usuario por nombre en el backend.** `usuarioSesion()`
  (`shared/services/usuario-sesion.ts:11-23`) devuelve el literal `'SYSTEM'` cuando ninguna de las
  siete claves de storage está poblada, y eso no es un usuario de la base: buscar por ese texto
  haría fallar `generar()` de nómina entera según por dónde se haya inicializado la sesión.
- **`idUsuario` ausente o nulo** debe dar un error explícito de integración, no un
  `NullPointerException` ni una resolución por nombre.

---

## 6. 🆕 `POST /rest/odbs/revertirPago/{id}` — deshacer una orden ya pagada

**Agregado el 2026-09-07.** Cierra el callejón sin salida que tenía el ciclo.

### 6.1 Por qué hace falta — el camino que el §1.6 promete y no existe

El §1.6 dice que para anular una orden `PAGADA` *«primero hay que revertir el pago en tesorería
(`POST /pgtr/revertirConfirmado/{id}`)»*. **Ese camino estaba cortado**, verificado el 2026-09-07:

- `anular` rechaza toda orden `PAGADA`.
- **Nada saca una orden de `PAGADA`.** Los únicos `setEstado` del servicio son `GENERADA`,
  `ENVIADA_A_TESORERIA`, `PAGADA` y `ANULADA`.
- Revertir en tesorería **no toca nada de RRHH**: el pago viaja sin desglose (decisión D1), así que
  no tiene asiento propio y `revertirContabilidadOrigenExterno` sólo registra y vuelve.

Resultado: se revertía el pago en tesorería y la orden quedaba `PAGADA` **para siempre**, con la
provisión dada de baja contra un pago que ya no existe.

**Y desde que `confirmarPago` crea la novedad del décimo, el costo subió:** el rol del mes queda
informando un pago revertido, sin forma de deshacerlo.

### 6.2 Contrato

**Body**
```json
{ "motivo": "Transferencia rechazada por el banco", "usuario": "jperez" }
```
`motivo` es **obligatorio**.

**Precondiciones — las dos dan 409**

| Situación | Mensaje |
|---|---|
| La orden no está `PAGADA` | «La orden {id} no está PAGADA (estado actual: {x}). Sólo se revierte un pago confirmado.» |
| El `PagoProgramado` **sigue** `CONFIRMADO` | «El pago {idPago} sigue CONFIRMADO en tesorería. Revierta primero con `POST /pgtr/revertirConfirmado/{idPago}`.» |

⛔ **El orden importa y no se invierte:** primero tesorería, después RRHH. Al revés, RRHH daría por
revertido un pago que en tesorería sigue vivo.

**Efectos, en este orden**

1. **Anula el asiento** de baja de provisión con `asientoService.anulaAsiento(orden.getAsiento())`
   — el mecanismo que ya usa `revertirContabilidadEgreso`. **La provisión vuelve a estar viva**, que
   es el punto contable de todo esto.
2. Cada `LQBS` vuelve a pendiente: `valorPagado = 0`, `fechaPago = null`, `estado = 1`.
3. **Elimina las novedades** creadas por `confirmarPago`, buscadas por la convención de descripción
   del §7.C del plan.
4. `ODBS.estado = REVERTIDA (5)`, `fechaPago = null`, `asiento = null`, y el motivo en la
   observación.

**200**
```json
{
  "exito": true,
  "idOrden": 12,
  "liquidacionesRevertidas": 37,
  "novedadesEliminadas": 37,
  "asientoAnulado": 7788,
  "mensaje": "Pago revertido. La provisión vuelve a estar viva y la orden puede anularse."
}
```

### 6.3 🔴 El caso duro: el rol del período YA se procesó

La novedad es informativa —no suma al neto— pero **el rol ya la consumió como renglón**. Borrar la
novedad después **no borra el renglón del rol ya procesado**.

**Decisión: se RECHAZA con 409.** No se revierte a medias.

```json
{ "exito": false,
  "mensaje": "El rol del período 8/2026 ya fue procesado e incluye la novedad de esta orden. Reabra o reprocese el período antes de revertir el pago." }
```

**Por qué rechazar y no revertir igual:** revertir dejaría el rol procesado afirmando un pago que se
deshizo, y **eso no da ningún error** — se ve como un rol correcto. Es exactamente la familia de
defectos que este equipo viene persiguiendo: *el que no falla, el que devuelve otra cosa en
silencio*. Entre bloquear una operación y corromper un rol cerrado, se bloquea.

### 6.4 Estado nuevo: `REVERTIDA = 5`

| Valor | Estado | Se puede |
|---|---|---|
| 1 | `GENERADA` | enviar a tesorería · anular |
| 2 | `ENVIADA_A_TESORERIA` | confirmar pago · anular |
| 3 | `PAGADA` | **revertir pago** |
| 4 | `ANULADA` | nada |
| **5** | **`REVERTIDA`** | **anular** |

**Desde `REVERTIDA` sólo se anula.** Anular libera las `LQBS` (`LQBSODBS = null`) y con eso se puede
volver a generar la orden desde cero.

⛔ **No se permite re-enviar a tesorería una orden `REVERTIDA`.** Quedaría enlazada a un
`PagoProgramado` revertido, y ese enredo es más caro que generar la orden de nuevo.

⚠️ Requiere la fila del rubro `RHH_ESTADO_ORDEN_BENEFICIO` con alterno **5**: la crea el
**`e2-19`**, que va **antes del WAR**. Una constante en Java cuyo detalle de rubro no existe en la
base es lo que ya costó el `e2-08` y el `e2-13`.

### 6.5 Y `anular` cambia una línea

Hoy acepta `GENERADA` y `ENVIADA_A_TESORERIA`. **Tiene que aceptar también `REVERTIDA`**, o el
reverso desemboca en otro callejón sin salida.
