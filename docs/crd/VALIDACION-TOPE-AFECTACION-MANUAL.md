# La afectación manual puede inventar dinero — validación del tope

**Fecha:** 2026-09-02 · **Equipo:** CRD / Equipo B · **Estado:** decisión tomada, pendiente de implementar

---

## 1. El caso que lo destapó, con la aritmética completa

Carga 449. El asiento de aplicación repartió **$354.603,67** cuando el archivo descontó
**$354.491,37**: **$112,30 aplicados que nadie descontó**. El asiento cuadra consigo mismo, así que
sólo se ve comparándolo contra el reparto.

Localizado en un partícipe: **SANCHEZ PRADO WILLIAN (rol 7508)**.

| Lo que el archivo le descontó al préstamo 6782 | |
|---|---|
| PH | 282,77 |
| HS | 15,42 |
| **Total disponible** | **298,19** |

| Lo que las afectaciones manuales le asignaron | Valor | Se aplicó como |
|---|---|---|
| AVPC 145 | 141,40 | un pago de 141,40 |
| AVPC 149 | 273,63 | 141,40 + 132,23 (cascada sobre dos cuotas) |
| AVPC 151 | 24,56 | un pago de 24,56 |
| **Total** | **439,59** | **439,59** ✓ |

**439,59 − 298,19 = 141,40.** Ese es el número, y explica los $112,30 netos una vez compensado con
los cuatro partícipes a los que se les aplicó de menos.

> **Lo que NO es**, y conviene descartarlo por escrito: los dos pagos de `141,40` **no son un
> duplicado**. Uno sale del AVPC 145 y el otro es la primera mitad de la cascada del AVPC 149. El
> motor aplicó exactamente lo que se le pidió. **El defecto está antes: en lo que se le pidió.**

---

## 2. El defecto

**Nada valida que la suma de las afectaciones manuales de un partícipe no supere lo que se le
descontó.** El operador digita un valor, el sistema lo aplica, y el dinero aparece de la nada.

Es el reflejo exacto del defecto que se corrigió esta misma jornada —el excedente que se descartaba
en silencio— pero en la dirección contraria: **en vez de perder dinero, lo inventa**. Y es peor,
porque perder dinero deja una cuenta corta y esto **descuadra la contabilidad sin que nada avise**.

---

## 3. La regla — decisión del usuario, 2026-09-02

> *«El tope es por partícipe, ya que dentro de un partícipe puede mover los saldos entre préstamos o
> aportes como el agente desee.»*

**Tope = la suma de TODO lo descontado a ese partícipe en esa carga**, cualquiera sea el producto.

- Mover plata **entre** préstamos y aportes del mismo partícipe: **permitido**. Es lo que el operador
  ya hace legítimamente — en esta misma carga, SARMIENTO tuvo $52,26 descontados como préstamo y
  aplicados a un aporte, y eso está bien.
- **Exceder el total del partícipe: prohibido.** No hay reclasificación que justifique aplicar más de
  lo que entró.

Lo que se compara:

| | |
|---|---|
| **Disponible** | `SUM(PXCA.PXCADSDO)` del partícipe en esa carga, **todos los productos** |
| **Afectado** | `SUM(AVPC.AVPCVAFA)` de ese partícipe para esa carga |
| **Regla** | `Afectado <= Disponible` (con tolerancia de un centavo) |

---

## 4. Dónde va, y por qué ahí

⛔ **Antes de aplicar nada, y evaluando a TODOS los partícipes en una sola pasada.**

- **No en la pantalla de afectación.** Las afectaciones se cargan de a una y el tope es la **suma**:
  cada una puede ser válida por separado y el conjunto no serlo. Una advertencia en pantalla es un
  agregado bienvenido, pero **no es la validación**.
- **No durante la aplicación.** Fallar en el partícipe 800 de 2.500 revierte un proceso de 20+
  minutos y no dice cuántos más había.
- **Todas las violaciones juntas, en un solo reporte.** Misma lección que los productos sin
  configuración del G48: fallar en el primero obliga a corregir, reprocesar, fallar en el segundo, y
  así. Inaceptable en un proceso de esta duración.

**Forma de reportar:** novedad **bloqueante** por partícipe, para que aparezca en la pantalla de
afectación —que es donde se corrige— con el disponible, el afectado y el exceso. El proceso no
continúa mientras haya alguna.

El mensaje debe traer: rol Petro, cédula, nombre, disponible, afectado, exceso, y los códigos AVPC
involucrados. **Sin eso hay que escribir un SELECT para saber a quién le pasó**, y un mensaje así
está a medio hacer.

