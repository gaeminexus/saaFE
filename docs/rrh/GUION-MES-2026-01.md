# Guion de enero de 2026 — réplica en producción

> **Dónde vive cada cosa:** los `.sql` que este guion cita viven **sólo** en
> `saaBE/docs/logica-negocio/rhh/sql/`. Los `.md` sí están espejados en `saaFE/docs/rrh/`.

**Para qué es este documento.** Reproducir enero en otra base **siguiendo una lista**, sin volver a
razonar cómo se llegó a cada cifra. Todo lo de aquí está verificado contra la corrida del
2026-08-21, que cerró con **diferencia cero** contra el rol del cliente.

> **Enero es el mes más enredado de los cinco.** Dos liquidaciones, dos personas que entran a
> mitad de mes, un cambio de ficha que hay que deshacer antes de calcular, y dos avisos al IESS que
> nunca se declararon. Si sale bien enero, los otros cuatro son variaciones suyas.

**Resultado que hay que obtener:** 22 nóminas · ingresos **20 230,67** · descuentos **3 753,75** ·
líquido **16 476,92** · patronal **2 400,41**. Cliente: 16 476,92. **Diferencia cero en el total.**

> **Diferencia cero en el total no quiere decir bloque 2 vacío.** El contraste sacará **46 filas**
> por persona, y las 46 son esperadas: 44 del par de vacaciones del rol y 2 de medio centavo. Está
> explicado en el **§9**, y conviene leerlo *antes* de correr el contraste para no confundirlo con
> un fallo.

---

## 0. Antes de empezar: el orden no es negociable

```
fichas → crear el período → liquidaciones → novedades → calcular → contrastar → aprobar →
contabilizar rol → cerrar
```

Tres razones, todas aprendidas a base de romperlo:

1. **Las liquidaciones van antes del cálculo**, y su salida ejecutada también. Un finiquito que se
   aprueba después de calcular deja al mes con nóminas de quien ya no está — es lo que costó
   rehacer marzo.
2. **Las novedades van antes del cálculo.** El motor sólo recoge las que están aprobadas en el
   momento de calcular; registrarlas después no las mete en nada y nada avisa.
3. **La ficha de la persona se lee tal como está el día del cálculo**, no como estaba en el mes que
   se calcula. De ahí el paso 1, que es el más fácil de olvidar y el que más caro sale.

---

## 1. Fichas: dejar a Méndez Torres en media jornada

**Antes de tocar nada más.** El motor lee el contrato vigente, así que si Méndez está a tiempo
completo, enero la calculará a 482 y el mes saldrá **218,22 por encima**.

| Campo | Valor para enero |
|---|---|
| `CNTESLRB` (salario base) | **241,00** |
| `CNTEJRND` (jornada) | **2** — parcial |
| `CNTEHRSM` (horas semanales) | **20** |

En la corrida de agosto esto lo hizo `sql/48`. Su contrario, `sql/49`, la devuelve a 482 / jornada 1
/ 40 h, y **no se ejecuta hasta que enero, febrero y marzo estén cerrados** — la adenda es del
01-04.

> **Por qué es un script y no un dato del período:** `ContratoEmpleado` no tiene historia de
> vigencias. Es el punto 11 de la lista de calibración; mientras no exista, el contrato se mueve a
> mano entre meses.

---
## 2. Crear el período — el paso que ningún guion traía

**Sin período no hay dónde registrar novedades**, y la pantalla de Novedades no dice qué falta:
enseña el desplegable vacío. Se crea desde `Períodos de nómina` → *Agregar Registro*.

| Campo | Valor para enero |
|---|---|
| Año / Mes | **2026 / 1** |
| Fecha de inicio | **01-01-2026** |
| Fecha de fin | **31-01-2026** |
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

Se usa en el §7. **Anotarlo ahora**, no al final.

---


## 3. Las dos liquidaciones, aprobadas y con la salida ejecutada

Las dos son **anteriores al cálculo**. Sus titulares no deben aparecer en la nómina de enero: el
mes de la salida lo paga el finiquito, no el rol.

| LQDC | Colaborador | Contrato | Fecha de salida | Causal | Neto |
|---|---|---|---|---|---:|
| 21 | TORRES CHAVEZ ELIZABETH MARIA | 63 | **2026-01-15** | 4 · Despido intempestivo | **7 556,41** |
| 22 | BENITEZ MONTES GUILLERMINA NATASHA | 45 | **2026-01-16** | 1 · Renuncia voluntaria | **493,64** |

