/**
 * Interfaz para representar una Cuenta de ASOPREP
 */
export interface CuentaAsoprep {
  codigo: number;
  numeroCuenta: string;
  tipoCuenta: string;
  banco: string;
  descripcion?: string;
  estado?: string;
}
