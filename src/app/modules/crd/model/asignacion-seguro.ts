export type TipoSeguroPrestamo = 'INCENDIO' | 'DESGRAVAMEN' | 'PRENDARIO';

// No existe todavía una tabla de backend para seguros de préstamo (sin código de 4 letras
// asignado ni endpoint en ws-crd.ts). Esta interfaz modela únicamente los datos que captura
// el diálogo "Asignar Seguro" durante la fase frontend-only del módulo; cuando el equipo de
// backend publique el endpoint real, ajustar los campos según el contrato que expongan.
//
// La asignación es por tipo de seguro (Incendio/Desgravamen/Prendario) en conjunto para todos
// los préstamos vigentes elegibles de ese tipo, no por préstamo individual.
export interface AsignacionSeguro {
  tipoSeguro: TipoSeguroPrestamo;
  aseguradora: string;
  broker: string;
  numeroPoliza: string;
  fechaInicioPoliza: Date;
  fechaFinPoliza: Date;
  plazoPolizaMeses: number;
  cantidadPrestamos: number; // Préstamos cubiertos al momento de la asignación
  montoTotalAsegurado: number; // Suma de saldoTotal cubierta al momento de la asignación
  archivo: File | null; // Póliza escaneada (imagen o PDF); pendiente de subir al backend real
}
