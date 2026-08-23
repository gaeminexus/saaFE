# Guion de febrero de 2026 — réplica en producción

> **Dónde vive cada cosa:** los `.sql` que este guion cita viven **sólo** en
> `saaBE/docs/logica-negocio/rhh/sql/`. Los `.md` sí están espejados en `saaFE/docs/rrh/`.

**Para qué es este documento.** Reproducir febrero en otra base **siguiendo una lista**. Verificado
contra la corrida del 2026-08-21, que cerró con **diferencia cero** contra el rol del cliente.

> **Febrero es el mes tranquilo de los cinco.** Nadie entra, nadie sale, nadie cambia de ficha, y
> no hay ninguna novedad del IESS que declarar. Si algo se complica aquí, es que viene arrastrado
> de enero.

**Resultado que hay que obtener:** 22 nóminas · ingresos **21 757,34** · descuentos **4 232,23** ·
líquido **17 525,11** · patronal **2 585,89**. Cliente: 17 525,11. **Diferencia cero en el total.**

> **Diferencia cero en el total no quiere decir bloque 2 vacío.** El contraste sacará **46 filas**
> por persona, y las 46 son esperadas: 44 del par de vacaciones del rol y 2 de medio centavo. §8.

---

## 0. El orden

```
fichas → crear el período → novedades → calcular → aprobar → contabilizar rol → cerrar
```

Sin liquidaciones: febrero no tiene ninguna salida.

**«Validar» se puede pulsar sin miedo**: `validarPeriodo` sólo lee —comprueba que exista `PRNM` del
año, conceptos activos y contratos que se solapen— y no deja huella. **«Contabilizar rol» hay que
pulsarlo aunque no se contabilice nada**: en modo histórico no emite asiento y sólo mueve el estado
a CONTABILIZADO, y `cerrarPeriodo` **se niega** si el período no está en CONTABILIZADO o PAGADO.
**«Contabilizar provisiones» no se pulsa nunca**: ninguno de los cinco meses lo hizo.

---

## 1. Fichas: Méndez Torres sigue a media jornada

**Igual que en enero**, y por lo mismo: el motor lee el contrato vigente, y la adenda que la pasa a
tiempo completo es del **01-04**.

| Campo | Valor |
|---|---|
| `CNTESLRB` | **241,00** |
| `CNTEJRND` | **2** — parcial |
| `CNTEHRSM` | **20** |

Si viene de haber cerrado enero, ya está puesta y no hay que tocar nada. **`sql/49` no se ejecuta
hasta que enero, febrero y marzo estén cerrados.**

---

## 2. Crear el período — el paso que ningún guion traía

**Sin período no hay dónde registrar novedades**, y la pantalla de Novedades no dice qué falta:
enseña el desplegable vacío. Se crea desde `Períodos de nómina` → *Agregar Registro*.

| Campo | Valor para febrero |
|---|---|
| Año / Mes | **2026 / 2** |
| Fecha de inicio | **01-02-2026** |
| Fecha de fin | **28-02-2026** |
| Tipo de período | **MENSUAL** |
| Modo | **1 · HISTÓRICO SIN CONTABILIZAR** |

**Elegir bien el modo, pero NO rehacer el mes si se falla.** Este guion decía «el modo no se puede
corregir después sin rehacer el mes», y **es más caro de lo que hace falta** — verificado en fuente
el 2026-08-23: `getModo()` se lee en **exactamente dos sitios**, los dos `esHistorico()`, uno en
`contabilizarRol` (`ContabilizacionNominaServiceImpl:1128`) y otro en la regla de cierre
(`ProcesoNominaServiceImpl:673`). **`calcularPeriodo` no lo mira nunca.**

- **Si se detecta ANTES de contabilizar** —y la comprobación de rango de aquí abajo lo saca en la
  primera consulta—, el modo es una columna inerte: se corrige y se sigue. Nada de lo calculado
  depende de él. Corregirlo y **volver a correr la consulta de rango** para verlo en la base, no en
  la pantalla.
- **Sólo si ya se contabilizó en modo 2** hay daño de verdad, y no es el modo: es el **asiento
  contable que nació**. Ahí sí hay que deshacer.

En modo 2 el período exige asiento
contable y `contabilizarRol` se negaría; de enero a julio ninguno lleva contabilidad, porque ya la
hizo el cliente a mano.

### Cómo se teclean las fechas, y por qué importa más en febrero que en ningún mes