---

## 5. Qué NO se toca

- **El motor de pagos.** Aplicó correctamente lo que se le pidió; el defecto es aguas arriba.
- **La cascada.** Que un AVPC de 273,63 se reparta en dos cuotas es el comportamiento correcto.
- **La reclasificación entre productos.** Es legítima por decisión del usuario.

---

## 6. Verificación

1. `mvn -q compile`.
2. Con los datos actuales de la carga 449, la validación debe señalar **al rol 7508** con
   disponible 298,19 (o 406,73 si se cuenta también su AH) y afectado 439,59.
3. Un partícipe que reclasifica entre productos **sin exceder su total** debe pasar sin novedad — el
   caso SARMIENTO. Si lo bloquea, la regla quedó implementada como «por producto» y está mal.
4. Reprocesada la carga sin violaciones: el asiento de aplicación debe cuadrar contra el de reparto.
   **Ese es el resultado que importa**, no la validación en sí.

---

## 7. Pendiente de decisión del usuario

**Los $141,40 ya aplicados a SANCHEZ PRADO.** Es dinero real acreditado a su préstamo que él no
pagó. Las dos salidas son reversarlos, o dejarlos y ajustarlos contra su próximo descuento. **No se
decide desde acá.**

---

## 8. El control de pantalla — una sola fuente de verdad

**Decisión, 2026-09-02.** La pantalla de afectación debe mostrar el tope **por partícipe** mientras
el operador trabaja, en vez de que se entere recién al procesar. Pero **no reimplementando la regla
en el frontend.**

### Lo que se descartó, y por qué

El agente FE verificó que puede calcular el **disponible** sin ninguna consulta nueva
(`registrosParticipesCarga` ya trae todas las filas `ParticipeXCargaArchivo` de la carga, con
`codigoPetro` y `totalDescontado`). Lo que le falta es el **afectado por partícipe**: hoy la pantalla
sólo carga las afectaciones de la novedad que se abre, nunca del partícipe.

Había un camino client-side —encadenar `NovedadParticipeCarga.selectByCriteria` por `codigoPetro` y
después `AfectacionValoresParticipeCarga.selectByCriteria` con un OR-chain de esos códigos— y **se
descarta a propósito**, por dos razones:

1. **Es una cadena de dos consultas nunca probada contra el servidor real, en un control financiero.**
   Si falla en silencio (paginación, un campo que no resulta ser de un solo nivel), el operador ve un
   disponible que no es el real **en la misma pantalla que originó el problema**.
2. **Duplicaría la regla.** El backend ya la calcula en `validarTopeAfectacionManualPorParticipe`
   (`438257f`). Dos implementaciones de una regla financiera divergen, y el día que difieran nadie va
   a saber cuál manda.

### Lo que se hace

Un endpoint **de sólo lectura** que devuelva el tope ya calculado, **reusando el mismo método** que
la validación —no una copia—:

```
GET /rest/asgn/topeAfectacion?idCarga=449&codigoPetro=7508

{ "codigoPetro": 7508, "disponible": 406.73, "afectado": 439.59,
  "exceso": 32.86, "restante": 0.00 }
```

- `disponible`: suma de `PXCA.PXCADSDO` del partícipe en esa carga, **todos los productos**.
- `afectado`: suma de `AVPC.AVPCVAFA` de **todas** sus novedades en esa carga.
- `restante`: `max(0, disponible − afectado)` — es lo que la pantalla muestra como tope.
- `exceso`: `max(0, afectado − disponible)` — mayor a cero significa que ya se pasó.

⛔ **El endpoint no valida ni bloquea: informa.** La validación que impide aplicar sigue siendo la
del proceso (§4). La pantalla es prevención, **no la última línea de defensa** — y no puede serlo,
porque el tope se arma entre varias pantallas, varias sesiones y potencialmente varios operadores.

### Lo que el FE verificó y queda descartado

El disponible **sí** descuenta lo ya guardado al reabrir el diálogo: `cargarContextoAfectacionFinanciera()`
corre en `afterOpened()` y después de cada guardado, y todas sus ramas terminan releyendo las
afectaciones persistidas de esa novedad. **Dentro de una novedad el control es sólido.** El agujero
es, y siempre fue, que el tope nunca fue del partícipe.

**Path publicado (2026-09-02, commit `998fd91`):** `GET /rest/asgn/topeAfectacion?idCarga=&codigoPetro=`
— en `AsoprepGenerales`, junto a `/valoresSinDestino`. La fórmula `excesoYRestante` quedó extraída y
**compartida** con `validarTopeAfectacionManualPorParticipe`: una sola regla, dos consumidores.

