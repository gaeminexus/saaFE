# Carga automática de documentos CXP desde el SRI

> **Documento de control.** Lo mantiene el agente árbitro (único con acceso a
> `saaBE` y `saaFE`). Los agentes de backend y frontend trabajan **solo** contra
> el contrato de la §6; no negocian cambios de contrato entre ellos.
>
> Creado: 2026-08-22 · Última actualización: 2026-08-23 (rev. 2)

---

## 1. Qué se quiere lograr

Hoy el usuario carga el TXT de "Recibidos" del SRI y después sube **el XML de
cada documento, uno por uno** — más de 50 al mes, con nombres de archivo que no
permiten distinguir cuál es cuál.

El TXT ya trae la **clave de acceso** de cada documento, y con esa clave el
servicio de autorización del SRI devuelve el XML completo. El objetivo es que el
usuario cargue el TXT y luego pulse **dos botones por carga**:

1. **Descargar XML del SRI** — baja todos los XML que el SRI todavía sirva.
2. **Registrar y contabilizar** — registra y contabiliza todo el lote.

Entre los dos botones queda un paso de **revisión y marcado**, donde el usuario
marca los documentos con comportamiento especial (hoy: facturas de reembolso de
gastos; mañana: otros) antes de que se contabilicen.

---

## 2. Hecho verificado — la ventana del SRI condiciona todo el diseño

Medido el **2026-08-22** contra producción (`cel.sri.gob.ec`), con claves reales
del TXT del cliente y con claves sintéticas de dígito verificador válido:

| Fecha de emisión consultada | Respuesta |
|---|---|
| 22/07/2026 y posteriores | en rango |
| **21/07/2026 y anteriores** | `No es posible validar la clave de acceso ya que la fecha de emision esta fuera del rango permitido` |

**La ventana es exactamente un mes hacia atrás, contado por día del mes.**

Con una clave **real** del TXT (factura del 01/04/2026), el servicio de
autorización responde:

```xml
<numeroComprobantes>0</numeroComprobantes><autorizaciones/>
```

sin mensaje ni código de error.

### Consecuencias de negocio — no son negociables

1. La descarga automática **solo sirve para el mes en curso**. Si un período se
   cierra tarde, esos XML ya no se pueden bajar nunca más.
2. **La carga manual de XML se conserva.** Es el camino obligatorio para todo lo
   atrasado y para lo que el SRI no devuelva. No se elimina ni se esconde.
3. `AutorizacionComprobantesOffline` **no dice por qué** devuelve vacío: fuera de
   ventana, clave inexistente y dígito verificador malo dan la misma respuesta.
   **El backend debe calcular la ventana por su cuenta ANTES de llamar** y no
   gastar la llamada de red en un documento que ya sabe que va a fallar.
4. Conviene que la operación corra la descarga varias veces al mes.

---

## 3. Decisiones tomadas por el usuario (2026-08-22)

| # | Decisión |
|---|---|
| a | **Dos botones**, no uno. Descargar XML y Registrar+contabilizar son pasos separados. |
| b | Los botones son **por carga TXT** (`idCargaTxt`), no por período: dentro de un mismo período hay TXT distintos para facturas y para retenciones. |
| c | Los documentos fuera de la ventana del SRI **se marcan** para que el usuario los suba a mano. |
| d | Antes de "Registrar y contabilizar" el usuario **debe poder marcar** los documentos con comportamiento especial (reembolso de gastos y los que vengan). |
| e | Debe existir en pantalla el **ingreso manual de documentos sustento** para las facturas de reembolso que vienen mal emitidas. |

---

## 4. Flujo objetivo

```
1. Cargar TXT                       (sin cambios)
       |
2. [Boton] Descargar XML del SRI    por idCargaTxt, asincrono
       - salta los que ya tienen XML o estan en estado 3
       - calcula la ventana ANTES de llamar -> FUERA_VENTANA sin gastar red
       - guarda el sobre <autorizacion> completo en docs/xml/cxp/{clave}.xml
       - valida XML contra TXT (reutiliza cargarXmlDocumento) -> estado 2
       - PRE-MARCA esReembolso=1 si el XML trae <reembolsoDetalle>
         o <codDocReembolso> en <infoFactura>
       |
3. REVISION Y MARCADO               pantalla, sin llamadas masivas
       - el usuario confirma o corrige el marcado de reembolso
       - el usuario clasifica los productos que quedaron POR CLASIFICAR
       |
4. [Boton] Registrar y contabilizar por idCargaTxt, asincrono
       - ORDEN OBLIGATORIO: Factura/Liquidacion -> NC/ND -> Retencion
       - una transaccion POR DOCUMENTO
       - lo que bloquea o falla queda estampado en el propio documento
       |
5. BANDEJA DE ATENCION
       - estado 2 + observacion  -> reembolso sin sustentos -> ingreso manual
       - bloqueados              -> clasificar productos / configurar catalogos
       - FUERA_VENTANA           -> subir XML a mano
```

### Por qué la pre-marca de reembolso es posible ahora y antes no

Hoy la detección de reembolso ocurre **durante** el registro, cuando ya es tarde
para que el usuario opine. Con la descarga previa **el XML ya está en disco antes
de registrar**, así que se puede detectar y proponer el marcado, y el usuario lo
confirma o lo corrige. Es exactamente lo que pide la decisión (d).

---

## 5. Modelo de datos

### 5.1 Columnas nuevas en `PGS.DCXP`

