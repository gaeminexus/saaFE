# Inventario de pantallas de SAA — para el módulo de Seguridades

Generado por el agente FRONTEND (saaFE) a pedido del árbitro `lap-saa-1-arb`, solo lectura. Verificado
contra el código real (`src/app`), no contra documentación de planificación.

Convenciones de esta tabla: **profundidad 1** = raíz del `navItems[]` de ese menú. `route` vacío
significa nodo de agrupación sin ruta propia (o ruta placeholder compartida con sus hijos). `idPermiso`
vacío significa que el campo no está seteado en ese nodo (no existe en el array literal).

---

## ÍTEM 1 — El árbol de los menús

### 1. `src/app/modules/cnt/menu/menucontabilidad/menucontabilidad.component.ts`

Es un `NavItem[]` literal. Ningún nodo trae `idPermiso` propio salvo los que se listan (los tres grupos
raíz usan el genérico `811`, la mayoría de hojas usa `830`, dos hojas de "Reportes Contables"/"Reportes"
usan `831`).

| displayName | profundidad | route | idPermiso |
|---|---|---|---|
| Parametrización | 1 | (vacío) | 811 |
| Naturaleza de Cuentas | 2 | /menucontabilidad/naturaleza-cuentas | 830 |
| Plan de Cuentas | 2 | (vacío, grupo) | 830 |
| Plan Arbol | 3 | /menucontabilidad/plan-cuentas | 830 |
| Plan Grid | 3 | /menucontabilidad/plan-grid | 830 |
| Centro de Costos | 2 | (vacío, grupo) | 830 |
| Centro Costos Árbol | 3 | /menucontabilidad/centro-costos/arbol | 830 |
| Centro Costos Grid | 3 | /menucontabilidad/centro-costos/grid | 830 |
| Tipos de Asientos | 2 | (vacío, grupo) | 830 |
| General | 3 | /menucontabilidad/tipos-asientos/general | 830 |
| Sistema | 3 | /menucontabilidad/tipos-asientos/sistema | 830 |
| Plantillas | 2 | (vacío, grupo) | 830 |
| General | 3 | /menucontabilidad/plantillas/general | 830 |
| Sistema | 3 | /menucontabilidad/plantillas/sistema | 830 |
| Períodos Contables | 2 | /menucontabilidad/periodo-contable | 830 |
| Reportes Contables | 2 | /menucontabilidad/parametrizacion/reportes-contables | 831 |
| Procesos | 1 | (vacío) | 811 |
| Asientos Dinámico | 2 | /menucontabilidad/procesos/asientos-dinamico | 830 |
| Listado de Asientos | 2 | /menucontabilidad/reportes/listado-asientos | 830 |
| ~~Mayorización~~ | 2 | ~~/menucontabilidad/procesos/mayorizacion~~ | — **comentado, línea 132-137, sin nota de por qué** |
| ~~Listado de Asientos~~ | 2 | ~~/menucontabilidad/listado-asientos~~ | — **comentado, línea 138-143** |
| Mayorización - Proceso | 2 | /menucontabilidad/mayorizacion-proceso | 830 |
| Detalle Mayorización | 2 | /menucontabilidad/procesos/detalle-mayorizacion | 830 |
| Reportes | 1 | (vacío) | 811 |
| Listado de Asientos | 2 | /menucontabilidad/reportes/listado-asientos | 830 |
| Balance General | 2 | /menucontabilidad/reportes/balance-general | 830 |
| ~~Estado de Resultados~~ | 2 | ~~/menucontabilidad/reportes/estado-resultados~~ | — **comentado, línea 175-180** |
| Mayor Analítico | 2 | /menucontabilidad/reportes/mayor-analitico | 830 |
| Mayor Analítico V2 | 2 | /menucontabilidad/reportes/mayor-analitico-v2 | 830 |
| ~~Balance de Prueba~~ | 2 | ~~/menucontabilidad/reportes/balance-prueba~~ | — **comentado, línea 193-198** |
| Regresar | 1 | /menu | (vacío) |

### 2. `src/app/modules/crd/menucreditos/menucreditos.component.ts`

`NavItem[]` literal (**ningún nodo trae `idPermiso`** — el campo no aparece en todo el archivo), más un
bloque en el `constructor()` que empuja 5 nodos adicionales a `Parametrización` **solo si
`esUsuarioUno()`** (TODO temporal documentado en el propio archivo, líneas 296-326). Los marco como
`(condicional, solo usuario 1)`.

Nota sobre `route`: varios nodos de agrupación usan `/menucreditos/parametrizacion` como placeholder
(no navegan de verdad a Parametrización, es solo para que el componente `SideMenuCustomComponent` no
falle sin `route`) — se transcribe tal cual está en el código, sin interpretarlo.

| displayName | profundidad | route | idPermiso |
|---|---|---|---|
| Historicos | 1 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| DELTA21 | 2 | /menucreditos/extr | (vacío) |
| Aportes Por Revisar | 2 | /menucreditos/aportes-revisar | (vacío) |
| Participes Inicial | 2 | /menucreditos/participe-inicial | (vacío) |
| Parametrización | 1 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| Info. General Fondo | 2 | /menucreditos/informacion-general-fondo | (vacío) |
| Tipos | 2 | /menucreditos/tiposCrd | (vacío) |
| Estados | 2 | /menucreditos/estadosCrd | (vacío) |
| Listados | 2 | /menucreditos/listadosCrd | (vacío) |
| Bandas de Cartera *(condicional, solo usuario 1)* | 2 | /menucreditos/bandas-cartera | (vacío) |
| Escala de Calificación de Riesgo *(condicional, solo usuario 1)* | 2 | /menucreditos/escala-calificacion-riesgo | (vacío) |
| Cierre de Cartera *(condicional, solo usuario 1)* | 2 | /menucreditos/cierre-cartera | (vacío) |
| Contabilidad de CRD *(condicional, solo usuario 1)* | 2 | /menucreditos/interruptor-contabilidad | (vacío) |
| Cuentas por Tipo de Aporte *(condicional, solo usuario 1)* | 2 | /menucreditos/cuentas-tipo-aporte | (vacío) |
| Participes | 1 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| Administrar | 2 | /menucreditos/participe-info | (vacío) |
| Consulta | 2 | /menucreditos/entidad-consulta | (vacío) |
| Listado General | 2 | /menucreditos/navegacion-cascada | (vacío) |
| Consolidado | 2 | /menucreditos/consolidado | (vacío) |
| Jubilados | 2 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| Jubilar Participe | 3 | /menucreditos/jubilar-participe | (vacío) |
| Pago Jubilados | 3 | /menucreditos/jubilados | (vacío) |
| Contratos | 1 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| Ingreso | 2 | /menucreditos/contrato-edit | (vacío) |
| Administrar | 2 | /menucreditos/contrato-consulta | (vacío) |
| Dash | 2 | /menucreditos/contrato-dash | (vacío) |
| Prestamos | 1 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| Ingreso | 2 | /menucreditos/prestamo-edit | (vacío) |
| Consulta | 2 | /menucreditos/prestamo-consulta | (vacío) |
| Dash | 2 | /menucreditos/prestamo-dash | (vacío) |
| Consulta Cuotas | 2 | /menucreditos/cuota-consulta | (vacío) |
| Repote Valores Insolutos | 2 | /menucreditos/repote-valores-insolutos | (vacío) |
| Asignación de Seguros | 2 | /menucreditos/asignacion-seguros | (vacío) |
| Cobros | 1 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| **Archivos Descuentos** | 2 | **(sin route — línea 175-178, comentario `// route:` de otra pantalla)** | (vacío) |
| Archivos Petro | 2 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| Carga | 3 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| Carga Aportes | 4 | /menucreditos/archivos-petro/carga/carga-aportes-back | (vacío) |
| Consulta Carga | 4 | /menucreditos/archivos-petro/carga/consulta | (vacío) |
| Generar | 3 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| Generar Archivo | 4 | /menucreditos/archivos-petro/generar/proceso | (vacío) |
| Consulta Generación | 4 | /menucreditos/archivos-petro/generar/consulta | (vacío) |
| Pago Cuota | 2 | /menucreditos/pago-cuotas | (vacío) |
| Cruce de Valores | 2 | /menucreditos/cruce-de-valores | (vacío) |
| Devolución de Aportes | 2 | /menucreditos/devolucion-aportes | (vacío) |
| Cobros Personales | 2 | /menucreditos/cobros-personales | (vacío) |
| Bandeja de Contabilidad | 2 | /menucreditos/bandeja-contabilidad | (vacío) |
| Auditoría de Bandas | 2 | /menucreditos/auditoria-bandas | (vacío) |
| Proceso de Crédito | 2 | /menucreditos/proceso-credito | (vacío) |
| Consulta de Cobros | 2 | /menucreditos/consulta-cobros | (vacío) |
| Seguimiento de Cobros | 2 | /menucreditos/seguimiento-cobros | (vacío) |
| Condonación de Valores | 2 | /menucreditos/acuerdo-condonacion | (vacío) |
| **Dash** | 2 | **(sin route — línea 270-274, comentario `// route: '/menucreditos/participe-dash'`)** | (vacío) |
| Simuladores | 1 | /menucreditos/parametrizacion (placeholder) | (vacío) |
| Crédito Nuevo | 2 | /menucreditos/simulador-credito | (vacío) |
| Préstamo Existente | 2 | /menucreditos/simulador-prestamo | (vacío) |

### 3. `src/app/modules/cxc/menu/menucuentasxcobrar/menucuentasxcobrar.component.ts`

`NavItem[]` literal. **Ningún nodo trae `idPermiso`** (el campo no existe en el archivo). No tiene nodo
"Regresar".

| displayName | profundidad | route | idPermiso |
|---|---|---|---|
| Parametrización | 1 | /menucuentasxcobrar/parametrizacion (placeholder) | (vacío) |
| Grupos de Productos | 2 | /menucuentasxcobrar/parametrizacion/grupos-productos | (vacío) |
| Datos Facturador | 2 | /menucuentasxcobrar/parametrizacion/datos-facturador | (vacío) |
| Datos SRI | 2 | /menucuentasxcobrar/parametrizacion/datos-sri | (vacío) |
| Cobros | 1 | /menucuentasxcobrar/cobros (placeholder) | (vacío) |
| Registrar Cobro | 2 | /menucuentasxcobrar/cobros/registrar | (vacío) |
| Cruce de Anticipo | 2 | /menucuentasxcobrar/cobros/cruce-anticipo | (vacío) |
| Consulta de Cobros | 2 | /menucuentasxcobrar/cobros/consulta | (vacío) |
| Emitir | 1 | /menucuentasxcobrar/emitir (placeholder) | (vacío) |
| Facturas | 2 | /menucuentasxcobrar/emitir/facturas | (vacío) |
| Notas de Crédito | 2 | /menucuentasxcobrar/emitir/notas-credito | (vacío) |
| Notas de Débito | 2 | /menucuentasxcobrar/emitir/notas-debito | (vacío) |
| Liquidación en Compras | 2 | /menucuentasxcobrar/emitir/liquidaciones | (vacío) |
| Retenciones | 2 | /menucuentasxcobrar/emitir/retenciones-v2 | (vacío) |
| Gestionar | 1 | /menucuentasxcobrar/gestionar (placeholder) | (vacío) |
| Documentos Electrónicos | 2 | /menucuentasxcobrar/gestionar/documentos-electronicos | (vacío) |
| Financiar Factura | 2 | /menucuentasxcobrar/gestionar/financiar-factura | (vacío) |
| Reportes | 1 | /menucuentasxcobrar/reportes (placeholder) | (vacío) |
| Dashboard de Ventas | 2 | /menucuentasxcobrar/reportes/dash-ventas | (vacío) |
| ATS y Cuadre 103/104 | 2 | /menucuentasxcobrar/reportes/ats | (vacío) |

