# SAA — Alcance del Sistema y Arquitectura

**Versión:** 1.0  
**Fecha:** Julio 2025  
**Plataforma:** Angular 20 + Spring Boot (backend REST)

---

## 1. Resumen Ejecutivo

**SAA (Sistema de Administración y Ahorro)** es una aplicación web empresarial de gestión financiera e institucional. Está orientada a organizaciones (cooperativas, asociaciones u entidades similares) que administran participantes/socios, créditos, aportes, nómina, contabilidad y tesorería desde una única plataforma integrada.

El frontend es una SPA (Single Page Application) Angular 20 que consume una API REST Java (Spring Boot) vía HTTP. Toda la lógica de presentación, filtrado y paginación reside en el cliente; el servidor expone servicios RESTful para cada dominio funcional.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework UI | Angular | 20.x |
| Componentes | Angular Material | 20.x |
| Reactividad | RxJS + Angular Signals | 7.8 / nativo |
| Lenguaje | TypeScript (estricto) | 5.x |
| Estilos | SCSS (arquitectura 7-1 parcial) | — |
| Testing | Karma + Jasmine | 6.4 / 5.x |
| Build | Angular CLI / @angular/build | 20.x |
| Backend | Spring Boot REST (Java) | — |
| Proxy dev | proxy.conf.js (`/api → http://127.0.0.1:8080`) | — |

**Dependencias externas notables:**
- `jsPDF` — generación de PDFs (carga por CDN o `window.jsPDF`)
- No se usa NgRx; el estado compartido se gestiona mediante `AppStateService` (BehaviorSubject) y Signals en componentes

---

## 3. Arquitectura General

### 3.1 Estructura de Carpetas

```
src/
  app/
    app.ts                  ← Shell principal (Header/Footer condicionales)
    app.config.ts           ← Configuración de providers: HTTP, Material, Router
    app.routes.ts           ← Todas las rutas (centralizadas)
    modules/
      cnt/                  ← Contabilidad
      tsr/                  ← Tesorería
      crd/                  ← Créditos
      cxc/                  ← Cuentas por Cobrar
      cxp/                  ← Cuentas por Pagar
      rrh/                  ← Recursos Humanos
      dash/                 ← Dashboard / Login / Menú
      asoprep/              ← Integración ASOPREP (Archivos Petro)
    shared/
      services/             ← Servicios transversales (export, datos, usuario…)
      guard/                ← authGuard, canDeactivateGuard
      interceptors/         ← LoadingInterceptor (spinner global)
      model/                ← Modelos compartidos (Empresa, Usuario, DatosBusqueda…)
      basics/               ← Constantes, tablas reutilizables, confirm-dialog
      components/           ← Componentes compartidos (PlanCuentaSelectorDialog)
      providers/            ← provideMaterial()
      modules/              ← material-form.module
      header/ footer/       ← Shell UI
```

### 3.2 Patrón por Módulo

Cada módulo de dominio sigue la misma estructura interna:

```
modules/<dominio>/
  forms/        ← Componentes Angular (vistas/páginas)
  menu/         ← Componentes de menú/navegación lateral
  model/        ← Interfaces TypeScript (contratos con el backend)
  service/      ← Servicios HTTP (uno por entidad o dominio)
  resolver/     ← Resolvers de datos para rutas con canActivate
  dialog/       ← Diálogos modales específicos del módulo
```

### 3.3 Enrutamiento

- Archivo único: `src/app/app.routes.ts`
- Rutas en español, agrupadas por menú superior (shell de rutas anidadas)
- Algunos componentes usan **lazy loading** (`loadComponent`) para optimizar el bundle inicial
- Todas las rutas protegidas llevan `canActivate: [authGuard]`
- Rutas con formularios de edición llevan `canDeactivate: [canDeactivateGuard]`

### 3.4 Seguridad y Navegación

| Guard | Ubicación | Función |
|---|---|---|
| `authGuard` | `shared/guard/auth.guard.ts` | Verifica `localStorage['logged'] === 'true'`; redirige a `/login` si no autenticado |
| `canDeactivateGuard` | `shared/guard/can-deactivate.guard.ts` | Previene abandono de formularios con cambios sin guardar; el componente implementa `canDeactivate(): boolean` |

