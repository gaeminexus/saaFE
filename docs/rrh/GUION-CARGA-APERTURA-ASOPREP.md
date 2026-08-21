# Guion de carga de la apertura — ASOPREP-FCPC al 31-dic-2025

**Fecha:** 2026-08-20 · **Fase A** de `PLAN-CARGA-HISTORICA-ASOPREP.md` · Empresa **1236**

> **Requisito previo:** `sql/20_LIMPIEZA_FIXTURES_SINTETICOS.sql` corrido y verificado en cero.
> La carga arranca sobre una empresa sin fixtures.

---

## 1. Qué se carga, y en qué orden

| # | Qué | Cuántos | Fuente |
|---|---|---|---|
| 1 | Parámetros de nómina 2026 | 1 | §2.1 del plan |
| 2 | Empleados y contratos vigentes al 31-dic-2025 | **22** | §3 de este guion |
| 3 | Adendas anteriores al 31-dic-2025 | 4 | §4 |
| 4 | Saldos de apertura al 31-dic-2025 | 22 × 3 conceptos | §3 |
| 5 | Anticipo de Calderón | 1 | §5 |
| 6 | Movimientos de enero: 2 ingresos, 2 salidas | 4 | §5 |
| 7 | Cuotas de préstamo IESS de enero | 5 | `REF-03` §3 |

**Son 22 personas, no 24.** Bravo Caiza (ingresa 15-01-2026) y Cevallos Montenegro (19-01-2026)
**no existen al 31-dic-2025**: entran como movimientos de enero, no como apertura. Cargarlos en la
apertura duplicaría su costo. La comprobación de que el corte es correcto: la planilla del IESS de
enero declara **24 afiliados** = las 22 de la apertura + los 2 que entran, y de esas 22, dos
—Torres Chávez y Benítez Montes— salen dentro del mes.

---

## 2. La carga va por SQL, y los campos de catálogo que lleva

**Confirmado:** `EmpleadoServiceImpl.saveSingle` y `ContratoEmpleadoServiceImpl.saveSingle` son
`dao.save(...)` y nada más. Ni `SLDV`, ni acumulados, ni ninguna fila en otra tabla — las
vacaciones se acreditan por un proceso aparte. Así que el `INSERT` directo es equivalente a pasar
por el servicio, y transcribir 22 empleados a mano en formularios sólo añadiría errores de dígito.

**Las pantallas se usan al final para revisar.** Abrir la ficha de **Méndez Torres** (media
jornada), **Torres Chávez** (la adenda de julio) y **Manosalvas** (mensualizado con dos préstamos)
cubre casi todas las banderas. Un dato que no se ve en pantalla no está cargado, aunque esté en la
tabla.

### Los valores de catálogo, leídos del `@Column` y del script 06

| Columna | Valor | ¿Afecta al cálculo? |
|---|---|---|
| `MPLDESTD` | **1** ACTIVO (rubro 185) | **Sí, crítico.** Un 4 deja al empleado `CESANTE` y el motor lo excluye **sin decir nada** |
| `MPLDRGNN` | **1** Sierra y Amazonía (rubro 187) | Sí — decide el período del décimo cuarto |
| `TPCECDGO` | **1** Indefinido tiempo completo | Sí — FK obligatoria. Es la única fila de `TPCE` |
| `CNTETPRL` | **1** Indefinido tiempo completo (rubro 186) | **Sí** — de él depende la rama del prorrateo |
| `CNTEDCTM` | **1** mensualizado / **2** acumulado (rubro 188) | Sí |
| `CNTEDCCM` | **1** mensualizado / **2** acumulado (rubro 189) | Sí |
| `CNTEFRMD` | **1** mensualizado / **2** acumulado en IESS (rubro 190) | Sí, desde junio |
| `CNTEDCMS` | **`'S'`** para los 22 | **Sí, crítico.** Se lee con `SI.equals(...)`: nulo o vacío **apaga el décimo cuarto sin error ni aviso** |
| `CNTEAPRT` | **`'S'`** | Sí. No es rubro, es `VARCHAR2(1)` |
| `CNTERTFN` | **`'N'`** | Sí. El `'S'` es sólo para servicios profesionales, que no entran aquí |
| `CNTEESTD` | **`'ACTIVO'`** | Sí — es texto, no rubro, y el filtro compara la cadena exacta |
| `CNTEJRND` | **1**, o **2** en Méndez (rubro 210) | **No: no lo lee nadie.** Descriptivo |
| `CNTEHRSM` | 40, o 20 en Méndez | No con jornada completa |

