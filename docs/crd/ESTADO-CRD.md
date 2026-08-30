# ESTADO DEL TRABAJO EN CURSO — módulo CRD

**Mantenido por el árbitro de `crd`** (sesión `saabe-4b`), con su equipo de backend (`saabe-00`) y
frontend (`saafe-f6`). **Última actualización: 2026-08-29.**

> 🔵 **AHORA MISMO (2026-08-30).**
>
> ### Condonación (Frente K) — **backend CERRADO**, falta pantalla
>
> El diseño se rehízo el 2026-08-30 tras dos decisiones del usuario:
> - **K4 y K10 DEROGADAS.** El acuerdo **no espera aprobación de nadie**: la **previsualización en
>   pantalla es el control**. No hay rechazo de condonación.
> - **K11:** el préstamo queda **CANCELADO al PROCESAR el cobro**, no al confirmar la condonación.
>   Si contabilidad no aprueba, no se canceló nada y el préstamo sigue vivo y cobrable.
> - La consulta sobre "antigüedad máxima del acuerdo" quedó **RETIRADA**: nació de una ventana que
>   ya no existe.
>
> Flujo: crédito previsualiza y confirma (acuerdo VIGENTE + cobro en `CBCR`, mismo acto) →
> contabilidad aprueba el cobro → crédito procesa → cuotas cerradas, condonación, CANCELADO.
>
> **Construido:** modelo `ACCN`/`DACC` + capas + `/rest/accn`, la previsualización, el motor de
> cierre de cuota con montos arbitrarios, el asiento de la plantilla 25 detrás del gate, el
> disparador en `CobroCreditoServiceImpl` (`validar`/`registrarCobro`/`procesarCobro`/`anularCobro`),
> el staleness reubicado al proceso reusando `procesado:false`, y la anulación en cascada.
> **Contrato congelado:** `crd/API-ACUERDOS-CONDONACION.md`, espejado.
>
> **Falta:** la pantalla (no asignada a propósito — el frontend está con la pieza grande del
> circuito de cobros y no conviene abrirle un segundo frente), correr el DDL en producción, y
> desplegar. **Nada de esto está en producción.**
>
> ### Circuito de cobros — backend EN PRODUCCIÓN sin pantallas
>
> **`saafe-f6`** tiene hechos los modelos, `CobroCreditoService`, `ComprobanteViewer` y
> `BandejaContabilidadComponent` (lista + panel de detalle). **`ProcesoCreditoComponent` es la
> mayoría de lo que falta.**
> El hueco de las filas `CARGA_PETRO` **quedó cerrado el 2026-08-30**: despachan a `/rest/asgn/*`,
> los endpoints ya existían y solo faltaban en el contrato.
> ⚠️ **La carga Petro no tiene "rechazar", tiene "reversar"**, y no son lo mismo: reversar deshace
> una confirmación que ya ocurrió. Las acciones de la bandeja **difieren por tipo de fila**.
> ⚠️ El menú de créditos es un array `navItems` **hardcodeado** en `menucreditos.component.ts` — no
> hay INSERT que escribir. Y las pantallas van en el menú de **crd**, nunca en el de `cnt`: el
> producto se comercializa sin créditos y una entrada de `cnt` apuntando a `crd` queda muerta.
>
> ### Lo que quedó EN PRODUCCIÓN el 2026-08-29
>
> Corridos por el usuario: `DDL-COBROS-APROBACION-CONTABILIDAD.sql` completo,
> `ALTER-COBROS-ANULACION-Y-PAGO-DEVOLUCION.sql` (bloques 2 y 3), y el **WAR desplegado**. Los 9
> `.jasper` de amortización compilados y el huérfano `RPRT_TBLA_ETDI.jasper` eliminado.
> ⚠️ **El backend del circuito de cobros está vivo en producción SIN pantallas.** Solo responde por
> REST. No hay riesgo (nadie puede llegar), pero tampoco sirve hasta que el frontend salga.
> ⚠️ `DDL-ACUERDOS-PAGO-CONDONACION.sql` **NO se corrió en producción** y no debe correrse hasta que
> exista el código — hoy crearía tablas vacías que nada usa. Su prerrequisito ya está cumplido.
>
> ### Decisiones que siguen esperando al usuario
>
> 1. **La cuenta de gasto de condonación (K5).** Ya no es cosmética: el asiento está escrito y
>    **falla a propósito** con `IncomeException` si la línea de gasto de la plantilla 25 no existe.
>    Es un **prerrequisito duro para encender** el flag de contabilidad de CRD (rubro 237, hoy en 0).
> 2. **El criterio de reparto del capital condonado entre cuotas.** El operador decide por
>    *concepto*, pero la contabilidad necesita saber de qué *cuota* salió cada dólar para
>    clasificarlo por banda. El sistema reparte **proporcionalmente al capital pendiente de cada
>    cuota** — es una convención inventada, documentada en `generarAsientoCondonacion`, y cambia a
>    qué cuentas de banda va el dinero. Si el usuario no objeta, queda así.
>
> ---
>
> 🔵 **Antes de la pausa:** todos los scripts de la Fase 3a corrieron **en producción** y el WAR está
> desplegado. El usuario estaba **probando Petro de punta a punta con una carga real**.

**Alcance de este documento: solo `crd`** — aportes, préstamos, contratos, entidades/partícipes, la
integración con `asoprep`/Petro, y la alimentación contable que `crd` genera hacia `cnt`.