La autenticación es basada en `localStorage`. Al iniciar sesión el servidor devuelve datos de usuario y empresa que se almacenan localmente.

### 3.5 Comunicación con el Backend

**Base de endpoints:**
- Desarrollo (proxy): `/api/saa-backend/rest/<recurso>`
- Absoluta (fallback): `http://localhost:8080/saa-backend/rest/<recurso>`

**Constantes de endpoints:**
- Compartidos: `shared/services/ws-share.ts`
- Por módulo: `modules/<dominio>/service/ws-<dominio>.ts`

**Patrón de servicio estándar:**
```typescript
getAll(): Observable<T[]> {
  return this.http.get<T[]>(`${WS.RS_ENTIDAD}/getAll`)
    .pipe(catchError(this.handleError));
}
selectByCriteria(datos: DatosBusqueda): Observable<T[]> {
  return this.http.post<T[]>(`${WS.RS_ENTIDAD}/selectByCriteria`, datos)
    .pipe(catchError(this.handleError));
}
```

**`DatosBusqueda`** es el modelo genérico de criterios de búsqueda/filtro enviado como POST al backend con paginación, fechas y parámetros libres.

### 3.6 Servicios Transversales Compartidos

| Servicio | Descripción |
|---|---|
| `FuncionesDatosService` | Transformaciones de texto, formateo de fechas, `convertirFechaDesdeBackend()` (maneja arrays Java LocalDateTime, strings, timestamps) |
| `ExportService` | Exportación a CSV y PDF (usando jsPDF) desde cualquier componente |
| `AppStateService` | Estado global de la aplicación (empresa activa, usuario, etc.) vía BehaviorSubject |
| `UsuarioService` | CRUD de usuarios y autenticación |
| `LoadingService` + `LoadingInterceptor` | Spinner global activado automáticamente por cada petición HTTP |
| `JasperReportesService` | Invocación de reportes Jasper en el backend |
| `PlanCuentaUtilsService` | Utilidades para selección y validación de plan de cuentas |
| `CentroCostoUtilsService` | Utilidades para centros de costo |
| `DetalleRubroService` | Gestión de detalles de rubros contables |
| `FileService` | Carga y descarga de archivos adjuntos |

---

## 4. Módulos Funcionales

---

### 4.1 Módulo CNT — Contabilidad (`/menucontabilidad`)

**Propósito:** Gestión del proceso contable completo: desde la parametrización del plan de cuentas hasta la generación de estados financieros.

#### 4.1.1 Parametrización Contable

| Función | Ruta | Descripción |
|---|---|---|
| Naturaleza de Cuentas | `naturaleza-cuentas` | Define la naturaleza (activo, pasivo, patrimonio, ingreso, gasto) base del plan de cuentas |
| Plan de Cuentas (árbol) | `plan-cuentas` | Visualización jerárquica del plan de cuentas contable con estructura multinivel |
| Plan de Cuentas (grilla) | `plan-grid` | Gestión tabular del plan de cuentas; alta, edición y activación/inactivación de cuentas |
| Centros de Costo (árbol) | `centro-costos/arbol` | Visualización jerárquica de centros de costo |
| Centros de Costo (grilla) | `centro-costos/grid` | Gestión tabular de centros de costo |
| Tipos de Asiento General | `tipos-asientos/general` | Parametrización de tipos de asiento contable para operaciones generales |
| Tipos de Asiento Sistema | `tipos-asientos/sistema` | Tipos de asiento generados automáticamente por el sistema |
| Plantillas General | `plantillas/general` | Plantillas de asientos contables reutilizables para operaciones frecuentes |
| Plantillas Sistema | `plantillas/sistema` | Plantillas de asientos del sistema (automáticos) |
| Período Contable | `periodo-contable` | Gestión de períodos (apertura, cierre, estado activo/inactivo) |

**Modelos clave:** `PlanCuenta`, `CentroCosto`, `TipoAsiento`, `PlantillaGeneral`, `DetalleePlantilla`, `Periodo`, `NaturalezaCuenta`

