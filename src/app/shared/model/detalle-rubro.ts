import { Rubro } from './rubro';

export interface DetalleRubro {
  codigo: number;
  rubro: Rubro;
  descripcion: string;
  valorNumerico: number;
  valorAlfanumerico: string;
  codigoAlterno: number;
  estado: number;
}
