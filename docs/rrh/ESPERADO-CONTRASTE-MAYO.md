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

> **⚠ CORRECCIÓN DEL 2026-08-23: con el motor final este bloque sale VACÍO** —el renglón de IR de
> Robayo ya no se genera—, **y en mayo el bloque 1 deja de ser un trámite: es el único detector de
> una cosa que ningún otro bloque ve.**
>
> **Calderón aterriza en neto CERO EXACTO:** `700,00 − 66,15 − 14,04 − 619,81 = 0,00`. Su anticipo
> está puesto para agotarle el neto al céntimo, así que su fila está **en el borde de la protección
> de neto negativo** (pasos 13 y 14). Si el neto saliera `−0,01`, `recortaDescuentos` recortaría un
> céntimo del egreso recortable de mayor `CPNMORDN`, imprimiría un `System.out` y **seguiría sin
> fallar**.
>
> **Y el bloque 2 es CIEGO a eso, que es lo que lo hace peligroso.** El recorte existe justamente
> para llevar el neto a 0,00, que es lo que el rol del cliente también dice — así que `LIQUIDO`
> coincidiría en los dos mundos. Y `DESCUENTOS` también: el recorte compensa exactamente el céntimo
> de más que lo provocó. **Las tres filas del bloque 2 saldrían idénticas y el total seguiría en
> cero.** El recorte no vive en la cabecera: vive un nivel más abajo.
>
> **El detector es UNO, y no es el bloque 2. Los dos no están al mismo nivel** —precisado el
> 2026-08-23 tras corrección del agente de backend, sobre una redacción anterior que los daba por
> independientes y no lo son—:
>
> 1. **El detector de verdad: `BLOQUE 1 VACÍO`.** Vale caiga donde caiga el recorte. Y es directo,
>    no inferencia: `CTRL` de mayo **sí trae las filas por concepto de Calderón** —sueldo 700,00 ·
>    aporte 66,15 · concepto 23 en 14,04 · concepto 25 en **619,81**—, así que cualquier concepto
>    suyo que se desvíe un céntimo sale como fila propia.
> 2. **El subtotal de anticipos en 1 869,81 dice DÓNDE MIRAR PRIMERO, no si pasó.** Descansa en una
>    suposición: que el recortable de mayor `CPNMORDN` sea el anticipo. **Si esa suposición es
>    falsa, el recorte aterriza en otro concepto, el anticipo sigue en 1 869,81 y el subtotal sale
>    limpio con el mes igual de tocado.** El control 6 de `sql/VERIFICACION_POSCALCULO_MAYO.sql`
>    cubre los roles 12, 13 y 14, así que atrapa el recorte si cae en cualquiera de los tres
>    préstamos o el anticipo — pero no es un segundo detector independiente, es el mismo mirado por
>    una rendija. **Qué conceptos son recortables lo dice el control 5 de
>    `sql/VERIFICACION_NOVEDADES_MAYO.sql`, y hasta correrlo la suposición no está comprobada.**
>
> **✅ SUPOSICIÓN COMPROBADA EN PRODUCCIÓN EL 2026-08-23, y sale a favor.** El control 5 leyó
> `CPNMRCRT` y `CPNMORDN` de los cuatro conceptos de Calderón:
>
> | Alterno | Concepto | Orden | Recortable |
> |---|---|---:|:---:|
> | 20 | Aporte personal IESS | 100 | **N** |
> | 23 | Préstamo quirografario IESS | 110 | **N** |
> | 24 | Préstamo hipotecario IESS | 111 | **N** |
> | **25** | **Anticipo de sueldo** | **120** | **S** |
>
> **El anticipo es el único recortable y además el de mayor orden**, así que si el recorte se
> disparara **sólo puede caer ahí**. Tres consecuencias, y conviene tenerlas escritas antes de
> calcular:
>
> - **El subtotal de anticipos SÍ es detector válido en mayo**, y ya no por suposición sino porque
>   la suposición está comprobada. `1 869,81` → `1 869,80` es la firma exacta.
> - **Los dos detectores apuntan a la misma fila**, que es lo mejor que puede pasar sobre un borde:
>   el bloque 1 sacaría el concepto 25 de Calderón y el subtotal bajaría un céntimo. Si sólo saltara
>   uno de los dos, eso ya sería otra cosa y habría que pararse.
> - **El final de la excepción queda descartado.** Hay algo recortable, y el faltante posible —un
>   céntimo o dos— está muy por debajo de los 619,81. El mes no se va a caer por aquí; si algo pasa,
>   pasa en silencio, que es el final que hay que vigilar.
>
> **La lección, que es la de siempre en este módulo:** un control que sólo funciona si una hipótesis
> se cumple no es independiente del control que comparte esa hipótesis. **Leer el bloque 1 primero,
> y el subtotal después, para saber dónde cayó.**
>
> **El precedente dice que el borde se toca sin cruzarse**, y está en la base: en **febrero**
> Calderón cerró igual en líquido cero —ingresos 729,17 / descuentos 729,17, con el par de
> vacaciones metiendo 29,17 por los dos lados y por debajo `66,15 + 14,33 + 619,52 = 700,00`
> exacto—, `CTRL` febrero también traía sus filas por concepto, y **el bloque 1 salió vacío**. La
> rama no se disparó. Mayo repite la configuración con un mes más de anticipo.
>
> **Hay un segundo final, y su ruido es el opuesto:** si **ninguno** de los conceptos fuera
> recortable, el método no encuentra qué recortar y **lanza excepción** — el mes entero se cae
> nombrando a Calderón. Imposible de no ver. **El final ruidoso es el inofensivo; el silencioso es
> el que se cuela en un mes que cuadra.** Y el `System.out` del recorte tampoco es autoridad de que
> ocurriera: en un `@Stateless` se imprime **antes** del commit. Cuál de los dos finales tocaría se
> sabe de antemano con el control 5 de `sql/VERIFICACION_NOVEDADES_MAYO.sql`, que lee `CPNMRCRT`.

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