#### 4.1.2 Procesos Contables

| Función | Ruta | Descripción |
|---|---|---|
| Asientos Dinámicos | `procesos/asientos-dinamico` | Registro y edición libre de asientos contables con detalle de cuentas y centros de costo |
| Listado de Asientos | `listado-asientos` | Consulta, edición y copia de asientos contables con filtros avanzados |
| Proceso de Mayorización | `procesos/mayorizacion` | Ejecución del proceso de mayorización contable por período |
| Detalle de Mayorización | `procesos/detalle-mayorizacion` | Consulta del resultado de la mayorización por cuenta y período |
| Estado de Mayorización | `mayorizacion-proceso` | Seguimiento del estado de procesos de mayorización en curso |

**Modelos clave:** `Asiento`, `DetalleAsiento`, `Mayorizacion`, `DetalleMayorizacion`, `MayorizacionProceso`, `Saldos`

#### 4.1.3 Reportes Contables

| Función | Ruta | Descripción |
|---|---|---|
| Balance General | `reportes/balance-general` | Estado de situación financiera con activos, pasivos y patrimonio |
| Mayor Analítico | `reportes/mayor-analitico` | Libro mayor por cuenta con movimientos deudores y acreedores |
| Listado de Asientos (reporte) | `reportes/listado-asientos` | Reporte imprimible de asientos contables por período/criterio |

**Modelos clave:** `ReporteContable`, `DetalleReporteContable`, `MayorAnalitico`, `DetalleMayorAnalitico`

---

### 4.2 Módulo TSR — Tesorería (`/menutesoreria`)

**Propósito:** Administración completa de flujos de efectivo: cobros, pagos, bancos, cajas físicas y lógicas, movimientos bancarios y conciliación.

#### 4.2.1 Parametrización de Tesorería

| Función | Ruta | Descripción |
|---|---|---|
| Bancos Nacionales/Extranjeros | `parametrizacion/bancos/nacionales-extranjeros` | Catálogo de bancos del sistema financiero nacional e internacional |
| Mis Bancos | `parametrizacion/bancos/mis-bancos/bancos` | Bancos con los que opera la institución |
| Cuentas Bancarias | `parametrizacion/bancos/mis-bancos/cuentas-bancarias` | Cuentas bancarias propias (corriente, ahorros) |
| Chequeras — Solicitud | `parametrizacion/bancos/mis-bancos/chequeras/solicitud` | Solicitud de nuevas chequeras |
| Chequeras — Recepción | `parametrizacion/bancos/mis-bancos/chequeras/recepcion` | Recepción y activación de chequeras recibidas |
| Cajas Físicas | `parametrizacion/cajas-fisicas` | Definición de cajas físicas de la institución |
| Grupos de Caja | `parametrizacion/cajas-logicas/grupos` | Agrupación lógica de cajas |
| Cajas por Grupo | `parametrizacion/cajas-logicas/cajas-por-grupo` | Asignación de cajas físicas a grupos lógicos |
| Titulares | `parametrizacion/titulares` | Personas/entidades vinculadas a cuentas bancarias |

**Modelos clave:** `Banco`, `CuentaBancaria`, `Chequera`, `CajaFisica`, `CajaLogica`, `GrupoCaja`, `Titular`

#### 4.2.2 Procesos de Cobros

| Función | Ruta | Descripción |
|---|---|---|
| Ingresar Cobro | `procesos-cobros/ingresar` | Registro de cobros (efectivo, cheque, transferencia, tarjeta, retención) |
| Cierre de Caja | `procesos-cobros/cierre-caja` | Proceso de cierre de caja con cuadre de movimientos |
| Envío de Depósitos | `procesos-cobros/depositos/envio` | Envío de depósitos al banco |
| Ratificación de Depósitos | `procesos-cobros/depositos/ratificacion` | Confirmación y ratificación de depósitos enviados |
| Consulta de Cobros | `procesos-cobros/consultas/cobros` | Consulta de cobros registrados por criterio |
| Consulta de Cierres | `procesos-cobros/consultas/cierres` | Historial de cierres de caja |
| Procesos de Cobros | `procesos-cobros/procesos/cobros` | Ejecución de procesos batch sobre cobros |
| Procesos de Cierres | `procesos-cobros/procesos/cierres` | Procesos contables de cierre |
| Procesos de Depósitos | `procesos-cobros/procesos/depositos` | Procesos de depósito masivo |
| Ratificación Depósitos | `procesos-cobros/procesos/ratificacion-depositos` | Proceso de ratificación masiva |