**Nota para ÍTEM 2:** `gestionar/facturas` (Consulta Facturas), `gestionar/anticipos` (Anticipo) y
`cobros/abonos-factura` tienen ruta en `app.routes.ts` pero **no aparecen en este árbol** — no hay
ningún nodo de este menú que apunte a esas tres rutas. Confirmado con
`grep -n "gestionar/facturas\|gestionar/anticipos\|cobros/abonos-factura" src/app/modules/cxc/menu/menucuentasxcobrar/menucuentasxcobrar.component.ts` → sin resultados.

### 4. `src/app/modules/cxp/menu/menucuentasxpagar/menucuentasxpagar.component.ts`

`NavItem[]` literal. **Ningún nodo trae `idPermiso`**.

| displayName | profundidad | route | idPermiso |
|---|---|---|---|
| Parametrización | 1 | /menucuentaxpagar/parametrizacion (placeholder) | (vacío) |
| Grupos de Productos | 2 | /menucuentaxpagar/parametrizacion/grupos-productos | (vacío) |
| Datos SRI | 2 | /menucuentaxpagar/parametrizacion/datos-sri | (vacío) |
| ~~Productos~~ | 2 | ~~/menucuentaxpagar/parametrizacion/productos~~ | **comentado, línea 30-34** |
| ~~Proveedores~~ | 2 | ~~/menucuentaxpagar/parametrizacion/proveedores~~ | **comentado, línea 35-39** |
| Procesos | 1 | /menucuentaxpagar/procesos (placeholder) | (vacío) |
| Bandeja Electrónica | 2 | /menucuentaxpagar/procesos/bandeja-electronica | (vacío) |
| Gestión de Documentos | 2 | /menucuentaxpagar/procesos/gestion-documentos | (vacío) |
| Consulta Documentos | 2 | /menucuentaxpagar/procesos/consulta-documentos | (vacío) |
| Nota de Venta (Manual) | 2 | /menucuentaxpagar/procesos/nota-venta-compra-manual | (vacío) |
| Proposición de Pago | 2 | /menucuentaxpagar/procesos/proposicion-pago | (vacío) |
| Sustento tributario (ATS) | 2 | /menucuentaxpagar/procesos/sustento-tributario | (vacío) |
| Pagos | 1 | /menucuentaxpagar/pagos (placeholder) | (vacío) |
| Solicitud de pago | 2 | /menucuentaxpagar/pagos/solicitud | (vacío) |
| Cruce de Anticipo | 2 | /menucuentaxpagar/pagos/cruce-anticipo | (vacío) |
| Reportes | 1 | /menucuentaxpagar/reportes (placeholder) | (vacío) |
| Dashboard | 2 | /menucuentaxpagar/reportes/dashboard | (vacío) |
| Negociaciones | 1 | /menucuentaxpagar/negociaciones (placeholder) | (vacío) |
| Administrar Negociaciones | 2 | /menucuentaxpagar/negociaciones | (vacío) |

### 5. `src/app/modules/rpr/menu/menureportes/menureportes.component.ts`

`NavItem[]` literal. Ningún nodo trae `idPermiso`. Trae cuatro grupos raíz comentados (Contabilidad,
Tesorería, CxP, CxC) que apuntaban todos a la misma ruta `/reportes` — no se transcriben como filas
activas, se listan aparte.

| displayName | profundidad | route | idPermiso |
|---|---|---|---|
| Créditos | 1 | (vacío, grupo) | (vacío) |
| Super de Bancos | 2 | /reportes/creditos/super-bancos | (vacío) |
| Informes Mensuales | 2 | /reportes/creditos/informes-mensuales | (vacío) |
| Recursos Humanos | 1 | /menurecursoshumanos/procesos/reportes-nomina | (vacío) |
| Regresar | 1 | /menu | (vacío) |

Comentados (líneas 14-33): Contabilidad, Tesorería, CxP, CxC — los cuatro con `route: '/reportes'`.

### 6. `src/app/modules/rrh/menu/menurecursoshumanos/menurecursoshumanos.component.ts`

`NavItem[]` literal. Todos los nodos usan `idPermiso: PermisosRrh.<CONSTANTE>` (import de
`../../model/permisos-rrh`) — se transcribe el nombre de la constante, el valor numérico está en el
ÍTEM 4.

| displayName | profundidad | route | idPermiso |
|---|---|---|---|
| Parametrización | 1 | (vacío, grupo) | GRUPO_PARAMETRIZACION |
| Conceptos de nómina | 2 | /menurecursoshumanos/parametrizacion/conceptos-nomina | CONCEPTOS_NOMINA |
| Parámetros anuales | 2 | /menurecursoshumanos/parametrizacion/parametros-anuales | PARAMETROS_ANUALES |
| Tabla de impuesto a la renta | 2 | /menurecursoshumanos/parametrizacion/tabla-impuesto-renta | TABLA_IMPUESTO_RENTA |
| Topes de gastos personales | 2 | /menurecursoshumanos/parametrizacion/topes-gastos-personales | TOPES_GASTOS_PERSONALES |
| Causales de terminación | 2 | /menurecursoshumanos/parametrizacion/causales-terminacion | CAUSALES_TERMINACION |
| Configuración de nómina | 2 | /menurecursoshumanos/parametrizacion/configuracion-nomina | CONFIGURACION_NOMINA |
| Formatos de marcación | 2 | /menurecursoshumanos/parametrizacion/formatos-marcacion | FORMATOS_MARCACION |
| Formatos del archivo bancario | 2 | /menurecursoshumanos/parametrizacion/formatos-archivo-bancario | FORMATOS_ARCHIVO_BANCARIO |
| Departamentos | 2 | /menurecursoshumanos/parametrizacion/departamentos | DEPARTAMENTOS |
| Cargos y puestos | 2 | /menurecursoshumanos/parametrizacion/cargos | CARGOS |
| Departamento — Cargo | 2 | /menurecursoshumanos/parametrizacion/departamento-cargo | DEPARTAMENTO_CARGO |
| Tipos de contrato | 2 | /menurecursoshumanos/parametrizacion/tipos-contrato | TIPOS_CONTRATO |
| Turnos y horarios | 2 | /menurecursoshumanos/parametrizacion/turnos | TURNOS |
| Personal | 1 | (vacío, grupo) | GRUPO_PERSONAL |
| Colaboradores | 2 | /menurecursoshumanos/personal/colaboradores | COLABORADORES |
| Vacaciones | 2 | /menurecursoshumanos/gestion/vacaciones | VACACIONES |
| Permisos y licencias | 2 | /menurecursoshumanos/gestion/permisos-licencias | PERMISOS_LICENCIAS |
| Asistencia | 1 | (vacío, grupo) | GRUPO_ASISTENCIA |
| Marcaciones | 2 | /menurecursoshumanos/asistencia/marcaciones | MARCACIONES |
| Importación de marcaciones | 2 | /menurecursoshumanos/asistencia/importacion | IMPORTACION_MARCACIONES |
| Resumen diario | 2 | /menurecursoshumanos/asistencia/resumen-diario | RESUMEN_DIARIO |
| Horas extra | 2 | /menurecursoshumanos/procesos/horas-extra | HORAS_EXTRA *(duplicado, ver más abajo)* |
| Migración de apertura | 1 | (vacío, grupo) | GRUPO_MIGRACION |
| Saldos de apertura | 2 | /menurecursoshumanos/migracion/saldos-apertura | SALDOS_APERTURA |
| Acumulados | 2 | /menurecursoshumanos/migracion/acumulados | ACUMULADOS |
| Procesos | 1 | (vacío, grupo) | GRUPO_PROCESOS |
| Períodos de nómina | 2 | /menurecursoshumanos/procesos/periodos-nomina | PERIODOS_NOMINA |
| Novedades del período | 2 | /menurecursoshumanos/procesos/novedades-nomina | NOVEDADES_NOMINA |
| Novedades del mes (IESS) | 2 | /menurecursoshumanos/procesos/novedades-iess | NOVEDADES_IESS |
| Planilla de control (IESS) | 2 | /menurecursoshumanos/procesos/planilla-control-iess | PLANILLA_CONTROL_IESS |
| Planillas del IESS | 2 | /menurecursoshumanos/procesos/planillas-iess | PLANILLAS_IESS |
| Horas extra | 2 | /menurecursoshumanos/procesos/horas-extra | HORAS_EXTRA *(duplicado de Asistencia, misma ruta)* |
| Proyección de impuesto a la renta | 2 | /menurecursoshumanos/procesos/proyeccion-ir | PROYECCION_IR |
| Descuentos recurrentes | 2 | /menurecursoshumanos/procesos/descuentos-recurrentes | DESCUENTOS_RECURRENTES |
| Roles de pago | 2 | /menurecursoshumanos/procesos/roles-pago | ROLES_PAGO |
| Órdenes de pago | 2 | /menurecursoshumanos/procesos/ordenes-pago | ORDENES_PAGO |
| Valores no pagados | 2 | /menurecursoshumanos/procesos/valores-no-pagados | VALORES_NO_PAGADOS |
| Pago de beneficios sociales | 2 | /menurecursoshumanos/procesos/pago-beneficios-sociales | PAGO_BENEFICIOS_SOCIALES |
| Reportes de nómina | 2 | /menurecursoshumanos/procesos/reportes-nomina | REPORTES_NOMINA |
| ~~Aportes y retenciones~~ | 2 | ~~/menurecursoshumanos/procesos/aportes~~ | **comentado, línea 321-326, retirado a propósito 2026-08-26 — ver nota extensa en el propio archivo, líneas 298-320: pantalla a medio construir, sin entidad en el backend** |
| Liquidación | 2 | /menurecursoshumanos/procesos/liquidacion | LIQUIDACION |
| Salidas oficiales | 2 | /menurecursoshumanos/procesos/salidas-oficiales | SALIDAS_OFICIALES |
| Reparto de utilidades | 2 | /menurecursoshumanos/procesos/utilidades | UTILIDADES |
| Anticipos a trabajadores | 2 | /menurecursoshumanos/procesos/anticipos | ANTICIPOS_TRABAJADORES |
| Acreditar vacaciones | 2 | /menurecursoshumanos/procesos/acreditar-vacaciones | ACREDITAR_VACACIONES |
| Regresar | 1 | /menu | (vacío) |

