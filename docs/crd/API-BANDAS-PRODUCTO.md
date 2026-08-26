# API — Modelo de bandas por producto (contrato para el frontend)

**Estado:** ✅ FASE 1 IMPLEMENTADA (2026-08-25) — código entregado, pendiente de compilar y
desplegar por el usuario en Eclipse/WildFly.
**Regla:** este documento es el contrato entre backend y frontend. El agente frontend NO
inventa rutas ni estructuras: usa solo lo que esté aquí. Todo endpoint nuevo o cambiado se
registra aquí en el mismo cambio.

**Base URL:** `/SaaBE/rest` (el application path JAX-RS es `/rest`; contexto `/SaaBE`).
**Diseño de negocio:** `LEVANTAMIENTO-ALIMENTACION-CONTABLE-CREDITOS.md` §8.
**DDL:** `sql/DDL-BANDAS-PRODUCTO.sql` · **Carga inicial:** `CARGA-INICIAL-BANDAS-PRODUCTO.md`

---

## 0. Cómo leer este documento

### 0.1 Formato de fechas — LEER ANTES DE CODIFICAR

El proveedor efectivo de JSON es **Jackson**, con la configuración por omisión (ver
CLAUDE.md §Serialización, verificado sobre el cable el 2026-08-20). Consecuencia:

| Tipo | **Entrada** (lo que manda el frontend) | **Salida** (lo que devuelve el servidor) |
|---|---|---|
| `LocalDate` | `"2026-09-01"` (ISO, string) | `[2026,9,1]` (arreglo `[año, mes, día]`) |
| `LocalDateTime` | `"2026-08-25T10:16:36"` (ISO local, **sin `Z` ni offset**) | `[2026,8,25,10,16,36,141000000]` |
| `java.util.Date` | epoch en milisegundos o ISO | número: epoch en milisegundos |

**No mandar nunca un `Date` de JavaScript crudo ni nada terminado en `Z`**: Jackson descarta
el offset en vez de convertirlo y la hora queda corrida cinco horas sin ningún error.

Los **query params** de fecha (`?fecha=`) van siempre como `yyyy-MM-dd`.

### 0.2 Estilo de error — CORREGIDO el 2026-08-25 contra el servidor desplegado

**El cuerpo del error NO es texto plano: es JSON `{"mensaje": "..."}`.** Verificado con
`curl` contra el WAR desplegado:

```
GET /rest/cbpr/clasificar?idProducto=21&idEmpresa=1236&tipoCartera=1&dias=45
HTTP/1.1 500 Internal Server Error
Content-Type: application/json
{"mensaje":"Error al clasificar la banda: No hay configuracion de bandas vigente al 2026-08-25 para el producto 21, empresa 1236, tipo de cartera POR VENCER"}
```

El código REST sí pasa un `String` como entity (`"Error ...: " + e.getMessage()`, el estilo
de la casa), pero lo marca con `.type(MediaType.APPLICATION_JSON)` y entonces actúa
**`com.saa.ws.rest.MensajeErrorJsonFilter`**, un `@Provider ContainerResponseFilter`
transversal del proyecto: cuando el status es `>= 400` y la entity es un `String` con media
type JSON, lo envuelve en `{"mensaje": ...}`. Si la entity ya empieza por `{` o `[` no la
toca (para no esconder el mensaje un nivel más abajo).

**Esto es de TODO el sistema, no de bandas.** Comprobado el mismo día contra endpoints
preexistentes que nadie tocó: `GET /rest/prst/getId/999999999` y
`GET /rest/prdc/getId/999999999` devuelven exactamente la misma forma. La descripción
anterior de esta sección ("texto plano") era incorrecta.

Consecuencias para el cliente:
- Leer el mensaje de negocio de la propiedad **`mensaje`** del JSON, no del cuerpo crudo.
  Conviene tolerar también texto plano: un endpoint que no marque `APPLICATION_JSON` en el
  error no pasa por el filtro y sí llega como texto.
- Las validaciones de negocio (`IncomeException`) llegan dentro de ese `mensaje` y son
  aptas para mostrárselas al usuario. Ejemplos reales de `guardarConfiguracion`:
  `"Error al guardar la configuracion de bandas: Los numeros de banda deben ser
  consecutivos desde 1; en la posicion 2 se recibio 3"`.
- Los errores de infraestructura llegan con la excepción Java dentro del texto
  (`jakarta.persistence.NoResultException: ...`); no son aptos para mostrar tal cual.

### 0.3 Procedencia de los JSON de ejemplo

Los ejemplos se construyeron **con las filas reales de la BD local de desarrollo**
(docker `saa-oracle-23ai`, empresa 1236 ASOPREP, 28 configuraciones / 143 bandas cargadas
el 2026-08-25) aplicando la serialización descrita en §0.1. No se capturaron de una llamada
HTTP porque el WAR aún no se ha desplegado con estos cambios (`mvn` no está en el PATH de
este entorno; compila y despliega el usuario). Las **estructuras y los nombres de campo son
exactos**; los valores son los de la BD local.

