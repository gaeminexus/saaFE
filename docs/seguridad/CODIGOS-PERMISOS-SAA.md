# Códigos de permiso del árbol de SAA

**Generado:** 2026-09-10 · equipo `lap-saa-1` · **Fuente:** `docs/logica-negocio/seguridad/sql/lap1-15-arbol-permisos-saa.sql`

Cada línea es un nodo de `SCP.PJRQ` con `PGSPCDGO = 11`. El número de la derecha es el
`PJRQCDGO` — **el `idPermiso` que va en el menú** y el que se le pasa al endpoint:

```
GET /rest/usro/verificaPermiso/{idEmpresa}/{idUsuario}/{idPermiso}   ->  'OK' | mensaje
```

**305 nodos, ids 1253 a 1557.** Los ids están quemados en el script: son fijos y no
dependen de ninguna secuencia.

> ⚠️ **Este archivo describe lo que el `lap1-15` inserta. Mientras ese script no se
> haya corrido, estos códigos no existen en la base** y toda verificación contra
> ellos va a decir que no hay permiso.

## Cómo se armó

- **Un nodo por pantalla, nunca por botón.** La excepción es un botón que abre otra
  pantalla (un diálogo con formulario, o un `router.navigate` a otra ruta): esa
  pantalla hija sí es nodo y cuelga de la que la abre.
- **Una pantalla que ya está en el menú tiene un solo nodo**, en su lugar del menú.
  Que otra pantalla navegue hacia ella no le crea un segundo nodo.
- **Las rutas sin puerta de entrada** —ni menú, ni `navigate`— **no reciben nodo.**
- Excluidos: diálogos de confirmación, selectores de un valor, visores de PDF.

## El árbol

