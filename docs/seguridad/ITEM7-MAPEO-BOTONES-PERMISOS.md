# ÍTEM 7 — Mapeo de las 149 relaciones pantalla-a-pantalla contra `Permisos`

**Solo lectura hasta aprobación del árbitro. Ningún `dialog.open`/`router.navigate` fue tocado.**

Regla aplicada: "una pantalla que ya está en el menú (o que ya tiene nodo) tiene un solo permiso — el
de su lugar en el árbol". Cuando el destino de un `navigate`/`dialog.open` es una pantalla que
aparece más de una vez en el árbol (mismo componente, dos nodos distintos) y no hay forma estática de
saber cuál de los dos aplica, uso **`SIN MAPEAR`** y explico la ambigüedad en vez de adivinar.

---

## crd (67 filas)

| archivo:línea | pantalla hija | constante | valor |
|---|---|---|---|
| cruce-de-valores.component.ts:795 | ReciboOperacionDialogComponent | CRD_CRUCE_DE_VALORES_RECIBO_DE_OPERACION | 1475 |
| cruce-de-valores.component.ts:845 | PagoPrestamoDialogComponent | CRD_PAGO_DE_PRESTAMO | 1467 |
| cruce-de-valores.component.ts:857 | AbonoCapitalDialogComponent | CRD_ABONO_A_CAPITAL | 1470 |
| cruce-de-valores.component.ts:869 | PrecancelacionDialogComponent | CRD_PRECANCELACION | 1472 |
| prestamo-edit.component.ts:992 | PrestamoConsultaComponent | CRD_PRESTAMOS_CONSULTA | 1439 |
| contrato-edit.component.ts:193 | ContratoConsultaComponent | CRD_CONTRATOS_ADMINISTRAR | 1434 |
| prestamo-dash.component.ts:984 | PrestamoConsultaComponent | CRD_PRESTAMOS_CONSULTA | 1439 |
| asignacion-seguros.component.ts:285 | AsignarSeguroDialogComponent | CRD_ASIGNAR_SEGURO | 1446 |
| contrato-dash.component.ts:312 | AportesDashComponent | CRD_APORTES_DASH | 1436 |
| contrato-dash.component.ts:316 | ContratoEditComponent | CRD_INGRESO | 1433 |
| prestamo-consulta.component.ts:993 | PrestamoDetalleDialogComponent | CRD_DETALLE_DEL_PRESTAMO | 1440 |
| prestamo-consulta.component.ts:1003 | PrestamoEditComponent (edición) | CRD_PRESTAMOS_INGRESO | 1438 |
| prestamo-consulta.component.ts:1009 | PrestamoEditComponent (generar tabla) | CRD_PRESTAMOS_INGRESO | 1438 |
| contrato-consulta.component.ts:331 | ContratoEditComponent (edición) | CRD_INGRESO | 1433 |
| contrato-consulta.component.ts:335 | ContratoEditComponent (nuevo) | CRD_INGRESO | 1433 |
| cuota-consulta.component.ts:330 | PrestamoDetalleDialogComponent | CRD_CONSULTA_CUOTAS_DETALLE_DEL_PRESTAMO | 1443 |
| aportes-dash.component.ts:204 | ContratoDashComponent | CRD_DASH | 1435 |
| consulta-generacion-archivo.component.ts:286 | DetalleGeneracionArchivoComponent | CRD_DETALLE_DE_GENERACION | 1463 |
| cobros-personales.component.ts:1705 | PagoPrestamoDialogComponent | CRD_COBROS_PERSONALES_PAGO_DE_PRESTAMO | 1478 |
| cobros-personales.component.ts:1719 | AbonoCapitalDialogComponent | CRD_COBROS_PERSONALES_ABONO_A_CAPITAL | 1479 |
| cobros-personales.component.ts:1733 | PrecancelacionDialogComponent | CRD_COBROS_PERSONALES_PRECANCELACION | 1480 |
| cobros-personales.component.ts:1417 | CobroRegistradoDialogComponent | CRD_COBROS_PERSONALES_COBRO_REGISTRADO | 1481 |
| cobros-personales.component.ts:1612 | ReciboOperacionDialogComponent | CRD_COBROS_PERSONALES_RECIBO_DE_OPERACION | 1482 |
| generar-archivo-petro.component.ts:242 | DetalleGeneracionArchivoComponent | CRD_DETALLE_DE_GENERACION | 1463 |
| detalle-consulta-carga.component.ts:835 | CoincidenciasEntidadDialogComponent | CRD_COINCIDENCIAS_DE_ENTIDAD | 1453 |
| detalle-consulta-carga.component.ts:1065 | ProcesoArchivoErrorDialogComponent | CRD_ERROR_DEL_PROCESO_DE_ARCHIVO | 1454 |
| detalle-consulta-carga.component.ts:1082 | ConsultaArchivosPetroComponent | CRD_CONSULTA_CARGA | 1451 |
| detalle-consulta-carga.component.ts:1226 | CoincidenciasEntidadDialogComponent (2da) | CRD_COINCIDENCIAS_DE_ENTIDAD | 1453 |
| detalle-consulta-carga.component.ts:1756 | AfectacionFinancieraCuotasDialogComponent | CRD_AFECTACION_FINANCIERA_DE_CUOTAS | 1455 |
| detalle-consulta-carga.component.ts:2918 | RevalidarCargaDialogComponent | CRD_REVALIDAR_CARGA | 1456 |
| listados-crd.component.ts:448 | ProcesosVariosDialogComponent | CRD_PROCESOS_VARIOS | 1409 |
| detalle-generacion-archivo.component.ts:436 | ConsultaGeneracionArchivoComponent | CRD_CONSULTA_GENERACION | 1462 |
| consulta-archivos-petro.component.ts:260 | DetalleConsultaCargaComponent | CRD_DETALLE_DE_CARGA | 1452 |
| consulta-archivos-petro.component.ts:271 | AfectacionPorParticipeComponent | CRD_AFECTACION_POR_PARTICIPE | 1457 |
| carga-aporte-back.component.ts:511 | DetalleConsultaCargaComponent | CRD_DETALLE_DE_CARGA | 1452 |
| pago-cuotas.component.ts:580 | PagoCuotaDialogComponent | CRD_PAGO_DE_CUOTA | 1465 |
| pago-cuotas.component.ts:974 | — | **SIN MAPEAR** | navigate relativo `['../']`, destino no resoluble estáticamente (ya señalado en el inventario) |
| base-inicial-participes.component.ts:196 | ParticipeDashComponent | CRD_DASH_DEL_PARTICIPE | 1424 |
| afectacion-por-participe.component.ts:149 | ConsultaArchivosPetroComponent | CRD_CONSULTA_CARGA | 1451 |
| afectacion-por-participe.component.ts:405 | AfectacionParticipeDialogComponent | CRD_AFECTACION_DEL_PARTICIPE | 1458 |
| afectacion-por-participe.component.ts:431 | RevalidarCargaDialogComponent | CRD_AFECTACION_POR_PARTICIPE_REVALIDAR_CARGA | 1459 |
| entidad-consulta.component.ts:710 | EntidadEditComponent | CRD_EDICION_DE_PARTICIPE | 1421 |
| entidad-consulta.component.ts:723 | EntidadParticipeInfoComponent | CRD_INFORMACION_DEL_PARTICIPE | 1422 |
| entidad-consulta.component.ts:738 | ParticipeDashComponent | CRD_DASH_DEL_PARTICIPE | 1424 |
| entidad-consulta.component.ts:902 | AuditoriaDialogComponent | CRD_AUDITORIA | 1418 |
| participe-info.component.ts:276 | — (returnUrl dinámico) | **SIN MAPEAR** | destino llega por queryParams, no es fijo en el código; en la práctica siempre fue CRD_CONSULTA(1417) o CRD_DASH_DEL_PARTICIPE(1424), ya cubiertos por otras filas |
| entidad-edit.component.ts:357 | — (returnUrl dinámico) | **SIN MAPEAR** | mismo motivo que la fila anterior |
| entidad-edit.component.ts:360 | EntidadConsultaComponent (fallback) | CRD_CONSULTA | 1417 |
| proceso-pago-jubilados.component.ts:734 | ParticipeDashComponent | CRD_DASH_DEL_PARTICIPE | 1424 |
| entidad-participe-info.component.ts:1046 | ExterHistoricoDialogComponent | CRD_HISTORICO_DE_EXTERNOS | 1423 |
| entidad-participe-info.component.ts:1175 | — (returnUrl dinámico) | **SIN MAPEAR** | mismo motivo |
| entidad-participe-info.component.ts:1183 | ParticipeDashComponent (fallback) | CRD_DASH_DEL_PARTICIPE | 1424 |
| participe-dash.component.ts:281 | BaseInicialParticipesComponent | CRD_PARTICIPES_INICIAL | 1403 |
| participe-dash.component.ts:283 | EntidadConsultaComponent | CRD_CONSULTA | 1417 |
| participe-dash.component.ts:342 | EntidadParticipeInfoComponent | CRD_INFORMACION_DEL_PARTICIPE | 1422 |
| participe-dash.component.ts:361 | CertificadosParticipeComponent | CRD_CERTIFICADOS_DEL_PARTICIPE | 1428 |
| participe-dash.component.ts:2510 | AuditoriaDialogComponent (1ra) | CRD_DASH_DEL_PARTICIPE_AUDITORIA | 1425 |
| participe-dash.component.ts:2775 | AuditoriaDialogComponent (2da) | CRD_DASH_DEL_PARTICIPE_AUDITORIA | 1425 |
| participe-dash.component.ts:3113 | AportePagosDialogComponent | CRD_PAGOS_DEL_APORTE | 1426 |
| participe-dash.component.ts:3135 | AuditoriaDialogComponent (3ra) | CRD_DASH_DEL_PARTICIPE_AUDITORIA | 1425 |
| participe-dash.component.ts:3258 | AuditoriaDialogComponent (4ta) | CRD_DASH_DEL_PARTICIPE_AUDITORIA | 1425 |
| participe-dash.component.ts:3584 | PrestamoPagosDialogComponent | CRD_PAGOS_DEL_PRESTAMO | 1427 |