**Modelos clave:** `Cobro`, `CobroEfectivo`, `CobrosTransferencia`, `CobroCheque`, `CobroTarjeta`, `CobroRetencion`, `CierreCaja`, `DetalleCierre`, `Deposito`, `DetalleDeposito`

#### 4.2.3 Procesos de Pagos

| Función | Ruta | Descripción |
|---|---|---|
| Ingreso de Pagos | `procesos-pagos/ingreso` | Registro de órdenes de pago |
| Impresión de Cheques | `procesos-pagos/cheques/impresion` | Cola de impresión de cheques |
| Entrega de Cheques | `procesos-pagos/cheques/entrega` | Registro de entrega de cheques a beneficiarios |
| Consulta de Pagos | `procesos-pagos/consulta/pagos` | Consulta de pagos por criterio |
| Consulta de Cheques | `procesos-pagos/consulta/cheques` | Consulta de cheques emitidos |
| Solicitudes de Pago | `procesos-pagos/procesos/solicitud-pagos` | Proceso de solicitudes de pago pendientes |
| Cheques Generados | `procesos-pagos/procesos/cheques-generados` | Listado de cheques generados en proceso |
| Cheques Impresos | `procesos-pagos/procesos/cheques-impresos` | Confirmación de impresión |
| Cheques Entregados | `procesos-pagos/procesos/cheques-entregados` | Confirmación de entrega final |

**Modelos clave:** `Pago`, `Cheque`, `TempPago`, `TempCobro`, `MotivoPago`, `MotivoCobro`

#### 4.2.4 Movimientos Bancarios

| Función | Ruta | Descripción |
|---|---|---|
| Débitos Bancarios | `movimientos-bancarios/debitos` | Registro de débitos directos en cuentas bancarias |
| Créditos Bancarios | `movimientos-bancarios/creditos` | Registro de créditos en cuentas bancarias |
| Transferencias | `movimientos-bancarios/transferencias` | Transferencias entre cuentas propias |

**Modelos clave:** `DebitoCreditoBancario`, `DetalleDebitoCreditoBancario`, `Transferencia`

#### 4.2.5 Generales de Tesorería

| Función | Ruta | Descripción |
|---|---|---|
| Conciliación Bancaria | `generales/conciliacion` | Proceso de conciliación entre extracto bancario y registros del sistema |
| Consulta Conciliación | `generales/consulta-conciliacion` | Historial y consulta de conciliaciones realizadas |
| RIED | `generales/ried` | Reporte/módulo de Retención en la fuente (SRI Ecuador) |

**Modelos clave:** `Conciliacion`, `DetalleConciliacion`, `SaldoBanco`

---

### 4.3 Módulo CRD — Créditos (`/menucreditos`)

**Propósito:** Administración integral del ciclo de crédito: desde la parametrización de productos hasta la gestión de participantes (socios), préstamos, contratos, aportes y cesantías.

#### 4.3.1 Parametrización de Créditos

| Función | Ruta | Descripción |
|---|---|---|
| Parametrización | `parametrizacion` | Configuración general del módulo de créditos |
| Estados CRD | `estadosCrd` | Definición de estados para entidades del módulo (activo, inactivo, moroso…) |
| Tipos CRD | `tiposCrd` | Catálogos de tipos para préstamos, aportes y contratos |
| Listados CRD | `listadosCrd` | Listados de valores/tablas del dominio de créditos |
| Entidades Externas | `extr` | Registro de entidades externas vinculadas |

**Modelos clave:** `Producto`, `TipoPrestamo`, `MotivosPrestamo`, `TasaPrestamo`, `RequisitoPrestamo`, `EstadoPrestamo`, `TipoAporte`

