# Especificación para el Frontend — Pantallas de Pagos (CXP) y Cobros (CXC)

> **Para quién es este documento:** para el equipo/agente que va a construir el
> frontend de este módulo. Es una especificación **prescriptiva**: qué pantallas
> crear, qué campos y botones tiene cada una, qué endpoint llama cada acción, qué
> hacer con la respuesta, y el flujo completo de negocio de principio a fin. La
> intención es que la única pregunta que quede pendiente hacia el usuario/dueño
> del producto sea **en qué opción de menú ubicar cada pantalla** — todo lo demás
> (campos, validaciones, estados, flujo) ya está decidido y descrito aquí.
>
> **No preguntes por decisiones de negocio ya tomadas** (formato de los datos,
> qué botones existen, en qué orden va el flujo, qué pasa en cada estado): están
> en este documento. Si algo no está claro después de leerlo completo, es
> preferible señalar la ambigüedad puntual antes de inventar un comportamiento.
>
> **Fotografía del backend al 2026-08-11** — verificar contra el código si pasa
> el tiempo: `com.saa.ws.rest.cxp.AplicacionPagoCxpRest` (`/aplp`),
> `com.saa.ws.rest.cxp.PagoProgramadoRest` (`/pgtr`),
> `com.saa.ws.rest.cxc.AplicacionPagoCxcRest` (`/aplc`).
>
> **Fuera de alcance de este documento:** el registro de Anticipos (a
> proveedores o a clientes) tiene su **propia pantalla, ya existente y en
> funcionamiento**, independiente de todo lo de aquí (`/antp` para proveedores,
> `/antc` para clientes — no se documentan en detalle porque no hay que
> construirlos). Lo único que este módulo hace con los anticipos es
> **cruzarlos contra una factura** una vez que ya existen y tienen saldo — eso
> sí es parte de las pantallas descritas abajo (§2.2 y §4.2).
>
> Contexto de negocio en `REQUERIMIENTO-PAGOS-COBROS.md`; detalle técnico
> interno del backend en `PLAN-TECNICO-PAGOS-COBROS.md` (misma carpeta) — esos
> dos documentos son para quien mantiene el backend, no hace falta leerlos para
> construir el frontend.

---

## 0. El problema de negocio, en una frase

Una factura (de compra o de venta) se puede ir abonando de varias formas —
retenciones, notas de crédito/débito, anticipos, transferencias — y cada
abono debe quedar visible en la factura, con su saldo actualizado en tiempo
real. Las retenciones y NC/ND se aplican **solas**, automáticamente, cuando
se emiten/cargan esos documentos — el frontend no hace nada para eso, solo
las **muestra** en el historial. Lo único que el usuario opera manualmente
desde pantallas de tesorería es: **cruzar un anticipo** o **pagar/cobrar por
transferencia bancaria**.

---

## 1. Convenciones generales (leer antes de todo lo demás)

- **Base URL:** `/SaaBE/rest`. Ejemplo completo: `/SaaBE/rest/aplp/saldo/123`.
- Todos los endpoints (salvo uno, marcado explícitamente) usan
  `Content-Type: application/json` en request y response.
- **Formato de error:** el backend NO devuelve `{ "error": "..." }`. Devuelve
  el mensaje **directamente como string JSON**, con el status HTTP que
  corresponda:
  ```
  HTTP 400 / 404 / 500
  Content-Type: application/json

  "El valor a cruzar debe ser mayor a cero."
  ```
  Esos mensajes ya están redactados en español para mostrarse tal cual al
  usuario (en un toast, un banner de error, etc.) — no hace falta
  reinterpretarlos ni mapearlos a un catálogo de errores propio.
- **Fechas** que el frontend envía (`fechaAplicacion`, `fechaCobro`,
  `fechaProgramada`) van como texto `yyyy-MM-dd`. Si se omiten o vienen mal
  formadas, el backend usa la fecha de hoy — no es necesario bloquear el
  envío del formulario por eso, pero sí es mejor UX exigir una fecha válida
  en el cliente.
