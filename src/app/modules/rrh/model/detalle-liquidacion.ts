import { Rubro } from '../../../shared/model/rubro';
import { Liquidacion } from './Liquidacion';
export interface DetalleLiquidacion {
  codigo: number;
  liquidacion: Liquidacion;
  rubro: Rubro;
  valor: number;
  descripcion: String;
  fechaRegistro: Date;
  usuarioRegistro: String;
}