**Tres reglas para escribir ese `INSERT`**, que salieron de errores ya pagados:

1. **No nombrar las columnas `*FCHR`.** El sellado de auditoría vive en `EntityDaoImpl`, así que
   por SQL no ocurre; omitirlas deja entrar el `DEFAULT SYSDATE`, y nombrarlas con nulo explícito
   revienta con `ORA-02290`.
2. **Nada valida los rubros por SQL.** Por pantalla los combos acotan; aquí no hay red. Las dos
   marcadas como críticas arriba fallan **en silencio**, que es el peor modo posible en una carga.
3. **Los nombres de columna se leen del `@Column`, nunca del patrón de nomenclatura.** Dos de los
   ocho primeros que se dieron de memoria —`CNTED3MD` y `CNTED4MD`— no existen.

---

## 3. La apertura al 31-dic-2025

**La convención está validada contra un documento legal, no elegida.** Meses de 30 días y año de
360 (`PRNMDIAS`/`PRNMDANO`), y dos precisiones que no son obvias y que las dos hacen falta:

1. **Los días se cuentan inclusive.** Del 25 al 30 de junio son **6** días, no 5.
2. **Cada tramo se valora con la remuneración vigente en ese tramo**, no con la última. A quien
   tuvo una adenda, el período anterior se le paga al sueldo anterior.

**La prueba, y cierra al centavo.** El acta del Ministerio del Trabajo de Torres Chávez liquida
**547,50** de vacaciones al 15-ene-2026:

```
25-jun a 30-jun-2025, RMU 700    ·   6 días  ·  700 × 6/720     =    5,83
01-jul-2025 a 15-ene-2026, RMU 2 000 · 195 días · 2 000 × 195/720 =  541,67
                                                          TOTAL  =  547,50
```

Y encaja con lo que el cliente explicó sobre las salidas a mitad de mes —los días trabajados se
pagan como sueldo normal y el finiquito corre hasta la fecha de salida—: la acumulación no se
corta a fin del mes anterior, sigue continua. El saldo de apertura de Torres Chávez en la tabla de
abajo es **505,83**, y `505,83 + 41,67` de los quince días de enero da los 547,50 del acta.

> Las tres convenciones que se probaron primero —`RMU ÷ 24` por mes con días exclusivos, 365 días
> reales, y 15 días sobre la última remuneración— daban 555,56 y 558,90. **Ninguna de las tres
> era correcta**, y la diferencia de ocho a once dólares no se habría explicado nunca sin el acta.

Décimo cuarto sobre el **SBU de 2025 (470,00)**, porque el período corre desde el 1-ago-2025.
Décimo tercero sólo el mes de diciembre de 2025, y **sólo para régimen `ACUMULA`** — a los
mensualizados se les pagó con el rol de diciembre.

**Fondos de reserva: saldo cero para todos**, sin excepción. Nadie ingresó antes de junio de 2025.

### La modalidad de fondos de reserva — deducida, no confirmada

El cliente no contestó, así que se deduce de sus propios documentos. **Dos evidencias
independientes apuntan a lo mismo:**

1. De los seis que cobran fondos de reserva en el rol, **sólo a Viteri se le descuenta** el mismo
   importe que se le acredita —183,26 de ingreso y 183,26 de descuento, neto cero—. Acreditar y
   descontar es cómo el rol representa «se remite al IESS».
2. La única planilla de fondos de reserva de la carpeta, período 2026-06, **declara sólo a
   Viteri**: 30,54, que es el 8,33 % de 366,67 — y 366,67 son 2 200 × 5/30, sus cinco días de
   junio desde que cumplió el año el 25.

Y encaja con el correo de Steven: *«la empresa realiza el pago de forma mensual mediante rol de
pagos; para aquellos que optan por la acumulación en el IESS, los valores son reportados y pagados
mensualmente»*. La acumulación es la excepción.

| Persona | Evidencia | `CNTEFRMD` |
|---|---|---|
| VITERI LOPEZ JIMENA DEL PILAR | FR como ingreso **y** descuento · única en la planilla de FR | **2 — Acumulado en el IESS** |
| BARCENAS · MUÑOZ SANTOS · NIETO CONDE · PARDO CALLE · RODRIGUEZ VALENCIA | FR sólo como ingreso · ausentes de la planilla | **1 — Mensualizado** |
| Los otros 16 | **Sin evidencia**: ninguno cumple doce meses dentro de la ventana | **1 — Mensualizado**, por la política declarada |

