> ## ⚠ REESCRITO EL 2026-08-21 TRAS LAS DOS CORRECCIONES DEL MOTOR
>
> Las correcciones del **prorrateo comercial** (`30 − d + 1`) y de **«este empleador no retiene
> IR»** (`CNTENRIR`) cambian lo que este mes debe dar. **Lo de abajo describe el estado ANTERIOR
> y se conserva como historia**; lo que manda es esto:
>
> | | Nuestro | Del cliente | Diferencia |
> |---|---:|---:|---:|
> | **Líquido** | **16 035,21** | **16 035,21** | **0,00** |
>
> - **Bloque 1: VACÍO.** La única fila era el IR de Robayo y ya no se genera.
> - **Bloque 2: desaparecen las dos filas de Robayo** (`DESCUENTOS` +20,17 y `LIQUIDO` −20,17).
>   **Se quedan los centavos de Manosalvas y Muñoz**, que se cancelan en el total pero **sí salen
>   por persona** — por eso el esperado se fija fila a fila y no por totales.
> - **Bloque 3: sin cambio.** Las correcciones no tocan la base imponible de nadie en este mes.
> - **Bloque 1B: sin cambio.**
> - El prorrateo **no mueve nada aquí**: sólo enero tiene gente que entra a mitad de mes.
>
> Mayo queda en cero limpio. Sus quirografarios (171,25 sobre dos personas) y el control 3 al centavo **no cambian**: las correcciones no tocan préstamos.
>
> **Si alguna fila de Robayo sigue saliendo, o el WAR no se publicó o `CNTENRIR` no está puesto.**

# Mayo 2026 — lo que el contraste canónico DEBE sacar

**Escrito el 2026-08-21, ANTES de ejecutar nada.** Lo que no esté aquí es **hallazgo nuevo** y se
reporta sin interpretarlo.

- **Instrumento:** `sql/CONTRASTE_MES_CONTRA_ROL_REAL.sql`, sólo consulta.
- **Datos esperados:** `sql/46_CARGA_CONTRASTE_MAYO.sql`, ya ejecutado y verificado por el dueño
  del modelo: **PLANILLA 20 filas / 20 personas · ROL 114 filas / 20 personas**.
- **Precondición:** `RHH.CTRL_PARAM` en `2026 / 5`. Con el parámetro en otro mes todos los bloques
  salen vacíos y **parecen un éxito**. Se comprueba antes de leer nada.
- **Precondición:** `NMNA` del período de mayo en **20** filas.
- **Cómo se ejecuta:** despojando los comentarios (`grep -vE '^\s*--'`) y sentencia por sentencia
  —las 18 líneas `--` del instrumento acaban en guion y en SQL\*Plus se tragan la siguiente—, y
  **por el camino canónico**, leyendo `CTRL_PARAM`: es el que correrá en producción.
- **Orden de lectura:** 4 primero, luego 3, luego 1 y 2, y el 1B se mira aunque todo cuadre.

> **Mayo es el mes más limpio del año.** La diferencia total debe ser **exactamente −20,17**, sólo
> Robayo. Es el primer mes en que no hay ninguna causa además del IR: no hay salidas, no hay
> entradas, no hay anticipos raros y no hay columna «OTROS» sin clasificar.

---

## Bloque 4 — que la comparación sea completa

| Columna | Esperado |
|---|---:|
| `FILAS_ESPERADAS` | **134** (114 del rol + 20 de la planilla) |
| `PERSONAS_ESPERADAS` | **20** |
| `NOMINAS_CALCULADAS` | **20** |

20 contra 20, sin discrepancia, igual que abril. Aquí una diferencia **sí** sería error.

---

## Bloque 3 — control 2, TOTAL IESS afiliado por afiliado

**Una sola fila.**

| Identificación | Quién | Nuestro | De la planilla | Diferencia |
|---|---|---:|---:|---:|
| `1717649873` | Muñoz Santos | 113,31 | 113,30 | **+0,01** |

La regla 4 de siempre. **Méndez ya no sale** desde abril, y no debe volver.

---

## Bloque 2 — totales de cabecera