El otro equipo mantiene `ESTADO-CXP-CXC-TSR-RHH-SRI.md` (cxp/cxc/pagos/tsr/rhh/sri). El
`ESTADO-GENERAL-TRABAJO-EN-CURSO.md` compartido queda como referencia histórica: ninguna de las dos
sesiones lo mantiene ya.

**Zona compartida:** `cnt` (contabilidad). Antes de tocar `com.saa.ejb.cnt`, `com.saa.model.cnt`,
`com.saa.ws.rest.cnt` o `docs/logica-negocio/cnt/`, revisar `git status`/`git diff` sobre esos
archivos y coordinar con el otro equipo.

---

## 0. De un vistazo

| # | Frente | Código | Base de datos | Producción |
|---|---|---|---|---|
| A | Devengo de aportes + Contratos-vigencias | ✅ BE 5/5 y FE 7/7 confirmados | ✅ Ejecutado | ✅ Desplegado |
| B | Devolución de aportes a partícipes | ✅ 9/9 fases | ✅ Ejecutado | ✅ Desplegado |
| C | Fix del proceso diario de mora | ✅ Terminado y verificado | n/a | ✅ Desplegado |
| D | Sacar `Pais` de `crd` | ✅ Terminado | n/a (la tabla se queda en `CRD.PSSS`) | ✅ Desplegado |
| E | Simuladores de préstamos | ✅ Completo | n/a | ✅ Desplegado |
| F | `saldoOtros` cancelados anticipados | — | — | ❌ **SUPERADO** (usuario, 28-08) |
| G | Segunda ola (pedidos sueltos) | ✅ 3 de 4 cerrados | — | ⏳ queda el pedido 6 |
| **H** | **Alimentación contable de los procesos de crédito** | 🔵 Fase 3a completa; 3b-3e pendientes | ✅ Ejecutado (Fase 3a) | 🔵 **En prueba real** |
| **I** | **Certificados de partícipe** (6 documentos) | ✅ Backend y frontend completos | ✅ Ejecutado | ✅ Desplegado, pendiente de prueba |
| **J** | **Cobro múltiple** (varios créditos, una operación) | 🔵 Endpoint listo; frontend y comprobante en curso | n/a | ❌ |
| **K** | **Acuerdos de pago con condonación** | 🔵 Diseño cerrado, código pausado por prioridad | ⏳ DDL por escribir | ❌ |

**Pendiente de verificar en la prueba de hoy** (frente C): el fix de mora exige confirmar al día
siguiente que ningún préstamo restituido a `PRSTIDST = 8` se movió solo —
`SELECT PRSTCDGO, PRSTIDST FROM CRD.PRST WHERE PRSTCDGO IN (...) AND PRSTIDST <> 8` debe dar 0
filas. Si devuelve algo, el fix no estaba arriba cuando corrió el proceso de las 02:00.

---

## 1. Frente H — Alimentación contable · **EL TRABAJO ACTIVO**

Documento autoritativo: **`crd/LEVANTAMIENTO-ALIMENTACION-CONTABLE-CREDITOS.md`**
(§2 cuentas, §3 asientos, §5 reglas transversales, §6.3 algoritmo de bandas, §8 modelo dinámico,
§9.1 decisiones cerradas que **no se re-preguntan**).

### Lo que ya está en producción y funcionando

| Fase | Qué | Estado |
|---|---|---|
| 1 | Bandas dinámicas por producto (`CRD.CBPR`/`CRD.BNDP` + `ClasificadorBandaService`) | ✅ Cerrada. DDL en pruebas y producción |
| 2 | Cierre de cartera, 6 sub-procesos (`CRD.CRCT`/`BDCC`/`ANCC`) | ✅ Cerrada. DDL en pruebas y producción |
| — | **Flag global de contabilidad CRD** (rubro 237) | ✅ **ENCENDIDO** por el usuario el 28-08 |
| — | `previsualizar` del cierre contra producción | ✅ Probado: da datos y los asientos cuadran D=H |

### Fase 3 — conectar el resto de procesos · **en curso**

Orden acordado, cada uno se reporta por separado:

| Sub-fase | Proceso | Estado |
|---|---|---|
| **3a** | **Petro (carga del archivo)** | ✅ **COMPLETA EN CÓDIGO** (BE y FE) — ver §1.1. Falta DDL + WAR + prueba real |
| 3b | Pagos manuales / cobros personales (§3.4 del levantamiento) | ⬜ Pendiente |
| 3c | Cruce de valores aportes ↔ préstamos (§3.5) | ⬜ Pendiente |
| 3d | Jubilación + pago de pensiones (§3.1) | ⬜ Pendiente |
| 3e | Seguros (§3.2-⑤) | ⬜ Pendiente, pedido por el usuario el 28-08 — ver el requerimiento de reembolso abajo |

> **Requerimiento para la fase 3e, dicho por el usuario el 2026-08-29 (no implementar antes):**
> cuando un **abono a capital acorta el plazo**, las cuotas que desaparecen tenían seguro de
> incendio previsto o ya cobrado. **La suma de esos valores debe alimentar el proceso de seguros
> para pedir el REEMBOLSO a la aseguradora.** El abono deja el dato calculable (cuánto seguro de
> incendio quedó liberado al acortar), pero el proceso de reembolso en sí **es trabajo de la fase
> 3e**, no del abono.

**Fase 3a, qué quedó construido (2026-08-28/29):**

