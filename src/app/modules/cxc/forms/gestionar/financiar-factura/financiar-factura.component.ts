import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule, ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { FacturaEmitir } from '../../../model/factura-emitir';
import { FormaPagoFactura } from '../../../model/forma-pago-factura';
import { FacturaEmitirService } from '../../../service/emitir/factura-emitir.service';

type ModoProgramacion = 'PERIODICIDAD' | 'FECHAS_FIJAS';
type Periodicidad = 'SEMANAL' | 'QUINCENAL' | 'MENSUAL';
type ModoMonto = 'PORCENTAJE' | 'VALOR_FIJO';

const FORMA_PAGO_CREDITO = '20';

interface CuotaPlan {
  numero: number;
  fechaPago: string;
  fechaControl: UntypedFormControl;
  porcentaje: number;
  valor: number;
}

@Component({
  selector: 'app-financiar-factura',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './financiar-factura.component.html',
  styleUrl: './financiar-factura.component.scss',
})
export class FinanciarFacturaComponent implements OnInit {
  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;

  private facturaService = inject(FacturaEmitirService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);

  private _rawFechaInicio = '';
  private _rawCuotaFecha: Record<number, string> = {};

  cargando = signal(false);
  facturas = signal<FacturaEmitir[]>([]);
  busqueda = signal('');
  facturaSeleccionada = signal<FacturaEmitir | null>(null);
  cuotas = signal<CuotaPlan[]>([]);

  numeroPagos = signal(3);
  modoProgramacion = signal<ModoProgramacion>('PERIODICIDAD');
  periodicidad = signal<Periodicidad>('MENSUAL');
  fechaInicioControl = new UntypedFormControl(new Date());
  fechaInicio = signal(this.hoyISO());
  modoMonto = signal<ModoMonto>('PORCENTAJE');

  facturasFiltradas = computed(() => {
    const filtro = this.busqueda().trim().toLowerCase();
    const lista = this.facturas();

    if (!filtro) {
      return lista;
    }

    return lista.filter((f) => {
      const numero = String(f.numero || '').toLowerCase();
      const cliente = String(f.titular?.razonSocial || f.titular?.nombre || '').toLowerCase();
      const identificacion = String(f.titular?.identificacion || '').toLowerCase();
      return numero.includes(filtro) || cliente.includes(filtro) || identificacion.includes(filtro);
    });
  });

  totalCuotas = computed(() => this.cuotas().reduce((sum, c) => sum + this.toNumber(c.valor), 0));
  totalPorcentaje = computed(() => this.cuotas().reduce((sum, c) => sum + this.toNumber(c.porcentaje), 0));

  diferenciaMonto = computed(() => {
    const factura = this.facturaSeleccionada();
    if (!factura) {
      return 0;
    }
    return this.round2(this.totalFactura() - this.totalCuotas());
  });

  diferenciaPorcentaje = computed(() => this.round4(100 - this.totalPorcentaje()));

  totalFactura = computed(() => this.toNumber(this.facturaSeleccionada()?.total));

  canGuardar = computed(() => {
    const factura = this.facturaSeleccionada();
    if (!factura || this.cuotas().length === 0) {
      return false;
    }

    const fechasValidas = this.cuotas().every((c) => !!c.fechaPago);
    const montosValidos = this.cuotas().every((c) => this.toNumber(c.valor) > 0);
    const totalCuadra = Math.abs(this.diferenciaMonto()) <= 0.01;

    return fechasValidas && montosValidos && totalCuadra;
  });

  ngOnInit(): void {
    this.cargarFacturas();
  }

  cargarFacturas(): void {
    this.cargando.set(true);
    this.facturaService.getAll().subscribe({
      next: (data) => {
        const elegibles = (data || [])
          .filter((f) => Number(f.estado) === 5 && Number(f.estadoEmision) === 1)
          .map((f) => ({ ...f, total: this.toNumber(f.total) }))
          .sort((a, b) => Number(b.id) - Number(a.id));

        this.facturas.set(elegibles);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
        this.facturas.set([]);
        this.snackBar.open('No se pudieron cargar las facturas para financiación', 'Cerrar', {
          duration: 4000,
          panelClass: ['snackbar-error'],
        });
      },
    });
  }

  seleccionarFactura(factura: FacturaEmitir): void {
    this.facturaSeleccionada.set(factura);
    this.generarPlan();
  }

  generarPlan(): void {
    const factura = this.facturaSeleccionada();
    if (!factura) {
      this.snackBar.open('Seleccione una factura para generar el plan', 'Cerrar', { duration: 3000 });
      return;
    }

    const pagos = Math.max(1, Math.floor(this.toNumber(this.numeroPagos())));
    this.numeroPagos.set(pagos);

    const fechas = this.generarFechas(pagos);
    const cuotas = this.generarMontos(pagos, this.totalFactura(), fechas);
    this.cuotas.set(cuotas);
  }

  onCambiarModoProgramacion(): void {
    if (this.cuotas().length > 0) {
      this.generarPlan();
    }
  }

