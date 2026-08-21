# Plan de carga histórica y calibración — ASOPREP-FCPC 2026

**Fecha:** 2026-08-20 · **Decisión ratificada** · Sustituye a `SOLICITUD-INSUMOS-VERIFICACION-ENERO.md`,
que queda como registro de lo que se pidió.

> **Estado del módulo:** backend fases 0–9, frontend fases 0–7. Ver `ESTADO-RRHH.md`.
> **Los datos del cliente** están en `C:\Docs\Clientes\Asoprep\rrhh\REsumen` — leer esos siete
> `.md`, no los 35 originales, y leer `REF-06-inconsistencias.md` **antes** de citar una cifra.

---

## 1. Qué se hace, y por qué así

Se **calculan** enero a junio de 2026 en el sistema, mes a mes y en orden, comparando cada uno
contra el rol real y contra la planilla del IESS. Después, un simulacro completo de julio. Agosto
es el primer mes en producción.

**No se cargan los meses como datos.** La alternativa era volcar los seis roles tal cual y
calcular sólo julio; se descartó por dos razones:

1. **El motor no se verificaría nunca**, y julio pasaría a ser el primer y único mes de
   calibración — siendo el peor candidato de los siete: dos hojas de rol con 13,17 de diferencia,
   sin planilla del IESS en la carpeta, cuarto cambio de layout del año, y es el mes donde nacen
   los fondos de reserva y se pagan vacaciones acumuladas. Si julio no cuadra, no se sabría si es
   el motor o si es julio.
2. **Los acumulados con los que arranca julio los escribe `cerrarPeriodo`.** El décimo tercero
   acumulado, el avance de las cuotas, lo realizado del IR y el saldo de vacaciones salen de ahí.
   Si se fabrican a mano y hay un error, aparece en julio como una diferencia sin causa
   localizable. Calculándolos son internamente consistentes y vienen verificados seis veces.

El trabajo pesado —los saldos de apertura al 31-dic-2025— hay que hacerlo igual en los dos
caminos. Lo único que suma calcular es comparar cada mes contra su rol, que es justamente el
objetivo.

**Ningún mes es relleno.** Cada uno prueba algo que ningún otro prueba:

| Mes | Lo que prueba en exclusiva |
|---|---|
| Enero | Dos ingresos y dos salidas a mitad de mes, prorrateo, **dos finiquitos**, décimos mensualizados. Cuadra al centavo contra la planilla |
| Febrero | El mes limpio de 22 personas y el avance de la cuota de Calderón (14,42 → 14,33) |
| Marzo | Salidas dentro del período de prueba. Aquí **el sistema debe discrepar de la planilla** — es prueba a favor, no en contra |
| Abril | La adenda de Méndez Torres a mitad de historia (medio tiempo → tiempo completo, 01-04) y el pico de préstamos de Viteri |
| Mayo | El único prescindible. Sale gratis si abril salió |
| Junio | Nace el fondo de reserva —casi todos cumplen el año— y aparecen vacaciones pagadas con días. Es el mes que deja los acumulados con los que arranca julio |

---

## 2. Fase A — Apertura al 31-dic-2025

### 2.0 Los fixtures sintéticos salen de ASOPREP, no al revés

**Corregido el 2026-08-20.** La versión anterior de este apartado decía que la calibración iba en
una empresa aparte. **Es al revés, y el motivo es decisivo:**

**La historia de la calibración *es* la historia de producción.** Enero a junio dejan los
acumulados —décimos, vacaciones, cuotas, IR realizado— con los que agosto calcula. Si se
construyen en una empresa de trabajo, la empresa real llega a agosto sin historia y la primera
nómina en producción sale mal. Así que **enero a junio se calculan en la empresa ASOPREP de
verdad, la 1236**.

El problema es que hoy los fixtures sintéticos ya están ahí: el empleado PEREZ LOPEZ JUAN CARLOS
y los períodos 1 (enero, `CERRADO`), 22 (febrero) y 25 (marzo). **Salen ellos.**

