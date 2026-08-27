/** TSR.PTCH — un adjunto (comprobante) de un movimiento de caja chica. */
export interface PathCajaChica {
  codigo: number;
  movimiento: { codigo: number };
  path: string;
  nombreDoc?: string;
  tipoDoc?: string;
  usuario?: { codigo: number; nombre?: string } | null;
}
