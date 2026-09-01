# CONTRATO DE API — Anulación de documentos con auditoría y cascada

**Cubre los 9 documentos anulables**, de compra (`cxp`) y de venta (`cxc`).
**Equipo:** `lap-saa-1` · **Congelado:** 2026-09-01 · **Verificado contra el código, archivo:línea.**

> **Este documento es el contrato, no un resumen.** Cada afirmación de acá se comprobó leyendo la
> clase REST y su `ServiceImpl`. Donde el código y la documentación previa se contradecían, manda el
> código y queda anotado.

**Base de todas las rutas: `/SaaBE/rest/`** — el application path de JAX-RS es `/rest`, no `/api`.

---

## 1. ⛔ Lo primero: `cxp` y `cxc` NO se comportan igual

**Es la trampa central de este contrato.** Los dos lados nacieron por separado y respetaron cada uno
su convención preexistente. **No se unificaron a propósito** — unificarlos rompería llamadores
existentes. No "arreglar" ninguna de las dos.

| | **compra (`cxp`)** — 4 documentos | **venta (`cxc`)** — 5 documentos |
|---|---|---|
| **Ruta de anulación** | `POST /{tabla}/anular/{id}` — **id en la URL** | `POST /{tabla}/anular` — **id en el BODY** |
| **Documento no existe / ya anulado** | **200 OK** con `{exito:false, mensaje}` | **400 Bad Request** con `{exito:false, mensaje}` |
| **Cuerpo del 409** | `{mensaje}` — **sin** clave `exito` | `{exito:false, mensaje}` |
| **Falta un parámetro obligatorio** | no valida: el service resuelve | **400** con `{exito:false, mensaje}` |

> ⚠️ **Mirar el status HTTP no alcanza en `cxp`.** Un documento inexistente o ya anulado responde
> **200**. Si el frontend trata todo 2xx como éxito, va a decir "anulada" sin que se haya anulado
> nada. **En `cxp` hay que leer siempre `exito` del cuerpo.**
>
> ⚠️ **Y el reflejo inverso tampoco sirve.** En `cxc` ese mismo caso es **400**, así que un manejador
> que asuma "400 = mi payload está mal" va a mostrar un error de formulario donde en realidad el
> documento ya estaba anulado. **El cuerpo lo dice; el status, no.**
>
> **Regla que funciona en los dos lados: leer `exito` cuando venga, y `mensaje` siempre.**

### 1.1 Por qué el 409 de `cxp` igual llega como JSON

El código de `cxp` responde el 409 con `.entity(e.getMessage())` — un `String` pelado — declarando
`APPLICATION_JSON`. **No llega así al cliente:** `com.saa.ws.rest.MensajeErrorJsonFilter` lo envuelve.

El filtro actúa **sólo con las tres condiciones a la vez**: status ≥ 400, la entidad es un `String`, y
el tipo declarado es JSON compatible. Un cuerpo que ya empieza con `{` o `[` no se toca, para no
envolverlo dos veces.

**Consecuencia práctica: `error.mensaje` funciona en los nueve documentos**, en los dos lados y en
todos los códigos de error. Es la única clave que se puede leer sin preguntar de qué lado viene.

---

## 2. Los 9 documentos — tabla de referencia

| Documento | Ruta | Clave del id | Anular | `movimientos` | 409 | Cascada |
|---|---|---|---|---|---|---|
| **Factura compra** | `fctc` | en la URL | `POST /fctc/anular/{id}` | ✅ | ✅ | ✅ |
| **Liquidación compra** | `lqcc` | en la URL | `POST /lqcc/anular/{id}` | ⛔ **no existe** | ⛔ **nunca** | ⛔ **no acepta** |
| **Nota crédito compra** | `ntcc` | en la URL | `POST /ntcc/anular/{id}` | ✅ | ✅ | ✅ |
| **Nota débito compra** | `ntdc` | en la URL | `POST /ntdc/anular/{id}` | ✅ | ✅ | ✅ |
| **Factura venta** | `fctr` | `idFactura` (body) | `POST /fctr/anular` | ✅ | ✅ | ✅ |
| **Nota crédito venta** | `ntcr` | `idNotaCredito` (body) | `POST /ntcr/anular` | ✅ | ✅ | ✅ |
| **Nota débito venta** | `ntdb` | `idNotaDebito` (body) | `POST /ntdb/anular` | ✅ | ✅ | ✅ |
| **Liquidación venta** | `lqcs` | `idLiquidacion` (body) | `POST /lqcs/anular` | ✅ | ✅ | ✅ **+ cross-schema** |
| **Retención V2** | `rtv2` | `idRetencion` (body) | `POST /rtv2/anular` | ✅ | ✅ | ✅ |

**El endpoint de movimientos es `GET /{tabla}/movimientosRelacionados/{id}` en los ocho que lo
tienen** — el id va en la URL también del lado venta, que en eso no sigue a su propio `/anular`.

