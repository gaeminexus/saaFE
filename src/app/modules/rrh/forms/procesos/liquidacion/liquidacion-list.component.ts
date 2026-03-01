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
import { ContratoEmpleado } from '../../../model/contrato-empleado';
import { Empleado } from '../../../model/empleado';
import { Liquidacion } from '../../../model/Liquidacion';
import { LiquidacionFormComponent, LiquidacionFormData } from './liquidacion-form.component';

type FormMode = 'create' | 'edit' | 'view';

@Component({
  selector: 'app-liquidacion-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './liquidacion-list.component.html',
  styleUrls: ['./liquidacion-list.component.scss'],
})
export class LiquidacionListComponent implements AfterViewInit {
  readonly titulo = signal<string>('Liquidación');
  readonly mostrarFiltros = signal<boolean>(true);
  readonly loading = signal<boolean>(false);
  readonly registroSeleccionado = signal<Liquidacion | null>(null);

  readonly displayedColumns: string[] = [
    'codigo',
    'empleado',
    'contratoEmpleado',
    'fechaSalida',
    'motivo',
    'neto',
    'estado',
    'fechaRegistro',
    'usuarioRegistro',
    'acciones',
  ];

  readonly dataSource = new MatTableDataSource<Liquidacion>([]);
  readonly totalRegistros = computed(() => this.dataSource.data.length);

  readonly busquedaEmpleado = signal<string>('');
  readonly busquedaContratoEmpleado = signal<string>('');

  readonly filtroEmpleado = signal<Empleado | null>(null);
  readonly filtroContratoEmpleado = signal<ContratoEmpleado | null>(null);
  readonly filtroFechaSalidaDesde = signal<string>('');
  readonly filtroFechaSalidaHasta = signal<string>('');
  readonly filtroMotivo = signal<number | null>(null);
  readonly filtroEstado = signal<String | null>(null);
  readonly filtroUsuarioRegistro = signal<string>('');

  readonly empleadosDisponibles = signal<Empleado[]>([]);
  readonly contratosDisponibles = signal<ContratoEmpleado[]>([]);
  readonly motivosDisponibles = signal<Array<{ codigo: number; etiqueta: string }>>([]);
  readonly estadosDisponibles = signal<String[]>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private dialog: MatDialog) {
    // TODO RRHH: cargar catálogos de Empleado, ContratoEmpleado, Motivo y Estado.
    // TODO RRHH: implementar búsqueda principal con LiquidacionService.selectByCriteria(...).
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  toggleFiltros(): void {
    this.mostrarFiltros.update((visible) => !visible);
  }

  abrirNuevaLiquidacion(): void {
    this.abrirFormulario('create');
  }

  ver(item: Liquidacion): void {
    this.registroSeleccionado.set(item);
    this.abrirFormulario('view', item);
  }

  editar(item: Liquidacion): void {
    this.registroSeleccionado.set(item);
    this.abrirFormulario('edit', item);
  }

  inactivarAnular(item: Liquidacion): void {
    this.registroSeleccionado.set(item);
  }

  aplicarFiltros(): void {
    // TODO RRHH: mapear filtros a criterios y consumir selectByCriteria.
  }

  limpiarFiltros(): void {
    this.busquedaEmpleado.set('');
    this.busquedaContratoEmpleado.set('');
    this.filtroEmpleado.set(null);
    this.filtroContratoEmpleado.set(null);
    this.filtroFechaSalidaDesde.set('');
    this.filtroFechaSalidaHasta.set('');
    this.filtroMotivo.set(null);
    this.filtroEstado.set(null);
    this.filtroUsuarioRegistro.set('');
    this.registroSeleccionado.set(null);
  }

  empleadoLabel(value: Empleado | null): string {
    if (!value) {
      return '';
    }

    const nombres = `${value.apellidos ?? ''} ${value.nombres ?? ''}`.replace(/\s+/g, ' ').trim();
    const identificacion = value.identificacion ? String(value.identificacion) : '';
    return `${identificacion} ${nombres}`.trim();
  }

  contratoLabel(value: ContratoEmpleado | null): string {
    if (!value) {
      return '';
    }

    const contrato = value as unknown as Record<string, unknown>;
    return String(contrato['numero'] ?? contrato['codigo'] ?? '');
  }

  motivoLabel(motivo: number): string {
    const encontrado = this.motivosDisponibles().find((item) => item.codigo === motivo);
    return encontrado?.etiqueta ?? String(motivo ?? '');
  }

  estadoCssClass(estado: String | null | undefined): string {
    const valor = String(estado ?? '').toUpperCase();
    return valor === 'ACTIVO' ? 'estado-activo' : 'estado-inactivo';
  }

  trackByCodigo(_: number, item: Liquidacion): number {
    return item.codigo;
  }

  private abrirFormulario(mode: FormMode, item?: Liquidacion): void {
    const data: LiquidacionFormData = {
      mode,
      item,
    };

    this.dialog.open(LiquidacionFormComponent, {
      width: '920px',
      maxWidth: '95vw',
      data,
      disableClose: mode === 'view',
    });
  }
}
