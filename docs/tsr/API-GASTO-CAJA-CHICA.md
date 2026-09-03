# API — el gasto de caja chica paga una factura o liquidación

**Contrato congelado el 2026-09-03** · Equipo `omen-saa-2` · Diseño:
`PLAN-GASTO-CAJA-CHICA-PAGA-FACTURA.md`

> **Regla 6 del equipo:** este contrato se escribe **antes** de que el frontend empiece, no después.
> Espejo en `saaFE/docs/tsr/API-GASTO-CAJA-CHICA.md`. Si los dos difieren, **manda éste**.

**Ningún endpoint nuevo.** Se extienden dos que ya existen. El selector de documentos tampoco es
nuevo: es `DocumentoCruceSelectorDialogComponent`, que ya sirve facturas y liquidaciones de compra
de un proveedor.

---

## 1. `POST /rest/mvch/gasto` — dos claves nuevas

El body sigue siendo el mismo mapa de hoy. Se agregan **dos claves, las dos opcionales**:

| Clave | Tipo | Obligatoria | Qué es |
|---|---|---|---|
| `tipoDocumento` | `"FACTURA"` \| `"LIQUIDACION_COMPRA"` | no | Qué clase de documento se paga |
| `idDocumento` | número | no | Id de ese documento |

Las nueve claves actuales (`idCaja`, `fecha`, `valor`, `descripcion`, `observacion`, `idProducto`,
`idTitular`, `numeroDocumento`, `idUsuario`) **no cambian**. Un gasto sin documento sigue
funcionando exactamente igual que hoy: ése es el gasto suelto de siempre.

### Las dos claves van juntas o no va ninguna

Mandar una sola es un error del cliente, no un gasto sin documento. El servidor rechaza con 400.

### `valor` ES el monto que se aplica al documento. No hay un segundo monto.

Lo fija la decisión D2 del usuario —**un gasto por factura**—, así que un gasto afecta un documento
y lo hace por su valor completo. **No agregar un campo «monto aplicado»**: dos números que siempre
tienen que ser iguales terminan discrepando, y el día que discrepen nadie sabe cuál manda.

### `idTitular` pasa a ser obligatorio cuando hay documento

Hoy el beneficiario es opcional y no bloquea guardar. Con documento **es obligatorio**, y el
servidor **revalida que el documento pertenezca a ese titular** — no alcanza con que la pantalla
haya abierto el selector filtrado. *Una validación sólo protege el camino que pasa por ella, y la
pantalla no es un camino: es una comodidad.*

### ⚠️ Lo comprometido, que es lo que evita un doble pago

Para `tipoDocumento = "FACTURA"` el servidor llama a `validaValorContraSaldo`
(`PagoProgramadoServiceImpl:2012`) con `idPagoEx = null`. Esa validación resta del saldo lo ya
comprometido en pagos **vigentes no confirmados** de la bandeja.

Sin ella el camino al doble pago es corto: factura de $100 con un pago en `POR_APROBAR` esperando →
se paga con caja chica → la factura queda saldada → después aprueban el de la bandeja y salen otros
$100. **El saldo por sí solo no lo ve**, porque un pago `POR_APROBAR` todavía no generó su
aplicación.

**Para `LIQUIDACION_COMPRA` no aplica, y está verificado, no supuesto:** `PagoProgramado` no tiene
FK a liquidación y `OrigenPagoCxp` sólo define `FACTURA_COMPRA`, `EGRESO_TESORERIA` y
`ANTICIPO_PROVEEDOR`. Una liquidación **no puede** quedar comprometida por la bandeja; ahí alcanza
con el saldo pendiente.

### Códigos de respuesta

| Código | Cuándo | Cuerpo |
|---|---|---|
| `201` | Gasto creado | El `MovimientoCajaChica` |
| **`400`** | **Todo lo que el usuario puede corregir y reintentar** | `{"mensaje": "..."}` |
| `500` | Fallo inesperado | `{"mensaje": "Error al registrar el gasto: ..."}` |

