# Guion de marzo de 2026 — réplica en producción

> **Dónde vive cada cosa:** los `.sql` que este guion cita viven **sólo** en
> `saaBE/docs/logica-negocio/rhh/sql/`. Los `.md` sí están espejados en `saaFE/docs/rrh/`.

**Para qué es este documento.** Reproducir marzo en otra base **siguiendo una lista**. Verificado
contra la corrida del 2026-08-21, que cerró con **diferencia cero** contra el rol del cliente.

> **Marzo es el mes que enseñó la regla de oro de este módulo.** Dos personas salen el día 6, y
> hacerlo en el orden equivocado costó una tarde entera: el período se calculó antes de ejecutar
> las salidas y quedó con 22 nóminas en vez de 20. **Si sólo se lee una sección de este guion, que
> sea el §0.**

**Resultado que hay que obtener:** 20 nóminas · ingresos **20 793,34** · descuentos **3 202,22** ·
líquido **17 591,12** · patronal **2 468,77**. Cliente: 17 591,12. **Diferencia cero en el total.**

> El contraste sacará **tres filas** en el bloque 2 —el par de vacaciones desaparece este mes— más
> la discrepancia esperada del bloque 3. §8.

---

## 0. El orden, que en marzo no es un consejo

```
fichas → crear el período → liquidar → APROBAR → EJECUTAR SALIDA → novedades → calcular →
contrastar → aprobar → contabilizar rol → cerrar
```

**Las dos salidas se ejecutan ANTES de calcular el período.** No basta con crear las
liquidaciones: hay que aprobarlas y ejecutar la salida, que es lo que pasa a la persona a CESANTE y
la saca de la nómina del mes.

**Qué pasa si se hace al revés** —y pasó—: el período sale con 22 nóminas y 18 443,85, con Castro
Arce y Cevallos Alemán cobrando mes completo de 482,00. Recalcular después deja **la cabecera
corregida y el detalle sin corregir**, porque nadie borra la nómina de quien dejó de estar activo.
Hizo falta un script de limpieza.

> **La regla, en una línea:** *liquidar → aprobar → ejecutar salida → y sólo entonces calcular el
> período.*

---

## 1. Fichas: Méndez Torres sigue a media jornada

| Campo | Valor |
|---|---|
| `CNTESLRB` | **241,00** |
| `CNTEJRND` | **2** — parcial |
| `CNTEHRSM` | **20** |

**Marzo es el último mes así.** `sql/49` la pasa a 482 / jornada 1 / 40 h, y **sólo se ejecuta
cuando enero, febrero y marzo estén cerrados**: la adenda es del 01-04.

---
## 2. Crear el período — el paso que ningún guion traía

**Sin período no hay dónde registrar novedades**, y la pantalla de Novedades no dice qué falta:
enseña el desplegable vacío. Se crea desde `Períodos de nómina` → *Agregar Registro*.

| Campo | Valor para marzo |
|---|---|
| Año / Mes | **2026 / 3** |
| Fecha de inicio | **01-03-2026** |
| Fecha de fin | **31-03-2026** |
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

> **En marzo el período puede crearse antes o después de las liquidaciones — lo que NO puede es
> calcularse antes de que las salidas estén ejecutadas.** Es el §0, y es lo único que marzo no
> perdona.

### Cómo se teclean las fechas

**El módulo usa dos formatos distintos según la pantalla**, y no hay ninguna pista en pantalla de
cuál toca:

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
de HOY** (defecto D15). Ahora un texto que no llega a ser fecha **deja el campo inválido, con el
mensaje «Fecha no válida. Use el calendario o teclee dd/mm/aaaa», y Guardar no pasa** — y los dos
campos son además obligatorios.

> **El rodeo de teclear primero la fecha de fin —`31-03-2026`, que sólo es legible en `dd/mm` porque
> no hay mes 31— deja de hacer falta**, porque el patrón está escrito en el campo. **Se conserva
> escrito a propósito:** si replicas contra una instalación anterior a ese despliegue, es la única
> defensa que hay.
>
> **Y la comprobación del rango sigue siendo obligatoria en los dos casos.** Que la pantalla ya no
> invente una fecha no prueba que la que tecleaste sea la que querías — **marzo no es ambiguo, pero
> las salidas del 06-03 sí lo son en los dos formatos**, y eso el arreglo no lo toca.