> **El límite de esta deducción, y por qué se puede asumir.** Para los dieciséis no hay ninguna
> observación: el fondo de reserva nace al cumplir doce meses y ninguno los cumple antes de agosto
> de 2026, así que su modalidad **no toca un solo centavo de enero a junio**. Si alguno resulta
> ser acumulado, se corrige con un `UPDATE` cuando el cliente lo diga y no hay que recalcular
> nada. Los seis que sí importan están deducidos de evidencia directa, no de la política.
>
> Esto **no es un dato confirmado por el cliente**. Que conste así por si un día alguien lo cita.

**Los `RMU dic` de Nieto, Pardo, Torres y Viteri son los posteriores a su adenda; sus vacaciones
van calculadas por tramos** con el sueldo de cada período, que es lo que el acta valida.

| Cédula | Apellidos y nombres | Ingreso | RMU dic-2025 | Décimos | Vac. días | Vac. valor | D14 días | D14 valor | D13 valor |
|---|---|---|---:|---|---:|---:|---:|---:|---:|
| 1717991341 | BARCENAS BERMEO DANIELA ROMINA | 2025-06-26 | 700,00 | ACUMULA | 185 | 179,86 | 150 | 195,83 | 58,33 |
| 1714531405 | BENITEZ MONTES GUILLERMINA NATASHA | 2025-10-01 | 700,00 | MENSUAL | 90 | 87,50 | 90 | 117,50 | 0,00 |
| 1753528379 | CAIZA REMACHE LIZETH ABIGAIL | 2025-10-06 | 470,00 | ACUMULA | 85 | 55,49 | 85 | 110,97 | 39,17 |
| 1719624809 | CALDERON PARRAGA LAURA CECILIA | 2025-10-16 | 700,00 | ACUMULA | 75 | 72,92 | 75 | 97,92 | 58,33 |
| 1720245735 | CASTRO ARCE LESLY MARICELA | 2025-12-08 | 470,00 | ACUMULA | 23 | 15,01 | 23 | 30,03 | 30,03 |
| 1716501778 | CEVALLOS ALEMAN EDGAR GIOVANNY | 2025-12-08 | 470,00 | ACUMULA | 23 | 15,01 | 23 | 30,03 | 30,03 |
| 1715156574 | COSSIO CAICEDO EIMY | 2025-10-06 | 700,00 | MENSUAL | 85 | 82,64 | 85 | 110,97 | 0,00 |
| 1750302984 | GARCIA VITERI WILLAM ALEXANDER | 2025-10-07 | 700,00 | ACUMULA | 84 | 81,67 | 84 | 109,67 | 58,33 |
| 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | 2025-08-06 | 2 000,00 | MENSUAL | 145 | 402,78 | 145 | 189,31 | 0,00 |
| 1004350904 | MENDEZ TORRES DIANA ALEJANDRA | 2025-10-14 | 235,00 | ACUMULA | 77 | 25,13 | 77 | 100,53 | 19,58 |
| 0103179537 | MOSCOSO NOVILLO DIANA CECILIA | 2025-10-13 | 1 546,00 | MENSUAL | 78 | 167,48 | 78 | 101,83 | 0,00 |
| 1717649873 | MUÑOZ SANTOS MARCELO ALEJANDRO | 2025-06-25 | 550,00 | ACUMULA | 186 | 142,08 | 150 | 195,83 | 45,83 |
| 1723962849 | NIETO CONDE KAROL POLETH | 2025-06-25 | 900,00 | ACUMULA | 186 | 237,50 | 150 | 195,83 | 75,00 |
| 1726657164 | PARDO CALLE KATHERINE GUISSELA | 2025-06-25 | 700,00 | ACUMULA | 186 | 170,17 | 150 | 195,83 | 58,33 |
| 0909917759 | PAZMIÑO JARAMILLO EDGAR ALBERTO | 2025-10-07 | 1 500,00 | ACUMULA | 84 | 175,00 | 84 | 109,67 | 125,00 |
| 2100192463 | PAZMIÑO MORENO DIANA CAROLINA | 2025-10-01 | 500,00 | ACUMULA | 90 | 62,50 | 90 | 117,50 | 41,67 |
| 1725996498 | ROBAYO RUEDA GABRIEL PATRICIO | 2025-10-02 | 1 500,00 | ACUMULA | 89 | 185,42 | 89 | 116,19 | 125,00 |
| 0801999855 | RODRIGUEZ VALENCIA NATALIA ADRIANA | 2025-07-16 | 700,00 | ACUMULA | 165 | 160,42 | 150 | 195,83 | 58,33 |
| 1712362720 | RODRIGUEZ ZAMBRANO LILIANA DE LAS MERCEDES | 2025-10-01 | 1 500,00 | ACUMULA | 90 | 187,50 | 90 | 117,50 | 125,00 |
| 0602237265 | TORRES CHAVEZ ELIZABETH MARIA | 2025-06-25 | 2 000,00 | MENSUAL | 186 | **505,83** | 150 | 195,83 | 0,00 |
| 1712232659 | VITERI LOPEZ JIMENA DEL PILAR | 2025-06-25 | 2 200,00 | ACUMULA | 186 | 566,67 | 150 | 195,83 | 183,33 |
| 1307779064 | ZAMBRANO MIELES TANYA GISSELA | 2025-10-06 | 500,00 | ACUMULA | 85 | 59,03 | 85 | 110,97 | 41,67 |
| | **TOTAL (22)** | | | | | **3 637,60** | | **2 941,42** | **1 172,97** |

