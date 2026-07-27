# Propuesta: Partidas en Tránsito y Cheques en Circulación (para revisión de equipo)

**Fecha:** Julio 27, 2026
**Estado:** Solo propuesta — **no implementado**, pendiente de autorización explícita.
**Contexto:** Ideas discutidas para extender el módulo de Conciliación Contable
(ver `docs/RESUMEN-MAESTRO-EXTRACTOS-BANCARIOS-2026-07-27.md` para el diseño base
ya implementado) para cubrir dos casos clásicos de conciliación bancaria que el
sistema actual no puede resolver todavía.

---

## 1. El problema: dos tipos distintos de "outlier"

El sistema actual (`ConciliacionContableMatchServiceImpl.conciliarGrupo`) ya
soporta matches N:M con tolerancia de monto y una tolerancia de días
configurable (`ASP_TOLERANCIA_DIAS_CONCILIACION_CONTABLE`, actualmente 178
días). El problema no es la lógica de match — es que **las consultas de
pendientes están encasilladas a un solo período en cada lado**:

- `pendientesExtracto(idCuenta, idPeriodo)` — filtra por el período que el
  usuario eligió explícitamente al cargar el extracto (`PRDOCDGO`).
- `pendientesAsiento(idCuenta, idPeriodo)` — filtra por el rango de fechas
  calendario del período (`periodo.primerDia`/`ultimoDia`).

Esto genera dos escenarios distintos que requieren soluciones distintas:

### Caso A — Depósito en tránsito
Un depósito se registra en contabilidad a fin de junio, pero el banco no lo
acredita hasta julio. La línea de asiento solo aparece en la pantalla de junio;
la línea de extracto solo aparece en la de julio. **Nunca pueden seleccionarse
juntas** en la vista de dos paneles, aunque la tolerancia de días ya las
aceptaría si estuvieran visibles a la vez. Brecha típica: días o pocas semanas.

### Caso B — Cheque en circulación
Se emite un cheque a un trabajador que no lo cobra hasta 6 meses después. La
línea de asiento existe desde el día 1; **no existe ninguna línea de extracto
del otro lado hasta que el cheque se cobra**. No es un problema de visibilidad
— es que no hay nada que emparejar todavía, y la brecha (6+ meses) ya excede la
tolerancia de días configurada. Mientras tanto, la cuenta no puede verificarse
para ningún período intermedio, lo que bloquea el Cierre de Mes de esos
períodos indefinidamente.

---

## 2. Propuesta A — Toggle de partidas en tránsito (Caso A)

**Idea:** en la vista de detalle de una cuenta (dos paneles: extracto vs.
asiento), agregar un interruptor opcional **"Incluir partidas en tránsito (mes
anterior/siguiente)"**. Al activarlo, se traen adicionalmente los pendientes de
extracto/asiento del período adyacente para la misma cuenta, marcados con una
etiqueta visual ("Mes anterior" / "Mes siguiente") para que el usuario entienda
por qué aparece una fila inesperada.

**Por qué es un cambio acotado, no arquitectónico:**
- `conciliarGrupo` no cambia — ya valida monto + tolerancia de días tal cual.
- `resumenPorPeriodo` recalcula pendientes en vivo desde el período real de
  cada línea, no desde el período de la cabecera del grupo — así que una vez
  conciliada, ambos períodos (el de origen y el de destino) bajan su contador
  correctamente sin cambios adicionales.
- `sugerirCoincidencias` podría opcionalmente incluir el mismo pool
  cross-período cuando el toggle está activo, reutilizando el mismo matcher de
  subconjuntos (`MAX_CANDIDATOS_SUBCONJUNTO = 8`) sin cambios de lógica.
- Es opt-in: la vista de un solo período (el caso común) no cambia en nada por
  defecto.

---

## 3. Propuesta B — Partidas Justificadas (Caso B)

**Idea:** una anotación de una sola vía (no un match) que permite documentar y
excusar temporalmente una partida pendiente que se sabe que tardará en
resolverse, sin necesidad de emparejarla con nada todavía.

1. **Tabla nueva, solo en TSR** (mismo patrón que las tablas de enlace
   `GrupoConciliacionExtracto`/`GrupoConciliacionAsiento` ya existentes): una
   entidad `PartidaJustificada` que referencia por id a un
   `DetalleAsiento`/`DetalleExtractoBancario` (sin modificarlos — respeta el
   límite ya establecido de que TSR nunca toca tablas de CNT), con `motivo`
   (texto libre, ej. "Cheque #1234 girado a Juan Pérez, en circulación"),
   `usuario`, `fechaJustificacion`, `estado` (ACTIVA/RESUELTA).

2. **UI:** botón "Justificar" en cada fila pendiente (extracto o asiento), pide
   un motivo corto, y la marca con una insignia ámbar distinta
   ("Justificada — pendiente de cobro").

3. **El criterio de verificación cambia** de "0 pendientes" a "0 pendientes sin
   justificar" — `verificarCuenta` (y por lo tanto `cerrarMes`, que no cambia
   de código porque solo revisa `estadoRevision === VERIFICADO`) puede tener
   éxito con un cheque pendiente ya documentado.

4. **Cuando el cheque finalmente se cobra**, la línea de asiento justificada
   sigue en el período donde se originó. Combinando con la Propuesta A, el
   usuario la trae al período donde ahora aparece la línea de extracto, y
   `conciliarGrupo` necesita una sola excepción: si alguno de los dos lados ya
   tiene una `PartidaJustificada` ACTIVA, se omite la validación de tolerancia
   de días para ese match (la de monto se mantiene) — la brecha de varios
   meses es esperada en este caso, no un error que la tolerancia deba
   detectar. Al confirmarse el match, la `PartidaJustificada` pasa a RESUELTA
   automáticamente, dejando registro de auditoría ("justificada el X,
   conciliada el Y").

5. **Beneficio adicional:** una consulta de todas las `PartidaJustificada` con
   `estado=ACTIVA` es exactamente el reporte de "cheques en circulación" que
   normalmente piden los auditores al cierre de un período — se obtendría
   gratis en vez de construirse aparte.

**Preguntas de política, no técnicas, a decidir por el equipo:**
- ¿Requiere una segunda aprobación (doble firma) antes de aceptar una
  justificación, o basta con el usuario que la registra?
- ¿Debe haber un límite de antigüedad automático (ej. marcar para revisión
  cualquier partida justificada por más de 1 año, candidata a anular el
  cheque)?

---

## 4. Resumen comparativo

| | Propuesta A (en tránsito) | Propuesta B (cheques en circulación) |
|---|---|---|
| Brecha típica | Días / pocas semanas | Meses (puede exceder la tolerancia configurada) |
| Mecanismo | Ampliar qué se puede *ver* y seleccionar juntos | Excusar temporalmente la exigencia de match |
| Cambio de datos | Ninguno (solo consultas nuevas) | Tabla nueva en TSR (`PartidaJustificada`) |
| Afecta `conciliarGrupo` | No | Sí — una excepción puntual a la tolerancia de días |
| Afecta `verificarCuenta` | No | Sí — cambia el criterio de "0 pendientes" |

---

## 5. Estado

Ninguna de las dos propuestas está implementada. Este documento es solo para
revisión del equipo antes de decidir si se autoriza el desarrollo de una,
ambas, o ninguna.
