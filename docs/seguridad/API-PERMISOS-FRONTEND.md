# CONTRATO — Verificación de permisos en el frontend de SAA

**Escrito:** 2026-09-10 · equipo `lap-saa-1` · **Congelado contra el código real, no contra planes.**

Espejo en `saaFE/docs/seguridad/API-PERMISOS-FRONTEND.md`. El original vive en `saaBE`.

---

## 1. El endpoint

```
GET /rest/usro/verificaPermiso/{idEmpresa}/{idUsuario}/{idPermiso}
```

| | |
|---|---|
| Backend | `UsuarioRest.java:116-125` → SP `scp.pc_crct_espc.pr_vrfc_prms_susr` |
| Respuesta | **`text/plain`**, código **200 siempre** |
| Cuerpo | `'OK'` si tiene permiso · cualquier otro texto = el motivo de la negación |

⚠️ **El 200 no significa que tenga permiso.** La decisión está en el cuerpo, no en el status.

⚠️ **`MensajeErrorJsonFilter` NO envuelve esta respuesta.** Su javadoc nombra explícitamente a
`verificaPermiso` entre los que declaran `TEXT_PLAIN` a propósito. La comparación `result === 'OK'`
es correcta tal como está. No "arreglar" esto convirtiéndolo a JSON.

**Los parámetros salen de la sesión**, ya disponibles: `usuarioService.getEmpresaLog().codigo` y
`usuarioService.getUsuarioLog().codigo`.

## 2. El interruptor general

Rubro **código alterno 7** (`MANEJA PERMISO (SI = 1, NO = 0)`) / detalle **código alterno 1**.
`0` = no se validan permisos · `1` = sí.

```
GET /rest/pdtr/getRubros/7        ->  DetalleRubro[]   (DetalleRubroRest.java:55-66)
```

Devuelve los detalles del rubro 7 como entidades completas. Se busca el que tiene
`codigoAlterno === 1`.

> ### 🔴 Trampa medida: el valor NO está donde el nombre sugiere
>
> Hoy en producción esa fila tiene **`descripcion = '0'`** y **`valorAlfanumerico` vacío**.
> El único lector del backend (`DetalleRubroDaoServiceImpl:100-104`) devuelve `valorAlfanumerico`,
> así que **leería vacío**. Está pendiente decidir si se mueve el dato o se cambia el lector.
>
> **Hasta que se decida, el frontend lee los dos, en este orden:**
> `valorAlfanumerico` si viene con contenido; si no, `descripcion`.
>
> No es tolerancia por las dudas: es que el dato existe en una de las dos columnas y no sabemos
> todavía en cuál va a quedar. Cuando se decida, esta regla sigue funcionando sin tocar nada.

**Si el interruptor no se puede leer** (error de red, rubro ausente): **se asume `0`, o sea no
validar**. Un fallo de infraestructura no puede dejar a todo el mundo afuera del sistema.

**Se consulta UNA vez por sesión y se cachea.** No una vez por clic.

## 3. Cómo se aplica

Tres reglas, y ninguna es opcional:

1. **Nunca copiar la llamada HTTP en cada lugar.** Va un servicio único
   (`shared/services/permisos.service.ts`) y todos los puntos de uso pasan por él. Son ~290 puntos
   de uso: repetir el bloque es garantía de que dentro de un mes haya diez variantes distintas.
2. **Un `idPermiso` ausente NO bloquea.** Si un botón todavía no tiene código asignado, se ejecuta
   como hoy. La activación es incremental.
3. **Se verifica ANTES de abrir**, nunca después. Ni el diálogo se abre y luego se cierra, ni la
   navegación ocurre y luego se vuelve.

**Cuando se niega**, se muestra el texto que devolvió el backend en el `snackBar` que ya existe
(`openSnackBar` de `menu-list.component.ts`), en mayúsculas. No un mensaje propio: el motivo lo
decide el módulo de seguridades y puede cambiar sin tocar el frontend.

## 4. Dónde se aplica

| Caso | Qué se hace |
|---|---|
| Opción de menú (hoja) | Verificar antes de `router.navigate` |
| Grupo de menú | Tiene código, pero **no se verifica al expandir** — expandir no da acceso a nada |
| Botón que abre un diálogo con formulario | Verificar antes de `dialog.open` |
| Botón que navega a otra pantalla | Verificar antes de `router.navigate` |
| Botón de insertar / editar / guardar / excel | **No se toca.** El mapeo es a nivel de pantalla |
| Diálogo de confirmación, selector de un valor, visor de PDF | **No se toca.** No son pantallas |

## 5. Los códigos

**305 constantes, ids 1253 a 1557.** Salen de `SCP.PJRQ` con `PGSPCDGO = 11`, insertadas por
`docs/logica-negocio/seguridad/sql/lap1-15-arbol-permisos-saa.sql`.

⚠️ **Mientras ese script no se haya corrido, estos códigos no existen en la base.** Con el
interruptor en `0` eso no molesta; con el interruptor en `1` y los códigos ausentes, el SP va a
negar todo. **El orden es: primero el `.sql`, después subir el interruptor.**

El nombre de cada constante es `MODULO_` + los últimos segmentos de su ruta en el árbol, los
necesarios para que sea único. El comentario de cada línea trae la ruta completa, que es la que hay
que usar para decidir a qué opción de menú o a qué botón corresponde.

