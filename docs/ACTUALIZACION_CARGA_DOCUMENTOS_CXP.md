# Actualización: Carga de Documentos CXP desde TXT del SRI

**Fecha:** 2026-07-19  
**Módulo:** CXP - Cuentas por Pagar  
**Impacto:** Cambio conceptual en la estructura de tablas y en el flujo de endpoints

---

## 1. Contexto del cambio

### Problema anterior
La tabla `DCTX` (DetalleCargaTxt) mezclaba dos responsabilidades:
- Registrar cada línea de un archivo TXT cargado
- Hacer el seguimiento del ciclo de vida del documento (XML, registro en BD, reversión, novedades)

Esto causaba que un mismo documento (misma `claveAcceso`) tuviese múltiples registros en `DCTX` cuando se incluía en varias cargas, lo que impedía tener un único punto de seguimiento por documento.

### Solución implementada
Se separaron las responsabilidades en **tres tablas** y el frontend ahora trabaja con **dos IDs distintos**:

| Tabla | Entidad Java | Propósito |
|---|---|---|
| `PGS.CRTX` | `CargaArchivoTxt` | Cabecera de cada archivo TXT cargado. |
| `PGS.DCXP` | `DocumentoCxp` | **UN solo registro por documento** (por `claveAcceso`). Aquí vive el ciclo de vida completo. Tiene campo `empresa` para filtrar por empresa. |
| `PGS.DCTX` | `DetalleCargaTxt` | **Una línea por aparición** en un archivo TXT. Puede haber N líneas para un mismo documento. FK a DCXP. |

---

## 2. Modelo de datos

```
CRTX (CargaArchivoTxt)
  └── DCTX (DetalleCargaTxt) ──FK──► DCXP (DocumentoCxp)
         línea del archivo              documento único por empresa
         resultado: NUEVO|DUPLICADO     empresa, estadoDocumento: 1..6
                    NOVEDAD|IGNORADO    pathXml, idDocumentoBD, etc.
```

### Campos de `DCXP` (DocumentoCxp)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | NUMBER | PK |
| `empresa` | NUMBER(11) | **FK a SCP.PJRQ** - empresa receptora. Permite filtrar documentos por empresa. |
| `claveAcceso` | VARCHAR2(100) | **UNIQUE** - clave SRI del documento |
| `rucEmisor` | VARCHAR2(20) | RUC del proveedor |
| `razonSocialEmisor` | VARCHAR2(500) | Razón social del proveedor |
| `tipoComprobante` | VARCHAR2(100) | Factura / Nota de Crédito / etc. |
| `serieComprobante` | VARCHAR2(50) | Ej: 001-001-000000123 |
| `fechaAutorizacion` | TIMESTAMP | Fecha de autorización SRI |
| `fechaEmision` | DATE | Fecha de emisión del documento |
| `valorSinImpuestos` | NUMBER(14,2) | Subtotal actual del documento |
| `iva` | NUMBER(12,2) | IVA actual |
| `importeTotal` | NUMBER(14,2) | Total actual |
| `estadoDocumento` | NUMBER(2) | Ver tabla de estados |
| `pathXml` | VARCHAR2(2000) | Path del XML en el servidor |
| `idDocumentoBD` | NUMBER(11) | ID del registro en tabla destino |
| `tipoTablaDestino` | VARCHAR2(50) | FACTURA_COMPRA / NOTA_CREDITO_COMPRA / etc. |
| `novedad` | VARCHAR2(2000) | Descripción de diferencias detectadas |
| `estadoNovedad` | NUMBER(2) | 1=PENDIENTE 2=REEMPLAZADO 3=MANTENIDO |

### Estados del documento (`estadoDocumento`)

| Valor | Nombre | Descripción | Acción disponible |
|---|---|---|---|
| `1` | LEIDO | Documento leído del TXT, esperando XML | Cargar XML |
| `2` | XML_CARGADO | XML subido, esperando registro | Registrar en BD |
| `3` | REGISTRADO_BD | Registrado en tablas CXP | Revertir |
| `4` | ERROR | Falló algún paso | Reintentar |
| `5` | NOVEDAD | Valores distintos detectados | Resolver novedad |
| `6` | REVERTIDO | Registros de BD eliminados | Cargar XML nuevamente |

