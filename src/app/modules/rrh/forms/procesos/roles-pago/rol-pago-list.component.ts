import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Nomina } from '../../../model/nomina';
import { RolPago } from '../../../model/rolPago';

type FormMode = 'create' | 'edit' | 'view';
type EstadoRolPago = 'GENERADO' | 'EMITIDO' | 'ENTREGADO' | 'ANULADO';

@Component({
  selector: 'app-rol-pago-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './rol-pago-list.component.html',
  styleUrls: ['./rol-pago-list.component.scss'],
})
export class RolPagoListComponent implements OnInit, AfterViewInit {
  titulo = signal<string>('Roles de Pago');
  columns = signal<string[]>([
    'codigo',
    'nomina',
    'numero',
    'fechaEmision',
    'rutaPdf',
    'estado',
    'fechaRegistro',
    'usuarioRegistro',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  filtrosVisibles = signal<boolean>(true);
  formOpen = signal<boolean>(false);
  formMode = signal<FormMode>('create');
  selectedRol = signal<RolPago | null>(null);

  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  totalItems = signal<number>(0);

  readonlyMode = computed(() => this.formMode() === 'view');
  saveEnabled = computed(() => this.formMode() !== 'view');

  estadosRolPago: EstadoRolPago[] = ['GENERADO', 'EMITIDO', 'ENTREGADO', 'ANULADO'];
  nominas = signal<Nomina[]>([]);

  dataSource = new MatTableDataSource<RolPago>([]);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  @ViewChild('fechaEmisionInput', { read: ElementRef }) fechaEmisionInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaEmisionDesdeInput', { read: ElementRef }) fechaEmisionDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaEmisionHastaInput', { read: ElementRef }) fechaEmisionHastaInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaRegistroDesdeInput', { read: ElementRef }) fechaRegistroDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaRegistroHastaInput', { read: ElementRef }) fechaRegistroHastaInputRef!: ElementRef<HTMLInputElement>;

  private _rawFechaEmision = '';
  private _rawFechaEmisionDesde = '';
  private _rawFechaEmisionHasta = '';
  private _rawFechaRegistroDesde = '';
  private _rawFechaRegistroHasta = '';

  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private funcionesDatosS = inject(FuncionesDatosService);

  filtroForm = this.formBuilder.group({
    nomina: [null as Nomina | null],
    numero: ['' as string],
    estado: [null as EstadoRolPago | null],
    fechaEmisionDesde: [null as Date | null],
    fechaEmisionHasta: [null as Date | null],
    fechaRegistroDesde: [null as Date | null],
    fechaRegistroHasta: [null as Date | null],
  });

  rolPagoForm = this.formBuilder.group({
    codigo: [null as number | null],
    nomina: [null as Nomina | null, Validators.required],
    numero: ['', Validators.required],
    fechaEmision: [null as Date | null, Validators.required],
    rutaPdf: ['' as string],
    estado: [null as EstadoRolPago | null, Validators.required],
    fechaRegistro: [null as Date | null],
    usuarioRegistro: ['' as string],
  });

  ngOnInit(): void {
    this.setupReadOnlyFields();
    this.dataSource.data = [];
    this.totalItems.set(0);

    // TODO: Cargar combo de nominas con servicios RRHH.
    // TODO: Implementar búsqueda/listado con rolPagoService.selectByCriteria(criterios).
  }

  ngAfterViewInit(): void {
    if (this.paginator) this.dataSource.paginator = this.paginator;
    if (this.sort) this.dataSource.sort = this.sort;
  }

  onToolbarBuscar(): void {
    this.filtrosVisibles.update((visible) => !visible);
  }

  aplicarFiltros(): void {
    this.loading.set(true);

    // TODO: construir criterios para selectByCriteria desde filtroForm.
    this.dataSource.data = [];
    this.totalItems.set(this.dataSource.data.length);
    this.pageIndex.set(0);

    this.loading.set(false);
    this.showInfo('Aplicación de filtros disponible en fase funcional');
  }

  limpiarFiltros(): void {
    this.filtroForm.reset({
      nomina: null,
      numero: '',
      estado: null,
      fechaEmisionDesde: null,
      fechaEmisionHasta: null,
      fechaRegistroDesde: null,
      fechaRegistroHasta: null,
    });
    this.showInfo('Filtros limpiados');
  }

  onNuevoRol(): void {
    this.openForm('create');
  }

  onVer(row: RolPago): void {
    this.selectedRol.set(row);
    this.openForm('view', row);
  }

  onEditar(row: RolPago): void {
    this.selectedRol.set(row);
    this.openForm('edit', row);
  }

  onAnularInactivar(row: RolPago): void {
    this.selectedRol.set(row);
    this.showInfo('Anulación/Inactivación disponible en fase funcional');
  }

  onDescargarPdf(row: RolPago): void {
    this.selectedRol.set(row);
    this.showInfo('Descarga PDF disponible en fase funcional');
  }

  onVerPdf(row: RolPago): void {
    this.selectedRol.set(row);
    this.showInfo('Visualización PDF disponible en fase funcional');
  }

  onAdjuntarPdf(): void {
    this.showInfo('Adjuntar PDF disponible en fase funcional');
  }

