# API — Documentos de seguros en CxP: marca, bloqueo de pago y enlace con las pólizas de crédito

**Equipo:** `omen-saa-2` (CxP) · **Consumidor:** `omen-saa-1` (crédito, pólizas de seguro de préstamos)
**Escrito:** 2026-10-02 por `omen-saa-2-arb`, **antes** de despachar.
**Espejo FE:** `saaFE/docs/cxp/API-DOCUMENTOS-SEGUROS-CXP.md`. **DDL:** `cxp/sql/e2-79` (⛔ va **antes** del WAR).
**Diseño de crédito:** `crd/DISENO-POLIZAS-SEGURO-PRESTAMOS.md` §5 (decisión S7).

---

## 1. Qué se pidió y qué se decidió

Crédito distribuye la prima de las pólizas (desgravamen, incendio y prendario) en las cuotas de los
préstamos. La aseguradora manda **facturas**, **notas de débito** (inclusiones) y **notas de crédito**
(exclusiones), y las tres pueden traer retención. **La contabilidad la hace CxP**, contra el activo de
seguros pagados por anticipado. Crédito no genera asientos (§5.6 del diseño de crédito).

| # | Decisión | Quién |
|---|---|---|
| D1 | Un documento de seguros **no se puede pagar** hasta que crédito lo libere. El pago sigue después el circuito normal de CxP y Tesorería | crédito (S7) |
| D2 | El documento lo crea **siempre la carga del XML de CxP**. Crédito usa ese servicio si el documento todavía no está | `omen-saa-1-arb` |
| D3 | La **ND** se registra y se contabiliza al cargarse, pero **no se aplica a la factura (no sube su saldo) hasta que crédito la libere** | usuario, 2026-10-02 |
| D4 | La **NC** se aplica a la factura al registrarse, **como hoy**: no saca dinero | usuario |
| D5 | Si los productos del XML no están clasificados, el documento **queda pendiente en CxP**, marcado de seguros, hasta que contabilidad los clasifique | usuario |
| D6 | La marca se pone en **Gestión de Documentos**, en el mismo diálogo donde hoy se marca intermediario | usuario |
| D7 | El enlace es `CRD.POSG.POSGCDGO`. Cada factura, ND o NC de seguros es una fila POSG distinta | `omen-saa-1-arb` |
| D8 | Desenlazar = **volver a bloquear**. Si el documento ya tiene pagos, el desenlace se rechaza | `omen-saa-1-arb` |

## 2. Estado de seguros (`e2-79`)

Columnas nuevas, las mismas en `PGS.FCTC`, `PGS.NTDC` y `PGS.NTCC`:

| Columna | Java | Valores |
|---|---|---|
| `FCTCESSG` / `NTDCESSG` / `NTCCESSG` | `Long estadoSeguro` (no nulo, por defecto 0) | **0** no es de seguros · **1** de seguros **BLOQUEADO** · **2** de seguros **LIBERADO** |
| `FCTCPOSG` / `NTDCPOSG` / `NTCCPOSG` | `Long idDocumentoSeguro` | `POSGCDGO` de crédito, o nulo |

Y en la bandeja de carga, `PGS.DCXP`: `DCXPESSG` (`Long esSeguro`, 0/1, no nulo, por defecto 0) y
`DCXPPOSG` (`Long idDocumentoSeguro`), para los documentos que todavía no se registraron (§5.2).

Constantes en `rubros/EstadoSeguroDocumentoCxp`: `NO_ES_SEGURO = 0`, `BLOQUEADO = 1`, `LIBERADO = 2`.

Qué significa BLOQUEADO para cada tipo:

| Tipo | BLOQUEADO (1) | LIBERADO (2) |
|---|---|---|
| Factura | **No se puede pagar** por ninguna puerta (§3) | Pagable normalmente |
| Nota de débito | Registrada y contabilizada, **sin aplicar** a la factura: la factura **no** sube de saldo | Aplicada a la factura (tipo 5), que sube de saldo |
| Nota de crédito | Aplicada a la factura como hoy (D4). Solo informa a crédito que falta liberarla | Igual, liberada |

## 3. El bloqueo de pago — todas las puertas

Medido el 2026-10-02. Una factura baja de saldo por estas puertas, y **todas** terminan grabando en
`AplicacionPagoCxpServiceImpl.saveSingle` (:115):

