# API — Cobros de crédito con aprobación de contabilidad (`CRD.CBCR`)

**Fecha:** 2026-08-29 · **Módulo:** CRD · **Base URL:** `/SaaBE/rest/cbcr`
**Estado:** contrato CONGELADO. Backend desplegado en producción el 2026-08-29 (DDL + WAR).
**Espejo:** `saaFE/docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md`

> **Por qué existe.** El backend de este circuito se construyó y se desplegó sin que el contrato
> quedara escrito en ningún lado. El frontend no tenía de dónde leerlo, y por eso **no existe
> todavía ninguna pantalla**. Es el mismo error que ya nos costó una tarde con los campos de
> devolución: cuando el contrato solo vive en el código, el otro lado inventa o se bloquea.

---

## 0. Qué cambia

Hasta hoy, cada cobro de crédito se aplicaba directo desde su pantalla. **Ahora todo cobro
recibido pasa por la bandeja de contabilidad**, igual que el archivo Petro:

```
CRÉDITO registra  →  CONTABILIDAD aprueba  →  CRÉDITO procesa
   (estado 1)          (estado 2)              (estado 3)
```

Contabilidad no revisa el cálculo del crédito. Responde **una sola pregunta**: *¿esta plata
realmente entró a la cuenta del banco?* Por eso lo que mira es el **comprobante digitalizado** y
la cuenta destino, no la distribución entre cuotas.

**Se necesitan DOS pantallas nuevas.** Ver §5.

---

## 1. Estados (rubro alterno **246**)

| Valor | Estado | Quién llega ahí | Qué se puede hacer después |
|---|---|---|---|
| 1 | `REGISTRADO` | Crédito, al registrar | Contabilidad: aprobar o rechazar. Crédito: anular |
| 2 | `APROBADO` | Contabilidad | Crédito: procesar. Crédito: anular |
| 3 | `PROCESADO` | Crédito | **Terminal.** Solo se revierte por el reverso de la operación |
| 4 | `RECHAZADO` | Contabilidad | Crédito: corregir y reenviar (vuelve a 1). Crédito: anular |
| 5 | `ANULADO` | Crédito | **Terminal** |

⚠️ **Quien anula es CRÉDITO, no contabilidad** — decisión del usuario. La anulación exige motivo
(`CK_CBCR_MTAN` lo garantiza en la base).

## 2. Tipos de operación (rubro alterno **245**)

| `tipoOperacion` | Qué es | Detalle que lleva |
|---|---|---|
| `PAGO_CUOTA` | Pago de cuota de un préstamo | 1 línea con `idPrestamo` |
| `PAGO_MULTIPLE` | Un pago repartido entre varios préstamos del mismo partícipe | N líneas con `idPrestamo` |
| `ABONO_CAPITAL` | Abono a capital | 1 línea con `idPrestamo` **y `modalidad` obligatoria** |
| `PRECANCELACION` | Precancelación total | 1 línea con `idPrestamo`, y **opcionalmente `aportes`** — ver abajo |
| `REGISTRO_APORTE` | Aporte recibido | N líneas con `idTipoAporte` y `periodoDevengo` |
| `ACUERDO_CONDONACION` | Cobro de un acuerdo de pago con condonación | 1 línea con `idAcuerdo`. **Todavía no operativo** — ver §7 |
| `COBRO_MIXTO` | **Un depósito repartido entre aportes Y varios préstamos** | N líneas, cada una con `idPrestamo` **XOR** `idTipoAporte` |

### `PRECANCELACION` mixta — depósito + consumo de aportes

En la práctica **no existe la precancelación 100% efectivo**: siempre mezcla saldos de aportes del
socio con un depósito o transferencia. La línea lo representa así:

```jsonc
{
  "idEntidad": 123, "tipoOperacion": "PRECANCELACION",
  "idCuentaBancaria": 5, "referencia": "TRF-990", "rutaRespaldo": "...",
  "valor": 800.00,                 // SOLO la parte de depósito
  "fecha": "2026-08-30", "usuario": "GROBAYO",
  "detalles": [{
    "idPrestamo": 67830,
    "valor": 800.00,               // el depósito, obligatorio > 0
    "aportes": [ { "idTipoAporte": 11, "valor": 300.00 },
                 { "idTipoAporte": 9,  "valor": 250.00 } ]
  }]
}
```

