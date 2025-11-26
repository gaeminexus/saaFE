import { Usuario } from "../../../shared/model/usuario";
import { Filial } from "./filial";

export interface CargaArchivo {
    codigo: number;                     // Código
    nombre: string;                     // Nombre del archivo cargado
    fechaCarga: string;                 // Fecha de carga (Timestamp)
    usuarioCarga: Usuario;              // Usuario que cargó
    filial: Filial;                        // Filial (objeto)
    rutaArchivo: string;                // Ruta del archivo en el servidor
    mesAfectacion: number;              // Mes de afectación
    anioAfectacion: number;             // Año de afectación
    totalSaldoActual: number;           // Total Saldo Actual
    totalInteresAnual: number;          // Total Interés Anual
    totalValorSeguro: number;           // Total Valor Seguro
    totalDescontar: number;             // Total Descontar
    totalCapitalDescontado: number;     // Total Capital Descontado
    totalInteresDescontado: number;     // Total Interés Descontado
    totalSeguroDescontado: number;      // Total Seguro Descontado
    totalDescontado: number;            // Total Descontado
    totalCapitalNoDescontado: number;   // Total Capital No Descontado
    totalInteresNoDescontado: number;   // Total Interés No Descontado
    totalDesgravamenNoDescontado: number; // Total Desgravamen No Descontado
    estado: number;                     // Estado del registro
    numeroTransferencia: number;        // Número de Transferencia
    usuarioContabilidadConfirma: Usuario; // Usuario Contabilidad que Confirma
    fechaAutorizacionContabilidad: string; // Fecha de Autorización Contabilidad (Timestamp)
    usuarioAnulacion: Usuario;          // Usuario de Anulación
    motivoAnulacion: string;            // Motivo de Anulación
    fechaAnulacion: string;             // Fecha de Anulación (Timestamp)
}
