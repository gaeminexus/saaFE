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
import { ContratoEmpleado } from '../../../model/contrato-empleado';
import { Empleado } from '../../../model/empleado';
import { Nomina } from '../../../model/nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';

type FormMode = 'create' | 'edit' | 'view';
type EstadoNomina = 'BORRADOR' | 'EN_REVISION' | 'APROBADA' | 'PAGADA' | 'ANULADA';

@Component({
  selector: 'app-nomina-list',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './nomina-list.component.html',
  styleUrls: ['./nomina-list.component.scss'],
})
export class NominaListComponent implements OnInit, AfterViewInit {
  titulo = signal<string>('Nómina');
  columns = signal<string[]>([
    'codigo',
    'periodoNomina',
    'empleado',
    'contratoEmpleado',
    'salarioBase',
    'totalIngresos',
    'totalDescuentos',
    'netoPagar',
    'estado',
    'fechaRegistro',
    'usuarioRegistro',
    'acciones',
  ]);

  loading = signal<boolean>(false);
  filtrosVisibles = signal<boolean>(true);
  selectedNomina = signal<Nomina | null>(null);
  formOpen = signal<boolean>(false);
  formMode = signal<FormMode>('create');

  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);
  totalItems = signal<number>(0);

  readonlyMode = computed(() => this.formMode() === 'view');
  saveEnabled = computed(() => this.formMode() !== 'view');

  estadosNomina: EstadoNomina[] = ['BORRADOR', 'EN_REVISION', 'APROBADA', 'PAGADA', 'ANULADA'];

  periodosNomina = signal<PeriodoNomina[]>([]);
  empleados = signal<Empleado[]>([]);
  contratosEmpleado = signal<ContratoEmpleado[]>([]);

  dataSource = new MatTableDataSource<Nomina>([]);

  @ViewChild(MatPaginator) paginator?: MatPaginator;
  @ViewChild(MatSort) sort?: MatSort;

  private formBuilder = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);

  filtroForm = this.formBuilder.group({
    periodoNomina: [null as PeriodoNomina | null],
    empleado: [null as Empleado | null],
    estado: [null as EstadoNomina | null],
    fechaRegistroDesde: [null as Date | null],
    fechaRegistroHasta: [null as Date | null],
  });

  nominaForm = this.formBuilder.group({
    codigo: [null as number | null],
    periodoNomina: [null as PeriodoNomina | null, Validators.required],
    empleado: [null as Empleado | null, Validators.required],
    contratoEmpleado: [null as ContratoEmpleado | null, Validators.required],
    estado: [null as EstadoNomina | null, Validators.required],
    salarioBase: [null as number | null],
    totalIngresos: [null as number | null],
    totalDescuentos: [null as number | null],
    netoPagar: [null as number | null],
    fechaRegistro: [null as Date | null],
    usuarioRegistro: ['' as string],
  });

  ngOnInit(): void {
    this.setupReadOnlyFields();
    this.dataSource.data = [];
    this.totalItems.set(this.dataSource.data.length);
    this.showInfo('Pantalla de Nómina lista para integrar con servicios RRHH');

    // TODO: Cargar periodosNomina, empleados y contratosEmpleado desde servicios RRHH.
    // TODO: Implementar búsqueda principal con selectByCriteria en NominaService.
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }

    if (this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  onToolbarBuscar(): void {
    if (!this.filtrosVisibles()) {
      this.filtrosVisibles.set(true);
      return;
    }
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.loading.set(true);

    // TODO: construir criterios y ejecutar nominaService.selectByCriteria(criterios).
    this.dataSource.data = [];
    this.totalItems.set(this.dataSource.data.length);
    this.pageIndex.set(0);

    this.loading.set(false);
    this.showInfo('Aplicación de filtros disponible en fase funcional');
  }

  limpiarFiltros(): void {
    this.filtroForm.reset({
      periodoNomina: null,
      empleado: null,
      estado: null,
      fechaRegistroDesde: null,
      fechaRegistroHasta: null,
    });

    this.selectedNomina.set(null);
    this.showInfo('Filtros limpiados');
  }

  onNuevaNomina(): void {
    this.openForm('create');
  }

  onVer(row: Nomina): void {
    this.selectedNomina.set(row);
    this.openForm('view', row);
  }

  onEditar(row: Nomina): void {
    this.selectedNomina.set(row);
    this.openForm('edit', row);
  }

  onInactivarAnular(row: Nomina): void {
    this.selectedNomina.set(row);
    this.showInfo('Acción de inactivar/anular disponible en fase funcional');
  }

  onImprimir(row: Nomina): void {
    this.selectedNomina.set(row);
    this.showInfo('Impresión disponible en fase funcional');
  }

  onRowSelect(row: Nomina): void {
    this.selectedNomina.set(row);
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
  }

  closeForm(): void {
    this.formOpen.set(false);
  }

  onGuardar(): void {
    this.nominaForm.markAllAsTouched();
    if (this.nominaForm.invalid || !this.saveEnabled()) {
      return;
    }

    this.showInfo('Guardado disponible en fase funcional');
    this.formOpen.set(false);
  }

  periodoLabel(periodo: PeriodoNomina | null | undefined): string {
    if (!periodo) return '';
    const value = periodo as unknown as Record<string, unknown>;
    const label = value['descripcion'] ?? value['nombre'] ?? value['codigo'];
    return label ? String(label) : '';
  }

  empleadoLabel(empleado: Empleado | null | undefined): string {
    if (!empleado) return '';
    const apellidos = (empleado as unknown as Record<string, unknown>)['apellidos'] ?? '';
    const nombres = (empleado as unknown as Record<string, unknown>)['nombres'] ?? '';
    const nombreCompleto = `${String(apellidos)} ${String(nombres)}`.replace(/\s+/g, ' ').trim();
    if (nombreCompleto) return nombreCompleto;

    const value = empleado as unknown as Record<string, unknown>;
    return String(value['nombre'] ?? value['codigo'] ?? '');
  }

  contratoLabel(contrato: ContratoEmpleado | null | undefined): string {
    if (!contrato) return '';
    const value = contrato as unknown as Record<string, unknown>;
    return String(value['numero'] ?? value['codigo'] ?? '');
  }

  estadoChipColor(estado: string | null | undefined): 'primary' | 'accent' | 'warn' | undefined {
    const normalized = (estado ?? '').toUpperCase();
    if (normalized === 'APROBADA') return 'primary';
    if (normalized === 'PAGADA') return 'accent';
    if (normalized === 'ANULADA') return 'warn';
    return undefined;
  }

  drawerTitle(): string {
    if (this.formMode() === 'view') return 'Ver Nómina';
    if (this.formMode() === 'edit') return 'Editar Nómina';
    return 'Nueva Nómina';
  }

  selectedEstadoLabel(): string {
    const selected = this.selectedNomina();
    return selected?.estado ? String(selected.estado) : '';
  }

  private openForm(mode: FormMode, row?: Nomina): void {
    this.formMode.set(mode);

    this.nominaForm.reset({
      codigo: row?.codigo ?? null,
      periodoNomina: row?.periodoNomina ?? null,
      empleado: row?.empleado ?? null,
      contratoEmpleado: row?.contratoEmpleado ?? null,
      estado: (row?.estado as EstadoNomina) ?? null,
      salarioBase: row?.salarioBase ?? null,
      totalIngresos: row?.totalIngresos ?? null,
      totalDescuentos: row?.totalDescuentos ?? null,
      netoPagar: row?.netoPagar ?? null,
      fechaRegistro: row?.fechaRegistro ?? null,
      usuarioRegistro: row?.usuarioRegistro ? String(row.usuarioRegistro) : '',
    });

    this.setupReadOnlyFields();
    this.formOpen.set(true);
  }

  private setupReadOnlyFields(): void {
    this.nominaForm.enable({ emitEvent: false });

    if (this.formMode() === 'view') {
      this.nominaForm.disable({ emitEvent: false });
      return;
    }

    this.nominaForm.controls.totalIngresos.disable({ emitEvent: false });
    this.nominaForm.controls.totalDescuentos.disable({ emitEvent: false });
    this.nominaForm.controls.netoPagar.disable({ emitEvent: false });
    this.nominaForm.controls.fechaRegistro.disable({ emitEvent: false });
    this.nominaForm.controls.usuarioRegistro.disable({ emitEvent: false });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3500,
      horizontalPosition: 'right',
      verticalPosition: 'top',
    });
  }
}
