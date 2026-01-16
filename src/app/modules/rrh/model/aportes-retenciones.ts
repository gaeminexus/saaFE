import { Contrato } from "./contrato";

export interface AporteRetenciones {
    codigo: number;               // Código del adjunto
    contrato: Contrato;             // Entidad (partícipe)
    tipo: String;         // ID referencia bancaria
    fechaAnexo: Date;           // Préstamo
    detalle: string;    // Solicitud de cambio de aporte
    nuevoSalario: number;     // Tipo de adjunto
    nuevaFechaFin: Date;        // Nombre archivo
    fechaRegistro: Date;           // URL del archivo
    usuarioRegistro: string;          // Observación

}
