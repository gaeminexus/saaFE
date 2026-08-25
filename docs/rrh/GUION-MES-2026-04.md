# Guion de abril de 2026 — réplica en producción

> **Dónde vive cada cosa:** los `.sql` que este guion cita viven **sólo** en
> `saaBE/docs/logica-negocio/rhh/sql/`. Los `.md` sí están espejados en `saaFE/docs/rrh/`.

**Para qué es este documento.** Reproducir abril en otra base **siguiendo una lista**.

> **✅ OBSERVADO EN PRODUCCIÓN EL 2026-08-23. Ya no es predicción.** `PRDN` **41**, contrastado en
> estado 3 antes de aprobar: 20 nóminas, ingresos 21 034,34, descuentos 4 945,12, **neto 16 089,22**,
> patronal 2 498,04. Cliente 15 914,22, **diferencia +175,00**, y el bloque 2 la descompone en las
> cinco filas previstas —Calderón ±175,00, Manosalvas +0,01 ×2, Muñoz −0,01— **sin ninguna fila de
> Robayo**. Bloque 1 vacío, bloque 3 con la única fila de Muñoz, 1B con FR en 1 persona y descuadre
> vacío. **116 renglones**, uno menos que la corrida de local: el IR de Robayo que ya no se genera.
>
> **Cómo se obtuvo este número antes de verlo, y por qué conviene saberlo:** era una predicción
> —16 069,05 de la corrida de local con el motor viejo, más los 20,17 del IR de Robayo—, y **salió
> clavada**. Se deja escrito porque **mayo sigue en esa situación** y la misma derivación gana
> crédito, no certeza.

> **Abril es el único mes de los cinco que no cierra en cero**, y su diferencia está identificada:
> **+175,00**, los OTROS de Calderón que el rol del cliente no clasifica. Es pregunta abierta con
> Steven, no un fallo de cálculo.

**Resultado que hay que obtener:** 20 nóminas · ingresos **21 034,34** · descuentos **4 945,12** ·
líquido **16 089,22**. Cliente: **15 914,22**. **Diferencia +175,00.**

> El bloque 2 saca **cinco filas**: las tres de siempre más las dos de Calderón. El par de
> vacaciones ya no está desde marzo. §8.

---

## 0. El orden

```
fichas (sql/49) → crear el período → novedades → calcular → contrastar → aprobar →
contabilizar rol → cerrar
```

Sin liquidaciones: en abril no sale nadie. Las dos salidas fueron en marzo.

---

## 1. Fichas: Méndez Torres pasa a tiempo completo

**El cambio de ficha de abril, y va antes de calcular.** La adenda es del **01-04**.

| Campo | Valor |
|---|---|
| `CNTESLRB` | **482,00** |
| `CNTEJRND` | **1** — completa |
| `CNTEHRSM` | **40** |

En la corrida de agosto esto lo hizo `sql/49`, que **lleva un control que se niega si enero,
febrero o marzo no están cerrados**. Ese control existe porque el motor lee el contrato vigente: si
Méndez pasa a 482 antes de tiempo, los tres meses anteriores calculan de más.

**Efecto en el mes:** su TOTAL IESS sube de 49,65 a **99,29**, y el rol de provisiones deja de
cobrarle el seguro de salud de tiempo parcial (10,63 en marzo, cero en abril).

> Desde abril **Méndez deja de ser diferencia**: 482 × 20,60 % = 99,292 → 99,29, y 45,55 + 53,74 =
> 99,29 también. Los dos lados dan lo mismo.

---
## 2. Crear el período — el paso que ningún guion traía

**Sin período no hay dónde registrar novedades**, y la pantalla de Novedades no dice qué falta:
enseña el desplegable vacío. Se crea desde `Períodos de nómina` → *Agregar Registro*.

| Campo | Valor para abril |
|---|---|
| Año / Mes | **2026 / 4** |
| Fecha de inicio | **01-04-2026** |
| Fecha de fin | **30-04-2026** |
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

### Cómo se teclean las fechas

