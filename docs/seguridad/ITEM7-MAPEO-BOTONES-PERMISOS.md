# ÍTEM 7 — Mapeo de las relaciones pantalla-a-pantalla contra `Permisos`

**IMPLEMENTADO.** Este documento refleja el estado final del código, no una propuesta — toda fila dice
lo que el código realmente hace hoy. Si edita algo de esto, actualice esta tabla en el mismo commit.

Reglas aplicadas, en el orden en que se descubrieron y confirmó el árbitro:

1. **Una pantalla que ya está en el menú (o que ya tiene nodo) tiene un solo permiso** — el de su
   lugar en el árbol. Cuando el destino de un `navigate`/`dialog.open` es una pantalla que aparece
   dos veces en el árbol (mismo componente, dos nodos) y no hay forma estática de saber cuál aplica,
   se usa **`SIN MAPEAR`**.
2. **En cada par A⇄B, se verifica la IDA, no la VUELTA.** Volver a la pantalla de la que viniste no
   es una puerta nueva — ya tenías permiso para estar ahí. Marcado **`VUELTA — no se verifica`**.
3. **Se verifica lo que ABRE una funcionalidad, no lo que MUESTRA el resultado de una ya
   autorizada.** Da igual si es un nivel o una cadena de diálogos, y da igual la forma o el nombre del
   componente — el criterio mecánico es el método que lo abre: si recibe los datos por parámetro y
   solo los muestra (típicamente `private mostrarX(datos)`, invocado desde el `.subscribe()` de otra
   operación, sin llamada propia al backend ni acción en `afterClosed()`), es **resultado**. Si el
   método consulta al backend para llenar el diálogo, o el diálogo dispara una operación al cerrarse,
   es **puerta**. Marcado **`RESULTADO — no se verifica`**.

---

## crd (58 cableadas, 9 sin cablear)

