import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { Aporte } from '../../model/aporte';
import { PagoAporte } from '../../model/pago-aporte';
import { PagoAporteService } from '../../service/pago-aporte.service';

export interface AportePagosDialogData {
  aporte: Aporte;
  /** Nombre del tipo de aporte del grupo desde el que se abrió el diálogo. */
  tipoAporte?: string;
  /** Estado del aporte ya resuelto contra el catálogo por la pantalla que lo abre. */
  estadoTexto?: string;
  estadoClase?: string;
}

/**
 * PGAPIDST: 1 = pago vigente, 0 = anulado por un reverso o una devolución de aportes
 * (`DevolucionAporteServiceImpl`, `ProcesoPagoPrestamoServiceImpl`). El pago anulado no se
 * borra de PGAP, así que se muestra marcado y no suma en los totales.
 */
const ESTADO_PAGO_VIGENTE = 1;

/** Pago de PGAP con la fecha ya normalizada y su vigencia resuelta. */
interface PagoAporteVista extends PagoAporte {
  fecha: Date | null;
  vigente: boolean;
}

/**
 * Pagos registrados contra UN aporte: PGAP filtrado por `aporte.codigo`.
 *
 * Es el equivalente para aportes del detalle de pagos de una cuota de préstamo, y reemplaza a la
 * columna "Estado" que antes vivía en la tabla de aportes por tipo: el estado del aporte y su
 * pagado/saldo se muestran acá, junto con los pagos que los explican.
 */
@Component({
  selector: 'app-aporte-pagos-dialog',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './aporte-pagos-dialog.component.html',
  styleUrls: ['./aporte-pagos-dialog.component.scss'],
})
export class AportePagosDialogComponent implements OnInit {
  pagos: PagoAporteVista[] = [];
  loading = true;
  error = '';

  displayedColumns = ['fechaContable', 'concepto', 'numeroAsiento', 'valor', 'estado'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: AportePagosDialogData,
    private dialogRef: MatDialogRef<AportePagosDialogComponent>,
    private pagoAporteService: PagoAporteService,
    private funcionesDatos: FuncionesDatosService,
  ) {}

  ngOnInit(): void {
    this.cargarPagos();
  }

  get aporte(): Aporte {
    return this.data.aporte;
  }

  get tipoAporte(): string {
    return this.data.tipoAporte || this.aporte?.tipoAporte?.nombre || 'Aporte';
  }

  /** Suma de los pagos vigentes; los anulados quedan fuera. */
  get totalPagado(): number {
    return +this.pagos
      .filter((pago) => pago.vigente)
      .reduce((suma, pago) => suma + (pago.valor || 0), 0)
      .toFixed(2);
  }

  get totalAnulado(): number {
    return +this.pagos
      .filter((pago) => !pago.vigente)
      .reduce((suma, pago) => suma + (pago.valor || 0), 0)
      .toFixed(2);
  }

  get pagosVigentes(): number {
    return this.pagos.filter((pago) => pago.vigente).length;
  }

  /**
   * Diferencia entre lo que suman los pagos vigentes de PGAP y el `valorPagado` del aporte
   * (APRTVLPG). Debería ser cero: si no lo es, el aporte y sus pagos están descuadrados y vale
   * la pena que el operador lo vea.
   */
  get descuadre(): number {
    return +(this.totalPagado - (this.aporte?.valorPagado || 0)).toFixed(2);
  }

  private cargarPagos(): void {
    const codigoAporte = this.aporte?.codigo;

    if (codigoAporte == null) {
      this.error = 'El aporte seleccionado no tiene código.';
      this.loading = false;
      return;
    }

    const criterios: DatosBusqueda[] = [];

    const porAporte = new DatosBusqueda();
    porAporte.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'aporte',
      'codigo',
      String(codigoAporte),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(porAporte);

    const orden = new DatosBusqueda();
    orden.orderBy('fechaContable');
    orden.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(orden);

    this.pagoAporteService.selectByCriteria(criterios).subscribe({
      next: (pagos) => {
        this.pagos = (pagos || []).map((pago) => ({
          ...pago,
          fecha: this.funcionesDatos.convertirFechaDesdeBackend(pago.fechaContable),
          vigente: Number(pago.estado) === ESTADO_PAGO_VIGENTE,
        }));
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al cargar los pagos del aporte:', err);
        this.error = 'No se pudieron cargar los pagos de este aporte.';
        this.loading = false;
      },
    });
  }

  formatearFecha(fecha: Date | string | null | undefined): string {
    const convertida = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!convertida) return '-';
    const dia = convertida.getDate().toString().padStart(2, '0');
    const mes = (convertida.getMonth() + 1).toString().padStart(2, '0');
    return `${dia}/${mes}/${convertida.getFullYear()}`;
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
