# API — Cierre mensual de cartera (contrato para el frontend)

**Estado:** ✅ FASE 2 IMPLEMENTADA (2026-08-25) — código entregado, pendiente de compilar y
desplegar por el usuario en Eclipse/WildFly.
**Regla:** este documento es el contrato entre backend y frontend. El agente frontend NO
inventa rutas ni estructuras: usa solo lo que esté aquí. Todo endpoint nuevo o cambiado se
registra aquí en el mismo cambio.

**Base URL:** `/SaaBE/rest` · **Recurso:** `/rest/cierrecartera`
**Diseño de negocio:** `LEVANTAMIENTO-ALIMENTACION-CONTABLE-CREDITOS.md` §3.2, §5 y §6.3
**Depende de:** `API-BANDAS-PRODUCTO.md` (Fase 1 — la parametrización de bandas debe estar
cargada o este proceso no corre)
**DDL:** `sql/DDL-CIERRE-CARTERA.sql` · **Plantillas:** `ACTUALIZACION-PLANTILLAS-CIERRE-CARTERA.md`

---

## 0. Cómo leer este documento

Las convenciones de **formato de fechas** (§0.1) y **estilo de error** (§0.2) son las mismas
que documenta `API-BANDAS-PRODUCTO.md`, y no se repiten aquí. Resumen de lo imprescindible:

- `LocalDate` **sale** como arreglo `[2026,8,31]` y **entra** como `"2026-08-31"`.
- Los errores llegan como `500` con cuerpo JSON `{"mensaje": "Error …: …"}`.
- Los mensajes de validación de negocio dentro de `mensaje` son aptos para mostrárselos al
  usuario tal cual.

**Procedencia de los números de este documento:** los importes son los que el cálculo
produce sobre la BD local de desarrollo (docker `saa-oracle-23ai`, empresa 1236 ASOPREP,
período **agosto 2026**), verificados con SQL que replica el algoritmo del servicio. Las
estructuras y los nombres de campo son exactos.

---

## 1. Lo que hace el proceso

Seis sub-procesos, en este orden. Cada uno genera **un asiento propio**.

| `subProceso` | `referencia` | Nombre | Fecha del asiento | De dónde salen sus cuentas |
|---|---|---|---|---|
| 1 | ① | Asiento de vencidos | proceso | `CRD.BNDP` (bandas) |
| 2 | ② | Cambio de bandas - cartera por vencer | proceso | `CRD.BNDP` |
| 3 | ①.1 | Reclasificación - cartera vencida | proceso | `CRD.BNDP` |
| 4 | ③ | Apertura del periodo de credito | proceso | plantilla alterno 1 |
| 5 | ④ | Devengo de intereses a ingresos | proceso | plantilla alterno 17 |
| 6 | ⑥ | Neteo de planillas | **corte** | plantilla alterno 33 |

### 1.1 Las tres fechas — la parte que más confunde

El período se identifica por el **mes que se CIERRA**. Todo lo demás se deriva y **no se
recibe por parámetro**: dejarlo elegir abriría la puerta a un cierre de agosto fechado en
marzo.

Para `anio=2026, mes=8`:

| Campo | Valor | Qué es |
|---|---|---|
| `fechaCorte` | `[2026,8,31]` | último día del mes cerrado. Filtro de "cuotas pendientes con fecha ≤ corte" y **fecha del asiento de neteo** |
| `fechaProceso` | `[2026,9,1]` | primer día del mes siguiente. Fecha de los otros cinco asientos, y fecha con la que se resuelve la configuración de bandas vigente |
| `fechaCorteApertura` | `[2026,9,30]` | último día del mes que se ABRE. Hasta ahí factura la apertura |

### 1.2 Cómo se cuentan los días de una cuota

Es la decisión que define todo el reparto por bandas:

- **POR VENCER** (vence después del corte): `dias = vencimiento − corte`. La cuota que vence
  mañana tiene 1 día.
- **VENCIDO** (vence el día del corte o antes): `dias = corte − vencimiento + 1`. La cuota
  que vence **el día** del corte cuenta como **1 día** de vencida, no 0.

Ese `+1` no es cosmético: con 0 el clasificador rechazaría la cuota (`dias >= 1`), y además
es justo la cuota que el sub-proceso ① mueve a la banda 1 de vencido.

### 1.3 Por qué la reclasificación siempre cuadra

