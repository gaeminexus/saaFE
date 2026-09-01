import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { SideMenuCustomComponent } from '../../../../shared/basics/menu/forms/side-menu-custom/side-menu-custom.component';
import { NavItem } from '../../../../shared/basics/menu/model/nav-item';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { empresaSesionCodigo } from '../../../../shared/services/empresa-sesion';
import { PermisosRrh } from '../../model/permisos-rrh';
import { SaldoVacacionesService } from '../../service/saldo-vacaciones.service';

@Component({
  selector: 'app-menurecursoshumanos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, SideMenuCustomComponent, MatIconModule, MatTooltipModule, RouterLink],
  templateUrl: './menurecursoshumanos.component.html',
  styleUrls: ['./menurecursoshumanos.component.scss'],
})
export class MenurecursoshumanosComponent implements OnInit {
  titulo = 'Recursos Humanos';

  private saldoS = inject(SaldoVacacionesService);
  private appState = inject(AppStateService);

  /**
   * true cuando no existe ningún saldo de vacaciones del año en curso — el
   * proceso POST /sldv/acreditar no se corrió todavía. Sin este aviso el
   * hueco es invisible hasta que alguien intenta registrar unas vacaciones
   * y falla sin explicación (ver el incidente que motivó esta pantalla).
   */
  faltaAcreditarAnioActual = signal(false);
  anioActual = new Date().getFullYear();

  ngOnInit(): void {
    const idEmpresa = empresaSesionCodigo() ?? this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) return;