> **Renombre de columnas del 2026-08-25 — sin efecto en este contrato.** Tres columnas
> físicas se renombraron para cumplir el estándar de nombres del sistema
> (`CBPRFCDE→CBPRFCIN`, `CBPRFCHS→CBPRFCFN`, `BNDPPRDS→BNDPCNTD`, ver
> `sql/ALTER-BANDAS-RENOMBRE-CAMPOS.sql`). Los **atributos Java no cambiaron**
> (`fechaDesde`, `fechaHasta`, `periodos`), así que **ningún JSON de este documento cambia**.
> Verificado el 2026-08-25: este documento no cita nombres físicos de esas tres columnas en
> ninguna parte — solo nombres de tabla (`CRD.CBPR`, `CRD.BNDP`), de constraint
> (`FK_BNDP_CBPR`, `CK_CBPR_TPCR`) y columnas ajenas que no se tocaron (`PLNNCDGO`,
> `PJRQCDGO`).

### 0.4 Valores de catálogo

**Tipo de cartera** (`tipoCartera`) — `com.saa.rubros.TipoCarteraBanda`:

| Valor | Significado | Cómo se cuentan los días |
|---|---|---|
| `1` | POR VENCER | del corte **hasta** el vencimiento de la cuota |
| `2` | VENCIDO | del vencimiento **hasta** el corte |

**Estado** (`estado`, `estadoProducto`) — `com.saa.rubros.Estado`: `1` = activo, `0` = inactivo.

### 0.5 Cómo se derivan los rangos en días

Las bandas guardan **períodos de 30 días**, no rangos. El backend deriva el rango y lo
devuelve ya calculado en `diaInicio` / `diaFin` / `etiqueta`:

```
diaInicio(k) = 30 * SUM(periodos 1..k-1) + 1
diaFin(k)    = 30 * SUM(periodos 1..k)
```

La **última banda tiene `periodos: null`** = banda abierta ("el resto"): sale con
`diaFin: null` y `etiqueta: "mas de N (resto)"`. **El frontend no debe recalcular nada de
esto**: manda períodos, recibe rangos.

---

## 1. Endpoints CRUD estándar

Existen por el patrón de capas y sirven para inspección/soporte. **La pantalla de
parametrización NO los usa para grabar**: usa `POST /rest/cbpr/guardarConfiguracion`
(§2.4), que valida el juego de bandas completo. Grabar una banda suelta por `POST
/rest/bndp` puede dejar la configuración inválida (sin banda abierta, con números
salteados) y eso no se detecta hasta el cierre contable.

