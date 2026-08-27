# Plan de ejecución — devengo de aportes, vigencias de contrato y flag contable

**Fecha:** 2026-08-27 · **Módulo:** CRD (+ SCP para rubros)
**Decisiones de negocio:** cerradas con el usuario entre el 2026-08-26 y el 2026-08-27. **No se
re-preguntan.** Están en §1.
**DDL:** `sql/DDL-APORTES-DEVENGO-CONTRATOS.sql` — lo ejecuta el orquestador, no los agentes.
**Prompts:** `prompts/PROMPT-BACKEND-APORTES-DEVENGO.md` y `prompts/PROMPT-FRONTEND-APORTES-DEVENGO.md`

---

## 1. Decisiones cerradas

| # | Decisión |
|---|---|
| D1 | En `CRD.APRT` el monto lo lleva **solo `valor`**, y es **lo efectivamente recibido**. `valorPagado`/`saldo`/`estado` dejan de significar algo: toda fila nueva nace con `valorPagado = valor`, `saldo = 0`, `estado = 4`. El FIFO desaparece. |
| D2 | `APRTFCTR` **no cambia de significado**: fecha de caja (fin del mes del periodo de la carga). **Contabilidad la sigue leyendo. Ninguna consulta contable de aportes se modifica.** |
| D3 | Nueva `APRTPRDV` = mes de devengo (primer día del mes). Las consultas de cartera leen `NVL(APRTPRDV, TRUNC(APRTFCTR,'MM'))`, nunca la columna sola. |
| D4 | El excedente **se anticipa al mes siguiente** (devengo del mes siguiente), y la **generación cobra solo el faltante**. |
| D5 | Una devolución consume devengo **sólo de periodos anticipados no vencidos**, LIFO desde el más futuro. Lo que exceda va con `APRTPRDV = NULL`: es retiro de saldo y no altera ningún mes. |
| D6 | **Mora ≠ deuda.** Mora: el mes cuenta si `SUM(valor) > 0` (padrón/voto/elegibilidad, **no cambia**). Deuda: `esperado(m) − aportado(m)` por mes (generación y estado de cuenta). |
| D7 | Contratos con **historial de vigencias** (`CRD.VGCN`), una fila por contrato + tipo de aporte + periodo. |
| D8 | El valor operativo es siempre `VGCNMNTO`. El porcentaje recalcula el monto **sólo al crear una vigencia**. Un cambio de remuneración **cierra la vigencia y abre otra**. |
| D9 | Modo CALCULADO si `remuneración × porcentaje` cuadra al centavo con `HSTR` estado 99; si no, FIJO. Sin remuneración → FIJO, y **se le sigue cobrando igual**. |
| D10 | Flag de contabilidad de CRD **global** (rubro 237, detalle 1): o se alimenta todo o nada. |
| D11 | Alcance de datos: junio 2025 en adelante. Lo anterior se queda con devengo `NULL` y sigue funcionando por el `NVL` de D3. |

---

## 2. Por qué este orden

**La contabilidad de hoy no depende del devengo; depende del monto.** El cierre de cartera calcula
`registrado` como `SUM(APRTVLRR)` de tipos 9/11 en el mes (`CierreCarteraDaoServiceImpl.selectAportesRegistrados`),
y hoy la carga escribe `valor = esperado` en vez de `valor = recibido`. **El "registrado" está
inflado exactamente en la suma de los `saldo` de las filas PARCIAL**, el neteo reversa de menos y
`1.4.05.05` queda con un por-cobrar que no existe. Por eso la Fase 1 va sola y primero.

---

## 3. Fases

| Fase | Quién | Depende de | Qué |
|---|---|---|---|
| **0** | Orquestador | — | Ejecutar el DDL. |
| **1** | BE | 0 | Flag contable global + `valor = recibido` (datos históricos y código de carga). **Desbloquea la contabilidad.** |
| **2** | BE | 1 | Entidad `Aporte` con devengo y tipo de movimiento; backfill; **nueva prelación por mes incompleto**; carga migrada. |
| **3** | BE | 0 | `Contrato` + `VigenciaContrato`: entidades, servicios, REST, y migración desde `HSTR` 99. |
| **4** | BE | 2, 3 | Generación del archivo lee `VGCN` y cobra **solo el faltante**. **Se entrega apagada.** |
| **5** | BE | 2 | Consultas de cartera a `NVL(devengo)`: padrón, mora del partícipe, estado de cuenta. |
| **F1** | FE | — (contrato de API fijado en §4) | Pantalla de contratos con historial de vigencias **+ pedidos 5, 9 y 4**. |
| **F2** | FE | — | Estado de cuenta de aportes: mes de devengo y "debe $X" **+ pedido 1**. |
| **F3** | FE | — | Interruptor de contabilidad CRD (solo perfil administrador). |

Los pedidos sueltos que se doblaron en esta ola están clasificados en §7. Los que no, en
`PENDIENTES-SEGUNDA-OLA.md`.

