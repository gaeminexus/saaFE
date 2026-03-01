import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  signal,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AporteRetenciones } from '../../../model/aportes-retenciones';
import { ContratoEmpleado } from '../../../model/contrato-empleado';
import {
  AporteRetencionFormComponent,
  AporteRetencionFormData,
} from './aporte-retencion-form.component';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-aporte-retencion-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './aporte-retencion-list.component.html',
  styleUrls: ['./aporte-retencion-list.component.scss'],
})
export class AporteRetencionListComponent implements AfterViewInit {
  readonly titulo = signal<string>('Aportes / Retenciones');
  readonly mostrarFiltros = signal<boolean>(true);
  readonly loading = signal<boolean>(false);
  readonly registroSeleccionado = signal<AporteRetenciones | null>(null);

  readonly displayedColumns: string[] = [
    'codigo',
    'contratoEmpleado',
    'tipo',
    'fechaAnexo',
    'detalle',
    'nuevoSalario',
    'nuevaFechaFin',
    'fechaRegistro',
    'usuarioRegistro',
    'acciones',
  ];

  readonly dataSource = new MatTableDataSource<AporteRetenciones>([]);
  readonly totalRegistros = computed(() => this.dataSource.data.length);

  readonly contratoBusqueda = signal<string>('');
  readonly filtroContratoEmpleado = signal<ContratoEmpleado | null>(null);
  readonly filtroTipo = signal<String | null>(null);
  readonly filtroFechaAnexoDesde = signal<string>('');
  readonly filtroFechaAnexoHasta = signal<string>('');
  readonly filtroNuevaFechaFinDesde = signal<string>('');
  readonly filtroNuevaFechaFinHasta = signal<string>('');
  readonly filtroUsuarioRegistro = signal<string>('');

  readonly contratosDisponibles = signal<ContratoEmpleado[]>([]);
  readonly tiposDisponibles = signal<String[]>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private dialog: MatDialog) {
    // TODO RRHH: cargar catálogo de contratos para selector/autocomplete.
    // TODO RRHH: cargar catálogo de tipos para filtro y formulario.
    // TODO RRHH: cargar listado inicial con selectByCriteria cuando se defina criterio por defecto.
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  toggleFiltros(): void {
    this.mostrarFiltros.update((visible) => !visible);
  }

  abrirNuevo(): void {
    this.abrirFormulario('create');
  }

  abrirVer(item: AporteRetenciones): void {
    this.registroSeleccionado.set(item);
    this.abrirFormulario('view', item);
  }

  abrirEditar(item: AporteRetenciones): void {
    this.registroSeleccionado.set(item);
    this.abrirFormulario('edit', item);
  }

  inactivarAnular(item: AporteRetenciones): void {
    this.registroSeleccionado.set(item);
  }

  aplicarFiltros(): void {
    // TODO RRHH: construir criterios y consumir AporteRetencionesService.selectByCriteria(...).
  }

  limpiarFiltros(): void {
    this.contratoBusqueda.set('');
    this.filtroContratoEmpleado.set(null);
    this.filtroTipo.set(null);
    this.filtroFechaAnexoDesde.set('');
    this.filtroFechaAnexoHasta.set('');
    this.filtroNuevaFechaFinDesde.set('');
    this.filtroNuevaFechaFinHasta.set('');
    this.filtroUsuarioRegistro.set('');
    this.registroSeleccionado.set(null);
  }

  contratoVisible(item: AporteRetenciones): string {
    const contrato = item?.contratoEmpleado as unknown as Record<string, unknown> | undefined;
    if (!contrato) {
      return '-';
    }

    const numero = contrato['numero'];
    if (numero !== undefined && numero !== null && String(numero).trim() !== '') {
      return String(numero);
    }

    const codigo = contrato['codigo'];
    if (codigo !== undefined && codigo !== null) {
      return String(codigo);
    }

    const empleado = contrato['empleado'] as Record<string, unknown> | undefined;
    const identificacion = empleado?.['identificacion'];
    if (identificacion !== undefined && identificacion !== null) {
      return String(identificacion);
    }

    return '-';
  }

  seleccionContratoLabel(value: ContratoEmpleado | null): string {
    if (!value) {
      return '';
    }

    const contrato = value as unknown as Record<string, unknown>;
    return String(contrato['numero'] ?? contrato['codigo'] ?? '');
  }

  trackByCodigo(_: number, item: AporteRetenciones): number {
    return item.codigo;
  }

  private abrirFormulario(mode: FormMode, item?: AporteRetenciones): void {
    const data: AporteRetencionFormData = {
      mode,
      item,
    };

    this.dialog.open(AporteRetencionFormComponent, {
      width: '900px',
      maxWidth: '95vw',
      data,
      disableClose: mode === 'view',
    });
  }
}
