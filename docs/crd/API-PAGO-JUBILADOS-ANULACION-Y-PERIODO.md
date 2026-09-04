# API — Anulación de pago de pensión y consulta por período

**Base:** `/SaaBE/rest/pgpc` · **Fecha:** 2026-09-03 · **Escrito por:** `lap-saa-1-arb`
**Implementa:** equipo `eqB` (`omen-saa-1`) — el `saaBE` de este frente es suyo por el acuerdo del
2026-09-03. **Consume:** `lap-saa-1-fe`.

> **Estos dos endpoints NO existen todavía.** El contrato se congela ahora para que el frontend
> construya la pantalla completa sin esperar. Diseño y justificación:
> `DISENO-PANTALLA-PAGO-JUBILADOS.md` §6bis.

**Complementa** a `API-PAGO-PENSION-COMPLEMENTARIA.md` (de `eqB`), que documenta los tres endpoints
que sí existen: `generarPagosDelMes`, `sincronizarPagos` y `porEntidad/{id}`.

---

## 1. `GET /rest/pgpc/porPeriodo?anio={a}&mes={m}`

Los pagos de pensión de un período, para la pestaña «Seguimiento» y para que el prevuelo sepa quién
ya está pagado.

**Respuesta 200:** un **arreglo pelado** de `PagoPensionComplementaria`, sin sobre `{exito,...}` —
mismo criterio que `porEntidad/{id}`, que ya devuelve la lista cruda. No se inventa una forma nueva.

Cada fila incorpora, además de las columnas de la entidad:

| Campo | Tipo | Qué |
|---|---|---|
| `totalCruzado` | number | `SUM(PGCEVLOR)` de sus filas en `CRD.PGCE`. **0** si no hubo cruce |
| `cruces` | array | Una entrada por préstamo cruzado: `{idPrestamo, idEvento, valor, estado}` |
| `anulable` | boolean | Si hoy se puede anular — ver §2 |
| `motivoNoAnulable` | string \| null | Por qué no, en texto mostrable. `null` si `anulable` es `true` |

⚠️ **`anulable` lo calcula el backend, no el frontend.** Depende de la regla LIFO del motor de pagos,
que el frontend no puede evaluar sin replicar lógica del backend. Si el frontend lo dedujera, en el
momento en que la regla cambie la pantalla ofrecería anular algo que el backend va a rechazar.

### ⛔ Requisito de implementación: `anulable` se calcula AGREGADO, no fila por fila

**Señalado por el árbitro de `eqB` el 2026-09-03, y queda como parte del contrato porque quien
implemente no tiene por qué descubrirlo.**

La forma natural de resolver `anulable` es, por cada pago, buscar los eventos posteriores vigentes de
cada uno de sus préstamos. **Eso es un N+1 sobre `CRD.EVPR`**: un período con cientos de jubilados,
varios préstamos cada uno, multiplica las consultas. El módulo ya tiene un caso igual pendiente
(`haberDesdePagos`) y se sabe cómo termina.

**Se resuelve con una consulta agregada sobre el período completo** —el mismo patrón con el que se
resolvió el resumen de bandas: un `GROUP BY` aparte sobre todo el conjunto, no una iteración por
página. Traer de una sola vez, para todos los préstamos involucrados en el período, cuál es el evento
vigente más reciente; después decidir `anulable` en memoria comparando contra el evento de cada
cruce.

⛔ **Fechas: llegan como ARREGLO, no como string.** `fecha`, `fechaPago`, `fechaRegistro`,
`fechaAnulacion` son `LocalDate`/`LocalDateTime` y **Jackson los emite como `[2026,8,1]`**, no como
`"2026-08-01"` (`CLAUDE.md` § Serialización). Formatearlos antes de mostrarlos **y antes de
exportarlos**: el 2026-09-03 se encontró un CSV de otro tablero que volcaba `2026,7,31` en una celda
por saltarse ese paso.

**Vacío:** arreglo vacío `[]`, **no** 404. Un período sin pagos es una respuesta válida.

---

## 2. `POST /rest/pgpc/anular/{id}`