| Pieza | Backend | Frontend |
|---|---|---|
| Paso 1 — transferencias + confirmación + reverso + estado contable | `CobroPetroContableService`, 6 endpoints en `AsoprepGenerales` | `cobro-petro-paso1` dentro de `detalle-consulta-carga`, probado en navegador de punta a punta |
| Paso 2a — asiento de REPARTO | `contabilizarReparto`, desglose desde `CRD.DTCA` agrupado por producto | — |
| Paso 2b — asiento de APLICACIÓN | `contabilizarAplicacion`; capital por banda vía `ClasificadorBandaService`, resto por plantilla 21 | — |

Dos decisiones de implementación que conviene no deshacer sin entender por qué están:
- **Las líneas de Debe se calculan como la SUMA de las de Haber ya armadas**, no como un total
  independiente: así el asiento cuadra D=H por construcción y no hace falta ajuste de centavos.
- **Falla fuerte** (`IncomeException`) si un pago no tiene producto, o si una banda no tiene cuenta
  en `CRD.BNDP`. Se prefirió abortar a generar un asiento que cuadra D=H pero por menos plata de la
  que se movió — el peor error posible aquí, porque no se nota.

**Reglas que aplican a todas:** gate de `contabilidadActiva()` antes de generar cualquier asiento;
cuentas de banda **siempre** desde `CRD.BNDP` vía `ClasificadorBandaService`, nunca cableadas; el
resto de cuentas por plantilla (`selectByAlterno` + `selectByPlantillaYAuxiliar` con el catálogo
semántico `CrdLineaAsiento`); todo asiento cuadra D=H.

### 1.1 Petro — el cobro va en DOS PASOS · decisión del usuario (28-08)

**Corrige lo que decía §3.3 del levantamiento**, que afirmaba que la cuenta transitoria ya no se
usaba. Es falso: **las plantillas 19/20 son correctas y no se tocan.** El orden real es *primero el
dinero, después la aplicación*:

| Paso | Cuándo | Asiento | Plantilla |
|---|---|---|---|
| 1 | **Contabilidad confirma que el dinero llegó al banco** | D Banco(s) → H `2.3.01.15.01` | alterno 19 |
| 2 | **Se procesa el archivo Petro** | D `2.3.01.15.01` → H `1.4.05.05`/`1.4.05.10`, y luego la aplicación a cuentas reales | alternos 20 y 21 |

El archivo Petro trae **aportes y cuotas de préstamo juntos**, en un mismo descuento de rol y una
misma transferencia — por eso las dos cuentas por cobrar se cancelan en el mismo asiento.

**El disparador del paso 1 ya estaba diseñado y nunca se conectó** (decisión: se reactiva, no se
inventa): el rubro 166 `ASPEstadoCargaArchivoPetro` define `3 APROBADO_CONTABILIDAD` y ninguna clase
lo usa; `CRD.CRAR` tiene mapeadas `CRARUSCC` (usuario contabilidad que confirma) y `CRARFCAC` (fecha
de autorización) sin que ninguna línea de código las escriba. Es un acto **explícito** de
contabilidad sobre la carga, no automático.

**DDL escrito por el orquestador, PENDIENTE DE EJECUTAR:**
`crd/sql/DDL-COBRO-PETRO-DOS-PASOS.sql` — crea `CRD.TRCR` (las N transferencias de una carga;
`CRARNMTF` sola no alcanza, es una y sin FK a cuenta bancaria) y `CRD.ANCP` (asiento por
sub-proceso, espejo de `CRD.ANCC`; `CRAR` no tiene ninguna columna de asiento).
⚠️ Requiere `GRANT REFERENCES ON TSR.BNCO/CNBC/BEXT TO CRD` **corrido como owner de TSR** — el rol
DBA no lo habilita solo.

> **`TSR.CobroTransferencia` (`TSR.CTRN`) quedó DESCARTADA como fuente del dato bancario.** Tiene los
> campos correctos, pero su javadoc dice *"es detalle de la entidad cobro"*: cuelga de `TSR.CBRO`,
> que arrastra `CierreCaja`, `CajaLogica`, `UsuarioPorCaja`, `Deposito` **y su propio `Asiento`**. Es
> el modelo de un cobro en ventanilla con cierre de caja, no el de una transferencia institucional
> mensual. **No volver a proponerla.**

**`crd/ACTUALIZACION-PLANTILLA-21-PETRO-APLICACION.md` — REVISADO Y APROBADO, sin ejecutar.**
Renumera auxiliares al catálogo semántico, corrige la errata de aux 36/37 (duplicaban `1.4.02.05`)
y agrega la línea faltante de `2.1.02.05.01` aportes jubilación, que la plantilla 21 **no tenía**.

### 1.2 Trazabilidad: de qué carga salió cada pago y cada aporte

El asiento de aplicación necesita saber qué pagos y aportes generó una carga. **`CRD.PGPR` no tenía
ninguna forma de decirlo** (FK a `PRST`/`DTPR`/`EVPR`, ninguna a `CRAR`; `PGAP` liga `APRT` con
`PGPR` pero tampoco conoce la carga; `PXCA` cuelga de `DTCA` pero nada la liga a `PGPR`/`APRT`).

**`sql/DDL-TRAZABILIDAD-CARGA-PETRO.sql`** agrega `CRARCDGO` (nullable + FK + índice) a `CRD.PGPR`
y `CRD.APRT`. Se descartó la alternativa de ir acumulando montos dentro del bucle de
`aplicarPagosArchivoPetro`: obliga a tocar el método más frágil del proyecto, no se puede
recalcular sin reprocesar el archivo, y sobre todo **si alguien agrega una rama al bucle y olvida
acumular, el asiento sale corto y cuadra igual D=H**.