Por cada una: **simular → calcular y guardar → aprobar → ejecutar salida**. Simular primero no es
una formalidad: es la única forma de ver el desglose antes de comprometerlo, y `calcular` reescribe
en sitio si ya existe una del mismo contrato y fecha (no hace falta anular).

**«Ejecutar salida» pide una confirmación del navegador** y no se deshace: cierra el contrato, pasa
a la persona a CESANTE, avisa al IESS, cancela sus descuentos y caduca sus saldos de vacaciones.

Al ejecutarla nacen solas las dos novedades del IESS del paso 5.

---

## 4. Novedades del período: cinco, todas préstamos del IESS

Enero **no lleva anticipos como novedad**: los de Calderón y Pardo vienen de `CTDS`, la tabla de
cuotas, y el motor los aplica solo (350,00 a cada uno). Registrar además una novedad de anticipo
los cobraría dos veces.

| Concepto (alterno) | Cédula | Colaborador | Valor |
|---|---|---|---:|
| 23 · Préstamo quirografario IESS | 1719624809 | CALDERON PARRAGA LAURA CECILIA | **14,42** |
| 23 · Préstamo quirografario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 24 · Préstamo hipotecario IESS | 1715156574 | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Préstamo hipotecario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **379,85** |
| 24 · Préstamo hipotecario IESS | **0909917759** | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,29** |
| | | **quirografarios** | **171,63** |
| | | **hipotecarios** | **1 015,14** |

**Las cinco con «Aprobada para el cálculo» = Sí.** Una novedad sin aprobar se ignora sin decir nada.

> **Ojo con el combo de concepto:** elegir de la lista, no teclear y salir. Un combo a medias viaja
> como texto y el backend responde un 400 que no explica nada.


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
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 1
 ORDER BY n.NVNMCDGO;
