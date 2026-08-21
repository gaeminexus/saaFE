# Enero 2026 — lo que el contraste DEBE sacar TRAS las dos correcciones

**Escrito el 2026-08-21, antes de recalcular.** Sustituye a cualquier esperado anterior de enero:
las dos correcciones del motor —prorrateo comercial y «este empleador no retiene IR»— cambian lo
que este mes debe dar.

> **Enero es el mes que más se mueve de los cinco, porque es el único que tenía las dos causas a
> la vez.** Y es el que prueba la corrección del prorrateo: nadie más en todo el ejercicio entra o
> sale a mitad de mes.

## Qué cambió en el motor y a quién toca

| Corrección | A quién | Antes | Ahora |
|---|---|---:|---:|
| **Prorrateo comercial** (`30 − d + 1`) | Bravo Caiza, ingreso 15-01 | 16,4516 días | **16** |
| | Cevallos Montenegro, ingreso 19-01 | 12,5806 días | **12** |
| **No retiene IR** (`CNTENRIR = 'S'`) | Robayo | 20,17 retenidos | **0** |

Nadie más tiene días distintos de 30 en ningún mes del ejercicio, y nadie más tenía IR.

---

## Los totales

| | Nuestro | Del cliente | Diferencia |
|---|---:|---:|---:|
| **Líquido** | **16 476,92** | **16 476,92** | **0,00** |

**Cero.** Es la primera vez que un mes cuadra exacto contra el cliente.

---

## Bloque 4

`FILAS_ESPERADAS` **147** · `PERSONAS_ESPERADAS` **24** · `NOMINAS_CALCULADAS` **22**.

> **24 contra 22 es lo correcto**, y es el mismo caso que marzo: el `ROL` trae **22** personas y la
> `PLANILLA` **24**, porque el IESS declaró también a **Torres Chávez (206,00)** y **Benítez
> Montes (76,91)**, que salieron el 15 y el 16 de enero. A ellos los pagó su liquidación, no la
> nómina.
>
> *(Corregido el 2026-08-21: la primera versión de esta hoja decía 22 y era un error mío.)*

## Bloque 3 — control 2, TOTAL IESS

**Cuatro filas.** *(Corregido el 2026-08-21: la primera versión decía dos. Corregí el 24 contra 22
del bloque 4 y no lo propagué aquí, que es donde se ve.)*

| Identificación | Quién | Nuestro | De la planilla | Diferencia | `QUE_PASA` |
|---|---|---:|---:|---:|---|
| `0602237265` | Torres Chávez | — | 206,00 | **−206,00** | `EN LA PLANILLA Y SIN NOMINA` |
| `1714531405` | Benítez Montes | — | 76,91 | **−76,91** | `EN LA PLANILLA Y SIN NOMINA` |
| `1004350904` | Méndez Torres | 49,64 | 49,65 | **−0,01** | `IMPORTE DISTINTO` |
| `1717649873` | Muñoz Santos | 113,31 | 113,30 | **+0,01** | `IMPORTE DISTINTO` |

> **Las dos primeras son el mismo caso que Castro y Cevallos en marzo**: salieron el 15 y el 16 de
> enero, el IESS las declaró y a ellas las pagó su liquidación, no la nómina. **Es lo correcto.**

Los dos son la regla 4 —la planilla redondea la suma, nosotros sumamos renglones redondeados— y
**ninguno se toca**. Méndez sigue aquí en enero porque la adenda de tiempo completo es de abril.

> **Bravo Caiza y Cevallos Montenegro deben desaparecer de este bloque si estaban.** Su base
> imponible cambia al cambiar los días, y ése es el efecto que la corrección busca.

## Bloque 1 — diferencias por concepto

**VACÍO.** La única fila que había era el IR de Robayo, y con `CNTENRIR = 'S'` ya no se genera.

## Bloque 2 — totales de cabecera

### Primero, el par de vacaciones: **44 filas que NO son diferencias**

*(Corregido el 2026-08-21. La primera versión de esta hoja decía «tres filas» y se saltaba esto,
que es una característica del rol de enero ya documentada en el historial.)*

El rol del cliente imprime en enero una línea de **vacaciones** en ingresos y **la misma cantidad**
en descuentos: `sueldo / 24`. Es presentación y **netea a cero**. Produce **22 personas × 2 filas
= 44** en el bloque 2, todas con la forma:

| Sueldo | Diferencia en `INGRESOS` y en `DESCUENTOS` |
|---:|---:|
| 700,00 | −29,17 |
| 1 500,00 | −62,50 |
| 2 200,00 | −91,67 |
| 482,00 | −20,08 |

**Ninguna toca el `LIQUIDO`**, y por eso el total sigue cuadrando. **No se ajusta nada** — regla 6.

> **Si el par de vacaciones desaparece o cambia de importe, eso sí es hallazgo.** Y si alguna de
> esas 44 filas asoma en `LIQUIDO`, el par dejó de netear.

### Y después, lo que sí son diferencias: **tres filas**

| Identificación | Quién | Total | Diferencia |
|---|---|---|---:|
| `1716120769` | Manosalvas | `INGRESOS` | **+0,01** |
| `1716120769` | Manosalvas | `LIQUIDO` | **+0,01** |
| `1717649873` | Muñoz Santos | `LIQUIDO` | **−0,01** |

**Se cancelan en el total pero salen por persona**, que es justo por lo que el esperado se fija
fila a fila: un total en cero no distingue «cuadra» de «dos errores que se anulan».

> **Lo que desaparece y hay que comprobar que desapareció:** las dos filas de Robayo
> (`DESCUENTOS` +20,17 y `LIQUIDO` −20,17) y **las de Bravo Caiza y Cevallos Montenegro**, que
> eran los 44,59 del prorrateo. **Si alguna sigue, la corrección no surtió efecto.**
>
> **Y las dos de Méndez Torres** (`INGRESOS` +230,96 y `LIQUIDO` +218,22), que salieron en el
> primer recálculo porque el motor leyó su contrato de **hoy** —482 por la adenda de abril— en vez
> del sueldo de enero. **Las cierra `sql/48`, no el código.** Si vuelven a salir, la ficha no se
> bailó: ver `PLAN-PASO-A-PRODUCCION` §4 bis y el punto 14 de la lista.

## Bloque 1B

Patronales con **22** personas. Provisiones según modalidad, y fondos de reserva en **1** (Viteri).
Descuadre patronal **vacío**.

---

## El control que de verdad prueba la corrección del prorrateo

No es el total: es que **los días trabajados sean enteros**.

```sql
SELECT m.MPLDIDNT, m.MPLDAPLL, n.NMNADITR
  FROM RHH.NMNA n JOIN RHH.PRDN p ON p.PRDNCDGO = n.PRDNCDGO
  JOIN RHH.MPLD m ON m.MPLDCDGO = n.MPLDCDGO
 WHERE p.PRDNANOO = 2026 AND p.PRDNMSEE = 1 AND n.NMNADITR <> 30;
-- Esperado: exactamente dos filas, Bravo Caiza 16 y Cevallos Montenegro 12.
-- Ni un decimal. Si aparece 16,4516 el WAR no se publicó.
```
