import { CentroCosto } from './centro-costo';
import { Mayorizacion } from './mayorizacion';
import { PlanCuenta } from './plan-cuenta';

/**
 * Entidad DTMT - Temporal de Reportes Contables.
 * Almacena los resultados temporales de la generación de balance.
 */
export interface TemporalReporte {
  /** PK - DTMTCDGO */
  codigo: number;

  /** Secuencia de ejecución del reporte - DTMTSCRP */
  secuencia: number | null;

  /** Cuenta del plan contable - PLNNCDGO */
  planCuenta: PlanCuenta | null;

  /** Saldo del periodo anterior - DTMTSLAN */
  saldoCuenta: number | null;

  /** Valor del Debe del periodo actual - DTMTDBEE */
  valorDebe: number | null;

  /** Valor del Haber del periodo actual - DTMTHBRR */
  valorHaber: number | null;

  /** Valor actual de la cuenta - DTMTSLAC */
  valorActual: number | null;

  /** Número/código de la cuenta contable (transitorio) - DTMTCTCN */
  cuentaContable: string | null;

  /** Código del padre de la cuenta (transitorio) - PLNNCDPD */
  codigoCuentaPadre: number | null;

  /** Nombre de la cuenta contable (transitorio) - PLNNNMBR */
  nombreCuenta: string | null;

  /** Tipo: 1=Acumulación, 2=Movimiento (transitorio) - PLNNTPOO */
  tipo: number | null;

  /** Nivel jerárquico de la cuenta (transitorio) - PLNNNVLL */
  nivel: number | null;

  /** Mayorizacion asociada - MYRZCDGO */
  mayorizacion: Mayorizacion | null;

  /** Centro de costo - CNCSCDGO */
  centroCosto: CentroCosto | null;

  /** Nombre del centro de costo (transitorio) - DTMTCSNB */
  nombreCentroCosto: string | null;

  /** Número del centro de costo (transitorio) - DTMTCSNM */
  numeroCentroCosto: string | null;
}
