import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetallePrestamo } from '../../../model/detalle-prestamo';
import { Participe } from '../../../model/participe';
import { Prestamo } from '../../../model/prestamo';
import { Producto } from '../../../model/producto';
import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { ParticipeService } from '../../../service/participe.service';
import { PrestamoService } from '../../../service/prestamo.service';
import { ProductoService } from '../../../service/producto.service';

interface ParticipeOption {
  codigoParticipe: number;
  codigoEntidad: number;
  numeroIdentificacion: string;
  nombre: string;
  label: string;
}

@Component({
  selector: 'app-prestamo-edit.component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './prestamo-edit.component.html',
  styleUrl: './prestamo-edit.component.scss',
})
export class PrestamoEditComponent implements OnInit {
  private fb = inject(FormBuilder);

  loading = signal<boolean>(false);

  participesOptions = signal<ParticipeOption[]>([]);
  productosOptions = signal<Producto[]>([]);
  participeQuery = signal<string>('');
  ultimoPrestamoId = signal<number | null>(null);
  generandoTabla = signal<boolean>(false);
  cargandoDetalle = signal<boolean>(false);
  detallePrestamo = signal<DetallePrestamo[]>([]);
  private prestamoDesdeConsulta: Prestamo | null = null;

  displayedColumnsDetalle: string[] = [
    'numeroCuota',
    'fechaVencimiento',
    'capital',
    'interes',
    'cuota',
    'saldoCapital',
    'estado',
  ];

