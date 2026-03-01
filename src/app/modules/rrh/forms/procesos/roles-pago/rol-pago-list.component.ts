import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
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

  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

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

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