| Columna | Tipo | Campo Java | Contenido |
|---|---|---|---|
| `DCXPORXM` | `NUMBER(1)` | `origenXml` | `1`=Manual `2`=SRI. Null en los históricos |
| `DCXPRSRI` | `VARCHAR2(30)` | `resultadoSri` | `DESCARGADO` · `FUERA_VENTANA` · `NO_ENCONTRADO` · `NO_AUTORIZADO` · `ERROR_CONEXION` |
| `DCXPMSRI` | `VARCHAR2(500)` | `mensajeSri` | Mensaje devuelto por el SRI o el motivo calculado |
| `DCXPFDSC` | `TIMESTAMP` | `fechaDescargaSri` | Fecha del último intento de descarga |

DDL en `docs/logica-negocio/cxp/sql/08-carga-automatica-sri.sql` — **ejecutado el 2026-08-23**.
Los cuatro campos deben agregarse a `obtieneCampos()` de `DocumentoCxpDaoServiceImpl`.

> **Sin tabla de lotes.** El progreso se calcula en vivo contando `DCXP` de la
> carga; el "hay un lote corriendo" vive en un `@Singleton` en memoria. Si
> WildFly se reinicia a media ejecución el indicador se limpia y el usuario
> vuelve a pulsar el botón — la operación es idempotente. Una tabla de lotes
> costaría seis archivos por el estándar de capas y no aporta nada que los
> contadores en vivo no digan mejor.

### 5.2 Ojo con el nombre de la columna del path

La columna del XML es **`DCXPPXML`** (campo `pathXml`). Un comentario reciente en
`ProcesoCargaDocumentosServiceImpl` la llama `DCXPPTXM`: está equivocado.

---

## 6. Contrato de API — cerrado, no se negocia entre agentes

Base: `/SaaBE/rest/carga-documentos`

### 6.1 `POST /descargarXmlLote/{idCargaTxt}`

```jsonc
// request
{ "idEmpresa": 1236, "idUsuario": 5 }

// 202 Accepted - el lote arranco
{ "idCargaTxt": 45, "total": 53, "aProcesar": 48, "yaConXml": 5,
  "mensaje": "Descarga iniciada." }

// 409 Conflict - ya hay un lote corriendo para esta carga
{ "error": "Ya hay una descarga en curso para esta carga." }
```

> **El 202 es una garantía, no un aviso.** El indicador de "lote en curso" del
> `@Singleton` se levanta **de forma síncrona antes de devolver el 202**, no
> dentro del método `@Asynchronous`. Si se levantara dentro, el primer
> `GET /progresoLote` podría llegar antes que el arranque del worker, leer
> `enCurso:false` y hacer que el frontend dé por terminado un lote que ni
> empezó. El método asíncrono lo baja en un `finally`; si la invocación
> asíncrona falla, quien la invocó lo baja también. Aplica igual a §6.2.

### 6.2 `POST /registrarLote/{idCargaTxt}`

```jsonc
// request
{ "idEmpresa": 1236, "idUsuario": 5 }

// 202 Accepted
{ "idCargaTxt": 45, "aProcesar": 41, "sinXml": 7, "yaRegistrados": 5,
  "mensaje": "Registro iniciado." }

// 409 Conflict - lote en curso
```

### 6.3 `GET /progresoLote/{idCargaTxt}`

Un solo endpoint para los dos lotes. El frontend lo consulta cada 2 s mientras
`enCurso` sea `true`.

**Siempre responde 200**, corra o no un lote, y también para una carga que no
existe (devuelve todo en cero). El frontend solo consulta cargas de su propia
lista, así que un `404` no aportaría nada.

Una carga que nunca ejecutó un lote devuelve `enCurso:false`, `tipoLote:null`,
**`totalCarga` y los contadores poblados con lo que hay en la carga**,
`total:0`, `procesados:0` y `documentos[]` completo. Es el estado de entrada del
panel: sirve para ver la carga antes de tocar ningún botón.

`documentos[]` trae **siempre todos los documentos de la carga**, no solo los
que procesó el lote en curso. Si trajera el subconjunto, los contadores y la
lista dirían cosas distintas.

Los tres números del avance (§11 decisión 16):

| Campo | Significado |
|---|---|
| `totalCarga` | Documentos de la carga TXT. **Siempre poblado**, corra o no un lote |
| `total` | Tamaño de la lista de trabajo del lote **en curso**. `0` si no hay lote |
| `procesados` | Cuántos de esa lista ya tienen desenlace. `0` si no hay lote |

`total` y `procesados` **los mantiene el orquestador** en el `@Singleton`
`RegistroLotesCxp`; no se derivan del estado de la base. La barra es
`procesados / total` y solo se muestra con `enCurso`. Todo desenlace suma
—registrado, bloqueado, omitido o en error—, así que la barra siempre cierra en
100 %.

Derivarlos de la base obligaba a una consulta de "lo que falta" que tenía que
coincidir con la lista de trabajo del lote, y en el registro no puede coincidir:
la lista incluye a los que ya tienen `observacion` (para reintentar lo que el
usuario destrabó) y el avance necesita excluirlos. Ese desajuste hacía que la
barra marcara 100 % desde el primer segundo al reintentar un lote con documentos
bloqueados.

`bloqueantes` viaja vacío mientras no haya corrido un lote de **registro**:
calcularlos exigiría correr las validaciones de `registrarBD` sobre las 50 filas
en cada consulta de 2 s. Los produce la fase 3 y quedan cacheados en el
`@Singleton` — ver §11 decisión 8.

