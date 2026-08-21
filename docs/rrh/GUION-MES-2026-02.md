# Guion de febrero de 2026 — réplica en producción

**Para qué es este documento.** Reproducir febrero en otra base **siguiendo una lista**. Verificado
contra la corrida del 2026-08-21, que cerró con **diferencia cero** contra el rol del cliente.

> **Febrero es el mes tranquilo de los cinco.** Nadie entra, nadie sale, nadie cambia de ficha, y
> no hay ninguna novedad del IESS que declarar. Si algo se complica aquí, es que viene arrastrado
> de enero.

**Resultado que hay que obtener:** 22 nóminas · ingresos **21 757,34** · descuentos **4 232,23** ·
líquido **17 525,11** · patronal **2 585,89**. Cliente: 17 525,11. **Diferencia cero en el total.**

> **Diferencia cero en el total no quiere decir bloque 2 vacío.** El contraste sacará **46 filas**
> por persona, y las 46 son esperadas: 44 del par de vacaciones del rol y 2 de medio centavo. §7.

---

## 0. El orden

```
fichas → novedades → calcular → aprobar → contabilizar rol → cerrar
```

Sin liquidaciones: febrero no tiene ninguna salida.

---

## 1. Fichas: Méndez Torres sigue a media jornada

**Igual que en enero**, y por lo mismo: el motor lee el contrato vigente, y la adenda que la pasa a
tiempo completo es del **01-04**.

| Campo | Valor |
|---|---|
| `CNTESLRB` | **241,00** |
| `CNTEJRND` | **2** — parcial |
| `CNTEHRSM` | **20** |

Si viene de haber cerrado enero, ya está puesta y no hay que tocar nada. **`sql/49` no se ejecuta
hasta que enero, febrero y marzo estén cerrados.**

---

## 2. Novedades del período: ocho

**Dos anticipos y seis préstamos.** Todas con «Aprobada para el cálculo» = **Sí**.

| Concepto | Colaborador | Valor |
|---|---|---:|
| 23 · Quirografario IESS | CALDERON PARRAGA LAURA CECILIA | **14,33** |
| 23 · Quirografario IESS | CASTRO ARCE LESLY MARICELA | **14,79** |
| 23 · Quirografario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **157,21** |
| 24 · Hipotecario IESS | COSSIO CAICEDO EIMY | **490,00** |
| 24 · Hipotecario IESS | MANOSALVAS LLERENA FERNANDO PAUL | **379,84** |
| 24 · Hipotecario IESS | PAZMIÑO JARAMILLO EDGAR ALBERTO | **145,29** |
| 25 · Anticipo de sueldo | CALDERON PARRAGA LAURA CECILIA | **269,52** |
| 25 · Anticipo de sueldo | ZAMBRANO MIELES TANYA GISSELA | **50,00** |
| | **quirografarios** | **186,33** |
| | **hipotecarios** | **1 015,13** |
| | **anticipos** | **319,52** |

**Tres cosas que no son erratas:**

- **Castro Arce lleva quirografario en febrero** (14,79) y en enero no. Es el último mes en que lo
  paga ella: sale el 06-03 y desde entonces el IESS se lo sigue cobrando a ASOPREP, que lo asume.
- **Manosalvas hipotecario 379,84**, no 379,85. Es el único mes con ese céntimo; de marzo en
  adelante son 379,85.
- **El anticipo de Calderón, 269,52**, es la pregunta abierta con Steven. Se registra como
  diferencia contra lo que el motor genera solo, que es la decisión tomada para los anticipos.

Además, **las cuotas de `CTDS` de enero cobran su segunda mitad**: Calderón y Pardo llevan 350,00
cada uno sin que haya que registrar nada. Vencen el 28-02 y el motor las aplica solo.

---

## 3. Calcular, y comprobar antes del total

| # | Comprobación | Esperado |
|---|---|---|
| 1 | Filas en `NMNA` | **22** |
| 2 | Días ≠ 30 | **ninguno** — Bravo Caiza y Cevallos Montenegro ya cobran mes completo |
| 3 | Méndez Torres | **241,00 / 22,77 / 218,23** |
| 4 | Renglones de IR | **cero** |
| 5 | **Cabecera contra suma de `NMNA`** | **iguales en las cuatro cifras** |
| 6 | Neto | **17 525,11** |

**Si aparece alguien con días parciales, parar.** En febrero todos cobran mes completo; unos días
partidos significan que el prorrateo está tocando a quien no debe.

**Dos anclajes que confirman que las cuotas de `CTDS` entraron una sola vez:**

| Colaborador | Descuentos | Neto |
|---|---:|---:|
| CALDERON PARRAGA | **700,00** = 66,15 + 14,33 + 269,52 + **350,00** | **0,00** |
| PARDO CALLE | 416,15 = 66,15 + **350,00** | **283,85** |

> **Calderón en líquido cero es correcto.** Sus descuentos igualan su sueldo al céntimo. Vuelve a
> pasar en mayo. No es un error de carga.

---

## 4. Cerrar

**Febrero no debe avisar.** No tiene ninguna NVIS en su ventana: los avisos de Torres y Benítez son
del 15 y 16 de **enero**, y los de Castro y Cevallos del 6 de **marzo**.

