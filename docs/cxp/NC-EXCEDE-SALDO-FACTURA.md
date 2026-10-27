# Nota de crédito de compra que excede el saldo de la factura: alerta, no bloqueo

**Equipo:** `omen-saa-2` · **Escrito:** 2026-10-27 por `omen-saa-2-arb`, antes de despachar (regla 7).
**Pedido:** correo de Katherine Pardo (asistente contable), 27-10, «Apoyo para registro de nota de crédito».
**Decisión del usuario (2026-10-27):** *«baja el control para que les permitan ingresar la nota de crédito. Que el
sistema alerte pero no detenga.»*

## El caso

Gestión de Documentos (`cxp`), Registrar la NC **002-002-000035370** de **GENERALI ECUADOR** (22/10/2026, 85,32):

> *Error al registrar — El valor a aplicar ($85.32) supera el saldo pendiente de la factura N° 002-002-000137309 ($0.00).*

La factura ya está pagada completa; la NC genera un **saldo a favor** con el proveedor. Contabilidad necesita
registrarla igual.

## Lo medido en el código (2026-10-27)

- `ProcesoCargaDocumentosServiceImpl.registrarAplicacionPagoCxp` (~l.5040) llama a
  `AplicacionPagoCxpServiceImpl.aplicarNotaCredito` (l.235) **en la misma transacción que el asiento**.
- `aplicarNotaCredito` llama a `validaMontoContraSaldo` (l.1517), que lanza `IncomeException` si
  `monto > total − aplicado + 0,01`. La excepción revierte **todo**: NC, asiento y aplicación.
- `aplicarNotaCredito` tiene **un solo llamador** (el de arriba).
- `validaMontoContraSaldo` lo usan además retenciones, anticipos, pagos por transferencia y caja chica.
  **Esos NO cambian.**
- El asiento de la NC ya se genera completo (debita la cuenta por pagar del proveedor por 85,32). El saldo a favor
  **ya existe en contabilidad**; lo que faltaba era dejar que el auxiliar (`PGS.APLP`) lo registre.
- Un saldo negativo de factura ya está contemplado: `CarteraCalculo` lo marca `sobrepagado`, y
  `recalcularEstadoPago` deja la factura en `PAGADA_TOTAL` (saldo ≤ 0,01). Cualquier pago posterior contra esa
  factura sigue bloqueado por `validaMontoContraSaldo`, porque el saldo es negativo.

## La regla

**Solo para la nota de crédito de compra** (`aplicarNotaCredito`):

1. Si el monto supera el saldo pendiente, **no se lanza la excepción**. Se aplica **el total de la NC** a la factura
   (no se recorta: recortarlo descuadraría el auxiliar contra el asiento, que ya va por el total).
2. La factura queda con saldo negativo = saldo a favor del proveedor.
3. A la observación de la aplicación se le agrega:
   ` | EXCEDE SALDO: saldo previo $X, saldo a favor $Y` (montos con 2 decimales, `Locale.US`).
4. La respuesta del registro trae una clave nueva **`advertenciaAplicacion`** (string), con el texto:
   `La nota de crédito N° {nc} ($85.32) supera el saldo pendiente de la factura N° {factura} ($0.00). Se registró
   igual y deja un saldo a favor del proveedor de $85.32.`
   Si no excede, la clave **no viene**.
5. Todo lo demás de `aplicarNotaCredito` queda igual: si la factura afectada no se encuentra, o el monto es 0, sigue
   fallando como hoy.

## Contrato (lo que cambia para el frontend)

`registrarBD` (el mismo endpoint que usa `confirmarRegistro` en `gestion-documentos.component.ts`): la respuesta
de éxito puede traer **`advertenciaAplicacion: string`**. Es aditiva; ningún campo existente cambia.
FE: si viene, se muestra como advertencia visible (snackbar `warning-snackbar`, 10 s, o diálogo) **además** del
mensaje de éxito. El registro no se considera error.

## Lo que queda fuera (decidible, sin prisa)

- **Cómo se consume después ese saldo a favor.** Hoy no hay forma de cruzar el saldo negativo de una factura contra
  otra factura del mismo proveedor ni de convertirlo en anticipo. Si GENERALI lo devuelve con un depósito o lo
  descuenta en una factura futura, hay que definir el flujo.
- Lo mismo en `cxc` (`AplicacionPagoCxcServiceImpl:1030`): no se toca sin pedido.
