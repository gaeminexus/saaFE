import { Routes } from '@angular/router';
import { AsientosComponent } from './modules/cnt/forms/asientos/asientos.component';
import { CentroArbolComponent } from './modules/cnt/forms/centro-arbol/centro-arbol.component';
import { CentroGridComponent } from './modules/cnt/forms/centro-grid/centro-grid.component';
import { MayorizacionProcesoComponent } from './modules/cnt/forms/mayorizacion-proceso/mayorizacion-proceso.component';
import { PeriodoContableComponent } from './modules/cnt/forms/periodo-contable/periodo-contable.component';
import { PeriodosComponent } from './modules/cnt/forms/periodos/periodos.component';
import { PlanArbolComponent } from './modules/cnt/forms/plan-arbol/plan-arbol.component';
import { PlanGridComponent } from './modules/cnt/forms/plan-grid/plan-grid.component';
import { PlantillaGeneralComponent } from './modules/cnt/forms/plantilla-general/plantilla-general.component';
import { PlantillaSistemaComponent } from './modules/cnt/forms/plantilla-sistema/plantilla-sistema.component';
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
import { MenutesoreriaComponent } from './modules/tsr/menu/menutesoreria/menutesoreria.component';
import { authGuard } from './shared/guard/auth.guard';
import { canDeactivateGuard } from './shared/guard/can-deactivate.guard';
// Reemplazamos placeholder EXTR por componente grid paginado
import { AsientosContablesComponent } from './modules/cnt/forms/asientos-contables/asientos-contables.component';
import { NaturalezaDeCuentasComponent } from './modules/cnt/forms/naturaleza-cuentas/naturaleza-cuentas.component';
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
import { ExtersComponent } from './modules/crd/forms/exters/exters.component';
import { PagoCuotasComponent } from './modules/crd/forms/pago-cuotas/pago-cuotas.component';
import { EstadosCrdComponent } from './modules/crd/forms/parametrizacion/estados-crd/estados-crd.component';
import { ListadosCrdComponent } from './modules/crd/forms/parametrizacion/listados-crd/listados-crd.component';
import { TiposCrdComponent } from './modules/crd/forms/parametrizacion/tipos-crd/tipos-crd.component';
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
      },
      {
        path: 'plantillas/sistema',
        component: PlantillaSistemaComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'periodo-contable',
        component: PeriodoContableComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'periodos',
        component: PeriodosComponent,
      },
      {
        path: 'asientos',
        component: AsientosComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'asientos-contables',
        component: AsientosContablesComponent,
        canDeactivate: [canDeactivateGuard],
      },
      {
        path: 'mayorizacion-proceso',
        component: MayorizacionProcesoComponent,
        canDeactivate: [canDeactivateGuard],
      },
      // Puedes agregar más rutas hijas aquí
    ],
  },
  {
    path: 'menutesoreria',
    component: MenutesoreriaComponent,
    canActivate: [authGuard],
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
    ],
  },
  { path: '**', redirectTo: '' },
];
