/**
 * Saldos vigentes de un préstamo, calculados en el servidor desde las cuotas pendientes
 * (POST /rest/prst/saldos) — no confundir con `Prestamo.saldoTotal`/`saldoCapital`, columnas
 * muertas en el backend que no las escribe ningún camino de pago desde la migración.
 */
export interface SaldoPrestamoResumen {
  /** PRSTCDGO – código del préstamo */
  idPrestamo: number;
  /** Suma del saldo de capital de las cuotas pendientes del préstamo */
  saldoCapital: number;
  /** Suma del total pendiente (capital + interés + mora) de las cuotas pendientes */
  saldoTotal: number;
  /** Cuotas pendientes con fecha de vencimiento anterior a hoy */
  cuotasEnMora: number;
}
