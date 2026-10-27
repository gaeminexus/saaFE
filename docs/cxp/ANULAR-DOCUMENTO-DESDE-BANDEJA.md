# Anular un documento desde Gestión de Documentos (bandeja SRI de `cxp`)

**Equipo:** `omen-saa-2` · **Escrito:** 2026-10-27 por `omen-saa-2-arb`, antes de despachar (regla 7).
**Espejo FE:** `saaFE/docs/cxp/ANULAR-DOCUMENTO-DESDE-BANDEJA.md`. **Sin DDL.**

## 1. El caso

La retención recibida **1294** (MRFOX CIA LTDA, 001-002-000000710, 05/10/2026, 218,84) la anuló el cliente ante el
SRI. Ya se le anuló la contabilidad y en la última carga no apareció → quedó en **NOVEDAD**
(`DESAPARECIDO_EN_CARGA`). La bandeja solo ofrece **Mantener** (la vuelve a XML CARGADO, lista para registrarse otra
vez) o **Reemplazar** (pide un XML nuevo). **No hay cómo anularla desde la pantalla.** Mientras tanto se escribió el
`e2-108`, que lo hace a mano (`cxp/sql/e2-108`).

## 2. Lo medido en el código (2026-10-27)

- El backend **ya tiene** `POST /rest/{proceso}/anularDocumento/{idDocumentoCxp}` (`ProcesoCargaDocumentosRest:560`)
  → `ProcesoCargaDocumentosServiceImpl.marcarDocumentoAnulado` (~l.1264): pasa `PGS.DCXP` a **ANULADO (7)**,
  terminal, con `validarSinPagosVigentes` (que solo mira facturas). **Ningún botón del FE lo llama**
  (`gestion-documentos.component.html`: estado 5 → Mantener/Reemplazar; estado 2 → Recontabilizar; estado 3 → Anular
  contabilidad).
- `marcarDocumentoAnulado` **solo toca `DCXP`**. El documento ya registrado en su tabla (`PGS.RCV2/DRC2` o
  `PGS.RTCM/DRCM` para una retención recibida) **queda activo**, y `GeneradorAtsServiceImpl` lee `RCV2/DRC2` con
  `estado = 1`: **la retención anulada se declararía en el ATS.**
- Tampoco verifica si el documento todavía tiene **asiento vivo**: anular un documento con contabilidad activa
  dejaría el asiento sin documento.

## 3. La regla

### 3.1 Backend — `marcarDocumentoAnulado`

Se mantiene todo lo de hoy y se agrega, **antes** de marcar ANULADO:

1. Si el documento tiene registro en su tabla (`idDocumentoBD`) y ese registro tiene **asiento no anulado** → `IncomeException`
   (409, como hoy): *«El documento tiene la contabilidad activa (asiento X). Anule primero la contabilidad.»*
2. Para **`RETENCION_COMPRA_V2`** y **`RETENCION_COMPRA`** con `idDocumentoBD`:
   - cabecera (`RCV2` / `RTCM`) y **todos** sus detalles (`DRC2` / `DRCM`) a **inactivo** (estado 0, el mismo valor que
     usa el `e2-108`; el ejecutor confirma la constante);
   - si quedara alguna aplicación **activa** de esa retención sobre la factura de venta (`APLC`, la que crea
     `aplicarRetencionRecibida`/`V2`), se **reversa** con el método de reverso que ya existe en
     `AplicacionPagoCxcServiceImpl` y se recalcula el estado de la factura. El ejecutor mide primero si
     `anularContabilidadDocumento` ya la reversa; si ya lo hace, no se duplica.
3. Los demás tipos (factura, NC, ND, liquidación) **no cambian** en este pedido: tienen su propia anulación
   (`/fctc/anular`, `anularNotaCreditoCompra`, …) que se llama antes, según el comentario del REST. Si al medir
   resulta que alguno queda activo igual que la retención, **se reporta y no se toca**.
4. Respuesta igual que hoy; el `mensaje` dice además qué se inactivó (p. ej. *«Retención inactivada: no se
   declarará en el ATS.»*).

### 3.2 Frontend — `gestion-documentos`

- Botón **«Anular»** (icono `block`, `color="warn"`) en las filas de la pestaña Pendientes en estado **NOVEDAD (5)**,
  **XML CARGADO (2)** y **REVERTIDO (6)**. **No** en REGISTRADO (3), que primero anula la contabilidad, ni en ANULADO.
- Abre `MotivoDialogComponent` (motivo obligatorio; texto de ayuda: *«Use esta opción solo si el emisor anuló el
  comprobante ante el SRI. Es definitivo.»*) → `POST anularDocumento/{id}` con `{ motivo, idUsuario }`.
- 200 → snackbar con el `mensaje` y `cargar()`. 409 → el mensaje del backend tal cual (`mensajeDeError`).
- `idUsuario` sale de donde ya lo toma la pantalla (`this.idUsuario`), sin relleno.

## 4. Verificación

- `mvn -q compile`, `ng build`, revisión del árbitro.
- **Prueba del usuario:** si el `e2-108` **no** se corrió, la retención 1294 se anula desde la bandeja con el botón
  nuevo; después, `RCV2`/`DRC2` de esa retención quedan en 0 (es el BLOQUE 1 del `e2-108`, que es solo lectura) y la
  fila pasa a Procesados como ANULADO. Si el `e2-108` **ya se corrió**, la 1294 ya está anulada y la prueba se hace
  con el próximo caso.