**Cadena de diálogos** (abono-capital-dialog.component.ts:313, precancelacion-dialog.component.ts:378
y :477, pago-prestamo-dialog.component.ts:319 y :410 — los 5 de "cadena de diálogos" del inventario):
**SIN MAPEAR, las 5.** `AbonoCapitalDialogComponent`/`PrecancelacionDialogComponent`/`PagoPrestamoDialogComponent`
son reutilizados **tanto por `CruceDeValoresComponent` como por `CobrosPersonalesComponent`**, y el
árbol tiene códigos *distintos* para el mismo diálogo hijo según cuál de los dos lo haya abierto
(p. ej. `CobroRegistradoDialogComponent` es 1468/1471/1473 bajo Cruce de Valores, pero 1481 bajo
Cobros Personales, plano). El código de estos 5 diálogos vive en un archivo compartido y no sabe en
tiempo de ejecución quién lo abrió — mapear un solo código ahí protegería mal la mitad de los casos.
Necesita una decisión de diseño (¿pasar el permiso como dato al abrir el diálogo hijo?) antes de
poder cablearse; no es un caso de "no lo encontré", es un caso de "el código no distingue el
contexto".

**Excluidos** (confirmaciones/selector/PDF, ya fuera de las 149): sin cambios respecto al inventario.

