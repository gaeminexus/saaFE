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

⛔ **`recibido`, `diferencia` y `cuadra` son NULLABLE** — corregido el 2026-09-02 contra
`ResultadoCuadreDistribucionBanda.java`, que los declara `Double`/`Boolean`. Vienen en null cuando
ese origen **todavía no tiene una fuente de «recibido» independiente conectada**, y hoy **sólo
`CARGA_PETRO` la tiene**. El ejemplo de arriba muestra el caso Petro; los otros tres orígenes van a
traer null.

Entonces el encabezado tiene **tres** estados, no dos:

| Estado | Cuándo | Cómo se ve |
|---|---|---|
| Cuadra | `cuadra: true` | verde |
| **No cuadra** | `cuadra: false` | **rojo, arriba** |
| Sin verificación disponible | `cuadra: null` | informativo, mismo trato que `contabilidadConectada: false` |

**Sin el tercer estado, `COBRO_INDIVIDUAL` y `EVENTO_PRESTAMO` se mostrarían como «no cuadra» con un
`$0,00` inventado** — peor que no mostrar nada, porque inventa un descuadre que nadie tiene.
(Lo levantó el agente FE al implementar; el error era de este documento.)

⛔ `diferencia != 0` se muestra **en rojo y arriba**, nunca en un total al pie. Es el defecto que
costó una jornada entera encontrar precisamente porque no estaba a la vista.

`cuadra` de `/dsbn/origenes` es nullable por la misma razón.

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
      "tipoCartera": 1, "dias": 45,
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

---

## Correcciones del contrato — 2026-09-02

Las dos las levantó el agente FE leyendo los DTO reales del backend, y **las dos eran errores de este
documento**, no del código. Quedan escritas para que nadie vuelva a confiar en la versión anterior.

### `tipoCartera` es un CÓDIGO NUMÉRICO, no un texto

`FilaDistribucionBanda.java` lo declara `Long`. Los valores salen de
`com.saa.rubros.TipoCarteraBanda`:

| Código | Significado |
|---|---|
| `1` | POR_VENCER |
| `2` | VENCIDO |

**No existe un tercer código «al día».** Este documento mostraba `"tipoCartera": "POR_VENCER"` como
string; con datos reales el frontend habría pintado el número crudo, y cualquier manipulación de
texto sobre un número habría roto el render en ejecución. La traducción a etiqueta la hace el
frontend contra ese enum, verificada — no adivinada.

### El cuadre puede no existir

Ver el tercer estado en la sección de `/dsbn/cuadre`. `recibido`, `diferencia` y `cuadra` son
nullables y hoy sólo `CARGA_PETRO` los trae con valor.

### ⚠️ Estado real de las escrituras, y no coincide con el vocabulario

El vocabulario declara cuatro orígenes y la pantalla los ofrece los cuatro, pero **hoy sólo
`CARGA_PETRO` tiene alguien escribiendo filas** (`CobroPetroContableServiceImpl`). Los otros tres
—`COBRO_INDIVIDUAL`, `EVENTO_PRESTAMO`, `PAGO_PENSION`— están contratados y **sin implementar**: por
esos filtros la pantalla va a devolver vacío siempre, hagan los procesos lo que hagan.

**Es un hueco del despacho, no del código**: el §2 del plan pide transversalidad desde el día uno y
quedó cumplida en la estructura de la tabla y en la pantalla, pero no en las escrituras. Está en cola
para cerrarse, y hasta entonces la pantalla no debería ofrecer un filtro que nunca puede tener datos
sin decir por qué.

---

## Las DOS vistas — decisión del usuario, 2026-09-02

> *«que me dé las dos opciones en pantalla, las dos opciones de clasificación de información»*

La pantalla ofrece **las dos formas de leer los mismos datos**, con un selector, y **los mismos
filtros alimentan a las dos**. No es una en lugar de la otra.

### Vista RESUMEN (nueva, la que abre por defecto)

Jerárquica, de arriba hacia abajo, porque es la que responde la pregunta de contabilidad
—«¿por qué fue este saldo a esta cuenta?»— **en dos clics** en vez de en 69 páginas:

