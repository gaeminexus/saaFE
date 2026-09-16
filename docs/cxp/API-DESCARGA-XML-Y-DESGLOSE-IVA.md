# API + DISEÑO — Consulta de documentos CXP: desglose de IVA y descarga del XML

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-16 · **Estado:** congelado, despachado
**Espejo:** `saaFE/docs/cxp/API-DESCARGA-XML-Y-DESGLOSE-IVA.md`
**Pantalla:** `saaFE cxp/forms/procesos/consulta-documentos`

> *«En la pantalla de consulta de documentos requiero que en la tabla de detalle de documentos me muestre no solo los
> valores de subtotal, sino los campos de base por iva, los campos de los diferentes ivas 15, 8, etc y el total. Además
> quiero una opción que me permita descargarme el xml desde el sistema.»* — usuario, 2026-09-16

Sin DDL. Un endpoint nuevo; el resto es pantalla.

---

## 1. Lo que hay hoy (medido)

- **Tabla de documentos** (`consulta-documentos.component.ts:112`): `valorSinImpuestos` (= `subtotal`), `iva` (= `vIVA`)
  e `importeTotal` (= `total`). **No muestra la base 0% ni las otras tarifas.**
- **Ficha del documento** (`.html`, bloque de totales): subtotal gravado, subtotal 0%, % IVA, valor IVA, descuento y total.
  **Faltan las bases y los IVA de 5 % y 8 %, y el ICE.**
- **El XML sí está guardado**: la ruta vive en `PGS.DCXP.DCXPPXML` (`DocumentoCxp.pathXml`) y, por documento, en
  `PathFacturaCompra` / `PathNotaCreditoCompra` / `PathNotaDebitoCompra` / `PathLiquidacionCompraCompra`
  (`ProcesoCargaDocumentosServiceImpl:1776-1780`). **No hay ningún endpoint que lo devuelva.**

⚠️ **Las cuatro entidades de compra NO tienen los mismos campos.** `FacturaCompra` tiene `subtotal`, `subcero`,
`subtotal5`, `subtotal8`, `pIVA`, `vIVA`, `vIVA5`, `vIVA8`, `vICE`, `descuento`, `total`; `NotaCreditoCompra` (y ND)
tienen bastantes menos (`subtotal`, `vIVA`, `vICE`, `total`). **No se inventa un campo que la entidad no tiene**: la
pantalla muestra lo que viene y omite lo demás. Es la trampa del §40.3 (una premisa «las cuatro entidades tienen lo
mismo» que ya resultó falsa una vez).

## 2. Endpoint NUEVO — descargar el XML

```
GET /SaaBE/rest/carga-documentos/xml/{idDocumentoCxp}
```

**200:**
```json
{ "nombreArchivo": "1509202601179136759600120010010000073481234567811.xml",
  "contenidoBase64": "PD94bWwg…", "mimeType": "application/xml", "tamanoBytes": 18432 }
```

| Caso | HTTP | Cuerpo |
|---|---|---|
| El documento no existe | `404` | `{"mensaje": "No existe el documento N° {id}"}` |
| No tiene XML (nota de venta manual, o `pathXml` vacío) | `404` | `{"mensaje": "El documento {serie} no tiene XML: se registró a mano, sin comprobante electrónico."}` |
| La ruta está grabada pero el archivo no está en disco | `404` | `{"mensaje": "El XML del documento {serie} no está en el servidor (ruta: {path})."}` |

**Base64 y no un flujo binario**, por el mismo motivo del archivo del banco (§34bis del estado): el frontend decodifica
y arma la descarga; un `octet-stream` directo ya dio problemas de codificación.

**Resolución del archivo:** `DocumentoCxp.pathXml`; si está vacío, la fila de `Path*` del documento destino según
`tipoTablaDestino`. Rutas relativas se resuelven contra `saa.upload.dir` (`FileServiceImpl:36`).

⛔ **Sólo lectura.** No re-descarga del SRI, no regenera nada.

## 3. Pantalla — desglose de impuestos

### 3.1 Tabla de documentos
Columnas nuevas después de `valorSinImpuestos`, con el valor en blanco cuando el documento no tiene ese campo:
**Base 0 %** (`subcero`) · **Base gravada** (`subtotal`) · **IVA** (`vIVA`) · **Total** (`importeTotal`, ya está).
El resto del desglose por tarifa va en la ficha, no acá: la tabla se vuelve ilegible con doce columnas.

### 3.2 Ficha del documento — bloque de totales
Bases y su IVA, **omitiendo la fila cuando el campo no existe en ese tipo de documento o viene en cero**:

| Fila | Campo |
|---|---|
| Base 0 % | `subcero` |
| Base gravada (`pIVA` %) | `subtotal` |
| Base 5 % / IVA 5 % | `subtotal5` / `vIVA5` |
| Base 8 % / IVA 8 % | `subtotal8` / `vIVA8` |
| IVA (`pIVA` %) | `vIVA` |
| ICE | `vICE` |
| Descuento | `descuento` |
| **TOTAL** | `total` |

⚠️ **El `% IVA` no se asume 15.** Hoy la ficha imprime `docReal.pIVA ?? 12`: ese 12 es un default viejo y **miente**
cuando el documento no trae el porcentaje. Si `pIVA` viene vacío, la etiqueta dice sólo «IVA», sin porcentaje.

### 3.3 Botón «Descargar XML»
En la ficha del documento y como acción de fila en la tabla. Llama al endpoint del §2, decodifica el base64 y descarga
con el `nombreArchivo` que manda el backend. Si responde 404, se muestra el mensaje tal cual: **no se inventa un
archivo vacío**. En una nota de venta manual el botón no se muestra.

## 4. Despliegue

WAR → FE. Sin SQL. El FE nuevo contra un WAR viejo: el botón responde 404 y muestra el mensaje; nada se rompe.