## cxc / cxp (29 + 2 filas del caso especial)

| archivo:línea | pantalla hija | constante | valor |
|---|---|---|---|
| liquidaciones.component.ts:892 | AnularDocumentoCompraDialogComponent | CXC_ANULAR_DOCUMENTO_DE_COMPRA | 1384 |
| liquidaciones.component.ts:988 | Retencionesv2Component | CXC_RETENCIONES | 1385 |
| registrar-cobro.component.ts:220 | AbonosFacturaComponent | CXC_ABONOS_A_FACTURA | 1377 |
| cruce-anticipo-cliente.component.ts:309 | AbonosFacturaComponent | CXC_ABONOS_A_FACTURA | 1377 |
| anticipo.component.ts:450 | MotivoDialogComponent | CXC_ANTICIPOS_MOTIVO | 1395 |
| consulta-documentos-electronicos.component.ts:446 | AnularDocumentoCompraDialogComponent | CXC_DOCUMENTOS_ELECTRONICOS_ANULAR_DOCUMENTO_DE_COMPRA | 1388 |
| consulta-documentos-electronicos.component.ts:501 | ActualizarEstadoResultadoDialogComponent | CXC_ACTUALIZAR_ESTADO_RESULTADO | 1389 |
| consulta-documentos-electronicos.component.ts:565 | ConsultaSriDialogComponent | CXC_CONSULTA_AL_SRI | 1390 |
| consulta-facturas.component.ts:245 | AnularDocumentoCompraDialogComponent | CXC_CONSULTA_FACTURAS_ANULAR_DOCUMENTO_DE_COMPRA | 1393 |
| consulta-facturas.component.ts:356 | AbonosFacturaComponent | CXC_ABONOS_A_FACTURA | 1377 |
| consulta-cobros.component.ts:194 | MotivoDialogComponent | CXC_MOTIVO | 1376 |
| abonos-factura.component.ts:134 | MotivoDialogComponent | CXC_ABONOS_A_FACTURA_MOTIVO | 1378 |
| abonos-factura.component.ts:151 | CruceAnticipoClienteComponent | CXC_CRUCE_DE_ANTICIPO | 1374 |
| abonos-factura.component.ts:157 | RegistrarCobroComponent | CXC_REGISTRAR_COBRO | 1373 |
| abonos-factura.component.ts:163 | ConsultaFacturasComponent | CXC_CONSULTA_FACTURAS | 1392 |
| negociaciones.component.ts:171 y :239 | DetalleNegociacionComponent | CXP_DETALLE_DE_NEGOCIACION | 1364 |
| detalle-negociacion.component.ts:96 | NegociacionesComponent | CXP_ADMINISTRAR_NEGOCIACIONES | 1363 |
| detalle-negociacion.component.ts:246 | PagoDialogComponent | CXP_PAGO | 1365 |
| detalle-negociacion.component.ts:260 | AdendumDialogComponent | CXP_ADENDUM | 1366 |
| gestion-documentos.component.ts:609 | ClasificarProductosDialogComponent | CXP_CLASIFICAR_PRODUCTOS | 1344 |
| gestion-documentos.component.ts:949 y :1142 | SubirXmlDialogComponent | CXP_SUBIR_XML | 1345 |
| gestion-documentos.component.ts:1008 | RegistrarDocumentoDialogComponent | CXP_REGISTRAR_DOCUMENTO | 1346 |
| gestion-documentos.component.ts:1070 | MotivoDialogComponent | CXP_MOTIVO | 1347 |
| gestion-documentos.component.ts:1225 | ReembolsosFacturaDialogComponent | CXP_REEMBOLSOS_DE_FACTURA | 1348 |
| gestion-documentos.component.ts:1298 | RegistroBloqueantesDialogComponent | CXP_REGISTRO_DE_BLOQUEANTES | 1349 |
| gestion-documentos.component.ts:1307 | ErrorRegistroDialogComponent | CXP_ERROR_DE_REGISTRO | 1350 |
| gestion-documentos.component.ts:1316 | XmlValidacionErrorDialogComponent | CXP_ERROR_DE_VALIDACION_XML | 1351 |
| consulta-documentos.component.ts:352 | AnularDocumentoCompraDialogComponent | CXP_ANULAR_DOCUMENTO_DE_COMPRA | 1353 |
| pagos-transferencia.component.ts:829, :999, :1071 | MotivoDialogComponent | **SIN MAPEAR** | `PagosTransferenciaComponent` (pantalla legado, `pagos/transferencias-legacy`) no tiene nodo en el árbol — nunca tuvo puerta de menú activa ni navigate que la alcance, así que no hay contexto del que heredar el permiso |
| cruce-anticipo-proveedor.component.ts:334 | ConsultaDocumentosComponent | CXP_CONSULTA_DOCUMENTOS | 1352 |
| historial-abonos-factura.component.ts:138 y :141 (vía ConsultaDocumentosComponent) | CruceAnticipoProveedorComponent | CXP_CRUCE_DE_ANTICIPO | 1359 |
| historial-abonos-factura.component.ts:154 (vía ConsultaDocumentosComponent) | SolicitudPagoComponent | CXP_SOLICITUD_DE_PAGO | 1358 |

