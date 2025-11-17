
import { Empresa } from "../../../shared/model/empresa";
import { Usuario } from "../../../shared/model/usuario";
import { CuentaBancaria } from "./cuenta-bancaria";

export interface HistConciliacion {
    codigo: number;                          // Identificador único de la conciliación histórica
    idPeriodo: number;                       // Id del periodo contable de la conciliación
    usuario: Usuario;                        // Usuario que realiza la conciliación
    fecha: Date;                             // Fecha de la conciliación
    estado: number;                          // Estado de la conciliación histórica
    cuentaBancaria: CuentaBancaria;          // Cuenta bancaria conciliada
    inicialSistema: number;                  // Saldo inicial según el sistema
    depositoSistema: number;                 // Total de depósitos según el sistema
    creditoSistema: number;                  // Total de notas de crédito según el sistema
    chequeSistema: number;                   // Total de cheques emitidos según el sistema
    debitoSistema: number;                   // Total de notas de débito según el sistema
    finalSistema: number;                    // Saldo final según el sistema
    saldoEstadoCuenta: number;               // Saldo final según el estado de cuenta del banco
    depositoTransito: number;                // Total de depósitos en tránsito
    chequeTransito: number;                  // Total de cheques en tránsito
    creditoTransito: number;                 // Total de notas de crédito en tránsito
    debitoTransito: number;                  // Total de notas de débito en tránsito
    saldoBanco: number;                      // Saldo final del banco luego de la conciliación
    empresa: Empresa;                        // Empresa en la que se realiza la conciliación
    transferenciaDebitoTransito: number;     // Total de transferencias de débito en tránsito
    transferenciaCreditoTransito: number;    // Total de transferencias de crédito en tránsito
    transferenciaDebitoSistema: number;      // Total de transferencias de débito según el sistema
    transferenciaCreditoSistema: number;     // Total de transferencias de crédito según el sistema
    idConciliacionOrigen: number;            // Id de la conciliación que origina el respaldo
}