- **`valor` es SOLO el depósito**, no el total de la precancelación. El total **nunca se guarda**:
  se recalcula fresco al registrar y al procesar.
- **`aportes` es válido SOLO en `PRECANCELACION`.** Se rechaza en los otros seis tipos.
- **El depósito es obligatorio y > 0.** Si el socio cubre **todo** con aportes, la operación **no
  va por este circuito**: usa el endpoint directo de precancelación de siempre. No entra plata de
  afuera, así que no hay nada que contabilidad pueda verificar — misma regla que deja fuera a
  `pagarConAportes`.

### ⛔ `aportes` en PRECANCELACION ≠ línea de aporte en COBRO_MIXTO

Es la confusión más cara posible en este contrato, porque **el dinero va en direcciones opuestas**:

| | Qué significa | El saldo del socio |
|---|---|---|
| Línea con `idTipoAporte` en **`COBRO_MIXTO`** | El socio **ENTREGA** plata que se le acredita | **SUBE** |
| `aportes` dentro de la línea de **`PRECANCELACION`** | Se **CONSUME** saldo que ya tenía | **BAJA** |

Por eso son estructuras distintas y no un mismo campo reutilizado. **No las mezcles**: un cobro
mixto no lleva `aportes` en sus líneas, y una precancelación no lleva líneas de aporte.

⚠️ **El saldo se revalida al PROCESAR, no al registrar.** Entre los dos momentos pasa la aprobación
de contabilidad, y el socio pudo haber usado ese saldo. Si ya no alcanza, el proceso devuelve
`procesado: false` con el tipo de aporte y el monto que faltó.

### `COBRO_MIXTO` — por qué existe

Un depósito puede ir a aportes **y** a varios préstamos a la vez: es lo que hace la pantalla de
cobros personales. Sin este tipo habría que partirlo en **dos cobros** — y eso significa dos
aprobaciones de contabilidad para un solo depósito, y un reverso que deja la mitad aplicada.
Ocurrió en producción el 2026-08-30 y es lo que motivó el tipo.

**La regla que lo gobierna: un depósito = un cobro = una aprobación = un reverso.**

```jsonc
{
  "idEntidad": 123, "tipoOperacion": "COBRO_MIXTO",
  "idCuentaBancaria": 5, "referencia": "TRF-889", "rutaRespaldo": "...",
  "valor": 350.00, "fecha": "2026-08-30", "usuario": "GROBAYO",
  "detalles": [
    { "idPrestamo": 111, "valor": 150.00, "observacion": "..." },
    { "idPrestamo": 222, "valor": 100.00 },
    { "idTipoAporte": 9, "periodoDevengo": "2026-08-01", "valor": 100.00 }
  ]
}
```

- Cada línea trae **`idPrestamo` XOR `idTipoAporte`** — nunca los dos, nunca ninguno.
- La de préstamo **no** lleva `idTipoAporte` ni `periodoDevengo`; la de aporte **no** lleva
  `idPrestamo`.
- **Ninguna línea admite `modalidad` ni `idAcuerdo`.** `COBRO_MIXTO` no abona capital.
- El tipo de aporte debe ser **contabilizable** (tener cuenta en la plantilla 21). Se rechaza en el
  registro, no al procesar: mejor que falle antes que con el dinero ya adentro.
- `valor` de la cabecera cuadra con la suma del detalle (tolerancia $0.01).

**No hay endpoints nuevos:** aprobar, rechazar, reenviar, procesar y anular son los mismos.

**`modalidad`** (solo `ABONO_CAPITAL`, obligatoria ahí y **rechazada en todos los demás tipos**):

- `1` = mantiene el valor de cuota y **reduce el plazo**
- `2` = mantiene el plazo y **reduce la cuota**

---

## 3. Endpoints

### Lectura

| Verbo | Ruta | Devuelve |
|---|---|---|
| `GET` | `/rest/cbcr/getAll` | Todos. Para diagnóstico, no para pantalla |
| `GET` | `/rest/cbcr/getId/{id}` | **`{ cabecera, detalle }`** — ⚠️ viene ENVUELTO, ver abajo |
| `GET` | `/rest/cbcr/bandeja/{estado}` | Los cobros en ese estado. `1` para la bandeja de contabilidad, `2` para la de proceso de crédito |
| `GET` | `/rest/cbcr/bandejaAprobacion` | **La bandeja combinada de contabilidad**: cobros de crédito + cargas Petro pendientes, en una sola lista |
| `GET` | `/rest/cbcr/porEntidad/{idEntidad}` | Historial de cobros de un partícipe |

