import { MotivoPrestamo } from './motivo-prestamo';
import { Entidad } from "./entidad";
import { EstadoPrestamo } from "./estado-prestamo";
import { Filial } from "./filial";
import { Producto } from "./producto";

// Interfaz para la tabla Prestamo (PRST)
export interface Prestamo {
    codigo: number;             // PRSTCDGO - Código
    idAsoprep: number;         // PRSTIDAS - Id prestamo del sistema de ASOPREP
    entidad: Entidad;     // ENTDCDGO - ID de la Entidad
    producto: Producto;    // PRDCCDGO - FK - Código Producto
    tipoAmortizacion: number;  // PRSTTPAM - Tipo Amortización
    amortizacion: string;      // PRSTAMRT - Amortización
    fecha: Date;               // PRSTFCHA - Fecha
    fechaInicio: Date;         // PRSTFCIN - Fecha Inicio
    fechaFin: Date;             // PRSTFCFN - Fecha Fin (no nulo)
    interesNominal: number;    // PRSTINNM - Interés Nominal
    montoSolicitado: number;   // PRSTMNSL - Monto Solicitado
    valorCuota: number;        // PRSTVLCT - Valor Cuota
    plazo: number;              // PRSTPLZO - Plazo (no nulo)
    montoLiquidacion: number;  // PRSTMNLD - Monto Liquidacion deuda
    filial: Filial;      // FLLLCDGO - Filial codigo
    estadoPrestamo: EstadoPrestamo; // ESPSCDGO - FK - Código Estado Préstamo
    tasa: number;              // PRSTTSAA - Tasa
    totalPagado: number;       // PRSTTTPG - Total Pagado
    totalCapital: number;      // PRSTTTCP - Total Capital
    totalInteres: number;      // PRSTTTIN - Total Interes
    totalMora: number;         // PRSTTTMR - Total Mora
    totalInteresVencido: number; // PRSTTTIV - Total Interes vencido
    totalSeguros: number;      // PRSTTTSG - Total Seguros
    totalPrestamo: number;     // PRSTTTPR - Total Prestamo
    saldoPorVencer: number;    // PRSTSLXV - Saldo por vencer
    saldoVencido: number;      // PRSTSLVN - Saldo Vencido
    saldoTotal: number;        // PRSTSLTT - Saldo Total
    fechaRegistro: Date;       // PRSTFCRG - Fecha registro
    usuarioRegistro: string;   // PRSTUSRG - Usuario registro
    fechaModificacion: Date;   // PRSTFCMD - Fecha modificación
    usuarioModificacion: string; // PRSTUSMD - Usuario modificación
    observacion: string;       // PRSTOBSR - Observación
    motivoPrestamo: MotivoPrestamo;  // MTVPCDGO - Id Motivo Prestamo
    estadoOperacion: number;   // PRSTESOP - Estado operacion
    tasaNominal: number;       // PRSTTSNM - Tasa Nominal
    tasaEfectiva: number;      // PRSTTSEF - Tasa Efectiva
    esNovacion: number;        // PRSTESNV - Indica si el prestamo es una novacion
    reprocesado: number;    // PRSTRPRC - Indica si el prestamo fue reprocesado
    reestructurado: number; // PRSTRSTR - Indica si el prestamo fue reestructurado
    refinanciado: number;   // PRSTRFNN - Indica si el prestamo fue Refinanciado
    saldoCapital: number;      // PRSTSLCP - Saldo Capital
    saldoOtros: number;        // PRSTSLOT - Saldo Otros
    saldoInteres: number;      // PRSTSLIN - Saldo Interes
    moraCalculada: number;     // PRSTMRCL - Mora Calculada
    diasVencido: number;       // PRSTDSVN - Días vencido
    montoNovacion: number;     // PRSTMNNV - Monto Novacion
    interesVariable: number;   // PRSTINVR - Interés Variable
    usuarioAprobacion: string; // PRSTUSAP - Usuario aprobación
    fechaAprobacion: Date;     // PRSTFCAP - Fecha de aprobación
    fechaAdjudicacion: Date;   // PRSTFCAD - Fecha de Adjudicacion
    usuarioRechazo: string;    // PRSTUSRC - Usuario Rechazo
    fechaRechazo: Date;        // PRSTFCRC - Fecha de rechazo
    usuarioLegalizacion: string; // PRSTUSLG - Usuario Legalizacion
    fechaLegalizacion: Date;   // PRSTFCLG - Fecha de legalización
    usuarioAcreditacion: string; // PRSTUSAC - Usuario Acreditacion
    fechaAcreditacion: Date;   // PRSTFCAC - Fecha de Acreditacion
    ajusteAportes: number; // PRSTAJAP - Indica si hubo Ajuste aportes
    mesesACobrar: number;      // PRSTMSCB - Meses a cobrar
    estado: number;          // PRSTIDST - ID Estado
    firmadoTitular: number;    // PRSTFRTT - Indica si fue Firmado Titular
}