### CRD.CBPR — Configuración

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/rest/cbpr/getAll` | `ConfiguracionBandaProducto[]` (entidades) |
| GET | `/rest/cbpr/getId/{id}` | `ConfiguracionBandaProducto`, o `404` si no existe |
| POST | `/rest/cbpr` | `201` + entidad grabada (**solo cabecera**) |
| PUT | `/rest/cbpr` | `200` + entidad grabada (**solo cabecera**) |
| DELETE | `/rest/cbpr/{id}` | `204`; falla con `500` si todavía tiene bandas (FK `FK_BNDP_CBPR`) |
| POST | `/rest/cbpr/selectByCriteria` | body `DatosBusqueda[]`; `400` con el mensaje si no hay resultados |

### CRD.BNDP — Bandas

| Método | Ruta | Devuelve |
|---|---|---|
| GET | `/rest/bndp/getAll` | `BandaProducto[]` (entidades) |
| GET | `/rest/bndp/getId/{id}` | `BandaProducto`, o `404` si no existe |
| GET | `/rest/bndp/getByConfiguracion/{idConfiguracion}` | `BandaProductoDetalle[]` — **con rangos derivados**, ver §2.6 |
| POST | `/rest/bndp` | `201` + entidad grabada |
| PUT | `/rest/bndp` | `200` + entidad grabada |
| DELETE | `/rest/bndp/{id}` | `204` |
| POST | `/rest/bndp/selectByCriteria` | body `DatosBusqueda[]`; `400` si no hay resultados |

### Ejemplo: `GET /rest/cbpr/getId/1`

Entidad completa, con las FKs expandidas (Jackson serializa el grafo entero — por eso los
endpoints de negocio de §2 devuelven DTOs y no esto):

```json
{
  "codigo": 1,
  "producto": {
    "codigo": 2,
    "codigoSBS": "EME",
    "nombre": "EMERGENTE",
    "filial": { "codigo": 1, "...": "..." },
    "tipoPrestamo": { "codigo": 1, "nombre": "QUIROGRAFARIO", "codigoSBS": "QUI", "tipo": null, "tasa": null, "estado": 1 },
    "codigoExterno": 3,
    "fechaRegistro": 1736917200000,
    "usuarioRegistro": "ADMIN",
    "ipRegistro": "0.0.0",
    "fechaModificacion": null,
    "usuarioModificacion": null,
    "ipModificacion": null,
    "estado": 1,
    "codigoPetro": "PE"
  },
  "empresa": {
    "codigo": 1236,
    "jerarquia": { "codigo": 12, "nombre": "EMPRESA", "nivel": 4, "codigoPadre": 10, "...": "..." },
    "nombre": "ASOPREP",
    "nivel": 2,
    "codigoPadre": 75,
    "ingresado": 1
  },
  "tipoCartera": 1,
  "fechaDesde": [2026, 9, 1],
  "fechaHasta": null,
  "fechaRegistro": [2026, 8, 25, 10, 16, 36, 141000000],
  "usuarioRegistro": "CARGA-INICIAL-BANDAS",
  "ipRegistro": null,
  "fechaModificacion": null,
  "usuarioModificacion": null,
  "ipModificacion": null,
  "estado": 1
}
```

> `fechaRegistro` de `producto` es un `java.util.Date` → epoch en milisegundos (el valor
> exacto depende de la zona horaria del servidor). El `fechaRegistro` de la configuración
> es `LocalDateTime` → arreglo.

---

## 2. Endpoints de negocio (los que usa la pantalla)

### 2.1 GET `/rest/cbpr/listado`

- **Propósito:** el listado completo de la pantalla de parametrización.
- **Proceso de negocio:** pantalla de parametrización de bandas (vista principal).
- **Request** (query params):

| Param | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `idEmpresa` | Long | **sí** | nodo SCP.PJRQ de nivel empresa; en local/pruebas ASOPREP = `1236` |
| `fecha` | `yyyy-MM-dd` | no | fecha a la que se evalúa la vigencia; ausente = hoy |

```
GET /SaaBE/rest/cbpr/listado?idEmpresa=1236&fecha=2026-09-01
```

- **Response 200:** `ProductoBandas[]`, **una fila por producto de crédito**, ordenadas por
  código de producto. Salen **todos** los productos, activos e inactivos
  (`estadoProducto`), y los que no tienen configuración salen igual con `porVencer` o
  `vencido` en `null` — ese hueco es lo que el usuario tiene que ver y llenar.

```json
[
  {
    "idProducto": 2,
    "nombreProducto": "EMERGENTE",
    "codigoSBS": "EME",
    "nombreTipoPrestamo": "QUIROGRAFARIO",
    "estadoProducto": 1,
    "porVencer": {
      "idConfiguracion": 1,
      "idProducto": 2,
      "nombreProducto": "EMERGENTE",
      "idEmpresa": 1236,
      "tipoCartera": 1,
      "nombreTipoCartera": "POR VENCER",
      "fechaDesde": [2026, 9, 1],
      "fechaHasta": null,
      "editable": false,
      "estado": 1,
      "bandas": [
        { "idBanda": 1, "numero": 1, "periodos": 1,    "diaInicio": 1,   "diaFin": 30,   "etiqueta": "1 - 30",             "idPlanCuenta": 10279, "cuentaContable": "1.3.01.05", "nombreCuenta": "DE 1 A 30 DIAS",       "estado": 1 },
        { "idBanda": 2, "numero": 2, "periodos": 2,    "diaInicio": 31,  "diaFin": 90,   "etiqueta": "31 - 90",            "idPlanCuenta": 10280, "cuentaContable": "1.3.01.10", "nombreCuenta": "DE 31 A 90 DIAS",      "estado": 1 },
        { "idBanda": 3, "numero": 3, "periodos": 3,    "diaInicio": 91,  "diaFin": 180,  "etiqueta": "91 - 180",           "idPlanCuenta": 10281, "cuentaContable": "1.3.01.15", "nombreCuenta": "DE 91 A 180 DIAS",     "estado": 1 },
        { "idBanda": 4, "numero": 4, "periodos": 6,    "diaInicio": 181, "diaFin": 360,  "etiqueta": "181 - 360",          "idPlanCuenta": 10282, "cuentaContable": "1.3.01.20", "nombreCuenta": "DE 181 A 360 DIAS",    "estado": 1 },
        { "idBanda": 5, "numero": 5, "periodos": null, "diaInicio": 361, "diaFin": null, "etiqueta": "mas de 360 (resto)", "idPlanCuenta": 10283, "cuentaContable": "1.3.01.25", "nombreCuenta": "DE MAS DE 360 DIAS",   "estado": 1 }
      ]
    },
    "vencido": {
      "idConfiguracion": 14,
      "idProducto": 2,
      "nombreProducto": "EMERGENTE",
      "idEmpresa": 1236,
      "tipoCartera": 2,
      "nombreTipoCartera": "VENCIDO",
      "fechaDesde": [2026, 9, 1],
      "fechaHasta": null,
      "editable": false,
      "estado": 1,
      "bandas": [
        { "idBanda": 66, "numero": 1, "periodos": 1,    "diaInicio": 1,   "diaFin": 30,   "etiqueta": "1 - 30",             "idPlanCuenta": 10285, "cuentaContable": "1.3.04.05", "nombreCuenta": "DE 1 A 30 DIAS",     "estado": 1 },
        { "idBanda": 67, "numero": 2, "periodos": 2,    "diaInicio": 31,  "diaFin": 90,   "etiqueta": "31 - 90",            "idPlanCuenta": 10286, "cuentaContable": "1.3.04.10", "nombreCuenta": "DE 31 A 90 DIAS",    "estado": 1 },
        { "idBanda": 68, "numero": 3, "periodos": 3,    "diaInicio": 91,  "diaFin": 180,  "etiqueta": "91 - 180",           "idPlanCuenta": 10287, "cuentaContable": "1.3.04.15", "nombreCuenta": "DE 91 A 180 DIAS",   "estado": 1 },
        { "idBanda": 69, "numero": 4, "periodos": 3,    "diaInicio": 181, "diaFin": 270,  "etiqueta": "181 - 270",          "idPlanCuenta": 10288, "cuentaContable": "1.3.04.20", "nombreCuenta": "DE 181 A 270 DIAS",  "estado": 1 },
        { "idBanda": 70, "numero": 5, "periodos": null, "diaInicio": 271, "diaFin": null, "etiqueta": "mas de 270 (resto)", "idPlanCuenta": 10289, "cuentaContable": "1.3.04.25", "nombreCuenta": "DE MAS DE 270 DIAS", "estado": 1 }
      ]
    }
  },
  {
    "idProducto": 21,
    "nombreProducto": "HIPOTECARIO NOVACION",
    "codigoSBS": "NAH",
    "nombreTipoPrestamo": "HIPOTECARIO",
    "estadoProducto": 1,
    "porVencer": null,
    "vencido": { "idConfiguracion": 28, "...": "...", "bandas": ["... 6 bandas ..."] }
  }
]
```

> Los `idBanda` / `idPlanCuenta` de la configuración 14 y siguientes se muestran con la
> secuencia que resultó de la carga inicial local; **el frontend nunca debe asumirlos**:
> son los que devuelva el servidor.

- **Errores:**

| Condición | Respuesta |
|---|---|
| `idEmpresa` ausente | `500` `"Error al obtener el listado de parametrizacion: La empresa es obligatoria"` |
| no hay productos de crédito | `500` `"... : No hay productos de credito registrados"` |
| `fecha` mal formada | `500` con el mensaje del parseo |

- **Notas:**
  - `editable` es `true` solo si la vigencia **todavía no empezó** a la fecha consultada.
    La pantalla debe habilitar la edición en el lugar únicamente en ese caso; si es
    `false`, el único camino de cambio es §2.5 (cierre de vigencia).
  - **Estado real de la BD local:** los productos **21 HIPOTECARIO NOVACION** y
    **22 PRENDARIO NOVACION** tienen `porVencer: null` a propósito — las familias contables
    1.3.06 y 1.3.10 no tienen subcuentas de bandas todavía (§4 de
    `CARGA-INICIAL-BANDAS-PRODUCTO.md`). No es un error del endpoint.
  - Productos con `estadoProducto: 0` (inactivos, hoy los códigos 3, 5, 6, 8 y 10) se
    listan igual: tienen cartera histórica que la reclasificación puede tocar.

---

### 2.2 GET `/rest/cbpr/vigente`

- **Propósito:** la configuración vigente de UN producto y UN tipo de cartera, con bandas y
  rangos derivados. Es el detalle que abre la pantalla al seleccionar una celda del listado.
- **Request** (query params):

| Param | Tipo | Obligatorio |
|---|---|---|
| `idProducto` | Long | **sí** |
| `idEmpresa` | Long | **sí** |
| `tipoCartera` | Long (1 ó 2) | **sí** |
| `fecha` | `yyyy-MM-dd` | no — ausente = hoy |

```
GET /SaaBE/rest/cbpr/vigente?idProducto=7&idEmpresa=1236&tipoCartera=2&fecha=2026-09-01
```

- **Response 200:** un `ConfiguracionBandaDetalle` (la misma estructura que `porVencer` /
  `vencido` de §2.1). Ejemplo real del hipotecario vencido, la única configuración de
  **6 bandas**:

```json
{
  "idConfiguracion": 26,
  "idProducto": 7,
  "nombreProducto": "HIPOTECARIO",
  "idEmpresa": 1236,
  "tipoCartera": 2,
  "nombreTipoCartera": "VENCIDO",
  "fechaDesde": [2026, 9, 1],
  "fechaHasta": null,
  "editable": false,
  "estado": 1,
  "bandas": [
    { "idBanda": 126, "numero": 1, "periodos": 1,    "diaInicio": 1,   "diaFin": 30,   "etiqueta": "1 - 30",             "idPlanCuenta": 10690, "cuentaContable": "1.3.12.00", "nombreCuenta": "DE 1 A 30 DIAS",       "estado": 1 },
    { "idBanda": 127, "numero": 2, "periodos": 2,    "diaInicio": 31,  "diaFin": 90,   "etiqueta": "31 - 90",            "idPlanCuenta": 10549, "cuentaContable": "1.3.12.05", "nombreCuenta": "DE 31 A 90 DIAS",      "estado": 1 },
    { "idBanda": 128, "numero": 3, "periodos": 6,    "diaInicio": 91,  "diaFin": 270,  "etiqueta": "91 - 270",           "idPlanCuenta": 10550, "cuentaContable": "1.3.12.10", "nombreCuenta": "DE 91 A 270 DIAS",     "estado": 1 },
    { "idBanda": 129, "numero": 4, "periodos": 3,    "diaInicio": 271, "diaFin": 360,  "etiqueta": "271 - 360",          "idPlanCuenta": 10551, "cuentaContable": "1.3.12.15", "nombreCuenta": "DE 271 A 360 DIAS",    "estado": 1 },
    { "idBanda": 130, "numero": 5, "periodos": 12,   "diaInicio": 361, "diaFin": 720,  "etiqueta": "361 - 720",          "idPlanCuenta": 10552, "cuentaContable": "1.3.12.20", "nombreCuenta": "DE 361 A 720 DIAS",    "estado": 1 },
    { "idBanda": 131, "numero": 6, "periodos": null, "diaInicio": 721, "diaFin": null, "etiqueta": "mas de 720 (resto)", "idPlanCuenta": 10510, "cuentaContable": "1.3.12.25", "nombreCuenta": "DE MAS DE 720 DIAS",   "estado": 1 }
    ]
}
```

> Nótese que los rangos derivados coinciden exactamente con los nombres de las cuentas del
> plan (`DE 91 A 270 DIAS` ↔ `"91 - 270"`). Es la comprobación más rápida de que la
> parametrización está bien cargada.

- **Errores:**

| Condición | Respuesta |
|---|---|
| falta `idProducto` / `idEmpresa` | `500` `"Error al obtener la configuracion vigente: El producto es obligatorio"` / `"... La empresa es obligatoria"` |
| `tipoCartera` ausente o distinto de 1/2 | `500` `"... Tipo de cartera invalido: 5. Valores permitidos: 1 = por vencer, 2 = vencido"` |
| no hay configuración vigente | `500` `"... No hay configuracion de bandas vigente al 2026-09-01 para el producto 21, empresa 1236, tipo de cartera POR VENCER"` |

---

### 2.3 GET `/rest/cbpr/historial`

- **Propósito:** todas las configuraciones de una terna, vigentes y cerradas, de la más
  reciente a la más antigua, cada una con sus bandas. Para auditoría y para explicar por
  qué un reproceso de un mes viejo da otras cuentas.
- **Request:** `idProducto`, `idEmpresa`, `tipoCartera` (los tres obligatorios).

```
GET /SaaBE/rest/cbpr/historial?idProducto=2&idEmpresa=1236&tipoCartera=1
```

- **Response 200:** `ConfiguracionBandaDetalle[]` (misma estructura de §2.2). **Lista vacía
  `[]` si esa terna nunca se parametrizó** — no es error.
- **Errores:** los mismos de §2.2 por parámetros faltantes o `tipoCartera` inválido.

---

### 2.4 POST `/rest/cbpr/guardarConfiguracion`

- **Propósito:** grabar una configuración COMPLETA —cabecera más bandas— en una sola
  transacción. Es el botón "Guardar" de la pantalla.
- **Request body** (`SolicitudConfiguracionBanda`). El ejemplo es el alta pendiente de la
  cartera POR VENCER del producto **22 PRENDARIO NOVACION**, que hoy no tiene configuración:

```json
{
  "idConfiguracion": null,
  "idProducto": 22,
  "idEmpresa": 1236,
  "tipoCartera": 1,
  "fechaDesde": "2026-10-01",
  "fechaHasta": null,
  "usuario": "MSANCHEZ",
  "ip": "192.168.1.40",
  "bandas": [
    { "numero": 1, "periodos": 1,    "idPlanCuenta": 0 },
    { "numero": 2, "periodos": 2,    "idPlanCuenta": 0 },
    { "numero": 3, "periodos": 3,    "idPlanCuenta": 0 },
    { "numero": 4, "periodos": 6,    "idPlanCuenta": 0 },
    { "numero": 5, "periodos": null, "idPlanCuenta": 0 }
  ]
}
```

> ⚠ Los `idPlanCuenta` van en `0` a propósito: en la BD local la familia **1.3.06**
> (prendarios renovados) existe solo como cabecera (`PLNNCDGO` 9449) y **todavía no tiene
> las subcuentas** `.05`…`.25`. Hasta que contabilidad las cree, esta llamada devuelve
> `La cuenta contable 0 de la banda 1 no existe`. Los códigos reales se obtienen de
> `GET /rest/cbpr/cuentas` (§4.3). Mismo caso para el producto 21 con la familia 1.3.10
> (`PLNNCDGO` 9453).

| Campo | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `idConfiguracion` | Long | no | `null` = **alta**. Con valor = **edición en el lugar**, y solo si la vigencia no empezó |
| `idProducto` | Long | sí en el alta | en la edición se ignora: una configuración no cambia de producto |
| `idEmpresa` | Long | sí en el alta | ídem |
| `tipoCartera` | Long | sí en el alta | 1 ó 2; ídem |
| `fechaDesde` | `"yyyy-MM-dd"` | **sí** | inicio de vigencia |
| `fechaHasta` | `"yyyy-MM-dd"` | no | `null` = vigencia abierta, que es lo normal |
| `usuario` / `ip` | String | no | auditoría |
| `bandas[]` | array | **sí**, no vacío | ver validaciones abajo |
| `bandas[].numero` | Long | **sí** | 1..N consecutivo, en el orden del array |
| `bandas[].periodos` | Long | **sí salvo la última** | `null` = banda abierta; >= 1 en las demás |
| `bandas[].idPlanCuenta` | Long | **sí** | cuenta activa, de movimiento y de la misma empresa |

- **Response 200:** el `ConfiguracionBandaDetalle` grabado, con los rangos ya derivados —
  misma estructura de §2.2. La pantalla puede pintar la respuesta directamente sin volver a
  consultar.

- **Errores** (todos `500` con `"Error al guardar la configuracion de bandas: " + mensaje`;
  el mensaje es apto para mostrar al usuario):

| Condición | Mensaje |
|---|---|
| `bandas` vacío o ausente | `La configuracion debe tener al menos una banda` |
| números no consecutivos | `Los numeros de banda deben ser consecutivos desde 1; en la posicion 3 se recibio 4` |
| `periodos: null` en una banda que no es la última | `Solo la ULTIMA banda puede tener periodos nulos (banda abierta); la banda 3 de 5 los tiene` |
| ninguna banda abierta / más de una | `La configuracion debe tener EXACTAMENTE una banda abierta (periodos nulos) y debe ser la ultima; se encontraron 0` |
| `periodos` < 1 | `Los periodos de la banda 2 deben ser mayores o iguales a 1; se recibio 0` |
| `idPlanCuenta` ausente | `La cuenta contable de la banda 4 es obligatoria` |
| cuenta inexistente | `La cuenta contable 99999 de la banda 1 no existe` |
| cuenta inactiva | `La cuenta contable 1.3.01.05 de la banda 1 no esta activa` |
| cuenta de otra empresa | `La cuenta contable 1.3.01.05 de la banda 1 pertenece a otra empresa` |
| `tipoCartera` inválido | `Tipo de cartera invalido: 3. Valores permitidos: 1 = por vencer, 2 = vencido` |
| `fechaDesde` ausente | `La fecha desde de la vigencia es obligatoria` |
| `fechaHasta` anterior a `fechaDesde` | `La fecha hasta (2026-08-01) no puede ser anterior a la fecha desde (2026-09-01)` |
| ya hay una configuración vigente de esa terna | `Ya existe la configuracion 1 vigente desde el 2026-09-01 para ese producto, empresa y tipo de cartera. Solo puede haber una configuracion vigente a la vez: cierre la anterior antes de crear otra` |
| se intenta editar una configuración ya vigente | `La configuracion 1 ya esta vigente desde el 2026-09-01: no se puede editar en el lugar. Use el cierre de vigencia para crear una configuracion nueva a partir de una fecha` |
| producto / empresa inexistentes | `No existe el producto 999` / `No existe la empresa 999` |

- **Notas:**
  - El array `bandas` se lee **en orden**: la última posición es la que debe traer
    `periodos: null`.
  - En la edición, el juego de bandas se **reemplaza completo** (se borran las anteriores y
    se insertan las nuevas). Los `idBanda` cambian; el frontend debe releer los de la
    respuesta.
  - Es la vía por la que se regularizarán los productos 21 y 22 cuando contabilidad cree
    las subcuentas de 1.3.06 y 1.3.10.

---

### 2.5 POST `/rest/cbpr/cerrarVigencia`

- **Propósito:** cambio normativo. Cierra la vigencia de la configuración actual y abre una
  nueva desde la fecha indicada. **Es el único camino para cambiar una configuración cuya
  vigencia ya empezó**; la vieja queda íntegra para reprocesos y auditoría.
- **Request body** (`SolicitudCierreVigencia`):

```json
{
  "idConfiguracionVigente": 1,
  "fechaDesdeNueva": "2027-01-01",
  "usuario": "MSANCHEZ",
  "ip": "192.168.1.40",
  "bandas": [
    { "numero": 1, "periodos": 1,    "idPlanCuenta": 10279 },
    { "numero": 2, "periodos": 2,    "idPlanCuenta": 10280 },
    { "numero": 3, "periodos": 3,    "idPlanCuenta": 10281 },
    { "numero": 4, "periodos": 3,    "idPlanCuenta": 10282 },
    { "numero": 5, "periodos": null, "idPlanCuenta": 10283 }
  ]
}
```

| Campo | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `idConfiguracionVigente` | Long | **sí** | configuración a cerrar; debe tener `fechaHasta` en `null` |
| `fechaDesdeNueva` | `"yyyy-MM-dd"` | **sí** | posterior al `fechaDesde` de la que se cierra |
| `usuario` / `ip` | String | no | auditoría |
| `bandas[]` | array | **sí**, no vacío | mismas validaciones que §2.4 |

El producto, la empresa y el tipo de cartera de la configuración nueva **se heredan** de la
que se cierra: no se mandan.

- **Response 200:** el `ConfiguracionBandaDetalle` de la configuración **NUEVA** (misma
  estructura de §2.2), con `fechaDesde = fechaDesdeNueva` y `fechaHasta: null`.
- **Efecto sobre la vieja:** queda con `fechaHasta = fechaDesdeNueva - 1 día`. Las dos
  vigencias quedan contiguas: sin traslape y sin hueco. Para verla, `GET /rest/cbpr/historial`.
- **Errores** (`500` con `"Error al cerrar la vigencia de la configuracion: " + mensaje`):

| Condición | Mensaje |
|---|---|
| falta `idConfiguracionVigente` | `La configuracion vigente a cerrar es obligatoria` |
| falta `fechaDesdeNueva` | `La fecha desde de la configuracion nueva es obligatoria` |
| la configuración ya estaba cerrada | `La configuracion 1 ya fue cerrada el 2026-12-31` |
| `fechaDesdeNueva` no posterior | `La fecha desde de la configuracion nueva (2026-08-01) debe ser posterior a la fecha desde de la configuracion que se cierra (2026-09-01)` |
| configuración inexistente | `No existe la configuracion de bandas 999` |
| bandas inválidas | los mismos mensajes de §2.4 |

---

### 2.6 GET `/rest/bndp/getByConfiguracion/{idConfiguracion}`

- **Propósito:** las bandas activas de una configuración con el rango derivado, cuando la
  pantalla ya tiene el `idConfiguracion` y no necesita la cabecera otra vez.
- **Response 200:** `BandaProductoDetalle[]` — el mismo objeto que va dentro de `bandas` en
  §2.1/§2.2:

```json
[
  { "idBanda": 1, "numero": 1, "periodos": 1,    "diaInicio": 1,   "diaFin": 30,   "etiqueta": "1 - 30",             "idPlanCuenta": 10279, "cuentaContable": "1.3.01.05", "nombreCuenta": "DE 1 A 30 DIAS",     "estado": 1 },
  { "idBanda": 5, "numero": 5, "periodos": null, "diaInicio": 361, "diaFin": null, "etiqueta": "mas de 360 (resto)", "idPlanCuenta": 10283, "cuentaContable": "1.3.01.25", "nombreCuenta": "DE MAS DE 360 DIAS", "estado": 1 }
]
```

- **Errores:** `500` `"Error al obtener las bandas de la configuracion: La configuracion es
  obligatoria"` si falta el path param. Una configuración que existe pero no tiene bandas
  devuelve `[]`.

