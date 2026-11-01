# Contrato: usuario obligatorio en cxp (U-3)

**omen-saa-1-arb, 2026-11-01.** Misma regla que `docs/crd/API-USUARIO-OBLIGATORIO-U2.md` y
`docs/cxc/API-USUARIO-OBLIGATORIO-CXC.md`: el BE valida LO PRIMERO que el usuario exista en `SCP.PJRQ`
(por nombre, o por id si el endpoint recibe `idUsuario`). Si no, **400** con el texto del servidor y no graba.
Backend: saaBE `97788193`. Módulo del **equipo 2** (abajo); el aviso está en `saaBE/docs/equipos/saa-1.md`.

**Regla del FE:** nombre = `usuarioSesion()`; id = `idUsuarioSesionObligatorio()` / `getIdUsuarioObligatorio()`
(F9). **Nunca** `'sistema'`, `''`, `0`, `1` ni `null`. Lo resuelve el servicio.

## 1. Anulaciones de documentos de compra: `usuario` (nombre) obligatorio y existente
`POST /rest/fctc/anular/{id}`, `/ntcc/anular/{id}`, `/ntdc/anular/{id}`, `/lqcc/anular/{id}`.
(`idUsuario` solo hace falta para la cascada.)

## 2. `idUsuario` obligatorio y existente
- **Pagos programados:** `/pgtr` (registrar), `/pgtr/aprobar`, `/pgtr/lote`,
  `/pgtr/lote/{id}/respuesta` (query `idUsuario`, antes opcional), `/pgtr/confirmarManual`, `/pgtr/anular/{id}`,
  `/pgtr/cuentaDestino/{id}`, `/pgtr/revertirConfirmado/{id}`.
- **Aplicaciones:** `/aplp/anticipo`, `/aplp/anticipos`, `/aplp/cruzarNotaCredito`, `/aplp/revertir/{id}`.
- **Anticipos y devoluciones:** `/antp/procesar`, `/antp/anular/{id}`, `/dvpr/registrar`, `/dvpr/anular/{id}`.
- **Carga de documentos:** `/carga-documentos/*` (cargarTxt, cargarXml, procesarXml, registrarBD,
  resolverNovedad, revertir, anularContabilidad, anularDocumento, marcarReembolso, crearProductosYRegistrar,
  descargarXmlLote, registrarLote).

## 3. Arreglos concretos que reporta el BE
- `aprobacion-pagos`, anulación de documentos y `nota-venta-compra-manual` ya pasaron a
  `getIdUsuarioObligatorio()` en F9: confirmar.
- `reembolsos-factura.component.ts:27` → `@Input() idUsuario = 1`: **quitar el default** y recibir el real.
- Revisar que TODOS los servicios de §1–§2 pongan el usuario en el servicio, no en el componente.

**BE y FE van en el MISMO EAR.**
