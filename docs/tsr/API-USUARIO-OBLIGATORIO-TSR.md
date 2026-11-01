# Contrato: usuario obligatorio en tsr (U-4)

**omen-saa-1-arb, 2026-11-01.** Misma regla que los contratos de crd, cxc y cxp: el BE valida LO PRIMERO que el
usuario exista en `SCP.PJRQ` (por id o por nombre); si no, **400** con el texto del servidor y no graba nada.
Módulo del **equipo 2** (abajo); el aviso está en `saaBE/docs/equipos/saa-1.md`.

**Regla del FE:** id = `idUsuarioSesionObligatorio()` / `getIdUsuarioObligatorio()`; nombre = `usuarioSesion()`.
**Nunca** `0`, `null`, `''` ni `getUsuarioLog()?.nombre || ''`. En el servicio.

## 1. `idUsuario` obligatorio y existente
- **Ingresos y egresos:** `/ingr/procesar`, `/ingr/anular/{id}`, `/egrs/procesar`, `/egrs/anular/{id}`.
- **Caja chica:** `/mvch/gasto`, `/mvch/reposicion`, `/mvch/apertura`, `/mvch/anular/{id}`; `/crch/preparar`,
  `/crch/confirmar/{id}`, `/crch/anular/{id}`; `/cjch/registrar`, `/cjch/anular/{id}`, `/cjch/activar/{id}`.
- **Cheques y chequeras:** `/dtch/anular/{id}`, `/dtch/imprimir`, `/dtch/entregar`; `/chqr/registrarRecepcion`,
  `/chqr/anular/{id}`.
(F9 ya pasó varios componentes a `getIdUsuarioObligatorio()`: confirmar que el servicio lo pone siempre.)

## 2. Conciliación: `usuario` (nombre) obligatorio y existente
`/cnct/conciliar`, `/cnct/deshacer/{id}`, `/cnct/verificar/{id}`, `/cnct/cerrarMes/{e}/{p}`
(cuerpo `SolicitudUsuario.usuario`). Hoy el FE manda `usuarioService.getUsuarioLog()?.nombre || ''`: debe
usar `usuarioSesion()`. `/cnct/transito/*` sin cambio.

## 3. Efecto en cadena
Egreso, reposición, apertura de caja chica y anticipo de empleado pagan por la bandeja de Tesorería
(pago programado), que desde U-3 exige un id real.

**BE y FE van en el MISMO EAR.**
