# Contrato: procesar la carga Petro/ARCH con el usuario que pulsa «Procesar» (B6-b)

**omen-saa-1-arb, 2026-11-01.** Decisión del usuario: los asientos y pagos de una carga quedan a nombre de
**quien pulsa «Procesar»**, no de quien cargó el archivo (B6-a, `0f0757e9`, usaba `usuarioCarga`).
Regla transversal del usuario: **sin usuario no se graba nada**; el proceso valida el usuario lo primero
(ver `saaBE/docs/logica-negocio/cnt/DISENO-USUARIO-OBLIGATORIO.md`).

## Endpoint (cambia)
```
POST /SaaBE/rest/asgn/aplicarPagosArchivoPetro/{idCargaArchivo}?usuario=<nombre del usuario de sesión>
```
- `usuario` (query param, **obligatorio**): el mismo nombre de usuario que el FE usa en el resto de las
  grabaciones (`usuarioSesion()` desde F1, `6e4e92d`). Se envía con `encodeURIComponent`.
- Sin cuerpo, como hoy.

## Respuestas
| Caso | HTTP | Cuerpo |
|---|---|---|
| OK | 200 | el resumen de texto de hoy, sin cambios |
| `usuario` falta, vacío o no corresponde a un usuario activo del sistema | **400** | `"No se puede procesar la carga sin un usuario válido: <motivo>"`. **No se procesa nada.** |
| Cualquier otro error | 500 | como hoy |

## Frontend
- `servicios-asoprep.service.ts` → `aplicarPagosArchivoPetro(idCargaArchivo, usuario)` agrega el query param.
- `carga-aporte-back.component.ts` (~736) pasa `usuarioSesion()`. Si no hay usuario, F1 ya cierra la
  sesión antes de llegar acá; el componente no rellena con nada.
- Un 400 se muestra con el texto del servidor, como los demás errores de la pantalla.

## Despliegue
**BE y FE van en el MISMO EAR.** Un FE viejo contra un BE nuevo recibe 400 al procesar (no manda
`usuario`); un FE nuevo contra un BE viejo funciona (el BE viejo ignora el parámetro).
