import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Asiento } from '../../model/asiento';
import { DetalleAsiento } from '../../model/detalle-asiento';
import { DetalleMayorAnalitico } from '../../model/detalle-mayor-analitico';
import { AsientoService } from '../../service/asiento.service';
import { DetalleAsientoService } from '../../service/detalle-asiento.service';

interface DialogData {
  detalle: DetalleMayorAnalitico;
}

interface DetalleAsientoVista extends DetalleAsiento {
  relacionado: boolean;
}

@Component({
  selector: 'cnt-mayor-analitico-asiento-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './mayor-analitico-asiento-dialog.component.html',
  styleUrls: ['./mayor-analitico-asiento-dialog.component.scss'],
})
export class MayorAnaliticoAsientoDialogComponent implements AfterViewInit {
  private readonly DEBUG_MATCH = true;

  private data = inject<DialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MayorAnaliticoAsientoDialogComponent>);
  private asientoService = inject(AsientoService);
  private detalleAsientoService = inject(DetalleAsientoService);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  readonly loading = signal<boolean>(true);
  readonly error = signal<string>('');
  readonly asiento = signal<Asiento | null>(null);
  readonly totalRelacionadas = signal<number>(0);

  readonly detalleMayor = this.data.detalle;

  readonly displayedColumns = [
    'numeroCuenta',
    'nombreCuenta',
    'descripcion',
    'valorDebe',
    'valorHaber',
    'centroCosto',
  ];

  readonly dataSource = new MatTableDataSource<DetalleAsientoVista>([]);
  private allRows: DetalleAsientoVista[] = [];

  readonly titulo = computed(() => {
    const asiento = this.asiento();
    if (asiento?.numero) {
      return `Asiento #${asiento.numero}`;
    }
    return `Asiento #${this.detalleMayor.numeroAsiento ?? 'N/D'}`;
  });

  readonly mayorCuentaTexto = computed(() => {
    const cuenta = (this.detalleMayor as any)?.planCuenta?.cuentaContable;
    const nombre = (this.detalleMayor as any)?.planCuenta?.nombre;
    return `${cuenta || 'N/D'} - ${nombre || 'Cuenta'}`;
  });

  readonly tipoAsientoTexto = computed(() => {
    const nombre = (this.asiento() as any)?.tipoAsiento?.nombre;
    return typeof nombre === 'string' && nombre.trim().length > 0 ? nombre : 'N/D';
  });

  readonly observacionAsientoTexto = computed(() => {
    const observacion = (this.asiento() as any)?.observaciones;
    return typeof observacion === 'string' && observacion.trim().length > 0
      ? observacion
      : 'Sin observación';
  });

  readonly totalDebe = computed(() => {
    return this.dataSource.data.reduce((sum, row) => sum + (this.toNumber(row.valorDebe) || 0), 0);
  });

  readonly totalHaber = computed(() => {
    return this.dataSource.data.reduce((sum, row) => sum + (this.toNumber(row.valorHaber) || 0), 0);
  });

  constructor() {
    this.cargarDatosRelacionados();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  formatFecha(fecha: unknown): string {
    if (!fecha) return '—';
    const d = this.convertirFecha(fecha);
    if (!d) return String(fecha);
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatEstado(estado: number | null | undefined): string {
    if (estado === 1) return 'Activo';
    if (estado === 2) return 'Anulado';
    if (estado === 3) return 'Reversado';
    if (estado === 4) return 'Incompleto';
    return estado == null ? 'N/D' : String(estado);
  }

  private cargarDatosRelacionados(): void {
    const codigoAsiento = this.obtenerCodigoAsiento();

    if (codigoAsiento) {
      this.cargarAsientoYDetalles(codigoAsiento);
      return;
    }

    this.buscarAsientoPorNumero();
  }

  private obtenerCodigoAsiento(): number | null {
    const rawAsiento: any = this.detalleMayor?.asiento;

    if (typeof rawAsiento === 'number') {
      return Number(rawAsiento) || null;
    }

    if (rawAsiento && typeof rawAsiento === 'object' && rawAsiento.codigo) {
      return Number(rawAsiento.codigo) || null;
    }

    return null;
  }

  private buscarAsientoPorNumero(): void {
    const numero = Number(this.detalleMayor.numeroAsiento);
    if (!Number.isFinite(numero) || numero <= 0) {
      this.loading.set(false);
      this.error.set('No se pudo identificar el asiento relacionado para este movimiento.');
      return;
    }

    const criterios: DatosBusqueda[] = [];

    const criterioNumero = new DatosBusqueda();
    criterioNumero.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'numero',
      String(numero),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(criterioNumero);

    const idSucursal = Number(localStorage.getItem('idSucursal') || '0');
    if (idSucursal > 0) {
      const criterioEmpresa = new DatosBusqueda();
      criterioEmpresa.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'empresa',
        'codigo',
        String(idSucursal),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(criterioEmpresa);
    }

    const order = new DatosBusqueda();
    order.orderBy('codigo');
    order.setTipoOrden(DatosBusqueda.ORDER_DESC);
    criterios.push(order);

    this.asientoService.selectByCriteria(criterios).subscribe({
      next: (rows) => {
        const asiento = (rows ?? [])[0] ?? null;
        if (!asiento?.codigo) {
          this.loading.set(false);
          this.error.set('No se encontró el asiento relacionado para este movimiento.');
          return;
        }
        this.cargarAsientoYDetalles(asiento.codigo, asiento);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo consultar el asiento relacionado.');
      },
    });
  }

  private cargarAsientoYDetalles(codigoAsiento: number, asientoPrecargado?: Asiento): void {
    if (asientoPrecargado) {
      this.asiento.set(asientoPrecargado);
      this.cargarDetalleAsiento(codigoAsiento);
      return;
    }

    this.asientoService.getById(codigoAsiento).subscribe({
      next: (asiento) => {
        this.asiento.set(asiento ?? null);
        this.cargarDetalleAsiento(codigoAsiento);
      },
      error: () => {
        this.asiento.set(null);
        this.cargarDetalleAsiento(codigoAsiento);
      },
    });
  }

  private cargarDetalleAsiento(codigoAsiento: number): void {
    const criterios: DatosBusqueda[] = [];

    const criterioAsiento = new DatosBusqueda();
    criterioAsiento.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'asiento',
      'codigo',
      String(codigoAsiento),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(criterioAsiento);

    const order = new DatosBusqueda();
    order.orderBy('codigo');
    order.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(order);

    this.detalleAsientoService.selectByCriteria(criterios).subscribe({
      next: (rows) => {
        if (this.DEBUG_MATCH) {
          const mayor = this.detalleMayor;
          console.groupCollapsed('[MYAN_MATCH] Inicio comparación detalle mayor vs detalle asiento');
          console.log('Mayor detalle.codigo:', mayor.codigo);
          console.log('Mayor numeroAsiento:', mayor.numeroAsiento);
          console.log('Mayor planCuenta.codigo:', mayor.planCuenta?.codigo);
          console.log('Mayor planCuenta.cuentaContable:', mayor.planCuenta?.cuentaContable);
          console.log('Mayor valorDebe:', mayor.valorDebe, 'Mayor valorHaber:', mayor.valorHaber);
          console.log('Filas detalle asiento recibidas:', (rows ?? []).length);
          console.groupEnd();
        }

        const mapped = (rows ?? []).map((row) => ({
          ...row,
          relacionado: this.esDetalleRelacionado(row),
        }));

        this.allRows = mapped;
        const relacionadas = mapped.filter((row) => row.relacionado).length;
        this.totalRelacionadas.set(relacionadas);

        if (this.DEBUG_MATCH) {
          console.info('[MYAN_MATCH] Total relacionadas detectadas:', relacionadas);
        }

        this.dataSource.data = mapped;
        if (this.paginator) {
          this.paginator.firstPage();
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('No se pudo cargar el detalle del asiento.');
      },
    });
  }

  private esDetalleRelacionado(det: DetalleAsiento): boolean {
    const mayor = this.detalleMayor;
    const cuentaMayor = mayor.planCuenta?.codigo;
    const cuentaDetalle = det.planCuenta?.codigo;
    const numeroCuentaMayor = this.normalizarCuenta(((mayor as any)?.numeroCuenta ?? mayor.planCuenta?.cuentaContable ?? '').toString());
    const numeroCuentaDetalle = this.normalizarCuenta((det.numeroCuenta ?? det.planCuenta?.cuentaContable ?? '').toString());

    const coincideCuentaPorCodigo =
      cuentaMayor != null && cuentaDetalle != null && Number(cuentaMayor) === Number(cuentaDetalle);

    const coincideCuentaPorNumero =
      numeroCuentaMayor.length > 0 && numeroCuentaDetalle.length > 0 && numeroCuentaMayor === numeroCuentaDetalle;

    const coincideCuenta = coincideCuentaPorCodigo || coincideCuentaPorNumero;

    if (!coincideCuenta) {
      if (this.DEBUG_MATCH) {
        console.debug('[MYAN_MATCH] NO coincide cuenta', {
          detalleCodigo: det.codigo,
          cuentaMayor,
          cuentaDetalle,
          numeroCuentaMayor,
          numeroCuentaDetalle,
          coincideCuentaPorCodigo,
          coincideCuentaPorNumero,
        });
      }
      return false;
    }

    const valorDebeMayor = this.toNumber(mayor.valorDebe);
    const valorHaberMayor = this.toNumber(mayor.valorHaber);
    const valorDebeDet = this.toNumber(det.valorDebe);
    const valorHaberDet = this.toNumber(det.valorHaber);

    const mayorEnDebe = valorDebeMayor > 0;
    const mayorEnHaber = valorHaberMayor > 0;

    if (mayorEnDebe && !mayorEnHaber) {
      const resultado = valorDebeDet > 0;
      if (this.DEBUG_MATCH) {
        console.debug('[MYAN_MATCH] Coincide cuenta + lado DEBE', {
          detalleCodigo: det.codigo,
          valorDebeMayor,
          valorDebeDet,
          valorHaberDet,
          resultado,
        });
      }
      return resultado;
    }

    if (mayorEnHaber && !mayorEnDebe) {
      const resultado = valorHaberDet > 0;
      if (this.DEBUG_MATCH) {
        console.debug('[MYAN_MATCH] Coincide cuenta + lado HABER', {
          detalleCodigo: det.codigo,
          valorHaberMayor,
          valorHaberDet,
          valorDebeDet,
          resultado,
        });
      }
      return resultado;
    }

    const coincideDebe = this.casiIgual(valorDebeMayor, valorDebeDet);
    const coincideHaber = this.casiIgual(valorHaberMayor, valorHaberDet);

    const resultado = coincideDebe || coincideHaber;
    if (this.DEBUG_MATCH) {
      console.debug('[MYAN_MATCH] Coincide cuenta + comparación por valores', {
        detalleCodigo: det.codigo,
        valorDebeMayor,
        valorHaberMayor,
        valorDebeDet,
        valorHaberDet,
        coincideDebe,
        coincideHaber,
        resultado,
      });
    }

    return resultado;
  }

  private normalizarCuenta(cuenta: string): string {
    return (cuenta || '').replace(/[^0-9A-Za-z]/g, '').trim().toLowerCase();
  }

  private toNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  private casiIgual(a: number, b: number): boolean {
    return Math.abs(a - b) < 0.01;
  }

  private convertirFecha(fecha: unknown): Date | null {
    if (!fecha) return null;
    if (fecha instanceof Date) return fecha;

    if (Array.isArray(fecha) && fecha.length >= 3) {
      const [y, m, d, hh = 0, mm = 0, ss = 0] = fecha;
      return new Date(y, m - 1, d, hh, mm, ss);
    }

    const parsed = new Date(String(fecha));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}
