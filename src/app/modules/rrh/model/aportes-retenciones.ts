import { ContratoEmpleado } from "./contrato-empleado";

export interface AporteRetenciones {
    codigo: number;               // Código del adjunto
    contratoEmpleado: ContratoEmpleado;             // Entidad (partícipe)
    tipo: String;         // ID referencia bancaria
    fechaAnexo: Date;           // Préstamo
    detalle: string;    // Solicitud de cambio de aporte
    nuevoSalario: number;     // Tipo de adjunto
    nuevaFechaFin: Date;        // Nombre archivo
    fechaRegistro: Date;           // URL del archivo
    usuarioRegistro: string;          // Observación

}