| archivo:línea | pantalla hija | estado |
|---|---|---|
| cruce-de-valores.component.ts:795 | ReciboOperacionDialogComponent | **RESULTADO — no se verifica.** `verComprobante()` lee `pc.resultado` ya guardado, sin llamada propia al backend. |
| cruce-de-valores.component.ts:845 | PagoPrestamoDialogComponent | ✅ `Permisos.CRD_PAGO_DE_PRESTAMO` (1467) |
| cruce-de-valores.component.ts:857 | AbonoCapitalDialogComponent | ✅ `Permisos.CRD_ABONO_A_CAPITAL` (1470) |
| cruce-de-valores.component.ts:869 | PrecancelacionDialogComponent | ✅ `Permisos.CRD_PRECANCELACION` (1472) |
| prestamo-edit.component.ts:992 | PrestamoConsultaComponent | **VUELTA — no se verifica.** La ida está en prestamo-consulta.component.ts:1003/1009. |
| contrato-edit.component.ts:193 | ContratoConsultaComponent | **VUELTA — no se verifica.** La ida está en contrato-consulta.component.ts:331/335. |
| prestamo-dash.component.ts:984 | PrestamoConsultaComponent | ✅ `Permisos.CRD_PRESTAMOS_CONSULTA` (1439) — sin par de vuelta, PrestamoDash se llega solo por menú. |
| asignacion-seguros.component.ts:285 | AsignarSeguroDialogComponent | ✅ `Permisos.CRD_ASIGNAR_SEGURO` (1446) |
| contrato-dash.component.ts:312 | AportesDashComponent | ✅ `Permisos.CRD_APORTES_DASH` (1436) — ida del par con aportes-dash.component.ts:204. |
| contrato-dash.component.ts:316 | ContratoEditComponent | ✅ `Permisos.CRD_INGRESO` (1433) |
| prestamo-consulta.component.ts:993 | PrestamoDetalleDialogComponent | ✅ `Permisos.CRD_DETALLE_DEL_PRESTAMO` (1440) |
| prestamo-consulta.component.ts:1003 | PrestamoEditComponent (edición) | ✅ `Permisos.CRD_PRESTAMOS_INGRESO` (1438) |
| prestamo-consulta.component.ts:1009 | PrestamoEditComponent (generar tabla) | ✅ `Permisos.CRD_PRESTAMOS_INGRESO` (1438) |
| contrato-consulta.component.ts:331 | ContratoEditComponent (edición) | ✅ `Permisos.CRD_INGRESO` (1433) |
| contrato-consulta.component.ts:335 | ContratoEditComponent (nuevo) | ✅ `Permisos.CRD_INGRESO` (1433) |
| cuota-consulta.component.ts:330 | PrestamoDetalleDialogComponent | ✅ `Permisos.CRD_CONSULTA_CUOTAS_DETALLE_DEL_PRESTAMO` (1443) |
| aportes-dash.component.ts:204 | ContratoDashComponent | **VUELTA — no se verifica.** La ida está en contrato-dash.component.ts:312. |
| consulta-generacion-archivo.component.ts:286 | DetalleGeneracionArchivoComponent | ✅ `Permisos.CRD_DETALLE_DE_GENERACION` (1463) |
| cobros-personales.component.ts:1705 | PagoPrestamoDialogComponent | ✅ `Permisos.CRD_COBROS_PERSONALES_PAGO_DE_PRESTAMO` (1478) |
| cobros-personales.component.ts:1719 | AbonoCapitalDialogComponent | ✅ `Permisos.CRD_COBROS_PERSONALES_ABONO_A_CAPITAL` (1479) |
| cobros-personales.component.ts:1733 | PrecancelacionDialogComponent | ✅ `Permisos.CRD_COBROS_PERSONALES_PRECANCELACION` (1480) |
| cobros-personales.component.ts (mostrarRecibo, ex-1417) | CobroRegistradoDialogComponent | **RESULTADO — no se verifica.** Recibe `registro` del `.subscribe()` de registrar el cobro, sin llamada propia al backend. |
| cobros-personales.component.ts (mostrarRecibo, ex-1612) | ReciboOperacionDialogComponent | **RESULTADO — no se verifica.** Mismo método `mostrarRecibo(...)`, mismo motivo. |
| generar-archivo-petro.component.ts:242 | DetalleGeneracionArchivoComponent | ✅ `Permisos.CRD_DETALLE_DE_GENERACION` (1463) |
| detalle-consulta-carga.component.ts:835 | CoincidenciasEntidadDialogComponent | ✅ `Permisos.CRD_COINCIDENCIAS_DE_ENTIDAD` (1453) — `afterClosed()` dispara `actualizaCodigoPetroEntidad`, es puerta. |
| detalle-consulta-carga.component.ts (ex-1065) | ProcesoArchivoErrorDialogComponent | **RESULTADO — no se verifica.** Muestra el error de `aplicarPagosArchivoPetro`, que ya corrió. |
| detalle-consulta-carga.component.ts:1082 | ConsultaArchivosPetroComponent | **VUELTA — no se verifica.** La ida está en consulta-archivos-petro.component.ts:260. |
| detalle-consulta-carga.component.ts:1226 | CoincidenciasEntidadDialogComponent (2da) | ✅ `Permisos.CRD_COINCIDENCIAS_DE_ENTIDAD` (1453) |
| detalle-consulta-carga.component.ts:1756 | AfectacionFinancieraCuotasDialogComponent | ✅ `Permisos.CRD_AFECTACION_FINANCIERA_DE_CUOTAS` (1455) |
| detalle-consulta-carga.component.ts:2918 | RevalidarCargaDialogComponent | ✅ `Permisos.CRD_REVALIDAR_CARGA` (1456) |
| listados-crd.component.ts:448 | ProcesosVariosDialogComponent | ✅ `Permisos.CRD_PROCESOS_VARIOS` (1409) |
| detalle-generacion-archivo.component.ts:436 | ConsultaGeneracionArchivoComponent | **VUELTA — no se verifica.** La ida está en consulta-generacion-archivo.component.ts:286. |
| consulta-archivos-petro.component.ts:260 | DetalleConsultaCargaComponent | ✅ `Permisos.CRD_DETALLE_DE_CARGA` (1452) |
| consulta-archivos-petro.component.ts:271 | AfectacionPorParticipeComponent | ✅ `Permisos.CRD_AFECTACION_POR_PARTICIPE` (1457) |
| carga-aporte-back.component.ts:511 | DetalleConsultaCargaComponent | ✅ `Permisos.CRD_DETALLE_DE_CARGA` (1452) — sin par de vuelta hacia este origen. |
| pago-cuotas.component.ts:580 | PagoCuotaDialogComponent | ✅ `Permisos.CRD_PAGO_DE_CUOTA` (1465) |
| pago-cuotas.component.ts:974 | — | **SIN MAPEAR.** `navigate(['../'])` relativo, destino no resoluble estáticamente. |
| base-inicial-participes.component.ts:196 | ParticipeDashComponent | ✅ `Permisos.CRD_DASH_DEL_PARTICIPE` (1424) |
| afectacion-por-participe.component.ts:149 | ConsultaArchivosPetroComponent | **VUELTA — no se verifica.** La ida está en consulta-archivos-petro.component.ts:271. |
| afectacion-por-participe.component.ts:405 | AfectacionParticipeDialogComponent | ✅ `Permisos.CRD_AFECTACION_DEL_PARTICIPE` (1458) |
| afectacion-por-participe.component.ts:431 | RevalidarCargaDialogComponent | ✅ `Permisos.CRD_AFECTACION_POR_PARTICIPE_REVALIDAR_CARGA` (1459) |
| entidad-consulta.component.ts:710 | EntidadEditComponent | ✅ `Permisos.CRD_EDICION_DE_PARTICIPE` (1421) |
| entidad-consulta.component.ts:723 | EntidadParticipeInfoComponent | ✅ `Permisos.CRD_INFORMACION_DEL_PARTICIPE` (1422) |
| entidad-consulta.component.ts:738 | ParticipeDashComponent | ✅ `Permisos.CRD_DASH_DEL_PARTICIPE` (1424) |
| entidad-consulta.component.ts:902 | AuditoriaDialogComponent | ✅ `Permisos.CRD_AUDITORIA` (1418) |
| participe-info.component.ts:276 | — (returnUrl dinámico) | **VUELTA — no se verifica.** |
| entidad-edit.component.ts:357 | — (returnUrl dinámico) | **VUELTA — no se verifica.** |
| entidad-edit.component.ts:360 | EntidadConsultaComponent (fallback) | **VUELTA — no se verifica.** Fallback sin `returnUrl`; la ida está en entidad-consulta.component.ts:710. |
| proceso-pago-jubilados.component.ts:734 | ParticipeDashComponent | ✅ `Permisos.CRD_DASH_DEL_PARTICIPE` (1424) |
| entidad-participe-info.component.ts:1046 | ExterHistoricoDialogComponent | ✅ `Permisos.CRD_HISTORICO_DE_EXTERNOS` (1423) |
| entidad-participe-info.component.ts:1175 | — (returnUrl dinámico) | **VUELTA — no se verifica.** |
| entidad-participe-info.component.ts:1183 | ParticipeDashComponent (fallback) | **VUELTA — no se verifica.** Fallback sin `returnUrl`; la ida está en entidad-consulta.component.ts:738 y otras. |
| participe-dash.component.ts:281 | BaseInicialParticipesComponent | **VUELTA — no se verifica.** `regresarAPantallaAnterior()`; la ida está en base-inicial-participes.component.ts:196. |
| participe-dash.component.ts:283 | EntidadConsultaComponent | **VUELTA — no se verifica.** Mismo método; la ida está en entidad-consulta.component.ts:738. |
| participe-dash.component.ts:342 | EntidadParticipeInfoComponent | ✅ `Permisos.CRD_INFORMACION_DEL_PARTICIPE` (1422) |
| participe-dash.component.ts:361 | CertificadosParticipeComponent | ✅ `Permisos.CRD_CERTIFICADOS_DEL_PARTICIPE` (1428) |
| participe-dash.component.ts:2510 | AuditoriaDialogComponent (1ra) | ✅ `Permisos.CRD_DASH_DEL_PARTICIPE_AUDITORIA` (1425) |
| participe-dash.component.ts:2775 | AuditoriaDialogComponent (2da) | ✅ `Permisos.CRD_DASH_DEL_PARTICIPE_AUDITORIA` (1425) |
| participe-dash.component.ts:3113 | AportePagosDialogComponent | ✅ `Permisos.CRD_PAGOS_DEL_APORTE` (1426) |
| participe-dash.component.ts:3135 | AuditoriaDialogComponent (3ra) | ✅ `Permisos.CRD_DASH_DEL_PARTICIPE_AUDITORIA` (1425) |
| participe-dash.component.ts:3258 | AuditoriaDialogComponent (4ta) | ✅ `Permisos.CRD_DASH_DEL_PARTICIPE_AUDITORIA` (1425) |
| participe-dash.component.ts:3584 | PrestamoPagosDialogComponent | ✅ `Permisos.CRD_PAGOS_DEL_PRESTAMO` (1427) |