## cnt / rrh (38 filas)

**Excluidos** (mismo criterio que `*SelectorDialogComponent` en cxc/cxp, aunque el inventario los
había marcado con `?` en vez de excluirlos directamente — el nombre ya dice "selector de una cuenta"):
`asientos-contables-dinamico.ts:2235`, `mayor-analitico-v2.component.ts:258` y `:273`,
`detalle-plantilla-dialog.component.ts:265`, `reportes-contables.component.ts:292` y `:310`,
`reporte-mayor-analitico.component.ts:164` y `:179` — todos abren `PlanCuentaSelectorDialogComponent`.

| archivo:línea | pantalla hija | constante | valor |
|---|---|---|---|
| asientos-contables-dinamico.ts:2667 | SubdetalleAsientoDialogComponent | CNT_SUBDETALLE_DE_ASIENTO | 1279 |
| asientos-contables-dinamico.ts:2778 | ReporteListadoAsientosComponent | **SIN MAPEAR** | la ruta destino (`reportes/listado-asientos`) tiene DOS nodos en el árbol (CNT_LISTADO_DE_ASIENTOS 1280 bajo Procesos, CNT_REPORTES_LISTADO_DE_ASIENTOS 1284 bajo Reportes) — mismo componente, misma ruta, dos códigos; no hay forma de saber cuál corresponde |
| listado-asientos.component.ts:509, :518, :527 | AsientosContablesDinamico | CNT_ASIENTOS_DINAMICO | 1278 |
| mayor-analitico-v2.component.ts:490 | MayorAnaliticoAsientoDialogComponent | CNT_MAYOR_ANALITICO_V2_ASIENTO_DEL_MAYOR | 1289 |
| centro-arbol.component.ts:272, :305, :342 | CentroArbolFormComponent | CNT_FORMULARIO_CENTRO_ARBOL | 1263 |
| centro-grid.component.ts:223 | CentroGridFormComponent | CNT_FORMULARIO_CENTRO_GRID | 1265 |
| plan-arbol.component.ts:702, :729, :749 | PlanCuentaAddEditComponent | CNT_AGREGAR_EDITAR_CUENTA | 1259 |
| plantilla-general.component.ts:1172 | DetallePlantillaDialogComponent | CNT_DETALLE_DE_PLANTILLA | 1273 |
| plantilla-general.component.ts:994 | — (ruta `/menucontabilidad/asientos` inexistente) | **SIN MAPEAR** | es el bug reportado en el ÍTEM 3 — la ruta no existe, no hay pantalla destino que proteger hasta que se arregle el botón |
| tipo-asiento-general-grid.component.ts:139, :226 | TipoAsientoDialog | CNT_FORMULARIO_TIPO_DE_ASIENTO | 1268 |
| tipo-asiento-sistema-grid.component.ts:141, :230 | TipoAsientoSistemaDialog | CNT_FORMULARIO_TIPO_DE_ASIENTO_SISTEMA | 1270 |
| reporte-listado-asientos.component.ts:717 | AsientosContablesDinamico | CNT_ASIENTOS_DINAMICO | 1278 |
| reporte-mayor-analitico.component.ts:410 | MayorAnaliticoAsientoDialogComponent | CNT_ASIENTO_DEL_MAYOR | 1287 |
| marcaciones.component.ts:291 | ResumenDiarioComponent | RRH_RESUMEN_DIARIO | 1525 |
| resumen-diario.component.ts:267 | HorasExtraComponent | **SIN MAPEAR** | actualizado tras tu decisión del ÍTEM 6: `RRH_HORAS_EXTRA` (1526) y `RRH_PROCESOS_HORAS_EXTRA` (1538) ya son dos permisos legítimos y distintos, pero los dos siguen apuntando a la MISMA ruta (`procesos/horas-extra`) — este `navigate` llega a esa URL, no a un nodo de menú específico, así que sigue sin haber forma estática de saber cuál de los dos aplica acá |
| resumen-diario.component.ts:271 | MarcacionesComponent | RRH_MARCACIONES | 1523 |
| permisos-licencias-list.component.ts:344 | PermisosLicenciasFormComponent | RRH_FORMULARIO_DE_PERMISO | 1520 |
| permisos-licencias-list.component.ts:359 | PermisosAprobacionDialogComponent | RRH_APROBACION_DE_PERMISOS | 1521 |
| vacaciones-list.component.ts:234, :246, :259 | VacacionesFormComponent | RRH_FORMULARIO_DE_VACACIONES | 1517 |
| vacaciones-list.component.ts:440 | VacacionesAprobacionDialogComponent | RRH_APROBACION_DE_VACACIONES | 1518 |
| colaboradores.component.ts:182 | FichaColaboradorComponent | RRH_FICHA_DEL_COLABORADOR | 1513 |
| contrato-form.component.ts:216 | FichaColaboradorComponent | RRH_FICHA_DEL_COLABORADOR | 1513 |
| cuenta-bancaria-form.component.ts:217 | FichaColaboradorComponent | RRH_FICHA_DEL_COLABORADOR | 1513 |
| ficha-colaborador.component.ts:265 | ColaboradoresComponent | RRH_COLABORADORES | 1512 |
| ficha-colaborador.component.ts:231 (vía resumen-colaborador.ts:146) | LiquidacionFormComponent | RRH_FORMULARIO_DE_LIQUIDACION | 1549 |
| seccion-ficha.component.ts:166-171 | ContratoFormComponent **o** CuentaBancariaFormComponent | **SIN MAPEAR** | el destino depende de `seccion.rutaFormulario` (configuración, no estático) — dos candidatos: RRH_FORMULARIO_DE_CONTRATO 1514 / RRH_FORMULARIO_DE_CUENTA_BANCARIA 1515 |
| anticipos.component.ts:135 | AnticipoFormDialogComponent | RRH_FORMULARIO_DE_ANTICIPO | 1553 |
| anticipos.component.ts:183 | AprobarAnticipoDialogComponent | RRH_APROBAR_ANTICIPO | 1554 |
| anticipos.component.ts:208 | MotivoDialogComponent | RRH_ANTICIPOS_A_TRABAJADORES_MOTIVO | 1556 |
| devoluciones-anticipo-dialog.component.ts:123 | MotivoDialogComponent | RRH_ANTICIPOS_A_TRABAJADORES_MOTIVO | 1556 |
| aporte-retencion-list.component.ts:263 | AporteRetencionFormComponent | **SIN MAPEAR** | `AporteRetencionListComponent` (pantalla origen) no tiene nodo en el árbol — su entrada de menú está comentada desde 2026-08-26, sin código asignado |
| liquidacion-form.component.ts:382 | LiquidacionListComponent | RRH_LIQUIDACION | 1548 |
| liquidacion-list.component.ts:130, :134 | LiquidacionFormComponent | RRH_FORMULARIO_DE_LIQUIDACION | 1549 |
| periodo-nomina-dash.component.ts:258 | PrevisualizacionAsientoDialogComponent | RRH_PREVISUALIZACION_DEL_ASIENTO | 1533 |
| periodo-nomina-dash.component.ts:301 | NovedadesIessComponent | RRH_NOVEDADES_DEL_MES_IESS | 1535 |
| periodo-nomina-dash.component.ts:417 | PeriodosNominaComponent | RRH_PERIODOS_DE_NOMINA | 1531 |
| periodos-nomina.component.ts:169 | PeriodoNominaDashComponent | RRH_DASH_DEL_PERIODO | 1532 |
| valores-no-pagados.component.ts:176 | RegistrarValorNoPagadoDialogComponent | RRH_REGISTRAR_VALOR_NO_PAGADO | 1544 |
| valores-no-pagados.component.ts:200 | MotivoDialogComponent | RRH_MOTIVO | 1545 |

