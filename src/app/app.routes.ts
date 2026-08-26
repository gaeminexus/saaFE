import { Routes } from '@angular/router';
import { MayorizacionProcesoComponent } from './modules/cnt/forms/mayorizacion-proceso/mayorizacion-proceso.component';
import { CentroArbolComponent } from './modules/cnt/forms/parametrizacion/centro-arbol/centro-arbol.component';
import { CentroGridComponent } from './modules/cnt/forms/parametrizacion/centro-grid/centro-grid.component';
import { PeriodoContableComponent } from './modules/cnt/forms/parametrizacion/periodo-contable/periodo-contable.component';
import { PlanArbolComponent } from './modules/cnt/forms/parametrizacion/plan-arbol/plan-arbol.component';
import { PlanGridComponent } from './modules/cnt/forms/parametrizacion/plan-grid/plan-grid.component';
import { PlantillaGeneralComponent } from './modules/cnt/forms/parametrizacion/plantilla-general/plantilla-general.component';
import { ReportesContablesComponent } from './modules/cnt/forms/parametrizacion/reportes-contables/reportes-contables.component';
import { TipoAsientoGeneralGridComponent } from './modules/cnt/forms/parametrizacion/tipo-asiento-general-grid/tipo-asiento-general-grid.component';
import { TipoAsientoSistemaGridComponent } from './modules/cnt/forms/parametrizacion/tipo-asiento-sistema-grid/tipo-asiento-sistema-grid.component';
import { ReporteBalanceGeneralComponent } from './modules/cnt/forms/reporte-balance-general/reporte-balance-general.component';
import { ReporteListadoAsientosComponent } from './modules/cnt/forms/reporte-listado-asientos/reporte-listado-asientos.component';
import { ReporteMayorAnaliticoComponent } from './modules/cnt/forms/reporte-mayor-analitico/reporte-mayor-analitico.component';
import { MenuContabilidadComponent } from './modules/cnt/menu/menucontabilidad/menucontabilidad.component';
import { NaturalezaCuentaResolverService } from './modules/cnt/resolver/naturaleza-cuenta-resolver.service';
import { AportesDashComponent } from './modules/crd/forms/contrato/aportes-dash/aportes-dash.component';
import { ContratoConsultaComponent } from './modules/crd/forms/contrato/contrato-consulta/contrato-consulta.component';
import { ContratoDashComponent } from './modules/crd/forms/contrato/contrato-dash/contrato-dash.component';
import { ContratoEditComponent } from './modules/crd/forms/contrato/contrato-edit/contrato-edit.component';
import { MenucreditosComponent } from './modules/crd/menucreditos/menucreditos.component';
import { ParametrizacionCreditosComponent } from './modules/crd/menucreditos/parametrizacion-creditos.component';
import { GruposProductosCobroComponent } from './modules/cxc/forms/parametrizacion/grupos-productos-cobro/grupos-productos-cobro.component';
import { DatosFacturadorComponent } from './modules/cxc/forms/parametrizacion/datos-facturador/datos-facturador.component';
import { DatosSriComponent } from './modules/cxc/forms/parametrizacion/datos-sri/datos-sri.component';
import { FacturasIngresoComponent } from './modules/cxc/forms/emitir/facturas-ingreso/facturas-ingreso.component';
import { NotasCreditoComponent } from './modules/cxc/forms/emitir/notas-credito/notas-credito.component';
import { NotasDebitoComponent } from './modules/cxc/forms/emitir/notas-debito/notas-debito.component';
import { LiquidacionesComponent } from './modules/cxc/forms/emitir/liquidaciones/liquidaciones.component';
import { Retencionesv2Component } from './modules/cxc/forms/emitir/retencionesv2';
import { AnticipoComponent } from './modules/cxc/forms/gestionar/anticipo/anticipo.component';
import { ConsultaFacturasComponent } from './modules/cxc/forms/gestionar/consulta-facturas/consulta-facturas.component';
import { ConsultaDocumentosElectronicosComponent } from './modules/cxc/forms/gestionar/consulta-documentos-electronicos/consulta-documentos-electronicos.component';
import { FinanciarFacturaComponent } from './modules/cxc/forms/gestionar/financiar-factura/financiar-factura.component';
import { AbonosFacturaComponent } from './modules/cxc/forms/cobros/abonos-factura/abonos-factura.component';
import { RegistrarCobroComponent } from './modules/cxc/forms/cobros/registrar-cobro/registrar-cobro.component';
import { CruceAnticipoClienteComponent } from './modules/cxc/forms/cobros/cruce-anticipo-cliente/cruce-anticipo-cliente.component';
import { DashVentasComponent } from './modules/cxc/reportes/dash-ventas';
import { MenucuentasxcobrarComponent } from './modules/cxc/menu/menucuentasxcobrar/menucuentasxcobrar.component';
import { MenucuentaxpagarComponent } from './modules/cxp/menu/menucuentasxpagar/menucuentasxpagar.component';
import { GruposProductosPagoComponent } from './modules/cxp/forms/parametrizacion/grupos-productos-pago/grupos-productos-pago.component';
import { ProveedoresComponent } from './modules/cxp/forms/parametrizacion/proveedores/proveedores.component';
import { DatosSriCxpComponent } from './modules/cxp/forms/parametrizacion/datos-sri-cxp/datos-sri-cxp.component';
import { BandejaElectronicaComponent } from './modules/cxp/forms/procesos/bandeja-electronica/bandeja-electronica.component';
import { GestionDocumentosComponent } from './modules/cxp/forms/procesos/gestion-documentos/gestion-documentos.component';
import { ConsultaDocumentosComponent } from './modules/cxp/forms/procesos/consulta-documentos/consulta-documentos.component';
import { CruceAnticipoProveedorComponent } from './modules/cxp/forms/pagos/cruce-anticipo-proveedor/cruce-anticipo-proveedor.component';
import { PagosTransferenciaComponent } from './modules/cxp/forms/pagos/pagos-transferencia/pagos-transferencia.component';
import { NegociacionesComponent } from './modules/cxp/forms/negociaciones/negociaciones.component';
import { DetalleNegociacionComponent } from './modules/cxp/forms/negociaciones/detalle-negociacion/detalle-negociacion.component';
import { DashboardCxpComponent } from './modules/cxp/forms/reportes/dashboard-cxp/dashboard-cxp.component';
import { LoginComponent } from './modules/dash/forms/login/login.component';
import { MenuComponent } from './modules/dash/menu/menu.component';
import { ReportesSuperBancosComponent } from './modules/rpr/forms/reportes-super-bancos/reportes-super-bancos.component';
import { InformesMensualesCreditoComponent } from './modules/rpr/forms/informes-mensuales-credito/informes-mensuales-credito.component';
import { MenureportesComponent } from './modules/rpr/menu/menureportes/menureportes.component';
import { MenurecursoshumanosComponent } from './modules/rrh/menu/menurecursoshumanos/menurecursoshumanos.component';
// RRHH demo components
import { VacacionesListComponent } from './modules/rrh/forms/gestion/vacaciones/vacaciones-list.component';
import { AporteRetencionListComponent } from './modules/rrh/forms/procesos/aportes-retenciones/aporte-retencion-list.component';
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
import { CargarExtractoBancarioComponent } from './modules/tsr/forms/generales/cargar-extracto-bancario/cargar-extracto-bancario.component';
import { ConsultaExtractosBancariosComponent } from './modules/tsr/forms/generales/consulta-extractos-bancarios/consulta-extractos-bancarios.component';
import { DetalleExtractoBancarioComponent } from './modules/tsr/forms/generales/detalle-extracto-bancario/detalle-extracto-bancario.component';
import { TableroCumplimientoExtractosComponent } from './modules/tsr/forms/generales/tablero-cumplimiento-extractos/tablero-cumplimiento-extractos.component';
import { ConciliacionContableComponent } from './modules/tsr/forms/generales/conciliacion-contable/conciliacion-contable.component';
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
import { TitularesV2Component } from './modules/tsr/forms/titulares-v2/titulares-v2.component';
import { MenutesoreriaComponent } from './modules/tsr/menu/menutesoreria/menutesoreria.component';
import { authGuard } from './shared/guard/auth.guard';
import { canDeactivateGuard } from './shared/guard/can-deactivate.guard';
// Reemplazamos placeholder EXTR por componente grid paginado
import { AsientosContablesDinamico } from './modules/cnt/forms/asientos-contables-dinamico/asientos-contables-dinamico';
import { DetalleMayorizacionComponent } from './modules/cnt/forms/detalle-mayorizacion/detalle-mayorizacion.component';
import { ListadoAsientosComponent } from './modules/cnt/forms/listado-asientos/listado-asientos.component';
import { MayorizacionComponent } from './modules/cnt/forms/mayorizacion/mayorizacion.component';
import { NaturalezaDeCuentasComponent } from './modules/cnt/forms/parametrizacion/naturaleza-cuentas/naturaleza-cuentas.component';
import { CargaAporteBackComponent } from './modules/crd/forms/archivos-petro/carga/carga-aporte-back/carga-aporte-back.component';
import { CargaAportesComponent } from './modules/crd/forms/archivos-petro/carga/carga-aportes/carga-aportes.component';
import { ConsultaArchivosPetroComponent } from './modules/crd/forms/archivos-petro/carga/consulta-archivos-petro/consulta-archivos-petro.component';
import { DetalleConsultaCargaComponent } from './modules/crd/forms/archivos-petro/carga/detalle-consulta-carga/detalle-consulta-carga.component';
import { ConsultaGeneracionArchivoComponent } from './modules/crd/forms/archivos-petro/generar/consulta-generacion-archivo/consulta-generacion-archivo.component';
import { DetalleGeneracionArchivoComponent } from './modules/crd/forms/archivos-petro/generar/detalle-generacion-archivo/detalle-generacion-archivo.component';
import { GenerarArchivoPetroComponent } from './modules/crd/forms/archivos-petro/generar/generar-archivo-petro/generar-archivo-petro.component';
import { CobrosPersonalesComponent } from './modules/crd/forms/cobros-personales/cobros-personales.component';
import { CruceDeValoresComponent } from './modules/crd/forms/cruce-de-valores/cruce-de-valores.component';
import { CruceValoresComponent } from './modules/crd/forms/cruce-valores/cruce-valores.component';
import { DevolucionAportesComponent } from './modules/crd/forms/devolucion-aportes/devolucion-aportes.component';
import { EntidadConsultaComponent } from './modules/crd/forms/entidad-participe/entidad-consulta/entidad-consulta.component';
import { EntidadEditComponent } from './modules/crd/forms/entidad-participe/entidad-edit/entidad-edit.component';
import { EntidadParticipeInfoComponent } from './modules/crd/forms/entidad-participe/entidad-participe-info/entidad-participe-info.component';
import { ProcesoPagoJubiladosComponent } from './modules/crd/forms/entidad-participe/jubilados/proceso-pago-jubilados/proceso-pago-jubilados.component';
import { JubilarParticipeComponent } from './modules/crd/forms/entidad-participe/jubilados/jubilar-participe/jubilar-participe.component';
import { NavegacionCascadaComponent } from './modules/crd/forms/entidad-participe/navegacion-cascada/navegacion-cascada.component';
import { ConsolidadoComponent } from './modules/crd/forms/entidad-participe/consolidado/consolidado.component';
import { ParticipeDashComponent } from './modules/crd/forms/entidad-participe/participe-dash/participe-dash.component';
import { ParticipeInfoComponent } from './modules/crd/forms/entidad-participe/participe-info/participe-info.component';
import { AportesPorRevisarComponent } from './modules/crd/forms/historicos/aportes-por-revisar/aportes-por-revisar.component';
import { BaseInicialParticipesComponent } from './modules/crd/forms/historicos/base-inicial-participes/base-inicial-participes.component';
import { ExtersComponent } from './modules/crd/forms/historicos/exters/exters.component';
import { PagoCuotasComponent } from './modules/crd/forms/pago-cuotas/pago-cuotas.component';
import { SimuladorCreditoComponent } from './modules/crd/forms/simulador-credito/simulador-credito.component';
import { SimuladorPrestamoComponent } from './modules/crd/forms/simulador-prestamo/simulador-prestamo.component';
import { EstadosCrdComponent } from './modules/crd/forms/parametrizacion/estados-crd/estados-crd.component';
import { InformacionGeneralFondoComponent } from './modules/crd/forms/parametrizacion/informacion-general-fondo/informacion-general-fondo.component';
import { ListadosCrdComponent } from './modules/crd/forms/parametrizacion/listados-crd/listados-crd.component';
import { TiposCrdComponent } from './modules/crd/forms/parametrizacion/tipos-crd/tipos-crd.component';
import { BandasCarteraComponent } from './modules/crd/forms/parametrizacion/bandas-cartera/bandas-cartera.component';
import { CierreCarteraComponent } from './modules/crd/forms/cierre-cartera/cierre-cartera.component';
import { usuarioUnoGuard } from './shared/guard/usuario-uno.guard';
import { AsignacionSegurosComponent } from './modules/crd/forms/asignacion-seguros/asignacion-seguros.component';
import { CuotaConsultaComponent } from './modules/crd/forms/prestamo/cuota-consulta/cuota-consulta.component';
import { PrestamoConsultaComponent } from './modules/crd/forms/prestamo/prestamo-consulta/prestamo-consulta.component';
import { PrestamoDashComponent } from './modules/crd/forms/prestamo/prestamo-dash/prestamo-dash.component';
import { PrestamoEditComponent } from './modules/crd/forms/prestamo/prestamo-edit/prestamo-edit.component';
import { RepoteValoresInsolutosComponent } from './modules/crd/forms/prestamo/repote-valores-insolutos/repote-valores-insolutos.component';
import { EntidadCreditosComponent } from './modules/crd/menucreditos/entidad-creditos.component';
import { ConsultaCargaArchivoResolverService } from './modules/crd/resolver/consulta-carga-archivo-resolver.service';
import { entidadEditResolver } from './modules/crd/resolver/entidad-edit.resolver';
import { EstadosResolverService } from './modules/crd/resolver/estados-resolver.service';
import { ListadosCrdResolverService } from './modules/crd/resolver/listados-crd-resolver.service';
import { TiposCrdResolverService } from './modules/crd/resolver/tipos-crd-resolver.service';
import { AnticiposClientesComponent } from './modules/tsr/forms/anticipos/anticipos-clientes/anticipos-clientes.component';
import { AnticiposProveedoresComponent } from './modules/tsr/forms/anticipos/anticipos-proveedores/anticipos-proveedores.component';
import { SeguimientoAnticiposComponent } from './modules/tsr/forms/anticipos/seguimiento-anticipos/seguimiento-anticipos.component';
import { EstadoCuentaTitularComponent } from './modules/tsr/forms/estado-cuenta-titular/estado-cuenta-titular.component';
import { RegistroIngresoComponent } from './modules/tsr/forms/registrar/registro-ingreso/registro-ingreso.component';
import { RegistroEgresoComponent } from './modules/tsr/forms/registrar/registro-egreso/registro-egreso.component';

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
        path: 'parametrizacion/reportes-contables',
        component: ReportesContablesComponent,
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
        component: TitularesV2Component,
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
        component: AnticiposClientesComponent,
        canActivate: [authGuard],
        data: { title: 'Anticipos - Clientes' },
      },
      {
        path: 'procesos/anticipos/proveedores',
        component: AnticiposProveedoresComponent,
        canActivate: [authGuard],
        data: { title: 'Anticipos - Proveedores' },
      },
      {
        path: 'procesos/anticipos/seguimiento',
        component: SeguimientoAnticiposComponent,
        canActivate: [authGuard],
        data: { title: 'Seguimiento de Anticipos' },
      },
      {
        path: 'procesos/estado-cuenta-titular',
        component: EstadoCuentaTitularComponent,
        canActivate: [authGuard],
        data: { title: 'Estado de Cuenta de Titular' },
      },

      // Procesos - Registrar
      {
        path: 'procesos/registrar/ingresos',
        component: RegistroIngresoComponent,
        canActivate: [authGuard],
        data: { title: 'Registrar - Ingresos' },
      },
      {
        path: 'procesos/registrar/egresos',
        component: RegistroEgresoComponent,
        canActivate: [authGuard],
        data: { title: 'Registrar - Egresos' },
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

      // Procesos - Extractos Bancarios
      {
        path: 'procesos/extractos-bancarios/cargar',
        component: CargarExtractoBancarioComponent,
        canActivate: [authGuard],
        data: { title: 'Cargar Extracto Bancario' },
      },
      {
        path: 'procesos/extractos-bancarios/consulta',
        component: ConsultaExtractosBancariosComponent,
        canActivate: [authGuard],
        data: { title: 'Consulta de Extractos Bancarios' },
      },
      {
        path: 'procesos/extractos-bancarios/detalle',
        component: DetalleExtractoBancarioComponent,
        canActivate: [authGuard],
        data: { title: 'Detalle de Extracto Bancario' },
      },
      {
        path: 'procesos/extractos-bancarios/tablero',
        component: TableroCumplimientoExtractosComponent,
        canActivate: [authGuard],
        data: { title: 'Tablero de Cumplimiento de Extractos' },
      },
      {
        path: 'procesos/conciliacion-contable',
        component: ConciliacionContableComponent,
        canActivate: [authGuard],
        data: { title: 'Conciliación Contable' },
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
      { path: 'gestion/vacaciones', component: VacacionesListComponent, canActivate: [authGuard] },
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
        component: AporteRetencionListComponent,
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
    component: MenucuentasxcobrarComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'parametrizacion/grupos-productos',
        component: GruposProductosCobroComponent,
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/datos-facturador',
        component: DatosFacturadorComponent,
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/datos-sri',
        component: DatosSriComponent,
        canActivate: [authGuard],
      },
      {
        path: 'emitir/facturas',
        component: FacturasIngresoComponent,
        canActivate: [authGuard],
      },
      {
        path: 'emitir/notas-credito',
        component: NotasCreditoComponent,
        canActivate: [authGuard],
      },
      {
        path: 'emitir/notas-debito',
        component: NotasDebitoComponent,
        canActivate: [authGuard],
      },
      {
        path: 'emitir/liquidaciones',
        component: LiquidacionesComponent,
        canActivate: [authGuard],
      },
      {
        path: 'emitir/retenciones',
        component: Retencionesv2Component,
        canActivate: [authGuard],
      },
      {
        path: 'emitir/retenciones-v2',
        component: Retencionesv2Component,
        canActivate: [authGuard],
      },
      {
        path: 'gestionar/facturas',
        component: ConsultaFacturasComponent,
        canActivate: [authGuard],
      },
      {
        path: 'gestionar/documentos-electronicos',
        component: ConsultaDocumentosElectronicosComponent,
        canActivate: [authGuard],
      },
      {
        path: 'gestionar/anticipos',
        component: AnticipoComponent,
        canActivate: [authGuard],
      },
      {
        path: 'gestionar/financiar-factura',
        component: FinanciarFacturaComponent,
        canActivate: [authGuard],
      },
      {
        path: 'cobros/abonos-factura',
        component: AbonosFacturaComponent,
        canActivate: [authGuard],
      },
      {
        path: 'cobros/registrar',
        component: RegistrarCobroComponent,
        canActivate: [authGuard],
      },
      {
        path: 'cobros/cruce-anticipo',
        component: CruceAnticipoClienteComponent,
        canActivate: [authGuard],
      },
      {
        path: 'reportes/dash-ventas',
        component: DashVentasComponent,
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'menucuentaxpagar',
    component: MenucuentaxpagarComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'parametrizacion/grupos-productos',
        component: GruposProductosPagoComponent,
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/datos-sri',
        component: DatosSriCxpComponent,
        canActivate: [authGuard],
      },
      {
        path: 'parametrizacion/proveedores',
        component: ProveedoresComponent,
        canActivate: [authGuard],
      },
      {
        path: 'procesos/bandeja-electronica',
        component: BandejaElectronicaComponent,
        canActivate: [authGuard],
      },
      {
        path: 'procesos/gestion-documentos',
        component: GestionDocumentosComponent,
        canActivate: [authGuard],
      },
      {
        path: 'procesos/consulta-documentos',
        component: ConsultaDocumentosComponent,
        canActivate: [authGuard],
      },
      {
        path: 'pagos/cruce-anticipo',
        component: CruceAnticipoProveedorComponent,
        canActivate: [authGuard],
      },
      {
        path: 'pagos/transferencias',
        component: PagosTransferenciaComponent,
        canActivate: [authGuard],
      },
      {
        path: 'negociaciones',
        component: NegociacionesComponent,
        canActivate: [authGuard],
      },
      {
        path: 'negociaciones/detalle/:id',
        component: DetalleNegociacionComponent,
        canActivate: [authGuard],
      },
      {
        path: 'reportes/dashboard',
        component: DashboardCxpComponent,
        canActivate: [authGuard],
      },
    ],
  },
  {
    path: 'menucreditos',
    component: MenucreditosComponent,
    canActivate: [authGuard],
    children: [
      { path: 'parametrizacion', component: ParametrizacionCreditosComponent },
      { path: 'extr', component: ExtersComponent },
      { path: 'aportes-revisar', component: AportesPorRevisarComponent },
      { path: 'participe-inicial', component: BaseInicialParticipesComponent },
      { path: 'entidad', component: EntidadCreditosComponent },
      { path: 'navegacion-cascada', component: NavegacionCascadaComponent },
      { path: 'participe-dash', component: ParticipeDashComponent },
      { path: 'consolidado', component: ConsolidadoComponent },
      { path: 'jubilados', component: ProcesoPagoJubiladosComponent },
      { path: 'jubilar-participe', component: JubilarParticipeComponent },
      { path: 'participe-info', component: ParticipeInfoComponent },
      { path: 'cruce-valores', component: CruceValoresComponent },
      { path: 'cruce-de-valores', component: CruceDeValoresComponent },
      { path: 'devolucion-aportes', component: DevolucionAportesComponent },
      { path: 'simulador-credito', component: SimuladorCreditoComponent },
      { path: 'simulador-prestamo', component: SimuladorPrestamoComponent },
      { path: 'pago-cuotas', component: PagoCuotasComponent },
      { path: 'cobros-personales', component: CobrosPersonalesComponent },
      {
        path: 'entidad-edit',
        component: EntidadEditComponent,
        canDeactivate: [canDeactivateGuard],
        resolve: { data: entidadEditResolver },
      },
      { path: 'entidad-consulta', component: EntidadConsultaComponent },
      {
        path: 'archivos-petro/carga/carga-aportes',
        component: CargaAportesComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'archivos-petro/carga/carga-aportes-back',
        component: CargaAporteBackComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'archivos-petro/carga/consulta',
        component: ConsultaArchivosPetroComponent,
        resolve: { cargas: ConsultaCargaArchivoResolverService },
      },
      {
        path: 'archivos-petro/carga/detalle/:id',
        component: DetalleConsultaCargaComponent,
      },
      {
        path: 'archivos-petro/generar/proceso',
        component: GenerarArchivoPetroComponent,
      },
      {
        path: 'archivos-petro/generar/consulta',
        component: ConsultaGeneracionArchivoComponent,
      },
      {
        path: 'archivos-petro/generar/detalle/:id',
        component: DetalleGeneracionArchivoComponent,
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
      {
        path: 'informacion-general-fondo',
        component: InformacionGeneralFondoComponent,
        canActivate: [authGuard],
      },
      {
        // TODO TEMPORAL: restringida al USUARIO 1 vía usuarioUnoGuard hasta que
        // exista el esquema de permisos definitivo (ver shared/guard/usuario-uno.guard.ts).
        path: 'bandas-cartera',
        component: BandasCarteraComponent,
        canActivate: [authGuard, usuarioUnoGuard],
      },
      {
        // TODO TEMPORAL: misma restricción a USUARIO 1 que bandas-cartera (usuarioUnoGuard),
        // hasta que exista el esquema de permisos definitivo.
        path: 'cierre-cartera',
        component: CierreCarteraComponent,
        canActivate: [authGuard, usuarioUnoGuard],
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
        path: 'prestamo-edit',
        component: PrestamoEditComponent,
        canActivate: [authGuard],
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'prestamo-consulta',
        component: PrestamoConsultaComponent,
        canActivate: [authGuard],
      },
      {
        path: 'prestamo-dash',
        component: PrestamoDashComponent,
        canActivate: [authGuard],
      },
      {
        path: 'asignacion-seguros',
        component: AsignacionSegurosComponent,
        canActivate: [authGuard],
      },
      {
        path: 'repote-valores-insolutos',
        component: RepoteValoresInsolutosComponent,
        canActivate: [authGuard],
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
