import { Empresa } from '../../../shared/model/empresa';
import { Titular } from '../../tsr/model/titular';
import { Usuario } from '../../../shared/model/usuario';

// Negociación con Proveedor — endpoint: /ngcp — tabla: PGS.NGCP
export interface NegociacionProveedor {
  id: number;
  empresa: Empresa;
  titular: Titular;
  fechaNegociacion: any;   // Java LocalDateTime → array o string
  fechaInicio: any;
  fechaFin: any;
  numContrato: string;
  descripcion: string;
  valorTotal: number;
  tipoFinanciacion: 'FIJO' | 'HITO' | 'PORCENTAJE' | 'UNICO' | string;
  numeroPagos: number;
  observacion: string;
  estado: number;           // 1=Activa, 0=Inactiva, 2=Suspendida
  usuario: Partial<Usuario>;
  fechaRegistro: any;
  usuarioModif: Partial<Usuario> | null;
  fechaModif: any;
}
