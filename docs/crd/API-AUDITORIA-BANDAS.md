# API — Auditoría de distribución en bandas

**Base:** `/SaaBE/rest/dsbn` · **Equipo:** CRD / Equipo B · **Fecha:** 2026-09-02

> El path de JAX-RS es `/rest`: la URL real es `/SaaBE/rest/dsbn/...`. **No** `/api/...`.

Plan de fondo: `PLAN-AUDITORIA-BANDAS.md`. Ante una diferencia, manda el plan.

**Todo lo de este contrato es de sólo lectura.** Ningún endpoint escribe: la pantalla audita lo que
ya ocurrió y no cambia ni un valor.

---

## Vocabulario

**Origen** — de qué hecho salió la distribución. La carga Petro es **uno** de ellos, no el único:

| `origen` | `idOrigen` apunta a |
|---|---|
| `CARGA_PETRO` | `CRD.CRAR` |
| `COBRO_INDIVIDUAL` | `CRD.CBCR` |
| `EVENTO_PRESTAMO` | `CRD.EVPR` — abono a capital, precancelación |
| `PAGO_PENSION` | `CRD.PGPC` — cuando cierre ese frente |

**Concepto** — el agrupador primario. ⛔ **No agrupar por cuenta contable:** la mora va a la misma
cuenta que el interés ordinario y se fusionarían, que es justo el desglose que contabilidad quiere ver.

`CAPITAL` · `INTERES_ORDINARIO` · `INTERES_MORA` · `INTERES_VENCIDO` · `SEGURO_DESGRAVAMEN` ·
`SEGURO_INCENDIO` · `APORTE`

**Banda** — sólo aplica a `CAPITAL`. En los demás conceptos los campos de banda vienen en null: es
un dato ausente legítimo, **no un error a ocultar**.

---

## 1. `GET /rest/dsbn/cuadre`

El encabezado. Es lo primero que pinta la pantalla.

**Query params:** `origen` (obligatorio), `idOrigen` (obligatorio).

```json
{
  "origen": "CARGA_PETRO", "idOrigen": 449,
  "descripcionOrigen": "Carga Petro 8/2026",
  "recibido": 354491.37,
  "distribuido": 351584.85,
  "diferencia": 2906.52,
  "cuadra": false,
  "contabilidadConectada": true,
  "asientos": [ { "idAsiento": 36, "tipo": "TRANSITORIO", "fecha": "2026-08-31", "estado": "ACTIVO" } ],
  "bandas": [
    { "idBanda": 3, "numero": 2, "etiqueta": "DE 31 A 90 DIAS", "diaInicio": 31, "diaFin": 90 }
  ]
}
```

⛔ **`bandas` alimenta el filtro, y NO se puede hardcodear en el frontend.** Verificado contra el
modelo el 2026-09-02: `CRD.BNDP` **no tiene columna de etiqueta** — el rango y su nombre los **deriva**
`ClasificadorBandaService.derivarRangos` a partir de `numero` y `periodos`, y las bandas se configuran
**por producto y por empresa** (`ConfiguracionBandaProducto`). O sea: **ni la cantidad ni los rótulos
son fijos**, y dos productos pueden tener bandas distintas.

Se devuelven **sólo las bandas que aparecen en la distribución de ese origen**, para que el filtro no
ofrezca opciones que no van a dar ninguna fila.

⛔ `diferencia != 0` se muestra **en rojo y arriba**, nunca en un total al pie. Es el defecto que
costó una jornada entera encontrar precisamente porque no estaba a la vista.

⚠️ `contabilidadConectada: false` **no es un error**: es el escenario de venta separada. La pantalla
oculta las columnas de cuenta y asiento y **sigue mostrando todo el resto**.

---

## 2. `POST /rest/dsbn/detalle`

El detalle filtrable. Va por POST porque los filtros son combinables y largos, no porque escriba algo.