- **Montos**: `Double`, sin separador de miles, punto decimal (`1500.00`).
- Las respuestas de una **acción** (cruzar anticipo, cobrar, revertir,
  anular, etc.) son siempre un objeto con al menos `exito` (boolean) y
  `mensaje` (string) — pensado para mostrarse directo en una notificación de
  éxito/error.
- **Todo dato de catálogo (empresa, usuario, cuentas bancarias, proveedor,
  cliente) se asume ya resuelto por otras pantallas del sistema** (selects,
  autocompletar, sesión del usuario logueado). Este documento no cubre esos
  catálogos.

### Catálogos que el frontend necesita para pintar etiquetas y badges

**`tipoDocPago`** — de cada fila del historial de abonos de una factura
(`AplicacionPagoCxp` / `AplicacionPagoCxc`). Define qué ícono/etiqueta
mostrar y si la fila fue creada automáticamente o desde una pantalla:

| Valor | Significado | ¿Quién la crea? |
|---|---|---|
| 1 | Pago/Cobro directo por transferencia | Pantalla de transferencia (§3 / §4.3) |
| 2 | Nota de Crédito | Automático — no se crea desde el frontend |
| 3 | Retención | Automático — no se crea desde el frontend |
| 4 | Anticipo (cruce) | Pantalla de cruce de anticipo (§2.2 / §4.2) |
| 5 | Nota de Débito (**monto negativo** — aumenta el saldo) | Automático — no se crea desde el frontend |

**`estado`** de una fila de abono (`AplicacionPagoCxp`/`Cxc`): `1`=Activo,
`2`=Reversado. Una fila reversada se muestra tachada/atenuada y ya no cuenta
para el saldo.

**`estadoPago`** de la factura (viene en la propia factura y en la respuesta
de `saldo`): `1`=Pendiente, `2`=Pagada parcial, `3`=Pagada total. Usar para
el badge de la cabecera de la factura:

| estadoPago | Texto sugerido | Color sugerido |
|---|---|---|
| 1 | Pendiente | neutro/gris |
| 2 | Pago parcial | amarillo/naranja |
| 3 | Pagada | verde |

**`estado`** de un `PagoProgramado` (solo CXP — ciclo del pago por
transferencia, ver §3):

| Valor | Texto sugerido | Qué significa | Acciones disponibles en esa fila |
|---|---|---|---|
| 1 | Registrado | Recién creado, todavía no se envió al banco | Seleccionar para lote · Anular |
| 2 | En archivo | Ya está en un archivo enviado al banco, esperando respuesta | Anular |
| 3 | Confirmado | El banco lo ejecutó — ya generó asiento y movimiento bancario | Revertir |
| 4 | Rechazado | El banco no lo ejecutó, o fue revertido tras confirmarse | (ninguna — solo lectura; para reintentar, registrar un pago nuevo) |
| 5 | Anulado | El usuario lo canceló antes de enviarlo al banco | (ninguna — solo lectura) |

**`estado`** de un `LotePago`: `1`=Generado, `2`=Respuesta procesada,
`3`=Anulado.

---

## 2. CXP — Pantallas de Pagos a Proveedores

### 2.1 Pantalla / Widget: **Historial y saldo de una Factura de Compra**

**Dónde vive:** no es una pantalla independiente — es una sección dentro del
detalle de una factura de compra ya existente en el sistema (donde sea que
el usuario vea "Factura N° ...").

**Al abrir el detalle de la factura:**
1. `GET /aplp/saldo/{idFactura}` → cabecera con total, aplicado, saldo
   pendiente y el badge de `estadoPago` (tabla de §1).
2. `GET /aplp/factura/{idFactura}?soloActivas=true` → tabla de movimientos.

**Response de `GET /aplp/saldo/{idFactura}`:**
```json
{
  "facturaId": 123,
  "numeroFactura": "001-001-000000123",
  "total": 1500.00,
  "totalAplicado": 545.00,
  "saldoPendiente": 955.00,
  "estadoPago": 2
}
```

