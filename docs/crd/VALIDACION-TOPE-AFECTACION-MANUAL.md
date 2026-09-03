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
