# Guion de marzo de 2026 — réplica en producción

**Para qué es este documento.** Reproducir marzo en otra base **siguiendo una lista**. Verificado
contra la corrida del 2026-08-21, que cerró con **diferencia cero** contra el rol del cliente.

> **Marzo es el mes que enseñó la regla de oro de este módulo.** Dos personas salen el día 6, y
> hacerlo en el orden equivocado costó una tarde entera: el período se calculó antes de ejecutar
> las salidas y quedó con 22 nóminas en vez de 20. **Si sólo se lee una sección de este guion, que
> sea el §0.**

**Resultado que hay que obtener:** 20 nóminas · ingresos **20 793,34** · descuentos **3 202,22** ·
líquido **17 591,12** · patronal **2 468,77**. Cliente: 17 591,12. **Diferencia cero en el total.**

> El contraste sacará **tres filas** en el bloque 2 —el par de vacaciones desaparece este mes— más
> la discrepancia esperada del bloque 3. §7.

---

## 0. El orden, que en marzo no es un consejo

```
fichas → liquidar → APROBAR → EJECUTAR SALIDA → novedades → calcular → cerrar
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

## 2. Las dos liquidaciones, con su salida ejecutada

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

## 3. Novedades del período: seis, todas préstamos

Marzo **no lleva anticipos**. Todas con «Aprobada para el cálculo» = **Sí**.

| Concepto | Colaborador | Valor |
|---|---|---:|
| 23 · Quirografario IESS | CALDERON PARRAGA LAURA CECILIA | **14,23** |
| 23 · Quirografario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 23 · Quirografario IESS | ROBAYO RUEDA GABRIEL PATRICIO | **95,48** |
| 24 · Hipotecario IESS | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Hipotecario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **379,85** |
| 24 · Hipotecario IESS | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,30** |
| | **quirografarios** | **266,92** |
| | **hipotecarios** | **1 015,15** |

**El quirografario de Castro Arce NO se registra.** El IESS se lo sigue cobrando a ASOPREP (14,79)
aunque ella salga el día 6, pero en el rol no está y aquí no se carga. Es una diferencia conocida
del control 3: **687,05 nuestro contra 701,84 del IESS**. Con abril suman los 29,58 que ASOPREP
asumió, y en mayo desaparece sola.

---

## 4. Calcular, y comprobar antes del total

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

---

## 5. Cerrar: marzo avisa, y el aviso es la evidencia

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

## 6. Qué debe quedar

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

**`ACMN`**: 120 filas · **20 personas** · tipos 1, 2, 3, 5, 8 y 10 con 20 cada uno · **tipo 9 (IR)
vacío** · **suma del tipo 8 = 1 920,15**.

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

## 7. Diferencias que no son defecto

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
