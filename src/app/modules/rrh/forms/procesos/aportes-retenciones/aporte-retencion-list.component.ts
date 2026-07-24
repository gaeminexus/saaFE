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
import { AbstractControl, UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
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
  readonly filtroFechaAnexoDesdeControl = new UntypedFormControl(null);
  readonly filtroFechaAnexoHastaControl = new UntypedFormControl(null);
  readonly filtroNuevaFechaFinDesdeControl = new UntypedFormControl(null);
  readonly filtroNuevaFechaFinHastaControl = new UntypedFormControl(null);
  readonly filtroUsuarioRegistro = signal<string>('');

  readonly contratosDisponibles = signal<ContratoEmpleado[]>([]);
  readonly tiposDisponibles = signal<String[]>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  @ViewChild('fechaAnexoDesdeInput', { read: ElementRef }) fechaAnexoDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaAnexoHastaInput', { read: ElementRef }) fechaAnexoHastaInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('nuevaFechaFinDesdeInput', { read: ElementRef }) nuevaFechaFinDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('nuevaFechaFinHastaInput', { read: ElementRef }) nuevaFechaFinHastaInputRef!: ElementRef<HTMLInputElement>;

  private _rawFechaAnexoDesde = '';
  private _rawFechaAnexoHasta = '';
  private _rawNuevaFechaFinDesde = '';
  private _rawNuevaFechaFinHasta = '';

  constructor(
    private dialog: MatDialog,
    private funcionesDatosS: FuncionesDatosService,
  ) {
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
    this.filtroFechaAnexoDesdeControl.setValue(null, { emitEvent: false });
    this.filtroFechaAnexoHastaControl.setValue(null, { emitEvent: false });
    this.filtroNuevaFechaFinDesdeControl.setValue(null, { emitEvent: false });
    this.filtroNuevaFechaFinHastaControl.setValue(null, { emitEvent: false });
    setTimeout(() => {
      if (this.fechaAnexoDesdeInputRef?.nativeElement) this.fechaAnexoDesdeInputRef.nativeElement.value = '';
      if (this.fechaAnexoHastaInputRef?.nativeElement) this.fechaAnexoHastaInputRef.nativeElement.value = '';
      if (this.nuevaFechaFinDesdeInputRef?.nativeElement) this.nuevaFechaFinDesdeInputRef.nativeElement.value = '';
      if (this.nuevaFechaFinHastaInputRef?.nativeElement) this.nuevaFechaFinHastaInputRef.nativeElement.value = '';
    });
    this.filtroUsuarioRegistro.set('');
    this.registroSeleccionado.set(null);
  }

  private crearHandlersFecha(
    getControl: () => AbstractControl | null,
    getRawHolder: () => string,
    setRawHolder: (v: string) => void,
    getInputRef: () => ElementRef<HTMLInputElement> | undefined,
  ) {
    const forzarTexto = (date: Date | null) => {
      const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
      setTimeout(() => {
        const ref = getInputRef();
        if (ref?.nativeElement) ref.nativeElement.value = formatted;
      });
    };
    return {
      capturar: (event: Event) => setRawHolder((event.target as HTMLInputElement).value),
      sync: (event: FocusEvent) => {
        const rawValue = (getRawHolder() || (event.target as HTMLInputElement)?.value || '').trim();
        setRawHolder('');
        if (!rawValue) return;
        const parts = rawValue.split('/');
        if (parts.length !== 3) return;
        const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
        if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
          const date = new Date(anio, mes, dia);
          if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
            getControl()?.setValue(date, { emitEvent: false });
            forzarTexto(date);
          }
        }
      },
      onPickerChange: (date: Date | null | undefined) => {
        const d = date || null;
        getControl()?.setValue(d, { emitEvent: false });
        forzarTexto(d);
      },
    };
  }

  private hFechaAnexoDesde = this.crearHandlersFecha(
    () => this.filtroFechaAnexoDesdeControl,
    () => this._rawFechaAnexoDesde,
    (v) => (this._rawFechaAnexoDesde = v),
    () => this.fechaAnexoDesdeInputRef,
  );
  capturarFechaAnexoDesdeRaw(event: Event): void { this.hFechaAnexoDesde.capturar(event); }
  syncFechaAnexoDesdeFromRaw(event: FocusEvent): void { this.hFechaAnexoDesde.sync(event); }
  onFechaAnexoDesdePickerChange(date: Date | null | undefined): void { this.hFechaAnexoDesde.onPickerChange(date); }

  private hFechaAnexoHasta = this.crearHandlersFecha(
    () => this.filtroFechaAnexoHastaControl,
    () => this._rawFechaAnexoHasta,
    (v) => (this._rawFechaAnexoHasta = v),
    () => this.fechaAnexoHastaInputRef,
  );
  capturarFechaAnexoHastaRaw(event: Event): void { this.hFechaAnexoHasta.capturar(event); }
  syncFechaAnexoHastaFromRaw(event: FocusEvent): void { this.hFechaAnexoHasta.sync(event); }
  onFechaAnexoHastaPickerChange(date: Date | null | undefined): void { this.hFechaAnexoHasta.onPickerChange(date); }

  private hNuevaFechaFinDesde = this.crearHandlersFecha(
    () => this.filtroNuevaFechaFinDesdeControl,
    () => this._rawNuevaFechaFinDesde,
    (v) => (this._rawNuevaFechaFinDesde = v),
    () => this.nuevaFechaFinDesdeInputRef,
  );
  capturarNuevaFechaFinDesdeRaw(event: Event): void { this.hNuevaFechaFinDesde.capturar(event); }
  syncNuevaFechaFinDesdeFromRaw(event: FocusEvent): void { this.hNuevaFechaFinDesde.sync(event); }
  onNuevaFechaFinDesdePickerChange(date: Date | null | undefined): void { this.hNuevaFechaFinDesde.onPickerChange(date); }

  private hNuevaFechaFinHasta = this.crearHandlersFecha(
    () => this.filtroNuevaFechaFinHastaControl,
    () => this._rawNuevaFechaFinHasta,
    (v) => (this._rawNuevaFechaFinHasta = v),
    () => this.nuevaFechaFinHastaInputRef,
  );
  capturarNuevaFechaFinHastaRaw(event: Event): void { this.hNuevaFechaFinHasta.capturar(event); }
  syncNuevaFechaFinHastaFromRaw(event: FocusEvent): void { this.hNuevaFechaFinHasta.sync(event); }
  onNuevaFechaFinHastaPickerChange(date: Date | null | undefined): void { this.hNuevaFechaFinHasta.onPickerChange(date); }

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