- **La línea base de regresión no se pierde por moverla.** El caso de enero está documentado al
  detalle —los ocho renglones, los cuatro totales, la cabecera repartida y los tres delatores— en
  `GUIA-PRIMER-CALCULO.md` y en este ESTADO. Se puede reconstruir en una empresa de pruebas
  cuando se quiera, y por eso moverlo es barato.
- **Por qué no dejarlos conviviendo:** `RHH.PRDN` no tiene restricción de unicidad por
  empresa/año/mes —comprobado en el DDL—, así que nada impide que existan dos «enero de 2026» en
  la misma empresa. Nada revienta, pero cualquier consulta o informe que busque «el período de
  enero» queda ambiguo, y ese descuadre cuesta días de localizar.

**Cuestión abierta para el backend:** si un período en estado `CERRADO` con sus `ACMN` se puede
borrar por la vía normal, o hace falta SQL. Hay que saberlo antes de empezar, porque de eso
depende que la limpieza sea un trámite o un script.

### 2.1 Parámetros del año

`RHH.PRNM` para 2026, empresa ASOPREP:

| Campo | Valor | Fuente |
|---|---|---|
| `PRNMSBUU` | 482,00 | SBU 2026 (2025 fue 470,00) |
| `PRNMCNBS` | 821,80 | canasta básica 2026 |
| `PRNMAPPR` | 9,45 | |
| `PRNMAPPT` | 11,15 | |
| `PRNMIECE` | 0,50 | **junto con SECAP forman el «CCC 1 %» del cliente** |
| `PRNMSCAP` | 0,50 | |
| `PRNMFNRS` | 8,33 | |
| `PRNMTPGP` | 18,00 | rebaja de gastos personales |
| `PRNMDIAS` / `PRNMDANO` | 30 / 360 | el cliente prorratea a 30 días |
| `PRNMDIVC` | 15 | la provisión de vacaciones del rol es RMU ÷ 24 |

### 2.2 El personal

**24 personas** tuvieron relación laboral en algún momento entre enero y junio: los 20 activos a
junio, más Torres Chávez y Benítez Montes (salen en enero) y Castro Arce y Cevallos Alemán (salen
el 06-03). Todos con contrato, cargo, RMU y **las adendas con su fecha de vigencia** — la de
Méndez Torres del 01-04-2026 es la que prueba el cambio a mitad de historia.

Fuente: `REF-01-entidad-y-personal.md` §2 (nómina maestra) y §4 (movimientos y adendas).

**Régimen de décimos:** la columna P de `DATOS TRABAJADORES` es una **sola** bandera que gobierna
el décimo tercero y el cuarto juntos. Nuestro contrato tiene dos: se cargan iguales. Sólo tres
personas están en `MENSUAL` — Cossio, Manosalvas y Moscoso — y son exactamente las tres que
tienen `DM 13er.` y `DM 14to.` como ingreso en enero.

**Fondos de reserva:** el cliente confirmó que se pagan mensualmente por rol, salvo quien acumula
en el IESS. Al 31-dic-2025 no le corresponden a nadie y sólo nacen en junio (ver §2.3).

### 2.3 Saldos de apertura

| Concepto | Al 31-dic-2025 | De dónde sale |
|---|---|---|
| **Décimo tercero** | Un mes: el período nuevo arranca el 01-dic-2025 | `RMU vigente en diciembre ÷ 12` para los de régimen `ACUMULA`. La RMU de diciembre es la de `DATOS TRABAJADORES`, sin adendas posteriores |
| **Décimo cuarto** | Del 01-ago-2025 al 31-dic-2025 | **Derivable**: la columna `DIAS 2025` de la hoja de décimos, por `SBU 2025 (470) ÷ 360 × días` |
| **Fondos de reserva** | **Cero** | Nadie ingresó antes de junio de 2025, así que nadie cumplía doce meses antes de junio de 2026. Lo confirma que la columna `FONDO RESERVA` esté vacía de enero a mayo |
| **Vacaciones** | **Derivable — hueco cerrado el 2026-08-20** | El cliente confirmó que **nadie gozó vacaciones en 2025**. Ver la fórmula abajo |
| **Anticipos de sueldo** | **Sólo Calderón, 700,00 — hueco cerrado el 2026-08-20** | Es el único saldo de apertura. Los demás anticipos nacen dentro de la ventana. Ver abajo |
| **Préstamos IESS** | No llevan saldo | Son descuentos recurrentes con su NUT y su cuota mensual, que están mes a mes en `REF-03` §3 |
| **IR realizado** | **Cero** | La retención es cero para los 22 en los siete meses |