> **Una fecha que hay que confirmar antes de cargar:** la adenda de **Nieto Conde** figura como
> **2025-07-16** en la nómina maestra de `REF-01` §2 y como **2025-07-01** en el listado de
> movimientos del §4. La tabla usa el 01, por coherencia con las otras tres del mismo mes. Con su
> salto de 1 500 a 900 la diferencia entre una fecha y otra son unos **12,50** en el saldo de
> vacaciones — poco, pero es de las cosas que después nadie sabe explicar. Está en el `.xlsb`.

### 3.1 ⚠ La convención de vacaciones no cuadra contra el acta, y hay que resolverlo antes

**El único punto de control real que existe la contradice.** El acta del Ministerio del Trabajo de
Torres Chávez liquida **547,50** de vacaciones al 15-ene-2026. Ninguna convención razonable
reproduce esa cifra:

| Convención | Resultado al 15-ene-2026 | Diferencia |
|---|---:|---:|
| 360 días, `RMU ÷ 24` por mes — la de esta tabla | 555,56 | +8,06 |
| 365 días reales (204), sobre 15 días de sueldo | 558,90 | +11,40 |
| 360 días sobre 15 días de sueldo | 555,56 | +8,06 |

**Qué significa y qué no.** No invalida la tabla: los saldos de apertura son consistentes entre sí
y con la provisión que el propio rol de ASOPREP hace cada mes (`RMU ÷ 24`, verificado en los siete
meses). Lo que dice es que **el finiquito de ASOPREP usa otra base de cálculo** — probablemente
una fecha de inicio distinta, o el sueldo anterior a la adenda para la parte previa a julio.

**Cómo se resuelve, y en este orden:**

1. **No se elige un número para que cuadre.** Se carga la tabla con la convención del motor
   —`PRNMDIVC` y `PRNMDANO`— porque es la que el sistema va a usar todos los meses.
2. **Enero lo destapa solo.** Al calcular el finiquito de Torres Chávez saldrá la diferencia, y
   ahí se decide cuál de los dos está mal, como con cualquier otro descuadre. Ocho dólares en una
   liquidación es una diferencia explicable, no un bloqueo.
3. **Si se quiere cerrarlo antes**, es una pregunta corta a Steven: cómo calculan las vacaciones
   de un finiquito y desde qué fecha.

---

## 4. Adendas anteriores al 31-dic-2025

Van **con su fecha de vigencia**, no como el sueldo actual. La RMU de la tabla de arriba ya es la
posterior a la adenda.

| Fecha | Persona | Cargo nuevo | RMU nueva |
|---|---|---|---:|
| 2025-07-01 | NIETO CONDE KAROL POLETH | Asistente Legal | 900,00 |
| 2025-07-01 | TORRES CHAVEZ ELIZABETH MARIA | Contadora | 2 000,00 |
| 2025-07-01 | VITERI LOPEZ JIMENA DEL PILAR | Jefa Financiera | 2 200,00 |
| 2025-10-01 | PARDO CALLE KATHERINE GUISSELA | Asistente Contable | 700,00 |

La quinta adenda —**Méndez Torres, 2026-04-01**, a tiempo completo con 482,00— **no va aquí**: es
un movimiento de abril y entra cuando se calcule ese mes. Es la que prueba el cambio de contrato a
mitad de historia.

