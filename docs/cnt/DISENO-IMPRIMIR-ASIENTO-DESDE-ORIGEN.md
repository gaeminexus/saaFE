# DISEÑO — Imprimir el asiento desde la pantalla que lo generó, con el formato oficial

**Equipo:** `omen-saa-2` · **Escrito:** 2026-10-02 por `omen-saa-2-arb`, antes de despachar.
**Pedido:** correo de Ana Lalangui (contabilidad), 2026-10-02, punto 4:
> *«Cuando genero un ingreso o egreso me sale el anuncio que se generó con tal número, pero para imprimir
> dicho registro tengo que irme al módulo de contabilidad y buscarlo. Necesitamos que se pueda imprimir
> desde donde se lo creó. Desde el botón que hay a la derecha me puedo descargar, pero el formato sale
> mal.»*

## 1. Lo medido

- **El formato oficial existe:** la plantilla Jasper `rep/cnt/RPRT_ASNT_CNTB`, que usa Contabilidad →
  Asientos (`asientos-contables-dinamico.ts:2605-2650`). Se llama con
  `JasperReportesService.generar('cnt', 'RPRT_ASNT_CNTB', { P_PATH: '', P_REPORTE: 'ASIENTO',
  P_ASNTCDGO: <codigo del asiento>, P_IMAGEN: null }, 'PDF')`. ⚠️ Recibe el **código (PK)** del
  asiento, **no** el número alterno.
- **El «botón de la derecha» que sale mal** está en Reportes → Listado de Asientos
  (`reporte-listado-asientos.component.html:245-256`, `exportarAsientoPDF` en `.ts:638-668`). Arma un PDF
  **genérico en el navegador** con jsPDF (`ExportService.exportToPDF`): una tabla sin logo, sin firmas,
  sin el formato contable. Es la imagen del asiento `REC-2026-09-0003` del correo. **No usa la plantilla
  Jasper.**
- **Ya hay dos pantallas que imprimen el asiento desde su origen, bien:** CxP pagos por transferencia
  (`pagos-transferencia.component.ts:1020-1049`) y TSR consulta de pagos
  (`consulta.component.ts:265-300`). Son **el patrón a copiar**: ícono `picture_as_pdf` en Acciones,
  visible solo si hay asiento con `codigo`, spinner por fila mientras se genera, y archivo
  `asiento-{numeroAlterno}.pdf`.
- **Ingreso y egreso de tesorería** muestran el número del asiento en el aviso, pero **no tienen botón**.
  Además, el backend devuelve solo el **número alterno**, no el código:
  - `IngresoServiceImpl:192-198` → `asiento: numeroAlterno`.
  - El egreso delega en `PagoProgramadoServiceImpl.registrarPagoDeEgreso`, que devuelve
    `asiento: numeroAlterno` con cheque o débito, y nada con transferencia (queda por aprobar).
  - En la pestaña de consulta de las dos pantallas, cada fila trae el objeto `asiento` **completo, con
    `codigo`**.

## 2. El arreglo

### 2.1 Un ayudante compartido, nuevo (FE)

`shared/services/imprimir-asiento.service.ts` (archivo **nuevo**, `providedIn: 'root'`):
`imprimir(codigoAsiento: number, numeroAlterno?: string): Observable<void>`.
- Llama a `JasperReportesService.generar` con los parámetros de §1.
- Descarga con `guardarArchivo(blob, 'asiento-' + (numeroAlterno || codigo) + '.pdf')`
  (`shared/services/descarga-reporte.ts:24`).
- Ante un error, lee el mensaje con `mensajeReporteFallido` (`descarga-reporte.ts:53`).

Es la lógica de `pagos-transferencia.component.ts:1020-1049`, sacada a un solo lugar. Las dos pantallas
que ya imprimen **no se tocan**: siguen como están.

### 2.2 Backend: devolver también el código del asiento

Se agrega **`idAsiento`** (el `codigo`) a la respuesta, **junto a** `asiento` (el número alterno, que
no cambia). Cambio aditivo:

- `IngresoServiceImpl.procesarIngreso` (`:192-198`).
- `EgresoServiceImpl`: **después** de `registrarPagoDeEgreso`, si la respuesta trae `asiento`, lee
  `egreso.getAsiento()` y agrega `idAsiento`. ⛔ **No se toca `PagoProgramadoServiceImpl`**: tiene
  cambios sin commitear de `omen-saa-3`.
- `DevolucionAnticipoProveedorServiceImpl.registrar`.

### 2.3 Frontend: dónde aparece el botón «Imprimir asiento»

| Pantalla | Dónde |
|---|---|
| Registro de **ingreso** (tsr) | En el **aviso de éxito**, un botón «Imprimir asiento» (usa `idAsiento` de la respuesta). En la **consulta**, ícono en Acciones (usa `fila.asiento.codigo`) |
| Registro de **egreso** (tsr) | Igual: en el aviso si vino `idAsiento`; en la consulta, en Acciones |
| **Devolución de Anticipo** (cxp) | En el aviso, y en cada fila del historial (la proyección de `/dvpr/listar` trae `numeroAsiento`: agregar `idAsiento` a la proyección, BE §2.2) |
| **Reportes → Listado de Asientos** (cnt) | El botón PDF de la fila expandida pasa a usar la plantilla Jasper (con el código del asiento de esa fila) **en vez del jsPDF genérico**. El CSV queda igual |

En todas, el ícono se muestra **solo si hay asiento con `codigo`**, y con spinner mientras se genera.

## 3. Lo que NO cambia

`RPRT_ASNT_CNTB` (la plantilla no se toca, así que no hace falta recompilar el `.jasper`). Las dos
pantallas que ya imprimen. La exportación CSV.
