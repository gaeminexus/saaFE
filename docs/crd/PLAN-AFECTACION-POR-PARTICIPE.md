# La afectación de novedades pasa a organizarse por partícipe

**Fecha:** 2026-09-02 · **Equipo:** CRD / Equipo B · **Estado:** plan aprobado, arranca cuando cierre la carga 449

> **Origen, usuario 2026-09-02:** *«es súper confuso, pareciera como si no se han repartido todos los
> valores. Tal vez la forma de mostrar las novedades en pantalla debería ser mejor, debería agrupar
> por partícipe con todas las afectaciones realizadas en otras secciones»*.
>
> **Y sobre cómo hacerlo:** *«¿crees que sea mejor generar una nueva pantalla en vez de modificar la
> actual? Después cambiamos la pantalla y resulta más confusa»*.

---

## 1. El problema, en una frase

**El dinero es del partícipe y la pantalla está organizada por novedad.** Todo lo que costó esta
jornada sale de ese desajuste de alcance.

La captura que lo mostró: el diálogo decía a la vez **«restante 0,00»** (el partícipe está completo)
y **«32,86 (falta)»** en naranja (a esta novedad le falta). Las dos afirmaciones eran ciertas, en
alcances distintos, y el operador tenía que reconciliarlas de cabeza — con el naranja pesando más
que el texto.

Y no fue sólo confusión: **produjo dinero inventado.** SANCHEZ PRADO tenía dos novedades, y el
checkbox «aplicar todo el sobrante» entregó a cada una **su pozo completo**:

| Novedad | AVPC | Suma |
|---|---|---|
| A | 149 (273,63) + 151 (24,56) | **298,19** ← pozo entero de esa novedad |
| B | 145 (141,40) | **141,40** ← pozo entero de la otra |
| | | **439,59** contra 406,73 disponibles |

---

## 2. Lo que YA se corrigió — y que el rediseño no debe deshacer

⛔ **Leer esto antes de escribir una línea.** Tres defensas ya están puestas y el reemplazo tiene que
conservarlas, no reinventarlas:

1. **El backend valida al procesar** (`438257f`): si las afectaciones de un partícipe superan lo
   descontado, la carga **no aplica nada** y reporta a todos los infractores juntos, con rol, cédula,
   montos y códigos AVPC.
2. **El pozo de la pantalla ya es por partícipe** (`81e28fc`): sale del `restante` de
   `/rest/asgn/topeAfectacion`, y cuando no está confirmado **deshabilita los cuatro controles de
   reparto** en vez de caer al cálculo viejo.
3. **La contradicción visual ya no está**: con el pozo corregido, el diálogo dejó de decir «falta»
   cuando el partícipe está completo.

**Por eso esto dejó de ser urgente.** Lo que queda es que hace falta abrir **dos diálogos para
entender a una persona** — molesto, ya no engañoso. Y eso es precisamente lo que permite hacerlo bien
en vez de rápido.

---

## 3. Qué se reemplaza, y qué no

**No es la pantalla entera.** `detalle-consulta-carga` hace varias cosas y casi todas están bien. El
desajuste vive en **dos piezas**:

| Pieza | Qué pasa |
|---|---|
| El listado de novedades | Se reemplaza: pasa a agruparse por partícipe |
| El diálogo de afectación | Se reemplaza: un partícipe, un pozo, un estado |
| **La pestaña de descuentos, el resumen de la carga, el resto** | **No se tocan** |

---

## 4. La forma

Un partícipe, un pozo, un estado. Las novedades siguen existiendo —son el **motivo** por el que está
en la lista— pero dejan de ser la unidad de trabajo:

```
SANCHEZ PRADO WILLIAN · rol 7508 · CI 2100643721
Descontado 406,73    Afectado 406,73    Restante 0,00    ✓ completo

  MOTIVOS (2 novedades)
    · Monto inconsistente — préstamo 66120
    · Descuento incompleto — préstamo 70577

  DESTINOS
    Préstamo 66120 HIPOTECARIO     265,33
    Préstamo 70577 EMERGENTE         0,00
    Aporte cesantía                141,40
    ─────────────────────────────────────
    Total afectado                 406,73
```

**Un solo «total a cruzar», un solo «saldo pendiente».** Desaparece la contradicción porque
desaparece el segundo alcance.

### La decisión de datos, y es la que evita una migración

Cada afectación se guarda colgada de una novedad (`AVPC.NVPCCDGO`). Al afectar un préstamo, la fila
**sigue colgando de la novedad que corresponde a ese producto o préstamo**.

