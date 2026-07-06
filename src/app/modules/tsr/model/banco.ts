import { Empresa } from "../../../shared/model/empresa";

export interface Banco {
  codigo: number;
  nombre: string;
  tipo: number;
  estado: number;
  fechaIngreso: string; // o Date, según cómo manejes las fechas en el frontend
  // Campos opcionales usados por algunos módulos/mock de CRD
  fechaInactivo?: string;
  conciliaDescuadre?: number;
  empresa?: Empresa;
  rubroTipoBancoP?: number;
  rubroTipoBancoH?: number;
}