### Campos de `DCTX` (DetalleCargaTxt)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | NUMBER | PK |
| `cargaTxt.id` | NUMBER(11) | FK a CRTX |
| `documento.id` | NUMBER(11) | **FK a DCXP** |
| `valorSinImpuestosCarga` | NUMBER(14,2) | Valor en **esta** carga (snapshot) |
| `ivaCarga` | NUMBER(12,2) | IVA en esta carga (snapshot) |
| `importeTotalCarga` | NUMBER(14,2) | Total en esta carga (snapshot) |
| `fechaAutorizacionCarga` | TIMESTAMP | Fecha autorización en esta carga (snapshot) |
| `fechaEmisionCarga` | DATE | Fecha emisión en esta carga (snapshot) |
| `resultado` | VARCHAR2(20) | NUEVO / DUPLICADO / NOVEDAD / IGNORADO |
| `observacion` | VARCHAR2(2000) | Detalle adicional |

### Campos de `CRTX` (CargaArchivoTxt)

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | NUMBER | PK |
| `empresa` | NUMBER(11) | FK a SCP.PJRQ |
| `usuario` | NUMBER(11) | FK a SCP.PJRQ |
| `fechaCarga` | TIMESTAMP | Fecha/hora de la carga |
| `nombreArchivo` | VARCHAR2(500) | Nombre original del archivo TXT |
| `totalRegistros` | NUMBER(11) | Total de líneas procesadas |
| `registrosNuevos` | NUMBER(11) | Documentos nuevos en esta carga |
| `registrosDuplicados` | NUMBER(11) | Documentos ya existentes sin diferencias |
| `registrosNovedad` | NUMBER(11) | Documentos con diferencias de valores |
| `estado` | NUMBER(2) | 1=PROCESADO 2=ERROR_PARCIAL |

---

## 3. Servicios REST disponibles

### BASE URL
```
/saaBE/rest/
```

---

### 3.1 Proceso de carga — `/carga-documentos`

Estos endpoints manejan el flujo completo de los 5 pasos del proceso.

---

#### FASE 1 — Cargar archivo TXT
**`POST /carga-documentos/cargarTxt`**

```json
// Request
{
  "contenidoTxt": "<contenido completo del archivo TXT>",
  "nombreArchivo": "1793228946001_Recibidos.txt",
  "idEmpresa": 1,
  "idUsuario": 5
}

// Response 201
{
  "idCargaTxt": 10,
  "nombreArchivo": "1793228946001_Recibidos.txt",
  "totalRegistros": 45,
  "nuevos": 38,
  "duplicados": 5,
  "novedades": 2,
  "detalles": [
    { "linea": 1, "serie": "001-001-000000123", "claveAcceso": "2406202401...", "resultado": "NUEVO",     "idDocumentoCxp": 101 },
    { "linea": 2, "serie": "001-001-000000050", "claveAcceso": "1506202401...", "resultado": "DUPLICADO", "idDocumentoCxp": 55  },
    { "linea": 3, "serie": "001-001-000000099", "claveAcceso": "0106202401...", "resultado": "NOVEDAD",   "idDocumentoCxp": 72, "diferencias": "importeTotal: previo=100.00 nuevo=115.00" }
  ]
}
```

> ⚠️ **Importante:** El `idDocumentoCxp` de cada línea es el ID permanente del documento. Se usa en **todas las fases siguientes**.  
> El `idCargaTxt` solo sirve para consultar el resumen/líneas de esa carga.

---

#### FASE 2 — Subir XML de un documento
**`POST /carga-documentos/cargarXml/{idDocumentoCxp}`**

```json
// Request
{
  "contenidoXml": "<?xml version=\"1.0\"...>",
  "idUsuario": 5
  // "pathDestino": "/docs/xml/cxp/clave.xml"  ← opcional, el backend lo calcula
}

// Response 200 → objeto DocumentoCxp actualizado con estadoDocumento=2
```

---

#### FASE 3 — Registrar en tablas CXP
**`POST /carga-documentos/registrarBD/{idDocumentoCxp}`**

```json
// Request
{ "idEmpresa": 1, "idUsuario": 5 }

// Response 200 - éxito
{ "idDocumentoBD": 234, "tipoTablaDestino": "FACTURA_COMPRA", "mensaje": "FacturaCompra registrada con id=234", "requiereProductos": false }

// Response 200 - requiere asignar grupos a productos nuevos
{
  "requiereProductos": true,
  "mensaje": "Productos del XML no existen. Asigne un grupo y llame /crearProductosYRegistrar",
  "idDocumentoCxp": 101,
  "productosNuevos": [
    { "nombre": "Milhojas", "codigo": "4001", "codigoAux": "", "precioUnitario": 3.04 }
  ]
}

// Response 200 - proveedor no encontrado en TSR
{ "error": "TITULAR_NO_ENCONTRADO", "mensaje": "El emisor con RUC ... no existe en TSR.", "rucEmisor": "1790016919001" }
```

