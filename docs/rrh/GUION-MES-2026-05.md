# Guion de mayo de 2026 — réplica en producción

> **Dónde vive cada cosa:** los `.sql` que este guion cita viven **sólo** en
> `saaBE/docs/logica-negocio/rhh/sql/`. Los `.md` sí están espejados en `saaFE/docs/rrh/`.

**Para qué es este documento.** Reproducir mayo en otra base **siguiendo una lista**. Verificado
contra la corrida del 2026-08-21, que cerró con **diferencia cero** contra el rol del cliente.

> **Mayo es el mes en que las cuentas del IESS se ponen al día.** Desaparece el quirografario de
> Castro Arce que se arrastraba desde marzo, y el control 3 cuadra al centavo por primera vez en
> el año. También es el mes en que Calderón queda en líquido cero, que es correcto.

**Resultado que hay que obtener:** 20 nóminas · ingresos **21 034,34** · descuentos **4 999,13** ·
líquido **16 035,21** · patronal **2 498,04**. Cliente: 16 035,21. **Diferencia cero en el total.**

> El bloque 2 saca **tres filas**. El par de vacaciones ya no está desde marzo, y los 175,00 de
> Calderón no se arrastran a mayo. §8.

---

## 0. El orden

```
crear el período → novedades → calcular → contrastar → aprobar → contabilizar rol → cerrar
```

**Mayo no tiene cambios de ficha ni liquidaciones.** Nadie entra, nadie sale, nadie cambia de
sueldo ni de jornada. Sólo novedades.

---

## 1. Fichas: nada que tocar

Méndez Torres sigue como quedó en abril: **482,00 / jornada 1 / 40 h**. Si viene de haber cerrado
abril, está puesta.

---

## 2. Crear el período — el paso que ningún guion traía

**Sin período no hay dónde registrar novedades**, y la pantalla de Novedades no dice qué falta:
enseña el desplegable vacío. Se crea desde `Períodos de nómina` → *Agregar Registro*.

| Campo | Valor para mayo |
|---|---|
| Año / Mes | **2026 / 5** |
| Fecha de inicio | **01-05-2026** |
| Fecha de fin | **31-05-2026** |
| Tipo de período | **MENSUAL** |
| Modo | **1 · HISTÓRICO SIN CONTABILIZAR** |

**El modo no se puede corregir después sin rehacer el mes.** En modo 2 el período exige asiento
contable y `contabilizarRol` se negaría; de enero a julio ninguno lleva contabilidad, porque ya la
hizo el cliente a mano.

### Cómo se teclean las fechas

| Pantalla | Formato |
|---|---|
| Diálogo de **períodos** | `dd/mm/yyyy` |
| **Finiquito**, campo *Fecha de salida* | `mm/dd/yyyy` |

**En el diálogo de períodos, equivocarse no da error: da la fecha de HOY** (defecto D15). El control
no se marca en rojo ni se queda vacío — se rellena solo con un valor plausible y el formulario se ve
perfectamente relleno.

**Teclear primero la fecha de fin.** `31-05-2026` sólo es legible en `dd/mm`, así que si el campo la
acepta sin convertirla en la fecha de hoy, **el formato queda demostrado antes de teclear el día 1**,
que es el ambiguo. El mes se autovalida.

### La comprobación del rango, inmediatamente después de guardar

Va **antes** de registrar la primera novedad. Con un rango que no sea el mes, `calcularPeriodo` no
revienta: calcula, y prorratea a todo el mundo por los días del rango.

```sql
SELECT PRDNCDGO, PRDNANOO, PRDNMSEE, PRDNFCHI, PRDNFCHF, PRDNMODO,
       CASE WHEN EXTRACT(MONTH FROM PRDNFCHI) = PRDNMSEE
             AND EXTRACT(MONTH FROM PRDNFCHF) = PRDNMSEE
             AND EXTRACT(YEAR  FROM PRDNFCHI) = PRDNANOO
             AND EXTRACT(YEAR  FROM PRDNFCHF) = PRDNANOO
             AND PRDNMODO = 1
            THEN 'OK' ELSE '*** REVISAR: BORRAR EL PERIODO Y REHACERLO ***' END AS VEREDICTO
  FROM RHH.PRDN ORDER BY PRDNANOO, PRDNMSEE;
```

