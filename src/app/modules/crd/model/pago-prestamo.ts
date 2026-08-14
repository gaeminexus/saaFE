import { DetallePrestamo } from "./detalle-prestamo";
import { Prestamo } from "./prestamo";

export interface PagoPrestamo {
  codigo: number;           // Código del pago
  prestamo?: Prestamo;   // FK - Código Préstamo
  detallePrestamo?: DetallePrestamo;    // FK - Código Detalle Préstamo (Cuota)
  fecha: Date;              // Fecha del pago
  valor: number;            // Valor
  numeroCuota: number;      // Número de cuota
  capitalPagado: number;    // Capital Pagado
  interesPagado: number;    // Interés Pagado
  moraPagada: number;       // Mora pagada
  interesVencidoPagado: number; // Interés vencido pagado
  desgravamen: number;      // Desgravamen
  saldoOtros: number;       // Saldo otros
  observacion: string;      // Observación
  tipo: string;             // Tipo
  estado: number;           // Estado
  fechaRegistro: Date;      // Fecha registro
  usuarioRegistro: string;  // Usuario registro
  idEstado: number;         // ID Estado
  valorSeguroIncendio: number; // Valor seguro incendio

  // Campos agregados con los servicios de pago de préstamos (§14 de
  // docs/crd/GUIA-FRONTEND-SERVICIOS-PAGO-PRESTAMOS.md). Toda pantalla que liste pagos debe
  // filtrar `anulado = 0` o marcar visualmente los anulados: si no, los pagos reversados siguen
  // apareciendo como válidos. Usar el helper `pagoVigente()`.
  eventoPrestamo?: { codigo: number } | null;
  asiento?: number | null;
  /** 0 = vigente, 1 = anulado. */
  anulado?: number | null;
  usuarioAnulacion?: string | null;
  fechaAnulacion?: Date | string | number[] | null;
  motivoAnulacion?: string | null;
}

/**
 * ¿El pago sigue siendo válido? Los pagos anteriores a los servicios de anulación no traen el
 * campo `anulado`, así que un valor ausente se considera vigente.
 */
export function pagoVigente(pago: PagoPrestamo | null | undefined): boolean {
  return !!pago && Number(pago.anulado ?? 0) === 0;
}