```jsonc
{
  "idCargaTxt": 45,
  "enCurso": true,
  "tipoLote": "DESCARGA",          // "DESCARGA" | "REGISTRO" | null
  "procesados": 41,                // del lote en curso; lo lleva el orquestador
  "total": 48,                     // lista de trabajo del lote en curso; 0 en reposo
  "totalCarga": 53,                // documentos de la carga TXT; siempre poblado
  "contadores": {                  // se calculan en vivo sobre DCXP
    "sinXml": 12,                  // estado null, o distinto de 2, 3 y 4
    "conXml": 31,                  // estado 2 SIN observacion
    "requierenAtencion": 3,        // estado 2 CON observacion
    "registrados": 5,              // estado 3
    "conError": 2,                 // estado 4
    "fueraVentana": 7              // resultadoSri = FUERA_VENTANA (subconjunto de sinXml)
  },
  "documentos": [
    { "id": 901, "serieComprobante": "001-012-020741173",
      "razonSocialEmisor": "MEGADATOS S.A.", "tipoComprobante": "Factura",
      "estadoDocumento": 2, "esReembolso": 1,
      "resultadoSri": "DESCARGADO", "mensajeSri": null,
      "observacion": null, "bloqueantes": [] }
  ]
}
```

`bloqueantes` reusa **exactamente** la forma que ya devuelve el 422 de
`registrarBD`: `[{ tipo, detalle, productos?, grupos? }]`.

Los cinco primeros contadores son **disjuntos y suman `totalCarga`**, y la partición
se reparte **solo por `estadoDocumento`** para que cierre por construcción. Si se
solaparan, la suma de los chips no daría el total de la carga y el usuario vería
documentos contados dos veces. `fueraVentana` es la excepción declarada: es un
subconjunto de `sinXml`, no una categoría aparte.

`sinXml` es un cajón de "pendientes de procesar", no literalmente "sin archivo":
recoge también los **revertidos** (estado 6), que conservan su `pathXml`. El
frontend debe rotular ese chip como **Pendientes** y usar la misma condición por
estado, o el número del chip y las filas de la grilla no coincidirán.

> **Hueco abierto para la fase 3 — reversión.** `revertirDocumento` deja el
> documento en estado 6 **sin limpiar `pathXml`**, y `registrarDocumentoBD`
> exige estado 2. Resultado: un documento revertido no entra en la lista de
> trabajo de la descarga (ya tiene `pathXml`) ni se puede registrar (no está en
> estado 2) — queda fuera de los dos lotes. Hay que resolverlo al definir la
> lista de trabajo del registro en la fase 3: o la reversión limpia `pathXml`, o
> el lote de registro admite estado 6 con `pathXml` reprocesándolo por
> `cargarXmlDocumento`. **No decidir esto en un ajuste de contadores.**
>
> **No es un callejón sin salida.** El documento revertido aparece bajo el chip
> *Pendientes* y su botón de fila "Subir XML" ya está habilitado para el estado
> 6, así que el usuario tiene cómo moverlo a mano. Lo que falta es que alguno de
> los dos lotes lo tome solo. Mientras la fase 3 no lo decida, es trabajo manual
> conocido, no un documento perdido.

### 6.4 `POST /clasificarProductosLote`

Destraba en un solo viaje todos los `PRODUCTOS_SIN_CLASIFICAR` de una carga.

```jsonc
// request
{ "idEmpresa": 1236,
  "asignaciones": [ { "idProducto": 88, "idGrupo": 4 },
                    { "idProducto": 91, "idGrupo": 7 } ] }

// 200
{ "actualizados": 2, "noEncontrados": [] }
```

### 6.5 `GET /productosSinClasificarLote/{idCargaTxt}`

```jsonc
{ "idCargaTxt": 45,
  "productos": [ { "id": 88, "nombre": "SERVICIOS PROFESIONALES", "codigo": null,
                   "grupoActual": "POR CLASIFICAR",
                   "documentos": ["001-012-020741173"] } ] }
```

### 6.6 Endpoints que NO cambian

`cargarTxt` · `cargarXml/{id}` · `registrarBD/{id}` · `procesarXml/{id}` ·
`resolverNovedad/{id}` · `revertir/{id}` · `marcarReembolso/{id}` ·
`contabilizarReembolso/{id}` · `recalcularTotalesReembolso/{id}` ·
`crearProductoPorClasificar` · `/rmbf/*`

La subida manual de XML **se conserva tal cual**.

---

## 7. Fases y asignación

| Fase | Qué | Agente | Bloquea a |
|---|---|---|---|
| **0.1** | Estampar el error en el documento con `REQUIRES_NEW` | BE | 1, 3 |
| **0.2** | Commit del fix de reembolso ya escrito (sin compilar) | usuario | — |
| **0.3** | Clasificación masiva de productos (§6.4, §6.5) | BE + FE | 3 |
| **1** | `SriAutorizacionService` + descarga por lote (§6.1, §6.3) | BE | 2 |
| **2** | Pantalla: botones, progreso, marcado de reembolso | FE | 3 |
| **3** | Registro y contabilización por lote (§6.2) | BE | 4 |
| **4** | Bandeja de atención + ingreso manual de sustentos | FE | — |

### Fase 0.1 — por qué es prerequisito y no un pendiente cosmético

`cargarXmlYRegistrar` y `registrarDocumentoBD` hacen `setEstadoDocumento(ERROR)`
+ `save` dentro del `catch` y después re-lanzan. El bean es `@Stateless` sin
`@TransactionAttribute`, así que la excepción revierte **toda** la transacción,
incluido ese marcado: **el documento nunca queda en estado 4 y la observación del
error se pierde**. Hoy eso es tolerable porque el usuario ve el mensaje en el
snackbar. En un lote de 50 documentos procesados sin nadie mirando, un error que
no se persiste es un error que no existió.

---

## 8. Reglas de oro para los dos agentes

### Backend

