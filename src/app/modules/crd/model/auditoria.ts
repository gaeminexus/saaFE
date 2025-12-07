/**
 * Modelo de Auditoría
 * Representa la estructura de datos de auditoría del sistema
 */
export interface Auditoria {
  // Campo 1: NUMBER ADTRCDGO (PK - generado por el backend)
  codigo?: number; // Campo 2: DATE - SYSDATE ADTRFCHA
  fechaEvento: Date | string; // Campo 3: VARCHAR2(50) ADTRSSTM
  sistema: string; // Campo 4: VARCHAR2(100) ADTRMDLO
  modelo: string; // Campo 5: VARCHAR2(50) ADTRACCN
  accion: string; // Campo 6: VARCHAR2(100) ADTRNTDD
  entidadLogica: string; // Campo 7: VARCHAR2(100) ADTRNTID
  registroAfectado: string; // Campo 8: VARCHAR2(100) ADTRUSRO
  usuario: string; // Campo 9: VARCHAR2(100) ADTRRLUS
  rollUsuario: string; // Campo 10: VARCHAR2(45) ADTRIPCL
  ip: string; // Campo 11: VARCHAR2(255) ADTRAGNT
  agente: string; // Campo 12: VARCHAR2(1000) ADTRRSN
  razon: string; // Campo 13: VRCHAR2(100) ADTRNMNA
  nombreAnterior: string; // Campo 14: NUMBER ADTRVLNA
  valorAnterior: number; // Campo 15: VARCHAR2(100) ADTRNMNN
  nombreNuevo: string; // Campo 16: NUMBER ADTRVLNN
  valorNuevo: number; // Campo 17: DATE - SYSDATE ADTRFCIN
  fechaRegistro: Date | string;
}
