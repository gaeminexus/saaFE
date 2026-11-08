/** Garante de un préstamo (`CRD.GRPR`). Uno activo por préstamo; `estado` 1 = activo, 0 = anulado. */
export interface GarantePrestamo {
  codigo?: number;
  idPrestamo: number;
  /** Solo si el garante es partícipe: el backend toma nombre y cédula de la entidad. */
  idEntidad?: number | null;
  nombre: string;
  cedula: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  estado?: number;
  usuarioRegistro?: string | null;
  fechaRegistro?: unknown;
  usuarioModificacion?: string | null;
  fechaModificacion?: unknown;
}