**El módulo usa dos formatos distintos según la pantalla**, y no hay ninguna pista en pantalla de
cuál toca:

| Pantalla | Formato |
|---|---|
| Diálogo de **períodos** | `dd/mm/yyyy` |
| **Finiquito**, campo *Fecha de salida* | `mm/dd/yyyy` |

**Y en el diálogo de períodos, equivocarse no da error: da la fecha de HOY** (defecto D15). El
control no se marca en rojo ni se queda vacío — se rellena solo con un valor plausible y el
formulario se ve perfectamente relleno.

> **Febrero es el mes donde ese fallo es invisible.** `01/02` y `02/01` son las dos fechas válidas:
> 1 de febrero y 2 de enero. No hay nada que parsee mal, así que ni siquiera salta la sustitución
> por la fecha de hoy — simplemente se crea el período equivocado. **Teclear y releer.**

### La comprobación del rango, inmediatamente después de guardar

Va **antes** de registrar la primera novedad. Con un rango que no sea el mes, `calcularPeriodo` no
revienta: calcula. Un período del 1 de enero al 21 de agosto habría dado **21 días a las 22
personas** y habría perdido a quien sale más tarde, sin un solo error en pantalla.

```sql
SELECT PRDNCDGO, PRDNANOO AS ANIO, PRDNMSEE AS MES, PRDNFCHI, PRDNFCHF,
       PRDNMODO AS MODO, PRDNTPNM AS TIPO, PRDNESTD AS ESTADO,
       CASE WHEN PRDNMODO IS NULL THEN '*** MODO NULO: CORREGIR ANTES DE CERRAR, NO BORRAR ***'
            WHEN PRDNMODO <> 1    THEN '*** MODO ' || PRDNMODO || ', NO ES HISTORICO: CORREGIR EN SITIO ***'
            WHEN PRDNTPNM <> 1    THEN '*** TIPO ' || PRDNTPNM || ', NO ES MENSUAL: CORREGIR EN SITIO ***'
            WHEN EXTRACT(MONTH FROM PRDNFCHI) = PRDNMSEE
             AND EXTRACT(MONTH FROM PRDNFCHF) = PRDNMSEE
             AND EXTRACT(YEAR  FROM PRDNFCHI) = PRDNANOO
             AND EXTRACT(YEAR  FROM PRDNFCHF) = PRDNANOO
            THEN 'OK'
            ELSE '*** RANGO MALO: BORRAR EL PERIODO Y REHACERLO ***' END AS VEREDICTO
  FROM RHH.PRDN
 WHERE PRDNANOO = 2026
 ORDER BY PRDNMSEE;
```

**Los cuatro veredictos no se arreglan igual, y confundirlos cuesta el mes entero:**

- **`RANGO MALO`** → **borrar el período y crearlo de nuevo**, no editar las fechas: si ya se
  calculó algo sobre el rango malo, la edición deja nóminas de un rango y cabecera de otro.
- **`MODO NULO` o `MODO n`** → **corregir en sitio, no borrar nada.** `calcularPeriodo` no lee el
  modo, así que no hay nada calculado que dependa de él. Se corrige y se vuelve a correr esta
  consulta. Sólo hay daño si ya se contabilizó en modo 2, y entonces el problema es el asiento.
- **`TIPO n`** → **corregir en sitio, no borrar nada**, igual que el modo. Y anotarlo: **`PRDNTPNM` no lo lee NADIE** —verificado el 2026-08-23: `getTipoPeriodo()` no tiene un solo llamador—, así que un tipo equivocado **no cambia ni una cifra y no bloquea ningún paso**. Por eso es el más traicionero de los tres: el modo al menos muerde al cerrar, y el rango descuadra los días; **el tipo se quedaría mal para siempre en el registro y nada lo notaría jamás**. En una carga histórica, que es el archivo permanente del cliente, un período mensual rotulado QUINCENAL es un dato falso sin ningún control detrás.

### El combo de Período no se llena hasta re-elegir el ejercicio

Defecto D17. Tras crear el período, si el desplegable de la pantalla de novedades sigue vacío, hay
que volver a elegir el año. No es que el período no exista.

---

## 3. Novedades del período: ocho

**Dos anticipos y seis préstamos.** Todas con «Aprobada para el cálculo» = **Sí** — y, además,
con **estado = 1**; ver el aviso al final de la sección.

