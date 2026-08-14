import { Component, HostListener, Inject } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import {
  CLASE_ESTADO_CUOTA,
  NOMBRE_ESTADO_CUOTA,
  NOMBRE_TIPO_OPERACION,
} from '../../model/pagos/catalogos-pago';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { PagoPrestamo, pagoVigente } from '../../model/pago-prestamo';
import { ComprobanteImpresionService } from '../pagos/comprobante-impresion.service';

export interface PrestamoPagosDialogData {
  detalle: DetallePrestamo;
  pagos: PagoPrestamo[];
  esPrestamoConSeguro?: boolean;
  /** Encabezado del comprobante, p. ej. "Crédito Ordinario #8523". */
  tituloPrestamo?: string;
  participante?: string;
}

/** Renglón de la composición de la cuota: lo pactado frente a lo efectivamente cobrado. */
interface ConceptoCuota {
  nombre: string;
  icono: string;
  /** Lo que la cuota exigía por este concepto (columnas de DTPR). */
  pactado: number;
  /** Lo que suman los pagos registrados (columnas de PGPR). */
  pagado: number;
  /** Lo que queda debiendo. */
  pendiente: number;
}

/** Un pago de PGPR ya desglosado para pintarlo en la línea de tiempo. */
interface PagoDesglosado {
  pago: PagoPrestamo;
  conceptos: { nombre: string; valor: number }[];
  /** Suma de los conceptos imputados; debería coincidir con `pago.valor`. */
  sumaConceptos: number;
  /** |valor − sumaConceptos| cuando el pago no cuadra con su propio desglose. */
  descuadre: number;
  anulado: boolean;
}

/** Tolerancia con la que el backend compara montos (§2 de la guía de servicios de pago). */
const TOLERANCIA = 0.01;

/**
 * Rótulo del campo `tipo` de PGPR. Además de las cuatro operaciones del motor de pagos, el
 * backend escribe `DESCUENTO_NOMINA` (carga de Petrocomercial) y `MIGRACION` (saldos importados).
 */
const NOMBRE_TIPO_PAGO: Record<string, string> = {
  ...NOMBRE_TIPO_OPERACION,
  DESCUENTO_NOMINA: 'Descuento por nómina',
  MIGRACION: 'Saldo migrado',
};

/**
 * Reimpresión y explicación de los pagos ya registrados contra UNA cuota (PGPR filtrado por
 * `detallePrestamo`). Solo se abre cuando la cuota tiene pagos: la pantalla que lo invoca no lo
 * muestra si la consulta vuelve vacía.
 *
 * El objetivo es que el operador entienda *qué pasó* con el dinero: qué exigía la cuota, cómo se
 * imputó cada pago en el orden de prelación del backend (desgravamen → mora → interés vencido →
 * interés → capital → seguro) y qué quedó pendiente.
 */
