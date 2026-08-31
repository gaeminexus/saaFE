# Registro de reservas — códigos y nombres compartidos

**Creado:** 2026-08-30 · **Lo leen y lo escriben TODOS los árbitros, de todos los equipos.**

> **Por qué existe.** Los catálogos (`SCP.PRBR`, `SCP.PDTR`) y los nombres de tabla de 4 letras son
> **recursos globales**. Con varios equipos trabajando a la vez, dos árbitros pueden asignar el
> mismo código sin enterarse — y no se nota hasta que el `INSERT` falla en producción.
>
> **Ya pasó dos veces:**
> - Se dio por libre el `PDTRCDGO` 1151 y estaba tomado por las partidas en tránsito del otro equipo.
> - Se propuso la tabla `CBRO` para cobros de crédito y ya existía `TSR.CBRO`. Terminó siendo `CBCR`.

---

## 1. Las tres reglas

1. **Antes de usar un código, reservalo acá** — editá este archivo primero, después escribí el script.
2. **Volvé a correr el control de `MAX` justo antes de ejecutar.** El rango reservado dice qué te
   corresponde; el `MAX` real dice qué hay. Si no coinciden, **parar y avisar**, nunca forzar.
3. **Después de insertar claves explícitas, sincronizá la secuencia.** Si `SQ_PRBRCDGO` o
   `SQ_PDTRCDGO` quedan por debajo de lo insertado, el próximo rubro creado **desde la aplicación**
   muere por PK duplicada — en una pantalla sin relación aparente con lo que hiciste.

```sql
-- Control obligatorio antes de ejecutar cualquier script que inserte rubros
SELECT MAX(PRBRCDGO) AS MAX_PRBR FROM SCP.PRBR;
SELECT MAX(PDTRCDGO) AS MAX_PDTR FROM SCP.PDTR;
SELECT s.SEQUENCE_NAME, s.LAST_NUMBER FROM ALL_SEQUENCES s
WHERE  s.SEQUENCE_OWNER = 'SCP'
AND    s.SEQUENCE_NAME IN ('SQ_PRBRCDGO','SQ_PDTRCDGO');
```

---

## 2. Estado al 2026-08-30

**Último usado:** `PRBRCDGO` = **248** · `PDTRCDGO` = **1178**

| Rango PRBR | Rango PDTR | Equipo | Estado |
|---|---|---|---|
| ≤ 248 | ≤ 1178 | histórico (todos) | ocupado |
| 249 | 1179–1199 | **libre — colchón**, no reservar | — |
| 250–269 | 1200–1299 | **CRD · EQUIPO A — Cobros, contabilidad y jubilados** | reservado |
| 270–289 | 1300–1399 | **CRD · EQUIPO B — Ciclo del crédito y seguros** | reservado |
| 290–309 | 1400–1499 | **Equipo cxp/cxc/tsr/rhh/sri** | reservado para el otro equipo |
| ≥ 310 | ≥ 1500 | sin asignar | — |

⚠️ **El bloque del otro equipo se reservó sin consultarlo.** Si ya venían usando otros números,
avisen y se ajusta — pero **no lo pisen**: es el mismo error que este archivo existe para evitar.

---

## 3. Nombres de tabla de 4 letras

**El código de 4 letras es único en TODO el proyecto, no por esquema.** Verificar antes de
proponerlo, contra Java y contra la base:

```sql
SELECT t.OWNER, t.TABLE_NAME FROM ALL_TABLES t WHERE t.TABLE_NAME = 'XXXX';
```
```bash
grep -rn 'name = "XXXX"' src/main/java/com/saa/model/
```

### Reservados

| Código | Tabla | Equipo | Estado |
|---|---|---|---|
| `ACCN` | Acuerdo de condonación | CRD | creada |
| `DACC` | Detalle de acuerdo | CRD | creada |
| `CBCR` | Cobro de crédito | CRD | creada |
| `DCBC` | Detalle de cobro | CRD | creada |
| `TRCR` | Transferencia de carga | CRD | creada |
| `ANCP` | Asiento por sub-proceso Petro | CRD | creada |
| `CRTF` | Certificado de crédito | CRD | creada |

### Propuestos para los frentes nuevos — **verificar antes de usar**

Ninguno está confirmado. Cada árbitro corre las dos verificaciones de arriba antes de fijarlo.

| Frente | Idea de códigos |
|---|---|
| Jubilados | jubilación del partícipe, detalle de la liquidación |
| Seguros | póliza, inscripción de préstamo en póliza (solo incendio), aseguradora |
| Ciclo del crédito | solicitud de crédito, otorgamiento/desembolso, reestructuración aplicada |
| Contabilidad | probablemente ninguna nueva: reusa `CBCR`/`DCBC` |

---

## 4. Archivos con dueño exclusivo

Un archivo que dos equipos editan a la vez es un conflicto silencioso. Estos tienen dueño:

| Archivo | Dueño | El otro equipo |
|---|---|---|
| `CobroCreditoServiceImpl`, `ProcesoPagoPrestamoServiceImpl`, `AporteServiceImpl`, `DevolucionAporteServiceImpl` | **EQUIPO A** | solo lectura |
| FE: `forms/cobros-personales/*`, `forms/cruce-de-valores/*`, `dialog/pagos/*`, `forms/entidad-participe/jubilados/*` | **EQUIPO A** | solo lectura |
| `CalculadoraAmortizacionServiceImpl`, `SimulacionPrestamoServiceImpl`, `PrestamoServiceImpl` | **EQUIPO B** | solo lectura |
| FE: `forms/simulador-*`, `forms/asignacion-seguros/*` | **EQUIPO B** | solo lectura |
| `com.saa.ejb.cnt`, `com.saa.model.cnt`, `docs/logica-negocio/cnt/` | **compartido, también con el equipo cxp/tsr** | `git status` antes de tocar, y avisar |

**Si necesitás un cambio en un archivo ajeno: pedíselo a su dueño.** No lo edites y avises después.

---

## 5. Bitácora de reservas

Agregá una línea cada vez que reserves algo. Fecha, equipo, qué, para qué.

| Fecha | Equipo | Reservado | Para |
|---|---|---|---|
| 2026-08-30 | CRD (árbitro `saabe-4b`) | PDTR 1178 | `JUBILACION` en el rubro 235 (tipo de movimiento de aporte) — script `crd/sql/81` |
| 2026-08-30 | CRD (árbitro `saabe-4b`) | PDTR **1179** — del colchón, no del rango del equipo 4 | `COBRO_MIXTO` en el rubro 245 (tipo de operación de cobro) — script `crd/sql/83`. Un depósito que se reparte entre aportes y varios préstamos: **un depósito = un cobro = una aprobación = un reverso** |
