import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { guardarArchivo } from '../../../../../shared/services/descarga-reporte';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { ESTADOS_GENERA_ORDEN_PAGO, estadoEn } from '../../../model/estados-nomina';
import { DetalleOrdenPagoNomina, OrdenPagoNomina } from '../../../model/orden-pago-nomina';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { DetalleOrdenPagoNominaService } from '../../../service/detalle-orden-pago.service';
import { OrdenPagoNominaService } from '../../../service/orden-pago-nomina.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import {
  aniosDisponibles,
  criteriosPorEmpresa,
  filtrarPorAnio,
} from '../../parametrizacion/utiles-parametrizacion';
import { aValorDeInput } from '../../asistencia/utiles-asistencia';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Órdenes de pago de la nómina (RHH.RDPG) y su detalle por colaborador (RHH.DRPG).
 *
 * El ciclo es: generar sobre un período → descargar el archivo bancario → subirlo a la banca
 * electrónica → confirmar la acreditación con la fecha real en que el banco pagó.
 *
 * **Los datos bancarios del detalle son un snapshot**, no los del empleado hoy: se copiaron al
 * generar la orden y quedan como constancia de a qué cuenta se ordenó pagar. La pantalla lo dice
 * explícitamente para que nadie los confunda con la ficha vigente.
 */
@Component({
  selector: 'app-ordenes-pago',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './ordenes-pago.component.html',
  styleUrls: ['./ordenes-pago.component.scss'],
})
export class OrdenesPagoComponent implements OnInit {
  columnasOrden = ['numero', 'emision', 'cuenta', 'empleados', 'total', 'estado', 'acciones'];
  columnasDetalle = ['beneficiario', 'identificacion', 'banco', 'cuenta', 'valor', 'situacion'];

  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  periodos = signal<PeriodoNomina[]>([]);
  periodoSeleccionado = signal<number | null>(null);
  cuentas = signal<CuentaBancaria[]>([]);
  cuentaSeleccionada = signal<number | null>(null);

  ordenes = signal<any[]>([]);
  ordenAbierta = signal<OrdenPagoNomina | null>(null);
  detalle = signal<any[]>([]);
  fechaAcreditacion = signal<string>(aValorDeInput(new Date()));

  cargando = signal<boolean>(false);
  ocupado = signal<boolean>(false);

  periodoActual = computed(
    () => this.periodos().find((p) => p.codigo === this.periodoSeleccionado()) ?? null,
  );

  /**
   * Verificado contra `GeneracionOrdenPagoService`: admite APROBADO, CONTABILIZADO y PAGADO.
   * La lista vive en `estados-nomina.ts`; no se deduce del mensaje de error.
   */
  puedeGenerar = computed(
    () =>
      estadoEn(this.periodoActual(), ESTADOS_GENERA_ORDEN_PAGO) &&
      this.cuentaSeleccionada() !== null,
  );

  totalDetalle = computed(() =>
    this.detalle().reduce((suma, fila) => suma + Number(fila.valor ?? 0), 0),
  );

  rechazados = computed(() => this.detalle().filter((f) => f.rechazado === 'S').length);

