# API — Pólizas de seguro de préstamos (desgravamen, incendio, prendario)

**Equipo:** `omen-saa-1` · **Fecha:** 2026-10-02 · **Estado:** CONGELADO para la fase 1. La parte
de CXP (§9) espera el contrato de `omen-saa-2`.
**Diseño, que manda:** `crd/DISENO-POLIZAS-SEGURO-PRESTAMOS.md` (decisiones S1–S12, §5).
**DDL:** `crd/sql/306_DDL_POLIZAS_SEGURO.sql` — `CRD.POSG`, `CRD.PSPR`, `CRD.PSCT`. ⛔ Va antes del WAR.
Espejo: `saaFE/docs/crd/API-POLIZAS-SEGURO.md`. Base: `/SaaBE/rest/posg`.

---

## 1. Constantes

| Campo | Valores |
|---|---|
| `tipoSeguro` | 1 DESGRAVAMEN · 2 INCENDIO · 3 PRENDARIO |
| `clase` | 1 FACTURA · 2 NOTA_DEBITO · 3 NOTA_CREDITO |
| `estado` | 1 LISTADO_ENVIADO · 2 DOCUMENTO_REGISTRADO · 3 DISTRIBUIDO · 4 LIBERADO_A_PAGO · 5 ANULADO |
| `novedad` (préstamo en el documento) | 1 ORIGINAL · 2 INCLUSIÓN · 3 EXCLUSIÓN |

**Elegibles por tipo** (diseño §5.1):
- **1 desgravamen:** préstamos con `PRSTIDST IN (2, 11)`, de cualquier producto.
- **2 incendio:** lo mismo, con tipo de préstamo `TPPRCDGO = 2`.
- **3 prendario:** lo mismo, con tipo de préstamo `= 3`.

Los préstamos DE PLAZO VENCIDO (8) **nunca** son elegibles.

**Base de cada préstamo:**
- **1 desgravamen:** el saldo de capital = Σ(capital − capital pagado de PGPR) de las cuotas no PAGADAS
  y no CANCELADAS ANTICIPADAMENTE. Es la misma fuente que plazo vencido y saldos.
- **2 y 3:** `PRST.PRSTVLAS` (suma asegurada).

Errores: `{"mensaje": "CODIGO: descripción"}`, con el mismo mapeo HTTP que `/plvn`. Fechas:
`yyyy-MM-dd` de entrada; en la respuesta, como las serializa Jackson (arreglos).

---

## 2. Suma asegurada del bien (incendio / prendario)

### `PUT /posg/sumaAsegurada`
Cuerpo: `{ "idPrestamo": 123, "valor": 85000.00, "usuario": "x" }`. Graba `PRSTVLAS`.
- **400** si el valor es ≤ 0.
- **409** `NO_ES_HIPOTECARIO_NI_PRENDARIO` si el tipo de préstamo no es 2 ni 3.
- **404** si el préstamo no existe.

### `POST /posg/sumaAsegurada/carga` — multipart (CORREGIDO 2026-10-02: el Excel lo lee el BACKEND)
⛔ **Antes decía que el frontend leía el Excel. No hay librería de Excel en el frontend** (medido por el
ejecutor FE): ni en `package.json` ni en `index.html`, y el único uso, el de `dash-ventas`, está roto.
**El backend ya lee Excel con Apache POI** (`PrestamoServiceImpl:671`, `WorkbookFactory`) y recibe
archivos multipart (`PrestamoRest`). Se sigue ese precedente.

Multipart con estos campos:
- `archivo`: `.xlsx` o `.xls`, con dos columnas, `IDAsoprep` y `suma asegurada`. La primera fila es el
  encabezado.
- `confirmar`: `true` o `false`.
- `usuario`.

Con `confirmar=false` el backend lee el archivo y sólo valida. Con `true` lee y graba **sólo las filas
OK**, en una transacción. Una celda no numérica o vacía → `VALOR_INVALIDO`.

**200:**
```json
{ "total": 120, "ok": 115, "conError": 5,
  "filas": [{ "fila": 2, "idAsoprep": 60123, "idPrestamo": 4567, "valorAnterior": null, "valor": 85000.00,
              "resultado": "OK" }] }
```
`resultado` puede ser `OK`, `NO_EXISTE`, `NO_ES_HIPOTECARIO_NI_PRENDARIO`, `VALOR_INVALIDO` o
`DUPLICADO_EN_ARCHIVO`. Un archivo ilegible → **400** `ARCHIVO_INVALIDO`.

### Exportaciones a Excel — las arma el BACKEND (`.xlsx` con POI, como `PacificoArchivoPagoFormateador`)
- `GET /posg/{id}/listado/excel`: el listado de un documento (lo que se manda a la aseguradora o al
  broker). Columnas: número de préstamo, cédula, partícipe, tipo de préstamo, estado y **base**
  (saldo de capital o suma asegurada).
