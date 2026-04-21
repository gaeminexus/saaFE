import { Entidad } from './entidad';

export interface ValorPagoPensionComplementaria {
  codigo?: number;
  entidad: Entidad;
  valorPagar: number;
  numeroCuotas?: number | null;
  estado?: number;
  usuarioIngreso?: string;
  fechaIngreso?: string;
  usuarioModificacion?: string;
  fechaModificacion?: string;
}
