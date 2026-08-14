# GUÍA FRONTEND — SERVICIOS DE PAGO DE PRÉSTAMOS

**Backend `SaaBE` · módulo CRD · 2026-08-14**

Esta guía documenta los **9 endpoints nuevos** de pago de préstamos y aportes: qué hace cada uno,
cuándo usarlo, qué enviar y qué esperar en éxito y en error.

Diseño e implementación de referencia: `ESPECIFICACION-SERVICIOS-PAGO-PRESTAMOS.md`.

---

## Índice

1. [Reglas generales](#1-reglas-generales)
2. [Catálogos de estados](#2-catálogos-de-estados)
3. [`GET /aprt/saldosPorEntidad/{idEntidad}`](#3-get-aprtsaldosporentidadidentidad)
3b. [`POST /aprt/registrarAporte`](#3b-post-aprtregistraraporte)
4. [`POST /prst/pagarCuota`](#4-post-prstpagarcuota)
5. [`POST /prst/pagarConAportes`](#5-post-prstpagarconaportes)
6. [`GET /prst/simularAbonoCapital/{idPrestamo}`](#6-get-prstsimularabonocapitalidprestamo)
7. [`POST /prst/abonarCapital`](#7-post-prstabonarcapital)
8. [`GET /prst/simularPrecancelacion/{idPrestamo}`](#8-get-prstsimularprecancelacionidprestamo)
9. [`POST /prst/precancelar`](#9-post-prstprecancelar)
10. [`POST /prst/anularOperacion`](#10-post-prstanularoperacion)
11. [Consulta del historial: `evpr` y `hdtp`](#11-consulta-del-historial-evpr-y-hdtp)
12. [Tabla completa de códigos de error](#12-tabla-completa-de-códigos-de-error)
13. [Flujos de pantalla recomendados](#13-flujos-de-pantalla-recomendados)
14. [Cambios que rompen lo existente](#14-cambios-que-rompen-lo-existente)

---

## 1. Reglas generales

### URL base

```
http://<host>:8080/SaaBE/rest
```

El application path de JAX-RS es `/rest`. **No** existe `/api/...`.

### Sobre de respuesta

Todos los endpoints de pago responden con la misma envoltura:

```json
{
  "exito": true,
  "etapa": "APLICACION",
  "mensaje": "Pago aplicado por $250.00 en 1 cuota(s)",
  "resultado": { }
}
```

En fallo:

```json
{
  "exito": false,
  "etapa": "VALIDACION",
  "mensaje": "VALOR_EXCEDE_DEUDA: El valor $9000.00 excede la deuda total $4350.00 del préstamo; use la precancelación",
  "error": "VALOR_EXCEDE_DEUDA"
}
```

- **`error`** trae el **código** estable. Usalo para la lógica del frontend (elegir el mensaje
  al usuario, decidir si reintentar, abrir otro modal). **Nunca** parsees `mensaje`.
- **`mensaje`** es texto para mostrar; incluye el código como prefijo.
- **`etapa`** vale `VALIDACION`, `SIMULACION` o `APLICACION`.

### Códigos HTTP

| Situación | HTTP |
|---|---|
| OK | 200 (201 en `abonarCapital`) |
| Parámetro faltante o malformado | 400 |
| Préstamo o evento no encontrado | 404 |
| El estado no permite la operación (préstamo terminal, evento ya anulado, evento posterior vigente) | 409 |
| Regla de negocio (valor excede, saldo insuficiente, no está al día, monto no coincide…) | 422 |
| Error inesperado | 500 |

### Atomicidad

Cada POST es **una sola transacción**. Si algo falla, **no queda nada escrito**: ni el evento, ni
los pagos, ni los movimientos de aporte. No hace falta que el frontend "limpie" nada tras un error.

### Formatos

- **Montos**: `number` con hasta 2 decimales. El backend redondea HALF_UP a 2 decimales.
- **Fechas de entrada**: `string` `"yyyy-MM-dd"` (ej. `"2026-08-14"`). Si se omite, el backend
  usa **hoy**. **Nunca** se acepta una fecha futura.
- **Fechas de salida**: `"yyyy-MM-ddTHH:mm:ss"` (LocalDateTime serializado por JSON-B).
- **`usuario`**: obligatorio en todos los POST. Es el usuario de la sesión, máx. 50 caracteres.
- **Los montos SIEMPRE viajan en el body**, nunca en la URL.

### Tolerancia

El backend trabaja con una tolerancia de **1 centavo (0.01)** en todas las comparaciones. Un pago
que difiere en ±0.01 del saldo se considera exacto.

---

## 2. Catálogos de estados

### Estado de la cuota — campo `estado` de `DTPR`

| Valor | Nombre | Significado para el usuario |
|---|---|---|
| 1 | PENDIENTE | Aún no vence |
| 2 | ACTIVA | Vigente |
| 3 | EMITIDA | Emitida |
| **4** | **PAGADA** | Cancelada por pago |
| 5 | EN_MORA | Vencida sin pagar |
| **6** | **PARCIAL** | Pagada en parte |
| **7** | **CANCELADA_ANTICIPADA** | Anulada por una precancelación |
| 8 | VENCIDA | Vencida |

### Estado del préstamo — campo `idEstado` de `PRST`

| Valor | Nombre | ¿Admite operaciones? |
|---|---|---|
| 1 | GENERADO | Sí |
| 2 | VIGENTE | Sí |
| **3** | **CANCELADO** | **No (terminal)** |
| **4** | **CANCELADO_ANTICIPADO** | **No (terminal)** |
| **5** | **CANCELADO_POR_NOVACION** | **No (terminal)** |
| 8 | DE_PLAZO_VENCIDO | Sí |
| 11 | EN_MORA | Sí |

> ⚠️ El estado operativo del préstamo está en **`idEstado`**, NO en `estadoPrestamo`. Si la
> pantalla muestra el estado, debe leer `idEstado`.

### Tipos de operación (`EventoPrestamo.tipoOperacion`)

`PAGO_MANUAL` · `PAGO_APORTES` · `ABONO_CAPITAL` · `PRECANCELACION`

---

## 3. `GET /aprt/saldosPorEntidad/{idEntidad}`

### Cuándo usarlo

- Estado de cuenta de aportes de un partícipe.
- **Antes** de armar un pago con aportes o una precancelación con aportes, para mostrar cuánto
  hay disponible por tipo.

> 🚨 **Este endpoint reemplaza a `GET /aprt/getAll` para calcular saldos.** `getAll` descarga las
> ~980.000 filas de `CRD.APRT` y es la causa del `OutOfMemoryError` de WildFly. Queda **deprecado
> para estados de cuenta**. Acá el cálculo lo hace la base de datos con una query agregada.

### Request

```
GET /SaaBE/rest/aprt/saldosPorEntidad/456
```

`idEntidad` es el código del partícipe (`ENTD.ENTDCDGO`), **no** el del préstamo. Si tenés el
préstamo, el partícipe está en `prestamo.entidad.codigo`.

### Respuesta 200

```json
{
  "exito": true,
  "resultado": [
    { "idTipoAporte": 9,  "nombre": "APORTE JUBILACION", "saldo": 12345.67 },
    { "idTipoAporte": 11, "nombre": "APORTE CESANTIA",   "saldo": 8100.00 }
  ]
}
```

- Solo aparecen los tipos de aporte **vigentes** (`TipoAporte.estado = 1`).
- `saldo` es la suma neta: los pagos con aportes se registran como movimientos negativos, así que
  la suma ya refleja lo disponible.
- **Una lista vacía es 200 con `[]`, no un error.** El partícipe simplemente no tiene aportes.
- Un saldo puede ser 0 o negativo si hay inconsistencias de datos: no ofrezcas pagar con un tipo
  cuyo saldo no sea positivo.

### Errores

| HTTP | `error` | Cuándo |
|---|---|---|
| 400 | `PARAMETRO_INVALIDO` | `idEntidad` nulo o ≤ 0 |
| 500 | `ERROR_INTERNO` | Fallo inesperado |

---

## 3b. `POST /aprt/registrarAporte`

### Cuándo usarlo

**Pago de aportes en ventanilla**: el partícipe entrega dinero por un tipo de aporte y hay que
generarle el aporte. Es la operación **espejo** del pago de préstamo con aportes (§5): aquella
consume saldo, esta lo genera.

Cada llamada registra **un tipo de aporte**. Si el socio paga varios tipos en la misma
transacción de caja, hacé una llamada por tipo.

**Qué graba el backend**, en una sola transacción:

| Tabla | Fila creada |
|---|---|
| `CRD.APRT` | Positiva: `valor = X`, `valorPagado = X`, `saldo = 0`, `estado = 4` (PAGADA) |
| `CRD.PGAP` | El `PagoAporte` con `valor = X`, enlazado al aporte |

> El aporte nace **ya pagado**: con `saldo = 0` y estado 4 queda **fuera del FIFO del proceso
> Petro**, así que el archivo de descuentos nunca se lo vuelve a cobrar al socio. El saldo
> disponible sube de inmediato, porque el saldo es la suma neta de `APRTVLRR`.

**No lo uses** para registrar una obligación de aporte por cobrar: este endpoint asume que el
dinero ya se recibió. Los aportes por cobrar los genera el ciclo Petro.

### Request

```http
POST /SaaBE/rest/aprt/registrarAporte
Content-Type: application/json
```
```json
{
  "idEntidad": 456,
  "idTipoAporte": 11,
  "valor": 300.00,
  "usuario": "jperez",
  "observacion": "Aporte voluntario recibo 00456",
  "fechaTransaccion": "2026-08-14",
  "rutaDocumentoRespaldo": "docs/respaldos/recibo-00456.pdf"
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `idEntidad` | number | **Sí** | Código del partícipe (`ENTD.ENTDCDGO`) |
| `idTipoAporte` | number | **Sí** | Debe estar vigente (`TipoAporte.estado = 1`) |
| `valor` | number | **Sí** | > 0 |
| `usuario` | string | **Sí** | |
| `observacion` | string | No | Se concatena a la glosa del aporte |
| `fechaTransaccion` | string `yyyy-MM-dd` | No | Default hoy. **No puede ser futura** |

⚠️ El campo de fecha se llama **`fechaTransaccion`** (no `fechaPago` ni `fecha`).

### Respuesta 201

```json
{
  "exito": true,
  "etapa": "APLICACION",
  "mensaje": "Aporte registrado por $300.0 en APORTE CESANTIA. Saldo del tipo: $8400.0",
  "resultado": {
    "idAporte": 998050,
    "idPagoAporte": 7730,
    "idEntidad": 456,
    "idTipoAporte": 11,
    "nombreTipoAporte": "APORTE CESANTIA",
    "valor": 300.00,
    "saldoTipoAporte": 8400.00,
    "fechaTransaccion": "2026-08-14T10:32:15"
  }
}
```

Nótese el **201 Created**.

`saldoTipoAporte` es el saldo del tipo **después** del registro: usalo para refrescar la pantalla
sin volver a llamar a `saldosPorEntidad`.

### Efecto en los reportes

`fechaTransaccion` es el campo por el que filtran los reportes de aportes (G42, G43, G44, CJBM,
CPRM/CCPM, dashboard, padrón de partícipes). Si el usuario carga una fecha retroactiva, el aporte
entra en el período de esa fecha, no en el de hoy. Conviene advertirlo en pantalla cuando se
elija una fecha de un mes ya cerrado.

### Errores

| HTTP | `error` | Cuándo | Qué hacer |
|---|---|---|---|
| 400 | `PARAMETRO_INVALIDO` | Falta `idEntidad`, `idTipoAporte`, `valor` o `usuario` | Validar antes de enviar |
| 404 | `ENTIDAD_NO_ENCONTRADA` | El partícipe no existe | Validar el selector de partícipe |
| 422 | `TIPO_APORTE_NO_VIGENTE` | El tipo no existe o está dado de baja | Cargar el combo solo con tipos vigentes |
| 422 | `VALOR_INVALIDO` | `valor` ≤ 0 | Validar en el formulario |
| 422 | `FECHA_INVALIDA` | `fechaTransaccion` futura | Limitar el datepicker a hoy |
| 500 | *(sin código)* | Fallo inesperado | Mensaje genérico |

---

## 4. `POST /prst/pagarCuota`

### Cuándo usarlo

Pago de cuota(s) en efectivo/ventanilla. Cubre los tres casos con **el mismo llamado**:

- **Parcial**: el valor no alcanza a cubrir la cuota → queda `PARCIAL (6)`.
- **Exacto**: cubre justo el pendiente → queda `PAGADA (4)`.
- **Con excedente**: el sobrante se aplica **en cascada** a las cuotas siguientes.

Si el valor cubre TODA la deuda, el préstamo queda `CANCELADO (3)` en el mismo llamado. Eso está
permitido: pagar la deuda completa **no** es una precancelación (no condona nada).

**No lo uses** para: pagar con aportes (§5), abonar a capital (§7) ni precancelar (§9).

### Request

```http
POST /SaaBE/rest/prst/pagarCuota
Content-Type: application/json
```
```json
{
  "idPrestamo": 8523,
  "valor": 250.00,
  "usuario": "jperez",
  "observacion": "Pago ventanilla recibo 00123",
  "fechaPago": "2026-08-14",
  "rutaDocumentoRespaldo": "docs/respaldos/recibo-00123.pdf"
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `idPrestamo` | number | **Sí** | |
| `valor` | number | **Sí** | > 0. No puede exceder la deuda total |
| `usuario` | string | **Sí** | |
| `observacion` | string | No | Queda en el pago y en la huella del préstamo |
| `fechaPago` | string `yyyy-MM-dd` | No | Default hoy. No puede ser futura |

### Respuesta 200

```json
{
  "exito": true,
  "etapa": "APLICACION",
  "mensaje": "Pago aplicado por $250.00 en 2 cuota(s)",
  "resultado": {
    "idPrestamo": 8523,
    "idEvento": 55,
    "valorRecibido": 250.00,
    "valorAplicado": 250.00,
    "excedenteNoAplicado": 0.00,
    "prestamoCancelado": false,
    "estadoFinalPrestamo": 2,
    "cuotasAfectadas": [
      {
        "idCuota": 90211, "numeroCuota": 1.0,
        "estadoAnterior": 1, "estadoNuevo": 4,
        "aplicadoDesgravamen": 0.00, "aplicadoMora": 0.00, "aplicadoInteresVencido": 0.00,
        "aplicadoInteres": 180.00, "aplicadoCapital": 31.38, "aplicadoSeguro": 0.00,
        "totalAplicado": 211.38,
        "idPagoPrestamo": 40122
      },
      {
        "idCuota": 90212, "numeroCuota": 2.0,
        "estadoAnterior": 1, "estadoNuevo": 6,
        "aplicadoDesgravamen": 0.00, "aplicadoMora": 0.00, "aplicadoInteresVencido": 0.00,
        "aplicadoInteres": 38.62, "aplicadoCapital": 0.00, "aplicadoSeguro": 0.00,
        "totalAplicado": 38.62,
        "idPagoPrestamo": 40123
      }
    ]
  }
}
```

**Guardá `idEvento`**: es lo único que necesitás para anular la operación después (§10).

### Cómo leer el resultado

- `cuotasAfectadas` viene **en el orden en que se aplicó** el pago (cuota más antigua primero).
- `estadoAnterior`/`estadoNuevo` usan el catálogo de §2. Sirven para pintar la fila que cambió.
- Los seis campos `aplicado*` **suman exactamente `totalAplicado`**: úsalos para mostrar el
  desglose del recibo.
- `prestamoCancelado: true` → mostrá el aviso de que el crédito quedó cancelado y refrescá la
  ficha del préstamo.
- `excedenteNoAplicado` debería ser siempre 0 (la validación previa lo impide). Si llega > 0,
  es una inconsistencia de datos: mostralo como advertencia.

### Prelación (orden en que se imputa el dinero)

```
1. Seguro de incendio → 2. Seguro de desgravamen → 3. Interés de mora
→ 4. Interés vencido → 5. Interés ordinario → 6. Capital
```

Primero los seguros, después la deuda vieja (mora e interés vencido), después el interés
corriente y por último el capital. Si mostrás un preview del desglose, respetá este orden.

El **interés vencido** hoy siempre vale 0 (ningún proceso lo alimenta), así que en la práctica
verás cuatro componentes con valor: seguro, desgravamen, mora e interés, y el capital al final.

### Errores

| HTTP | `error` | Cuándo | Qué hacer en el frontend |
|---|---|---|---|
| 400 | `PARAMETRO_INVALIDO` | Falta `idPrestamo`, `valor` o `usuario` | Validar antes de enviar |
| 404 | `PRESTAMO_NO_ENCONTRADO` | El préstamo no existe | Mensaje y volver al listado |
| 409 | `ESTADO_NO_PERMITE` | El préstamo está en estado 3, 4 o 5 | Deshabilitar el botón de pago para préstamos terminales |
| 422 | `VALOR_INVALIDO` | `valor` ≤ 0 | Validar en el formulario |
| 422 | `FECHA_INVALIDA` | `fechaPago` futura | Limitar el datepicker a hoy |
| 422 | `SIN_CUOTAS_PENDIENTES` | El préstamo no tiene cuotas con saldo | Sugerir revisar el estado del crédito |
| 422 | `VALOR_EXCEDE_DEUDA` | El valor supera la deuda total | **Ofrecer el flujo de precancelación** (§8-§9) |

---

## 5. `POST /prst/pagarConAportes`

### Cuándo usarlo

El partícipe paga cuotas con el saldo de sus aportes (cesantía, jubilación, etc.) en vez de con
efectivo. Aplica **exactamente la misma lógica de cascada y prelación** que `pagarCuota`.

**Flujo obligatorio**: primero `GET /aprt/saldosPorEntidad/{idEntidad}` (§3) para que el usuario
elija de qué tipos tomar y cuánto.

**Pago mixto efectivo + aportes de cuotas normales**: se resuelve con **dos llamadas
consecutivas** (`pagarConAportes` y después `pagarCuota`). Solo la precancelación admite el mixto
atómico, porque valida el total.

### Request

```http
POST /SaaBE/rest/prst/pagarConAportes
Content-Type: application/json
```
```json
{
  "idPrestamo": 8523,
  "usuario": "jperez",
  "observacion": "Pago con cesantía",
  "fechaPago": "2026-08-14",
  "rutaDocumentoRespaldo": "docs/respaldos/solicitud-cesantia-8523.pdf",
  "aportes": [
    { "idTipoAporte": 11, "valor": 300.00 },
    { "idTipoAporte": 9,  "valor": 150.00 }
  ]
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `idPrestamo` | number | **Sí** | |
| `aportes` | array | **Sí** | Al menos un renglón |
| `aportes[].idTipoAporte` | number | **Sí** | Debe estar vigente. **Sin repetir** |
| `aportes[].valor` | number | **Sí** | > 0, ≤ saldo disponible del tipo |
| `usuario` | string | **Sí** | |
| `observacion` | string | No | |
| `fechaPago` | string `yyyy-MM-dd` | No | Default hoy |

El **valor total del pago** es la suma de los renglones. No se envía aparte.

### Respuesta 200

```json
{
  "exito": true,
  "etapa": "APLICACION",
  "mensaje": "Pago con aportes aplicado por $450.00 en 2 cuota(s)",
  "resultado": { "...igual que pagarCuota..." },
  "movimientosAporte": [
    { "idAporte": 998001, "idTipoAporte": 11, "valor": -300.00, "idPagoAporte": 7712 },
    { "idAporte": 998002, "idTipoAporte": 9,  "valor": -150.00, "idPagoAporte": 7713 }
  ]
}
```

`movimientosAporte` está **fuera** de `resultado`, al mismo nivel. Cada renglón es la fila
negativa creada en `CRD.APRT` con su `PagoAporte`. Tras el pago, el saldo del tipo baja
exactamente ese monto: si mostrás el saldo en pantalla, refrescá con `saldosPorEntidad`.

### Errores

Los mismos que `pagarCuota`, más:

| HTTP | `error` | Cuándo | Qué hacer |
|---|---|---|---|
| 422 | `DESGLOSE_INVALIDO` | Desglose vacío, valor ≤ 0 o **tipo duplicado** | Validar en el formulario: un renglón por tipo |
| 422 | `TIPO_APORTE_NO_VIGENTE` | El tipo no existe o `estado ≠ 1` | Recargar el catálogo desde `saldosPorEntidad` |
| 422 | `SALDO_APORTES_INSUFICIENTE` | El saldo del tipo no alcanza | Mostrar el disponible (viene en `mensaje`) y refrescar saldos |
| 422 | `PARAMETRO_INVALIDO` (422, no 400) | El préstamo no tiene partícipe asociado | Dato inconsistente: reportar |

> El saldo se valida **dos veces**: al validar la solicitud y otra vez dentro de la transacción
> (guardarraíl anti-carrera). Si dos usuarios pagan a la vez, uno recibe
> `SALDO_APORTES_INSUFICIENTE` y su operación no deja rastro.

---

## 6. `GET /prst/simularAbonoCapital/{idPrestamo}`

### Cuándo usarlo

**Siempre antes** de `POST /prst/abonarCapital`. Devuelve la tabla proyectada sin escribir nada,
para que el usuario compare y confirme.

### Request

```
GET /SaaBE/rest/prst/simularAbonoCapital/8523?valor=5000&modalidad=1
```

| Query param | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `valor` | number | **Sí** | Monto del abono |
| `modalidad` | number | **Sí** | `1` o `2` (ver abajo) |

### Las dos modalidades

| Modalidad | Qué mantiene | Qué reduce | Cuándo la elige el socio |
|---|---|---|---|
| **1** | El **valor de la cuota** | El **plazo** (menos cuotas) | Quiere terminar antes de pagar |
| **2** | El **plazo** (mismas cuotas) | El **valor de la cuota** | Quiere aliviar la cuota mensual |

### Respuesta 200

```json
{
  "exito": true,
  "etapa": "SIMULACION",
  "mensaje": "Simulación calculada",
  "resultado": {
    "idPrestamo": 8523,
    "saldoCapitalActual": 15000.00,
    "valorAbono": 5000.00,
    "modalidad": 1,
    "tipoAmortizacion": 1,
    "plazoActual": 60,
    "plazoNuevo": 42,
    "cuotaActual": 311.38,
    "cuotaNueva": 311.38,
    "ahorroIntereses": 1420.55,
    "cuotasAHistorizar": 57,
    "tablaProyectada": [
      { "numeroCuota": 4.0, "fechaVencimiento": "2026-11-30T00:00:00",
        "capital": 236.38, "interes": 75.00, "cuota": 311.38, "saldoCapital": 9763.62 }
    ]
  }
}
```

- `tipoAmortizacion`: `1` = francesa, `2` = alemana. Lo toma del préstamo; el usuario no lo elige.
- `cuotasAHistorizar`: cuántas cuotas vigentes serán reemplazadas.
- `ahorroIntereses`: cuánto interés deja de pagar respecto de la tabla actual. Es el número que
  más vende la operación: destacalo.
- `tablaProyectada`: para renderizar la tabla comparativa. **No se persiste.**

### Errores

Los mismos que `abonarCapital` (§7). La simulación aplica **exactamente las mismas
validaciones**, así que si simula bien, el POST va a funcionar.

---

## 7. `POST /prst/abonarCapital`

### Cuándo usarlo

El socio entrega un monto extraordinario para bajar el capital y se **re-amortiza** el crédito.

**Qué hace el backend**, en una sola transacción:
1. Crea el evento `ABONO_CAPITAL`.
2. Copia las cuotas pendientes a la tabla histórica `CRD.HDTP` y las borra de `CRD.DTPR`.
3. Genera la tabla nueva con el capital reducido.
4. Registra el abono en `saldoOtros` de la última cuota pagada y crea su `PagoPrestamo`.
5. Actualiza plazo, valor de cuota, fecha fin y totales del préstamo.

### Pre-requisito: el préstamo debe estar AL DÍA

**No se puede abonar a capital si hay cuotas vencidas o parciales.** El usuario debe regularizar
primero con `pagarCuota`. Conviene que la pantalla lo verifique antes de habilitar el botón.

### Request

```http
POST /SaaBE/rest/prst/abonarCapital
Content-Type: application/json
```
```json
{
  "idPrestamo": 8523,
  "valor": 5000.00,
  "modalidad": 1,
  "usuario": "jperez",
  "observacion": "Abono extraordinario",
  "fecha": "2026-08-14",
  "rutaDocumentoRespaldo": "docs/respaldos/comprobante-abono-8523.pdf"
}
```

⚠️ El campo de fecha se llama **`fecha`** (no `fechaPago`, como en los pagos de cuota).

### Respuesta 201

```json
{
  "exito": true,
  "etapa": "APLICACION",
  "mensaje": "Abono a capital aplicado por $5000.0. Plazo: 60 → 42. Cuota: 311.38 → 311.38",
  "resultado": {
    "idPrestamo": 8523,
    "idEvento": 56,
    "idPagoPrestamo": 40130,
    "idCuotaConSaldoOtros": 90213,
    "valorAbono": 5000.00,
    "modalidad": 1,
    "plazoAnterior": 60,
    "plazoNuevo": 42,
    "cuotaAnterior": 311.38,
    "cuotaNueva": 311.38,
    "cuotasHistorizadas": 57,
    "cuotasGeneradas": 39
  }
}
```

Nótese el **201 Created**, no 200.

Después de esto **hay que recargar la tabla de amortización**: los `DTPRCDGO` de las cuotas
pendientes cambiaron (las viejas se fueron a `CRD.HDTP`). Cualquier id de cuota que el frontend
tuviera cacheado queda inválido.

### Errores

| HTTP | `error` | Cuándo | Qué hacer |
|---|---|---|---|
| 400 | `PARAMETRO_INVALIDO` | Falta `idPrestamo`, `valor`, `modalidad` o `usuario` | Validar antes |
| 404 | `PRESTAMO_NO_ENCONTRADO` | No existe | |
| 409 | `ESTADO_NO_PERMITE` | Préstamo en estado terminal | Deshabilitar el botón |
| 422 | `MODALIDAD_INVALIDA` | Distinta de 1 o 2 | Radio button con solo esas dos |
| 422 | `VALOR_INVALIDO` | `valor` ≤ 0 | |
| 422 | `FECHA_INVALIDA` | `fecha` futura | |
| 422 | `PRESTAMO_NO_AL_DIA` | Hay cuotas vencidas o parciales, o una cuota a reemplazar tiene pagos | **Ofrecer ir a `pagarCuota`**. El mensaje dice qué cuota es |
| 422 | `ABONO_CUBRE_CAPITAL` | El abono cubre todo el capital | **Ofrecer el flujo de precancelación** (§8-§9) |
| 422 | `CUOTA_NO_CUBRE_INTERES` | Modalidad 1: la cuota vigente no cubre ni el interés | **Sugerir modalidad 2** |
| 422 | `SIN_CUOTAS_PENDIENTES` | No hay cuotas que re-amortizar | |

---

## 8. `GET /prst/simularPrecancelacion/{idPrestamo}`

### Cuándo usarlo

**Siempre antes** de `POST /prst/precancelar`. El backend **re-verifica** el monto en el POST, así
que el frontend está obligado a simular primero para saber cuánto cobrar.

### Qué se cobra al precancelar

```
Deuda EXIGIBLE  = cuotas pendientes con vencimiento hasta la fecha (incluida la del mes en curso),
                  con su total real, mora e interés vencido incluidos
      +
Capital FUTURO  = SOLO el capital pendiente de las cuotas posteriores
──────────────────────────────────────────────────────────────────────
= Valor total de precancelación
```

Los intereses, el desgravamen y los seguros **futuros se condonan**. Ese es el beneficio de
precancelar y conviene mostrarlo (`interesCondonado`).

### Request

```
GET /SaaBE/rest/prst/simularPrecancelacion/8523?fecha=2026-08-31
```

| Query param | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `fecha` | string `yyyy-MM-dd` | No | Fecha de corte. Default hoy |

### Respuesta 200

```json
{
  "exito": true,
  "etapa": "SIMULACION",
  "mensaje": "Simulación calculada",
  "resultado": {
    "idPrestamo": 8523,
    "fecha": "2026-08-31",
    "exigibles": [
      { "idCuota": 90211, "numeroCuota": 1.0,
        "fechaVencimiento": "2026-08-31T00:00:00", "pendiente": 311.38 }
    ],
    "valorExigible": 311.38,
    "capitalFuturo": 14763.62,
    "valorTotalPrecancelacion": 15075.00,
    "cuotasAAnular": 59,
    "interesCondonado": 3438.62
  }
}
```

- `valorTotalPrecancelacion` es **el número que hay que cobrar**. Guardalo para el POST.
- `exigibles` es el detalle de la deuda vencida/del mes: útil para el desglose en pantalla.
- `cuotasAAnular`: cuántas cuotas futuras pasarán a `CANCELADA_ANTICIPADA (7)`.
- ⚠️ El valor **depende de la fecha de corte** (la mora sigue corriendo). Si el usuario tarda,
  volvé a simular antes de confirmar.

### Errores

| HTTP | `error` | Cuándo |
|---|---|---|
| 400 | `PARAMETRO_INVALIDO` | `idPrestamo` inválido o `fecha` con formato incorrecto |
| 404 | `PRESTAMO_NO_ENCONTRADO` | No existe |

---

## 9. `POST /prst/precancelar`

### Cuándo usarlo

El socio cancela el crédito completo antes del plazo. Admite **efectivo, aportes o mixto**, y es
la única operación donde el mixto es atómico.

### Request

```http
POST /SaaBE/rest/prst/precancelar
Content-Type: application/json
```
```json
{
  "idPrestamo": 8523,
  "valorEfectivo": 11725.00,
  "aportes": [
    { "idTipoAporte": 11, "valor": 3350.00 }
  ],
  "usuario": "jperez",
  "observacion": "Precancelación por retiro",
  "fecha": "2026-08-31",
  "rutaDocumentoRespaldo": "docs/respaldos/liquidacion-8523.pdf"
}
```

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `idPrestamo` | number | **Sí** | |
| `valorEfectivo` | number | No | Default 0. No puede ser negativo |
| `aportes` | array | No | Mismas reglas que §5 |
| `usuario` | string | **Sí** | |
| `observacion` | string | No | |
| `fecha` | string `yyyy-MM-dd` | No | Fecha de corte. **Debe ser la misma que usaste al simular** |

**Regla de oro**: `valorEfectivo + Σ aportes[].valor` debe ser **igual** a
`valorTotalPrecancelacion` (±0.01).

### Respuesta 200

```json
{
  "exito": true,
  "etapa": "APLICACION",
  "mensaje": "Préstamo precancelado por $15075.00. Cuotas canceladas anticipadamente: 59",
  "resultado": {
    "idPrestamo": 8523,
    "idEvento": 57,
    "valorExigiblePagado": 311.38,
    "capitalPrecancelado": 14763.62,
    "valorTotalPrecancelacion": 15075.00,
    "cuotasCanceladasAnticipadas": 59,
    "estadoFinalPrestamo": 4,
    "idCuotaConSaldoOtros": 90211,
    "idPagoPrestamoCapitalFuturo": 40140,
    "movimientosAporte": [
      { "idAporte": 998010, "idTipoAporte": 11, "valor": -3350.00, "idPagoAporte": 7720 }
    ]
  }
}
```

`estadoFinalPrestamo: 4` = **CANCELADO_ANTICIPADO**. El préstamo queda terminal: ninguna otra
operación de pago lo acepta.

Las cuotas futuras quedan en `CANCELADA_ANTICIPADA (7)` — **no se borran**, quedan como
constancia en la tabla de amortización. Si la pantalla las lista, mostralas en gris con esa
etiqueta.

### Errores

| HTTP | `error` | Cuándo | Qué hacer |
|---|---|---|---|
| 400 | `PARAMETRO_INVALIDO` | Falta `idPrestamo` o `usuario` | |
| 404 | `PRESTAMO_NO_ENCONTRADO` | No existe | |
| 409 | `ESTADO_NO_PERMITE` | Préstamo terminal (ya cancelado) | |
| 422 | `SIN_CUOTAS_FUTURAS` | No hay cuotas futuras que precancelar | **Redirigir a `pagarCuota`**: la deuda es solo exigible |
| 422 | `MONTO_NO_COINCIDE` | El valor enviado no cuadra | Ver abajo |
| 422 | `VALOR_INVALIDO` | `valorEfectivo` negativo | |
| 422 | `FECHA_INVALIDA` | `fecha` futura | |
| 422 | `DESGLOSE_INVALIDO` / `TIPO_APORTE_NO_VIGENTE` / `SALDO_APORTES_INSUFICIENTE` | Igual que §5 | |

### El caso `MONTO_NO_COINCIDE`

Esta respuesta trae un campo extra con el valor correcto:

```json
{
  "exito": false,
  "etapa": "VALIDACION",
  "mensaje": "MONTO_NO_COINCIDE: El valor enviado $4300.00 no coincide con el valor de precancelación $4350.00",
  "error": "MONTO_NO_COINCIDE",
  "valorTotalPrecancelacion": 4350.00
}
```

Ocurre típicamente cuando pasó tiempo entre la simulación y la confirmación y la mora cambió.
**Recomendación**: actualizá el monto en pantalla con `valorTotalPrecancelacion`, avisá al usuario
del cambio y pedí que confirme de nuevo. No reintentes automáticamente.

---

## 10. `POST /prst/anularOperacion`

### Cuándo usarlo

Reversar una operación mal hecha: pago aplicado al préstamo equivocado, monto incorrecto, abono o
precancelación por error. Funciona para **los 4 tipos**.

Se anula el **evento completo**, no un pago suelto. El `idEvento` viene en el resultado de la
operación original; también podés listarlos con `GET /evpr/porPrestamo/{idPrestamo}` (§11).

### Regla LIFO

**No se puede anular un evento si hay operaciones posteriores vigentes sobre el mismo préstamo.**
Hay que anular de la más nueva a la más vieja. Si la pantalla lista los eventos, habilitá el botón
"Anular" **solo en el más reciente que esté vigente**.

### Request

```http
POST /SaaBE/rest/prst/anularOperacion
Content-Type: application/json
```
```json
{
  "idEvento": 55,
  "usuario": "jperez",
  "motivo": "Pago aplicado a préstamo equivocado"
}
```

Los tres campos son **obligatorios**. `motivo` queda en la auditoría.

### Respuesta 200

```json
{
  "exito": true,
  "etapa": "APLICACION",
  "mensaje": "Operación PAGO_MANUAL anulada. Pagos anulados: 2, cuotas recalculadas: 2",
  "resultado": {
    "idEvento": 55,
    "idPrestamo": 8523,
    "tipoOperacion": "PAGO_MANUAL",
    "pagosAnulados": 2,
    "cuotasRecalculadas": 2,
    "cuotasRestauradas": 0,
    "cuotasEliminadas": 0,
    "movimientosAporteRevertidos": 0,
    "estadoFinalPrestamo": 2
  }
}
```

### Qué hace cada reverso

| Tipo | Efecto |
|---|---|
| `PAGO_MANUAL` | Marca los pagos como anulados y reconstruye las cuotas: vuelven a PENDIENTE / EN_MORA / PARCIAL según lo que quede pagado |
| `PAGO_APORTES` | Igual, **más** un contra-movimiento POSITIVO en `CRD.APRT` por cada aporte consumido (el saldo del socio vuelve a subir) |
| `ABONO_CAPITAL` | Borra la tabla recalculada, **restaura las cuotas originales desde `CRD.HDTP`** y devuelve plazo y valor de cuota anteriores |
| `PRECANCELACION` | Anula los pagos, devuelve las cuotas en estado 7 a PENDIENTE/EN_MORA y **reabre el préstamo a VIGENTE (2)** |

Si el préstamo estaba `CANCELADO (3)` y el reverso deja cuotas pendientes, se reabre a
`VIGENTE (2)`. **Nunca** se reabre automáticamente desde los estados 4 o 5, salvo el caso de la
precancelación que se revierte.

> ⚠️ Tras anular un `ABONO_CAPITAL` **los códigos de cuota cambian otra vez** (se re-insertan
> desde el histórico con `DTPRCDGO` nuevo). Recargá la tabla de amortización.

### Errores

| HTTP | `error` | Cuándo | Qué hacer |
|---|---|---|---|
| 400 | `PARAMETRO_INVALIDO` | Falta `idEvento`, `usuario` o `motivo` | Motivo obligatorio en el modal |
| 404 | `EVENTO_NO_ENCONTRADO` | El evento no existe | |
| 409 | `EVENTO_YA_ANULADO` | Ya estaba anulado (`estado = 0`) | Refrescar la lista de eventos |
| 409 | `EVENTO_POSTERIOR_VIGENTE` | Hay operaciones posteriores | Mostrar cuál (viene en `mensaje`) y pedir anularla primero |
| 409 | `PAGOS_SOBRE_TABLA_RECALCULADA` | Reverso de abono: hay pagos sobre las cuotas nuevas | Anular esos pagos primero |
| 404 | `PRESTAMO_NO_ENCONTRADO` | Evento sin préstamo (dato inconsistente) | Reportar |

---

## 11. Consulta del historial: `evpr` y `hdtp`

Endpoints de **solo lectura**. No permiten crear ni modificar: los eventos y el histórico los
escriben únicamente los procesos de pago.

### Eventos de pago — `EventoPrestamo`

```
GET /SaaBE/rest/evpr/getAll
GET /SaaBE/rest/evpr/getId/{id}
GET /SaaBE/rest/evpr/porPrestamo/{idPrestamo}     ← el más útil
POST /SaaBE/rest/evpr/selectByCriteria
```

`porPrestamo` devuelve los eventos **del más reciente al más antiguo**, que es justo el orden en
el que hay que ofrecer la anulación. Campos relevantes:

| Campo | Uso en pantalla |
|---|---|
| `codigo` | El `idEvento` para anular |
| `tipoOperacion` | Etiqueta de la fila |
| `valor` | Monto de la operación |
| `fecha` | Fecha de negocio |
| `usuario` | Quién la hizo |
| `observacion` | Detalle |
| `estado` | **1 = vigente, 0 = anulado** |
| `usuarioAnulacion`, `fechaAnulacion`, `motivoAnulacion` | Datos del reverso |
| `modalidad`, `plazoAnterior`, `plazoNuevo`, `cuotaAnterior`, `cuotaNueva` | Solo en `ABONO_CAPITAL` |

Estos endpoints devuelven la entidad **sin** el sobre `{exito, resultado}`: son CRUD estándar.

### Cuotas historizadas — `HistDetallePrestamo`

```
GET /SaaBE/rest/hdtp/getAll
GET /SaaBE/rest/hdtp/getId/{id}
GET /SaaBE/rest/hdtp/porEvento/{idEvento}
GET /SaaBE/rest/hdtp/porPrestamo/{idPrestamo}
POST /SaaBE/rest/hdtp/selectByCriteria
```

Sirve para mostrar "cómo era la tabla antes del abono". Los campos son los mismos de
`DetallePrestamo`, más `codigoOriginal`, `motivo`, `fechaRegistroHist` y `usuarioHist`.

---

## 12. Tabla completa de códigos de error

| `error` | HTTP | Significado | Acción sugerida |
|---|---|---|---|
| `PARAMETRO_INVALIDO` | 400 | Falta un campo obligatorio o viene malformado | Validar en el formulario |
| `PRESTAMO_NO_ENCONTRADO` | 404 | El préstamo no existe | Volver al listado |
| `EVENTO_NO_ENCONTRADO` | 404 | El evento no existe | Refrescar historial |
| `ENTIDAD_NO_ENCONTRADA` | 404 | El partícipe no existe (solo en `registrarAporte`) | Validar el selector |
| `ESTADO_NO_PERMITE` | 409 | El préstamo está en estado terminal (3, 4 o 5) | Deshabilitar acciones de pago |
| `EVENTO_YA_ANULADO` | 409 | El evento ya fue anulado | Refrescar historial |
| `EVENTO_POSTERIOR_VIGENTE` | 409 | El reverso es LIFO | Anular primero el más reciente |
| `PAGOS_SOBRE_TABLA_RECALCULADA` | 409 | Hay pagos sobre las cuotas generadas por el abono | Anular esos pagos antes |
| `VALOR_INVALIDO` | 422 | Monto ≤ 0 o negativo | Validar en el formulario |
| `FECHA_INVALIDA` | 422 | Fecha futura | Limitar el datepicker a hoy |
| `VALOR_EXCEDE_DEUDA` | 422 | El valor supera la deuda total | Ofrecer precancelación |
| `SIN_CUOTAS_PENDIENTES` | 422 | No hay cuotas con saldo | Revisar el estado del crédito |
| `SIN_CUOTAS_FUTURAS` | 422 | Nada que precancelar | Redirigir a `pagarCuota` |
| `MONTO_NO_COINCIDE` | 422 | El monto no cuadra con el cálculo | Usar `valorTotalPrecancelacion` de la respuesta |
| `DESGLOSE_INVALIDO` | 422 | Desglose vacío, con valores ≤ 0 o tipos repetidos | Validar en el formulario |
| `TIPO_APORTE_NO_VIGENTE` | 422 | Tipo inexistente o dado de baja | Recargar catálogo |
| `SALDO_APORTES_INSUFICIENTE` | 422 | No alcanza el saldo de aportes | Refrescar saldos |
| `MODALIDAD_INVALIDA` | 422 | Modalidad distinta de 1 o 2 | Radio con dos opciones |
| `PRESTAMO_NO_AL_DIA` | 422 | Hay cuotas vencidas o parciales | Ofrecer regularizar con `pagarCuota` |
| `ABONO_CUBRE_CAPITAL` | 422 | El abono cubre todo el capital | Ofrecer precancelación |
| `CUOTA_NO_CUBRE_INTERES` | 422 | Modalidad 1 imposible con esa cuota | Sugerir modalidad 2 |
| *(sin código)* | 500 | Error inesperado | Mostrar genérico y registrar |

---

## 13. Flujos de pantalla recomendados

### A. Pago de cuota (efectivo)

```
Ficha del préstamo
  └─ [Pagar cuota]           ← deshabilitado si idEstado ∈ {3,4,5}
       └─ Modal: valor, fecha, observación
            └─ POST /prst/pagarCuota
                 ├─ 200 → mostrar desglose de cuotasAfectadas + recargar tabla
                 ├─ 422 VALOR_EXCEDE_DEUDA → "¿Quiere precancelar?" → flujo C
                 └─ otro → mensaje del código
```

### B. Pago con aportes

```
Ficha del préstamo
  └─ [Pagar con aportes]
       └─ GET /aprt/saldosPorEntidad/{prestamo.entidad.codigo}
            ├─ [] → "El partícipe no tiene aportes disponibles"
            └─ Modal con un renglón por tipo (max = saldo)
                 └─ POST /prst/pagarConAportes
                      ├─ 200 → desglose + movimientosAporte + refrescar saldos
                      └─ 422 SALDO_APORTES_INSUFICIENTE → refrescar saldos y reintentar
```

### B-bis. Pago de aportes en ventanilla

```
Ficha del partícipe → [Registrar aporte]
  └─ Modal: tipo de aporte (combo solo con vigentes), valor, fecha, observación
       └─ POST /aprt/registrarAporte
            ├─ 201 → mostrar saldoTipoAporte actualizado; si se cargan varios tipos,
            │        repetir la llamada una vez por tipo
            ├─ 422 TIPO_APORTE_NO_VIGENTE → recargar el combo
            └─ 422 FECHA_INVALIDA → limitar el datepicker a hoy
```

Si el mismo recibo cubre varios tipos, hacé las llamadas en secuencia y mostrá el resultado
consolidado. **Cada llamada es su propia transacción**: si la segunda falla, la primera ya quedó
grabada. Si necesitás atomicidad entre tipos, avisá y se agrega un endpoint que reciba el
desglose completo.

### C. Precancelación (siempre en dos pasos)

```
[Precancelar]
  └─ GET /prst/simularPrecancelacion/{id}?fecha=YYYY-MM-DD
       └─ Pantalla de confirmación:
            · exigibles (detalle)      · valorExigible
            · capitalFuturo            · interesCondonado  ← destacar el beneficio
            · valorTotalPrecancelacion ← el monto a cobrar
            └─ Repartir entre efectivo y aportes (la suma DEBE dar el total)
                 └─ POST /prst/precancelar
                      ├─ 200 → préstamo en estado 4, recargar ficha
                      └─ 422 MONTO_NO_COINCIDE → actualizar con valorTotalPrecancelacion
                                                  y pedir confirmación de nuevo
```

### D. Abono a capital (siempre en dos pasos)

```
[Abonar a capital]     ← ocultar si hay cuotas vencidas/parciales
  └─ Modal: valor + modalidad (1 reduce plazo / 2 reduce cuota)
       └─ GET /prst/simularAbonoCapital/{id}?valor&modalidad
            └─ Comparativa lado a lado:
                 · plazoActual → plazoNuevo    · cuotaActual → cuotaNueva
                 · ahorroIntereses             · tablaProyectada
                 └─ [Confirmar] → POST /prst/abonarCapital
                      ├─ 201 → RECARGAR la tabla de amortización (los ids cambiaron)
                      ├─ 422 PRESTAMO_NO_AL_DIA → ir a pagar cuotas
                      ├─ 422 ABONO_CUBRE_CAPITAL → ofrecer precancelación
                      └─ 422 CUOTA_NO_CUBRE_INTERES → sugerir modalidad 2
```

Dejá que el usuario cambie de modalidad y vuelva a simular sin cerrar el modal: es el
comparador que necesita para decidir.

### E. Historial y anulación

```
Ficha del préstamo → pestaña "Operaciones"
  └─ GET /evpr/porPrestamo/{idPrestamo}
       └─ Tabla: fecha · tipo · valor · usuario · estado
            · estado = 0 → fila gris "ANULADO" + motivo, sin acciones
            · estado = 1 → [Anular] SOLO en el primero de la lista (el más reciente vigente)
                 └─ Modal con motivo OBLIGATORIO
                      └─ POST /prst/anularOperacion
                           ├─ 200 → recargar eventos, tabla y ficha
                           └─ 409 EVENTO_POSTERIOR_VIGENTE → mostrar cuál anular primero
```

---

## 14. Cambios que rompen lo existente

### Endpoint eliminado

```
POST /rest/prst/aplicarAbonoCapital/{id}/{valorAbono}/{opcionRecalculo}     ❌ YA NO EXISTE
```

Lo reemplazan `GET /prst/simularAbonoCapital/{idPrestamo}` y `POST /prst/abonarCapital`. Además
del cambio de forma (montos en el body, no en la URL), **la semántica de la modalidad cambió**:

| Endpoint viejo | Endpoint nuevo |
|---|---|
| `opcionRecalculo = 1` → mantener plazo, reducir cuota | `modalidad = 2` |
| `opcionRecalculo = 2` → reducir plazo, mantener cuota | `modalidad = 1` |

⚠️ **Los números están invertidos.** Revisá cualquier pantalla que todavía llame al endpoint viejo.

### Endpoints deprecados para un uso

`GET /aprt/getAll` sigue existiendo, pero **no debe usarse para calcular saldos de aportes**.
Descarga ~980.000 filas y tumba el servidor. Usá `GET /aprt/saldosPorEntidad/{idEntidad}`.

`POST /aprt` (el CRUD crudo de la entidad `Aporte`) sigue existiendo, pero **no debe usarse para
registrar un pago de aportes**: inserta la fila tal cual la manda el frontend, forzando
`estado = 1` y dejando `valorPagado`/`saldo` como vengan. Una fila así puede quedar visible para
el FIFO del proceso Petro y volver a cobrarse, y no genera el `PagoAporte` de respaldo. Usá
`POST /aprt/registrarAporte`.

### Campos nuevos en entidades existentes

`PagoPrestamo` ahora incluye: `eventoPrestamo`, `asiento`, `anulado` (**0 = vigente, 1 = anulado**),
`usuarioAnulacion`, `fechaAnulacion`, `motivoAnulacion`.

> Si alguna pantalla lista los pagos de un préstamo, **debe filtrar `anulado = 0`** o marcar
> visualmente los anulados. Si no, los pagos reversados van a seguir apareciendo como válidos.

`PagoAporte` ahora incluye `pagoPrestamo` (el pago de préstamo que consumió el aporte).

### Campo a vigilar en la tabla de amortización

`saldoOtros` (`DTPRSLOT`) acumula los abonos a capital y el capital precancelado. En una cuota
con `saldoOtros > 0` **no se cumple** `saldoInicialCapital = capital + saldoCapital`: hay que
sumar `saldoOtros`. Si la pantalla valida ese cuadre, ajustá la fórmula.

### El total de la cuota ahora incluye la mora

Desde el **2026-08-14** existe un proceso que corre todos los días a las 02:00 y calcula el
interés de mora de las cuotas vencidas (ver `PROCESO-DIARIO-INTERES-MORA.md`). En una cuota
vencida:

| Campo | Qué trae ahora |
|---|---|
| `mora` (`DTPRMRAA`) | Interés de mora acumulado. **Crece todos los días** |
| `diasMora` (`DTPRDSMR`) | Días transcurridos desde el vencimiento |
| **`total`** (`DTPRTTLL`) | **Cuota + desgravamen + seguro + MORA** ← el monto a cobrar hoy |
| `estado` | Pasa a **5 (EN_MORA)** automáticamente |

La ficha del préstamo también cambia sola: `idEstado` pasa a **11 (EN_MORA)** cuando hay cuotas
vencidas y vuelve a **2 (VIGENTE)** cuando se regularizan.

> ✅ Para mostrar "cuánto debe pagar hoy" alcanza con `total`: ya trae la mora. **No la sumes
> aparte** o la mostrarías dos veces.

### Endpoints nuevos de recuperación del proceso de mora

Solo para el caso de que la corrida de las 02:00 haya fallado o el servidor haya estado apagado.
El proceso es idempotente: relanzarlo es seguro.

```
POST /SaaBE/rest/prst/calcularMora?fecha=2026-08-14&usuario=jperez      ← todo el sistema
POST /SaaBE/rest/prst/calcularMora/{idPrestamo}?usuario=jperez          ← un préstamo
```

Ambos parámetros son opcionales. Responden 200 con el mismo sobre `{exito, etapa, mensaje,
resultado}`; el `resultado` trae los conteos (`cuotasActualizadas`, `prestamosMarcadosEnMora`,
`totalMoraCalculada`, `prestamosConError`, `errores[]`). Un préstamo que falla **dentro** del
lote no produce error HTTP: viene contado en `prestamosConError`.
