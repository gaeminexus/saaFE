> ## ⚠ REESCRITO EL 2026-08-21 TRAS LAS DOS CORRECCIONES DEL MOTOR
>
> Las correcciones del **prorrateo comercial** (`30 − d + 1`) y de **«este empleador no retiene
> IR»** (`CNTENRIR`) cambian lo que este mes debe dar. **Lo de abajo describe el estado ANTERIOR
> y se conserva como historia**; lo que manda es esto:
>
> | | Nuestro | Del cliente | Diferencia |
> |---|---:|---:|---:|
> | **Líquido** | **16 089,22** | **15 914,22** | **+175,00** |
>
> - **Bloque 1: VACÍO.** La única fila era el IR de Robayo y ya no se genera.
> - **Bloque 2: desaparecen las dos filas de Robayo** (`DESCUENTOS` +20,17 y `LIQUIDO` −20,17).
>   **Se quedan los centavos de Manosalvas y Muñoz**, que se cancelan en el total pero **sí salen
>   por persona** — por eso el esperado se fija fila a fila y no por totales.
> - **Bloque 3: sin cambio.** Las correcciones no tocan la base imponible de nadie en este mes.
> - **Bloque 1B: sin cambio.**
> - El prorrateo **no mueve nada aquí**: sólo enero tiene gente que entra a mitad de mes.
>
> Abril es el único de los cinco que **no** queda en cero, y su causa está identificada: los **175,00 de Calderón**, la columna «OTROS» sin clasificar del rol. Sus dos filas del bloque 2 **se quedan**. Es pregunta para Steven, no defecto.
>
> **Si alguna fila de Robayo sigue saliendo, o el WAR no se publicó o `CNTENRIR` no está puesto.**

# Abril 2026 — lo que el contraste canónico DEBE sacar

**Escrito el 2026-08-21, ANTES de ejecutar nada.** Misma razón que en marzo: un esperado redactado
después de ver la salida deja de ser un control y pasa a ser una explicación. Lo que no esté aquí
es **hallazgo nuevo** y se reporta sin interpretarlo.

- **Instrumento:** `sql/CONTRASTE_MES_CONTRA_ROL_REAL.sql`, sólo consulta.
- **Datos esperados:** `sql/40_CARGA_CONTRASTE_ABRIL.sql`, ya ejecutado.
- **Precondición:** `RHH.CTRL_PARAM` en `2026 / 4`. Con el parámetro en otro mes todos los bloques
  salen vacíos y **parecen un éxito**.
- **Precondición:** `NMNA` del período de abril en **20** filas —filtrando por `PRDNANOO = 2026 AND PRDNMSEE = 4`, **nunca por el código del período**: el 31 es el de LOCAL y en producción abril tendrá otro (allí enero es 1, febrero 2 y marzo 21)—. En marzo el recálculo dejó dos huérfanas y
  la cabecera no lo delató; se comprueba antes de leer nada.
- **Cómo se ejecuta:** despojando los comentarios (`grep -vE '^\s*--'`) y sentencia por sentencia.
  Las 18 líneas `--` del instrumento acaban en guion, y en SQL\*Plus **un guion final se traga la
  sentencia siguiente**: el bloque saldría vacío, es decir «cuadra».
- **Orden de lectura:** 4 primero, luego 3, luego 1 y 2, y el 1B se mira aunque todo cuadre.

**Abril es el primer mes del año en que los dos lados coinciden en número de personas.** No hay
salidas, no hay entradas, y Méndez Torres pasó a tiempo completo por adenda del 01-04.

---

## Bloque 4 — que la comparación sea completa

| Columna | Esperado |
|---|---:|
| `PERSONAS_ESPERADAS` | **20** |
| `NOMINAS_CALCULADAS` | **20** |
| `FILAS_ESPERADAS` | > 0 |
| `RENGLONES_CALCULADOS` | > 0 |

**20 contra 20, sin discrepancia.** A diferencia de marzo, aquí una diferencia **sí** sería un
error: no hay nadie declarado de más ni de menos.

---

## Bloque 3 — control 2, TOTAL IESS afiliado por afiliado

**Una sola fila.**

| Identificación | Quién | Nuestro | De la planilla | Diferencia | `QUE_PASA` |
|---|---|---:|---:|---:|---|
| `1717649873` | Muñoz Santos | 113,31 | 113,30 | **+0,01** | `IMPORTE DISTINTO` |

- Es la regla 4 de siempre: `550 × 20,60 % = 113,30` exacto contra nuestros `51,98 + 61,33`.
- **Méndez Torres desaparece de este bloque**, y ése es el cambio del mes: al pasar a tiempo
  completo, `482 × 20,60 %` y `45,55 + 53,74` dan los dos **99,29**. En enero, febrero y marzo
  salía con −0,01 porque el prorrateo de 241 partía la cifra. **Si vuelve a salir, la adenda no
  se aplicó.**
