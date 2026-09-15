# API — Reemitir el pago de una devolución de aportes (y dos correcciones de la anulación)

**Fecha:** 2026-09-15 · **Equipo:** `omen-saa-1` (crd) · **Estado:** CONTRATO CONGELADO, sin implementar
**Espejo:** `saaFE/docs/crd/API-REEMITIR-PAGO-DEVOLUCION.md`
**Diagnóstico del caso real:** `crd/sql/223` · **Medición de la anulación rota:** `crd/sql/224`

---

## 1. El problema, verificado en el código

Una devolución de aportes se pagó a una cuenta bancaria mal digitada y la transferencia rebotó.
Se necesita volver a emitir **sólo la salida del dinero** con la cuenta correcta, sin revertir el
aporte negativo ni el asiento de reclasificación.

Hoy no se puede:

1. **La cuenta viaja COPIADA en la orden de pago** (`PGS.PGTR.PGTRBFBC/PGTRBFTP/PGTRBFCT`). Corregir
   `CRD.CNBP` no corrige una orden ya emitida.
2. **Una orden rechazada no tiene vuelta.** Tesorería sólo puede anularla (si no estaba confirmada) o
   reversarla (si lo estaba); las dos terminan en `RECHAZADO(4)` o `ANULADO(5)`.
3. **CRD revierte TODO sola en cuanto ve esa orden.** `DevolucionAporteServiceImpl.sincronizarDevolucion`
   genera contra-movimientos y anula el asiento de reclasificación, y corre **cada vez que alguien abre
   las devoluciones del partícipe** (`listarPorEntidad` reconcilia antes de listar).

**Lo que lo hace posible sin tocar CXP ni TSR:** la guarda anti-duplicados de
`registrarPagoDeOrigenExterno` (`PagoProgramadoDaoServiceImpl.selectVigentesByOrigen`) sólo mira órdenes
en `0,1,2,3`. Con la anterior en `4` o `5`, CXP acepta una orden nueva para la misma devolución.

## 2. Decisiones del usuario (2026-09-15) — no re-litigar

- El flujo es: **créditos corrige la cuenta en la actualización de datos del partícipe → en la pantalla
  de devolución presiona «REEMITIR PAGO»**.
- **Orden nunca confirmada** (`0` por aprobar, `1` registrada, `2` en archivo): el botón **anula la
  orden anterior y genera la nueva en el mismo paso**.
- **Orden ya confirmada** (`3`): el botón **no** la toca. Responde con el número de la orden para que
  tesorería la reverse primero con la fecha real del rebote (tiene movimiento bancario y asiento).
  Reversada, se reemite desde el mismo botón.
- **Una orden rechazada o anulada ya NO revierte la devolución automáticamente.** La devolución queda
  pendiente de reemitir o de anular. Revertir pasa a ser un acto explícito: la anulación de la
  devolución.
- El aporte negativo y el asiento de reclasificación **no se tocan** al reemitir.

## 3. `POST /SaaBE/rest/dvap/{idDevolucion}/reemitirPago`

### 3.1 Cuerpo

```json
{
  "idCuentaBancariaParticipe": 123,
  "motivo": "Cuenta mal digitada, rebotó la transferencia",
  "confirmaRechazoBanco": true,
  "idEmpresa": 280,
  "idUsuario": 45,
  "usuario": "jperez"
}
```

| Campo | Obligatorio | Regla |
|---|---|---|
| `idCuentaBancariaParticipe` | sí | Misma validación que `registrarDevolucion` §9: existe, es del partícipe de la devolución, está `ACTIVO` |
| `motivo` | sí | No vacío |
| `confirmaRechazoBanco` | sólo si la orden actual está `EN_ARCHIVO(2)` | Debe venir `true`. El archivo está en poder del banco: sin la confirmación explícita de que el banco lo rechazó, anular y reemitir puede pagar dos veces |
| `idEmpresa`, `idUsuario`, `usuario` | sí | Igual que `/registrar` |

### 3.2 Reglas, en este orden (todo en UNA transacción `REQUIRED`)

Sea `O` la orden enlazada hoy (`DVAPIDPG`).