> ⚠️ **`CRD.APRT` YA TENÍA trazabilidad: la columna `APRTIDAS` (`Aporte.idAsoprep`).** No es un
> campo muerto — la llena `crearNuevoAporte`, se pone en `NULL` para lo que no viene de carga, y
> **dos consultas vivas dependen de ella**: `selectByEntidadTipoYCarga` y `selectAporteAdelantado`,
> que la carga Petro usa para decidir si un aporte ya existe o si es adelanto de otra carga.
>
> **Decisión del usuario (2026-08-28): transición en dos tiempos, no se elige una de golpe.**
> `CRARCDGO` es la columna gobernada y se empieza a llenar; **el asiento sigue leyendo `APRTIDAS`**
> hasta que el backfill esté corrido y verificado — no se cambia el lector antes que el dato.
> `sql/78_BACKFILL_CRARCDGO_APORTES.sql` traslada lo histórico; es **copia, no "mover"**:
> `APRTIDAS` no se vacía, o esas dos consultas se rompen en silencio.
> El punto a migrar después está aislado en `AporteDaoServiceImpl.sumValorPorTipoAporteByCarga`.

> ⚠️ **Trampa de nombres:** `Aporte.idAsoprep` = código de la CARGA. `Prestamo.idAsoprep` = número
> de OPERACIÓN del préstamo en ASOPREP, que usan G46/G47/G48/G49 y CCPM y se valida único.
> **Mismo nombre de campo, significados sin relación.** Documentado en el javadoc de las dos.

---

## 1bis. Frente I — Certificados de partícipe (2026-08-29)

Seis certificados que se emitían a mano en Word, con la numeración llevada fuera del sistema. Se
emiten desde **"Impresión de certificados"** en `participe-dash`.

**Contrato congelado:** `crd/API-CERTIFICADOS-PARTICIPE.md` (espejado en `saaFE/docs/crd/`).
**DDL:** `crd/sql/DDL-CERTIFICADOS-CREDITO.sql` — tabla `CRD.CRTF` + rubros **243** y **244**.

### El hallazgo que definió el diseño

Se midió contra la base que **buena parte de lo que estos certificados afirman NO EXISTE en S.A.A.**:
viene de DELTA21. Las liquidaciones (`CRD.HPCS`) solo están desde 2024; de 3.351 partícipes cesantes
solo **338** tienen registrados los aportes de cesantía patronal que el certificado afirma; la fecha
de corte de la cuenta de pensión no existe en ninguna columna.

**Decisión del usuario:** el operador captura lo que falte, con precarga de lo que sí exista. Y por
eso **cada campo lleva su origen** — `SISTEMA`, `MANUAL_REQUERIDO` (el sistema no lo sabía) o
`MANUAL_EDITADO` (lo sabía y se lo corrigieron) — visible en pantalla y guardado con el certificado.
Quien firma tiene que ver qué está afirmando por su cuenta.

### Decisiones cerradas

| # | Decisión |
|---|---|
| 1 | **Serie única por año**, compartida entre los seis tipos. Verificado en los ejemplos reales: 067/075/084/099/111/118 de 2026 están intercalados entre tipos distintos |
| 2 | La fuente citada es **siempre "sistema S.A.A."** en los seis |
| 3 | Firmante, cargo y ciudad **parametrizables** (rubro 243). Cambiar de jefe de crédito es un `UPDATE`, no recompilar seis reportes |
| 4 | Los certificados 5 y 6 del Word son **un solo `.jrxml`** con la frase condicional |
| 5 | "No adeudar" tiene **dos variantes**: por crédito elegido y global |
| 6 | La **calidad del partícipe se propone, no se impone** — los dos ejemplos que dicen "jubilado" están como CESANTE en la base |
| 7 | **"Al día" bloquea la emisión**, no avisa. Hoy 422 entidades no calificarían |
| 8 | **Sin tratamiento** ("el señor"/"la señora"): `CRD.ENTD` no tiene sexo. Sí hay género en `CRD.EXTR`/`PRAS`/`PRSN`, pero se omitió antes que depender de una cobertura sin medir |
| 9 | `9 CANCELADO_POR_REVISAR` **no cuenta como cancelado** |

### Tres cosas que no se pueden "simplificar"

Están en el javadoc de `CertificadoServiceImpl` y aquí, porque quien las toque sin saber por qué
están rompe algo silencioso:

1. **Todo en una transacción**, y el número se toma **antes** del PDF (va impreso adentro). Si el
   PDF falla, la transacción revierte y el número **nunca existió** — sin huecos en la serie.
   Por eso **no se usa una secuencia de Oracle**: no reinicia por año y no participa del rollback.
2. **El `.jrxml` no puede consultar `CRD.CRTF`.** El llenado usa una conexión JDBC cruda que no ve
   la transacción abierta: leería una tabla sin la fila recién insertada. Todo va por parámetros.
3. **El rubro 243 no tiene fallback.** Si falta, la emisión falla con 422. Un fallback silencioso
   imprimiría un firmante cableado en un documento firmado, que es peor que no emitir.

---

## 1ter. Saneamiento de la carga Petro — 10 defectos (2026-08-29)

Documentado en `petro/REGLAS-CARGA-PETRO.md` §3.1b. **Ninguno de estos era el bug que se reportó**:
aparecieron todos tirando del hilo del `STATUS_MARKED_ROLLBACK` del 28-08.

**La regla, decisión del usuario:** *"si una sola parte del proceso da error, así sea pequeña, toda
la carga se detiene"*. Pero eso **no se cumplía**: había `catch` que atrapaban el error, lo
logueaban y seguían — con la transacción ya marcada rollback-only por el contenedor. El peor de los
dos mundos: ni se detenía limpiamente, ni funcionaba.

