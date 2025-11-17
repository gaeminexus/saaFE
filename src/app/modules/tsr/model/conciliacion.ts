import { Empresa } from "../../../shared/model/empresa";
import { Usuario } from "../../../shared/model/usuario";
import { CuentaBancaria } from "./cuenta-bancaria";

export interface Conciliacion {
    codigo: number;                             // Identificador único de la conciliación
    idPeriodo: number;                          // Id del periodo contable
    usuario: Usuario;                           // Usuario que realiza la conciliación
    fecha: string;                              // Fecha en formato ISO (LocalDateTime)
    cuentaBancaria: CuentaBancaria;             // Cuenta bancaria conciliada
    inicialSistema: number;                     // Saldo inicial según sistema
    depositoSistema: number;                    // Total de depósitos según sistema
    creditoSistema: number;                     // Total de notas de crédito según sistema
    chequeSistema: number;                      // Total de cheques emitidos según sistema
    debitoSistema: number;                      // Total de notas de débito según sistema
    finalSistema: number;                       // Saldo final según sistema
    saldoEstadoCuenta: number;                  // Saldo final según estado de cuenta del banco
    depositoTransito: number;                   // Depósitos en tránsito
    chequeTransito: number;                     // Cheques en tránsito
    creditoTransito: number;                    // Notas de crédito en tránsito
    debitoTransito: number;                     // Notas de débito en tránsito
    saldoBanco: number;                         // Saldo final del banco tras conciliación
    empresa: Empresa;                           // Empresa donde se realiza la conciliación
    rubroEstadoP: number;                       // Rubro principal (estado de conciliación)
    rubroEstadoH: number;                       // Rubro detalle (estado de conciliación)
    transferenciaDebitoTransito: number;        // Transferencias de débito en tránsito
    transferenciaCreditoTransito: number;       // Transferencias de crédito en tránsito
    transferenciaDebitoSistema: number;         // Transferencias de débito según sistema
    transferenciaCreditoSistema: number;        // Transferencias de crédito según sistema
}
