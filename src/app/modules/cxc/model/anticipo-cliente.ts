import { Asiento } from '../../cnt/model/asiento';
import { Empresa } from '../../../shared/model/empresa';
import { Usuario } from '../../../shared/model/usuario';
import { Titular } from '../../tsr/model/titular';

/**
 * ANTC - Anticipo a clientes
 */
export interface AnticipoCliente {
  id?: number;
  titular: Titular;
  fechaAnticipo: string | Date;
  fechaRecepcion: string | Date;
  usuario: Usuario;
  fechaRegistro?: string | Date;
  numeroDoc: string;
  valor: number;
  asiento?: Asiento | null;
  estado: number;
  empresa: Empresa;
  observacion?: string;
}

export interface ConfirmarAnticipoClienteRequest {
  idAnticipo: number;
}