```
CUADRE        Recibido vs Distribuido, con la diferencia real

RESUMEN       Concepto → cuenta contable → banda, con su total y su participación
              ▸ Capital                  $150.939,84
                  1.3.01.05  DE 1 A 30 DIAS      $ 42.110,20
                  1.3.01.10  DE 31 A 90 DIAS     $ 38.004,55
              ▸ Interés ordinario         $73.740,69
              ▸ Interés de mora              $965,99
              ▸ Aportes                  $116.857,06
```

Al abrir una banda o una cuenta se salta a la vista DETALLE **con ese filtro ya aplicado**.

### Vista DETALLE (la que existe hoy)

La tabla plana, fila por fila, con paginación y exportación a CSV. Es la correcta para el caso
puntual: «quiero ver los pagos de este partícipe en esta banda». **No se toca, sólo deja de ser
la única.**

### Qué agrega el backend

`POST /rest/dsbn/detalle` suma un `resumenJerarquico` calculado sobre **el conjunto filtrado
completo, no sobre la página**:

```json
"resumenJerarquico": [
  { "concepto": "CAPITAL", "valor": 150939.84, "filas": 1093,
    "detalle": [
      { "cuentaContable": "1.3.01.05", "nombreCuenta": "DE 1 A 30 DIAS",
        "idBanda": 3, "banda": "DE 1 A 30 DIAS", "valor": 42110.20, "filas": 312 }
    ] }
]
```

⛔ **Agrupado por CONCEPTO en el primer nivel, no por cuenta** — la regla del §3 del plan sigue
mandando: mora e interés ordinario comparten cuenta contable y se fusionarían. La cuenta es el
**segundo** nivel.

⚠️ Sin CNT conectado, `cuentaContable` y `nombreCuenta` vienen null y el segundo nivel agrupa sólo
por banda. La vista sigue funcionando.

---

## 4. `GET /rest/dsbn/diferencia` — «¿dónde está la diferencia?»

> **Pedido del usuario, 2026-09-02:** *«en la pantalla debería existir un botón que nos muestre
> rápidamente dónde está la diferencia mal afectada»*.

El cuadre ya dice **que** hay diferencia. Este endpoint dice **de quién**.

Es la consulta que se viene escribiendo a mano en `sql/183` y `sql/184` cada vez que aparece un
descuadre — convertida en función del sistema, que es donde debería haber estado desde el principio.
Contabilidad no debería depender de que alguien escriba un SELECT para saber a qué partícipe mirar.

**Query params:** `origen`, `idOrigen`.

```json
{
  "origen": "CARGA_PETRO", "idOrigen": 449,
  "diferenciaTotal": 79.44,
  "participesConDiferencia": 6,
  "recibieronDeMas": 2, "recibieronDeMenos": 4,
  "detalle": [
    { "codigoPetro": 7508, "cedula": "...", "participe": "...",
      "descontado": 406.73,
      "aplicadoPrestamos": 464.52, "aplicadoAportes": 0.00, "aplicadoTotal": 464.52,
      "diferencia": 57.79,
      "aplicadoManual": 406.73, "aplicadoAutomatico": 57.79 }
  ]
}
```

- `descontado`: `SUM(PXCA.PXCADSDO)` del partícipe en esa carga, **todos los productos**.
- `aplicadoPrestamos` + `aplicadoAportes`: **todo** lo que el proceso hizo con su plata.
- `diferencia`: `aplicadoTotal − descontado`. **Positiva = recibió de más.**
- `aplicadoManual` / `aplicadoAutomatico`: el desglose por ruta, usando el prefijo estable de
  `PGPROBSR` (commit `e7b76c8`). **Es la columna que dice por dónde entró el defecto**, y sin ella
  hay que ir a la base para saberlo.

Ordenado por `diferencia` descendente: los que recibieron de más van primero, que son los que
importan.

⚠️ **`diferenciaTotal` tiene que coincidir con la `diferencia` del cuadre.** Si no coinciden, hay
casos que este endpoint no está viendo —partícipes sin fila `PXCA`, aportes que no emparejan por
entidad— y eso **es un hallazgo, no un redondeo**. Que la pantalla lo muestre en vez de disimularlo.

### En la pantalla

Un botón en el panel de cuadre, **visible sólo cuando `cuadra === false`**, que abre esta lista. Los
que recibieron de más arriba y en rojo; los de menos, después.

⛔ **No es una pantalla nueva ni un filtro más:** es la respuesta a «¿y ahora a quién miro?», que hoy
sólo se puede contestar escribiendo SQL.