---

## 9. El prevuelo: ver el descuadre ANTES de procesar

> **Usuario, 2026-09-02:** *«la idea es poder encontrar también la diferencia al momento de aplicar
> los ajustes, para revisar el error antes de que se genere»*.

Tiene razón, y hoy hay un hueco de tiempo: **la auditoría de bandas dice qué pasó; la validación dice
que no se puede procesar.** Ninguna de las dos ayuda mientras el operador está repartiendo, que es el
único momento en que puede corregir barato.

### Lo que lo hace fácil: el dato ya existe antes de aplicar nada

| | |
|---|---|
| Descontado | `CRD.PXCA` — viene del archivo |
| Afectado | `CRD.AVPC` — lo que el operador ya guardó |

**No hace falta procesar para saber quién va a quedar descuadrado.** Es exactamente el cálculo de
`validarTopeAfectacionManualPorParticipe`, que hoy sólo se ejecuta al procesar y sólo se ve cuando
falla — después de que el operador esperó.

### Qué se agrega

Un endpoint de sólo lectura que corra **la misma** validación en seco, sobre toda la carga:

```
GET /rest/asgn/prevueloAfectacion?idCarga=449

{ "idCarga": 449, "participesConExceso": 3, "excesoTotal": 141.40,
  "detalle": [ { "codigoPetro": 7508, "cedula": "...", "participe": "...",
                 "disponible": 406.73, "afectado": 439.59, "exceso": 32.86,
                 "avpc": [145, 149, 151] } ] }
```

⛔ **Reusando el mismo método, no una copia.** Es la tercera vez que aparece esta necesidad —la
validación, el tope por partícipe y ahora esto— y las tres tienen que dar el mismo número siempre. Si
alguna vez difieren, nadie va a saber cuál creer.

Y en la pantalla de Gestión de Novedades, un botón **«Verificar antes de procesar»** que lo llame y
muestre la lista. Sin bloquear nada: el operador decide si corrige o procesa igual — la que impide
aplicar sigue siendo la validación del proceso.

### Qué NO cubre, y hay que decirlo

Sólo ve el **exceso de afectaciones manuales**. La hipótesis abierta —que el flujo **automático**
aplica encima del tope manual— **no la detecta**, porque lo automático todavía no ocurrió.

Cerrar eso exige proyectar también lo que el automático va a aplicar, y eso **no se diseña hasta
tener medido** si la hipótesis es cierta (ver el botón «¿dónde está la diferencia?» de la auditoría).
**Un prevuelo que diga «todo bien» y después descuadre sería peor que no tenerlo**, así que el panel
tiene que decir explícitamente qué alcance verifica.

### Y esto no reemplaza al botón de la auditoría

Son dos preguntas distintas, en dos momentos distintos:

| | Cuándo | Qué contesta |
|---|---|---|
| **Prevuelo** (Gestión de Novedades) | antes de procesar | ¿lo que cargué va a descuadrar? |
| **«¿Dónde está la diferencia?»** (Auditoría) | después de procesar | ¿por qué descuadró? |

### Nota para el rediseño

Cuando la afectación pase a organizarse por partícipe
(`PLAN-AFECTACION-POR-PARTICIPE.md`), este panel es candidato natural a integrarse ahí, y **desde la
carga debería poder saltarse a su auditoría** — el usuario buscó el botón de la diferencia en la
pantalla de novedades, que es donde le resultaba natural encontrarlo.

---

## 10. ⛔ La regla del §3 estaba MAL. Corregida con datos, 2026-09-03

**La hipótesis quedó probada por la pantalla, sin un solo SQL** — el botón «¿dónde está la
diferencia?» la mostró en una fila:

| SANCHEZ PRADO · rol 7508 | |
|---|---|
| Descontado | 406,73 |
| **Aplicado MANUAL** | **406,73** ← consumió el tope entero |
| **Aplicado AUTOMÁTICO** | **57,79** (préstamo) **+ 50,75** (aporte) |
| Diferencia | **+108,54** |

`57,79 + 50,75 = 108,54`, exacto.

### Por qué la regla del §3 fallaba

Su descuento fue **PH 282,77 + HS 15,42 + PE 57,79 + AH 50,75 = 406,73**, y la novedad bloqueante era
**sólo del PH**. Entonces el operador tenía en sus manos **298,19** (PH + HS): el PE y el AH los iba a
aplicar el proceso automático, porque no estaban bloqueados.