**Los dos agentes arrancan a la vez.** El frontend no espera al backend porque **el contrato de API
está fijado en §4 de este documento y en los dos prompts**: no lo negocian entre ellos. Mientras el
backend no publique, el frontend trabaja contra ese contrato con datos simulados.

---

## 4. Contrato de API — congelado, no negociable entre agentes

Application path real: `/SaaBE/rest`. Errores: `500` con JSON `{"mensaje": "..."}` (lo envuelve
`MensajeErrorJsonFilter`).

### 4.1 Contratos y vigencias

```
GET    /rest/cntr/porEntidad/{idEntidad}
       → { idContrato, idEntidad, identificacion, razonSocial, estado,
           montoJubilacion, montoCesantia,            // espejo de la vigencia abierta
           porcentajeJubilacion, porcentajeCesantia,  // pueden venir null
           remuneracionUnificada,                     // puede venir null
           vigencias: [ VigenciaDTO ] }

GET    /rest/vgcn/porContrato/{idContrato}
       → [ VigenciaDTO ]   // historial completo, más reciente primero

POST   /rest/vgcn            body: { idContrato, idTipoAporte, fechaInicio,
                                     modo, monto, porcentaje, observacion, usuario }
       → VigenciaDTO        // cierra la vigencia abierta del mismo (contrato,tipo)
                            // con fechaFin = fechaInicio − 1 día, y abre la nueva

DELETE /rest/vgcn/{idVigencia}   → anula (estado 0). Solo la vigencia abierta.

VigenciaDTO = { idVigencia, idContrato, idTipoAporte, nombreTipoAporte,
                fechaInicio, fechaFin, monto, porcentaje, remuneracion,
                modo, modoTexto, estado, observacion }
```

`modo`: `1` CALCULADO, `2` FIJO (rubro 236). `idTipoAporte`: `9` jubilación, `11` cesantía.

### 4.2 Estado de cuenta de aportes por devengo

```
GET /rest/aprt/estadoCuenta/{idEntidad}?desde=yyyy-MM&hasta=yyyy-MM
    → { idEntidad, identificacion, razonSocial,
        periodos: [ { periodo: "2026-07",            // mes de devengo
                      idTipoAporte, nombreTipoAporte,
                      esperado, aportado, faltante,   // faltante = max(0, esperado − aportado)
                      estado: "COMPLETO"|"PARCIAL"|"SIN APORTE"|"ANTICIPADO",
                      movimientos: [ { idAporte, fechaTransaccion, valor,
                                       tipoMovimiento, tipoMovimientoTexto, glosa } ] } ],
        totalFaltante }
```

`fechaTransaccion` es la **fecha de caja** y se muestra como tal; el agrupador es `periodo`.
Los movimientos con devengo `NULL` se devuelven en un grupo con `periodo: null` y
`estado: "SIN PERIODO"` — ahí caen los históricos y los retiros de saldo.

### 4.3 Flag de contabilidad

```
GET /rest/cnfg/contabilidadCrd            → { activa: true|false }
PUT /rest/cnfg/contabilidadCrd            body: { activa, usuario, motivo }  → { activa }
```

---

## 5. Protocolo de reporte

Cada agente reporta **al terminar cada fase**, sin esperar a las demás, con este formato exacto:

```
FASE <n> — <BACKEND|FRONTEND> — <COMPLETADA | BLOQUEADA | COMPLETADA CON DESVÍOS>
Archivos tocados:      <lista>
Qué quedó funcionando: <2-4 líneas>
Desvíos del plan:      <qué se hizo distinto y por qué; "ninguno" si no hubo>
Hallazgos:             <lo que se encontró y el plan no contemplaba>
Impacto en el otro:    <si algo obliga a cambiar el contrato de API de §4>
Pendiente:             <lo que no se hizo y por qué>
```

**Regla dura: ningún agente cambia el contrato de §4 por su cuenta.** Si necesita cambiarlo, reporta
`BLOQUEADA` y espera. Un cambio unilateral rompe al otro agente en silencio.

**El backend no compila ni despliega** (lo hace el usuario en Eclipse). Reporta el código escrito, no
resultados de compilación.

---

## 6. Riesgos y cómo se controlan

| Riesgo | Control |
|---|---|
| El backfill de devengo de los meses de mora es **reconstrucción por regla**, no un dato recuperado (la glosa de todas las filas dice el mes de la carga y `CXPG` guarda el monto ya multiplicado) | Se entrega como MD revisable con SELECT de control **antes** del UPDATE. El usuario aprueba antes de ejecutar. |
| `valorPagado`/`saldo` pueden tener lectores no auditados (KPIs de `AporteRest`) | Fase 1 arranca con un barrido de lectores y lo reporta antes de tocar nada. |
| Se puede reprocesar una carga ya procesada: `aplicarPagosArchivoPetro` no verifica estado 3 y `validarOrdenProcesamiento` **excluye la propia carga** de la comparación (`:2958-2960`) | Se cierra en Fase 1. Mientras siga abierto, cualquier saneamiento se vuelve a ensuciar. |
| Si `VGCN` pasa a ser la fuente del cobro pero `selectAporteMensualEsperado` del cierre de cartera sigue leyendo `HSTR`, las dos fuentes divergen en silencio | Fase 3 migra también esa consulta. Va en el prompt de backend como tarea explícita. |
| G44 "imposiciones acumuladas" cuenta **filas**, y con anticipos y meses partidos filas ≠ meses | Decisión pendiente del usuario, marcada en el prompt. **No se cambia por iniciativa del agente.** |