> **Vacaciones — hueco cerrado el 2026-08-20.** El cliente confirmó que **nadie gozó vacaciones
> durante 2025**. Como todo el personal ingresó en junio de 2025 o después, el saldo de apertura
> se calcula desde la fecha de ingreso y no hace falta que ASOPREP arme ninguna tabla:
>
> ```
> días acumulados al 31-dic-2025 = 15 / 360 × días transcurridos desde el ingreso
>                                = 1,25 días por mes de servicio
> valor                          = RMU ÷ 24 × meses de servicio
> ```
>
> Las dos expresiones son la misma cosa: 15 días de vacaciones al año equivalen a media
> remuneración, y por eso el rol provisiona `RMU ÷ 24` al mes. **Contar los días con la
> convención de 30 días por mes**, que es `PRNMDIAS` y es la que usa el motor; contarlos con el
> calendario real da diferencias de céntimos que después no se saben explicar.
>
> **Anticipos — hueco cerrado el 2026-08-20.** El cliente detalló los tres casos y **cuadran al
> centavo contra los roles**. Sólo uno es saldo de apertura:
>
> | Persona | Origen | Descuentos | ¿Apertura? |
> |---|---|---|---|
> | **Calderón Párraga** | 700,00 concedidos en **diciembre de 2025** | 350,00 en enero · 350,00 en febrero | **Sí — 700,00 al 31-dic-2025** |
> | **Calderón Párraga** | 269,52 concedidos en **febrero** | 269,52 en febrero | No: novedad de febrero |
> | **Pardo Calle** | 700,00 concedidos en **enero** | 350,00 en enero · 350,00 en febrero | No: novedad de enero |
> | **Zambrano Mieles** | 50,00 concedidos en **febrero** | 50,00 en febrero | No: novedad de febrero |
>
> Comprobación: enero `350 + 350 = 700,00` y febrero `(350 + 269,52) + 350 + 50 = 1 019,52`, que
> son exactamente los totales de la columna `ANTIC SUELD` de esos dos meses.
>
> **Con esto la apertura al 31-dic-2025 queda completa: no falta ningún dato del cliente.**
>
> **Política vigente desde febrero:** el anticipo se pide y se descuenta **dentro del mismo mes**,
> con tope en el sueldo. Es política del cliente, **no una regla que el sistema deba imponer** —
> tiene su propia excepción, junio— así que no se codifica ni se valida: el modelo de descuentos
> recurrentes soporta las dos formas y con eso basta.

---

## 3. Fase B — Calibración de enero a junio

### 3.1 El ciclo por mes

Para cada mes, en orden y sin saltarse ninguno:

1. Crear el período con `PRDNMODO = 1` (histórico: calcula y no contabiliza).
2. Registrar las novedades del mes: ingresos, salidas, adendas vigentes, anticipos y las cuotas
   de préstamo de ese período.
3. `calcular`.
4. **Comparar contra los cuatro controles del §3.2.**
5. Si cuadra: `aprobar` y `cerrar`. Si no cuadra: **no corregir el motor** — reportar primero
   cuál de los dos está mal y por qué. El rol de un cliente también puede estar mal, y en este
   caso ya sabemos de cuatro sitios donde lo está.
6. Comprobar que `cerrarPeriodo` escribió los `ACMN`.

**No se contabiliza ningún mes de enero a junio**: esos asientos ya están en los libros de
ASOPREP y volver a registrarlos no aporta nada.

### 3.2 Los cuatro controles