1. **Una transacción por documento.** El orquestador del lote va `@Asynchronous`
   y `@TransactionAttribute(NOT_SUPPORTED)`; cada documento se procesa llamando a
   un **bean distinto** con `REQUIRES_NEW`.
   **Trampa clásica de EJB:** llamar a `this.metodoRequiresNew()` no pasa por el
   proxy y **no abre transacción nueva**. Tiene que ser otro bean inyectado con
   `@EJB`, no una llamada interna.
2. **No escribir un cliente del SRI desde cero.** Ya existe y está en producción:
   `com.saa.ejb.cxc.util.SriHttpUtil` (resuelve el TLS del SRI) y
   `llamarAutorizacionSRI` en `FacturaServiceImpl:1705`, duplicado en otros cinco
   `serviceImpl` de CXC. Extraer a un servicio compartido y reutilizar.
3. **Guardar el sobre `<autorizacion>` completo**, no solo el `<comprobante>`
   interno. Así el archivo es idéntico al que el usuario baja del portal y
   `parsearXmlComprobante` (línea 3041) lo consume sin cambios — ya busca
   `<comprobante>` y parsea su CDATA. Si se guarda solo el interno se pierde
   `fechaAutorizacion`, que `registrarFacturaCompra` lee del XML **externo** con
   `getXmlValueOuter`.
4. **El ambiente sale del dígito 24 de la clave de acceso** (`1`=pruebas,
   `2`=producción), no de una constante.
5. **Serie, no paralelo.** Las llamadas al SRI van una a una, con reintento y
   espera creciente. 50 peticiones simultáneas es la forma más rápida de que el
   SRI nos corte.
6. **Idempotencia.** Los lotes se van a re-ejecutar. Saltar estado 3, saltar los
   que ya tienen XML, y respetar la guarda `registroBDVigente()`.
7. Mantener el estilo de la casa: `System.out.println` de traza al entrar,
   `throws Throwable`, `IncomeException` para errores de negocio.
8. **No tocar** `AsientoContableServiceImpl` ni la lógica de aplicación de pago.
   Este cambio es de orquestación, no de contabilidad.
9. **El orquestador del lote atrapa FUERA de la transacción del documento.**
   Cuando el bean `REQUIRES_NEW` lanza, el contenedor ya hizo el rollback y
   soltó el candado de la fila **antes** de que el control vuelva al
   orquestador. Por eso el orquestador debe llamar a `marcarError` en su propio
   `catch`, no confiar en el `catch` interno de `ProcesoCargaDocumentosServiceImpl`.
   Ver §11, decisión 3.
10. **La pre-marca de reembolso de la fase 1 solo agrega, nunca quita.** Si el
    XML descargado trae `<reembolsoDetalle>` o `codDocReembolso`, se marca
    `esReembolso=1` **solo si estaba en `0` o `null`**. Un documento que el
    usuario marcó a mano no se desmarca porque el XML no traiga el bloque —
    ese es precisamente el caso de las facturas mal emitidas de la decisión (e).

### Frontend

1. **Todo va en `gestion-documentos`.** No crear pantalla nueva y no tocar
   `bandeja-electronica` en esta tanda (está duplicada y se consolidará después).
2. **El marcado de reembolso no lleva `confirm()` por fila.** Hoy `toggleReembolso`
   abre un `confirm` por documento; con 50 filas es inusable. Checkbox directo en
   la grilla.
3. **Permitir marcar reembolso también en estado 3**, con advertencia clara de que
   se anula el asiento. El backend ya lo soporta (`marcarReembolso` anula el
   asiento y devuelve el documento a estado 2); es el frontend el que lo bloquea
   en `toggleReembolso`. Es la ruta de recuperación de las facturas ya
   registradas mal.
4. **Borrar el camino muerto de `requiereProductos` / `productosNuevos`.** El
   backend no devuelve nunca esas claves; el panel de asignar grupos de
   `gestion-documentos.component.ts:735-783` no se ejecuta jamás. Se reemplaza
   por la clasificación masiva de §6.4/§6.5.
5. **Completar `TIPO_LABELS`** con `TIPO_ASIENTO_NO_CONFIGURADO`,
   `CODIGOS_RETENCION_SIN_CUENTA`, `FACTURA_VENTA_NO_ENCONTRADA` y
   `RETENCION_MULTIDOCUMENTO`, que hoy se muestran con el código crudo.
6. **Fechas:** `LocalDate` como `yyyy-MM-dd`, `LocalDateTime` como ISO local sin
   zona. Nunca un `Date` crudo ni nada terminado en `Z`.
7. El polling de progreso se detiene cuando `enCurso` es `false`, y también al
   destruir el componente.

---

## 9. Defectos preexistentes que este cambio agrava

Se listan porque el lote los vuelve visibles, no porque haya que arreglarlos todos ahora.

| # | Defecto | Efecto en el lote |
|---|---|---|
| 1 | El estado 4 ERROR no se persiste | Fase 0.1 — **prerequisito** |
| 2 | El panel de clasificar productos es código muerto | Fase 0.3 — **prerequisito** |
| 3 | NC/ND/Liquidación sin bloqueantes estructurados: fallan con 500 y texto plano | Ruido inservible en el resumen del lote. Convertir a bloqueantes en fase 3 |
| 4 | `selectFacturaByNumero` no filtra por estado: una factura de venta anulada resuelve como sustento | Riesgo latente, fuera de alcance |
| 5 | `TipoAsientos`: factura de compra y las dos retenciones comparten `codigoAlterno=3` | Fuera de alcance, anotado |
| 6 | Sin paginación de servidor | 50 filas aguanta; con el histórico completo no |

---

## 10. Tablero de control

