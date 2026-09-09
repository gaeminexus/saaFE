# Reenviar al SRI una retención electrónica que quedó atascada

**Equipo:** `omen-saa-2` · **Fecha:** 2026-09-09 · **Encargo:** el usuario, urgente.
**Módulo:** `cxc` (retención V2, `CBR.RTV2`).

---

## 1. Por qué existe

**2026-09-09, caso real.** El usuario emitió una retención (clave
`0909202607179136759600120010010000073381234567811`) y el servicio de **recepción** del SRI
contestó con un fault de su propia infraestructura:

```xml
<faultcode>soap:Server</faultcode>
<faultstring>org.hibernate.exception.GenericJDBCException: Could not open connection</faultstring>
```

Es decir: **el SRI no pudo abrir conexión contra su propia base**. Nada del lado nuestro.

El problema es lo que pasó después:

1. `RetencionV2ServiceImpl:911` graba **`estado = 4` (enviada) sin mirar** qué contestó recepción.
   La retención quedó marcada como enviada cuando el SRI nunca la recibió.
2. El único camino de emisión que el frontend usa es **`POST /rtv2/procesarCompleta`**, que
   **crea una retención desde cero** — no reenvía una existente.
3. El backend **sí tiene** `POST /rtv2/autorizar`, que reenvía… y **ninguna pantalla lo llama**
   (verificado por grep sobre todo `saaFE`: cero llamadas).
4. El botón **"Reintentar Estado"** de la pantalla de consulta llama a
   `/consultarYActualizarEstado`, que **solo consulta autorización**. Mientras el SRI no la haya
   recibido devuelve *"No existen datos para los parámetros ingresados"* — para siempre.

**Resultado: la retención quedó sin salida.** Es la misma forma de fallo que este equipo ya
registró tres veces en septiembre: **la función existe, le falta la puerta.**

> **Y el SRI se va a volver a caer.** Esto no es un arreglo para un caso: es la puerta que faltaba.

---

## 2. El endpoint nuevo

```
POST /rest/rtv2/reenviarSRI/{idRetencion}
```

Sin cuerpo. Todo lo que hace falta se deriva de la retención.

### 2.1 Qué hace, en orden

1. Carga la `RetencionV2` por id. Si no existe → **404**.
2. **Guarda de estado** (§3).
3. Busca el **XML firmado** en `PathRetencionV2` con `alterno = 3`, y lo lee del disco.
   - Si no hay fila `alterno = 3`, o el archivo no está en disco → **409** con mensaje explícito.
     ⛔ **No regenerar ni re-firmar en este endpoint**: el XML firmado es el que el SRI ya vio, y
     regenerarlo cambia la firma sin que nadie lo pida. Si falta, es otro frente.
4. Resuelve `idFacturador`, `ambiente` y `clave` **de la propia retención**, nunca de parámetros
   del cliente. El `ambiente` sale del facturador en base, como ya hace
   `RetencionV2ServiceImpl:131`.
5. Llama a `retencionV2Service.autorizarRetencionV2(idFacturador, ambiente, 1L /*conectaSRI*/,
   clave, idRetencion, xmlFirmado, null, null)` — el método que ya existe y ya funciona.
6. Devuelve el resultado (§4).

### 2.2 Lo que NO hace

- No crea ni modifica detalles.
- No vuelve a generar contabilidad ni a aplicar el pago: eso ya se hizo cuando se emitió.
- No re-firma.

---

## 3. Guarda de estado — y por qué así

`estado` en `RetencionV2` **no es el flag genérico**: es el flujo de emisión electrónica
(ver `CriterioVentaVigente`, commit `282c3361`).

| `estado` | Significa | ¿Reenviar? |
|---|---|---|
| 1 | creada | ❌ **409** — nunca se firmó; el camino es `procesarCompleta` |
| **3** | firmada | ✅ **sí** |
| **4** | enviada | ✅ **sí** — es el caso de este incidente |
| 5 | **autorizada** | ❌ **409** — *"La retención ya está autorizada (Aut. XXX). No se reenvía."* |
| **6** | no autorizada | ✅ **sí** — el SRI la rechazó; corregido el motivo, se reintenta |

