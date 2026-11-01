# Contrato: usuario obligatorio en cxc (U-3)

**omen-saa-1-arb, 2026-11-01.** Misma regla que `docs/crd/API-USUARIO-OBLIGATORIO-U2.md`: el BE valida LO
PRIMERO que el usuario exista en `SCP.PJRQ` (por nombre, o por id cuando el endpoint recibe `idUsuario`); si
no, responde **400** con el texto del servidor y no graba nada. Backend: saaBE `U-3 cxc`. Este módulo es
del **equipo 2**, hoy abajo: el aviso está en `saaBE/docs/equipos/saa-1.md`.

**Regla del FE:** nombre = `usuarioSesion()`; id = el id real del usuario de sesión. **Nunca** `'sistema'`,
`''`, `0` ni `null`. Lo resuelve el servicio, no cada pantalla.

## 1. Campo NUEVO obligatorio en el cuerpo
| Endpoint | Cuerpo |
|---|---|
| `POST /rest/fctr/reintentarAutorizacion` | `{ idFactura, usuario }` (antes solo `idFactura`) — la recepción del SRI queda a nombre de quien la ejecuta |
| `POST /rest/antc/confirmar` | `{ idAnticipo, usuario }` (hoy el FE manda solo `idAnticipo`) |

## 2. `idUsuario` obligatorio y debe existir
- `POST /rest/antc/anular/{id}` y `POST /rest/antc/solicitarDevolucion`.
- `POST /rest/aplc/cobroTransferencia`, `/aplc/anticipo`, `/aplc/anticipos`, `/aplc/revertir/{id}`.
- **`app-state.service.ts` → `getIdUsuario()` hoy devuelve `0` sin sesión** (`|| 0`): debe devolver `null`
  y que el llamador no envíe (F1 ya cierra la sesión). Ese `0` produce hoy un 400.

## 3. `usuario` (nombre) debe existir — quitar rellenos `'sistema'`
- `POST /rest/fctr/anular`, `/ntcr/anular`, `/ntdb/anular`, `/rtnc/anular`, `/rtv2/anular`, `/lqcs/anular`.
- Rellenos a quitar: `consulta-facturas.component.ts:52-54` y `consulta-documentos-electronicos.component.ts:102-104`.
- `idUsuario` es obligatorio solo con `anularEnCascada = true`.

## 4. Sin cambio de firma, pero el usuario debe existir
`procesarCompleta` de los 6 documentos (`documento.usuario`) y `antc/procesar`.

**BE y FE van en el MISMO EAR.**
