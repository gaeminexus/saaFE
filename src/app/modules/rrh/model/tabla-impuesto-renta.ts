import { Empresa } from '../../../shared/model/empresa';

/**
 * Tramo de la tabla del impuesto a la renta. Tabla `RHH.TBIR`.
 *
 * Un registro por año fiscal y tramo. El impuesto de un tramo es
 * `impuestoFraccionBasica + (base - fraccionBasica) * porcentaje`.
 * El último tramo lleva `excesoHasta` en nulo: no tiene límite superior.
 */
export interface TablaImpuestoRenta {
  codigo: number; // TBIRCDGO
  empresa: Empresa | null; // PJRQCDGO
  anio: number; // TBIRANOO
  orden: number; // TBIRORDN - orden ascendente del tramo
  fraccionBasica: number; // TBIRFRBS
  excesoHasta: number | null; // TBIREXCS - nulo en el último tramo
  impuestoFraccionBasica: number; // TBIRIMFB
  porcentaje: number; // TBIRPRCN - % sobre la fracción excedente
  estado: number; // TBIRESTD
  fechaRegistro?: Date; // TBIRFCHR
  usuarioRegistro?: string; // TBIRUSRR
}
