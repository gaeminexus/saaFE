import { PlanCuenta } from '../../cnt/model/plan-cuenta';
import { ListadoSriCxp } from './listado-sri-cxp';

/**
 * TSRP - Detalle de Listados SRI (CXP)
 * Tabla equivalente a TSRI pero en el módulo de Cuentas por Pagar
 * Detalles específicos de cada listado SRI para compras
 */
export interface DetalleSriCxp {
  id: number;                         // ID único del detalle
  lsri: number | ListadoSriCxp;      // FK al listado padre (LSRI)
  codigo: string;                     // Código del detalle (max 500)
  detalle: string;                    // Descripción del detalle (max 1000)
  porcentaje: number;                 // Porcentaje aplicable (5,2)
  valor: number;                      // Valor específico (12,2)
  texto: string;                      // Texto adicional (max 1000)
  estado: number;                     // Estado: 1 = activo, 2 = inactivo
  planCuenta: number | PlanCuenta;    // FK a plan de cuentas
}
