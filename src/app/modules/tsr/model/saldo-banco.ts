import { Periodo } from "../../cnt/model/periodo";
import { CuentaBancaria } from "./cuenta-bancaria";


export interface SaldoBanco {
    codigo: number;                  // Identificador único del saldo bancario
    cuentaBancaria: CuentaBancaria;  // Cuenta bancaria asociada
    periodo: Periodo;                // Periodo contable al que pertenece el saldo
    numeroMes: number;               // Número de mes del periodo (1-12)
    numeroAnio: number;              // Año del periodo
    saldoAnterior: number;           // Saldo de la cuenta al cierre del periodo anterior
    valorEgreso: number;             // Total egresado en el periodo
    valorIngreso: number;            // Total ingresado en el periodo
    valorND: number;                 // Total de notas de débito del periodo
    valorNC: number;                 // Total de notas de crédito del periodo
    saldoFinal: number;              // Saldo final de la cuenta bancaria
    valorTransferenciaD: number;     // Total de transferencias de débito
    valorTransferenciaC: number;     // Total de transferencias de crédito
}