---

## 3. Endpoint de VERIFICACIÓN

### GET `/rest/cbpr/clasificar`

- **Propósito:** **endpoint de verificación**, no de proceso. Clasifica una antigüedad en
  días contra la parametrización vigente y devuelve la banda y la cuenta que le tocan.
  Existe para que QA y el frontend comprueben que lo cargado hace lo que el usuario espera.
- **Ningún proceso contable lo consume:** los procesos llaman al
  `ClasificadorBandaService` por EJB. Si un día la pantalla necesitara clasificar en
  producción, hay que revisar el caso, no reutilizar este endpoint por inercia.
- **Request** (query params): `idProducto`, `idEmpresa`, `tipoCartera`, `dias`
  (obligatorios), `fecha` (`yyyy-MM-dd`, ausente = hoy).

```
GET /SaaBE/rest/cbpr/clasificar?idProducto=2&idEmpresa=1236&tipoCartera=1&dias=45&fecha=2026-09-01
```

- **Response 200:**

```json
{
  "idConfiguracion": 1,
  "idProducto": 2,
  "idEmpresa": 1236,
  "tipoCartera": 1,
  "fecha": [2026, 9, 1],
  "dias": 45,
  "banda": {
    "idBanda": 2,
    "numero": 2,
    "periodos": 2,
    "diaInicio": 31,
    "diaFin": 90,
    "etiqueta": "31 - 90",
    "idPlanCuenta": 10280,
    "cuentaContable": "1.3.01.10",
    "nombreCuenta": "DE 31 A 90 DIAS",
    "estado": 1
  }
}
```

