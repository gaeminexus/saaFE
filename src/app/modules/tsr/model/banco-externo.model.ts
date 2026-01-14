// Modelo de Banco Externo utilizado por BancoExternoService
// Campos opcionales para permitir flexibilidad con respuestas del backend
export interface BancoExterno {
  id?: number;
  codigo?: number;
  nombre?: string;
  sigla?: string;
  cuenta?: string;
  tipo?: number;
  estado?: number;
  fechaIngreso?: string; // ISO string recomendado en frontend
  fechaInactivo?: string; // ISO string recomendado en frontend
}