⛔ **El 5 se rechaza sin excepción.** Reenviar una autorizada no la duplica en el SRI (contestaría
`CLAVE ACCESO REGISTRADA`), pero sí volvería a disparar el guardado de XML y la generación del
RIDE sobre un comprobante cerrado. No hay razón para permitirlo.

> **Regla que este equipo aprendió el 2026-09-08 (§37) y aplica acá:** antes de exigir un estado,
> comprobar que algo lo produzca. Los tres estados permitidos (3, 4, 6) los escribe
> `RetencionV2ServiceImpl` en el flujo de emisión — verificado en sus `setEstado`.

---

## 4. Respuestas

**200 — el reenvío corrió.** El contenido dice cómo terminó:

```json
{ "exito": true,  "estado": 5, "mensaje": "Comprobante Autorizado", "autorizacion": "09092026...", "clave": "0909..." }
{ "exito": false, "estado": 4, "mensaje": "Estado: DEVUELTA | [ERROR] Id:39 Msg:...", "clave": "0909..." }
```

⚠️ **`200` no significa autorizado.** Significa que se pudo reenviar y el SRI contestó. El
frontend **debe** mirar `exito`/`estado`, nunca el código HTTP.

| Código | Cuándo |
|---|---|
| **200** | Se reenvió y el SRI contestó (autorizado o no) |
| **404** | No existe esa retención |
| **409** | Estado no reenviable (1 o 5), o falta el XML firmado |
| **500** | Error inesperado. El mensaje lleva el texto del fault |

### 4.1 🔴 El mensaje tiene que decir la causa real

En este incidente el usuario vio *"No existen datos para los parámetros ingresados"* —que describe
una consecuencia— mientras la causa (`Could not open connection` del servidor del SRI) quedaba
enterrada en un `.txt` del disco que nada le señalaba.

**Cuando recepción falle, el `mensaje` de la respuesta tiene que traer el `faultstring` o el
`<mensaje>`/`<informacionAdicional>` que devolvió el SRI**, no un texto genérico. Es la diferencia
entre "el SRI está caído, reintentá en un rato" y una tarde perdida.

---

## 5. Frontend

**Pantalla:** `cxc/forms/emitir/retencionesv2` (y, si la fila lo permite,
`cxc/forms/gestionar/consulta-documentos-electronicos`).

- **Botón "Reenviar al SRI"**, visible **solo** si `estado ∈ {3, 4, 6}`. Con `estado = 5` no se
  muestra; con `estado = 1` tampoco.
- Confirmación previa: *"Se volverá a enviar el comprobante al SRI. ¿Continuar?"*
- Mientras corre, deshabilitado con spinner: el reenvío llama a dos web services del SRI y puede
  demorar varios segundos.
- Al volver: refrescar la fila y **mostrar el `mensaje` del backend tal cual**, sin reemplazarlo por
  un texto propio. Verde si `exito = true`, ámbar si `false`.
- ⛔ **No duplicar la regla de estados en el frontend** más allá de mostrar u ocultar el botón. La
  decisión la toma el backend; el botón solo evita el clic obvio.

---

## 6. Lo que este frente NO resuelve

- **El `estado = 4` que se graba aunque recepción falle** (`RetencionV2ServiceImpl:911`). Sigue
  igual: es frente aparte, y hasta que se arregle una retención puede figurar como "enviada" sin
  estarlo. Este botón es justamente lo que la saca de ahí.
- **El ambiente fijo en `1L`** de `RetencionV2Rest:161` (`procesarCompleta`), con el comentario
  *"cambiar a 2L para producción"*. Hoy queda tapado porque el servicio lo pisa con el valor del
  facturador — pero un facturador sin ambiente configurado mandaría comprobantes al ambiente de
  pruebas en silencio.
- Facturas, notas de crédito y notas de débito: tienen el mismo hueco. Si esto funciona, se replica.