| Concepto (alterno) | Cédula | Colaborador | Valor |
|---|---|---|---:|
| 23 · Quirografario IESS | 1719624809 | CALDERON PARRAGA LAURA CECILIA | **14,33** |
| 23 · Quirografario IESS | 1720245735 | CASTRO ARCE LESLY MARICELA | **14,79** |
| 23 · Quirografario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 24 · Hipotecario IESS | 1715156574 | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Hipotecario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **379,84** |
| 24 · Hipotecario IESS | **0909917759** | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,29** |
| 25 · Anticipo de sueldo | 1719624809 | CALDERON PARRAGA LAURA CECILIA | **269,52** |
| 25 · Anticipo de sueldo | 1307779064 | ZAMBRANO MIELES TANYA GISSELA | **50,00** |
| | | **quirografarios** | **186,33** |
| | | **hipotecarios** | **1 015,13** |
| | | **anticipos** | **319,52** |

> **Las cédulas están en la fila a propósito, y elegir por cédula es obligatorio, no cómodo.** Hay
> **dos Pazmiños** —Jaramillo `0909917759` y Moreno `2100192463`— y el de febrero es Jaramillo. El
> combo de contrato **no acota por colaborador** (defecto D9): ofrece los contratos de todos, y
> teclear la cédula es lo único que deja un solo candidato.

> **23, 24 y 25 son `CPNMALTR`, no `CPNMCDGO`.** El combo enseña «Prestamo quirografario IESS - 23»
> porque pinta el alterno; en la base la PK del quirografario es otra. Una consulta de verificación
> contra `CPNMCDGO = 23` devuelve **otro concepto**. Es la misma trampa que grabó el hipotecario de
> alterna 24 como el concepto 24 «Seguro privado» — el defecto de pantalla 1. Filtrar siempre por
> `CPNMALTR`.

**Tres cosas que no son erratas:**

- **Castro Arce lleva quirografario en febrero** (14,79) y en enero no. Es el último mes en que lo
  paga ella: sale el 06-03 y desde entonces el IESS se lo sigue cobrando a ASOPREP, que lo asume.
- **Manosalvas hipotecario 379,84**, no 379,85. Es el único mes con ese céntimo; de marzo en
  adelante son 379,85.
- **El anticipo de Calderón, 269,52**, es la pregunta abierta con Steven. Se registra como
  diferencia contra lo que el motor genera solo, que es la decisión tomada para los anticipos.

Además, **las cuotas de `CTDS` de enero cobran su segunda mitad**: Calderón y Pardo llevan 350,00
cada uno sin que haya que registrar nada. Vencen el 28-02 y el motor las aplica solo.

### Antes de calcular: comprobar que las ocho van a entrar

El motor exige **dos** condiciones, no una — `NovedadNominaDaoServiceImpl:58-59`:

```
and t.aprobada = 'S'   and t.estado = 1
```

`NVNMESTD` lleva `DEFAULT 1` en el DDL, **pero el default de columna no llega a aplicarse**: JPA
manda el nulo explícito. Una novedad con estado nulo **se descarta en el cálculo sin un solo
aviso**. `/rest/nvnm/getAll` expone `estado`, así que se comprueba desde la propia pantalla, sin
consulta.

> **Febrero lo necesita más que enero.** En enero el anclaje de Calderón (269,43) delataba
> cualquier novedad que no disparase. Aquí son ocho, y una que se caiga se diluye en el total.

Y si se prefiere mirarlo en la base:

```sql
SELECT n.NVNMCDGO, m.MPLDIDNT, m.MPLDAPLL, n.NVNMVLRR AS VALOR,
       n.NVNMAPRB AS APROBADA, n.NVNMESTD AS ESTADO,
       CASE WHEN n.NVNMAPRB = 'S' AND n.NVNMESTD = 1 THEN 'ENTRA'
            ELSE '*** LA IGNORA: PARAR ***' END AS VEREDICTO
  FROM RHH.NVNM n
  JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 2
 ORDER BY n.NVNMCDGO;
-- Ocho filas, las ocho ENTRA.
```

---

## 4. Calcular, contrastar, y comprobar antes del total

| # | Comprobación | Esperado |
|---|---|---|
| 1 | Filas en `NMNA` | **22** |
| 2 | Días ≠ 30 | **ninguno** — Bravo Caiza y Cevallos Montenegro ya cobran mes completo |
| 3 | Méndez Torres | **241,00 / 22,77 / 218,23** |
| 4 | Renglones de IR | **cero** |
| 5 | **Cabecera contra suma de `NMNA`** | **iguales en las cuatro cifras** |
| 6 | Neto | **17 525,11** |