| Puerta | Dónde | Cuándo sale el dinero |
|---|---|---|
| Solicitud de pago | `POST /pgtr` → `PagoProgramadoServiceImpl.registrarPago` | al aprobar o confirmar; con cheque o débito, al registrar |
| Aprobación | `POST /pgtr/aprobar` | con cheque, al aprobar |
| Confirmación (banco o manual) | `/pgtr/lote/{id}/respuesta`, `/pgtr/confirmarManual` | ya salió |
| Cruce de anticipo | `/aplp/anticipo`, `/aplp/anticipos` | ya salió (el anticipo) |
| Caja chica | `POST /mvch/gasto` | al registrar el gasto |

La proposición de pago **no paga**: solo arma cuotas en `PGS.PRPD`. La retención (tipo 3) y la NC
(tipo 2) **no sacan dinero**, así que **no se bloquean**.

**Tres candados, todos con el mismo mensaje.** Un servicio nuevo, `DocumentoSeguroCxpService`, con
`validarPagable(FacturaCompra factura)`:

> *«La factura {número} de {proveedor} es de seguros y está pendiente de distribución en crédito: no se
> puede pagar hasta que crédito la libere.»*

1. **`AplicacionPagoCxpServiceImpl.saveSingle`** — el último candado. Si la aplicación es contra una
   factura con `estadoSeguro = 1` y su tipo es **1 (pago directo), 4 (anticipo) o 6 (caja chica)**,
   rechaza. Cubre cruce de anticipo y caja chica **antes** de que se mueva nada.
2. **`PagoProgramadoRest.registrar`** (`POST /pgtr`) — si el body trae una factura bloqueada, rechaza
   con 400 **antes** de llamar al service.
3. **`PagoProgramadoRest.aprobar`** (`POST /pgtr/aprobar`) — si alguno de los pagos a aprobar es de una
   factura bloqueada, rechaza el lote entero con 400, nombrando los pagos.

⚠️ **Por qué 2 y 3 van en el REST y no en `PagoProgramadoServiceImpl`:** ese archivo tiene hoy cambios
**sin commitear de `omen-saa-3`** (liquidaciones de ex-colaboradores). Tocarlo obligaría a commitear
líneas ajenas, o a esperar a que ellos commiteen. El REST está limpio, y el chequeo es una sola línea
que delega en el service nuevo. **Cuando `omen-saa-3` commitee, se puede mover** al service.

**Marcar una factura que ya tiene pagos:** si tiene un `PagoProgramado` vigente o aplicaciones activas
de tipo 1, 4 o 6, **no se puede dejar BLOQUEADA**: el dinero ya salió o está comprometido. Ver §5.2.

## 4. La marca desde CxP (Gestión de Documentos)

- **`registrar-documento-dialog`** (FE): un check **«Documento de seguros»**, junto al de intermediario.
  Aplica a factura, ND y NC. Se puede marcar a la vez que intermediario, pero no tiene sentido: si
  vienen los dos, el backend rechaza con *«Un documento de seguros no puede ser de intermediario.»*
- **`POST /carga-documentos/registrarBD/{id}`** y **`POST /carga-documentos/procesarXml/{id}`** aceptan
  `esSeguro` (boolean, opcional, por defecto `false`), con el mismo criterio que `esIntermediario`.
- **Al registrar con `esSeguro = true`** (`ProcesoCargaDocumentosServiceImpl`):
  - Factura → `estadoSeguro = 1`.
  - ND → `estadoSeguro = 1`, y **se salta `registrarAplicacionPagoCxp`** para esa ND (D3). El asiento de
    la ND **se genera igual**.
  - NC → `estadoSeguro = 1`, y se aplica **como hoy** (D4).
- **Ficha del documento** (Consulta de Documentos): muestra el estado de seguros y el `POSGCDGO`
  enlazado, en la sección de Clasificación tributaria, junto a «Es intermediario».

## 5. Los servicios para crédito — `@Path("cxp-seguros")`

REST nuevo `DocumentoSeguroCxpRest`. Todos responden **400** con texto ante una `IncomeException` y
**500** con `"Error en documentos de seguros: " + mensaje` ante lo demás.
`tipoDocumento` ∈ `FACTURA` | `NOTA_DEBITO` | `NOTA_CREDITO`. La nota de venta (FCTC `tipoComprobante
02`) **no** es un tipo de seguros.

### 5.0 Acordado con `omen-saa-1-arb` el 2026-10-05: llamada interna, usuario y empresa

