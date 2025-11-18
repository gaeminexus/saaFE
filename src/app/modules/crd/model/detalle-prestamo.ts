import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaz DetallePrestamo
export interface DetallePrestamo {
  codigo: number;               // DTPRCDGO - Código del detalle
  codigoPrestamo?: number;      // PRSTCDGO - ID Préstamo (legacy)
  prestamoId?: number;          // ID del préstamo (campo real del backend)
  numeroCuota: number;          // DTPRNMCT - Número de cuota
  fechaVencimiento: Date;       // DTPRFCVN - Fecha vencimiento
  capital: number;              // DTPRCPTL - Capital
  interes: number;              // DTPRINTR - Interés
  mora: number;                 // DTPRMRAA - Mora
  interesVencido: number;       // DTPRINVN - Interés Vencido
  saldoCapital: number;         // DTPRSLCP - Saldo capital
  saldoInteres: number;         // DTPRSLIN - Saldo Interes
  saldoMora: number;            // DTPRSLMR - Saldo mora
  saldoInteresVencido: number;  // DTPRSLIV - Saldo Interes Vencido
  fechaPagado: Date;            // DTPRFCPG - Fecha pagado
  abono: number;                // DTPRABNO - Abono
  capitalPagado: number;        // DTPRCPPG - Capital Pagado
  interesPagado: number;        // DTPRINPG - Interés Pagado
  desgravamen: number;          // DTPRDSGR - Desgravamen
  cuota: number;                // DTPRCTAA - Cuota
  saldo: number;                // DTPRSLDO - Saldo
  saldoOtros: number;           // DTPRSLOT - Saldo Otros
  desgravamenFirmado: number;   // DTPRDSFR - Desgravamen Firmado
  desgravamenDiferido: number;  // DTPRDSDF - Desgravamen Diferido
  desgravamenOriginal: number;  // DTPRDSOR - Desgravamen original
  valorDiferido: number;        // DTPRVLDF - Valor diferido
  total: number;                // DTPRTTLL - Total
  moraPagado: number;           // DTPRMRPG - Mora pagado
  desgravamenPagado: number;    // DTPRDSPG - Desgravamen Pagado
  interesVendidoPagado: number; // DTPRINVP - Interés vendido pagado
  moraCalculada: number;        // DTPRMRCL - Mora calculada
  diasMora: number;             // DTPRDSMR - Días mora
  estado: number;               // DTPRESTD - Estado
  fechaRegistro: Date;          // DTPRFCRG - Fecha registro
  usuarioRegistro: string;      // DTPRUSRG - Usuario registro
  idEstado: number;             // DTPRIDST - ID Estado
  codigoExterno: number;        // DTPRCDEX - Código externo
  otrosSeguros: number;         // DTPROTSG - Otros seguros
  totalConSeguro: number;       // DTPRTTCS - Total con seguro
}
