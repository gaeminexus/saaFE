# Reapertura de abril de 2026 — los 175,00 de OTROS de Calderón

**Escrito el 2026-08-23**, tras la decisión del cliente. Operación de una sola vez sobre un mes ya
cerrado en producción. **Léelo entero antes de empezar: el orden importa.**

## Por qué se reabre un mes cerrado

**Decisión de Steven del 2026-08-23:** de enero a julio la información se sube tomando como base
**lo que se pagó al IESS y lo que se pagó al empleado**. Desde agosto rigen las reglas del módulo.

**No rompe la regla 3: la refuerza.** El valor del cliente sigue siendo la verdad; lo que cambia es
que ya no basta con que nuestro motor lo reproduzca — **el sistema tiene que contenerlo aunque el
motor no sepa generarlo**. Y es coherente con el diseño: los siete meses son `modo 1 · HISTÓRICO SIN
CONTABILIZAR` precisamente porque son un registro de lo que pasó.

**Abril está cerrado en 16 089,22 y tiene que decir 15 914,22.** A Calderón se le descontaron 175,00
de verdad: cobró **94,72**, no 269,72. Nuestro registro, tal como está, es falso como registro
histórico aunque el cálculo sea correcto por las reglas.

**Sólo abril.** Febrero está limpio — el 0,10 que se arrastraba como pendiente es de junio. Y junio y
julio no se han corrido, así que ahí basta registrar la novedad desde el principio.

## Lo que ya está hecho

| | |
|---|---|
| `sql/56` | Concepto **31 · «Otros descuentos»**, EGRESO, recortable, orden 140, **sin rol de motor**. ✅ Corrido |
| `sql/57` | Las filas de concepto 31 en `CTRL` para abril, junio y julio. **Pendiente** |

## Por qué mayo NO se ve afectado, y cómo se comprueba

Es la pregunta del **punto 6** —`reabrirPeriodo` no avisa de que hay un mes posterior calculado— y
aquí tiene respuesta cerrada, no una esperanza:

**El concepto 31 lleva las siete banderas en `N`**: no es imponible al IESS, ni gravado de IR, ni
base de décimos, vacaciones o utilidades. Y los `ACMN` que escribe `cerrarPeriodo` son exactamente
esas bases, más el aporte personal y los días. **Ninguno de los seis tipos cambia.** Lo único que se
mueve es el neto, y el neto no es un tipo de acumulado.

Se comprueba igual, en el paso 8. No se da por bueno.

## El orden

```
detector del punto 14 → sql/57 → reabrir → novedad de Calderón → recalcular
→ contrastar (CTRL_PARAM a 4) → aprobar → contabilizar rol → cerrar
→ verificar ACMN de abril Y de mayo
```

### 1 · Antes de tocar nada: el detector del §4 bis

```sql
SELECT p.PRDNANOO AS ANIO, p.PRDNMSEE AS MES, m.MPLDIDNT, m.MPLDAPLL,
       r.RNGLVLRO AS SUELDO_DEL_MES, c.CNTESLRB AS SUELDO_DE_HOY
  FROM RHH.RNGL r
  JOIN RHH.NMNA n ON n.NMNACDGO = r.NMNACDGO
  JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
  JOIN RHH.CNTE c ON c.MPLDCDGO = m.MPLDCDGO
  JOIN RHH.CPNM k ON k.CPNMCDGO = r.CPNMCDGO
 WHERE k.CPNMALTR = 1 AND n.NMNADITR = 30 AND r.RNGLVLRO <> c.CNTESLRB
   AND p.PRDNMSEE = 4;
```

**Tiene que salir VACÍO.** Méndez está en 482 y abril es un mes de 482, así que recalcular no la
reescribe — pero se comprueba, no se supone. Si sale algo, **parar**.

### 2 · `sql/57`

Sus dos controles previos y los dos posteriores. El último es el que importa: los conceptos de cada
persona deben sumar su total de `DESCUENTOS`, y antes de este script Calderón fallaba por 175,00
exactos.

### 3 · Reabrir el período 41

Por pantalla. **Exige un motivo y no es opcional** — `reabrirPeriodo` rechaza el vacío. Texto:

```
Decision del cliente 2026-08-23: la carga historica registra lo que se pago.
Se anaden los 175,00 de OTROS de Calderon que el rol descuenta.
```

`reabrirPeriodo` **borra los acumulados del período** —para que recalcular no los duplique—, deja el
estado en **3 CALCULADO** y limpia la fecha de cierre. **No toca las nóminas ni los renglones.**

> **Sólo se niega si el período está PAGADO.** Abril está en CERRADO, así que pasa.

### 4 · La novedad de Calderón