**Si aparece alguien con días parciales, parar.** En febrero todos cobran mes completo; unos días
partidos significan que el prorrateo está tocando a quien no debe.

**Dos anclajes que confirman que las cuotas de `CTDS` entraron una sola vez:**

| Colaborador | Descuentos | Neto |
|---|---:|---:|
| CALDERON PARRAGA | **700,00** = 66,15 + 14,33 + 269,52 + **350,00** | **0,00** |
| PARDO CALLE | 416,15 = 66,15 + **350,00** | **283,85** |

> **Calderón en líquido cero es EL ANCLAJE DE FEBRERO, y es más sensible que cualquier total.**
> Sus cuatro descuentos —66,15 + 14,33 + 269,52 + 350,00— igualan su sueldo al céntimo, así que
> **basta con que uno solo no entre para que el cero se rompa**. Es lo que sustituye al anclaje de
> los 269,43 de enero. Se mira **antes** que el neto del mes. Vuelve a pasar en mayo, y no es un
> error de carga.


### Y entonces contrastar, con el período todavía en estado 3

**Antes de aprobar, no después.** El contraste lee `NMNA`, `RNGL`, `PVNM` y `CTRL`, y **no lee
`ACMN`**, que es lo único que escribe `cerrarPeriodo`: da el mismo resultado en 3 que en 7. Si
destapa algo con el período en 3, se arregla recalculando; con el período cerrado habría que
reabrirlo, que es el **punto 6** y `reabrirPeriodo` no avisa.

1. `UPDATE RHH.CTRL_PARAM SET MES = 2; COMMIT;` **y comprobarlo, sin saltarse este paso ni aunque
   el ESTADO diga que ya está puesto** — el 2026-08-23 lo decía y estaba en otro mes.
   **El parámetro equivocado falla en dos direcciones, y sólo una es la que avisaba este guion:**
   - **Adelantado** —el mes aún sin calcular— todos los bloques salen **vacíos**, y un vacío se lee
     como que cuadra.
   - **Atrasado** —un mes anterior ya cerrado— no vacía nada: el instrumento **contrasta ese otro
     mes**, con su `CTRL` y su `NMNA` completos, y sale **verde al céntimo**. Es el caso peor: un
     verde entero y plausible del mes equivocado no tiene nada que lo delate.

   Por eso los siete bloques imprimen **`PERIODO_LEIDO`** desde el 2026-08-23. **Es lo primero que
   se mira en cada bloque, antes que ninguna cifra.** Si no dice `2026-02`, se para: da igual lo
   bien que se vea todo lo demás.
2. `CONTRASTE_MES_CONTRA_ROL_REAL.sql`, **bloque 4 primero**, luego 3, luego 1 y 2, y el 1B aunque
   todo cuadre.
3. Contra [`ESPERADO-CONTRASTE-FEBRERO.md`](ESPERADO-CONTRASTE-FEBRERO.md). El §8 explica las
   diferencias que este mes **debe** sacar.

**Sólo con el contraste en verde: aprobar → contabilizar rol → cerrar.**
---

## 5. Cerrar

**Febrero no debe avisar.** No tiene ninguna NVIS en su ventana: los avisos de Torres y Benítez son
del 15 y 16 de **enero**, y los de Castro y Cevallos del 6 de **marzo**.

**Si febrero se negara a cerrar o avisara, es hallazgo**: significa que la ventana del backend no
coincide con el rango del período, y hay que mirarlo antes de seguir.

`PRDNOBSR` debe quedar en:

```
Calculado sin contabilizacion (carga historica).
```

**No pulsar «Contabilizar provisiones».**

---

## 6. Qué debe quedar

**Cabecera de `PRDN`**

| Campo | Valor |
|---|---|
| `estado` | 7 CERRADO |
| `modo` | 1 HISTÓRICO SIN CONTABILIZAR |
| `numeroEmpleados` | 22 |
| Ingresos / Descuentos | 21 757,34 / 4 232,23 |
| **Neto** | **17 525,11** |
| Patronal | 2 585,89 |
| Asientos | **null / null / null** |

