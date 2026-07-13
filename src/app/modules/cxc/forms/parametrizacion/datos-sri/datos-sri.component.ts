import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ListadoSri } from '../../../model/listado-sri';
import { DetalleSri } from '../../../model/detalle-sri';
import { PlanCuenta } from '../../../../cnt/model/plan-cuenta';
import { ListadoSriService } from '../../../service/listado-sri.service';
import { DetalleSriService } from '../../../service/detalle-sri.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { PlanCuentaSelectorDialogComponent } from '../../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Component({
  selector: 'app-datos-sri',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  templateUrl: './datos-sri.component.html',
  styleUrls: ['./datos-sri.component.scss']
})
export class DatosSriComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private listadoService = inject(ListadoSriService);
  private detalleService = inject(DetalleSriService);

  // Estado
  cargando = signal(false);
  guardando = signal(false);
  modoListado = signal<'lista' | 'nuevo' | 'editar'>('lista');
  modoDetalle = signal<'lista' | 'nuevo' | 'editar'>('lista');
  panelListadoExpandido = signal(true);

  // Listados SRI (padre)
  listados = signal<ListadoSri[]>([]);
  listadoSeleccionado = signal<ListadoSri | null>(null);
  filtroBusqueda = signal('');

  listadosFiltrados = computed(() => {
    const filtro = this.filtroBusqueda().toLowerCase();
    return this.listados().filter(
      (l) =>
        !filtro ||
        l.tabla?.toLowerCase().includes(filtro) ||
        l.detalle?.toLowerCase().includes(filtro)
    );
  });

  // Detalles SRI (hijo)
  detalles = signal<DetalleSri[]>([]);
  detalleEditando = signal<DetalleSri | null>(null);
  dataSourceDetalles = new MatTableDataSource<DetalleSri>([]);
  columnasTablaDetalles: string[] = ['codigo', 'detalle', 'porcentaje', 'valor', 'planCuenta', 'estado', 'acciones'];

  // Formularios
  formListado!: FormGroup;
  formDetalle!: FormGroup;
  planCuentaSeleccionada = signal<PlanCuenta | null>(null);

  readonly opcionesEstado = [
    { value: 1, label: 'Activo' },
    { value: 2, label: 'Inactivo' },
  ];

  ngOnInit(): void {
    this.inicializarFormularios();
    this.cargarListados();
  }

  private inicializarFormularios(): void {
    this.formListado = this.fb.group({
      id: [null],
      tabla: ['', [Validators.required, Validators.maxLength(100)]],
      detalle: ['', [Validators.required, Validators.maxLength(500)]],
      estado: [1, Validators.required],
    });

    this.formDetalle = this.fb.group({
      id: [null],
      codigo: ['', [Validators.required, Validators.maxLength(500)]],
      detalle: ['', [Validators.required, Validators.maxLength(1000)]],
      porcentaje: [0, [Validators.min(0), Validators.max(100)]],
      valor: [0, Validators.min(0)],
      texto: ['', Validators.maxLength(1000)],
      planCuenta: [null],
      estado: [1, Validators.required],
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LISTADOS SRI (PADRE)
  // ══════════════════════════════════════════════════════════════════════════

  cargarListados(): void {
    this.cargando.set(true);
    const criterios: DatosBusqueda[] = [];
    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'estado',
      '1',
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbEstado);

    this.listadoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const listadosActivos = (data || []).filter((listado) => listado.estado === 1);
        this.listados.set(listadosActivos);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar listados:', err);
        this.mostrarError('Error al cargar listados SRI');
        this.cargando.set(false);
      },
    });
  }

  seleccionarListado(listado: ListadoSri): void {
    this.listadoSeleccionado.set(listado);
    this.formListado.patchValue(listado);
    this.modoListado.set('editar');
    this.modoDetalle.set('lista');
    this.cargarDetalles();
  }

  nuevoListado(): void {
    this.formListado.reset({ estado: 1 });
    this.listadoSeleccionado.set(null);
    this.detalles.set([]);
    this.dataSourceDetalles.data = [];
    this.modoListado.set('nuevo');
    this.modoDetalle.set('lista');
  }

  get tituloPanel(): string {
    return this.modoListado() === 'nuevo'
      ? 'Nuevo Listado SRI'
      : `Editando: ${this.listadoSeleccionado()?.detalle || ''}`;
  }

  guardarListado(): void {
    if (this.formListado.invalid) {
      this.mostrarError('Por favor complete todos los campos requeridos');
      this.formListado.markAllAsTouched();
      return;
    }

    this.guardando.set(true);
    const formValues = this.formListado.value;

    const operacion$ = this.listadoSeleccionado()
      ? this.listadoService.update(formValues)
      : this.listadoService.add(formValues);

    operacion$.subscribe({
      next: (nuevo) => {
        this.mostrarExito('Listado guardado correctamente');
        this.cargarListados();
        if (nuevo && this.modoListado() === 'nuevo') {
          this.seleccionarListado(nuevo);
        }
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.mostrarError('Error al guardar listado');
        this.guardando.set(false);
      },
    });
  }

  eliminarListado(listado: ListadoSri): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de eliminar el listado "${listado.detalle}"? Se eliminarán también todos sus detalles.`,
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && listado.id) {
        this.listadoService.delete(listado.id).subscribe({
          next: () => {
            this.mostrarExito('Listado eliminado correctamente');
            this.cargarListados();
            if (this.listadoSeleccionado()?.id === listado.id) {
              this.listadoSeleccionado.set(null);
              this.modoListado.set('lista');
            }
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            this.mostrarError('Error al eliminar listado');
          },
        });
      }
    });
  }

  cancelarListado(): void {
    if (this.modoListado() === 'nuevo') {
      this.modoListado.set('lista');
      this.listadoSeleccionado.set(null);
    } else {
      const listado = this.listadoSeleccionado();
      if (listado) {
        this.formListado.patchValue(listado);
      }
    }
  }

  togglePanelListado(): void {
    this.panelListadoExpandido.update(v => !v);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DETALLES SRI (HIJO)
  // ══════════════════════════════════════════════════════════════════════════

  cargarDetalles(): void {
    const listado = this.listadoSeleccionado();
    if (!listado || !listado.id) return;

    this.cargando.set(true);

    // Criterio de búsqueda por LSRI padre (entidad relacionada)
    const criterios: DatosBusqueda[] = [];
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatos.STRING,
      'lsri',
      'tabla',
      listado.tabla,
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(db);

    this.detalleService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.detalles.set(data || []);
        this.dataSourceDetalles.data = data || [];
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar detalles:', err);
        this.detalles.set([]);
        this.dataSourceDetalles.data = [];
        this.cargando.set(false);
      },
    });
  }

  nuevoDetalle(): void {
    this.detalleEditando.set(null);
    this.planCuentaSeleccionada.set(null);
    this.modoDetalle.set('nuevo');
    this.formDetalle.reset({
      porcentaje: 0,
      valor: 0,
      estado: 1,
    });
  }

  editarDetalle(detalle: DetalleSri): void {
    this.detalleEditando.set(detalle);
    this.modoDetalle.set('editar');

    // Si tiene plan de cuenta asociado
    if (detalle.planCuenta && typeof detalle.planCuenta === 'object') {
      this.planCuentaSeleccionada.set(detalle.planCuenta as PlanCuenta);
    } else {
      this.planCuentaSeleccionada.set(null);
    }

    this.formDetalle.patchValue({
      id: detalle.id,
      codigo: detalle.codigo,
      detalle: detalle.detalle,
      porcentaje: detalle.porcentaje || 0,
      valor: detalle.valor || 0,
      texto: detalle.texto,
      planCuenta: typeof detalle.planCuenta === 'number' ? detalle.planCuenta : (detalle.planCuenta as PlanCuenta)?.codigo || null,
      estado: detalle.estado,
    });
  }

  guardarDetalle(): void {
    if (this.formDetalle.invalid) {
      this.mostrarError('Por favor complete todos los campos requeridos');
      this.formDetalle.markAllAsTouched();
      return;
    }

    const listado = this.listadoSeleccionado();
    if (!listado) return;

    this.guardando.set(true);
    const formValues = this.formDetalle.value;

    const detalle: any = {
      ...formValues,
      lsri: listado,
      planCuenta: this.planCuentaSeleccionada() || null,
    };

    const operacion$ = this.detalleEditando()
      ? this.detalleService.update(detalle)
      : this.detalleService.add(detalle);

    operacion$.subscribe({
      next: () => {
        this.mostrarExito('Detalle guardado correctamente');
        this.cargarDetalles();
        this.modoDetalle.set('lista');
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('Error al guardar detalle:', err);
        this.mostrarError('Error al guardar detalle');
        this.guardando.set(false);
      },
    });
  }

  eliminarDetalle(detalle: DetalleSri): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de eliminar el detalle "${detalle.detalle}"?`,
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && detalle.id) {
        this.detalleService.delete(detalle.id).subscribe({
          next: () => {
            this.mostrarExito('Detalle eliminado correctamente');
            this.cargarDetalles();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            this.mostrarError('Error al eliminar detalle');
          },
        });
      }
    });
  }

  cancelarDetalle(): void {
    this.modoDetalle.set('lista');
    this.detalleEditando.set(null);
    this.planCuentaSeleccionada.set(null);
    this.formDetalle.reset();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PLAN DE CUENTAS
  // ══════════════════════════════════════════════════════════════════════════

  abrirSelectorCuenta(): void {
    const dialogRef = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '80%',
      maxWidth: '900px',
      data: { titulo: 'Seleccionar Cuenta Contable' },
    });

    dialogRef.afterClosed().subscribe((cuenta: PlanCuenta) => {
      if (cuenta) {
        this.planCuentaSeleccionada.set(cuenta);
        this.formDetalle.patchValue({ planCuenta: cuenta.codigo });
      }
    });
  }

  getCuentaDisplayText(): string {
    const cuenta = this.planCuentaSeleccionada();
    if (!cuenta) return '';

    const codigo = cuenta.cuentaContable || '';
    const nombre = cuenta.nombre || '';

    if (codigo && nombre) {
      return `${codigo} - ${nombre}`;
    }
    return codigo || nombre;
  }

  getCuentaTexto(detalle: DetalleSri): string {
    if (detalle.planCuenta && typeof detalle.planCuenta === 'object') {
      const cuenta = detalle.planCuenta as PlanCuenta;
      return `${cuenta.cuentaContable || ''} - ${cuenta.nombre || ''}`;
    }
    return '-';
  }

  // ══════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ══════════════════════════════════════════════════════════════════════════

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['snackbar-success'],
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['snackbar-error'],
    });
  }

  obtenerClaseEstado(estado: number): string {
    return estado === 1 ? 'estado-activo' : 'estado-inactivo';
  }

  obtenerTextoEstado(estado: number): string {
    const opcion = this.opcionesEstado.find((o) => o.value === estado);
    return opcion ? opcion.label : '-';
  }
}