**Cadena de diálogos** (`abono-capital-dialog.component.ts`, `precancelacion-dialog.component.ts`,
`pago-prestamo-dialog.component.ts` — no tocados en absoluto): caen del lado "resultado" de la regla 3
(muestran el comprobante/registro de un cobro ya autorizado por `CruceDeValoresComponent`/
`CobrosPersonalesComponent`), y además el componente es compartido entre dos orígenes con permisos
distintos, así que ni siquiera habría un único código posible. **No se cablean.**

## cxc / cxp (28 cableadas, 6 sin cablear + 3 "sin nodo")

| archivo:línea | pantalla hija | estado |
|---|---|---|
| liquidaciones.component.ts:892 | AnularDocumentoCompraDialogComponent | ✅ `Permisos.CXC_ANULAR_DOCUMENTO_DE_COMPRA` (1384) |
| liquidaciones.component.ts:988 | Retencionesv2Component | ✅ `Permisos.CXC_RETENCIONES` (1385) |
| registrar-cobro.component.ts:220 | AbonosFacturaComponent | **VUELTA — no se verifica.** Método `volverAAbonos()`; la ida está en abonos-factura.component.ts:157 (`irARegistrarCobro`). |
| cruce-anticipo-cliente.component.ts:309 | AbonosFacturaComponent | **VUELTA — no se verifica.** Método `volverAAbonos()`; la ida está en abonos-factura.component.ts:151 (`irACruceAnticipo`). |
| anticipo.component.ts:450 | MotivoDialogComponent | ✅ `Permisos.CXC_ANTICIPOS_MOTIVO` (1395) |
| consulta-documentos-electronicos.component.ts:446 | AnularDocumentoCompraDialogComponent | ✅ `Permisos.CXC_DOCUMENTOS_ELECTRONICOS_ANULAR_DOCUMENTO_DE_COMPRA` (1388) |
| consulta-documentos-electronicos.component.ts:501 | ActualizarEstadoResultadoDialogComponent | ✅ `Permisos.CXC_ACTUALIZAR_ESTADO_RESULTADO` (1389) — la verificación envuelve la consulta+actualización completa (`consultarYActualizarEstado`), no solo el diálogo; es puerta, no resultado. |
| consulta-documentos-electronicos.component.ts:565 | ConsultaSriDialogComponent | ✅ `Permisos.CXC_CONSULTA_AL_SRI` (1390) |
| consulta-facturas.component.ts:245 | AnularDocumentoCompraDialogComponent | ✅ `Permisos.CXC_CONSULTA_FACTURAS_ANULAR_DOCUMENTO_DE_COMPRA` (1393) |
| consulta-facturas.component.ts:356 | AbonosFacturaComponent | ✅ `Permisos.CXC_ABONOS_A_FACTURA` (1377) — método `verAbonos()`, ida del par con abonos-factura.component.ts:163. |
| consulta-cobros.component.ts:194 | MotivoDialogComponent | ✅ `Permisos.CXC_MOTIVO` (1376) |
| abonos-factura.component.ts:134 | MotivoDialogComponent | ✅ `Permisos.CXC_ABONOS_A_FACTURA_MOTIVO` (1378) |
| abonos-factura.component.ts:151 | CruceAnticipoClienteComponent | ✅ `Permisos.CXC_CRUCE_DE_ANTICIPO` (1374) — método `irACruceAnticipo()`. |
| abonos-factura.component.ts:157 | RegistrarCobroComponent | ✅ `Permisos.CXC_REGISTRAR_COBRO` (1373) — método `irARegistrarCobro()`. |
| abonos-factura.component.ts:163 | ConsultaFacturasComponent | **VUELTA — no se verifica.** Método `volverAConsulta()`; la ida está en consulta-facturas.component.ts:356. |
| negociaciones.component.ts:171 y :239 | DetalleNegociacionComponent | ✅ `Permisos.CXP_DETALLE_DE_NEGOCIACION` (1364) |
| detalle-negociacion.component.ts:96 | NegociacionesComponent | **VUELTA — no se verifica.** La ida está en negociaciones.component.ts:171/239. |
| detalle-negociacion.component.ts:246 | PagoDialogComponent | ✅ `Permisos.CXP_PAGO` (1365) |
| detalle-negociacion.component.ts:260 | AdendumDialogComponent | ✅ `Permisos.CXP_ADENDUM` (1366) |
| gestion-documentos.component.ts:609 | ClasificarProductosDialogComponent | ✅ `Permisos.CXP_CLASIFICAR_PRODUCTOS` (1344) |
| gestion-documentos.component.ts:949 y :1142 | SubirXmlDialogComponent | ✅ `Permisos.CXP_SUBIR_XML` (1345) |
| gestion-documentos.component.ts:1008 | RegistrarDocumentoDialogComponent | ✅ `Permisos.CXP_REGISTRAR_DOCUMENTO` (1346) |
| gestion-documentos.component.ts:1070 | MotivoDialogComponent | ✅ `Permisos.CXP_MOTIVO` (1347) |
| gestion-documentos.component.ts:1225 | ReembolsosFacturaDialogComponent | ✅ `Permisos.CXP_REEMBOLSOS_DE_FACTURA` (1348) |
| gestion-documentos.component.ts:1298 | RegistroBloqueantesDialogComponent | **RESULTADO — no se verifica.** `private mostrarBloqueantes(bloqueantes)` recibe y muestra, confirmado por el árbitro. |
| gestion-documentos.component.ts:1307 | ErrorRegistroDialogComponent | **RESULTADO — no se verifica.** `private mostrarErrorDialog(mensaje, detalle)`, mismo motivo. |
| gestion-documentos.component.ts:1316 | XmlValidacionErrorDialogComponent | **RESULTADO — no se verifica.** `private mostrarErrorValidacionXml(errores)`, mismo motivo. |
| consulta-documentos.component.ts:352 | AnularDocumentoCompraDialogComponent | ✅ `Permisos.CXP_ANULAR_DOCUMENTO_DE_COMPRA` (1353) |
| pagos-transferencia.component.ts:829, :999, :1071 | MotivoDialogComponent | **Sin nodo — no se verifica.** `PagosTransferenciaComponent` (legado, `pagos/transferencias-legacy`) no tiene puerta de entrada activa, así que no hay permiso del que heredar. Comentario dejado en el código. |
| cruce-anticipo-proveedor.component.ts:334 | ConsultaDocumentosComponent | **VUELTA — no se verifica.** Método `volverAFactura()`; la ida está en historial-abonos-factura.component.ts:138/141. |
| historial-abonos-factura.component.ts:138 y :141 (vía ConsultaDocumentosComponent) | CruceAnticipoProveedorComponent | ✅ `Permisos.CXP_CRUCE_DE_ANTICIPO` (1359) |
| historial-abonos-factura.component.ts:154 (vía ConsultaDocumentosComponent) | SolicitudPagoComponent | ✅ `Permisos.CXP_SOLICITUD_DE_PAGO` (1358) |