> **Y las salidas del 06-03 son ambiguas en los dos formatos**: `06/03` es 6 de marzo en `dd/mm` y
> 3 de junio en `mm/dd`. En la pantalla de finiquito, que pide `mm/dd/yyyy`, va **`03/06/2026`**.
> Verificar después en la base que `LQDCFCHS` trae `[2026, 3, 6]`.

### La comprobación del rango, inmediatamente después de guardar

Va **antes** de registrar la primera novedad. Con un rango que no sea el mes, `calcularPeriodo` no
revienta: calcula.

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

> **En marzo el rango tiene una consecuencia extra**, y por eso este control importa aquí más que
> en febrero: `selectActivosEnPeriodo` decide quién entra comparando `fechaTerminacion > fechaFin`.
> Con un `PRDNFCHF` equivocado, **Castro Arce y Cevallos Alemán podrían volver a entrar en la
> nómina** aunque sus salidas estén bien ejecutadas.

### El combo de Período no se llena hasta re-elegir el ejercicio

Defecto D17. Tras crear el período, si el desplegable de la pantalla de novedades sigue vacío, hay
que volver a elegir el año. No es que el período no exista.

### Anotar la base de asientos, antes de nada

```sql
SELECT MAX(ASNTCDGO) AS BASE FROM CNT.ASNT;
```

Se usa en el §7. **Anotarlo ahora**, no al final: es el punto de partida contra el que se comprueba
que la nómina no generó ningún asiento.

---

## 3. Las dos liquidaciones, con su salida ejecutada

| LQDC | Colaborador | Contrato | Fecha de salida | Causal | Neto |
|---|---|---|---|---|---:|
| 23 | CASTRO ARCE LESLY MARICELA | 48 | **2026-03-06** | 11 · Terminación en período de prueba | **384,05** |
| 24 | CEVALLOS ALEMAN EDGAR GIOVANNY | 49 | **2026-03-06** | 11 · Terminación en período de prueba | **384,05** |

**Desglose de cada una**, idéntico en las dos:

| Concepto | Días | Base | Valor |
|---|---:|---:|---:|
| Remuneración pendiente | 6 | 482,00 | **96,40** |
| Aporte personal IESS finiquito | — | 96,40 | **−9,11** |
| Décimo tercero proporcional | — | 1 420,76 | **118,40** |
| Décimo cuarto proporcional | 89 | 482,00 | **119,16** |
| Vacaciones no gozadas | 3,71 | 15,96 | **59,20** |
| | | **Ingresos 393,16 · Descuentos 9,11** | **Neto 384,05** |

> **Los décimos se devengan en todo el período, no en el mes que se liquida.** Con tres meses de
> servicio, Castro Arce cobra 118,40 y 119,16, no 8,03 de cada uno. Si salen 8,03, el motor está
> pagando sólo la fracción del último mes y le falta la corrección de acumulados.

Por cada una: **simular → calcular y guardar → aprobar → ejecutar salida**.

**«Ejecutar salida» pide confirmación del navegador y no se deshace.** Debe dejar:

```
contrato CERRADO · fechaTerminacion 2026-03-06 · empleado en estado 4 CESANTE · saldo de vacaciones caducado
```

Y en el log: `Salida ejecutada para <cédula>: contrato cerrado, empleado CESANTE, 0 descuento(s) cancelado(s), 1 saldo(s) de vacaciones caducado(s).`

> **Esa línea del log no es prueba de nada.** Se imprime antes del commit. Ya ocurrió una vez que
> salió con los números correctos y la transacción hizo rollback entero. **Se comprueba en la base,
> no en el log.**

---

## 4. Novedades del período: seis, todas préstamos

Marzo **no lleva anticipos**. Todas con «Aprobada para el cálculo» = **Sí** — y, además, con
**estado = 1**; ver el aviso al final de la sección.