-- Cinco filas, todas ENTRA.
```

---

## 5. Calcular, contrastar, y comprobar **antes** de mirar el total

El total puede cuadrar por compensación. Estas cuatro se miran primero:

| # | Comprobación | Esperado |
|---|---|---|
| 1 | Filas en `NMNA` | **22** |
| 2 | Días ≠ 30 | **exactamente dos**: Bravo Caiza **16**, Cevallos Montenegro **12**, **sin decimales** |
| 3 | Méndez Torres | **241,00 / 22,77 / 218,23** |
| 4 | Renglones de IR | **cero** |

**Si en la 2 aparecen decimales** (16,4516 y 12,5806), el motor está dividiendo por días de
calendario y no por el día del mes: el WAR no tiene la corrección y hay que parar.

**Anclajes de las cuotas de `CTDS`**, que confirman que los anticipos entraron una sola vez:

| Colaborador | Descuentos | Neto |
|---|---:|---:|
| CALDERON PARRAGA | 430,57 = 66,15 + 14,42 + **350,00** | **269,43** |
| PARDO CALLE | 416,15 = 66,15 + **350,00** | **283,85** |

Y la que ninguna otra sustituye:

| # | Comprobación | Esperado |
|---|---|---|
| 5 | **Cabecera contra suma de `NMNA`** | **iguales en las cuatro cifras** |
| 6 | Neto | **16 476,92** |

> **Por qué la 5 tiene entidad propia.** La cabecera de `PRDN` se acumula en memoria sobre los
> procesados; el detalle son las filas que quedan en `NMNA`. Si alguien deja de estar activo entre
> dos cálculos, la cabecera baja y el detalle no, y **las dos cifras divergen en silencio**. Es el
> punto 9. Cruzarlas es barato y es lo único que lo detecta.


### Y entonces contrastar, con el período todavía en estado 3

**Antes de aprobar, no después.** El contraste lee `NMNA`, `RNGL`, `PVNM` y `CTRL`, y **no lee
`ACMN`**, que es lo único que escribe `cerrarPeriodo`: da el mismo resultado en 3 que en 7. Si
destapa algo con el período en 3, se arregla recalculando; con el período cerrado habría que
reabrirlo, que es el **punto 6** y `reabrirPeriodo` no avisa.

1. `UPDATE RHH.CTRL_PARAM SET MES = 1; COMMIT;` **y comprobarlo, sin saltarse este paso ni aunque
   el ESTADO diga que ya está puesto** — el 2026-08-23 lo decía y estaba en otro mes.
   **El parámetro equivocado falla en dos direcciones, y sólo una es la que avisaba este guion:**
   - **Adelantado** —el mes aún sin calcular— todos los bloques salen **vacíos**, y un vacío se lee
     como que cuadra.
   - **Atrasado** —un mes anterior ya cerrado— no vacía nada: el instrumento **contrasta ese otro
     mes**, con su `CTRL` y su `NMNA` completos, y sale **verde al céntimo**. Es el caso peor: un
     verde entero y plausible del mes equivocado no tiene nada que lo delate.

   Por eso los siete bloques imprimen **`PERIODO_LEIDO`** desde el 2026-08-23. **Es lo primero que
   se mira en cada bloque, antes que ninguna cifra.** Si no dice `2026-01`, se para: da igual lo
   bien que se vea todo lo demás.
2. `CONTRASTE_MES_CONTRA_ROL_REAL.sql`, **bloque 4 primero**, luego 3, luego 1 y 2, y el 1B aunque
   todo cuadre.
3. Contra [`ESPERADO-CONTRASTE-ENERO.md`](ESPERADO-CONTRASTE-ENERO.md). El §9 explica las
   diferencias que este mes **debe** sacar.

**Sólo con el contraste en verde: aprobar → contabilizar rol → cerrar.**
---

## 6. Cerrar: enero avisa, y el aviso es la evidencia

`cerrarPeriodo` enumera las novedades del IESS sin declarar. En **modo histórico avisa y deja
cerrar**; en productivo bloquea.

| NVIS | Colaborador | Tipo | Hecho | Límite | Estado |
|---|---|---|---|---|---|
| 9 | TORRES CHAVEZ ELIZABETH MARIA | 2 · Aviso de salida | 2026-01-15 | 2026-01-18 | 1 PENDIENTE |
| 10 | BENITEZ MONTES GUILLERMINA NATASHA | 2 · Aviso de salida | 2026-01-16 | 2026-01-19 | 1 PENDIENTE |

**Las dos se quedan en PENDIENTE y sin fecha de reporte, para siempre.** No se marcan enviadas
—sería afirmar ante el IESS una fecha que no ocurrió— ni se anulan —sí correspondían: las dos
personas se fueron de verdad—. Son la prueba de lo que no se declaró.

Tras cerrar, `PRDNOBSR` debe decir:

```
Cerrado con 2 novedad(es) del IESS sin declarar (periodo historico, plazo vencido).
```

**No pulsar «Contabilizar provisiones».** Ningún mes de la serie lo hizo, y los cinco tienen que
quedar con la misma historia.

---

## 7. Qué debe quedar

**Cabecera de `PRDN`**

| Campo | Valor |
|---|---|
| `estado` | 7 CERRADO |
| `modo` | 1 HISTÓRICO SIN CONTABILIZAR |
| `numeroEmpleados` | 22 |
| Ingresos / Descuentos | 20 230,67 / 3 753,75 |
| **Neto** | **16 476,92** |
| Patronal | 2 400,41 |
| `asientoRol` / `asientoProvisiones` / `asientoPago` | **null / null / null** |

**`ACMN` — contar SIEMPRE filtrando por el período.** 132 filas · **22 personas** · tipos 1, 2, 3,
5, 8 y 10 con 22 cada uno · **tipo 9 (IR) vacío** · **suma del tipo 8 = 1 866,98**, que es el
concepto 20 del cliente al centavo.

> **Enero crece por dos sitios a la vez, y por eso un conteo sin filtrar engaña.** Además del
> período, **las dos salidas del 15 y el 16 escriben sus propios acumulados**:
> `escribeAcumuladosDelFiniquito` graba tres por liquidación —`GRAVADO_IR`, `APORTE_PERSONAL`,
> `IMPONIBLE_IESS`— **sin período**, y sólo los distintos de cero.
>
> **Ojo: los de apertura TAMBIEN van sin período.** `ACMNAPRT = 'S'` los distingue, y sin ese
> filtro el conteo engaña.
>
> Al cerrar enero el total debe ser **172 filas**: 132 del período + **34 de la apertura** +
> **6 de los dos finiquitos**. Verificado en producción el 2026-08-21.

```sql
-- Los del período. 132 filas, 22 personas, tipo 9 vacio.
SELECT a.ACMNTPAC AS TIPO, COUNT(*) AS FILAS,
       COUNT(DISTINCT a.MPLDCDGO) AS PERSONAS, SUM(a.ACMNVLOR) AS VALOR
  FROM RHH.ACMN a
  JOIN RHH.PRDN p ON p.PRDNCDGO = a.PRDNCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 1
 GROUP BY a.ACMNTPAC ORDER BY 1;