**Cuatro eran caminos de corrupción de datos vivos en producción:**

| Dónde | Qué podía pasar |
|---|---|
| `verificarYAplicarAfectacionesManualesTotales` | Fallando a mitad, devolvía "no había afectaciones" — mentira: algunas ya se aplicaron, y el llamador corría además el flujo normal encima. **Pago duplicado sobre la misma cuota** |
| `calcularSaldosRealesCuota` | Si fallaba la consulta a `PGPR`, usaba los valores originales de la cuota. Una cuota con pagos parciales **se volvía a cobrar entera** |
| `crearRegistroPago` | La cuota quedaba **PAGADA sin ningún `PagoPrestamo` detrás** — rompe el invariante "PGPR es la fuente de verdad" del que depende el resto del sistema |
| `crearRegistroPagoAporte` | Lo mismo del lado de aportes |

**Y uno peor, encontrado fuera del encargo:** en `almacenaRegistros` (Fase 1), si fallaba el
`INSERT` de un `ParticipeXCargaArchivo` se logueaba y se seguía. **Ese partícipe dejaba de existir
para la carga**: sin error, sin novedad, invisible para las fases 2 y 3. El archivo se procesaba
"sin errores" con gente perdida en el camino, y la única forma de enterarse era notar meses después
que a alguien nunca le descontaron. Los otros nueve dejan rastro auditable; **este no deja ninguno.**

**Más el parseo:** un monto mal formado se convertía en `$0` en silencio, pudiendo marcar EN MORA a
quien sí pagó. El `catch` correcto ya existía en el código y nunca se disparaba, porque
`parseDouble`/`parseLongSimple` se comían el `NumberFormatException`.

### ⚠️ La regla que hace que esto no se rompa: ausencia de dato ≠ error

Quitar un `catch` **no es borrarlo**. En este proyecto `selectById` usa `getSingleResult()`, así que
**una fila que no existe lanza excepción**. Sacarlos a lo bruto haría que una ausencia legítima
aborte la carga del mes entero — eso no sería "todo o nada", sería un sistema que no procesa nunca.

**Un dato que no está se maneja con un `if`; lo que aborta es que la operación falle.** Los diez se
verificaron caso por caso distinguiendo las dos cosas antes de tocarlos.

> **Al desplegar esto, esperar que alguna carga ABORTE donde antes "pasaba".** Eso es el
> comportamiento correcto, no una regresión: significa que había un error que hasta hoy se tragaba.
> El mensaje nuevo dice qué falló y sobre qué partícipe.

---

## 1quater. El saldo congelado del préstamo (2026-08-29)

**El defecto:** `CRD.PRST.PRSTSLTT` ("saldo total") tenía **un solo escritor en todo el backend**, y
era un método de la *vía alterna* que `REGLAS-CARGA-PETRO.md` §4 ya marcaba como *"parcialmente
implementada, no es el flujo productivo"*. El flujo real de aplicación de pagos nunca lo tocaba: para
la mayoría de los préstamos el valor **no estaba desactualizado, estaba congelado desde la
migración**.

**La magnitud, medida en el préstamo #67830:** el campo decía **$76.431,98**; el saldo real
reconstruido desde `CRD.PGPR` es **$163.698,46**. Más del doble.

**Dónde se leía, y por qué importaba:**

| Punto | Qué pasaba |
|---|---|
| **9 reportes de amortización** (`RPRT_TBLA_*`) | Se le entregan al socio. En la misma hoja mostraban sus cuotas marcadas PAGADA (en vivo) y un saldo total como si no hubiera pagado nada |
| `cruce-de-valores` (FE) | Mostraba el saldo crudo en tres lugares, incluido el tope de cuánto se puede asignar |
| **Diálogo de pagar cuota** (FE) | El atajo "Saldo total" llenaba el monto con el valor viejo **y se enviaba sin que el backend revalidara** — un cajero cobraba de menos y el sistema quedaba creyendo el préstamo cancelado |

**Lo corregido:** los 9 reportes (subconsulta única replicando `saldoTotalDe()` del frontend),
`cruce-de-valores`, el diálogo de pago, y **se quitó el escritor**. Los 9 `.jasper` los recompila el
usuario.

> **Por qué se quitó el escritor en vez de arreglarlo:** su cálculo estaba **mal etiquetado** —
> sumaba `DTPRSLCP` de las cuotas no pagadas, o sea capital, pese a llamarse "saldo total". Si esa
> vía alterna llegara a invocarse, no dejaría el campo viejo: lo sobrescribiría con un número
> **fresco pero calculado con el criterio equivocado**, y un valor recién actualizado inspira más
> confianza que uno obviamente viejo. **Solo se eliminó la persistencia**: la variable local sigue
> viva porque decide si el préstamo pasa a CANCELADO, y ese uso no tiene el defecto.

**La lógica quedó en un solo lugar por lado:** `crd/service/saldo-prestamo.service.ts` (frontend) y
la subconsulta replicada en los 9 `.jrxml`. Si alguna vez divergen, el reporte y la pantalla vuelven
a decir números distintos.

### ⚠️ Dos cosas que quedaron anotadas y NO corregidas

