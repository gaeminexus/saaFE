> ## ⚠ REESCRITO EL 2026-08-21 TRAS LAS DOS CORRECCIONES DEL MOTOR
>
> Las correcciones del **prorrateo comercial** (`30 − d + 1`) y de **«este empleador no retiene
> IR»** (`CNTENRIR`) cambian lo que este mes debe dar. **Lo de abajo describe el estado ANTERIOR
> y se conserva como historia**; lo que manda es esto:
>
> | | Nuestro | Del cliente | Diferencia |
> |---|---:|---:|---:|
> | **Líquido** | **17 591,12** | **17 591,12** | **0,00** |
>
> - **Bloque 1: VACÍO.** La única fila era el IR de Robayo y ya no se genera.
> - **Bloque 2: desaparecen las dos filas de Robayo** (`DESCUENTOS` +20,17 y `LIQUIDO` −20,17).
>   **Se quedan los centavos de Manosalvas y Muñoz**, que se cancelan en el total pero **sí salen
>   por persona** — por eso el esperado se fija fila a fila y no por totales.
> - **Bloque 3: sin cambio.** Las correcciones no tocan la base imponible de nadie en este mes.
> - **Bloque 1B: sin cambio.**
> - El prorrateo **no mueve nada aquí**: sólo enero tiene gente que entra a mitad de mes.
>
> Marzo mantiene su discrepancia propia y **esperada**: las dos personas que el IESS declaró enteras siguen saliendo en el bloque 3 como `EN LA PLANILLA Y SIN NOMINA` con 99,29 cada una. Eso **no cambia**: es la planilla del cliente, no nuestro cálculo.
>
> **Si alguna fila de Robayo sigue saliendo, o el WAR no se publicó o `CNTENRIR` no está puesto.**

# Marzo 2026 — lo que el contraste canónico DEBE sacar

**Escrito el 2026-08-21, ANTES de ejecutar nada.** Existe por una razón: si el esperado se
redacta después de ver la salida, deja de ser un control y pasa a ser una explicación. Lo que no
esté en esta hoja es **hallazgo nuevo** y se reporta tal cual, sin interpretarlo.

- **Instrumento:** `sql/CONTRASTE_MES_CONTRA_ROL_REAL.sql`, sólo consulta.
- **Datos esperados:** `sql/36_CARGA_CONTRASTE_MARZO.sql`, ya ejecutado.
- **Precondición que NO pongo yo:** `RHH.CTRL_PARAM` en `ANIO = 2026, MES = 3`. Lo cambia Mike.
  Si el `SELECT ANIO, MES FROM RHH.CTRL_PARAM` de la cabecera del script no dice `2026 / 3`, se
  para ahí: con el parámetro en febrero todos los bloques salen vacíos y **parecen un éxito**.
- **Precondición de proceso:** los pasos 2, 3 y 4 terminados —LQDC 23 y 24 recalculadas en
  384,05, aprobadas, salida ejecutada, y el PRDN 30 recalculado en 20 nóminas / 17 570,95—.
  Contrastar el PRDN 30 con las salidas sin ejecutar devuelve el cálculo inválido de 22 nóminas
  y 18 443,85.
- **Precondición obligatoria y fácil de olvidar, porque la cabecera no la delata:**
  [`sql/39_LIMPIEZA_NOMINAS_HUERFANAS_PRDN30.sql`](sql/39_LIMPIEZA_NOMINAS_HUERFANAS_PRDN30.sql)
  **ejecutado.** El recálculo del paso 4 dejó la cabecera correcta (20 · 17 570,95) pero `RHH.NMNA`
  con **22 filas**: las nóminas 89 y 90 de los empleados 48 y 49 sobrevivieron al cálculo viejo.
  Nadie borra la nómina de quien dejó de estar activo. **La autoridad es `NMNA`, no la cabecera** —
  la cabecera acierta por acumular en memoria, no por ser la fuente—, y los tres bloques leen
  `NMNA`. Comprobación de una línea antes de empezar:

  ```sql
  SELECT COUNT(*) FROM RHH.NMNA n JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
   WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 3;   -- debe dar 20, no 22
  ```

  **Con las huérfanas dentro el contraste no falla: miente.** Castro Arce y Cevallos Alemán
  saldrían en el bloque 3 como `IMPORTE DISTINTO` en vez de `EN LA PLANILLA Y SIN NOMINA`, es
  decir, la discrepancia que marzo existe para demostrar se leería como un simple descuadre de
  importe. Se borran, no se anulan: ni el bloque 2 ni el 3 filtran por `NMNAESTD`, y adaptar el
  contraste para ignorarlas sería ajustar el control al dato.
- **Orden de lectura:** bloque 4 primero, luego el 3, luego el 1 y el 2, y el 1B se mira aunque
  todo cuadre.

**Regla 6, que gobierna todo lo de abajo:** cuando un valor del cliente no cuadra con el nuestro,
se documenta la diferencia. El valor del cliente no se toca, ni en la BD ni en el control.

---

## Bloque 4 — que la comparación sea completa