**Si febrero se negara a cerrar o avisara, es hallazgo**: significa que la ventana del backend no
coincide con el rango del período, y hay que mirarlo antes de seguir.

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
| `numeroEmpleados` | 22 |
| Ingresos / Descuentos | 21 757,34 / 4 232,23 |
| **Neto** | **17 525,11** |
| Patronal | 2 585,89 |
| Asientos | **null / null / null** |

**`ACMN`**: 132 filas · **22 personas** · tipos 1, 2, 3, 5, 8 y 10 con 22 cada uno · **tipo 9 (IR)
vacío** · **suma del tipo 8 = 2 011,25**, que es el concepto 20 del cliente al centavo.

**Las 22 nóminas**

> **Foto del 2026-08-21, WAR desplegado a las 05:34.** Es **nuestra salida**, no el rol del
> cliente: sirve para saber **quién** diverge, no sólo que algo diverge. **Caduca**: si la base
> local se recalcula, el guion empieza a mentir sin avisar. Regenerarla antes de fiarse:
>
> ```sql
> SELECT m.MPLDIDNT, m.MPLDAPLL || ' ' || m.MPLDNMBR AS COLABORADOR,
>        n.NMNADITR AS DIAS, n.NMNATING AS INGRESOS,
>        n.NMNATDSC AS DESCUENTOS, n.NMNANETO AS NETO
>   FROM RHH.NMNA n
>   JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
>   JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
>  WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 2
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
| 1720245735 | CASTRO ARCE LESLY MARICELA | 30 | 482,00 | 60,34 | 421,66 |
| 1716501778 | CEVALLOS ALEMAN EDGAR GIOVANNY | 30 | 482,00 | 45,55 | 436,45 |
| 1311981953 | CEVALLOS MONTENEGRO JOHNNY STEVEN | 30 | 2 000,00 | 189,00 | 1 811,00 |
| 1715156574 | COSSIO CAICEDO EIMY | 30 | 798,50 | 556,15 | 242,35 |
| 1750302984 | GARCIA VITERI WILLAM ALEXANDER | 30 | 700,00 | 66,15 | 633,85 |
| 1716120769 | MANOSALVAS LLERENA FERNANDO PAUL | 30 | 2 206,84 | 726,05 | 1 480,79 |
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
| 1307779064 | ZAMBRANO MIELES TANYA GISSELA | 30 | 500,00 | 97,25 | 402,75 |

**Castro Arce y Cevallos Alemán están**, aunque salgan el 06-03: en febrero trabajaron el mes
entero. **Torres Chávez y Benítez Montes no**, porque salieron en enero.

---

## 6. Lo que hace fallar febrero

| Síntoma | Causa | Qué mirar |
|---|---|---|
| Neto **+218,22** | Méndez a 482: `sql/49` corrido antes de tiempo | Su fila: 482,00 en vez de 241,00 |
| **20 filas** y cabecera ≠ detalle | El motor perdió a Castro y Cevallos por estar CESANTES | La consulta de contratos filtra por estado del empleado |
| Alguien con días parciales | Prorrateo aplicándose donde no toca | En febrero **nadie** lleva días ≠ 30 |
| Calderón con neto distinto de 0,00 | Falta el anticipo de 269,52, o la cuota de `CTDS` no entró | 66,15 + 14,33 + 269,52 + 350,00 = 700,00 |
| Febrero avisa al cerrar | La ventana del backend no coincide con el período | Febrero no tiene NVIS propias |

---

## 7. Diferencias que no son defecto

**El total cierra en cero. Las filas por persona no están vacías.** El bloque 2 saca **46 filas**:

### Las 44 del par de vacaciones

El rol del cliente lleva, por persona, **un ingreso y un descuento de vacaciones que se cancelan**.
22 × 2 = **44 filas**, **886,80** por cada lado, y **no tocan el líquido**. Nuestro motor no genera
esos renglones, así que salen como diferencia en los dos sentidos y se neutralizan.

**Sube respecto a enero** —de 823,19 a 886,80— y sólo por una razón: Bravo Caiza y Cevallos
Montenegro ya cobran mes completo, así que el sueldo del mes sube y con él el par. La base es el
sueldo (concepto 1: **21 283,00**), dividido entre 24 y redondeado por fila.

> **Se anuncia antes de correr el contraste.** Quien vea 46 filas donde espera dos creerá que algo
> se rompió: es una presencia que nadie anunció pareciendo un hallazgo.

**Marzo en adelante desaparece** y el bloque 2 vuelve a tres filas.

### Las 2 restantes

| Colaborador | Diferencia | Origen |
|---|---:|---|
| MANOSALVAS LLERENA FERNANDO PAUL | **+0,01** | Regla 4: redondeamos cada renglón antes de sumar; la hoja del cliente arrastra decimales |
| MUÑOZ SANTOS MARCELO ALEJANDRO | **−0,01** | Lo mismo, con signo contrario |

Se cancelan en el total. **No se ajustan.**

---

## Referencias

- Valores del cliente: `sql/35` carga `RHH.CTRL` de febrero.
- Contraste: `CONTRASTE_MES_CONTRA_ROL_REAL.sql` con `CTRL_PARAM` en el mes 2.
- Correcciones del motor necesarias: prorrateo `30 − d + 1`, `CNTENRIR` de Robayo y selección de
  nómina por contrato vigente. **La tercera no cambia febrero, lo protege**: sin ella, recalcularlo
  perdería a Castro y Cevallos y se irían otros 872,90.