**Response de `GET /aplp/factura/{idFactura}`** (array de filas para la
tabla):
```json
[
  {
    "id": 45,
    "tipoDocPago": 3,
    "notaCredito": null,
    "retencion": null,
    "retencionV2": { "id": 88, "numero": "001-001-000000045" },
    "notaDebito": null,
    "anticipo": null,
    "formaPago": null,
    "referencia": null,
    "banco": null,
    "montoAplicado": 45.00,
    "fechaAplicacion": "2026-08-07",
    "observacion": "Retención V2 N° 001-001-000000045",
    "estado": 1,
    "usuario": { "codigo": 5, "nombre": "..." },
    "asiento": { "codigo": 990, "numeroAlterno": "AS-000990" },
    "fechaRegistro": "2026-08-07T10:15:32"
  }
]
```
Columnas sugeridas de la tabla: fecha, tipo (mapeado con la tabla de
`tipoDocPago` de §1), documento relacionado (el que venga no-nulo entre
`notaCredito`/`retencion`/`retencionV2`/`notaDebito`/`anticipo` — mostrar su
`numero`; si los cinco vienen null es un pago directo, mostrar `referencia` +
`banco`), monto (en rojo si es negativo — nota de débito), estado, acciones.

**Acción "Revertir"** (solo en filas con `estado=1`): abre un modal pidiendo
**motivo** (texto obligatorio) →
`POST /aplp/revertir/{id}` con body `{ "motivo": "...", "idUsuario": <id sesión> }`.
Al volver `200 OK`, refrescar el saldo (paso 1) y la tabla (paso 2). Si
falla, mostrar `mensaje` del error tal cual.

**Botones de la cabecera** (visibles solo si `saldoPendiente > 0`):
- **"Cruzar anticipo"** → abre la pantalla de §2.2, pre-cargada con esta
  factura.
- **"Ir a Pagos"** → navega a la pantalla de registrar pago (§3.1),
  pre-cargada con esta factura. (El pago en sí no se hace desde aquí — desde
  aquí solo se navega.)

---

### 2.2 Pantalla: **Cruce de Anticipo — Proveedor**

Se usa cuando el proveedor tiene saldo de anticipos (ya entregado
previamente, por la pantalla de Anticipos que está fuera de este alcance) y
el usuario quiere aplicar parte de ese saldo contra una factura pendiente.

**Cómo se llega:** desde el botón "Cruzar anticipo" del detalle de factura
(§2.1), o desde un flujo donde el usuario elige primero el proveedor y luego
la factura.

**Campos del formulario:**
| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Factura de compra | selector (ya resuelto si se llega desde §2.1) | Sí | `idFacturaCompra` |
| Valor a cruzar | numérico | Sí | debe ser > 0 |
| Fecha de aplicación | fecha | No | default hoy |
| Observación | texto libre | No | |

**Antes de habilitar el botón "Confirmar"**, si el frontend ya tiene el dato
del saldo de anticipos disponible del proveedor (ver nota abajo), validar en
cliente que `valor <= saldoPendienteFactura` y `valor <= saldoAnticipos`. El
backend igual revalida todo — esta validación en cliente es solo para dar
feedback inmediato, no reemplaza el manejo de errores del submit.

