import { PlanCuenta } from "../../cnt/model/plan-cuenta";
import { ListadoSri } from "./listado-sri";

/**
 * TSRI - Detalle de Listados SRI
 * Tabla CBR.TSRI
 * Detalles específicos de cada listado SRI (códigos de retención, porcentajes, etc)
 */
export interface DetalleSri {
  id: number;                   // ID único del detalle
  lsri: number | ListadoSri;    // FK al listado padre (LSRI)
  codigo: string;               // Código del detalle (max 500)
  detalle: string;              // Descripción del detalle (max 1000)
  porcentaje: number;           // Porcentaje aplicable (5,2)
  valor: number;                // Valor específico (12,2)
  texto: string;                // Texto adicional o descripción extendida (max 1000)
  estado: number;               // Estado: 1 = activo, 2 = inactivo
  planCuenta: number | PlanCuenta; // FK a plan de cuentas
}
