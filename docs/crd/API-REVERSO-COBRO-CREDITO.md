# API — Reverso del proceso de un cobro de crédito

**Fecha:** 2026-09-07 · **Equipo:** `omen-saa-1` (marcador `omen1`) · **Estado:** contrato cerrado,
**pendiente de coordinación con el equipo A** (§9) y **sin implementar**.

Verificado contra el código el 2026-09-07, no contra documentación previa.

---

## 1. Qué problema resuelve, y por qué NO es `anularCobro`

Hoy, un cobro `PROCESADO` de tipo `PAGO_CUOTA`, `ABONO_CAPITAL` o `PRECANCELACION` **no se puede
deshacer desde el cobro**. `CobroCreditoServiceImpl:453` corta con *«use la anulación de la
operación sobre el préstamo (anularOperacion)»*.

Son dos operaciones distintas y hasta hoy solo existía la primera:

| | **Anular** (`anularCobro`, ya existe) | **Reversar** (este contrato, nuevo) |
|---|---|---|
| Qué pasó | El depósito **nunca llegó** al banco | El depósito **sí llegó**, se aplicó mal |
| Estado final | `ANULADO` (5), terminal | `APROBADO` (2), reprocesable |
| Asiento transitorio | Se anula y no vuelve | Se anula **y se regenera** (§4 paso 5) |
| Detalle del cobro | Queda como está, muerto | Se **desengancha** de sus eventos (§4 paso 6) |

**Decisión del usuario (2026-09-07):** vuelve a `APROBADO`, no a `REGISTRADO`. Crédito puede
reprocesar sin que contabilidad apruebe de nuevo. La huella del reverso queda persistida (§3) para
que el control cruzado no dependa de la memoria de nadie.

---

## 2. ⛔ Dos defectos vivos en producción que este cambio DEBE corregir

Los dos se encontraron levantando este frente. **Ninguno es consecuencia del cambio nuevo: los dos
están pasando hoy.** No se entrega el reverso sin corregirlos, porque el reverso los amplifica.

### 2.1 La redirección que el propio código recomienda produce un descuadre silencioso

`anularCobro` manda al usuario a `POST /rest/prst/anularOperacion` (`PrestamoRest:1222`). Por ese
camino:

1. `anularOperacion` anula los `PagoPrestamo`, recalcula las cuotas y revierte los aportes. ✅
2. Llama a `contabilidadPrestamoService.contabilizarReverso(evento)`.
3. `ContabilidadPrestamoServiceImpl:745` evalúa `eventoAnulado.getNumeroAsiento() == null` y
   **retorna sin hacer nada** — es el CASO B, documentado a propósito en `:734-737`: el asiento es
   `CBCRASN2`, vive en `CobroCredito.asientoDefinitivo`, y **lo reversa `anularCobro`, no este hook**.
4. Pero por este camino `anularCobro` nunca corre.

**Resultado: la cartera queda revertida y los tres asientos del cobro quedan vivos, con el cobro en
`PROCESADO`.** La contabilidad dice que se cobró y la cartera dice que no. Sin error, sin log.

**Corrección:** el mensaje de `:453` deja de redirigir a `anularOperacion` y pasa a nombrar el
reverso (§4). El comentario de `ContabilidadPrestamoServiceImpl:734-737` **no se toca** — su
razonamiento sigue siendo correcto; lo que estaba mal era el consejo del otro lado.

### 2.2 `anularCobro` nunca borra la distribución de bandas

`procesarCobro:651` hace `distribucionBandaService.eliminarDistribucion(COBRO_INDIVIDUAL, idCobro)`
al empezar. `anularCobro` **no la borra jamás** — las únicas dos referencias en todo
`CobroCreditoServiceImpl` son la `:651` y la `:1366` (que registra).

**Resultado: cada `PAGO_MULTIPLE` / `COBRO_MIXTO` / `REGISTRO_APORTE` anulado hasta hoy dejó sus
filas de `CRD.DSBN` vivas**, y la auditoría de bandas —la que cuadra los reportes contra el mayor—
cuenta plata revertida.

**Corrección:** `eliminarDistribucion` va **en los dos** caminos, el reverso y `anularCobro`.

> ⚠️ Esto deja **datos históricos sucios** en `CRD.DSBN`: filas de cobros ya anulados. Limpiarlas
> es un `.sql` aparte, con su propio diagnóstico previo — **no** se mete en este cambio.