| # | Control | Contra qué |
|---|---|---|
| 1 | **Líquido a recibir**, total y por persona | La columna `LIQUIDO A RECIBIR` del rol, y el total de la hoja `DATOS TRANSFERENCIAS` |
| 2 | **`TOTAL IESS` por persona** = `NMNAAPPR + NMNAAPPT` | El `VALOR` de cada afiliado en la planilla del IESS. Es el **control independiente**: si cuadra, la base imponible del motor es correcta sin depender de que el rol esté bien |
| 3 | **Préstamos** por persona y NUT | El detalle de préstamo hipotecario y quirografario del IESS de ese período |
| 4 | **Total de ingresos y total de descuentos** | El rol — con la salvedad de las vacaciones de enero y febrero (§4.1) |

El control 2 es el que manda. El 1 puede cuadrar con el 4 mal si dos errores se compensan.

### 3.3 Valores esperados

| Mes | Trab. | Ingresos | Descuentos | **Líquido** | Masa planilla | Aporte 20,60 % | Valor Total IESS |
|---|---:|---:|---:|---:|---:|---:|---:|
| Enero | 22 | 21 053,86 | 4 576,93 | **16 476,92** | 21 129,66 | 4 352,72 | 4 564,01 |
| Febrero | 22 | 22 644,14 | 5 119,02 | **17 525,11** | 21 283,00 | 4 384,30 | 4 597,13 |
| Marzo | 20 | 20 793,33 | 3 202,22 | **17 591,12** | 21 283,00 ⚠ | 4 384,30 | 4 597,13 |
| Abril | 20 | 21 034,33 | 5 120,12 | **15 914,22** | 20 560,00 | 4 235,36 | 4 440,96 |
| Mayo | 20 | 21 034,33 | 4 999,13 | **16 035,21** | 20 560,00 | 4 235,36 | 4 440,96 |
| Junio | 20 | 21 116,57 | 5 299,13 | **15 817,44** | 20 560,00 | 4 235,36 | 4 440,96 |

> **Los seis meses releídos de los `.xlsb` el 2026-08-21.** Cada columna es la **suma de los
> valores por persona ya redondeados**, leída celda a celda del libro, no de las tablas de
> `REF-02`, que redondean cada fila hacia abajo en el medio centavo. Cambiaron el líquido de cinco
> de los seis meses y los descuentos de cuatro, siempre un centavo y siempre al alza. El líquido
> lleva segunda confirmación: coincide con el total de `DATOS TRANSFERENCIAS` de cada libro.
>
> **Ojo con el control 4: estas columnas no restan entre sí.** `21 053,86 − 4 576,93 = 16 476,93`
> y el líquido es 16 476,92. No es errata: el cliente redondea sólo al mostrar y nosotros por
> renglón. La causa —el medio centavo del aporte de Muñoz Santos— está en el §17 de `REF-06`.
> Lo que tiene que cuadrar es el **líquido**, y cuando no cuadre, el desvío es de un centavo.

Préstamos, para el control 3:

| Mes | Hipotecarios | Quirografarios (rol) | Quirografarios (IESS) |
|---|---:|---:|---:|
| Enero | 1 015,14 | 171,63 | 171,63 |
| Febrero | 1 015,13 | 186,33 | 186,33 |
| Marzo | 1 015,15 | 266,92 | 281,71 ⚠ |
| Abril | 1 015,14 | 687,05 | 701,84 ⚠ |
| Mayo | 1 015,14 | 171,25 | 171,25 |
| Junio | 1 015,14 | 171,15 | 171,15 |

El detalle por persona y por mes está en `REF-02` §7 y §8 y en `REF-03` §3.

### 3.4 Los dos meses donde el sistema debe discrepar

Son las dos ⚠ de arriba, y **una coincidencia sería el error**:

- **Marzo, masa salarial.** La planilla declara con 482,00 y 30 días a Castro Arce y a Cevallos
  Alemán, que salieron el 06-03. El sistema debe dar **20 319,00**, no 21 283,00. La diferencia
  de 964,00 es exactamente esas dos personas.