  participesFiltrados = computed(() => {
    const q = this.participeQuery().trim().toLowerCase();
    const all = this.participesOptions();

    if (!q) {
      return all.slice(0, 50);
    }

    return all.filter(
      (p) => p.numeroIdentificacion.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q),
    );
  });

  tipoAmortizacionOptions = [
    { value: 1, label: 'Francesa' },
    { value: 2, label: 'Alemana' },
    { value: 3, label: 'Americana' },
  ];

  form = this.fb.group({
    participe: [null as number | null, Validators.required],
    producto: [null as number | null, Validators.required],
    tipoAmortizacion: [1 as number | null, Validators.required],
    tasa: [0 as number | null, [Validators.required, Validators.min(0)]],
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    plazo: [null as number | null, Validators.required],
  });

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private prestamoService: PrestamoService,
    private detallePrestamoService: DetallePrestamoService,
    private participeService: ParticipeService,
    private productoService: ProductoService,
  ) {}

  ngOnInit(): void {
    this.prestamoDesdeConsulta = (history.state?.prestamo as Prestamo) || null;
    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    this.loading.set(true);
    this.participeService
      .getAll()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (participes) => {
          this.participesOptions.set(this.mapParticipes(participes || []));
          this.intentarCargarPrestamoDesdeConsulta();
        },
        error: () => {
          this.snackBar.open('Error cargando partícipes', 'Cerrar', { duration: 3500 });
        },
      });

    this.productoService.getAll().subscribe({
      next: (productos) => {
        this.productosOptions.set(productos || []);
        this.intentarCargarPrestamoDesdeConsulta();
      },
      error: () => this.snackBar.open('Error cargando productos', 'Cerrar', { duration: 3500 }),
    });
  }

  private intentarCargarPrestamoDesdeConsulta(): void {
    if (!this.prestamoDesdeConsulta) {
      return;
    }

    if (!this.participesOptions().length || !this.productosOptions().length) {
      return;
    }

    const prestamo = this.prestamoDesdeConsulta;
    const participe = this.participesOptions().find(
      (p) => p.codigoEntidad === prestamo.entidad?.codigo,
    );

    this.form.patchValue({
      participe: participe?.codigoParticipe ?? null,
      producto: prestamo.producto?.codigo ?? null,
      tipoAmortizacion: prestamo.tipoAmortizacion ?? 1,
      tasa: prestamo.tasa ?? prestamo.tasaNominal ?? 0,
      monto: prestamo.montoSolicitado ?? 0,
      plazo: prestamo.plazo ?? null,
    });

    if (participe) {
      this.participeQuery.set(participe.label);
    }

    this.ultimoPrestamoId.set(prestamo.codigo || null);
    if (prestamo.codigo) {
      this.cargarDetallePrestamo(prestamo.codigo);
    }

    this.prestamoDesdeConsulta = null;
  }

  private mapParticipes(participes: Participe[]): ParticipeOption[] {
    return participes
      .filter((p) => p?.codigo && p?.entidad?.codigo)
      .map((p) => ({
        codigoParticipe: p.codigo,
        codigoEntidad: p.entidad.codigo,
        numeroIdentificacion: String(p.entidad.numeroIdentificacion || '-'),
        nombre: String(p.entidad.razonSocial || p.entidad.nombreComercial || 'Sin nombre'),
        label: `${p.entidad.numeroIdentificacion || '-'} - ${
          p.entidad.razonSocial || p.entidad.nombreComercial || 'Sin nombre'
        }`,
      }));
  }

  onParticipeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value || '';
    this.participeQuery.set(value);
    this.form.patchValue({ participe: null }, { emitEvent: false });
  }

  onParticipeSelected(codigoParticipe: number): void {
    const participante = this.participesOptions().find(
      (p) => p.codigoParticipe === codigoParticipe,
    );
    if (!participante) {
      return;
    }

    this.form.patchValue({ participe: codigoParticipe }, { emitEvent: false });
    this.participeQuery.set(participante.label);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Complete los campos obligatorios del préstamo', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const v = this.form.getRawValue();
    const participe = this.participesOptions().find((p) => p.codigoParticipe === v.participe);

    if (!participe) {
      this.snackBar.open('Seleccione un partícipe válido', 'Cerrar', { duration: 3000 });
      return;
    }

    const producto = this.productosOptions().find((p) => p.codigo === v.producto);
    if (!producto) {
      this.snackBar.open('Seleccione un producto válido', 'Cerrar', { duration: 3000 });
      return;
    }

    const now = new Date();
    const fechaFin = new Date(now);
    fechaFin.setMonth(fechaFin.getMonth() + Number(v.plazo || 0));

    const username = localStorage.getItem('userName') || 'SYSTEM';
    const tipoAmortizacionLabel =
      this.tipoAmortizacionOptions.find((t) => t.value === v.tipoAmortizacion)?.label || 'Francesa';

    const payload: any = {
      // For insert, backend must receive null id (sending 0 can be treated as detached entity on merge).
      codigo: null,
      idAsoprep: 0,
      entidad: { codigo: participe.codigoEntidad },
      producto: { codigo: v.producto },
      tipoAmortizacion: v.tipoAmortizacion || 1,
      amortizacion: tipoAmortizacionLabel.toUpperCase(),
      fecha: now,
      fechaInicio: now,
      fechaFin: fechaFin,
      interesNominal: v.tasa || 0,
      montoSolicitado: v.monto || 0,
      valorCuota: 0,
      plazo: v.plazo || 0,
      montoLiquidacion: 0,
      filial: { codigo: producto.filial?.codigo || 1 },
      estadoPrestamo: 1,
      tasa: v.tasa || 0,
      totalPagado: 0,
      totalCapital: 0,
      totalInteres: 0,
      totalMora: 0,
      totalInteresVencido: 0,
      totalSeguros: 0,
      totalPrestamo: v.monto || 0,
      saldoPorVencer: 0,
      saldoVencido: 0,
      saldoTotal: v.monto || 0,
      fechaRegistro: now,
      usuarioRegistro: username,
      fechaModificacion: now,
      usuarioModificacion: username,
      observacion: '',
      motivoPrestamo: null,
      estadoOperacion: 1,
      tasaNominal: v.tasa || 0,
      tasaEfectiva: v.tasa || 0,
      esNovacion: 0,
      reprocesado: 0,
      reestructurado: 0,
      refinanciado: 0,
      saldoCapital: v.monto || 0,
      saldoOtros: 0,
      saldoInteres: 0,
      moraCalculada: 0,
      diasVencido: 0,
      montoNovacion: 0,
      interesVariable: 0,
      ajusteAportes: 0,
      mesesACobrar: 0,
      estado: 1,
      firmadoTitular: 0,
    };

    this.loading.set(true);
    this.prestamoService.add(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        const nuevoPrestamoId = res?.codigo || null;
        const prestamoAnteriorId = this.ultimoPrestamoId();

        this.ultimoPrestamoId.set(nuevoPrestamoId);
        if (prestamoAnteriorId !== nuevoPrestamoId) {
          this.detallePrestamo.set([]);
        }

        this.snackBar.open('Préstamo guardado correctamente', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(err?.mensaje || 'Error al guardar el préstamo', 'Cerrar', {
          duration: 4500,
        });
      },
    });
  }

  limpiar(): void {
    this.form.reset({
      tipoAmortizacion: 1,
      tasa: 0,
    });
    this.participeQuery.set('');
    this.ultimoPrestamoId.set(null);
    this.detallePrestamo.set([]);
  }

  generarTablaAmortizacion(): void {
    const idPrestamo = this.ultimoPrestamoId();
    if (!idPrestamo) {
      this.snackBar.open('Primero debe guardar el préstamo para generar la tabla', 'Cerrar', {
        duration: 3500,
      });
      return;
    }

    this.generandoTabla.set(true);
    this.prestamoService
      .generarTablaAmortizacion(idPrestamo)
      .pipe(finalize(() => this.generandoTabla.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Tabla de amortización generada correctamente', 'Cerrar', {
            duration: 3000,
          });
          this.cargarDetallePrestamo(idPrestamo);
        },
        error: (err) => {
          this.snackBar.open(err?.mensaje || 'Error al generar tabla de amortización', 'Cerrar', {
            duration: 4500,
          });
        },
      });
  }

  private cargarDetallePrestamo(codigoPrestamo: number): void {
    const criterios: DatosBusqueda[] = [];

    const criterioPrestamo = new DatosBusqueda();
    criterioPrestamo.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'prestamo',
      'codigo',
      codigoPrestamo.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(criterioPrestamo);

    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('numeroCuota');
    criterios.push(criterioOrden);

    this.cargandoDetalle.set(true);
    this.detallePrestamoService
      .selectByCriteria(criterios)
      .pipe(finalize(() => this.cargandoDetalle.set(false)))
      .subscribe({
        next: (res) => {
          const detalleNormalizado = (res || []).map((d) => this.normalizarDetallePrestamo(d));
          this.detallePrestamo.set(detalleNormalizado);
        },
        error: () => {
          this.detallePrestamo.set([]);
          this.snackBar.open('No se pudo cargar el detalle del préstamo', 'Cerrar', {
            duration: 3500,
          });
        },
      });
  }

  private normalizarDetallePrestamo(detalle: DetallePrestamo): DetallePrestamo {
    return {
      ...detalle,
      fechaVencimiento: this.convertirFechaFlexible((detalle as any).fechaVencimiento) as any,
      fechaPagado: this.convertirFechaFlexible((detalle as any).fechaPagado) as any,
      fechaRegistro: this.convertirFechaFlexible((detalle as any).fechaRegistro) as any,
    };
  }

  private convertirFechaFlexible(valor: any): Date | null {
    if (!valor) {
      return null;
    }

    if (valor instanceof Date) {
      return valor;
    }

    if (Array.isArray(valor)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = valor;
      const ms = Math.floor((Number(nanoseconds) || 0) / 1000000);
      return new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second),
        ms,
      );
    }

    if (typeof valor === 'string') {
      const texto = valor.trim();

      // Backend sometimes sends dates as "yyyy,m,d,h,m[,s[,ns]]"
      if (/^\d{4},\d{1,2},\d{1,2}(,\d{1,2}){0,4}$/.test(texto)) {
        const parts = texto.split(',').map((n) => Number(n));
        const [year, month, day, hour = 0, minute = 0, second = 0, nanoseconds = 0] = parts;
        const ms = Math.floor((nanoseconds || 0) / 1000000);
        return new Date(year, month - 1, day, hour, minute, second, ms);
      }

      const parsed = new Date(texto);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    if (typeof valor === 'number') {
      const parsed = new Date(valor);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  irConsulta(): void {
    this.router.navigate(['/menucreditos/prestamo-consulta']);
  }
}
