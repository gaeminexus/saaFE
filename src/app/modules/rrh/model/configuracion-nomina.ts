import { Empresa } from '../../../shared/model/empresa';

/**
 * Configuración de nómina de la empresa. Tabla `RHH.CFNM`. Un único registro por empresa.
 *
 * Guarda los códigos alternos de las plantillas y tipos de asiento contable, y las banderas de
 * funcionalidad. Los códigos de asiento no se escriben como literales en ningún lado: salen
 * de aquí.
 */
export interface ConfiguracionNomina {
  codigo: number; // CFNMCDGO
  empresa: Empresa | null; // PJRQCDGO

  // Plantillas contables (código alterno de CNT.PLNS)
  plantillaRol: number | null; // CFNMPLRL
  plantillaProvision: number | null; // CFNMPLPR
  plantillaPago: number | null; // CFNMPLPG
  plantillaLiquidacion: number | null; // CFNMPLLQ

  // Tipos de asiento (código alterno de CNT.PLNT)
  tipoAsientoRol: number | null; // CFNMTARL
  tipoAsientoProvision: number | null; // CFNMTAPR
  tipoAsientoPago: number | null; // CFNMTAPG
  tipoAsientoLiquidacion: number | null; // CFNMTALQ

  // Banderas de funcionalidad
  desglosaCentroCosto: string; // CFNMDCCS - 'S' / 'N'
  aplicaUtilidades: string; // CFNMAPUT - 'S' / 'N'
  aplicaJubilacionPatronal: string; // CFNMAPJP - 'S' / 'N'
  aplicaDesahucio: string; // CFNMAPDS - 'S' / 'N'
  redondeaRenglon: string; // CFNMRDND - 'S' / 'N'
  toleranciaCuadre: number | null; // CFNMTLCD - descuadre máximo que se ajusta solo

  estado: number; // CFNMESTD
  fechaRegistro?: Date; // CFNMFCHR
  usuarioRegistro?: string; // CFNMUSRR
}