---

#### FASE 3b — Crear productos faltantes y registrar
**`POST /carga-documentos/crearProductosYRegistrar/{idDocumentoCxp}`**

```json
// Request
{
  "idEmpresa": 1, "idUsuario": 5,
  "productosConGrupo": [
    { "nombre": "Milhojas", "codigo": "4001", "codigoAux": "", "precioUnitario": 3.04, "idGrupo": 12 }
  ]
}
// Response 200 → igual que registrarBD exitoso
```

---

#### FASE 4 — Resolver novedad
**`POST /carga-documentos/resolverNovedad/{idDocumentoCxp}`**  
_(Solo disponible cuando `estadoDocumento = 5`)_

```json
// Request MANTENER
{ "accion": "MANTENER", "idUsuario": 5 }

// Request REEMPLAZAR
{ "accion": "REEMPLAZAR", "contenidoXml": "<?xml...>", "idUsuario": 5 }

// Response MANTENER
{ "accion": "MANTENIDO", "mensaje": "Se mantiene el documento sin cambios." }

// Response REEMPLAZAR
{ "accion": "REEMPLAZADO", "idDocumentoBD": 235, "tipoTablaDestino": "FACTURA_COMPRA", "mensaje": "FacturaCompra registrada con id=235" }
```

---

#### FASE 5 — Revertir documento
**`POST /carga-documentos/revertir/{idDocumentoCxp}`**  
_(Solo disponible cuando `estadoDocumento = 3`)_

```json
// Request
{ "idUsuario": 5 }

// Response 200
{ "mensaje": "Documento revertido correctamente.", "idDocumentoCxp": 101, "idDocumentoBD": 234, "tipoTablaDestino": "FACTURA_COMPRA" }
```

---

#### Consultas del proceso

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/carga-documentos/resumen/{idCargaTxt}` | Cabecera de la carga + todas sus líneas con `DocumentoCxp` embebido |
| `GET` | `/carga-documentos/documento/{idDocumentoCxp}` | Un `DocumentoCxp` por su ID |
| `GET` | `/carga-documentos/novedades/{idEmpresa}` | Lista de `DocumentoCxp` con `estadoDocumento=5` y `estadoNovedad=1` |
| `GET` | `/carga-documentos/gruposProducto` | Grupos de productos para asignar a productos nuevos |

**Response de `/resumen/{idCargaTxt}`:**
```json
{
  "cabecera": { "id": 10, "nombreArchivo": "...", "totalRegistros": 45, "registrosNuevos": 38, "registrosDuplicados": 5, "registrosNovedad": 2 },
  "lineas": [
    {
      "id": 201,
      "cargaTxt": { "id": 10 },
      "documento": { "id": 101, "claveAcceso": "...", "estadoDocumento": 2, "empresa": { "codigo": 1 }, ... },
      "valorSinImpuestosCarga": 89.29,
      "ivaCarga": 10.71,
      "importeTotalCarga": 100.00,
      "resultado": "NUEVO"
    }
  ]
}
```

---

### 3.2 Cargas (CRTX) — `/crtx`

Endpoints CRUD para `CargaArchivoTxt`.

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/crtx/getAll` | Todas las cargas |
| `GET` | `/crtx/getId/{id}` | Carga por ID |
| `GET` | `/crtx/getByEmpresa/{idEmpresa}` | **Cargas de una empresa**, ordenadas por fecha desc |
| `POST` | `/crtx/selectByCriteria` | Búsqueda por criterios (`List<DatosBusqueda>`) |
| `POST` | `/crtx` | Crear carga |
| `PUT` | `/crtx` | Actualizar carga |
| `DELETE` | `/crtx/{id}` | Eliminar carga |

---

### 3.3 Líneas de carga (DCTX) — `/dctx`