| Concepto (alterno) | Cédula | Colaborador | Valor |
|---|---|---|---:|
| 23 · Quirografario IESS | 1719624809 | CALDERON PARRAGA LAURA CECILIA | **14,23** |
| 23 · Quirografario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 23 · Quirografario IESS | 1725996498 | ROBAYO RUEDA GABRIEL PATRICIO | **95,48** |
| 24 · Hipotecario IESS | 1715156574 | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Hipotecario IESS | 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | **379,85** |
| 24 · Hipotecario IESS | **0909917759** | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,30** |
| | | **quirografarios** | **266,92** |
| | | **hipotecarios** | **1 015,15** |

> **Las cédulas están en la fila a propósito, y elegir por cédula es obligatorio, no cómodo.** Hay
> **dos Pazmiños** —Jaramillo `0909917759` y Moreno `2100192463`— y el de marzo es Jaramillo. El
> combo de contrato **no acota por colaborador** (defecto D9): ofrece los contratos de todos, y
> teclear la cédula es lo único que deja un solo candidato.

> **23 y 24 son `CPNMALTR`, no `CPNMCDGO`.** El combo enseña «Prestamo quirografario IESS - 23»
> porque pinta el alterno; en la base la PK es otra. Una consulta de verificación contra
> `CPNMCDGO = 23` devuelve **otro concepto**. Es la misma trampa que grabó el hipotecario de alterna
> 24 como el concepto 24 «Seguro privado» — el defecto de pantalla 1. Filtrar siempre por `CPNMALTR`.

> **Elegir de la lista, no teclear y salir.** Si el control se queda con la cadena en vez del
> objeto, el cuerpo viaja como `{ codigo: 'QUIROGRAFARIO' }` y el backend responde **400** —o
> **ORA-02291** con el nombre de la FK—. **La comprobación que lo caza es releer el input**: si no
> contiene el guion separador —`1725996498 - ROBAYO RUEDA`, `Prestamo quirografario IESS - 23`—,
> no se eligió de la lista. Y el filtro **distingue mayúsculas** (defecto D14): teclear en
> mayúsculas.

> **El combo de colaborador ofrece a los CESANTES** (defecto D18). En marzo la lista trae a Torres
> Chávez y Benítez Montes, que salieron en enero. Una novedad para ellas quedaría huérfana y el
> motor no la leería jamás, pero es suciedad que nadie revisa después.

**El quirografario de Castro Arce NO se registra.** El IESS se lo sigue cobrando a ASOPREP (14,79)
aunque ella salga el día 6, pero en el rol no está y aquí no se carga. Es una diferencia conocida
del control 3: **687,05 nuestro contra 701,84 del IESS**. Con abril suman los 29,58 que ASOPREP
asumió, y en mayo desaparece sola.

> **Ojo con el orden en marzo:** si las novedades se registran **antes** de ejecutar las salidas,
> el combo todavía ofrece a Castro Arce y Cevallos Alemán como activas. No hay que registrarles
> nada.

### Antes de calcular: comprobar que las seis van a entrar

El motor exige **dos** condiciones, no una — `NovedadNominaDaoServiceImpl:58-59`:

```
and t.aprobada = 'S'   and t.estado = 1
```

`NVNMESTD` lleva `DEFAULT 1` en el DDL, **pero el default de columna no llega a aplicarse**: JPA
manda el nulo explícito. Una novedad con estado nulo **se descarta en el cálculo sin un solo
aviso**. `/rest/nvnm/getAll` expone `estado`, así que se comprueba desde la propia pantalla.

> **Marzo no tiene anclaje de persona como enero (Calderón 269,43) ni como febrero (Calderón
> 0,00).** Aquí la única red es esta comprobación y el subtotal de los dos conceptos: 266,92 y
> 1 015,15.

```sql
SELECT n.NVNMCDGO, m.MPLDIDNT, m.MPLDAPLL, n.NVNMVLRR AS VALOR,
       n.NVNMAPRB AS APROBADA, n.NVNMESTD AS ESTADO,
       CASE WHEN n.NVNMAPRB = 'S' AND n.NVNMESTD = 1 THEN 'ENTRA'
            ELSE '*** LA IGNORA: PARAR ***' END AS VEREDICTO
  FROM RHH.NVNM n
  JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 3
 ORDER BY n.NVNMCDGO;
-- Seis filas, las seis ENTRA. Ninguna de Castro Arce ni de Cevallos Aleman.
```
---

## 5. Calcular, contrastar, y comprobar antes del total

