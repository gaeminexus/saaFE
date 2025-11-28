import { Routes } from '@angular/router';
import { authGuard } from './shared/guard/auth.guard';
import { canDeactivateGuard } from './shared/guard/can-deactivate.guard';
import { LoginComponent } from './modules/dash/forms/login/login.component';
import { MenuComponent } from './modules/dash/menu/menu.component';
import { MenuContabilidadComponent } from './modules/cnt/menu/menucontabilidad/menucontabilidad.component';
import { MenutesoreriaComponent } from './modules/tsr/menu/menutesoreria/menutesoreria.component';
import { MenucuentasxcobrarComponent } from './modules/cxc/menu/menucuentasxcobrar/menucuentasxcobrar.component';
import { MenucuentaxpagarComponent } from './modules/cxp/menu/menucuentasxpagar/menucuentasxpagar.component';
import { NaturalezaCuentaResolverService } from './modules/cnt/resolver/naturaleza-cuenta-resolver.service';
import { PlanArbolComponent } from './modules/cnt/forms/plan-arbol/plan-arbol.component';
import { PlanGridComponent } from './modules/cnt/forms/plan-grid/plan-grid.component';
import { CentroArbolComponent } from './modules/cnt/forms/centro-arbol/centro-arbol.component';
import { CentroGridComponent } from './modules/cnt/forms/centro-grid/centro-grid.component';
import { TipoAsientoGeneralGridComponent } from './modules/cnt/forms/tipo-asiento-general-grid/tipo-asiento-general-grid.component';
import { TipoAsientoSistemaGridComponent } from './modules/cnt/forms/tipo-asiento-sistema-grid/tipo-asiento-sistema-grid.component';
import { PlantillaGeneralComponent } from './modules/cnt/forms/plantilla-general/plantilla-general.component';
import { PlantillaSistemaComponent } from './modules/cnt/forms/plantilla-sistema/plantilla-sistema.component';
import { PeriodoContableComponent } from './modules/cnt/forms/periodo-contable/periodo-contable.component';
import { PeriodosComponent } from './modules/cnt/forms/periodos/periodos.component';
import { AsientosComponent } from './modules/cnt/forms/asientos/asientos.component';
import { MayorizacionProcesoComponent } from './modules/cnt/forms/mayorizacion-proceso/mayorizacion-proceso.component';
import { MenucreditosComponent } from './modules/crd/menucreditos/menucreditos.component';
import { ContratoDashComponent } from './modules/crd/forms/contrato/contrato-dash/contrato-dash.component';
import { AportesDashComponent } from './modules/crd/forms/contrato/aportes-dash/aportes-dash.component';
import { ContratoConsultaComponent } from './modules/crd/forms/contrato/contrato-consulta/contrato-consulta.component';
import { ContratoEditComponent } from './modules/crd/forms/contrato/contrato-edit/contrato-edit.component';
import { ParametrizacionCreditosComponent } from './modules/crd/menucreditos/parametrizacion-creditos.component';
// Reemplazamos placeholder EXTR por componente grid paginado
import { ExtersComponent } from './modules/crd/forms/exters/exters.component';
import { EntidadCreditosComponent } from './modules/crd/menucreditos/entidad-creditos.component';
import { NavegacionCascadaComponent } from './modules/crd/forms/entidad-participe/navegacion-cascada/navegacion-cascada.component';
import { ParticipeDashComponent } from './modules/crd/forms/entidad-participe/participe-dash/participe-dash.component';
import { ParticipeInfoComponent } from './modules/crd/forms/entidad-participe/participe-info/participe-info.component';
import { CargaAportesComponent } from './modules/crd/forms/archivos-petro/carga-aportes/carga-aportes.component';
import { EstadosCrdComponent } from './modules/crd/forms/parametrizacion/estados-crd/estados-crd.component';
import { EstadosResolverService } from './modules/crd/resolver/estados-resolver.service';
import { TiposCrdComponent } from './modules/crd/forms/parametrizacion/tipos-crd/tipos-crd.component';
import { TiposCrdResolverService } from './modules/crd/resolver/tipos-crd-resolver.service';
import { ListadosCrdComponent } from './modules/crd/forms/parametrizacion/listados-crd/listados-crd.component';
import { ListadosCrdResolverService } from './modules/crd/resolver/listados-crd-resolver.service';
import { EntidadParticipeInfoComponent } from './modules/crd/forms/entidad-participe/entidad-participe-info/entidad-participe-info.component';
import { EntidadEditComponent } from './modules/crd/forms/entidad-participe/entidad-edit/entidad-edit.component';
import { EntidadConsultaComponent } from './modules/crd/forms/entidad-participe/entidad-consulta/entidad-consulta.component';
import { entidadEditResolver } from './modules/crd/resolver/entidad-edit.resolver';
import { ConsultaArchivosPetroComponent } from './modules/crd/forms/archivos-petro/consulta-archivos-petro/consulta-archivos-petro.component';
import { ConsultaCargaArchivoResolverService } from './modules/crd/resolver/consulta-carga-archivo-resolver.service';
import { DetalleConsultaCargaComponent } from './modules/crd/forms/archivos-petro/detalle-consulta-carga/detalle-consulta-carga.component';
import { NaturalezaDeCuentasComponent } from './modules/cnt/forms/naturaleza-cuentas/naturaleza-cuentas.component';