| Fase | Estado | Agente | Notas |
|---|---|---|---|
| 0.1 Error persistente | 🔵 verificado | BE | Desplegado. Cubre todo salvo el fallo del asiento — §11 decisión 3 |
| 0.2 Commit fix reembolso | ⬜ pendiente | usuario | 99 líneas sin compilar |
| 0.3 Clasificación masiva | ✅ entregado | BE + FE | Sin desplegar ni probar |
| 1 Descarga SRI | 🔵 verificado | BE | **Descarga real probada el 2026-08-23 sobre la carga 204: 11/11 DESCARGADO en 10 s, 0 errores.** Sobre `<autorizacion>` bien formado en disco. Barra cerró 52/52. Detalle en §12 |
| 2 Pantalla y marcado | ✅ entregado | FE | Compila limpio. Chip sincronizado con §11 decisión 11, rótulo Pendientes, cabecera y rama 404 cerradas. **Sin probar contra datos reales.** |
| 3 Registro por lote | ✅ entregado | BE | Incluye decisiones 16 y 17. Sin desplegar ni probar |
| 4 Bandeja de atención | ⬜ pendiente | FE | |

Leyenda: ⬜ pendiente · 🟡 en curso · ✅ entregado · 🔵 verificado por el usuario

---

## 11. Bitácora de decisiones del árbitro

### 1 — Quitar el badge REEMBOLSO de la columna de tipo de comprobante (2026-08-23)

El badge de `gestion-documentos.component.html:169` y `:323` queda pegado al
checkbox nuevo y dice lo mismo. Se elimina; el checkbox es la única fuente.

### 2 — El checkbox se queda en la pestaña Procesados (2026-08-23)

Es la **única** ruta para corregir una factura de reembolso que ya se registró
mal (decisión (e) del usuario). El `confirm` con el texto de que se anula el
asiento es resguardo suficiente.

### 3 — NO se agrega `@Asynchronous` al marcado de error (2026-08-23)

El backend propuso `@Asynchronous` en `marcarError` para cerrar el hueco del
`ORA-00054` cuando falla `generarAsientoCxp` con la fila ya bloqueada. Se
rechaza:

1. **No hace falta donde importa.** El hueco solo existe porque hoy `marcarError`
   se llama *dentro* del `catch` de la transacción que falló. En el lote (fase 3)
   el orquestador atrapa **fuera** del bean `REQUIRES_NEW`: para cuando el control
   vuelve, el contenedor ya hizo rollback y soltó el candado. El marcado funciona
   sin ninguna maquinaria extra, y el lote desatendido es la razón por la que
   existe la fase 0.1.
2. **En el camino interactivo el costo no se paga.** Ahí el usuario ve el error en
   el snackbar en el momento; que además quede estampado es deseable, no crítico.
3. **Introduce una escritura tardía sobre estado contable.** Fire-and-forget
   significa que si el usuario pulsa "Reintentar" y el reintento tiene éxito
   (estado 3), el worker rezagado puede estampar estado 4 encima de un documento
   correctamente registrado. Poco probable, pero es un riesgo nuevo a cambio de
   un beneficio que la fase 3 ya da gratis.

El comportamiento actual — `NOWAIT`, fallo inmediato, motivo en el log — se
conserva tal cual. Queda anotado como límite conocido del camino interactivo.

### 4 — Cierres del contrato de §6.3 (2026-08-23)

Cuatro huecos que el frontend encontró al implementar. Todos quedaron escritos
en §6.1 y §6.3; se listan aquí para dejar constancia del criterio:

1. **`documentos[]` es toda la carga**, no el subconjunto procesado — si no, la
   lista y los contadores dirían cosas distintas.
2. **El 202 garantiza el indicador.** Se levanta síncrono antes de responder. El
   frontend puede confiar en la primera lectura y **quitar** la heurística de
   "dos lecturas seguidas con `enCurso:false`".
3. **`progresoLote` siempre responde 200**; `404` solo si la carga no existe.
4. **`total` es el denominador del lote en curso**, y se agrega `totalCarga`
   para el total de la carga. Sin esa separación la barra no llegaba a 100 % en
   una re-ejecución.

### 5 — El botón de bloqueantes se queda (2026-08-23)

El frontend lo agregó sin que estuviera pedido. Es correcto: sin él, los
`bloqueantes` de §6.3 no se verían en ninguna parte después de un lote de
registro. No invade la fase 4, que es la bandeja de atención, no el detalle por
documento.

### 6 — `mensajeSri` va en la celda de estado, no en la fila (2026-08-23)

Como tooltip de fila se superpone con los tooltips propios de clave de acceso,
novedad y badges. `mensajeSri` solo tiene valor cuando la descarga del SRI no
salió bien, que es exactamente donde vive el distintivo `FUERA DE VENTANA`.
### 7 — XML descargado pero discrepante con el TXT → estado 4 (2026-08-23)

Caso que el contrato no había previsto y que el backend resolvió por su cuenta:
el SRI devuelve el comprobante pero sus valores no cuadran con la línea del TXT.
Se ratifica lo que hizo: `resultadoSri = DESCARGADO` (la llamada al SRI **sí**
salió bien; ese campo describe la conversación con el SRI, no el destino del
documento), el detalle de las diferencias en `mensajeSri` y en `observacion`, y
el documento a **estado 4**.

Dejarlo en estado 1 para que cayera en `sinXml` sería peor: invitaría al usuario
a subir el XML a mano para chocar con la misma discrepancia. Como error queda a
la vista en el chip `conError`, con el diff a mano, y sigue siendo recuperable.

### 8 — `bloqueantes` se cachea en el `@Singleton`, no se recalcula (2026-08-23)

