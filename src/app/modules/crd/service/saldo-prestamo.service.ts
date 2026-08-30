import { Injectable } from '@angular/core';

import { DetallePrestamo } from '../model/detalle-prestamo';
import { CodigoEstadoCuota, obtenerCodigoEstadoCuota } from '../model/estado-cuota-prestamo';
import { PagoPrestamo, pagoVigente } from '../model/pago-prestamo';
import { Prestamo } from '../model/prestamo';

/** Componentes de una cuota ya cubiertos por pagos vigentes de CRD.PGPR. */
export interface ComponentesPagados {
  capital: number;
  interes: number;
  desgravamen: number;
  mora: number;
  interesVencido: number;
  seguroIncendio: number;
}

/**
 * Reconstrucción del saldo vigente de un préstamo desde su tabla de amortización (DTPR) y sus
 * pagos (PGPR), en vez de leer `Prestamo.saldoTotal` / `Prestamo.saldoCapital` (PRST) crudos.
 *
 * Esas dos columnas de PRST solo las reescribe el proceso de carga del archivo de Petrocomercial,
 * así que entre cargas quedan congeladas y muestran cifras de hace meses. Los pagos manuales sí
 * actualizan la cuota, así que el valor de hoy se reconstruye sumando sobre las cuotas no
 * liquidadas — el mismo criterio que usa el backend.
 *
 * Extraído de `cobros-personales.component.ts` (pedido 6) para que las demás pantallas que
 * muestran o limitan montos contra el saldo de un préstamo (p. ej. cruce-de-valores) usen
 * exactamente el mismo cálculo en vez de duplicarlo — dos implementaciones divergentes es cómo
 * volvimos a tener dos pantallas diciendo números distintos.
 */
@Injectable({ providedIn: 'root' })
export class SaldoPrestamoService {
  /**
   * Acumula lo realmente cobrado a cada cuota desde una lista de pagos de PGPR, indexado por
   * `DetallePrestamo.codigo`. Descarta los pagos anulados: un pago reversado no cubre nada.
   */
  acumularPagosPorCuota(pagos: PagoPrestamo[] | null | undefined): Record<number, ComponentesPagados> {
    const acumulado: Record<number, ComponentesPagados> = {};
    for (const pago of pagos ?? []) {
      const codigoCuota = pago.detallePrestamo?.codigo;
      if (codigoCuota == null || !pagoVigente(pago)) continue;
      const actual = (acumulado[codigoCuota] ??= {
        capital: 0,
        interes: 0,
        desgravamen: 0,
        mora: 0,
        interesVencido: 0,
        seguroIncendio: 0,
      });
      actual.capital += pago.capitalPagado ?? 0;
      actual.interes += pago.interesPagado ?? 0;
      actual.desgravamen += pago.desgravamen ?? 0;
      actual.mora += pago.moraPagada ?? 0;
      actual.interesVencido += pago.interesVencidoPagado ?? 0;
      actual.seguroIncendio += pago.valorSeguroIncendio ?? 0;
    }
    return acumulado;
  }

  /**
   * ¿La cuota ya no admite aplicación de pagos? Mismo criterio que
   * `DetallePrestamoDaoServiceImpl.selectCuotasPendientes`: PAGADA (4) y CANCELADA_ANTICIPADA (7)
   * quedan fuera, y el estado nulo de los datos legados cuenta como pendiente.
   */
  esCuotaLiquidada(cuota: DetallePrestamo): boolean {
    const estado = obtenerCodigoEstadoCuota(cuota);
    return estado === CodigoEstadoCuota.PAGADA || estado === CodigoEstadoCuota.CANCELADA_ANTICIPADA;
  }

  /**
   * Capital que sigue vivo en la cuota: `capital` (DTPRCPTL) menos lo imputado por los pagos
   * vigentes de PGPR — NO `DetallePrestamo.capitalPagado`, que en los créditos migrados de
   * Petrocomercial viene igualado al capital programado de la cuota.
   */
  capitalPendienteDe(cuota: DetallePrestamo, pagosPorCuota: Record<number, ComponentesPagados>): number {
    if (this.esCuotaLiquidada(cuota)) return 0;
    const pagado = pagosPorCuota[cuota.codigo];
    return Math.max((cuota.capital ?? 0) - (pagado?.capital ?? 0), 0);
  }

