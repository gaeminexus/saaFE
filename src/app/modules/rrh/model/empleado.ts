export interface Empleado {
  codigo: number;
  identificacion: string | number;
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