> `bandejaAprobacion` es la que va en la pantalla de contabilidad. Las filas traen un campo de
> **tipo** que distingue el cobro de crédito de la carga Petro: es **un tercer tipo de fila en una
> lista, no un tercer mecanismo**. No armes dos bandejas.

### Escritura

| Verbo | Ruta | Cuerpo | Quién |
|---|---|---|---|
| `POST` | `/rest/cbcr/registrar` | `SolicitudRegistroCobro` | Crédito |
| `POST` | `/rest/cbcr/{id}/aprobar` | `SolicitudAprobacionCobro` | Contabilidad |
| `POST` | `/rest/cbcr/{id}/rechazar` | `SolicitudAprobacionCobro` (**`motivo` obligatorio**) | Contabilidad |
| `POST` | `/rest/cbcr/{id}/reenviar` | `SolicitudEdicionCobro` | Crédito, sobre un RECHAZADO |
| `POST` | `/rest/cbcr/{id}/anular` | `SolicitudAprobacionCobro` (**`motivo` obligatorio**) | Crédito |
| `POST` | `/rest/cbcr/{id}/procesar` | `SolicitudAprobacionCobro` | Crédito, sobre un APROBADO |

⚠️ **`reenviar` NO es solo un cambio de estado: permite EDITAR.** Los motivos reales de rechazo
son "la referencia no coincide", "el comprobante está ilegible", "el valor no es el que entró" —
todos exigen corregir el dato, no reenviar lo mismo. Por eso su cuerpo es un `SolicitudEdicion`
completo. La pantalla de crédito tiene que abrir el cobro rechazado **en modo edición**, mostrando
el `motivoRechazo`.

---

## 4. Cuerpos

### `SolicitudRegistroCobro`

```jsonc
{
  "idEntidad": 12345,          // el partícipe
  "tipoOperacion": "PAGO_CUOTA",
  "idCuentaBancaria": 7,       // cuenta de la institución donde ENTRÓ el dinero (TSR.CNBC)
  "referencia": "TRF-889201",  // obligatoria
  "rutaRespaldo": "cobros/2026/08/comprobante-889201.pdf",  // obligatoria
  "valor": 350.00,
  "fecha": "2026-08-29",       // yyyy-MM-dd, LocalDate
  "observacion": "",
  "usuario": "GROBAYO",
  "detalles": [
    {
      "idPrestamo": 67830,
      "valor": 350.00,
      "modalidad": null,         // solo ABONO_CAPITAL
      "idTipoAporte": null,      // solo REGISTRO_APORTE
      "periodoDevengo": null,    // solo REGISTRO_APORTE, yyyy-MM-dd (primer día del mes)
      "observacion": null
    }
  ]
}
```

### `SolicitudAprobacionCobro`

```jsonc
{ "usuario": "CONTADOR1", "motivo": "El valor no coincide con el extracto" }
```

`motivo` es obligatorio en `rechazar` y `anular`; se ignora en `aprobar` y `procesar`.

### `SolicitudEdicionCobro`

Los mismos campos editables del registro (`idCuentaBancaria`, `referencia`, `rutaRespaldo`,
`valor`, `fecha`, `observacion`, `detalles`) más `usuario`. **No** lleva `idEntidad` ni
`tipoOperacion`: esos no se cambian, se anula y se registra de nuevo.

### Respuestas de ÉXITO — son TRES formas distintas, no una

**No hay sobre `{exito, etapa, mensaje, error, resultado}`** como en `RespuestaPago`/
`RespuestaDevolucion`. Acá el cuerpo es directamente el objeto, y hay que ramificar por
**código HTTP**, no por un campo `exito`.

| Endpoint | HTTP | Cuerpo |
|---|---|---|
| `registrar` | **201** | `ResultadoRegistroCobro` |
| `aprobar`, `rechazar`, `reenviar`, `anular` | **200** | La entidad `CobroCredito` completa |
| `procesar` | **200** | `ResultadoProcesoCobro` |

```jsonc
// ResultadoRegistroCobro
{ "idCobro": 41, "estado": 1, "valor": 350.00,
  "contabilidadActiva": false,        // si es false, los dos campos de asiento vienen null
  "idAsientoTransitorio": null, "numeroAsientoTransitorio": null,
  "mensaje": "..." }

// ResultadoProcesoCobro
{ "idCobro": 41, "estado": 3, "procesado": true, "mensaje": "..." }
```