Los asientos ②, ①.1 registran diferencias. §6.3 dice que cuadran "porque el total de cartera
no cambia; lo que cambia el total lo hacen otros asientos". Eso solo es cierto comparando el
**mismo juego de cuotas** medido en dos fechas — que es exactamente lo que hace el proceso:
clasifica la cartera viva de hoy con los días medidos al corte anterior y al corte actual, y
contabiliza la diferencia. El capital que cruzó de por vencer a vencido lo saca el
sub-proceso ①, y ② y ①.1 corrigen esa banda 1 para no contarlo dos veces.

**Consecuencia práctica:** los tres asientos de banda cuadran por construcción; el proceso
falla si alguno no cuadra, porque eso significaría un defecto de parametrización.

### 1.4 Las desviaciones no son errores

`desviaciones` compara el **snapshot** que dejó la corrida anterior con la distribución que
esa misma banda tendría hoy medida a aquella fecha. La diferencia es lo que movieron los
OTROS procesos durante el mes: pagos, entregas, novaciones. **Es información, no un fallo.**
La pantalla debe mostrarlas como aviso, no como bloqueo.

---

## 2. Endpoints

### 2.1 POST `/rest/cierrecartera/previsualizar`

- **Propósito:** calcular la corrida SIN grabar nada. Es lo que contabilidad revisa antes de
  autorizar.
- **Proceso de negocio:** pantalla de cierre de cartera, botón "Previsualizar".
- **Request body** (`SolicitudCierreCartera`):

```json
{
  "idEmpresa": 1236,
  "anio": 2026,
  "mes": 8,
  "usuario": "MSANCHEZ",
  "ip": "192.168.1.40",
  "observacion": "Cierre de agosto 2026"
}
```

| Campo | Tipo | Obligatorio | Nota |
|---|---|---|---|
| `idEmpresa` | Long | **sí** | nodo SCP.PJRQ; en local/pruebas ASOPREP = `1236` |
| `anio` | Long | **sí** | año del mes a CERRAR, entre 2000 y 2100 |
| `mes` | Long | **sí** | mes a CERRAR, 1 a 12 |
| `usuario` / `ip` | String | no | auditoría; `usuario` va también al asiento |
| `observacion` | String | no | queda en la corrida |

- **Response 200** (`CierreCartera`). Estructura completa, con los importes reales de la BD
  local para agosto 2026 (las listas van recortadas con `"…"` donde el patrón se repite):