| Pantalla | Formato |
|---|---|
| **Todas las pantallas del módulo** | **`dd/mm/aaaa`**, una sola convención |

> **⚠ ESTO CAMBIÓ AL PUBLICAR EL 2026-08-25. Antes eran DOS formatos y ninguno lo decía.**
> El diálogo de períodos leía `dd/mm/yyyy` y *Nuevo finiquito* leía **`mm/dd/yyyy`**, porque aquél
> usaba el datepicker de Material y éste un `input type="date"` nativo, que atiende al navegador y
> no a la aplicación. **Los dos usan ya el mismo control**, con el patrón escrito en el
> `placeholder` y en la etiqueta.
>
> **Si estás replicando contra una instalación ANTERIOR a ese despliegue, no uses esta tabla:**
> allí el finiquito sigue pidiendo `mm/dd/yyyy` y hay que teclear `01/15/2026` para decir 15 de
> enero. **Teclear `15/01/2026` en un campo que lee `mm/dd` no da error: da el 1 de mayo.**
> Compruébalo antes de fiarte, tecleando un día mayor que 12 y releyendo el control.

**El diálogo de períodos ya no inventa fechas.** Hasta el despliegue del 2026-08-25, teclear algo
ilegible **no daba error, no marcaba el campo en rojo y no lo dejaba vacío: lo rellenaba con la fecha
de HOY** (defecto D15), y el formulario se veía perfectamente relleno. Ahora un texto que no llega a
ser fecha **deja el campo inválido, con el mensaje «Fecha no válida. Use el calendario o teclee
dd/mm/aaaa», y Guardar no pasa** — los dos campos son además obligatorios.

> **El rodeo de teclear primero la fecha de fin —para que un día mayor que 12 demostrara el formato—
> deja de hacer falta**, porque el patrón está escrito en el campo. **Se conserva escrito aquí a
> propósito:** si replicas contra una instalación anterior a ese despliegue, es la única defensa que
> hay, y una fecha inventada en silencio no la caza ninguna comprobación posterior salvo la del rango.
>
> **La comprobación del rango de aquí abajo sigue siendo obligatoria en los dos casos.** Que la
> pantalla ya no invente una fecha no prueba que la que tecleaste sea la que querías.

### La comprobación del rango, inmediatamente después de guardar

Va **antes** de registrar la primera novedad. Con un rango que no sea el mes, `calcularPeriodo` no
revienta: calcula, y prorratea a todo el mundo por los días del rango.

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

Defecto D17. Tras crear el período, si el desplegable de novedades sigue vacío, hay que volver a
elegir el año. No es que el período no exista.

### Anotar la base de asientos, antes de nada

```sql
SELECT MAX(ASNTCDGO) AS BASE FROM CNT.ASNT;
```

Se usa en el §6. **Anotarlo ahora**, no al final.

---


## 3. Novedades del período: diez

**Tres anticipos y siete préstamos.** Todas con «Aprobada para el cálculo» = **Sí**.

| Concepto (alterno) | Cédula | Colaborador | Valor |
|---|---|---|---:|
| 23 · Quirografario IESS | 1719624809 | CALDERON PARRAGA LAURA CECILIA | **14,13** |
| 23 · Quirografario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 23 · Quirografario IESS | 1725996498 | ROBAYO RUEDA GABRIEL PATRICIO | **95,48** |
| 23 · Quirografario IESS | 1712232659 | VITERI LOPEZ JIMENA DEL PILAR | **420,23** |
| 24 · Hipotecario IESS | 1715156574 | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Hipotecario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **379,85** |
| 24 · Hipotecario IESS | **0909917759** | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,29** |
| 25 · Anticipo de sueldo | 1719624809 | CALDERON PARRAGA LAURA CECILIA | **350,00** |
| 25 · Anticipo de sueldo | 0103179537 | MOSCOSO NOVILLO DIANA CECILIA | **650,00** |
| 25 · Anticipo de sueldo | 1726657164 | PARDO CALLE KATHERINE GUISSELA | **300,00** |
| | | **quirografarios** | **687,05** |
| | | **hipotecarios** | **1 015,14** |
| | | **anticipos** | **1 300,00** |