1. **`jubilar-participe.component.ts` decide con el saldo crudo.** `saldoTotalPrestamosActivos()`
   alimenta `faltantePagoCompleto()`, que es entrada directa de `puedeJubilar()` — el gate del botón
   "Confirmar jubilación". Con un saldo viejo podría habilitarlo creyendo los préstamos cubiertos sin
   estarlo. **Hoy no mueve nada porque `confirmarJubilacion()` es un stub** (`TODO(pendiente-backend)`,
   sin endpoint detrás). **Se vuelve peligroso exactamente el día que alguien conecte ese endpoint** —
   corregir el gate es parte de ese trabajo, no algo opcional.
2. **`PRSTVLCT` (valor de cuota), sospecha de baja confianza.** Los mismos 9 reportes lo muestran
   crudo. A diferencia del saldo, **sí parece mantenido** (se escribe al crear el préstamo, tras un
   abono a capital y en el proceso de pago) y no tiene comentarios de advertencia. No verificado a
   fondo; anotado por si alguien reporta un valor de cuota raro.

---

## 1quinquies. Frentes J y K (2026-08-29)

### J — Cobro múltiple: varios créditos en una operación

Un partícipe con varios créditos se cobraba de a uno, y al cambiar de crédito **se borraban los
montos ya cargados**. Decisión del usuario: **una sola confirmación y un solo comprobante** para
todos los pagos de la operación.

`POST /rest/prst/pagarMultiplesCuotas` — recibe una lista de las mismas `SolicitudPagoCuota` de
siempre y devuelve el desglose por préstamo más el total.

> **Todo o nada, y es gratis.** El método llama a `pagarCuota(...)` una vez por préstamo con un
> **self-call directo** (`this.`), no a través de una referencia inyectada del propio bean: así
> hereda la transacción abierta y si el tercer préstamo falla, no queda aplicado ninguno.
> ⚠️ **`ProcesoMoraPrestamoServiceImpl` hace lo CONTRARIO a propósito** — se auto-inyecta para
> pasar por el proxy y conseguir `REQUIRES_NEW` por préstamo. Con `REQUIRED` las dos formas se
> comportan igual hoy, pero si alguien cambiara `pagarCuota` a `REQUIRES_NEW`, la versión por
> proxy rompería la atomicidad **en silencio**. Hay un comentario en el código; no "mejorarlo".

Validaciones antes de aplicar el primer pago: sin repetidos, préstamos existentes, y **todos del
mismo partícipe** — un comprobante que mezcle socios sería un problema serio.

**Comprobante:** `RPRT_CMPB_PGCT` es de **una cuota** (query por `DTPRCDGO` escalar, cabecera para
mostrarse una vez); no sirve con más filas. Se hace **uno nuevo**, dejando el actual intacto porque
lo sigue usando el pago individual.

### K — Acuerdos de pago con condonación

Condonar valores de préstamos en mora o de plazo vencido: funciona como una precancelación, pero
perdonando parte de lo adeudado. **Diseño cerrado, código pausado** por prioridad del frente J.

| Decisión del usuario | |
|---|---|
| Pago único, aquí y ahora | No es un plan de cuotas |
| Se condona | Interés en mora, interés ordinario, capital |
| **Nunca** se condona | Desgravamen y seguro de incendio: se pagan al 100%, campo no editable, y su suma es el **piso** del monto a pagar |
| Aprobación | **Un segundo usuario aprueba**, y el dinero entra **después** de la aprobación |
| Lo condonado | Va a **una sola cuenta de gasto**, parametrizada en la plantilla **alterno 25** |
| Estado final del préstamo | **CANCELADO (3)**, sin estado nuevo |

> ⚠️ **Consecuencia del estado CANCELADO, y define el diseño de la tabla:** un préstamo condonado
> queda **indistinguible** de uno pagado normalmente para cualquier consulta que filtre por
> `PRSTIDST`. La tabla del acuerdo pasa a ser **la única fuente** para responder "cuánto se condonó,
> a quién y quién lo autorizó" — tiene que ser consultable de verdad (por fecha, partícipe, usuario
> que aprobó, con montos sumables por concepto), no un log que solo se lee de a una fila.

**Por qué esta operación sí necesita contabilidad real:** la precancelación condona montos
**prospectivos** (nunca reconocidos como cuenta por cobrar — no hay pérdida que registrar); el
acuerdo condona montos **ya devengados**, que están en los libros. Darlos de baja **es un castigo
contable**.

> **Corregido el 2026-08-29:** `ESPECIFICACION-SERVICIOS-PAGO-PRESTAMOS.md` §9.3 daba esto por
> bloqueado porque "ninguna entidad crd referencia `Empresa`". **Ya no es cierto** —
> `ConfiguracionBandaProducto` y `CorridaCierreCartera` la referencian. Y sobre todo:
> `CierreCarteraService`, el único que contabiliza de verdad, **recibe `idEmpresa` como parámetro**
> desde la pantalla. No hay problema genérico que resolver. La vía "Prestamo → Filial → Empresa"
> que se proponía **no existe**: `Filial` solo tiene código, nombre, alterno y estado.

---

## 2. Frentes A-G

### A. Devengo de aportes + Contratos-vigencias — **cerrado en código**

Plan: `crd/PLAN-APORTES-DEVENGO-CONTRATOS.md`. DDL ejecutado en pruebas y producción.

- **Backend:** 5/5 fases confirmadas.
- **Frontend:** 7/7 órdenes confirmadas con el protocolo §5 del plan (28-08).
- **Desvío `ContratoRest.porEntidad` (404 → 200-en-blanco): RESUELTO.** El FE ya lo maneja
  correctamente; verificado en vivo contra el backend real (entidad sin contrato devuelve 200 con
  `idContrato: null` y `vigencias: []`, y la pantalla lo renderiza con guiones).