**Se corrige borrando el período y creándolo de nuevo**, no editando las fechas: si ya se calculó
algo sobre el rango malo, la edición deja nóminas de un rango y cabecera de otro.

### El combo de Período no se llena hasta re-elegir el ejercicio

Defecto D17. Tras crear el período, si el desplegable de novedades sigue vacío, hay que volver a
elegir el año. No es que el período no exista.

### Anotar la base de asientos, antes de nada

```sql
SELECT MAX(ASNTCDGO) AS BASE FROM CNT.ASNT;
```

Se usa en el §6. **Anotarlo ahora**, no al final.

---

## 3. Novedades del período: ocho

**Tres anticipos y cinco préstamos.** Todas con «Aprobada para el cálculo» = **Sí**.

| Concepto (alterno) | Cédula | Colaborador | Valor |
|---|---|---|---:|
| 23 · Quirografario IESS | 1719624809 | CALDERON PARRAGA LAURA CECILIA | **14,04** |
| 23 · Quirografario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 24 · Hipotecario IESS | 1715156574 | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Hipotecario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **379,85** |
| 24 · Hipotecario IESS | **0909917759** | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,29** |
| 25 · Anticipo de sueldo | 1719624809 | CALDERON PARRAGA LAURA CECILIA | **619,81** |
| 25 · Anticipo de sueldo | 0103179537 | MOSCOSO NOVILLO DIANA CECILIA | **750,00** |
| 25 · Anticipo de sueldo | **0909917759** | PAZMIÑO JARAMILLO EDGAR ALBERTO | **500,00** |
| | | **quirografarios** | **171,25** |
| | | **hipotecarios** | **1 015,14** |
| | | **anticipos** | **1 869,81** |

**Tres cosas que cambian respecto a abril y que hay que respetar:**

- **Viteri López y Robayo Rueda dejan de tener quirografario.** En abril eran 420,23 y 95,48; en
  mayo, **nada**. Si aparecen esos importes, es que se arrastró la novedad del mes anterior.
- **El quirografario de Calderón baja de 14,13 a 14,04.**
- **Pazmiño Jaramillo es nuevo en anticipos** (500,00). Los anticipos suben de 1 300,00 a 1 869,81.


> **Las cédulas están en la fila a propósito, y elegir por cédula es obligatorio, no cómodo.** Hay
> **dos Pazmiños** —Jaramillo `0909917759` y Moreno `2100192463`—. El combo de contrato **no acota
> por colaborador** (defecto D9), y teclear la cédula es lo único que deja un solo candidato.

> **23, 24 y 25 son `CPNMALTR`, no `CPNMCDGO`.** Una consulta de verificación contra
> `CPNMCDGO = 23` devuelve **otro concepto**. Filtrar siempre por `CPNMALTR`.

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
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 5
 ORDER BY n.NVNMCDGO;