Endpoints CRUD para `DetalleCargaTxt`. Cada línea incluye el `DocumentoCxp` embebido.

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/dctx/getAll` | Todas las líneas |
| `GET` | `/dctx/getId/{id}` | Línea por ID |
| `GET` | `/dctx/getByCarga/{idCarga}` | **Líneas de una carga** (con `DocumentoCxp` embebido) |
| `GET` | `/dctx/getByDocumento/{idDocumentoCxp}` | **Historial de cargas** en las que apareció un documento |
| `POST` | `/dctx/selectByCriteria` | Búsqueda por criterios (`List<DatosBusqueda>`) |
| `POST` | `/dctx` | Crear línea |
| `PUT` | `/dctx` | Actualizar línea |
| `DELETE` | `/dctx/{id}` | Eliminar línea |

---

### 3.4 Documentos únicos (DCXP) — `/dcxp`

Endpoints CRUD y de consulta para `DocumentoCxp`.

| Método | URL | Descripción |
|---|---|---|
| `GET` | `/dcxp/getAll` | Todos los documentos |
| `GET` | `/dcxp/getId/{id}` | Documento por ID |
| `GET` | `/dcxp/getByEmpresa/{idEmpresa}` | **Todos los documentos de una empresa**, ordenados por id desc |
| `GET` | `/dcxp/getByEmpresaEstado/{idEmpresa}/{estado}` | **Documentos de una empresa filtrados por estado** |
| `GET` | `/dcxp/novedadesPendientes/{idEmpresa}` | Documentos con `estadoDocumento=5` y `estadoNovedad=1` |
| `POST` | `/dcxp/selectByCriteria` | Búsqueda por criterios (`List<DatosBusqueda>`) |
| `POST` | `/dcxp` | Crear documento |
| `PUT` | `/dcxp` | Actualizar documento |
| `DELETE` | `/dcxp/{id}` | Eliminar documento |

---

## 4. Flujo de pantallas recomendado para el frontend

```
┌──────────────────────────────────────────────────────────────────────┐
│ PANTALLA 1: Historial de cargas de la empresa                        │
│  → GET /crtx/getByEmpresa/{idEmpresa}                                │
│  → Muestra: fecha, archivo, nuevos, duplicados, novedades            │
│  → Al hacer click en una carga: ir a PANTALLA 2                      │
└──────────────────────────────────────────────────────────────────────┘
          ↓ click en "Cargar nuevo archivo"       ↓ click en una carga
┌──────────────────────────────────┐   ┌──────────────────────────────────┐
│ ACCIÓN: Cargar archivo TXT       │   │ PANTALLA 2: Detalle de la carga  │
│  → POST /carga-documentos/       │   │  → GET /dctx/getByCarga/{id}     │
│         cargarTxt                │   │  → Muestra líneas con resultado  │
│  → Muestra resumen de resultados │   │    y estado actual del documento │
└──────────────────────────────────┘   └──────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│ PANTALLA 3: Lista de documentos por estado                           │
│  → GET /dcxp/getByEmpresaEstado/{idEmpresa}/{estado}                 │
│  → Filtro por: LEIDO | XML_CARGADO | REGISTRADO_BD | ERROR |         │
│                NOVEDAD | REVERTIDO                                    │
│                                                                      │
│  Estado 1 (LEIDO)        → botón "Subir XML"                        │
│  Estado 2 (XML_CARGADO)  → botón "Registrar en BD"                  │
│  Estado 3 (REGISTRADO)   → botón "Revertir"                         │
│  Estado 4 (ERROR)        → mostrar observacion del error            │
│  Estado 5 (NOVEDAD)      → botón "Resolver novedad"                 │
│  Estado 6 (REVERTIDO)    → botón "Subir XML" nuevamente             │
└──────────────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────────────┐
│ PANTALLA 3: Subir XML                                               │
│  → POST /cargarXml/{idDocumentoCxp}                                 │
│  → Selector de archivo .xml                                         │
└──────────────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────────────┐
│ PANTALLA 4: Registrar en BD                                         │
│  → POST /registrarBD/{idDocumentoCxp}                               │
│  → Si responde requiereProductos=true:                              │
│     - Mostrar lista de productos sin grupo                          │
│     - GET /gruposProducto → selector por cada producto              │
│     - POST /crearProductosYRegistrar/{idDocumentoCxp}               │
└──────────────────────────────────────────────────────────────────────┘
          ↓
┌──────────────────────────────────────────────────────────────────────┐
│ PANTALLA 5: Resolver novedad (estadoDocumento=5)                    │
│  → Mostrar: novedad (diferencias detectadas)                        │
│  → Opción A: MANTENER → POST /resolverNovedad/{id}                 │
│              { "accion": "MANTENER", "idUsuario": X }               │
│  → Opción B: REEMPLAZAR → subir nuevo XML +                         │
│              POST /resolverNovedad/{id}                             │
│              { "accion": "REEMPLAZAR", "contenidoXml": "...",       │
│                "idUsuario": X }                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 5. Resumen de todos los endpoints