## cnt / rrh (33 cableadas, 6 sin cablear + 1 "sin nodo")

**Excluidos** (selector de un valor, mismo criterio que `*SelectorDialogComponent` en cxc/cxp):
`asientos-contables-dinamico.ts:2235`, `mayor-analitico-v2.component.ts:258` y `:273`,
`detalle-plantilla-dialog.component.ts:265`, `reportes-contables.component.ts:292` y `:310`,
`reporte-mayor-analitico.component.ts:164` y `:179` — todos abren `PlanCuentaSelectorDialogComponent`.

| archivo:línea | pantalla hija | estado |
|---|---|---|
| asientos-contables-dinamico.ts:2667 | SubdetalleAsientoDialogComponent | ✅ `Permisos.CNT_SUBDETALLE_DE_ASIENTO` (1279) |
| asientos-contables-dinamico.ts:2778 | ReporteListadoAsientosComponent | ✅ `Permisos.CNT_LISTADO_DE_ASIENTOS` (1280) — Asientos Dinámico vive bajo PROCESOS, se usa el nodo de esa rama. |
| listado-asientos.component.ts:509, :518, :527 | AsientosContablesDinamico | ✅ `Permisos.CNT_ASIENTOS_DINAMICO` (1278) |
| mayor-analitico-v2.component.ts:490 | MayorAnaliticoAsientoDialogComponent | ✅ `Permisos.CNT_MAYOR_ANALITICO_V2_ASIENTO_DEL_MAYOR` (1289) |
| centro-arbol.component.ts:272, :305, :342 | CentroArbolFormComponent | ✅ `Permisos.CNT_FORMULARIO_CENTRO_ARBOL` (1263) |
| centro-grid.component.ts:223 | CentroGridFormComponent | ✅ `Permisos.CNT_FORMULARIO_CENTRO_GRID` (1265) |
| plan-arbol.component.ts:702, :729, :749 | PlanCuentaAddEditComponent | ✅ `Permisos.CNT_AGREGAR_EDITAR_CUENTA` (1259) |
| plantilla-general.component.ts:1172 | DetallePlantillaDialogComponent | ✅ `Permisos.CNT_DETALLE_DE_PLANTILLA` (1273) |
| plantilla-general.component.ts:994 | — (ruta `/menucontabilidad/asientos` inexistente) | **No se toca — bug ya reportado.** La ruta no existe; arreglar el destino es de otro equipo. |
| tipo-asiento-general-grid.component.ts:139, :226 | TipoAsientoDialog | ✅ `Permisos.CNT_FORMULARIO_TIPO_DE_ASIENTO` (1268) |
| tipo-asiento-sistema-grid.component.ts:141, :230 | TipoAsientoSistemaDialog | ✅ `Permisos.CNT_FORMULARIO_TIPO_DE_ASIENTO_SISTEMA` (1270) |
| reporte-listado-asientos.component.ts:717 | AsientosContablesDinamico | ✅ `Permisos.CNT_ASIENTOS_DINAMICO` (1278) — el origen vive bajo REPORTES, el destino tiene un solo nodo. |
| reporte-mayor-analitico.component.ts:410 | MayorAnaliticoAsientoDialogComponent | ✅ `Permisos.CNT_ASIENTO_DEL_MAYOR` (1287) |
| marcaciones.component.ts:291 | ResumenDiarioComponent | ✅ `Permisos.RRH_RESUMEN_DIARIO` (1525) |
| resumen-diario.component.ts:267 | HorasExtraComponent | ✅ `Permisos.RRH_HORAS_EXTRA` (1526) — Resumen Diario vive bajo ASISTENCIA, se usa el nodo de esa rama (distinto de `RRH_HORAS_EXTRA_PROCESOS`/1538, el de PROCESOS). |
| resumen-diario.component.ts:271 | MarcacionesComponent | ✅ `Permisos.RRH_MARCACIONES` (1523) |
| permisos-licencias-list.component.ts:344 | PermisosLicenciasFormComponent | ✅ `Permisos.RRH_FORMULARIO_DE_PERMISO` (1520) |
| permisos-licencias-list.component.ts:359 | PermisosAprobacionDialogComponent | ✅ `Permisos.RRH_APROBACION_DE_PERMISOS` (1521) |
| vacaciones-list.component.ts:234, :246, :259 | VacacionesFormComponent | ✅ `Permisos.RRH_FORMULARIO_DE_VACACIONES` (1517) |
| vacaciones-list.component.ts:440 | VacacionesAprobacionDialogComponent | ✅ `Permisos.RRH_APROBACION_DE_VACACIONES` (1518) |
| colaboradores.component.ts:182 | FichaColaboradorComponent | ✅ `Permisos.RRH_FICHA_DEL_COLABORADOR` (1513) |
| contrato-form.component.ts:216 | FichaColaboradorComponent | **VUELTA — no se verifica.** Guarda y vuelve; la ida se cablea en el origen real (ver `seccion-ficha.component.ts` abajo). |
| cuenta-bancaria-form.component.ts:217 | FichaColaboradorComponent | **VUELTA — no se verifica.** Mismo motivo. |
| ficha-colaborador.component.ts:265 | ColaboradoresComponent | **VUELTA — no se verifica.** Botón "volver" literal; la ida está en colaboradores.component.ts:182. |
| ficha-colaborador.component.ts:231 (vía resumen-colaborador.ts:146) | LiquidacionFormComponent | ✅ `Permisos.RRH_FORMULARIO_DE_LIQUIDACION` (1549) |
| seccion-ficha.component.ts (`abrirVistaPropia()`) | ContratoFormComponent **o** CuentaBancariaFormComponent | ✅ **Resuelto.** El código viaja en `secciones-ficha.config.ts` (interfaz `SeccionFicha`), junto a `rutaFormulario` — `idPermiso: Permisos.RRH_FORMULARIO_DE_CONTRATO` (1514) para `contratos`, `Permisos.RRH_FORMULARIO_DE_CUENTA_BANCARIA` (1515) para `cuentas-bancarias`. |
| anticipos.component.ts:135 | AnticipoFormDialogComponent | ✅ `Permisos.RRH_FORMULARIO_DE_ANTICIPO` (1553) |
| anticipos.component.ts:183 | AprobarAnticipoDialogComponent | ✅ `Permisos.RRH_APROBAR_ANTICIPO` (1554) |
| anticipos.component.ts:208 | MotivoDialogComponent | ✅ `Permisos.RRH_ANTICIPOS_A_TRABAJADORES_MOTIVO` (1556) |
| devoluciones-anticipo-dialog.component.ts:123 | MotivoDialogComponent | ✅ `Permisos.RRH_ANTICIPOS_A_TRABAJADORES_MOTIVO` (1556) |
| aporte-retencion-list.component.ts:263 | AporteRetencionFormComponent | **Sin nodo — no se verifica.** `AporteRetencionListComponent` no tiene nodo en el árbol (menú comentado desde 2026-08-26). Comentario dejado en el código. |
| liquidacion-form.component.ts:382 | LiquidacionListComponent | **VUELTA — no se verifica.** La ida está en liquidacion-list.component.ts:130/134. |
| liquidacion-list.component.ts:130, :134 | LiquidacionFormComponent | ✅ `Permisos.RRH_FORMULARIO_DE_LIQUIDACION` (1549) |
| periodo-nomina-dash.component.ts:258 | PrevisualizacionAsientoDialogComponent | ✅ `Permisos.RRH_PREVISUALIZACION_DEL_ASIENTO` (1533) — `previsualizarAsiento` consulta al backend para llenar el diálogo, es puerta. |
| periodo-nomina-dash.component.ts:301 | NovedadesIessComponent | ✅ `Permisos.RRH_NOVEDADES_DEL_MES_IESS` (1535) — va a una pantalla distinta, no es vuelta aunque el dash "se sienta" el padre. |
| periodo-nomina-dash.component.ts:417 | PeriodosNominaComponent | **VUELTA — no se verifica.** La ida está en periodos-nomina.component.ts:169. |
| periodos-nomina.component.ts:169 | PeriodoNominaDashComponent | ✅ `Permisos.RRH_DASH_DEL_PERIODO` (1532) |
| valores-no-pagados.component.ts:176 | RegistrarValorNoPagadoDialogComponent | ✅ `Permisos.RRH_REGISTRAR_VALOR_NO_PAGADO` (1544) |
| valores-no-pagados.component.ts:200 | MotivoDialogComponent | ✅ `Permisos.RRH_MOTIVO` (1545) |