  constructor(
    private ordenService: OrdenPagoNominaService,
    private detalleService: DetalleOrdenPagoNominaService,
    private periodoService: PeriodoNominaService,
    private cuentaService: CuentaBancariaService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarCuentas();
  }

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.ordenes.set([]);
    this.cerrarDetalle();
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (data) => this.periodos.set(filtrarPorAnio(data, this.anio())),
      error: () => {
        this.periodos.set([]);
        this.avisar('No se pudieron cargar los períodos de nómina', true);
      },
    });
  }

  /** La cuenta de la que sale el dinero: es de tesorería, no del módulo. */
  private cargarCuentas(): void {
    this.cuentaService.getAll().subscribe({
      next: (data) => this.cuentas.set((data ?? []).filter((c) => Number(c.estado) === 1)),
      error: () => {
        this.cuentas.set([]);
        this.avisar('No se pudieron cargar las cuentas bancarias de la empresa', true);
      },
    });
  }

  onPeriodoChange(codigo: number | null): void {
    this.periodoSeleccionado.set(codigo);
    this.cerrarDetalle();

    if (codigo === null) {
      this.ordenes.set([]);
      return;
    }

    this.cargando.set(true);
    this.ordenService.selectByCriteria(this.criteriosDelPeriodo(codigo)).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.ordenes.set(this.formatearOrdenes(data ?? []));
      },
      error: () => {
        this.cargando.set(false);
        this.ordenes.set([]);
        this.avisar('No se pudieron cargar las órdenes de pago', true);
      },
    });
  }

  // ─── Procesos ──────────────────────────────────────────────────────────────

  generar(): void {
    if (!this.puedeGenerar() || this.ocupado()) return;

    this.ocupado.set(true);
    this.ordenService
      .generar(this.periodoSeleccionado()!, this.cuentaSeleccionada()!)
      .subscribe({
        next: (orden) => {
          this.ocupado.set(false);
          this.avisar(`Orden ${orden?.numero ?? ''} generada.`);
          this.onPeriodoChange(this.periodoSeleccionado());
        },
        error: (err) => {
          this.ocupado.set(false);
          // Un empleado sin cuenta activa detiene la orden y el backend devuelve su nombre
          this.avisar(this.mensajeDeError(err, 'No se pudo generar la orden de pago.'), true);
        },
      });
  }

  descargarArchivo(orden: any): void {
    this.ocupado.set(true);
    this.ordenService.archivoBancario(orden.codigo).subscribe({
      next: (blob) => {
        this.ocupado.set(false);
        guardarArchivo(blob, `orden-pago-${orden.numero || orden.codigo}.txt`);
      },
      error: async (err) => {
        this.ocupado.set(false);
        this.avisar(await this.mensajeDeBlob(err), true);
      },
    });
  }

  confirmar(orden: any): void {
    if (!this.fechaAcreditacion()) {
      this.avisar('Indique la fecha en que el banco acreditó el pago.', true);
      return;
    }

    this.ocupado.set(true);
    this.ordenService.confirmar(orden.codigo, this.fechaAcreditacion()).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.avisar('Acreditación confirmada.');
        this.onPeriodoChange(this.periodoSeleccionado());
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(this.mensajeDeError(err, 'No se pudo confirmar la acreditación.'), true);
      },
    });
  }

  // ─── Detalle ───────────────────────────────────────────────────────────────

  verDetalle(orden: OrdenPagoNomina): void {
    this.ordenAbierta.set(orden);
    this.detalleService.selectByCriteria(this.criteriosDeLaOrden(orden.codigo)).subscribe({
      next: (data) => this.detalle.set(this.formatearDetalle(data ?? [])),
      error: () => {
        this.detalle.set([]);
        this.avisar('No se pudo cargar el detalle de la orden', true);
      },
    });
  }

  cerrarDetalle(): void {
    this.ordenAbierta.set(null);
    this.detalle.set([]);
  }

  private criteriosDelPeriodo(idPeriodo: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'periodoNomina',
      'codigo',
      idPeriodo.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('numero');

    return [db, orden];
  }

  private criteriosDeLaOrden(idOrden: number): DatosBusqueda[] {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'ordenPagoNomina',
      'codigo',
      idOrden.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('codigo');

    return [db, orden];
  }

  private formatearOrdenes(registros: OrdenPagoNomina[]): any[] {
    return registros.map((row) => ({
      ...row,
      estadoLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.ESTADO_ORDEN_PAGO,
          row.estado,
        ) || '—',
      cuentaLabel: this.etiquetaCuenta(row.cuentaBancaria),
      acreditada: !!row.fechaAcreditacion,
    }));
  }

  private formatearDetalle(registros: DetalleOrdenPagoNomina[]): any[] {
    return registros.map((row) => ({
      ...row,
      tipoCuentaLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.TIPO_CUENTA_BANCARIA,
          row.tipoCuenta,
        ) || '—',
    }));
  }

  etiquetaCuenta(cuenta: any): string {
    if (!cuenta) return '—';
    const banco = cuenta.banco?.nombre ?? '';
    return `${banco} ${cuenta.numeroCuenta ?? ''}`.trim() || '—';
  }

  etiquetaPeriodo(periodo: PeriodoNomina): string {
    return `${periodo.mes}/${periodo.anio}`;
  }

  exportarCsv(): void {
    this.exportService.exportToCSV(
      this.detalle(),
      `orden-pago-${this.ordenAbierta()?.numero ?? ''}`,
      ['Beneficiario', 'Identificación', 'Banco', 'Cuenta', 'Tipo', 'Valor'],
      ['nombreBeneficiario', 'identificacion', 'banco', 'numeroCuenta', 'tipoCuentaLabel', 'valor'],
    );
  }

  private mensajeDeError(error: any, generico: string): string {
    if (typeof error === 'string' && error.trim()) return error;
    return error?.mensaje || error?.message || generico;
  }

  /** El archivo bancario se pide como `blob`, así que su error también llega como `blob`. */
  private async mensajeDeBlob(error: any): Promise<string> {
    const cuerpo = error?.error;
    if (cuerpo instanceof Blob) {
      try {
        const texto = (await cuerpo.text()).trim();
        if (texto) {
          try {
            const obj = JSON.parse(texto);
            return obj?.mensaje || obj?.message || texto;
          } catch {
            return texto;
          }
        }
      } catch {
        /* se cae al genérico */
      }
    }
    return this.mensajeDeError(cuerpo ?? error, 'No se pudo descargar el archivo bancario.');
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