## tsr / rpr / dash (18 filas)

| archivo:línea | pantalla hija | constante | valor |
|---|---|---|---|
| anticipos-clientes.component.ts:394 | AnularAnticipoDialogComponent | TSR_ANULAR_ANTICIPO | 1307 |
| anticipos-proveedores.component.ts:449 | AnularAnticipoDialogComponent | TSR_PROVEEDORES_ANULAR_ANTICIPO | 1309 |
| seguimiento-anticipos.component.ts:191 | AnularAnticipoDialogComponent | TSR_SEGUIMIENTO_ANULAR_ANTICIPO | 1311 |
| gastos-caja-chica.component.ts:655 | AdjuntosMovimientoDialogComponent | TSR_ADJUNTOS_DEL_MOVIMIENTO | 1317 |
| cargar-extracto-bancario.component.ts:375 | DetalleExtractoBancarioComponent | TSR_DETALLE_DE_EXTRACTO | 1333 |
| consulta-extractos-bancarios.component.ts:188 | DetalleExtractoBancarioComponent | TSR_DETALLE_DE_EXTRACTO | 1333 |
| detalle-extracto-bancario.component.ts:167 | ConsultaExtractosBancariosComponent | TSR_CONSULTA_DE_EXTRACTOS | 1332 |
| conciliacion-cierre.component.ts:289 | ConsultaComponent (pagos-transferencia) | TSR_CONSULTA_Y_GESTION | 1324 |
| archivo-banco.component.ts:279 | ConfirmacionComponent | TSR_RECEPCION_Y_CONFIRMACION | 1323 |
| archivo-banco.component.ts:283 | ConsultaComponent | TSR_CONSULTA_Y_GESTION | 1324 |
| registro-egreso.component.ts:378 | AprobacionPagosComponent | TSR_APROBACION_DE_PAGOS | 1321 |
| consultas-cheques.component.ts:196 | destino dinámico (3 posibles) | **SIN MAPEAR** | depende de `tipoPago` en runtime: CXP_CONSULTA_DOCUMENTOS(1352) / TSR_EGRESOS(1314) / TSR_PROVEEDORES(1308) |
| cheques-entregados-proc.component.ts:191 | mismo destino dinámico | **SIN MAPEAR** | ídem |
| cheques-generados.component.ts:229 | mismo destino dinámico | **SIN MAPEAR** | ídem |
| cheques-impresos-proc.component.ts:239 | mismo destino dinámico | **SIN MAPEAR** | ídem |
| login.component.ts:454 | CambioClaveDialogComponent | — | fuera del árbol de permisos: pantalla previa al login, no tiene sentido protegerla con un permiso post-sesión |
| login.component.ts:115 | MenuComponent | — | fuera del árbol: es el aterrizaje normal tras autenticar, no una pantalla del árbol de módulos |
| cambio-clave-dialog.component.ts:182 | LoginComponent | — | fuera del árbol: vuelve al login |
| menu.component.ts:26 | LoginComponent | — | fuera del árbol: "Salir", vuelve al login |

