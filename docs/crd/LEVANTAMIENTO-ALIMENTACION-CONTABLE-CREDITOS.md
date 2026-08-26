# Levantamiento: alimentación contable del módulo de Créditos (CRD)

**Fecha del levantamiento en pizarra:** 2026-07-28 (fotos) · **Fecha de este documento:** 2026-08-25
**Fuentes:**
1. 33 fotos de pizarra en `C:\Docs\Clientes\Asoprep\AnalisisContaRRHH\Fotos\` (IMG_0886–IMG_0922, KRBZ0412) — sesión de análisis con el cliente (ASOPREP-FCPC).
2. `C:\Docs\Clientes\Asoprep\AnalisisContaRRHH\Excels\Ejemplo Bandas Sistema (Autoguardado).xlsx` — algoritmo de reclasificación de bandas ("respaldo Excel, correo Steven"). **Usar la versión (Autoguardado)**: es la corregida (§6.4).
3. `plantillas_crd_todas.docx` — las 33 plantillas contables serie CRD registradas hoy en el módulo de Contabilidad (sistema ASOPREP), transcritas íntegras en §7.
4. Código fuente saaBE (entidades `CNT.PLNS`/`CNT.DTPL`, patrón de consumo en RHH).

**Este documento sustituye a las fotos y al Excel como fuente de consulta.** Todo lo legible está transcrito; lo dudoso está marcado `[por confirmar]` con la mejor lectura disponible. Está escrito para que un agente (Sonnet/Opus) pueda diseñar e implementar sin acceso a las fuentes originales.

---

## 1. Convenciones de lectura

- **Las cuentas de las fotos van sin separadores.** `130105` en pizarra = `1.3.01.05` del plan de cuentas real. En este documento se usa el formato con puntos salvo cuando se transcribe literalmente una pizarra.
- **"Préstamo" a secas en las fotos = préstamo QUIROGRAFARIO.** Hipotecario y prendario tienen sus propias familias de cuentas (§2).
- **Aportes:** cesantía y jubilación llevan cuentas separadas (`2.1.01.05.01` y `2.1.02.05.01`). En algunos procesos las pizarras suman ambos saldos en una sola cuenta agregada (p.ej. `1.4.05.05` / `2.3.02.05`) y en otros usan las diferenciadas. Cada asiento de este documento indica cuál aplica.
- D = Debe, H = Haber. Todos los ejemplos numéricos de pizarra cuadran D = H; cuando un cuadre requirió interpretar la alineación de la foto, se indica.
- Los procesos analizados (alcance de la sesión): apertura/cierre de cartera (mensual, aún sin pantalla), cruce de valores aportes↔créditos, pago de créditos (Petro y manual), jubilación de partícipes, otorgamiento de nuevos créditos, abono a capital, precancelación, pago de última cuota, cobro en exceso, seguros, neteo de planillas.

---

## 2. Plan de cuentas involucrado

Verificado cruzando pizarras con `plantillas_crd_todas.docx` (que trae cuenta, descripción e **ID de plan cuenta** = `CNT.PLNN.PLNNCDGO`).

### 2.1 Cartera de créditos (familias 1.3.xx — las bandas son el sufijo .05/.10/.15/.20/.25)

| Familia | Cartera | Bandas registradas hoy | IDs plan cuenta |
|---|---|---|---|
| `1.3.01` | Quirografario por vencer | .05 (1-30), .10 (31-90), .15 (91-180), .20 (181-360), .25 (>360) | 10279–10283 |
| `1.3.02` | Quirografario novado (por vencer) | .05–.25 (mismas bandas 360) | 10749–10753 |
| `1.3.03` | Quirografario reestructurado (por vencer) | .05–.25 (mismas bandas 360) | 10754–10758 |
| `1.3.04` | Quirografario **vencido** | .05 (1-30), .10 (31-90), .15 (91-180), **.20 (181-270), .25 (>270)** | 10285–10289 |
| `1.3.05` | Prendario por vencer | .05–.25 (bandas 360) | 10290–10294 |
| `1.3.07` | Prendario reestructurado (por vencer) | .05–.25 | 10759–10763 |
| `1.3.08` | Prendario **vencido** — verificado en BD: bandas a **360** (1-30/31-90/91-180/181-360/>360), distinto del quirografario vencido (270) | .05–.25 | 10295–10299 |
| `1.3.09` | Hipotecario por vencer | .05–.25 (bandas 360) | 10300–10304 |
| `1.3.11` | Hipotecario reestructurado (por vencer) `[ver duda D6: plantilla alterno 14 lo llama "prendario"]` | .05–.25 | 10764–10768 |
| `1.3.12` | Hipotecario **vencido** — verificado en BD: **6 bandas irregulares**: `.00` 1-30 (10690), `.05` 31-90 (10549), `.10` 91-270 (10550), `.15` 271-360 (10551), `.20` 361-720 (10552), `.25` >720 (10510). En períodos de 30: 1, 2, 6, 3, 12, NULL — el modelo §8 las soporta sin cambios | .00–.25 | ver detalle |

> **Regla de bandas vigente** (verificada en `CNT.PLNN` el 2026-08-25): **por vencer** = 1-30 / 31-90 / 91-180 / 181-360 / >360 en todas las familias; **vencido** varía por familia: quirografario 1-30/31-90/91-180/181-270/>270, prendario 1-30/31-90/91-180/181-360/>360, hipotecario 6 bandas (1-30/31-90/91-270/271-360/361-720/>720). **Que cada familia tenga hoy bandas distintas valida el diseño por producto del modelo dinámico (§8).** Además la entidad de control va a cambiar las bandas y otros fondos reportan distinto.

### 2.2 Cuentas por cobrar (1.4.xx)

| Cuenta | Descripción | ID | Notas |
|---|---|---|---|
| `1.4.02.05` | Intereses por cobrar QUIROGRAFARIOS (cuota y mora) | 9505 | Pizarras: `140205` dos líneas (ordinario / mora), misma cuenta |
| `1.4.02.10` | Intereses por cobrar PRENDARIOS (cuota y mora) | 9511 | |
| `1.4.02.15` | Intereses por cobrar HIPOTECARIOS (cuota y mora) | 9512 | Pizarra pago hipotecario: `140215` dos líneas (120 ordinario / 40 mora) |
| `1.4.05.05` | Aportes por cobrar (personales+patronales, cesantía+jubilación **agregados**) | 9536 | Pizarras: `140505` |
| `1.4.05.10` | Préstamos por cobrar (cuotas del mes: capital+interés+mora+seguro, **todo**) | 9537 | Pizarras: `140510` |
| `1.4.90.15.02` | Seguro préstamos hipotecarios | 10306 | Pizarra pago hipotecario: `14901502` (240,00) |
| `1.4.90.15.03` | Seguro préstamos prendarios | 10307 | |
| `1.4.90.15.06` | Seguro médico por cobrar | 10310 | |
| `1.4.90.90.10` | CxC seguro de desgravamen partícipes | 10592 | Pizarras: `14909010` |

### 2.3 Pasivos (2.x) e ingresos (5.x)

| Cuenta | Descripción | ID | Notas |
|---|---|---|---|
| `2.1.01.05.01` | Aportes personales CESANTÍA | 10349 | Pizarras: `21010501` |
| `2.1.02.05.01` | Aportes personales JUBILACIÓN | 10354 | Pizarras: `21020501` |
| `2.1.02.15` | Aporte adicional personal | 9637 | Aparece en plantilla alterno 21 |
| `2.3.01.05.01` | Liquidación aportes cesantía | 10360 | |
| `2.3.01.10.01` | Liquidación aportes jubilación | 10362 | |
| `2.3.01.10.03` | Pensiones complementarias por pagar | 10364 | Pizarras: `23011003` (pago pensiones) |
| `2.3.01.15.01` | Cuenta transitoria (cobros Petro) | 10365 | |
| `2.3.02.05` | Valores por aplicar — aportes (cesantía+jubilación **agregados**) | 9664 | Pizarras: `230205` |
| `2.3.02.10` | Valores por aplicar — préstamos (todo el valor de cuotas) | 9665 | Pizarras: `230210` |
| `2.3.90.90.10` | Socios por pagar (entrega de préstamos) | 10398 | |
| `5.1.02.05` | Ingresos intereses QUIROGRAFARIOS | 10453 | Pizarras: `510205` dos líneas (ordinario / mora) |
| `5.1.02.10` | Ingresos intereses PRENDARIOS | 10454 | |
| `5.1.02.15` | Ingresos intereses HIPOTECARIOS | 10455 | |
| `7.3.01.05` | Cartera de créditos (orden) | 10457 | Entrega/levantamiento de garantías |
| `7.4.01.05` | Documentos en garantía (orden) | 9979 | |
| `7.4.01.10` | Vehículos en garantía (orden) | 9980 | |
| `7.4.01.15` | Bienes inmuebles en garantía (orden) | 9981 | |

### 2.4 Cuentas vistas SOLO en pizarra — **RESUELTAS contra `CNT.PLNN` (BD, 2026-08-25)**

| Pizarra | Cuenta real | Nombre en BD | ID | Nota |
|---|---|---|---|---|
| `23011503` | `2.3.01.15.03` | LIQ. POR PAGAR JUBILACION Y/O CESANTIA | 10367 | Existe, pero por decisión (§9-D1) la jubilación se registra con las cuentas diferenciadas de la plantilla 29, no con esta transitoria |
| `21022501` | `2.1.02.25.01` | CTA INDIVIDUAL DE PENSIONES COMPLEMENTARIAS | 10358 | Existe también `2.1.02.25.05` CTA INDIVIDUAL PASIVOS JUBILACION (10359) |
| `23909006` | `2.3.90.90.06` | SEGURO POR PAGAR JUBILADOS | 10394 | |
| `230104` | `2.3.01.15.04` | DEVOLUCION POR COBRO EN EXCESO PARTICIPES | 10565 | La pizarra abrevió el código; el nombre coincide exacto |
| `14904010` | `1.4.90.90.10` | CUENTA POR COBRAR SEGURO DE DESGRAVAMEN PARTICIPES | 10592 | Confirmado lapsus: no existe ninguna cuenta `1.4.90.40.xx` |

---

## 3. Procesos levantados — asientos detallados

### 3.1 Jubilación de un partícipe (fotos IMG_0886–0891)

**Caso de ejemplo "G.R.":** cesantía acumulada 70.000, saldo de préstamo 50.000, fondo de jubilación 20.000. Flujo: el préstamo se cancela cruzándolo contra la cesantía (−50.000); el partícipe pide 10.000 en efectivo (−10.000); el remanente (cesantía 10.000 + jubilación 20.000 = 30.000) pasa a su cuenta de jubilado ("PC"), de la que cobra una **pensión mensual de 300** que se descompone en **280 de pensión + 20 de seguro salud**.

**Asiento 0 — reclasificación al jubilarse** (pantalla "Jubilarse", pendiente de construir; pide certificado bancario):

| Cuenta | D | H |
|---|---|---|
| `2.1.01.05.01` Aportes cesantía | 70.000 | |
| `2.1.02.05.01` Aportes jubilación | 20.000 | |
| `23011503` [→ §2.4] por pagar jubilado | | 90.000 |

> La plantilla vigente "CRD JUBILACION DE UN PARTICIPE" (alterno 29) hace esto con cuentas diferenciadas: D `2.1.01.05.01` + `2.1.02.05.01` → H `2.3.01.05.01` (liq. cesantía) + `2.3.01.10.01` (liq. jubilación) + `2.3.01.10.03` (pensiones por pagar). La pizarra lo simplificó a una sola cuenta. **Definir con contabilidad cuál gana** (duda D1, §9).

**Asiento 1 — cruce de cuentas (cancela el préstamo con la cesantía).** Cuadre exacto verificado (suma H = 50.000):

| Cuenta | D | H |
|---|---|---|
| `23011503` por pagar jubilado | 50.000 | |
| `1.4.02.05` intereses quirografario | | 90 |
| `1.3.01.05` banda 1-30 | | 900 |
| `1.3.01.10` banda 31-90 | | 10.000 |
| `1.3.01.15` banda 91-180 | | 19.000 |
| `1.3.01.20` banda 181-360 | | 20.000 |
| `1.4.90.90.10` seguro desgravamen (pizarra: `14904010`) | | 10 |

**Asiento 2 — pago en efectivo ("el momento de pago"):**

| Cuenta | D | H |
|---|---|---|
| `23011503` | 10.000 | |
| Banco | | 10.000 |

**Asiento 3 — traspaso del remanente a la cuenta del jubilado:**

| Cuenta | D | H |
|---|---|---|
| `23011503` | 30.000 | |
| `21022501` [→ §2.4] | | 30.000 |

> En una foto anterior (IMG_0887) el asiento 3 estaba planteado directo desde los aportes: D `21010501` 10.000 + D `21020501` 20.000 → H `21022501` 30.000; la versión final (IMG_0888+) pasa por `23011503`.

**Pago mensual de pensiones (por cada jubilado, pensión 300 = 280 + 20 seguro salud):**

| Asiento | Cuenta | D | H |
|---|---|---|---|
| Devengo pensión | `21022501` | 280 | |
| | `2.3.01.10.03` pensiones por pagar (pizarra `23011003`) | | 280 |
| Pago pensión | `2.3.01.10.03` | 280 | |
| | Banco | | 280 |
| Devengo seguro salud | `21022501` | 20 | |
| | `23909006` [→ §2.4] | | 20 |
| Pago seguro | `23909006` | 20 | |
| | Banco | | 20 |

**Pendientes anotados en pizarra:** pantalla "Jubilarse" (requiere certificado bancario); proceso "Pago pensiones ⇒ todos los jubilados ⇒ actualizar datos".

### 3.2 Apertura / cierre de cartera — proceso mensual sin pantalla (fotos IMG_0892–0913)

Lista de sub-procesos según la pizarra (numeración de la pizarra):

| # | Sub-proceso |
|---|---|
| ① | Asiento de vencidos |
| ② | Cambio de bandas |
| ③ | Apertura período crédito |
| ④ | Cobro de intereses |
| ⑤ | Seguros |
| ⑥ | Neteo planillas |
| ⑪ | "Bancos vencidas" (quedó como pendiente, sin desarrollo) `[por confirmar qué es]` |

#### ① Asiento de vencidos (1er día del mes)

Todo el **capital no pagado del mes anterior** sale de por vencer banda 1 y entra a vencido banda 1:

| Cuenta | D | H |
|---|---|---|
| `1.3.04.05` vencido 1-30 | Σ capital no pagado mes anterior | |
| `1.3.01.05` por vencer 1-30 | | mismo valor |

Ejemplo pizarra (marzo→abril 2026): saldo capital al último día del mes pasado: por vencer `130105` = 73.000; vencido `130405` = 62.000. El asiento mueve los 73.000.

#### ② Cambio de bandas (reclasificación mensual del POR VENCER)

Cuentas `1.3.01.05`–`1.3.01.25` (por producto; ver §8). El monto por banda = Σ capital de las cuotas que caen en esa banda según su fecha de vencimiento. Cada mes las cuotas "se corren" una posición y el asiento registra solo las **diferencias por banda**. Nota literal de pizarra: *"Ver algoritmo generado bandas — respaldo Excel, correo Steven"* → el algoritmo es el del Excel, transcrito completo en §6.

Ejemplo de pizarra (en miles). Deltas anotados: `0−71=−71K`, `71−68=+3K`, `68−70=−2K`, `70−91=−21`, `91−0=91`. Convención: delta = saldo viejo − saldo nuevo; negativo ⇒ la banda crece ⇒ Debe; positivo ⇒ decrece ⇒ Haber:

| Banda | D | H |
|---|---|---|
| `1.3.01.05` | 71.000 | |
| `1.3.01.10` | | 3.000 |
| `1.3.01.15` | 2.000 | |
| `1.3.01.20` | 21.000 | |
| `1.3.01.25` | | 91.000 |
| **Totales** | **94.000** | **94.000** |

#### ①.1 Reclasificación del VENCIDO ("Excel Vencido", 1er día del mes)

Mismo mecanismo para las bandas de vencido `1.3.04.05`–`1.3.04.25`. Ejemplo pizarra (abril 2026), cuadre 93.000/93.000 (la asignación D/H se reconstruyó por cuadre, la foto no alinea columnas de forma inequívoca `[por confirmar]`):

| Banda | D | H |
|---|---|---|
| `1.3.04.05` | | 62.000 |
| `1.3.04.10` | 12.000 | |
| `1.3.04.15` | | 27.000 |
| `1.3.04.20` | | 4.000 |
| `1.3.04.25` | 81.000 | |
| **Totales** | **93.000** | **93.000** |

Notas de pizarra asociadas: "Saldo Feb 2026 → día 1" vs "Saldo Feb 2026 → 28": el proceso compara el saldo por banda al inicio y al fin del mes.

#### ③ Apertura del período de crédito (1er día del mes)

Genera las cuentas por cobrar del mes contra las cuentas "por aplicar". Regla literal: **"todas las cuotas pendientes con fecha de corte <= último día del mes a cerrar"**.

| Cuenta | D | H | Contenido |
|---|---|---|---|
| `1.4.05.05` | a | | a = Σ aportes por cobrar (cesantía + jubilación, agregados) |
| `1.4.05.10` | b | | b = Σ préstamos por cobrar (capital + intereses + seguro + mora — "TODO") |
| `2.3.02.05` | | a | |
| `2.3.02.10` | | b | |

Coincide exactamente con la plantilla vigente **alterno 1** ("CRD RG PLANILLA MENSUAL CBRO PARTICIPES").

**Cierre** (contrapartida al cerrar el mes): por **lo no cobrado**, reversa: D `2.3.02.05`/`2.3.02.10` → H `1.4.05.05`/`1.4.05.10` ("a = saldo de lo no cobrado de aportes; b = ídem de préstamos (todo: capital, int, seg, mora); al último día del mes a cerrar"). Coincide con la plantilla **alterno 33** ("CRD NETEO DE PLANILLAS").

#### ④ Cobro (devengo) de intereses

Asiento mensual (apertura/cierre) con dos componentes por tipo de interés — para quirografario:

| Cuenta | D | H | Regla |
|---|---|---|---|
| `1.4.02.05` (a: ordinario) | X | | (a) = Σ intereses de las cuotas pendientes con fecha <= último día del mes (mes vigente y mes anterior — la pizarra dibuja las dos líneas "Mes Vigente 140205" / "Mes Anter 140205") |
| `1.4.02.05` (b: mora) | Y | | (b) = interés de mora |
| `5.1.02.05` (a: ordinario) | | X | |
| `5.1.02.05` (b: mora) | | Y | |

Además hay un **asiento DIARIO de interés de mora**: D `1.4.02.05` (b) → H `5.1.02.05` (b), con b = **"interés mora generado del día"**. Notas literales de pizarra sobre la mora: *"nuevo del mes vigente pero de todas las cuotas en mora"* y *"solo mes vigentes!"* (la mora se devenga a diario sobre todas las cuotas en mora, pero el asiento reconoce solo lo generado en el período vigente). Activo ⇒ "cta x cobrar; interés normales / intereses mora" (mismas cuentas 1.4.02.xx, dos líneas).

Equivalente en plantillas: **alterno 17** ("CRD REGISTRO DEVENGADO DE INTERES A INGRESOS") ya define D `1.4.02.05/.10/.15` (cuota y mora) → H `5.1.02.05/.10/.15`.

#### ⑤ Seguros (primero "Por definir"; luego definido en IMG_0912/0913)

- La factura del seguro **entra por CxP como ingreso de factura**, marcada **[✓] No ATS / No declaración de IVA**.
- Va a una **cuenta de activo "Seguros"**, por el **valor total de la factura (incluidos prima + contribuciones + derechos de emisión + IVA)**.
- Pizarra: "Grupo Check: Seg. …" `[por confirmar el detalle del grupo de checks]`.

| Cuenta | D | H |
|---|---|---|
| `1.4.90.90.10` Seg. desgravamen | 18.000,00 | |
| Proveedor (CxP) | | 18.000,00 |

Relación con plantillas: **alterno 18** ("CRD PAGO DE SEGUROS ANTICIPADOS") lista las 4 cuentas de seguros al Debe (`1.4.90.15.02`, `.03`, `.06`, `1.4.90.90.10`).

#### ⑥ Neteo de planillas

- **Fecha del asiento = último día del mes anterior.**
- Ejemplo de pizarra (aportes): ① `1.4.05.05` aportes D 100 → ② cobrado 70 → ③ no cobrado 30 (los mismos 100 = 70 + 30 del ejemplo de pago manual §3.4). El neteo cancela lo no cobrado contra las cuentas por aplicar — es la plantilla **alterno 33**: D `2.3.02.05` + `2.3.02.10` → H `1.4.05.05` + `1.4.05.10`.

### 3.3 Proceso Petro — cobro y aplicación (fotos IMG_0914–0917)

Título pizarra: "Alimentación Contable de Proceso Petro — Petro Ecuador y ARCH". Nota clave: **"Petro puede pagar con más de 1 transferencia"** (el asiento 1 admite N bancos al Debe).

**Asiento 1 — cobro (por cada transferencia recibida):**

| Cuenta | D | H |
|---|---|---|
| Banco 1 | 40.000 | |
| Banco 2 | 300.000 | |
| `1.4.05.05` aportes (Esp.) | | 100.000 |
| `1.4.05.10` préstamos (Esp.) | | 240.000 |
| **Totales** | **340.000** | **340.000** |

**Asiento 2 — aplicación (distribución a cuentas reales):**

| Cuenta | Rol | D | H |
|---|---|---|---|
| `2.3.02.05` | aportes por aplicar | 100.000 | |
| `2.3.02.10` | préstamos por aplicar | 240.000 | |
| `2.1.01.05.01` | aportes cesantía | | 40.000 |
| `2.1.02.05.01` | aportes jubilación | | 60.000 |
| `1.3.01.05` | capital por vencer ("x Vencer") | | 200.000 |
| `1.3.04.05` | capital vencido banda 1 ("Vencido 1a3") | | 1.000 |
| `1.3.04.10` | capital vencido banda 2 ("Vencido 3a9") | | 1.000 |
| `1.4.02.05` | interés ordinario ("Int Ordi") | | 18.000 |
| `1.4.02.05` | interés mora ("Int x mora") | | 100 |
| `1.4.90.90.10` | seguro desgravamen | | 19.900 |
| **Totales** | | **340.000** | **340.000** |

> Los apodos de pizarra "1a3" y "3a9" confirman la nomenclatura de bandas por decenas de días (1-30, 31-90).
> Mecánica completa del mes: la **apertura** (§3.2-③) crea el par 1.4.05.xx (D) / 2.3.02.xx (H); el **cobro** cancela el por cobrar; la **aplicación** debita el por aplicar y reparte; el **cierre/neteo** reversa lo no cobrado.
> Plantillas actuales relacionadas: alternos 19/20 (cobro con `2.3.01.15.01` cuenta transitoria — la pizarra ya no la usa, va directo contra `1.4.05.xx`), 21 (aplicación/cierre cartera, 44 líneas), 22–25 (cobros individuales).

### 3.4 Pagos manuales (foto IMG_0916/0917)

Anotación operativa: los asientos **"se disparan con el visto de contabilidad"** (pantalla de revisión); "misma lógica" que Petro (dos asientos: cobro y aplicación).

**Pago manual de aporte** (ejemplo 100 = 70 cesantía + 30 jubilación):

| Asiento | Cuenta | D | H |
|---|---|---|---|
| 1 | Banco | 100 | |
| | `1.4.05.05` (Esp.) | | 100 |
| 2 | `2.3.02.05` (Esp.) | 100 | |
| | `2.1.01.05.01` | | 70 |
| | `2.1.02.05.01` | | 30 |

**Pago manual de préstamo HIPOTECARIO** (ejemplo cuota 2.600,00):

| Asiento | Cuenta | D | H |
|---|---|---|---|
| 1 | Banco | 2.600,00 | |
| | `1.4.05.10` (Esp.) | | 2.600,00 |
| 2 | `2.3.02.10` (Esp.) | 2.600,00 | |
| | `1.3.09.05` hipotecario por vencer 1-30 | | 700,00 |
| | `131201` hipotecario vencido banda 1 `[por confirmar: 1.3.12.00 ó 1.3.12.01]` | | 700,00 |
| | `1.3.12.05` hipotecario vencido banda 2 | | 700,00 |
| | `1.4.02.15` interés ordinario hipotecario | | 120,00 |
| | `1.4.02.15` interés mora hipotecario | | 40,00 |
| | `1.4.90.15.02` seguro préstamos hipotecarios | | 240,00 |
| | `1.4.90.90.10` seguro desgravamen | | 100,00 |
| | **Total H** | | **2.600,00** |

> Este ejemplo demuestra que **cada familia de producto usa su propio juego completo de cuentas** (bandas, intereses y seguros) — insumo directo del modelo dinámico (§8).

### 3.5 Cruce de valores préstamos ↔ aportes (foto IMG_0920)

Ejemplo con **14 días de mora**:

| Cuenta | D | H |
|---|---|---|
| `2.1.01.05.01` aport. cesantía | 1.200,00 | |
| `2.1.02.05.01` aport. jubilación | 800,00 | |
| `1.3.01.05` "1 a 30 días quir." | | 1.700,00 |
| `1.4.02.05` "intereses quir." | | 200,00 |
| `1.4.90.90.10` "seg. desgravam." | | 60,00 |
| `1.4.02.05` "interés mora" | | 40,00 |
| **Totales** | **2.000,00** | **2.000,00** |

> Aquí los aportes van **diferenciados** (cesantía/jubilación). Las plantillas actuales del cruce (alternos 31 y 32) hacen el mismo movimiento en dos pasos vía cuentas de liquidación `2.3.01.05.01`/`2.3.01.10.01`.

### 3.6 Abono a capital (foto IMG_0920) — aplica también a precancelación parcial

**Ejemplo:** deuda de 30.000; el partícipe abona 10.000. "Afectación: cuota y plazo" (anotado dos veces).

**Asiento 1 — cobro del abono:**

| Cuenta | D | H |
|---|---|---|
| Banco | 10.000 | |
| `1.3.01.05` | | 1.000 |
| `1.3.01.10` | | 2.000 |
| `1.3.01.15` | | 3.000 |
| `1.3.01.20` | | 4.000 |

**Asiento 2 — re-bandeo del saldo restante ("Ahora debe 20.000").** La nueva tabla de amortización redistribuye el capital en bandas; el asiento registra las diferencias (líneas "DIF" en pizarra):

| Cuenta | D | H |
|---|---|---|
| `1.3.01.20` (DIF) | 2.000 | |
| `1.3.01.25` (DIF) | 18.000 | |
| `1.3.01.05` | | 500 |
| `1.3.01.10` | | 1.000 |
| `1.3.01.15` | | 1.500 |
| `1.3.01.20` | | 3.000 |
| `1.3.01.25` | | 14.000 |
| **Totales** | **20.000** | **20.000** |

> `[Nota de lectura]` La pizarra muestra el D como dos líneas "DIF" (2.000 + 18.000) y el H como la nueva distribución completa (500/1.000/1.500/3.000/14.000). La forma exacta del asiento (bruto contra bruto, o solo el neto por banda) debe definirla el diseño usando el mismo criterio del cambio de bandas (§6): registrar diferencias netas por banda.

### 3.7 Cobro en exceso (fotos IMG_0921/0922)

Tres opciones anotadas: **① se lo devuelve ✓, ② se afecta al préstamo, ③ se aplica a cuenta individual.**

**Opción devolución — asiento 1** (origen: "una de las dos" según de dónde vino el exceso):

| Cuenta | D | H |
|---|---|---|
| `2.3.02.05` (si vino de aportes) **o** `2.3.02.10` (si vino de préstamo) | 100 | |
| `230104` "Dev. Partícipe Exceso" [→ §2.4] | | 100 |

**Asiento 2 — al devolver el dinero:** D `230104` X → H Banco X.

Nota operativa literal: *"Check en pantalla de revisión Petro, pestaña descuentos. Para devolver dinero."*

Plantillas actuales relacionadas: alterno 27 (reclasificación aporte/cobro en exceso) y alterno 28 (pago liquidación por devolución).

### 3.8 Otorgamiento de nuevos créditos, precancelación y pago de última cuota

Las pizarras no desarrollaron asientos específicos para estos tres procesos, pero las plantillas actuales (§7) definen el patrón:

- **Entrega de préstamo** (plantillas alternos 9 prendario y 13 hipotecario; la de quirografario no existe y **se crea con el mismo patrón** — decisión D7): D bandas de la familia por vencer (distribución según tabla de amortización) + D `7.3.01.05` cartera (orden) → H garantías de orden (`7.4.01.05`/`.10`/`.15`) + H `2.3.90.90.10` socios por pagar. La transferencia al socio (alternos 8/12/16) debita `2.3.90.90.10` (contra banco).
- **Precancelación total**: mismo patrón del abono a capital (§3.6) pero liquidando todas las bandas + intereses + seguros; el caso "cancelar con aportes" es el cruce (§3.5) / liquidación (alterno 32: H bandas `1.3.01.xx` ← D `2.3.01.05.01`/`2.3.01.10.01`).
- **Pago de última cuota y marcado como pagado**: contablemente es un pago normal (§3.3/3.4) que deja las bandas de ese préstamo en cero; el cambio de estado del préstamo es de negocio (CRD), sin asiento adicional levantado.
- Nuevos créditos quirografarios llevan además novación/reestructuración con **traslado completo entre familias** (p.ej. novación: D `1.3.02.xx` todas las bandas ← H `1.3.01.xx` todas las bandas; ver alternos 2, 3, 4, 5, 6, 7, 10, 11, 14, 15).

---

## 4. Índice de fotos (trazabilidad)

| Fotos | Contenido |
|---|---|
| IMG_0886–0891 | Jubilación (0886 solo flujo; 0887–0890 asientos incrementales; 0891 duplicada invertida) |
| IMG_0892–0895 | Apertura/cierre: lista ①–④, luego ⑤ seguros y detalle cobro intereses |
| IMG_0898–0900 | Apertura/cierre: ejemplo marzo/abril 2026 (asiento de vencidos + Excel Vencido) |
| IMG_0901–0907 | Apertura/cierre: ejemplo cambio de bandas (94K), detalle ③ y ④ (mismo contenido, varias tomas) |
| IMG_0908–0909 | Igual + aparece ⑥ Neteo Planillas |
| IMG_0910–0911 | Pizarra borrada: detalle ⑥ neteo, cierre (a/b no cobrado), ejemplos 140505 |
| IMG_0912–0913 | Definición de Seguros (CxP, no ATS/IVA, 14909010 18.000) |
| IMG_0914–0915 | Petro asientos 1 y 2 (0914 rotada 90°) |
| IMG_0916–0917 | Petro + pagos manuales (aporte 100; hipotecario 2.600) |
| IMG_0920 | Cruce (2.000), abono capital (10.000 + re-bandeo 20.000), apertura/cierre intereses y mora diaria |
| IMG_0921–0922 | Cobro en exceso |
| KRBZ0412 | Duplicada de la serie 0898 (con persona) |

---

## 5. Reglas transversales levantadas

1. **Fecha de corte**: cuotas/intereses "pendientes con fecha <= último día del mes a cerrar".
2. **Fecha del asiento de neteo/cierre**: último día del mes anterior.
3. **Interés de mora**: devengo **diario** (asiento diario D `1.4.02.xx` mora → H `5.1.02.xx` mora, por lo generado en el día); en el mensual solo lo del período vigente.
4. **Pagos** (Petro o manual): siempre dos asientos — cobro (banco → por cobrar) y aplicación (por aplicar → cuentas reales); la aplicación se dispara **con el visto de contabilidad** en la pantalla de revisión.
5. **Petro puede pagar con más de una transferencia** (N débitos de banco en el asiento de cobro).
6. **Prelación de aplicación de un pago de préstamo — OFICIAL (usuario, 2026-08-25):** 1) seguro incendio, 2) seguro desgravamen, 3) interés mora, 4) interés ordinario, 5) capital vencido, 6) capital por vencer. (El "seguro incendio" no tiene cuenta con ese nombre en el plan; en hipotecarios se registra en `1.4.90.15.02` SEGURO PRESTAMOS HIPOTECARIOS `[confirmar al implementar]`. Cotejar la parametrización con la entidad `OrdenAfectacionValorPrestamo` de CRD.)
7. **Solo el CAPITAL se distribuye por bandas** (confirmado por el usuario 2026-08-25). Intereses, mora y seguros van a cuentas propias por producto, sin bandas.
8. **Abonos a capital afectan cuota y plazo** y obligan a re-bandear el saldo.
9. Los aportes cesantía/jubilación se manejan **agregados** en `1.4.05.05`/`2.3.02.05` (por cobrar/por aplicar) y **diferenciados** en `2.1.01.05.01`/`2.1.02.05.01` (pasivo real) y en las liquidaciones `2.3.01.05.01`/`2.3.01.10.01`.
10. **NO SE CIERRA UN MES SIN SU ARCHIVO PETRO CARGADO.** Regla de orden, decidida el 2026-08-25 (decisión D13) y de cumplimiento obligatorio — el propio usuario la calificó de *"extremadamente necesaria"*.

    **Por qué.** El lado aportes de ③ y ⑥ no se apoya en un documento de planilla emitida (no existe), sino en un cálculo: **esperado** = suma del aporte mensual de los partícipes activos (último `HistorialSueldo` en estado 99 de cada entidad en estado ACTIVO o ACTIVO_EN_MORA), **registrado** = filas de `CRD.APRT` tipos 9 y 11 del mes, y el neteo reversa la diferencia con piso en cero. Si el mes se cierra **antes** de cargar su archivo Petro, el registrado sale casi vacío y el sistema reversa como "no cobrado" algo que sí se va a cobrar.

    **La magnitud del error, medida en producción el 2026-08-25:** esperado mensual 121.160,97 (46.539,35 jubilación + 74.621,62 cesantía, 1.647 partícipes) contra 5.499,75 registrados en agosto — un mes cuyo archivo **aún no estaba cargado**. Cerrar agosto en ese momento habría reversado 115.661,22 de más. Los meses ya cargados registran ~121 mil, coherentes con el esperado.

    **Cómo se comprueba:** `CRD.CRAR` (CargaArchivo) lleva `CRARANAF` (año de afectación) y `CRARMSAF` (mes de afectación). Al 2026-08-25 estaban cargados los meses 1 a 7 de 2026, todos con `CRARESTD = 3`, y el 8 no existía.

    **Dos limitaciones que esta regla NO resuelve** y conviene tener presentes: el piso en cero **esconde el exceso de cobro** (en julio se registraron 156.797 contra 121.161 esperados; la diferencia negativa se convierte en cero y ese exceso lo tiene que resolver el proceso de cobro en exceso, §3.7); y al ser un **agregado**, un partícipe que paga de más compensa a otro que no paga, así que la cifra es un neto y no la suma de lo adeudado. El arreglo de fondo de ambas es crear una planilla de aportes emitida de verdad — evaluado y pospuesto (opción C de la decisión D13).

---

## 6. Algoritmo del Excel de bandas (transcripción completa)

Archivo: `Ejemplo Bandas Sistema (Autoguardado).xlsx`, hojas **"x vencer"** y **"Vencido"**. Es el algoritmo referido en pizarra como "algoritmo generado bandas, respaldo Excel, correo Steven".

### 6.1 Datos base (ambas hojas)

Columna `B2:B35` = capital de 34 cuotas mensuales de una cartera de ejemplo; `B1 = SUM(B2:B35) = 2.347.500`. Valores en orden (B2→B35): 40.000, 50.000, 60.000, 85.000, 73.000, 62.000, 81.000, 50.000, 68.000, 76.000, 77.000, 64.000, 73.000, 81.000, 76.000, 64.000, 55.500, 60.000, 84.000, 91.000, 64.000, 66.000, 69.000, 72.000, 74.000, 70.000, 80.000, 69.000, 68.000, 74.000, 71.000, 69.000, 66.000, 65.000.

- Hoja "x vencer": columna A = etiqueta del mes (el ejemplo evalúa enero→mayo).
- Hoja "Vencido": columna A = **fecha de vencimiento** de cada cuota (seriales Excel descendentes de 46204 = 01-jul-2026 hasta 45200 = 01-oct-2023, una por mes); las columnas de evaluación llevan su fecha: T=feb-2026(1), P=mar(2), L=abr(3), H=may(4), E=jun-2026.

### 6.2 Definición de bandas (etiquetas del Excel = decenas de días)

| Hoja | Etiquetas | Bandas | Cuotas por banda |
|---|---|---|---|
| x vencer | `13, 39, 918, 1860, 36m` | 1-30, 31-90, 91-180, 181-360, >360 | 1, 2, 3, 6, resto |
| Vencido | `13, 39, 918, 1827, 27m` | 1-30, 31-90, 91-180, 181-270, >270 | 1, 2, 3, 3, resto |

Clasificación por vencer (columnas E, H, L, P, T = meses consecutivos; patrón de fórmulas del mes 1): `E2=+B2` (banda 1); `E3=+B3+B4` (banda 2); `E4=+B5+B6+B7` (banda 3); `E5=+B8+…+B13` (banda 4); `E6=SUM(B14:B35)` (banda 5); `E7=SUM(E2:E6)` = total cartera. El mes siguiente todo se corre una fila (`H3=+B3; H4=+B4+B5; …; H7=SUM(B15:B36)`), y así sucesivamente. Totales por mes del ejemplo: 2.347.500 / 2.307.500 / 2.257.500 / 2.197.500 / 2.112.500 (decrece porque la cuota del mes sale de por vencer). En "Vencido" el patrón es igual pero la banda 4 son 3 cuotas (`E5=+B10+B11+B12`) y el corrimiento va por antigüedad del impago.

### 6.3 Cálculo del asiento de reclasificación (bloques inferiores)

Para cada transición de mes hay dos bloques:

**Bloque de diferencias** (filas ~12-21): para cada frontera de banda k: `G = saldo que estaba` (arrastre `=+H` de la fila anterior), `H = saldo que queda` (nueva cuota clasificada), `I = G − H` (hoja "x vencer"; en "Vencido" las columnas se llaman Disminución/Aumento/Total y el signo va al revés: `I = H − G`). **La suma del bloque siempre es 0** (`I18=SUM(...)=0`) — verificación de que la reclasificación no crea ni destruye capital.

**Bloque Debe/Haber** (filas ~22-31): convierte cada diferencia en línea de asiento con su cuenta (etiquetadas en la hoja "Vencido" del Autoguardado: `130405, 130405, 130410, 130415, 130420, 130425`): diferencia con un signo → Debe (la banda crece), con el otro → Haber (decrece). Los pares D/H de cada mes cuadran; en el ejemplo: 85.000/85.000, 104.000/104.000, 99.000/99.000, 81.000/81.000 (x vencer) y equivalentes en Vencido (104.000/104.000, −18.000/120.000 en la hoja vieja corregido en el Autoguardado, etc.).

**Regla implementable — CORREGIDA el 2026-08-25 al implementar la Fase 2.** La versión
anterior de esta regla decía "comparar con la distribución contabilizada (saldo actual de
cada cuenta de banda)" y **era incorrecta**: entre un cierre y el siguiente, las cuentas de
banda las mueven además los pagos y las entregas, que ya generan sus propios asientos. Un
asiento de reclasificación calculado contra ese saldo volvería a registrar esos movimientos
— los contaría dos veces — y no cuadraría.

La reclasificación se calcula **a cartera constante**: el *mismo juego de cuotas* medido en
dos fechas. Así la diferencia es puro envejecimiento, el total no cambia por construcción y
el asiento cuadra siempre. Es además la única lectura bajo la que la frase del Excel "el
total de cartera no cambia" es cierta.

1. Fijar el juego de cuotas: las pendientes al corte (según §5.1).
2. Clasificar ese mismo juego **dos veces**: a la fecha del corte anterior y a la del corte
   actual (por vencer: días del corte al vencimiento; vencido: del vencimiento al corte,
   contando el día del corte como día 1). Sumar capital por banda en cada medición.
3. Por cada banda, la diferencia entre las dos mediciones: si crece → Debe; si decrece →
   Haber. Suma cero garantizada.
4. **El snapshot (`CRD.BDCC`) no entra en el cálculo: es control.** Su diferencia contra lo
   recalculado es exactamente lo que movieron pagos y entregas durante el mes, y se reporta
   como desviación. Si esa desviación no se explica, hay un proceso escribiendo en cuentas
   de banda sin pasar por su asiento.

### 6.4 Diferencias entre las dos versiones del archivo

`Ejemplo Bandas Sistema.xlsx` vs `(Autoguardado).xlsx`: mismos datos; el **Autoguardado** añade las etiquetas de cuenta (130405…130425) junto a los bloques D/H de "Vencido" y corrige el primer bloque Debe/Haber de esa hoja (en el archivo principal los signos quedaron en la columna equivocada: p.ej. `G23=-I14` da −85.000 en el Debe; el Autoguardado lo pone como `H23=+I14`). **Referencia canónica: el (Autoguardado).**

---

## 7. Plantillas contables CRD vigentes (las 33, resumen)

Modelo de datos: `CNT.PLNS` (`Plantilla`: `codigo`, `nombre`, `codigoAlterno` PLNSCDAL, `estado`, `empresa` PJRQCDGO, `observacion`, `sistema`) y `CNT.DTPL` (`DetallePlantilla`: FK `plantilla`, FK `planCuenta` PLNNCDGO, `descripcion`, `movimiento` 1=Debe/2=Haber, `auxiliar1..5`, `estado`, vigencias). Resolución en código: `PlantillaDaoService.selectByAlterno(alterno, empresa)` y `DetallePlantillaDaoService.selectByPlantillaYAuxiliar(idPlantilla, auxiliar1)` — patrón ya en producción en RHH (`ContabilizacionNominaServiceImpl.resuelvePlantilla(...)`), donde **auxiliar1 = "qué papel cumple la línea dentro del asiento"** (en RHH, código alterno del rubro 214 RHH_LINEA_ASIENTO).

| Alterno | Nombre | Líneas | Contenido esencial |
|---|---|---|---|
| 1 | RG PLANILLA MENSUAL CBRO PARTICIPES | 4 | D 1.4.05.05, 1.4.05.10 / H 2.3.02.05, 2.3.02.10 (= apertura §3.2-③) |
| 2 | NOVACION QUIROGRAFARIO | 15 | D bandas 1.3.02 / H bandas 1.3.01 + juego 7.3/7.4 + 2.3.90.90.10 |
| 3 | NOVACION DE CREDITO QUIROGRAFARIO REESTRUCTURADO | 15 | D bandas 1.3.02 / H bandas 1.3.03 (⚠ aux 7 y 8 ambos 1.3.03.15; falta 1.3.03.10) + 7.x + 2.3.90.90.10 |
| 4 | REESTRUCTURA QUIROGRAFARIO POR VENCER | 10 | D bandas 1.3.03 / H bandas 1.3.01 |
| 5 | REESTRUCTURA QUIROGRAFARIO RENOVADO | 10 | D bandas 1.3.03 / H bandas 1.3.02 |
| 6 | REESTRUCTURA QUIRO. POR VENCER Y VENCIDO ≤2 MESES | 15 | D bandas 1.3.03 / H bandas 1.3.01 + 1.3.04.05/.10 + 1.4.02.05 (tabla amort.) + 1.4.02.05 (mora) + 1.4.90.90.10 |
| 7 | REESTRUCTURA QUIRO. RENOVADO Y VENCIDO ≤2 MESES | 15 | D bandas 1.3.03 / H bandas 1.3.02 + 1.3.04.05/.10 + intereses + desgravamen |
| 8 | TRANSFERENCIA ADJUDICACION QUIROGRAFARIOS | 1 | D 2.3.90.90.10 |
| 9 | ENTREGA DE PRESTAMO PRENDARIO | 9 | D bandas 1.3.05 + 7.3.01.05 / H 7.4.01.05, 7.4.01.10, 2.3.90.90.10 |
| 10 | REESTRUCTURA PRENDARIO POR VENCER | 10 | D bandas 1.3.07 / H bandas 1.3.05 |
| 11 | REESTRUCTURA PRENDARIO POR VENCER Y VENCIDO ≤2 MESES | 14 | D bandas 1.3.07 / H bandas 1.3.05 + 1.4.02.10 (tabla amort. y mora) + 1.4.90.90.10 + 1.4.90.15.03 |
| 12 | TRANSFERENCIA ADJUDICACION PRENDARIOS | 1 | D 2.3.90.90.10 |
| 13 | ENTREGA DE PRESTAMO HIPOTECARIO | 9 | D bandas 1.3.09 + 7.3.01.05 / H 7.4.01.05, 7.4.01.15, 2.3.90.90.10 |
| 14 | REESTRUCTURA "PRENDARIO" POR VENCER (⚠ usa cuentas 1.3.11/1.3.09 = hipotecario) | 10 | D bandas 1.3.11 / H bandas 1.3.09 |
| 15 | REESTRUCTURA HIPOTECARIO POR VENCER Y VENCIDO ≤2 MESES | 14 | D bandas 1.3.11 / H bandas 1.3.09 + 1.4.02.10 (⚠ debería ser .15) + 1.4.90.90.10 + 1.4.90.15.02 |
| 16 | TRANSFERENCIA ADJUDICACION HIPOTECARIOS | 1 | D 2.3.90.90.10 |
| 17 | REGISTRO DEVENGADO DE INTERES A INGRESOS | 9 | D 1.4.02.05/.10/.15 (cuota ×3, mora ×3; ⚠ desc. línea 5 "POR PRÉSTAMOS PRENDARIOS") / H 5.1.02.05/.10/.15 |
| 18 | PAGO DE SEGUROS ANTICIPADOS | 4 | D 1.4.90.15.02, 1.4.90.15.03, 1.4.90.15.06, 1.4.90.90.10 |
| 19 | COBRO PETROECUADOR/ARCH CORRELACIONADO | 1 | H 2.3.01.15.01 cuenta transitoria |
| 20 | COBRO PETROECUADOR/ARCH CORRELACIONADO (1) | 3 | D 2.3.01.15.01 / H 1.4.05.05, 1.4.05.10 |
| 21 | COBRO PETRO CORRELACIONADO CIERRE CARTERA | 44 | D 2.3.02.05, 2.3.02.10 / H: 2.1.01.05.01, 2.1.02.15, TODAS las bandas de 1.3.01–1.3.12, intereses 1.4.02.xx (⚠ aux 36 y 37 ambos 1.4.02.05), seguros. ⚠ familias 1.3.05/.07/.09/.11 solo con banda .05; 1.3.12 con .00/.05 |
| 22 | COBRO INDIVIDUAL APORTES DEPOSITADO (Petro) | 1 | H 1.4.05.05 |
| 23 | COBRO INDIVIDUAL APORTES CORRELACIONADO (1) | 3 | D 2.3.02.05 / H 2.1.01.05.01, 2.1.02.05.01 |
| 24 | COBRO INDIVIDUAL PRESTAMO DEPOSITADO | 1 | H 1.4.05.10 |
| 25 | COBRO INDIVIDUAL PRESTAMO CORRELACIONADO (1) | 23 | D 2.3.02.10 / H bandas .05 de 1.3.01/.02/.03/.05/.07/.08/.09/.11, 1.3.04.05/.10, 1.3.12.00/.05, 1.4.02.05/.10/.15 (cuota y mora), 1.4.90.15.02/.03, 1.4.90.90.10 |
| 26 | LEVANTAMIENTO DE HIPOTECA Y ENTREGA DE PAGARE | 4 | H 7.3.01.05 / D 7.4.01.05, 7.4.01.15, 7.4.01.10 |
| 27 | RECLASIFICACION APORTE O COBRO EN EXCESO | 4 | D 2.1.01.05.01, 2.1.02.05.01 / H 2.3.01.05.01, 2.3.01.10.01 |
| 28 | PAGO LIQUIDACION CESANTES X DEVOLUCION X COBRO EXCESO | 2 | D 2.3.01.05.01, 2.3.01.10.01 |
| 29 | JUBILACION DE UN PARTICIPE | 5 | D 2.1.01.05.01, 2.1.02.05.01 / H 2.3.01.05.01, 2.3.01.10.01, 2.3.01.10.03 |
| 30 | PAGO VALORES A JUBILADO | 2 | D 2.3.01.05.01, 2.3.01.10.01 |
| 31 | CRUCE DE VALORES CON PRESTAMO POR VENCER | 4 | D 2.1.01.05.01, 2.1.02.05.01 / H 2.3.01.05.01, 2.3.01.10.01 |
| 32 | LIQUIDACION DE PRESTAMO POR CRUCE DE VALORES | 7 | D 2.3.01.05.01, 2.3.01.10.01 / H bandas 1.3.01 completas |
| 33 | NETEO DE PLANILLAS | 4 | D 2.3.02.05, 2.3.02.10 / H 1.4.05.05, 1.4.05.10 (= cierre §3.2-③/⑥) |

(El detalle línea a línea con auxiliar1, ID de plan cuenta y movimiento está en `plantillas_crd_todas.docx`; los ⚠ se recogen como dudas/correcciones en §9.)

---

## 8. Modelo dinámico de bandas (requerimiento, definido con el usuario 2026-08-25)

### 8.1 Requerimiento

- **Motivación:** (1) la entidad de control va a cambiar las bandas próximamente; (2) el sistema se venderá a otros fondos que reportan con bandas diferentes. Las bandas NO pueden estar cableadas ni en código ni en plantillas.
- **Ancla: `CRD.PRDC` (Producto)** — NO `TipoPrestamo`. Razón confirmada por el usuario: TipoPrestamo define el tipo (hipotecario); Producto define las variantes (hipotecario, hipotecario reestructurado, hipotecario novado…), y **las cuentas de un hipotecario y un hipotecario reestructurado son diferentes** (visible en §2.1: familias 1.3.09 vs 1.3.11). 
- **Tablas NUEVAS** relacionadas a PRDC; no se altera PRDC.
- Por producto se parametriza: **cuántas bandas** tiene en VENCIDO y cuántas en POR VENCER; por cada banda: **la cuenta contable** (propia de ese producto y esa banda) y **cuántos períodos de 30 días** abarca (banda 1-30 → 1 período; banda 31-90 → 2 períodos; etc.). Los rangos en días se **derivan** acumulando períodos: inicio(k) = 30·Σperíodos(1..k−1) + 1; fin(k) = 30·Σperíodos(1..k).
- **Última banda = abierta**: períodos NULL = "todo lo que excede la banda anterior" (decisión del usuario: opción "Periodos NULL = resto").
- **Solo capital se bandea** (confirmado). 
- **Las demás cuentas del proceso** (interés ordinario, mora, seguros, ingresos, por cobrar, por aplicar, transitorias…) NO van al modelo de bandas: se resuelven con las **plantillas de contabilidad** (código alterno a nivel de plantilla + auxiliar1 a nivel de detalle), como hace RHH. Nota histórica: en algún momento se pensó usar plantillas también para bandas; decisión vigente: **bandas → modelo nuevo; resto de cuentas → plantillas**.
- Los procesos contables de CRD (apertura/cierre, cambio de bandas, asiento de vencidos, pagos, entregas, novaciones, cruces, abonos) deben **armar las líneas de banda consultando esta parametrización** y las líneas restantes vía plantilla.

### 8.2 Diseño propuesto (para validar antes de implementar)

Dos tablas nuevas (decisión confirmada: **dos tablas, no una**) siguiendo `docs/estandar/ESTANDAR_MAPEO_CAPAS.md`. Nombres **aprobados por el usuario**: `CRD.CBPR` y `CRD.BNDP` (verificar solo que no colisionen en la BD).

**`CRD.CBPR` — Configuración de bandas por producto** (una fila por producto + tipo de cartera + empresa + vigencia):
- `CBPRCDGO` PK (SQ), `PRDCCDGO` FK → CRD.PRDC, `PJRQCDGO` FK → empresa (**decisión: la parametrización es por producto + empresa**), `CBPRTPCR` tipo cartera (1 = por vencer, 2 = vencido; catálogo en `com.saa.rubros`), `CBPRFCIN`/`CBPRFCHA` **vigencia desde/hasta** (**decisión: con vigencia histórica** — al cambiar la normativa se cierra la configuración vieja y se abre la nueva; la anterior queda para reprocesos/auditoría), `CBPRESTD` estado, auditoría estándar.
- Única activa/vigente por (producto, empresa, tipo cartera) a una fecha dada.

**`CRD.BNDP` — Banda del producto** (una fila por banda):
- `BNDPCDGO` PK, `CBPRCDGO` FK, `BNDPNMRO` número de banda (1..N, consecutivo), `BNDPCNTD` períodos de 30 días (**NULL = banda abierta/resto, decisión confirmada**), `PLNNCDGO` FK → CNT.PLNN (**decisión: FK al plan de cuentas, no código texto**), `BNDPESTD`, auditoría.

**Validaciones de negocio:** números de banda consecutivos desde 1; exactamente una banda con períodos NULL y debe ser la última; cuenta obligatoria y perteneciente a la empresa; no se puede inactivar una configuración con saldo contable sin migración; los cambios normativos se modelan cerrando vigencia y creando configuración nueva (la reclasificación posterior mueve los saldos).

**Resolución en runtime:** (producto, empresa, tipo cartera, fecha) → configuración vigente; días(cuota, corte) → banda = primera k tal que días ≤ fin(k) (la abierta captura el resto) → cuenta = BNDP.PLNNCDGO. Servicio único de clasificación reutilizado por todos los procesos (§6.3 regla implementable).

**Carga inicial (verificada contra `CNT.PLNN`):** por cada producto activo, según su familia:
- Por vencer (todas las familias): 5 bandas, períodos 1 / 2 / 3 / 6 / NULL.
- Vencido quirografario (1.3.04): 5 bandas, períodos 1 / 2 / 3 / 3 / NULL.
- Vencido prendario (1.3.08): 5 bandas, períodos 1 / 2 / 3 / 6 / NULL.
- Vencido hipotecario (1.3.12): 6 bandas, períodos 1 / 2 / 6 / 3 / 12 / NULL.

### 8.3 Cambios necesarios en los registros de plantillas (análisis pedido por el usuario)

Cuando las bandas pasen al modelo nuevo, las plantillas quedan solo con las líneas no-banda. Cambios concretos:

1. **Retirar (o inactivar con `DTPLFCFN`/estado) las líneas de cuentas 1.3.xx de bandas** de las plantillas: 2, 3, 4, 5, 6, 7, 9, 10, 11, 13, 14, 15, 21, 25, 32 — esas líneas pasan a generarse desde `CRD.BNDP`. Las plantillas conservan: intereses (1.4.02.xx), seguros (1.4.90.xx), transitorias/por aplicar (2.3.xx), aportes (2.1.xx), órdenes (7.x), socios por pagar.
2. **Corregir duplicados/erratas detectados** (si alguna línea sobrevive como no-banda o mientras conviva el esquema): alterno 3 aux 7/8 duplican `1.3.03.15` (falta `1.3.03.10`); alterno 21 aux 36/37 duplican `1.4.02.05` (uno debería ser `1.4.02.10`); alterno 17 descripción de línea 5 ("INTERESES POR PRÉSTAMOS PRENDARIOS" → "INTERESES POR MORA"); alterno 15 usa `1.4.02.10` para hipotecario (debería ser `1.4.02.15`); alterno 14 nombre "PRENDARIO" con cuentas hipotecarias (1.3.11/1.3.09) — resolver duda D6.
3. **Completar bandas hoy ausentes** solo si conviven ambos esquemas un tiempo (alterno 21: familias 1.3.05/.07/.09/.11 solo tienen banda .05; 1.3.12 solo .00/.05). Con el modelo nuevo esto se vuelve innecesario: es exactamente el tipo de mantenimiento que el modelo elimina.
4. **Crear plantillas faltantes** (líneas no-banda) para los procesos de pizarra sin plantilla: asiento de vencidos, cambio de bandas (solo si se quiere glosa/plantilla contenedora), devengo diario de mora, entrega de préstamo QUIROGRAFARIO (hoy no existe), seguros por factura CxP (si no se maneja 100% en CxP), devolución por cobro en exceso (cuenta `230104` §2.4), pensiones de jubilados (`21022501`, `23011003`, `23909006`).
5. **Definir el catálogo de auxiliar1 para CRD** (equivalente al rubro 214 de RHH): un rubro nuevo (p.ej. CRD_LINEA_ASIENTO) que asigne significado estable a cada línea (p.ej. 1=aportes por cobrar, 2=préstamos por cobrar, 3=aportes por aplicar, 4=interés ordinario, 5=interés mora, 6=seguro desgravamen, …) para que los services busquen por rol y no por posición. Hoy los auxiliares de las plantillas CRD son posicionales (1..N por orden), no semánticos: **hay que renumerarlos con el catálogo antes de que los services los consuman**.
6. Los cambios de datos se entregarán como **documento MD revisable con SELECTs de control antes de los UPDATE/INSERT** (convención del proyecto), no ejecutados directamente.

---

## 9. Decisiones tomadas (usuario, 2026-08-25) y dudas restantes

### 9.1 Decisiones cerradas — NO volver a preguntar

| # | Decisión |
|---|---|
| D1 | **Jubilación: gana la plantilla** (alterno 29): cuentas diferenciadas `2.3.01.05.01` + `2.3.01.10.01` + `2.3.01.10.03`, no la transitoria única `2.3.01.15.03` de la pizarra. El resto del flujo de pizarra (§3.1) sigue válido, sustituyendo la transitoria por esas cuentas |
| D2 | Cuentas de pizarra resueltas contra la BD — ver §2.4 |
| D3 | **Mora: cuenta compartida** con el ordinario (`1.4.02.xx`/`5.1.02.xx`), pero la **descripción del detalle del asiento debe decir explícitamente si la línea es por mora o por interés ordinario** |
| D4 | Descripciones de bandas inconsistentes en plantillas: no es grave; la configuración por producto del modelo nuevo lo absorbe (los rangos reales verificados están en §2.1) |
| D7 | **Entrega de préstamo quirografario: usar el mismo patrón que las demás entregas** (bandas + 7.3/7.4 garantías + `2.3.90.90.10` socios por pagar); crear su plantilla no-banda |
| D8 | Pendiente "⑪ Bancos vencidas": **descartado por el momento** |
| D9 | **Prelación oficial de pagos:** seguro incendio → seguro desgravamen → interés mora → interés ordinario → capital vencido → capital por vencer (§5.6) |
| — | **Re-bandeo tras abono a capital (C2):** diferencias netas por banda (como el cambio de bandas mensual). Matiz del usuario: durante el mes basta con mover los saldos de las bandas **de ese préstamo**; el cierre/apertura de fin de mes es el que garantiza los saldos correctos globales |
| — | **Devengo de mora (C5):** el asiento se ejecuta **con el cierre**. Existe un proceso diario a las 02:00 que calcula la mora, pero contabilidad solo necesita, a fin de mes: lo generado global en el mes, lo cobrado y lo pendiente |
| D12 | **Deriva de calendario: las bandas se cortan por DÍAS, y así se queda. ⚠ ORDEN EXPRESA DE LA SUPERINTENDENCIA DE BANCOS, validada con ellos** (usuario, 2026-08-25). **No "arreglar" esto nunca**: parece un defecto y no lo es. Como el mes calendario dura 30,44 días de media, doce cuotas mensuales se reparten **1, 1, 3, 6, 1** entre las cinco bandas y no 1, 2, 3, 6, 0: la cuota a tres meses cae en 91 días y se pasa por un día del límite de 90, y la duodécima cae en 365 y se va a la banda abierta. Verificado contra el clasificador en vivo. Clasificar por meses queda descartado, y además no sería expresable en la parametrización, que guarda períodos de 30 días |
| D13 | **⑥ lado aportes: se mantiene `esperado − registrado` (opción A), CON el control bloqueante** (usuario, 2026-08-25: *"ese control es extremadamente necesario"*). Ver §5.10 |
| — | Modelo de bandas: dos tablas `CRD.CBPR`/`CRD.BNDP` (nombres aprobados), por **producto + empresa**, cuenta como **FK a CNT.PLNN**, última banda **períodos NULL**, **con vigencia histórica** (§8.2) |

### 9.2 Dudas restantes (menores, no bloquean el DDL)

| # | Duda | Contexto |
|---|---|---|
| D5 | Asignación D/H exacta del ejemplo "Excel Vencido" de pizarra (93.000) — reconstruida por cuadre | §3.2-①.1 |
| D6 | Plantilla alterno 14: nombre "prendario" con cuentas hipotecarias (1.3.11/1.3.09) — corregir nombre o cuentas al sanear plantillas | §7 |
| D10 | Detalle del "Grupo Check" de seguros (IMG_0912) — ilegible; pedir al definir la pantalla | §3.2-⑤ |
| D11 | ¿En qué cuenta se registra el "seguro incendio" de la prelación? (no hay cuenta con ese nombre; probable `1.4.90.15.02`) | §5.6 |

---

## 10. Guía para el agente implementador

1. **Autoritativo:** §2 (cuentas), §3 (asientos), §5 (reglas), §6.3 (algoritmo de bandas), §8 (modelo dinámico y decisiones ya tomadas). Las plantillas (§7) son el estado actual, no el objetivo.
2. **Antes de codificar:** las decisiones de diseño ya están tomadas (§9.1) — no re-preguntar; verificar que `CBPR`/`BNDP` no colisionen con tablas existentes en la BD; seguir `docs/estandar/GUIA-MAPEO-TABLA-COMPLETO.md` (5 archivos + constantes por tabla). La BD local de desarrollo (`saa-oracle-23ai`, `system/saa123@FREEPDB1`) tiene el plan de cuentas cargado y sirve para verificar cuentas (`CNT.PLNN`: `PLNNCNTA` = código con puntos, `PLNNNMBR` = nombre, `PLNNCDGO` = id).
3. **Orden sugerido de fases:** (1) tablas de bandas + carga inicial + servicio de clasificación; (2) proceso mensual apertura/cierre (vencidos → cambio bandas → apertura → intereses → neteo) consumiendo bandas nuevas + plantillas para lo no-banda (patrón RHH: `selectByAlterno` + `selectByPlantillaYAuxiliar`); (3) integración de pagos (Petro/manuales) y demás procesos; (4) saneamiento de registros de plantillas (§8.3, como MD revisable).

   **Estado Fase 1 (2026-08-25):** DDL en `sql/DDL-BANDAS-PRODUCTO.sql` y carga inicial en `CARGA-INICIAL-BANDAS-PRODUCTO.md` — **ejecutados y validados en la BD local de desarrollo** (28 CBPR + 143 BNDP; pendientes pruebas y producción, los corre el usuario). Hallazgo de la carga: `1.3.06` y `1.3.10` (familias "renovados" prendario/hipotecario) no tienen subcuentas de bandas en `CNT.PLNN`, así que los productos 22 PRENDARIO NOVACION y 21 HIPOTECARIO NOVACION quedaron sin configuración de por vencer (bloque de regularización listo en §4 del runbook de carga). Prompts de implementación: `prompts/PROMPT-BACKEND-BANDAS-FASE1.md` (mapeo + servicios + REST + llena el contrato `API-BANDAS-PRODUCTO.md`) y `prompts/PROMPT-FRONTEND-BANDAS-FASE1.md` (pantalla de parametrización, acceso temporal solo USUARIO 1).

   **Fase 1 CERRADA (2026-08-25):** backend, pantalla y verificación de integración contra el WAR desplegado. Dos defectos encontrados y corregidos en esa verificación: la carga inicial tenía vigencia futura (`2026-09-01`) y dejaba toda la parametrización invisible — corregido a `2020-01-01`, ver `sql/FIX-VIGENCIA-BANDAS.sql`; y el contrato describía mal la forma del error (§0.2 de `API-BANDAS-PRODUCTO.md`).

   **Estado Fase 2 (2026-08-25):** implementada. Tablas `CRD.CRCT` (corrida), `CRD.BDCC` (snapshot por banda) y `CRD.ANCC` (asiento por sub-proceso) — DDL en `sql/DDL-CIERRE-CARTERA.sql`, revisado y con `FK_ANCC_ASNT` añadida en la revisión. Renumeración de auxiliares de plantillas en `ACTUALIZACION-PLANTILLAS-CIERRE-CARTERA.md` (alternos 1, 17 y 33; verificado idempotente). Endpoints `previsualizar / ejecutar / consultar / reversar / corridas`, contrato en `API-CIERRE-CARTERA.md`. Prueba con datos reales de agosto 2026 (empresa 1236): los seis sub-asientos cuadran D = H. **Hallazgo que cambió el diseño:** `DTPRCPPG` no sirve para saber qué se pagó (resto de la migración: vale igual que `DTPRCPTL` en 50.853 de 59.147 cuotas pendientes sin fecha de pago, y 0 en 10.593 pagadas; `DTPRFCPG` nulo en 11.163 pagadas) — el saldo se reconstruye desde `CRD.PGPR`, como ya hacen el motor de pagos y la generación Petro. Ver también la corrección de la regla de reclasificación en §6.3.

   **Fase 2 CERRADA (2026-08-25)** en backend, base de datos y pantalla. Scripts ejecutados en local, pruebas y producción. La pantalla (`/menucreditos/cierre-cartera`, acceso temporal solo USUARIO 1) se verificó con round-trip completo contra el WAR desplegado: previsualizar → ejecutar (asientos 8071–8076) → consultar → reversar, todo con capturas HTTP reales. **Queda pendiente de implementar el control de archivo Petro** (decisión D13, `prompts/PROMPT-BACKEND-CONTROL-ARCHIVO-PETRO-FASE2.md`). Hallazgo colateral, **preexistente y ajeno a esta fase**: `AsientoServiceImpl.anulaAsiento` marca el asiento como ANULADO sin llenar `ASNTFCAN`/`ASNTUSAN`/`ASNTMTAN` — su firma ni siquiera recibe usuario ni motivo, así que el motivo del reverso se guarda en `CRD.CRCT`/`CRD.ANCC` pero nunca llega al asiento. Afecta a todos los módulos que anulan por esa vía.
   **Estado Fase 2 (2026-08-25): IMPLEMENTADA.** Los seis sub-procesos de §3.2 (①, ②, ①.1, ③, ④, ⑥) en `CierreCarteraService`, con previsualización, ejecución transaccional, consulta y reverso. Tablas nuevas `CRD.CRCT` (corrida), `CRD.BDCC` (snapshot de capital por banda) y `CRD.ANCC` (asiento por sub-proceso) — DDL en `sql/DDL-CIERRE-CARTERA.sql`, **ejecutado en la BD local**. Contrato de API en `API-CIERRE-CARTERA.md`; ajuste de los `DTPLAXL1`/`DTPLAXL2` de las plantillas 1, 17 y 33 al catálogo semántico `com.saa.rubros.CrdLineaAsiento`, como MD revisable, en `ACTUALIZACION-PLANTILLAS-CIERRE-CARTERA.md` (**aplicado solo en la BD local**; pruebas y producción los corre el usuario).

   **Decisión de diseño de la Fase 2, que aclara este §6.3:** la reclasificación se calcula **a cartera constante** — el MISMO juego de cuotas clasificado dos veces, con los días medidos al corte anterior y al corte actual. Es la única lectura bajo la que "el total de cartera no cambia" es literalmente cierto y el asiento cuadra por construcción; comparar contra el saldo de las cuentas arrastraría los pagos y las entregas del mes, que tienen sus propios asientos. El snapshot de `CRD.BDCC` **no es la base contable** sino el CONTROL: su diferencia contra la distribución recalculada es exactamente lo que movieron los otros procesos, y se reporta como `desviaciones`. Verificado sobre la BD local (agosto 2026): ① 220.927,29 · ② 445.336,12 · ①.1 71.511,80 · ③ 5.153.615,93 · ④ 2.230.420,44 · ⑥ 4.797.836,62, todos con D = H.

4. **No cablear cuentas ni bandas en código.** Toda cuenta sale de `CRD.BNDP` (capital por banda) o de `CNT.DTPL` (resto). Todo asiento debe cuadrar D=H y los procesos por lotes siguen la convención de absorber errores por fila (ver CLAUDE.md).
5. El módulo de asientos es `CNT` (`AsientoContable`/`DetalleAsiento`); RHH (`ContabilizacionNominaServiceImpl`) es el ejemplo de referencia de extremo a extremo para generar asientos desde otro módulo.