-- Y los de los dos finiquitos. TRES por persona, ninguno en cero.
-- Sin esto Torres Chavez cobro 7.556,41 y para el RDEP no cobro nada.
SELECT m.MPLDIDNT, m.MPLDAPLL, a.ACMNTPAC AS TIPO, a.ACMNVLOR AS VALOR
  FROM RHH.ACMN a JOIN RHH.MPLD m ON m.MPLDCDGO = a.MPLDCDGO
 WHERE a.PRDNCDGO IS NULL AND a.ACMNANOO = 2026
   AND NVL(a.ACMNAPRT, 'N') <> 'S'          -- excluye los de APERTURA, que tambien van sin periodo
   AND m.MPLDIDNT IN ('0602237265', '1714531405')
 ORDER BY m.MPLDAPLL, a.ACMNTPAC;
-- Seis filas: tipos 1, 2 y 8 para cada una.
-- SIN el filtro de ACMNAPRT saldrian tambien los de apertura y el conteo enganaria:
-- Castro Arce y Cevallos Aleman tienen DOS filas de apertura cada uno.
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

**Las 22 nóminas**

> **Foto del 2026-08-21, WAR desplegado a las 05:34.** Esta tabla es **nuestra propia salida**, no
> el rol del cliente: sirve para saber **quién** diverge cuando un total no cuadra, no sólo que
> algo diverge. Pero caduca. Si la base local se recalcula por cualquiera de los puntos de la lista
> de calibración, el guion empieza a mentir sin avisar.
>
> **Antes de fiarse de ella, regenerarla:**
>
> ```sql
> SELECT m.MPLDIDNT, m.MPLDAPLL || ' ' || m.MPLDNMBR AS COLABORADOR,
>        n.NMNADITR AS DIAS, n.NMNATING AS INGRESOS,
>        n.NMNATDSC AS DESCUENTOS, n.NMNANETO AS NETO
>   FROM RHH.NMNA n
>   JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
>   JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
>  WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 1
>  ORDER BY m.MPLDAPLL;
> ```
>
> Si el resultado no coincide con esta tabla, **manda el resultado**, y hay que averiguar qué
> cambió antes de seguir usando el guion.

| Identificación | Colaborador | Días | Ingresos | Descuentos | Neto |
|---|---|---:|---:|---:|---:|
| 1717991341 | BARCENAS BERMEO DANIELA ROMINA | 30 | 700,00 | 66,15 | 633,85 |
| 2150051205 | BRAVO CAIZA WENDI JULIANA | **16** | 373,33 | 35,28 | 338,05 |
| 1753528379 | CAIZA REMACHE LIZETH ABIGAIL | 30 | 482,00 | 45,55 | 436,45 |
| 1719624809 | CALDERON PARRAGA LAURA CECILIA | 30 | 700,00 | 430,57 | 269,43 |
| 1720245735 | CASTRO ARCE LESLY MARICELA | 30 | 482,00 | 45,55 | 436,45 |
| 1716501778 | CEVALLOS ALEMAN EDGAR GIOVANNY | 30 | 482,00 | 45,55 | 436,45 |
| 1311981953 | CEVALLOS MONTENEGRO JOHNNY STEVEN | **12** | 800,00 | 75,60 | 724,40 |
| 1715156574 | COSSIO CAICEDO EIMY | 30 | 798,50 | 556,15 | 242,35 |
| 1750302984 | GARCIA VITERI WILLAM ALEXANDER | 30 | 700,00 | 66,15 | 633,85 |
| 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | 30 | 2 206,84 | 726,06 | 1 480,78 |
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
| 1307779064 | ZAMBRANO MIELES TANYA GISSELA | 30 | 500,00 | 47,25 | 452,75 |

**Torres Chávez y Benítez Montes no están**, y es correcto: salieron en enero y las paga su
finiquito. **Castro Arce y Cevallos Alemán sí están**, aunque salieran en marzo: en enero
trabajaron el mes entero.

---

## 8. Las cuatro cosas que hacen fallar enero