Además: `menurecursoshumanos.component.html:6` tenía un `routerLink` hacia `procesos/acreditar-vacaciones`
sin ninguna verificación — se convirtió a `(click)="irAAcreditarVacaciones()"`, que usa
`ejecutarSiPermitido` con el mismo `PermisosRrh.ACREDITAR_VACACIONES` (1557) que ya tenía esa opción
en el menú.

## tsr / rpr / dash (11 cableadas, 1 sin cablear, 4 resueltas por mapa dinámico, 2 `routerLink` cableados)

| archivo:línea | pantalla hija | estado |
|---|---|---|
| anticipos-clientes.component.ts:394 | AnularAnticipoDialogComponent | ✅ `Permisos.TSR_ANULAR_ANTICIPO` (1307) |
| anticipos-proveedores.component.ts:449 | AnularAnticipoDialogComponent | ✅ `Permisos.TSR_PROVEEDORES_ANULAR_ANTICIPO` (1309) |
| seguimiento-anticipos.component.ts:191 | AnularAnticipoDialogComponent | ✅ `Permisos.TSR_SEGUIMIENTO_ANULAR_ANTICIPO` (1311) |
| gastos-caja-chica.component.ts:655 | AdjuntosMovimientoDialogComponent | ✅ `Permisos.TSR_ADJUNTOS_DEL_MOVIMIENTO` (1317) |
| cargar-extracto-bancario.component.ts:375 | DetalleExtractoBancarioComponent | ✅ `Permisos.TSR_DETALLE_DE_EXTRACTO` (1333) |
| consulta-extractos-bancarios.component.ts:188 | DetalleExtractoBancarioComponent | ✅ `Permisos.TSR_DETALLE_DE_EXTRACTO` (1333) |
| detalle-extracto-bancario.component.ts:167 | ConsultaExtractosBancariosComponent | **VUELTA — no se verifica.** La ida está en consulta-extractos-bancarios.component.ts:188. |
| conciliacion-cierre.component.ts:289 | ConsultaComponent (pagos-transferencia) | ✅ `Permisos.TSR_CONSULTA_Y_GESTION` (1324) |
| archivo-banco.component.ts:279 | ConfirmacionComponent | ✅ `Permisos.TSR_RECEPCION_Y_CONFIRMACION` (1323) |
| archivo-banco.component.ts:283 | ConsultaComponent | ✅ `Permisos.TSR_CONSULTA_Y_GESTION` (1324) |
| registro-egreso.component.ts:378 | AprobacionPagosComponent | ✅ `Permisos.TSR_APROBACION_DE_PAGOS` (1321) |
| consultas-cheques.component.ts:196 | destino dinámico | ✅ **Resuelto.** `model/cheque-listado.ts` ahora devuelve `{ruta, idPermiso}` — `CXP_CONSULTA_DOCUMENTOS`(1352) / `TSR_EGRESOS`(1314) / `TSR_PROVEEDORES`(1308) según `tipoPago`. |
| cheques-entregados-proc.component.ts:191 | mismo destino dinámico | ✅ Resuelto, mismo mapa. |
| cheques-generados.component.ts:229 | mismo destino dinámico | ✅ Resuelto, mismo mapa. |
| cheques-impresos-proc.component.ts:239 | mismo destino dinámico | ✅ Resuelto, mismo mapa. |
| login.component.ts:454, :115; cambio-clave-dialog.component.ts:182; menu.component.ts:26 | — | Fuera del árbol de permisos (login/logout) — no se tocan. |

