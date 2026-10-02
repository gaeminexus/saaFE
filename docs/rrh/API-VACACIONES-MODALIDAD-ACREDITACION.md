# Vacaciones: modalidad de acreditación parametrizable — diseño y contrato

**Equipo:** `omen-saa-3` · **Escrito:** 2026-10-02 · **Módulo:** `rhh` (backend y pantalla de Parámetros anuales)
**Espejo en el frontend:** `saaFE/docs/rrh/API-VACACIONES-MODALIDAD-ACREDITACION.md`

## 1. Decisión del usuario (2026-09-30), no re-litigar

> *«Para las vacaciones debe ser parametrizable en el módulo: puede ser 15 días luego del año o 1,25
> cada mes. Inicialmente queremos que ASOPREP trabaje con 1,25 cada mes.»*

| Modalidad | Código | Qué hace |
|---|---|---|
| Por aniversario | 1 | El comportamiento actual de `AcreditacionVacacionesServiceImpl.acreditar`: los días del año se acreditan completos cuando se cumple el año de servicio |
| **Devengo mensual** | **2** | Los días se devengan proporcionalmente, 1,25 por mes con la escala base de 15, **en el saldo del año calendario**. ASOPREP usa esta |

## 2. Lo que midió el `e3-06` (2026-10-02) y por qué el devengo mensual encaja sin migración

- **Parámetros de 2025 y 2026** (`RHH.PRNM`, empresa 1236): 15 días base, día adicional desde el año 5, tope de 30, caducidad a los 3 años.
- **Los saldos de 2025 son aperturas proporcionales por días en base 30/360.** Cuadran al centavo con
  `15 × días360 / 360`:
  - ingreso el 2025-06-25: 186 días, **7,75** ✓;
  - ingreso el 2025-08-06: 145 días, **6,04** ✓;
  - ingreso el 2025-10-06: 85 días, **3,54** ✓;
  - ingreso el 2025-10-01: 90 días, **3,75** ✓.
- **Las 7 filas de 2026 que creó la acreditación del 2026-08-27 también son proporcionales:**
  **9,83** = 15 × 236/360, con 236 días del 2026-01-01 al 2026-08-26 en 30/360. **No hay que convertir
  nada**: el devengo mensual recalcula esas mismas filas con la misma regla.
- ⛔ **Hallazgo aparte:** `SLDVUSDO` está en **0 en todas las filas**, aunque hay **6 solicitudes
  APROBADAS de agosto 2026** (`SLCT` 1 a 6, 39 días en total). El consumo nunca se registró en el
  saldo, así que **los saldos están inflados en 39 días**. Ya existe la reparación,
  `POST /slct/consumirSaldoSinNovedad/{id}` `{idUsuario, motivo}` (`SolicitudVacacionesRest:203`),
  con el mismo consumo FIFO. `ESTADO-EQUIPO-OMEN-2` §37 la dejó escrita y sin constancia de que se
  corriera. Se corre **una vez por solicitud, del 1 al 6**, y antes de la primera acreditación mensual.

## 3. Modelo — `rhh/sql/e3-07-modalidad-acreditacion-vacaciones.sql`

`RHH.PRNM.PRNMMDVC` NUMBER, DEFAULT 1, CHECK IN (1, 2), en Java `Long modalidadVacaciones`
(`ParametroNomina`). El script pone **2** en 2026 de la empresa 1236. **El SQL va antes del WAR**
(regla §7 del registro de reservas).

Constantes: `com.saa.rubros.RhhModalidadVacaciones`: `POR_ANIVERSARIO = 1`, `DEVENGO_MENSUAL = 2`.
Un `null` se trata como 1, para que un año sin el parámetro cargado siga como hoy.

## 4. Cálculo del devengo mensual

En `AcreditacionVacacionesServiceImpl.acreditar(idEmpresa, fechaCorte, usuario)`, cuando la
modalidad del año de `fechaCorte` es 2. Para cada contrato activo en el año (el mismo
`selectActivosEnPeriodo` de hoy):

1. `desde` = el mayor entre el 1 de enero del año y la fecha de ingreso (la misma de hoy:
   `MPLDFCIN`, o `CNTEFCHI` si falta).
2. `hasta` = el menor entre `fechaCorte` y la fecha de terminación del contrato, si la tiene.
3. `dias360` = días **inclusivos** entre `desde` y `hasta` en base 30/360 europea (el día 31 cuenta
   como 30):
   `(a2 − a1) × 360 + (m2 − m1) × 30 + (min(d2, 30) − min(d1, 30)) + 1`.
   Comprobación con los datos medidos: del 2025-10-06 al 2025-12-31 son 85; del 2026-01-01 al
   2026-08-26 son 236.
4. `diasAnuales` = `diasQueLeCorresponden(aniosCumplidos, prnm)` con los años cumplidos a `hasta`.
   **Sin** el corte de «menos de un año no acredita»: en devengo mensual se devenga desde el primer
   día. Con menos de un año rigen los días base (15).
5. `diasAsignados` = `redondeaCantidad(diasAnuales × dias360 / 360)`.
6. El saldo es el de **ese año calendario** (`SLDVANOO` = año de `fechaCorte`), con
   `fechaInicio` = `desde` y `fechaFin` = 31 de diciembre. `diasPendientes` = asignados − usados, como
   en la corrección del 2026-08-27. `diasArrastrados` sigue siendo informativo. La caducidad no cambia.
7. **Idempotente:** volver a correr con otra fecha de corte del mismo año recalcula los asignados sin
   tocar los usados. Se corre **al cierre de cada mes**, desde la misma pantalla «Acreditar
   vacaciones», con el último día del mes como fecha de corte.

**La modalidad por aniversario no cambia ni una línea.** El cambio es una bifurcación al principio
del bucle, no una reescritura.

> **Para el agente de backend:**
> - Un año que cruza el aniversario del quinto año, donde empieza el día adicional, se calcula con
>   los años cumplidos a `hasta` para todo el año. Es una simplificación deliberada, y es la misma
>   regla que ya usa la modalidad por aniversario.
> - Si `fechaCorte` cae antes del ingreso (`hasta < desde`), no se acredita nada.

## 5. Endpoints

No hay endpoint nuevo. `POST /sldv/acreditar` decide según el parámetro. `ParametroNomina`
serializa `modalidadVacaciones` (Long) y el CRUD de `/prnm` ya lo guarda.

## 6. Pantalla

- **Parámetros anuales** (`rrh/forms/parametrizacion/parametros-anuales/parametros-anuales.secciones.ts`):
  un campo **«Modalidad de vacaciones»**, combo con «Por aniversario (15 días al cumplir el año)» = 1 y
  «Devengo mensual (1,25 días por mes)» = 2, junto a «Días por año cumplido».
- **Acreditar vacaciones:** un texto de ayuda según la modalidad del año elegido. En devengo
  mensual: «Córralo al cierre de cada mes con el último día del mes como fecha de corte».