| Síntoma | Causa | Qué mirar |
|---|---|---|
| Neto **+218,22** (16 695,14) | Méndez a 482: falta el paso 1 | Su fila: 482,00 en vez de 241,00 |
| **20 filas** en vez de 22, y cabecera ≠ detalle | El motor perdió a Castro y Cevallos por estar CESANTES | La consulta de contratos filtra por estado del empleado en vez de por contrato vigente |
| Días con decimales | Prorrateo por días de calendario | Bravo Caiza en 16,4516 |
| Un renglón de IR en Robayo | Falta ponerlo exento | `CNTENRIR` |

Las cuatro se ven **antes** de mirar el total, que es la razón de que el paso 4 vaya en ese orden.

---

## 9. Diferencias que no son defecto

**El total cierra en cero. Las filas por persona no están vacías.** Son dos cosas distintas y
conviene no confundirlas: leer un total cancelado como si no hubiera filas debajo es exactamente el
error que advierte el §5.

El contraste del bloque 2 de enero saca **46 filas**, y las 46 son esperadas:

### Las 44 del par de vacaciones

El rol del cliente lleva, por cada persona, **un ingreso y un descuento de vacaciones que se
cancelan entre sí**. Son 22 × 2 = **44 filas**, **823,19** por cada lado, y **no tocan el líquido**.

**Nuestro motor no genera esos renglones**, así que salen como diferencia en los dos sentidos y se
neutralizan. Es cosa de presentación del rol del cliente, no un cálculo que nos falte.

| Mes | Importe del par | Por qué |
|---|---:|---|
| Enero | **823,19** | El sueldo del mes (concepto 1: 19 756,33) dividido entre 24, redondeado por fila |
| Febrero | **886,80** | Sube porque Bravo Caiza y Cevallos Montenegro ya cobran mes completo |
| Marzo en adelante | **—** | Desaparece: el bloque 2 vuelve a tres filas |

> **Por qué esto va escrito y no se descubre solo.** Quien replique enero verá 46 filas donde
> espera dos y creerá que algo se rompió. Es «una ausencia no se ve sola» del revés: **una
> presencia que nadie anunció parece un hallazgo**. Al backend se le pasó en su primer esperado y
> tuvo que corregirlo; escrito aquí, no vuelve a pasar.

### Las 2 restantes

Los medio centavos de redondeo, que **sí salen fila por fila** aunque el total los cancele:

| Colaborador | Diferencia | Origen |
|---|---:|---|
| MANOSALVAS LLERENA FERNANDO PAUL | **+0,01** | Regla 4: nosotros redondeamos cada renglón antes de sumar; la hoja del cliente arrastra los decimales y sólo redondea al mostrar |
| MUÑOZ SANTOS MARCELO ALEJANDRO | **−0,01** | Lo mismo, con el signo contrario |

Se cancelan en el total. **No se ajustan**: la hoja del cliente ni siquiera cuadra consigo misma en
esas dos filas, y el pago salió por su celda de líquido, no por la resta de sus columnas.

### De los otros meses

Sólo **abril** queda con diferencia en el total: **+175,00**, los OTROS de Calderón que el rol no
clasifica. Pregunta abierta con Steven.

---

## Referencias

- Valores del cliente: `sql/31` y `sql/35` cargan `RHH.CTRL` de enero.
- Contraste: `CONTRASTE_MES_CONTRA_ROL_REAL.sql` con `CTRL_PARAM` en el mes 1.
- Correcciones del motor que hacen falta: prorrateo `30 − d + 1`, `CNTENRIR` de Robayo y selección
  de nómina por contrato vigente. Sin las tres, enero no da 16 476,92.
- **En DBeaver el contraste se corre tal cual.** Sus renglones `--` sueltos sólo se tragan la
  sentencia siguiente en SQL\*Plus; para ese camino está `CONTRASTE_MES_CONTRA_ROL_REAL.sqlplus.bak`.
- **Todos los scripts viven en `saaBE/docs/logica-negocio/rhh/sql/`**, nunca en el repositorio del
  frontend.

---

## Ejecutado en producción el 2026-08-21 — diferencia cero

Este guion **ya se corrió**, y salió. `PRDN 1` · estado 7 · modo 1 · neto **16 476,92** contra
16 476,92 del cliente. Los cinco bloques del contraste exactamente como los fijaba el esperado.

**Dos cosas que hicieron falta y que este guion no anticipaba**, resueltas y anotadas para el
próximo cliente:

- **`sql/53b`** — el `sql/05` había corrido dos veces en producción y `PRDN`, `NMNA` y `LQDC` se
  habían quedado sin su columna de estado. Sin eso no se podía crear ni el primer finiquito.
- **`sql/54`** — `CPNMROLM` 17–22 en nulo, así que las provisiones se escribían sin concepto y sin
  cuenta contable. Lo destapó el bloque 1B del contraste, que sacó **una** fila de provisión con el
  nombre en blanco donde local saca cuatro.

**Las dos son la misma familia:** un `UPDATE` o un `ADD` que no encuentra lo que espera **no da
error**. Es la regla operativa 2, y en esta réplica mordió tres veces.

---

# Lo que enseñó ejecutarlo — 2026-08-23

> **Este guion ya no es un plan: es un registro.** Enero se replicó en producción el **2026-08-21**
> y cerró en 16 476,92 con diferencia cero. Lo de aquí abajo es lo que **cambió al ejecutarlo**, y
> es lo que va a necesitar quien instale al próximo cliente.
>
> *Reconstruido de la bitácora de defectos y del `ESTADO-RRHH.md`; enero no lo ejecutó la sesión
> que escribe esta sección.*

## Enero fue el mes que descubrió los pasos que faltaban

**Lo que este guion no traía y hubo que inventar sobre la marcha:**

| Falta | Qué pasó | Dónde está ahora |
|---|---|---|
| **Crear el período** | No estaba en ningún guion. Sin período no hay dónde registrar novedades, y la pantalla de Novedades **no dice qué falta**: enseña el desplegable vacío | Es el **§2** de los cinco guiones |
| **La comprobación del rango** | Nadie la pedía. Con un rango que no sea el mes `calcularPeriodo` **no revienta**: prorratea | §2, y hoy con **cuatro** veredictos |
| **Comprobar que las novedades van a entrar** | Se daba por hecho que «Aprobada = Sí» bastaba. No basta: hacen falta `aprobada = 'S'` **y** `estado = 1` | §3 de los cinco |

**Y el orden estaba mal, aunque salió bien.** Enero se contrastó **después de cerrar**. Funcionó por
suerte: si el contraste hubiera destapado algo, el mes ya estaba cerrado y habría hecho falta
reabrirlo —y `reabrirPeriodo` no avisa—. **Desde febrero el contraste va en estado 3 CALCULADO**,
antes de aprobar, y ahí un fallo se arregla recalculando. Está verificado que da el mismo resultado
en 3 que en 7: el instrumento lee `NMNA`, `RNGL`, `PVNM` y `CTRL`, y **no lee `ACMN`**, que es lo
único que escribe `cerrarPeriodo`.

## Los defectos de pantalla nacieron aquí

Enero destapó **D9 a D17** — la mitad de la bitácora entera. Los dos que siguen mordiendo cada mes:

- **D15**, una fecha inválida se sustituye **en silencio** por la de hoy. Se detectó releyendo el
  `input` desde el DOM, no mirando la pantalla. De aquí sale el rodeo del **día 30/31 primero**, que
  desde abril se aplica en todos los meses y ha funcionado siempre.
- **D17**, el combo de Período que no se llena. **Ojo: es intermitente.** En enero hizo falta
  re-elegir el ejercicio; en abril y en mayo **no**. Tres intentos, dos limpios.

## El rodeo que resultó innecesario

**El censo total de `CNT.ASNT` no vale, y enero lo usó.** La corrección llegó en febrero, cuando
entre fijar la base 8174 y aprobar el mes **nacieron cinco asientos ajenos** de T-EGRESOS y CXP: un
censo total los habría leído como contabilización de la nómina. Desde entonces el §6 de los cinco
guiones **acota a `ASNTCDGO > :BASE`**. Un control que no distingue quién escribió no es un control.

## Los códigos de este guion son de LOCAL, no de producción

**`LQDC` 21 y 22 en la tabla del §3 son los códigos de local.** En producción, Torres Chávez salió
con el **1** y Benítez Montes con el **2**. Lo mismo con `PRDN`: aquí pone lo que salió en local, y
en producción enero es el **1**, febrero el **2**, marzo el **21**, abril el **41** y mayo el **42**
— una serie que **no es deducible**. **Ningún código de este documento sirve para consultar la base
de otro entorno**: se leen de la propia base, o de la URL de la pantalla (D21).
