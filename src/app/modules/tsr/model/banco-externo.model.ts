// Modelo de Banco Externo utilizado por BancoExternoService
// Campos opcionales para permitir flexibilidad con respuestas del backend
export interface BancoExterno {
  codigo: number;
  nombre: string;
  tarjeta: boolean;
  estado: boolean;
  fechaIngreso: string;
}