Correcto no calcularlos en cada consulta de progreso. La fase 3 guarda los
bloqueantes estructurados del último lote de registro en el `@Singleton`, por
carga, y §6.3 los sirve desde ahí. Sobreviven mientras WildFly esté arriba, que
cubre la sesión de trabajo; tras un reinicio se vacían y el usuario conserva el
texto en `observacion`. Sin DDL y sin recálculo.

### 9 — `total` = documentos de la carga; `totalCarga` se elimina (2026-08-23)

El backend tenía razón en dos cosas: el ejemplo de §6.3 traía números que no
cuadraban entre sí, y un `totalCarga` separado era redundante. Se corrige el
ejemplo y se elimina el campo.

Lo que **sí** cambia respecto de lo entregado es la definición de `procesados`:
pasa de *"los que tienen un desenlace escrito"* a *"`total` menos los pendientes
del lote en curso"*, con la misma consulta que arma la lista de trabajo. Con la
definición anterior, un documento que el lote no va a tocar queda fuera del
numerador para siempre y la barra se clava antes del 100 % — indistinguible de
un cuelgue.


### 10 — `FUERA_VENTANA` sale de la lista de trabajo de la descarga (2026-08-23)

El backend detectó que la decisión 9 dejaba el mismo síntoma en el otro lote: un
documento fuera de ventana conserva `pathXml` nulo y estado 1, así que sigue en
la lista de trabajo de la descarga y la barra termina en 46/53 con
`enCurso:false`.

Se aplica su propuesta, y el argumento es el correcto: **la ventana es
monótona**. Un documento fuera de rango hoy está más fuera mañana; reintentarlo
no puede tener éxito nunca. Excluirlo no pierde nada, porque su camino es la
subida manual del XML, que es justo lo que la decisión (c) del usuario definió.

`NO_ENCONTRADO`, `NO_AUTORIZADO` y `ERROR_CONEXION` **siguen** en la lista: son
reintentables. Con el SRI caído la barra quedará corta, y eso es honesto —
queda trabajo real por hacer.

### 11 — La partición de contadores va solo por `estadoDocumento` (2026-08-23)

El backend encontró un hueco que yo no había visto: `revertirDocumento` deja
estado 6 sin limpiar `pathXml`, así que con la condición literal del contrato
(`sinXml` = "estado 1/6 sin pathXml") un documento revertido no caía en ningún
chip y los cinco no sumaban `total`.

Se acepta repartir **solo por estado**. El precio —un revertido que conserva su
XML se cuenta en `sinXml`— es correcto en comportamiento aunque el nombre sea
impreciso: ese documento necesita acción para avanzar, igual que un LEÍDO. Se
rotula el chip como **Pendientes** en la pantalla y se deja anotado en §6.3 el
hueco de fondo, que se resuelve en la fase 3.

---

## 12. Prueba en vivo de la fase 1 — 2026-08-23

Ejecutada por REST contra el WildFly local, carga **204** (empresa 1236,
usuario 1249), 52 documentos de los cuales 11 estaban pendientes de XML y todos
emitidos entre el 01 y el 16 de agosto — dentro de la ventana.

| Paso | Resultado |
|---|---|
| `POST /descargarXmlLote/204` | **202** en 0,65 s · `{total:52, aProcesar:11, yaConXml:41}` |
| `GET /progresoLote/204` durante | `enCurso:true`, `tipoLote:"DESCARGA"`, `procesados` 46→47→…, `sinXml` 11→6→5→0 |
| Final | `procesados:52 / total:52`, `sinXml:0`, `conXml:11`, `conError:0`, `fueraVentana:0`, `enCurso:false` |
| Log | `descargados=11 sinResultadoDelSri=0 conError=0 omitidos=0` en 10 s (04:18:14→04:18:24) |
| Disco | 11 archivos nuevos en `C:\saaUploads\docs\xml\cxp\{claveAcceso}.xml` |
| `DCXP` | `estadoDocumento=2`, `origenXml=2`, `resultadoSri=DESCARGADO`, `fechaDescargaSri` poblada |

Riesgos que la prueba descartó, todos de una vez: WildFly tiene salida a
internet; el TLS del SRI funciona desde el servidor y no solo desde `curl`; el
`@Asynchronous` arranca de verdad (202 en 0,65 s con el lote corriendo detrás);
el handshake síncrono del indicador funciona (la primera lectura ya vio
`enCurso:true`); el recorte del sobre produce un XML bien formado; y la
validación contra el TXT no rechazó nada de lo que el propio SRI devolvió.

**El sobre guardado trae el comprobante escapado (`&lt;`), no en CDATA.** Da
igual: `parsearXmlComprobante` usa `getTextContent()`, que desescapa las
entidades. Queda dicho para que nadie "corrija" el recorte pensando que falta el
CDATA.

**Sin probar todavía:** un documento con `resultadoSri` distinto de `DESCARGADO`
(no hubo ninguno fuera de ventana ni ningún fallo del SRI), la pre-marca de
reembolso (los 11 eran facturas normales, ninguna con bloque `<reembolsos>`), y
el registro contable de un XML bajado por esta vía.

### 12 — El lote de registro NO toca los revertidos (2026-08-23)

Resuelve el hueco que §6.3 dejaba anotado. La lista de trabajo del lote de
registro es **estado 2 con `pathXml`**, y nada más. Los revertidos (estado 6)
quedan fuera a propósito.

El motivo no es técnico sino de negocio: **revertir es un acto deliberado**. Si
el lote los volviera a registrar, la próxima corrida desharía en silencio una
decisión que alguien tomó a mano. Su camino sigue siendo el botón "Subir XML" de
la fila, que ya está habilitado para el estado 6.