| # | Comprobación | Esperado |
|---|---|---|
| 1 | Filas en `NMNA` | **20** — sin Castro Arce ni Cevallos Alemán |
| 2 | Días ≠ 30 | **ninguno** |
| 3 | Méndez Torres | **241,00 / 22,77 / 218,23** |
| 4 | Renglones de IR | **cero** |
| 5 | **Cabecera contra suma de `NMNA`** | **iguales en las cuatro cifras** |
| 6 | Neto | **17 591,12** |

**Si salen 22 filas, las salidas no se ejecutaron antes de calcular.** Volver al §0.

**Si la cabecera dice 20 y el detalle tiene 22 filas**, se calculó en el orden malo y luego se
recalculó: la cabecera se acumula en memoria sobre los procesados y el detalle conserva las
huérfanas. Diferencia exacta **872,90** = 436,45 × 2. Hace falta limpiar las dos filas sobrantes.

> **El `sql/39` limpiaba esas dos filas en LOCAL y NO se replica.** Lleva `PRDNCDGO = 30 AND
> MPLDCDGO IN (48,49)` escritos a mano, que son códigos de local. Si en producción llegaran a
> quedar huérfanas, hay que escribir uno nuevo con los códigos de aquí — **nunca ejecutar el 39**.

### Y entonces contrastar, con el período todavía en estado 3

**Antes de aprobar, no después.** El contraste lee `NMNA`, `RNGL`, `PVNM` y `CTRL`, y **no lee
`ACMN`**, que es lo único que escribe `cerrarPeriodo`: da el mismo resultado en 3 que en 7. Si
destapa algo con el período en 3, se arregla recalculando; con el período cerrado habría que
reabrirlo, que es el **punto 6** y `reabrirPeriodo` no avisa.

1. `UPDATE RHH.CTRL_PARAM SET MES = 3; COMMIT;` **y comprobarlo, sin saltarse este paso ni aunque
   el ESTADO diga que ya está puesto** — el 2026-08-23 lo decía y estaba en otro mes.
   **El parámetro equivocado falla en dos direcciones, y sólo una es la que avisaba este guion:**
   - **Adelantado** —el mes aún sin calcular— todos los bloques salen **vacíos**, y un vacío se lee
     como que cuadra.
   - **Atrasado** —un mes anterior ya cerrado— no vacía nada: el instrumento **contrasta ese otro
     mes**, con su `CTRL` y su `NMNA` completos, y sale **verde al céntimo**. Es el caso peor: un
     verde entero y plausible del mes equivocado no tiene nada que lo delate.

   Por eso los siete bloques imprimen **`PERIODO_LEIDO`** desde el 2026-08-23. **Es lo primero que
   se mira en cada bloque, antes que ninguna cifra.** Si no dice `2026-03`, se para: da igual lo
   bien que se vea todo lo demás.
2. `CONTRASTE_MES_CONTRA_ROL_REAL.sql`, **bloque 4 primero**, luego 3, luego 1 y 2, y el 1B aunque
   todo cuadre.
3. Contra [`ESPERADO-CONTRASTE-MARZO.md`](ESPERADO-CONTRASTE-MARZO.md). El §8 explica las dos
   familias de diferencias que marzo **debe** sacar.

**Sólo con el contraste en verde: aprobar → contabilizar rol → cerrar.**

---

## 6. Cerrar: marzo avisa, y el aviso es la evidencia

| NVIS | Colaborador | Tipo | Hecho | Límite | Estado |
|---|---|---|---|---|---|
| 12 | CASTRO ARCE LESLY MARICELA | 2 · Aviso de salida | 2026-03-06 | 2026-03-09 | 1 PENDIENTE |
| 13 | CEVALLOS ALEMAN EDGAR GIOVANNY | 2 · Aviso de salida | 2026-03-06 | 2026-03-09 | 1 PENDIENTE |

Las dos nacen solas al ejecutar las salidas. **Se quedan en PENDIENTE y sin fecha de reporte, para
siempre**: no se marcan enviadas —sería afirmar ante el IESS una fecha que no ocurrió— ni se anulan
—sí correspondían—. Son la prueba de los **208,22** que se declararon de más.

En modo histórico el cierre **avisa y deja cerrar**. `PRDNOBSR` debe quedar en:

```
Cerrado con 2 novedad(es) del IESS sin declarar (periodo historico, plazo vencido).
```

**No pulsar «Contabilizar provisiones».**

---

## 7. Qué debe quedar

**Cabecera de `PRDN`**

| Campo | Valor |
|---|---|
| `estado` | 7 CERRADO |
| `modo` | 1 HISTÓRICO SIN CONTABILIZAR |
| `numeroEmpleados` | 20 |
| Ingresos / Descuentos | 20 793,34 / 3 202,22 |
| **Neto** | **17 591,12** |
| Patronal | 2 468,77 |
| Asientos | **null / null / null** |

**`ACMN` — contar SIEMPRE filtrando por el período.** 120 filas · **20 personas** · tipos 1, 2, 3,
5, 8 y 10 con 20 cada uno · **tipo 9 (IR) vacío** · **suma del tipo 8 = 1 920,15**.

> **Marzo es el mes donde un conteo sin filtrar más engaña, porque crece por dos sitios a la vez.**
> `RHH.ACMN` acumula todo el año, y además **las dos salidas del 06-03 escriben sus propios
> acumulados**: `escribeAcumuladosDelFiniquito` graba tres por liquidación —`GRAVADO_IR`,
> `APORTE_PERSONAL`, `IMPONIBLE_IESS`— **sin período**, y sólo los distintos de cero.
>
> **Ojo: los de apertura TAMBIEN van sin período.** `ACMNAPRT = 'S'` los distingue, y sin ese
> filtro el conteo engaña — Castro Arce y Cevallos Alemán tienen **dos filas de apertura cada uno**.
>
> Al cerrar marzo el total debe ser **562 filas**: 132 de enero + 132 de febrero + 120 de marzo +
> 34 de la apertura + **6 de los finiquitos de enero** + **6 de los de marzo**. Las «sin período»
> pasan de 40 a **46**, y ese salto **es lo esperado, no un fallo**.

```sql
-- Los del período. 120 filas, 20 personas, tipo 9 vacio.
SELECT a.ACMNTPAC AS TIPO, COUNT(*) AS FILAS,
       COUNT(DISTINCT a.MPLDCDGO) AS PERSONAS, SUM(a.ACMNVLOR) AS VALOR
  FROM RHH.ACMN a
  JOIN RHH.PRDN p ON p.PRDNCDGO = a.PRDNCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 3
 GROUP BY a.ACMNTPAC ORDER BY 1;

-- Y los de los dos finiquitos de marzo. TRES por persona, ninguno en cero.
-- Sin esto, Castro Arce y Cevallos Aleman no existen para el RDEP.
SELECT m.MPLDIDNT, m.MPLDAPLL, a.ACMNTPAC AS TIPO, a.ACMNVLOR AS VALOR
  FROM RHH.ACMN a JOIN RHH.MPLD m ON m.MPLDCDGO = a.MPLDCDGO
 WHERE a.PRDNCDGO IS NULL AND a.ACMNANOO = 2026
   AND NVL(a.ACMNAPRT, 'N') <> 'S'          -- excluye los de APERTURA, que tambien van sin periodo
   AND m.MPLDIDNT IN ('1720245735', '1716501778')
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
-- La base se anotó en el §2. Los que nacieron desde entonces, con su origen.
-- Ninguno puede ser de RRHH: en modo histórico la nómina no genera asiento.
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
>  WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 3
>  ORDER BY m.MPLDAPLL;
> ```
>
> Si no coincide, **mandar el resultado** y averiguar qué cambió antes de seguir.