Pero el tope se puso en **406,73** —el total del partícipe— así que lo dejó afectar plata que el
automático ya tenía asignada. **`406,73 − 298,19 = 108,54`.**

> **La regla no era falsa, era incompleta.** «El tope es por partícipe» sigue siendo cierto en lo que
> el usuario decidió —se puede mover entre préstamos y aportes— pero el universo no es *todo* lo
> descontado: es **lo que el operador está repartiendo de verdad**.

### La regla corregida

**Tope manual = lo descontado en los productos que tienen novedad bloqueante.**

Equivalentemente: `total descontado − lo que el flujo automático va a aplicar`. El automático aplica
los productos **sin** novedad bloqueante, y esa plata no está disponible para afectar a mano.

Se conserva intacto lo que el usuario decidió: **dentro de ese universo puede mover entre préstamos y
aportes como quiera**. Lo que deja de poder es tomar plata que ya tiene destino.

### ⛔ Los tres consumidores se corrigen juntos

La validación que bloquea, el tope por partícipe de la pantalla (§8) y el prevuelo (§9) comparten un
solo método **a propósito**. Cambia ahí, y los tres cambian. **Si alguno queda con la regla vieja,
van a discrepar y nadie va a saber cuál creer.**

### Verificación

1. Con los datos de la 449: el rol 7508 debe pasar a tope **298,19**, no 406,73 — y sus afectaciones
   actuales (406,73) deben dar **exceso 108,54**.
2. Un partícipe que mueve entre productos **dentro de lo bloqueado** debe seguir pasando sin novedad.
   Si lo bloquea, la regla quedó implementada como «por producto» y está mal, igual que antes.
3. Reprocesada sin violaciones, el cuadre de la auditoría debe dar **0** — no 79,44.

---

## 12. El dinero sin destino se vuelve novedad bloqueante — decisión del usuario, 2026-09-03

> *«Si hay dinero no repartido, debe decir exactamente qué dinero no se ha repartido y permitirle al
> usuario repartir ese dinero dentro del partícipe que tenga el sobrante. Se supone que para eso
> creamos todos los controles.»*

### El hueco que cierra

Hoy, cuando el devengo de aportes no puede aplicar todo lo recibido —el partícipe no tiene vigencia
que cubra ese mes, o la tiene en $0— el proceso **deja el sobrante sin aplicar con una advertencia**.
Se decidió así para no abortar una carga de 2.500 personas por un jubilado al que Petro le siguió
descontando.

Pero eso choca de frente con la regla del propio usuario —*todo el dinero recibido se debe
repartir*— y es la mitad negativa del descuadre de la carga 449: cuatro partícipes con **−29,09**
entre todos.

### La decisión

**El sobrante genera una novedad BLOQUEANTE**, con el monto exacto que quedó sin aplicar y el
partícipe al que pertenece. Ni advertencia silenciosa ni bloqueo mudo: **bloqueo accionable**.

### ⛔ Lo que hace que esto no requiera nada nuevo

Las piezas ya existen y encajan solas:

1. La novedad bloqueante **aparece en la pantalla de afectación**, que es donde se reparte.
2. Por la regla corregida del §10, el tope manual es *«lo descontado en los productos **con novedad
   bloqueante**»* — así que **ese sobrante pasa automáticamente a estar disponible** para afectar.
3. El operador lo reparte **dentro del partícipe**, entre sus préstamos y aportes, con el pozo ya
   calculado y topado.
4. El cuadre final del §11 deja de fallar, porque ya no queda dinero sin destino.

**No hace falta un mecanismo nuevo. Hacía falta conectar los que ya están.**

### Simetría, que es la razón de fondo

Cuando el dinero se aplicaba **de más**, se decidió que bloquee. Que **de menos** sólo advirtiera era
la asimetría que dejó el hueco abierto — y es exactamente por donde se coló la mitad del descuadre.
Ahora las dos direcciones se tratan igual: **si no cuadra, no procesa, y el operador tiene dónde
arreglarlo.**

### Cuidados

- **El monto de la novedad tiene que ser el sobrante exacto**, no el total del producto: es lo que
  define el pozo que verá el operador.
- **No duplicar**: si ese producto ya tiene una novedad bloqueante, el sobrante forma parte de ese
  pozo, no de uno nuevo.
- **El mensaje tiene que decir por qué sobró** —sin vigencia que cubra el mes, vigencia en $0— o el
  operador va a repartirlo sin entender qué pasó, y el mes que viene va a pasar lo mismo.
- El caso de **contrato inexistente sigue abortando** como hoy: ahí falta un dato, no sobra plata.