---

## 5. Lo que cambia el 1 de enero, antes de calcular enero

**Subida del SBU: 470,00 → 482,00.** Afecta a quien esté en el básico:

| Persona | RMU dic-2025 | RMU ene-2026 |
|---|---:|---:|
| CAIZA REMACHE LIZETH ABIGAIL | 470,00 | **482,00** |
| CASTRO ARCE LESLY MARICELA | 470,00 | **482,00** |
| CEVALLOS ALEMAN EDGAR GIOVANNY | 470,00 | **482,00** |
| MENDEZ TORRES DIANA ALEJANDRA | 235,00 | **241,00** — ver abajo |

### ⚠ Méndez Torres: `CNTESLRB = 241,00`, no 482,00

**Corregido el 2026-08-20, leyendo el código.** Este guion decía antes «RMU 482,00 con jornada de
15 días». **Era falso, y le habría pagado el doble.**

`CNTEJRND` es descriptivo: **no lo lee nadie** en todo el backend, sólo existe el getter.
`calculaSueldoPeriodo` bifurca por `CNTETPRL`, y la única rama que reduce por jornada exige
`tipoRelacionLaboral = 5 POR_HORAS` junto con `valorHora` y `horasSemanales`. Con cualquier otro
valor cae al caso general: `salarioBase × díasTrabajados ÷ díasBase`. Con 482,00 y 30 días
trabajados, el motor le pagaría **482,00**.

> El comentario del código dice «Por horas o jornada parcial» pero la condición sólo comprueba
> `POR_HORAS`. El comentario promete algo que el código no hace — la misma familia que el
> `DTLLDISM` y el `CNTETPJR` que también resultaron ser comentarios obsoletos. **Aquí el que
> manda es el código.**

Se carga así:

| Columna | Valor | Por qué |
|---|---|---|
| `CNTESLRB` | **241,00** | La mitad del SBU 2026. Es lo que reportan el rol y la planilla |
| `CNTETPRL` | **1** | Como los otros 21. El 4 no reduce nada y el 5 exigiría `valorHora` |
| `CNTEJRND` | **2** PARCIAL PERMANENTE | Metadato descriptivo: correcto tenerlo, no cambia el cálculo |
| `CNTEHRSM` | 20 | Igual, descriptivo |

**Un descuadre esperado que no es un defecto:** `NMNADITR` le va a salir **30, no 15**.
`calculaDiasTrabajados` parte de `PRNMDIAS` y resta ausencias; no conoce la media jornada. **El
importe cuadra y el número de días no.** La planilla del IESS sí la declara con 15 días, así que
eso es un asunto de la salida oficial y se decide en la fase 9 — no lo produce el motor y no se
arregla forzando el sueldo.

**Movimientos de enero:**

| Fecha | Movimiento | Persona | Dato |
|---|---|---|---|
| 2026-01-15 | Salida — despido intempestivo | TORRES CHAVEZ ELIZABETH MARIA | Acta MDT 14807288ACF · neto 7 556,41 |
| 2026-01-15 | Ingreso | BRAVO CAIZA WENDI JULIANA (**2150051205**) | Jefe de Sucursal Coca · 700,00 |
| 2026-01-16 | Salida — renuncia | BENITEZ MONTES GUILLERMINA | Orden de pago 672,47 |
| 2026-01-19 | Ingreso | CEVALLOS MONTENEGRO JOHNNY STEVEN | Contador · 2 000,00 |

**La cédula de Bravo Caiza va como `2150051205`**, la del aviso de entrada al IESS. Las hojas de
rol la traen mal.

**Anticipos:** una sola fila de apertura, **Calderón Párraga, 700,00** concedidos en diciembre de
2025, con cuota de 350,00 para enero y febrero. Los de Pardo, Zambrano y el segundo de Calderón
nacen dentro de la ventana y entran como novedades del mes que corresponda.

**Cuotas de préstamo IESS de enero** (`REF-03` §3): hipotecarios Cossio 490,00 · Manosalvas 379,85
· Pazmiño Jaramillo 145,29; quirografarios Calderón 14,42 · Manosalvas 157,21. Cada uno con su NUT.

---

## 6. Comprobaciones antes de calcular enero

Todas tienen que dar el valor esperado. Si alguna falla, se corrige antes de seguir: un error de
apertura se propaga a los seis meses.

