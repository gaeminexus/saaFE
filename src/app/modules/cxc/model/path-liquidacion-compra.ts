import { LiquidacionEmitir } from './liquidacion-emitir';

/**
 * PathLiquidacionCompra — CBR.PTLC. Rutas de archivos generados para una
 * liquidación (XML sin firmar/firmado, RIDE). `alterno` distingue el tipo de
 * archivo cuando hay más de una ruta por liquidación (mismo criterio que
 * usan los Path de otros documentos electrónicos de este proyecto).
 */
export interface PathLiquidacionCompra {
  id: number;
  liquidacion?: LiquidacionEmitir;
  path: string;
  alterno?: number | null;
}