| Columna | Esperado | Por qué |
|---|---:|---|
| `PERSONAS_ESPERADAS` | **22** | 20 del rol + Castro Arce y Cevallos Alemán, que la planilla del IESS sí declara |
| `NOMINAS_CALCULADAS` | **20** | Las dos salieron el 06-03 y van por liquidación, no por nómina. **Si sale 22, `sql/39` no está ejecutado** — se para ahí y no se leen los demás bloques |
| `FILAS_ESPERADAS` | > 0 | Si sale 0, `sql/36` no está cargado y los demás bloques mienten |
| `RENGLONES_CALCULADOS` | > 0 | Idem por el lado nuestro |
| `ESTADO_PERIODO` | el del PRDN 30 | Sólo sitúa la salida |

> **22 contra 20 es lo correcto, no una diferencia.** Es la discrepancia esperada del plan §3.4 y
> el motivo por el que marzo es el mes en que el sistema **debe** discrepar de la planilla. Una
> coincidencia aquí sería el error.

---

## Bloque 3 — control 2, TOTAL IESS afiliado por afiliado

Es el control que manda: la planilla la emite el IESS, así que no puede compartir un error con
nuestro motor. **Cuatro filas, ni una más.**

| Identificación | Quién | Nuestro | De la planilla | Diferencia | `QUE_PASA` |
|---|---|---:|---:|---:|---|
| `1720245735` | Castro Arce | — | 99,29 | **−99,29** | `EN LA PLANILLA Y SIN NOMINA` |
| `1716501778` | Cevallos Alemán | — | 99,29 | **−99,29** | `EN LA PLANILLA Y SIN NOMINA` |
| `1717649873` | Muñoz Santos | 113,31 | 113,30 | **+0,01** | `IMPORTE DISTINTO` |
| `1004350904` | Méndez Torres | 49,64 | 49,65 | **−0,01** | `IMPORTE DISTINTO` |

- **Las dos primeras suman 198,58** y son la discrepancia esperada del plan §3.4: el IESS las
  declaró enteras (482,00 × 30 días) aunque salieron el 06-03. `482,00 × 20,60 % = 99,29`.
- **Muñoz y Méndez son el mismo defecto de redondeo de siempre, en los dos sentidos:** la planilla
  redondea la suma (`550 × 20,60 %`, `241 × 20,60 %`) y nosotros sumamos personal y patronal ya
  redondeados por renglón. Regla 4 contra la cadena sin redondear. **No se ajusta.**
- Lo que **no** debe aparecer aquí: los 14,79 del quirografario de Castro Arce. El IESS lo siguió
  cobrando y ASOPREP lo asumió, pero no está en el rol y `sql/36` no lo carga a propósito. Ese
  control (266,92 nuestro contra 281,71 del IESS) se hace a mano, fuera de este script.

---

## Bloque 2 — totales de cabecera

**Cinco filas.** La consigna nombra sólo las tres de `LIQUIDO`; las otras dos son sus acompañantes
aritméticas y se dejan escritas aquí para que no se lean como hallazgo:

| Identificación | Quién | Total | Nuestro | Del rol | Diferencia |
|---|---|---|---:|---:|---:|
| `1725996498` | Robayo | `LIQUIDO` | 1 242,60 | 1 262,77 | **−20,17** |
| `1725996498` | Robayo | `DESCUENTOS` | 257,40 | 237,23 | **+20,17** |
| `1716120769` | Manosalvas Llerena | `LIQUIDO` | 1 480,78 | 1 480,77 | **+0,01** |
| `1716120769` | Manosalvas Llerena | `INGRESOS` | 2 206,84 | 2 206,83 | **+0,01** |
| `1717649873` | Muñoz Santos | `LIQUIDO` | 498,02 | 498,03 | **−0,01** |

- **Robayo** es el IR que el cliente no retiene hasta agosto: política, no defecto. Los 20,17
  aparecen dos veces, sumando en descuentos y restando en el líquido — es un solo hecho.
- **Manosalvas** arrastra `166,6666…` de décimo tercero y `40,1666…` de cuarto; nosotros
  redondeamos por renglón. La propia hoja del cliente no cuadra consigo misma. **No se ajusta.**
- **Muñoz** es la misma regla vista desde el otro lado, y **sale con signo distinto en el bloque 3
  y en el 2**: `+0,01` en `TOTAL_IESS` y `−0,01` en `LIQUIDO`.
- **Castro Arce y Cevallos Alemán NO deben salir en este bloque.** `sql/36` no les carga fila de
  `ROL` —no están en la hoja—, sólo la de `PLANILLA`. Si aparecen aquí como
  `NO TIENE NOMINA CALCULADA`, la carga del 36 no es la que se documentó y hay que mirarla.

> **Cualquier cuarta persona en `LIQUIDO` es hallazgo nuevo: se reporta, no se explica.**

---

## Bloque 1 — diferencias por concepto

**Una fila.**

| Identificación | Quién | Alterno | Concepto | Nuestro | Del rol | `QUE_PASA` |
|---|---|---:|---|---:|---:|---|
| `1725996498` | Robayo | **21** | Impuesto a la renta (rol motor 8) | 20,17 | — | `NO ESTA EN EL ROL` |

