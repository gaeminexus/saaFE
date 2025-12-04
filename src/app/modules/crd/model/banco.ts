/**
 * Interfaz para representar un Banco
 */
export interface Banco {
  codigo: number;
  nombre: string;
  descripcion?: string;
  estado?: string;
}