| # | Condición | Resultado |
|---|---|---|
| 1 | Devolución no existe | `404 DEVOLUCION_NO_ENCONTRADA` |
| 2 | Devolución `REGISTRADA(1)` sin orden, `RECHAZADA(4)` o `ANULADA(5)` | `409 ESTADO_NO_PERMITE`. Para `RECHAZADA`/`ANULADA` el mensaje dice que la reversión completa ya ocurrió y que corresponde registrar una devolución nueva |
| 3 | `O` no existe en CXP | `409 ESTADO_NO_PERMITE` («la orden N ya no existe») |
| 4 | `O` es débito automático (`PGTRDBAT = 1`, mismo criterio que `PagoProgramadoServiceImpl.esDebitoAutomatico`, que es privado: repetir la comparación) | `409 ESTADO_NO_PERMITE`: el débito automático no se reemite |
| 5 | `O` en `CONFIRMADO(3)` | `409 PAGO_CONFIRMADO` (código nuevo). Mensaje, con estos datos literales: **número de la orden**, fecha de respuesta, referencia bancaria si la hay, valor y beneficiario; y que tesorería debe reversarla primero y después reemitir desde aquí. Cualquier estado de devolución (`EN_PAGO` o `PAGADA`) |
| 6 | `O` en `EN_ARCHIVO(2)` y `confirmaRechazoBanco` distinto de `true` | `409 CONFIRMAR_RECHAZO_BANCO` (código nuevo). El mensaje nombra la orden y pide confirmar que el banco la rechazó |
| 7 | Devolución `PAGADA(3)` y `O` en `0,1,2` | `409 ESTADO_NO_PERMITE` (incoherente: pagada con orden no confirmada; se reporta, no se adivina) |
| 8 | Cuenta inválida | Los mismos códigos y status de `/registrar` (`CUENTA_NO_ENCONTRADA` 404, `SIN_CUENTA_BANCARIA` 422) |
| 9 | `O` en `0,1,2` | `pagoProgramadoService.anularPago(O, "Reemisión del pago de la devolución de aportes N° {id}: {motivo}", idUsuario)` |
| 10 | `O` en `4,5` | Nada que anular |
| 11 | Siempre | Orden nueva con `registrarPagoDeOrigenExterno` (ver 3.3) |
| 12 | Siempre | Devolución: `DVAPIDPG` = orden nueva, `CNBPCDGO` = cuenta nueva, estado `EN_PAGO(2)`. **Si venía `PAGADA`:** `DVAPNMAS` y `DVAPFCPG` a `NULL` (ese asiento de pago ya lo reversó CXP) |

**No se tocan:** `CRD.APRT`, `CRD.DDVA`, `CRD.PGAP`, `DVAPNMRC` (asiento de reclasificación).

### 3.3 La orden nueva — copia de la anterior, salvo la cuenta

```
registrarPagoDeOrigenExterno(
    OrigenPagoExterno.CRD_DEVOLUCION_APORTE, devolucion.codigo, idEmpresa,
    null,                              // cuenta origen: nace POR_APROBAR, igual que /registrar
    O.valor,                           // el MISMO valor de la orden anterior
    hoy (yyyy-MM-dd), beneficiario, desglose, observacion, idUsuario,
    false,                             // nunca débito automático
    null)                              // sin referencia
```

- **Beneficiario:** `armaBeneficiario(entidad, cuentaNueva)`, el mismo método de `/registrar`.
- **Desglose:** **copia exacta de las líneas de la orden anterior**,
  `DetallePagoOrigenExternoDaoService.selectByPago(O)` → `LineaContablePago{idProductoPago =
  producto.id, valor, concepto}`. Si la anterior no tenía líneas, se manda `null` (es la forma de
  «sin desglose» de ese servicio). **No se recalcula desde los tipos de aporte:** el asiento de
  reclasificación ya cargó la cuenta de obligación con el producto de ese momento, y el pago tiene que
  descargar la misma.
- **Observación:** `"Devolución de aportes N° {id} - {razón social} | REEMISIÓN de la orden {O}: {motivo}"`.
  Así la orden nueva se encuentra por el mismo texto que la original.
- **Rastro:** las dos órdenes cuelgan de la misma devolución (`PGTRORGN = 'CRD_DEVOLUCION_APORTE'`,
  `PGTRIDOR = id`). No hace falta columna nueva.

### 3.4 Respuesta 200

```json
{
  "exito": true,
  "etapa": "APLICACION",
  "mensaje": "Pago reemitido. La orden 5012 quedó anulada y se generó la orden 5230, por aprobar en tesorería.",
  "idPagoAnterior": 5012,
  "idPagoNuevo": 5230,
  "resultado": { ...ResultadoDevolucionAporte, igual que /anular... }
}
```

Si `O` ya estaba en `4`/`5`, el mensaje dice «La orden 5012 ya estaba rechazada/anulada» en vez de
«quedó anulada».

Errores: el sobre de siempre de `DevolucionAporteRest` (`exito:false, etapa, mensaje, error`). Los dos
códigos nuevos van a `CODIGOS_409`.

## 4. Cambio en la sincronización

`sincronizarDevolucion`, rama `RECHAZADO`/`ANULADO`: **deja de llamar a `generarContraMovimientos` y deja
de pasar la devolución a `RECHAZADA`.** La devolución queda como está (`EN_PAGO`) y se cuenta en un
contador nuevo `pendientesReemision` de `ResultadoSincronizacion`, con un log que nombre la orden.
`CONFIRMADO → PAGADA` no cambia.