```json
{
  "idCorrida": null,
  "idEmpresa": 1236,
  "anio": 2026,
  "mes": 8,
  "fechaCorte": [2026, 8, 31],
  "fechaProceso": [2026, 9, 1],
  "fechaCorteApertura": [2026, 9, 30],
  "idEstado": null,
  "nombreEstado": null,
  "capitalTotal": 17130466.19,
  "totalDesviacion": 0.00,
  "subProcesos": [
    {
      "subProceso": 1,
      "nombre": "Asiento de vencidos",
      "referencia": "①",
      "fecha": [2026, 9, 1],
      "glosa": "CRD cierre de cartera 2026-08 - capital vencido del mes",
      "totalDebe": 220927.29,
      "totalHaber": 220927.29,
      "omitido": false,
      "motivoOmision": null,
      "idAsiento": null,
      "numeroAsiento": null,
      "lineas": [
        { "cuenta": "1.3.04.05", "nombreCuenta": "DE 1 A 30 DIAS", "idPlanCuenta": 10285,
          "descripcion": "Vencidos 2026-08 - EMERGENTE", "debe": 101237.26, "haber": 0.0,
          "idProducto": 2, "nombreProducto": "EMERGENTE", "tipoCartera": 2,
          "numeroBanda": 1, "codigoLinea": null },
        { "cuenta": "1.3.01.05", "nombreCuenta": "DE 1 A 30 DIAS", "idPlanCuenta": 10279,
          "descripcion": "Vencidos 2026-08 - EMERGENTE", "debe": 0.0, "haber": 101237.26,
          "idProducto": 2, "nombreProducto": "EMERGENTE", "tipoCartera": 1,
          "numeroBanda": 1, "codigoLinea": null }
      ]
    },
    {
      "subProceso": 2,
      "nombre": "Cambio de bandas - cartera por vencer",
      "referencia": "②",
      "fecha": [2026, 9, 1],
      "glosa": "CRD cierre de cartera 2026-08 - reclasificacion de bandas por vencer",
      "totalDebe": 445336.12,
      "totalHaber": 445336.12,
      "omitido": false,
      "lineas": [
        { "cuenta": "1.3.01.05", "nombreCuenta": "DE 1 A 30 DIAS", "idPlanCuenta": 10279,
          "descripcion": "Reclasificacion 2026-08 - EMERGENTE banda 1", "debe": 203189.75,
          "haber": 0.0, "idProducto": 2, "nombreProducto": "EMERGENTE",
          "tipoCartera": 1, "numeroBanda": 1, "codigoLinea": null },
        { "cuenta": "1.3.01.10", "nombreCuenta": "DE 31 A 90 DIAS", "idPlanCuenta": 10280,
          "descripcion": "Reclasificacion 2026-08 - EMERGENTE banda 2", "debe": 0.0,
          "haber": 102362.06, "idProducto": 2, "nombreProducto": "EMERGENTE",
          "tipoCartera": 1, "numeroBanda": 2, "codigoLinea": null },
        { "cuenta": "1.3.01.15", "descripcion": "Reclasificacion 2026-08 - EMERGENTE banda 3",
          "debe": 0.0, "haber": 38.85, "numeroBanda": 3 },
        { "cuenta": "1.3.01.20", "descripcion": "Reclasificacion 2026-08 - EMERGENTE banda 4",
          "debe": 0.0, "haber": 5932.67, "numeroBanda": 4 },
        { "cuenta": "1.3.01.25", "descripcion": "Reclasificacion 2026-08 - EMERGENTE banda 5",
          "debe": 0.0, "haber": 94856.17, "numeroBanda": 5 },
        "… ídem para los demás productos con cartera"
      ]
    },
    { "subProceso": 3, "nombre": "Reclasificacion - cartera vencida", "referencia": "①.1",
      "fecha": [2026, 9, 1], "totalDebe": 71511.80, "totalHaber": 71511.80,
      "omitido": false, "lineas": ["…"] },
    {
      "subProceso": 4,
      "nombre": "Apertura del periodo de credito",
      "referencia": "③",
      "fecha": [2026, 9, 1],
      "glosa": "CRD apertura de cartera 2026-09",
      "totalDebe": 5153615.93,
      "totalHaber": 5153615.93,
      "omitido": false,
      "lineas": [
        { "cuenta": "1.4.05.05", "nombreCuenta": "APORTES", "idPlanCuenta": 9536,
          "descripcion": "Aportes personales y patronales por cobrar",
          "debe": 121160.97, "haber": 0.0, "idProducto": null, "nombreProducto": null,
          "tipoCartera": null, "numeroBanda": null, "codigoLinea": 1 },
        { "cuenta": "1.4.05.10", "descripcion": "Cuotas de prestamos por cobrar del mes, todos los valores",
          "debe": 5032454.96, "haber": 0.0, "codigoLinea": 2 },
        { "cuenta": "2.3.02.05", "descripcion": "Aportes por aplicar",
          "debe": 0.0, "haber": 121160.97, "codigoLinea": 3 },
        { "cuenta": "2.3.02.10", "descripcion": "Prestamos por aplicar",
          "debe": 0.0, "haber": 5032454.96, "codigoLinea": 4 }
      ]
    },
    {
      "subProceso": 5,
      "nombre": "Devengo de intereses a ingresos",
      "referencia": "④",
      "fecha": [2026, 9, 1],
      "glosa": "CRD devengado de interes a ingresos 2026-08",
      "totalDebe": 2230420.44,
      "totalHaber": 2230420.44,
      "omitido": false,
      "lineas": [
        { "cuenta": "1.4.02.05", "descripcion": "INTERES ORDINARIO por cobrar 2026-08",
          "debe": 233207.00, "haber": 0.0, "codigoLinea": 10 },
        { "cuenta": "1.4.02.05", "descripcion": "INTERES POR MORA por cobrar 2026-08",
          "debe": 384282.11, "haber": 0.0, "codigoLinea": 20 },
        { "cuenta": "5.1.02.05", "descripcion": "Ingreso por INTERES ORDINARIO 2026-08",
          "debe": 0.0, "haber": 233207.00, "codigoLinea": 30 },
        { "cuenta": "5.1.02.05", "descripcion": "Ingreso por INTERES POR MORA 2026-08",
          "debe": 0.0, "haber": 384282.11, "codigoLinea": 40 },
        "… ídem para HIPOTECARIO (1.4.02.15 / 5.1.02.15) y PRENDARIO (1.4.02.10 / 5.1.02.10)"
      ]
    },
    {
      "subProceso": 6,
      "nombre": "Neteo de planillas",
      "referencia": "⑥",
      "fecha": [2026, 8, 31],
      "glosa": "CRD neteo de planillas 2026-08",
      "totalDebe": 4797836.62,
      "totalHaber": 4797836.62,
      "omitido": false,
      "lineas": [
        { "cuenta": "2.3.02.05", "descripcion": "Aportes no cobrados 2026-08",
          "debe": 115661.22, "haber": 0.0, "codigoLinea": 3 },
        { "cuenta": "2.3.02.10", "descripcion": "Cuotas de prestamos no cobradas 2026-08",
          "debe": 4682175.40, "haber": 0.0, "codigoLinea": 4 },
        { "cuenta": "1.4.05.05", "descripcion": "Aportes no cobrados 2026-08",
          "debe": 0.0, "haber": 115661.22, "codigoLinea": 1 },
        { "cuenta": "1.4.05.10", "descripcion": "Cuotas de prestamos no cobradas 2026-08",
          "debe": 0.0, "haber": 4682175.40, "codigoLinea": 2 }
      ]
    }
  ],
  "snapshot": [
    { "idProducto": 2, "nombreProducto": "EMERGENTE", "tipoCartera": 1,
      "nombreTipoCartera": "POR VENCER", "idBanda": 1, "numeroBanda": 1,
      "etiquetaBanda": "1 - 30", "idPlanCuenta": 10279, "cuenta": "1.3.01.05",
      "nombreCuenta": "DE 1 A 30 DIAS", "capital": 101952.49, "cantidad": 750 },
    "… una fila por (producto, tipo de cartera, banda) — 143 en la parametrización actual"
  ],
  "desviaciones": [],
  "advertencias": [
    "No hay una corrida anterior ejecutada: la reclasificacion se calcula contra la distribucion que la cartera de hoy tenia al 2026-07-31, y no hay snapshot con el cual contrastarla."
  ]
}
```