- **Cualquier otra persona aquí es hallazgo.**

---

## Bloque 2 — totales de cabecera

**Siete filas.**

| Identificación | Quién | Total | Diferencia | Qué es |
|---|---|---|---:|---|
| `1725996498` | Robayo | `LIQUIDO` | **−20,17** | IR que el cliente no retiene hasta agosto |
| `1725996498` | Robayo | `DESCUENTOS` | **+20,17** | el mismo hecho por el otro renglón |
| `1716120769` | Manosalvas | `LIQUIDO` | **+0,01** | regla 4 |
| `1716120769` | Manosalvas | `INGRESOS` | **+0,01** | idem |
| `1717649873` | Muñoz Santos | `LIQUIDO` | **−0,01** | regla 4, signo contrario al del bloque 3 |
| *(Calderón)* | Calderón | `DESCUENTOS` | **−175,00** | **los OTROS sin clasificar del rol** |
| *(Calderón)* | Calderón | `LIQUIDO` | **+175,00** | el mismo hecho por el otro renglón |

> **Las dos de Calderón son nuevas este mes y NO son defecto.** El rol del cliente le descuenta
> 175,00 en una columna «OTROS» que no dice qué es; el motor no puede generar un descuento que no
> sabe que existe. **Es pregunta para Steven**, junto a Robayo y al anticipo de febrero. No se
> ajusta ningún valor del cliente para taparlo — regla 6.

**Cualquier octava fila es hallazgo.**

---

## Bloque 1 — diferencias por concepto

**Una fila:** Robayo, concepto **21** (impuesto a la renta), `NO ESTA EN EL ROL`, por el importe
que dé el cálculo de abril.

**Lo que NO debe salir, y es lo que este bloque prueba de verdad este mes:** los préstamos y
anticipos deben cuadrar **renglón a renglón**, así que ninguno aparece. Los totales de control:

| Concepto | Los dos lados |
|---|---:|
| Anticipos | **1 300,00** |
| Quirografarios IESS | **687,05** |
| Hipotecarios IESS | **1 015,14** |

Si alguno de los tres asoma en el bloque 1, el descuento se generó distinto del que el cliente
aplicó y hay que mirar la cuota, no el rol.

---

## Bloque 1B — patronales y provisiones

Informativo, sale siempre. **Este mes sí lleva esperado**, que es la lección de marzo: el único
bloque sin expectativa fue el único que escondía un error.

| Clase | Alterno | Concepto | Personas esperadas |
|---|---:|---|---:|
| PATRONAL | 40 | Aporte patronal IESS | **20** |
| PATRONAL | 41 | Aporte IECE | **20** |
| PATRONAL | 42 | Aporte SECAP | **20** |
| PROVISION | 50 | Provisión décimo tercero | **17** |
| PROVISION | 51 | Provisión décimo cuarto | **17** |
| PROVISION | 52 | Provisión vacaciones | **20** |
| PROVISION | 53 | Provisión fondos de reserva | **1** |

- Los 17 son los 20 menos los tres que cobran los décimos mensualizados.
- El **1** de fondos de reserva es Viteri López, y **debe seguir siendo 1**: es el punto 10 de la
  lista, que no se corrige hasta el final de la calibración. Si sale otra cosa sin que nadie haya
  tocado el paso 8, es hallazgo. Su importe debe seguir siendo **183,26**.
- Los patronales suben respecto a marzo porque la masa pasa de 20 319,00 a **20 560,00** — Méndez
  entra con 482 en vez de 241.
- **La segunda consulta del 1B, el descuadre `NMNATTPT = NMNAAPPT + NMNAIESC`, debe salir VACÍA.**

---

## El total del mes

| | |
|---|---:|
| Nuestro líquido | **16 069,05** |
| Líquido del cliente | **15 914,22** |
| Diferencia | **+154,83** |

Y la diferencia **descompone exactamente en dos cosas y nada más**: `+175,00` de Calderón
`−20,17` de Robayo. Los dos centavos de Manosalvas y Muñoz se cancelan entre sí.

**Si el total cuadra pero la descomposición no da 175,00 − 20,17, hay dos errores que se
compensan** — y eso es peor que un descuadre, porque el total en verde lo taparía.

## Cierre del paso

Si los cinco bloques salen así, abril cuadra. Cualquier otra cosa se reporta tal cual, con la fila
entera, y **no se corrige el motor**: sigue congelado y las correcciones van juntas al final.