Queda descartada la alternativa de que la reversión limpie `pathXml`: obligaría
a volver a bajar el XML del SRI, y un documento revertido con más de un mes
encima **ya no se puede bajar** (§2). Se perdería el archivo que ya está en
disco.

### 13 — Cómo se cuentan los pendientes del lote de registro (2026-08-23)

`pendientesDelLoteEnCurso` con `tipoLote = REGISTRO` cuenta:

```
estado = 2  AND  pathXml is not null  AND  observacion is null
```

La condición de `observacion` es la que hace que la barra **siempre cierre en
100 %**, y no es un truco: es la misma regla de la decisión 9 aplicada aquí.
Todos los desenlaces posibles sacan al documento del conjunto —

| Desenlace | Efecto |
|---|---|
| Registrado bien | estado 3 |
| Bloqueado (`pendienteClasificacion`) | sigue en estado 2 pero con `observacion` |
| Reembolso sin sustentos | sigue en estado 2 pero con `observacion` |
| Excepción | estado 4 vía `marcarError` |

— así que ninguno se queda en el numerador sin haber sido atendido. Y encaja con
los contadores de §6.3 sin inventar nada: lo que sale del conjunto por
`observacion` es exactamente lo que aparece en el chip `requierenAtencion`.

### 14 — Ratificaciones de la fase 0.3 (2026-08-23)

1. **La consulta de §6.5 se duplica a propósito.** No se pudo reutilizar
   `obtenerProductosPendientesDeClasificar`: devuelve `List<String>` y en la
   rama de `DFCC` proyecta **`df.descripcion`**, el texto de la línea de la
   factura, no el producto. §6.5 tiene que publicar el `id` del `ProductoPago`,
   y volver de una descripción libre al producto sería adivinar — dos líneas
   pueden describir distinto el mismo producto. La consulta nueva es copia fiel
   (mismos joins, filtros y rubro) proyectando `distinct p`. Queda anotado en
   los dos sitios que la regla del reembolso vive por duplicado.
2. **`422` para el error de negocio** en `clasificarProductosLote`, `500` para
   lo demás. Es el mismo criterio que ya usa `registrarBD` en esa clase.
3. **`noEncontrados` lleva los `idProducto`**, no un array vacío: el frontend
   necesita saber qué filas marcar.
4. **Un producto de otra empresa revierta el envío entero.** Un `idProducto`
   inexistente es una fila que se borró entre la consulta y el POST, y va a
   `noEncontrados`; pero un producto que existe y es ajeno a la empresa es una
   mezcla de datos, no una carrera. Mejor cortar que aplicar a medias.
5. **`aLong` para los enteros de Jackson.** Jackson entrega `Integer` cuando el
   valor cabe, así que un cast directo a `Long` revienta. Aplica a cualquier
   `Map<String,Object>` que llegue de un body JSON.

### 15 — Pendiente menor: `descripcion` vs `nombre` (2026-08-23)

`obtenerProductosPendientesDeClasificar` es **inconsistente consigo mismo**: su
rama de reembolso proyecta `p.nombre` y su rama normal `df.descripcion`. El
bloqueante de `registrarFacturaCompra` (línea 1175) usa `getNombre()`, y la
consulta nueva de §6.5 también. La única que se sale del molde es esa línea.

Efecto práctico hoy: bajo. `/productosPendientes/{id}` no lo consume el
frontend, y el `422` de bloqueantes no pasa por ahí. Pero en cuanto la pantalla
de clasificación masiva conviva con el diálogo de bloqueantes, el usuario podría
ver **dos textos distintos para el mismo producto**. Cambiar la proyección a
`p.nombre` alinea las tres fuentes.

### 16 — Se restaura el modelo de tres números; el avance lo lleva el orquestador (2026-08-23)

**Revierte la decisión 9, y el error fue del árbitro.** Acepté eliminar
`totalCarga` porque parecía redundante con `total`. No lo era: servían a cosas
distintas. Al quitarlo, el avance quedó obligado a derivarse del estado de la
base, y eso obligó al parche `observacion is null` de la decisión 13 — que se
rompe en cuanto se reintenta un lote.

El síntoma concreto: segunda corrida sobre una carga con 20 documentos
bloqueados. Lista de trabajo 20, pendientes 0 (todos tienen `observacion`), así
que `procesados = total` y **la barra marca 100 % desde el primer segundo**. En
el lote de descarga no pasaba porque allí la lista de trabajo y los pendientes
son el mismo string; en el registro no pueden serlo: la lista debe incluir a los
que llevan `observacion` (para reintentar lo que el usuario destrabó) y el
contador debe excluirlos (para que la barra cierre).

Modelo definitivo:

| Campo | Significado |
|---|---|
| `totalCarga` | Documentos de la carga TXT. **Siempre poblado**, corra o no un lote |
| `total` | Tamaño de la lista de trabajo del lote **en curso**. `0` si no hay lote |
| `procesados` | Cuántos de esa lista ya tienen desenlace. `0` si no hay lote |

`total` y `procesados` **los mantiene el orquestador** en el `@Singleton`
`RegistroLotesCxp`, no se derivan de la base: el orquestador es la única
autoridad sobre su propio avance, sabe exactamente cuántos va a tocar y cuántos
lleva. Aplica a **los dos lotes**, descarga y registro, para que se comporten
igual. Si WildFly se reinicia a media corrida, el indicador se limpia y los tres
números vuelven al estado de reposo — el lote se re-ejecuta, que es idempotente.

Los seis contadores de §6.3 **no cambian**: se siguen calculando en vivo sobre
`DCXP` y siguen sumando `totalCarga`. La barra es `procesados / total`, y solo
se muestra con `enCurso`.