  onCambiarModoMonto(): void {
    if (this.cuotas().length > 0) {
      this.generarPlan();
    }
  }

  actualizarPorcentaje(index: number, valor: number): void {
    const facturaTotal = this.totalFactura();
    const actualizado = [...this.cuotas()];
    const cuota = actualizado[index];

    cuota.porcentaje = this.round4(Math.max(0, this.toNumber(valor)));
    cuota.valor = this.round2((facturaTotal * cuota.porcentaje) / 100);

    this.cuotas.set(actualizado);
  }

  actualizarValor(index: number, valor: number): void {
    const facturaTotal = this.totalFactura();
    const actualizado = [...this.cuotas()];
    const cuota = actualizado[index];

    cuota.valor = this.round2(Math.max(0, this.toNumber(valor)));
    cuota.porcentaje = facturaTotal > 0 ? this.round4((cuota.valor / facturaTotal) * 100) : 0;

    this.cuotas.set(actualizado);
  }

  aplicarAjusteFinal(): void {
    const cuotas = [...this.cuotas()];
    if (!cuotas.length) {
      return;
    }

    const idx = cuotas.length - 1;
    const totalSinUltima = cuotas.slice(0, idx).reduce((sum, c) => sum + this.toNumber(c.valor), 0);
    const nuevoValor = this.round2(this.totalFactura() - totalSinUltima);

    cuotas[idx].valor = Math.max(0, nuevoValor);
    cuotas[idx].porcentaje = this.totalFactura() > 0 ? this.round4((cuotas[idx].valor / this.totalFactura()) * 100) : 0;

    this.cuotas.set(cuotas);
  }

  guardarFinanciacion(): void {
    if (!this.canGuardar()) {
      this.snackBar.open('Revise el plan: montos, porcentajes y fechas deben cuadrar', 'Cerrar', {
        duration: 3500,
      });
      return;
    }

    const factura = this.facturaSeleccionada();
    if (!factura?.id) {
      this.snackBar.open('No existe factura seleccionada para guardar financiación', 'Cerrar', {
        duration: 3500,
      });
      return;
    }

    const formaPagosFactura = this.mapearFormaPagosFactura();

    this.facturaService
      .guardarFormaPagoFactura({
        idFactura: Number(factura.id),
        formaPagosFactura,
      })
      .subscribe({
        next: () => {
          this.snackBar.open('Financiación guardada correctamente', 'Cerrar', {
            duration: 3500,
            panelClass: ['snackbar-success'],
          });
          this.cargarFacturas();
        },
        error: () => {
          this.snackBar.open('No se pudo guardar la financiación en formaPagoFactura', 'Cerrar', {
            duration: 4000,
            panelClass: ['snackbar-error'],
          });
        },
      });
  }