- Es la contrapartida por renglón de la diferencia de cabecera de Robayo. `sql/36` no carga
  ninguna fila del concepto 21 porque el rol de marzo no imprime IR a nadie.
- **Manosalvas no debe salir aquí:** sus renglones cuadran uno a uno
  (`2 000,00 + 166,67 + 40,17 = 2 206,84`); su centavo vive sólo en el total de cabecera. Si
  aparece en el bloque 1, la diferencia es otra y es nueva.
- Tampoco deben salir los seis con gastos personales que `sql/34` cargó: sus proyecciones quedaron
  invalidadas y el IR debe recalcularse en **cero**. Si a alguno de ellos le sale IR, es hallazgo.
- Ninguna fila `OJO: n RENGLONES DEL MISMO CONCEPTO`.

---

## Bloque 1B — patronales y provisiones

Informativo, **sale siempre**, también cuando el mes cuadra. No hay contra qué compararlo: los
patronales los controla el bloque 3 y las provisiones no las controla nadie contra el cliente.

> ### ⚠ Este fue el único bloque sin esperado escrito, y fue el único que escondía un error
>
> **Lección del 2026-08-21, obligatoria al escribir el esperado de abril y de los meses que
> quedan.** Los cinco bloques con expectativa fijada de antemano salieron limpios; el 1B, el
> único que se dejó como «informativo, se mira y ya», traía el punto 10 de la lista —la provisión
> de fondos de reserva de Viteri López, 183,26 al mes desde enero, porque la rama
> `ACUMULADO_EN_EL_IESS` no comprueba la antigüedad y la rama `MENSUALIZADO` sí—. Se vio sólo
> porque el número llamó la atención al leerlo, que es exactamente la forma de control que este
> proyecto no quiere: depender de que alguien se fije.
>
> **Que un bloque no tenga contrapartida contra la que cuadrar no lo exime de tener esperado.**
> Basta con dejar escritos los números del mes anterior —«17/17/20/1 y estos totales»— para que
> un cambio se note solo en vez de tener que descubrirlo. Ésa es la línea base para abril:

| Clase | Alterno | Concepto | Personas | Total |
|---|---:|---|---:|---:|
| PATRONAL | 40 | Aporte patronal IESS | 20 | 2 265,57 |
| PATRONAL | 41 | Aporte IECE | 20 | 101,60 |
| PATRONAL | 42 | Aporte SECAP | 20 | 101,60 |
| PROVISION | 50 | Provisión décimo tercero | 17 | 1 339,40 |
| PROVISION | 51 | Provisión décimo cuarto | 17 | 682,89 |
| PROVISION | 52 | Provisión vacaciones | 20 | 846,64 |
| PROVISION | 53 | Provisión fondos de reserva | **1** | **183,26** |

Los 17 de los décimos son los 20 menos los tres que los cobran mensualizados. El **1** de fondos
de reserva es el punto 10: se corrige al final de la calibración, así que **en abril debe seguir
saliendo 1**; si sale otra cosa sin que nadie haya tocado el paso 8, es hallazgo.

- Se espera `PERSONAS = 20` en los renglones patronales.
- El descuadre de Méndez Torres en `SEGURO SALUD TIEMPO PARCIAL` (10,63 en `ROL PROVISIONES`, que
  la planilla no cobra) **no se contrasta**: su `TOTAL IESS` sigue siendo 49,65. Es pregunta
  abierta para Steven, no defecto.
- **La segunda consulta del 1B —`NMNATTPT = NMNAAPPT + NMNAIESC`— debe salir VACÍA.** Si saca
  alguna fila, hay una nómina calculada antes del reparto por rol y eso sí es defecto.

---

## Y lo que no está en ningún bloque

- **Días de Méndez Torres: 30 nuestros contra 15 del cliente.** El bloque 2 no compara `DIAS`
  —el rol de ASOPREP no los imprime como total y `CTRL` no los carga—, así que esta diferencia
  **no va a aparecer** y no por estar resuelta. Es el defecto 1 de la lista de fin de calibración
  (prorrateo `30 − d + 1`) y marzo es su último mes: desde el 01-04 Méndez pasa a tiempo completo.
- **Las dos liquidaciones (LQDC 23 y 24) no entran en este contraste.** `CTRL` no tiene valor
  esperado contra el que cuadrarlas —no hay acta ni comprobante del cliente— y el contraste sólo
  lee `NMNA`. Su único control es la tabla a mano de `ESTADO-RRHH.md` («Los dos finiquitos del
  06-03»), 384,05 cada una, que se verifica aparte en el paso 2.

## Cierre del paso

Si los cuatro bloques salen exactamente así, marzo cuadra y se puede aprobar → contabilizar →
cerrar por pantalla. Después toca verificar los `ACMN` del PRDN 30: **20 personas**, no 22.

Si sale cualquier otra cosa —una quinta fila en el bloque 2, una segunda en el bloque 1, una
persona distinta en el bloque 3— se reporta tal cual, con la fila entera, y **no se corrige el
motor**: sigue congelado y las seis correcciones de fin de calibración van juntas al final.