- **Totales verificados** contra la BD local (agosto 2026, empresa 1236):

| Sub-proceso | Debe | Haber | Cuadra |
|---|---|---|---|
| ① Vencidos | 220 927,29 | 220 927,29 | ✅ |
| ② Bandas por vencer | 445 336,12 | 445 336,12 | ✅ |
| ①.1 Bandas vencidas | 71 511,80 | 71 511,80 | ✅ |
| ③ Apertura | 5 153 615,93 | 5 153 615,93 | ✅ |
| ④ Devengo de intereses | 2 230 420,44 | 2 230 420,44 | ✅ |
| ⑥ Neteo | 4 797 836,62 | 4 797 836,62 | ✅ |

Capital total de la cartera al 2026-08-31: **17 130 466,19** (el servidor devuelve `17130466.19`; una versión anterior de este documento decía `,20` por un redondeo al transcribirlo).

**Ejemplo de que ② cuadra por producto**, no solo en total — EMERGENTE (producto 2), cartera
por vencer, importes reales:

| Banda | Cuenta | Diferencia | Lado |
|---|---|---|---|
| 1 | 1.3.01.05 | +203 189,75 | Debe |
| 2 | 1.3.01.10 | −102 362,06 | Haber |
| 3 | 1.3.01.15 | −38,85 | Haber |
| 4 | 1.3.01.20 | −5 932,67 | Haber |
| 5 | 1.3.01.25 | −94 856,17 | Haber |
| | **Suma** | **0,00** | |

La banda 1 crece porque recibe las cuotas que se acercan; las demás se vacían hacia ella. Y
la suma da cero porque los 101 237,26 que ese producto pasó a vencido ya los sacó el
sub-proceso ① — si no se corrigiera, esta banda 1 mostraría +101 952,49 y el asiento no
cuadraría.

- **Errores:**

| Condición | Mensaje dentro de `{"mensaje": …}` |
|---|---|
| falta `idEmpresa` | `Error al previsualizar el cierre de cartera: La empresa es obligatoria` |
| falta año o mes | `… El anio y el mes a cerrar son obligatorios` |
| mes fuera de rango | `… El mes debe estar entre 1 y 12; se recibio: 13` |
| sin parametrización de bandas vigente | `… No hay ninguna configuracion de bandas vigente al 2026-09-01 para la empresa 1236. Parametrice las bandas antes de correr el cierre.` |
| falta una plantilla | `… No existe la plantilla contable con codigo alterno 17 (devengo de intereses) para la empresa 1236.` |
| falta una línea de plantilla | `… La plantilla contable de Devengo de intereses a ingresos no define la linea 40 para el tipo de prestamo 2.` |