- `GET /posg/listado/preview/excel?tipoSeguro=&fechaCorte=`: la vista previa antes de generar.
- `GET /posg/{idFactura}/novedades/excel?desde=&hasta=`: dos hojas, Inclusiones y Exclusiones.
- Respuesta `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` con `Content-Disposition`.
  El frontend lo baja como blob, igual que los documentos de plazo vencido.

⚠️ La suma asegurada **no** genera el asiento de cuentas de orden retroactivo (pregunta S14, pendiente).

---

## 3. Listado — paso 1

### `GET /posg/listado/preview?tipoSeguro=1&fechaCorte=yyyy-MM-dd`
Devuelve los elegibles con su base, **sin grabar**:
```json
[{ "idPrestamo": 4567, "numeroPrestamo": "60123", "nombreParticipe": "...", "cedula": "...",
   "tipoPrestamo": "HIPOTECARIO", "estadoPrestamo": 11, "base": 49786.36, "sinSumaAsegurada": false }]
```
`numeroPrestamo` = `idAsoprep ?? codigo`. El cálculo de los saldos va **en lote**, nunca con una
consulta por préstamo.

### `POST /posg/listado`
Cuerpo: `{ "tipoSeguro": 1, "fechaCorte": "2026-10-01", "usuario": "x", "observacion": "..." }`.
- Crea un `POSG` (clase 1, estado 1) y un `PSPR` (novedad 1) por cada préstamo con su base congelada.
- **409** `HAY_PRESTAMOS_SIN_SUMA_ASEGURADA`, con la lista, si algún préstamo de tipo 2 o 3 no tiene
  suma asegurada. No se crea nada.
- **201:** el documento completo (§8).

---

## 4. Registrar el documento de la aseguradora — paso 2

### `PUT /posg/{id}/documento`
```json
{ "aseguradora": "...", "ruc": "...", "numeroPoliza": "...", "numeroDocumento": "001-001-000123",
  "claveAcceso": "49 dígitos", "fechaEmision": "2026-10-05", "fechaInicio": "2026-10-01",
  "fechaFin": "2027-09-30", "tasa": 0.0112, "valorTotal": 41235.67, "usuario": "x" }
```
- El documento tiene que estar en estado 1, o en estado 2 para corregirlo. Si no → **409**.
- `valorTotal > 0`; `fechaFin ≥ fechaInicio`; `claveAcceso` obligatoria. Si no → **400**.
- **409** `CLAVE_ACCESO_DUPLICADA` si ya existe en otro `POSG`.
- Pasa a estado 2.

---

## 5. Distribución — paso 3

### `GET /posg/{id}/distribucion/preview`
Calcula **sin grabar**. El cálculo exacto está en el diseño §5.3:
- **Cuotas en la vigencia:** `fechaVencimiento ∈ [inicio, fin]`, sin contar las PAGADAS ni las
  CANCELADAS ANTICIPADAMENTE.
- **Peso de cada préstamo:** `w_i = base_i × mesesCubiertos_i / mesesVigencia`, con
  `mesesVigencia` = meses calendario de la vigencia.
- **Valor de cada préstamo:** `valor_i = total × w_i / Σw`.
- **Valor de cada cuota:** `valor_i × DTPRSICP_cuota / Σ DTPRSICP`, sumando las cuotas del préstamo
  dentro de la vigencia.
- **Redondeo** a 2 decimales. El sobrante va al préstamo de mayor valor y, dentro de él, a su cuota de
  mayor valor.

**200:**
```json
{ "valorTotal": 41235.67, "sumaPrestamos": 41235.67, "sumaCuotas": 41235.67, "cuadra": true,
  "prestamosSinCuotasEnVigencia": [ { "idPrestamo": 1, "numeroPrestamo": "..." } ],
  "prestamos": [{ "idPrestamo": 4567, "numeroPrestamo": "60123", "base": 49786.36,
     "mesesCubiertos": 12, "peso": 49786.36, "valorAsignado": 512.30,
     "cuotas": [{ "idCuota": 99, "numeroCuota": 85, "fechaVencimiento": [2026,10,31],
                  "saldoInicialCapital": 49786.36, "seguroAnterior": 55.76, "seguroNuevo": 45.12 }] }] }
```
- Un préstamo **sin cuotas en la vigencia** pesa 0 y se lista aparte.
- Si `Σw = 0` → **422** `SIN_CUOTAS_EN_VIGENCIA`.

### `POST /posg/{id}/distribuir`
Cuerpo: `{ "usuario": "x" }`. Tiene que estar en estado 2. **Recalcula** (no confía en la vista previa) y
lo hace **todo o nada** en una transacción:
- **Escribe** el seguro de cada cuota:
  - desgravamen → `DTPRDSGR`, `DTPRDSOR` y `DTPRDSFR`;
  - incendio/prendario → `DTPRVLSI`.