Además: `menutesoreria.component.html:15` y `:28` tenían `routerLink` sin verificación — se
convirtieron a `(click)` con `ejecutarSiPermitido`, usando `Permisos.TSR_REPOSICION` (1318) y
`Permisos.TSR_CONCILIACION_CIERRE` (1335) respectivamente — los mismos códigos que esas opciones ya
tenían en el `navItems` del propio menú.

`rpr`: sin filas (sin `dialog.open`/`router.navigate` de pantalla).

---

## Resumen del barrido final

Comparado contra la tabla que aprobaste antes de implementar, **19 filas cambiaron de lado** al
aplicar las reglas 2 y 3 con evidencia de código (nombre de método, si hay llamada propia al backend,
si `afterClosed()` dispara una acción) en vez de la forma del árbol:

- **8 pasaron de "cablear" a `VUELTA`** por evidencia que el ÍTEM 3 no había mirado (nombre del
  método): `registrar-cobro.component.ts:220`, `cruce-anticipo-cliente.component.ts:309`,
  `abonos-factura.component.ts:163`, `cruce-anticipo-proveedor.component.ts:334` (los 4 en cxc/cxp,
  método `volverA...`), y `participe-dash.component.ts:281`/`:283` (crd, método
  `regresarAPantallaAnterior()`).