1. **Servicio `@Local`.** Las cinco operaciones (§5.1–§5.5) son métodos de `DocumentoSeguroCxpService`, y el
   REST **delega** en ellos sin lógica propia. Crédito los llama **dentro de su propia transacción** (mismo
   WAR), para que su cambio de estado y nuestro enlazar/liberar/desenlazar sean atómicos.
   ⚠️ `IncomeException` es `@ApplicationException(rollback=true)`: si una validación nuestra la lanza, **la
   transacción de crédito queda marcada para rollback** aunque la atrape (lección del §58.1). Eso es lo que se
   busca. Crédito no debe atraparla para seguir.
2. **Usuario.** Los métodos `@Local` reciben **`String usuario`** (nombre de usuario), y lo resolvemos con
   `UsuarioDaoService.selectByNombre`. Si no existe: `IncomeException`. El REST sigue recibiendo `idUsuario`.
3. **Empresa.** `idEmpresa` es la **empresa contable de CxP**: el `PJRQCDGO` con el que se cargó el documento
   (`FCTC.EMPRESA`, el mismo de las pantallas de CxP). `Prestamo` no tiene empresa: crédito no la puede sacar
   de ahí. Con otro valor, `porClave` no encuentra el documento. Queda pendiente que crédito diga de dónde
   la saca.

### 5.1 `GET /cxp-seguros/porClave/{claveAcceso}?idEmpresa=…` — buscar

Busca primero en FCTC, NTDC y NTCC por `CLAVE` (y empresa), y si no está, en `PGS.DCXP` por
`DCXPCLAC`. Siempre 200:

```jsonc
{
  "encontrado": true,
  "registrado": true,                 // false: está en DCXP (bandeja) pero no registrado todavía
  "estadoDocumentoCxp": 3,            // DCXP: 1 LEIDO, 2 XML_CARGADO, 3 REGISTRADO_BD, 4 ERROR, 5 NOVEDAD…
  "pendienteClasificacion": false,
  "tipoDocumento": "FACTURA",         // null si no está registrado
  "idDocumento": 812,
  "numero": "001-001-000123456",
  "idTitular": 77, "proveedor": "SEGUROS X S.A.", "rucProveedor": "1790…001",
  "fechaEmision": [2026,9,30],
  "total": 12500.00,
  "estadoSeguro": 1,                  // §2
  "idDocumentoSeguro": null,          // POSGCDGO enlazado, si hay
  "tienePagos": false,                // solo factura: pago vigente o aplicación activa tipo 1/4/6
  "saldo": 12500.00                   // solo factura: total − aplicado, como /aplp/saldo
}
```

No encontrado: `{ "encontrado": false }`.

### 5.2 `POST /carga-documentos/registrarDesdeXml` — crear desde el XML, ya marcado (D2)

```jsonc
{ "contenidoXml": "<?xml …", "idEmpresa": 1236, "idUsuario": 5, "idDocumentoSeguro": 44 }
```

1. Lee la clave de acceso del XML.
2. **Si ya hay un documento registrado** con esa clave: **no lo duplica**. Responde 200 con la forma
   de §5.1 más `"yaExistia": true`, y no cambia nada. Crédito avisa al usuario y llama a `enlazar`.
3. **Si está en DCXP sin registrar:** usa esa fila.
4. **Si no está en ningún lado:** crea la `DocumentoCxp` (estado 1) **con los datos del propio XML**
   (los mismos campos que llena la carga del TXT).
5. Corre **el registro normal** (`cargarXmlYRegistrar`) con `esSeguro = true`, y si viene
   `idDocumentoSeguro`, deja el enlace. Lo que valide la carga normal, se valida igual.
6. Responde 200 con la forma de §5.1 más:
   - `"yaExistia": false`;
   - `"pendienteClasificacion": true` y `"bloqueantes": [...]` si los productos no están clasificados.
     En ese caso **no es error**: el documento queda en la bandeja de CxP (DCXP en estado 2), **ya
     marcado de seguros**, y contabilidad lo termina desde Gestión de Documentos (D5).
   - Si el registro falla por otra cosa (proveedor sin cuenta, XML inválido), 400 con el motivo.

⚠️ **La marca de un documento que queda pendiente de clasificar vive en la bandeja.** `PGS.DCXP` gana
`DCXPESSG` (0/1) y `DCXPPOSG` (el `e2-79` las crea también). `registrarDesdeXml` las llena **antes** de
intentar el registro. Cuando contabilidad termina de clasificar y registra desde Gestión de
Documentos, **el registro toma la marca de la DCXP**: `esSeguro = true` si viene en el body **o** si la
DCXP tiene `DCXPESSG = 1`, y copia `DCXPPOSG` al documento. El diálogo de registro **muestra el check
ya marcado y deshabilitado** cuando la DCXP lo trae: desmarcarlo dejaría pagable una factura que
crédito todavía no distribuyó. Si hay que quitar la marca, lo hace crédito con `desenlazar`.