- **Casos de prueba sugeridos** (contra la carga inicial de la BD local, empresa 1236):

| `idProducto` | `tipoCartera` | `dias` | Banda esperada | Cuenta |
|---|---|---|---|---|
| 2 | 1 | 1 | 1 (`1 - 30`) | 1.3.01.05 |
| 2 | 1 | 30 | 1 (`1 - 30`) | 1.3.01.05 |
| 2 | 1 | 31 | 2 (`31 - 90`) | 1.3.01.10 |
| 2 | 1 | 360 | 4 (`181 - 360`) | 1.3.01.20 |
| 2 | 1 | 361 | 5 (`mas de 360 (resto)`) | 1.3.01.25 |
| 2 | 1 | 5000 | 5 (banda abierta) | 1.3.01.25 |
| 2 | 2 | 271 | 5 (`mas de 270 (resto)`) | 1.3.04.25 |
| 7 | 2 | 270 | 3 (`91 - 270`) | 1.3.12.10 |
| 7 | 2 | 721 | 6 (`mas de 720 (resto)`) | 1.3.12.25 |

- **Errores** (`500` con `"Error al clasificar la banda: " + mensaje`):

| Condición | Mensaje |
|---|---|
| `dias` ausente | `Los dias son obligatorios para clasificar la banda` |
| `dias` < 1 (incluye 0 y negativos) | `Los dias deben ser mayores o iguales a 1; se recibio 0` |
| falta producto / empresa | `El producto es obligatorio para clasificar la banda` / `La empresa es obligatoria ...` |
| `tipoCartera` inválido | `Tipo de cartera invalido: 3. Valores permitidos: 1 = por vencer, 2 = vencido` |
| sin configuración vigente | `No hay configuracion de bandas vigente al 2026-09-01 para el producto 21, empresa 1236, tipo de cartera POR VENCER` |
| configuración sin bandas | `La configuracion de bandas 5 no tiene bandas activas` |
| configuración sin banda abierta | `Ninguna banda cubre 400 dias: la configuracion termina en el dia 360 y no tiene banda abierta` |