- **Marzo y abril, quirografarios.** El IESS siguió cobrando la cuota de Castro Arce (14,79) tras
  su salida. El sistema debe descontar sólo lo del rol; los 14,79 los asumió la empresa.

### 3.5 Los dos finiquitos de enero

Enero necesita la fase 8 — no es una fase tardía. Los dos casos tienen respuesta conocida:

**Torres Chávez Elizabeth (0602237265)** — salida 15-01-2026, **despido intempestivo** según el
acta del Ministerio del Trabajo 14807288ACF. Ingresó el 25-06-2025 con RMU 2 000,00.

| Concepto | Valor |
|---|---:|
| Indemnización por despido intempestivo (3 remuneraciones) | 6 000,00 |
| Remuneración pendiente de enero | 1 000,00 |
| Décima tercera | 83,33 |
| Décima cuarta | 20,08 |
| Vacaciones del último período | 547,50 |
| **Total ingresos** | **7 650,91** |
| Aporte IESS 9,45 % | 94,50 |
| **Neto** | **7 556,41** |

**El aporte se calcula sobre los 1 000,00 de sueldo pendiente, no sobre el total** —
indemnizaciones, décimos y vacaciones no son materia gravada. Es la trampa del caso.

Ojo con el motivo: `DATOS TRABAJADORES` dice `NOTIFICACION`, pero el acta del MDT —que es el
documento con valor legal— dice **despido intempestivo**, y por eso hay 6 000,00 de
indemnización. Gana el acta.

**Benítez Montes Guillermina (1714531405)** — renuncia el 16-01-2026, RMU 700,00, ingreso
01-10-2025. No hay acta en la carpeta, sólo la orden de pago del banco por **672,47**. Sirve para
cuadrar el neto, no el desglose.

---

## 4. Las trampas de estos datos

### 4.1 Vacaciones como ingreso *y* descuento, en enero y febrero

En esos dos meses todos tienen `I:VACACIONES` = `D:VACACIONES` = RMU ÷ 24 — 823,19 en cada lado
en enero. Es presentación de la provisión: netea a cero. El líquido cuadra igual, pero **los
totales del control 4 no**, si el motor no reproduce el par. Desde marzo desaparece de las dos
secciones; en junio vuelve como vacaciones reales pagadas, con su columna de días.

Pendiente de confirmar con el cliente si es sólo presentación. Mientras tanto, para el control 4
de enero y febrero se comparan los totales **restando 823,19 y 886,80** respectivamente de ambos
lados.

### 4.2 La RMU de Méndez Torres

`DATOS TRABAJADORES` dice 235,00; el rol y la planilla del IESS dicen **241,00 sobre 15 días** en
enero, febrero y marzo. 235 es la mitad del SBU de 2025 y quedó sin actualizar. **Se carga como
RMU 482,00 con jornada de 15 días**, y desde el 01-04-2026 pasa a tiempo completo por adenda.

### 4.3 La cédula de Bravo Caiza

En las ocho hojas de rol y en el archivo de impuesto a la renta figura como `1714531405`, que es
la de Benítez Montes, a quien reemplazó. **La correcta es `2150051205`**, confirmada por su aviso
de entrada al IESS, por `DATOS TRABAJADORES`, por las transferencias y por las planillas. Se carga
la correcta, y el cruce por cédula contra las tablas de `REF-02` falla sólo para ella.

### 4.4 El IR: cero en el rol, pero no porque no corresponda

**Corregido el 2026-08-20, después del primer contraste de enero.** La versión anterior de este
apartado decía «el IR no se ejercita». Era falso: el motor **sí** retuvo a siete personas en
enero —310,64 en total— porque con sueldos de 1 500 a 2 200 la proyección anual supera la
fracción básica. El cliente no retiene a nadie, y el contraste lo destapó como la causa dominante
de los 266,04 de diferencia en el líquido.

**Por qué el cliente no retiene — dos razones distintas:**