#### 4.3.2 Gestión de Participantes

| Función | Ruta | Descripción |
|---|---|---|
| Información de Entidad | `entidad` | Dashboard y resumen de una entidad/participante |
| Edición de Entidad | `entidad-edit` | Formulario de alta/edición de entidad (persona natural, jurídica o socio) con canDeactivate |
| Consulta de Entidad | `entidad-consulta` | Búsqueda avanzada de entidades por criterio |
| Info de Partícipe | `participe-info` | Datos biográficos, laborales, económicos y familiares del partícipe |
| Detalle Partícipe-Info | `entidad-participe-info` | Vista integrada entidad + perfil de partícipe |
| Dashboard Partícipe | `participe-dash` | Resumen financiero del partícipe (aportes, préstamos, cuotas pendientes) |
| Base Inicial Partícipes | `participe-inicial` | Carga de saldos iniciales de partícipes al inicio del sistema |

**Modelos clave:** `Entidad`, `Participe`, `PersonaNatural`, `BioProfile`, `PerfilEconomico`, `DireccionTrabajo`, `Direccion`, `Historial-sueldo`

#### 4.3.3 Préstamos

| Función | Ruta | Descripción |
|---|---|---|
| Pago de Cuotas | `pago-cuotas` | Registro y consulta de pagos de cuotas de préstamos |
| Cruce de Valores | `cruce-valores` | Operación de cruce de valores entre cuentas del partícipe |
| Aportes por Revisar | `aportes-revisar` | Listado de aportes pendientes de revisión/autorización |
| Aportes Dashboard | `aportes-dash/:codigoEntidad` | Resumen de aportes de una entidad específica |

**Modelos clave:** `Prestamo`, `DetallePrestamo`, `DatosPrestamo`, `PagoPrestamo`, `MoraPrestamo`, `RelacionPrestamo`, `CreditoMontoAprobacion`

#### 4.3.4 Contratos

| Función | Ruta | Descripción |
|---|---|---|
| Dashboard Contratos | `contrato-dash` | Resumen de contratos de la entidad seleccionada |
| Consulta Contratos | `contrato-consulta` | Búsqueda de contratos por criterio con filtros |
| Edición de Contrato | `contrato-edit` / `contrato-edit/:id` | Alta y edición de contratos con canDeactivate |
| Consulta de Cuotas | `cuota-consulta` | Tabla de cuotas generadas por contrato |

**Modelos clave:** `Contrato`, `TipoContrato`, `MetodoPago`, `DatosPago`, `CesantiaPartícipe`

#### 4.3.5 Aportes y Archivos

| Función | Ruta | Descripción |
|---|---|---|
| Carga de Aportes | `carga-aportes` | Importación masiva de aportes desde archivo (con canDeactivate) |
| Carga de Aportes Back | `carga-aportes-back` | Proceso inverso/reversión de carga de aportes |
| Consulta Archivos Petro | `consulta-archivos-petro` | Consulta de archivos cargados desde sistema PETROECUADOR |
| Detalle Consulta Carga | `detalle-consulta-carga/:id` | Detalle de una carga de archivo específica |

**Modelos clave:** `Aporte`, `PagoAporte`, `CargaArchivo`, `DetalleCargaArchivo`, `NovedadCarga`, `ParticipeXCargaArchivo`

#### 4.3.6 Navegación y Acceso

| Función | Ruta | Descripción |
|---|---|---|
| Navegación en Cascada | `navegacion-cascada` | Vista navegacional jerárquica entidad → préstamos → cuotas |
| Dashboard Entidad | `participe-dash` | Resumen rápido del estado financiero del participante |

---

### 4.4 Módulo CXC — Cuentas por Cobrar (`/menucuentasxcobrar`)

**Propósito:** Gestión de documentos de cobro, productos facturables, grupos, financiaciones e impuestos aplicables a los cobros.

| Función | Ruta | Descripción |
|---|---|---|
| Grupos de Productos | `grupo-productos` | Parametrización de grupos que clasifican productos/servicios cobrados |

