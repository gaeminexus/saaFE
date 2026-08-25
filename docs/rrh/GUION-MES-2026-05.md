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

> **⚠ Este total es PREDICCIÓN, no observación. Añadido el 2026-08-23.** La única corrida de mayo
> que existe es la de **local con el motor anterior** a `CNTENRIR`, que dio **16 015,04** con
> **−20,17** contra el cliente. El **16 035,21** sale de devolverle el IR de Robayo que el motor
> final ya no genera. **Mismo caso que abril**, y misma consecuencia: si el total no sale clavado,
> el primer sospechoso es esa suma y no la réplica, y **el discriminador es el bloque 2** —tres
> filas, Manosalvas ×2 y Muñoz ×1, y **ninguna de Robayo**—, nunca el total.
>
> **Actualización del 2026-08-23: la derivación ya se validó una vez, en abril.** Allí la misma
> resta —16 069,05 del motor viejo más los 20,17 de Robayo = 16 089,22— **salió clavada contra
> producción**. Eso sube la confianza en el 16 035,21 de mayo, **pero no lo convierte en
> observación**: sigue sin existir un mayo calculado con el motor final. La regla de parada no
> cambia, y el discriminador sigue siendo el bloque 2.

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

1. `UPDATE RHH.CTRL_PARAM SET MES = 5; COMMIT;` **y comprobarlo, sin saltarse este paso ni aunque
   el ESTADO diga que ya está puesto** — el 2026-08-23 lo decía y estaba en otro mes.
   **El parámetro equivocado falla en dos direcciones, y sólo una es la que avisaba este guion:**
   - **Adelantado** —el mes aún sin calcular— todos los bloques salen **vacíos**, y un vacío se lee
     como que cuadra.
   - **Atrasado** —un mes anterior ya cerrado— no vacía nada: el instrumento **contrasta ese otro
     mes**, con su `CTRL` y su `NMNA` completos, y sale **verde al céntimo**. Es el caso peor: un
     verde entero y plausible del mes equivocado no tiene nada que lo delate.

   Por eso los siete bloques imprimen **`PERIODO_LEIDO`** desde el 2026-08-23. **Es lo primero que
   se mira en cada bloque, antes que ninguna cifra.** Si no dice `2026-05`, se para: da igual lo
   bien que se vea todo lo demás.
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

---

# Lo que enseñó ejecutarlo — 2026-08-23

> Mayo se replicó en producción el **2026-08-23** —`PRDN` **42**— y cerró en **16 035,21**, con
> **diferencia cero**. Es el quinto y último mes de la calibración. *Escrito por la sesión que lo
> ejecutó.*

## El rodeo del mes anterior fue el que casi rompe éste

Abril dejó escrito que los `mat-select` y los autocompletes se manejan **con teclado**, porque el
clic automatizado no prendía. En mayo ese mismo rodeo eligió **la opción equivocada** en los dos
combos del diálogo de períodos:

```
Tipo de período = [QUINCENAL]                    ← debía ser MENSUAL
Modo            = [PRODUCTIVO CONTABILIZA]       ← debía ser HISTORICO SIN CONTABILIZAR
```

**La causa:** en Novedades la cédula había dejado **un solo candidato** en la lista, así que `Down`
bajaba a él. Aquí los combos se abren **sin filtrar y con la primera opción ya activa**, y `Down`
baja a **la segunda**.

**La regla, corregida:** teclear siempre hasta que quede **una sola** opción, comprobarlo
—`document.querySelectorAll('.cdk-overlay-container mat-option')` debe devolver un elemento— y sólo
entonces `Down` + `Enter`. Y releer el `value`, que es lo que lo cazó.

> **La lección, que vale para toda la réplica:** **el rodeo no es la comprobación.** Un rodeo es una
> vía de entrada y puede fallar de forma nueva en cada pantalla. **La comprobación es releer el
> DOM**, y es lo único que ha cazado las cuatro cosas distintas de estos dos meses: el combo que no
> prende, el importe en el campo equivocado, la opción de al lado y el campo que nadie mira.

## De los dos combos mal elegidos, el peligroso no era el que parecía

| Campo | Cuándo se nota | Quién lo caza |
|---|---|---|
| Rango de fechas | al calcular | los días ≠ 30 |
| **Modo** | en `contabilizarRol` o al cerrar | revienta, o emite asiento donde no debía |
| **Tipo (`PRDNTPNM`)** | **nunca** | **nadie** |

**Nadie lee `PRDNTPNM`**: `getTipoPeriodo()` no tiene un solo llamador. Un `QUINCENAL` no habría
movido una cifra ni habría mordido al cerrar — se habría quedado mal **para siempre** en el registro
histórico del cliente. **Que no rompa nada es lo que lo hace el peor de los tres.** El control de
rango lleva desde entonces **cuatro** veredictos, no tres.

## Lo que mayo confirmó del resto

- **La derivación del total se sostuvo por segunda vez.** Mayo también era predicción —16 015,04 del
  motor viejo más los 20,17 de Robayo— y salió clavado, como abril.
- **El filo de Calderón cayó del lado bueno.** Su neto aterriza en **0,00 exacto**
  (700,00 − 66,15 − 14,04 − 619,81) y el único concepto recortable de los cuatro suyos es el
  anticipo. Un céntimo de desvío habría bajado el subtotal a 1 869,80 y lo habrían visto **los dos**
  detectores a la vez. Se verificó por tres vías independientes: subtotal 1 869,81, bloque 1 vacío y
  Calderón ausente del bloque 2.
- **D17 no se reprodujo, por segunda vez.** Tres intentos en total, dos limpios. **No es «no
  reproducible»: es intermitente**, y archivarlo como lo primero es peor que no haberlo anotado.
- **Ocho novedades, no diez**, y las tres diferencias contra abril se respetaron: ni Viteri ni
  Robayo en quirografarios, Calderón en 14,04, y **Pazmiño Jaramillo dos veces** —la única persona
  repetida de la lista y la única con homónimo—. En las dos filas se leyó el overlay antes de
  elegir: **un solo candidato las dos veces**.

## Y un defecto nuevo que salió de navegar, no de cargar

**D25**: una URL profunda no sobrevive a una recarga. Rebota por `/Saa/login` y aterriza en
`/Saa/menu`. **La sesión no se pierde** —`logged` sigue en `true`—; lo que se pierde es el destino.
Se combina mal con **D21**: si el `PRDNCDGO` sólo se lee de la URL y la URL no se puede recargar ni
compartir, el dato existe y **no hay forma de llegar a él dos veces**.

## Al terminar mayo

**Cinco meses cerrados y contrastados en producción, cuatro con diferencia cero** y abril con sus
+175,00 identificados y abiertos con el cliente. **La migración visual y el motor siguieron
congelados los cinco meses**: todo lo encontrado se anotó y se esquivó, y nada de lo anotado alteró
un número. Junio y julio quedan pendientes de la conversación con el cliente; ninguna de las
correcciones del motor los bloquea.
