export interface OpcionSri { codigo: string; descripcion: string; }

/** Tabla 6 — Tipo de identificación */
export const SRI_TIPO_IDENTIFICACION: OpcionSri[] = [
  { codigo: '04', descripcion: 'RUC' },
  { codigo: '05', descripcion: 'Cédula' },
  { codigo: '06', descripcion: 'Pasaporte' },
  { codigo: '08', descripcion: 'Identificación del exterior' },
];

/** Tabla 26 — Tipo de proveedor del reembolso */
export const SRI_TIPO_PROVEEDOR_REEMBOLSO: OpcionSri[] = [
  { codigo: '01', descripcion: 'Persona natural' },
  { codigo: '02', descripcion: 'Sociedad' },
];

/** Tabla 3 — Tipos de documento sustento más comunes (ampliable) */
export const SRI_TIPO_DOC_SUSTENTO: OpcionSri[] = [
  { codigo: '01', descripcion: 'Factura' },
  { codigo: '03', descripcion: 'Liquidación de compra de bienes o prestación de servicios' },
  { codigo: '04', descripcion: 'Nota de crédito' },
  { codigo: '05', descripcion: 'Nota de débito' },
  { codigo: '08', descripcion: 'Entradas a espectáculos públicos' },
  { codigo: '09', descripcion: 'Tiquetes de máquinas registradoras' },
  { codigo: '11', descripcion: 'Pasajes expedidos por empresas de aviación' },
  { codigo: '12', descripcion: 'Documentos emitidos por instituciones financieras' },
  { codigo: '20', descripcion: 'Documentos emitidos por entidades del Estado' },
  { codigo: '21', descripcion: 'Carta de porte aéreo' },
  { codigo: '41', descripcion: 'Comprobante de venta emitido por reembolso' },
];

/** Tarifas de IVA vigentes para el combo del diálogo */
export const TARIFAS_IVA: number[] = [15, 12, 8, 5];