**Dos que conviene no confundir:**

- **Viteri López lleva 420,23 en una sola novedad.** Son **dos** préstamos quirografarios —NUT
  15379546 por 240,73 y NUT 19600017 por 179,50— que el rol imprime sumados en una columna. Se
  registra uno solo, con los dos NUT anotados en la descripción.
- **El quirografario de Castro Arce sigue sin registrarse.** El IESS se lo cobra a ASOPREP (14,79)
  aunque salió el 06-03, pero en el rol no está. Control 3: **687,05 nuestro contra 701,84 del
  IESS**. En mayo desaparece solo.


> **Las cédulas están en la fila a propósito, y elegir por cédula es obligatorio, no cómodo.** Hay
> **dos Pazmiños** —Jaramillo `0909917759` y Moreno `2100192463`—. El combo de contrato **no acota
> por colaborador** (defecto D9), y teclear la cédula es lo único que deja un solo candidato.

> **23, 24 y 25 son `CPNMALTR`, no `CPNMCDGO`.** Una consulta de verificación contra
> `CPNMCDGO = 23` devuelve **otro concepto**. Filtrar siempre por `CPNMALTR`.
>
> **Y ya no es una advertencia teórica: tiene los números de producción detrás**, leídos el
> 2026-08-23. La correspondencia real es **alterno 23 → `CPNMCDGO` 20 · 24 → 21 · 25 → 22**, así
> que una consulta por código devuelve tres conceptos corridos, no un error. Sus roles son
> **12 · 13 · 14**, que son los tres que el motor recoge como préstamo y anticipo —verificado
> contra `RhhRolConceptoMotor`, **no contra el nombre**.

> **Elegir de la lista, no teclear y salir.** Si el control se queda con la cadena, el cuerpo viaja
> como `{ codigo: '...' }` y el backend responde **400** —o **ORA-02291**—. **La comprobación que lo
> caza es releer el input**: si no contiene el guion separador, no se eligió de la lista. Y el
> filtro **distingue mayúsculas** (D14): teclear en mayúsculas.

> **El combo de colaborador ofrece a los CESANTES** (D18): Torres Chávez, Benítez Montes, Castro
> Arce y Cevallos Alemán siguen en la lista. Una novedad para ellos quedaría huérfana y el motor no
> la leería jamás, pero es suciedad que nadie revisa después.

### Antes de calcular: comprobar que todas van a entrar

El motor exige **dos** condiciones, no una — `NovedadNominaDaoServiceImpl:58-59`:

```
and t.aprobada = 'S'   and t.estado = 1
```

`NVNMESTD` lleva `DEFAULT 1` en el DDL, **pero el default de columna no llega a aplicarse**: JPA
manda el nulo explícito. Una novedad con estado nulo **se descarta en el cálculo sin un solo
aviso**. `/rest/nvnm/getAll` expone `estado`, así que se comprueba desde la propia pantalla.

```sql
SELECT n.NVNMCDGO, m.MPLDIDNT, m.MPLDAPLL, n.NVNMVLRR AS VALOR,
       n.NVNMAPRB AS APROBADA, n.NVNMESTD AS ESTADO,
       CASE WHEN n.NVNMAPRB = 'S' AND n.NVNMESTD = 1 THEN 'ENTRA'
            ELSE '*** LA IGNORA: PARAR ***' END AS VEREDICTO
  FROM RHH.NVNM n
  JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 4
 ORDER BY n.NVNMCDGO;
-- Diez filas, todas ENTRA.
```

---

## 4. Calcular, contrastar, y comprobar antes del total