```typescript
export class Permisos {
  public static readonly SAA                                                    = 1253;   // SAA
  public static readonly CNT                                                    = 1254;   // SAA > CONTABILIDAD
  public static readonly CNT_PARAMETRIZACION                                    = 1255;   // SAA > CONTABILIDAD > PARAMETRIZACION
  public static readonly CNT_NATURALEZA_DE_CUENTAS                              = 1256;   // SAA > CONTABILIDAD > PARAMETRIZACION > NATURALEZA DE CUENTAS
  public static readonly CNT_PLAN_DE_CUENTAS                                    = 1257;   // SAA > CONTABILIDAD > PARAMETRIZACION > PLAN DE CUENTAS
  public static readonly CNT_PLAN_ARBOL                                         = 1258;   // SAA > CONTABILIDAD > PARAMETRIZACION > PLAN DE CUENTAS > PLAN ARBOL
  public static readonly CNT_AGREGAR_EDITAR_CUENTA                              = 1259;   // SAA > CONTABILIDAD > PARAMETRIZACION > PLAN DE CUENTAS > PLAN ARBOL > AGREGAR/EDITAR CUENTA
  public static readonly CNT_PLAN_GRID                                          = 1260;   // SAA > CONTABILIDAD > PARAMETRIZACION > PLAN DE CUENTAS > PLAN GRID
  public static readonly CNT_CENTRO_DE_COSTOS                                   = 1261;   // SAA > CONTABILIDAD > PARAMETRIZACION > CENTRO DE COSTOS
  public static readonly CNT_CENTRO_COSTOS_ARBOL                                = 1262;   // SAA > CONTABILIDAD > PARAMETRIZACION > CENTRO DE COSTOS > CENTRO COSTOS ARBOL
  public static readonly CNT_FORMULARIO_CENTRO_ARBOL                            = 1263;   // SAA > CONTABILIDAD > PARAMETRIZACION > CENTRO DE COSTOS > CENTRO COSTOS ARBOL > FORMULARIO CENTRO ARBOL
  public static readonly CNT_CENTRO_COSTOS_GRID                                 = 1264;   // SAA > CONTABILIDAD > PARAMETRIZACION > CENTRO DE COSTOS > CENTRO COSTOS GRID
  public static readonly CNT_FORMULARIO_CENTRO_GRID                             = 1265;   // SAA > CONTABILIDAD > PARAMETRIZACION > CENTRO DE COSTOS > CENTRO COSTOS GRID > FORMULARIO CENTRO GRID
  public static readonly CNT_TIPOS_DE_ASIENTOS                                  = 1266;   // SAA > CONTABILIDAD > PARAMETRIZACION > TIPOS DE ASIENTOS
  public static readonly CNT_GENERAL                                            = 1267;   // SAA > CONTABILIDAD > PARAMETRIZACION > TIPOS DE ASIENTOS > GENERAL
  public static readonly CNT_FORMULARIO_TIPO_DE_ASIENTO                         = 1268;   // SAA > CONTABILIDAD > PARAMETRIZACION > TIPOS DE ASIENTOS > GENERAL > FORMULARIO TIPO DE ASIENTO
  public static readonly CNT_SISTEMA                                            = 1269;   // SAA > CONTABILIDAD > PARAMETRIZACION > TIPOS DE ASIENTOS > SISTEMA
  public static readonly CNT_FORMULARIO_TIPO_DE_ASIENTO_SISTEMA                 = 1270;   // SAA > CONTABILIDAD > PARAMETRIZACION > TIPOS DE ASIENTOS > SISTEMA > FORMULARIO TIPO DE ASIENTO SISTEMA
  public static readonly CNT_PLANTILLAS                                         = 1271;   // SAA > CONTABILIDAD > PARAMETRIZACION > PLANTILLAS
  public static readonly CNT_PLANTILLAS_GENERAL                                 = 1272;   // SAA > CONTABILIDAD > PARAMETRIZACION > PLANTILLAS > GENERAL
  public static readonly CNT_DETALLE_DE_PLANTILLA                               = 1273;   // SAA > CONTABILIDAD > PARAMETRIZACION > PLANTILLAS > GENERAL > DETALLE DE PLANTILLA
  public static readonly CNT_PLANTILLAS_SISTEMA                                 = 1274;   // SAA > CONTABILIDAD > PARAMETRIZACION > PLANTILLAS > SISTEMA
  public static readonly CNT_PERIODOS_CONTABLES                                 = 1275;   // SAA > CONTABILIDAD > PARAMETRIZACION > PERIODOS CONTABLES
  public static readonly CNT_REPORTES_CONTABLES                                 = 1276;   // SAA > CONTABILIDAD > PARAMETRIZACION > REPORTES CONTABLES
  public static readonly CNT_PROCESOS                                           = 1277;   // SAA > CONTABILIDAD > PROCESOS
  public static readonly CNT_ASIENTOS_DINAMICO                                  = 1278;   // SAA > CONTABILIDAD > PROCESOS > ASIENTOS DINAMICO
  public static readonly CNT_SUBDETALLE_DE_ASIENTO                              = 1279;   // SAA > CONTABILIDAD > PROCESOS > ASIENTOS DINAMICO > SUBDETALLE DE ASIENTO
  public static readonly CNT_LISTADO_DE_ASIENTOS                                = 1280;   // SAA > CONTABILIDAD > PROCESOS > LISTADO DE ASIENTOS
  public static readonly CNT_MAYORIZACION_PROCESO                               = 1281;   // SAA > CONTABILIDAD > PROCESOS > MAYORIZACION - PROCESO
  public static readonly CNT_DETALLE_MAYORIZACION                               = 1282;   // SAA > CONTABILIDAD > PROCESOS > DETALLE MAYORIZACION
  public static readonly CNT_REPORTES                                           = 1283;   // SAA > CONTABILIDAD > REPORTES
  public static readonly CNT_REPORTES_LISTADO_DE_ASIENTOS                       = 1284;   // SAA > CONTABILIDAD > REPORTES > LISTADO DE ASIENTOS
  public static readonly CNT_BALANCE_GENERAL                                    = 1285;   // SAA > CONTABILIDAD > REPORTES > BALANCE GENERAL
  public static readonly CNT_MAYOR_ANALITICO                                    = 1286;   // SAA > CONTABILIDAD > REPORTES > MAYOR ANALITICO
  public static readonly CNT_ASIENTO_DEL_MAYOR                                  = 1287;   // SAA > CONTABILIDAD > REPORTES > MAYOR ANALITICO > ASIENTO DEL MAYOR
  public static readonly CNT_MAYOR_ANALITICO_V2                                 = 1288;   // SAA > CONTABILIDAD > REPORTES > MAYOR ANALITICO V2
  public static readonly CNT_MAYOR_ANALITICO_V2_ASIENTO_DEL_MAYOR               = 1289;   // SAA > CONTABILIDAD > REPORTES > MAYOR ANALITICO V2 > ASIENTO DEL MAYOR
  public static readonly TSR                                                    = 1290;   // SAA > TESORERIA
  public static readonly TSR_PARAMETRIZACION                                    = 1291;   // SAA > TESORERIA > PARAMETRIZACION
  public static readonly TSR_BANCOS                                             = 1292;   // SAA > TESORERIA > PARAMETRIZACION > BANCOS
  public static readonly TSR_NACIONALES_Y_EXTRANJEROS                           = 1293;   // SAA > TESORERIA > PARAMETRIZACION > BANCOS > NACIONALES Y EXTRANJEROS
  public static readonly TSR_MIS_BANCOS                                         = 1294;   // SAA > TESORERIA > PARAMETRIZACION > BANCOS > MIS BANCOS
  public static readonly TSR_MIS_BANCOS_BANCOS                                  = 1295;   // SAA > TESORERIA > PARAMETRIZACION > BANCOS > MIS BANCOS > BANCOS
  public static readonly TSR_CUENTAS_BANCARIAS                                  = 1296;   // SAA > TESORERIA > PARAMETRIZACION > BANCOS > MIS BANCOS > CUENTAS BANCARIAS
  public static readonly TSR_CHEQUERAS                                          = 1297;   // SAA > TESORERIA > PARAMETRIZACION > BANCOS > MIS BANCOS > CHEQUERAS
  public static readonly TSR_SOLICITUD_CHEQUERA                                 = 1298;   // SAA > TESORERIA > PARAMETRIZACION > BANCOS > MIS BANCOS > CHEQUERAS > SOLICITUD CHEQUERA
  public static readonly TSR_RECEPCION_CHEQUERA                                 = 1299;   // SAA > TESORERIA > PARAMETRIZACION > BANCOS > MIS BANCOS > CHEQUERAS > RECEPCION CHEQUERA
  public static readonly TSR_CHEQUES                                            = 1300;   // SAA > TESORERIA > PARAMETRIZACION > BANCOS > MIS BANCOS > CHEQUERAS > CHEQUES
  public static readonly TSR_TITULARES                                          = 1301;   // SAA > TESORERIA > PARAMETRIZACION > TITULARES
  public static readonly TSR_CAJAS_CHICAS                                       = 1302;   // SAA > TESORERIA > PARAMETRIZACION > CAJAS CHICAS
  public static readonly TSR_PROCESOS                                           = 1303;   // SAA > TESORERIA > PROCESOS
  public static readonly TSR_ESTADO_DE_CUENTA                                   = 1304;   // SAA > TESORERIA > PROCESOS > ESTADO DE CUENTA
  public static readonly TSR_ANTICIPOS                                          = 1305;   // SAA > TESORERIA > PROCESOS > ANTICIPOS
  public static readonly TSR_CLIENTES                                           = 1306;   // SAA > TESORERIA > PROCESOS > ANTICIPOS > CLIENTES
  public static readonly TSR_ANULAR_ANTICIPO                                    = 1307;   // SAA > TESORERIA > PROCESOS > ANTICIPOS > CLIENTES > ANULAR ANTICIPO
  public static readonly TSR_PROVEEDORES                                        = 1308;   // SAA > TESORERIA > PROCESOS > ANTICIPOS > PROVEEDORES
  public static readonly TSR_PROVEEDORES_ANULAR_ANTICIPO                        = 1309;   // SAA > TESORERIA > PROCESOS > ANTICIPOS > PROVEEDORES > ANULAR ANTICIPO
  public static readonly TSR_SEGUIMIENTO                                        = 1310;   // SAA > TESORERIA > PROCESOS > ANTICIPOS > SEGUIMIENTO
  public static readonly TSR_SEGUIMIENTO_ANULAR_ANTICIPO                        = 1311;   // SAA > TESORERIA > PROCESOS > ANTICIPOS > SEGUIMIENTO > ANULAR ANTICIPO
  public static readonly TSR_REGISTRAR                                          = 1312;   // SAA > TESORERIA > PROCESOS > REGISTRAR
  public static readonly TSR_INGRESOS                                           = 1313;   // SAA > TESORERIA > PROCESOS > REGISTRAR > INGRESOS
  public static readonly TSR_EGRESOS                                            = 1314;   // SAA > TESORERIA > PROCESOS > REGISTRAR > EGRESOS
  public static readonly TSR_CAJA_CHICA                                         = 1315;   // SAA > TESORERIA > PROCESOS > CAJA CHICA
  public static readonly TSR_GASTOS                                             = 1316;   // SAA > TESORERIA > PROCESOS > CAJA CHICA > GASTOS
  public static readonly TSR_ADJUNTOS_DEL_MOVIMIENTO                            = 1317;   // SAA > TESORERIA > PROCESOS > CAJA CHICA > GASTOS > ADJUNTOS DEL MOVIMIENTO
  public static readonly TSR_REPOSICION                                         = 1318;   // SAA > TESORERIA > PROCESOS > CAJA CHICA > REPOSICION
  public static readonly TSR_CIERRE                                             = 1319;   // SAA > TESORERIA > PROCESOS > CAJA CHICA > CIERRE
  public static readonly TSR_PAGOS_POR_TRANSFERENCIA                            = 1320;   // SAA > TESORERIA > PROCESOS > PAGOS POR TRANSFERENCIA
  public static readonly TSR_APROBACION_DE_PAGOS                                = 1321;   // SAA > TESORERIA > PROCESOS > PAGOS POR TRANSFERENCIA > APROBACION DE PAGOS
  public static readonly TSR_GENERACION_DE_ARCHIVO                              = 1322;   // SAA > TESORERIA > PROCESOS > PAGOS POR TRANSFERENCIA > GENERACION DE ARCHIVO
  public static readonly TSR_RECEPCION_Y_CONFIRMACION                           = 1323;   // SAA > TESORERIA > PROCESOS > PAGOS POR TRANSFERENCIA > RECEPCION Y CONFIRMACION
  public static readonly TSR_CONSULTA_Y_GESTION                                 = 1324;   // SAA > TESORERIA > PROCESOS > PAGOS POR TRANSFERENCIA > CONSULTA Y GESTION
  public static readonly TSR_PROCESOS_CHEQUES                                   = 1325;   // SAA > TESORERIA > PROCESOS > CHEQUES
  public static readonly TSR_CHEQUES_GENERADOS                                  = 1326;   // SAA > TESORERIA > PROCESOS > CHEQUES > CHEQUES GENERADOS
  public static readonly TSR_CHEQUES_IMPRESOS                                   = 1327;   // SAA > TESORERIA > PROCESOS > CHEQUES > CHEQUES IMPRESOS
  public static readonly TSR_CHEQUES_ENTREGADOS                                 = 1328;   // SAA > TESORERIA > PROCESOS > CHEQUES > CHEQUES ENTREGADOS
  public static readonly TSR_CONSULTA_DE_CHEQUES                                = 1329;   // SAA > TESORERIA > PROCESOS > CHEQUES > CONSULTA DE CHEQUES
  public static readonly TSR_EXTRACTOS_BANCARIOS                                = 1330;   // SAA > TESORERIA > PROCESOS > EXTRACTOS BANCARIOS
  public static readonly TSR_CARGAR_EXTRACTO                                    = 1331;   // SAA > TESORERIA > PROCESOS > EXTRACTOS BANCARIOS > CARGAR EXTRACTO
  public static readonly TSR_CONSULTA_DE_EXTRACTOS                              = 1332;   // SAA > TESORERIA > PROCESOS > EXTRACTOS BANCARIOS > CONSULTA DE EXTRACTOS
  public static readonly TSR_DETALLE_DE_EXTRACTO                                = 1333;   // SAA > TESORERIA > PROCESOS > EXTRACTOS BANCARIOS > DETALLE DE EXTRACTO
  public static readonly TSR_CONCILIACION_CONTABLE                              = 1334;   // SAA > TESORERIA > PROCESOS > EXTRACTOS BANCARIOS > CONCILIACION CONTABLE
  public static readonly TSR_CONCILIACION_CIERRE                                = 1335;   // SAA > TESORERIA > PROCESOS > EXTRACTOS BANCARIOS > CONCILIACION - CIERRE
  public static readonly TSR_TABLERO_DE_CUMPLIMIENTO                            = 1336;   // SAA > TESORERIA > PROCESOS > EXTRACTOS BANCARIOS > TABLERO DE CUMPLIMIENTO
  public static readonly CXP                                                    = 1337;   // SAA > CUENTAS POR PAGAR
  public static readonly CXP_PARAMETRIZACION                                    = 1338;   // SAA > CUENTAS POR PAGAR > PARAMETRIZACION
  public static readonly CXP_GRUPOS_DE_PRODUCTOS                                = 1339;   // SAA > CUENTAS POR PAGAR > PARAMETRIZACION > GRUPOS DE PRODUCTOS
  public static readonly CXP_DATOS_SRI                                          = 1340;   // SAA > CUENTAS POR PAGAR > PARAMETRIZACION > DATOS SRI
  public static readonly CXP_PROCESOS                                           = 1341;   // SAA > CUENTAS POR PAGAR > PROCESOS
  public static readonly CXP_BANDEJA_ELECTRONICA                                = 1342;   // SAA > CUENTAS POR PAGAR > PROCESOS > BANDEJA ELECTRONICA
  public static readonly CXP_GESTION_DE_DOCUMENTOS                              = 1343;   // SAA > CUENTAS POR PAGAR > PROCESOS > GESTION DE DOCUMENTOS
  public static readonly CXP_CLASIFICAR_PRODUCTOS                               = 1344;   // SAA > CUENTAS POR PAGAR > PROCESOS > GESTION DE DOCUMENTOS > CLASIFICAR PRODUCTOS
  public static readonly CXP_SUBIR_XML                                          = 1345;   // SAA > CUENTAS POR PAGAR > PROCESOS > GESTION DE DOCUMENTOS > SUBIR XML
  public static readonly CXP_REGISTRAR_DOCUMENTO                                = 1346;   // SAA > CUENTAS POR PAGAR > PROCESOS > GESTION DE DOCUMENTOS > REGISTRAR DOCUMENTO
  public static readonly CXP_MOTIVO                                             = 1347;   // SAA > CUENTAS POR PAGAR > PROCESOS > GESTION DE DOCUMENTOS > MOTIVO
  public static readonly CXP_REEMBOLSOS_DE_FACTURA                              = 1348;   // SAA > CUENTAS POR PAGAR > PROCESOS > GESTION DE DOCUMENTOS > REEMBOLSOS DE FACTURA
  public static readonly CXP_REGISTRO_DE_BLOQUEANTES                            = 1349;   // SAA > CUENTAS POR PAGAR > PROCESOS > GESTION DE DOCUMENTOS > REGISTRO DE BLOQUEANTES
  public static readonly CXP_ERROR_DE_REGISTRO                                  = 1350;   // SAA > CUENTAS POR PAGAR > PROCESOS > GESTION DE DOCUMENTOS > ERROR DE REGISTRO
  public static readonly CXP_ERROR_DE_VALIDACION_XML                            = 1351;   // SAA > CUENTAS POR PAGAR > PROCESOS > GESTION DE DOCUMENTOS > ERROR DE VALIDACION XML
  public static readonly CXP_CONSULTA_DOCUMENTOS                                = 1352;   // SAA > CUENTAS POR PAGAR > PROCESOS > CONSULTA DOCUMENTOS
  public static readonly CXP_ANULAR_DOCUMENTO_DE_COMPRA                         = 1353;   // SAA > CUENTAS POR PAGAR > PROCESOS > CONSULTA DOCUMENTOS > ANULAR DOCUMENTO DE COMPRA
  public static readonly CXP_NOTA_DE_VENTA_MANUAL                               = 1354;   // SAA > CUENTAS POR PAGAR > PROCESOS > NOTA DE VENTA MANUAL
  public static readonly CXP_PROPOSICION_DE_PAGO                                = 1355;   // SAA > CUENTAS POR PAGAR > PROCESOS > PROPOSICION DE PAGO
  public static readonly CXP_SUSTENTO_TRIBUTARIO_ATS                            = 1356;   // SAA > CUENTAS POR PAGAR > PROCESOS > SUSTENTO TRIBUTARIO ATS
  public static readonly CXP_PAGOS                                              = 1357;   // SAA > CUENTAS POR PAGAR > PAGOS
  public static readonly CXP_SOLICITUD_DE_PAGO                                  = 1358;   // SAA > CUENTAS POR PAGAR > PAGOS > SOLICITUD DE PAGO
  public static readonly CXP_CRUCE_DE_ANTICIPO                                  = 1359;   // SAA > CUENTAS POR PAGAR > PAGOS > CRUCE DE ANTICIPO
  public static readonly CXP_REPORTES                                           = 1360;   // SAA > CUENTAS POR PAGAR > REPORTES
  public static readonly CXP_DASHBOARD                                          = 1361;   // SAA > CUENTAS POR PAGAR > REPORTES > DASHBOARD
  public static readonly CXP_NEGOCIACIONES                                      = 1362;   // SAA > CUENTAS POR PAGAR > NEGOCIACIONES
  public static readonly CXP_ADMINISTRAR_NEGOCIACIONES                          = 1363;   // SAA > CUENTAS POR PAGAR > NEGOCIACIONES > ADMINISTRAR NEGOCIACIONES
  public static readonly CXP_DETALLE_DE_NEGOCIACION                             = 1364;   // SAA > CUENTAS POR PAGAR > NEGOCIACIONES > ADMINISTRAR NEGOCIACIONES > DETALLE DE NEGOCIACION
  public static readonly CXP_PAGO                                               = 1365;   // SAA > CUENTAS POR PAGAR > NEGOCIACIONES > ADMINISTRAR NEGOCIACIONES > DETALLE DE NEGOCIACION > PAGO
  public static readonly CXP_ADENDUM                                            = 1366;   // SAA > CUENTAS POR PAGAR > NEGOCIACIONES > ADMINISTRAR NEGOCIACIONES > DETALLE DE NEGOCIACION > ADENDUM
  public static readonly CXC                                                    = 1367;   // SAA > CUENTAS POR COBRAR
  public static readonly CXC_PARAMETRIZACION                                    = 1368;   // SAA > CUENTAS POR COBRAR > PARAMETRIZACION
  public static readonly CXC_GRUPOS_DE_PRODUCTOS                                = 1369;   // SAA > CUENTAS POR COBRAR > PARAMETRIZACION > GRUPOS DE PRODUCTOS
  public static readonly CXC_DATOS_FACTURADOR                                   = 1370;   // SAA > CUENTAS POR COBRAR > PARAMETRIZACION > DATOS FACTURADOR
  public static readonly CXC_DATOS_SRI                                          = 1371;   // SAA > CUENTAS POR COBRAR > PARAMETRIZACION > DATOS SRI
  public static readonly CXC_COBROS                                             = 1372;   // SAA > CUENTAS POR COBRAR > COBROS
  public static readonly CXC_REGISTRAR_COBRO                                    = 1373;   // SAA > CUENTAS POR COBRAR > COBROS > REGISTRAR COBRO
  public static readonly CXC_CRUCE_DE_ANTICIPO                                  = 1374;   // SAA > CUENTAS POR COBRAR > COBROS > CRUCE DE ANTICIPO
  public static readonly CXC_CONSULTA_DE_COBROS                                 = 1375;   // SAA > CUENTAS POR COBRAR > COBROS > CONSULTA DE COBROS
  public static readonly CXC_MOTIVO                                             = 1376;   // SAA > CUENTAS POR COBRAR > COBROS > CONSULTA DE COBROS > MOTIVO
  public static readonly CXC_ABONOS_A_FACTURA                                   = 1377;   // SAA > CUENTAS POR COBRAR > COBROS > ABONOS A FACTURA
  public static readonly CXC_ABONOS_A_FACTURA_MOTIVO                            = 1378;   // SAA > CUENTAS POR COBRAR > COBROS > ABONOS A FACTURA > MOTIVO
  public static readonly CXC_EMITIR                                             = 1379;   // SAA > CUENTAS POR COBRAR > EMITIR
  public static readonly CXC_FACTURAS                                           = 1380;   // SAA > CUENTAS POR COBRAR > EMITIR > FACTURAS
  public static readonly CXC_NOTAS_DE_CREDITO                                   = 1381;   // SAA > CUENTAS POR COBRAR > EMITIR > NOTAS DE CREDITO
  public static readonly CXC_NOTAS_DE_DEBITO                                    = 1382;   // SAA > CUENTAS POR COBRAR > EMITIR > NOTAS DE DEBITO
  public static readonly CXC_LIQUIDACION_EN_COMPRAS                             = 1383;   // SAA > CUENTAS POR COBRAR > EMITIR > LIQUIDACION EN COMPRAS
  public static readonly CXC_ANULAR_DOCUMENTO_DE_COMPRA                         = 1384;   // SAA > CUENTAS POR COBRAR > EMITIR > LIQUIDACION EN COMPRAS > ANULAR DOCUMENTO DE COMPRA
  public static readonly CXC_RETENCIONES                                        = 1385;   // SAA > CUENTAS POR COBRAR > EMITIR > RETENCIONES
  public static readonly CXC_GESTIONAR                                          = 1386;   // SAA > CUENTAS POR COBRAR > GESTIONAR
  public static readonly CXC_DOCUMENTOS_ELECTRONICOS                            = 1387;   // SAA > CUENTAS POR COBRAR > GESTIONAR > DOCUMENTOS ELECTRONICOS
  public static readonly CXC_DOCUMENTOS_ELECTRONICOS_ANULAR_DOCUMENTO_DE_COMPRA = 1388;   // SAA > CUENTAS POR COBRAR > GESTIONAR > DOCUMENTOS ELECTRONICOS > ANULAR DOCUMENTO DE COMPRA
  public static readonly CXC_ACTUALIZAR_ESTADO_RESULTADO                        = 1389;   // SAA > CUENTAS POR COBRAR > GESTIONAR > DOCUMENTOS ELECTRONICOS > ACTUALIZAR ESTADO RESULTADO
  public static readonly CXC_CONSULTA_AL_SRI                                    = 1390;   // SAA > CUENTAS POR COBRAR > GESTIONAR > DOCUMENTOS ELECTRONICOS > CONSULTA AL SRI
  public static readonly CXC_FINANCIAR_FACTURA                                  = 1391;   // SAA > CUENTAS POR COBRAR > GESTIONAR > FINANCIAR FACTURA
  public static readonly CXC_CONSULTA_FACTURAS                                  = 1392;   // SAA > CUENTAS POR COBRAR > GESTIONAR > CONSULTA FACTURAS
  public static readonly CXC_CONSULTA_FACTURAS_ANULAR_DOCUMENTO_DE_COMPRA       = 1393;   // SAA > CUENTAS POR COBRAR > GESTIONAR > CONSULTA FACTURAS > ANULAR DOCUMENTO DE COMPRA
  public static readonly CXC_ANTICIPOS                                          = 1394;   // SAA > CUENTAS POR COBRAR > GESTIONAR > ANTICIPOS
  public static readonly CXC_ANTICIPOS_MOTIVO                                   = 1395;   // SAA > CUENTAS POR COBRAR > GESTIONAR > ANTICIPOS > MOTIVO
  public static readonly CXC_REPORTES                                           = 1396;   // SAA > CUENTAS POR COBRAR > REPORTES
  public static readonly CXC_DASHBOARD_DE_VENTAS                                = 1397;   // SAA > CUENTAS POR COBRAR > REPORTES > DASHBOARD DE VENTAS
  public static readonly CXC_ATS_Y_CUADRE_103_104                               = 1398;   // SAA > CUENTAS POR COBRAR > REPORTES > ATS Y CUADRE 103/104
  public static readonly CRD                                                    = 1399;   // SAA > CREDITOS
  public static readonly CRD_HISTORICOS                                         = 1400;   // SAA > CREDITOS > HISTORICOS
  public static readonly CRD_DELTA21                                            = 1401;   // SAA > CREDITOS > HISTORICOS > DELTA21
  public static readonly CRD_APORTES_POR_REVISAR                                = 1402;   // SAA > CREDITOS > HISTORICOS > APORTES POR REVISAR
  public static readonly CRD_PARTICIPES_INICIAL                                 = 1403;   // SAA > CREDITOS > HISTORICOS > PARTICIPES INICIAL
  public static readonly CRD_PARAMETRIZACION                                    = 1404;   // SAA > CREDITOS > PARAMETRIZACION
  public static readonly CRD_INFORMACION_GENERAL_DEL_FONDO                      = 1405;   // SAA > CREDITOS > PARAMETRIZACION > INFORMACION GENERAL DEL FONDO
  public static readonly CRD_TIPOS                                              = 1406;   // SAA > CREDITOS > PARAMETRIZACION > TIPOS
  public static readonly CRD_ESTADOS                                            = 1407;   // SAA > CREDITOS > PARAMETRIZACION > ESTADOS
  public static readonly CRD_LISTADOS                                           = 1408;   // SAA > CREDITOS > PARAMETRIZACION > LISTADOS
  public static readonly CRD_PROCESOS_VARIOS                                    = 1409;   // SAA > CREDITOS > PARAMETRIZACION > LISTADOS > PROCESOS VARIOS
  public static readonly CRD_BANDAS_DE_CARTERA                                  = 1410;   // SAA > CREDITOS > PARAMETRIZACION > BANDAS DE CARTERA
  public static readonly CRD_ESCALA_DE_CALIFICACION_DE_RIESGO                   = 1411;   // SAA > CREDITOS > PARAMETRIZACION > ESCALA DE CALIFICACION DE RIESGO
  public static readonly CRD_CIERRE_DE_CARTERA                                  = 1412;   // SAA > CREDITOS > PARAMETRIZACION > CIERRE DE CARTERA
  public static readonly CRD_CONTABILIDAD_DE_CREDITOS                           = 1413;   // SAA > CREDITOS > PARAMETRIZACION > CONTABILIDAD DE CREDITOS
  public static readonly CRD_CUENTAS_POR_TIPO_DE_APORTE                         = 1414;   // SAA > CREDITOS > PARAMETRIZACION > CUENTAS POR TIPO DE APORTE
  public static readonly CRD_PARTICIPES                                         = 1415;   // SAA > CREDITOS > PARTICIPES
  public static readonly CRD_ADMINISTRAR                                        = 1416;   // SAA > CREDITOS > PARTICIPES > ADMINISTRAR
  public static readonly CRD_CONSULTA                                           = 1417;   // SAA > CREDITOS > PARTICIPES > CONSULTA
  public static readonly CRD_AUDITORIA                                          = 1418;   // SAA > CREDITOS > PARTICIPES > CONSULTA > AUDITORIA
  public static readonly CRD_LISTADO_GENERAL                                    = 1419;   // SAA > CREDITOS > PARTICIPES > LISTADO GENERAL
  public static readonly CRD_CONSOLIDADO                                        = 1420;   // SAA > CREDITOS > PARTICIPES > CONSOLIDADO
  public static readonly CRD_EDICION_DE_PARTICIPE                               = 1421;   // SAA > CREDITOS > PARTICIPES > EDICION DE PARTICIPE
  public static readonly CRD_INFORMACION_DEL_PARTICIPE                          = 1422;   // SAA > CREDITOS > PARTICIPES > INFORMACION DEL PARTICIPE
  public static readonly CRD_HISTORICO_DE_EXTERNOS                              = 1423;   // SAA > CREDITOS > PARTICIPES > INFORMACION DEL PARTICIPE > HISTORICO DE EXTERNOS
  public static readonly CRD_DASH_DEL_PARTICIPE                                 = 1424;   // SAA > CREDITOS > PARTICIPES > DASH DEL PARTICIPE
  public static readonly CRD_DASH_DEL_PARTICIPE_AUDITORIA                       = 1425;   // SAA > CREDITOS > PARTICIPES > DASH DEL PARTICIPE > AUDITORIA
  public static readonly CRD_PAGOS_DEL_APORTE                                   = 1426;   // SAA > CREDITOS > PARTICIPES > DASH DEL PARTICIPE > PAGOS DEL APORTE
  public static readonly CRD_PAGOS_DEL_PRESTAMO                                 = 1427;   // SAA > CREDITOS > PARTICIPES > DASH DEL PARTICIPE > PAGOS DEL PRESTAMO
  public static readonly CRD_CERTIFICADOS_DEL_PARTICIPE                         = 1428;   // SAA > CREDITOS > PARTICIPES > CERTIFICADOS DEL PARTICIPE
  public static readonly CRD_JUBILADOS                                          = 1429;   // SAA > CREDITOS > PARTICIPES > JUBILADOS
  public static readonly CRD_JUBILAR_PARTICIPE                                  = 1430;   // SAA > CREDITOS > PARTICIPES > JUBILADOS > JUBILAR PARTICIPE
  public static readonly CRD_PAGO_JUBILADOS                                     = 1431;   // SAA > CREDITOS > PARTICIPES > JUBILADOS > PAGO JUBILADOS
  public static readonly CRD_CONTRATOS                                          = 1432;   // SAA > CREDITOS > CONTRATOS
  public static readonly CRD_INGRESO                                            = 1433;   // SAA > CREDITOS > CONTRATOS > INGRESO
  public static readonly CRD_CONTRATOS_ADMINISTRAR                              = 1434;   // SAA > CREDITOS > CONTRATOS > ADMINISTRAR
  public static readonly CRD_DASH                                               = 1435;   // SAA > CREDITOS > CONTRATOS > DASH
  public static readonly CRD_APORTES_DASH                                       = 1436;   // SAA > CREDITOS > CONTRATOS > APORTES DASH
  public static readonly CRD_PRESTAMOS                                          = 1437;   // SAA > CREDITOS > PRESTAMOS
  public static readonly CRD_PRESTAMOS_INGRESO                                  = 1438;   // SAA > CREDITOS > PRESTAMOS > INGRESO
  public static readonly CRD_PRESTAMOS_CONSULTA                                 = 1439;   // SAA > CREDITOS > PRESTAMOS > CONSULTA
  public static readonly CRD_DETALLE_DEL_PRESTAMO                               = 1440;   // SAA > CREDITOS > PRESTAMOS > CONSULTA > DETALLE DEL PRESTAMO
  public static readonly CRD_PRESTAMOS_DASH                                     = 1441;   // SAA > CREDITOS > PRESTAMOS > DASH
  public static readonly CRD_CONSULTA_CUOTAS                                    = 1442;   // SAA > CREDITOS > PRESTAMOS > CONSULTA CUOTAS
  public static readonly CRD_CONSULTA_CUOTAS_DETALLE_DEL_PRESTAMO               = 1443;   // SAA > CREDITOS > PRESTAMOS > CONSULTA CUOTAS > DETALLE DEL PRESTAMO
  public static readonly CRD_REPORTE_VALORES_INSOLUTOS                          = 1444;   // SAA > CREDITOS > PRESTAMOS > REPORTE VALORES INSOLUTOS
  public static readonly CRD_ASIGNACION_DE_SEGUROS                              = 1445;   // SAA > CREDITOS > PRESTAMOS > ASIGNACION DE SEGUROS
  public static readonly CRD_ASIGNAR_SEGURO                                     = 1446;   // SAA > CREDITOS > PRESTAMOS > ASIGNACION DE SEGUROS > ASIGNAR SEGURO
  public static readonly CRD_COBROS                                             = 1447;   // SAA > CREDITOS > COBROS
  public static readonly CRD_ARCHIVOS_PETRO                                     = 1448;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO
  public static readonly CRD_CARGA                                              = 1449;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA
  public static readonly CRD_CARGA_APORTES                                      = 1450;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > CARGA APORTES
  public static readonly CRD_CONSULTA_CARGA                                     = 1451;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > CONSULTA CARGA
  public static readonly CRD_DETALLE_DE_CARGA                                   = 1452;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > DETALLE DE CARGA
  public static readonly CRD_COINCIDENCIAS_DE_ENTIDAD                           = 1453;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > DETALLE DE CARGA > COINCIDENCIAS DE ENTIDAD
  public static readonly CRD_ERROR_DEL_PROCESO_DE_ARCHIVO                       = 1454;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > DETALLE DE CARGA > ERROR DEL PROCESO DE ARCHIVO
  public static readonly CRD_AFECTACION_FINANCIERA_DE_CUOTAS                    = 1455;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > DETALLE DE CARGA > AFECTACION FINANCIERA DE CUOTAS
  public static readonly CRD_REVALIDAR_CARGA                                    = 1456;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > DETALLE DE CARGA > REVALIDAR CARGA
  public static readonly CRD_AFECTACION_POR_PARTICIPE                           = 1457;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > AFECTACION POR PARTICIPE
  public static readonly CRD_AFECTACION_DEL_PARTICIPE                           = 1458;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > AFECTACION POR PARTICIPE > AFECTACION DEL PARTICIPE
  public static readonly CRD_AFECTACION_POR_PARTICIPE_REVALIDAR_CARGA           = 1459;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > CARGA > AFECTACION POR PARTICIPE > REVALIDAR CARGA
  public static readonly CRD_GENERAR                                            = 1460;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > GENERAR
  public static readonly CRD_GENERAR_ARCHIVO                                    = 1461;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > GENERAR > GENERAR ARCHIVO
  public static readonly CRD_CONSULTA_GENERACION                                = 1462;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > GENERAR > CONSULTA GENERACION
  public static readonly CRD_DETALLE_DE_GENERACION                              = 1463;   // SAA > CREDITOS > COBROS > ARCHIVOS PETRO > GENERAR > DETALLE DE GENERACION
  public static readonly CRD_PAGO_CUOTA                                         = 1464;   // SAA > CREDITOS > COBROS > PAGO CUOTA
  public static readonly CRD_PAGO_DE_CUOTA                                      = 1465;   // SAA > CREDITOS > COBROS > PAGO CUOTA > PAGO DE CUOTA
  public static readonly CRD_CRUCE_DE_VALORES                                   = 1466;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES
  public static readonly CRD_PAGO_DE_PRESTAMO                                   = 1467;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES > PAGO DE PRESTAMO
  public static readonly CRD_COBRO_REGISTRADO                                   = 1468;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES > PAGO DE PRESTAMO > COBRO REGISTRADO
  public static readonly CRD_RECIBO_DE_OPERACION                                = 1469;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES > PAGO DE PRESTAMO > RECIBO DE OPERACION
  public static readonly CRD_ABONO_A_CAPITAL                                    = 1470;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES > ABONO A CAPITAL
  public static readonly CRD_ABONO_A_CAPITAL_COBRO_REGISTRADO                   = 1471;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES > ABONO A CAPITAL > COBRO REGISTRADO
  public static readonly CRD_PRECANCELACION                                     = 1472;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES > PRECANCELACION
  public static readonly CRD_PRECANCELACION_COBRO_REGISTRADO                    = 1473;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES > PRECANCELACION > COBRO REGISTRADO
  public static readonly CRD_PRECANCELACION_RECIBO_DE_OPERACION                 = 1474;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES > PRECANCELACION > RECIBO DE OPERACION
  public static readonly CRD_CRUCE_DE_VALORES_RECIBO_DE_OPERACION               = 1475;   // SAA > CREDITOS > COBROS > CRUCE DE VALORES > RECIBO DE OPERACION
  public static readonly CRD_DEVOLUCION_DE_APORTES                              = 1476;   // SAA > CREDITOS > COBROS > DEVOLUCION DE APORTES
  public static readonly CRD_COBROS_PERSONALES                                  = 1477;   // SAA > CREDITOS > COBROS > COBROS PERSONALES
  public static readonly CRD_COBROS_PERSONALES_PAGO_DE_PRESTAMO                 = 1478;   // SAA > CREDITOS > COBROS > COBROS PERSONALES > PAGO DE PRESTAMO
  public static readonly CRD_COBROS_PERSONALES_ABONO_A_CAPITAL                  = 1479;   // SAA > CREDITOS > COBROS > COBROS PERSONALES > ABONO A CAPITAL
  public static readonly CRD_COBROS_PERSONALES_PRECANCELACION                   = 1480;   // SAA > CREDITOS > COBROS > COBROS PERSONALES > PRECANCELACION
  public static readonly CRD_COBROS_PERSONALES_COBRO_REGISTRADO                 = 1481;   // SAA > CREDITOS > COBROS > COBROS PERSONALES > COBRO REGISTRADO
  public static readonly CRD_COBROS_PERSONALES_RECIBO_DE_OPERACION              = 1482;   // SAA > CREDITOS > COBROS > COBROS PERSONALES > RECIBO DE OPERACION
  public static readonly CRD_BANDEJA_DE_CONTABILIDAD                            = 1483;   // SAA > CREDITOS > COBROS > BANDEJA DE CONTABILIDAD
  public static readonly CRD_AUDITORIA_DE_BANDAS                                = 1484;   // SAA > CREDITOS > COBROS > AUDITORIA DE BANDAS
  public static readonly CRD_PROCESO_DE_CREDITO                                 = 1485;   // SAA > CREDITOS > COBROS > PROCESO DE CREDITO
  public static readonly CRD_CONSULTA_DE_COBROS                                 = 1486;   // SAA > CREDITOS > COBROS > CONSULTA DE COBROS
  public static readonly CRD_SEGUIMIENTO_DE_COBROS                              = 1487;   // SAA > CREDITOS > COBROS > SEGUIMIENTO DE COBROS
  public static readonly CRD_CONDONACION_DE_VALORES                             = 1488;   // SAA > CREDITOS > COBROS > CONDONACION DE VALORES
  public static readonly CRD_SIMULADORES                                        = 1489;   // SAA > CREDITOS > SIMULADORES
  public static readonly CRD_CREDITO_NUEVO                                      = 1490;   // SAA > CREDITOS > SIMULADORES > CREDITO NUEVO
  public static readonly CRD_PRESTAMO_EXISTENTE                                 = 1491;   // SAA > CREDITOS > SIMULADORES > PRESTAMO EXISTENTE
  public static readonly RPR                                                    = 1492;   // SAA > REPORTES
  public static readonly RPR_CREDITOS                                           = 1493;   // SAA > REPORTES > CREDITOS
  public static readonly RPR_SUPER_DE_BANCOS                                    = 1494;   // SAA > REPORTES > CREDITOS > SUPER DE BANCOS
  public static readonly RPR_INFORMES_MENSUALES                                 = 1495;   // SAA > REPORTES > CREDITOS > INFORMES MENSUALES
  public static readonly RRH                                                    = 1496;   // SAA > RECURSOS HUMANOS
  public static readonly RRH_PARAMETRIZACION                                    = 1497;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION
  public static readonly RRH_CONCEPTOS_DE_NOMINA                                = 1498;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > CONCEPTOS DE NOMINA
  public static readonly RRH_PARAMETROS_ANUALES                                 = 1499;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > PARAMETROS ANUALES
  public static readonly RRH_TABLA_DE_IMPUESTO_A_LA_RENTA                       = 1500;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > TABLA DE IMPUESTO A LA RENTA
  public static readonly RRH_TOPES_DE_GASTOS_PERSONALES                         = 1501;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > TOPES DE GASTOS PERSONALES
  public static readonly RRH_CAUSALES_DE_TERMINACION                            = 1502;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > CAUSALES DE TERMINACION
  public static readonly RRH_CONFIGURACION_DE_NOMINA                            = 1503;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > CONFIGURACION DE NOMINA
  public static readonly RRH_FORMATOS_DE_MARCACION                              = 1504;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > FORMATOS DE MARCACION
  public static readonly RRH_FORMATOS_DEL_ARCHIVO_BANCARIO                      = 1505;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > FORMATOS DEL ARCHIVO BANCARIO
  public static readonly RRH_DEPARTAMENTOS                                      = 1506;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > DEPARTAMENTOS
  public static readonly RRH_CARGOS_Y_PUESTOS                                   = 1507;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > CARGOS Y PUESTOS
  public static readonly RRH_DEPARTAMENTO_CARGO                                 = 1508;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > DEPARTAMENTO - CARGO
  public static readonly RRH_TIPOS_DE_CONTRATO                                  = 1509;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > TIPOS DE CONTRATO
  public static readonly RRH_TURNOS_Y_HORARIOS                                  = 1510;   // SAA > RECURSOS HUMANOS > PARAMETRIZACION > TURNOS Y HORARIOS
  public static readonly RRH_PERSONAL                                           = 1511;   // SAA > RECURSOS HUMANOS > PERSONAL
  public static readonly RRH_COLABORADORES                                      = 1512;   // SAA > RECURSOS HUMANOS > PERSONAL > COLABORADORES
  public static readonly RRH_FICHA_DEL_COLABORADOR                              = 1513;   // SAA > RECURSOS HUMANOS > PERSONAL > FICHA DEL COLABORADOR
  public static readonly RRH_FORMULARIO_DE_CONTRATO                             = 1514;   // SAA > RECURSOS HUMANOS > PERSONAL > FICHA DEL COLABORADOR > FORMULARIO DE CONTRATO
  public static readonly RRH_FORMULARIO_DE_CUENTA_BANCARIA                      = 1515;   // SAA > RECURSOS HUMANOS > PERSONAL > FICHA DEL COLABORADOR > FORMULARIO DE CUENTA BANCARIA
  public static readonly RRH_VACACIONES                                         = 1516;   // SAA > RECURSOS HUMANOS > PERSONAL > VACACIONES
  public static readonly RRH_FORMULARIO_DE_VACACIONES                           = 1517;   // SAA > RECURSOS HUMANOS > PERSONAL > VACACIONES > FORMULARIO DE VACACIONES
  public static readonly RRH_APROBACION_DE_VACACIONES                           = 1518;   // SAA > RECURSOS HUMANOS > PERSONAL > VACACIONES > APROBACION DE VACACIONES
  public static readonly RRH_PERMISOS_Y_LICENCIAS                               = 1519;   // SAA > RECURSOS HUMANOS > PERSONAL > PERMISOS Y LICENCIAS
  public static readonly RRH_FORMULARIO_DE_PERMISO                              = 1520;   // SAA > RECURSOS HUMANOS > PERSONAL > PERMISOS Y LICENCIAS > FORMULARIO DE PERMISO
  public static readonly RRH_APROBACION_DE_PERMISOS                             = 1521;   // SAA > RECURSOS HUMANOS > PERSONAL > PERMISOS Y LICENCIAS > APROBACION DE PERMISOS
  public static readonly RRH_ASISTENCIA                                         = 1522;   // SAA > RECURSOS HUMANOS > ASISTENCIA
  public static readonly RRH_MARCACIONES                                        = 1523;   // SAA > RECURSOS HUMANOS > ASISTENCIA > MARCACIONES
  public static readonly RRH_IMPORTACION_DE_MARCACIONES                         = 1524;   // SAA > RECURSOS HUMANOS > ASISTENCIA > IMPORTACION DE MARCACIONES
  public static readonly RRH_RESUMEN_DIARIO                                     = 1525;   // SAA > RECURSOS HUMANOS > ASISTENCIA > RESUMEN DIARIO
  public static readonly RRH_HORAS_EXTRA                                        = 1526;   // SAA > RECURSOS HUMANOS > ASISTENCIA > HORAS EXTRA
  public static readonly RRH_MIGRACION_DE_APERTURA                              = 1527;   // SAA > RECURSOS HUMANOS > MIGRACION DE APERTURA
  public static readonly RRH_SALDOS_DE_APERTURA                                 = 1528;   // SAA > RECURSOS HUMANOS > MIGRACION DE APERTURA > SALDOS DE APERTURA
  public static readonly RRH_ACUMULADOS                                         = 1529;   // SAA > RECURSOS HUMANOS > MIGRACION DE APERTURA > ACUMULADOS
  public static readonly RRH_PROCESOS                                           = 1530;   // SAA > RECURSOS HUMANOS > PROCESOS
  public static readonly RRH_PERIODOS_DE_NOMINA                                 = 1531;   // SAA > RECURSOS HUMANOS > PROCESOS > PERIODOS DE NOMINA
  public static readonly RRH_DASH_DEL_PERIODO                                   = 1532;   // SAA > RECURSOS HUMANOS > PROCESOS > PERIODOS DE NOMINA > DASH DEL PERIODO
  public static readonly RRH_PREVISUALIZACION_DEL_ASIENTO                       = 1533;   // SAA > RECURSOS HUMANOS > PROCESOS > PERIODOS DE NOMINA > DASH DEL PERIODO > PREVISUALIZACION DEL ASIENTO
  public static readonly RRH_NOVEDADES_DEL_PERIODO                              = 1534;   // SAA > RECURSOS HUMANOS > PROCESOS > NOVEDADES DEL PERIODO
  public static readonly RRH_NOVEDADES_DEL_MES_IESS                             = 1535;   // SAA > RECURSOS HUMANOS > PROCESOS > NOVEDADES DEL MES IESS
  public static readonly RRH_PLANILLA_DE_CONTROL_IESS                           = 1536;   // SAA > RECURSOS HUMANOS > PROCESOS > PLANILLA DE CONTROL IESS
  public static readonly RRH_PLANILLAS_DEL_IESS                                 = 1537;   // SAA > RECURSOS HUMANOS > PROCESOS > PLANILLAS DEL IESS
  public static readonly RRH_PROCESOS_HORAS_EXTRA                               = 1538;   // SAA > RECURSOS HUMANOS > PROCESOS > HORAS EXTRA
  public static readonly RRH_PROYECCION_DE_IMPUESTO_A_LA_RENTA                  = 1539;   // SAA > RECURSOS HUMANOS > PROCESOS > PROYECCION DE IMPUESTO A LA RENTA
  public static readonly RRH_DESCUENTOS_RECURRENTES                             = 1540;   // SAA > RECURSOS HUMANOS > PROCESOS > DESCUENTOS RECURRENTES
  public static readonly RRH_ROLES_DE_PAGO                                      = 1541;   // SAA > RECURSOS HUMANOS > PROCESOS > ROLES DE PAGO
  public static readonly RRH_ORDENES_DE_PAGO                                    = 1542;   // SAA > RECURSOS HUMANOS > PROCESOS > ORDENES DE PAGO
  public static readonly RRH_VALORES_NO_PAGADOS                                 = 1543;   // SAA > RECURSOS HUMANOS > PROCESOS > VALORES NO PAGADOS
  public static readonly RRH_REGISTRAR_VALOR_NO_PAGADO                          = 1544;   // SAA > RECURSOS HUMANOS > PROCESOS > VALORES NO PAGADOS > REGISTRAR VALOR NO PAGADO
  public static readonly RRH_MOTIVO                                             = 1545;   // SAA > RECURSOS HUMANOS > PROCESOS > VALORES NO PAGADOS > MOTIVO
  public static readonly RRH_PAGO_DE_BENEFICIOS_SOCIALES                        = 1546;   // SAA > RECURSOS HUMANOS > PROCESOS > PAGO DE BENEFICIOS SOCIALES
  public static readonly RRH_REPORTES_DE_NOMINA                                 = 1547;   // SAA > RECURSOS HUMANOS > PROCESOS > REPORTES DE NOMINA
  public static readonly RRH_LIQUIDACION                                        = 1548;   // SAA > RECURSOS HUMANOS > PROCESOS > LIQUIDACION
  public static readonly RRH_FORMULARIO_DE_LIQUIDACION                          = 1549;   // SAA > RECURSOS HUMANOS > PROCESOS > LIQUIDACION > FORMULARIO DE LIQUIDACION
  public static readonly RRH_SALIDAS_OFICIALES                                  = 1550;   // SAA > RECURSOS HUMANOS > PROCESOS > SALIDAS OFICIALES
  public static readonly RRH_REPARTO_DE_UTILIDADES                              = 1551;   // SAA > RECURSOS HUMANOS > PROCESOS > REPARTO DE UTILIDADES
  public static readonly RRH_ANTICIPOS_A_TRABAJADORES                           = 1552;   // SAA > RECURSOS HUMANOS > PROCESOS > ANTICIPOS A TRABAJADORES
  public static readonly RRH_FORMULARIO_DE_ANTICIPO                             = 1553;   // SAA > RECURSOS HUMANOS > PROCESOS > ANTICIPOS A TRABAJADORES > FORMULARIO DE ANTICIPO
  public static readonly RRH_APROBAR_ANTICIPO                                   = 1554;   // SAA > RECURSOS HUMANOS > PROCESOS > ANTICIPOS A TRABAJADORES > APROBAR ANTICIPO
  public static readonly RRH_DEVOLUCION_DE_ANTICIPO                             = 1555;   // SAA > RECURSOS HUMANOS > PROCESOS > ANTICIPOS A TRABAJADORES > DEVOLUCION DE ANTICIPO
  public static readonly RRH_ANTICIPOS_A_TRABAJADORES_MOTIVO                    = 1556;   // SAA > RECURSOS HUMANOS > PROCESOS > ANTICIPOS A TRABAJADORES > MOTIVO
  public static readonly RRH_ACREDITAR_VACACIONES                               = 1557;   // SAA > RECURSOS HUMANOS > PROCESOS > ACREDITAR VACACIONES
}
```
