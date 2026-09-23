# CONTRATO — Seguimiento de cobros (ampliación de Consulta de Cobros)

**Equipo:** `omen-saa-2` · **Creado:** 2026-09-23 · **Módulo:** `cxc`
**Diseño:** [`PLAN-SEGUIMIENTO-COBROS.md`](PLAN-SEGUIMIENTO-COBROS.md)
**Estado:** verificado contra el código el 2026-09-23. Espejado en `saaFE/docs/cxc/`.

> Un endpoint **cambia** (le falta un campo) y **uno es nuevo** (el comprobante). El resto de la
> pantalla no cambia de contrato.

---

## 1. `GET /rest/aplc/listar` — SE AGREGA UN CAMPO

**Lo que ya existe y NO cambia:** la ruta, los parámetros y la forma de cada item.

| Parámetro | Tipo | Notas |
|---|---|---|
| `idEmpresa` | Long | obligatorio |
| `idTitular` | Long | opcional — el cliente |
| `desde` / `hasta` | `yyyy-MM-dd` | opcional |
| `formaPago` | Long | opcional |
| `estado` | Long | opcional — `1` activo, `2` reversado |

**El único cambio: cada item suma `observacion`.**

```json
{
  "id": 1234,
  "fecha": "2026-08-31",
  "titular":            { "codigo": 65, "nombre": "..." },
  "documentoAfectado":  { "tipo": "FACTURA", "id": 243, "numero": "001-501-000000203" },
  "tipoDocPago": 1,
  "formaPago": 1,
  "valor": 320.76,
  "asiento": { "id": 8030, "numeroAlterno": "CXP-2026-08-0105" },
  "estado": 1,
  "observacion": "Cobro por transferencia | Ref: 1009212"
}
```

- **`observacion` puede venir `null`** — no todos los cobros la tienen. La pantalla la **oculta**
  cuando falta; no muestra un guion ni una celda vacía.
- `documentoAfectado` puede venir `{}` si la fila no tiene ni factura ni liquidación (no debería
  pasar, pero el backend ya lo contempla). La pantalla no asume que tiene `numero`.
- `asiento` es **`null`** cuando el cobro no está contabilizado. Se muestra **«Sin contabilizar»**,
  con esas palabras, no en blanco: un blanco se lee como «no cargó».

⚠️ **Para el backend:** esto se agrega **a la proyección** (`Object[]`, columna 16), no devolviendo
la entidad. Ver §1.1 del plan — `AplicacionPagoCxc` tiene 12 relaciones y el modelo no tiene un solo
`LAZY`.

## 2. `GET /rest/aplc/comprobante/{idAplicacion}` — NUEVO

Devuelve el **PDF del comprobante de ese cobro**. Sin cuerpo; todo se deriva del id.

| Respuesta | Cuándo |
|---|---|
| **200** `application/pdf` | El PDF, como binario |
| **404** | No existe esa aplicación de cobro |
| **500** | Error generando el reporte, con el mensaje |

**Cabeceras:** `Content-Type: application/pdf` y
`Content-Disposition: attachment; filename="comprobante-cobro-{id}.pdf"`.

### 2.1 El PDF se arma por PARÁMETROS, sin query

Mismo patrón que el RIDE de factura (`FacturaServiceImpl:2215`):

```java
byte[] pdf = reporteService.generarReporte("cxc", "RPRT_COBRO", parametros, "PDF");
```

| Parámetro | De dónde sale |
|---|---|
| `P_EMPRESA` | nombre de la empresa de la aplicación |
| `P_NUMERO_COBRO` | `APLCCDGO` (el id) |
| `P_FECHA` | `fechaAplicacion` |
| `P_CLIENTE_IDENT` / `P_CLIENTE_NOMBRE` | del titular del documento afectado |
| `P_FORMA_PAGO` | descripción, **no el código** |
| `P_VALOR` | `montoAplicado` |
| `P_ESTADO` | `"ACTIVO"` o `"REVERSADO"` |
| `P_DOC_TIPO` / `P_DOC_NUMERO` | factura o liquidación afectada |
| `P_OBSERVACION` | `APLCOBSR`, completa; `""` si no hay |
| `P_ASIENTO_NUMERO` / `P_ASIENTO_FECHA` | del asiento, o `""` si no está contabilizado |

**Ningún parámetro viaja `null`:** los textos van como `""` y los números como `0`. Un `null` en un
parámetro de JasperReports imprime `null` en el papel, y eso llega al cliente.

### 2.2 Reglas del PDF que no son de formato

1. Un cobro **REVERSADO** se imprime igual, pero el comprobante **tiene que decirlo de forma
   visible**. Un comprobante de un cobro anulado que no lo diga es un documento engañoso.
2. Sin observaciones, **el bloque no se imprime** — no queda un rótulo con nada debajo.
3. Sin asiento, dice **«Sin contabilizar»**, no un espacio en blanco.

## 3. El filtro por período — NO toca el backend

El backend **sigue recibiendo `desde`/`hasta`**. El combo de períodos es del frontend: al elegir un
período, rellena las dos fechas con las suyas y consulta como siempre.

**No se agrega un parámetro `idPeriodo` al endpoint.** Sería un segundo camino para expresar lo
mismo, y el día que alguien mande período y fechas a la vez habría que decidir cuál gana —
dentro del servidor, donde nadie lo ve.

## 4. Lo que NO cambia

- El listado sigue siendo una **proyección**, no la entidad.
- Anular un cobro (`POST /aplc/anular/...`) queda como está.
- El CSV sigue saliendo del listado que ya está en pantalla, ahora con la observación incluida.
- La pantalla de **Seguimiento de Pagos** de `tsr` **no se toca**.