| # | Comprobación | Esperado |
|---|---|---|
| 1 | Filas en `NMNA` | **20** — sin Castro Arce ni Cevallos Alemán |
| 2 | Días ≠ 30 | **ninguno, Méndez incluida** — ya va a mes completo |
| 3 | Méndez Torres | **482,00 / 45,55 / 436,45** |
| 4 | Renglones de IR | **cero** |
| 5 | **Cabecera contra suma de `NMNA`** | **iguales en las cuatro cifras** |
| 6 | Neto | **16 089,22** · cliente 15 914,22 · **diferencia +175,00** |

**Si la diferencia no es +175,00 clavados, parar.** Es el único mes con diferencia y está
completamente atribuida; cualquier otro número significa que hay una causa nueva.


### Y entonces contrastar, con el período todavía en estado 3

**Antes de aprobar, no después.** El contraste lee `NMNA`, `RNGL`, `PVNM` y `CTRL`, y **no lee
`ACMN`**, que es lo único que escribe `cerrarPeriodo`: da el mismo resultado en 3 que en 7. Si
destapa algo con el período en 3, se arregla recalculando; con el período cerrado habría que
reabrirlo, que es el **punto 6** y `reabrirPeriodo` no avisa.

1. `UPDATE RHH.CTRL_PARAM SET MES = 4; COMMIT;` **y comprobarlo, sin saltarse este paso ni aunque
   el ESTADO diga que ya está puesto** — el 2026-08-23 lo decía y estaba en otro mes.
   **El parámetro equivocado falla en dos direcciones, y sólo una es la que avisaba este guion:**
   - **Adelantado** —el mes aún sin calcular— todos los bloques salen **vacíos**, y un vacío se lee
     como que cuadra.
   - **Atrasado** —un mes anterior ya cerrado— no vacía nada: el instrumento **contrasta ese otro
     mes**, con su `CTRL` y su `NMNA` completos, y sale **verde al céntimo**. Es el caso peor: un
     verde entero y plausible del mes equivocado no tiene nada que lo delate.

   Por eso los siete bloques imprimen **`PERIODO_LEIDO`** desde el 2026-08-23. **Es lo primero que
   se mira en cada bloque, antes que ninguna cifra.** Si no dice `2026-04`, se para: da igual lo
   bien que se vea todo lo demás.
2. `CONTRASTE_MES_CONTRA_ROL_REAL.sql`, **bloque 4 primero**, luego 3, luego 1 y 2, y el 1B aunque
   todo cuadre.
3. Contra [`ESPERADO-CONTRASTE-ABRIL.md`](ESPERADO-CONTRASTE-ABRIL.md). El §8 explica las
   diferencias que este mes **debe** sacar.

**Sólo con el contraste en verde: aprobar → contabilizar rol → cerrar.**
---

## 5. Cerrar

**Abril no debe avisar.** No tiene ninguna NVIS en su ventana: los avisos de Castro y Cevallos son
del **6 de marzo**. Si avisara, hay que mirar la ventana del backend.

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
| `numeroEmpleados` | 20 |
| Ingresos / Descuentos | 21 034,34 / 4 945,12 |
| **Neto** | **16 089,22** |
| Patronal | 2 498,04 |
| Asientos | **null / null / null** |

**`ACMN` — contar SIEMPRE filtrando por el período.** 120 filas · **20 personas** · tipos 1, 2, 3,
5, 8 y 10 con 20 cada uno · **tipo 9 (IR) vacío** · **suma del tipo 8 = 1 942,93**.

> **Un conteo sin filtrar da un número que no se parece a nada y parece un fallo.** `RHH.ACMN`
> acumula todo el año: al cerrar este mes el total debe ser **550 filas** —132 de enero,
> 132 de febrero, 120 de cada mes desde marzo, **34 de la apertura** y **12 de los cuatro
> finiquitos** (3 por liquidación)—. **Las 46 sin período no se mueven**: este mes no tiene salidas.

```sql
SELECT a.ACMNTPAC AS TIPO, COUNT(*) AS FILAS,
       COUNT(DISTINCT a.MPLDCDGO) AS PERSONAS, SUM(a.ACMNVLOR) AS VALOR
  FROM RHH.ACMN a
  JOIN RHH.PRDN p ON p.PRDNCDGO = a.PRDNCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 4
 GROUP BY a.ACMNTPAC ORDER BY 1;
```

