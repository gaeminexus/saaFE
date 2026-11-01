# Contrato: usuario obligatorio en rhh (U-4)

**omen-saa-1-arb, 2026-11-01.** Misma regla que los contratos de crd, cxc, cxp y tsr: el BE valida LO PRIMERO que el
usuario exista en `SCP.PJRQ`; si no, **400** con el texto del servidor y no graba. Módulo del **equipo 3** (abajo);
aviso en `saaBE/docs/equipos/saa-1.md`.

**Regla del FE:** id = `idUsuarioSesionObligatorio()`; nombre = `usuarioSesion()`. Nunca `0`, `null`, `''`. En el servicio.

## 1. NUEVO
| Endpoint | Nota |
|---|---|
| `POST /rest/lqex/sincronizarPago/{id}?usuario=` | **Cambio de comportamiento:** `GET /lqex/getAll` y `POST /lqex/selectByCriteria` YA NO sincronizan con Tesorería ni generan asientos. La lista ya no pasa sola una liquidación EN_TESORERIA a PAGADA ni la devuelve a REGISTRADA si el pago se rechaza o anula. El FE llama a este endpoint con un botón **«Actualizar estado»** por fila (y, si conviene, al abrir el detalle de una liquidación EN_TESORERIA). El asiento del pago queda a nombre de este usuario. |
| `POST /rest/prdn/simular` | El cuerpo gana `usuario` (obligatorio): la simulación puede crear la proyección de renta del empleado. |

## 2. `idUsuario` obligatorio y existente
`/ante/solicitar`, `/ante/aprobar/{id}`, `/ante/anular/{id}`; `/rdpg/generar`, `/rdpg/confirmar/{id}`, reenviar;
`/lqex/enviarATesoreria/{id}`, `/lqex/anular/{id}`; `/odbs/enviarATesoreria/{id}`; `/plis/registrar`, `/plis/conciliar/{id}`,
`/plis/anular/{id}`, `/plis/pagar/{id}`, `/plis/reversarPago/{id}`. (F9 ya pasó los componentes a `getIdUsuarioObligatorio()`:
asegurar que el SERVICIO lo ponga siempre.)

## 3. `usuario`/`usuarioRegistro` (nombre) obligatorio y existente
Todo el resto de procesos rhh (nómina, liquidación de haberes, órdenes, beneficios sociales, novedades IESS, etc.). El FE
rrh ya manda `usuarioSesion()`: confirmar en los servicios, sin cambio esperado.

**BE y FE van en el MISMO EAR.**