- **Notas:**
  - **Previsualizar NO exige que el período esté libre.** Previsualizar un mes ya ejecutado
    es legítimo y devuelve el cálculo de HOY, que puede no coincidir con lo que se
    contabilizó; para ver lo contabilizado está `/consultar`.
  - Un sub-proceso sin nada que hacer sale con `omitido: true`, `lineas: []` y
    `motivoOmision` explicado. **La ejecución no le genera asiento** — un asiento sin líneas
    no cuadra y no aporta nada.
  - `advertencias` puede traer productos con cartera pero sin bandas parametrizadas, con el
    importe que queda fuera de la distribución. **Hay que leerlas antes de ejecutar.**

---

### 2.2 POST `/rest/cierrecartera/ejecutar`

- **Propósito:** calcular, grabar la corrida con su snapshot y generar los asientos.
- **Request:** idéntico a §2.1.
- **Response 200:** la misma estructura de §2.1, con:
  - `idCorrida` informado,
  - `idEstado: 2` y `nombreEstado: "EJECUTADA"`,
  - cada sub-proceso no omitido con su `idAsiento` y `numeroAsiento`.

```json
{
  "idCorrida": 1,
  "idEmpresa": 1236,
  "anio": 2026,
  "mes": 8,
  "idEstado": 2,
  "nombreEstado": "EJECUTADA",
  "subProcesos": [
    { "subProceso": 1, "nombre": "Asiento de vencidos", "totalDebe": 220927.29,
      "idAsiento": 4821, "numeroAsiento": "137", "…": "…" }
  ],
  "…": "…"
}
```

- **Transaccionalidad:** todo o nada. Si un sub-asiento falla, no queda ni la corrida ni el
  snapshot ni los asientos anteriores.
- **Errores** (además de los de §2.1):

| Condición | Mensaje |
|---|---|
| el período ya se cerró | `Error al ejecutar el cierre de cartera: El periodo 2026-08 ya tiene la corrida 1 en estado EJECUTADA. Reverse esa corrida antes de volver a ejecutar el cierre.` |
| un asiento de banda no cuadra | `… El asiento de Cambio de bandas - cartera por vencer no cuadra: DEBE … y HABER …, diferencia …. Las lineas de banda salen de la parametrizacion y deben cuadrar por construccion…` |
| un asiento de plantilla se pasa de la tolerancia | `… El asiento de Apertura del periodo de credito no cuadra: … Supera la tolerancia de cuadre (0.5) y no se emite.` |
| no hay período contable abierto | el mensaje que devuelve `AsientoContableService` |

- **Idempotencia:** garantizada en dos capas. El servicio consulta la corrida viva del
  período y falla con el mensaje de arriba; además el índice único funcional
  `UK_CRCT_PERIODO` de la base impide físicamente una segunda corrida PREPARADA o EJECUTADA
  del mismo período. Las REVERSADAS quedan fuera del índice, que es lo que permite
  reprocesar.

---

### 2.3 GET `/rest/cierrecartera/consultar`

- **Propósito:** lo que quedó GRABADO de un período. **No recalcula nada.**
- **Request** (query params): `idEmpresa`, `anio`, `mes` — los tres obligatorios.

```
GET /SaaBE/rest/cierrecartera/consultar?idEmpresa=1236&anio=2026&mes=8
```

- **Response 200:** la misma estructura de §2.1, pero:
  - los sub-procesos vienen **sin `lineas`** (solo totales, fecha y asiento): las líneas
    están en el asiento contable, no duplicadas en CRD;
  - `snapshot` sale de `CRD.BDCC`, tal como se grabó;
  - `desviaciones` viene vacío — es un cálculo de la previsualización, no un dato guardado.
- **Errores:**

| Condición | Mensaje |
|---|---|
| período sin corrida viva | `Error al consultar el cierre de cartera: El periodo 2026-08 no tiene una corrida de cierre de cartera vigente para la empresa 1236` |
| falta empresa / período | los mismos de §2.1 |

> Una corrida REVERSADA **no** la devuelve `/consultar`: para el servicio deja de ser la
> corrida viva del período. Se ve en `/corridas`.

---

### 2.4 POST `/rest/cierrecartera/reversar/{idCorrida}`

- **Propósito:** anular los asientos de una corrida ejecutada y dejar el período libre.
- **Request:** el código de la corrida en la ruta; `usuario`, `ip` y `motivo` como query
  params, todos opcionales salvo el buen criterio de informar `usuario` y `motivo`.

