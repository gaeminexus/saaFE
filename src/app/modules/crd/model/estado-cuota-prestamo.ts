export interface EstadoCuotaPrestamo {
  codigo: number;         // ESCPCDGO - Código (ID)
  nombre: string;         // ESCPNMBR - Nombre del estado
  codigoAlterno: number;  // ESCPCDAL - Código alterno numérico
  estado: number;         // ESCPESTD - Estado del registro (1=Activo)
}