### 7. `src/app/modules/tsr/menu/menutesoreria/menutesoreria.component.ts`

`NavItem[]` literal. Todos los nodos usan valores literales genéricos: grupos raíz `idPermiso: 811`,
hojas `idPermiso: 830` (mismo esquema legado que `cnt`, no granular como `rrh`).

| displayName | profundidad | route | idPermiso |
|---|---|---|---|
| Parametrización | 1 | (vacío, grupo) | 811 |
| Bancos | 2 | (vacío, grupo) | 830 |
| Nacionales y Extranjeros | 3 | /menutesoreria/parametrizacion/bancos/nacionales-extranjeros | 830 |
| Mis Bancos | 3 | (vacío, grupo) | 830 |
| Bancos | 4 | /menutesoreria/parametrizacion/bancos/mis-bancos/bancos | 830 |
| Cuentas Bancarias | 4 | /menutesoreria/parametrizacion/bancos/mis-bancos/cuentas-bancarias | 830 |
| Chequeras | 4 | (vacío, grupo) | 830 |
| Solicitud Chequera | 5 | /menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/solicitud | 830 |
| Recepción Chequera | 5 | /menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/recepcion | 830 |
| Cheques | 5 | /menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/cheques | 830 |
| Titulares | 2 | /menutesoreria/parametrizacion/titulares | 830 |
| Cajas Chicas | 2 | /menutesoreria/parametrizacion/caja-chica | 830 |
| Procesos | 1 | (vacío, grupo) | 811 |
| Estado de Cuenta | 2 | /menutesoreria/procesos/estado-cuenta-titular | 830 |
| Anticipos | 2 | (vacío, grupo) | 830 |
| Clientes | 3 | /menutesoreria/procesos/anticipos/clientes | 830 |
| Proveedores | 3 | /menutesoreria/procesos/anticipos/proveedores | 830 |
| Seguimiento | 3 | /menutesoreria/procesos/anticipos/seguimiento | 830 |
| Registrar | 2 | (vacío, grupo) | 830 |
| Ingresos | 3 | /menutesoreria/procesos/registrar/ingresos | 830 |
| Egresos | 3 | /menutesoreria/procesos/registrar/egresos | 830 |
| Caja Chica | 2 | (vacío, grupo) | 830 |
| Gastos | 3 | /menutesoreria/procesos/caja-chica/gastos | 830 |
| Reposición | 3 | /menutesoreria/procesos/caja-chica/reposicion | 830 |
| Cierre | 3 | /menutesoreria/procesos/caja-chica/cierre | 830 |
| Pagos por transferencia | 2 | (vacío, grupo) | 830 |
| Aprobación de pagos | 3 | /menutesoreria/pagos/aprobacion | 830 |
| Generación de archivo | 3 | /menutesoreria/pagos/archivo-banco | 830 |
| Recepción y confirmación | 3 | /menutesoreria/pagos/confirmacion | 830 |
| Consulta y gestión | 3 | /menutesoreria/pagos/consulta | 830 |
| Cheques | 2 | (vacío, grupo) | 830 |
| Cheques generados | 3 | /menutesoreria/procesos/pagos/procesos/cheques-generados | 830 |
| Cheques impresos | 3 | /menutesoreria/procesos/pagos/procesos/cheques-impresos | 830 |
| Cheques entregados | 3 | /menutesoreria/procesos/pagos/procesos/cheques-entregados | 830 |
| Consulta de cheques | 3 | /menutesoreria/procesos/pagos/consulta/cheques | 830 |
| Extractos Bancarios | 2 | (vacío, grupo) | 830 |
| Cargar Extracto | 3 | /menutesoreria/procesos/extractos-bancarios/cargar | 830 |
| Consulta de Extractos | 3 | /menutesoreria/procesos/extractos-bancarios/consulta | 830 |
| Conciliación Contable | 3 | /menutesoreria/procesos/conciliacion-contable | 830 |
| Conciliación — Cierre | 3 | /menutesoreria/procesos/conciliacion/cierre | 830 |
| Tablero de Cumplimiento | 3 | /menutesoreria/procesos/extractos-bancarios/tablero | 830 |
| Regresar | 1 | /menu | (vacío) |

Bloque completo comentado (líneas 200-285): "Cobros" con 10 hojas (Cierre de Caja, Depósitos → Envío/
Ratificación, Consultas → Cobros/Cierres, Procesos → Cobros/Cierres/Depósitos/Ratificación Depósitos),
retirado el 2026-09-07 por decisión del usuario, rutas y componentes vivos. No se transcriben como
filas activas del árbol por estar comentadas; quedan documentadas acá para que el catálogo de permisos
no las pierda si se reactivan.

También se dio de baja por completo (código borrado, no solo comentado) el nodo "Cajas" (Lógicas/
Físicas) el 2026-09-03, commit `cc794d8` — no queda rastro en el árbol actual, se menciona porque el
propio código lo referencia en un comentario (línea 126-130).

### 8. `src/app/modules/tsr/menu/menucreditos/menucreditos.component.ts` — reportado aparte, según pidió el árbitro

**Es un archivo muerto.** Evidencia:
- `export class MenucreditosComponent {}` — clase vacía, sin `navItems`, sin lógica (ver el archivo
  completo, 16 líneas).
- `grep -rn "menu/menucreditos" src/app --include="*.ts"` → sin resultados: ningún archivo `.ts` importa
  este componente por su ruta de archivo.
- `grep -rln "app-menucreditos" src/app --include="*.html"` → sin resultados: su selector no se usa en
  ningún template.
- `grep -n "tsr/menu/menucreditos\|MenucreditosComponent" src/app/app.routes.ts` → la única coincidencia
  de `MenucreditosComponent` en rutas apunta a `./modules/crd/menucreditos/menucreditos.component`
  (línea 1083), **no** a este archivo de `tsr`.
- Su plantilla (`menucreditos.component.html`) es un placeholder literal: `<p>Sección de Créditos.
  Próximamente opciones y procesos.</p>`.

Conclusión: quedó de un copiar y pegar (mismo nombre de clase y selector que el menú real de `crd`),
nunca se conectó a ninguna ruta ni se referenció desde ningún lado. No lo toqué.

### 9. `src/app/modules/dash/menu/menu.component.ts` — NO es un `NavItem[]` literal

Reporto y me detengo acá tal como indica la regla de trabajo. Este menú **no usa el modelo `NavItem`
en absoluto**: es un `MenuComponent` con un método `navigate(ruta: string)` que hace
`router.navigate([`/${ruta}`])`, y el árbol real está codificado como botones HTML planos en
`menu.component.html` (`(click)="navigate('menucontabilidad')"`, etc.), sin ningún array de datos, sin
`idPermiso`, sin anidamiento — es el menú raíz de un solo nivel que lleva a los 7 menús de módulo.
No lo reconstruyo como si fuera un `NavItem[]` porque no lo es; transcribo literalmente lo que el
`.html` contiene (no es interpretación, es el texto tal cual):

| texto del botón | acción `(click)` | ruta resultante |
|---|---|---|
| Contabilidad | navigate('menucontabilidad') | /menucontabilidad |
| Tesorería | navigate('menutesoreria') | /menutesoreria |
| CxP | navigate('menucuentaxpagar') | /menucuentaxpagar |
| CxC | navigate('menucuentasxcobrar') | /menucuentasxcobrar |
| Créditos | navigate('menucreditos') | /menucreditos |
| Reportes | navigate('reportes') | /reportes |
| RRHH | navigate('menurecursoshumanos') | /menurecursoshumanos |

**Corrección del árbitro (2026-09-10):** no hace falta migrar este archivo a `NavItem[]` — eso lo
haría renderizar por `menu-list.component` (sidenav) y le cambiaría la cara a la pantalla de entrada,
un rediseño que nadie pidió. La verificación de permiso para estos 7 botones va dentro de
`navigate(ruta)`, con un mapa `ruta → idPermiso` — mismo efecto que el menú lateral, sin tocar el
diseño.

---

## ÍTEM 2 — Opciones de menú que no llevan a ninguna parte

Medido cruzando el ÍTEM 1 contra las 222 entradas `path:` de `src/app/app.routes.ts` (confirmado con
`grep -c "path:" src/app/app.routes.ts` → `222`), leyendo el archivo completo (1298 líneas) de punta a
punta — no con un grep parcial, porque las rutas hijas son relativas y hace falta ver el nodo padre
para reconstruir la ruta absoluta.

### (a) Opción de menú activa cuyo `route` no existe o no está programada

Solo dos, y las dos ya estaban señaladas en el ÍTEM 1 — **no encontré ninguna otra** entre las ~140
opciones activas de los 9 menús: todas las demás apuntan a un `path` real de `app.routes.ts` con un
componente real (no placeholder) detrás.

| Menú | displayName | Evidencia |
|---|---|---|
| crd | Archivos Descuentos (Cobros) | El nodo **no tiene propiedad `route`** — `src/app/modules/crd/menucreditos/menucreditos.component.ts:174-178`. No hay ningún `path: 'archivos-descuentos'` bajo `menucreditos` en `app.routes.ts` tampoco: `grep -n "archivos-descuentos" src/app/app.routes.ts` → sin resultados. |
| crd | Dash (Cobros) | El nodo tiene el `route` **comentado** — `.../menucreditos.component.ts:270-274` (`// route: '/menucreditos/participe-dash'`). La ruta destino sí existe (`app.routes.ts:1092`, `ParticipeDashComponent`) pero el nodo de menú no la referencia activamente. |

No encontré ningún caso de "ruta existe pero el componente es un placeholder" **entre las opciones
activas** — el único componente placeholder real que hallé (`TsrPlaceholderComponent`, ver `parametrizacion/bancos`
y `parametrizacion/cajas/logicas` en `menutesoreria`) no tiene ninguna opción de menú activa que lo
apunte; cae en la lista (b), no en esta.

### (b) Rutas de `app.routes.ts` a las que ningún menú llega

Reviso las 222 rutas contra los 9 árboles del ÍTEM 1. Excluyo de esta lista los `redirectTo` (son
alias de compatibilidad, no pantallas) y los anoto aparte. Marco con **`(parametrizada)`** las rutas
con `:id`/`:codigo` — su patrón normal es abrirse por `router.navigate` desde una pantalla de listado,
no por menú; el ÍTEM 3 va a confirmar cuáles.

