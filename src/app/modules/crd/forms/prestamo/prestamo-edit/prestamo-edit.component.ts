import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
import { EstadoCuotaPrestamo } from '../../../model/estado-cuota-prestamo';
import { Participe } from '../../../model/participe';
import { Prestamo } from '../../../model/prestamo';
import { Producto } from '../../../model/producto';
import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { EstadoCuotaPrestamoService } from '../../../service/estado-cuota-prestamo.service';
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
    MatCheckboxModule,
    MatIconModule,
    MatDatepickerModule,
    MatProgressSpinnerModule,
    MatTableModule,
  ],
  templateUrl: './prestamo-edit.component.html',
  styleUrl: './prestamo-edit.component.scss',
})
export class PrestamoEditComponent implements OnInit {
  @ViewChild('inputExcel') inputExcelRef!: ElementRef<HTMLInputElement>;
  private fb = inject(FormBuilder);

  loading = signal<boolean>(false);

  participesOptions = signal<ParticipeOption[]>([]);
  productosOptions = signal<Producto[]>([]);
  participeQuery = signal<string>('');
  ultimoPrestamoId = signal<number | null>(null);
  generandoTabla = signal<boolean>(false);
  tieneCuotaCero = signal<boolean>(false);
  cargandoExcel = signal<boolean>(false);
  cargandoDetalle = signal<boolean>(false);
  estadosCuota = signal<EstadoCuotaPrestamo[]>([]);
  detallePrestamo = signal<DetallePrestamo[]>([]);
  detallePrestamoRaw = signal<DetallePrestamo[]>([]);
  mostrarCanceladas = signal<boolean>(false);
  modoEdicionPrestamo = signal<boolean>(false);
  private codigoEntidadFija: number | null = null;
  private prestamoDesdeConsulta: Prestamo | null = null;
  private enfocarGenerarTabla = false;

  displayedColumnsDetalle: string[] = [
    'numeroCuota',
    'fechaVencimiento',
    'saldoInicialCapital',
    'capital',
    'saldoCapital',
    'interes',
    'desgravamen',
    'pagoExtra',
    'cuota',
    'estado',
  ];

  get displayedColumnsCuotas(): string[] {
    const productoSeleccionado = this.productosOptions().find(
      (p) => p.codigo === this.form.get('producto')?.value,
    );
    const esConSeguro = [2, 3, 4, 5].includes(productoSeleccionado?.tipoPrestamo?.codigo ?? 0);
    if (esConSeguro) {
      const cols = [...this.displayedColumnsDetalle];
      const idx = cols.indexOf('pagoExtra');
      cols.splice(idx + 1, 0, 'valorSeguroIncendio');
      return cols;
    }
    return this.displayedColumnsDetalle;
  }

  get tieneCuotasCanceladas(): boolean {
    return this.detallePrestamoRaw().some((d) => this.obtenerCodigoEstadoCuota(d) === 7);
  }

  toggleMostrarCanceladas(): void {
    this.mostrarCanceladas.update(v => !v);
    const raw = this.detallePrestamoRaw();
    this.detallePrestamo.set(
      this.mostrarCanceladas() ? raw : raw.filter((d) => this.obtenerCodigoEstadoCuota(d) !== 7),
    );
  }

