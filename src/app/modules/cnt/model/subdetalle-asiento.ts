import { DetalleAsiento } from './detalle-asiento';

export interface SubdetalleAsiento {
    /** SDASCDGO — Llave Primaria */
    codigo: number;
    /** DTASCDGO — FK hacia DetalleAsiento */
    detalleAsiento: DetalleAsiento;
    /** SDASCDAC — Código de Activo Fijo */
    codigoActivo: string;
    /** SDASNMBR — Nombre del Bien */
    nombreBien: string;
    /** SDASCTGR — Categoría del activo */
    categoria: string;
    /** SDASTIPO — Tipo de activo */
    tipo: string;
    /** SDASFCAD — Fecha de Adquisición (LocalDate → array o string desde backend) */
    fechaAdquisicion: any;
    /** SDASCSAD — Costo de Adquisición */
    costoAdquisicion: number;
    /** SDASMJCP — Mejoras Capitalizadas */
    mejorasCapitalizadas: number;
    /** SDASVLRS — Valor Residual */
    valorResidual: number;
    /** SDASBSDP — Base a Depreciar */
    baseDepreciar: number;
    /** SDASVTMS — Vida Útil Total (Meses) */
    vidaUtilTotal: number;
    /** SDASVRMS — Vida Útil Remanente (Meses) */
    vidaUtilRemanente: number;
    /** SDASPRDP — Porcentaje Depreciación Anual % */
    porcentajeDepreciacion: number;
    /** SDASCTDP — Cuota Depreciación Mensual */
    cuotaDepreciacion: number;
    /** SDASDPAC — Depreciación Acumulada */
    depreciacionAcumulada: number;
    /** SDASVLNL — Valor Neto en Libros */
    valorNetoLibros: number;
    /** SDASUBGN — Ubicación General */
    ubicacionGeneral: string;
    /** SDASUBES — Ubicación Específica */
    ubicacionEspecifica: string;
    /** SDASRSPN — Responsable (Custodio) */
    responsable: string;
    /** SDASESTF — Estado Físico */
    estadoFisico: string;
    /** SDASFACT — No. de Factura / Proveedor */
    factura: string;
    /** SDASOBSR — Observaciones */
    observaciones: string;
}
