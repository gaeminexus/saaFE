import { Filial } from "./filial";
import { TipoPrestamo } from "./tipo-prestamo";
import { TipoAdjunto } from "./tipo-adjunto";

export interface DocumentoCredito {
    codigo: number;           // Código
    filial: Filial;           // Filial (objeto)
    tipoPrestamo: TipoPrestamo; // Tipo Préstamo (objeto)
    tipoAdjunto: TipoAdjunto; // Tipo Adjunto (objeto)
    cantidad: number;         // Cantidad
    opcional: number;         // Opcional
    usuarioIngreso: string;   // Usuario de ingreso
    fechaIngreso: string;     // Fecha de ingreso (Timestamp)
    estado: number;           // Estado
}
