# PROMPT — Agente FRONTEND · Verificación de integración de la pantalla de bandas

> **Etiqueta: FRONTEND** (repo `saaFE`). **Esta NO es la pantalla de Fase 2** — esa no se
> puede construir todavía porque su contrato de API aún no existe (el backend está
> implementando la Fase 2 ahora mismo). Esta tarea cierra la Fase 1 con la verificación que
> quedó pendiente.

---

## Por qué esta tarea

Los JSON del contrato `API-BANDAS-PRODUCTO.md` **no se capturaron de llamadas HTTP reales**:
el backend los construyó a partir de las filas de la BD y de cómo serializa Jackson, porque
el WAR no estaba desplegado (lo dice el propio documento en §0.3). Las estructuras y los
nombres de campo deberían ser exactos, pero **nadie ha visto todavía una sola respuesta real
de estos endpoints**. Ahora el backend ya está desplegado, así que toca comprobarlo.

El punto más frágil es el **formato asimétrico de fechas**: `LocalDate` **sale** como arreglo
`[2026, 9, 1]` y **entra** como string `"2026-09-01"`. El modelo del front ya lo refleja
(`fechaDesde: number[] | null` en salida, `string` en entrada), pero eso hay que verlo
funcionar en un ida y vuelta real, no en el papel.

## Esto NO es una tarea de construcción

La pantalla ya está construida y no hay que volver a escribirla. **No repitas el informe de
construcción de la Fase 1**: si tu respuesta no contiene respuestas HTTP reales capturadas,
la tarea no está hecha.

## Evidencia obligatoria en el informe

Por cada endpoint probado, pega en el informe: la **URL exacta** que llamaste, el **código
de estado**, el **content-type** y el **cuerpo real** de la respuesta (recortado si es
largo, pero literal — no reescrito). Sin eso no se considera verificado. Está permitido y
es recomendable usar `curl` contra `http://localhost:8080/SaaBE/rest/...` además de probar
por la pantalla.

## Requisito previo

El WAR desplegado en WildFly con la Fase 1 de bandas (ya lo está: verificado el 2026-08-25,
`GET /rest/cbpr/listado?idEmpresa=1236` responde 200). Si algún endpoint devuelve 404 o el
servidor no responde, **detente y repórtalo**: no sigas ni "simules" las respuestas.

## Dos hallazgos ya confirmados — arranca por aquí

Estas dos cosas ya se comprobaron llamando a los endpoints. La primera ya está corregida en
la base de desarrollo; la segunda **sigue abierta y es tuya**:

1. **(Corregido) La carga inicial tenía vigencia futura.** `CBPRFCIN` era `2026-09-01`, así
   que hoy no había ninguna configuración vigente: el `listado` devolvía los 15 productos
   con `porVencer: null` y `vencido: null` — la pantalla se veía completamente vacía — y
   `clasificar` fallaba. Se retrotrajo la vigencia a `2020-01-01`
   (`sql/FIX-VIGENCIA-BANDAS.sql`). **Confirma que la pantalla ahora muestra las bandas**;
   si tu código asumía en algún punto que "sin configuración" es el caso normal, revísalo.
2. **(Abierto) La forma del error NO coincide con el contrato.** El contrato dice que los
   errores son `500` con el cuerpo en **texto plano** `"Error ...: mensaje"`, y tu servicio
   extrae texto plano. Pero la respuesta real es `500` con
   `content-type: application/json` y cuerpo `{"mensaje":"Error al clasificar la banda: ..."}`.
   Verificado con `curl`. **Comprueba qué muestra hoy tu pantalla cuando el backend
   rechaza algo** (probablemente el JSON crudo o `[object Object]` en vez del mensaje) y
   **arregla el manejo de errores del servicio** para que extraiga `mensaje` cuando la
   respuesta sea JSON, sin romper el caso de texto plano. Deja constancia para que el
   backend alinee el contrato.

## Qué verificar

### 1. Lecturas (sin riesgo)

Llama de verdad y compara la respuesta con lo que declara el contrato y con las interfaces
del modelo (`bandas-cartera.model.ts`), campo por campo:

- `GET /rest/cbpr/listado?idEmpresa=1236` — deben venir **todos** los productos, incluidos
  los inactivos y los que no tienen configuración (`porVencer` o `vencido` en `null`;
  hoy PRENDARIO NOVACION e HIPOTECARIO NOVACION no tienen la de por vencer).
- `GET /rest/cbpr/vigente` y `GET /rest/bndp/getByConfiguracion/{id}` — aunque la pantalla
  no los llame, verifica que responden y que su forma coincide con el contrato; si no,
  el contrato miente y hay que corregirlo.
- `GET /rest/cbpr/historial`, `GET /rest/cbpr/cuentas?filtro=...`, `GET /rest/cbpr/clasificar`.
- En el `clasificar`, contrasta contra la parametrización cargada: por ejemplo, para un
  producto hipotecario en cartera VENCIDO, 100 días debe caer en la banda 3 (91–270) y
  devolver la cuenta `1.3.12.10`; 800 días, en la banda abierta `1.3.12.25` (>720).

Comprueba especialmente: nombres de campo, nulos, y que los **rangos derivados**
(`diaInicio`, `diaFin`, `etiqueta`) lleguen calculados desde el servidor — el front no debe
calcularlos.

### 2. Escrituras (con cuidado, y anotando lo que cambies)

Vas contra la base de desarrollo, que tiene la carga inicial real (28 configuraciones, 143
bandas). **Limita las pruebas de escritura a UN producto** y anota exactamente qué dejaste
modificado, para que se pueda restaurar:

- `POST /rest/cbpr/guardarConfiguracion` — comprueba el ida y vuelta de fechas: manda
  `"2026-09-01"` y verifica que al releer vuelve como `[2026, 9, 1]` **y que el día es el
  mismo** (si aparece corrido, hay un problema de zona horaria y es exactamente lo que
  estamos buscando). Verifica también que los `idBanda` cambian tras guardar (el backend
  borra e inserta el juego completo) y que la pantalla los relee de la respuesta.
- Validaciones: provoca a propósito los errores (bandas no consecutivas, dos bandas
  "resto", una banda sin cuenta) y comprueba que el mensaje del backend llega y se muestra
  legible al usuario. El backend responde 500 con texto plano `"Error ...: mensaje"`.
- `POST /rest/cbpr/cerrarVigencia` — una sola prueba, sobre ese mismo producto.

### 3. Guard de USUARIO 1

Con el usuario 1 y con otro usuario: que la opción de menú aparezca/desaparezca **y** que la
navegación directa por URL a `/menucreditos/bandas-cartera` quede bloqueada en el segundo
caso.

## Entrega

1. **Corrige lo que esté roto en el front** si la discrepancia es del front.
2. Si la discrepancia es del contrato o del backend (la respuesta real no coincide con lo
   documentado), **no parchees el front para taparlo**: documenta la diferencia exacta
   (endpoint, campo, valor esperado vs recibido) y repórtala — la corrige el backend.
3. Reporta al final: qué endpoints probaste y con qué resultado, qué corregiste, qué dejaste
   modificado en la base de desarrollo, y la lista de discrepancias para el backend.

## Lo que NO debes hacer

- No construyas la pantalla del cierre mensual de cartera (Fase 2): su contrato no existe
  todavía. Cuando el backend lo publique, se te dará el prompt correspondiente.
- No inventes ni asumas respuestas de endpoints que no puedas llamar de verdad.