---

## 3. Persistencia de la huella — DDL previo, obligatorio

`CRD.CBCR` tiene columnas de registro, aprobación, rechazo, proceso y anulación, **pero ninguna de
reverso**. Reusar las de anulación las pisaría con una anulación real posterior.

`docs/logica-negocio/crd/sql/206_DDL_REVERSO_COBRO.sql` agrega cuatro columnas:

| Columna | Tipo | Qué guarda |
|---|---|---|
| `CBCRUSRV` | `VARCHAR2(50)` | Usuario del último reverso |
| `CBCRFCRV` | `TIMESTAMP` | Fecha/hora del último reverso |
| `CBCRMTRV` | `VARCHAR2(2000)` | Motivo del último reverso |
| `CBCRNMRV` | `NUMBER` | Cuántas veces se reversó (arranca en 0, `+1` por reverso) |

> ⛔ **El DDL va ANTES del WAR.** Hibernate incluye toda columna `@Column` en el `SELECT` que
> genera: si el WAR sube con las cuatro mapeadas y la tabla no las tiene, **toda lectura de
> `CRD.CBCR` revienta con `ORA-00904`** — la pantalla de cobros entera, no solo el reverso. Es
> exactamente el incidente del 2026-08-31 con `CBCRASRP`.

`CBCRNMRV` no es adorno: un cobro que se reversó cuatro veces es una señal operativa, y sin el
contador nadie la ve. Precedente: en jubilados nadie podía contestar *«¿por qué este no cobró?»*
tres meses después porque el motivo solo vivía en la respuesta HTTP.

---

## 4. El endpoint

```
POST /rest/cbcr/{id}/reversar
Body: SolicitudAprobacionCobro { "usuario": "...", "motivo": "..." }   (DTO YA EXISTENTE)
```

**Precondiciones**

| Condición | Si no se cumple |
|---|---|
| El cobro existe | 500 con `El cobro {id} no existe` |
| `estado == PROCESADO (3)` | 500 con `El cobro {id} está en estado {texto}; solo se puede reversar un cobro PROCESADO` |
| `motivo` no vacío | 500 con `El motivo del reverso es obligatorio` |
| `tipoOperacion != ACUERDO_CONDONACION` | 500 con el mensaje de §8 |

**Pasos, en este orden, TODOS en la misma transacción** (`@Stateless` → `REQUIRED`;
`IncomeException` es `@ApplicationException(rollback = true)`, así que cualquier fallo revierte todo
y no queda nada a medias):

1. **Validar** estado, motivo y tipo.
2. **Reversar las líneas del detalle.** Es el MISMO bucle que `anularCobro:468-514` ya tiene —
   **extraerlo a un método privado compartido** `reversarLineasProcesadas(cobro, usuario, motivoLinea)`
   y llamarlo desde los dos. No duplicar el bucle.
   - Línea con `pagoAporte` → `aporteService.reversarAporte(idAporte, usuario, motivoLinea)`
   - Línea con `eventoPrestamo` → `procesoPagoPrestamoService.anularOperacion(...)`, con
     `idEmpresa = derivarEmpresaCobro(cobro)` (contrato `API-EMPRESA-CONTABLE-CRD.md §2`: **nunca**
     la que venga del cliente)
   - **Conservar los mensajes de error que nombran línea, préstamo y evento.** Todo-o-nada está
     bien, pero un cobro de 3 líneas sin ese contexto deja al usuario sin saber cuál lo bloqueó.
     El caso típico es `ERR_EVENTO_POSTERIOR_VIGENTE`: el reverso es **LIFO** y ESE préstamo
     recibió otra operación después.
3. **Borrar la distribución de bandas:**
   `distribucionBandaService.eliminarDistribucion(DsbnOrigen.COBRO_INDIVIDUAL, idCobro)`.
4. **Anular los asientos del proceso**, en orden inverso al de generación (3 → 2), y **dejar las dos
   referencias en `null`**:
   - `cobro.getAsientoDefinitivo()` → `asientoService.anulaAsiento(...)` → `setAsientoDefinitivo(null)`
   - `cobro.getAsientoReparto()` → `asientoService.anulaAsiento(...)` → `setAsientoReparto(null)`