**cnt** (`docs/cnt`):
| route | componente | nota |
|---|---|---|
| /menucontabilidad/naturaleza-cuentas1 | NaturalezaDeCuentasComponent | mismo componente que `naturaleza-cuentas`, con resolver adicional; sin uso de menú detectado |
| /menucontabilidad/procesos/asientos-dinamico/:id | AsientosContablesDinamico | (parametrizada) |
| /menucontabilidad/procesos/mayorizacion | MayorizacionComponent | opción de menú comentada (ver ÍTEM 1, sección 1) |
| /menucontabilidad/listado-asientos | ListadoAsientosComponent | ruta "bare" distinta de `reportes/listado-asientos`; el propio código la navega desde `asientos-contables-dinamico.ts` (no verificado línea exacta en este ítem, es tarea del ÍTEM 3) |

**tsr** (`docs/tsr`, `docs/pagos`):
| route | componente | nota |
|---|---|---|
| /menutesoreria/parametrizacion/bancos | **TsrPlaceholderComponent** | placeholder real, sin opción de menú |
| /menutesoreria/parametrizacion/cajas/logicas | **TsrPlaceholderComponent** | placeholder real; nodo "Cajas" fue dado de baja completa el 2026-09-03 |
| /menutesoreria/parametrizacion/bancos/mis-bancos/chequeras/chequera | ChequeraComponent | mismo componente que la hoja "Cheques" del menú; probable navegación programática desde solicitud/recepción |
| /menutesoreria/procesos/cobros/cierre-caja | CierreCajaComponent | bloque "Cobros" retirado del menú a propósito el 2026-09-07 (comentario en el propio archivo) |
| /menutesoreria/procesos/cobros/depositos/envio | EnvioDepositosComponent | ídem |
| /menutesoreria/procesos/cobros/depositos/ratificacion | RatificacionDepositosComponent | ídem |
| /menutesoreria/procesos/cobros/consultas/cobros | ConsultasCobrosComponent | ídem |
| /menutesoreria/procesos/cobros/consultas/cierres | ConsultasCierresComponent | ídem |
| /menutesoreria/procesos/cobros/procesos/cobros | ProcesosCobrosComponent | ídem |
| /menutesoreria/procesos/cobros/procesos/cierres | ProcesosCierresComponent | ídem |
| /menutesoreria/procesos/cobros/procesos/depositos | ProcesosDepositosComponent | ídem |
| /menutesoreria/procesos/cobros/procesos/ratificacion-depositos | ProcesosRatificacionDepositosComponent | ídem |
| /menutesoreria/procesos/pagos/ingreso | PagosIngresarComponent | sin opción de menú en ningún árbol de los 9 |
| /menutesoreria/procesos/pagos/consulta/pagos | ConsultasPagosComponent | sin opción de menú |
| /menutesoreria/procesos/extractos-bancarios/detalle | DetalleExtractoBancarioComponent | (parametrizada de hecho, sin `:id` en la definición pero funciona como detalle) probable navegación desde consulta de extractos |

*Alias `redirectTo` de tsr, no cuentan como pantalla: `parametrizacion/personas`→titulares,
`parametrizacion/titulares-v2`→titulares, `procesos/aprobacion-pagos`→pagos/aprobacion.*

*Fuera del alcance exacto del ÍTEM 2 pero adyacente y relevante: `src/app/modules/tsr/forms/movimientos-bancarios/{creditos,debitos,transferencias}` — 3 componentes completos en disco que **no tienen ninguna entrada en `app.routes.ts`**, ni siquiera huérfana. No aparecen en esta lista porque no hay `path:` que cruzar; lo señalo porque un inventario de "adónde no llega el menú" se queda corto si no lo menciono.*

**rrh** (`docs/rrh`):
| route | componente | nota |
|---|---|---|
| /menurecursoshumanos/personal/ficha/:codigo | FichaColaboradorComponent | (parametrizada) |
| /menurecursoshumanos/personal/ficha/:codigo/contratos/:codigoContrato | ContratoFormComponent | (parametrizada) |
| /menurecursoshumanos/personal/ficha/:codigo/cuentas-bancarias/:codigoCuenta | CuentaBancariaFormComponent | (parametrizada) |
| /menurecursoshumanos/procesos/periodos-nomina/:codigo | PeriodoNominaDashComponent | (parametrizada) |
| /menurecursoshumanos/procesos/aportes | AporteRetencionListComponent | opción de menú retirada a propósito 2026-08-26 (ver ÍTEM 1, sección 6) — pantalla documentada como a medio construir |
| /menurecursoshumanos/procesos/liquidacion/:codigo | LiquidacionFormComponent | (parametrizada) |

**cxc** (`docs/cxc`):
| route | componente | nota |
|---|---|---|
| /menucuentasxcobrar/emitir/retenciones | Retencionesv2Component | alias funcional legado, mismo componente que `retenciones-v2` (la que sí está en el menú) |
| /menucuentasxcobrar/gestionar/facturas | ConsultaFacturasComponent | sin opción de menú en ningún árbol |
| /menucuentasxcobrar/gestionar/anticipos | AnticipoComponent | sin opción de menú |
| /menucuentasxcobrar/cobros/abonos-factura | AbonosFacturaComponent | sin opción de menú |

**cxp** (`docs/cxp`):
| route | componente | nota |
|---|---|---|
| /menucuentaxpagar/parametrizacion/proveedores | ProveedoresComponent | opción de menú comentada (ÍTEM 1, sección 4) |
| /menucuentaxpagar/pagos/transferencias-legacy | PagosTransferenciaComponent | mantenido a propósito, alcanzable solo por URL (comentario en el propio archivo) |
| /menucuentaxpagar/negociaciones/detalle/:id | DetalleNegociacionComponent | (parametrizada) |

**crd** (`docs/crd`):
| route | componente | nota |
|---|---|---|
| /menucreditos/entidad | EntidadCreditosComponent | huérfana real — sin menú y sin `router.navigate` detectado hacia ella en el resto del árbol |
| /menucreditos/participe-dash | ParticipeDashComponent | el nodo "Dash" del menú tiene esta ruta comentada (ver (a) arriba) |
| /menucreditos/entidad-edit | EntidadEditComponent | probable navegación programática desde `entidad-consulta`/`participe-dash` |
| /menucreditos/archivos-petro/carga/carga-aportes | CargaAportesComponent | el menú solo linkea a la variante `-back`; esta no se referencia desde ningún lado detectado hasta ahora |
| /menucreditos/archivos-petro/carga/detalle/:id | DetalleConsultaCargaComponent | (parametrizada) |
| /menucreditos/archivos-petro/carga/afectacion-por-participe/:id | AfectacionPorParticipeComponent | (parametrizada); implementación paralela a `detalle/:id`, decisión pendiente del usuario según comentario en el propio código |
| /menucreditos/archivos-petro/generar/detalle/:id | DetalleGeneracionArchivoComponent | (parametrizada) |
| /menucreditos/entidad-participe-info | EntidadParticipeInfoComponent | probable navegación programática desde `participe-dash`/`entidad-consulta` |
| /menucreditos/certificados-participe | CertificadosParticipeComponent | probable navegación programática |
| /menucreditos/aportes-dash/:codigoEntidad | AportesDashComponent | (parametrizada) |
| /menucreditos/contrato-edit/:id | ContratoEditComponent | (parametrizada) |

*Alias `redirectTo` de crd, no cuentan como pantalla: `carga-aportes`, `carga-aportes-back`,
`consulta-archivos-petro`, `detalle-consulta-carga/:id`.*

**rpr**: sin hallazgos — las 2 rutas hijas de `reportes` están cubiertas por el menú.

Todas las filas marcadas "probable navegación programática" o "(parametrizada)" son exactamente lo que
el ÍTEM 3 va a confirmar o descartar con `archivo:línea`; las dejo acá porque el árbitro pidió las dos
listas por separado y esta es la del cruce contra menú, no contra navegación interna.

---

## ÍTEM 4 — El choque de códigos que ya existe

`src/app/modules/rrh/model/permisos-rrh.ts` declara exactamente **47 constantes** (confirmado
contándolas una por una en el archivo completo, líneas 15-93). De esas 47:
- **44** están cableadas en un nodo *activo* (visible) del menú de RRHH.
- **1** (`APORTES_RETENCIONES`) está cableada pero en un nodo **comentado** (retirado del menú a
  propósito el 2026-08-26) — no se está evaluando hoy porque la verificación de permisos en
  `menu-list.component.ts` está comentada, pero el día que se reactive, este id no se usa en ningún
  lugar visible.
- **2** (`FICHA_COLABORADOR`, `NOMINA`) están **declaradas pero no se usan en absoluto** — ni en el
  menú ni en ningún otro archivo de `src/app`. Confirmado con
  `grep -rn "PermisosRrh\.(FICHA_COLABORADOR|NOMINA)" src/app` → sin resultados.

| Constante | Valor | Uso (archivo:línea) |
|---|---|---|
| GRUPO_PARAMETRIZACION | 840 | menurecursoshumanos.component.ts:58 |
| GRUPO_PERSONAL | 841 | menurecursoshumanos.component.ts:143 |
| GRUPO_PROCESOS | 842 | menurecursoshumanos.component.ts:218 |
| GRUPO_MIGRACION | 843 | menurecursoshumanos.component.ts:199 |
| GRUPO_ASISTENCIA | 844 | menurecursoshumanos.component.ts:168 |
| CONCEPTOS_NOMINA | 850 | menurecursoshumanos.component.ts:63 |
| PARAMETROS_ANUALES | 851 | menurecursoshumanos.component.ts:69 |
| TABLA_IMPUESTO_RENTA | 852 | menurecursoshumanos.component.ts:75 |
| TOPES_GASTOS_PERSONALES | 853 | menurecursoshumanos.component.ts:81 |
| CAUSALES_TERMINACION | 854 | menurecursoshumanos.component.ts:87 |
| CONFIGURACION_NOMINA | 855 | menurecursoshumanos.component.ts:93 |
| FORMATOS_MARCACION | 856 | menurecursoshumanos.component.ts:99 |
| DEPARTAMENTOS | 857 | menurecursoshumanos.component.ts:111 |
| CARGOS | 858 | menurecursoshumanos.component.ts:117 |
| DEPARTAMENTO_CARGO | 859 | menurecursoshumanos.component.ts:123 |
| TIPOS_CONTRATO | 860 | menurecursoshumanos.component.ts:129 |
| TURNOS | 861 | menurecursoshumanos.component.ts:135 |
| FORMATOS_ARCHIVO_BANCARIO | 862 | menurecursoshumanos.component.ts:105 |
| COLABORADORES | 870 | menurecursoshumanos.component.ts:148 |
| FICHA_COLABORADOR | 871 | **sin uso — declarada y nunca referenciada** |
| VACACIONES | 872 | menurecursoshumanos.component.ts:154 |
| PERMISOS_LICENCIAS | 873 | menurecursoshumanos.component.ts:160 |
| MARCACIONES | 874 | menurecursoshumanos.component.ts:173 |
| SALDOS_APERTURA | 875 | menurecursoshumanos.component.ts:204 |
| ACUMULADOS | 876 | menurecursoshumanos.component.ts:210 |
| RESUMEN_DIARIO | 877 | menurecursoshumanos.component.ts:185 |
| NOMINA | 880 | **sin uso — declarada y nunca referenciada** |
| ROLES_PAGO | 881 | menurecursoshumanos.component.ts:271 |
| APORTES_RETENCIONES | 882 | menurecursoshumanos.component.ts:324 — **dentro de un bloque comentado**, no activo |
| LIQUIDACION | 883 | menurecursoshumanos.component.ts:330 |
| DESCUENTOS_RECURRENTES | 884 | menurecursoshumanos.component.ts:265 |
| PERIODOS_NOMINA | 885 | menurecursoshumanos.component.ts:223 |
| NOVEDADES_NOMINA | 886 | menurecursoshumanos.component.ts:229 |
| HORAS_EXTRA | 887 | menurecursoshumanos.component.ts:191 **y** :253 (dos nodos de menú distintos, misma ruta — duplicado, ver ÍTEM 1 sección 6) |
| PROYECCION_IR | 888 | menurecursoshumanos.component.ts:259 |
| REPORTES_NOMINA | 889 | menurecursoshumanos.component.ts:295 |
| ORDENES_PAGO | 890 | menurecursoshumanos.component.ts:277 |
| IMPORTACION_MARCACIONES | 891 | menurecursoshumanos.component.ts:179 |
| SALIDAS_OFICIALES | 892 | menurecursoshumanos.component.ts:336 |
| UTILIDADES | 893 | menurecursoshumanos.component.ts:342 |
| NOVEDADES_IESS | 894 | menurecursoshumanos.component.ts:235 |
| ANTICIPOS_TRABAJADORES | 895 | menurecursoshumanos.component.ts:348 |
| ACREDITAR_VACACIONES | 896 | menurecursoshumanos.component.ts:354 |
| PAGO_BENEFICIOS_SOCIALES | 897 | menurecursoshumanos.component.ts:289 |
| PLANILLA_CONTROL_IESS | 898 | menurecursoshumanos.component.ts:241 |
| PLANILLAS_IESS | 899 | menurecursoshumanos.component.ts:247 |
| VALORES_NO_PAGADOS | 900 | menurecursoshumanos.component.ts:283 |

