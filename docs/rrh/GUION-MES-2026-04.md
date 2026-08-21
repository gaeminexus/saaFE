# Guion de abril de 2026 — réplica en producción

**Para qué es este documento.** Reproducir abril en otra base **siguiendo una lista**. Verificado
contra la corrida del 2026-08-21.

> **Abril es el único mes de los cinco que no cierra en cero**, y su diferencia está identificada:
> **+175,00**, los OTROS de Calderón que el rol del cliente no clasifica. Es pregunta abierta con
> Steven, no un fallo de cálculo.

**Resultado que hay que obtener:** 20 nóminas · ingresos **21 034,34** · descuentos **4 945,12** ·
líquido **16 089,22**. Cliente: **15 914,22**. **Diferencia +175,00.**

> El bloque 2 saca **cinco filas**: las tres de siempre más las dos de Calderón. El par de
> vacaciones ya no está desde marzo. §7.

---

## 0. El orden

```
fichas (sql/49) → novedades → calcular → aprobar → contabilizar rol → cerrar
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

## 2. Novedades del período: diez

**Tres anticipos y siete préstamos.** Todas con «Aprobada para el cálculo» = **Sí**.

| Concepto | Colaborador | Valor |
|---|---|---:|
| 23 · Quirografario IESS | CALDERON PARRAGA LAURA CECILIA | **14,13** |
| 23 · Quirografario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 23 · Quirografario IESS | ROBAYO RUEDA GABRIEL PATRICIO | **95,48** |
| 23 · Quirografario IESS | VITERI LOPEZ JIMENA DEL PILAR | **420,23** |
| 24 · Hipotecario IESS | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Hipotecario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **379,85** |
| 24 · Hipotecario IESS | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,29** |
| 25 · Anticipo de sueldo | CALDERON PARRAGA LAURA CECILIA | **350,00** |
| 25 · Anticipo de sueldo | MOSCOSO NOVILLO DIANA CECILIA | **650,00** |
| 25 · Anticipo de sueldo | PARDO CALLE KATHERINE GUISSELA | **300,00** |
| | **quirografarios** | **687,05** |
| | **hipotecarios** | **1 015,14** |
| | **anticipos** | **1 300,00** |

**Dos que conviene no confundir:**

- **Viteri López lleva 420,23 en una sola novedad.** Son **dos** préstamos quirografarios —NUT
  15379546 por 240,73 y NUT 19600017 por 179,50— que el rol imprime sumados en una columna. Se
  registra uno solo, con los dos NUT anotados en la descripción.
- **El quirografario de Castro Arce sigue sin registrarse.** El IESS se lo cobra a ASOPREP (14,79)
  aunque salió el 06-03, pero en el rol no está. Control 3: **687,05 nuestro contra 701,84 del
  IESS**. En mayo desaparece solo.

---

## 3. Calcular, y comprobar antes del total

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

---

## 4. Cerrar

**Abril no debe avisar.** No tiene ninguna NVIS en su ventana: los avisos de Castro y Cevallos son
del **6 de marzo**. Si avisara, hay que mirar la ventana del backend.

`PRDNOBSR` debe quedar en:

```
Calculado sin contabilizacion (carga historica).
```

**No pulsar «Contabilizar provisiones».**

---

## 5. Qué debe quedar

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

**`ACMN`**: 120 filas · **20 personas** · tipos 1, 2, 3, 5, 8 y 10 con 20 cada uno · **tipo 9 (IR)
vacío** · **suma del tipo 8 = 1 942,93**.

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

## 6. Lo que hace fallar abril

| Síntoma | Causa | Qué mirar |
|---|---|---|
| Méndez en 241,00 | `sql/49` no se ejecutó | Su fila: debe ser 482,00 / 45,55 / 436,45 |
| `sql/49` se niega a correr | Enero, febrero o marzo sin cerrar | Su control es deliberado: cerrar los tres primero |
| Viteri con 240,73 o 179,50 | Se registró un solo préstamo de los dos | Debe ser **una** novedad de **420,23** |
| Diferencia distinta de +175,00 | Causa nueva | Parar y reportar |
| Abril avisa al cerrar | La ventana del backend no coincide | Abril no tiene NVIS propias |

---

## 7. Diferencias que no son defecto

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