| Identificación | Colaborador | Días | Ingresos | Descuentos | Neto |
|---|---|---:|---:|---:|---:|
| 1717991341 | BARCENAS BERMEO DANIELA ROMINA | 30 | 700,00 | 66,15 | 633,85 |
| 2150051205 | BRAVO CAIZA WENDI JULIANA | 30 | 700,00 | 66,15 | 633,85 |
| 1753528379 | CAIZA REMACHE LIZETH ABIGAIL | 30 | 482,00 | 45,55 | 436,45 |
| 1719624809 | CALDERON PARRAGA LAURA CECILIA | 30 | 700,00 | 80,38 | 619,62 |
| 1311981953 | CEVALLOS MONTENEGRO JOHNNY STEVEN | 30 | 2 000,00 | 189,00 | 1 811,00 |
| 1715156574 | COSSIO CAICEDO EIMY | 30 | 798,50 | 556,15 | 242,35 |
| 1750302984 | GARCIA VITERI WILLAM ALEXANDER | 30 | 700,00 | 66,15 | 633,85 |
| 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | 30 | 2 206,84 | 726,06 | 1 480,78 |
| 1004350904 | MENDEZ TORRES DIANA ALEJANDRA | 30 | **241,00** | 22,77 | **218,23** |
| 0103179537 | MOSCOSO NOVILLO DIANA CECILIA | 30 | 1 715,00 | 146,10 | 1 568,90 |
| 1717649873 | MUÑOZ SANTOS MARCELO ALEJANDRO | 30 | 550,00 | 51,98 | 498,02 |
| 1723962849 | NIETO CONDE KAROL POLETH | 30 | 900,00 | 85,05 | 814,95 |
| 1726657164 | PARDO CALLE KATHERINE GUISSELA | 30 | 700,00 | 66,15 | 633,85 |
| 0909917759 | PAZMIÑO JARAMILLO EDGAR ALBERTO | 30 | 1 500,00 | 287,05 | 1 212,95 |
| 2100192463 | PAZMIÑO MORENO DIANA CAROLINA | 30 | 500,00 | 47,25 | 452,75 |
| 1725996498 | ROBAYO RUEDA GABRIEL PATRICIO | 30 | 1 500,00 | 237,23 | 1 262,77 |
| 0801999855 | RODRIGUEZ VALENCIA NATALIA ADRIANA | 30 | 700,00 | 66,15 | 633,85 |
| 1712362720 | RODRIGUEZ ZAMBRANO LILIANA DE LAS MERCEDES | 30 | 1 500,00 | 141,75 | 1 358,25 |
| 1712232659 | VITERI LOPEZ JIMENA DEL PILAR | 30 | 2 200,00 | 207,90 | 1 992,10 |
| 1307779064 | ZAMBRANO MIELES TANYA GISSELA | 30 | 500,00 | 47,25 | 452,75 |

---

## 8. Diferencias que no son defecto

**El total cierra en cero.** Y el bloque 2 es corto por primera vez.

### El par de vacaciones desaparece

En enero eran 44 filas por **823,19** y en febrero por **886,80**. **Desde marzo, cero: el bloque 2
vuelve a tres filas.**

El rol del cliente deja de imprimir el ingreso y el descuento de vacaciones que se cancelaban entre
sí. Es un cambio de presentación del cliente, no del motor: nosotros nunca generamos esos
renglones.

> **Se dice porque su ausencia también sorprende.** Quien venga de replicar enero y febrero espera
> 46 filas y ve tres. **En marzo, tres es lo correcto.**

### La discrepancia del bloque 3, que es la razón de ser de marzo

**Castro Arce y Cevallos Alemán salen EN LA PLANILLA Y SIN NÓMINA, con 99,29 cada uno — 198,58 en
total.** El IESS los declaró en marzo porque salieron el día 6; nuestro sistema lleva las 20
personas del rol y a ellos los pagó su finiquito.

**Es la discrepancia esperada, no un fallo.** Con los 9,64 de aporte de sus finiquitos suman los
**208,22** sobredeclarados. Si en su lugar aparecen como IMPORTE DISTINTO, es que las dos nóminas
huérfanas del cálculo mal ordenado siguen ahí.

### Las diferencias por persona

| Colaborador | Diferencia | Origen |
|---|---:|---|
| MANOSALVAS LLERENA FERNANDO PAUL | **+0,01** | Regla 4: redondeamos por renglón, la hoja del cliente arrastra decimales |
| MUÑOZ SANTOS MARCELO ALEJANDRO | **−0,01** | Lo mismo, con signo contrario |

Se cancelan en el total. **No se ajustan.**

---

## Referencias

- Valores del cliente: `sql/36` carga `RHH.CTRL` de marzo. `sql/37` carga la base del 13.º de
  apertura y **no se reejecuta**.