**`ACMN` — contar SIEMPRE filtrando por el período.** 132 filas · **22 personas** · tipos 1, 2, 3,
5, 8 y 10 con 22 cada uno · **tipo 9 (IR) vacío** · **suma del tipo 8 = 2 011,25**, que es el
concepto 20 del cliente al centavo.

> **Un conteo sin filtrar da un número que no se parece a nada y parece un fallo.** `RHH.ACMN`
> acumula todo el año: al cerrar febrero habrá **304 filas** en total —132 de enero, 132 de
> febrero, **34 de la apertura** y **6 de los dos finiquitos de enero**, 3 por liquidación—. Las 40
> que no tienen período no se mueven en febrero, porque este mes no tiene salidas; en **enero y
> marzo sí crecen**, y ahí forman parte de lo esperado.

```sql
SELECT a.ACMNTPAC AS TIPO, COUNT(*) AS FILAS,
       COUNT(DISTINCT a.MPLDCDGO) AS PERSONAS, SUM(a.ACMNVLOR) AS VALOR
  FROM RHH.ACMN a
  JOIN RHH.PRDN p ON p.PRDNCDGO = a.PRDNCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 2
 GROUP BY a.ACMNTPAC ORDER BY 1;
```

**La prueba de que no se contabilizó nada.** Los tres campos de asiento en `null` dicen que *el
período* no tiene asiento; **no dicen que no haya nacido uno suelto**.

> **Corregido el 2026-08-22, y la corrección importa.** La primera versión de este control comparaba
> el **censo total** de `CNT.ASNT` antes y después. **En producción eso no vale**: otros módulos
> escriben en paralelo. Entre el cierre de enero y el cálculo de febrero nacieron seis asientos
> —cinco de T-EGRESOS y uno de CXP—, **ninguno de RRHH**, y un censo total los habría leído como
> contabilización de la nómina. **Un control que no distingue quién escribió no es un control.**

Lo que sí vale: anotar el **código máximo** antes de empezar el mes y mirar después **sólo los que
lo superen**.

```sql
-- ANTES de empezar el mes. Anotar el número.
SELECT MAX(ASNTCDGO) AS BASE FROM CNT.ASNT;

-- DESPUÉS de cerrar. Los que nacieron entre medias, con su origen.
-- Ninguno puede ser de RRHH: en modo histórico la nómina no genera asiento.
SELECT ASNTCDGO, ASNTFCHA, ASNTNMRO, ASNTUSRO, SUBSTR(ASNTOBSR, 1, 80) AS OBSERVACION
  FROM CNT.ASNT WHERE ASNTCDGO > :BASE ORDER BY ASNTCDGO;
```

**Las 22 nóminas**

> **Foto del 2026-08-21, WAR desplegado a las 05:34.** Es **nuestra salida**, no el rol del
> cliente: sirve para saber **quién** diverge, no sólo que algo diverge. **Caduca**: si la base
> local se recalcula, el guion empieza a mentir sin avisar. Regenerarla antes de fiarse:
>
> ```sql
> SELECT m.MPLDIDNT, m.MPLDAPLL || ' ' || m.MPLDNMBR AS COLABORADOR,
>        n.NMNADITR AS DIAS, n.NMNATING AS INGRESOS,
>        n.NMNATDSC AS DESCUENTOS, n.NMNANETO AS NETO
>   FROM RHH.NMNA n
>   JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
>   JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
>  WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 2
>  ORDER BY m.MPLDAPLL;
> ```
>
> Si no coincide, **mandar el resultado** y averiguar qué cambió antes de seguir.