**Entidades del modelo:**
- `DocumentoCobro` — Documento maestro de cobro
- `DetalleDocumentoCobro` — Líneas de detalle del documento
- `FinanciacionXDocumentoCobro` — Plan de financiación asociado
- `CuotaXFinanciacionCobro` — Cuotas del plan de financiación
- `ComposicionCuotaInicialCobro` — Composición de la cuota inicial
- `GrupoProductoCobro` — Grupo al que pertenece el producto
- `ProductoCobro` — Producto o servicio cobrado
- `ImpuestoXGrupoCobro` — Impuestos configurados por grupo
- `ValorImpuestoDocumentoCobro` / `ValorImpuestoDetalleCobro` — Valores de impuesto calculados
- `ResumenValorDocumentoCobro` — Totales y resumen del documento
- `PagosArbitrariosXFinanciacion` — Pagos fuera del cronograma normal

> *El módulo CXC está en fase de desarrollo activo; su menú principal está registrado pero la mayoría de rutas hijas están previstas como extensión futura.*

---

### 4.5 Módulo CXP — Cuentas por Pagar (`/menucuentaxpagar`)

**Propósito:** Gestión de documentos de pago a proveedores y acreedores, con flujo de aprobación por montos, financiación e impuestos.

**Entidades del modelo:**
- `DocumentoPago` — Documento de orden de pago
- `DetalleDocumentoPago` — Líneas del documento
- `FinanciacionXDocumentoPago` — Plan de financiación
- `CuotaXFinanciacionPago` — Cuotas del plan
- `ComposicionCuotaInicialPago` — Composición de cuota inicial
- `GrupoProductoPago` / `ProductoPago` — Grupos y productos pagados
- `ImpuestoXGrupoPago` — Impuestos por grupo
- `MontoAprobacion` — Umbral de monto para aprobación
- `AprobacionXMonto` / `AprobacionXProposicionPago` — Matriz de aprobación
- `UsuarioXAprobacion` — Usuario responsable de aprobación
- `ProposicionPagoXCuota` — Proposal de pago por cuota
- `PagosArbitrariosXFinanciacion` — Pagos extraordinarios

> *El módulo CXP tiene el menú principal registrado; el desarrollo de las rutas hijas se implementará en fases posteriores.*

---

### 4.6 Módulo RRH — Recursos Humanos (`/menurrh` y `/menurecursoshumanos`)

**Propósito:** Administración del ciclo completo de RRHH: parametrización organizacional, gestión de personal, generación de nómina y reportes.

> *El sistema define dos rutas de menú (menurrh / menurecursoshumanos) con idénticas rutas hijas, lo que permite acceder al módulo desde diferentes puntos de navegación.*

#### 4.6.1 Parametrización de RRHH

| Función | Ruta | Descripción |
|---|---|---|
| Departamentos-Cargo | `parametrizacion/departamento-cargo` | Asignación de cargos a departamentos |
| Departamentos | `parametrizacion/departamentos` | Estructura organizacional de departamentos |
| Cargos | `parametrizacion/cargos` | Catálogo de cargos/posiciones |
| Asignación Dpto.-Cargo | `parametrizacion/cargos/asignacion-departamentos` | Relación bidireccional cargo ↔ departamento |
| Tipos de Contrato | `parametrizacion/tipos-contrato` | Modalidades contractuales (indefinido, temporal, a prueba…) |
| Turnos | `parametrizacion/turnos` | Configuración de turnos laborales |

**Modelos clave:** `Departamento`, `DepartamentoCargo`, `Cargo`, `TipoContratoEmpleado`, `Turno`, `DetallesTurno`

#### 4.6.2 Gestión de Personal

| Función | Ruta | Descripción |
|---|---|---|
| Empleados | `gestion/empleados` | Registro y gestión de empleados activos |
| Historial de Cargo | `gestion/empleados/historial-cargo` | Historial de cambios de cargo/posición del empleado |
| Contratos | `gestion/contratos` | Contratos laborales por empleado |
| Vacaciones | `gestion/vacaciones` | Gestión de solicitudes y saldo de vacaciones |
| Permisos y Licencias | `gestion/permisos-licencias` | Registro de permisos, licencias médicas y ausencias |
| Asistencia | `gestion/asistencia` | Control de asistencia y marcaciones |

