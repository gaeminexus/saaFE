import { Routes } from '@angular/router';
import { LoginComponent } from './modules/dash/forms/login/login.component';
import { MenuComponent } from './modules/dash/menu/menu.component';
import { MenuContabilidadComponent } from './modules/cnt/menu/menucontabilidad/menucontabilidad.component';
import { MenutesoreriaComponent } from './modules/tsr/menu/menutesoreria/menutesoreria.component';
import { MenucuentasxcobrarComponent } from './modules/cxc/menu/menucuentasxcobrar/menucuentasxcobrar.component';
import { MenucuentaxpagarComponent } from './modules/cxp/menu/menucuentasxpagar/menucuentasxpagar.component';
import { NaturalezaDeCuentasComponent } from './modules/cnt/forms/naturalezadecuentas/naturalezadecuentas.component';
import { NaturalezaCuentaComponent } from './modules/cnt/forms/naturaleza-cuenta/naturaleza-cuenta.component';
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
import { ParametrizacionCreditosComponent } from './modules/crd/menucreditos/parametrizacion-creditos.component';
// Reemplazamos placeholder EXTR por componente grid paginado
import { ExtersComponent } from './modules/crd/forms/exters/exters.component';
import { EntidadCreditosComponent } from './modules/crd/menucreditos/entidad-creditos.component';
import { NavegacionCascadaComponent } from './modules/crd/forms/entidadParticipe/navegacion-cascada/navegacion-cascada.component';
import { ParticipeDashComponent } from './modules/crd/forms/entidadParticipe/participe-dash/participe-dash.component';
import { ParticipeInfoComponent } from './modules/crd/forms/entidadParticipe/participe-info/participe-info.component';
import { CargaAportesComponent } from './modules/crd/forms/carga-aportes/carga-aportes.component';
import { EstadosCrdComponent } from './modules/crd/forms/parametrizacion/estados-crd/estados-crd.component';
import { EstadosResolverService } from './modules/crd/resolver/estados-resolver.service';
import { TiposCrdComponent } from './modules/crd/forms/parametrizacion/tipos-crd/tipos-crd.component';
import { TiposCrdResolverService } from './modules/crd/resolver/tipos-crd-resolver.service';
import { ListadosCrdComponent } from './modules/crd/forms/parametrizacion/listados-crd/listados-crd.component';
import { ListadosCrdResolverService } from './modules/crd/resolver/listados-crd-resolver.service';
import { EntidadParticipeInfoComponent } from './modules/crd/forms/entidadParticipe/entidad-participe-info/entidad-participe-info.component';



export const routes: Routes = [
    { path: '', component: LoginComponent },
    { path: 'menu', component: MenuComponent },
    {
        path: 'menucontabilidad',
        component: MenuContabilidadComponent,
        children: [
            { path: 'naturaleza-cuentas', component: NaturalezaDeCuentasComponent },
            {
                path: 'naturaleza-cuentas1',
                component: NaturalezaCuentaComponent,
                resolve: {
                    naturalezaCuentas: NaturalezaCuentaResolverService
                }
            },
            { path: 'plan-cuentas', component: PlanArbolComponent },
            { path: 'plan-grid', component: PlanGridComponent },
            { path: 'centro-costos/arbol', component: CentroArbolComponent },
            { path: 'centro-costos/grid', component: CentroGridComponent },
            { path: 'tipos-asientos/general', component: TipoAsientoGeneralGridComponent },
            { path: 'tipos-asientos/sistema', component: TipoAsientoSistemaGridComponent },
            { path: 'plantillas/general', component: PlantillaGeneralComponent },
            { path: 'plantillas/sistema', component: PlantillaSistemaComponent },
            { path: 'periodo-contable', component: PeriodoContableComponent },
            { path: 'periodos', component: PeriodosComponent },
            { path: 'asientos', component: AsientosComponent },
            { path: 'mayorizacion-proceso', component: MayorizacionProcesoComponent },
            // Puedes agregar más rutas hijas aquí
        ]
    },
    { path: 'menutesoreria', component: MenutesoreriaComponent },
    { path: 'menucuentasxcobrar', component: MenucuentasxcobrarComponent },
    { path: 'menucuentaxpagar', component: MenucuentaxpagarComponent },
    { path: 'menucreditos', component: MenucreditosComponent,
      children: [
        { path: 'parametrizacion', component: ParametrizacionCreditosComponent },
        { path: 'extr', component: ExtersComponent },
        { path: 'entidad', component: EntidadCreditosComponent },
        { path: 'navegacion-cascada', component: NavegacionCascadaComponent },
        { path: 'participe-dash', component: ParticipeDashComponent },
        { path: 'participe-info', component: ParticipeInfoComponent },
        { path: 'carga-aportes', component: CargaAportesComponent },
        { path: 'entidad-participe-info', component: EntidadParticipeInfoComponent },
        { path: 'estadosCrd', component: EstadosCrdComponent, resolve: { estados: EstadosResolverService } },
        { path: 'tiposCrd', component: TiposCrdComponent, resolve: { tipos: TiposCrdResolverService } },
        { path: 'listadosCrd', component: ListadosCrdComponent, resolve: { listados: ListadosCrdResolverService } },
      ]
    },
    { path: '**', redirectTo: '' }
];
