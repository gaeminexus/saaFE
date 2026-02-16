import { DetalleRubro } from '../../../shared/model/detalle-rubro';

export interface Empleado {
  codigo: number;
  identificacion: DetalleRubro | string | number;
  apellidos: string;
  nombres: string;
  fechaNacimiento: Date;
  email: string;
  telefono: string;
  direccion: string;
  estado: string;
  fechaRegistro: Date;
  usuarioRegistro: string;
}
