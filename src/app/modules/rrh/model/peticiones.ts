import { Catalogo } from './catalogo';
import { Empleado } from './empleado';

export interface Peticiones {
  codigo: number;
  empleado: Empleado;
  catalogo: Catalogo;
  fechaDesde: Date;
  fechaHasta: Date;
  horas: number;
  motivo: String;
  documento: String;
  estado: String;
  usuarioAprobador: String;
  observacion: String;
  fechaRegistro: Date;
  usuarioRegistro: String;
}
