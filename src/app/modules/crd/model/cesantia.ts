import { TipoCesantia } from "./tipo-cesantia";
import { Entidad } from "./entidad";

export interface Cesantia {
    codigo: number;               // Código
    tipoCesantia: TipoCesantia;   // Tipo Cesantía (FK)
    entidad: Entidad;             // Entidad (Participe)
    fecha: string;                // Fecha
    idSolicitante: number;        // ID Solicitante
    fechaLiquidacion: string;     // Fecha de liquidación
    fechaSalida: string;          // Fecha salida
    esFallecido: number;          // Es fallecido
    aplicaDesgravamen: number;    // Aplica desgravamen
    totalIngresos: number;        // Total ingresos
    totalEgresos: number;         // Total egresos
    saldoPagar: number;           // Saldo a pagar
    saldoCobrar: number;          // Saldo a cobrar
    fechaRegistro: string;        // Fecha registro
    usuarioRegistro: string;      // Usuario registro
    estadoId: number;             // ID Estado
    estado: number;               // Estado
    valorDescontado: number;      // Valor descontado
    valorPagado: number;          // Valor pagado
    fechaEntregaCheque: string;   // Fecha entrega cheque
}
