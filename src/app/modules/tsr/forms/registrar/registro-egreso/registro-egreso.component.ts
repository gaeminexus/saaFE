import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';

import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { GrupoProductoPago } from '../../../../cxp/model/grupo_producto_pago';
import { ProductoPago } from '../../../../cxp/model/producto_pago';

import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import { GrupoProductoPagoService } from '../../../../cxp/service/grupo-producto-pago.service';
import { ProductoPagoService } from '../../../../cxp/service/producto-pago.service';

@Component({
  selector: 'app-registro-egreso',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './registro-egreso.component.html',
  styleUrls: ['./registro-egreso.component.scss'],
})
export class RegistroEgresoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private grupoProductoPagoService = inject(GrupoProductoPagoService);
  private productoPagoService = inject(ProductoPagoService);

  // Estado
  cargando = signal(false);
  guardando = signal(false);

  // Datos
  cuentasBancarias = signal<CuentaBancaria[]>([]);
  gruposProducto = signal<GrupoProductoPago[]>([]);
  todosProductos = signal<ProductoPago[]>([]);
  grupoSeleccionadoId = signal<number | null>(null);

  // Productos filtrados según el grupo seleccionado
  productosFiltrados = computed(() => {
    const grupoId = this.grupoSeleccionadoId();
    if (!grupoId) return [];
    return this.todosProductos().filter(
      (p) => p.grupoProducto?.codigo === grupoId && p.estado === 1
    );
  });

  form!: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group({
      cuentaBancaria: [null, Validators.required],
      grupoProducto: [null, Validators.required],
      producto: [null, Validators.required],
      valor: [null, [Validators.required, Validators.min(0.01)]],
      observacion: [''],
    });

    // Cuando cambia el grupo, actualiza el signal y limpia el producto seleccionado
    this.form.get('grupoProducto')!.valueChanges.subscribe((val) => {
      this.grupoSeleccionadoId.set(val ?? null);
      this.form.get('producto')!.setValue(null);
    });

    this.cargarDatos();
  }

  private cargarDatos(): void {
    this.cargando.set(true);

    this.cuentaBancariaService.getAll().subscribe({
      next: (data) => this.cuentasBancarias.set(data ?? []),
      error: () => this.mostrarError('Error al cargar cuentas bancarias'),
    });

    this.grupoProductoPagoService.getAll().subscribe({
      next: (data) =>
        this.gruposProducto.set((data ?? []).filter((g) => g.estado === 1)),
      error: () => this.mostrarError('Error al cargar grupos de producto'),
    });

    this.productoPagoService.getAll().subscribe({
      next: (data) => {
        this.todosProductos.set(data ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.mostrarError('Error al cargar productos');
        this.cargando.set(false);
      },
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    // TODO: implementar llamada al backend cuando esté disponible el endpoint
    this.snackBar.open('Función de guardado pendiente de implementación', 'Cerrar', {
      duration: 3000,
    });
  }

  limpiar(): void {
    this.form.reset();
  }

  labelCuentaBancaria(cuenta: CuentaBancaria): string {
    return cuenta ? `${cuenta.banco?.nombre ?? ''} - ${cuenta.numeroCuenta}` : '';
  }

  private mostrarError(msg: string): void {
    this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: 'snack-error' });
  }
}
