export interface OrdenAfectacionValorPrestamo {
  codigo: number;   // OAVPCDGO - Código (ID)
  nombre: string;   // OAVPNMBR - Nombre / descripción de la afectación
  orden: number;    // OAVPORDN - Número de orden de afectación
  estado: number;   // OAVPESTD - Estado del registro (1=Activo)
}
