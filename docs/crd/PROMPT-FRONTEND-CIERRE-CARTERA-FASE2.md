# PROMPT — Agente FRONTEND · Fase 2: pantalla del cierre mensual de cartera

> **Etiqueta: FRONTEND** (repo `saaFE`). **Ya está desbloqueada**: el backend de Fase 2 está
> implementado, **desplegado y respondiendo**, y su contrato existe. Esta sí es una tarea de
> construcción.

---

## Fuente única del contrato

`docs/crd/API-CIERRE-CARTERA.md` (espejo en este repo). **No inventes rutas ni estructuras:
usa solo lo que esté ahí.** Léelo entero antes de escribir código — en especial §1.1 (las
tres fechas), §1.4 (las desviaciones no son errores) y §2.1 (la respuesta de la
previsualización, que es el corazón de la pantalla).

Contexto de negocio, si necesitas el porqué: `docs/crd/LEVANTAMIENTO-ALIMENTACION-CONTABLE-CREDITOS.md`
§3.2 — los seis sub-procesos del cierre.

Verificado contra el servidor el 2026-08-25:
`POST /rest/cierrecartera/previsualizar` con `{"idEmpresa":1236,"anio":2026,"mes":8,...}`
responde `200` con las claves `idCorrida, idEmpresa, anio, mes, fechaCorte, fechaProceso,
fechaCorteApertura, idEstado, nombreEstado, subProcesos, snapshot, desviaciones,
totalDesviacion, capitalTotal, advertencias` y los seis sub-procesos cuadrando D = H.
**Tarda varios segundos**: la pantalla necesita indicador de progreso y una espera holgada.

## Qué construir

Una pantalla de **cierre mensual de cartera** en el módulo de créditos, siguiendo los
patrones de pantallas existentes (layout, tablas, diálogos, manejo de errores). Antes de
codificar, mira cómo el módulo `cnt` presenta asientos (`asientos-contables-dinamico` y sus
diálogos): si hay algo reutilizable para mostrar líneas contables, reúsalo en vez de
inventar otra tabla.

El flujo que debe soportar es: **elegir período → previsualizar → revisar → ejecutar →
consultar → (si hace falta) reversar.**

1. **Selección**: empresa (del contexto de sesión si el patrón del proyecto lo maneja así),
   año y mes a cerrar. Mostrar las tres fechas que devuelve el backend (`fechaCorte`,
   `fechaProceso`, `fechaCorteApertura`) **con su explicación**, porque son lo que más
   confunde: no las calcules tú, vienen calculadas.
2. **Previsualización**: por cada uno de los seis sub-procesos, un bloque con su nombre, sus
   líneas (cuenta, descripción, debe, haber), los totales y una marca visible de que
   **cuadra D = H**. Un sub-proceso con `omitido: true` se muestra como omitido con su
   `motivoOmision`, no como un bloque vacío ni como error.
3. **Advertencias y desviaciones**: `advertencias` va **arriba y visible** — puede avisar de
   cartera sin bandas parametrizadas, que es dinero que queda fuera de la distribución.
   Las `desviaciones` **no son errores** (§1.4): son la diferencia entre el snapshot y lo
   recalculado, o sea lo que movieron pagos y entregas durante el mes. Preséntalas como
   información, no como fallo.
4. **Ejecutar**: solo desde una previsualización revisada, con confirmación explícita que
   diga qué se va a contabilizar. Al terminar, mostrar los asientos generados.
5. **Consultar**: el estado de la corrida de un período, con sus asientos y totales.
   Distinguir con claridad **lo contabilizado** (consultar) de **el cálculo de hoy**
   (previsualizar) — el contrato advierte que pueden no coincidir y eso es normal.
6. **Reversar**: acción destructiva; pedir confirmación y motivo, y dejar claro que anula
   los asientos de la corrida.

## Reglas técnicas

- **Fechas**: `LocalDate` **sale** como arreglo `[año, mes, día]` y **entra** como string
  `"yyyy-MM-dd"`. Nunca mandes un `Date` crudo de JavaScript ni nada terminado en `Z`.
- **Errores**: `500` con `content-type: application/json` y cuerpo `{"mensaje": "..."}` —
  no texto plano. Reusa el mismo manejo que ya corregiste en `bandas-cartera.service.ts`
  (extraer `mensaje` del JSON, tolerando texto plano). Los mensajes de validación del
  backend son legibles y **están pensados para mostrárselos al usuario tal cual**.
- **Acceso**: por ahora, la misma restricción temporal que la pantalla de bandas — solo
  USUARIO 1, reutilizando `usuario-uno.guard.ts` (no dupliques la lógica). Mismo `TODO
  TEMPORAL`.

## Verificación antes de entregar

No basta con que compile. **Llama a los endpoints de verdad** (`curl` o la propia pantalla
contra `http://localhost:8080/SaaBE`) y comprueba que la forma real coincide con tus
interfaces, campo por campo. Pega en el informe la URL, el estado, el content-type y el
cuerpo real de al menos `previsualizar`, `corridas` y `consultar`.

⚠ **Cuidado con `ejecutar` y `reversar`**: generan y anulan asientos contables reales en la
base de desarrollo. Si necesitas probarlos, hazlo una sola vez, y **anota los ids de la
corrida y de los asientos generados** para poder limpiarlos. Si prefieres no tocarlos,
dilo — probar solo las lecturas es una entrega válida.

## Entrega

Archivos creados y modificados, ruta de la pantalla, endpoints consumidos, capturas HTTP
reales, qué dejaste creado en la base de desarrollo, y toda discrepancia entre el contrato y
la respuesta real (repórtala, no la tapes parcheando el front).