-- Ocho filas, todas ENTRA.
```

---

## 4. Calcular, contrastar, y comprobar antes del total

| # | Comprobación | Esperado |
|---|---|---|
| 1 | Filas en `NMNA` | **20** |
| 2 | Días ≠ 30 | **ninguno** |
| 3 | Méndez Torres | **482,00 / 45,55 / 436,45** |
| 4 | Renglones de IR | **cero** |
| 5 | **Cabecera contra suma de `NMNA`** | **iguales en las cuatro cifras** |
| 6 | Neto | **16 035,21** · diferencia **cero** |
| 7 | Viteri y Robayo | **sin quirografario** — Viteri en 207,90 de descuentos, Robayo en 141,75 |

**Calderón queda en líquido CERO, y es correcto:**

```
66,15 (aporte) + 14,04 (quirografario) + 619,81 (anticipo) = 700,00 = su sueldo
```

Ya pasó en febrero. **No es un error de carga y no se reporta como tal.**


### Y entonces contrastar, con el período todavía en estado 3

**Antes de aprobar, no después.** El contraste lee `NMNA`, `RNGL`, `PVNM` y `CTRL`, y **no lee
`ACMN`**, que es lo único que escribe `cerrarPeriodo`: da el mismo resultado en 3 que en 7. Si
destapa algo con el período en 3, se arregla recalculando; con el período cerrado habría que
reabrirlo, que es el **punto 6** y `reabrirPeriodo` no avisa.

1. `UPDATE RHH.CTRL_PARAM SET MES = 5; COMMIT;` y comprobarlo — **con el parámetro en otro mes
   todos los bloques salen vacíos y se leen como que cuadra.**
2. `CONTRASTE_MES_CONTRA_ROL_REAL.sql`, **bloque 4 primero**, luego 3, luego 1 y 2, y el 1B aunque
   todo cuadre.
3. Contra [`ESPERADO-CONTRASTE-MAYO.md`](ESPERADO-CONTRASTE-MAYO.md). El §8 explica las
   diferencias que este mes **debe** sacar.

**Sólo con el contraste en verde: aprobar → contabilizar rol → cerrar.**
---

## 5. Cerrar

**Mayo no debe avisar.** No tiene ninguna NVIS en su ventana.

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
| Ingresos / Descuentos | 21 034,34 / 4 999,13 |
| **Neto** | **16 035,21** |
| Patronal | 2 498,04 |
| Asientos | **null / null / null** |

**`ACMN` — contar SIEMPRE filtrando por el período.** 120 filas · **20 personas** · tipos 1, 2, 3,
5, 8 y 10 con 20 cada uno · **tipo 9 (IR) vacío** · **suma del tipo 8 = 1 942,93**, idéntica a la de abril porque los sueldos no cambiaron.

> **Un conteo sin filtrar da un número que no se parece a nada y parece un fallo.** `RHH.ACMN`
> acumula todo el año: al cerrar este mes el total debe ser **670 filas** —132 de enero,
> 132 de febrero, 120 de cada mes desde marzo, **34 de la apertura** y **12 de los cuatro
> finiquitos** (3 por liquidación)—. **Las 46 sin período no se mueven**: este mes no tiene salidas.

```sql
SELECT a.ACMNTPAC AS TIPO, COUNT(*) AS FILAS,
       COUNT(DISTINCT a.MPLDCDGO) AS PERSONAS, SUM(a.ACMNVLOR) AS VALOR
  FROM RHH.ACMN a
  JOIN RHH.PRDN p ON p.PRDNCDGO = a.PRDNCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 5
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
>  WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 5
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
| 1311981953 | CEVALLOS MONTENEGRO JOHNNY STEVEN | 30 | 2 000,00 | 189,00 | 1 811,00 |
| 1715156574 | COSSIO CAICEDO EIMY | 30 | 798,50 | 556,15 | 242,35 |
| 1750302984 | GARCIA VITERI WILLAM ALEXANDER | 30 | 700,00 | 66,15 | 633,85 |
| 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | 30 | 2 206,84 | 726,06 | 1 480,78 |
| 1004350904 | MENDEZ TORRES DIANA ALEJANDRA | 30 | 482,00 | 45,55 | 436,45 |
| 0103179537 | MOSCOSO NOVILLO DIANA CECILIA | 30 | 1 715,00 | 896,10 | 818,90 |
| 1717649873 | MUÑOZ SANTOS MARCELO ALEJANDRO | 30 | 550,00 | 51,98 | 498,02 |
| 1723962849 | NIETO CONDE KAROL POLETH | 30 | 900,00 | 85,05 | 814,95 |
| 1726657164 | PARDO CALLE KATHERINE GUISSELA | 30 | 700,00 | 66,15 | 633,85 |
| 0909917759 | PAZMIÑO JARAMILLO EDGAR ALBERTO | 30 | 1 500,00 | 787,04 | 712,96 |
| 2100192463 | PAZMIÑO MORENO DIANA CAROLINA | 30 | 500,00 | 47,25 | 452,75 |
| 1725996498 | ROBAYO RUEDA GABRIEL PATRICIO | 30 | 1 500,00 | **141,75** | 1 358,25 |
| 0801999855 | RODRIGUEZ VALENCIA NATALIA ADRIANA | 30 | 700,00 | 66,15 | 633,85 |
| 1712362720 | RODRIGUEZ ZAMBRANO LILIANA DE LAS MERCEDES | 30 | 1 500,00 | 141,75 | 1 358,25 |
| 1712232659 | VITERI LOPEZ JIMENA DEL PILAR | 30 | 2 200,00 | **207,90** | 1 992,10 |
| 1307779064 | ZAMBRANO MIELES TANYA GISSELA | 30 | 500,00 | 47,25 | 452,75 |