**La prueba de que no se contabilizó nada.** Los tres campos de asiento en `null` dicen que *el
período* no tiene asiento; **no dicen que no haya nacido uno suelto**.

> **El censo total de `CNT.ASNT` NO vale en producción**, y está comprobado: otros módulos escriben
> en paralelo. Durante el cierre de febrero nacieron cinco asientos ajenos entre que se fijó la base
> y se aprobó — un censo total los habría leído como contabilización de la nómina. **Un control que
> no distingue quién escribió no es un control.**

```sql
-- La base se anotó en el §2. Ninguno de los nuevos puede ser de RRHH.
SELECT ASNTCDGO, ASNTFCHA, ASNTNMRO, ASNTUSRO, SUBSTR(ASNTOBSR, 1, 80) AS OBSERVACION
  FROM CNT.ASNT WHERE ASNTCDGO > :BASE ORDER BY ASNTCDGO;
```

**Las 20 nóminas**

> **Foto del 2026-08-21, WAR desplegado a las 05:34.** Es **nuestra salida**, no el rol del
> cliente. **Caduca**: regenerarla antes de fiarse.
>
> ```sql
> SELECT m.MPLDIDNT, m.MPLDAPLL || ' ' || m.MPLDNMBR AS COLABORADOR,
>        n.NMNADITR AS DIAS, n.NMNATING AS INGRESOS,
>        n.NMNATDSC AS DESCUENTOS, n.NMNANETO AS NETO
>   FROM RHH.NMNA n
>   JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
>   JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
>  WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 4
>  ORDER BY m.MPLDAPLL;
> ```
>
> Si no coincide, **mandar el resultado** y averiguar qué cambió antes de seguir.

| Identificación | Colaborador | Días | Ingresos | Descuentos | Neto |
|---|---|---:|---:|---:|---:|
| 1717991341 | BARCENAS BERMEO DANIELA ROMINA | 30 | 700,00 | 66,15 | 633,85 |
| 2150051205 | BRAVO CAIZA WENDI JULIANA | 30 | 700,00 | 66,15 | 633,85 |
| 1753528379 | CAIZA REMACHE LIZETH ABIGAIL | 30 | 482,00 | 45,55 | 436,45 |
| 1719624809 | CALDERON PARRAGA LAURA CECILIA | 30 | 700,00 | 430,28 | 269,72 |
| 1311981953 | CEVALLOS MONTENEGRO JOHNNY STEVEN | 30 | 2 000,00 | 189,00 | 1 811,00 |
| 1715156574 | COSSIO CAICEDO EIMY | 30 | 798,50 | 556,15 | 242,35 |
| 1750302984 | GARCIA VITERI WILLAM ALEXANDER | 30 | 700,00 | 66,15 | 633,85 |
| 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | 30 | 2 206,84 | 726,06 | 1 480,78 |
| 1004350904 | MENDEZ TORRES DIANA ALEJANDRA | 30 | **482,00** | 45,55 | **436,45** |
| 0103179537 | MOSCOSO NOVILLO DIANA CECILIA | 30 | 1 715,00 | 796,10 | 918,90 |
| 1717649873 | MUÑOZ SANTOS MARCELO ALEJANDRO | 30 | 550,00 | 51,98 | 498,02 |
| 1723962849 | NIETO CONDE KAROL POLETH | 30 | 900,00 | 85,05 | 814,95 |
| 1726657164 | PARDO CALLE KATHERINE GUISSELA | 30 | 700,00 | 366,15 | 333,85 |
| 0909917759 | PAZMIÑO JARAMILLO EDGAR ALBERTO | 30 | 1 500,00 | 287,04 | 1 212,96 |
| 2100192463 | PAZMIÑO MORENO DIANA CAROLINA | 30 | 500,00 | 47,25 | 452,75 |
| 1725996498 | ROBAYO RUEDA GABRIEL PATRICIO | 30 | 1 500,00 | 237,23 | 1 262,77 |
| 0801999855 | RODRIGUEZ VALENCIA NATALIA ADRIANA | 30 | 700,00 | 66,15 | 633,85 |
| 1712362720 | RODRIGUEZ ZAMBRANO LILIANA DE LAS MERCEDES | 30 | 1 500,00 | 141,75 | 1 358,25 |
| 1712232659 | VITERI LOPEZ JIMENA DEL PILAR | 30 | 2 200,00 | 628,13 | 1 571,87 |
| 1307779064 | ZAMBRANO MIELES TANYA GISSELA | 30 | 500,00 | 47,25 | 452,75 |