### 2.1 ⛔ `lqcc` es el único con contrato reducido

`LiquidacionCompraCompraServiceImpl.anularLiquidacionCompra` tiene la firma
`(Long idLiquidacion, String motivo, String usuario)` — **sin `idUsuario` ni `anularEnCascada`**, y no
consulta `AplicacionPagoCxp` en ningún punto.

**Para el frontend:** en `lqcc` no hay diálogo de "¿anular también los movimientos?" porque no hay
movimientos que consultar, y **nunca va a recibir un 409**. Responde 200 siempre, con `exito` true o
false. **No copiar el flujo de `fctc` para esta pantalla.**

*(Es coherente con lo verificado en su momento: `LQCC` no tiene movimientos asociados. El contrato
reducido no es un olvido.)*

---

## 3. Cuerpo de la petición

### 3.1 Compra (`fctc`, `ntcc`, `ntdc`) — el id va en la URL

```json
POST /SaaBE/rest/fctc/anular/123
{
  "motivo": "Error en el detalle",
  "usuario": "jperez",
  "idUsuario": 42,
  "anularEnCascada": true
}
```

| Campo | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `motivo` | String | no | por defecto `"Anulación manual"` |
| `usuario` | String | no | por defecto `"SISTEMA"` |
| `idUsuario` | Long | **condicional** | hace falta **sólo** si `anularEnCascada=true` **y** entre los movimientos a reversar hay alguno de tipo pago directo |
| `anularEnCascada` | boolean | no | por defecto `false` |

Para **`lqcc`**: sólo `motivo` y `usuario`. Los otros dos se ignoran.

### 3.2 Venta (`fctr`, `ntcr`, `ntdb`, `lqcs`, `rtv2`) — el id va en el cuerpo

```json
POST /SaaBE/rest/fctr/anular
{
  "idFactura": 123,
  "motivo": "Error en el detalle",
  "usuario": "jperez",
  "idUsuario": 42,
  "anularEnCascada": true
}
```

| Campo | Tipo | Obligatorio | Nota |
|---|---|---|---|
| id del documento | Long | **sí** | la clave cambia por documento — ver tabla §2. Ausente → **400** |
| `usuario` | String | **sí** | vacío o nulo → **400**. **Excepción: `rtv2` NO lo valida** |
| `motivo` | String | no | |
| `idUsuario` | Long | no | |
| `anularEnCascada` | boolean | no | por defecto `false` |

> ⚠️ **`rtv2` es el único de venta que no exige `usuario`.** Mandarlo igual: la columna de auditoría
> existe en los cinco, y apoyarse en que uno no valide deja el registro sin autor.

---

## 4. Respuestas

### 4.1 Éxito — 200

```json
{
  "exito": true,
  "mensaje": "...",
  "idFactura": 123,
  "motivoAnulacion": "Error en el detalle",
  "fechaAnulacion": "...",
  "usuarioAnulacion": "jperez",
  "movimientosReversados": 3,
  "asientoAnulado": true,
  "advertenciaAsiento": "..."
}
```

La clave del id repite el nombre que se mandó (`idFactura`, `idNotaCredito`, …). Los tres últimos
campos **son opcionales**: aparecen según lo que la anulación haya tenido que hacer. `advertenciaAsiento`
llega cuando el documento se anuló pero su asiento contable no se pudo anular — **es un éxito parcial
que hay que mostrar**, no un detalle técnico.

### 4.2 Hay movimientos y no vino cascada — **409 Conflict**

Es el caso que dispara el diálogo de confirmación. El mensaje enumera lo que se reversaría.

```json
{ "exito": false, "mensaje": "..." }   // venta
{ "mensaje": "..." }                    // compra — sin la clave `exito`, ver §1.1
```

**Flujo esperado del frontend:**
1. `GET /{tabla}/movimientosRelacionados/{id}` **antes** de anular.
2. Si la lista viene vacía → anular directo.
3. Si trae filas → mostrarlas y preguntar. Si el usuario acepta, repetir con `anularEnCascada: true`.

El 409 es la red de seguridad para el caso en que aparezca un movimiento entre la consulta y la
anulación, no el camino normal.

### 4.3 No existe o ya está anulado

**200 con `exito:false` en compra · 400 con `exito:false` en venta.** Ver §1.

### 4.4 Error inesperado — 500

`{exito:false, mensaje, error}` en venta; `{mensaje}` en compra tras el filtro.

---

## 5. ⛔ `movimientosRelacionados` NO devuelve la misma forma en los ocho

**Verificado campo por campo en los ocho.** Hay **cuatro formas distintas**. Los únicos tres campos
presentes en todas son `idAplicacion`, `montoAplicado` y `fechaAplicacion`.

