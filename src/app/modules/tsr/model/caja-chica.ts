import { Empresa } from '../../../shared/model/empresa';
import { Usuario } from '../../../shared/model/usuario';
import { PlanCuenta } from '../../cnt/model/plan-cuenta';

/**
 * TSR.CJCH — fondo de caja chica. El saldo no vive aquí: se calcula del lado
 * del backend a partir de sus movimientos (ver `SaldoCajaChica`,
 * GET /cjch/saldo/{id}).
 */
export interface CajaChica {
  codigo: number;
  empresa: Empresa;
  nombre: string;
  /** Cuenta contable del fondo (donde se contabiliza el efectivo de la caja). */
  planCuenta: PlanCuenta;
  montoFondo: number;
  /** Tope por gasto individual; null/undefined = sin tope. */
  montoMaximoGasto?: number | null;
  /** % del fondo a partir del cual se dispara la alerta de reposición. */
  porcentajeAlerta: number;
  responsable: string;
  /**
   * Custodio de la caja: es un `Usuario` del sistema (FK a SCP.PJRQ, la
   * misma tabla de usuarios de login) — NO un `Titular` de negocio. El
   * frontend no tiene hoy un selector de usuarios del sistema, así que este
   * campo no se envía desde la pantalla de parametrización todavía (ver
   * cajas-chicas.component.ts).
   */
  custodio?: Usuario | null;
  observacion?: string | null;
  estado?: number;
}

/**
 * Body de POST /cjch/registrar. Contrato REAL verificado contra
 * CajaChicaRest.registrar() (saaBE): claves PLANAS, `idPlanCuenta`/`idEmpresa`/
 * `idCustodio` numéricos — NO el objeto `CajaChica` anidado. El endpoint hace
 * `Map<String,Object> datos` y lee `datos.get("idEmpresa")` etc. a mano; un
 * body anidado (`{cajaChica:{...}}`) no matchea ninguna clave y el backend
 * responde 400 "Debe enviar idEmpresa, nombre, idPlanCuenta y montoFondo."
 */
export interface CajaChicaRegistrarRequest {
  idEmpresa: number;
  nombre: string;
  idPlanCuenta: number;
  montoFondo: number;
  montoMaximoGasto?: number | null;
  porcentajeAlerta?: number;
  responsable?: string;
  /** Usuario del sistema, no Titular — ver el comentario en `CajaChica.custodio`. */
  idCustodio?: number | null;
  observacion?: string | null;
  /**
   * Solo al crear una caja que ya existía como cuenta bancaria: el saldo que
   * traía no se contabiliza de nuevo (ya estaba contabilizado), solo se
   * registra como punto de partida.
   */
  saldoInicialMigrado?: number;
  idUsuario: number;
}
