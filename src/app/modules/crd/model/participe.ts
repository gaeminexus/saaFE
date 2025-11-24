import { Entidad } from "./entidad";
import { TipoParticipe } from "./tipo-participe";

export interface Participe {
    codigo: number;                 // PRTCCDGO - Código
    entidad: Entidad;          // ENTDCDGO - FK Código Entidad
    codigoAlterno: number;          // PRTCCDAL - Código alterno (FL-PART)
    tipoParticipe: TipoParticipe;    // TPPCCDGO - FK Código Tipo Partícipe
    remuneracionUnificada: number;  // PRTCRMUN - Remuneración unificada
    fechaIngresoTrabajo: Date;      // PRTCFCIT - Fecha ingreso trabajo
    lugarTrabajo: string;           // PRTCLGRT - Lugar de trabajo
    unidadAdministrativa: string;   // PRTCUNAD - Unidad Administrativa
    cargoActual: string;            // PRTCCRGA - Cargo actual
    nivelEstudios: string;          // PRTCNVES - Nivel de estudios
    ingresoAdicionalMensual: number; // PRTCIAMM - Ingreso adicional monto mensual
    ingresoAdicionalActividad: string; // PRTCIAAC - Ingreso adicional actividad
    tipoCalificacion: number;   // TPCLCDGO - FK Código Tipo Calificación
    fechaIngresoFondo: Date;          // PRTCFCIF - Fecha ingreso al fondo
    estadoActual: number;             // PRTCESAC - Estado actual
    fechaFallecimiento: Date;         // PRTCFCHF - Fecha fallecimiento
    causaFallecimiento: string;       // PRTCCSFL - Causa de fallecimiento
    motivoSalida: string;             // PRTCMTSL - Motivo de salida
    fechaSalida: Date;                // PRTCFCSL - Fecha de salida
    estadoCesante: number;            // PRTCESCS - Estado cesante
    fechaIngreso: Date;               // PRTCFCIN - Fecha de ingreso
    idEstado: number;                 // PRTCIDST - ID Estado
}