  /**
   * Valor de la cuota tal como lo cobra el sistema: el campo `total` (DTPRTTLL). Si falta (dato
   * legado), se arma como capital + interés + desgravamen + seguro de incendio.
   */
  private valorCuotaDe(cuota: DetallePrestamo): number {
    if (cuota.total != null) return +cuota.total.toFixed(2);
    return +(
      (cuota.capital ?? 0) +
      (cuota.interes ?? 0) +
      (cuota.desgravamen ?? 0) +
      (cuota.valorSeguroIncendio ?? 0)
    ).toFixed(2);
  }

  /** Todo lo que se debe por una cuota que no registra ningún pago: `DTPRTTLL + interés vencido`. */
  private totalCuotaDe(cuota: DetallePrestamo): number {
    if (cuota.total != null) return +(cuota.total + (cuota.interesVencido ?? 0)).toFixed(2);
    return +(
      (cuota.desgravamen ?? 0) +
      (cuota.mora ?? 0) +
      (cuota.interesVencido ?? 0) +
      (cuota.interes ?? 0) +
      (cuota.capital ?? 0) +
      (cuota.valorSeguroIncendio ?? 0)
    ).toFixed(2);
  }

  /**
   * Deuda que queda en la cuota, con el mismo criterio que
   * `MotorPagoPrestamoServiceImpl.calcularSaldosRealesCuota()`: PAGADA/CANCELADA_ANTICIPADA → 0;
   * sin pagos vigentes → se debe la cuota entera; con pagos → se descuenta componente por
   * componente, sin dejar que un excedente en uno tape lo que falta en otro.
   */
  saldoPendienteDe(cuota: DetallePrestamo, pagosPorCuota: Record<number, ComponentesPagados>): number {
    if (this.esCuotaLiquidada(cuota)) return 0;

    const pagado = pagosPorCuota[cuota.codigo];
    if (!pagado) return Math.max(this.totalCuotaDe(cuota), 0);

    const pendientePorComponente =
      Math.max((cuota.desgravamen ?? 0) - pagado.desgravamen, 0) +
      Math.max((cuota.mora ?? 0) - pagado.mora, 0) +
      Math.max((cuota.interesVencido ?? 0) - pagado.interesVencido, 0) +
      Math.max((cuota.interes ?? 0) - pagado.interes, 0) +
      Math.max((cuota.capital ?? 0) - pagado.capital, 0) +
      Math.max((cuota.valorSeguroIncendio ?? 0) - pagado.seguroIncendio, 0);

    return +Math.max(pendientePorComponente, 0).toFixed(2);
  }

  /**
   * ¿Se puede recalcular el saldo del préstamo desde sus cuotas? Hacen falta las dos consultas:
   * la tabla de amortización y los pagos. Con una sola el número saldría mal, no incompleto.
   */
  private recalculable(cuotas: DetallePrestamo[] | null | undefined, pagosCargados: boolean): boolean {
    return !!cuotas && pagosCargados;
  }

  /**
   * Saldo total vigente del préstamo. Mientras las cuotas y los pagos no hayan llegado se muestra
   * `Prestamo.saldoTotal` (PRST) para no dejar la celda en $0.00, aunque ese valor puede estar viejo.
   */
  saldoTotalDe(
    prestamo: Prestamo | null,
    cuotas: DetallePrestamo[] | null | undefined,
    pagosPorCuota: Record<number, ComponentesPagados>,
    pagosCargados: boolean,
  ): number {
    if (!this.recalculable(cuotas, pagosCargados)) return prestamo?.saldoTotal ?? 0;
    return +(cuotas as DetallePrestamo[])
      .filter((c) => !this.esCuotaLiquidada(c))
      .reduce((s, c) => s + this.saldoPendienteDe(c, pagosPorCuota), 0)
      .toFixed(2);
  }

  /** Saldo de capital vigente: Σ (capital − capital pagado en PGPR) de las cuotas no liquidadas. */
  saldoCapitalDe(
    prestamo: Prestamo | null,
    cuotas: DetallePrestamo[] | null | undefined,
    pagosPorCuota: Record<number, ComponentesPagados>,
    pagosCargados: boolean,
  ): number {
    if (!this.recalculable(cuotas, pagosCargados)) return prestamo?.saldoCapital ?? 0;
    return +(cuotas as DetallePrestamo[])
      .filter((c) => !this.esCuotaLiquidada(c))
      .reduce((s, c) => s + this.capitalPendienteDe(c, pagosPorCuota), 0)
      .toFixed(2);
  }
}