Los descuentos de **Viteri (207,90)** y **Robayo (141,75)** son sólo aporte: es la comprobación 7
vista en la tabla.

---

## 7. Lo que hace fallar mayo

| Síntoma | Causa | Qué mirar |
|---|---|---|
| Viteri con 628,13 de descuentos | Se arrastró su quirografario de abril (420,23) | En mayo debe ser **207,90** |
| Robayo con 237,23 | Se arrastró su quirografario de abril (95,48) | En mayo debe ser **141,75** |
| Calderón con neto ≠ 0,00 | Falta el anticipo de 619,81 o el quirografario de 14,04 | 66,15 + 14,04 + 619,81 = 700,00 |
| Quirografarios ≠ 171,25 | Se registró el de Castro Arce | En mayo el IESS deja de cobrarlo |
| Mayo avisa al cerrar | La ventana del backend no coincide | Mayo no tiene NVIS propias |

---

## 8. Diferencias que no son defecto

**El total cierra en cero.** El bloque 2 saca **tres filas**.

### Ni par de vacaciones ni OTROS de Calderón

- **El par de vacaciones desapareció en marzo.** En enero eran 44 filas por 823,19 y en febrero por
  886,80; desde marzo, cero.
- **Los 175,00 de OTROS de Calderón son de abril y no se arrastran.** El rol de mayo ya no los trae.

Quien venga de replicar abril espera cinco filas y ve tres. **En mayo, tres es lo correcto.**

### Las tres

| Colaborador | Diferencia | Origen |
|---|---:|---|
| ROBAYO RUEDA GABRIEL PATRICIO | **−20,17** en DESCUENTOS y **+20,17** en LIQUIDO | El IR que el cliente no retiene hasta agosto. **Política del cliente, no defecto** |
| MANOSALVAS LLERENA FERNANDO PAUL | **+0,01** | Regla 4: redondeamos por renglón, la hoja arrastra decimales |
| MUÑOZ SANTOS MARCELO ALEJANDRO | **−0,01** | Lo mismo, con signo contrario |

> **Ojo con Robayo:** tras la corrección de `CNTENRIR` **no tiene renglón de IR** en ninguno de los
> cinco meses, así que el líquido cuadra en cero. Su diferencia aparece sólo en el contraste contra
> lo que el cliente declaró, no en nuestro cálculo.

### El control 3 cuadra por primera vez

**171,25 nuestro contra 171,25 del IESS.** El quirografario de Castro Arce dejó de cobrarse: con
marzo y abril suman los **29,58** que ASOPREP asumió y que Steven confirmó. **Si sale diferencia en
el control 3 de mayo, es hallazgo.**

---

## Referencias

- Valores del cliente: `sql/46` carga `RHH.CTRL` de mayo. **No toca fichas**: mayo no tiene cambios.
- Contraste: `CONTRASTE_MES_CONTRA_ROL_REAL.sql` con `CTRL_PARAM` en el mes 5.
- Rol y planilla coinciden en número: **20 y 20**, sin discrepancia del bloque 3.
- **En DBeaver el contraste se corre tal cual.** Sus renglones `--` sueltos sólo se tragan la
  sentencia siguiente en SQL\*Plus; para ese camino está `CONTRASTE_MES_CONTRA_ROL_REAL.sqlplus.bak`.
- **Todos los scripts viven en `saaBE/docs/logica-negocio/rhh/sql/`**, nunca en el repositorio del
  frontend.