| Grupo | Método | URL | Descripción |
|---|---|---|---|
| Proceso | `POST` | `/carga-documentos/cargarTxt` | Fase 1: cargar TXT |
| Proceso | `POST` | `/carga-documentos/cargarXml/{idDocumentoCxp}` | Fase 2: subir XML |
| Proceso | `POST` | `/carga-documentos/registrarBD/{idDocumentoCxp}` | Fase 3: registrar en BD |
| Proceso | `POST` | `/carga-documentos/crearProductosYRegistrar/{idDocumentoCxp}` | Fase 3b: crear productos y registrar |
| Proceso | `POST` | `/carga-documentos/resolverNovedad/{idDocumentoCxp}` | Fase 4: resolver novedad |
| Proceso | `POST` | `/carga-documentos/revertir/{idDocumentoCxp}` | Fase 5: revertir |
| Proceso | `GET` | `/carga-documentos/resumen/{idCargaTxt}` | Cabecera + líneas de una carga |
| Proceso | `GET` | `/carga-documentos/documento/{idDocumentoCxp}` | Un documento por ID |
| Proceso | `GET` | `/carga-documentos/novedades/{idEmpresa}` | Novedades pendientes |
| Proceso | `GET` | `/carga-documentos/gruposProducto` | Grupos de productos |
| CRTX | `GET` | `/crtx/getAll` | Todas las cargas |
| CRTX | `GET` | `/crtx/getId/{id}` | Carga por ID |
| CRTX | `GET` | `/crtx/getByEmpresa/{idEmpresa}` | Cargas de una empresa |
| CRTX | `POST` | `/crtx/selectByCriteria` | Búsqueda por criterios |
| CRTX | `POST` | `/crtx` | Crear |
| CRTX | `PUT` | `/crtx` | Actualizar |
| CRTX | `DELETE` | `/crtx/{id}` | Eliminar |
| DCTX | `GET` | `/dctx/getAll` | Todas las líneas |
| DCTX | `GET` | `/dctx/getId/{id}` | Línea por ID |
| DCTX | `GET` | `/dctx/getByCarga/{idCarga}` | Líneas de una carga |
| DCTX | `GET` | `/dctx/getByDocumento/{idDocumentoCxp}` | Historial de cargas de un documento |
| DCTX | `POST` | `/dctx/selectByCriteria` | Búsqueda por criterios |
| DCTX | `POST` | `/dctx` | Crear |
| DCTX | `PUT` | `/dctx` | Actualizar |
| DCTX | `DELETE` | `/dctx/{id}` | Eliminar |
| DCXP | `GET` | `/dcxp/getAll` | Todos los documentos |
| DCXP | `GET` | `/dcxp/getId/{id}` | Documento por ID |
| DCXP | `GET` | `/dcxp/getByEmpresa/{idEmpresa}` | Documentos de una empresa |
| DCXP | `GET` | `/dcxp/getByEmpresaEstado/{idEmpresa}/{estado}` | Documentos por empresa y estado |
| DCXP | `GET` | `/dcxp/novedadesPendientes/{idEmpresa}` | Novedades pendientes |
| DCXP | `POST` | `/dcxp/selectByCriteria` | Búsqueda por criterios |
| DCXP | `POST` | `/dcxp` | Crear |
| DCXP | `PUT` | `/dcxp` | Actualizar |
| DCXP | `DELETE` | `/dcxp/{id}` | Eliminar |

---

## 6. Punto clave para el frontend

> **El `idDocumentoCxp` retornado en la Fase 1 (`detalles[].idDocumentoCxp`) es el ID permanente del documento.** Debe guardarse y usarse en todas las fases siguientes.
>
> Un mismo documento puede aparecer en múltiples cargas con el **mismo** `idDocumentoCxp`. Esto es correcto y esperado.
>
> Para saber el estado actual de un documento, consultar `DCXP`, **no** `DCTX`. La tabla `DCTX` solo sirve para saber en qué archivos TXT apareció ese documento y con qué valores cada vez.
>
> Para listar los documentos pendientes de procesar de una empresa usar:  
> `GET /dcxp/getByEmpresaEstado/{idEmpresa}/1` → pendientes de XML  
> `GET /dcxp/getByEmpresaEstado/{idEmpresa}/2` → pendientes de registrar en BD  
> `GET /dcxp/novedadesPendientes/{idEmpresa}` → con novedades sin resolver