@Component({
  selector: 'app-prestamo-pagos-dialog',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './prestamo-pagos-dialog.component.html',
  styleUrls: ['./prestamo-pagos-dialog.component.scss'],
})
export class PrestamoPagosDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PrestamoPagosDialogData,
    private impresion: ComprobanteImpresionService
  ) {}

  @HostListener('document:keydown.control.p', ['$event'])
  atajoImprimir(evento: Event): void {
    evento.preventDefault();
    this.imprimir();
  }

  get detalle(): DetallePrestamo {
    return this.data.detalle;
  }

  get pagos(): PagoPrestamo[] {
    return this.data.pagos ?? [];
  }

  get mostrarSeguro(): boolean {
    return !!this.data.esPrestamoConSeguro;
  }

  get tituloPrestamo(): string {
    return this.data.tituloPrestamo ?? 'Préstamo';
  }

  // ================= cabecera =================

  /** Valor exigido por la cuota. `total` es la columna que muestra la tabla de amortización. */
  get cuotaTotal(): number {
    return this.detalle.total || this.detalle.cuota || 0;
  }

  get totalPagado(): number {
    return this.suma((p) => p.valor);
  }

  get saldoPendiente(): number {
    return Math.max(0, this.detalle.saldo ?? 0);
  }

  /** Avance del cobro de la cuota, acotado a 100 % para que la barra no se desborde. */
  get porcentajePagado(): number {
    if (this.cuotaTotal <= 0) return this.totalPagado > 0 ? 100 : 0;
    return Math.min(100, Math.round((this.totalPagado / this.cuotaTotal) * 100));
  }

  get cuotaSaldada(): boolean {
    return this.saldoPendiente <= TOLERANCIA;
  }

  get nombreEstado(): string {
    return NOMBRE_ESTADO_CUOTA[this.detalle.estado] ?? `Estado ${this.detalle.estado}`;
  }

  get claseEstado(): string {
    return CLASE_ESTADO_CUOTA[this.detalle.estado] ?? 'est-pendiente';
  }

  get diasMora(): number {
    return this.detalle.diasMora || 0;
  }

  get fechaPrimerPago(): Date | string | null {
    return this.pagosOrdenados.length ? this.pagosOrdenados[0].pago.fecha : null;
  }

  get fechaUltimoPago(): Date | string | null {
    const lista = this.pagosOrdenados;
    return lista.length ? lista[lista.length - 1].pago.fecha : null;
  }

  /** Frase de una línea que resume la historia de la cuota. */
  get resumen(): string {
    const n = this.pagos.length;
    const plural = n === 1 ? 'pago' : 'pagos';
    const monto = this.formatMoneda(this.totalPagado);
    if (this.cuotaSaldada) {
      return `${n} ${plural} por ${monto} cubrieron la cuota completa: no queda saldo pendiente.`;
    }
    return `${n} ${plural} por ${monto}. Todavía queda pendiente ${this.formatMoneda(this.saldoPendiente)} de esta cuota.`;
  }

  // ================= composición de la cuota =================

  /**
   * Conceptos en el orden de prelación con que el backend imputa el dinero. `pendiente` usa las
   * columnas de saldo de DTPR cuando existen (son las autoritativas) y, para desgravamen, seguro y
   * pago extra —que no tienen columna de saldo—, lo que falta contra lo pactado.
   */
  get conceptos(): ConceptoCuota[] {
    const d = this.detalle;
    const filas: ConceptoCuota[] = [
      this.concepto('Desgravamen', 'health_and_safety', d.desgravamen, this.suma((p) => p.desgravamen)),
      this.concepto('Mora', 'running_with_errors', d.mora, this.suma((p) => p.moraPagada), d.saldoMora),
      this.concepto(
        'Interés vencido',
        'schedule',
        d.interesVencido,
        this.suma((p) => p.interesVencidoPagado),
        d.saldoInteresVencido
      ),
      this.concepto('Interés', 'percent', d.interes, this.suma((p) => p.interesPagado), d.saldoInteres),
      this.concepto('Capital', 'account_balance', d.capital, this.suma((p) => p.capitalPagado), d.saldoCapital),
    ];

    if (this.mostrarSeguro) {
      filas.push(
        this.concepto('Seguro', 'local_fire_department', d.valorSeguroIncendio, this.suma((p) => p.valorSeguroIncendio))
      );
    }

    filas.push(this.concepto('Pago extra', 'add_circle', d.saldoOtros, this.suma((p) => p.saldoOtros)));

    // Capital e interés se muestran siempre; el resto solo si tuvo movimiento, para no llenar la
    // pantalla de ceros en la cuota típica sin mora ni seguros.
    return filas.filter(
      (f) => f.nombre === 'Capital' || f.nombre === 'Interés' || f.pactado > 0 || f.pagado > 0
    );
  }

  get totalesConceptos(): ConceptoCuota {
    return this.conceptos.reduce(
      (acc, c) => ({
        nombre: 'Totales',
        icono: '',
        pactado: acc.pactado + c.pactado,
        pagado: acc.pagado + c.pagado,
        pendiente: acc.pendiente + c.pendiente,
      }),
      { nombre: 'Totales', icono: '', pactado: 0, pagado: 0, pendiente: 0 }
    );
  }

  /** Qué porcentaje de lo pactado por ese concepto ya está cobrado (para la barrita de la fila). */
  avanceConcepto(c: ConceptoCuota): number {
    if (c.pactado <= 0) return c.pagado > 0 ? 100 : 0;
    return Math.min(100, (c.pagado / c.pactado) * 100);
  }

  private concepto(
    nombre: string,
    icono: string,
    pactado: number | null | undefined,
    pagado: number,
    saldo?: number | null
  ): ConceptoCuota {
    const exigido = pactado ?? 0;
    const pendiente = saldo != null ? Math.max(0, saldo) : Math.max(0, exigido - pagado);
    return { nombre, icono, pactado: exigido, pagado, pendiente };
  }

  // ================= pagos =================

  /** Pagos del más antiguo al más reciente, cada uno con su desglose listo para pintar. */
  get pagosOrdenados(): PagoDesglosado[] {
    return this.pagos
      .slice()
      .sort((a, b) => this.tiempo(a.fecha) - this.tiempo(b.fecha))
      .map((pago) => {
        const conceptos = [
          { nombre: 'Desgravamen', valor: pago.desgravamen || 0 },
          { nombre: 'Mora', valor: pago.moraPagada || 0 },
          { nombre: 'Interés vencido', valor: pago.interesVencidoPagado || 0 },
          { nombre: 'Interés', valor: pago.interesPagado || 0 },
          { nombre: 'Capital', valor: pago.capitalPagado || 0 },
          ...(this.mostrarSeguro ? [{ nombre: 'Seguro', valor: pago.valorSeguroIncendio || 0 }] : []),
          { nombre: 'Pago extra', valor: pago.saldoOtros || 0 },
        ].filter((c) => Math.abs(c.valor) > 0.0001);

        const sumaConceptos = +conceptos.reduce((s, c) => s + c.valor, 0).toFixed(2);
        const descuadre = Math.abs((pago.valor || 0) - sumaConceptos);

        return {
          pago,
          conceptos,
          sumaConceptos,
          descuadre: descuadre > TOLERANCIA ? descuadre : 0,
          anulado: !pagoVigente(pago),
        };
      });
  }

  /** N° de la operación de pago (EVPR), la que se necesita para anularla. */
  idEvento(pago: PagoPrestamo): number | null {
    return pago.eventoPrestamo?.codigo ?? null;
  }

  nombreTipoPago(tipo: string | null | undefined): string {
    if (!tipo) return 'Pago de cuota';
    return NOMBRE_TIPO_PAGO[tipo] ?? tipo.replace(/_/g, ' ').toLowerCase();
  }

  // ================= utilidades =================

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private suma(campo: (p: PagoPrestamo) => number | null | undefined): number {
    return +this.pagos.reduce((s, p) => s + (campo(p) || 0), 0).toFixed(2);
  }

  private tiempo(fecha: Date | string | null | undefined): number {
    if (!fecha) return 0;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const t = d.getTime();
    return isNaN(t) ? 0 : t;
  }

  private fechaCorta(fecha: Date | string | null | undefined): string {
    if (!fecha) return '—';
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-EC');
  }

  // ================= impresión =================

  /**
   * Emite el mismo comprobante que el diálogo de confirmación de pago de `cobros-personales`:
   * ambos lo arman con `ComprobanteImpresionService`. La ventana de impresión del navegador
   * permite guardarlo como PDF.
   */
  imprimir(): void {
    const d = this.detalle;

    const datos: { label: string; valor: string }[] = [];
    if (this.data.participante) datos.push({ label: 'Partícipe', valor: this.data.participante });
    datos.push({ label: 'Cuota', valor: `#${d.numeroCuota}` });
    datos.push({ label: 'Vencimiento', valor: this.fechaCorta(d.fechaVencimiento) });
    datos.push({ label: 'Estado', valor: this.nombreEstado });
    datos.push({ label: 'Cuota total', valor: this.formatMoneda(this.cuotaTotal) });
    datos.push({ label: 'Total pagado', valor: this.formatMoneda(this.totalPagado) });
    datos.push({ label: 'Saldo pendiente', valor: this.formatMoneda(this.saldoPendiente) });

    const observaciones = this.pagosOrdenados
      .filter((p) => (p.pago.observacion || '').trim())
      .map((p) => ({ label: this.fechaCorta(p.pago.fecha), valor: p.pago.observacion.trim() }));

    this.impresion.imprimir({
      titulo: `Pagos de la cuota #${d.numeroCuota}`,
      subtitulo: this.tituloPrestamo,
      datos,
      mensaje: this.resumen,
      encabezadoConcepto: 'Fecha del pago',
      encabezadoEstado: 'Operación',
      notaTabla: 'Pagos registrados — imputación: desgravamen, mora, interés vencido, interés, capital, seguro',
      filas: this.pagosOrdenados.map((p) => ({
        concepto: this.fechaCorta(p.pago.fecha),
        estado:
          this.nombreTipoPago(p.pago.tipo) +
          (this.idEvento(p.pago) != null ? ` · #${this.idEvento(p.pago)}` : ''),
        desgravamen: p.pago.desgravamen || 0,
        mora: p.pago.moraPagada || 0,
        interesVencido: p.pago.interesVencidoPagado || 0,
        interes: p.pago.interesPagado || 0,
        capital: p.pago.capitalPagado || 0,
        seguro: p.pago.valorSeguroIncendio || 0,
        total: p.pago.valor || 0,
      })),
      bloques: [
        {
          titulo: 'Composición de la cuota',
          filas: this.conceptos.map((c) => ({
            label: c.nombre,
            valor: `Pactado ${this.formatMoneda(c.pactado)} · Pagado ${this.formatMoneda(
              c.pagado
            )} · Pendiente ${this.formatMoneda(c.pendiente)}`,
          })),
        },
        { titulo: 'Observaciones', filas: observaciones },
      ],
    });
  }
}