export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'login', component: LoginComponent },
    {
      path: 'menu',
      component: MenuComponent,
      canActivate: [authGuard]
    },
    {
        path: 'menucontabilidad',
        component: MenuContabilidadComponent,
        canActivate: [authGuard],
        children: [
            {
              path: 'naturaleza-cuentas',
              component: NaturalezaDeCuentasComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
                path: 'naturaleza-cuentas1',
                component: NaturalezaDeCuentasComponent,
                canDeactivate: [canDeactivateGuard],
                resolve: {
                    naturalezaCuentas: NaturalezaCuentaResolverService
                }
            },
            {
              path: 'plan-cuentas',
              component: PlanArbolComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'plan-grid',
              component: PlanGridComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'centro-costos/arbol',
              component: CentroArbolComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'centro-costos/grid',
              component: CentroGridComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'tipos-asientos/general',
              component: TipoAsientoGeneralGridComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'tipos-asientos/sistema',
              component: TipoAsientoSistemaGridComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'plantillas/general',
              component: PlantillaGeneralComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'plantillas/sistema',
              component: PlantillaSistemaComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'periodo-contable',
              component: PeriodoContableComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'periodos',
              component: PeriodosComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'asientos',
              component: AsientosComponent,
              canDeactivate: [canDeactivateGuard]
            },
            {
              path: 'mayorizacion-proceso',
              component: MayorizacionProcesoComponent,
              canDeactivate: [canDeactivateGuard]
            },
            // Puedes agregar más rutas hijas aquí
        ]
    },
    {
      path: 'menutesoreria',
      component: MenutesoreriaComponent,
      canActivate: [authGuard]
    },
    {
      path: 'menucuentasxcobrar',
      component: MenucuentasxcobrarComponent,
      canActivate: [authGuard]
    },
    {
      path: 'menucuentaxpagar',
      component: MenucuentaxpagarComponent,
      canActivate: [authGuard]
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
        {
          path: 'entidad-edit',
          component: EntidadEditComponent,
          canDeactivate: [canDeactivateGuard],
          resolve: { data: entidadEditResolver }
        },
        { path: 'entidad-consulta', component: EntidadConsultaComponent },
        {
          path: 'carga-aportes',
          component: CargaAportesComponent,
          canDeactivate: [canDeactivateGuard]
        },
        {
          path: 'consulta-archivos-petro',
          component: ConsultaArchivosPetroComponent,
          resolve: { cargas: ConsultaCargaArchivoResolverService }
        },
        {
          path: 'detalle-consulta-carga/:id',
          component: DetalleConsultaCargaComponent
        },
        { path: 'entidad-participe-info', component: EntidadParticipeInfoComponent },
        {
          path: 'estadosCrd',
          component: EstadosCrdComponent,
          canDeactivate: [canDeactivateGuard],
          resolve: { estados: EstadosResolverService }
        },
        {
          path: 'tiposCrd',
          component: TiposCrdComponent,
          canDeactivate: [canDeactivateGuard],
          resolve: { tipos: TiposCrdResolverService }
        },
        {
          path: 'listadosCrd',
          component: ListadosCrdComponent,
          canDeactivate: [canDeactivateGuard],
          resolve: { listados: ListadosCrdResolverService }
        },
        // Rutas de Contratos
        {
          path: 'contrato-dash',
          component: ContratoDashComponent,
          canActivate: [authGuard]
        },
        {
          path: 'aportes-dash/:codigoEntidad',
          component: AportesDashComponent,
          canActivate: [authGuard]
        },
        {
          path: 'contrato-consulta',
          component: ContratoConsultaComponent,
          canActivate: [authGuard]
        },
        {
          path: 'contrato-edit',
          component: ContratoEditComponent,
          canActivate: [authGuard],
          canDeactivate: [canDeactivateGuard]
        },
        {
          path: 'contrato-edit/:id',
          component: ContratoEditComponent,
          canActivate: [authGuard],
          canDeactivate: [canDeactivateGuard]
        },
      ]
    },
    { path: '**', redirectTo: '' }
];