---

## 4. Catálogos que consume la pantalla

### 4.1 Tipo de cartera

No hay endpoint: son dos valores fijos, `1` = POR VENCER y `2` = VENCIDO. Cablearlos en el
frontend (constante local) es correcto — el CHECK `CK_CBPR_TPCR IN (1,2)` de la base los
fija igual.

### 4.2 Productos

`GET /rest/cbpr/listado` **ya trae todos los productos** con su nombre, código SBS, tipo de
préstamo y estado. La pantalla no necesita un catálogo de productos aparte. Si aun así hace
falta, el CRUD estándar existe: `GET /rest/prdc/getAll`.

### 4.3 Cuentas del plan (buscador de la columna "cuenta")

### GET `/rest/cbpr/cuentas`

- **Propósito:** alimentar el buscador de cuenta contable de cada banda.
- **Por qué no `GET /rest/plnn/getByEmpresa/{id}`:** ese devuelve las **1.542** cuentas de
  la empresa, incluidas las de acumulación, con la naturaleza y la empresa expandidas en
  cada fila. Este devuelve solo cuentas **activas y de MOVIMIENTO** (las únicas que pueden
  recibir saldo) filtradas por texto, en un objeto de tres campos.
- **Request** (query params):

| Param | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `idEmpresa` | Long | **sí** | |
| `filtro` | String | no | busca en el número de cuenta **o** en el nombre, sin distinguir mayúsculas; ausente = todas las de movimiento activas |