```
POST /SaaBE/rest/cierrecartera/reversar/1?usuario=MSANCHEZ&ip=192.168.1.40&motivo=Faltaba%20parametrizar%20PRENDARIO%20NOVACION
```

- **Qué hace:**
  1. anula cada asiento con `AsientoService.anulaAsiento`, que decide solo entre **anular**
     (período abierto) y **reversar** (período ya mayorizado);
  2. marca los registros de `CRD.ANCC` como ANULADOS;
  3. marca la corrida como REVERSADA y le agrega el motivo a la observación.

  **No borra ninguna fila.** El snapshot y los registros de asiento quedan para auditoría.
- **Response 200:** la corrida con `idEstado: 3`, `nombreEstado: "REVERSADA"` y cada
  sub-proceso con `omitido: true` y `motivoOmision: "Asiento anulado por el reverso de la corrida."`.
- **Errores:**

| Condición | Mensaje |
|---|---|
| corrida inexistente | `Error al reversar el cierre de cartera: No existe la corrida de cierre de cartera 99` |
| corrida no ejecutada | `… La corrida 1 esta en estado REVERSADA: solo se puede reversar una corrida EJECUTADA.` |
| el asiento no se puede anular | el mensaje que devuelve `AsientoService` |

---

### 2.5 GET `/rest/cierrecartera/corridas`

- **Propósito:** histórico de corridas de una empresa, para la pantalla.
- **Request:** `idEmpresa` (obligatorio).
- **Response 200:** array de entidades `CorridaCierreCartera` (Jackson expande la empresa):

```json
[
  {
    "codigo": 1,
    "empresa": { "codigo": 1236, "nombre": "ASOPREP", "…": "…" },
    "anio": 2026,
    "mes": 8,
    "fechaCorte": [2026, 8, 31],
    "fechaProceso": [2026, 9, 1],
    "idEstado": 2,
    "observacion": "Cierre de agosto 2026",
    "fechaRegistro": [2026, 8, 25, 16, 4, 12, 337000000],
    "usuarioRegistro": "MSANCHEZ",
    "ipRegistro": "192.168.1.40",
    "fechaModificacion": [2026, 8, 25, 16, 4, 15, 12000000],
    "usuarioModificacion": "MSANCHEZ",
    "ipModificacion": "192.168.1.40",
    "estado": 1
  }
]
```

> **`idEstado` es el ciclo de vida** (1 PREPARADA, 2 EJECUTADA, 3 REVERSADA); `estado` es el
> 1 activo / 0 inactivo de la fila. No confundirlos — es la misma trampa que CLAUDE.md
> documenta para `CRD.PRST`.

- **Errores:** `Error al listar las corridas de cierre de cartera: La empresa es obligatoria`.

---

## 3. Catálogos que consume la pantalla

| Catálogo | Valores | Origen |
|---|---|---|
| Estado de corrida (`idEstado`) | 1 PREPARADA, 2 EJECUTADA, 3 REVERSADA | `com.saa.rubros.EstadoCorridaCierreCartera` — cablear en el frontend |
| Sub-proceso (`subProceso`) | 1..6, ver la tabla de §1 | `com.saa.rubros.SubProcesoCierreCartera` — viene con `nombre` y `referencia` en la respuesta, no hace falta cablearlo |
| Tipo de cartera (`tipoCartera`) | 1 POR VENCER, 2 VENCIDO | `com.saa.rubros.TipoCarteraBanda` |
| Papel de línea (`codigoLinea`) | 1..4, 10, 20, 30, 40 | `com.saa.rubros.CrdLineaAsiento`; solo informativo para auditar la línea |
| Empresa | 1236 en local/pruebas | ver §4.4 de `API-BANDAS-PRODUCTO.md` |

---

## 4. Lo que esta fase NO incluye

- **⑤ Seguros:** la factura entra por CxP marcada "No ATS / No declaración de IVA"; CRD no
  genera ese asiento.
- **Pagos** (Petro y manuales), **jubilación**, **cruces de valores** y **abonos a capital**:
  Fase 3.
- **Saneamiento completo de plantillas** (§8.3 del levantamiento — retirar de las plantillas
  las líneas de banda que ahora salen de `CRD.BNDP`): Fase 4. Lo que esta fase sí hizo está
  en `ACTUALIZACION-PLANTILLAS-CIERRE-CARTERA.md`.
- **⑪ "Bancos vencidas":** descartado por el usuario (decisión D8).
