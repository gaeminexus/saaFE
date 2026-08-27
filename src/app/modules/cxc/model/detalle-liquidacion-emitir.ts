import { ProductoPago } from '../../cxp/model/producto_pago';
import { LiquidacionEmitir } from './liquidacion-emitir';

/**
 * DECISIÓN DE NEGOCIO (ver docs/logica-negocio/cxc/LIQUIDACION-COMPRA-EMISION.md
 * §2 en saaBE): el producto de cada línea sale del catálogo de CXP
 * (`PGS.PRDP` → cuentas de gasto), NO del de CXC (`CBR.GRPC` → cuentas de
 * ingreso). La liquidación se emite desde CXC pero registra una COMPRA: su
 * asiento es DEBE gasto + DEBE IVA crédito / HABER cuenta por pagar. Esta es
 * la única pantalla de CXC que clasifica contra el catálogo de CXP, y es a
 * propósito — no "corregirlo" de vuelta a ProductoCobro.
 */
export interface DetalleLiquidacionEmitir {
  id: number;
  liquidacion: LiquidacionEmitir;
  descripcion: string;
  cantidad: number;
  valor: number;
  subTotal: number;
  porcentajeIVA: number;
  valorIVA: number;
  porcentajeICE: number;
  valorICE: number;
  subsidio: number;
  precioSinSub: number;
  descuento: number;
  total: number;
  /** Null hasta que el usuario clasifique la línea; sin esto no se puede emitir. */
  producto: ProductoPago | null;
  estado: number;
}