- Contraste: `CONTRASTE_MES_CONTRA_ROL_REAL.sql` con `CTRL_PARAM` en el mes 3.
- Bloque 4: **22 personas en `CTRL` contra 20 nóminas es lo correcto**, por las dos salidas.
- **En DBeaver el contraste se corre tal cual.** Sus renglones `--` sueltos sólo se tragan la
  sentencia siguiente en SQL\*Plus; para ese camino está `CONTRASTE_MES_CONTRA_ROL_REAL.sqlplus.bak`.
- **Todos los scripts viven en `saaBE/docs/logica-negocio/rhh/sql/`**, nunca en el repositorio del
  frontend.
- **Al cerrar marzo, y sólo entonces, `sql/49`** (Méndez a tiempo completo desde la adenda del
  01-04). Su guarda es un `SELECT` con veredicto: **no se niega sola**, hay que mirarla y comprobar
  que enero, febrero y marzo están en estado 7.

---

# Lo que enseñó ejecutarlo — 2026-08-23

> Marzo se replicó en producción el **2026-08-22** y cerró en 17 591,12 con **diferencia cero**.
> *Reconstruido de la bitácora de defectos y del `ESTADO-RRHH.md`.*

## El orden del §0 no era un consejo: fue la diferencia entre reparar y no tener que reparar

**Marzo salió con 20 filas a la primera.** En local costó una tarde: allí se calculó **antes** de
ejecutar las salidas, quedaron dos nóminas huérfanas y hubo que limpiarlas con el `sql/39`.

En producción, con las dos salidas ejecutadas **antes** de calcular, no hizo falta ningún
equivalente del `39`. **El mismo mes, el mismo motor y los mismos datos dieron dos trabajos
distintos, y lo único que cambió fue el orden.** Es la justificación entera del §0.

> Y el `sql/39` quedó marcado como **no ejecutable nunca más**: lleva `PRDNCDGO = 30` y
> `MPLDCDGO IN (48,49)` escritos a mano, que son códigos de **local**. Fue inofensivo mientras
> `PRDN` estuvo vacío; ahora hay períodos.

## Lo que sólo marzo pudo enseñar

- **El `+0,01` de ingresos de Manosalvas apareció como fila propia.** En enero y febrero venía
  absorbido dentro de su fila del par de vacaciones; al desaparecer el par, se quedó solo. **Es el
  mismo céntimo de siempre, visible por primera vez** — y otra razón por la que el esperado se fija
  fila a fila.
- **El cierre avisó, y el aviso era la evidencia.** Las dos NVIS del 06-03 quedan en PENDIENTE para
  siempre: no se marcan enviadas —sería afirmar ante el IESS una fecha que no ocurrió— ni se anulan
  —sí correspondían—. **En modo histórico el cierre avisa y deja cerrar.** Son la prueba de los
  208,22 declarados de más.
- **Los dos números del sobredeclarado son los dos correctos:** **198,58** = `482 × 20,60 % × 2`
  (sólo aportes, que es lo que enseñan el bloque 3 y la planilla) y **208,22** = `482 × 21,60 % × 2`
  (aportes más IECE y SECAP). **Ninguno es un error de transcripción**, y los documentos usan los
  dos según qué midan.

## Los códigos de este guion son de LOCAL

**`LQDC` 23 y 24 del §3 son de local.** En producción, Castro Arce salió con el **21** y Cevallos
Alemán con el **22**. Y **`PRDN` en producción es el 21**, no el 30 que usa el `sql/39`.

## Y los cuatro finiquitos quedan en un estado que la pantalla no sabe leer (D24)

Al cerrar marzo, los cuatro finiquitos del año están **ejecutados**. Pero `ejecutarSalida` **no
cambia `LQDCESTD` al terminar**, así que aprobada, ejecutada y contabilizada son el mismo **`3`**, y
el listado de Liquidación los muestra a los cuatro como **«APROBADA»** — junto al botón *Ejecutar
salida*, que no se deshace y cuyo `generarAvisoSalida` **no es idempotente**: un segundo clic
duplica el aviso al IESS.

**Quien replique marzo en otra base termina con esa pantalla en ese estado.** Se comprueba por los
efectos —contrato `CERRADO`, empleado en estado 4, saldos caducados—, **nunca por la columna**.