### 5.3 `POST /cxp-seguros/enlazar` — enlazar a la póliza y marcar

```jsonc
{ "tipoDocumento": "FACTURA", "idDocumento": 812, "idDocumentoSeguro": 44, "idUsuario": 5 }
```

- Si ya está enlazado **a otro** `POSGCDGO`: 400 *«El documento ya está enlazado al documento de seguro
  N»*.
- Guarda `idDocumentoSeguro`. Si `estadoSeguro` era 0, lo marca como de seguros:
  - Factura sin pagos → `1` (BLOQUEADO).
  - Factura **con pagos** (`tienePagos`) → `2` (LIBERADO) y responde `"aviso": "La factura ya tenía
    pagos: queda enlazada pero no se puede bloquear."` El dinero ya salió; crédito decide qué hacer.
  - ND ya aplicada a la factura (se registró sin marcar) → `2` con aviso equivalente.
  - ND sin aplicar, o NC → `1`.
- Respuesta: la forma de §5.1 más `aviso` (o null).

### 5.4 `POST /cxp-seguros/liberar` — liberar a pago

```jsonc
{ "tipoDocumento": "NOTA_DEBITO", "idDocumento": 90, "idDocumentoSeguro": 44, "idUsuario": 5 }
```

- Exige `idDocumentoSeguro` igual al enlazado, y `estadoSeguro = 1`. Si no, 400.
- Factura → `2`. Desde ahí, pagable.
- **ND → aplica la ND a la factura ahora** (`AplicacionPagoCxpServiceImpl.aplicarNotaDebito`, el mismo
  que usa la carga, resolviendo la factura por `numDocModificado`), y queda en `2`. Si la factura no
  se resuelve, 400 con el mensaje de la resolución, y la ND sigue en `1`.
- NC → `2`.

### 5.5 `POST /cxp-seguros/desenlazar` — desenlazar y volver a bloquear (D8)

Mismo body que liberar.

- Exige el mismo `idDocumentoSeguro` enlazado.
- **Factura:** si `tienePagos`, 400 *«La factura ya tiene pagos: no se puede volver a bloquear.»* Si
  no, `estadoSeguro = 1` e `idDocumentoSeguro = null`.
- **ND en `2` (ya aplicada):** si la factura tiene `tienePagos`, 400. Si no, **revierte la aplicación
  de la ND** (`revertirAplicacion` sobre su APLP tipo 5), y queda en `1` sin enlace.
- **ND en `1`, o NC:** `idDocumentoSeguro = null`, y queda en `1`.

## 6. Frontend

1. **`registrar-documento-dialog`:** check «Documento de seguros», y `esSeguro` en `carga-documentos.service`.
2. **Ficha** (`consulta-documentos`): el estado de seguros y el enlace, para factura, ND y NC.
3. **Filtros de pago:** los documentos con `estadoSeguro === 1` **no se ofrecen** en
   `solicitud-pago` (`cargarDocumentosPendientes`), `factura-compra-selector-dialog` ni
   `documento-cruce-selector-dialog` (los dos modos). El backend igual los rechaza: esto es para no
   ofrecerlos.

## 7. Decidido por el árbitro, por ser técnico

- **P1. La marca de un documento pendiente de clasificar vive en `PGS.DCXP`** (`DCXPESSG`/`DCXPPOSG`,
  §5.2). La alternativa era que crédito sondeara `porClave` y llamara a `enlazar` cuando el documento se
  registrara. Se descartó porque, entre el registro y el enlace, la factura habría quedado **pagable**.

## 8. Trampas

1. ⛔ **El `e2-79` va ANTES del WAR.** Las tres entidades de compra **y `DocumentoCxp`** mapean las
   columnas nuevas: sin el script, **toda** lectura de facturas, ND, NC de compra y de la bandeja de carga
   revienta.
2. **El candado del REST de pagos** es provisional, mientras `PagoProgramadoServiceImpl` tenga cambios
   ajenos sin commitear (§3).
3. **Una ND bloqueada está contabilizada pero no aplicada:** el mayor de la CxP del proveedor muestra
   el valor y el saldo de la factura no. Es lo decidido (D3), y se iguala al liberar.
4. **Nunca se bloquea lo que ya se pagó.** `enlazar` avisa y `desenlazar` rechaza.
5. **La nota de venta no es un tipo de seguros.**