- **7 pasaron de "cablear" a `VUELTA`** al aplicar la regla 2 recién definida a filas ya aprobadas
  antes de que existiera: `prestamo-edit.component.ts:992`, `contrato-edit.component.ts:193`,
  `aportes-dash.component.ts:204`, `detalle-generacion-archivo.component.ts:436`,
  `detalle-consulta-carga.component.ts:1082`, `afectacion-por-participe.component.ts:149` (crd);
  `entidad-edit.component.ts:360` y `entidad-participe-info.component.ts:1183` (crd, fallbacks sin
  `returnUrl` — mismo criterio que los 3 `returnUrl` dinámicos ya excluidos); `detalle-negociacion.component.ts:96`
  (cxp); `ficha-colaborador.component.ts:265`, `contrato-form.component.ts:216`,
  `cuenta-bancaria-form.component.ts:217`, `liquidacion-form.component.ts:382`,
  `periodo-nomina-dash.component.ts:417` (rrh); `detalle-extracto-bancario.component.ts:167` (tsr).
- **4 pasaron de "cablear" a `RESULTADO`** al aplicar la regla 3, confirmada por el árbitro con el
  criterio mecánico (método `mostrarX(datos)` sin llamada propia al backend):
  `detalle-consulta-carga.component.ts` (ex-1065, `ProcesoArchivoErrorDialogComponent`) y
  `cobros-personales.component.ts` (`mostrarRecibo`, ex-1417 y ex-1612, `CobroRegistradoDialogComponent`/
  `ReciboOperacionDialogComponent`) en crd, más `gestion-documentos.component.ts:1298/1307/1316` en
  cxp (`RegistroBloqueantesDialogComponent`/`ErrorRegistroDialogComponent`/`XmlValidacionErrorDialogComponent`,
  los 3 confirmados directamente por el árbitro).