---

## 7. Pedidos adicionales — clasificación (2026-08-27)

El usuario entregó diez pedidos sueltos. **Seis se doblan en esta ola** porque comparten tabla,
proceso o pantalla con lo que ya se está tocando; **cuatro van a una segunda ola** en
`PENDIENTES-SEGUNDA-OLA.md`. Mezclar los independientes aquí es lo que hace que un cambio grande
no cierre nunca.

| # | Pedido | Dónde entra | Por qué |
|---|---|---|---|
| 1 | "Error al cargar" cuando el partícipe no tiene aportes ni préstamos | **F2 (FE)** + BE Fase 5 | El FE ya rehace el estado de cuenta de aportes. La causa es de backend: los `Service` lanzan `IncomeException` cuando una búsqueda no devuelve filas y el FE lo pinta como error. |
| 4 | Nombre de la filial en las tarjetas de consulta de generación Petro | **BE Fase 4** + F1 | El agente de backend ya está dentro de la generación; es agregar el nombre al DTO. |
| 5 | El botón de devolución de aportes por transferencia no sirve | **F1 (FE)** + BE Fase 2.4 | El backend modifica `DevolucionAporteServiceImpl` en la misma fase por la regla D5. Arreglar la pantalla aparte sería tocarla dos veces. |
| 7 | Aportes duplicados que no afecten los saldos | **Ya es este trabajo** — ver §7.1 | |
| 9 | No se actualiza la última fecha de actualización del partícipe | **BE Fase 3** + F1 · **sin DDL** | `CRD.ENTD` **ya tiene** fecha y usuario de modificación (verificado en la base el 2026-08-27), pero `Entidad.java` sólo mapea `ENTDIPMD` y `ENTDUSMD`: **la columna de fecha existe y ninguna línea de código la escribe**. No falta el campo, falta el mapeo. El bloque 4b del DDL queda comentado y no se ejecuta. |
| 10 | El crédito sin cuotas en mora debe pasar a VIGENTE tras un cruce o abono | **BE Fase 1.6** | La lógica **ya existe y funciona** en `ProcesoMoraPrestamoServiceImpl:303-308`, pero sólo corre en el proceso diario de las 02:00. Hay que invocarla también al pagar. El agente ya está dentro de esos archivos. |
| 2 | Desgravamen `capital × 1.12 / 1000` en simulación de crédito nuevo | Segunda ola | Simuladores. No toca aportes ni contratos. |
| 3 | Signo `$` en los reportes de simulaciones | Segunda ola | Cosmético y aislado. |
| 6 | Cobro con cuenta individual: el saldo de capital no cuadra | Segunda ola, **re-verificar después** | Misma raíz que el 8. Y su lado de aportes cambia de valor con la Fase 1: hay que volver a medir la diferencia **después** de esa corrección, o se persigue un síntoma que ya no existe. |
| 8 | Simulación de reestructura: no toma el capital de la mínima cuota no pagada | Segunda ola | Misma raíz que el 6: leer el saldo de `DTPR` en vez de reconstruirlo desde `CRD.PGPR` y no filtrar por la mínima cuota no pagada ni cancelada anticipada. Se arreglan juntos. |

### 7.1 Pedido 7 — el `UPDATE valor = valorPagado` **no** lo resuelve entero

Hay **dos** inflaciones distintas del saldo y sólo una la arregla ese update:

| Inflación | Qué es | ¿La corrige el update? |
|---|---|---|
| Fila PARCIAL | `valor = 70`, `valorPagado = 10`: entraron 10 y `SUM(valor)` cuenta 70 | **Sí.** Es exactamente lo que hace. |
| Carga procesada dos veces | Dos juegos completos de filas, **cada uno con su `PGAP` real**. La plata entró **una** vez (una transferencia) y quedó registrada dos | **No.** Cada fila tiene `valor = valorPagado`; el update no las distingue. |

La segunda sigue necesitando la limpieza de `sql/61_ANALISIS_APORTES_DUPLICADOS_PETRO.sql`, que está
**esperando que corras A0, A2 y A6**. Lo que sí hace esta ola es **cerrar la causa** (Fase 1.4: la
fase 3 no podrá volver a procesar una carga en estado 3), para que la limpieza no se vuelva a
ensuciar.

---

## 8. Lo que este plan NO incluye

- La corrección de los aportes duplicados (`ANALISIS-APORTES-DUPLICADOS-PETRO.md`): sigue esperando
  los resultados de las consultas A0/A2/A6.
- Los pagos de préstamo aplicados dos veces en las cargas reprocesadas.
- La planilla de aportes emitida (opción C de la decisión D13 del levantamiento contable).