**El 400 es una decisión de este contrato, no la costumbre del archivo.** El `catch (Throwable)` de
la casa devolvería 500 para todo, pero estos casos —valor mayor al disponible, documento de otro
proveedor, documento ya pagado, falta el beneficiario— **el usuario los arregla y reintenta**: paga
menos, elige otro documento, o aprueba primero el pago de la bandeja. Un 500 le dice «se rompió»
cuando lo que pasó es «corregí esto». Hay precedente en el mismo archivo: `/mvch/listar` ya
devuelve `BAD_REQUEST` cuando falta `idCaja`.

**El mensaje de `validaValorContraSaldo` viaja entero.** Trae el saldo pendiente y lo comprometido
**como dos números separados**, y ésa es justamente la información que le permite al usuario
entender por qué una factura que ve en la lista no se deja pagar. No resumirlo ni reescribirlo.

> Recordatorio de serialización: `MensajeErrorJsonFilter` envuelve cualquier respuesta ≥400 cuyo
> cuerpo sea un `String`, así que el cliente siempre lee `{"mensaje": "..."}`.

---

## 2. `GET /rest/mvch/listar` — tres campos nuevos, misma forma

La respuesta **sigue siendo `List<MovimientoCajaChica>`**. No se convierte en proyección: la
pantalla resuelve tipo y beneficiario navegando objetos anidados, y aplanarlos obligaría a
replicarlos a mano.

Se agregan tres campos `@Transient` a la entidad, poblados por `MovimientoCajaChicaServiceImpl.listar`:

| Campo | Tipo | Cuándo viene |
|---|---|---|
| `documentoTipo` | `"FACTURA"` \| `"LIQUIDACION_COMPRA"` \| `null` | Sólo si el gasto pagó un documento |
| `documentoId` | número \| `null` | idem |
| `documentoNumero` | texto \| `null` | idem — es el número que se muestra |

**El molde ya existe en este módulo y hay que seguirlo:** `Egreso` resuelve así `formaPago` y
`numeroCheque`, que viven en `PGS.PGTR` y no en su tabla. Su javadoc marca la condición que
importa: se pueblan **en una sola consulta por página**. ⛔ **No una consulta por fila.**

Un movimiento sin documento trae los tres en `null`. Los clientes que hoy ignoran estos campos
siguen andando sin cambios.

---

## 3. Trampas

**`numeroDocumento` no es el documento.** Es el texto libre de siempre (`MVCHNDOC`), y sigue siendo
el número de comprobante del gasto suelto. El vínculo real es `idDocumento`. Si la pantalla decide
autopoblarlo con el número del documento elegido —razonable, evita tipear dos veces— que quede
claro que **es una etiqueta: nadie resuelve el documento leyendo ese texto.**

**`tipoDocPago = CAJA_CHICA` es 6.** `TipoDocPagoAplicacion` tenía cinco valores; el sexto es nuevo.
Los mapas de etiquetas que enumeran cinco quedan cortos: en backend, `textoTipoDocPago` de
`FacturaCompraServiceImpl:102` y `LiquidacionCompraCompraServiceImpl:88`; en frontend,
`TIPO_DOC_PAGO_LABELS`. **Ninguno de los tres excluye filas** —etiquetan, con respaldo genérico—
así que el riesgo es mostrar «Tipo 6», no perder un movimiento.

**⛔ La columna `APLPMVCH` va antes que el WAR.** Script: `tsr/sql/e2-07`. Si el WAR sube primero,
`AplicacionPagoCxp` mapea una columna que no existe y **toda lectura de esa entidad falla con
ORA-00904**, no sólo la de caja chica. Y no se mergea el mapeo a `main` hasta que esté corrido —
§7 del registro de reservas.

**La anulación del gasto reversa la aplicación.** Ver §6 del plan: la anulación ya existe y ya
valida que el gasto no esté incluido en un cierre. Esa validación **el reverso por el lado de los
abonos no la conoce**, así que el camino válido es anular el gasto.