**Cinco filas** —dos menos que abril, porque los 175,00 de Calderón no se repiten—.

| Identificación | Quién | Total | Nuestro | Del rol | Diferencia |
|---|---|---|---:|---:|---:|
| `1725996498` | Robayo | `DESCUENTOS` | | | **+20,17** |
| `1725996498` | Robayo | `LIQUIDO` | | | **−20,17** |
| `1716120769` | Manosalvas | `INGRESOS` | | | **+0,01** |
| `1716120769` | Manosalvas | `LIQUIDO` | | | **+0,01** |
| `1717649873` | Muñoz Santos | `LIQUIDO` | | | **−0,01** |

**Si aparece Calderón, es hallazgo:** los 175,00 de abril eran de aquel mes.

---

## Bloque 1 — diferencias por concepto

**Una fila:** Robayo, concepto **21** (impuesto a la renta), `NO ESTA EN EL ROL`.

### Lo que este mes prueba de verdad: los quirografarios

| | Esperado |
|---|---:|
| Concepto 23 (quirografario IESS), los dos lados | **171,25 sobre 2 personas** |

Tres cosas que cambian y ninguna debe producir fila en el bloque 1:

1. **El quirografario de Castro Arce (14,79) por fin desaparece.** El IESS lo siguió cobrando
   marzo y abril aunque ya no estuviera, y ASOPREP lo asumió. **Por eso el control 3 —préstamos
   contra lo que el IESS cobra— cuadra al centavo por primera vez en el año: 171,25 contra
   171,25.**
2. **Viteri López deja de tener quirografario.** En abril tenía dos, 420,23.
3. **Robayo deja de tener quirografario.** El suyo (NUT 20048689) arrancó en marzo.

> **Si el motor le genera quirografario a Viteri o a Robayo, es hallazgo y la causa está
> identificada de antemano: se arrastró la novedad de abril.** No es un error de cálculo sino una
> cuota que debió cerrarse y no se cerró; se mira `CTDS`, no el rol.

---

## Bloque 1B — patronales y provisiones

**Debe salir idéntico al de abril**, porque los sueldos son los mismos:

| Clase | Alterno | Concepto | Personas | Total |
|---|---:|---|---:|---:|
| PATRONAL | 40 | Aporte patronal IESS | **20** | 2 292,44 |
| PATRONAL | 41 | Aporte IECE | **20** | 102,80 |
| PATRONAL | 42 | Aporte SECAP | **20** | 102,80 |
| PROVISION | 50 | Provisión décimo tercero | **17** | 1 359,49 |
| PROVISION | 51 | Provisión décimo cuarto | **17** | 682,89 |
| PROVISION | 52 | Provisión vacaciones | **20** | 856,68 |
| PROVISION | 53 | Provisión fondos de reserva | **1** | 183,26 |

- **Si alguno se mueve sin que nadie haya tocado el paso 8, es hallazgo.**
- **Viteri sigue siendo el único en fondos de reserva hasta el 25 de junio**, que es cuando cumple
  el año y el cliente empieza a declararle FR de verdad. **En junio ese renglón cambia por motivo
  legítimo, no por defecto** — queda escrito aquí para que nadie lo lea como regresión.
- **La segunda consulta del 1B, el descuadre `NMNATTPT = NMNAAPPT + NMNAIESC`, debe salir VACÍA.**

---

## El total del mes

| | Nuestro | Del cliente | Diferencia |
|---|---:|---:|---:|
| Ingresos | 21 034,34 | 21 034,33 | +0,01 |
| Descuentos | 5 019,30 | 4 999,13 | +20,17 |
| **Líquido** | **16 015,04** | **16 035,21** | **−20,17** |

La diferencia del líquido es **sólo Robayo**: los dos centavos de Manosalvas y Muñoz se cancelan
entre sí. **Si el total da −20,17 pero la descomposición no es ésa, hay dos errores que se
compensan**, y eso es peor que un descuadre porque el total en verde lo taparía.

## Cierre del paso

Si los cinco bloques salen así, mayo cuadra y sería el **quinto mes seguido sin causas nuevas**.
Cualquier otra cosa se reporta tal cual y **no se corrige el motor**: sigue congelado.