  calcularTotalesDetalle(): { capital: number; interes: number; desgravamen: number; pagoExtra: number; cuota: number; seguroIncendio: number } {
    return this.detallePrestamoRaw().reduce(
      (acc, d) => {
        const capital      = d.capital ?? 0;
        const interes      = d.interes ?? 0;
        const desgravamen  = d.desgravamen ?? 0;
        const pagoExtra    = d.saldoOtros ?? 0;
        const seguro       = d.valorSeguroIncendio ?? 0;
        const cuota        = d.total ?? 0;
        return {
          capital:       acc.capital       + capital,
          interes:       acc.interes       + interes,
          desgravamen:   acc.desgravamen   + desgravamen,
          pagoExtra:     acc.pagoExtra     + pagoExtra,
          cuota:         acc.cuota         + cuota,
          seguroIncendio: acc.seguroIncendio + seguro,
        };
      },
      { capital: 0, interes: 0, desgravamen: 0, pagoExtra: 0, cuota: 0, seguroIncendio: 0 },
    );
  }

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
    idasoprep: [null as number | null, [Validators.required, Validators.min(0)]],
    fechaInicio: [null as Date | null, Validators.required],
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
    private estadoCuotaPrestamoService: EstadoCuotaPrestamoService,
  ) {}

  ngOnInit(): void {
    this.prestamoDesdeConsulta = (history.state?.prestamo as Prestamo) || null;
    this.enfocarGenerarTabla = !!history.state?.enfocarGenerarTabla;

    if (this.prestamoDesdeConsulta?.entidad?.codigo) {
      this.modoEdicionPrestamo.set(true);
      this.codigoEntidadFija = this.prestamoDesdeConsulta.entidad.codigo;
      this.form.get('participe')?.disable({ emitEvent: false });
    }

    this.cargarCatalogos();
  }

  private cargarCatalogos(): void {
    this.loading.set(true);
    if (!this.modoEdicionPrestamo()) {
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
    }

    this.productoService.getAll().subscribe({
      next: (productos) => {
        this.productosOptions.set(productos || []);
        if (this.modoEdicionPrestamo()) {
          this.loading.set(false);
        }
        this.intentarCargarPrestamoDesdeConsulta();
      },
      error: () => {
        if (this.modoEdicionPrestamo()) {
          this.loading.set(false);
        }
        this.snackBar.open('Error cargando productos', 'Cerrar', { duration: 3500 });
      },
    });

    this.estadoCuotaPrestamoService.getAll().subscribe({
      next: (estados) => this.estadosCuota.set(estados || []),
      error: () => {},
    });
  }

  private intentarCargarPrestamoDesdeConsulta(): void {
    if (!this.prestamoDesdeConsulta) {
      return;
    }

    if (!this.productosOptions().length) {
      return;
    }

    if (!this.modoEdicionPrestamo() && !this.participesOptions().length) {
      return;
    }

    const prestamo = this.prestamoDesdeConsulta;
    const participeSeleccionado = this.participesOptions().find(
      (p) => p.codigoEntidad === prestamo.entidad?.codigo,
    );

    const etiquetaEntidadFija = `${prestamo.entidad?.numeroIdentificacion || '-'} - ${
      prestamo.entidad?.razonSocial || prestamo.entidad?.nombreComercial || 'Sin nombre'
    }`;

    this.form.patchValue({
      participe: this.modoEdicionPrestamo() ? null : (participeSeleccionado?.codigoParticipe ?? null),
      producto: prestamo.producto?.codigo ?? null,
      idasoprep: (prestamo as any).idAsoprep ?? null,
      fechaInicio: prestamo.fechaInicio ? new Date(prestamo.fechaInicio as any) : null,
      tipoAmortizacion: prestamo.tipoAmortizacion ?? 1,
      tasa: prestamo.tasa ?? prestamo.tasaNominal ?? 0,
      monto: prestamo.montoSolicitado ?? 0,
      plazo: prestamo.plazo ?? null,
    });

    this.participeQuery.set(
      this.modoEdicionPrestamo() ? etiquetaEntidadFija : (participeSeleccionado?.label || ''),
    );

    this.ultimoPrestamoId.set(prestamo.codigo || null);
    if (prestamo.codigo) {
      this.cargarDetallePrestamo(prestamo.codigo);
    }

    this.prestamoDesdeConsulta = null;

    if (this.enfocarGenerarTabla) {
      setTimeout(() => {
        document.getElementById('prestamo-acciones')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
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
    if (this.modoEdicionPrestamo()) {
      return;
    }

    const value = (event.target as HTMLInputElement).value || '';
    this.participeQuery.set(value);
    this.form.patchValue({ participe: null }, { emitEvent: false });
  }

  onParticipeSelected(codigoParticipe: number): void {
    if (this.modoEdicionPrestamo()) {
      return;
    }

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
    const codigoEntidad = this.modoEdicionPrestamo()
      ? this.codigoEntidadFija
      : this.participesOptions().find((p) => p.codigoParticipe === v.participe)?.codigoEntidad;

    if (!codigoEntidad) {
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
      idAsoprep: v.idasoprep ?? 0,
      entidad: { codigo: codigoEntidad },
      producto: { codigo: v.producto },
      tipoAmortizacion: v.tipoAmortizacion || 1,
      amortizacion: tipoAmortizacionLabel.toUpperCase(),
      fecha: v.fechaInicio || now,
      fechaInicio: v.fechaInicio || now,
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
      idEstado: 1,
      firmadoTitular: 0,
    };

    // Compatibilidad: evitar enviar campo legado "estado" en creación de préstamo.
    if ('estado' in payload) {
      delete payload.estado;
    }

    this.loading.set(true);
    this.prestamoService.add(payload).subscribe({
      next: (res) => {
        this.loading.set(false);
        const nuevoPrestamoId = res?.codigo || null;
        const prestamoAnteriorId = this.ultimoPrestamoId();

        this.ultimoPrestamoId.set(nuevoPrestamoId);
        if (prestamoAnteriorId !== nuevoPrestamoId) {
          this.detallePrestamo.set([]);
          this.detallePrestamoRaw.set([]);
        }

        this.snackBar.open('Préstamo guardado correctamente', 'Cerrar', { duration: 3000 });
      },
      error: (err) => {
        this.loading.set(false);
        this.snackBar.open(this.extraerMensajeError(err, 'Error al guardar el préstamo'), 'Cerrar', {
          duration: 6000,
          panelClass: ['error-snackbar'],
        });
      },
    });
  }

  limpiar(): void {
    this.form.reset({
      idasoprep: null,
      fechaInicio: null,
      tipoAmortizacion: 1,
      tasa: 0,
    });
    this.participeQuery.set('');
    this.ultimoPrestamoId.set(null);
    this.detallePrestamo.set([]);
    this.detallePrestamoRaw.set([]);
    this.mostrarCanceladas.set(false);
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
      .generarTablaAmortizacion(idPrestamo, this.tieneCuotaCero())
      .pipe(finalize(() => this.generandoTabla.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Tabla de amortización generada correctamente', 'Cerrar', {
            duration: 3000,
          });
          this.cargarDetallePrestamo(idPrestamo);
        },
        error: (err) => {
          this.snackBar.open(this.extraerMensajeError(err, 'Error al generar tabla de amortización'), 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
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
          this.detallePrestamoRaw.set(detalleNormalizado);
          this.detallePrestamo.set(
            this.mostrarCanceladas()
              ? detalleNormalizado
              : detalleNormalizado.filter((d) => this.obtenerCodigoEstadoCuota(d) !== 7),
          );
        },
        error: (err) => {
          this.detallePrestamo.set([]);
          this.snackBar.open(this.extraerMensajeError(err, 'No se pudo cargar el detalle del préstamo'), 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
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

  obtenerClaseFilaCuota(codigoAlterno: number | null | undefined): string {
    if (!codigoAlterno) return 'cuota-desconocida';
    const mapa: Record<number, string> = {
      1: 'cuota-pendiente',
      2: 'cuota-activa',
      3: 'cuota-emitida',
      4: 'cuota-pagada',
      5: 'cuota-mora',
      6: 'cuota-parcial',
      7: 'cuota-cancelada',
      8: 'cuota-vencida',
    };
    return mapa[codigoAlterno] ?? 'cuota-desconocida';
  }

  obtenerCodigoEstadoCuota(detalle: DetallePrestamo | null | undefined): number | null {
    if (!detalle) {
      return null;
    }

    if (detalle.estado !== null && detalle.estado !== undefined) {
      return Number(detalle.estado);
    }

    if (detalle.idEstado !== null && detalle.idEstado !== undefined) {
      const estadoCatalogo = this.estadosCuota().find((e) => e.codigo === Number(detalle.idEstado));
      if (estadoCatalogo?.codigoAlterno !== null && estadoCatalogo?.codigoAlterno !== undefined) {
        return Number(estadoCatalogo.codigoAlterno);
      }
      return Number(detalle.idEstado);
    }

    return null;
  }

  obtenerEstadoCuota(codigoAlterno: number | null | undefined): { texto: string; clase: string } {
    const mapaClase: Record<number, string> = {
      1: 'cuota-pendiente',
      2: 'cuota-activa',
      3: 'cuota-emitida',
      4: 'cuota-pagada',
      5: 'cuota-mora',
      6: 'cuota-parcial',
      7: 'cuota-cancelada',
      8: 'cuota-vencida',
    };
    if (codigoAlterno == null) return { texto: '-', clase: 'cuota-desconocida' };
    const estadoEncontrado = this.estadosCuota().find((e) => e.codigoAlterno === codigoAlterno);
    const texto = estadoEncontrado ? estadoEncontrado.nombre.toUpperCase() : String(codigoAlterno);
    return { texto, clase: mapaClase[codigoAlterno] ?? 'cuota-desconocida' };
  }

  abrirSelectorExcel(): void {
    if (!this.ultimoPrestamoId()) {
      this.snackBar.open('Primero debe guardar el préstamo para cargar la tabla desde Excel', 'Cerrar', { duration: 3500 });
      return;
    }
    this.inputExcelRef.nativeElement.value = '';
    this.inputExcelRef.nativeElement.click();
  }

  onArchivoExcelSeleccionado(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0];
    if (!archivo) return;

    const idPrestamo = this.ultimoPrestamoId();
    if (!idPrestamo) return;

    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xls' && extension !== 'xlsx') {
      this.snackBar.open('Solo se aceptan archivos Excel (.xls o .xlsx)', 'Cerrar', { duration: 3500 });
      return;
    }

    this.cargandoExcel.set(true);
    this.prestamoService.cargarTablaExcel(idPrestamo, archivo)
      .pipe(finalize(() => this.cargandoExcel.set(false)))
      .subscribe({
        next: () => {
          this.snackBar.open('Tabla de amortización cargada correctamente desde Excel', 'Cerrar', { duration: 3500 });
          this.cargarDetallePrestamo(idPrestamo);
        },
        error: (err) => {
          this.snackBar.open(this.extraerMensajeError(err, 'Error al cargar el archivo Excel'), 'Cerrar', {
            duration: 6000,
            panelClass: ['error-snackbar'],
          });
        },
      });
  }

  irConsulta(): void {
    this.router.navigate(['/menucreditos/prestamo-consulta']);
  }

  private extraerMensajeError(err: any, fallback: string): string {
    if (!err) return fallback;
    // Backend lanza el body directamente via throwError(() => error.error)
    return (
      err?.mensaje ||
      err?.message ||
      err?.descripcion ||
      err?.description ||
      err?.error ||
      err?.detalle ||
      (typeof err === 'string' ? err : null) ||
      fallback
    );
  }
}

