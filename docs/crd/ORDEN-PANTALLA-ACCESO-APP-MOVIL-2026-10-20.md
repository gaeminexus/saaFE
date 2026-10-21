# Orden — pantalla de intranet para el acceso a la app móvil (2026-10-20)

> Escrita por el árbitro `omen-app-1-arb` a pedido urgente del usuario: *«crea la opción en
> saa, la necesito urgente»*. Hoy el alta, el reseteo y la reactivación de la cuenta de la app
> de un partícipe solo se pueden hacer con `curl` contra el `.4`. Ese hueco está anotado como
> bloqueante del lanzamiento en `API-USUARIO-APP-MOVIL.md`, sección "Pendiente que bloquea el
> lanzamiento".
>
> **Leer antes:** `API-USUARIO-APP-MOVIL.md`, misma carpeta. Ahí están los 6 endpoints, los
> estados y las reglas de seguridad de `CRD.USAP`. Esta orden no repite ese contenido.

## Qué se pide

Una pantalla en el módulo de **Créditos** del SAA (`saaFE`) donde un empleado de oficina, a
partir de la cédula de un partícipe, pueda:

1. **ver** si el partícipe tiene cuenta en la app y en qué estado (activa, bloqueada, eliminada);
2. **crear** la cuenta si no la tiene;
3. **resetear la clave**, lo que también desbloquea una cuenta bloqueada;
4. **reactivar** una cuenta que el partícipe eliminó desde la app.

Son dos piezas. La A va primero porque la B la consume.

## A — `saaBE`: un GET de consulta del estado (ejecutor: `omen-app-1-saa-be-app`)

```
GET /SaaBE/rest/usap/estado/{identificacion}
  200 → UsuarioAppDTO (el mismo que ya devuelven crear/resetearClave/reactivar)
  404 → {"mensaje": "..."} si la cédula no tiene cuenta en la app
  500 → falla real (estilo de la casa)
```

Reglas, todas obligatorias:

- **Devuelve `UsuarioAppDTO`, nunca la entidad `UsuarioApp`.** Serializar la entidad devuelve
  `claveHash` (seguridad, regla 3 del API). Reusar el `aDTO` que ya existe en `UsuarioAppRest`.
- **No es `getId` ni `getAll`.** Va por identificación, de a uno, sin listar (regla 2 del API).
- La lectura usa `UsuarioAppDaoService.selectByIdentificacion`, que ya existe. `trim()` a la
  cédula, igual que los otros verbos.
- **Solo en `/rest` (intranet).** No se agrega a `MovilApplicationConfig` ni a `/movil`, y el
  borde no lo expone nunca: es un endpoint de oficina, igual que `crear`/`resetearClave`/`reactivar`.
- La línea de traza `System.out.println` al entrar, como el resto de la clase.
- Actualizar `API-USUARIO-APP-MOVIL.md`: la tabla pasa a 7 endpoints, y la nota de "intranet"
  suma este. Quitar o actualizar la sección "Pendiente que bloquea el lanzamiento" cuando la
  pantalla B esté entregada (no antes).
- `mvn -q compile` en exit 0 antes de entregar.

Archivos esperados: `UsuarioAppRest.java`, y `UsuarioAppService`/`UsuarioAppServiceImpl` solo si
hace falta pasar por el Service. Nada más.

## B — `saaFE`: la pantalla (ejecutor: **a definir por el usuario**)

`saaFE` no es ninguno de los tres repositorios de este equipo. Quién lo hace es decisión del
usuario.

### Ubicación

Opción nueva en el menú de Créditos: **«Acceso app móvil»**. Va como componente propio, no metido
en `participe-dash` ni en `entidad-edit`: esas pantallas son de otro equipo y viven en un árbol
compartido. Lo único compartido que se toca es el registro de la ruta y la entrada del menú.

### Flujo

1. Campo **cédula** y botón **Consultar** → `GET usap/estado/{cedula}`.
2. Resultado:
   - **404** → «Este partícipe no tiene acceso a la app». Se habilita **Crear acceso**.
   - **200** → mostrar estado en texto (1 Activa, 2 Bloqueada, 3 Eliminada), `intentosFallidos`,
     `bloqueadoHasta`, `debeCambiarClave` (Sí/No), `fechaUltimoAcceso`, `usuarioRegistro`.
     - Estado 1 o 2 → se habilita **Resetear clave**.
     - Estado 3 → se habilita **solo Reactivar**, con un texto que diga que el partícipe borró
       su cuenta desde la app.
   - Ningún otro botón queda activo: cada estado tiene una sola acción válida, así que la pantalla
     no le deja al empleado elegir la equivocada.
3. Las tres acciones piden una **clave temporal** y llaman a `POST usap/crear`, `usap/resetearClave` o
   `usap/reactivar`, con body `{identificacion, claveTemporal, usuario}`.
4. Al terminar, volver a consultar y mostrar el estado nuevo. Mostrar el mensaje del **400** tal
   cual llega: en estos tres endpoints el backend manda a propósito el texto específico del error.

### Clave temporal: esto es lo que sí importa

La cédula es un dato público en Ecuador, y el backend **no valida qué tan fuerte es la clave
temporal**. La única defensa es la pantalla:

- Botón **Generar**, que arma una clave aleatoria de 8 caracteres legibles (sin `0/O`, ni
  `1/l/I`) con `crypto.getRandomValues`, **no** `Math.random`. Es el camino por defecto.
- Si se escribe a mano: mínimo 8 caracteres, distinta de la cédula, y que no la contenga.
- Se muestra **una vez**, en el resultado, para que el empleado se la entregue al partícipe.
  No se guarda en `localStorage`, ni en el estado de la app, ni se escribe en la consola.
- Recordatorio en pantalla: «Entregue la clave solo al partícipe, en persona. La app le va a
  pedir cambiarla al entrar».

### `usuario`

Es el usuario del SAA que tiene la sesión abierta, sacado igual que lo sacan las demás pantallas de
crd. **Nunca un campo editable.** Queda grabado en `USAPUSAR` como auditoría del cambio de
credencial.

### Fechas

`bloqueadoHasta`, `fechaUltimoAcceso` y `fechaCreacion` llegan como **arreglo Jackson**
(`[2026,10,20,9,30,0]`), no como texto ISO. Ver `CLAUDE.md` de `saaBE`, sección Serialización.

### Lo que NO se hace

- No se lista la tabla `USAP` ni se busca por nombre. Una cédula a la vez.
- No hay botón de "eliminar/desactivar" desde oficina: `desactivar` es del partícipe, desde la app.
- No se toca ningún componente existente de crd, aparte de la ruta y el menú.

## Criterio de entrega

- A: `mvn -q compile` en exit 0, y la lista exacta de archivos.
- B: el build del FE sin errores, y la lista exacta de archivos.
- Prueba contra SaaBE local con una cédula de prueba: consultar (404) → crear → consultar (1)
  → resetear → consultar → login en la app con la temporal → cambio de clave obligatorio. Y una
  cédula en estado 3 que solo deje reactivar.
- **El despliegue en producción lleva redesplegar el WAR de `saaBE` en el `.4`**, y eso para el
  SAA de toda la oficina. Ese WAR arrastra además las entregas que siguen sin despliegue
  registrado (saldos `c9c10b97`, cuotas `05da5655`) y lo que hayan commiteado los equipos de SAA
  desde el último despliegue.
