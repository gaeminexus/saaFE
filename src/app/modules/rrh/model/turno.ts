export interface Turno {
  codigo: number;
  nombre: string;
  horaEntrada: string;
  horaSalida: string;
  toleranciaMinutos: number;
  requiereMarcacionSalida: boolean;
  estado: string;
  fechaRegistro: Date;
  usuarioRegistro: string;
}