Todos los archivos `archivo:línea` de esta tabla son relativos a
`src/app/modules/rrh/menu/menurecursoshumanos/menurecursoshumanos.component.ts`.

Nota aparte, no pedida explícitamente pero relevante para el mismo choque: los menús `cnt` y `tsr`
tampoco usan códigos granulares por pantalla — reutilizan `811` (grupos) y `830`/`831` (hojas) en
prácticamente todos sus nodos (ver ÍTEM 1, secciones 1 y 7). `cxc`, `cxp`, `rpr` y `crd` **no tienen
el campo `idPermiso` en absoluto**. Si el rango 840-900 de `rrh` choca con PCC, es casi seguro que
estos valores compartidos (811/830/831) también van a chocar — pero no hay nada que listar ahí porque
no son 47 constantes con nombre, son 3 números literales repetidos a mano en decenas de nodos.

---

## ÍTEM 3 — Pantallas hijas: qué abre cada pantalla

Relevado con `grep -n "dialog\.open(\|router\.navigate("` sobre cada componente alcanzable desde una
ruta de `app.routes.ts`, repartido en 4 franjas (crd · cxc+cxp · cnt+rrh · tsr+rpr+dash) para no perder
precisión de `archivo:línea`. Total: **149 filas** (67 crd + 29 cxc/cxp + 38 cnt/rrh + 18 tsr/rpr/dash,
más 2 filas de un caso especial en cxp — ver más abajo). Excluidos en las 4 franjas, de forma
consistente: `ConfirmDialogComponent` y equivalentes (confirmación sí/no), todo `*SelectorDialogComponent`
(selección simple de un valor), visores de PDF, snackbars.

### ⚠️ Pantallas con dos hijos del mismo nombre bajo el mismo padre

Pediste marcar esto explícitamente por el `UNIQUE(sistema, nombre, padre)` de `SCP.PJRQ`. Encontré
**dos casos reales** donde el mismo componente-hijo se abre más de una vez desde el mismo padre en
puntos distintos del código — van a necesitar nombre distinto por invocación si cada una es
conceptualmente una pantalla/acción distinta:

| padre | hijo repetido | ocurrencias | archivo:línea |
|---|---|---|---|
| **ParticipeDashComponent** (`/menucreditos/participe-dash`) | `AuditoriaDialogComponent` | **4** | participe-dash.component.ts:2510, 2775, 3135, 3258 |
| **DetalleConsultaCargaComponent** (`/menucreditos/archivos-petro/carga/detalle/:id`) | `CoincidenciasEntidadDialogComponent` | **2** | detalle-consulta-carga.component.ts:835, 1226 |

No leí el `.html`/contexto de cada una de las 6 llamadas para saber si son la misma acción invocada
desde distintos botones (en cuyo caso un solo nodo alcanza) o si cada una abre el diálogo con datos de
una sección distinta (aportes vs. préstamos, por ejemplo) y por lo tanto necesitan 4 y 2 nombres
distintos respectivamente — lo dejo para que lo definas vos con el criterio de negocio.

**Casos que NO cuentan como colisión** (mismo componente-hijo reutilizado desde el mismo padre para la
misma acción genérica — probablemente un solo nodo alcanza, pero los anoto porque también repiten
nombre bajo el mismo padre):
- `GestionDocumentosComponent` → `SubirXmlDialogComponent` ×2 (líneas 949, 1142) — mismo flujo de
  subida de XML desde dos botones distintos de la misma grilla.
- `PagosTransferenciaComponent` → `MotivoDialogComponent` ×3 (líneas 829, 999, 1071).
- `AnticiposComponent`/`DevolucionesAnticipoDialogComponent`/`ValoresNoPagadosComponent`/`AbonosFacturaComponent`/
  etc. → `MotivoDialogComponent` — este diálogo se reutiliza en **muchos padres distintos**, pero como
  el `UNIQUE` es por `(sistema, nombre, padre)`, repetirse en padres *distintos* no choca — solo lo
  menciono para que no se confunda con los dos casos reales de arriba.

### crd (67 filas: 62 + 5 de la cadena de diálogos sin ruta propia)

Medido sobre 54 componentes routeados bajo `menucreditos`. 23 no tuvieron ningún match (confirmado
negativo, no aparecen en `files_with_matches`): `ParametrizacionCreditosComponent`,
`EntidadCreditosComponent` (huérfana Y estática — ni siquiera navega a nada), `ExtersComponent`,
`AportesPorRevisarComponent`, `NavegacionCascadaComponent`, `ConsolidadoComponent`,
`JubilarParticipeComponent`, `DevolucionAportesComponent`, `SimuladorCreditoComponent`,
`SimuladorPrestamoComponent`, `BandejaContabilidadComponent`, `ProcesoCreditoComponent`,
`ConsultaCobrosComponent`, `SeguimientoCobrosComponent`, `AcuerdoCondonacionComponent`,
`EstadosCrdComponent`, `TiposCrdComponent`, `InformacionGeneralFondoComponent`,
`BandasCarteraComponent`, `EscalaCalificacionRiesgoComponent`, `CierreCarteraComponent`,
`InterruptorContabilidadComponent`, `CuentasTipoAporteComponent`, `RepoteValoresInsolutosComponent`.