Anula un pago de pensión, **incluso si tuvo cruce contra préstamos** (decisión del usuario,
2026-09-03).

**Body:**

```json
{ "usuario": "JPEREZ", "motivo": "Se cargó el valor equivocado en la parametrización" }
```

Los dos son obligatorios. `motivo` va a `PGPCMTAN` (`VARCHAR2(500)`).

**Respuesta 200:**

```json
{
  "exito": true,
  "mensaje": "Pago 987 anulado. Se reversaron 2 eventos de préstamo por $180.00 y se devolvieron $300.00 al aporte de pensión complementaria.",
  "resultado": {
    "idPago": 987,
    "estado": 5,
    "eventosReversados": [
      { "idPrestamo": 7991, "idEvento": 45012, "valor": 120.00 },
      { "idPrestamo": 8104, "idEvento": 45013, "valor": 60.00 }
    ],
    "valorDevueltoAlAporte": 300.00,
    "ordenPagoAnulada": 4471,
    "idAsientoReversa": 88231
  }
}
```

`ordenPagoAnulada` es `null` cuando el pago estaba en `REGISTRADA` (nunca tuvo orden) o cuando el
cruce se llevó todo el mes y por eso no se generó ninguna.

### Qué hace por dentro, y en este orden

Está detallado en el §6bis del diseño. En corto: anula la orden en CXP si la hay → reversa los
eventos de préstamo del más nuevo al más viejo → contra-movimiento del aporte **sólo por el
remanente** (el tramo cruzado lo devuelve el reverso del evento; duplicarlo subiría el saldo dos
veces) → asiento de reversa del devengo → `estado = ANULADA`.

### Errores

| Código | HTTP | Cuándo |
|---|---|---|
| `PAGO_NO_ENCONTRADO` | 404 | No existe el pago |
| `ESTADO_NO_ANULABLE` | 422 | El pago no está en `REGISTRADA` ni en `EN_PAGO` |
| `OPERACION_POSTERIOR_VIGENTE` | 409 | **La regla LIFO.** Hay una operación posterior vigente sobre uno de los préstamos cruzados |
| `ARCHIVO_BANCARIO_GENERADO` | 409 | La orden ya salió al banco: hay que esperar su respuesta |
| `ERROR_ORDEN_PAGO` | 422 | CXP no pudo anular la orden |

⚠️ **Los errores llegan como `{"mensaje": "..."}`**, no como texto plano: los envuelve el `@Provider`
global `MensajeErrorJsonFilter`. Documentos viejos dicen lo contrario.

### ⛔ El 409 de LIFO es el caso importante para la pantalla

No es un fallo del sistema: es la protección que impide corromper la cartera reversando un pago viejo
y dejando vivos los posteriores. **En la práctica significa que se anula el último mes, no uno
cualquiera del pasado.**

El `mensaje` del 409 **debe nombrar el evento que estorba** — el motor ya lo hace
(`ProcesoPagoPrestamoServiceImpl:1242`). La pantalla lo muestra tal cual, explicando que hay que
anular primero la operación posterior. **Nunca como «error inesperado».**

---

## 3. Lo que este contrato NO cubre

- **Reversar el devengo cuando CXP RECHAZA un pago.** Hoy `sincronizarPago` reversa el aporte y deja
  el asiento de devengo vivo, y `2.3.01.10.03` acumula un pasivo por un pago que no ocurrió. Es un
  defecto preexistente, reportado a `eqB` el 2026-09-03, y se arregla del lado del backend — no tiene
  contrato de API.
- **Reconciliar** (`sincronizarPagos`) ya existe y no cambia de forma.
- **El timer que debería disparar la reconciliación no existe.** El JavaDoc de
  `PagoPensionComplementariaRest:96` dice que «normalmente lo dispara un timer»; verificado el
  2026-09-03: no hay tal timer, y los `@Schedule` de los dos timers de `crd` están comentados. Sin
  reconciliación, ningún pago pasa nunca de `EN_PAGO` a `PAGADA`. Por eso la pantalla expone el botón.
