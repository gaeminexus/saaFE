# Febrero 2026 — lo que el contraste DEBE sacar TRAS las dos correcciones

**Escrito el 2026-08-21, antes de recalcular.** Sustituye a cualquier esperado anterior.

**A febrero sólo le toca una de las dos correcciones**: nadie entra ni sale a mitad de mes, así
que el prorrateo no mueve nada. Lo único que cambia es que **Robayo deja de tener IR**.

## Los totales

| | Nuestro | Del cliente | Diferencia |
|---|---:|---:|---:|
| **Líquido** | **17 525,11** | **17 525,11** | **0,00** |

---

## Bloque 4

`PERSONAS_ESPERADAS` **22** · `NOMINAS_CALCULADAS` **22**. Verificado en `CTRL`: **rol 22 y
planilla 22**, al contrario que enero, donde la planilla traía 24.

## Bloque 3 — control 2, TOTAL IESS

**Dos filas, y ninguna por ausencia.**

| Identificación | Quién | Diferencia | `QUE_PASA` |
|---|---|---:|---|
| `1717649873` | Muñoz Santos | **+0,01** | `IMPORTE DISTINTO` |
| `1004350904` | Méndez Torres | **−0,01** | `IMPORTE DISTINTO` |

Regla 4, los dos. Méndez sigue aquí: la adenda es de abril.

> **Nadie debe salir como `EN LA PLANILLA Y SIN NOMINA`**, a diferencia de enero (Torres Chávez y
> Benítez Montes) y de marzo (Castro Arce y Cevallos Alemán). **En febrero no salió ni entró
> nadie.** Si aparece alguien por ausencia, es hallazgo.

## Bloque 1 — diferencias por concepto

**VACÍO.** Era sólo el IR de Robayo.

> **Y lo que ya cuadraba tiene que seguir cuadrando:** el anticipo de Calderón —`350` de cuota más
> `269,52` de novedad = **619,52**— no debe asomar. Si aparece, lo que se rompió es el paso 12,
> no el IR.

## Bloque 2 — totales de cabecera: **46 filas**

*(Corregido el 2026-08-21, derivado de los datos antes de ejecutar nada. La primera versión decía
tres filas y repetía el error que cometí en enero.)*

**Febrero SÍ lleva el par de vacaciones, como enero.** Comprobado sobre `CTRL`: `INGRESOS` del rol
menos la suma de sus conceptos de ingreso deja hueco en **las 22 personas**, por un total de
**886,80**. **Marzo, abril y mayo no lo llevan** — el `sql/36` lo dice y ahora está cruzado contra
los datos: allí el hueco es de una sola persona y vale −0,01, que es el centavo de Manosalvas.

### Por qué 886,80 y no los 823,19 de enero

**No es un salto raro: son los dos que entraron a mitad de enero y en febrero ya cobran mes
completo.** Más sueldo, más provisión de vacaciones. Verificado persona a persona:

| Quién | Hueco en enero | Hueco en febrero | Sube |
|---|---:|---:|---:|
| Cevallos Montenegro | 33,33 | 83,33 | **+50,00** |
| Bravo Caiza | 15,56 | 29,17 | **+13,61** |
| | | | **63,61** |

`823,19 + 63,61 = 886,80`. **Nadie más se mueve**, que es lo que confirma que el par se calcula
sobre lo devengado y no sobre el sueldo nominal.

| Origen | Filas |
|---|---:|
| Par de vacaciones: 22 personas × `INGRESOS` y `DESCUENTOS` | **44** |
| `LIQUIDO` de Manosalvas **+0,01** y de Muñoz **−0,01** | **2** |
| **Total** | **46** |

> **El `+0,01` de Manosalvas NO sale como fila propia de `INGRESOS`**: queda absorbido dentro de su
> fila del par de vacaciones, igual que en enero. Por eso son 46 y no 47.
>
> **Ninguna de las 44 toca el `LIQUIDO`**, y por eso el total da cero. Si alguna lo tocara, el par
> dejó de netear y eso sí es hallazgo.

Desaparecen las dos de Robayo. **Si siguen, `CNTENRIR` no está puesto o el WAR no se publicó.**

## Bloque 1B

Patronales **22** personas · fondos de reserva en **1** · descuadre patronal **vacío**.
