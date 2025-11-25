import { Entidad } from "./entidad";
import { Prestamo } from "./prestamo";
import { TipoAdjunto } from "./tipo-adjunto";

export interface Adjunto {
    codigo: number;               // Código del adjunto
    entidad: Entidad;             // Entidad (partícipe)
    idReferencia: number;         // ID referencia bancaria
    prestamo: Prestamo;           // Préstamo
    idSolicitudCambio: number;    // Solicitud de cambio de aporte
    tipoAdjunto: TipoAdjunto;     // Tipo de adjunto
    nombreArchivo: string;        // Nombre archivo
    urlArchivo: string;           // URL del archivo
    observacion: string;          // Observación
    mimeType: string;             // Mime type
    estado: number;               // Estado
    fechaRegistro: string;        // Fecha registro (Timestamp)
    usuarioRegistro: string;      // Usuario registro
}