### ⛔ `procesar` puede devolver HTTP 200 y NO haber procesado nada

`procesado: false` con `estado: 4` (RECHAZADO) **es un resultado VÁLIDO, no un error**: es el
rechazo automático por *staleness* — el monto registrado ya no coincide con el préstamo al momento
de procesar, porque alguien pagó algo en el medio.

**Ramificá por `procesado`, no por el código HTTP.** Si tratás el 200 como "salió bien" y mostrás
el mensaje verde, le vas a decir al usuario que el cobro se procesó cuando en realidad fue
rechazado y el dinero sigue sin aplicarse. Es un 200 que significa "no".

### Errores

**Siempre HTTP 500**, para todo: id inexistente, estado que no permite la transición, motivo
faltante, validación de negocio. **No hay 404 ni 409** — no los busques. Cuerpo:
`{"mensaje": "Error al ... : <detalle>"}`.

La única excepción es **HTTP 400 "Not able to deserialize data provided"**, que lo emite RESTEasy
antes de entrar al método cuando el cuerpo trae un campo desconocido. Ese es un bug del cliente, no
un error de negocio — conviene distinguirlo en `normalizarError()`.

### ⛔ `getId` NO devuelve un `CobroCredito` — viene envuelto

```jsonc
{
  "cabecera": { /* la entidad CobroCredito completa */ },
  "detalle":  [ /* List<DetalleCobroCredito> — las líneas del cobro */ ]
}
```

**`CobroCredito` NO tiene la lista de detalles mapeada como relación**, así que la entidad sola
**no trae las líneas**: el REST las consulta aparte y las devuelve al lado. Leer la respuesta como
si fuera un `CobroCredito` deja `rutaRespaldo` en `undefined` y el detalle vacío — la pantalla se
ve sin comprobante y sin valores, sin ningún error.

Fue exactamente el defecto reportado el 2026-08-30 en la bandeja de contabilidad, y la causa fue
este documento: decía "un cobro con su detalle" y más abajo que las lecturas devuelven la entidad
directa. **Las demás lecturas sí la devuelven directa; `getId` no.**

Cada línea de `detalle` trae `prestamo`, `tipoAporte`, `periodoDevengo`, `valor`, `modalidad`,
`eventoPrestamo`, `pagoAporte` y `acuerdoCondonacion` según corresponda a su tipo.

### Respuesta de las demás lecturas

`getAll`, `bandeja/{estado}` y `porEntidad/{id}` sí devuelven la entidad `CobroCredito`
serializada directa (no hay capa de DTO), **sin las líneas de detalle**. Campos de interés:
`codigo`, `entidad`, `tipoOperacion`, `estado`, `cuentaBancaria`, `referencia`, `rutaRespaldo`,
`valor`, `fecha`, `observacion`, los seis pares `usuario*`/`fecha*` de la traza
(registro/aprobación/rechazo/proceso/anulación), `motivoRechazo`, `motivoAnulacion`,
`asientoTransitorio` y `asientoDefinitivo`.

⚠️ **Fechas.** `fecha` es `LocalDate` → `"2026-08-29"`. Los `fecha*` de traza son `LocalDateTime`
→ ISO local **sin zona**. Nunca mandes un `Date` de JavaScript ni nada terminado en `Z`: Jackson
descarta el offset en vez de convertirlo y el dato queda 5 horas adelantado, sin ningún error.

⚠️ **`FAIL_ON_UNKNOWN_PROPERTIES` está activo.** Un campo de más en el cuerpo devuelve
**HTTP 400 "Not able to deserialize data provided"**. No mandes campos que no estén en esta lista.

**Errores:** llegan como JSON `{"mensaje": "..."}`, no como texto plano.

---

## 5. Las dos pantallas

### 5.1 Bandeja de contabilidad

Consume `GET /rest/cbcr/bandejaAprobacion` → `List<FilaBandejaAprobacion>`.

⚠️ **La fila de la bandeja es DELIBERADAMENTE POBRE.** Trae solo esto:

```jsonc
{ "tipo": "COBRO_CREDITO",   // o "CARGA_PETRO" — es lo que dice a qué endpoint despachar
  "id": 41,                  // código en SU PROPIA tabla: CBCR.CBCRCDGO o CRAR.CRARCDGO
  "descripcion": "...",      // nombre del partícipe (cobro) o de la filial (carga Petro)
  "valor": 350.00,
  "usuarioRegistro": "GROBAYO",
  "fechaRegistro": "2026-08-29T09:36:47" }
```

**No trae `rutaRespaldo`, ni `referencia`, ni `cuentaBancaria`, ni `tipoOperacion`.** No son dos
entidades con modelo común, así que la fila solo lleva lo que ambas comparten. Para el visor del
comprobante y el resto del detalle hay que pedir **`GET /rest/cbcr/getId/{id}`** al abrir la fila
(y el endpoint equivalente de carga si `tipo` es `CARGA_PETRO`). Diseñá la bandeja como
**lista + panel de detalle**, no como una grilla que ya lo tenga todo.

El comprobante digitalizado es lo único que contabilidad realmente necesita ver para decidir, así
que el detalle no es opcional: es la pantalla.

### Las acciones DIFIEREN según el `tipo` de fila — no fuerces un juego común

Son dos entidades distintas con dos ciclos distintos. La bandeja las une en una lista; **no las
unifica en un modelo**. Cada fila despacha a los endpoints de su propio tipo:

| | `tipo: "COBRO_CREDITO"` | `tipo: "CARGA_PETRO"` |
|---|---|---|
| Detalle | `GET /rest/cbcr/getId/{id}` | `GET /rest/asgn/estadoContable/{id}` + `GET /rest/asgn/transferencias/{id}` |
| Aprobar | `POST /rest/cbcr/{id}/aprobar` | `POST /rest/asgn/confirmarRecepcion/{id}` |
| Lo contrario de aprobar | `POST /rest/cbcr/{id}/rechazar` (motivo obligatorio) | `POST /rest/asgn/reversarRecepcion/{id}` (motivo obligatorio) |

⚠️ **La carga Petro NO tiene "rechazar": tiene "reversar", y no es lo mismo.** Rechazar es negarse
a aprobar algo que sigue pendiente. Reversar es deshacer una confirmación **que ya ocurrió** — y el
backend la niega si el archivo ya fue aplicado (paso 2), porque primero hay que reversar el paso 2.
En una fila pendiente de la bandeja, la acción disponible es **confirmar**, y no hay negativo
simétrico: si contabilidad no está de acuerdo, simplemente no confirma.

⚠️ **`contabilidadActiva: false` no es un error** en la respuesta de `confirmarRecepcion`: la
confirmación ocurrió, solo que sin asiento. Avisar, no pintar en rojo.

El contrato completo de la carga Petro, con sus validaciones y sus reglas de pantalla, está en
**`API-COBRO-PETRO-DOS-PASOS.md`** — leerlo antes de cablear ese lado, no deducirlo de esta tabla.

⚠️ **La aprobación del archivo Petro SE MUEVE ACÁ.** Deja de estar en la pantalla de carga. Lo
que **sí se queda** en la pantalla de carga es *procesar el archivo* — solo se mueve la
autorización.

### 5.2 Proceso de crédito

Consume `GET /rest/cbcr/bandeja/2` (aprobados). Acción **Procesar**, que es la que finalmente
aplica el cobro. Además: los **rechazados** (`bandeja/4`) abiertos en **modo edición** con el
`motivoRechazo` visible, para corregir y reenviar. Y **Anular** con motivo.

---

## 6. Lo que esto reemplaza

Los endpoints directos de pago (`/rest/prst/pagarCuota`, abono a capital, precancelación, registro
de aporte) **siguen existiendo y siguen funcionando**. La migración de cada pantalla al circuito
nuevo es la fase de cutover, y todavía **no está hecha**.

⚠️ **Es el único punto donde el orden de despliegue backend/frontend importa.** No retires ningún
endpoint viejo hasta que exista el inventario pantalla-por-endpoint. Mientras tanto conviven.

## 7. `ACUERDO_CONDONACION` — declarado, no operativo

El tipo de operación existe en el catálogo y `DCBC` ya tiene la columna `ACCNCDGO`, pero **la rama
en `procesarCobro()` todavía no está construida** y las tablas `CRD.ACCN`/`CRD.DACC` **no existen
en producción**. No lo ofrezcas en la pantalla todavía. Ver
`PLAN-ACUERDOS-PAGO-CONDONACION.md`.
