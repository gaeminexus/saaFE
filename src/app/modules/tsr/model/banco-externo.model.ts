// Modelo de Banco Externo utilizado por BancoExternoService
// Campos opcionales para permitir flexibilidad con respuestas del backend
export interface BancoExterno {
  codigo: number;
  nombre: string;
  /**
   * Código de institución financiera del Banco Central del Ecuador
   * (`TSR.BEXT.BEXTTRJT`). El nombre del campo es histórico y engañoso: no
   * es un flag de tarjeta de crédito, es el código BCE del banco (valores
   * medidos en producción: 10 a 9997, p. ej. Machala 25, Pacífico 30).
   */
  tarjeta: number | null;
  estado: boolean;
  fechaIngreso: string;
}
