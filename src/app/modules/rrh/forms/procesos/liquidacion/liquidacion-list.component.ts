import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  signal,
  ViewChild,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
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
  readonly filtroFechaSalidaDesdeControl = new UntypedFormControl(null);
  readonly filtroFechaSalidaHastaControl = new UntypedFormControl(null);
  readonly filtroMotivo = signal<number | null>(null);
  readonly filtroEstado = signal<String | null>(null);
  readonly filtroUsuarioRegistro = signal<string>('');

  readonly empleadosDisponibles = signal<Empleado[]>([]);
  readonly contratosDisponibles = signal<ContratoEmpleado[]>([]);
  readonly motivosDisponibles = signal<Array<{ codigo: number; etiqueta: string }>>([]);
  readonly estadosDisponibles = signal<String[]>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  @ViewChild('fechaSalidaDesdeInput', { read: ElementRef }) fechaSalidaDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaSalidaHastaInput', { read: ElementRef }) fechaSalidaHastaInputRef!: ElementRef<HTMLInputElement>;

  private _rawFechaSalidaDesde = '';
  private _rawFechaSalidaHasta = '';

  constructor(
    private dialog: MatDialog,
    private funcionesDatosS: FuncionesDatosService,
  ) {
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
    this.filtroFechaSalidaDesdeControl.setValue(null, { emitEvent: false });
    this.filtroFechaSalidaHastaControl.setValue(null, { emitEvent: false });
    setTimeout(() => {
      if (this.fechaSalidaDesdeInputRef?.nativeElement) this.fechaSalidaDesdeInputRef.nativeElement.value = '';
      if (this.fechaSalidaHastaInputRef?.nativeElement) this.fechaSalidaHastaInputRef.nativeElement.value = '';
    });
    this.filtroMotivo.set(null);
    this.filtroEstado.set(null);
    this.filtroUsuarioRegistro.set('');
    this.registroSeleccionado.set(null);
  }

  capturarFechaSalidaDesdeRaw(event: Event): void {
    this._rawFechaSalidaDesde = (event.target as HTMLInputElement).value;
  }

  syncFechaSalidaDesdeFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaSalidaDesde || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaSalidaDesde = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.filtroFechaSalidaDesdeControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaSalidaDesdeInputRef?.nativeElement) this.fechaSalidaDesdeInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaSalidaDesdePickerChange(date: Date | null | undefined): void {
    this.filtroFechaSalidaDesdeControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaSalidaDesdeInputRef?.nativeElement) this.fechaSalidaDesdeInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaSalidaHastaRaw(event: Event): void {
    this._rawFechaSalidaHasta = (event.target as HTMLInputElement).value;
  }

  syncFechaSalidaHastaFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaSalidaHasta || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaSalidaHasta = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.filtroFechaSalidaHastaControl.setValue(date, { emitEvent: false });
        setTimeout(() => {
          if (this.fechaSalidaHastaInputRef?.nativeElement) this.fechaSalidaHastaInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaSalidaHastaPickerChange(date: Date | null | undefined): void {
    this.filtroFechaSalidaHastaControl.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaSalidaHastaInputRef?.nativeElement) this.fechaSalidaHastaInputRef.nativeElement.value = formatted;
    });
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