> ⚠️ **Nota para quien construya esto:** hoy no existe un endpoint aislado
> para consultar "cuánto saldo de anticipos tiene el proveedor X" antes de
> intentar el cruce — ese dato solo vuelve como parte de la respuesta de la
> propia acción de cruce (`saldoAnticipos` abajo). Si la pantalla necesita
> mostrarlo **antes** de que el usuario confirme (por ejemplo, "tienes $75
> disponibles" al lado del campo de valor), hay que pedir ese endpoint al
> backend antes de construir esa parte — no inventar un cálculo en el
> frontend. El resto de la pantalla se puede construir igual mientras tanto.

**Al confirmar:** `POST /aplp/anticipo`
```json
{
  "idFacturaCompra": 123,
  "valor": 225.00,
  "fechaAplicacion": "2026-08-11",
  "idEmpresa": 1,
  "idUsuario": 5,
  "observacion": "Cruce parcial"
}
```
Requeridos: `idFacturaCompra`, `valor`, `idEmpresa` (400 si faltan).

**Response `200 OK`:**
```json
{
  "exito": true,
  "mensaje": "Anticipo cruzado correctamente.",
  "aplicacion": 46,
  "asiento": "AS-000991",
  "saldoAnticipos": 75.00,
  "facturaId": 123,
  "numeroFactura": "001-001-000000123",
  "total": 1500.00,
  "totalAplicado": 770.00,
  "saldoPendiente": 730.00,
  "estadoPago": 2
}
```
Mostrar `mensaje` como confirmación, y volver al detalle de la factura
(§2.1) con los datos ya actualizados (no hace falta volver a pedirlos, vienen
en esta misma respuesta).

**Errores de negocio típicos** (mostrar el `mensaje` del error tal cual):
factura inexistente, valor ≤ 0, saldo de la factura insuficiente, saldo de
anticipos insuficiente (el mensaje ya incluye el saldo real disponible),
proveedor sin cuenta contable de anticipos configurada (error de
configuración del sistema, no del usuario — igual se muestra el mensaje).

---

## 3. Pantalla: **Pagos a Proveedores por Transferencia** (el flujo largo)

Esta es la pantalla más compleja de todo el módulo. Tiene **4 sub-vistas**
secuenciales, que pueden ser 4 pestañas de una misma pantalla o 4 pasos de un
wizard — a discreción de quien construya el frontend, siempre que respeten
este orden y estas transiciones:

```
a) Registrar Pago  →  b) Seleccionar y Generar Archivo  →  c) Cargar Respuesta del Banco  →  d) Seguimiento
        (crea el pago,          (aprueba + genera el TXT           (confirma o rechaza          (anular / revertir /
         estado=1)               que se sube al banco,              cada pago del lote)           ver histórico)
                                  estado 1→2)
```

#### 3.1 a) Registrar Pago

**Campos:**
| Campo | Tipo | Obligatorio |
|---|---|---|
| Factura de compra a pagar | selector (o pre-cargado desde §2.1) | Sí |
| Cuenta bancaria propia de origen | selector (cuentas de Tesorería) | Sí |
| Cuenta bancaria del proveedor (destino) | selector (cuentas del titular) | No |
| Valor a pagar | numérico | Sí |
| Fecha programada | fecha | No (default hoy) |
| Observación | texto libre | No |

**Al confirmar:** `POST /pgtr`
```json
{
  "idFacturaCompra": 123,
  "idCuentaBancariaOrigen": 4,
  "idCuentaDestinoTitular": 9,
  "valor": 1500.00,
  "fechaProgramada": "2026-08-15",
  "idEmpresa": 1,
  "idUsuario": 5,
  "observacion": "Pago factura agosto"
}
```
Requeridos: `idFacturaCompra`, `idCuentaBancariaOrigen`, `valor`, `idEmpresa`.
`idCuentaDestinoTitular` opcional, pero si se envía debe ser una cuenta del
mismo proveedor de la factura (si no, error).

El backend valida que `valor` no supere el saldo pendiente de la factura
**descontando lo que ya está comprometido** en otros pagos vigentes de esa
misma factura (registrados o en archivo) — así que una factura puede tener
varios pagos parciales registrados a la vez, pero no se puede
sobre-comprometer.

**Response `201 CREATED`:**
```json
{
  "exito": true,
  "mensaje": "Pago registrado. Queda pendiente de incluirse en un archivo de pagos.",
  "pago": 501,
  "facturaId": 123,
  "numeroFactura": "001-001-000000123",
  "total": 1500.00,
  "totalAplicado": 0.00,
  "saldoPendiente": 1500.00,
  "estadoPago": 1
}
```
Nota importante para la UI: **el saldo de la factura no cambia todavía**
(`totalAplicado` sigue en 0) — registrar el pago no genera contabilidad. Eso
solo pasa cuando el banco confirma (paso c). Mostrar un mensaje de éxito
tipo "Pago registrado, aparecerá en la pantalla de selección para el próximo
archivo" y limpiar el formulario o navegar a §3.2.

#### 3.2 b) Seleccionar y Generar Archivo (= aprobar)

**Listado:** `GET /pgtr/listar?idEmpresa={id}&estado=1` → tabla con checkbox
por fila. Columnas sugeridas: proveedor, factura, valor, fecha programada,
cuenta de origen.

```json
[
  {
    "id": 501,
    "facturaCompra": { "id": 123, "numero": "001-001-000000123" },
    "titular": { "codigo": 9, "nombre": "Proveedor S.A." },
    "cuentaBancaria": { "codigo": 4, "numero": "...", "banco": { "nombre": "..." } },
    "cuentaDestino": { "id": 9, "numero": "...", "banco": { "nombre": "..." } },
    "valor": 1500.00,
    "fechaProgramada": "2026-08-15",
    "estado": 1,
    "observacion": "Pago factura agosto",
    "usuario": { "codigo": 5, "nombre": "..." },
    "fechaRegistro": "2026-08-07T09:00:00"
  }
]
```

**Regla de negocio clave para la UI:** el backend exige que **todos los
pagos seleccionados compartan la misma cuenta bancaria de origen**. Lo más
simple para el usuario es que la pantalla filtre/agrupe el listado por
cuenta de origen (un selector de cuenta arriba de la tabla) y solo permita
tildar filas de esa cuenta — así se evita que el usuario arme una selección
inválida y reciba el error recién al enviar.

**Al presionar "Generar archivo" (con la selección hecha):**
`POST /pgtr/lote`
```json
{
  "idsPagos": [501, 502, 503],
  "idCuentaOrigen": 4,
  "idEmpresa": 1,
  "idUsuario": 5
}
```
**No existe un paso de "aprobación" separado**: seleccionar los pagos y
generar el archivo **es** la aprobación. No agregar un botón ni un estado
adicional de "aprobar" — no existe en el backend.

**Response `200 OK`:**
```json
{
  "exito": true,
  "mensaje": "Archivo de pagos generado con 3 transferencia(s).",
  "idLote": 77,
  "nombreArchivo": "PAGOS_20260811_77.txt",
  "contenido": "...texto plano del archivo...",
  "valorTotal": 4200.00,
  "numeroPagos": 3
}
```
**El frontend debe disparar la descarga del archivo en el navegador** a
partir de `contenido` y `nombreArchivo`:
```js
const blob = new Blob([resultado.contenido], { type: "text/plain" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url; a.download = resultado.nombreArchivo; a.click();
URL.revokeObjectURL(url);
```
Tras esto, esos pagos pasan a estado 2 (En archivo) y desaparecen del
listado de selección (que sigue filtrando por `estado=1`). Mostrar
confirmación con `idLote`, `valorTotal` y `numeroPagos`, y ofrecer un link
"Ir a Seguimiento" (§3.4) o "Cargar respuesta del banco" (§3.3).

**Volver a descargar un lote ya generado** (por si el usuario perdió el
archivo): `GET /pgtr/lote/{idLote}/archivo` → mismo shape
`{ idLote, nombreArchivo, contenido }`. Útil como botón "Descargar" en la
pantalla de seguimiento (§3.4), por fila de lote.

**El formato de `contenido` es PROVISIONAL** (texto plano, no el formato
oficial del banco todavía). Esto no cambia nada del lado del frontend: el
contrato del endpoint (JSON con `contenido`/`nombreArchivo`) es estable, solo
el contenido interno del archivo cambiará el día que llegue el formato
oficial.

#### 3.3 c) Cargar Respuesta del Banco

**Pantalla:** selector/listado de lotes con respuesta pendiente (los que
están en estado 1=Generado — hoy no hay un endpoint de "listar lotes"; se
puede construir esta pantalla a partir de `idLote` conocido, ej. llegando
desde §3.2, o pedir al backend un endpoint de listado de lotes si se
necesita una bandeja general — ver nota de pendientes al final del
documento) + un control de carga de archivo (`<input type="file">`, se
espera un Excel).

**Al subir el archivo:** ⚠️ **este endpoint NO es JSON**:
```
POST /pgtr/lote/{idLote}/respuesta?idUsuario={idUsuarioSesion}
Content-Type: application/octet-stream
Body: <contenido binario crudo del archivo>
```
El frontend debe leer el `File` seleccionado como `ArrayBuffer` y mandarlo
tal cual en el body — **no usar `FormData` ni `multipart/form-data`**:
```js
const buffer = await file.arrayBuffer();
await fetch(`/SaaBE/rest/pgtr/lote/${idLote}/respuesta?idUsuario=${idUsuario}`, {
  method: "POST",
  headers: { "Content-Type": "application/octet-stream" },
  body: buffer,
});
```
`idUsuario` va en la **query string**, no en el body.

**Response `200 OK`:**
```json
{
  "exito": true,
  "mensaje": "Respuesta procesada: 2 confirmado(s), 1 rechazado(s).",
  "confirmados": 2,
  "rechazados": 1,
  "errores": ["Pago 503: no se pudo registrar el pago confirmado - ..."]
}
```
`errores` solo aparece si hubo filas del archivo que no se pudieron procesar
(pago inexistente en el sistema, no pertenece a este lote, ya estaba
procesado, o falló la generación del asiento de un confirmado — ese pago
puntual queda sin cambiar de estado y hay que investigarlo). Mostrar el
resumen (confirmados/rechazados/errores) en un panel de resultado, y
refrescar/navegar a §3.4 para ver los nuevos estados.

#### 3.4 d) Seguimiento de Pagos

**Listado:** `GET /pgtr/listar?idEmpresa={id}` (sin filtro de `estado`, o
con selector de estado para el usuario) — muestra pagos en cualquier estado,
con la columna de estado usando la tabla de §1 (Registrado / En archivo /
Confirmado / Rechazado / Anulado).

**Acción "Anular"** — visible en filas con estado 1, 2 o 4 (todavía no
confirmadas por el banco): modal pidiendo motivo →
`POST /pgtr/anular/{id}` con `{ "motivo": "...", "idUsuario": <sesión> }`.
```json
{ "exito": true, "mensaje": "Pago anulado correctamente.", "pago": 501 }
```

**Acción "Revertir"** — visible **solo** en filas con estado 3 (Confirmado);
dale más peso visual/confirmación (ej. un segundo modal de "¿estás
seguro?") porque esta acción sí deshace contabilidad ya generada: modal
pidiendo motivo → `POST /pgtr/revertirConfirmado/{id}` con
`{ "motivo": "...", "idUsuario": <sesión> }`.
```json
{
  "exito": true,
  "mensaje": "Pago reversado. Queda en seguimiento como rechazado.",
  "pago": 501,
  "aplicacion": 46,
  "facturaId": 123,
  "numeroFactura": "001-001-000000123",
  "total": 1500.00,
  "totalAplicado": 0.00,
  "saldoPendiente": 1500.00,
  "estadoPago": 1
}
```
Tras revertir, el pago pasa a estado 4 (Rechazado, para seguimiento) y la
factura recupera su saldo — si el usuario está viendo el detalle de la
factura (§2.1) al mismo tiempo, refrescarlo.

Para reintentar un pago Rechazado o Anulado, **no hay una acción de
"reintentar"**: el usuario simplemente registra un pago nuevo desde §3.1
sobre la misma factura.

---

## 4. CXC — Pantallas de Cobros a Clientes

Mucho más simple que CXP: no hay lote, ni archivo, ni respuesta del banco —
el cobro se registra y contabiliza **en un solo paso**.

### 4.1 Pantalla / Widget: **Historial y saldo de una Factura de Venta**

Igual que §2.1 pero con estos endpoints y esta entidad:
- `GET /aplc/saldo/{idFactura}` → mismo shape que `/aplp/saldo` (§2.1).
- `GET /aplc/factura/{idFactura}?soloActivas=true` → mismo shape que
  `/aplp/factura`, pero el objeto es `AplicacionPagoCxc`: usa el campo
  `factura` en vez de `facturaCompra` (y existe también un campo
  `liquidacion`, para liquidaciones de compra recibidas — hoy sin pantalla
  propia, se puede ignorar en la tabla si viene null, que es el caso normal).
- Acción "Revertir": `POST /aplc/revertir/{id}` — mismo contrato que
  `/aplp/revertir/{id}`.
- Botones de cabecera (si `saldoPendiente > 0`): **"Cruzar anticipo"** (→
  §4.2) y **"Registrar cobro"** (→ §4.3, no hay pantalla intermedia de
  "seguimiento" en CXC).

### 4.2 Pantalla: **Cruce de Anticipo — Cliente**

Misma UX que §2.2, mismo endpoint con nombres de campo distintos:
`POST /aplc/anticipo`
```json
{
  "idFactura": 123,
  "valor": 225.00,
  "fechaAplicacion": "2026-08-11",
  "idEmpresa": 1,
  "idUsuario": 5,
  "observacion": "Cruce parcial"
}
```
Requeridos: `idFactura`, `valor`, `idEmpresa`. Response y manejo de errores
idénticos a §2.2 (mismas claves: `exito`, `mensaje`, `aplicacion`, `asiento`,
`saldoAnticipos`, más el saldo de la factura). Aplica la misma nota sobre no
tener aún un endpoint de consulta aislada del saldo de anticipos.

### 4.3 Pantalla: **Registrar Cobro por Transferencia**

Un único formulario, sin pasos intermedios:

| Campo | Tipo | Obligatorio |
|---|---|---|
| Factura de venta | selector (o pre-cargada desde §4.1) | Sí |
| Valor recibido | numérico | Sí |
| Fecha del cobro | fecha | No (default hoy) |
| Número de transferencia | texto | **Sí** |
| Cuenta bancaria propia (donde se recibió) | selector | Sí |
| Observación | texto libre | No |

**Al confirmar:** `POST /aplc/cobroTransferencia`
```json
{
  "idFactura": 123,
  "valor": 500.00,
  "fechaCobro": "2026-08-11",
  "numeroTransferencia": "TRF-889977",
  "idCuentaBancaria": 4,
  "idEmpresa": 1,
  "idUsuario": 5,
  "observacion": "Abono parcial"
}
```
Requeridos: `idFactura`, `valor`, `idCuentaBancaria`, `idEmpresa`, y
`numeroTransferencia` no vacío (mensaje de error específico si falta —
mostrar la validación en cliente también, ya que es un campo obligatorio
propio del negocio, no solo técnico).

**Response `200 OK`:**
```json
{
  "exito": true,
  "mensaje": "Cobro registrado correctamente.",
  "aplicacion": 90,
  "asiento": "AS-001002",
  "facturaId": 123,
  "numeroFactura": "001-001-000000123",
  "total": 2000.00,
  "totalAplicado": 500.00,
  "saldoPendiente": 1500.00,
  "estadoPago": 2
}
```
A diferencia de CXP, esta acción **ya generó la contabilidad y el
movimiento bancario en el momento de la llamada** — no hay paso posterior de
confirmación. Mostrar el mensaje de éxito y volver al detalle de la factura
(§4.1) con los datos actualizados. El formulario admite volver a usarse
sobre la misma factura para **cobros parciales múltiples**, mientras tenga
saldo pendiente.

---

## 5. Flujo completo, de punta a punta (para no perder el hilo)

**CXP — pagar una factura de compra por transferencia:**
1. Usuario abre la factura → ve saldo pendiente (§2.1).
2. Va a "Pagos" → registra el pago (§3.1) → el pago queda "Registrado", el
   saldo de la factura **no cambia todavía**.
3. En algún momento (puede ser junto con otros pagos de otras facturas del
   mismo proveedor o de otros), el usuario entra a "Seleccionar pagos"
   (§3.2), tilda los que quiere pagar hoy, genera el archivo → se descarga
   el TXT, los pagos pasan a "En archivo".
4. El usuario sube el TXT al portal del banco (fuera del sistema) y, cuando
   el banco responde (típicamente un Excel), lo carga en "Cargar respuesta"
   (§3.3).
5. Los confirmados generan asiento contable y movimiento bancario en ese
   instante — recién ahí el saldo de la factura baja. Los rechazados quedan
   visibles en "Seguimiento" (§3.4) para reintentar (un pago nuevo) o dejar
   como histórico.
6. Si algo estaba mal (pago duplicado, monto incorrecto confirmado por
   error), desde "Seguimiento" se puede anular (si no confirmado) o revertir
   (si ya confirmado) — en ambos casos, con motivo obligatorio.

**CXP — cruzar un anticipo del proveedor contra una factura:** un solo paso
(§2.2), no pasa por el flujo de arriba.

**CXC — cobrar una factura de venta:** un solo paso (§4.3): el usuario
registra valor + transferencia recibida y queda contabilizado al instante.
Puede repetirse para cobros parciales.

**CXC — cruzar un anticipo del cliente contra una factura:** un solo paso
(§4.2), igual que su equivalente CXP.

---

## 6. Tabla de referencia rápida de endpoints

| Pantalla | Endpoint | Método |
|---|---|---|
| §2.1 Historial factura compra | `/aplp/saldo/{id}`, `/aplp/factura/{id}` | GET |
| §2.1 Revertir abono (CXP) | `/aplp/revertir/{id}` | POST |
| §2.2 Cruzar anticipo proveedor | `/aplp/anticipo` | POST |
| §3.1 Registrar pago | `/pgtr` | POST |
| §3.2 Listar pagos por seleccionar | `/pgtr/listar?estado=1` | GET |
| §3.2 Generar archivo (= aprobar) | `/pgtr/lote` | POST |
| §3.2 Re-descargar archivo de un lote | `/pgtr/lote/{id}/archivo` | GET |
| §3.3 Cargar respuesta del banco | `/pgtr/lote/{id}/respuesta?idUsuario=` | POST (octet-stream) |
| §3.4 Listar seguimiento | `/pgtr/listar` | GET |
| §3.4 Anular pago no confirmado | `/pgtr/anular/{id}` | POST |
| §3.4 Revertir pago confirmado | `/pgtr/revertirConfirmado/{id}` | POST |
| §4.1 Historial factura venta | `/aplc/saldo/{id}`, `/aplc/factura/{id}` | GET |
| §4.1 Revertir abono (CXC) | `/aplc/revertir/{id}` | POST |
| §4.2 Cruzar anticipo cliente | `/aplc/anticipo` | POST |
| §4.3 Registrar cobro por transferencia | `/aplc/cobroTransferencia` | POST |

---

## 7. Pendientes que pueden bloquear una parte específica (no todo el desarrollo)

Estos son huecos reales del backend — no son parte de "qué construir", son
avisos de qué pedir si al construir alguna pantalla hace falta:

1. **No hay endpoint para consultar el saldo de anticipos de un
   proveedor/cliente de forma aislada** (§2.2 / §4.2) — hoy solo se conoce
   como efecto colateral de la propia acción de cruce. Se puede construir la
   pantalla igual y mostrar el saldo recién en la respuesta del cruce; si se
   necesita mostrarlo *antes* de confirmar, pedirlo al backend.
2. **No hay endpoint para listar lotes** (§3.3) — solo se puede llegar a un
   lote conociendo su `idLote` (por ejemplo, justo después de generarlo en
   §3.2). Si se necesita una bandeja de "lotes pendientes de respuesta",
   pedirlo al backend.
3. **El formato del archivo TXT de salida y del Excel de respuesta son
   PROVISIONALES** — no bloquea construir la pantalla (el contrato JSON de
   los endpoints es estable), pero el contenido interno del archivo cambiará
   cuando llegue el formato oficial del banco.

**No hay más pendientes que bloqueen la construcción de estas pantallas.**
Todo lo demás — campos, validaciones, botones, estados, mensajes — ya está
definido arriba.
