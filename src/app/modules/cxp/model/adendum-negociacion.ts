import { NegociacionProveedor } from './negociacion-proveedor';
import { Usuario } from '../../../shared/model/usuario';

// Adendum de Negociación — endpoint: /adng — tabla: PGS.ADNG
export interface AdendumNegociacion {
  id: number;
  negociacion: Partial<NegociacionProveedor>;
  numAdendum: string;
  fechaAdendum: any;        // Java LocalDate → array o string
  descripcion: string;
  valorAjuste: number;      // Positivo = incremento, negativo = reducción
  valorTotalResultante: number;
  observacion: string;
  estado: number;           // 1=Activo, 0=Anulado
  usuario: Partial<Usuario>;
  fechaRegistro: any;
}
