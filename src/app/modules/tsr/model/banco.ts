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
  /**
   * 1 = banco real, 0 = no (TSR.BNCO.BNCOREAL, default 1; script e2-111). Decide el tipo de los asientos
   * automáticos que mueven una cuenta de este banco: Ingreso/Egreso (IN-A/EG-A) si es real, Diario (DI-A)
   * si no. Opcional: un backend anterior al script no lo manda y se asume 1.
   */
  bancoReal?: number;
}