`rpr`: sin filas (confirmado en el ÍTEM 3, sin `dialog.open`/`router.navigate`).

---

## Resumen

- **~127 de 149 relaciones mapeadas** con un código único y sin ambigüedad.
- **`SIN MAPEAR` — 17 casos**, agrupados por motivo (para que decidas cuáles ameritan una acción
  tuya y cuáles no):
  - **5 diálogos en cadena de crd** (`AbonoCapitalDialogComponent`/`PrecancelacionDialogComponent`/
    `PagoPrestamoDialogComponent` → sus hijos): el componente es compartido por dos orígenes con
    permisos distintos y el código no sabe cuál lo abrió. Necesita decisión de diseño.
  - **2 ambigüedades "misma ruta, dos nodos del árbol"**: `reportes/listado-asientos` en `cnt`
    (1280 vs. 1284) y `procesos/horas-extra` en `rrh` (1526 vs. 1538). Sobre esta última ya aplicaste
    la corrección del menú en el ÍTEM 6 (`HORAS_EXTRA`/`HORAS_EXTRA_PROCESOS` separadas, confirmado
    con `ng build`) — pero eso resuelve el menú, no el `navigate` de `resumen-diario.component.ts:267`,
    que apunta a la URL compartida y sigue sin poder distinguir cuál de los dos permisos aplica.
  - **1 ambigüedad de configuración en runtime**: `seccion-ficha.component.ts` (rrh), destino según
    dato de configuración, no fijo en código.
  - **4 destinos dinámicos por `tipoPago`** en `tsr` (`consultas-cheques`/`cheques-entregados-proc`/
    `cheques-generados`/`cheques-impresos-proc`), 3 candidatos cada uno.
  - **3 `returnUrl` dinámicos** en `crd` (`participe-info`, `entidad-edit`, `entidad-participe-info`)
    — en la práctica siempre resuelven a un destino ya cubierto por otra fila, pero el código no lo
    fija.
  - **1 navegación relativa sin destino identificable** (`pago-cuotas.component.ts:974`).
  - **2 pantallas de origen sin nodo en el árbol**: `PagosTransferenciaComponent` (cxp, legado, sin
    puerta de entrada) y `AporteRetencionListComponent` (rrh, pantalla a medio construir).
  - **1 bug ya reportado**: `plantilla-general.component.ts:994`, ruta destino inexistente.
- **4 navegaciones fuera del árbol** (login/logout, `tsr`/`dash`): no son pantallas del árbol de
  módulos, no las cuento ni como mapeadas ni como `SIN MAPEAR`.
- **9 diálogos excluidos** en `cnt` que el inventario había marcado con `?` en vez de excluir
  directamente — todos `PlanCuentaSelectorDialogComponent`, mismo criterio que los `*SelectorDialogComponent`
  ya excluidos en cxc/cxp.

Espero tu visto bueno antes de tocar ningún `dialog.open`/`router.navigate`.
