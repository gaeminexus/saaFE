# Guion de mayo de 2026 — réplica en producción

**Para qué es este documento.** Reproducir mayo en otra base **siguiendo una lista**. Verificado
contra la corrida del 2026-08-21, que cerró con **diferencia cero** contra el rol del cliente.

> **Mayo es el mes en que las cuentas del IESS se ponen al día.** Desaparece el quirografario de
> Castro Arce que se arrastraba desde marzo, y el control 3 cuadra al centavo por primera vez en
> el año. También es el mes en que Calderón queda en líquido cero, que es correcto.

**Resultado que hay que obtener:** 20 nóminas · ingresos **21 034,34** · descuentos **4 999,13** ·
líquido **16 035,21** · patronal **2 498,04**. Cliente: 16 035,21. **Diferencia cero en el total.**

> El bloque 2 saca **tres filas**. El par de vacaciones ya no está desde marzo, y los 175,00 de
> Calderón no se arrastran a mayo. §7.

---

## 0. El orden

```
novedades → calcular → aprobar → contabilizar rol → cerrar
```

**Mayo no tiene cambios de ficha ni liquidaciones.** Nadie entra, nadie sale, nadie cambia de
sueldo ni de jornada. Sólo novedades.

---

## 1. Fichas: nada que tocar

Méndez Torres sigue como quedó en abril: **482,00 / jornada 1 / 40 h**. Si viene de haber cerrado
abril, está puesta.

---

## 2. Novedades del período: ocho

**Tres anticipos y cinco préstamos.** Todas con «Aprobada para el cálculo» = **Sí**.

| Concepto | Colaborador | Valor |
|---|---|---:|
| 23 · Quirografario IESS | CALDERON PARRAGA LAURA CECILIA | **14,04** |
| 23 · Quirografario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 24 · Hipotecario IESS | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Hipotecario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **379,85** |
| 24 · Hipotecario IESS | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,29** |
| 25 · Anticipo de sueldo | CALDERON PARRAGA LAURA CECILIA | **619,81** |
| 25 · Anticipo de sueldo | MOSCOSO NOVILLO DIANA CECILIA | **750,00** |
| 25 · Anticipo de sueldo | PAZMIÑO JARAMILLO EDGAR ALBERTO | **500,00** |
| | **quirografarios** | **171,25** |
| | **hipotecarios** | **1 015,14** |
| | **anticipos** | **1 869,81** |

**Tres cosas que cambian respecto a abril y que hay que respetar:**

- **Viteri López y Robayo Rueda dejan de tener quirografario.** En abril eran 420,23 y 95,48; en
  mayo, **nada**. Si aparecen esos importes, es que se arrastró la novedad del mes anterior.
- **El quirografario de Calderón baja de 14,13 a 14,04.**
- **Pazmiño Jaramillo es nuevo en anticipos** (500,00). Los anticipos suben de 1 300,00 a 1 869,81.

---

## 3. Calcular, y comprobar antes del total

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

---

## 4. Cerrar

**Mayo no debe avisar.** No tiene ninguna NVIS en su ventana.

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
| Ingresos / Descuentos | 21 034,34 / 4 999,13 |
| **Neto** | **16 035,21** |
| Patronal | 2 498,04 |
| Asientos | **null / null / null** |

**`ACMN`**: 120 filas · **20 personas** · tipos 1, 2, 3, 5, 8 y 10 con 20 cada uno · **tipo 9 (IR)
vacío** · **suma del tipo 8 = 1 942,93**, idéntica a la de abril porque los sueldos no cambiaron.

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

## 6. Lo que hace fallar mayo

| Síntoma | Causa | Qué mirar |
|---|---|---|
| Viteri con 628,13 de descuentos | Se arrastró su quirografario de abril (420,23) | En mayo debe ser **207,90** |
| Robayo con 237,23 | Se arrastró su quirografario de abril (95,48) | En mayo debe ser **141,75** |
| Calderón con neto ≠ 0,00 | Falta el anticipo de 619,81 o el quirografario de 14,04 | 66,15 + 14,04 + 619,81 = 700,00 |
| Quirografarios ≠ 171,25 | Se registró el de Castro Arce | En mayo el IESS deja de cobrarlo |
| Mayo avisa al cerrar | La ventana del backend no coincide | Mayo no tiene NVIS propias |

---

## 7. Diferencias que no son defecto

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
