# ÍTEM 5 — Mapeo de los 9 menús contra `Permisos`

**Solo lectura hasta aprobación del árbitro. Ningún archivo de menú fue tocado para este ítem** (más
allá de los 2 nodos ya comentados en el ÍTEM 4, que están fuera de este mapeo).

Metodología: cada opción activa (no comentada) de los 9 árboles del ÍTEM 1 del inventario, contra el
árbol de `docs/seguridad/CODIGOS-PERMISOS-SAA.md`, siguiendo el mismo orden y las etiquetas
normalizadas a mayúsculas que usó el árbitro para generarlo. `archivo:línea` es la línea del nodo
`{ displayName: ..., route: ... }` en el archivo de menú (no la del `route:` cuando difiere de la
línea del `displayName`, salvo que se indique).

**`SIN MAPEAR`** se usa en dos sentidos distintos, marcados explícitamente en cada fila:
- **"Regresar"** (vuelve a `/menu`): no es pantalla de módulo, no tiene ni necesita código.
- **Nodos comentados o sin puerta de entrada activa**: existen en el árbol de permisos con código
  propio (porque el árbitro los generó desde el ÍTEM 2/3 del inventario, algunos alcanzables por
  `navigate` aunque no por menú), pero **no tienen línea de menú que mapear en este ítem** —
  quedan para el ÍTEM 7, no para el 6. Los listo igual, marcados, para que no se pierdan.

---

## cnt — `src/app/modules/cnt/menu/menucontabilidad/menucontabilidad.component.ts`

| displayName | archivo:línea | constante | valor |
|---|---|---|---|
| Parametrización | 15 | CNT_PARAMETRIZACION | 1255 |
| Naturaleza de Cuentas | 20 | CNT_NATURALEZA_DE_CUENTAS | 1256 |
| Plan de Cuentas | 26 | CNT_PLAN_DE_CUENTAS | 1257 |
| Plan Arbol | 31 | CNT_PLAN_ARBOL | 1258 |
| Plan Grid | 37 | CNT_PLAN_GRID | 1260 |
| Centro de Costos | 45 | CNT_CENTRO_DE_COSTOS | 1261 |
| Centro Costos Árbol | 50 | CNT_CENTRO_COSTOS_ARBOL | 1262 |
| Centro Costos Grid | 56 | CNT_CENTRO_COSTOS_GRID | 1264 |
| Tipos de Asientos | 64 | CNT_TIPOS_DE_ASIENTOS | 1266 |
| General (tipos de asiento) | 69 | CNT_GENERAL | 1267 |
| Sistema (tipos de asiento) | 75 | CNT_SISTEMA | 1269 |
| Plantillas | 83 | CNT_PLANTILLAS | 1271 |
| General (plantillas) | 88 | CNT_PLANTILLAS_GENERAL | 1272 |
| Sistema (plantillas) | 94 | CNT_PLANTILLAS_SISTEMA | 1274 |
| Períodos Contables | 102 | CNT_PERIODOS_CONTABLES | 1275 |
| Reportes Contables | 108 | CNT_REPORTES_CONTABLES | 1276 |
| Procesos | 116 | CNT_PROCESOS | 1277 |
| Asientos Dinámico | 121 | CNT_ASIENTOS_DINAMICO | 1278 |
| Listado de Asientos (bajo Procesos) | 127 | CNT_LISTADO_DE_ASIENTOS | 1280 |
| Mayorización - Proceso | 145 | CNT_MAYORIZACION_PROCESO | 1281 |
| Detalle Mayorización | 151 | CNT_DETALLE_MAYORIZACION | 1282 |
| Reportes | 159 | CNT_REPORTES | 1283 |
| Listado de Asientos (bajo Reportes) | 164 | CNT_REPORTES_LISTADO_DE_ASIENTOS | 1284 |
| Balance General | 170 | CNT_BALANCE_GENERAL | 1285 |
| Mayor Analítico | 182 | CNT_MAYOR_ANALITICO | 1286 |
| Mayor Analítico V2 | 188 | CNT_MAYOR_ANALITICO_V2 | 1288 |
| Regresar | 202 | SIN MAPEAR — no es pantalla de módulo | — |

