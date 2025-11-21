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
}