⛔ **Cambia la presentación, NO el modelo de datos.** Eso mantiene intacta la trazabilidad («esta
afectación resuelve esta novedad»), no obliga a migrar nada de lo ya guardado, y deja el backend sin
cambios. Si en algún destino no hay una novedad obvia de la cual colgar, **parar y avisar** — no
inventar una regla de asignación.

---

## 5. ⛔ Se construye aparte, y después se RETIRA la vieja

**Decisión del usuario, y su instinto de riesgo es correcto:** se construye como pieza nueva sin
tocar la actual. Así el rollback es dejar de usarla, y si con datos reales resulta peor, no se retira
nada y lo único perdido es el trabajo de construirla.

**Pero el retiro no es opcional.** Si quedan las dos conviviendo:

- El operador tiene que saber cuál usar, y **la confusa sigue ahí**.
- Con el tiempo divergen —una recibe un arreglo y la otra no— y el día que den números distintos
  nadie va a saber cuál creer. Esta jornada ya mostró lo que cuesta tener dos versiones de una misma
  regla.

> **No es el caso de la auditoría de bandas.** Ahí conviven dos vistas porque responden **dos
> preguntas distintas** (¿cuánto fue a cada cuenta? / ¿qué pasó con este pago?). Acá es **la misma
> pregunta con otra organización**, y dos organizaciones de lo mismo es una de más.

**Secuencia:** construir → validar con una carga real → retirar la vieja del menú y del código.

---

## 6. Cuándo

**Arranca cuando la carga 449 esté cerrada.** Meterse con la pantalla donde el usuario trabaja
mientras la está usando para procesar en producción es pedir problemas, y no hay nada que lo
justifique ahora que la contradicción se fue.

Orden en la cola del FE: el botón «¿dónde está la diferencia?» primero, esto después.

---

## 7. Verificación

1. Sobre la carga 449 real: abrir a SANCHEZ y ver **una sola** pantalla con sus dos novedades, sus
   dos préstamos, su aporte y **un** total. Hoy hacen falta dos diálogos.
2. Marcar «aplicar todo el sobrante» en un destino: el tope tiene que ser **el restante del
   partícipe**, y los demás destinos ofrecer lo que quede — nunca su propio monto completo.
3. Guardar y reprocesar: las filas `AVPC` tienen que quedar colgadas de **las mismas novedades** que
   hoy. Si cambia el `NVPCCDGO` de una afectación equivalente, el §4 se implementó mal.
4. Un partícipe con **una sola** novedad tiene que verse igual de simple que hoy. Si el rediseño
   complica el caso simple para resolver el complejo, está mal.
5. Con el tope sin confirmar (consulta fallando), los controles de reparto **deshabilitados** — la
   defensa del punto 2 del §2 no se pierde en el reemplazo.

---

## 8. Qué NO se toca

- **El backend.** Esto es presentación: la validación, el endpoint del tope y el modelo quedan igual.
- **La pestaña de descuentos y el resumen de la carga.**
- **`topeRepartoPrestamo` / `aplicarRepartoAutomaticoPrestamo`**: la lógica de reparto sobre las
  cuotas está bien y ya se verificó. Lo único que cambió alguna vez fue de dónde sale el pozo.

---

## 9. Arranca YA, y el retiro pasa a ser una comparación — decisión del usuario, 2026-09-03

> *«Sí, soltá el FE con la pantalla nueva en este momento, para poder comparar en cuál me resulta más
> cómodo procesar las novedades.»*

**Cambia el «cuándo» del §6 y el «cómo se decide» del §5.**

- **Cuándo:** arranca ahora, no al cerrar la carga 449. El riesgo que justificaba esperar era tocar la
  pantalla en uso — y no se toca: se construye aparte. Y comparar **con la carga real abierta** es
  mucho mejor que comparar contra una descripción.
- **Cómo se decide el retiro:** el §5 argumentaba que retirar la vieja no era opcional. **Sigue siendo
  cierto como principio** —dos pantallas para la misma pregunta divergen— **pero la elección de cuál
  sobrevive es del usuario, después de usar las dos con datos reales.** No se retira nada por
  argumento; se retira lo que él decida al comparar.

⛔ **Mientras dure la comparación, la pantalla actual NO se toca ni un poco.** Es la que está usando
para procesar en producción. Cualquier arreglo que aparezca durante la construcción de la nueva se
reporta, no se aplica sobre la vieja.

**Y el criterio de la comparación es el suyo, no el mío:** en cuál le resulta más cómodo procesar. No
en cuál tiene mejor arquitectura ni menos clics. Si la vieja gana, el §5 queda sin efecto y la nueva
se descarta — y eso es un resultado válido, no un fracaso.