- **Seis declararon gastos personales** en el archivo de renta (`REF-04` §1.4) y su rebaja del
  18 % anula el impuesto: Viteri, Manosalvas, Moscoso, Pazmiño Jaramillo, Rodríguez Zambrano y
  Cevallos Montenegro. **Nadie los cargó en `GSPR`**: hueco del guion de apertura, cerrado por el
  script 34. Viteri además declara una carga, que le sube el tope de 5 752,60 a 7 396,20.
- **Robayo no declaró gastos y sí le corresponde retención** —242,00 al año— pero el cliente la
  arranca **en agosto**, al recalcular a mitad de año. Eso es política del cliente, no dato que
  falte: el contraste va a seguir mostrando 20,17 en Robayo todos los meses **y es correcto que lo
  muestre**. Pregunta abierta a Steven: si retiene desde el anexo o desde enero.

**Cómo funciona el motor, que no es obvio:** la retención mensual se lee de `PYIR`, una
proyección persistida y marcada vigente. Si no existe, se genera en línea. Como enero ya se había
calculado, las siete proyecciones existían sin gastos; el script 34 las invalida para que el
recálculo las regenere leyendo `GSPR`.

Así que **el IR sí se ejercita**, y más de lo que se pensaba: prueba que la rebaja por gastos
anula la retención en seis personas distintas, con una carga familiar de por medio, y que a la
séptima la retiene.

### 4.4b Las diferencias de ±0,01 que salen todos los meses

El contraste de enero mostró dos, y van a repetirse:

- **Muñoz Santos, aporte personal: 51,98 contra 51,97.** `550 × 9,45 % = 51,975`. Nosotros
  redondeamos medio-arriba; el cliente, medio-abajo.
- **Méndez Torres, `TOTAL IESS`: 49,64 contra 49,65.** `241 × 20,60 % = 49,646`. La planilla
  redondea la suma; nosotros sumamos dos partes ya redondeadas (`22,77 + 26,87`).

Es la regla 4 —redondear por renglón frente a redondear el total— vista desde el otro lado. Sale
en quien caiga en un medio centavo exacto y **no se ajusta**: un centavo por persona no es
defecto, y perseguirlo sería tocar el redondeo del motor para igualar una planilla de Excel.

### 4.4c La convención de días de los que entran a mitad de mes

**Primera divergencia real del motor, atribuida por tres fuentes.** Para quien ingresa el día
`d`, el motor calcula `días = 30 × (31 − d + 1) / 31` —la fracción de mes calendario—; el
cliente cuenta `30 − d + 1` sobre un mes de 30. Bravo Caiza: 16,4516 días y 383,87 contra
16 días y 373,33. Cevallos Montenegro: 12,5806 y 838,71 contra 12 y 800,00.

**La del cliente es la correcta**, y no hay que preguntárselo: la planilla del IESS declara
exactamente 373,33 y 800,00, y el acta de Torres Chávez usa la misma convención por el lado de
la salida (1 al 15 = 15 días = 1 000,00). Son 49,25 de sueldo de más y 4,67 de aporte de más.

Está en `ProcesoNominaServiceImpl`, que sigue congelado. **Se corrige al final de la
calibración, junto con lo demás del motor**, porque cambiar el prorrateo a mitad de los seis
meses dejaría enero y marzo calculados con reglas distintas. Hasta entonces, cada mes con un
ingreso o una salida a mitad de período va a mostrar esta diferencia en esas personas.

### 4.5 Cuatro layouts distintos

El rol cambia de columnas cuatro veces en el año (`REF-02` §2). Y en las tablas del §7 de ese
mismo archivo, **en enero y febrero las columnas `RMU` y `Días` están invertidas**: el 30,00 es
días y el 700,00 es la RMU. **Desde marzo el orden es el correcto** —`700,00 | 30,00`—, porque
cambia el layout de la hoja. Comprobado en las cuatro variantes; no dar por buena la posición sin
mirar la fila. Para los centavos, trabajar contra el `.xlsb`, que el markdown redondea por fila.

### 4.6 El ajuste de 0,10 de Calderón en junio y julio

