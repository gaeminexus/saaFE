import { Routes } from '@angular/router';
import { CentroArbolComponent } from './modules/cnt/forms/centro-arbol/centro-arbol.component';
import { CentroGridComponent } from './modules/cnt/forms/centro-grid/centro-grid.component';
import { MayorizacionProcesoComponent } from './modules/cnt/forms/mayorizacion-proceso/mayorizacion-proceso.component';
import { PeriodoContableComponent } from './modules/cnt/forms/periodo-contable/periodo-contable.component';
import { PlanArbolComponent } from './modules/cnt/forms/plan-arbol/plan-arbol.component';
import { PlanGridComponent } from './modules/cnt/forms/plan-grid/plan-grid.component';
import { PlantillaGeneralComponent } from './modules/cnt/forms/plantilla-general/plantilla-general.component';
import { ReporteBalanceGeneralComponent } from './modules/cnt/forms/reporte-balance-general/reporte-balance-general.component';
import { ReporteListadoAsientosComponent } from './modules/cnt/forms/reporte-listado-asientos/reporte-listado-asientos.component';
import { ReporteMayorAnaliticoComponent } from './modules/cnt/forms/reporte-mayor-analitico/reporte-mayor-analitico.component';
import { TipoAsientoGeneralGridComponent } from './modules/cnt/forms/tipo-asiento-general-grid/tipo-asiento-general-grid.component';
import { TipoAsientoSistemaGridComponent } from './modules/cnt/forms/tipo-asiento-sistema-grid/tipo-asiento-sistema-grid.component';
import { MenuContabilidadComponent } from './modules/cnt/menu/menucontabilidad/menucontabilidad.component';
import { NaturalezaCuentaResolverService } from './modules/cnt/resolver/naturaleza-cuenta-resolver.service';
import { AportesDashComponent } from './modules/crd/forms/contrato/aportes-dash/aportes-dash.component';
import { ContratoConsultaComponent } from './modules/crd/forms/contrato/contrato-consulta/contrato-consulta.component';
import { ContratoDashComponent } from './modules/crd/forms/contrato/contrato-dash/contrato-dash.component';
import { ContratoEditComponent } from './modules/crd/forms/contrato/contrato-edit/contrato-edit.component';
import { MenucreditosComponent } from './modules/crd/menucreditos/menucreditos.component';
import { ParametrizacionCreditosComponent } from './modules/crd/menucreditos/parametrizacion-creditos.component';
import { MenucuentasxcobrarComponent } from './modules/cxc/menu/menucuentasxcobrar/menucuentasxcobrar.component';
import { MenucuentaxpagarComponent } from './modules/cxp/menu/menucuentasxpagar/menucuentasxpagar.component';
import { LoginComponent } from './modules/dash/forms/login/login.component';
import { MenuComponent } from './modules/dash/menu/menu.component';
import { MenurecursoshumanosComponent } from './modules/rrh/menu/menurecursoshumanos/menurecursoshumanos.component';
// RRHH demo components
import { RrhAsistenciaComponent } from './modules/rrh/forms/gestion/asistencia/rrh-asistencia.component';
import { RrhContratosComponent } from './modules/rrh/forms/gestion/contratos/rrh-contratos.component';
import { RrhEmpleadosComponent } from './modules/rrh/forms/gestion/empleados/rrh-empleados.component';
import { RrhPermisosComponent } from './modules/rrh/forms/gestion/permisos/rrh-permisos.component';
import { RrhVacacionesComponent } from './modules/rrh/forms/gestion/vacaciones/rrh-vacaciones.component';
import { RrhTiposContratoComponent } from './modules/rrh/forms/parametrizacion/tipos-contrato/rrh-tipos-contrato.component';
import { RrhTurnosComponent } from './modules/rrh/forms/parametrizacion/turnos/rrh-turnos.component';
import { RrhAportesComponent } from './modules/rrh/forms/procesos/aportes/rrh-aportes.component';
import { RrhLiquidacionesComponent } from './modules/rrh/forms/procesos/liquidaciones/rrh-liquidaciones.component';
import { RrhNominaComponent } from './modules/rrh/forms/procesos/nomina/rrh-nomina.component';
import { RrhRolesPagoComponent } from './modules/rrh/forms/procesos/roles-pago/rrh-roles-pago.component';
import { RrhReporteAsistenciaComponent } from './modules/rrh/forms/reportes/asistencia/rrh-reporte-asistencia.component';
import { RrhReporteNominaComponent } from './modules/rrh/forms/reportes/nomina/rrh-reporte-nomina.component';
import { RrhReporteRolesComponent } from './modules/rrh/forms/reportes/roles/rrh-reporte-roles.component';
import { RrhReporteVacacionesComponent } from './modules/rrh/forms/reportes/vacaciones/rrh-reporte-vacaciones.component';
import { BancosNacionalesExtranjerosComponent } from './modules/tsr/forms/bancos/bancos-nacionales-extranjeros.component';
import { BancosComponent } from './modules/tsr/forms/bancos/bancos.component';
import { CajasFisicasComponent } from './modules/tsr/forms/cajas-logicas/cajas-fisicas/cajas-fisicas.component';
import { CajasPorGrupoComponent } from './modules/tsr/forms/cajas-logicas/cajas-por-grupo/cajas-por-grupo.component';
import { GruposCajasComponent } from './modules/tsr/forms/cajas-logicas/grupos/grupos-cajas.component';
import { ChequeraComponent } from './modules/tsr/forms/chequeras/chequera/chequera.component';
import { RecepcionChequeraComponent } from './modules/tsr/forms/chequeras/recepcion-chequera/recepcion-chequera.component';
import { SolicitudChequeraComponent } from './modules/tsr/forms/chequeras/solicitud-chequera/solicitud-chequera.component';
import { CierreCajaComponent } from './modules/tsr/forms/cobros/cierre-caja/cierre-caja.component';
import { ConsultasCierresComponent } from './modules/tsr/forms/cobros/consultas/cierres/consultas-cierres.component';
import { ConsultasCobrosComponent } from './modules/tsr/forms/cobros/consultas/cobros/consultas-cobros.component';
import { EnvioDepositosComponent } from './modules/tsr/forms/cobros/depositos/envio/envio-depositos.component';
import { RatificacionDepositosComponent } from './modules/tsr/forms/cobros/depositos/ratificacion/ratificacion-depositos.component';
import { CobrosIngresarComponent } from './modules/tsr/forms/cobros/ingresar/cobros-ingresar.component';
import { ProcesosCierresComponent } from './modules/tsr/forms/cobros/procesos/procesos-cierres.component';
import { ProcesosCobrosComponent } from './modules/tsr/forms/cobros/procesos/procesos-cobros.component';
import { ProcesosDepositosComponent } from './modules/tsr/forms/cobros/procesos/procesos-depositos.component';
import { ProcesosRatificacionDepositosComponent } from './modules/tsr/forms/cobros/procesos/procesos-ratificacion-depositos.component';
import { CuentasBancariasComponent } from './modules/tsr/forms/cuentas-bancarias/cuentas-bancarias.component';
import { ConciliacionComponent } from './modules/tsr/forms/generales/conciliacion/conciliacion.component';
import { ConsultaConciliacionComponent } from './modules/tsr/forms/generales/consulta-conciliacion/consulta-conciliacion.component';
import { RiedComponent } from './modules/tsr/forms/generales/ried/ried.component';
import { CreditosComponent } from './modules/tsr/forms/movimientos-bancarios/creditos/creditos.component';
import { DebitosComponent } from './modules/tsr/forms/movimientos-bancarios/debitos/debitos.component';
import { TransferenciasComponent } from './modules/tsr/forms/movimientos-bancarios/transferencias/transferencias.component';
import { ChequesEntregaComponent } from './modules/tsr/forms/pagos/cheques/entrega/cheques-entrega.component';
import { ChequesImpresionComponent } from './modules/tsr/forms/pagos/cheques/impresion/cheques-impresion.component';
import { ConsultasChequesComponent } from './modules/tsr/forms/pagos/consultas/cheques/consultas-cheques.component';
import { ConsultasPagosComponent } from './modules/tsr/forms/pagos/consultas/pagos/consultas-pagos.component';
import { PagosIngresarComponent } from './modules/tsr/forms/pagos/ingresar/pagos-ingresar.component';
import { ChequesEntregadosProcComponent } from './modules/tsr/forms/pagos/procesos/entregados/cheques-entregados-proc.component';
import { ChequesGeneradosComponent } from './modules/tsr/forms/pagos/procesos/generados/cheques-generados.component';
import { ChequesImpresosProcComponent } from './modules/tsr/forms/pagos/procesos/impresos/cheques-impresos-proc.component';
import { SolicitudPagosComponent } from './modules/tsr/forms/pagos/procesos/solicitud/solicitud-pagos.component';
import { TsrPlaceholderComponent } from './modules/tsr/forms/placeholder/tsr-placeholder.component';
import { TitularesComponent } from './modules/tsr/forms/titulares/titulares.component';
import { MenutesoreriaComponent } from './modules/tsr/menu/menutesoreria/menutesoreria.component';
import { authGuard } from './shared/guard/auth.guard';
import { canDeactivateGuard } from './shared/guard/can-deactivate.guard';
// Reemplazamos placeholder EXTR por componente grid paginado
import { AsientosContablesDinamico } from './modules/cnt/forms/asientos-contables-dinamico/asientos-contables-dinamico';
import { DetalleMayorizacionComponent } from './modules/cnt/forms/detalle-mayorizacion/detalle-mayorizacion.component';
import { ListadoAsientosComponent } from './modules/cnt/forms/listado-asientos/listado-asientos.component';
import { MayorizacionComponent } from './modules/cnt/forms/mayorizacion/mayorizacion.component';
import { NaturalezaDeCuentasComponent } from './modules/cnt/forms/naturaleza-cuentas/naturaleza-cuentas.component';
import { CargaAporteBackComponent } from './modules/crd/forms/archivos-petro/carga-aporte-back/carga-aporte-back.component';
import { CargaAportesComponent } from './modules/crd/forms/archivos-petro/carga-aportes/carga-aportes.component';
import { ConsultaArchivosPetroComponent } from './modules/crd/forms/archivos-petro/consulta-archivos-petro/consulta-archivos-petro.component';
import { DetalleConsultaCargaComponent } from './modules/crd/forms/archivos-petro/detalle-consulta-carga/detalle-consulta-carga.component';
import { CruceValoresComponent } from './modules/crd/forms/cruce-valores/cruce-valores.component';
import { EntidadConsultaComponent } from './modules/crd/forms/entidad-participe/entidad-consulta/entidad-consulta.component';
import { EntidadEditComponent } from './modules/crd/forms/entidad-participe/entidad-edit/entidad-edit.component';
import { EntidadParticipeInfoComponent } from './modules/crd/forms/entidad-participe/entidad-participe-info/entidad-participe-info.component';
import { NavegacionCascadaComponent } from './modules/crd/forms/entidad-participe/navegacion-cascada/navegacion-cascada.component';
import { ParticipeDashComponent } from './modules/crd/forms/entidad-participe/participe-dash/participe-dash.component';
import { ParticipeInfoComponent } from './modules/crd/forms/entidad-participe/participe-info/participe-info.component';
import { AportesPorRevisarComponent } from './modules/crd/forms/historicos/aportes-por-revisar/aportes-por-revisar.component';
import { ExtersComponent } from './modules/crd/forms/historicos/exters/exters.component';
import { PagoCuotasComponent } from './modules/crd/forms/pago-cuotas/pago-cuotas.component';
import { EstadosCrdComponent } from './modules/crd/forms/parametrizacion/estados-crd/estados-crd.component';
import { ListadosCrdComponent } from './modules/crd/forms/parametrizacion/listados-crd/listados-crd.component';
import { TiposCrdComponent } from './modules/crd/forms/parametrizacion/tipos-crd/tipos-crd.component';
import { CuotaConsultaComponent } from './modules/crd/forms/prestamo/cuota-consulta/cuota-consulta.component';
import { EntidadCreditosComponent } from './modules/crd/menucreditos/entidad-creditos.component';
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
    path: 'menucontabilidad',
    component: MenuContabilidadComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'naturaleza-cuentas',
        component: NaturalezaDeCuentasComponent,
      },
      {
        path: 'naturaleza-cuentas1',
        component: NaturalezaDeCuentasComponent,
        canDeactivate: [canDeactivateGuard],
        resolve: {
          naturalezaCuentas: NaturalezaCuentaResolverService,
        },
      },
      {
        path: 'plan-cuentas',
        component: PlanArbolComponent,
      },
      {
        path: 'plan-grid',
        component: PlanGridComponent,
      },
      {
        path: 'centro-costos/arbol',
        component: CentroArbolComponent,
      },
      {
        path: 'centro-costos/grid',
        component: CentroGridComponent,
      },
      {
        path: 'tipos-asientos/general',
        component: TipoAsientoGeneralGridComponent,
      },
      {
        path: 'tipos-asientos/sistema',
        component: TipoAsientoSistemaGridComponent,
      },
      {
        path: 'plantillas/general',
        component: PlantillaGeneralComponent,
        canDeactivate: [canDeactivateGuard],
        data: { sistema: 0 },
      },
      {
        path: 'plantillas/sistema',
        component: PlantillaGeneralComponent,
        canDeactivate: [canDeactivateGuard],
        data: { sistema: 1 },
      },
      {
        path: 'periodo-contable',
        component: PeriodoContableComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'procesos/asientos-dinamico',
        component: AsientosContablesDinamico,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'procesos/asientos-dinamico/:id',
        component: AsientosContablesDinamico,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'procesos/mayorizacion',
        component: MayorizacionComponent,
        canActivate: [authGuard],
      },
      {
        path: 'procesos/detalle-mayorizacion',
        component: DetalleMayorizacionComponent,
        canActivate: [authGuard],
      },
      {
        path: 'listado-asientos',
        component: ListadoAsientosComponent,
        canActivate: [authGuard],
      },
      {
        path: 'mayorizacion-proceso',
        component: MayorizacionProcesoComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'reportes/balance-general',
        component: ReporteBalanceGeneralComponent,
        canActivate: [authGuard],
        data: { title: 'Balance General' },
      },
      {
        path: 'reportes/mayor-analitico',
        component: ReporteMayorAnaliticoComponent,
        canActivate: [authGuard],
        data: { title: 'Mayor Analítico' },
      },
      {
        path: 'reportes/listado-asientos',
        component: ReporteListadoAsientosComponent,
        canActivate: [authGuard],
        data: { title: 'Listado de Asientos' },
      },
      // Puedes agregar más rutas hijas aquí
    ],
  },
  {
    path: 'menutesoreria',
    component: MenutesoreriaComponent,
    canActivate: [authGuard],
    children: [
      // Parametrización
      {
        path: 'parametrizacion/bancos',
        component: TsrPlaceholderComponent,
        canActivate: [authGuard],
        data: { title: 'Bancos' },
      },
      {
        path: 'parametrizacion/cajas/logicas',
        component: TsrPlaceholderComponent,
        canActivate: [authGuard],
        data: { title: 'Cajas Lógicas' },
      },
      {
        path: 'parametrizacion/cajas/fisicas',
        component: CajasFisicasComponent,
        canActivate: [authGuard],
        data: { title: 'Cajas Físicas' },
      },
      {
        path: 'parametrizacion/bancos/nacionales-extranjeros',
        component: BancosNacionalesExtranjerosComponent,
        canActivate: [authGuard],
        data: { title: 'Nacionales y Extranjeros' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/bancos',
        component: BancosComponent,
        canActivate: [authGuard],
        data: { title: 'Mis Bancos - Bancos' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/cuentas-bancarias',
        component: CuentasBancariasComponent,
        canActivate: [authGuard],
        data: { title: 'Mis Bancos - Cuentas Bancarias' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/chequeras/solicitud',
        component: SolicitudChequeraComponent,
        canActivate: [authGuard],
        data: { title: 'Solicitud Chequera' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/chequeras/chequera',
        component: ChequeraComponent,
        canActivate: [authGuard],
        data: { title: 'Chequera' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/chequeras/recepcion',
        component: RecepcionChequeraComponent,
        canActivate: [authGuard],
        data: { title: 'Recepción Chequera' },
      },
      {
        path: 'parametrizacion/bancos/mis-bancos/chequeras/cheques',
        component: ChequeraComponent,
        canActivate: [authGuard],
        data: { title: 'Cheques' },
      },
      {
        path: 'parametrizacion/cajas/logicas/grupos',
        component: GruposCajasComponent,
        canActivate: [authGuard],
        data: { title: 'Grupos' },
      },
      {
        path: 'parametrizacion/cajas/logicas/cajas-por-grupo',
        component: CajasPorGrupoComponent,
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
        component: TitularesComponent,
        canActivate: [authGuard],
        data: { title: 'Titulares' },
      },

      // Procesos - Cobros
      {
        path: 'procesos/cobros/ingresar',
        component: CobrosIngresarComponent,
        canActivate: [authGuard],
        data: { title: 'Cobros - Ingresar' },
      },
      {
        path: 'procesos/cobros/cierre-caja',
        component: CierreCajaComponent,
        canActivate: [authGuard],
        data: { title: 'Cobros - Cierre de Caja' },
      },
      {
        path: 'procesos/cobros/depositos/envio',
        component: EnvioDepositosComponent,
        canActivate: [authGuard],
        data: { title: 'Cobros - Depósitos Envío' },
      },
      {
        path: 'procesos/cobros/depositos/ratificacion',
        component: RatificacionDepositosComponent,
        canActivate: [authGuard],
        data: { title: 'Cobros - Depósitos Ratificación' },
      },
      {
        path: 'procesos/cobros/consultas/cobros',
        component: ConsultasCobrosComponent,
        canActivate: [authGuard],
        data: { title: 'Consultas - Cobros' },
      },
      {
        path: 'procesos/cobros/consultas/cierres',
        component: ConsultasCierresComponent,
        canActivate: [authGuard],
        data: { title: 'Consultas - Cierres' },
      },
      {
        path: 'procesos/cobros/procesos/cobros',
        component: ProcesosCobrosComponent,
        canActivate: [authGuard],
        data: { title: 'Procesos - Cobros' },
      },
      {
        path: 'procesos/cobros/procesos/cierres',
        component: ProcesosCierresComponent,
        canActivate: [authGuard],
        data: { title: 'Procesos - Cierres' },
      },
      {
        path: 'procesos/cobros/procesos/depositos',
        component: ProcesosDepositosComponent,
        canActivate: [authGuard],
        data: { title: 'Procesos - Depósitos' },
      },
      {
        path: 'procesos/cobros/procesos/ratificacion-depositos',
        component: ProcesosRatificacionDepositosComponent,
        canActivate: [authGuard],
        data: { title: 'Procesos - Ratificación Depósitos' },
      },

      // Procesos - Pagos
      {
        path: 'procesos/pagos/ingreso',
        component: PagosIngresarComponent,
        canActivate: [authGuard],
        data: { title: 'Pagos - Ingreso' },
      },
      {
        path: 'procesos/pagos/cheques/impresion',
        component: ChequesImpresionComponent,
        canActivate: [authGuard],
        data: { title: 'Pagos - Cheques Impresión' },
      },
      {
        path: 'procesos/pagos/cheques/entrega',
        component: ChequesEntregaComponent,
        canActivate: [authGuard],
        data: { title: 'Pagos - Cheques Entrega' },
      },
      {
        path: 'procesos/pagos/consulta/pagos',
        component: ConsultasPagosComponent,
        canActivate: [authGuard],
        data: { title: 'Consulta - Pagos' },
      },
      {
        path: 'procesos/pagos/consulta/cheques',
        component: ConsultasChequesComponent,
        canActivate: [authGuard],
        data: { title: 'Consulta - Cheques' },
      },
      {
        path: 'procesos/pagos/procesos/solicitud-pagos',
        component: SolicitudPagosComponent,
        canActivate: [authGuard],
        data: { title: 'Procesos - Solicitud Pagos' },
      },
      {
        path: 'procesos/pagos/procesos/cheques-generados',
        component: ChequesGeneradosComponent,
        canActivate: [authGuard],
        data: { title: 'Procesos - Cheques Generados' },
      },
      {
        path: 'procesos/pagos/procesos/cheques-impresos',
        component: ChequesImpresosProcComponent,
        canActivate: [authGuard],
        data: { title: 'Procesos - Cheques Impresos' },
      },
      {
        path: 'procesos/pagos/procesos/cheques-entregados',
        component: ChequesEntregadosProcComponent,
        canActivate: [authGuard],
        data: { title: 'Procesos - Cheques Entregados' },
      },

      // Procesos - Movimientos Bancarios
      {
        path: 'procesos/movimientos-bancarios/debitos',
        component: DebitosComponent,
        canActivate: [authGuard],
        data: { title: 'Movimientos Bancarios - Débitos' },
      },
      {
        path: 'procesos/movimientos-bancarios/creditos',
        component: CreditosComponent,
        canActivate: [authGuard],
        data: { title: 'Movimientos Bancarios - Créditos' },
      },
      {
        path: 'procesos/movimientos-bancarios/transferencias',
        component: TransferenciasComponent,
        canActivate: [authGuard],
        data: { title: 'Movimientos Bancarios - Transferencias' },
      },

      // Procesos - Generales
      {
        path: 'procesos/generales/conciliacion',
        component: ConciliacionComponent,
        canActivate: [authGuard],
        data: { title: 'Conciliación' },
      },
      {
        path: 'procesos/generales/consulta-conciliacion',
        component: ConsultaConciliacionComponent,
        canActivate: [authGuard],
        data: { title: 'Consulta Conciliación' },
      },
      {
        path: 'procesos/generales/ried',
        component: RiedComponent,
        canActivate: [authGuard],
        data: { title: 'RIED' },
      },
    ],
  },
  {
    path: 'rrhh',
    component: MenurecursoshumanosComponent,
    canActivate: [authGuard],
    children: [
      // Parametrización
      {
        path: 'parametrizacion/departamento-cargo',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/cargos/asignacion-departamentos/departamento-cargo-list.component').then(
            (m) => m.DepartamentoCargoListComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/departamentos',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/cargos/asignacion-departamentos/departamento-list.component').then(
            (m) => m.DepartamentoListComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/cargos',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/cargos/cargo-list/cargo-list.component').then(
            (m) => m.CargoListComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/cargos/asignacion-departamentos',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/cargos/asignacion-departamentos/departamento-list.component').then(
            (m) => m.DepartamentoListComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/tipos-contrato',
        component: RrhTiposContratoComponent,
        canActivate: [authGuard],
      },
      { path: 'parametrizacion/turnos', component: RrhTurnosComponent, canActivate: [authGuard] },
      // TODO: parametrizacion/rubros se agregará cuando exista su componente
      // Gestión de Personal
      { path: 'gestion/empleados', component: RrhEmpleadosComponent, canActivate: [authGuard] },
      {
        path: 'gestion/empleados/historial-cargo',
        loadComponent: () =>
          import('./modules/rrh/forms/gestion/empleados/historial-cargo/hstr-list.component').then(
            (m) => m.HstrListComponent,
          ),
        canActivate: [authGuard],
      },
      { path: 'gestion/contratos', component: RrhContratosComponent, canActivate: [authGuard] },
      { path: 'gestion/vacaciones', component: RrhVacacionesComponent, canActivate: [authGuard] },
      { path: 'gestion/permisos', component: RrhPermisosComponent, canActivate: [authGuard] },
      { path: 'gestion/asistencia', component: RrhAsistenciaComponent, canActivate: [authGuard] },
      // Procesos
      { path: 'procesos/nomina', component: RrhNominaComponent, canActivate: [authGuard] },
      { path: 'procesos/roles-pago', component: RrhRolesPagoComponent, canActivate: [authGuard] },
      { path: 'procesos/aportes', component: RrhAportesComponent, canActivate: [authGuard] },
      {
        path: 'procesos/liquidaciones',
        component: RrhLiquidacionesComponent,
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'menurecursoshumanos',
    component: MenurecursoshumanosComponent,
    canActivate: [authGuard],
    children: [
      // Parametrización
      {
        path: 'parametrizacion/departamento-cargo',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/cargos/asignacion-departamentos/departamento-cargo-list.component').then(
            (m) => m.DepartamentoCargoListComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/departamentos',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/cargos/asignacion-departamentos/departamento-list.component').then(
            (m) => m.DepartamentoListComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/cargos',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/cargos/cargo-list/cargo-list.component').then(
            (m) => m.CargoListComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/cargos/asignacion-departamentos',
        loadComponent: () =>
          import('./modules/rrh/forms/parametrizacion/cargos/asignacion-departamentos/departamento-list.component').then(
            (m) => m.DepartamentoListComponent,
          ),
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/tipos-contrato',
        component: RrhTiposContratoComponent,
        canActivate: [authGuard],
      },
      { path: 'parametrizacion/turnos', component: RrhTurnosComponent, canActivate: [authGuard] },
      // Gestión de Personal
      { path: 'gestion/empleados', component: RrhEmpleadosComponent, canActivate: [authGuard] },
      {
        path: 'gestion/empleados/historial-cargo',
        loadComponent: () =>
          import('./modules/rrh/forms/gestion/empleados/historial-cargo/hstr-list.component').then(
            (m) => m.HstrListComponent,
          ),
        canActivate: [authGuard],
      },
      { path: 'gestion/contratos', component: RrhContratosComponent, canActivate: [authGuard] },
      { path: 'gestion/vacaciones', component: RrhVacacionesComponent, canActivate: [authGuard] },
      { path: 'gestion/permisos', component: RrhPermisosComponent, canActivate: [authGuard] },
      { path: 'gestion/asistencia', component: RrhAsistenciaComponent, canActivate: [authGuard] },
      // Procesos
      { path: 'procesos/nomina', component: RrhNominaComponent, canActivate: [authGuard] },
      { path: 'procesos/roles-pago', component: RrhRolesPagoComponent, canActivate: [authGuard] },
      { path: 'procesos/aportes', component: RrhAportesComponent, canActivate: [authGuard] },
      {
        path: 'procesos/liquidaciones',
        component: RrhLiquidacionesComponent,
        canActivate: [authGuard],
      },
      // Reportes
      { path: 'reportes/roles', component: RrhReporteRolesComponent, canActivate: [authGuard] },
      {
        path: 'reportes/vacaciones',
        component: RrhReporteVacacionesComponent,
        canActivate: [authGuard],
      },
      {
        path: 'reportes/asistencia',
        component: RrhReporteAsistenciaComponent,
        canActivate: [authGuard],
      },
      { path: 'reportes/nomina', component: RrhReporteNominaComponent, canActivate: [authGuard] },
    ],
  },
  {
    path: 'menucuentasxcobrar',
    component: MenucuentasxcobrarComponent,
    canActivate: [authGuard],
  },
  {
    path: 'menucuentaxpagar',
    component: MenucuentaxpagarComponent,
    canActivate: [authGuard],
  },
  {
    path: 'menucreditos',
    component: MenucreditosComponent,
    canActivate: [authGuard],
    children: [
      { path: 'parametrizacion', component: ParametrizacionCreditosComponent },
      { path: 'extr', component: ExtersComponent },
      { path: 'aportes-revisar', component: AportesPorRevisarComponent },
      { path: 'entidad', component: EntidadCreditosComponent },
      { path: 'navegacion-cascada', component: NavegacionCascadaComponent },
      { path: 'participe-dash', component: ParticipeDashComponent },
      { path: 'participe-info', component: ParticipeInfoComponent },
      { path: 'cruce-valores', component: CruceValoresComponent },
      { path: 'pago-cuotas', component: PagoCuotasComponent },
      {
        path: 'entidad-edit',
        component: EntidadEditComponent,
        canDeactivate: [canDeactivateGuard],
        resolve: { data: entidadEditResolver },
      },
      { path: 'entidad-consulta', component: EntidadConsultaComponent },
      {
        path: 'carga-aportes',
        component: CargaAportesComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'carga-aportes-back',
        component: CargaAporteBackComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'consulta-archivos-petro',
        component: ConsultaArchivosPetroComponent,
        resolve: { cargas: ConsultaCargaArchivoResolverService },
      },
      {
        path: 'detalle-consulta-carga/:id',
        component: DetalleConsultaCargaComponent,
      },
      { path: 'entidad-participe-info', component: EntidadParticipeInfoComponent },
      {
        path: 'estadosCrd',
        component: EstadosCrdComponent,
        canDeactivate: [canDeactivateGuard],
        resolve: { estados: EstadosResolverService },
      },
      {
        path: 'tiposCrd',
        component: TiposCrdComponent,
        canDeactivate: [canDeactivateGuard],
        resolve: { tipos: TiposCrdResolverService },
      },
      {
        path: 'listadosCrd',
        component: ListadosCrdComponent,
        canDeactivate: [canDeactivateGuard],
        resolve: { listados: ListadosCrdResolverService },
      },
      // Rutas de Contratos
      {
        path: 'contrato-dash',
        component: ContratoDashComponent,
        canActivate: [authGuard],
      },
      {
        path: 'aportes-dash/:codigoEntidad',
        component: AportesDashComponent,
        canActivate: [authGuard],
      },
      {
        path: 'contrato-consulta',
        component: ContratoConsultaComponent,
        canActivate: [authGuard],
      },
      {
        path: 'contrato-edit',
        component: ContratoEditComponent,
        canActivate: [authGuard],
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'contrato-edit/:id',
        component: ContratoEditComponent,
        canActivate: [authGuard],
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'cuota-consulta',
        component: CuotaConsultaComponent,
        canActivate: [authGuard],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