| pantalla origen | ruta origen | pantalla hija | cómo | archivo:línea | ? |
|---|---|---|---|---|---|
| CruceDeValoresComponent | /menucreditos/cruce-de-valores | ReciboOperacionDialogComponent | dialog | cruce-de-valores.component.ts:795 | ? |
| CruceDeValoresComponent | /menucreditos/cruce-de-valores | PagoPrestamoDialogComponent | dialog | cruce-de-valores.component.ts:845 | |
| CruceDeValoresComponent | /menucreditos/cruce-de-valores | AbonoCapitalDialogComponent | dialog | cruce-de-valores.component.ts:857 | |
| CruceDeValoresComponent | /menucreditos/cruce-de-valores | PrecancelacionDialogComponent | dialog | cruce-de-valores.component.ts:869 | |
| PrestamoEditComponent | /menucreditos/prestamo-edit | PrestamoConsultaComponent | navigate | prestamo-edit.component.ts:992 | |
| ContratoEditComponent | /menucreditos/contrato-edit | ContratoConsultaComponent | navigate | contrato-edit.component.ts:193 | |
| PrestamoDashComponent | /menucreditos/prestamo-dash | PrestamoConsultaComponent | navigate | prestamo-dash.component.ts:984 | |
| AsignacionSegurosComponent | /menucreditos/asignacion-seguros | AsignarSeguroDialogComponent | dialog | asignacion-seguros.component.ts:285 | |
| ContratoDashComponent | /menucreditos/contrato-dash | AportesDashComponent | navigate | contrato-dash.component.ts:312 | |
| ContratoDashComponent | /menucreditos/contrato-dash | ContratoEditComponent | navigate | contrato-dash.component.ts:316 | |
| PrestamoConsultaComponent | /menucreditos/prestamo-consulta | PrestamoDetalleDialogComponent | dialog | prestamo-consulta.component.ts:993 | ? |
| PrestamoConsultaComponent | /menucreditos/prestamo-consulta | PrestamoEditComponent (edición) | navigate | prestamo-consulta.component.ts:1003 | |
| PrestamoConsultaComponent | /menucreditos/prestamo-consulta | PrestamoEditComponent (flujo "generar tabla") | navigate | prestamo-consulta.component.ts:1009 | |
| ContratoConsultaComponent | /menucreditos/contrato-consulta | ContratoEditComponent (edición) | navigate | contrato-consulta.component.ts:331 | |
| ContratoConsultaComponent | /menucreditos/contrato-consulta | ContratoEditComponent (nuevo, sin id) | navigate | contrato-consulta.component.ts:335 | |
| CuotaConsultaComponent | /menucreditos/cuota-consulta | PrestamoDetalleDialogComponent | dialog | cuota-consulta.component.ts:330 | ? |
| AportesDashComponent | /menucreditos/aportes-dash/:codigoEntidad | ContratoDashComponent | navigate | aportes-dash.component.ts:204 | |
| ConsultaGeneracionArchivoComponent | /menucreditos/archivos-petro/generar/consulta | DetalleGeneracionArchivoComponent | navigate | consulta-generacion-archivo.component.ts:286 | |
| CobrosPersonalesComponent | /menucreditos/cobros-personales | PagoPrestamoDialogComponent | dialog | cobros-personales.component.ts:1705 | |
| CobrosPersonalesComponent | /menucreditos/cobros-personales | AbonoCapitalDialogComponent | dialog | cobros-personales.component.ts:1719 | |
| CobrosPersonalesComponent | /menucreditos/cobros-personales | PrecancelacionDialogComponent | dialog | cobros-personales.component.ts:1733 | |
| CobrosPersonalesComponent | /menucreditos/cobros-personales | CobroRegistradoDialogComponent | dialog | cobros-personales.component.ts:1417 | |
| CobrosPersonalesComponent | /menucreditos/cobros-personales | ReciboOperacionDialogComponent | dialog | cobros-personales.component.ts:1612 | ? |
| GenerarArchivoPetroComponent | /menucreditos/archivos-petro/generar/proceso | DetalleGeneracionArchivoComponent | navigate | generar-archivo-petro.component.ts:242 | |
| DetalleConsultaCargaComponent | /menucreditos/archivos-petro/carga/detalle/:id | CoincidenciasEntidadDialogComponent | dialog | detalle-consulta-carga.component.ts:835 | ? — **ver colisión arriba** |
| DetalleConsultaCargaComponent | /menucreditos/archivos-petro/carga/detalle/:id | ProcesoArchivoErrorDialogComponent | dialog | detalle-consulta-carga.component.ts:1065 | ? |
| DetalleConsultaCargaComponent | /menucreditos/archivos-petro/carga/detalle/:id | ConsultaArchivosPetroComponent | navigate | detalle-consulta-carga.component.ts:1082 | |
| DetalleConsultaCargaComponent | /menucreditos/archivos-petro/carga/detalle/:id | CoincidenciasEntidadDialogComponent (2da ocurrencia) | dialog | detalle-consulta-carga.component.ts:1226 | ? — **ver colisión arriba** |
| DetalleConsultaCargaComponent | /menucreditos/archivos-petro/carga/detalle/:id | AfectacionFinancieraCuotasDialogComponent | dialog | detalle-consulta-carga.component.ts:1756 | |
| DetalleConsultaCargaComponent | /menucreditos/archivos-petro/carga/detalle/:id | RevalidarCargaDialogComponent | dialog | detalle-consulta-carga.component.ts:2918 | ? |
| ListadosCrdComponent | /menucreditos/listadosCrd | ProcesosVariosDialogComponent | dialog | listados-crd.component.ts:448 | |
| DetalleGeneracionArchivoComponent | /menucreditos/archivos-petro/generar/detalle/:id | ConsultaGeneracionArchivoComponent | navigate | detalle-generacion-archivo.component.ts:436 | |
| ConsultaArchivosPetroComponent | /menucreditos/archivos-petro/carga/consulta | DetalleConsultaCargaComponent | navigate | consulta-archivos-petro.component.ts:260 | |
| ConsultaArchivosPetroComponent | /menucreditos/archivos-petro/carga/consulta | AfectacionPorParticipeComponent | navigate | consulta-archivos-petro.component.ts:271 | |
| CargaAporteBackComponent | /menucreditos/archivos-petro/carga/carga-aportes-back | DetalleConsultaCargaComponent | navigate | carga-aporte-back.component.ts:511 | |
| PagoCuotasComponent | /menucreditos/pago-cuotas | PagoCuotaDialogComponent | dialog | pago-cuotas.component.ts:580 | |
| PagoCuotasComponent | /menucreditos/pago-cuotas | (`router.navigate(['../'])` relativo — destino no identificable por grep estático) | navigate | pago-cuotas.component.ts:974 | ? |
| BaseInicialParticipesComponent | /menucreditos/participe-inicial | ParticipeDashComponent | navigate | base-inicial-participes.component.ts:196 | |
| AfectacionPorParticipeComponent | /menucreditos/archivos-petro/carga/afectacion-por-participe/:id | ConsultaArchivosPetroComponent | navigate | afectacion-por-participe.component.ts:149 | |
| AfectacionPorParticipeComponent | /menucreditos/archivos-petro/carga/afectacion-por-participe/:id | AfectacionParticipeDialogComponent | dialog | afectacion-por-participe.component.ts:405 | |
| AfectacionPorParticipeComponent | /menucreditos/archivos-petro/carga/afectacion-por-participe/:id | RevalidarCargaDialogComponent | dialog | afectacion-por-participe.component.ts:431 | ? |
| EntidadConsultaComponent | /menucreditos/entidad-consulta | EntidadEditComponent | navigate | entidad-consulta.component.ts:710 | |
| EntidadConsultaComponent | /menucreditos/entidad-consulta | EntidadParticipeInfoComponent | navigate | entidad-consulta.component.ts:723 | |
| EntidadConsultaComponent | /menucreditos/entidad-consulta | ParticipeDashComponent | navigate | entidad-consulta.component.ts:738 | |
| EntidadConsultaComponent | /menucreditos/entidad-consulta | AuditoriaDialogComponent | dialog | entidad-consulta.component.ts:902 | ? |
| ParticipeInfoComponent | /menucreditos/participe-info | (returnUrl dinámico — nota 3) | navigate | participe-info.component.ts:276 | ? |
| EntidadEditComponent | /menucreditos/entidad-edit | (returnUrl dinámico — nota 3) | navigate | entidad-edit.component.ts:357 | ? |
| EntidadEditComponent | /menucreditos/entidad-edit | EntidadConsultaComponent (fallback sin returnUrl) | navigate | entidad-edit.component.ts:360 | |
| ProcesoPagoJubiladosComponent | /menucreditos/jubilados | ParticipeDashComponent | navigate | proceso-pago-jubilados.component.ts:734 | |
| EntidadParticipeInfoComponent | /menucreditos/entidad-participe-info | ExterHistoricoDialogComponent | dialog | entidad-participe-info.component.ts:1046 | ? |
| EntidadParticipeInfoComponent | /menucreditos/entidad-participe-info | (returnUrl dinámico — nota 3) | navigate | entidad-participe-info.component.ts:1175 | ? |
| EntidadParticipeInfoComponent | /menucreditos/entidad-participe-info | ParticipeDashComponent (fallback sin returnUrl) | navigate | entidad-participe-info.component.ts:1183 | |
| ParticipeDashComponent | /menucreditos/participe-dash | BaseInicialParticipesComponent | navigate | participe-dash.component.ts:281 | |
| ParticipeDashComponent | /menucreditos/participe-dash | EntidadConsultaComponent | navigate | participe-dash.component.ts:283 | |
| ParticipeDashComponent | /menucreditos/participe-dash | EntidadParticipeInfoComponent | navigate | participe-dash.component.ts:342 | |
| ParticipeDashComponent | /menucreditos/participe-dash | CertificadosParticipeComponent | navigate | participe-dash.component.ts:361 | |
| ParticipeDashComponent | /menucreditos/participe-dash | AuditoriaDialogComponent (1ra) | dialog | participe-dash.component.ts:2510 | ? — **ver colisión arriba** |
| ParticipeDashComponent | /menucreditos/participe-dash | AuditoriaDialogComponent (2da) | dialog | participe-dash.component.ts:2775 | ? — **ver colisión arriba** |
| ParticipeDashComponent | /menucreditos/participe-dash | AportePagosDialogComponent | dialog | participe-dash.component.ts:3113 | |
| ParticipeDashComponent | /menucreditos/participe-dash | AuditoriaDialogComponent (3ra) | dialog | participe-dash.component.ts:3135 | ? — **ver colisión arriba** |
| ParticipeDashComponent | /menucreditos/participe-dash | AuditoriaDialogComponent (4ta) | dialog | participe-dash.component.ts:3258 | ? — **ver colisión arriba** |
| ParticipeDashComponent | /menucreditos/participe-dash | PrestamoPagosDialogComponent | dialog | participe-dash.component.ts:3584 | |

**Cadena de diálogos sin ruta propia** (`AbonoCapitalDialogComponent`, `PagoPrestamoDialogComponent`,
`PrecancelacionDialogComponent` viven en `crd/dialog/pagos/`, los abren `CobrosPersonalesComponent`/
`CruceDeValoresComponent` de la tabla de arriba, y a su vez ellos abren):

| diálogo padre | diálogo hijo | archivo:línea | ? |
|---|---|---|---|
| AbonoCapitalDialogComponent | CobroRegistradoDialogComponent | abono-capital-dialog.component.ts:313 | ? |
| PrecancelacionDialogComponent | ReciboOperacionDialogComponent | precancelacion-dialog.component.ts:378 | ? |
| PrecancelacionDialogComponent | CobroRegistradoDialogComponent | precancelacion-dialog.component.ts:477 | ? |
| PagoPrestamoDialogComponent | CobroRegistradoDialogComponent | pago-prestamo-dialog.component.ts:319 | ? |
| PagoPrestamoDialogComponent | ReciboOperacionDialogComponent | pago-prestamo-dialog.component.ts:410 | ? |

Excluidos explícitamente en crd: `ConfirmDialogComponent` (`auditoria-bandas.component.ts:266`,
`detalle-consulta-carga.component.ts:1044`, `consulta-archivos-petro.component.ts:286`,
`carga-aporte-back.component.ts:431`) y `PdfParticipeDetalleDialogComponent` (visor PDF, abierto desde
`participe-dash.component.ts:311`).

Notas de crd: (1) los diálogos marcados `?` (`AuditoriaDialogComponent`, `PrestamoDetalleDialogComponent`,
`ExterHistoricoDialogComponent`, `CoincidenciasEntidadDialogComponent`, `ProcesoArchivoErrorDialogComponent`,
`RevalidarCargaDialogComponent`, `ReciboOperacionDialogComponent`, `CobroRegistradoDialogComponent`) no
se verificaron contra su `.html` — el nombre sugiere que varios son de solo lectura pero no está
confirmado. (2) `pago-cuotas.component.ts:974` navega con ruta relativa `['../']`, destino no resoluble
por grep estático. (3) "returnUrl dinámico" (`participe-info.component.ts:276`,
`entidad-edit.component.ts:357`, `entidad-participe-info.component.ts:1175`) — en la práctica el valor
real siempre fue `/menucreditos/entidad-consulta` o `/menucreditos/participe-dash`, ya cubiertos por
otras filas. (4) **Corrección a un supuesto de un relevamiento previo**: `ParticipeDashComponent` **no**
navega directo a `EntidadEditComponent` — solo a `EntidadConsultaComponent`, que es quien navega a
`EntidadEditComponent`. Verificado con grep completo del archivo (11 resultados, ninguno hacia
`entidad-edit`).

### cxc / cxp (29 filas: 27 + 2 de un caso especial)

Excluidos: todo `*SelectorDialogComponent` (`TitularSelectorDialogComponent`,
`ProductoSelectorDialogComponent`, `FacturaSelectorDialogComponent`, `FacturaCompraSelectorDialogComponent`,
`GrupoProductoSelectorDialogComponent`, `PlanCuentaSelectorDialogComponent`,
`DocumentoCruceSelectorDialogComponent`). `MotivoDialogComponent` se incluye marcado `?` (un solo campo
de texto — no es confirmación pura pero tampoco formulario de varios campos).