**Modelos clave:** `Empleado`, `ContratoEmpleado`, `AnexoContrato`, `SolicitudVacaciones`, `SaldoVacaciones`, `PermisoLicencia`, `Marcaciones`

#### 4.6.3 Procesos de RRHH

| Función | Ruta | Descripción |
|---|---|---|
| Nómina | `procesos/nomina` | Cálculo y generación de nómina mensual |
| Roles de Pago | `procesos/roles-pago` | Generación de roles de pago individuales |
| Aportes (IESS) | `procesos/aportes` | Cálculo de aportes patronal e individual al IESS |
| Liquidaciones | `procesos/liquidaciones` | Liquidaciones de haberes por terminación de relación laboral |

**Modelos clave:** `Nomina`, `RolPago`, `ReglonNomina`, `ResumenNomina`, `AportesRetenciones`, `Liquidacion`, `DetalleLiquidacion`, `PeriodoNomina`

#### 4.6.4 Reportes de RRHH

| Función | Ruta | Descripción |
|---|---|---|
| Reporte de Roles | `reportes/roles` | Impresión de roles de pago individuales y masivos |
| Reporte de Vacaciones | `reportes/vacaciones` | Reporte de saldos y consumo de vacaciones |
| Reporte de Asistencia | `reportes/asistencia` | Reporte de asistencia por período y empleado |
| Reporte de Nómina | `reportes/nomina` | Reporte global de nómina con totales y desglose |

---

### 4.7 Módulo DASH — Dashboard y Navegación (`/`)

**Propósito:** Punto de entrada de la aplicación. Gestiona el login y los menús principales de acceso a cada módulo.

| Función | Descripción |
|---|---|
| Login | Autenticación con usuario y contraseña; almacena sesión en localStorage |
| Menú Principal | Pantalla con accesos directos a los módulos habilitados para el usuario/rol |
| Selección de Empresa | Si el usuario tiene acceso a múltiples empresas, selecciona la activa |
| Header/Footer | Componentes shell presentes en todas las rutas excepto `/` y `/login` |

---

### 4.8 Módulo ASOPREP — Integración PETROECUADOR

**Propósito:** Módulo especializado para la integración con el sistema de nómina/aportes de PETROECUADOR. Permite cargar, validar y procesar archivos de aportes y transacciones provenientes de ese sistema.

| Función | Descripción |
|---|---|
| Carga de Archivos Petro | Importación de archivos planos o CSV desde PETROECUADOR |
| Consulta de Archivos | Historial de archivos cargados con estado de procesamiento |
| Detalle de Carga | Revisión línea a línea del contenido de cada archivo |
| Partícipes ASOPREP | Cruce de partícipes entre SAA y el archivo externo |
| Transacciones ASOPREP | Registro de transacciones resultado del procesamiento del archivo |

**Modelos clave:** `CuentaAsoprep`, `ParticipeAsoprep`, `TransaccionesAsoprep`, `AporteAsoprep`

> *Este módulo está integrado funcionalmente con el módulo CRD — las cargas de aportes desde Petro se reflejan directamente en los aportes de los partícipes.*

---

## 5. Flujo de Datos Típico

```
Usuario → Componente Angular
  → Formulario de criterios (DatosBusqueda)
    → Servicio HTTP (POST /selectByCriteria)
      → Backend Spring Boot
        → Base de datos Oracle/PostgreSQL
      ← Observable<T[]>
    ← Datos paginados (slice local)
  → MatTable + MatPaginator
← Vista reactiva (Signals / async pipe)
```

**Proceso de guardado:**
```
Formulario (ReactiveForm / Template-driven)
  → Validación Angular
    → service.save(entidad) / service.update(entidad)
      → PUT/POST /save o /update
        ← Entidad persistida
      → Snackbar feedback (éxito/error)
    → Navegación (router.navigate / canDeactivate)
```

---

## 6. Patrones de Implementación

### 6.1 Componentes (Angular 20 Standalone)

