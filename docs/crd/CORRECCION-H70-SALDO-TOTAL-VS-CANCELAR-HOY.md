# H70 — «Saldo total del préstamo» vs. «cuánto cuesta cancelarlo hoy»

**Equipo:** `omen-saa-1` (CRD · EQUIPO B) · **Árbitro:** `omen-saa-1-arb` · **Fecha:** 2026-09-21
**Origen:** novedad del usuario funcional `LCALDERON`
(`NOVEDADES_BOTONES_SISTEMA_SAA.xlsx`, tres capturas del préstamo **#70828**).
**Decisión del usuario (2026-09-21):** *«realiza la corrección completa y de fondo»*.

---

## 1. El defecto, en una tabla

| Pantalla | Rótulo | Valor |
|---|---|---|
| Pagar cuotas · Pagar con aportes | «Saldo total del préstamo» | **$16.246,61** |
| Precancelar crédito | «Total a cobrar» al 2026-09-21 | **$13.183,86** |
| Precancelar crédito | «Intereses condonados» | **$3.062,73** |

$2.713,22 (exigible, 12 cuotas) + $10.470,64 (capital futuro, 63 cuotas) = $13.183,86.
$13.183,86 + $3.062,73 = $16.246,59 ≈ $16.246,61.

⇒ **La diferencia es, exactamente, el interés futuro que la precancelación condona.**

`saldoTotal` viene de `MotorPagoPrestamoServiceImpl.calcularTotalPendientePrestamo:262`, que suma
`getTotalPendiente()` de **todas** las cuotas pendientes — vencidas **y futuras, con su interés**.
Es la magnitud correcta para *«cuánto paga si sigue cuota a cuota hasta el final»* y la equivocada
para *«cuánto cuesta cancelarlo hoy»*. **No es un error de cálculo**: es un número bien calculado,
mal rotulado y ofrecido en la pantalla equivocada.

**Lo peor no es lo que muestra, es lo que ofrece:** `pago-prestamo-dialog.component.ts:142` arma la
sugerencia **«Saldo total · $16.246,61»** junto a «1 cuota / 2 cuotas / 3 cuotas». Quien la aprieta
para cancelar el crédito registra un cobro de **$3.062,75 de más**, y el motor lo aplica prepagando
cuotas futuras con su interés completo.

---

## 2. ⭐ La corrección es SÓLO frontend: el backend ya tiene todo

**No hace falta tocar ni una línea de Java.** Verificado el 2026-09-21:

| Pieza | Dónde | Estado |
|---|---|---|
| `GET /rest/prst/simularPrecancelacion/{idPrestamo}?fecha=yyyy-MM-dd` | `PrestamoRest:1097-1144` | Existe. **No escribe nada** |
| `SimulacionPrecancelacion` — trae `valorExigible`, `capitalFuturo`, `valorTotalPrecancelacion`, `interesCondonado`, `cuotasAAnular` | `ejb/crd/service/dto/SimulacionPrecancelacion.java` | Todos los números que hacen falta |
| Servicio y modelo en Angular | `operaciones-pago-prestamo.service.ts:183` · `model/pagos/operaciones-pago.ts:236` | **Ya existen y ya se consumen** desde `precancelacion-dialog.component.ts:158` |

El diálogo de pago sólo tiene que llamar a un servicio que el frontend **ya tiene escrito y
probado** en otra pantalla.

---

## 3. Qué se cambia — `pago-prestamo-dialog`

**Archivos:** `src/app/modules/crd/dialog/pagos/pago-prestamo-dialog.component.ts` y `.html`.
Afecta a los dos diálogos que lo usan: **Pagar cuotas** y **Pagar con aportes**.
**Precancelación NO se toca**: ahí el número siempre estuvo bien.

### 3.1 Dos magnitudes, con rótulos que no se confundan

En lugar del único «Saldo total del préstamo»:

| Rótulo | Valor | Nota al pie |
|---|---|---|
| **Total pendiente** | `data.saldoTotal` (lo que ya llega) | «si paga cuota a cuota hasta el final» |
| **Cancelarlo hoy cuesta** | `valorTotalPrecancelacion` de la simulación | «$3.062,73 menos: no se cobran los intereses futuros» — el ahorro es `interesCondonado`, formateado |

El segundo número se pide con `simularPrecancelacion(idPrestamo, fechaPago)` **al abrir el
diálogo**, y se vuelve a pedir si el operador cambia la fecha del pago (la simulación depende de la
fecha de corte).

### 3.2 ⛔ Se retira el atajo «Saldo total»

`sugerencias():142` deja de agregar la opción «Saldo total». Quedan «1 cuota», «2 cuotas» y
«3 cuotas», que es lo que esta pantalla sí sabe cobrar. **Este es el punto que hoy le cobra de más a
un socio: no puede quedar.**

### 3.3 Cuando lo que el operador quiere es cancelar

Junto a «Cancelarlo hoy cuesta» va un botón **«Cancelar el crédito»** que cierra este diálogo y
abre el de precancelación, que es el camino que condona bien.

Implementación: el diálogo cierra devolviendo una salida nueva (p. ej. `{ accion: 'precancelar' }`)
y el componente padre (`cobros-personales`) la reconoce y abre `precancelacion-dialog`.
⚠️ **Si eso obliga a cambiar el contrato de salida de un modo que rompa a otro llamador del
diálogo: reportarlo y parar**, dejando el dato y el aviso en texto («para cancelarlo hoy use
Precancelar crédito»). El dato y el retiro del atajo son lo obligatorio; la navegación es la
comodidad.

### 3.4 Si la simulación falla, el diálogo sigue sirviendo

Un error del `GET` **no puede romper el pago de cuotas**, que es la función principal de la
pantalla. En ese caso: se muestra sólo «Total pendiente», no se muestra el bloque de cancelación, y
**tampoco reaparece el atajo retirado**. Nada de mensajes de error ruidosos; esto es un dato
complementario.

⛔ **No inventar el número en el cliente.** Si la simulación no responde, no se estima
`saldoTotal − interés` a mano: el interés condonado depende de la fecha de corte y del estado de
cada cuota, y un número inventado acá sería exactamente el defecto que este documento corrige.

---

## 4. Lo que NO se toca

- ⛔ **`calcularTotalPendientePrestamo`.** Tiene tres llamadores más —
  `ProcesoPagoPrestamoServiceImpl:187`, `:597` y `DevolucionAporteRest:529` — que dependen de la
  semántica actual (todas las cuotas pendientes). El defecto está en qué se muestra y qué se
  ofrece, no en el cálculo.
- ⛔ **`precancelacion-dialog`**, en ninguna de sus partes.
- ⛔ Nada de `cxp`, `cxc`, `pagos`, `tsr`, `rhh`, `sri`.

---

## 5. Por qué costaba verlo, y por qué es la tercera vez

El número **no estaba mal**. Cuadra contra la tabla de amortización, cuadra contra la grilla de
préstamos, y cualquiera que lo verifique contra `PRST` lo encuentra correcto. Lo que estaba mal era
**para qué se lo estaba usando**: la pregunta del operador era «¿con cuánto de sus aportes cancelo
este crédito?» y la pantalla contestaba otra pregunta.

⭐ **El propio código ya lo advertía.** `PagoPensionComplementariaServiceImpl:2615`:

> *«⛔ NO usa `calcularTotalPendientePrestamo`: ese método suma TODAS las cuotas pendientes,
> exigibles o no — exactamente lo que `buscarSiguienteCuotaConSaldo` prepagaría si se le entregara
> de más.»*

Y en ese mismo JavaDoc consta el **precedente del 2026-09-04**: el usuario ya había detectado
descuento de más comparando contra cobros personales. **Es la tercera vez que esta distinción
muerde** — dos veces en el backend, y ahora en la pantalla. La lección que queda: *un aviso escrito
en el JavaDoc del módulo que lo sufrió no protege a la pantalla que comete el mismo error tres
archivos más allá.*