En esos dos meses su líquido es **exactamente cero**, y para llegar ahí el rol lleva un `OTROS`
de 0,10 — como **descuento** en junio (`66,15 + 13,94 + 619,81 + 0,10 = 700,00`) y como
**ingreso** en julio (`700,00 + 0,10 = 700,10`, con anticipo 620,10). Es un ajuste manual para
cuadrar el redondeo del anticipo contra el neto disponible.

**El motor no va a producir esa línea**, y no debe: aparecerá como una diferencia de 0,10 en dos
meses. Reconocerla y seguir; no es un defecto.

Lectura de los anticipos de junio y julio, para el simulacro: los importes difieren entre los dos
meses (619,81 y 620,10) y cada uno agota justo el neto del mes, lo que apunta a **un anticipo
nuevo cada mes dimensionado al disponible**, no a uno solo amortizado en cuotas —que daría cuotas
iguales—. Si fuera lo segundo, el cierre de junio tendría que dejar saldo. **Confirmarlo con el
cliente antes del simulacro de julio**; no bloquea la calibración de enero a junio.

---

## 5. Fase C — Simulacro de julio

Julio **no** se calibra contra el IESS: no hay planilla del período 07 en la carpeta. Su valor es
otro — es el ensayo general de la operación completa, con datos reales, antes de depender del
sistema.

1. Calcular julio y comparar contra **`ROL JULIO CORREGIDO`** (descuentos 5 211,78, líquido
   16 270,53), **no** contra `ROL JULIO PAGADO`. Si el motor reproduce el corregido, encontró por
   su cuenta los mismos **13,17** de aporte personal subdescontado que encontró el cliente
   — Caiza 1,52 · Calderón 2,83 · Cevallos 8,82. Sería el mejor resultado posible de todo el
   ejercicio.
2. Recorrer la cadena entera: `aprobar` → orden de pago → archivo bancario.
3. **`previsualizarAsiento`, sin contabilizar.** Revisar el asiento línea por línea buscando la
   **cuenta marcadora 9678**: si aparece, hay conceptos sin línea de plantilla y lo sabemos en
   julio, no en agosto. Sin esto, la contabilidad de nómina se estrenaría en producción, que es
   la parte más frágil del módulo.
4. No transferir y no contabilizar.

Si el cliente manda su asiento contable de julio, se contrasta contra el previsualizado.

---

## 6. Fase D — Agosto en producción

Primer mes con `PRDNMODO` normal y contabilización real. Para entonces:

- Seis meses cerrados con sus acumulados escritos por el motor.
- El plan de cuentas y las líneas de plantilla verificadas en el simulacro.
- El formato real del archivo bancario cargado en `FMBN`/`DFMB`.
- Agosto es además el mes en que arranca la retención de Robayo (48,40), así que es la primera
  vez que el IR se ejercita de verdad. Vale la pena mirarlo.

---

## 7. Comprobaciones al terminar la carga

- **`escribeAcumulado` no graba ceros**, así que un mes en cero y un mes nunca cerrado se ven
  igual. Al terminar hay que comprobar que **los seis meses tienen filas de `ACMN` tipo 10 con el
  mismo número de empleados** — el tipo 10 es el centinela.
- Ningún período en estado distinto de `CERRADO` (7).
- Ninguna `NMNA` con `NMNATTPT` nulo.

---

## 8. Qué falta y a quién le toca

| Quién | Qué |
|---|---|
| **Cliente** | **Nada para la apertura: está completa.** Quedan dos cosas menores, sólo para el simulacro de julio — la planilla del IESS del período 07, y confirmar si los anticipos de junio y julio de Calderón son uno por mes o uno amortizado (§4.6) |
| **Frontend** | **Fase 8 (liquidación)**, que enero ya necesita, y las pantallas de migración de saldos de apertura |
| **Backend** | El resto del barrido de `NOT NULL`, y la prueba del sintético de marcaciones cuando se publique la corrección de `CargaMarcacionesRest` |
| **Dueño del modelo** | El guion de carga de la apertura, cuando se cierren los dos huecos del cliente |