- **Desvío `estadoTexto`: RESUELTO.** El backend lo devolvía sin que estuviera en el contrato §4.1;
  el FE ya lo consume.

### B. Devolución de aportes — **cerrado**

Plan: `crd/PLAN-DEVOLUCION-APORTES.md`. 9/9 fases, DDL en producción. `TPAPPRDP` sigue vacío a
propósito (decisión 24-08: sin contabilidad todavía).

> **Aviso del otro equipo:** `validaDisponibilidad` ya está activo en
> `PagoProgramadoServiceImpl.aprobar`, así que una devolución puede rechazarse con 400 al aprobarse
> si la cuenta elegida no tiene saldo contable. No es regresión.
> **Su aviso incluía un dato falso, corregido dos veces:** `idCuentaBancariaOrigen` **no** puede
> llegar nulo para `CRD_DEVOLUCION_APORTE` — está validado como obligatorio en
> `DevolucionAporteServiceImpl:211-213`, antes de la llamada a CXP (línea 513-515), y ese origen se
> crea desde un único punto en todo `crd`.

> **Anulación con cascada / 409 del otro equipo: no afecta a `crd`.** Verificado: `crd` no referencia
> `DocumentoCompra`/`DocumentoVenta` en ningún punto; solo registra y lee `PagoProgramado`.

### C. Fix del proceso diario de mora

Código terminado y verificado. Detalle técnico en `crd/ESTADO-TRABAJO-EN-CURSO.md` §3 y en
`crd/PROCESO-DIARIO-INTERES-MORA.md`. Limpieza de datos lista y sin correr:
`crd/LIMPIEZA-MORA-PLAZO-VENCIDO.md` (script `sql/77`), que **solo se corre después** de restituir
`PRSTIDST=8` y confirmar el fix desplegado.

### D. `Pais` fuera de `crd` — cerrado

⚠️ **Regla permanente: la tabla de países es `CRD.PSSS`, siempre. Nunca `SCP.PSSS`.** El paquete
(`com.saa.model.scp.Pais`) y el esquema no coinciden **a propósito**.

### E. Simuladores de préstamos — completo

`crd/PLAN-SIMULADORES-PRESTAMOS.md`. Los 3 `.jasper` compilados y commiteados.

### F. `saldoOtros` cancelados anticipados — **SUPERADO**

Documento del 12-08 sin ejecutar. **El usuario confirmó el 28-08 que quedó superado** por el trabajo
de saldo de capital de la segunda ola. No retomar sin que él lo pida.

### G. Segunda ola — `crd/PENDIENTES-SEGUNDA-OLA.md`

| Pedido | Estado |
|---|---|
| 2 — Desgravamen `capital × 1.12 / 1000` en simulación de crédito nuevo | ✅ **Ya estaba implementado**; el plan de simuladores quedó desactualizado frente al código |
| 3 — Signo `$` en reportes de simulaciones | ✅ **Ya estaba cubierto** por `formatearMoneda()` (`shared/utils/moneda.util.ts`) |
| 8 — Reestructuración no toma el capital de la mínima cuota no pagada | ✅ **Corregido** — reconstruye desde `CRD.PGPR` vía `calcularSaldoCapitalPendiente` |
| 6 — Saldo de capital en cobro con cuenta individual | ⏳ **Bloqueado: falta identificar el endpoint** que consume esa pantalla |
| Duplicados Petro (`sql/61`) | ✅ A0/A2/A6 corridos en local y producción; resultados revisados y **superados** |

---

## 3. Corregido el 2026-08-28 (todo sin desplegar salvo donde se indique)

| Defecto | Dónde | Nota |
|---|---|---|
| `UnrecognizedPropertyException` en cualquier PUT con `Entidad` anidada | `Entidad.java` | Getters `@Transient` sin setter (`ultimaActualizacion`/`usuarioUltimaActualizacion`). Rompía el cambio de estado de préstamos y cuotas |
| Mismo patrón | `GeneracionArchivoPetro.getNombreFilial()` | Setter no-operativo agregado |
| **Los simuladores ESCRIBÍAN en `CRD.DTPR`** | `AbonoCapitalPrestamoServiceImpl`, `ProcesoPagoPrestamoServiceImpl` | `calcularSaldosRealesCuota` autocorrige y persiste. Separado en `calcularSaldosCuota` (pura) + parámetro `soloLectura`. **Corrupción silenciosa de datos en cada previsualización** |
| La mora no se recalculaba a la fecha elegida en precancelación | `ProcesoMoraPrestamoServiceImpl` (métodos puros extraídos) + `ProcesoPagoPrestamoServiceImpl` | La pantalla prometía recalcular y leía el valor congelado de las 02:00 |
| Desgravamen ausente en la simulación de abono a capital | `AbonoCapitalPrestamoServiceImpl.construirTablaProyectada` | La vista previa no mostraba lo que después sí se aplicaba. FE agregó la columna |
| **`STATUS_MARKED_ROLLBACK` al generar el archivo Petro** | `ConfiguracionGeneracionAportesServiceImpl`, `ConfiguracionContabilidadServiceImpl` | `getSingleResult()` sin catálogo cargado → `NoResultException` en bean anidado `REQUIRED` → envenena la transacción compartida **antes** de que el `catch` la reciba. Resuelto con `@TransactionAttribute(REQUIRES_NEW)` |
| Estado de contrato sin catálogo propio | `EstadoContrato` (nuevo) + 4 puntos alineados | `ACTIVO=1`/`INACTIVO=0`, preparado para estados futuros. **El rubro 11 se evaluó y se descartó**: sus detalles son `1`/`2`, no `1`/`0` |