| pantalla origen | ruta origen | pantalla hija | cómo se abre | archivo:línea | ? |
|---|---|---|---|---|---|
| LiquidacionesComponent | /menucuentasxcobrar/emitir/liquidaciones | AnularDocumentoCompraDialogComponent | dialog | liquidaciones.component.ts:892 | |
| LiquidacionesComponent | /menucuentasxcobrar/emitir/liquidaciones | Retencionesv2Component (/menucuentasxcobrar/emitir/retenciones-v2) | navigate | liquidaciones.component.ts:988 | |
| RegistrarCobroComponent | /menucuentasxcobrar/cobros/registrar | AbonosFacturaComponent (/menucuentasxcobrar/cobros/abonos-factura) | navigate | registrar-cobro.component.ts:220 | |
| CruceAnticipoClienteComponent | /menucuentasxcobrar/cobros/cruce-anticipo | AbonosFacturaComponent (/menucuentasxcobrar/cobros/abonos-factura) | navigate | cruce-anticipo-cliente.component.ts:309 | |
| AnticipoComponent | /menucuentasxcobrar/gestionar/anticipos | MotivoDialogComponent | dialog | anticipo.component.ts:450 | ? |
| ConsultaDocumentosElectronicosComponent | /menucuentasxcobrar/gestionar/documentos-electronicos | AnularDocumentoCompraDialogComponent | dialog | consulta-documentos-electronicos.component.ts:446 | |
| ConsultaDocumentosElectronicosComponent | /menucuentasxcobrar/gestionar/documentos-electronicos | ActualizarEstadoResultadoDialogComponent | dialog | consulta-documentos-electronicos.component.ts:501 | |
| ConsultaDocumentosElectronicosComponent | /menucuentasxcobrar/gestionar/documentos-electronicos | ConsultaSriDialogComponent | dialog | consulta-documentos-electronicos.component.ts:565 | |
| ConsultaFacturasComponent | /menucuentasxcobrar/gestionar/facturas | AnularDocumentoCompraDialogComponent | dialog | consulta-facturas.component.ts:245 | |
| ConsultaFacturasComponent | /menucuentasxcobrar/gestionar/facturas | AbonosFacturaComponent (/menucuentasxcobrar/cobros/abonos-factura) | navigate | consulta-facturas.component.ts:356 | |
| ConsultaCobrosComponent | /menucuentasxcobrar/cobros/consulta | MotivoDialogComponent | dialog | consulta-cobros.component.ts:194 | ? |
| AbonosFacturaComponent | /menucuentasxcobrar/cobros/abonos-factura | MotivoDialogComponent | dialog | abonos-factura.component.ts:134 | ? |
| AbonosFacturaComponent | /menucuentasxcobrar/cobros/abonos-factura | CruceAnticipoClienteComponent (/menucuentasxcobrar/cobros/cruce-anticipo) | navigate | abonos-factura.component.ts:151 | |
| AbonosFacturaComponent | /menucuentasxcobrar/cobros/abonos-factura | RegistrarCobroComponent (/menucuentasxcobrar/cobros/registrar) | navigate | abonos-factura.component.ts:157 | |
| AbonosFacturaComponent | /menucuentasxcobrar/cobros/abonos-factura | ConsultaFacturasComponent (/menucuentasxcobrar/gestionar/facturas) | navigate | abonos-factura.component.ts:163 | |
| NegociacionesComponent | /menucuentaxpagar/negociaciones | DetalleNegociacionComponent (/menucuentaxpagar/negociaciones/detalle/:id) | navigate | negociaciones.component.ts:171 y :239 | |
| DetalleNegociacionComponent | /menucuentaxpagar/negociaciones/detalle/:id | NegociacionesComponent (/menucuentaxpagar/negociaciones) | navigate | detalle-negociacion.component.ts:96 | |
| DetalleNegociacionComponent | /menucuentaxpagar/negociaciones/detalle/:id | PagoDialogComponent | dialog | detalle-negociacion.component.ts:246 | |
| DetalleNegociacionComponent | /menucuentaxpagar/negociaciones/detalle/:id | AdendumDialogComponent | dialog | detalle-negociacion.component.ts:260 | |
| GestionDocumentosComponent | /menucuentaxpagar/procesos/gestion-documentos | ClasificarProductosDialogComponent | dialog | gestion-documentos.component.ts:609 | |
| GestionDocumentosComponent | /menucuentaxpagar/procesos/gestion-documentos | SubirXmlDialogComponent | dialog | gestion-documentos.component.ts:949 y :1142 | |
| GestionDocumentosComponent | /menucuentaxpagar/procesos/gestion-documentos | RegistrarDocumentoDialogComponent | dialog | gestion-documentos.component.ts:1008 | |
| GestionDocumentosComponent | /menucuentaxpagar/procesos/gestion-documentos | MotivoDialogComponent | dialog | gestion-documentos.component.ts:1070 | ? |
| GestionDocumentosComponent | /menucuentaxpagar/procesos/gestion-documentos | ReembolsosFacturaDialogComponent (wrapper de ReembolsosFacturaComponent) | dialog | gestion-documentos.component.ts:1225 | |
| GestionDocumentosComponent | /menucuentaxpagar/procesos/gestion-documentos | RegistroBloqueantesDialogComponent | dialog | gestion-documentos.component.ts:1298 | ? (parece solo listar bloqueantes) |
| GestionDocumentosComponent | /menucuentaxpagar/procesos/gestion-documentos | ErrorRegistroDialogComponent | dialog | gestion-documentos.component.ts:1307 | ? (cercano a "confirmación") |
| GestionDocumentosComponent | /menucuentaxpagar/procesos/gestion-documentos | XmlValidacionErrorDialogComponent | dialog | gestion-documentos.component.ts:1316 | ? (errores de validación XML) |
| ConsultaDocumentosComponent | /menucuentaxpagar/procesos/consulta-documentos | AnularDocumentoCompraDialogComponent | dialog | consulta-documentos.component.ts:352 | |
| PagosTransferenciaComponent | /menucuentaxpagar/pagos/transferencias-legacy | MotivoDialogComponent | dialog | pagos-transferencia.component.ts:829, :999, :1071 | ? |
| CruceAnticipoProveedorComponent | /menucuentaxpagar/pagos/cruce-anticipo | ConsultaDocumentosComponent (/menucuentaxpagar/procesos/consulta-documentos) | navigate | cruce-anticipo-proveedor.component.ts:334 | |

**Caso especial**: `HistorialAbonosFacturaComponent` y `ReembolsosFacturaComponent` **no están
routeados ni se abren por dialog** — están embebidos directamente en el template de
`ConsultaDocumentosComponent` (`consulta-documentos.component.html:458-461`). Por la regla de
granularidad ("solo pantalla, nunca botón") no deberían ser nodos propios — son parte de la misma
pantalla `ConsultaDocumentosComponent`. Pero `HistorialAbonosFacturaComponent`, estando embebido, sí
dispara `router.navigate` hacia rutas reales, así que lo señalo aparte:

| pantalla origen (real) | ruta origen | pantalla hija | cómo | archivo:línea | ? |
|---|---|---|---|---|---|
| ConsultaDocumentosComponent (vía `HistorialAbonosFacturaComponent` embebido) | /menucuentaxpagar/procesos/consulta-documentos | CruceAnticipoProveedorComponent (/menucuentaxpagar/pagos/cruce-anticipo) | navigate | historial-abonos-factura.component.ts:138 y :141 | ? |
| ConsultaDocumentosComponent (vía `HistorialAbonosFacturaComponent` embebido) | /menucuentaxpagar/procesos/consulta-documentos | SolicitudPagoComponent (/menucuentaxpagar/pagos/transferencias → redirectTo pagos/solicitud) | navigate | historial-abonos-factura.component.ts:154 | ? |

Sin resultados en: GruposProductosCobroComponent, DatosFacturadorComponent, DatosSriComponent,
FacturasIngresoComponent, NotasCreditoComponent, NotasDebitoComponent, RetencionesComponent (ruta
legada), AtsComponent, DashVentasComponent, GruposProductosPagoComponent, DatosSriCxpComponent,
ProveedoresComponent, NotaVentaCompraManualComponent, SustentoTributarioComponent,
ReembolsosFacturaComponent, SolicitudPagoComponent, DashboardCxpComponent (todos salvo selectores
excluidos). `datos-sri.component.ts` y `datos-sri-cxp.component.ts`: el botón "Reenviar al SRI" no
abre dialog ni navega — llama directo a un servicio HTTP.

### cnt / rrh (38 filas)

Excluidos: `ConfirmDialogComponent` y auto-navegaciones al mismo componente con otros parámetros.