## 5. Cambios en la anulación (`POST /dvap/anular/{id}`)

1. **Defecto vivo:** con la orden en `POR_APROBAR(0)` hoy **no se anula la orden**. Sólo se anula en
   `REGISTRADO(1)`, y toda orden nace en `0` desde el 2026-08-29. La devolución queda anulada, el aporte
   vuelve al partícipe y **la orden sigue viva: tesorería la puede aprobar y pagar.** Corrección: anular
   también en `0`, igual que en `1`.
2. **Devolución `PAGADA` cuya orden está `RECHAZADO`/`ANULADO`** (tesorería confirmó y después reversó):
   hoy se rechaza con `DEVOLUCION_YA_PAGADA`. Pasa a permitirse: es la reversión completa explícita.
   Con la orden `CONFIRMADO` sigue rechazándose igual que hoy.
3. Devolución `EN_PAGO` con orden `4`/`5`: ya se permite hoy (no entra en ninguna rama de la orden). Sin
   cambio, y es la vía para quien NO quiera reemitir.

## 6. `GET /dvap/porEntidad/{idEntidad}` — dos campos nuevos por devolución

`ResumenDevolucionAporte` agrega:

| Campo | Tipo | Valor |
|---|---|---|
| `estadoPago` | `Long` | `PGTRESTD` de la orden enlazada; `null` si no hay orden o no existe |
| `estadoPagoTexto` | `String` | `"POR APROBAR"`, `"REGISTRADO"`, `"EN ARCHIVO"`, `"CONFIRMADO"`, `"RECHAZADO"`, `"ANULADO"` (el mismo texto de `DevolucionAporteServiceImpl.nombreEstadoPago`, hoy privado; `armaResumen` vive en el REST, así que hay que exponerlo o mover el cálculo al service, sin duplicar el `switch`) |

## 7. Frontend — pantalla «Devolución de aportes»

1. En «Orden de pago (CXP)» mostrar `#id` **y** `estadoPagoTexto`.
2. **Aviso visible** en la tarjeta cuando la devolución está `EN_PAGO` o `PAGADA` y `estadoPago` es `4`
   o `5`: «La orden de pago N° {id} fue {rechazada|anulada} en tesorería. Reemita el pago o anule la
   devolución.»
3. **Botón «REEMITIR PAGO»** visible cuando la devolución está `EN_PAGO(2)` o `PAGADA(3)` y hay
   `idPagoProgramado`. No se oculta con la orden confirmada: el backend responde con el número de la
   orden a reversar, y ese mensaje es justamente lo que el operador necesita ver.
4. **Diálogo:**
   - selector de cuenta del partícipe (el mismo origen de datos que usa el registro de la devolución),
     **sin preselección**: el operador elige siempre. *(Corregido 2026-09-15 al revisar el FE: la
     primera redacción decía «por defecto la cuenta actual», y en un rebote la cuenta actual es
     justamente la errada. Si créditos agregó una cuenta nueva en vez de editar la vieja, el diálogo
     abría con la cuenta mala elegida y bastaba un clic para reemitir al mismo destino.)*;
   - motivo, obligatorio;
   - si `estadoPago === 2`, casilla obligatoria «Confirmo que el banco rechazó esta transferencia», que
     viaja como `confirmaRechazoBanco`;
   - confirmación antes de enviar.
5. **Éxito:** snackbar con `mensaje` y recarga del listado. **Error:** `mensajeDeRespuestaDevolucion`, sin
   cerrar el diálogo, para que el número de la orden se pueda leer y copiar.
6. **Anular:** `puedeAnularse` pasa a aceptar también `PAGADA` cuando `estadoPago` es `4` o `5` (§5.2).

## 8. Trampas

- **Probar en local con las cuatro combinaciones de §3.2** antes de dar por bueno. Sobre todo la 5
  (confirmada → 409 con el número) y la reemisión desde `PAGADA` con orden `4`, que tiene que dejar
  `DVAPNMAS`/`DVAPFCPG` en `NULL`.
- **`anularPago` de CXP rechaza órdenes con cheque** («use la reversión»). Una devolución nunca sale con
  cheque por este camino, pero si pasa, el error de CXP llega re-etiquetado con `ERROR_ORDEN_PAGO`.
- **La transacción es una sola:** si `registrarPagoDeOrigenExterno` falla después de `anularPago`, se
  revierte también la anulación. No envolver `anularPago` en un `REQUIRES_NEW`.
- **Módulos que NO se tocan:** `cxp`, `tsr`, `pagos`. Sólo se llaman métodos públicos que ya existen.