- Ajusta `total` y `totalConSeguro` **por diferencia**: `+= nuevo − anterior`. **Nunca** pisa la mora.
- Una cuota **PARCIAL** no baja de su seguro ya pagado.
- Graba `PSPR` (`mesesCubiertos`, `peso`, `valorAsignado`, `cuotas`) y un `PSCT` por cuota.
- **Invariante dura:** Σ`PSCT.nuevo` = `valorTotal` al centavo. Si no se cumple → **422**
  `DISTRIBUCION_NO_CUADRA` y no se graba nada.
- Pasa a estado 3.
- ⛔ **Choque:** una cuota que ya tiene un `PSCT` vigente (sin `fechaReverso`) del **mismo tipo de
  seguro**, de otro documento distinto de la factura madre de este → **409** `CUOTA_YA_CUBIERTA`, con
  las cuotas. Son dos pólizas con vigencias que se pisan.

---

## 6. Anular

### `POST /posg/{id}/anular`
Cuerpo: `{ "usuario": "x", "motivo": "..." }`. El motivo es obligatorio.
- En estado 1 o 2, sólo cambia el estado.
- En estado 3, **reversa** cada `PSCT` vigente:
  - el seguro vuelve a `PSCT.anterior`;
  - `total` y `totalConSeguro` se ajustan por diferencia;
  - se graba `PSCT.fechaReverso`.

  Una cuota que ya se **pagó** después de la distribución **no se toca**, y se informa en la respuesta.
- En estado 4 → **409** `LIBERADO_A_PAGO`, hasta tener la integración con CXP (§9).
- Una factura con ND/NC vivas no se anula sin anular primero sus notas → **409**.
- Pasa a estado 5. **Nada se borra.**

---

## 7. Novedades — inclusiones (ND) y exclusiones (NC)

### `GET /posg/{idFactura}/novedades?desde=&hasta=`
Contra una factura en estado 3 o 4, del mismo tipo:
- **inclusiones:** elegibles hoy que **no** están en la factura ni en ninguna ND viva de ella.
- **exclusiones:** préstamos de la factura o sus ND que, en el rango, se **precancelaron**, tuvieron un
  **abono a capital**, o se declararon **en plazo vencido**. Se detectan por los eventos o pagos del
  rango.

`{ "inclusiones": [...elegible + base...], "exclusiones": [{ ..., "motivo": "PRECANCELACION|ABONO_CAPITAL|PLAZO_VENCIDO", "fecha": [...] }] }`

### `POST /posg/{idFactura}/nota`
```json
{ "clase": 2, "prestamos": [4567, 4568], "usuario": "x",
  "aseguradora": "...", "ruc": "...", "numeroPoliza": "...", "numeroDocumento": "...", "claveAcceso": "...",
  "fechaEmision": "...", "valorTotal": 120.50 }
```
- Crea un `POSG` con la clase indicada, `padre = idFactura`, la **vigencia de la factura** y estado 2,
  más sus `PSPR` (novedad 2 si es ND, 3 si es NC).
- **ND, al distribuir:** como el §5, entre los préstamos incluidos, con sus cuotas desde la emisión de
  la ND hasta el fin de la vigencia.
- **NC, al distribuir:** **resta** el valor entre las cuotas **que todavía existan** de esos
  préstamos, dentro de la vigencia, en proporción a su `DTPRSICP`. El seguro de una cuota no baja de 0
  ni de lo ya pagado. Lo que no se puede aplicar (el préstamo precancelado ya no tiene cuotas) **se
  informa**, no es error: la invariante de la NC es Σ aplicado ≤ total.

---

## 8. Consultas

- `GET /posg/listar?tipoSeguro=&estado=&clase=` y `GET /posg/{id}` devuelven el documento con sus
  préstamos y totales: `{ id, tipoSeguro, clase, idPadre, estado, fechaCorte, aseguradora, ruc,
  numeroPoliza, numeroDocumento, claveAcceso, fechaEmision, fechaInicio, fechaFin, tasa, valorTotal,
  idDocumentoCxp, cantidadPrestamos, sumaBase, sumaDistribuida, notas: [...], auditoria }`. Siempre un
  DTO, nunca la entidad cruda.
- `GET /posg/{id}/prestamos` devuelve los `PSPR`, con número de préstamo, partícipe y cédula.

---

## 9. ⏸️ Liberar a pago e integración con CXP — ESPERA el contrato de `omen-saa-2`

`POST /posg/{id}/liberar` (en estado 3) → enlaza el documento de CXP por `claveAcceso`, o lo crea con
su carga de XML; levanta el bloqueo y pasa a estado 4. **Fase 1:** el endpoint existe y responde
**409** `INTEGRACION_CXP_PENDIENTE`. Se completa con el contrato de ellos.

---

## 10. Lo que NO cubre esta fase

- **S13**, abono a capital dentro de la vigencia: re-repartir el seguro de la póliza en vez de la
  constante 1,12/1000. Pendiente de confirmar.
- **S14**, cuentas de orden de la garantía al cargar la suma asegurada.
- **Ningún asiento contable en crédito:** la contabilidad de la factura, la ND y la NC va por CXP (§5.6
  del diseño).