| pantalla origen | ruta origen | pantalla hija | cómo se abre | archivo:línea | ? |
|---|---|---|---|---|---|
| AsientosContablesDinamico | /menucontabilidad/procesos/asientos-dinamico | PlanCuentaSelectorDialogComponent | dialog | asientos-contables-dinamico.ts:2235 | ? |
| AsientosContablesDinamico | /menucontabilidad/procesos/asientos-dinamico | SubdetalleAsientoDialogComponent | dialog | asientos-contables-dinamico.ts:2667 | |
| AsientosContablesDinamico | /menucontabilidad/procesos/asientos-dinamico | ReporteListadoAsientosComponent | navigate | asientos-contables-dinamico.ts:2778 | |
| ListadoAsientosComponent | /menucontabilidad/listado-asientos (sin menú, ver ÍTEM 2b) | AsientosContablesDinamico | navigate | listado-asientos.component.ts:509, 518, 527 | |
| MayorAnaliticoV2Component | /menucontabilidad/reportes/mayor-analitico-v2 | PlanCuentaSelectorDialogComponent | dialog | mayor-analitico-v2.component.ts:258, 273 | ? |
| MayorAnaliticoV2Component | /menucontabilidad/reportes/mayor-analitico-v2 | MayorAnaliticoAsientoDialogComponent | dialog | mayor-analitico-v2.component.ts:490 | ? |
| CentroArbolComponent | /menucontabilidad/centro-costos/arbol | CentroArbolFormComponent | dialog | centro-arbol.component.ts:272, 305, 342 | |
| CentroGridComponent | /menucontabilidad/centro-costos/grid | CentroGridFormComponent | dialog | centro-grid.component.ts:223 | |
| PlanArbolComponent | /menucontabilidad/plan-cuentas | PlanCuentaAddEditComponent | dialog | plan-arbol.component.ts:702, 729, 749 | |
| PlantillaGeneralComponent | /menucontabilidad/plantillas/general y /plantillas/sistema | DetallePlantillaDialogComponent | dialog | plantilla-general.component.ts:1172 | |
| DetallePlantillaDialogComponent | (abierto desde PlantillaGeneralComponent) | PlanCuentaSelectorDialogComponent | dialog | detalle-plantilla-dialog.component.ts:265 | ? |
| PlantillaGeneralComponent | /menucontabilidad/plantillas/general | **`/menucontabilidad/asientos` — ruta inexistente** | navigate | plantilla-general.component.ts:994 | **BUG confirmado: no hay `path: 'asientos'` bajo `menucontabilidad`; la ruta real es `procesos/asientos-dinamico`. Botón "usar plantilla" roto.** |
| ReportesContablesComponent | /menucontabilidad/parametrizacion/reportes-contables | PlanCuentaSelectorDialogComponent | dialog | reportes-contables.component.ts:292, 310 | ? |
| TipoAsientoGeneralGridComponent | /menucontabilidad/tipos-asientos/general | TipoAsientoDialog | dialog | tipo-asiento-general-grid.component.ts:139, 226 | |
| TipoAsientoSistemaGridComponent | /menucontabilidad/tipos-asientos/sistema | TipoAsientoSistemaDialog | dialog | tipo-asiento-sistema-grid.component.ts:141, 230 | |
| ReporteListadoAsientosComponent | /menucontabilidad/reportes/listado-asientos | AsientosContablesDinamico | navigate | reporte-listado-asientos.component.ts:717 | |
| ReporteMayorAnaliticoComponent | /menucontabilidad/reportes/mayor-analitico | PlanCuentaSelectorDialogComponent | dialog | reporte-mayor-analitico.component.ts:164, 179 | ? |
| ReporteMayorAnaliticoComponent | /menucontabilidad/reportes/mayor-analitico | MayorAnaliticoAsientoDialogComponent | dialog | reporte-mayor-analitico.component.ts:410 | ? |
| MarcacionesComponent | /menurecursoshumanos/asistencia/marcaciones | ResumenDiarioComponent | navigate | marcaciones.component.ts:291 | |
| ResumenDiarioComponent | /menurecursoshumanos/asistencia/resumen-diario | HorasExtraComponent | navigate | resumen-diario.component.ts:267 | |
| ResumenDiarioComponent | /menurecursoshumanos/asistencia/resumen-diario | MarcacionesComponent | navigate | resumen-diario.component.ts:271 | |
| PermisosLicenciasListComponent | /menurecursoshumanos/gestion/permisos-licencias | PermisosLicenciasFormComponent | dialog | permisos-licencias-list.component.ts:344 | |
| PermisosLicenciasListComponent | /menurecursoshumanos/gestion/permisos-licencias | PermisosAprobacionDialogComponent | dialog | permisos-licencias-list.component.ts:359 | ? |
| VacacionesListComponent | /menurecursoshumanos/gestion/vacaciones | VacacionesFormComponent | dialog | vacaciones-list.component.ts:234, 246, 259 | |
| VacacionesListComponent | /menurecursoshumanos/gestion/vacaciones | VacacionesAprobacionDialogComponent | dialog | vacaciones-list.component.ts:440 | ? |
| ColaboradoresComponent | /menurecursoshumanos/personal/colaboradores | FichaColaboradorComponent | navigate | colaboradores.component.ts:182 | |
| ContratoFormComponent | /menurecursoshumanos/personal/ficha/:codigo/contratos/:codigoContrato | FichaColaboradorComponent | navigate | contrato-form.component.ts:216 | |
| CuentaBancariaFormComponent | /menurecursoshumanos/personal/ficha/:codigo/cuentas-bancarias/:codigoCuenta | FichaColaboradorComponent | navigate | cuenta-bancaria-form.component.ts:217 | |
| FichaColaboradorComponent | /menurecursoshumanos/personal/ficha/:codigo | ColaboradoresComponent | navigate | ficha-colaborador.component.ts:265 | |
| FichaColaboradorComponent | /menurecursoshumanos/personal/ficha/:codigo | LiquidacionFormComponent | navigate | ficha-colaborador.component.ts:231 (destino real en resumen-colaborador.ts:146) | |
| SeccionFichaComponent (dentro de FichaColaboradorComponent) | /menurecursoshumanos/personal/ficha/:codigo | ContratoFormComponent **o** CuentaBancariaFormComponent | navigate | seccion-ficha.component.ts:166-171 (según config `seccion.rutaFormulario`) | ? |
| AnticiposComponent | /menurecursoshumanos/procesos/anticipos | AnticipoFormDialogComponent | dialog | anticipos.component.ts:135 | |
| AnticiposComponent | /menurecursoshumanos/procesos/anticipos | AprobarAnticipoDialogComponent | dialog | anticipos.component.ts:183 | ? |
| AnticiposComponent | /menurecursoshumanos/procesos/anticipos | MotivoDialogComponent | dialog | anticipos.component.ts:208 | ? |
| DevolucionesAnticipoDialogComponent (subdiálogo de Anticipos) | /menurecursoshumanos/procesos/anticipos | MotivoDialogComponent | dialog | devoluciones-anticipo-dialog.component.ts:123 | ? |
| AporteRetencionListComponent | /menurecursoshumanos/procesos/aportes (sin menú activo, ver ÍTEM 1/2) | AporteRetencionFormComponent | dialog | aporte-retencion-list.component.ts:263 | pantalla padre documentada como a medio construir |
| LiquidacionFormComponent | /menurecursoshumanos/procesos/liquidacion/:codigo | LiquidacionListComponent | navigate | liquidacion-form.component.ts:382 | |
| LiquidacionListComponent | /menurecursoshumanos/procesos/liquidacion | LiquidacionFormComponent | navigate | liquidacion-list.component.ts:130 (nuevo), 134 (con código) | |
| PeriodoNominaDashComponent | /menurecursoshumanos/procesos/periodos-nomina/:codigo | PrevisualizacionAsientoDialogComponent | dialog | periodo-nomina-dash.component.ts:258 | ? |
| PeriodoNominaDashComponent | /menurecursoshumanos/procesos/periodos-nomina/:codigo | NovedadesIessComponent | navigate | periodo-nomina-dash.component.ts:301 | |
| PeriodoNominaDashComponent | /menurecursoshumanos/procesos/periodos-nomina/:codigo | PeriodosNominaComponent | navigate | periodo-nomina-dash.component.ts:417 | |
| PeriodosNominaComponent | /menurecursoshumanos/procesos/periodos-nomina | PeriodoNominaDashComponent | navigate | periodos-nomina.component.ts:169 | |
| ValoresNoPagadosComponent | /menurecursoshumanos/procesos/valores-no-pagados | RegistrarValorNoPagadoDialogComponent | dialog | valores-no-pagados.component.ts:176 | |
| ValoresNoPagadosComponent | /menurecursoshumanos/procesos/valores-no-pagados | MotivoDialogComponent | dialog | valores-no-pagados.component.ts:200 | ? |

Nota: `seccion-ficha.component.ts` resuelve su destino desde `seccion.rutaFormulario` (config no
rastreada hasta su archivo de origen), pero el patrón de ruta solo tiene dos candidatos posibles en
`app.routes.ts` (`contratos`/`cuentas-bancarias`), ambos ya listados.

### tsr / rpr / dash (18 filas)

`rpr` (reportes-super-bancos, informes-mensuales-credito): **sin resultados**, ningún `dialog.open` ni
`router.navigate`. Excluidos: `TitularSelectorDialogComponent`, `GrupoProductoSelectorDialogComponent`,
`PlanCuentaSelectorDialogComponent`, `DocumentoCruceSelectorDialogComponent`, `ConfirmDialogComponent`.
`tsr/forms/titulares/titulares.component.ts` (versión vieja, sin ruta) queda fuera por no ser
alcanzable; `titulares-v2.component.ts` solo abre diálogos excluidos.

| pantalla origen | ruta origen | pantalla hija | cómo se abre | archivo:línea | ? |
|---|---|---|---|---|---|
| AnticiposClientesComponent | /menutesoreria/procesos/anticipos/clientes | AnularAnticipoDialogComponent | dialog | anticipos-clientes.component.ts:394 | ? |
| AnticiposProveedoresComponent | /menutesoreria/procesos/anticipos/proveedores | AnularAnticipoDialogComponent | dialog | anticipos-proveedores.component.ts:449 | ? |
| SeguimientoAnticiposComponent | /menutesoreria/procesos/anticipos/seguimiento | AnularAnticipoDialogComponent | dialog | seguimiento-anticipos.component.ts:191 | ? |
| GastosCajaChicaComponent | /menutesoreria/procesos/caja-chica/gastos | AdjuntosMovimientoDialogComponent | dialog | gastos-caja-chica.component.ts:655 | ? |
| CargarExtractoBancarioComponent | /menutesoreria/procesos/extractos-bancarios/cargar | DetalleExtractoBancarioComponent | navigate | cargar-extracto-bancario.component.ts:375 | |
| ConsultaExtractosBancariosComponent | /menutesoreria/procesos/extractos-bancarios/consulta | DetalleExtractoBancarioComponent | navigate | consulta-extractos-bancarios.component.ts:188 | |
| DetalleExtractoBancarioComponent | /menutesoreria/procesos/extractos-bancarios/detalle | ConsultaExtractosBancariosComponent | navigate | detalle-extracto-bancario.component.ts:167 | |
| ConciliacionCierreComponent | /menutesoreria/procesos/conciliacion/cierre | ConsultaComponent (pagos-transferencia) | navigate | conciliacion-cierre.component.ts:289 | |
| ArchivoBancoComponent | /menutesoreria/pagos/archivo-banco | ConfirmacionComponent | navigate | archivo-banco.component.ts:279 | |
| ArchivoBancoComponent | /menutesoreria/pagos/archivo-banco | ConsultaComponent (pagos-transferencia) | navigate | archivo-banco.component.ts:283 | |
| RegistroEgresoComponent | /menutesoreria/procesos/registrar/egresos | AprobacionPagosComponent | navigate | registro-egreso.component.ts:378 | |
| ConsultasChequesComponent | /menutesoreria/procesos/pagos/consulta/cheques | destino dinámico (cxp `ConsultaDocumentosComponent` / tsr `RegistroEgresoComponent` / tsr `AnticiposProveedoresComponent`, según `tipoPago` en `model/cheque-listado.ts:74-78`) | navigate | consultas-cheques.component.ts:196 | |
| ChequesEntregadosProcComponent | /menutesoreria/procesos/pagos/procesos/cheques-entregados | mismo destino dinámico de arriba | navigate | cheques-entregados-proc.component.ts:191 | |
| ChequesGeneradosComponent | /menutesoreria/procesos/pagos/procesos/cheques-generados | mismo destino dinámico de arriba | navigate | cheques-generados.component.ts:229 | |
| ChequesImpresosProcComponent | /menutesoreria/procesos/pagos/procesos/cheques-impresos | mismo destino dinámico de arriba | navigate | cheques-impresos-proc.component.ts:239 | |
| LoginComponent | /login | CambioClaveDialogComponent | dialog | login.component.ts:454 | |
| LoginComponent | /login | MenuComponent (o `destinoPedido()`) | navigate | login.component.ts:115 | |
| CambioClaveDialogComponent | (dialog desde /login) | LoginComponent | navigate | cambio-clave-dialog.component.ts:182 | |
| MenuComponent | /menu | LoginComponent | navigate | menu.component.ts:26 | |

Nota aparte: `session-timeout.service.ts:313` abre `SessionTimeoutWarningComponent` globalmente por
inactividad — no tiene "ruta origen" propia, es un servicio del shell autenticado, no una pantalla
routeada. No lo cuento como fila.

---

*(Los 4 ítems del pedido del árbitro están completos en este documento.)*