  private mapearFormaPagosFactura(): FormaPagoFactura[] {
    const inicio = this.parseDate(this.fechaInicio());

    return this.cuotas().map((cuota) => {
      const fechaCuota = this.parseDate(cuota.fechaPago);
      const plazoDias = Math.max(0, Math.round((fechaCuota.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));

      return {
        formaPago: FORMA_PAGO_CREDITO,
        valor: this.round2(cuota.valor),
        plazo: plazoDias,
        unidadTiempo: 'dias',
        estado: 1,
        numeroCuota: cuota.numero,
        porcentaje: this.round4(cuota.porcentaje),
        fechaPago: cuota.fechaPago,
        tipoProgramacion: this.modoProgramacion(),
        periodicidad: this.modoProgramacion() === 'PERIODICIDAD' ? this.periodicidad() : 'PERSONALIZADA',
        intervaloDias: this.modoProgramacion() === 'PERIODICIDAD' ? this.intervaloPeriodicidadEnDias() : undefined,
        esFinanciacion: true,
      };
    });
  }

  private intervaloPeriodicidadEnDias(): number {
    if (this.periodicidad() === 'SEMANAL') {
      return 7;
    }
    if (this.periodicidad() === 'QUINCENAL') {
      return 15;
    }
    return 30;
  }

  private construirPayload(): unknown {
    const factura = this.facturaSeleccionada();
    const formaPagosFactura = this.mapearFormaPagosFactura();

    return {
      idFactura: factura?.id,
      formaPagosFactura,
      resumenFinanciacion: {
        modoProgramacion: this.modoProgramacion(),
        periodicidad: this.modoProgramacion() === 'PERIODICIDAD' ? this.periodicidad() : null,
        modoMonto: this.modoMonto(),
        numeroPagos: this.numeroPagos(),
        fechaInicio: this.fechaInicio(),
        totalFactura: this.totalFactura(),
      },
    };
  }

  debugPayload(): void {
    console.log('Payload financiar factura:', this.construirPayload());
  }

  guardarYVerPayload(): void {
    this.debugPayload();
    this.guardarFinanciacion();
  }

  mostrarPayloadSolo(): void {
    this.debugPayload();
    this.snackBar.open('Payload de financiación generado en consola', 'Cerrar', {
      duration: 2500,
    });
  }

  nombreTitular(factura: FacturaEmitir): string {
    return factura.titular.razonSocial || factura.titular.nombre || '';
  }

  tieneDiferenciaMonto(): boolean {
    return this.abs(this.diferenciaMonto()) > 0.01;
  }

  tieneDiferenciaPorcentaje(): boolean {
    return this.abs(this.diferenciaPorcentaje()) > 0.01;
  }

  private generarFechas(numeroPagos: number): string[] {
    const inicio = this.parseDate(this.fechaInicio());

    if (this.modoProgramacion() === 'FECHAS_FIJAS') {
      return Array.from({ length: numeroPagos }, (_, idx) => {
        const date = this.addDays(inicio, idx * 30);
        return this.toISODate(date);
      });
    }

    const saltoDias = this.periodicidad() === 'SEMANAL' ? 7 : this.periodicidad() === 'QUINCENAL' ? 15 : 30;

    return Array.from({ length: numeroPagos }, (_, idx) => {
      const date = this.addDays(inicio, idx * saltoDias);
      return this.toISODate(date);
    });
  }

  private generarMontos(numeroPagos: number, total: number, fechas: string[]): CuotaPlan[] {
    if (this.modoMonto() === 'PORCENTAJE') {
      const porcentajeBase = this.round4(100 / numeroPagos);
      const cuotas = Array.from({ length: numeroPagos }, (_, idx) => ({
        numero: idx + 1,
        fechaPago: fechas[idx],
        fechaControl: new UntypedFormControl(this.parseDate(fechas[idx])),
        porcentaje: porcentajeBase,
        valor: this.round2((total * porcentajeBase) / 100),
      }));

      const totalSinUltima = cuotas.slice(0, -1).reduce((sum, c) => sum + c.valor, 0);
      cuotas[cuotas.length - 1].valor = this.round2(total - totalSinUltima);
      cuotas[cuotas.length - 1].porcentaje = total > 0 ? this.round4((cuotas[cuotas.length - 1].valor / total) * 100) : 0;

      return cuotas;
    }

    const valorBase = this.round2(total / numeroPagos);
    const cuotas = Array.from({ length: numeroPagos }, (_, idx) => ({
      numero: idx + 1,
      fechaPago: fechas[idx],
      fechaControl: new UntypedFormControl(this.parseDate(fechas[idx])),
      valor: valorBase,
      porcentaje: total > 0 ? this.round4((valorBase / total) * 100) : 0,
    }));

    const totalSinUltima = cuotas.slice(0, -1).reduce((sum, c) => sum + c.valor, 0);
    cuotas[cuotas.length - 1].valor = this.round2(total - totalSinUltima);
    cuotas[cuotas.length - 1].porcentaje = total > 0 ? this.round4((cuotas[cuotas.length - 1].valor / total) * 100) : 0;

    return cuotas;
  }

  private addDays(date: Date, days: number): Date {
    const cloned = new Date(date);
    cloned.setDate(cloned.getDate() + days);
    return cloned;
  }

  private parseDate(value: string): Date {
    const parsed = value ? new Date(`${value}T00:00:00`) : new Date();
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private toISODate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private hoyISO(): string {
    return this.toISODate(new Date());
  }

  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }

  syncFechaInicioFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        this.aplicarFechaInicio(date);
      }
    }
  }

  onFechaInicioPickerChange(date: Date | null | undefined): void {
    this.aplicarFechaInicio(date || new Date());
  }

  private aplicarFechaInicio(date: Date): void {
    this.fechaInicioControl.setValue(date, { emitEvent: false });
    this.fechaInicio.set(this.toISODate(date));
    const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
    });
  }

  capturarCuotaFechaRaw(idx: number, event: Event): void {
    this._rawCuotaFecha[idx] = (event.target as HTMLInputElement).value;
  }

  syncCuotaFechaFromRaw(idx: number, event: FocusEvent): void {
    const rawValue = (this._rawCuotaFecha[idx] || (event.target as HTMLInputElement)?.value || '').trim();
    delete this._rawCuotaFecha[idx];
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        this.aplicarCuotaFecha(idx, date, event.target as HTMLInputElement);
      }
    }
  }

  onCuotaFechaPickerChange(idx: number, date: Date | null | undefined, input: HTMLInputElement): void {
    this.aplicarCuotaFecha(idx, date || new Date(), input);
  }

  private aplicarCuotaFecha(idx: number, date: Date, input: HTMLInputElement): void {
    const actualizado = [...this.cuotas()];
    const cuota = actualizado[idx];
    if (!cuota) return;
    cuota.fechaControl.setValue(date, { emitEvent: false });
    cuota.fechaPago = this.toISODate(date);
    this.cuotas.set(actualizado);
    const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => {
      if (input) input.value = formatted;
    });
  }

  private toNumber(value: unknown): number {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private round2(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  private round4(value: number): number {
    return Math.round((value + Number.EPSILON) * 10000) / 10000;
  }

  private abs(value: number): number {
    return Math.abs(value);
  }
}