  onGuardar(): void {
    this.rolPagoForm.markAllAsTouched();
    if (this.rolPagoForm.invalid || !this.saveEnabled()) return;

    this.showInfo('Guardado disponible en fase funcional');
    this.formOpen.set(false);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  onRowSelect(row: RolPago): void {
    this.selectedRol.set(row);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  nominaLabel(nomina: Nomina | null | undefined): string {
    if (!nomina) return '';
    const value = nomina as unknown as Record<string, unknown>;
    const label = value['descripcion'] ?? value['periodo'] ?? value['codigo'];
    return label ? String(label) : '';
  }

  estadoChipColor(estado: string | null | undefined): 'primary' | 'accent' | 'warn' | undefined {
    const normalized = (estado ?? '').toUpperCase();
    if (normalized === 'EMITIDO') return 'primary';
    if (normalized === 'ENTREGADO') return 'accent';
    if (normalized === 'ANULADO') return 'warn';
    return undefined;
  }

  hasRutaPdf(row: RolPago): boolean {
    const ruta = row?.rutaPdf;
    return Boolean(ruta && String(ruta).trim().length > 0);
  }

  drawerTitle(): string {
    if (this.formMode() === 'view') return 'Ver Rol de Pago';
    if (this.formMode() === 'edit') return 'Editar Rol de Pago';
    return 'Nuevo Rol de Pago';
  }

  selectedEstadoLabel(): string {
    const selected = this.selectedRol();
    return selected?.estado ? String(selected.estado) : '';
  }

  private openForm(mode: FormMode, row?: RolPago): void {
    this.formMode.set(mode);

    this.rolPagoForm.reset({
      codigo: row?.codigo ?? null,
      nomina: row?.nomina ?? null,
      numero: row?.numero ? String(row.numero) : '',
      fechaEmision: row?.fechaEmision ?? null,
      rutaPdf: row?.rutaPdf ? String(row.rutaPdf) : '',
      estado: (row?.estado as EstadoRolPago) ?? null,
      fechaRegistro: row?.fechaRegistro ?? null,
      usuarioRegistro: row?.usuarioRegistro ? String(row.usuarioRegistro) : '',
    });

    this.setupReadOnlyFields();
    this.formOpen.set(true);
  }

  private setupReadOnlyFields(): void {
    this.rolPagoForm.enable({ emitEvent: false });

    this.rolPagoForm.controls.rutaPdf.disable({ emitEvent: false });
    this.rolPagoForm.controls.fechaRegistro.disable({ emitEvent: false });
    this.rolPagoForm.controls.usuarioRegistro.disable({ emitEvent: false });

    if (this.formMode() === 'view') {
      this.rolPagoForm.disable({ emitEvent: false });
    }
  }

  private crearHandlersFecha(
    getControl: () => import('@angular/forms').AbstractControl | null,
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

  private hFechaEmision = this.crearHandlersFecha(
    () => this.rolPagoForm.controls.fechaEmision,
    () => this._rawFechaEmision,
    (v) => (this._rawFechaEmision = v),
    () => this.fechaEmisionInputRef,
  );
  capturarFechaEmisionRaw(event: Event): void { this.hFechaEmision.capturar(event); }
  syncFechaEmisionFromRaw(event: FocusEvent): void { this.hFechaEmision.sync(event); }
  onFechaEmisionPickerChange(date: Date | null | undefined): void { this.hFechaEmision.onPickerChange(date); }

  private hFechaEmisionDesde = this.crearHandlersFecha(
    () => this.filtroForm.controls.fechaEmisionDesde,
    () => this._rawFechaEmisionDesde,
    (v) => (this._rawFechaEmisionDesde = v),
    () => this.fechaEmisionDesdeInputRef,
  );
  capturarFechaEmisionDesdeRaw(event: Event): void { this.hFechaEmisionDesde.capturar(event); }
  syncFechaEmisionDesdeFromRaw(event: FocusEvent): void { this.hFechaEmisionDesde.sync(event); }
  onFechaEmisionDesdePickerChange(date: Date | null | undefined): void { this.hFechaEmisionDesde.onPickerChange(date); }

  private hFechaEmisionHasta = this.crearHandlersFecha(
    () => this.filtroForm.controls.fechaEmisionHasta,
    () => this._rawFechaEmisionHasta,
    (v) => (this._rawFechaEmisionHasta = v),
    () => this.fechaEmisionHastaInputRef,
  );
  capturarFechaEmisionHastaRaw(event: Event): void { this.hFechaEmisionHasta.capturar(event); }
  syncFechaEmisionHastaFromRaw(event: FocusEvent): void { this.hFechaEmisionHasta.sync(event); }
  onFechaEmisionHastaPickerChange(date: Date | null | undefined): void { this.hFechaEmisionHasta.onPickerChange(date); }

  private hFechaRegistroDesde = this.crearHandlersFecha(
    () => this.filtroForm.controls.fechaRegistroDesde,
    () => this._rawFechaRegistroDesde,
    (v) => (this._rawFechaRegistroDesde = v),
    () => this.fechaRegistroDesdeInputRef,
  );
  capturarFechaRegistroDesdeRaw(event: Event): void { this.hFechaRegistroDesde.capturar(event); }
  syncFechaRegistroDesdeFromRaw(event: FocusEvent): void { this.hFechaRegistroDesde.sync(event); }
  onFechaRegistroDesdePickerChange(date: Date | null | undefined): void { this.hFechaRegistroDesde.onPickerChange(date); }

  private hFechaRegistroHasta = this.crearHandlersFecha(
    () => this.filtroForm.controls.fechaRegistroHasta,
    () => this._rawFechaRegistroHasta,
    (v) => (this._rawFechaRegistroHasta = v),
    () => this.fechaRegistroHastaInputRef,
  );
  capturarFechaRegistroHastaRaw(event: Event): void { this.hFechaRegistroHasta.capturar(event); }
  syncFechaRegistroHastaFromRaw(event: FocusEvent): void { this.hFechaRegistroHasta.sync(event); }
  onFechaRegistroHastaPickerChange(date: Date | null | undefined): void { this.hFechaRegistroHasta.onPickerChange(date); }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
