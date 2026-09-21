# CONTRATO — la ficha completa de un documento de CXP

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-21 · **Diseño:** `PLAN-CONSULTA-DOCUMENTOS-V2.md`
**Estado:** verificado contra el código el 2026-09-21. **No hay endpoints nuevos.**

> **Lo que este contrato documenta no es una API nueva: es lo que los endpoints de hoy YA
> devuelven** y la pantalla no usa. Se escribe igual, porque sin la tabla del §2 el frontend tiene
> que adivinar qué campo aplica a qué tipo de documento.

---

## 1. De dónde sale cada cosa

| Sección de la ficha | Fuente |
|---|---|
| Identificación, trazabilidad, estado | la fila de `DocumentoCxp` que ya está en la lista |
| Clasificación tributaria y contabilidad | el documento real, que la pantalla ya trae en `verDetalle` |
| XML | `GET /rest/carga-documentos/xml/{idDocumentoCxp}` |

El documento real se pide con `GET /rest/{tabla}/getId/{id}` usando `idDocumentoBD`, que es lo que
la pantalla ya hace hoy para pintar las líneas del detalle. **No hay una llamada más.**

## 2. ⚠️ Qué campo aplica a qué documento

Medido con `grep` sobre las cuatro entidades. **Esta tabla es la razón de ser del contrato:** un
campo que NO aplica se **oculta**; uno que aplica y viene `null` se **muestra vacío**. Son dos cosas
distintas y la pantalla tiene que distinguirlas.

| Campo (nombre JSON) | `FacturaCompra` | `NotaCreditoCompra` | `NotaDebitoCompra` | `LiquidacionCompraCompra` |
|---|:--:|:--:|:--:|:--:|
| `asiento` (objeto o `null`) | ✅ | ✅ | ✅ | ✅ |
| `sustentoTributario` (String) | ✅ | ✅ | ✅ | ✅ |
| `fechaRegistroContable` | ✅ | ✅ | ✅ | ✅ |
| `motivoAnulacion` / `fechaAnulacion` / `usuarioAnulacion` | ✅ | ✅ | ✅ | ✅ |
| **`esIntermediario`** (Long) | ✅ | ❌ | ❌ | ❌ |
| **`idProductoIntermediario`** (Long) | ✅ | ❌ | ❌ | ❌ |
| `subtotal`, `subcero`, `subnoobj`, `subexent`, `subtotal5`, `subtotal8` | ✅ | ✅ | ✅ | ✅ |

**`esIntermediario` es `NULLABLE`**: `1` = sí, `0` **o `null`** = no. Tratar `null` como «No», que es
exactamente lo que hace el ATS.

## 3. El asiento contable

`asiento` viaja **dentro** del documento, ya resuelto. Verificado:

- **Sin riesgo de carga perezosa**: no hay un solo `LAZY` en el modelo; todos los `@ManyToOne` son
  EAGER y se cargan antes de serializar.
- **No arrastra listas**: `Asiento` no tiene ninguna colección — los renglones (`DetalleAsiento`)
  viven aparte y **no viajan**. Sí repite objetos de empresa, tipo de asiento, mayorización y
  período; es peso, no es riesgo.
- **`asiento: null` significa SIN CONTABILIZAR**, y así hay que mostrarlo: con esas palabras, no con
  un campo en blanco. Un blanco se lee como «no cargó».

Para la ficha alcanza con `asiento.numero`, `asiento.fechaAsiento`, `asiento.estado` y, si se
quiere, `asiento.numeroAlterno`. El resto se ignora.

## 4. El XML — `GET /rest/carga-documentos/xml/{idDocumentoCxp}`

⚠️ **Recibe el id del `DocumentoCxp`**, no el del documento de compra. Las filas de la lista ya son
`DocumentoCxp`, así que lo tienen a mano.

**200:**

```json
{ "nombreArchivo": "…xml", "contenidoBase64": "…", "mimeType": "application/xml", "tamanoBytes": 12345 }
```

No es un flujo binario: es el archivo entero en Base64 dentro de un JSON. Para **mostrarlo** hay que
decodificarlo con `atob` + `TextDecoder('utf-8')` — **el `TextDecoder` no es opcional**: sin él, un
XML con tildes o con «Eléctrica» en la razón social se ve roto.

**404** con `{ "mensaje": "…" }` en tres casos, y los tres son normales, no fallos:

1. el `DocumentoCxp` no existe;
2. **el documento se registró a mano y no tiene comprobante electrónico** — es el caso de las
   **notas de venta**, que además son filas sintéticas y ni siquiera son `DocumentoCxp`: **a esas no
   se les muestra el botón**;
3. el archivo no está en el servidor.

**500** con `{ "mensaje": "Error al obtener el XML del documento: …" }`.

Es de **solo lectura**: no vuelve a descargar del SRI ni regenera nada.

> **Sin verificar:** si el archivo guardado es el comprobante crudo o el sobre `<autorizacion>` del
> SRI con el comprobante adentro — depende de cómo lo grabó la carga en cada caso. La pantalla tiene
> que mostrar lo que haya **sin asumir** cuál de los dos es.

## 5. Lo que el ATS hace con estos campos, para poder rotularlo bien

| En la ficha | Lo que el ATS declara |
|---|---|
| `subcero` | `baseImponible` (tarifa 0%) |
| `subnoobj` | `baseNoGraIva` |
| `subexent` | `baseImpExe` |
| `subtotal − subcero − subnoobj − subexent` | **`baseImpGrav`** — la gravada es una **resta**, no una columna. El 5% y el 8% quedan **dentro** |
| `sustentoTributario` | `codSustento` |
| `fechaRegistroContable` | el período en el que cae el documento (con respaldo a la fecha de emisión) |
| `esIntermediario = 1` | **no se declara**: ni en el ATS ni en el cuadre 104 |