| Forma | Documentos | Campos |
|---|---|---|
| **A** — con texto | `fctc`, `fctr` | `idAplicacion`, `tipoDocPago` (Long), **`tipoDocPagoTexto`** (String), `montoAplicado`, `fechaAplicacion` |
| **B** — sin texto | `lqcs` | `idAplicacion`, `tipoDocPago` (Long), `montoAplicado`, `fechaAplicacion` |
| **C** — apunta a factura de venta | `ntcr`, `ntdb` | `idAplicacion`, **`idFactura`** (Long, puede venir `null`), `montoAplicado`, `fechaAplicacion` |
| **D** — apunta a factura de compra | `ntcc`, `ntdc`, **`rtv2`** | `idAplicacion`, **`idFacturaCompra`** (Long, puede venir `null`), `montoAplicado`, `fechaAplicacion` |

**Cómo modelarlo en el frontend:** todo opcional salvo `idAplicacion`, `montoAplicado` y
`fechaAplicacion`; la etiqueta de cada fila se resuelve según cuál de los tres campos discriminantes
haya llegado. **No asumir la forma de `fctr` para los ocho** — es el error natural, porque la factura
de venta es la pantalla que se construye primero.

Dos detalles que muerden:
- **`lqcs` trae `tipoDocPago` pero NO `tipoDocPagoTexto`.** Si la pantalla imprime el texto sin
  chequear, muestra vacío en vez del tipo. La traducción hay que hacerla en el cliente.
- **`fechaAplicacion` es un `String`, no una fecha**, en los ocho. Sale de un `.toString()` del lado
  servidor. Puede venir `null`.

### 5.1 ⚠️ `rtv2` vive en `cxc` pero sus movimientos son de **compra**

`RetencionV2` es un documento de venta ante el SRI —lo emite la empresa— pero **reduce facturas de
compra**: sus movimientos salen de `AplicacionPagoCxp` y su cascada llama a
`aplicacionPagoCxpService.revertirAplicacion`.

**El diálogo de confirmación de la retención tiene que decir "facturas de compra afectadas", no de
venta.** Es la trampa ya registrada en `CLAUDE.md`: **`cxc`/`cxp` clasifica por quién emite el
documento ante el SRI, no por si entra o sale plata.**

---

## 6. Qué hace la cascada, por documento

| Documento | Qué reversa | Cómo |
|---|---|---|
| `fctc` | Aplicaciones CxP. Si el movimiento es **pago directo**, busca el `PagoProgramado` y llama `revertirPagoConfirmado`; si no, `revertirAplicacion` | uno por uno |
| `ntcc`, `ntdc` | Aplicaciones CxP del documento | uno por uno |
| `fctr` | **Todas** las aplicaciones CxC de la factura | en bloque |
| `ntcr`, `ntdb` | Aplicaciones CxC del documento | en bloque |
| `rtv2` | Aplicaciones **CxP** (§5.1) | uno por uno |
| **`lqcs`** | Aplicaciones CxC **y además anula el documento CXP asociado** | uno por uno |
| `lqcc` | nada — no cascadea | — |

Los ocho anulan además **su propio asiento contable** si existe. Si el asiento no se puede anular, la
anulación del documento **igual procede** y la respuesta trae `advertenciaAsiento`.

### 6.1 `lqcs` es el único que cruza de paquete

Anular una liquidación de compra **de venta** (`CBR.LQCS`) también anula la
`LiquidacionCompraCompra` (`PGS.LQCC`) vinculada: le anula el asiento y la deja INACTIVA.

**Para el frontend: una sola anulación cambia dos pantallas.** Si el usuario tiene abierta la consulta
de documentos CXP, lo que ve ahí quedó desactualizado. Es el único de los nueve con este efecto.

---

## 7. Lo que este contrato corrige de la documentación anterior

Se anota porque la versión previa vivía dentro de un documento de plan y **el frontend habría
construido contra ella**:

| Decía | Es |
|---|---|
| «200 con `exito:false` para documento inexistente o ya anulado» — presentado como válido para los nueve | **Sólo en los 4 de `cxp`.** En los 5 de `cxc` ese caso es **400** |
| «las notas de crédito y débito devuelven `idFactura`/`idFacturaCompra`» — dos formas | **Cuatro formas.** `lqcs` es una propia (sin `tipoDocPagoTexto`) y `rtv2` va con las de compra |
| Los nueve con contrato completo | **`lqcc` no tiene `movimientosRelacionados`, no acepta cascada y nunca devuelve 409** |
| El 409 de compra como texto plano | Llega como **`{mensaje}`**: lo envuelve `MensajeErrorJsonFilter` |

> **Por qué la versión anterior se equivocaba, y vale para el próximo contrato:** describía el patrón
> de `Factura` (venta) y `FacturaCompra` (compra) y lo extendía a los nueve por analogía. Los dos
> documentos más usados son justamente los que **no** exhiben las excepciones. **Un contrato se
> verifica en los nueve, no en los dos representativos.**