Sin línea de menú activa (comentados, ver ÍTEM 1 del inventario): "Mayorización" (procesos/mayorizacion,
líneas 132-137) y "Estado de Resultados"/"Balance de Prueba" — **ninguno de los tres tiene código en el
árbol**, el árbitro no les asignó uno (consistente con "rutas sin puerta de entrada activa no reciben
nodo").

## tsr — `src/app/modules/tsr/menu/menutesoreria/menutesoreria.component.ts`

| displayName | archivo:línea | constante | valor |
|---|---|---|---|
| Parametrización | 64 | TSR_PARAMETRIZACION | 1291 |
| Bancos | 69 | TSR_BANCOS | 1292 |
| Nacionales y Extranjeros | 74 | TSR_NACIONALES_Y_EXTRANJEROS | 1293 |
| Mis Bancos | 80 | TSR_MIS_BANCOS | 1294 |
| Bancos (hoja, Mis Bancos) | 85 | TSR_MIS_BANCOS_BANCOS | 1295 |
| Cuentas Bancarias | 91 | TSR_CUENTAS_BANCARIAS | 1296 |
| Chequeras | 97 | TSR_CHEQUERAS | 1297 |
| Solicitud Chequera | 102 | TSR_SOLICITUD_CHEQUERA | 1298 |
| Recepción Chequera | 108 | TSR_RECEPCION_CHEQUERA | 1299 |
| Cheques (hoja, Chequeras) | 114 | TSR_CHEQUES | 1300 |
| Titulares | 131 | TSR_TITULARES | 1301 |
| Cajas Chicas | 137 | TSR_CAJAS_CHICAS | 1302 |
| Procesos | 145 | TSR_PROCESOS | 1303 |
| Estado de Cuenta | 150 | TSR_ESTADO_DE_CUENTA | 1304 |
| Anticipos | 156 | TSR_ANTICIPOS | 1305 |
| Clientes | 161 | TSR_CLIENTES | 1306 |
| Proveedores | 167 | TSR_PROVEEDORES | 1308 |
| Seguimiento | 173 | TSR_SEGUIMIENTO | 1310 |
| Registrar | 181 | TSR_REGISTRAR | 1312 |
| Ingresos | 186 | TSR_INGRESOS | 1313 |
| Egresos | 192 | TSR_EGRESOS | 1314 |
| Caja Chica | 286 | TSR_CAJA_CHICA | 1315 |
| Gastos | 291 | TSR_GASTOS | 1316 |
| Reposición | 297 | TSR_REPOSICION | 1318 |
| Cierre | 303 | TSR_CIERRE | 1319 |
| Pagos por transferencia | 311 | TSR_PAGOS_POR_TRANSFERENCIA | 1320 |
| Aprobación de pagos | 319 | TSR_APROBACION_DE_PAGOS | 1321 |
| Generación de archivo | 325 | TSR_GENERACION_DE_ARCHIVO | 1322 |
| Recepción y confirmación | 331 | TSR_RECEPCION_Y_CONFIRMACION | 1323 |
| Consulta y gestión | 337 | TSR_CONSULTA_Y_GESTION | 1324 |
| Cheques (grupo, Procesos) | 345 | TSR_PROCESOS_CHEQUES | 1325 |
| Cheques generados | 355 | TSR_CHEQUES_GENERADOS | 1326 |
| Cheques impresos | 361 | TSR_CHEQUES_IMPRESOS | 1327 |
| Cheques entregados | 367 | TSR_CHEQUES_ENTREGADOS | 1328 |
| Consulta de cheques | 373 | TSR_CONSULTA_DE_CHEQUES | 1329 |
| Extractos Bancarios | 381 | TSR_EXTRACTOS_BANCARIOS | 1330 |
| Cargar Extracto | 386 | TSR_CARGAR_EXTRACTO | 1331 |
| Consulta de Extractos | 392 | TSR_CONSULTA_DE_EXTRACTOS | 1332 |
| Conciliación Contable | 398 | TSR_CONCILIACION_CONTABLE | 1334 |
| Conciliación — Cierre | 404 | TSR_CONCILIACION_CIERRE | 1335 |
| Tablero de Cumplimiento | 410 | TSR_TABLERO_DE_CUMPLIMIENTO | 1336 |
| Regresar | 420 | SIN MAPEAR — no es pantalla de módulo | — |

`TSR_DETALLE_DE_EXTRACTO` (1333) y las 4 de `ANULAR ANTICIPO`/`ADJUNTOS DEL MOVIMIENTO` (1307, 1309,
1311, 1317) tienen código pero **no son nodos de menú** — son destinos de `navigate`/`dialog` (ÍTEM 7).
El bloque "Cobros" (8 pantallas, comentado desde 2026-09-07) **no tiene código** en el árbol — consistente
con "sin puerta de entrada activa".

## cxp — `src/app/modules/cxp/menu/menucuentasxpagar/menucuentasxpagar.component.ts`

| displayName | archivo:línea | constante | valor |
|---|---|---|---|
| Parametrización | 15 | CXP_PARAMETRIZACION | 1338 |
| Grupos de Productos | 20 | CXP_GRUPOS_DE_PRODUCTOS | 1339 |
| Datos SRI | 25 | CXP_DATOS_SRI | 1340 |
| Procesos | 42 | CXP_PROCESOS | 1341 |
| Bandeja Electrónica | 47 | CXP_BANDEJA_ELECTRONICA | 1342 |
| Gestión de Documentos | 52 | CXP_GESTION_DE_DOCUMENTOS | 1343 |
| Consulta Documentos | 57 | CXP_CONSULTA_DOCUMENTOS | 1352 |
| Nota de Venta (Manual) | 62 | CXP_NOTA_DE_VENTA_MANUAL | 1354 |
| Proposición de Pago | 67 | CXP_PROPOSICION_DE_PAGO | 1355 |
| Sustento tributario (ATS) | 72 | CXP_SUSTENTO_TRIBUTARIO_ATS | 1356 |
| Pagos | 79 | CXP_PAGOS | 1357 |
| Solicitud de pago | 84 | CXP_SOLICITUD_DE_PAGO | 1358 |
| Cruce de Anticipo | 92 | CXP_CRUCE_DE_ANTICIPO | 1359 |
| Reportes | 99 | CXP_REPORTES | 1360 |
| Dashboard | 104 | CXP_DASHBOARD | 1361 |
| Negociaciones | 111 | CXP_NEGOCIACIONES | 1362 |
| Administrar Negociaciones | 116 | CXP_ADMINISTRAR_NEGOCIACIONES | 1363 |

No hay "Regresar" en este menú. "Proveedores" (comentado, líneas 30-39) no tiene código — sin puerta
de entrada activa.

## cxc — `src/app/modules/cxc/menu/menucuentasxcobrar/menucuentasxcobrar.component.ts`

| displayName | archivo:línea | constante | valor |
|---|---|---|---|
| Parametrización | 15 | CXC_PARAMETRIZACION | 1368 |
| Grupos de Productos | 20 | CXC_GRUPOS_DE_PRODUCTOS | 1369 |
| Datos Facturador | 24 | CXC_DATOS_FACTURADOR | 1370 |
| Datos SRI | 29 | CXC_DATOS_SRI | 1371 |
| Cobros | 36 | CXC_COBROS | 1372 |
| Registrar Cobro | 41 | CXC_REGISTRAR_COBRO | 1373 |
| Cruce de Anticipo | 46 | CXC_CRUCE_DE_ANTICIPO | 1374 |
| Consulta de Cobros | 51 | CXC_CONSULTA_DE_COBROS | 1375 |
| Emitir | 58 | CXC_EMITIR | 1379 |
| Facturas | 63 | CXC_FACTURAS | 1380 |
| Notas de Crédito | 68 | CXC_NOTAS_DE_CREDITO | 1381 |
| Notas de Débito | 73 | CXC_NOTAS_DE_DEBITO | 1382 |
| Liquidación en Compras | 78 | CXC_LIQUIDACION_EN_COMPRAS | 1383 |
| Retenciones | 83 | CXC_RETENCIONES | 1385 |
| Gestionar | 90 | CXC_GESTIONAR | 1386 |
| Documentos Electrónicos | 95 | CXC_DOCUMENTOS_ELECTRONICOS | 1387 |
| Financiar Factura | 100 | CXC_FINANCIAR_FACTURA | 1391 |
| Reportes | 107 | CXC_REPORTES | 1396 |
| Dashboard de Ventas | 112 | CXC_DASHBOARD_DE_VENTAS | 1397 |
| ATS y Cuadre 103/104 | 117 | CXC_ATS_Y_CUADRE_103_104 | 1398 |

⚠️ **No hay línea de menú para tres nodos que SÍ tienen código**: `CXC_CONSULTA_FACTURAS` (1392, con
su hijo `CXC_CONSULTA_FACTURAS_ANULAR_DOCUMENTO_DE_COMPRA` 1393), `CXC_ANTICIPOS` (1394, con
`CXC_ANTICIPOS_MOTIVO` 1395) y `CXC_ABONOS_A_FACTURA` (1377, con `CXC_ABONOS_A_FACTURA_MOTIVO` 1378).
Coincide con el ÍTEM 2(b) del inventario: `gestionar/facturas`, `gestionar/anticipos` y
`cobros/abonos-factura` tienen ruta real pero ningún menú los enlaza. El árbitro les dio código igual
porque son pantallas reales con puerta de entrada por `navigate` (varias pantallas navegan a ellas —
ÍTEM 3). No hay nada que mapear acá en el ÍTEM 5; van a quedar sin `idPermiso` en el menú de cxc
porque no hay dónde ponerlo.

## rpr — `src/app/modules/rpr/menu/menureportes/menureportes.component.ts`

| displayName | archivo:línea | constante | valor |
|---|---|---|---|
| Créditos | 34 | RPR_CREDITOS | 1493 |
| Super de Bancos | 38 | RPR_SUPER_DE_BANCOS | 1494 |
| Informes Mensuales | 43 | RPR_INFORMES_MENSUALES | 1495 |
| Recursos Humanos | 50 | **RRH_REPORTES_DE_NOMINA** | **1547** |
| Regresar | 55 | SIN MAPEAR — no es pantalla de módulo | — |

⚠️ El nodo "Recursos Humanos" de este menú navega cross-módulo a
`/menurecursoshumanos/procesos/reportes-nomina` — no hay un `RPR_RECURSOS_HUMANOS` en el árbol (el
árbol no anida RECURSOS HUMANOS bajo REPORTES), así que el código correcto es el de la pantalla
destino real, `RRH_REPORTES_DE_NOMINA` (1547), la misma que ya tiene su propio nodo bajo
`RECURSOS HUMANOS > PROCESOS > REPORTES DE NOMINA`. Aplica la regla "una pantalla que ya está en el
menú tiene un solo nodo" — esta es la segunda puerta a la misma pantalla, no una nueva.

## rrh — `src/app/modules/rrh/menu/menurecursoshumanos/menurecursoshumanos.component.ts`

| displayName | archivo:línea | constante | valor |
|---|---|---|---|
| Parametrización | 56 | RRH_PARAMETRIZACION | 1497 |
| Conceptos de nómina | 61 | RRH_CONCEPTOS_DE_NOMINA | 1498 |
| Parámetros anuales | 67 | RRH_PARAMETROS_ANUALES | 1499 |
| Tabla de impuesto a la renta | 73 | RRH_TABLA_DE_IMPUESTO_A_LA_RENTA | 1500 |
| Topes de gastos personales | 79 | RRH_TOPES_DE_GASTOS_PERSONALES | 1501 |
| Causales de terminación | 85 | RRH_CAUSALES_DE_TERMINACION | 1502 |
| Configuración de nómina | 91 | RRH_CONFIGURACION_DE_NOMINA | 1503 |
| Formatos de marcación | 97 | RRH_FORMATOS_DE_MARCACION | 1504 |
| Formatos del archivo bancario | 103 | RRH_FORMATOS_DEL_ARCHIVO_BANCARIO | 1505 |
| Departamentos | 109 | RRH_DEPARTAMENTOS | 1506 |
| Cargos y puestos | 115 | RRH_CARGOS_Y_PUESTOS | 1507 |
| Departamento — Cargo | 121 | RRH_DEPARTAMENTO_CARGO | 1508 |
| Tipos de contrato | 127 | RRH_TIPOS_DE_CONTRATO | 1509 |
| Turnos y horarios | 133 | RRH_TURNOS_Y_HORARIOS | 1510 |
| Personal | 140 | RRH_PERSONAL | 1511 |
| Colaboradores | 145 | RRH_COLABORADORES | 1512 |
| Vacaciones | 151 | RRH_VACACIONES | 1516 |
| Permisos y licencias | 157 | RRH_PERMISOS_Y_LICENCIAS | 1519 |
| Asistencia | 165 | RRH_ASISTENCIA | 1522 |
| Marcaciones | 170 | RRH_MARCACIONES | 1523 |
| Importación de marcaciones | 176 | RRH_IMPORTACION_DE_MARCACIONES | 1524 |
| Resumen diario | 182 | RRH_RESUMEN_DIARIO | 1525 |
| Horas extra (Asistencia) | 188 | RRH_HORAS_EXTRA | 1526 |
| Migración de apertura | 196 | RRH_MIGRACION_DE_APERTURA | 1527 |
| Saldos de apertura | 201 | RRH_SALDOS_DE_APERTURA | 1528 |
| Acumulados | 207 | RRH_ACUMULADOS | 1529 |
| Procesos | 215 | RRH_PROCESOS | 1530 |
| Períodos de nómina | 220 | RRH_PERIODOS_DE_NOMINA | 1531 |
| Novedades del período | 226 | RRH_NOVEDADES_DEL_PERIODO | 1534 |
| Novedades del mes (IESS) | 232 | RRH_NOVEDADES_DEL_MES_IESS | 1535 |
| Planilla de control (IESS) | 238 | RRH_PLANILLA_DE_CONTROL_IESS | 1536 |
| Planillas del IESS | 244 | RRH_PLANILLAS_DEL_IESS | 1537 |
| Horas extra (Procesos, duplicado) | 250 | RRH_PROCESOS_HORAS_EXTRA | 1538 |
| Proyección de impuesto a la renta | 256 | RRH_PROYECCION_DE_IMPUESTO_A_LA_RENTA | 1539 |
| Descuentos recurrentes | 262 | RRH_DESCUENTOS_RECURRENTES | 1540 |
| Roles de pago | 268 | RRH_ROLES_DE_PAGO | 1541 |
| Órdenes de pago | 274 | RRH_ORDENES_DE_PAGO | 1542 |
| Valores no pagados | 280 | RRH_VALORES_NO_PAGADOS | 1543 |
| Pago de beneficios sociales | 286 | RRH_PAGO_DE_BENEFICIOS_SOCIALES | 1546 |
| Reportes de nómina | 292 | RRH_REPORTES_DE_NOMINA | 1547 |
| Liquidación | 327 | RRH_LIQUIDACION | 1548 |
| Salidas oficiales | 333 | RRH_SALIDAS_OFICIALES | 1550 |
| Reparto de utilidades | 339 | RRH_REPARTO_DE_UTILIDADES | 1551 |
| Anticipos a trabajadores | 345 | RRH_ANTICIPOS_A_TRABAJADORES | 1552 |
| Acreditar vacaciones | 351 | RRH_ACREDITAR_VACACIONES | 1557 |
| Regresar | 359 | SIN MAPEAR — no es pantalla de módulo | — |

"Aportes y retenciones" (comentado, líneas 298-326) no tiene código — sin puerta de entrada activa.
**Este es el módulo del ÍTEM 6 (reescribir `permisos-rrh.ts`)** — el mapeo de arriba es el que va a
usar ese archivo.

## crd — `src/app/modules/crd/menucreditos/menucreditos.component.ts`

| displayName | archivo:línea | constante | valor |
|---|---|---|---|
| Historicos | 15 | CRD_HISTORICOS | 1400 |
| DELTA21 | 20 | CRD_DELTA21 | 1401 |
| Aportes Por Revisar | 25 | CRD_APORTES_POR_REVISAR | 1402 |
| Participes Inicial | 30 | CRD_PARTICIPES_INICIAL | 1403 |
| Parametrización | 37 | CRD_PARAMETRIZACION | 1404 |
| Info. General Fondo | 42 | CRD_INFORMACION_GENERAL_DEL_FONDO | 1405 |
| Tipos | 47 | CRD_TIPOS | 1406 |
| Estados | 52 | CRD_ESTADOS | 1407 |
| Listados | 57 | CRD_LISTADOS | 1408 |
| Bandas de Cartera *(condicional, solo usuario 1, en `constructor()`)* | 301 | CRD_BANDAS_DE_CARTERA | 1410 |
| Escala de Calificación de Riesgo *(condicional)* | 306 | CRD_ESCALA_DE_CALIFICACION_DE_RIESGO | 1411 |
| Cierre de Cartera *(condicional)* | 311 | CRD_CIERRE_DE_CARTERA | 1412 |
| Contabilidad de CRD *(condicional)* | 316 | CRD_CONTABILIDAD_DE_CREDITOS | 1413 |
| Cuentas por Tipo de Aporte *(condicional)* | 321 | CRD_CUENTAS_POR_TIPO_DE_APORTE | 1414 |
| Participes | 66 | CRD_PARTICIPES | 1415 |
| Administrar | 71 | CRD_ADMINISTRAR | 1416 |
| Consulta | 76 | CRD_CONSULTA | 1417 |
| Listado General | 81 | CRD_LISTADO_GENERAL | 1419 |
| Consolidado | 86 | CRD_CONSOLIDADO | 1420 |
| Jubilados | 91 | CRD_JUBILADOS | 1429 |
| Jubilar Participe | 96 | CRD_JUBILAR_PARTICIPE | 1430 |
| Pago Jubilados | 101 | CRD_PAGO_JUBILADOS | 1431 |
| Contratos | 110 | CRD_CONTRATOS | 1432 |
| Ingreso | 115 | CRD_INGRESO | 1433 |
| Administrar (contratos) | 120 | CRD_CONTRATOS_ADMINISTRAR | 1434 |
| Dash (contratos) | 125 | CRD_DASH | 1435 |
| Prestamos | 132 | CRD_PRESTAMOS | 1437 |
| Ingreso (préstamos) | 137 | CRD_PRESTAMOS_INGRESO | 1438 |
| Consulta (préstamos) | 142 | CRD_PRESTAMOS_CONSULTA | 1439 |
| Dash (préstamos) | 147 | CRD_PRESTAMOS_DASH | 1441 |
| Consulta Cuotas | 152 | CRD_CONSULTA_CUOTAS | 1442 |
| Repote Valores Insolutos | 157 | CRD_REPORTE_VALORES_INSOLUTOS | 1444 |
| Asignación de Seguros | 162 | CRD_ASIGNACION_DE_SEGUROS | 1445 |
| Cobros | 169 | CRD_COBROS | 1447 |
| Archivos Petro | 180 | CRD_ARCHIVOS_PETRO | 1448 |
| Carga | 185 | CRD_CARGA | 1449 |
| Carga Aportes (→ carga-aportes-back) | 189 | CRD_CARGA_APORTES | 1450 |
| Consulta Carga | 194 | CRD_CONSULTA_CARGA | 1451 |
| Generar | 201 | CRD_GENERAR | 1460 |
| Generar Archivo | 206 | CRD_GENERAR_ARCHIVO | 1461 |
| Consulta Generación | 211 | CRD_CONSULTA_GENERACION | 1462 |
| Pago Cuota | 220 | CRD_PAGO_CUOTA | 1464 |
| Cruce de Valores | 225 | CRD_CRUCE_DE_VALORES | 1466 |
| Devolución de Aportes | 230 | CRD_DEVOLUCION_DE_APORTES | 1476 |
| Cobros Personales | 235 | CRD_COBROS_PERSONALES | 1477 |
| Bandeja de Contabilidad | 240 | CRD_BANDEJA_DE_CONTABILIDAD | 1483 |
| Auditoría de Bandas | 245 | CRD_AUDITORIA_DE_BANDAS | 1484 |
| Proceso de Crédito | 250 | CRD_PROCESO_DE_CREDITO | 1485 |
| Consulta de Cobros | 255 | CRD_CONSULTA_DE_COBROS | 1486 |
| Seguimiento de Cobros | 260 | CRD_SEGUIMIENTO_DE_COBROS | 1487 |
| Condonación de Valores | 265 | CRD_CONDONACION_DE_VALORES | 1488 |
| Simuladores | 277 | CRD_SIMULADORES | 1489 |
| Crédito Nuevo | 282 | CRD_CREDITO_NUEVO | 1490 |
| Préstamo Existente | 287 | CRD_PRESTAMO_EXISTENTE | 1491 |

Sin línea de menú (recién comentadas en el ÍTEM 4): "Archivos Descuentos" y "Dash" (bajo Cobros) — no
aplica código de menú, quedaron sin `idPermiso` por decisión del usuario. `CRD_DASH_DEL_PARTICIPE`
(1424) y sus 3 hijos (1425-1427) sí tienen código porque `ParticipeDashComponent` sigue alcanzable por
`navigate` — van al ÍTEM 7, no a este.

No hay "Regresar" en este menú.

---

## Resumen

- **~127 opciones de menú mapeadas** con certeza, ninguna `SIN MAPEAR` por duda — el mapeo fue
  mecánico como anticipaste, la única normalización real fue la de mayúsculas y los 4 casos que ya
  mencionaste (`Info. General Fondo`, `Repote Valores Insolutos`, `Contabilidad de CRD`,
  `Nota de Venta (Manual)` — este último en cxp).
- **3 pares "Regresar"** (cnt, rpr, rrh) sin código, no son pantalla.
- **1 caso cross-módulo real**: "Recursos Humanos" del menú `rpr` mapea a `RRH_REPORTES_DE_NOMINA`
  (1547), no a un código propio de `rpr` — no existe nodo `RPR > RECURSOS HUMANOS` en el árbol.
- **3 pantallas de cxc con código pero sin ninguna línea de menú que las use** (`CXC_CONSULTA_FACTURAS`
  1392, `CXC_ANTICIPOS` 1394, `CXC_ABONOS_A_FACTURA` 1377) — coincide con el ÍTEM 2(b) del inventario,
  quedan sin `idPermiso` de menú por no tener dónde ponerlo.

Espero tu visto bueno antes de tocar los 9 archivos de menú (ÍTEM 6).