### Lección transversal, vale para todo lo que venga

Tres defectos de hoy son la misma familia: **una estructura existe pero nadie la llena, o el `catch`
no protege lo que parece**. Antes de asumir que un campo trae dato o que un `try/catch` aísla un
error en un proceso por lotes, verificarlo — `CRARNMTF`, `CRARUSCC`, `CRARFCAC`, el rubro 166 y el
`getSingleResult()` sin catálogo son todos el mismo patrón.

---

## 4. Tareas del usuario

### 🔴 Bloqueante

1. **Compilar y desplegar el WAR.** Hay ~8 correcciones escritas sin desplegar (§3). Bloquea además
   que el frontend verifique el desgravamen en vivo.
2. **Cargar el catálogo del rubro 242** — `crd/sql/70_CATALOGO_RUBRO_GENERACION_POR_FALTANTE.sql`.
   Sin él, el `getSingleResult()` sigue sin encontrar fila (el `REQUIRES_NEW` evita que envenene la
   transacción, pero el dato sigue faltando). Confirmar de paso que el rubro 237 esté cargado.
3. **Confirmar en el log real de producción** que la causa del `STATUS_MARKED_ROLLBACK` era la que
   se dedujo — el diagnóstico fue por trazado estático, no contra el error original (no había
   WildFly corriendo donde se investigó).

### 🟡 Decidible

4. **Pedido 6 (frente G):** confirmar qué endpoint consume la pantalla de cobro con cuenta
   individual, para poder diagnosticar el saldo de capital.

### ✅ Decisiones ya tomadas (2026-08-29) — no re-preguntar

- **Carga Petro: TODO O NADA.** Si una sola parte del proceso falla, por pequeña que sea, la carga
  entera se detiene. **No** se aplica `REQUIRES_NEW` a los puntos de `CargaArchivoPetroServiceImpl`.
  ✅ **APLICADO el 2026-08-29 — ver §1ter.** La convención de los DAO de devolver listas vacías **no
  cambia**: es a nivel de consulta, no de proceso.
- **Petro, orden del flujo — confirmado, sin cambios:** al cargar el archivo el dinero ya llegó. La
  confirmación de contabilidad (cuenta bancaria de tesorería + fecha + número de transferencia)
  dispara el asiento a la transitoria; recién después se procesa el archivo, que dispara los
  asientos de la transitoria a las cuentas finales. **Bloquear el procesamiento hasta la
  confirmación no genera demora operativa**, porque el dinero está antes que el archivo.

### ✅ Fase 3a — TODO EJECUTADO EN PRODUCCIÓN (2026-08-29)

| # | Qué | Estado |
|---|---|---|
| 1 | `crd/sql/DDL-COBRO-PETRO-DOS-PASOS.sql` + `GRANT REFERENCES` como owner de TSR | ✅ |
| 2 | `crd/sql/DDL-TRAZABILIDAD-CARGA-PETRO.sql` | ✅ |
| 3 | `crd/sql/79_ACTUALIZACION_PLANTILLA_21_PETRO.sql` | ✅ |
| 4 | Compilar y desplegar el WAR | ✅ |
| 5 | `crd/sql/78_BACKFILL_CRARCDGO_APORTES.sql` | ✅ |
| 6 | **Probar de punta a punta con una carga real** | 🔵 **EN CURSO** |

**Qué mirar en la prueba, por orden de gravedad si algo falla:**

1. **El asiento cuadra pero por menos plata de la que se movió.** Es el error que no se nota. El
   código está construido para que no pase (Debe = suma de los Haber ya armados, y falla fuerte si
   una banda no tiene cuenta), pero es lo primero que hay que contrastar contra el archivo.
2. **`contabilizarAplicacion` lee aportes por `APRTIDAS`, no por `CRARCDGO`** — transición
   deliberada, ver §1.2. Si los aportes salen en cero, mirar ahí antes que nada.
3. **La confirmación bloquea el procesamiento.** Si el dinero no entró todavía al banco, el archivo
   no se puede procesar: es el diseño, no un defecto — pero es la decisión operativa que sigue
   abierta (§4).
4. Con la contabilidad apagada todo corre igual **sin generar asientos**, y no avisa como error.

---

## 5. Decisiones cerradas — NO volver a proponerlas

1. `cnt`, `tsr` y `cxp` **nunca** dependen de `crd` (el sistema se comercializará sin `crd`).
   `crd → tsr/cxp/cnt` **sí** está permitido.
2. **`CRD.PSSS`, nunca `SCP.PSSS`.**
3. El cobro de Petro va **en dos pasos, con la transitoria `2.3.01.15.01`** (§1.1).
4. El disparador del paso 1 es un **acto explícito de contabilidad**, no automático.
5. **`TSR.CobroTransferencia` descartada** como fuente del dato bancario (§1.1).
6. El estado del contrato usa **`EstadoContrato`**, catálogo Java propio, no el rubro 11 ni el
   `Estado` genérico.
7. **Solo el capital se distribuye por bandas.** Intereses, mora y seguros van a cuentas propias.
8. **Las bandas se cortan por DÍAS** — orden expresa de la Superintendencia. La deriva de calendario
   (1, 1, 3, 6, 1) **no es un defecto**: no "arreglarla" nunca.
9. **No se cierra un mes sin su archivo Petro cargado** (control bloqueante, ya implementado).
10. La contabilidad de la devolución de aportes es **opcional** por ahora.
11. `CRD.APRT` es **append-only**: rechazo o reverso van como contra-movimiento, nunca borrando.