5. **Anular y REGENERAR el transitorio** (decisión del usuario 2026-09-07). Patrón ya probado en
   `editarYReenviarCobro:373-380` y `:416-420` — **copiarlo, no inventar otro**:

```java
if (cobro.getAsientoTransitorio() != null) {
    asientoService.anulaAsiento(cobro.getAsientoTransitorio().getCodigo(), usuario,
        "Reverso del cobro " + idCobro + ": " + motivo + ". El asiento se rehace.");
    cobro.setAsientoTransitorio(null);
}
if (configuracionContabilidadService.contabilidadActiva()) {
    cobro.setAsientoTransitorio(generarAsientoTransitorio(cobro));
}
```

   ⚠️ **La guarda de `contabilidadActiva()` no es opcional:** si la contabilidad de CRD está
   apagada, `registrarCobro:258` no genera transitorio y el cobro vive sin él. Regenerar sin la
   guarda reventaría en ese escenario.

   ⚠️ **El asiento nuevo lleva la fecha de HOY, no la del depósito.** Es la consecuencia aceptada de
   la decisión: el DEBE al banco se mueve de fecha, y si el reverso cae en otro mes, cambia de
   período contable. **Bloquear el reverso si el período del asiento original está cerrado** —
   `recuperaEstadoByMesAnioEmpresa` ya es lo que consulta `saveSingle` del asiento.
6. **Desenganchar el detalle.** ⭐ **Paso que NO existe en `anularCobro` y acá es obligatorio**,
   porque allá el cobro muere y acá vuelve a vivir: por cada línea,
   `linea.setEventoPrestamo(null)` / `linea.setPagoAporte(null)` y guardar. Sin esto, al reprocesar,
   `enlazarEvento:948` escribe encima y la línea queda apuntando a un evento **anulado**; y un
   `anularCobro` posterior intentaría re-anular ese evento muerto.
7. **Sellar la huella y devolver el cobro a la bandeja:**

```java
cobro.setEstado(Long.valueOf(CrdEstadoCobro.APROBADO));   // 2
cobro.setUsuarioReverso(usuario);
cobro.setFechaReverso(LocalDateTime.now());
cobro.setMotivoReverso(motivo.trim());
cobro.setNumeroReversos(nvl(cobro.getNumeroReversos()) + 1);
```

   **`usuarioAprobacion` y `fechaAprobacion` NO se tocan:** la aprobación original sigue siendo
   válida y es lo que habilita reprocesar.

**Respuesta 200** — el `CobroCredito` actualizado, igual que `anular`:

```json
{
  "codigo": 54,
  "estado": 2,
  "tipoOperacion": "PAGO_CUOTA",
  "usuarioReverso": "jperez",
  "fechaReverso": "2026-09-07T15:22:10",
  "motivoReverso": "Se aplico al prestamo equivocado",
  "numeroReversos": 1,
  "asientoTransitorio": { "codigo": 9310, "numeroAlterno": "CRE-2026-09-0012" },
  "asientoReparto": null,
  "asientoDefinitivo": null
}
```

**Errores** — estilo de la casa: `500` con `"Error al reversar el cobro {id}: " + e.getMessage()`.
El mensaje nombra siempre la línea/préstamo/evento que bloqueó.

---

## 5. Qué NO hace este endpoint

- **No toca `anularOperacion`.** Ese método no se modifica: sirve, y el reverso lo usa tal cual.
- **No reprocesa.** Devolver a `APROBADO` y reprocesar son dos actos, con dos clics y dos huellas.
- **No limpia el histórico sucio de `CRD.DSBN`** (§2.2). Eso es un `.sql` aparte.
- **No cambia el circuito de aprobación.** `aprobarCobro` / `rechazarCobro` no se tocan.

---

## 6. Frontend

**Pantalla:** `crd/forms/cobros/consulta-cobros/` — es donde se ven los cobros `PROCESADOS`.
Hoy no tiene ninguna acción; ahí va el botón.

- Botón **«Reversar proceso»**, visible **solo** con `estado === 3 (PROCESADO)`.
- Diálogo de motivo: reusar `MotivoDialogComponent`, el mismo que usa
  `proceso-credito.component.ts:175`. **Texto de advertencia distinto al de anular** — anular dice
  *«queda anulado en forma terminal»*, y esto **no** es terminal:
  > «Se revierten los pagos aplicados, la distribución de bandas y los asientos contables. El cobro
  > vuelve a la bandeja en estado APROBADO para reprocesarse. El depósito NO se anula.»