```
GET /SaaBE/rest/cbpr/cuentas?idEmpresa=1236&filtro=1.3.01
```

- **Response 200:** `CuentaBandaDisponible[]`, ordenadas por número de cuenta:

```json
[
  { "idPlanCuenta": 10279, "cuentaContable": "1.3.01.05", "nombre": "DE 1 A 30 DIAS" },
  { "idPlanCuenta": 10280, "cuentaContable": "1.3.01.10", "nombre": "DE 31 A 90 DIAS" },
  { "idPlanCuenta": 10281, "cuentaContable": "1.3.01.15", "nombre": "DE 91 A 180 DIAS" },
  { "idPlanCuenta": 10282, "cuentaContable": "1.3.01.20", "nombre": "DE 181 A 360 DIAS" },
  { "idPlanCuenta": 10283, "cuentaContable": "1.3.01.25", "nombre": "DE MAS DE 360 DIAS" }
]
```

- **Errores:** `500` `"Error al buscar cuentas contables: La empresa es obligatoria"`.
- **Notas:** sin `filtro` devuelve todas las cuentas de movimiento activas de la empresa —
  conviene que la pantalla exija al menos 2 ó 3 caracteres antes de llamar.

### 4.4 Empresa

La pantalla trabaja con **una** empresa. En local y pruebas ASOPREP es el nodo
`SCP.PJRQ` **1236** (no el 280 "ASOPREP ANTERIOR"). En producción se resuelve con
`SELECT PJRQCDGO, PJRQNMBR FROM SCP.PJRQ WHERE PGSPCDGO = 12` — ver control 1.1 de
`CARGA-INICIAL-BANDAS-PRODUCTO.md`.

---

## 5. Lo que esta fase NO incluye

Fuera de alcance de la Fase 1, no lo pidas al backend todavía: apertura/cierre contable
mensual, asiento de vencidos, asiento de cambio de bandas, integración con pagos, y el
saneamiento de las plantillas contables (§8.3 del levantamiento). Son fases posteriores.