---

## 7. Lo que hace fallar abril

| Síntoma | Causa | Qué mirar |
|---|---|---|
| Méndez en 241,00 | `sql/49` no se ejecutó | Su fila: debe ser 482,00 / 45,55 / 436,45 |
| `sql/49` se niega a correr | Enero, febrero o marzo sin cerrar | Su control es deliberado: cerrar los tres primero |
| Viteri con 240,73 o 179,50 | Se registró un solo préstamo de los dos | Debe ser **una** novedad de **420,23** |
| Diferencia distinta de +175,00 | Causa nueva | Parar y reportar |
| Abril avisa al cerrar | La ventana del backend no coincide | Abril no tiene NVIS propias |

---

## 8. Diferencias que no son defecto

**El total no cierra en cero, y es el único mes así.** El bloque 2 saca **cinco filas**.

### El par de vacaciones ya no está

Desapareció en marzo. En enero eran 44 filas por 823,19 y en febrero por 886,80; **desde marzo,
cero**. Quien venga de replicar enero y febrero espera 46 filas: en abril son cinco.

### Las dos de Calderón: los 175,00

| Colaborador | Diferencia | Origen |
|---|---:|---|
| CALDERON PARRAGA LAURA CECILIA | **+175,00** en DESCUENTOS y en LIQUIDO | El rol del cliente le carga 175,00 de **OTROS** sin clasificar |

**Son dos filas del bloque 2 —una por cada renglón— y un solo hecho.** El rol imprime un descuento
de OTROS que no dice qué es, así que no hay concepto al que asignarlo y no se carga. **Pregunta
abierta con Steven.**

**En mayo desaparece**: el rol deja de traerlos.

### Las tres restantes

| Colaborador | Diferencia | Origen |
|---|---:|---|
| MANOSALVAS LLERENA FERNANDO PAUL | **+0,01** | Regla 4: redondeamos por renglón, la hoja del cliente arrastra decimales |
| MUÑOZ SANTOS MARCELO ALEJANDRO | **−0,01** | Lo mismo, con signo contrario |
| MÉNDEZ TORRES / MUÑOZ en `TOTAL_IESS` | **±0,01** | La planilla redondea la suma; nosotros sumamos personal y patronal ya redondeados |

Los ±0,01 se cancelan en el total. **No se ajustan.**

---

## Referencias

- Valores del cliente: `sql/40` carga `RHH.CTRL` de abril y aplica la adenda de Méndez.
- Contraste: `CONTRASTE_MES_CONTRA_ROL_REAL.sql` con `CTRL_PARAM` en el mes 4.
- **Abril es el primer mes del año en que rol y planilla coinciden en número: 20 y 20.** No hay
  discrepancia del bloque 3. Si vuelve a aparecer, es hallazgo.
- **En DBeaver el contraste se corre tal cual.** Sus renglones `--` sueltos sólo se tragan la
  sentencia siguiente en SQL\*Plus; para ese camino está `CONTRASTE_MES_CONTRA_ROL_REAL.sqlplus.bak`.
- **Todos los scripts viven en `saaBE/docs/logica-negocio/rhh/sql/`**, nunca en el repositorio del
  frontend.

---

# Lo que enseñó ejecutarlo — 2026-08-23