**Body** — todos los campos son opcionales salvo `origen`/`idOrigen`; los arreglos son OR interno y
AND entre sí:

```json
{
  "origen": "CARGA_PETRO", "idOrigen": 449,
  "conceptos": ["CAPITAL", "INTERES_MORA"],
  "idsBanda": [3, 4],
  "idsProducto": [12], "idsTipoPrestamo": [1, 2], "idsTipoAporte": [23],
  "idsEntidad": [1234],
  "cuentasContables": ["1.3.01.15"],
  "fechaDesde": "2026-08-01", "fechaHasta": "2026-08-31",
  "pagina": 0, "tamanio": 50,
  "ordenarPor": "valor", "orden": "desc"
}
```

**Respuesta 200:**

```json
{
  "totalFilas": 1093, "pagina": 0, "tamanio": 50,
  "totalValorFiltrado": 150939.84,
  "resumenPorConcepto": [
    { "concepto": "CAPITAL", "valor": 150939.84, "filas": 1093 },
    { "concepto": "INTERES_MORA", "valor": 1284.42, "filas": 200 }
  ],
  "filas": [
    {
      "id": 88123,
      "concepto": "CAPITAL",
      "valor": 137.42,
      "idEntidad": 1234, "participe": "...", "cedula": "...", "codigoAsoprep": 45678,
      "idPrestamo": 7973, "numeroCuota": 10, "fechaVencimiento": "2026-07-31",
      "fechaAplicacion": "2026-08-31",
      "idProducto": 12, "producto": "...", "idTipoPrestamo": 1,
      "idTipoAporte": null,
      "tipoCartera": "POR_VENCER", "dias": 45,
      "idBanda": 3, "banda": "DE 31 A 90 DIAS",
      "cuentaContable": "1.3.01.10", "nombreCuenta": "...",
      "idAsiento": 37
    }
  ]
}
```

`cuentaContable`, `nombreCuenta` e `idAsiento` vienen **null** con contabilidad desconectada. La
pantalla no debe tratarlo como fallo.

---

## 3. `GET /rest/dsbn/origenes`

Alimenta el selector: los orígenes con distribución registrada, del más reciente al más antiguo.

**Query params opcionales:** `origen`, `fechaDesde`, `fechaHasta`, `limite` (por defecto 50).

```json
[ { "origen": "CARGA_PETRO", "idOrigen": 449, "descripcion": "Carga Petro 8/2026",
    "fecha": "2026-08-31", "distribuido": 351584.85, "cuadra": false } ]
```

---

## Errores

`MensajeErrorJsonFilter` envuelve toda respuesta ≥400 con cuerpo de texto como `{"mensaje": "..."}`.
**No llega texto plano**, pese a lo que digan documentos viejos.

| Código | HTTP | Cuándo |
|---|---|---|
| `ORIGEN_NO_ENCONTRADO` | 404 | No hay distribución registrada para ese origen |
| `ORIGEN_INVALIDO` | 422 | `origen` fuera del vocabulario |

⚠️ **Un origen sin filas devuelve 200 con listas vacías, no 404.** Un proceso que corrió y no
distribuyó nada es un dato, y además puede ser el hallazgo. **No** lanzar `IncomeException` porque
la búsqueda vino vacía — ese patrón está en 255 servicios del backend y convierte «no hay datos» en
«falló la consulta».

---

## Fechas

`LocalDate` como `yyyy-MM-dd`, `LocalDateTime` como ISO **local sin zona**. Nunca un `Date` crudo de
JavaScript ni nada terminado en `Z`.

---

## Nota para el frontend

`handleError` de los servicios generados hace `if (+error.status === 200) return of(null)`, y un
fallo de parseo termina indistinguible de «sin datos». **En esta pantalla eso es inaceptable**: es
una herramienta de auditoría; mostrar cero donde hubo un error es peor que mostrar el error. Manejar
el fallo explícitamente y **decir que falló**.
