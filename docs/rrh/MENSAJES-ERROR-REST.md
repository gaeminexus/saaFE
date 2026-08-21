# Los mensajes de error del backend y cómo llegan a la pantalla

**Fecha:** 2026-08-20 · **Alcance:** todos los módulos · **Estado:** corregido, pendiente de recompilar

## El defecto

Todos los métodos de `com.saa.ws.rest` devuelven sus errores con el mismo patrón:

```java
return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
        .entity("Error al calcular la nomina: " + e.getMessage())
        .type(MediaType.APPLICATION_JSON).build();
```

El cuerpo es **texto plano sin comillas** y el tipo declarado es **JSON**. Angular, que confía en
el `Content-Type`, intenta parsearlo, falla, y deja el mensaje real enterrado en la propiedad
`text` del `HttpErrorResponse`. En pantalla queda el genérico del componente y **el motivo se
pierde**.

No era un caso aislado: el patrón está en cada método de cada clase REST, así que **ningún
mensaje de error del backend llegaba a ninguna pantalla, de ningún módulo**. Lo encontró el
frontend probando la guarda del empleado sin cuenta bancaria de la fase 6 de RRHH — un mensaje
que nombra a la persona y dice qué hacer, y que no se veía nunca.

No es cosmético. Bloqueaba la calibración de ASOPREP: al comparar seis meses renglón por renglón,
un mes que falla habría dicho «No se pudo calcular» sin decir por qué.

## La corrección

`com.saa.ws.rest.MensajeErrorJsonFilter`, un `ContainerResponseFilter` con `@Provider`. Envuelve
el cuerpo en `{"mensaje": "..."}` cuando se cumplen **las tres condiciones a la vez**:

1. el estado es **400 o superior**,
2. la entidad es un **`String`**,
3. el tipo declarado es **JSON**.

Una clase repara todos los módulos a la vez, no puede olvidarse ningún método, y el código nuevo
lo hereda sin que nadie tenga que acordarse. `ApplicationConfig` no enumera clases, así que el
contenedor descubre el `@Provider` solo.

**El envoltorio lo serializa el proveedor de JSON**, no una concatenación de cadenas: el filtro
pone un `Map` como entidad. Los mensajes de este sistema llevan comillas y saltos de línea
—`aprobarPeriodo` construye uno de varias líneas, con una divergencia por renglón— y armar el
JSON a mano habría producido un cuerpo inválido justo en el mensaje más largo.

**El contrato pretendido siempre fue ése.** Los manejadores que el frontend ya tenía escritos
leen `error?.mensaje` primero; lo que faltaba era honrarlo. Por eso la corrección no pide ningún
cambio en el frontend para funcionar.

## Lo que el filtro NO toca, y por qué importa

- **`TEXT_PLAIN` declarado.** `UsuarioRest.validaUsuario`, `cambiaClave` y `verificaPermiso`
  devuelven texto a propósito y el frontend los pide con `responseType: 'text'`. El filtro los
  deja intactos: es el camino de login y no se puede romper.
- **Cuerpos que ya son JSON.** Si el texto empieza por `{` o `[` no se envuelve, para no esconder
  el mensaje un nivel más abajo. Es el caso de `ReporteServiceImpl`, que ya devuelve
  `{"exito":false,"mensaje":"..."}`.
- **Respuestas correctas.** Solo actúa de 400 para arriba.

## El barrido previo: quién ve cambiar el cuerpo del error

Se barrió el frontend por llamadas con `responseType: 'text'` o `'blob'`, que son las que reciben
el cuerpo del error sin parsear y podrían notar el cambio.

**`blob` — cuatro llamadas, ninguna afectada negativamente:**

| Llamada | Qué pasa |
|---|---|
| `jasper-reportes.service.generar` | El cuerpo ya era JSON; el filtro no lo toca |
| `rrh/orden-pago-nomina.archivoBancario` | `mensajeDeBlob` intenta `JSON.parse` y cae a texto crudo: **funciona igual antes y después** |
| `crd/generacion-archivo-petro` | Igual patrón |
| `shared/file.service` | Descarga de adjuntos |

`modules/rrh/forms/procesos/descarga-reporte.ts` **mejora**: su `textoDeJson` devuelve `null`
ante un cuerpo que no es JSON y cae al genérico, así que un error de texto plano hoy se pierde y
tras el filtro se muestra.

**`text` — nueve llamadas, y aquí está el único efecto visible:**

- Las tres de `usuario.service` van contra endpoints `TEXT_PLAIN`: **no cambian**.
- `cnt/periodo.service.delete` y `cnt/naturaleza-cuenta.service.delete`: el componente hace
  `error?.error || error?.message || generico` sobre un valor que **ya es una cadena**, de modo
  que hoy cae al genérico y seguirá cayendo. **No cambian.**
- **`tsr/conciliacion-contable.service` — `deshacer`, `verificar`, `cerrarMes` y `reabrirMes`.**
  Piden `text` contra endpoints que declaran JSON, y `conciliacion-contable.component.ts`
  —líneas 237, 262, 657 y 675— muestra `${error?.error || error?.message || error}`, que con una
  cadena cae al tercer término y **hoy sí enseña el texto crudo**. Tras el filtro esas cuatro
  cajas mostrarían `{"mensaje":"..."}` con las llaves a la vista.

**El mensaje no se pierde en ningún caso**, solo se ve envuelto en esa pantalla. El arreglo es de
una línea en el frontend —parsear el JSON, o pedir la respuesta como JSON en vez de `text`— y es
la única pantalla del sistema donde el filtro empeora algo temporalmente. Queda avisado al
frontend.

## Orden de publicación — decidido el 2026-08-20

El barrido encontró **una** pantalla que empeora: las cuatro cajas de
`tsr/conciliacion-contable` piden `responseType: 'text'` contra endpoints que declaran JSON y hoy
muestran el texto crudo; tras el filtro mostrarían `{"mensaje":"..."}` con las llaves a la vista.

**El filtro no se publica hasta que el frontend esté alineado**, y el saldo abrumador a favor no
cambia eso: enseñarle JSON en bruto a un usuario de tesorería es un defecto que estaríamos
introduciendo a sabiendas, y el arreglo es de una línea. «Lo sabíamos y lo publicamos igual» no
es un precedente que convenga sentar.

**El orden que no deja hueco** —y que vale para cualquier consumidor futuro:

1. **Primero el cliente, y tolerante a los dos mundos.** Ante un cuerpo de error, intentar
   interpretarlo como JSON y quedarse con `mensaje`; si no parsea, mostrar el texto crudo. Así
   funciona antes y después del filtro, y se puede desplegar sin coordinar.
2. **Después el filtro.**

La misma precedencia rige en RRHH para `forms/comunes/mensajes.ts`: `mensaje` del cuerpo → texto
crudo → `message` de Angular → genérico.

**Una comprobación que falta**, barata: que ningún camino de error devuelva hoy un `String` que ya
sea JSON válido. La condición del filtro es «entidad `String`», así que ese caso quedaría
envuelto dos veces. Es improbable en este código —los mensajes son prosa— pero se confirma con
un vistazo antes de publicar.

## Para recompilar

`MensajeErrorJsonFilter` (clase nueva). Ningún método REST cambia, ningún script SQL.