| Identificación | Colaborador | Días | Ingresos | Descuentos | Neto |
|---|---|---:|---:|---:|---:|
| 1717991341 | BARCENAS BERMEO DANIELA ROMINA | 30 | 700,00 | 66,15 | 633,85 |
| 2150051205 | BRAVO CAIZA WENDI JULIANA | 30 | 700,00 | 66,15 | 633,85 |
| 1753528379 | CAIZA REMACHE LIZETH ABIGAIL | 30 | 482,00 | 45,55 | 436,45 |
| 1719624809 | CALDERON PARRAGA LAURA CECILIA | 30 | 700,00 | **700,00** | **0,00** |
| 1720245735 | CASTRO ARCE LESLY MARICELA | 30 | 482,00 | 60,34 | 421,66 |
| 1716501778 | CEVALLOS ALEMAN EDGAR GIOVANNY | 30 | 482,00 | 45,55 | 436,45 |
| 1311981953 | CEVALLOS MONTENEGRO JOHNNY STEVEN | 30 | 2 000,00 | 189,00 | 1 811,00 |
| 1715156574 | COSSIO CAICEDO EIMY | 30 | 798,50 | 556,15 | 242,35 |
| 1750302984 | GARCIA VITERI WILLAM ALEXANDER | 30 | 700,00 | 66,15 | 633,85 |
| 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | 30 | 2 206,84 | 726,05 | 1 480,79 |
| 1004350904 | MENDEZ TORRES DIANA ALEJANDRA | 30 | **241,00** | 22,77 | **218,23** |
| 0103179537 | MOSCOSO NOVILLO DIANA CECILIA | 30 | 1 715,00 | 146,10 | 1 568,90 |
| 1717649873 | MUÑOZ SANTOS MARCELO ALEJANDRO | 30 | 550,00 | 51,98 | 498,02 |
| 1723962849 | NIETO CONDE KAROL POLETH | 30 | 900,00 | 85,05 | 814,95 |
| 1726657164 | PARDO CALLE KATHERINE GUISSELA | 30 | 700,00 | 416,15 | 283,85 |
| 0909917759 | PAZMIÑO JARAMILLO EDGAR ALBERTO | 30 | 1 500,00 | 287,04 | 1 212,96 |
| 2100192463 | PAZMIÑO MORENO DIANA CAROLINA | 30 | 500,00 | 47,25 | 452,75 |
| 1725996498 | ROBAYO RUEDA GABRIEL PATRICIO | 30 | 1 500,00 | 141,75 | 1 358,25 |
| 0801999855 | RODRIGUEZ VALENCIA NATALIA ADRIANA | 30 | 700,00 | 66,15 | 633,85 |
| 1712362720 | RODRIGUEZ ZAMBRANO LILIANA DE LAS MERCEDES | 30 | 1 500,00 | 141,75 | 1 358,25 |
| 1712232659 | VITERI LOPEZ JIMENA DEL PILAR | 30 | 2 200,00 | 207,90 | 1 992,10 |
| 1307779064 | ZAMBRANO MIELES TANYA GISSELA | 30 | 500,00 | 97,25 | 402,75 |

**Castro Arce y Cevallos Alemán están**, aunque salgan el 06-03: en febrero trabajaron el mes
entero. **Torres Chávez y Benítez Montes no**, porque salieron en enero.

---

## 7. Lo que hace fallar febrero

| Síntoma | Causa | Qué mirar |
|---|---|---|
| Neto **+218,22** | Méndez a 482: `sql/49` corrido antes de tiempo | Su fila: 482,00 en vez de 241,00 |
| **20 filas** y cabecera ≠ detalle | El motor perdió a Castro y Cevallos por estar CESANTES | La consulta de contratos filtra por estado del empleado |
| Alguien con días parciales | Prorrateo aplicándose donde no toca | En febrero **nadie** lleva días ≠ 30 |
| Calderón con neto distinto de 0,00 | Falta el anticipo de 269,52, o la cuota de `CTDS` no entró | 66,15 + 14,33 + 269,52 + 350,00 = 700,00 |
| Febrero avisa al cerrar | La ventana del backend no coincide con el período | Febrero no tiene NVIS propias |

---

## 8. Diferencias que no son defecto

**El total cierra en cero. Las filas por persona no están vacías.** El bloque 2 saca **46 filas**:

### Las 44 del par de vacaciones

El rol del cliente lleva, por persona, **un ingreso y un descuento de vacaciones que se cancelan**.
22 × 2 = **44 filas**, **886,80** por cada lado, y **no tocan el líquido**. Nuestro motor no genera
esos renglones, así que salen como diferencia en los dos sentidos y se neutralizan.

**Sube respecto a enero** —de 823,19 a 886,80— y sólo por una razón: Bravo Caiza y Cevallos
Montenegro ya cobran mes completo, así que el sueldo del mes sube y con él el par. La base es el
sueldo (concepto 1: **21 283,00**), dividido entre 24 y redondeado por fila.

> **Se anuncia antes de correr el contraste.** Quien vea 46 filas donde espera dos creerá que algo
> se rompió: es una presencia que nadie anunció pareciendo un hallazgo.

**Marzo en adelante desaparece** y el bloque 2 vuelve a tres filas.

### Las 2 restantes

