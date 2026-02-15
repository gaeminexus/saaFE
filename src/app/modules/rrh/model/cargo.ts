export interface Cargo {
  codigo: number;
  nombre: string;
  descripcion?: string | null;
  requisitos?: string | null;
  estado: number | string;
  fechaRegistro?: string | Date | null;
  usuarioRegistro?: string | null;
}