- Servicio: agregar `reversar(id, solicitud)` en `crd/service/cobro-credito.service.ts`, calcado de
  `anular()` (`:117`), contra `${ServiciosCrd.RS_CBCR}/${id}/reversar`.
- Mostrar en la grilla `numeroReversos` cuando sea `> 0`, y el motivo del último reverso en el
  detalle. Un cobro reversado cuatro veces tiene que verse.
- ⛔ **`handleError` (§8.1 del registro de reservas):** un fallo de parseo llega como emisión
  exitosa con `null`. Distinguir `null` de respuesta válida en el punto de consumo — **no** tocar
  `handleError`. Precedente: `deudaConsultaFallida` en el diálogo de devolución de aportes.
- **`proceso-credito` no se toca.** Su botón «Anular» sigue siendo para aprobados y rechazados.

---

## 7. Fechas y serialización

`CBCRFCRV` es `TIMESTAMP` → `LocalDateTime`. Jackson **descarta el offset en vez de convertirlo**:
un `Date` de JavaScript de las 08:30 en Ecuador viaja como `13:30Z` y se graba `13:30`, cinco horas
adelantado y sin ningún error. **El cliente no manda esta fecha** —la pone el servidor— pero al
leerla, tratarla como ISO local sin zona. Nunca un `Date` crudo ni nada terminado en `Z`.

---

## 8. ⛔ `ACUERDO_CONDONACION` queda FUERA, a propósito

Son **siete** tipos de operación, no seis. El séptimo es `ACUERDO_CONDONACION`, y no entra:

`anularCobro:551-558` tiene una cascada a `acuerdoCondonacionService.anularAcuerdoPorCobro(...)`,
cuyo javadoc dice que *«anulado» en el ciclo de vida del acuerdo significa exactamente esto: se
anuló su CBCR antes de procesarlo*. **Un reverso necesitaría la operación inversa —reabrir un
acuerdo anulado— y esa no existe.** Inventarla acá, de paso, sobre un frente de condonaciones que
este equipo no levantó, es exactamente cómo se rompe algo en silencio.

El endpoint **rechaza explícitamente** ese tipo:

> `El cobro {id} es de tipo ACUERDO_CONDONACION: su reverso exige reabrir el acuerdo de condonación asociado, que hoy no tiene operación inversa. Anule el acuerdo y regístrelo de nuevo.`

Queda anotado como pendiente con dueño a definir.

---

## 9. ⛔ Coordinación — el archivo tiene dueño

`§4 del REGISTRO-RESERVAS-EQUIPOS.md` declara **dueño exclusivo del equipo A**:

- BE: `CobroCreditoServiceImpl` es el archivo central de este cambio, y sus vecinos
  `ProcesoPagoPrestamoServiceImpl` y `AporteServiceImpl` —también del equipo A— este cambio los
  **consume sin modificar**.
- FE: `forms/cobros-personales/*` y `dialog/pagos/*` son del equipo A.
  **`forms/cobros/consulta-cobros/` no está listado** — es donde va el botón, y por eso el FE se
  puede tocar con menos fricción.

**Decisión del usuario 2026-09-07: coordinar con el equipo A ANTES de despachar.** Este documento
existe para que esa conversación se tenga sobre un diseño concreto y no sobre una intención.

---

## 10. Verificación de aceptación

Un `.sql` de control, después del primer reverso real:

1. `CRD.PGPR` del evento → todos con `PGPRANUL = 1`.
2. `CRD.DTPR` de las cuotas afectadas → estado y saldos recalculados como antes del pago.
3. `CRD.DSBN` con `origen = COBRO_INDIVIDUAL` e `idOrigen = {cobro}` → **0 filas**.
4. `CNT.ASNT` de `CBCRASN2` y el `CBCRASRP` viejo → anulados, con motivo.
5. `CRD.CBCR` → `CBCRESTD = 2`, `CBCRASN2` y `CBCRASRP` en `NULL`, `CBCRASN1` apuntando a un asiento
   **nuevo y vigente**, `CBCRNMRV = 1`.
6. `CRD.DCBC` del cobro → `EVPRCDGO` y su FK de aporte en `NULL`.
7. Reprocesar el mismo cobro → pasa, y genera asientos nuevos.