| Campo | Valor |
|---|---|
| Período | **2026 / 4** (`PRDN 41`) |
| Colaborador | **1719624809** CALDERON PARRAGA LAURA CECILIA |
| Concepto | **31 · Otros descuentos** |
| Valor | **175,00** |
| Descripción | Columna OTROS del rol de abril. Sin clasificar: el cliente confirma que se descontó y se pagó así. |
| Aprobada | **Sí** |

**31 es `CPNMALTR`, no `CPNMCDGO`.** Y ojo con D22: el control de «Aprobada» nace en **No**, que es
el valor con el que el motor la descarta en silencio.

### 5 · Recalcular

Es idempotente: `calcularPeriodo` borra los renglones generados y **todas las provisiones del
período** antes de rehacerlos, y actualiza las nóminas en su sitio.

**Lo que tiene que salir:**

| | Antes | Ahora |
|---|---:|---:|
| Ingresos | 21 034,34 | **21 034,34** (sin cambio) |
| Descuentos | 4 945,12 | **5 120,12** |
| **Neto** | 16 089,22 | **15 914,22** |
| Cliente | 15 914,22 | **15 914,22** |
| **Diferencia** | +175,00 | **CERO** |
| Renglones | 116 | **117** |
| Calderón | 700,00 / 430,28 / 269,72 | **700,00 / 605,28 / 94,72** |

Y `VERIFICACION_POSCALCULO_ABRIL.sql`, con dos salvedades: el control 1 espera el neto viejo, y el
control 6 no mira el rol 31 porque no tiene rol. **Los otros seis valen tal cual.**

### 6 · Contrastar, con `CTRL_PARAM` en 4

```sql
UPDATE RHH.CTRL_PARAM SET ANIO = 2026, MES = 4;
COMMIT;
```

Está en 5 desde mayo. **`PERIODO_LEIDO` = `2026-04` en cada bloque antes de mirar ninguna cifra** —
si dice `2026-05`, estarías contrastando un mayo perfecto que no prueba nada de esto.

**Lo que debe salir, y es distinto de la primera vez:**

- **Bloque 2: TRES filas**, no cinco. **Las dos de Calderón desaparecen** — es la prueba de la
  operación. Quedan Manosalvas +0,01 ×2 y Muñoz −0,01.
- **Bloque 1: vacío.** Si sale el concepto 31 como `NO ESTA EN EL ROL`, el `sql/57` no corrió.
- **Bloque 3: sin cambio**, la única fila de Muñoz. El concepto no toca ninguna base.
- **Bloque 1B: sin cambio.** Ni patronales ni provisiones se mueven.
- **Bloque 4: 20 / 20 y 117 renglones**, uno más.

**Si el bloque 2 sigue sacando a Calderón, parar.** Significa que la novedad no entró — lo más
probable, «Aprobada» en No.

### 7 · Aprobar → contabilizar rol → cerrar

En ese orden. `contabilizarRol` pisa `PRDNOBSR`, así que va antes de `cerrarPeriodo`. Abril no
avisa. **No pulsar «Contabilizar provisiones».**

> `aprobarPeriodo` reemite el rol de pago, y **es idempotente**: reabrir, recalcular y volver a
> aprobar actualiza el rol en vez de duplicarlo.

### 8 · Verificar los DOS meses

`VERIFICACION_CIERRE_ABRIL.sql` — **120 `ACMN`** del período y **670** en el año, los mismos que
antes: el concepto no cambia ningún tipo de acumulado.

**Y después mayo, que es el punto 6:**

```sql
SELECT a.ACMNTPAC AS TIPO, COUNT(*) AS FILAS,
       COUNT(DISTINCT a.MPLDCDGO) AS PERSONAS, SUM(a.ACMNVLOR) AS VALOR
  FROM RHH.ACMN a JOIN RHH.PRDN p ON p.PRDNCDGO = a.PRDNCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 5
 GROUP BY a.ACMNTPAC ORDER BY 1;
```

**Idéntico a lo que dio al cerrar mayo:** seis tipos con 20 filas, tipo 9 ausente, aporte personal
**1 942,93**, **600** días, bases en 20 560,00. Si algo cambió, es hallazgo y hay que pararse antes
de seguir con junio.

## Lo que esta operación deja para junio y julio

**Se cargan con su novedad de OTROS desde el principio**, sin reabrir nada. Los importes quedan en
`CTRL` tras el `sql/57`: junio Calderón 0,10; julio Barcenas 1,95 · Muñoz 1,53 · Nieto 2,50 · Pardo
1,95 · Viteri 36,67.

**Y un filo nuevo en junio.** Calderón vuelve a líquido cero, y esta vez el cero incluye los 0,10. Es
el borde de mayo con una pieza más — **y ahora el concepto 31 es recortable y de mayor orden que el
anticipo (140 contra 120), así que si el neto se fuera a negativo el recorte caería sobre los OTROS
y no sobre el anticipo.** El detector sigue siendo el bloque 1 vacío, pero la fila donde caería ya no
es la misma.