Queda sin efecto la definición de pendientes de la decisión 13: ya no hace falta
`PENDIENTES_REGISTRO`.

### 17 — Los reembolsos pendientes se omiten, no se marcan en error (2026-08-23)

Se acepta la propuesta del backend. `ProcesoCargaDocumentosService` expone
`boolean tieneRegistroVigente(Long idDocumentoCxp)`, que delega en el
`registroBDVigente` privado que ya existe, y el lote **omite** esos documentos
sin tocarlos: conservan su estado 2, su `observacion` y su sitio en
`requierenAtencion`.

Es la discriminación correcta entre los dos casos de "estado 2 con
`observacion`":

| Caso | ¿Fila destino viva? | Qué corresponde |
|---|---|---|
| Bloqueado por `PRODUCTOS_SIN_CLASIFICAR` | No — el bloqueante corta antes de grabar | Reintentar: el usuario pudo clasificar entre corridas |
| Reembolso sin sustentos | **Sí** — la `FCTC` ya está creada | Omitir: necesita `contabilizarReembolso`, no `registrarDocumentoBD` |

Exponer un método de solo lectura no viola el "no tocar `registrarDocumentoBD`
por dentro": no cambia la lógica de registro, solo publica un predicado que ya
existía. Las tres alternativas que el backend descartó estaban bien descartadas
—`idDocumentoBD is null` rompe `resolverNovedad REEMPLAZAR`, replicar el switch
diverge, y olfatear el texto de la excepción es frágil.

Los omitidos cuentan como procesados en el avance del orquestador: el lote los
atendió y decidió no tocarlos.

### 18 — El bloqueante de la retención está roto desde el 2026-08-13 (2026-08-23)

Sale del desvío que el backend hizo en la fase 3b, y va más allá de esa tarea.

`IncomeException` es `@ApplicationException(rollback = true)`
(`basico/util/IncomeException.java:16`). Cuando una excepción así **cruza la
frontera de un EJB**, el contenedor marca la transacción del llamador para
rollback *antes* de entregársela — atraparla no la desmarca.

`AplicacionPagoCxcService.resolverFacturaPorNumero` lanza `IncomeException`
(`AplicacionPagoCxcServiceImpl:874, 882, 886`) y se invoca por `@EJB`
(`ProcesoCargaDocumentosServiceImpl:143`). Los dos bloqueantes
`FACTURA_VENTA_NO_ENCONTRADA` de las retenciones (líneas **2524-2532** y
**2749-2757**) lo atrapan y arman el mapa estructurado — pero para entonces la
transacción ya está condenada.

Desenlace real: el método retorna bien, el contenedor intenta hacer commit,
encuentra la marca de rollback y lanza `EJBTransactionRolledbackException`. El
REST la atrapa y devuelve **500 con un mensaje opaco**, no el `422` con
`bloqueantes` que documenta §5 de `proceso-carga-documentos.md`.

**Es decir: la corrección del 2026-08-13 no está surtiendo efecto.** El síntoma
que venía a resolver —"documento sustento no encontrado que revienta con un 500
poco claro"— sigue igual, solo que ahora por otro motivo.

La solución es la que el backend aplicó en NC/ND: resolver con
`AplicacionPagoCxcDaoService.selectFacturaByNumero(...)`, que devuelve lista y
no lanza. Misma consulta, así que el bloqueante y la aplicación de pago del
Paso 4 siguen sin poder discrepar.

> **Regla general que se desprende, y aplica a todo el proyecto:** dentro de una
> transacción que debe sobrevivir, **nunca llames a otro EJB que comunique el
> fallo con `IncomeException` si piensas atrapar el error y continuar**. Usa el
> DAO, o un método que devuelva vacío en vez de lanzar. Atrapar no basta.

### 19 — Todos los documentos CXP usan el tipo de asiento de la factura (2026-08-23)

**Decisión del usuario.** Cierra el `TODO: verificar codigoAlterno en BD` que
arrastraban `NOTAS_CREDITO_COMPRA (10)`, `NOTAS_DEBITO_COMPRA (11)` y
`LIQUIDACIONES_COMPRA_RECIBIDAS (12)` desde antes de este proyecto.

Todos los documentos de la carga CXP se contabilizan con el **mismo tipo de
asiento que la factura de compra**, `codigoAlterno = 3`, exactamente como ya
hacen las dos retenciones. No se crean tipos 10/11/12.

Comprobado en la base de ASOPREP el 2026-08-23: los `codigoAlterno`
configurados son **0, 1, 2, 3, 4, 5 y 6**. No existen el 10, el 11 ni el 12 — y
no es casualidad que las tres tablas destino de esos tipos estén **vacías**
(`NTCC`, `NTDC`, `LQCC` con 0 filas) mientras `FCTC` tiene 134 y `RCV2` tiene 8.
Los únicos tipos que nunca se registraron son justo los que no tenían tipo de
asiento.

Efecto sobre la decisión 18: con `codigoAlterno = 3` para todos,
`codigoByAlterno(3)` resuelve siempre en esta empresa y la rama rota **deja de
ser alcanzable aquí**. El arreglo del DAO sigue siendo correcto y se mantiene,
pero pasa a ser defensa para una empresa mal configurada, no un bloqueante.

> **Aclaración para el registro:** el árbitro dijo que este defecto bloqueaba la
> prueba del lote. **No la bloquea.** Las ocho cargas suman 209 documentos —
> 196 facturas y 13 retenciones, **cero** NC/ND/Liquidación —, así que el lote
> no puede toparse con ese camino. Y la contabilidad de lo que sí se usa nunca
> estuvo comprometida: con el tipo 3 existente, el camino normal siempre
> funcionó.
