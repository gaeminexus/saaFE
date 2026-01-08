import { CuotaXFinanciacionPago } from "./cuota_x_financiacion_pago";

export interface ProposicionPagoXCuota{
    codigo: number;
    cuotaXFinanciacionPago: CuotaXFinanciacionPago;
    valorCuota: number;
    valorPropuesto: number;
    fechaIngreso: Date;
    tipo: number;
    numeroAbono: number;
    estado: number;
    fechaPago: Date;
    nombreUsuario: String;
    aprobacionesRealizadas: number;
    

}