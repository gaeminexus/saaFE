# Verificación de integración — pantalla de cierre mensual de cartera (Fase 2)

**Fecha:** 2026-08-25 · **Repo:** saaFE (frontend) · **Backend:** WildFly en
`http://localhost:8080/SaaBE`. Contrato: `docs/crd/API-CIERRE-CARTERA.md`.

## Resultado global

- **Los cinco endpoints responden y su forma coincide campo por campo** con los modelos
  (`model/cierre-cartera/`). Sin discrepancias de estructura.
- **Round-trip completo ejecutado**: previsualizar → ejecutar → consultar → reversar, todo
  contra el servidor real. Los seis sub-procesos cuadran D = H.
- **Se dejó una corrida REVERSADA en el dev DB** (ver §DB al final): el período 2026-08 quedó
  libre de nuevo (la reversa es el camino de deshacer documentado).

---

## 1. `POST /cierrecartera/previsualizar` → 200 `application/json` (3.5 s)

Request `{"idEmpresa":1236,"anio":2026,"mes":8,"usuario":"VERIF-FE"}`. Claves de la respuesta:
`idCorrida, idEmpresa, anio, mes, fechaCorte, fechaProceso, fechaCorteApertura, idEstado,
nombreEstado, subProcesos, snapshot, desviaciones, totalDesviacion, capitalTotal, advertencias`.

- `fechaCorte [2026,8,31]`, `fechaProceso [2026,9,1]`, `fechaCorteApertura [2026,9,30]` — arreglos. ✔
- `idCorrida/idEstado/nombreEstado = null` (no graba). `snapshot` 143 filas, `desviaciones` 0,
  `advertencias` 1 ("No hay una corrida anterior ejecutada…").
- Sub-procesos y totales, todos cuadran D = H (coinciden con la tabla del contrato):

| SP | ref | nombre | totalDebe = totalHaber | líneas |
|---|---|---|---|---|
| 1 | ① | Asiento de vencidos | 220 927,29 | 10 |
| 2 | ② | Cambio de bandas - por vencer | 445 336,12 | 25 |
| 3 | ①.1 | Reclasificación - vencida | 71 511,80 | 27 |
| 4 | ③ | Apertura del periodo | 5 153 615,93 | 4 |
| 5 | ④ | Devengo de intereses | 2 230 420,44 | 12 |
| 6 | ⑥ | Neteo de planillas | 4 797 836,62 | 4 |

- Claves de línea: `cuenta, nombreCuenta, idPlanCuenta, descripcion, debe, haber, idProducto,
  nombreProducto, tipoCartera, numeroBanda, codigoLinea`. ✔
- Claves de snapshot: `idProducto, nombreProducto, tipoCartera, nombreTipoCartera, idBanda,
  numeroBanda, etiquetaBanda, idPlanCuenta, cuenta, nombreCuenta, capital, cantidad`. ✔
- `capitalTotal = 17 130 466,19` (el contrato dice 17 130 466,20; diferencia de 1 centavo por
  redondeo del documento — inmaterial, no requiere acción).

Errores (500 `application/json {"mensaje":…}`), verificados:
```
POST /previsualizar {"idEmpresa":1236,"anio":2026,"mes":13}
→ 500  {"mensaje":"Error al previsualizar el cierre de cartera: El mes debe estar entre 1 y 12; se recibio: 13"}
```

## 2. `POST /cierrecartera/ejecutar` → 200 `application/json` (20 s)

Request idéntico al de previsualizar. Respuesta:
- `idCorrida: 1`, `idEstado: 2`, `nombreEstado: "EJECUTADA"`. ✔
- Cada sub-proceso con su asiento:

| SP | idAsiento | numeroAsiento | totalDebe |
|---|---|---|---|
| 1 | 8071 | "1" | 220 927,29 |
| 2 | 8072 | "2" | 445 336,12 |
| 3 | 8073 | "3" | 71 511,80 |
| 4 | 8074 | "4" | 5 153 615,93 |
| 5 | 8075 | "5" | 2 230 420,44 |
| 6 | 8076 | "6" | 4 797 836,62 |

`numeroAsiento` es **string** (`"1"`), como declara el modelo. ✔

## 3. `GET /cierrecartera/consultar?idEmpresa=1236&anio=2026&mes=8` → 200

Lo GRABADO (no recalcula):
- `idCorrida: 1`, `idEstado: 2 EJECUTADA`, `snapshot` 143 (de `CRD.BDCC`), `desviaciones` 0.
- Los sub-procesos vienen **con `lineas: []`** (arreglo vacío, no ausente) pero conservan
  `idAsiento`/`numeroAsiento` — las líneas viven en el asiento contable, no duplicadas (§2.3). ✔
  (Por eso el modelo declara `lineas?` opcional y la pantalla cae al modo "solo totales".)

## 4. `GET /cierrecartera/corridas?idEmpresa=1236` → 200 `application/json`

Array de entidades `CorridaCierreCartera` con la empresa expandida. Tras ejecutar:
`corrida 1, 2026-8, idEstado=2`. Tras reversar: `idEstado=3` y la observación con el motivo
anexado.

## 5. `POST /cierrecartera/reversar/1?usuario=…&motivo=…` → 200 (1.7 s)

- `idCorrida: 1`, `idEstado: 3`, `nombreEstado: "REVERSADA"`. ✔
- Los 6 sub-procesos con `omitido: true` y
  `motivoOmision: "Asiento anulado por el reverso de la corrida."` (exacto al §2.4). ✔
- Tras reversar, `GET /consultar` del período responde
  `500 {"mensaje":"… El periodo 2026-08 no tiene una corrida … vigente …"}` — una corrida
  REVERSADA no la devuelve `/consultar` (§2.3). ✔ Se ve en `/corridas`.

---

## Discrepancias para el backend / documento

Ninguna funcional. Único detalle cosmético: el contrato cita `capitalTotal 17 130 466,20`; el
servidor devuelve `…,19` (redondeo del documento). No requiere cambio de código.

## Errores — estilo confirmado

Todos los errores llegan `500` con `Content-Type: application/json` y cuerpo
`{"mensaje":"Error …: …"}`. El servicio (`CierreCarteraService.extraerMensajeError`) extrae
`mensaje` (tolerando texto plano) y la pantalla lo muestra tal cual, apto para el usuario.

## ⚠ Lo que quedó en la BD de desarrollo (a limpiar por BD/backend si se desea)

Del round-trip de escritura sobre **empresa 1236, período 2026-08**:
- **`CRD` corrida `codigo = 1`**: quedó en estado **REVERSADA (3)**. No se borra por diseño
  (snapshot en `CRD.BDCC` y registros `CRD.ANCC` quedan para auditoría).
- **Asientos contables 8071, 8072, 8073, 8074, 8075, 8076**: generados por la ejecución y luego
  **anulados/reversados** por el reverso (`AsientoService.anulaAsiento`).
- **El período 2026-08 quedó libre** (una corrida REVERSADA sale del índice único
  `UK_CRCT_PERIODO`): se puede volver a ejecutar sin bloqueo. Limpiar del todo (borrar la corrida
  y su snapshot) es SQL, fuera del alcance del frontend.

## Acceso

Ruta `/menucreditos/cierre-cartera`, restringida a **USUARIO 1** reutilizando `usuarioUnoGuard`
(mismo `TODO TEMPORAL` que bandas; sin lógica nueva). La opción de menú se agrega solo si
`esUsuarioUno()`.
