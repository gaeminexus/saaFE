import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CentroCosto } from '../../model/centro-costo';
import { DetalleAsiento } from '../../model/detalle-asiento';
import { PlanCuenta } from '../../model/plan-cuenta';
import { CentroCostoService } from '../../service/centro-costo.service';
import { PlanCuentaService } from '../../service/plan-cuenta.service';

@Component({
  selector: 'app-detalle-asiento',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCardModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatTooltipModule,
  ],
  templateUrl: './detalle-asiento.component.html',
  styleUrls: ['./detalle-asiento.component.scss'],
})
export class DetalleAsientoComponent implements OnInit {
  @Input() asientoId!: number;
  @Output() detallesChanged = new EventEmitter<DetalleAsiento[]>();

  // Tabla y datos
  displayedColumns: string[] = ['cuenta', 'detalle', 'debe', 'haber', 'centroCostos', 'acciones'];
  dataSource = new MatTableDataSource<DetalleAsiento>([]);
  detalles: DetalleAsiento[] = [];

  // Formulario
  formDetalle!: FormGroup;
  editingIndex: number | null = null;

  // Dropdowns
  planCuentas: PlanCuenta[] = [];
  centrosCosto: CentroCosto[] = [];

  // Totales
  totalDebe = 0;
  totalHaber = 0;
  diferencia = 0;

  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private planCuentaService: PlanCuentaService,
    private centroCostoService: CentroCostoService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  private initializeForm(): void {
    this.formDetalle = this.fb.group({
      planCuenta: ['', [Validators.required]],
      descripcion: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(255)]],
      tipo: ['debe', [Validators.required]], // 'debe' o 'haber'
      valor: [0, [Validators.required, Validators.min(0.01)]],
      centroCosto: [''],
    });
  }

  private cargarDatos(): void {
    this.loading = true;

    // Cargar plan de cuentas
    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        this.planCuentas = Array.isArray(data) ? data : (data as any)?.data ?? [];
        console.log('📋 Plan de Cuentas cargadas:', this.planCuentas.length);
      },
      error: (err) => {
        console.error('❌ Error cargando plan de cuentas:', err);
        this.error = 'Error al cargar plan de cuentas';
        this.loading = false;
      },
    });

    // Cargar centros de costo
    this.centroCostoService.getAll().subscribe({
      next: (data) => {
        this.centrosCosto = Array.isArray(data) ? data : (data as any)?.data ?? [];
        console.log('📋 Centros de Costo cargados:', this.centrosCosto.length);
        this.loading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando centros de costo:', err);
        this.error = 'Error al cargar centros de costo';
        this.loading = false;
      },
    });
  }

  // Insertar nuevo detalle
  onInsertar(): void {
    if (this.formDetalle.invalid) {
      this.error = 'Por favor completa todos los campos requeridos';
      return;
    }

    const tipo = this.formDetalle.get('tipo')?.value;
    const valor = Number(this.formDetalle.get('valor')?.value) || 0;

    const nuevoDetalle: DetalleAsiento = {
      codigo: this.detalles.length + 1,
      asiento: this.asientoId,
      planCuenta: this.obtenerPlanCuenta(this.formDetalle.get('planCuenta')?.value),
      descripcion: this.formDetalle.get('descripcion')?.value || '',
      valorDebe: tipo === 'debe' ? valor : 0,
      valorHaber: tipo === 'haber' ? valor : 0,
      nombreCuenta: this.obtenerNombreCuenta(this.formDetalle.get('planCuenta')?.value),
      centroCosto: this.obtenerCentroCosto(this.formDetalle.get('centroCosto')?.value),
      numeroCuenta: this.obtenerNumeroCuenta(this.formDetalle.get('planCuenta')?.value),
    };

    this.detalles.push(nuevoDetalle);
    this.actualizarTabla();
    this.limpiarFormulario();
    this.calcularTotales();
    this.emitirCambios();
  }

  // Modificar detalle existente
  onModificar(index: number): void {
    if (this.editingIndex === null) {
      this.editingIndex = index;
      const detalle = this.detalles[index];
      const tipo = detalle.valorDebe > 0 ? 'debe' : 'haber';
      const valor = detalle.valorDebe > 0 ? detalle.valorDebe : detalle.valorHaber;

      this.formDetalle.patchValue({
        planCuenta: detalle.planCuenta.codigo,
        descripcion: detalle.descripcion,
        tipo: tipo,
        valor: valor,
        centroCosto: detalle.centroCosto?.codigo,
      });
    } else if (this.editingIndex === index) {
      // Guardar cambios
      const tipo = this.formDetalle.get('tipo')?.value;
      const valor = Number(this.formDetalle.get('valor')?.value) || 0;
      const detalle = this.detalles[index];

      detalle.descripcion = this.formDetalle.get('descripcion')?.value;
      detalle.valorDebe = tipo === 'debe' ? valor : 0;
      detalle.valorHaber = tipo === 'haber' ? valor : 0;
      detalle.centroCosto = this.obtenerCentroCosto(this.formDetalle.get('centroCosto')?.value);

      this.editingIndex = null;
      this.actualizarTabla();
      this.limpiarFormulario();
      this.calcularTotales();
      this.emitirCambios();
    }
  }

  // Eliminar detalle
  onEliminar(index: number): void {
    if (confirm('¿Está seguro de que desea eliminar esta línea?')) {
      this.detalles.splice(index, 1);
      this.actualizarTabla();
      this.calcularTotales();
      this.emitirCambios();
    }
  }

  // Cancelar edición
  onCancelar(): void {
    this.editingIndex = null;
    this.limpiarFormulario();
  }

  // Recalcular totales
  onRecalcular(): void {
    this.calcularTotales();
  }

  // Privados
  private actualizarTabla(): void {
    this.dataSource.data = [...this.detalles];
  }

  private calcularTotales(): void {
    this.totalDebe = this.detalles.reduce((sum, d) => sum + (d.valorDebe || 0), 0);
    this.totalHaber = this.detalles.reduce((sum, d) => sum + (d.valorHaber || 0), 0);
    this.diferencia = Math.abs(this.totalDebe - this.totalHaber);
    this.emitirCambios();
  }

  private limpiarFormulario(): void {
    this.formDetalle.reset({ tipo: 'debe', valor: 0 });
    this.error = null;
  }

  private obtenerPlanCuenta(codigo: any): PlanCuenta {
    return this.planCuentas.find((p) => p.codigo === codigo) || ({} as PlanCuenta);
  }

  private obtenerNombreCuenta(codigo: any): string {
    const cuenta = this.planCuentas.find((p) => p.codigo === codigo);
    return cuenta?.nombre || '';
  }

  private obtenerNumeroCuenta(codigo: any): string {
    const cuenta = this.planCuentas.find((p) => p.codigo === codigo);
    return cuenta?.codigo?.toString() || '';
  }

  private obtenerCentroCosto(codigo: any): CentroCosto {
    return this.centrosCosto.find((c) => c.codigo === codigo) || ({} as CentroCosto);
  }

  private emitirCambios(): void {
    this.detallesChanged.emit(this.detalles);
  }

  emitDetallesChanged(): void {
    this.detallesChanged.emit(this.detalles);
  }

  // Getters para el template
  get botonModificarTexto(): string {
    return this.editingIndex === null ? 'Modificar' : 'Guardar';
  }

  get puedeModificar(): boolean {
    return this.formDetalle.valid && this.editingIndex !== null;
  }
}