    // El banner es un aviso secundario del shell: si falla, no debe romper
    // la navegación de todo el módulo.
    this.saldoS.getAll().subscribe({
      next: (data) => {
        const saldos = data ?? [];
        const hayDelAnioActual = saldos.some(
          (s) => Number(s.anio) === this.anioActual && s.empleado?.empresa?.codigo === idEmpresa,
        );
        this.faltaAcreditarAnioActual.set(!hayDelAnioActual);
      },
      error: () => this.faltaAcreditarAnioActual.set(false),
    });
  }

  navItems: NavItem[] = [
    {
      displayName: 'Parametrización',
      iconName: 'tune',
      idPermiso: PermisosRrh.GRUPO_PARAMETRIZACION,
      children: [
        {
          displayName: 'Conceptos de nómina',
          iconName: 'rule',
          idPermiso: PermisosRrh.CONCEPTOS_NOMINA,
          route: '/menurecursoshumanos/parametrizacion/conceptos-nomina',
        },
        {
          displayName: 'Parámetros anuales',
          iconName: 'event_repeat',
          idPermiso: PermisosRrh.PARAMETROS_ANUALES,
          route: '/menurecursoshumanos/parametrizacion/parametros-anuales',
        },
        {
          displayName: 'Tabla de impuesto a la renta',
          iconName: 'account_balance',
          idPermiso: PermisosRrh.TABLA_IMPUESTO_RENTA,
          route: '/menurecursoshumanos/parametrizacion/tabla-impuesto-renta',
        },
        {
          displayName: 'Topes de gastos personales',
          iconName: 'savings',
          idPermiso: PermisosRrh.TOPES_GASTOS_PERSONALES,
          route: '/menurecursoshumanos/parametrizacion/topes-gastos-personales',
        },
        {
          displayName: 'Causales de terminación',
          iconName: 'gavel',
          idPermiso: PermisosRrh.CAUSALES_TERMINACION,
          route: '/menurecursoshumanos/parametrizacion/causales-terminacion',
        },
        {
          displayName: 'Configuración de nómina',
          iconName: 'settings_suggest',
          idPermiso: PermisosRrh.CONFIGURACION_NOMINA,
          route: '/menurecursoshumanos/parametrizacion/configuracion-nomina',
        },
        {
          displayName: 'Formatos de marcación',
          iconName: 'fingerprint',
          idPermiso: PermisosRrh.FORMATOS_MARCACION,
          route: '/menurecursoshumanos/parametrizacion/formatos-marcacion',
        },
        {
          displayName: 'Formatos del archivo bancario',
          iconName: 'account_balance',
          idPermiso: PermisosRrh.FORMATOS_ARCHIVO_BANCARIO,
          route: '/menurecursoshumanos/parametrizacion/formatos-archivo-bancario',
        },
        {
          displayName: 'Departamentos',
          iconName: 'account_tree',
          idPermiso: PermisosRrh.DEPARTAMENTOS,
          route: '/menurecursoshumanos/parametrizacion/departamentos',
        },
        {
          displayName: 'Cargos y puestos',
          iconName: 'badge',
          idPermiso: PermisosRrh.CARGOS,
          route: '/menurecursoshumanos/parametrizacion/cargos',
        },
        {
          displayName: 'Departamento — Cargo',
          iconName: 'hub',
          idPermiso: PermisosRrh.DEPARTAMENTO_CARGO,
          route: '/menurecursoshumanos/parametrizacion/departamento-cargo',
        },
        {
          displayName: 'Tipos de contrato',
          iconName: 'description',
          idPermiso: PermisosRrh.TIPOS_CONTRATO,
          route: '/menurecursoshumanos/parametrizacion/tipos-contrato',
        },
        {
          displayName: 'Turnos y horarios',
          iconName: 'schedule',
          idPermiso: PermisosRrh.TURNOS,
          route: '/menurecursoshumanos/parametrizacion/turnos',
        },
      ],
    },
    {
      displayName: 'Personal',
      iconName: 'group',
      idPermiso: PermisosRrh.GRUPO_PERSONAL,
      children: [
        {
          displayName: 'Colaboradores',
          iconName: 'groups',
          idPermiso: PermisosRrh.COLABORADORES,
          route: '/menurecursoshumanos/personal/colaboradores',
        },
        {
          displayName: 'Vacaciones',
          iconName: 'beach_access',
          idPermiso: PermisosRrh.VACACIONES,
          route: '/menurecursoshumanos/gestion/vacaciones',
        },
        {
          displayName: 'Permisos y licencias',
          iconName: 'event_note',
          idPermiso: PermisosRrh.PERMISOS_LICENCIAS,
          route: '/menurecursoshumanos/gestion/permisos-licencias',
        },
      ],
    },
    {
      displayName: 'Asistencia',
      iconName: 'access_time',
      idPermiso: PermisosRrh.GRUPO_ASISTENCIA,
      children: [
        {
          displayName: 'Marcaciones',
          iconName: 'schedule',
          idPermiso: PermisosRrh.MARCACIONES,
          route: '/menurecursoshumanos/asistencia/marcaciones',
        },
        {
          displayName: 'Importación de marcaciones',
          iconName: 'upload_file',
          idPermiso: PermisosRrh.IMPORTACION_MARCACIONES,
          route: '/menurecursoshumanos/asistencia/importacion',
        },
        {
          displayName: 'Resumen diario',
          iconName: 'today',
          idPermiso: PermisosRrh.RESUMEN_DIARIO,
          route: '/menurecursoshumanos/asistencia/resumen-diario',
        },
        {
          displayName: 'Horas extra',
          iconName: 'more_time',
          idPermiso: PermisosRrh.HORAS_EXTRA,
          route: '/menurecursoshumanos/procesos/horas-extra',
        },
      ],
    },
    {
      displayName: 'Migración de apertura',
      iconName: 'upload_file',
      idPermiso: PermisosRrh.GRUPO_MIGRACION,
      children: [
        {
          displayName: 'Saldos de apertura',
          iconName: 'playlist_add_check',
          idPermiso: PermisosRrh.SALDOS_APERTURA,
          route: '/menurecursoshumanos/migracion/saldos-apertura',
        },
        {
          displayName: 'Acumulados',
          iconName: 'summarize',
          idPermiso: PermisosRrh.ACUMULADOS,
          route: '/menurecursoshumanos/migracion/acumulados',
        },
      ],
    },
    {
      displayName: 'Procesos',
      iconName: 'sync_alt',
      idPermiso: PermisosRrh.GRUPO_PROCESOS,
      children: [
        {
          displayName: 'Períodos de nómina',
          iconName: 'event_note',
          idPermiso: PermisosRrh.PERIODOS_NOMINA,
          route: '/menurecursoshumanos/procesos/periodos-nomina',
        },
        {
          displayName: 'Novedades del período',
          iconName: 'playlist_add',
          idPermiso: PermisosRrh.NOVEDADES_NOMINA,
          route: '/menurecursoshumanos/procesos/novedades-nomina',
        },
        {
          displayName: 'Novedades del mes (IESS)',
          iconName: 'assignment_late',
          idPermiso: PermisosRrh.NOVEDADES_IESS,
          route: '/menurecursoshumanos/procesos/novedades-iess',
        },
        {
          displayName: 'Horas extra',
          iconName: 'more_time',
          idPermiso: PermisosRrh.HORAS_EXTRA,
          route: '/menurecursoshumanos/procesos/horas-extra',
        },
        {
          displayName: 'Proyección de impuesto a la renta',
          iconName: 'account_balance',
          idPermiso: PermisosRrh.PROYECCION_IR,
          route: '/menurecursoshumanos/procesos/proyeccion-ir',
        },
        {
          displayName: 'Descuentos recurrentes',
          iconName: 'credit_score',
          idPermiso: PermisosRrh.DESCUENTOS_RECURRENTES,
          route: '/menurecursoshumanos/procesos/descuentos-recurrentes',
        },
        {
          displayName: 'Roles de pago',
          iconName: 'paid',
          idPermiso: PermisosRrh.ROLES_PAGO,
          route: '/menurecursoshumanos/procesos/roles-pago',
        },
        {
          displayName: 'Órdenes de pago',
          iconName: 'payments',
          idPermiso: PermisosRrh.ORDENES_PAGO,
          route: '/menurecursoshumanos/procesos/ordenes-pago',
        },
        {
          displayName: 'Pago de beneficios sociales',
          iconName: 'volunteer_activism',
          idPermiso: PermisosRrh.PAGO_BENEFICIOS_SOCIALES,
          route: '/menurecursoshumanos/procesos/pago-beneficios-sociales',
        },
        {
          displayName: 'Reportes de nómina',
          iconName: 'summarize',
          idPermiso: PermisosRrh.REPORTES_NOMINA,
          route: '/menurecursoshumanos/procesos/reportes-nomina',
        },
        // RETIRADA DEL MENU EL 2026-08-26, por decisión de Mike, hasta nueva orden.
        //
        // No es una pantalla rota: es un andamio que nunca se terminó. Sus dos
        // `TODO` lo dicen —«cargar catálogo de tipos para filtro y formulario» y
        // «construir criterios y consumir AporteRetencionesService.selectByCriteria»—,
        // así que los combos salen vacíos y el filtro no consulta nada.
        //
        // Y por debajo no hay contra qué consultar: NO EXISTE NINGUNA ENTIDAD
        // AporteRetencion EN EL BACKEND. Ni tabla, ni servicio, ni endpoint.
        //
        // Su modelo está copiado de otra pantalla sin limpiar —los comentarios de
        // `aportes-retenciones.ts` hablan de adjuntos, referencias bancarias y
        // partícipes—, pero los nombres de campo que sí son suyos, `fechaAnexo`,
        // `nuevoSalario` y `nuevaFechaFin`, apuntan a ANEXOS DE CONTRATO: cambios
        // de sueldo o de fecha de fin. Que es justo lo que hoy se hace a mano con
        // `sql/48` y `sql/49`, y lo que la CORRECCIÓN 11 —historia de vigencias del
        // contrato— resuelve de raíz.
        //
        // Por eso se RETIRA y no se borra: si esa lectura es correcta, esto no es
        // una pantalla huérfana sino la mitad de pantalla de la corrección 11.
        // El componente, el modelo, el servicio y la ruta se quedan donde están.
        // Volver a colgarla del menú es descomentar este bloque.
        //
        // {
        //   displayName: 'Aportes y retenciones',
        //   iconName: 'account_balance_wallet',
        //   idPermiso: PermisosRrh.APORTES_RETENCIONES,
        //   route: '/menurecursoshumanos/procesos/aportes',
        // },
        {
          displayName: 'Liquidación',
          iconName: 'assignment_turned_in',
          idPermiso: PermisosRrh.LIQUIDACION,
          route: '/menurecursoshumanos/procesos/liquidacion',
        },
        {
          displayName: 'Salidas oficiales',
          iconName: 'assured_workload',
          idPermiso: PermisosRrh.SALIDAS_OFICIALES,
          route: '/menurecursoshumanos/procesos/salidas-oficiales',
        },
        {
          displayName: 'Reparto de utilidades',
          iconName: 'pie_chart',
          idPermiso: PermisosRrh.UTILIDADES,
          route: '/menurecursoshumanos/procesos/utilidades',
        },
        {
          displayName: 'Anticipos a trabajadores',
          iconName: 'request_quote',
          idPermiso: PermisosRrh.ANTICIPOS_TRABAJADORES,
          route: '/menurecursoshumanos/procesos/anticipos',
        },
        {
          displayName: 'Acreditar vacaciones',
          iconName: 'event_available',
          idPermiso: PermisosRrh.ACREDITAR_VACACIONES,
          route: '/menurecursoshumanos/procesos/acreditar-vacaciones',
        },
      ],
    },
    {
      displayName: 'Regresar',
      iconName: 'arrow_back',
      route: '/menu',
    },
  ];
}