```
SAA                                                     1253
  CONTABILIDAD                                          1254
    PARAMETRIZACION                                     1255
      NATURALEZA DE CUENTAS                             1256
      PLAN DE CUENTAS                                   1257
        PLAN ARBOL                                      1258
          AGREGAR/EDITAR CUENTA                         1259
        PLAN GRID                                       1260
      CENTRO DE COSTOS                                  1261
        CENTRO COSTOS ARBOL                             1262
          FORMULARIO CENTRO ARBOL                       1263
        CENTRO COSTOS GRID                              1264
          FORMULARIO CENTRO GRID                        1265
      TIPOS DE ASIENTOS                                 1266
        GENERAL                                         1267
          FORMULARIO TIPO DE ASIENTO                    1268
        SISTEMA                                         1269
          FORMULARIO TIPO DE ASIENTO SISTEMA            1270
      PLANTILLAS                                        1271
        GENERAL                                         1272
          DETALLE DE PLANTILLA                          1273
        SISTEMA                                         1274
      PERIODOS CONTABLES                                1275
      REPORTES CONTABLES                                1276
    PROCESOS                                            1277
      ASIENTOS DINAMICO                                 1278
        SUBDETALLE DE ASIENTO                           1279
      LISTADO DE ASIENTOS                               1280
      MAYORIZACION - PROCESO                            1281
      DETALLE MAYORIZACION                              1282
    REPORTES                                            1283
      LISTADO DE ASIENTOS                               1284
      BALANCE GENERAL                                   1285
      MAYOR ANALITICO                                   1286
        ASIENTO DEL MAYOR                               1287
      MAYOR ANALITICO V2                                1288
        ASIENTO DEL MAYOR                               1289
  TESORERIA                                             1290
    PARAMETRIZACION                                     1291
      BANCOS                                            1292
        NACIONALES Y EXTRANJEROS                        1293
        MIS BANCOS                                      1294
          BANCOS                                        1295
          CUENTAS BANCARIAS                             1296
          CHEQUERAS                                     1297
            SOLICITUD CHEQUERA                          1298
            RECEPCION CHEQUERA                          1299
            CHEQUES                                     1300
      TITULARES                                         1301
      CAJAS CHICAS                                      1302
    PROCESOS                                            1303
      ESTADO DE CUENTA                                  1304
      ANTICIPOS                                         1305
        CLIENTES                                        1306
          ANULAR ANTICIPO                               1307
        PROVEEDORES                                     1308
          ANULAR ANTICIPO                               1309
        SEGUIMIENTO                                     1310
          ANULAR ANTICIPO                               1311
      REGISTRAR                                         1312
        INGRESOS                                        1313
        EGRESOS                                         1314
      CAJA CHICA                                        1315
        GASTOS                                          1316
          ADJUNTOS DEL MOVIMIENTO                       1317
        REPOSICION                                      1318
        CIERRE                                          1319
      PAGOS POR TRANSFERENCIA                           1320
        APROBACION DE PAGOS                             1321
        GENERACION DE ARCHIVO                           1322
        RECEPCION Y CONFIRMACION                        1323
        CONSULTA Y GESTION                              1324
      CHEQUES                                           1325
        CHEQUES GENERADOS                               1326
        CHEQUES IMPRESOS                                1327
        CHEQUES ENTREGADOS                              1328
        CONSULTA DE CHEQUES                             1329
      EXTRACTOS BANCARIOS                               1330
        CARGAR EXTRACTO                                 1331
        CONSULTA DE EXTRACTOS                           1332
        DETALLE DE EXTRACTO                             1333
        CONCILIACION CONTABLE                           1334
        CONCILIACION - CIERRE                           1335
        TABLERO DE CUMPLIMIENTO                         1336
  CUENTAS POR PAGAR                                     1337
    PARAMETRIZACION                                     1338
      GRUPOS DE PRODUCTOS                               1339
      DATOS SRI                                         1340
    PROCESOS                                            1341
      BANDEJA ELECTRONICA                               1342
      GESTION DE DOCUMENTOS                             1343
        CLASIFICAR PRODUCTOS                            1344
        SUBIR XML                                       1345
        REGISTRAR DOCUMENTO                             1346
        MOTIVO                                          1347
        REEMBOLSOS DE FACTURA                           1348
        REGISTRO DE BLOQUEANTES                         1349
        ERROR DE REGISTRO                               1350
        ERROR DE VALIDACION XML                         1351
      CONSULTA DOCUMENTOS                               1352
        ANULAR DOCUMENTO DE COMPRA                      1353
      NOTA DE VENTA MANUAL                              1354
      PROPOSICION DE PAGO                               1355
      SUSTENTO TRIBUTARIO ATS                           1356
    PAGOS                                               1357
      SOLICITUD DE PAGO                                 1358
      CRUCE DE ANTICIPO                                 1359
    REPORTES                                            1360
      DASHBOARD                                         1361
    NEGOCIACIONES                                       1362
      ADMINISTRAR NEGOCIACIONES                         1363
        DETALLE DE NEGOCIACION                          1364
          PAGO                                          1365
          ADENDUM                                       1366
  CUENTAS POR COBRAR                                    1367
    PARAMETRIZACION                                     1368
      GRUPOS DE PRODUCTOS                               1369
      DATOS FACTURADOR                                  1370
      DATOS SRI                                         1371
    COBROS                                              1372
      REGISTRAR COBRO                                   1373
      CRUCE DE ANTICIPO                                 1374
      CONSULTA DE COBROS                                1375
        MOTIVO                                          1376
      ABONOS A FACTURA                                  1377
        MOTIVO                                          1378
    EMITIR                                              1379
      FACTURAS                                          1380
      NOTAS DE CREDITO                                  1381
      NOTAS DE DEBITO                                   1382
      LIQUIDACION EN COMPRAS                            1383
        ANULAR DOCUMENTO DE COMPRA                      1384
      RETENCIONES                                       1385
    GESTIONAR                                           1386
      DOCUMENTOS ELECTRONICOS                           1387
        ANULAR DOCUMENTO DE COMPRA                      1388
        ACTUALIZAR ESTADO RESULTADO                     1389
        CONSULTA AL SRI                                 1390
      FINANCIAR FACTURA                                 1391
      CONSULTA FACTURAS                                 1392
        ANULAR DOCUMENTO DE COMPRA                      1393
      ANTICIPOS                                         1394
        MOTIVO                                          1395
    REPORTES                                            1396
      DASHBOARD DE VENTAS                               1397
      ATS Y CUADRE 103/104                              1398
  CREDITOS                                              1399
    HISTORICOS                                          1400
      DELTA21                                           1401
      APORTES POR REVISAR                               1402
      PARTICIPES INICIAL                                1403
    PARAMETRIZACION                                     1404
      INFORMACION GENERAL DEL FONDO                     1405
      TIPOS                                             1406
      ESTADOS                                           1407
      LISTADOS                                          1408
        PROCESOS VARIOS                                 1409
      BANDAS DE CARTERA                                 1410
      ESCALA DE CALIFICACION DE RIESGO                  1411
      CIERRE DE CARTERA                                 1412
      CONTABILIDAD DE CREDITOS                          1413
      CUENTAS POR TIPO DE APORTE                        1414
    PARTICIPES                                          1415
      ADMINISTRAR                                       1416
      CONSULTA                                          1417
        AUDITORIA                                       1418
      LISTADO GENERAL                                   1419
      CONSOLIDADO                                       1420
      EDICION DE PARTICIPE                              1421
      INFORMACION DEL PARTICIPE                         1422
        HISTORICO DE EXTERNOS                           1423
      DASH DEL PARTICIPE                                1424
        AUDITORIA                                       1425
        PAGOS DEL APORTE                                1426
        PAGOS DEL PRESTAMO                              1427
      CERTIFICADOS DEL PARTICIPE                        1428
      JUBILADOS                                         1429
        JUBILAR PARTICIPE                               1430
        PAGO JUBILADOS                                  1431
    CONTRATOS                                           1432
      INGRESO                                           1433
      ADMINISTRAR                                       1434
      DASH                                              1435
      APORTES DASH                                      1436
    PRESTAMOS                                           1437
      INGRESO                                           1438
      CONSULTA                                          1439
        DETALLE DEL PRESTAMO                            1440
      DASH                                              1441
      CONSULTA CUOTAS                                   1442
        DETALLE DEL PRESTAMO                            1443
      REPORTE VALORES INSOLUTOS                         1444
      ASIGNACION DE SEGUROS                             1445
        ASIGNAR SEGURO                                  1446
    COBROS                                              1447
      ARCHIVOS PETRO                                    1448
        CARGA                                           1449
          CARGA APORTES                                 1450
          CONSULTA CARGA                                1451
          DETALLE DE CARGA                              1452
            COINCIDENCIAS DE ENTIDAD                    1453
            ERROR DEL PROCESO DE ARCHIVO                1454
            AFECTACION FINANCIERA DE CUOTAS             1455
            REVALIDAR CARGA                             1456
          AFECTACION POR PARTICIPE                      1457
            AFECTACION DEL PARTICIPE                    1458
            REVALIDAR CARGA                             1459
        GENERAR                                         1460
          GENERAR ARCHIVO                               1461
          CONSULTA GENERACION                           1462
          DETALLE DE GENERACION                         1463
      PAGO CUOTA                                        1464
        PAGO DE CUOTA                                   1465
      CRUCE DE VALORES                                  1466
        PAGO DE PRESTAMO                                1467
          COBRO REGISTRADO                              1468
          RECIBO DE OPERACION                           1469
        ABONO A CAPITAL                                 1470
          COBRO REGISTRADO                              1471
        PRECANCELACION                                  1472
          COBRO REGISTRADO                              1473
          RECIBO DE OPERACION                           1474
        RECIBO DE OPERACION                             1475
      DEVOLUCION DE APORTES                             1476
      COBROS PERSONALES                                 1477
        PAGO DE PRESTAMO                                1478
        ABONO A CAPITAL                                 1479
        PRECANCELACION                                  1480
        COBRO REGISTRADO                                1481
        RECIBO DE OPERACION                             1482
      BANDEJA DE CONTABILIDAD                           1483
      AUDITORIA DE BANDAS                               1484
      PROCESO DE CREDITO                                1485
      CONSULTA DE COBROS                                1486
      SEGUIMIENTO DE COBROS                             1487
      CONDONACION DE VALORES                            1488
    SIMULADORES                                         1489
      CREDITO NUEVO                                     1490
      PRESTAMO EXISTENTE                                1491
  REPORTES                                              1492
    CREDITOS                                            1493
      SUPER DE BANCOS                                   1494
      INFORMES MENSUALES                                1495
  RECURSOS HUMANOS                                      1496
    PARAMETRIZACION                                     1497
      CONCEPTOS DE NOMINA                               1498
      PARAMETROS ANUALES                                1499
      TABLA DE IMPUESTO A LA RENTA                      1500
      TOPES DE GASTOS PERSONALES                        1501
      CAUSALES DE TERMINACION                           1502
      CONFIGURACION DE NOMINA                           1503
      FORMATOS DE MARCACION                             1504
      FORMATOS DEL ARCHIVO BANCARIO                     1505
      DEPARTAMENTOS                                     1506
      CARGOS Y PUESTOS                                  1507
      DEPARTAMENTO - CARGO                              1508
      TIPOS DE CONTRATO                                 1509
      TURNOS Y HORARIOS                                 1510
    PERSONAL                                            1511
      COLABORADORES                                     1512
      FICHA DEL COLABORADOR                             1513
        FORMULARIO DE CONTRATO                          1514
        FORMULARIO DE CUENTA BANCARIA                   1515
      VACACIONES                                        1516
        FORMULARIO DE VACACIONES                        1517
        APROBACION DE VACACIONES                        1518
      PERMISOS Y LICENCIAS                              1519
        FORMULARIO DE PERMISO                           1520
        APROBACION DE PERMISOS                          1521
    ASISTENCIA                                          1522
      MARCACIONES                                       1523
      IMPORTACION DE MARCACIONES                        1524
      RESUMEN DIARIO                                    1525
      HORAS EXTRA                                       1526
    MIGRACION DE APERTURA                               1527
      SALDOS DE APERTURA                                1528
      ACUMULADOS                                        1529
    PROCESOS                                            1530
      PERIODOS DE NOMINA                                1531
        DASH DEL PERIODO                                1532
          PREVISUALIZACION DEL ASIENTO                  1533
      NOVEDADES DEL PERIODO                             1534
      NOVEDADES DEL MES IESS                            1535
      PLANILLA DE CONTROL IESS                          1536
      PLANILLAS DEL IESS                                1537
      HORAS EXTRA                                       1538
      PROYECCION DE IMPUESTO A LA RENTA                 1539
      DESCUENTOS RECURRENTES                            1540
      ROLES DE PAGO                                     1541
      ORDENES DE PAGO                                   1542
      VALORES NO PAGADOS                                1543
        REGISTRAR VALOR NO PAGADO                       1544
        MOTIVO                                          1545
      PAGO DE BENEFICIOS SOCIALES                       1546
      REPORTES DE NOMINA                                1547
      LIQUIDACION                                       1548
        FORMULARIO DE LIQUIDACION                       1549
      SALIDAS OFICIALES                                 1550
      REPARTO DE UTILIDADES                             1551
      ANTICIPOS A TRABAJADORES                          1552
        FORMULARIO DE ANTICIPO                          1553
        APROBAR ANTICIPO                                1554
        DEVOLUCION DE ANTICIPO                          1555
        MOTIVO                                          1556
      ACREDITAR VACACIONES                              1557
```