```typescript
@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatTableModule, ...],
  ...
})
export class MiListaComponent implements OnInit {
  // Estado con Signals
  loading = signal<boolean>(false);
  items = signal<Entidad[]>([]);
  errorMsg = signal<string>('');

  // Inyección funcional
  private service = inject(MiService);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void { this.cargarDatos(); }

  cargarDatos(): void {
    this.loading.set(true);
    this.service.getAll().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: () => { this.errorMsg.set('Error al cargar'); this.loading.set(false); }
    });
  }
}
```

### 6.2 Fechas del Backend

Java serializa `LocalDateTime` como array `[year, month, day, hour, min, sec, nano]`. La conversión se centraliza en:

```typescript
// En cualquier componente
private funcionesDatos = inject(FuncionesDatosService);

formatFecha(fecha: any): string {
  const date = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
  return date ? format(date, 'dd/MM/yyyy') : '—';
}
```

### 6.3 Exportación

```typescript
private exportService = inject(ExportService);

exportarCSV(): void {
  this.exportService.exportToCSV(this.allData, 'reporte-nombre', ['Col1', 'Col2', 'Col3']);
}

exportarPDF(): void {
  this.exportService.exportToPDF(this.allData, 'reporte-nombre', ['Col1', 'Col2'], 'Título');
}
```

---

## 7. Mapeo de Dominio y Entidades Principales

| Módulo | Entidades Centrales | Descripción |
|---|---|---|
| CNT | Asiento, PlanCuenta, Periodo | Contabilidad base |
| TSR | Cobro, Pago, CuentaBancaria | Caja y bancos |
| CRD | Entidad, Prestamo, Contrato, Aporte | Crédito de socios |
| CXC | DocumentoCobro, ProductoCobro | Facturación cobro |
| CXP | DocumentoPago, AprobacionXMonto | Facturación pago |
| RRH | Empleado, Nomina, Contrato | RRHH y nómina |
| ASOPREP | CargaArchivo, AporteAsoprep | Integración Petro |

---

## 8. Consideraciones de Calidad y Despliegue

### 8.1 Testing
- Framework: **Karma + Jasmine**
- Tests unitarios para servicios y componentes en archivos `*.spec.ts`
- Comando: `npm test`
- Reporte JUnit XML: `test-results.xml`

### 8.2 Build y Despliegue
- Desarrollo: `npm start` (ng serve con proxy `/api → :8080`)
- Producción: `npm run build:prod` (ejecuta `build-production.ps1`)
- Configuración de ambientes: `src/environments/environment.ts` (dev) y `environment.prod.ts` (prod)

### 8.3 Proxy de Desarrollo
```json
// proxy.conf.json
"/api": {
  "target": "http://127.0.0.1:8080",
  "pathRewrite": { "^/api": "" },
  "changeOrigin": true
}
```

### 8.4 Estilo de Código
- TypeScript estricto (`strict: true` en `tsconfig.json`)
- Prettier para formateo (printWidth: 100, singleQuote: true)
- Commits convencionales: `feat(cnt): ...`, `fix(tsr): ...`
- Branches: `feature/<modulo>-<descripcion>` desde `develop`

---

## 9. Resumen de Rutas por Módulo

| Menú/Módulo | # Rutas | Áreas Funcionales |
|---|---|---|
| menucontabilidad | ~15 | Parametrización, Procesos, Reportes |
| menutesoreria | ~25 | Bancos/Cajas, Cobros, Pagos, Movimientos, Conciliación |
| menucreditos | ~25 | Participantes, Préstamos, Contratos, Aportes, Archivos |
| menuurh/menurecursoshumanos | ~16 | Parametrización, Gestión, Procesos, Reportes |
| menucuentasxcobrar | ~2 | Grupos (en desarrollo) |
| menucuentaxpagar | ~1 | Menú principal (en desarrollo) |
| dash | — | Login, Menú, Selección empresa |
| asoprep | — | Integrado en CRD (archivos petro) |

**Total de componentes de rutas:** ~84 rutas activas protegidas con `authGuard`

---

*Documento generado a partir del análisis del código fuente de saaFE v1 — Julio 2025*