| Colaborador | Diferencia | Origen |
|---|---:|---|
| MANOSALVAS LLERENA FERNANDO PAUL | **+0,01** | Regla 4: redondeamos cada renglón antes de sumar; la hoja del cliente arrastra decimales |
| MUÑOZ SANTOS MARCELO ALEJANDRO | **−0,01** | Lo mismo, con signo contrario |

Se cancelan en el total. **No se ajustan.**

---

## Referencias

- Valores del cliente: `sql/35` carga `RHH.CTRL` de febrero.
- Contraste: `CONTRASTE_MES_CONTRA_ROL_REAL.sql` con `CTRL_PARAM` en el mes 2.
- Correcciones del motor necesarias: prorrateo `30 − d + 1`, `CNTENRIR` de Robayo y selección de
  nómina por contrato vigente. **La tercera no cambia febrero, lo protege**: sin ella, recalcularlo
  perdería a Castro y Cevallos y se irían otros 872,90.
- **En DBeaver el contraste se corre tal cual.** Sus renglones `--` sueltos sólo se tragan la
  sentencia siguiente en SQL\*Plus, donde el `-` final actúa como continuación; para ese camino
  está `CONTRASTE_MES_CONTRA_ROL_REAL.sqlplus.bak`.
- **Todos los scripts viven en `saaBE/docs/logica-negocio/rhh/sql/`**, nunca en el repositorio del
  frontend.

---

# Lo que enseñó ejecutarlo — 2026-08-23

> Febrero se replicó en producción el **2026-08-22** y cerró en 17 525,11 con **diferencia cero**.
> *Reconstruido de la bitácora de defectos y del `ESTADO-RRHH.md`.*

## Fue el primer mes con el §2, y el §2 funcionó

Febrero **estrenó el paso de crear el período**, que enero tuvo que inventar sobre la marcha. Salió
a la primera. Es el primer indicio de que el guion había dejado de tener huecos de procedimiento y
los que quedaban eran de **pantalla**.

## Y estrenó el camino canónico del contraste

**Contraste en estado 3 CALCULADO, antes de aprobar.** Enero lo hizo al revés y salió bien por
suerte. Desde febrero es la norma, y desde entonces se ha aplicado en marzo, abril y mayo sin una
sola incidencia. **Un fallo en estado 3 se arregla recalculando; en estado 7 hay que reabrir, y
`reabrirPeriodo` no avisa.**

## El control de asientos se validó a sí mismo, y por accidente

**Entre fijar la base 8174 y aprobar febrero nacieron cinco asientos ajenos** —de T-EGRESOS y CXP—.
No los escribió la nómina: los escribieron otros módulos, en paralelo, mientras se replicaba.

**Un censo total de `CNT.ASNT` los habría leído como contabilización de la nómina**, y el mes habría
parecido roto sin estarlo. La corrección —acotar a `ASNTCDGO > :BASE`— entró a los cinco guiones ese
mismo día. **Es la única comprobación de la serie que se demostró necesaria mientras se usaba**, no
en teoría.

> Y en abril quedó la contraprueba: el ciclo entero —aprobar, contabilizar y cerrar— **no movió la
> base ni un número**. La rama histórica no escribe un solo asiento, que es exactamente lo que debía
> pasar.

## Defecto nuevo: D18, y su gravedad resultó ser menor de lo que parecía

El combo de colaborador **ofrece a los CESANTES**: Torres Chávez y Benítez Montes, que causaron baja
en enero, seguían en la lista al cargar las novedades de febrero.

**Confirmado después por el backend y es baja:** `calcularPeriodo` pregunta `selectAprobadas` **una
vez por cada contrato que procesa**, así que a quien no está en el período no se le pregunta nunca.
Una novedad para un cesante quedaría huérfana y **no puede alterar ningún número**. Es suciedad de
datos, no error de cálculo. **Se anota la gravedad real, no la primera impresión.**

## El par de vacaciones: la comprobación que confirmó el modelo sin buscarlo

Los **886,80** del bloque 2 descomponen exactamente como el esperado predecía: Cevallos Montenegro
pasa de 33,33 a 83,33 y Bravo Caiza de 15,56 a 29,17 —los dos que entraron a mitad de enero— y
**nadie más se mueve**. `823,19 + 63,61 = 886,80`.

Coincidir al céntimo con la provisión de vacaciones significa que **nuestra base de vacaciones es la
misma que usó el cliente**. No se buscaba: salió sola de mirar el bloque fila a fila. **Es el
argumento de por qué el esperado se fija por filas y nunca por totales.**
