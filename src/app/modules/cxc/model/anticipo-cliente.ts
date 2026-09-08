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

/** Un cruce contra factura que quedaría revertido si se confirma la anulación. */
export interface CruceAnticipoCliente {
  idAplicacion: number;
  idFactura: number;
  numeroFactura: string;
  montoAplicado: number;
  fechaAplicacion: string;
}

/** Respuesta de `GET /antc/verificarAnulacion/{id}` — qué pasaría si se anula este anticipo. */
export interface VerificarAnulacionAnticipoResponse {
  puedeAnular: boolean;
  requiereConfirmacion: boolean;
  valorAnticipo: number;
  saldoDisponible: number;
  montoACruzar: number;
  cruces: CruceAnticipoCliente[];
  mensaje?: string;
}

export interface AnularAnticipoClienteRequest {
  motivo: string;
  idUsuario: number;
  /** Solo hace falta en true cuando `verificarAnulacion` devolvió cruces contra factura. */
  confirmarReversionCruces?: boolean;
}