> Abril se replicó en producción el **2026-08-23** —`PRDN` **41**— y cerró en **16 089,22**, con la
> diferencia de **+175,00** de Calderón y nada más. *Escrito por la sesión que lo ejecutó.*

## Lo más importante: la predicción se convirtió en observación

Abril entró siendo **el primer mes cuyo total nadie había visto**. El 16 089,22 se obtuvo sumando
los 20,17 del IR de Robayo a la única corrida existente —local, motor viejo, 16 069,05—.

**Salió clavado.** Y eso no sólo cerró abril: **validó la derivación** que mayo iba a necesitar,
porque mayo se apoyaba en la misma resta. Cuando llegó, mayo también salió clavado.

> **La regla no cambió por eso**, y conviene que siga sin cambiar: mientras un mes no exista
> calculado con el motor final, su total es hipótesis, y **el discriminador es el bloque 2, nunca el
> total**. Un total que cuadra por compensación se lee igual que uno que acierta.

## Dos afirmaciones de este guion eran más fuertes de lo que aguantaban

| Decía | Es |
|---|---|
| «Verificado contra la corrida del 2026-08-21» | **Predicción.** Aquella corrida fue en local y con el motor anterior a `CNTENRIR` |
| «El modo no se puede corregir después sin rehacer el mes» | **Falso, y caro.** `getModo()` se lee en exactamente dos sitios, los dos `esHistorico()`; **`calcularPeriodo` no lo mira nunca**. Antes de contabilizar es una columna inerte: se corrige con un `UPDATE` y se sigue |

**Y el `ESTADO-RRHH.md` decía que `CTRL_PARAM` estaba en 4 y estaba en 3.** No bloqueó nada —ningún
Java lee esa tabla—, pero convirtió el paso 1 del §4 de redundante en **obligatorio**: se mueve y se
comprueba al contrastar, **sin fiarse de lo que diga ningún documento**.

## Lo que abril añadió al procedimiento

- **El rodeo del día 30 primero funciona.** `30/04/2026` sobrevivió al blur en `ng-valid` y la base
  guardó el 30 de abril: **D15 no mordió**, y el formato quedó demostrado antes de teclear el día 1.
- **`PERIODO_LEIDO` en cada bloque.** El parámetro falla en **dos** direcciones y sólo teníamos
  escrita una: adelantado vacía los bloques, **atrasado contrasta el mes anterior entero y sale
  verde al céntimo**, que es el caso peor. Desde abril los siete bloques lo imprimen y es lo primero
  que se mira.
- **El censo de asientos acotado, con su contraprueba:** base **8179** antes de empezar, y **8179
  después de aprobar, contabilizar y cerrar**. El ciclo completo de un período histórico **no
  escribe un solo asiento**.
- **Los códigos reales de los conceptos**, que el guion advertía en abstracto y ahora tienen
  números: alterno **23 → `CPNMCDGO` 20 · 24 → 21 · 25 → 22**, roles **12 · 13 · 14**. Consultar por
  código devuelve **otros tres conceptos**, no un error.

## Lo que costó tiempo y no debería

- **El `mat-select` de *Aprobada* no acepta el clic automatizado** —se queda en su `No`, que es el
  valor con el que el motor descarta la fila—. Con teclado entra siempre.
- **Los refs del diálogo no son correlativos.** Suponerlo metió un importe **dentro del campo de
  concepto** —`Prestamo hipotec490.00ario IESS - 24`—; se canceló y se rehízo la fila. Se leen en
  cada fila.
- **En las diez novedades, lo único que cazó las tres cosas distintas fue releer el DOM**, no el
  rodeo de turno. El rodeo es la vía de entrada; **la comprobación es la relectura**.

## Y un defecto que estuvo activo todo el mes sin morder

**D23** —el diálogo de *Agregar* se abre precargado con la fila que se editó antes— estuvo vigente
durante las diez altas. **No mordió porque no se editó ninguna fila**, no por precaución. Si se
hubiera corregido una sola desde la rejilla, la siguiente alta habría salido precargada con
colaborador, concepto e importe **de un registro real**.
