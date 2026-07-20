import { NegociacionProveedor } from './negociacion-proveedor';
import { AdendumNegociacion } from './adendum-negociacion';

// Documento Digitalizado de Negociación — endpoint: /ptng — tabla: PGS.PTNG
export interface PathNegociacion {
  id: number;
  negociacion: Partial<NegociacionProveedor>;
  path: string;
  nombreDoc: string;
  tipoDoc: 'CONTRATO' | 'ADENDUM' | 'ANEXO' | 'OTRO' | string;
  principal: number;        // 1=Documento principal, 0=Complementario
  adendum: Partial<AdendumNegociacion> | null;
}
