import { Routes } from '@angular/router';
import { NaturalezaCuentaResolverService } from './modules/cnt/resolver/naturaleza-cuenta-resolver.service';
import { LoginComponent } from './modules/dash/forms/login/login.component';
import { MenuComponent } from './modules/dash/menu/menu.component';
import { ReportesSuperBancosComponent } from './modules/rpr/forms/reportes-super-bancos/reportes-super-bancos.component';
import { InformesMensualesCreditoComponent } from './modules/rpr/forms/informes-mensuales-credito/informes-mensuales-credito.component';
import { MenureportesComponent } from './modules/rpr/menu/menureportes/menureportes.component';
import { authGuard } from './shared/guard/auth.guard';
import { canDeactivateGuard } from './shared/guard/can-deactivate.guard';
import { usuarioUnoGuard } from './shared/guard/usuario-uno.guard';
import { ConsultaCargaArchivoResolverService } from './modules/crd/resolver/consulta-carga-archivo-resolver.service';
import { entidadEditResolver } from './modules/crd/resolver/entidad-edit.resolver';
import { EstadosResolverService } from './modules/crd/resolver/estados-resolver.service';
import { ListadosCrdResolverService } from './modules/crd/resolver/listados-crd-resolver.service';
import { TiposCrdResolverService } from './modules/crd/resolver/tipos-crd-resolver.service';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'menu',
    component: MenuComponent,
    canActivate: [authGuard],
  },
  {
    path: 'reportes',
    component: MenureportesComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'creditos/super-bancos',
        component: ReportesSuperBancosComponent,
        canActivate: [authGuard],
      },
      {
        path: 'creditos/informes-mensuales',
        component: InformesMensualesCreditoComponent,
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'menucontabilidad',
    loadComponent: () => import('./modules/cnt/menu/menucontabilidad/menucontabilidad.component').then((m) => m.MenuContabilidadComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'naturaleza-cuentas',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/naturaleza-cuentas/naturaleza-cuentas.component').then((m) => m.NaturalezaDeCuentasComponent),
      },
      {
        path: 'naturaleza-cuentas1',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/naturaleza-cuentas/naturaleza-cuentas.component').then((m) => m.NaturalezaDeCuentasComponent),
        canDeactivate: [canDeactivateGuard],
        resolve: {
          naturalezaCuentas: NaturalezaCuentaResolverService,
        },
      },
      {
        path: 'plan-cuentas',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/plan-arbol/plan-arbol.component').then((m) => m.PlanArbolComponent),
      },
      {
        path: 'plan-grid',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/plan-grid/plan-grid.component').then((m) => m.PlanGridComponent),
      },
      {
        path: 'centro-costos/arbol',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/centro-arbol/centro-arbol.component').then((m) => m.CentroArbolComponent),
      },
      {
        path: 'centro-costos/grid',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/centro-grid/centro-grid.component').then((m) => m.CentroGridComponent),
      },
      {
        path: 'tipos-asientos/general',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/tipo-asiento-general-grid/tipo-asiento-general-grid.component').then((m) => m.TipoAsientoGeneralGridComponent),
      },
      {
        path: 'tipos-asientos/sistema',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/tipo-asiento-sistema-grid/tipo-asiento-sistema-grid.component').then((m) => m.TipoAsientoSistemaGridComponent),
      },
      {
        path: 'plantillas/general',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/plantilla-general/plantilla-general.component').then((m) => m.PlantillaGeneralComponent),
        canDeactivate: [canDeactivateGuard],
        data: { sistema: 0 },
      },
      {
        path: 'plantillas/sistema',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/plantilla-general/plantilla-general.component').then((m) => m.PlantillaGeneralComponent),
        canDeactivate: [canDeactivateGuard],
        data: { sistema: 1 },
      },
      {
        path: 'parametrizacion/reportes-contables',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/reportes-contables/reportes-contables.component').then((m) => m.ReportesContablesComponent),
      },
      {
        path: 'periodo-contable',
        loadComponent: () => import('./modules/cnt/forms/parametrizacion/periodo-contable/periodo-contable.component').then((m) => m.PeriodoContableComponent),
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'procesos/asientos-dinamico',
        loadComponent: () => import('./modules/cnt/forms/asientos-contables-dinamico/asientos-contables-dinamico').then((m) => m.AsientosContablesDinamico),
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'procesos/asientos-dinamico/:id',
        loadComponent: () => import('./modules/cnt/forms/asientos-contables-dinamico/asientos-contables-dinamico').then((m) => m.AsientosContablesDinamico),
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'procesos/mayorizacion',
        loadComponent: () => import('./modules/cnt/forms/mayorizacion/mayorizacion.component').then((m) => m.MayorizacionComponent),
        canActivate: [authGuard],
      },
      {
        path: 'procesos/detalle-mayorizacion',
        loadComponent: () => import('./modules/cnt/forms/detalle-mayorizacion/detalle-mayorizacion.component').then((m) => m.DetalleMayorizacionComponent),
        canActivate: [authGuard],
      },
      {
        path: 'listado-asientos',
        loadComponent: () => import('./modules/cnt/forms/listado-asientos/listado-asientos.component').then((m) => m.ListadoAsientosComponent),
        canActivate: [authGuard],
      },
      {
        path: 'mayorizacion-proceso',
        loadComponent: () => import('./modules/cnt/forms/mayorizacion-proceso/mayorizacion-proceso.component').then((m) => m.MayorizacionProcesoComponent),
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'reportes/balance-general',
        loadComponent: () => import('./modules/cnt/forms/reporte-balance-general/reporte-balance-general.component').then((m) => m.ReporteBalanceGeneralComponent),
        canActivate: [authGuard],
        data: { title: 'Balance General' },
      },
      {
        path: 'reportes/mayor-analitico',
        loadComponent: () => import('./modules/cnt/forms/reporte-mayor-analitico/reporte-mayor-analitico.component').then((m) => m.ReporteMayorAnaliticoComponent),
        canActivate: [authGuard],
        data: { title: 'Mayor Analítico' },
      },
      {
        path: 'reportes/listado-asientos',
        loadComponent: () => import('./modules/cnt/forms/reporte-listado-asientos/reporte-listado-asientos.component').then((m) => m.ReporteListadoAsientosComponent),
        canActivate: [authGuard],
        data: { title: 'Listado de Asientos' },
      },
      // Puedes agregar más rutas hijas aquí
    ],
  },
  {
    path: 'menutesoreria',
    loadComponent: () => import('./modules/tsr/menu/menutesoreria/menutesoreria.component').then((m) => m.MenutesoreriaComponent),
    canActivate: [authGuard],
    children: [
      // Parametrización
      {
        path: 'parametrizacion/bancos',
        loadComponent: () => import('./modules/tsr/forms/placeholder/tsr-placeholder.component').then((m) => m.TsrPlaceholderComponent),
        canActivate: [authGuard],
        data: { title: 'Bancos' },
      },
      {
        path: 'parametrizacion/cajas/logicas',
        loadComponent: () => import('./modules/tsr/forms/placeholder/tsr-placeholder.component').then((m) => m.TsrPlaceholderComponent),
        canActivate: [authGuard],
        data: { title: 'Cajas Lógicas' },
      },
      {
        path: 'parametrizacion/cajas/fisicas',
        loadComponent: () => import('./modules/tsr/forms/cajas-logicas/cajas-fisicas/cajas-fisicas.component').then((m) => m.CajasFisicasComponent),
        canActivate: [authGuard],
        data: { title: 'Cajas Físicas' },
      },
      {
        path: 'parametrizacion/bancos/nacionales-extranjeros',
        loadComponent: () => import('./modules/tsr/forms/bancos/bancos-nacionales-extranjeros.component').then((m) => m.BancosNacionalesExtranjerosComponent),
        canActivate: [authGuard],
        data: { title: 'Nacionales y Extranjeros' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/bancos',
        loadComponent: () => import('./modules/tsr/forms/bancos/bancos.component').then((m) => m.BancosComponent),
        canActivate: [authGuard],
        data: { title: 'Mis Bancos - Bancos' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/cuentas-bancarias',
        loadComponent: () => import('./modules/tsr/forms/cuentas-bancarias/cuentas-bancarias.component').then((m) => m.CuentasBancariasComponent),
        canActivate: [authGuard],
        data: { title: 'Mis Bancos - Cuentas Bancarias' },
      },
      {
        path: 'parametrizacion/caja-chica',
        loadComponent: () => import('./modules/tsr/forms/caja-chica/parametrizacion/cajas-chicas.component').then((m) => m.CajasChicasComponent),
        canActivate: [authGuard],
        data: { title: 'Cajas Chicas' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/chequeras/solicitud',
        loadComponent: () => import('./modules/tsr/forms/chequeras/solicitud-chequera/solicitud-chequera.component').then((m) => m.SolicitudChequeraComponent),
        canActivate: [authGuard],
        data: { title: 'Solicitud Chequera' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/chequeras/chequera',
        loadComponent: () => import('./modules/tsr/forms/chequeras/chequera/chequera.component').then((m) => m.ChequeraComponent),
        canActivate: [authGuard],
        data: { title: 'Chequera' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/chequeras/recepcion',
        loadComponent: () => import('./modules/tsr/forms/chequeras/recepcion-chequera/recepcion-chequera.component').then((m) => m.RecepcionChequeraComponent),
        canActivate: [authGuard],
        data: { title: 'Recepción Chequera' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/chequeras/cheques',
        loadComponent: () => import('./modules/tsr/forms/chequeras/chequera/chequera.component').then((m) => m.ChequeraComponent),
        canActivate: [authGuard],
        data: { title: 'Cheques' },
      },
      {
        path: 'parametrizacion/cajas/logicas/grupos',
        loadComponent: () => import('./modules/tsr/forms/cajas-logicas/grupos/grupos-cajas.component').then((m) => m.GruposCajasComponent),
        canActivate: [authGuard],
        data: { title: 'Grupos' },
      },
      {
        path: 'parametrizacion/cajas/logicas/cajas-por-grupo',
        loadComponent: () => import('./modules/tsr/forms/cajas-logicas/cajas-por-grupo/cajas-por-grupo.component').then((m) => m.CajasPorGrupoComponent),
        canActivate: [authGuard],
        data: { title: 'Cajas por Grupo' },
      },
      // Redirect old nested path to new flat path
      {
        path: 'parametrizacion/cajas/logicas/grupo/cajas-por-grupo',
        redirectTo: 'parametrizacion/cajas/logicas/cajas-por-grupo',
        pathMatch: 'full',
      },
      {
        path: 'parametrizacion/personas',
        redirectTo: 'parametrizacion/titulares',
        pathMatch: 'full',
      },
      {
        path: 'parametrizacion/titulares',
        loadComponent: () => import('./modules/tsr/forms/titulares-v2/titulares-v2.component').then((m) => m.TitularesV2Component),
        canActivate: [authGuard],
        data: { title: 'Titulares' },
      },
      {
        path: 'parametrizacion/titulares-v2',
        redirectTo: 'parametrizacion/titulares',
        pathMatch: 'full',
      },

      // Procesos - Anticipos
      {
        path: 'procesos/anticipos/clientes',
        loadComponent: () => import('./modules/tsr/forms/anticipos/anticipos-clientes/anticipos-clientes.component').then((m) => m.AnticiposClientesComponent),
        canActivate: [authGuard],
        data: { title: 'Anticipos - Clientes' },
      },
      {
        path: 'procesos/anticipos/proveedores',
        loadComponent: () => import('./modules/tsr/forms/anticipos/anticipos-proveedores/anticipos-proveedores.component').then((m) => m.AnticiposProveedoresComponent),
        canActivate: [authGuard],
        data: { title: 'Anticipos - Proveedores' },
      },
      {
        path: 'procesos/anticipos/seguimiento',
        loadComponent: () => import('./modules/tsr/forms/anticipos/seguimiento-anticipos/seguimiento-anticipos.component').then((m) => m.SeguimientoAnticiposComponent),
        canActivate: [authGuard],
        data: { title: 'Seguimiento de Anticipos' },
      },
      {
        path: 'procesos/estado-cuenta-titular',
        loadComponent: () => import('./modules/tsr/forms/estado-cuenta-titular/estado-cuenta-titular.component').then((m) => m.EstadoCuentaTitularComponent),
        canActivate: [authGuard],
        data: { title: 'Estado de Cuenta de Titular' },
      },

      // Procesos - Registrar
      {
        path: 'procesos/registrar/ingresos',
        loadComponent: () => import('./modules/tsr/forms/registrar/registro-ingreso/registro-ingreso.component').then((m) => m.RegistroIngresoComponent),
        canActivate: [authGuard],
        data: { title: 'Registrar - Ingresos' },
      },
      {
        path: 'procesos/registrar/egresos',
        loadComponent: () => import('./modules/tsr/forms/registrar/registro-egreso/registro-egreso.component').then((m) => m.RegistroEgresoComponent),
        canActivate: [authGuard],
        data: { title: 'Registrar - Egresos' },
      },
      {
        path: 'procesos/aprobacion-pagos',
        loadComponent: () => import('./modules/tsr/forms/procesos/aprobacion-pagos/aprobacion-pagos.component').then((m) => m.AprobacionPagosComponent),
        canActivate: [authGuard],
        data: { title: 'Aprobación de pagos' },
      },

      // Procesos - Cobros
      {
        path: 'procesos/cobros/cierre-caja',
        loadComponent: () => import('./modules/tsr/forms/cobros/cierre-caja/cierre-caja.component').then((m) => m.CierreCajaComponent),
        canActivate: [authGuard],
        data: { title: 'Cobros - Cierre de Caja' },
      },
      {
        path: 'procesos/cobros/depositos/envio',
        loadComponent: () => import('./modules/tsr/forms/cobros/depositos/envio/envio-depositos.component').then((m) => m.EnvioDepositosComponent),
        canActivate: [authGuard],
        data: { title: 'Cobros - Depósitos Envío' },
      },
      {
        path: 'procesos/cobros/depositos/ratificacion',
        loadComponent: () => import('./modules/tsr/forms/cobros/depositos/ratificacion/ratificacion-depositos.component').then((m) => m.RatificacionDepositosComponent),
        canActivate: [authGuard],
        data: { title: 'Cobros - Depósitos Ratificación' },
      },
      {
        path: 'procesos/cobros/consultas/cobros',
        loadComponent: () => import('./modules/tsr/forms/cobros/consultas/cobros/consultas-cobros.component').then((m) => m.ConsultasCobrosComponent),
        canActivate: [authGuard],
        data: { title: 'Consultas - Cobros' },
      },
      {
        path: 'procesos/cobros/consultas/cierres',
        loadComponent: () => import('./modules/tsr/forms/cobros/consultas/cierres/consultas-cierres.component').then((m) => m.ConsultasCierresComponent),
        canActivate: [authGuard],
        data: { title: 'Consultas - Cierres' },
      },
      {
        path: 'procesos/cobros/procesos/cobros',
        loadComponent: () => import('./modules/tsr/forms/cobros/procesos/procesos-cobros.component').then((m) => m.ProcesosCobrosComponent),
        canActivate: [authGuard],
        data: { title: 'Procesos - Cobros' },
      },
      {
        path: 'procesos/cobros/procesos/cierres',
        loadComponent: () => import('./modules/tsr/forms/cobros/procesos/procesos-cierres.component').then((m) => m.ProcesosCierresComponent),
        canActivate: [authGuard],
        data: { title: 'Procesos - Cierres' },
      },
      {
        path: 'procesos/cobros/procesos/depositos',
        loadComponent: () => import('./modules/tsr/forms/cobros/procesos/procesos-depositos.component').then((m) => m.ProcesosDepositosComponent),
        canActivate: [authGuard],
        data: { title: 'Procesos - Depósitos' },
      },
      {
        path: 'procesos/cobros/procesos/ratificacion-depositos',
        loadComponent: () => import('./modules/tsr/forms/cobros/procesos/procesos-ratificacion-depositos.component').then((m) => m.ProcesosRatificacionDepositosComponent),
        canActivate: [authGuard],
        data: { title: 'Procesos - Ratificación Depósitos' },
      },

      // Procesos - Caja Chica
      {
        path: 'procesos/caja-chica/gastos',
        loadComponent: () => import('./modules/tsr/forms/caja-chica/gastos/gastos-caja-chica.component').then((m) => m.GastosCajaChicaComponent),
        canActivate: [authGuard],
        data: { title: 'Caja Chica - Gastos' },
      },
      {
        path: 'procesos/caja-chica/reposicion',
        loadComponent: () => import('./modules/tsr/forms/caja-chica/reposicion/reposicion-caja-chica.component').then((m) => m.ReposicionCajaChicaComponent),
        canActivate: [authGuard],
        data: { title: 'Caja Chica - Reposición' },
      },
      {
        path: 'procesos/caja-chica/cierre',
        loadComponent: () => import('./modules/tsr/forms/caja-chica/cierre/cierre-caja-chica.component').then((m) => m.CierreCajaChicaComponent),
        canActivate: [authGuard],
        data: { title: 'Caja Chica - Cierre' },
      },

      // Procesos - Pagos
      {
        path: 'procesos/pagos/ingreso',
        loadComponent: () => import('./modules/tsr/forms/pagos/ingresar/pagos-ingresar.component').then((m) => m.PagosIngresarComponent),
        canActivate: [authGuard],
        data: { title: 'Pagos - Ingreso' },
      },
      {
        path: 'procesos/pagos/consulta/pagos',
        loadComponent: () => import('./modules/tsr/forms/pagos/consultas/pagos/consultas-pagos.component').then((m) => m.ConsultasPagosComponent),
        canActivate: [authGuard],
        data: { title: 'Consulta - Pagos' },
      },
      {
        path: 'procesos/pagos/consulta/cheques',
        loadComponent: () => import('./modules/tsr/forms/pagos/consultas/cheques/consultas-cheques.component').then((m) => m.ConsultasChequesComponent),
        canActivate: [authGuard],
        data: { title: 'Consulta - Cheques' },
      },
      {
        path: 'procesos/pagos/procesos/solicitud-pagos',
        loadComponent: () => import('./modules/tsr/forms/pagos/procesos/solicitud/solicitud-pagos.component').then((m) => m.SolicitudPagosComponent),
        canActivate: [authGuard],
        data: { title: 'Procesos - Solicitud Pagos' },
      },
      {
        path: 'procesos/pagos/procesos/cheques-generados',
        loadComponent: () => import('./modules/tsr/forms/pagos/procesos/generados/cheques-generados.component').then((m) => m.ChequesGeneradosComponent),
        canActivate: [authGuard],
        data: { title: 'Procesos - Cheques Generados' },
      },
      {
        path: 'procesos/pagos/procesos/cheques-impresos',
        loadComponent: () => import('./modules/tsr/forms/pagos/procesos/impresos/cheques-impresos-proc.component').then((m) => m.ChequesImpresosProcComponent),
        canActivate: [authGuard],
        data: { title: 'Procesos - Cheques Impresos' },
      },
      {
        path: 'procesos/pagos/procesos/cheques-entregados',
        loadComponent: () => import('./modules/tsr/forms/pagos/procesos/entregados/cheques-entregados-proc.component').then((m) => m.ChequesEntregadosProcComponent),
        canActivate: [authGuard],
        data: { title: 'Procesos - Cheques Entregados' },
      },

      // Procesos - Extractos Bancarios
      {
        path: 'procesos/extractos-bancarios/cargar',
        loadComponent: () => import('./modules/tsr/forms/generales/cargar-extracto-bancario/cargar-extracto-bancario.component').then((m) => m.CargarExtractoBancarioComponent),
        canActivate: [authGuard],
        data: { title: 'Cargar Extracto Bancario' },
      },
      {
        path: 'procesos/extractos-bancarios/consulta',
        loadComponent: () => import('./modules/tsr/forms/generales/consulta-extractos-bancarios/consulta-extractos-bancarios.component').then((m) => m.ConsultaExtractosBancariosComponent),
        canActivate: [authGuard],
        data: { title: 'Consulta de Extractos Bancarios' },
      },
      {
        path: 'procesos/extractos-bancarios/detalle',
        loadComponent: () => import('./modules/tsr/forms/generales/detalle-extracto-bancario/detalle-extracto-bancario.component').then((m) => m.DetalleExtractoBancarioComponent),
        canActivate: [authGuard],
        data: { title: 'Detalle de Extracto Bancario' },
      },
      {
        path: 'procesos/extractos-bancarios/tablero',
        loadComponent: () => import('./modules/tsr/forms/generales/tablero-cumplimiento-extractos/tablero-cumplimiento-extractos.component').then((m) => m.TableroCumplimientoExtractosComponent),
        canActivate: [authGuard],
        data: { title: 'Tablero de Cumplimiento de Extractos' },
      },
      {
        path: 'procesos/conciliacion-contable',
        loadComponent: () => import('./modules/tsr/forms/generales/conciliacion-contable/conciliacion-contable.component').then((m) => m.ConciliacionContableComponent),
        canActivate: [authGuard],
        data: { title: 'Conciliación Contable' },
      },
      {
        path: 'procesos/conciliacion/cierre',
        loadComponent: () => import('./modules/tsr/forms/generales/conciliacion-cierre/conciliacion-cierre.component').then((m) => m.ConciliacionCierreComponent),
        canActivate: [authGuard],
        data: { title: 'Conciliación — Cierre' },
      },
    ],
  },
  {
    path: 'menurecursoshumanos',
    loadComponent: () => import('./modules/rrh/menu/menurecursoshumanos/menurecursoshumanos.component').then((m) => m.MenurecursoshumanosComponent),
    canActivate: [authGuard],
    children: [
      // Parametrización
      {
        path: 'parametrizacion/conceptos-nomina',
        loadComponent: () =>
          import(
            './modules/rrh/forms/parametrizacion/conceptos-nomina/conceptos-nomina.component'
          ).then((m) => m.ConceptosNominaComponent),
        canActivate: [authGuard],
        data: { title: 'Conceptos de nómina' },
      },
      {
        path: 'parametrizacion/parametros-anuales',
        loadComponent: () =>
          import(
            './modules/rrh/forms/parametrizacion/parametros-anuales/parametros-anuales.component'
          ).then((m) => m.ParametrosAnualesComponent),
        canActivate: [authGuard],
        data: { title: 'Parámetros anuales de nómina' },
      },
      {
        path: 'parametrizacion/tabla-impuesto-renta',
        loadComponent: () =>
          import(
            './modules/rrh/forms/parametrizacion/tabla-impuesto-renta/tabla-impuesto-renta.component'
          ).then((m) => m.TablaImpuestoRentaComponent),
        canActivate: [authGuard],
        data: { title: 'Tabla de impuesto a la renta' },
      },
      {
        path: 'parametrizacion/topes-gastos-personales',
        loadComponent: () =>
          import(
            './modules/rrh/forms/parametrizacion/topes-gastos-personales/topes-gastos-personales.component'
          ).then((m) => m.TopesGastosPersonalesComponent),
        canActivate: [authGuard],
        data: { title: 'Topes de gastos personales' },
      },
      {
        path: 'parametrizacion/causales-terminacion',
        loadComponent: () =>
          import(
            './modules/rrh/forms/parametrizacion/causales-terminacion/causales-terminacion.component'
          ).then((m) => m.CausalesTerminacionComponent),
        canActivate: [authGuard],
        data: { title: 'Causales de terminación' },
      },
      {
        path: 'parametrizacion/configuracion-nomina',
        loadComponent: () =>
          import(
            './modules/rrh/forms/parametrizacion/configuracion-nomina/configuracion-nomina.component'
          ).then((m) => m.ConfiguracionNominaComponent),
        canActivate: [authGuard],
        data: { title: 'Configuración de nómina' },
      },
      {
        path: 'parametrizacion/formatos-marcacion',
        loadComponent: () =>
          import(
            './modules/rrh/forms/parametrizacion/formatos-marcacion/formatos-marcacion.component'
          ).then((m) => m.FormatosMarcacionComponent),
        canActivate: [authGuard],
        data: { title: 'Formatos de marcación' },
      },
      {
        path: 'parametrizacion/formatos-archivo-bancario',
        loadComponent: () =>
          import(
            './modules/rrh/forms/parametrizacion/formatos-archivo-bancario/formatos-archivo-bancario.component'
          ).then((m) => m.FormatosArchivoBancarioComponent),
        canActivate: [authGuard],
        data: { title: 'Formatos del archivo bancario' },
      },
      {
        path: 'parametrizacion/cargos',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/catalogos/catalogo-rrh.component').then(
            (m) => m.CatalogoRrhComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Cargos y puestos', catalogo: 'cargos' },
      },
      {
        path: 'parametrizacion/departamentos',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/catalogos/catalogo-rrh.component').then(
            (m) => m.CatalogoRrhComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Departamentos', catalogo: 'departamentos' },
      },
      {
        path: 'parametrizacion/departamento-cargo',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/catalogos/catalogo-rrh.component').then(
            (m) => m.CatalogoRrhComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Departamento — Cargo', catalogo: 'departamento-cargo' },
      },
      {
        path: 'parametrizacion/tipos-contrato',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/catalogos/catalogo-rrh.component').then(
            (m) => m.CatalogoRrhComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Tipos de contrato', catalogo: 'tipos-contrato' },
      },
      {
        path: 'parametrizacion/turnos',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/catalogos/catalogo-rrh.component').then(
            (m) => m.CatalogoRrhComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Turnos y horarios', catalogo: 'turnos' },
      },
      // Personal
      {
        path: 'personal/colaboradores',
        loadComponent: () =>
          import(
            './modules/rrh/forms/personal/colaboradores/colaboradores.component'
          ).then((m) => m.ColaboradoresComponent),
        canActivate: [authGuard],
        data: { title: 'Colaboradores' },
      },
      {
        path: 'personal/ficha/:codigo/contratos/:codigoContrato',
        loadComponent: () =>
          import('./modules/rrh/forms/personal/ficha/contrato-form.component').then(
            (m) => m.ContratoFormComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Contrato del colaborador' },
      },
      {
        path: 'personal/ficha/:codigo',
        loadComponent: () =>
          import('./modules/rrh/forms/personal/ficha/ficha-colaborador.component').then(
            (m) => m.FichaColaboradorComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Ficha del colaborador' },
      },
      { path: 'gestion/vacaciones', loadComponent: () => import('./modules/rrh/forms/gestion/vacaciones/vacaciones-list.component').then((m) => m.VacacionesListComponent), canActivate: [authGuard] },
      {
        path: 'gestion/permisos-licencias',
        loadComponent: () =>
          import('./modules/rrh/forms/gestion/permisos-licencias/permisos-licencias-list.component').then(
            (m) => m.PermisosLicenciasListComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Gestión de Permisos y Licencias' },
      },
      // Asistencia
      {
        path: 'asistencia/marcaciones',
        loadComponent: () =>
          import('./modules/rrh/forms/asistencia/marcaciones/marcaciones.component').then(
            (m) => m.MarcacionesComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Marcaciones' },
      },
      {
        path: 'asistencia/importacion',
        loadComponent: () =>
          import(
            './modules/rrh/forms/asistencia/importacion-marcaciones/importacion-marcaciones.component'
          ).then((m) => m.ImportacionMarcacionesComponent),
        canActivate: [authGuard],
        data: { title: 'Importación de marcaciones' },
      },
      {
        path: 'asistencia/resumen-diario',
        loadComponent: () =>
          import('./modules/rrh/forms/asistencia/resumen-diario/resumen-diario.component').then(
            (m) => m.ResumenDiarioComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Resumen diario de asistencia' },
      },
      // Migración de apertura
      {
        path: 'migracion/saldos-apertura',
        loadComponent: () =>
          import('./modules/rrh/forms/migracion/saldos-apertura.component').then(
            (m) => m.SaldosAperturaComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Saldos de apertura' },
      },
      {
        path: 'migracion/acumulados',
        loadComponent: () =>
          import('./modules/rrh/forms/migracion/acumulados.component').then(
            (m) => m.AcumuladosComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Acumulados del colaborador' },
      },
      {
        path: 'procesos/descuentos-recurrentes',
        loadComponent: () =>
          import(
            './modules/rrh/forms/procesos/descuentos-recurrentes/descuentos-recurrentes.component'
          ).then((m) => m.DescuentosRecurrentesComponent),
        canActivate: [authGuard],
        data: { title: 'Descuentos recurrentes' },
      },
      // Motor de nómina
      {
        path: 'procesos/periodos-nomina',
        loadComponent: () =>
          import(
            './modules/rrh/forms/procesos/periodo-nomina/periodos-nomina.component'
          ).then((m) => m.PeriodosNominaComponent),
        canActivate: [authGuard],
        data: { title: 'Períodos de nómina' },
      },
      {
        path: 'procesos/periodos-nomina/:codigo',
        loadComponent: () =>
          import(
            './modules/rrh/forms/procesos/periodo-nomina/periodo-nomina-dash.component'
          ).then((m) => m.PeriodoNominaDashComponent),
        canActivate: [authGuard],
        data: { title: 'Panel del período de nómina' },
      },
      {
        path: 'procesos/novedades-nomina',
        loadComponent: () =>
          import(
            './modules/rrh/forms/procesos/novedades-nomina/novedades-nomina.component'
          ).then((m) => m.NovedadesNominaComponent),
        canActivate: [authGuard],
        data: { title: 'Novedades del período' },
      },
      {
        path: 'procesos/novedades-iess',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/novedades-iess/novedades-iess.component').then(
            (m) => m.NovedadesIessComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Novedades del mes (IESS)' },
      },
      {
        path: 'procesos/horas-extra',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/horas-extra/horas-extra.component').then(
            (m) => m.HorasExtraComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Horas extra' },
      },
      {
        path: 'procesos/proyeccion-ir',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/proyeccion-ir/proyeccion-ir.component').then(
            (m) => m.ProyeccionIrComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Proyección de impuesto a la renta' },
      },
      // Procesos
      {
        path: 'procesos/roles-pago',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/roles-pago/roles-pago.component').then(
            (m) => m.RolesPagoComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'procesos/ordenes-pago',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/ordenes-pago/ordenes-pago.component').then(
            (m) => m.OrdenesPagoComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Órdenes de pago' },
      },
      {
        path: 'procesos/reportes-nomina',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/reportes-nomina/reportes-nomina.component').then(
            (m) => m.ReportesNominaComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'procesos/aportes',
        loadComponent: () => import('./modules/rrh/forms/procesos/aportes-retenciones/aporte-retencion-list.component').then((m) => m.AporteRetencionListComponent),
        canActivate: [authGuard],
      },
      {
        path: 'procesos/salidas-oficiales',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/salidas-oficiales/salidas-oficiales.component').then(
            (m) => m.SalidasOficialesComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Salidas oficiales' },
      },
      {
        path: 'procesos/utilidades',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/utilidades/utilidades.component').then(
            (m) => m.UtilidadesComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Reparto de utilidades' },
      },
      {
        path: 'procesos/anticipos',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/anticipos/anticipos.component').then(
            (m) => m.AnticiposComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Anticipos a trabajadores' },
      },
      {
        path: 'procesos/acreditar-vacaciones',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/acreditar-vacaciones/acreditar-vacaciones.component').then(
            (m) => m.AcreditarVacacionesComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Acreditar vacaciones' },
      },
      {
        path: 'procesos/liquidacion',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/liquidacion/liquidacion-list.component').then(
            (m) => m.LiquidacionListComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Liquidación de haberes' },
      },
      {
        path: 'procesos/liquidacion/:codigo',
        loadComponent: () =>
          import('./modules/rrh/forms/procesos/liquidacion/liquidacion-form.component').then(
            (m) => m.LiquidacionFormComponent,
          ),
        canActivate: [authGuard],
        data: { title: 'Finiquito' },
      },
    ],
  },
  {
    path: 'menucuentasxcobrar',
    loadComponent: () => import('./modules/cxc/menu/menucuentasxcobrar/menucuentasxcobrar.component').then((m) => m.MenucuentasxcobrarComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'parametrizacion/grupos-productos',
        loadComponent: () => import('./modules/cxc/forms/parametrizacion/grupos-productos-cobro/grupos-productos-cobro.component').then((m) => m.GruposProductosCobroComponent),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/datos-facturador',
        loadComponent: () => import('./modules/cxc/forms/parametrizacion/datos-facturador/datos-facturador.component').then((m) => m.DatosFacturadorComponent),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/datos-sri',
        loadComponent: () => import('./modules/cxc/forms/parametrizacion/datos-sri/datos-sri.component').then((m) => m.DatosSriComponent),
        canActivate: [authGuard],
      },
      {
        path: 'emitir/facturas',
        loadComponent: () => import('./modules/cxc/forms/emitir/facturas-ingreso/facturas-ingreso.component').then((m) => m.FacturasIngresoComponent),
        canActivate: [authGuard],
      },
      {
        path: 'emitir/notas-credito',
        loadComponent: () => import('./modules/cxc/forms/emitir/notas-credito/notas-credito.component').then((m) => m.NotasCreditoComponent),
        canActivate: [authGuard],
      },
      {
        path: 'emitir/notas-debito',
        loadComponent: () => import('./modules/cxc/forms/emitir/notas-debito/notas-debito.component').then((m) => m.NotasDebitoComponent),
        canActivate: [authGuard],
      },
      {
        path: 'emitir/liquidaciones',
        loadComponent: () => import('./modules/cxc/forms/emitir/liquidaciones/liquidaciones.component').then((m) => m.LiquidacionesComponent),
        canActivate: [authGuard],
      },
      {
        path: 'emitir/retenciones',
        loadComponent: () => import('./modules/cxc/forms/emitir/retencionesv2').then((m) => m.Retencionesv2Component),
        canActivate: [authGuard],
      },
      {
        path: 'emitir/retenciones-v2',
        loadComponent: () => import('./modules/cxc/forms/emitir/retencionesv2').then((m) => m.Retencionesv2Component),
        canActivate: [authGuard],
      },
      {
        path: 'gestionar/facturas',
        loadComponent: () => import('./modules/cxc/forms/gestionar/consulta-facturas/consulta-facturas.component').then((m) => m.ConsultaFacturasComponent),
        canActivate: [authGuard],
      },
      {
        path: 'gestionar/documentos-electronicos',
        loadComponent: () => import('./modules/cxc/forms/gestionar/consulta-documentos-electronicos/consulta-documentos-electronicos.component').then((m) => m.ConsultaDocumentosElectronicosComponent),
        canActivate: [authGuard],
      },
      {
        path: 'gestionar/anticipos',
        loadComponent: () => import('./modules/cxc/forms/gestionar/anticipo/anticipo.component').then((m) => m.AnticipoComponent),
        canActivate: [authGuard],
      },
      {
        path: 'gestionar/financiar-factura',
        loadComponent: () => import('./modules/cxc/forms/gestionar/financiar-factura/financiar-factura.component').then((m) => m.FinanciarFacturaComponent),
        canActivate: [authGuard],
      },
      {
        path: 'cobros/abonos-factura',
        loadComponent: () => import('./modules/cxc/forms/cobros/abonos-factura/abonos-factura.component').then((m) => m.AbonosFacturaComponent),
        canActivate: [authGuard],
      },
      {
        path: 'cobros/registrar',
        loadComponent: () => import('./modules/cxc/forms/cobros/registrar-cobro/registrar-cobro.component').then((m) => m.RegistrarCobroComponent),
        canActivate: [authGuard],
      },
      {
        path: 'cobros/cruce-anticipo',
        loadComponent: () => import('./modules/cxc/forms/cobros/cruce-anticipo-cliente/cruce-anticipo-cliente.component').then((m) => m.CruceAnticipoClienteComponent),
        canActivate: [authGuard],
      },
      {
        path: 'cobros/consulta',
        loadComponent: () => import('./modules/cxc/forms/cobros/consulta-cobros/consulta-cobros.component').then((m) => m.ConsultaCobrosComponent),
        canActivate: [authGuard],
      },
      {
        path: 'reportes/ats',
        loadComponent: () => import('./modules/cxc/reportes/ats').then((m) => m.AtsComponent),
        canActivate: [authGuard],
        data: { title: 'ATS y Cuadre 103/104' },
      },
      {
        path: 'reportes/dash-ventas',
        loadComponent: () => import('./modules/cxc/reportes/dash-ventas').then((m) => m.DashVentasComponent),
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'menucuentaxpagar',
    loadComponent: () => import('./modules/cxp/menu/menucuentasxpagar/menucuentasxpagar.component').then((m) => m.MenucuentaxpagarComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'parametrizacion/grupos-productos',
        loadComponent: () => import('./modules/cxp/forms/parametrizacion/grupos-productos-pago/grupos-productos-pago.component').then((m) => m.GruposProductosPagoComponent),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/datos-sri',
        loadComponent: () => import('./modules/cxp/forms/parametrizacion/datos-sri-cxp/datos-sri-cxp.component').then((m) => m.DatosSriCxpComponent),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/proveedores',
        loadComponent: () => import('./modules/cxp/forms/parametrizacion/proveedores/proveedores.component').then((m) => m.ProveedoresComponent),
        canActivate: [authGuard],
      },
      {
        path: 'procesos/bandeja-electronica',
        loadComponent: () => import('./modules/cxp/forms/procesos/bandeja-electronica/bandeja-electronica.component').then((m) => m.BandejaElectronicaComponent),
        canActivate: [authGuard],
      },
      {
        path: 'procesos/gestion-documentos',
        loadComponent: () => import('./modules/cxp/forms/procesos/gestion-documentos/gestion-documentos.component').then((m) => m.GestionDocumentosComponent),
        canActivate: [authGuard],
      },
      {
        path: 'procesos/consulta-documentos',
        loadComponent: () => import('./modules/cxp/forms/procesos/consulta-documentos/consulta-documentos.component').then((m) => m.ConsultaDocumentosComponent),
        canActivate: [authGuard],
      },
      {
        path: 'procesos/sustento-tributario',
        loadComponent: () => import('./modules/cxp/forms/procesos/sustento-tributario/sustento-tributario.component').then((m) => m.SustentoTributarioComponent),
        canActivate: [authGuard],
        data: { title: 'Sustento tributario (ATS)' },
      },
      {
        path: 'pagos/cruce-anticipo',
        loadComponent: () => import('./modules/cxp/forms/pagos/cruce-anticipo-proveedor/cruce-anticipo-proveedor.component').then((m) => m.CruceAnticipoProveedorComponent),
        canActivate: [authGuard],
      },
      {
        path: 'pagos/transferencias',
        loadComponent: () => import('./modules/cxp/forms/pagos/pagos-transferencia/pagos-transferencia.component').then((m) => m.PagosTransferenciaComponent),
        canActivate: [authGuard],
      },
      {
        path: 'negociaciones',
        loadComponent: () => import('./modules/cxp/forms/negociaciones/negociaciones.component').then((m) => m.NegociacionesComponent),
        canActivate: [authGuard],
      },
      {
        path: 'negociaciones/detalle/:id',
        loadComponent: () => import('./modules/cxp/forms/negociaciones/detalle-negociacion/detalle-negociacion.component').then((m) => m.DetalleNegociacionComponent),
        canActivate: [authGuard],
      },
      {
        path: 'reportes/dashboard',
        loadComponent: () => import('./modules/cxp/forms/reportes/dashboard-cxp/dashboard-cxp.component').then((m) => m.DashboardCxpComponent),
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'menucreditos',
    loadComponent: () => import('./modules/crd/menucreditos/menucreditos.component').then((m) => m.MenucreditosComponent),
    canActivate: [authGuard],
    children: [
      { path: 'parametrizacion', loadComponent: () => import('./modules/crd/menucreditos/parametrizacion-creditos.component').then((m) => m.ParametrizacionCreditosComponent) },
      { path: 'extr', loadComponent: () => import('./modules/crd/forms/historicos/exters/exters.component').then((m) => m.ExtersComponent) },
      { path: 'aportes-revisar', loadComponent: () => import('./modules/crd/forms/historicos/aportes-por-revisar/aportes-por-revisar.component').then((m) => m.AportesPorRevisarComponent) },
      { path: 'participe-inicial', loadComponent: () => import('./modules/crd/forms/historicos/base-inicial-participes/base-inicial-participes.component').then((m) => m.BaseInicialParticipesComponent) },
      { path: 'entidad', loadComponent: () => import('./modules/crd/menucreditos/entidad-creditos.component').then((m) => m.EntidadCreditosComponent) },
      { path: 'navegacion-cascada', loadComponent: () => import('./modules/crd/forms/entidad-participe/navegacion-cascada/navegacion-cascada.component').then((m) => m.NavegacionCascadaComponent) },
      { path: 'participe-dash', loadComponent: () => import('./modules/crd/forms/entidad-participe/participe-dash/participe-dash.component').then((m) => m.ParticipeDashComponent) },
      { path: 'consolidado', loadComponent: () => import('./modules/crd/forms/entidad-participe/consolidado/consolidado.component').then((m) => m.ConsolidadoComponent) },
      { path: 'jubilados', loadComponent: () => import('./modules/crd/forms/entidad-participe/jubilados/proceso-pago-jubilados/proceso-pago-jubilados.component').then((m) => m.ProcesoPagoJubiladosComponent) },
      { path: 'jubilar-participe', loadComponent: () => import('./modules/crd/forms/entidad-participe/jubilados/jubilar-participe/jubilar-participe.component').then((m) => m.JubilarParticipeComponent) },
      { path: 'participe-info', loadComponent: () => import('./modules/crd/forms/entidad-participe/participe-info/participe-info.component').then((m) => m.ParticipeInfoComponent) },
      { path: 'cruce-de-valores', loadComponent: () => import('./modules/crd/forms/cruce-de-valores/cruce-de-valores.component').then((m) => m.CruceDeValoresComponent) },
      { path: 'devolucion-aportes', loadComponent: () => import('./modules/crd/forms/devolucion-aportes/devolucion-aportes.component').then((m) => m.DevolucionAportesComponent) },
      { path: 'simulador-credito', loadComponent: () => import('./modules/crd/forms/simulador-credito/simulador-credito.component').then((m) => m.SimuladorCreditoComponent) },
      { path: 'simulador-prestamo', loadComponent: () => import('./modules/crd/forms/simulador-prestamo/simulador-prestamo.component').then((m) => m.SimuladorPrestamoComponent) },
      { path: 'pago-cuotas', loadComponent: () => import('./modules/crd/forms/pago-cuotas/pago-cuotas.component').then((m) => m.PagoCuotasComponent) },
      { path: 'cobros-personales', loadComponent: () => import('./modules/crd/forms/cobros-personales/cobros-personales.component').then((m) => m.CobrosPersonalesComponent) },
      { path: 'bandeja-contabilidad', loadComponent: () => import('./modules/crd/forms/cobros/bandeja-contabilidad/bandeja-contabilidad.component').then((m) => m.BandejaContabilidadComponent) },
      { path: 'proceso-credito', loadComponent: () => import('./modules/crd/forms/cobros/proceso-credito/proceso-credito.component').then((m) => m.ProcesoCreditoComponent) },
      { path: 'consulta-cobros', loadComponent: () => import('./modules/crd/forms/cobros/consulta-cobros/consulta-cobros.component').then((m) => m.ConsultaCobrosComponent) },
      { path: 'acuerdo-condonacion', loadComponent: () => import('./modules/crd/forms/acuerdos/acuerdo-condonacion/acuerdo-condonacion.component').then((m) => m.AcuerdoCondonacionComponent) },
      {
        path: 'entidad-edit',
        loadComponent: () => import('./modules/crd/forms/entidad-participe/entidad-edit/entidad-edit.component').then((m) => m.EntidadEditComponent),
        canDeactivate: [canDeactivateGuard],
        resolve: { data: entidadEditResolver },
      },
      { path: 'entidad-consulta', loadComponent: () => import('./modules/crd/forms/entidad-participe/entidad-consulta/entidad-consulta.component').then((m) => m.EntidadConsultaComponent) },
      {
        path: 'archivos-petro/carga/carga-aportes',
        loadComponent: () => import('./modules/crd/forms/archivos-petro/carga/carga-aportes/carga-aportes.component').then((m) => m.CargaAportesComponent),
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'archivos-petro/carga/carga-aportes-back',
        loadComponent: () => import('./modules/crd/forms/archivos-petro/carga/carga-aporte-back/carga-aporte-back.component').then((m) => m.CargaAporteBackComponent),
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'archivos-petro/carga/consulta',
        loadComponent: () => import('./modules/crd/forms/archivos-petro/carga/consulta-archivos-petro/consulta-archivos-petro.component').then((m) => m.ConsultaArchivosPetroComponent),
        resolve: { cargas: ConsultaCargaArchivoResolverService },
      },
      {
        path: 'archivos-petro/carga/detalle/:id',
        loadComponent: () => import('./modules/crd/forms/archivos-petro/carga/detalle-consulta-carga/detalle-consulta-carga.component').then((m) => m.DetalleConsultaCargaComponent),
      },
      {
        path: 'archivos-petro/generar/proceso',
        loadComponent: () => import('./modules/crd/forms/archivos-petro/generar/generar-archivo-petro/generar-archivo-petro.component').then((m) => m.GenerarArchivoPetroComponent),
      },
      {
        path: 'archivos-petro/generar/consulta',
        loadComponent: () => import('./modules/crd/forms/archivos-petro/generar/consulta-generacion-archivo/consulta-generacion-archivo.component').then((m) => m.ConsultaGeneracionArchivoComponent),
      },
      {
        path: 'archivos-petro/generar/detalle/:id',
        loadComponent: () => import('./modules/crd/forms/archivos-petro/generar/detalle-generacion-archivo/detalle-generacion-archivo.component').then((m) => m.DetalleGeneracionArchivoComponent),
      },
      {
        path: 'carga-aportes',
        redirectTo: 'archivos-petro/carga/carga-aportes',
        pathMatch: 'full',
      },
      {
        path: 'carga-aportes-back',
        redirectTo: 'archivos-petro/carga/carga-aportes-back',
        pathMatch: 'full',
      },
      {
        path: 'consulta-archivos-petro',
        redirectTo: 'archivos-petro/carga/consulta',
        pathMatch: 'full',
      },
      {
        path: 'detalle-consulta-carga/:id',
        redirectTo: 'archivos-petro/carga/detalle/:id',
        pathMatch: 'full',
      },
      { path: 'entidad-participe-info', loadComponent: () => import('./modules/crd/forms/entidad-participe/entidad-participe-info/entidad-participe-info.component').then((m) => m.EntidadParticipeInfoComponent) },
      { path: 'certificados-participe', loadComponent: () => import('./modules/crd/forms/certificados-participe/certificados-participe.component').then((m) => m.CertificadosParticipeComponent) },
      {
        path: 'estadosCrd',
        loadComponent: () => import('./modules/crd/forms/parametrizacion/estados-crd/estados-crd.component').then((m) => m.EstadosCrdComponent),
        canDeactivate: [canDeactivateGuard],
        resolve: { estados: EstadosResolverService },
      },
      {
        path: 'tiposCrd',
        loadComponent: () => import('./modules/crd/forms/parametrizacion/tipos-crd/tipos-crd.component').then((m) => m.TiposCrdComponent),
        canDeactivate: [canDeactivateGuard],
        resolve: { tipos: TiposCrdResolverService },
      },
      {
        path: 'listadosCrd',
        loadComponent: () => import('./modules/crd/forms/parametrizacion/listados-crd/listados-crd.component').then((m) => m.ListadosCrdComponent),
        canDeactivate: [canDeactivateGuard],
        resolve: { listados: ListadosCrdResolverService },
      },
      {
        path: 'informacion-general-fondo',
        loadComponent: () => import('./modules/crd/forms/parametrizacion/informacion-general-fondo/informacion-general-fondo.component').then((m) => m.InformacionGeneralFondoComponent),
        canActivate: [authGuard],
      },
      {
        // TODO TEMPORAL: restringida al USUARIO 1 vía usuarioUnoGuard hasta que
        // exista el esquema de permisos definitivo (ver shared/guard/usuario-uno.guard.ts).
        path: 'bandas-cartera',
        loadComponent: () => import('./modules/crd/forms/parametrizacion/bandas-cartera/bandas-cartera.component').then((m) => m.BandasCarteraComponent),
        canActivate: [authGuard, usuarioUnoGuard],
      },
      {
        // TODO TEMPORAL: misma restricción a USUARIO 1 que bandas-cartera (usuarioUnoGuard),
        // hasta que exista el esquema de permisos definitivo.
        path: 'cierre-cartera',
        loadComponent: () => import('./modules/crd/forms/cierre-cartera/cierre-cartera.component').then((m) => m.CierreCarteraComponent),
        canActivate: [authGuard, usuarioUnoGuard],
      },
      {
        // TODO TEMPORAL: misma restricción a USUARIO 1 que bandas-cartera (usuarioUnoGuard),
        // hasta que exista el esquema de permisos definitivo de "administrador" (§4.3 del plan
        // de devengo de aportes pide "restringido a administrador").
        path: 'interruptor-contabilidad',
        loadComponent: () => import('./modules/crd/forms/parametrizacion/interruptor-contabilidad/interruptor-contabilidad.component').then((m) => m.InterruptorContabilidadComponent),
        canActivate: [authGuard, usuarioUnoGuard],
      },
      // Rutas de Contratos
      {
        path: 'contrato-dash',
        loadComponent: () => import('./modules/crd/forms/contrato/contrato-dash/contrato-dash.component').then((m) => m.ContratoDashComponent),
        canActivate: [authGuard],
      },
      {
        path: 'aportes-dash/:codigoEntidad',
        loadComponent: () => import('./modules/crd/forms/contrato/aportes-dash/aportes-dash.component').then((m) => m.AportesDashComponent),
        canActivate: [authGuard],
      },
      {
        path: 'contrato-consulta',
        loadComponent: () => import('./modules/crd/forms/contrato/contrato-consulta/contrato-consulta.component').then((m) => m.ContratoConsultaComponent),
        canActivate: [authGuard],
      },
      {
        path: 'contrato-edit',
        loadComponent: () => import('./modules/crd/forms/contrato/contrato-edit/contrato-edit.component').then((m) => m.ContratoEditComponent),
        canActivate: [authGuard],
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'contrato-edit/:id',
        loadComponent: () => import('./modules/crd/forms/contrato/contrato-edit/contrato-edit.component').then((m) => m.ContratoEditComponent),
        canActivate: [authGuard],
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'prestamo-edit',
        loadComponent: () => import('./modules/crd/forms/prestamo/prestamo-edit/prestamo-edit.component').then((m) => m.PrestamoEditComponent),
        canActivate: [authGuard],
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'prestamo-consulta',
        loadComponent: () => import('./modules/crd/forms/prestamo/prestamo-consulta/prestamo-consulta.component').then((m) => m.PrestamoConsultaComponent),
        canActivate: [authGuard],
      },
      {
        path: 'prestamo-dash',
        loadComponent: () => import('./modules/crd/forms/prestamo/prestamo-dash/prestamo-dash.component').then((m) => m.PrestamoDashComponent),
        canActivate: [authGuard],
      },
      {
        path: 'asignacion-seguros',
        loadComponent: () => import('./modules/crd/forms/asignacion-seguros/asignacion-seguros.component').then((m) => m.AsignacionSegurosComponent),
        canActivate: [authGuard],
      },
      {
        path: 'repote-valores-insolutos',
        loadComponent: () => import('./modules/crd/forms/prestamo/repote-valores-insolutos/repote-valores-insolutos.component').then((m) => m.RepoteValoresInsolutosComponent),
        canActivate: [authGuard],
      },
      {
        path: 'cuota-consulta',
        loadComponent: () => import('./modules/crd/forms/prestamo/cuota-consulta/cuota-consulta.component').then((m) => m.CuotaConsultaComponent),
        canActivate: [authGuard],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
