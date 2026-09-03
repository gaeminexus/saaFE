import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MaterialFormModule } from '../../modules/material-form.module';
import {
  ESTADO_PAGO_LABELS,
  EstadoAplicacion,
  FORMA_PAGO_LABELS,
  FilaAbono,
  SaldoFactura,
  TIPO_DOC_PAGO_LABELS,
  TipoDocPago,
} from '../../model/pagos-cobros/catalogos-aplicacion-pago';
import { FuncionesDatosService } from '../../services/funciones-datos.service';

/**
 * Cabecera de saldo + tabla de abonos de una factura. Es presentacional: no
 * llama endpoints. Lo usan tanto CXP (/aplp) como CXC (/aplc), que solo
 * difieren en el servicio que alimenta estos inputs.
 */
@Component({
  selector: 'app-historial-abonos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './historial-abonos.component.html',
  styleUrl: './historial-abonos.component.scss',
})
export class HistorialAbonosComponent {
  private funcionesDatos = inject(FuncionesDatosService);

  @Input() saldo: SaldoFactura | null = null;
  @Input() filas: FilaAbono[] = [];
  @Input() cargando = false;
  @Input() error = '';
  /** Etiqueta del botón de pago/cobro, que cambia entre CXP y CXC. */
  @Input() textoBotonPago = 'Ir a Pagos';
  @Input() mostrarAcciones = true;
  /**
   * Aparte de `mostrarAcciones`, que apaga las dos acciones y "revertir" juntas: hay pantallas de
   * destino (`pagos-transferencia` en CXP, hoy) que no saben qué hacer con el id de un documento
   * que no sea factura. En vez de mandar ahí y que falle, este botón se apaga solo, sin tocar
   * "Cruzar anticipo" ni "Revertir", que sí sirven para cualquier tipo de documento.
   */
  @Input() mostrarBotonPagos = true;

  @Output() revertir = new EventEmitter<FilaAbono>();
  @Output() cruzarAnticipo = new EventEmitter<void>();
  @Output() irAPagos = new EventEmitter<void>();

  readonly columnas = ['fecha', 'tipo', 'documento', 'monto', 'estado', 'acciones'];

  get haySaldoPendiente(): boolean {
    return (this.saldo?.saldoPendiente ?? 0) > 0;
  }

  etiquetaEstadoPago(): { texto: string; clase: string } {
    return ESTADO_PAGO_LABELS[this.saldo?.estadoPago ?? 0] ?? { texto: '—', clase: 'badge-neutro' };
  }

  /**
   * Un pago directo se etiqueta con su forma de pago cuando la trae, para
   * distinguir un débito automático de una transferencia confirmada.
   */
  etiquetaTipo(fila: FilaAbono): string {
    if (fila.tipoDocPago === TipoDocPago.PAGO_DIRECTO && fila.formaPago != null) {
      const forma = FORMA_PAGO_LABELS[fila.formaPago];
      if (forma) return forma;
    }
    return TIPO_DOC_PAGO_LABELS[fila.tipoDocPago]?.texto ?? `Tipo ${fila.tipoDocPago}`;
  }

  iconoTipo(fila: FilaAbono): string {
    return TIPO_DOC_PAGO_LABELS[fila.tipoDocPago]?.icono ?? 'receipt';
  }

  /**
   * Documento que originó el abono: el primero no-nulo entre los cinco
   * posibles. Si todos vienen null es un pago directo, que se identifica
   * por su referencia y banco.
   */
  documentoRelacionado(fila: FilaAbono): string {
    const doc = fila.notaCredito ?? fila.retencionV2 ?? fila.retencion ?? fila.notaDebito ?? fila.anticipo;
    if (doc) {
      return doc.numero ?? doc.numeroDoc ?? `N° ${doc.id ?? doc.codigo ?? ''}`;
    }
    const partes = [fila.referencia, fila.banco].filter((p) => !!p);
    return partes.length ? partes.join(' — ') : '—';
  }

  esReversada(fila: FilaAbono): boolean {
    return fila.estado === EstadoAplicacion.REVERSADO;
  }

  /** Solo se pueden reversar las filas activas. */
  puedeRevertir(fila: FilaAbono): boolean {
    return fila.estado === EstadoAplicacion.ACTIVO;
  }

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
