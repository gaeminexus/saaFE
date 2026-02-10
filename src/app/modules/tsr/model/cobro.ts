import { Empresa } from '../../../shared/model/empresa';
import { Asiento } from '../../cnt/model/asiento';
import { CajaLogica } from './caja-logica';
import { CierreCaja } from './cierre-caja';
import { Deposito } from './deposito';
import { DetalleDeposito } from './detalle-deposito';
import { Titular } from './titular';
import { UsuarioPorCaja } from './usuario-por-caja';

export interface Cobro {
  codigo: number;
  tipoId: number; // 1 = Cédula, 2 = RUC
  numeroId: string;
  cliente: string;
  descripcion: string;
  fecha: string; // o Date si se maneja como objeto de fecha
  nombreUsuario: string;
  valor: number;
  empresa: Empresa;
  cierreCaja: CierreCaja;
  fechaInactivo: string; // o Date si se maneja como objeto de fecha
  rubroMotivoAnulacionP: number; // Rubro 29 - Motivo de anulación (principal)
  rubroMotivoAnulacionH: number; // Rubro 29 - Motivo de anulación (detalle)
  rubroEstadoP: number; // Rubro 28 - Estado de cobro (principal)
  rubroEstadoH: number; // Rubro 28 - Estado de cobro (detalle)
  usuarioPorCaja: UsuarioPorCaja;
  cajaLogica: CajaLogica;
  asiento: Asiento;
  deposito: Deposito;
  detalleDeposito: DetalleDeposito;
  persona: Titular;
  tipoCobro: number; // 1 = Factura, 2 = Anticipo
  numeroAsiento: number;
}