- **Verificados y confirmados del lado "puerta"** (se revisaron por la misma duda y no cambiaron):
  `CoincidenciasEntidadDialogComponent` (crd, `afterClosed()` dispara `actualizaCodigoPetroEntidad`),
  `ActualizarEstadoResultadoDialogComponent` (cxc, la verificación envuelve la consulta+actualización
  completa, no solo el diálogo), `PrevisualizacionAsientoDialogComponent` (rrh,
  `previsualizarAsiento` consulta al backend para llenar el diálogo).

Las ambigüedades que quedaron `SIN MAPEAR` en la tabla original y se resolvieron:
- `resumen-diario.component.ts:267` y `asientos-contables-dinamico.ts:2778` (misma ruta, dos nodos):
  resueltas con la regla "se usa el nodo de la misma rama que el origen".
- `seccion-ficha.component.ts` (rrh): resuelta, código en `secciones-ficha.config.ts` junto a
  `rutaFormulario`.
- Los 4 destinos dinámicos de `tsr` por `tipoPago`: resueltos con mapa `{ruta, idPermiso}` en
  `model/cheque-listado.ts`.

Siguen `SIN MAPEAR` o sin verificar, sin cambios:
- **5 diálogos en cadena de crd** (`AbonoCapitalDialogComponent`/`PrecancelacionDialogComponent`/
  `PagoPrestamoDialogComponent` → sus hijos) — no se cablean: caen del lado "resultado" de la regla 3
  y además el componente es compartido entre dos orígenes con permisos distintos.
- **3 `returnUrl` dinámicos** en crd (`participe-info`, `entidad-edit:357`, `entidad-participe-info:1175`).
- **1 navegación relativa** sin destino identificable (`pago-cuotas.component.ts:974`).
- **2 pantallas de origen sin nodo**: `PagosTransferenciaComponent` (cxp, legado) y
  `AporteRetencionListComponent` (rrh, a medio construir) — comentario dejado en el código.
- **1 bug ya reportado**: `plantilla-general.component.ts:994`, ruta destino inexistente.

Build: `ng build --configuration development` compila limpio con todos los módulos juntos.
