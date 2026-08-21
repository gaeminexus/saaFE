# Guion de enero de 2026 — réplica en producción

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
> explicado en el **§8**, y conviene leerlo *antes* de correr el contraste para no confundirlo con
> un fallo.

---

## 0. Antes de empezar: el orden no es negociable

```
fichas → liquidaciones → novedades → calcular → aprobar → contabilizar rol → cerrar
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

## 2. Las dos liquidaciones, aprobadas y con la salida ejecutada

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

## 3. Novedades del período: cinco, todas préstamos del IESS

Enero **no lleva anticipos como novedad**: los de Calderón y Pardo vienen de `CTDS`, la tabla de
cuotas, y el motor los aplica solo (350,00 a cada uno). Registrar además una novedad de anticipo
los cobraría dos veces.

| Concepto | Colaborador | Valor |
|---|---|---:|
| 23 · Préstamo quirografario IESS | CALDERON PARRAGA LAURA CECILIA | **14,42** |
| 23 · Préstamo quirografario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 24 · Préstamo hipotecario IESS | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Préstamo hipotecario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **379,85** |
| 24 · Préstamo hipotecario IESS | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,29** |
| | **quirografarios** | **171,63** |
| | **hipotecarios** | **1 015,14** |

**Las cinco con «Aprobada para el cálculo» = Sí.** Una novedad sin aprobar se ignora sin decir nada.

> **Ojo con el combo de concepto:** elegir de la lista, no teclear y salir. Un combo a medias viaja
> como texto y el backend responde un 400 que no explica nada.

---

## 4. Calcular, y comprobar **antes** de mirar el total

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

---

## 5. Cerrar: enero avisa, y el aviso es la evidencia

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

## 6. Qué debe quedar

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

**`ACMN`**: 132 filas · **22 personas** · tipos 1, 2, 3, 5, 8 y 10 con 22 cada uno · **tipo 9
(IR) vacío** · **suma del tipo 8 = 1 866,98**, que es el concepto 20 del cliente al centavo.

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

## 7. Las cuatro cosas que hacen fallar enero

| Síntoma | Causa | Qué mirar |
|---|---|---|
| Neto **+218,22** (16 695,14) | Méndez a 482: falta el paso 1 | Su fila: 482,00 en vez de 241,00 |
| **20 filas** en vez de 22, y cabecera ≠ detalle | El motor perdió a Castro y Cevallos por estar CESANTES | La consulta de contratos filtra por estado del empleado en vez de por contrato vigente |
| Días con decimales | Prorrateo por días de calendario | Bravo Caiza en 16,4516 |
| Un renglón de IR en Robayo | Falta ponerlo exento | `CNTENRIR` |

Las cuatro se ven **antes** de mirar el total, que es la razón de que el paso 4 vaya en ese orden.

---

## 8. Diferencias que no son defecto

**El total cierra en cero. Las filas por persona no están vacías.** Son dos cosas distintas y
conviene no confundirlas: leer un total cancelado como si no hubiera filas debajo es exactamente el
error que advierte el §4.

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