```sql
-- 1. Veintidos empleados con contrato vigente al 31-dic-2025.
SELECT COUNT(*) FROM RHH.CNTE c JOIN RHH.MPLD m ON m.MPLDCDGO = c.MPLDCDGO
 WHERE c.CNTEESTD = 'ACTIVO';                                   -- esperado 22

-- 2. La masa salarial de enero, ya con el SBU nuevo y antes de los ingresos
--    del mes, debe dar 20.319,00 + 1.373,33 de los dos que salen = 21.692,33
--    menos los dias no trabajados. El control fuerte es el 3.
SELECT SUM(CNTESLDO) FROM RHH.CNTE WHERE CNTEESTD = 'ACTIVO';

-- 3. Los tres saldos de apertura, contra los totales de la tabla del §3.
SELECT ACMNTIPO, COUNT(*) AS PERSONAS, ROUND(SUM(ACMNVLOR),2) AS TOTAL
  FROM RHH.ACMN WHERE ACMNANIO = 2025 GROUP BY ACMNTIPO ORDER BY ACMNTIPO;
-- esperado: vacaciones 3.637,60 · decimo cuarto 2.941,42 · decimo tercero 1.172,97

-- 4. Fondos de reserva: ninguna fila, para nadie.
SELECT COUNT(*) FROM RHH.ACMN WHERE ACMNANIO = 2025 AND ACMNVLOR > 0
   AND ACMNTIPO = <tipo de fondos de reserva>;                  -- esperado 0

-- 5. Nadie con cedula repetida, y Bravo Caiza con la buena.
SELECT MPLDCDLA, COUNT(*) FROM RHH.MPLD GROUP BY MPLDCDLA HAVING COUNT(*) > 1;
-- esperado: cero filas
```

**Y la comprobación que vale por todas: el líquido de enero debe dar 16 476,91**, con `TOTAL IESS`
cuadrando persona a persona contra la planilla. Está en el §3.3 del plan.

---

## 7. Lo que no se carga

- **Impuesto a la renta realizado:** cero. La retención es cero para los 22 en los siete meses.
- **Los tres contratistas por servicios profesionales** —Polít, Quinga y Ramírez, 6 326,20 al mes—
  **no son nómina.** No tienen contrato laboral, no aportan al IESS y se les retiene en la fuente.
  Van por CXP, no por RRHH, y no entran en ninguna comprobación de este guion.
- **Asistencia. Nada, y no es un atajo.** `H. EXTRAS` y `H. SUPLEMENTARIAS` están **en cero en los
  siete meses y en las ocho hojas de rol**. La calibración de enero a junio no necesita una sola
  marcación, ni consolidación, ni turno correcto: el rol no depende de la asistencia en ninguno
  de los seis meses. La asistencia entra en juego cuando ASOPREP empiece a pagar horas extra,
  que es después de la puesta en producción.

### El turno real, y un hueco del modelo que trae consigo

**El horario de ASOPREP es de 08:30 a 17:30 con una hora de almuerzo**, o sea **8 horas pagadas**.
El turno del script 19 se sembró como 08:00–17:00 para poder medir la franja nocturna del
sintético; hay que corregirlo antes de que la asistencia se use de verdad.

**Y ahí aparece el hueco: no hay dónde guardar el almuerzo.** `TRNO` tiene `TRNOENTR`, `TRNOSLDA`
y `TRNOMNTS`; `DTLL` tiene `DTLLENTR` y `DTLLSLDA`. Ninguna columna para el descanso. El motor
descuenta el almuerzo de las **marcaciones reales** —verificado: el día 05 del sintético descontó
59 minutos— pero la **jornada teórica** sale del intervalo del turno, que es bruto.

Con 08:30–17:30 la jornada teórica sería de 9 horas mientras el trabajador sólo puede acumular 8,
así que **nadie alcanzaría nunca su jornada y las horas suplementarias no empezarían a contar
hasta las 18:30** en lugar de las 17:30. Una hora de trabajo extra al día que no se pagaría.

**No bloquea la calibración** —no hay horas extra en ninguno de los seis meses— pero **bloquea el
pago de horas extra**, que es justo lo que ASOPREP va a empezar a hacer. Hay que resolverlo antes
de eso, y la decisión es del backend: si la jornada teórica debe salir del intervalo menos un
descanso parametrizado, hace falta una columna en `TRNO` o en `DTLL`. Escribirlo en Java sería la
regla 1 rota.
