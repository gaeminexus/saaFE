import { Prestamo } from "./prestamo";
import { TipoRequisitoPrestamo } from "./tipo-requisito-prestamo";

export interface RequisitosPrestamo {
    codigo: number;                           // Código del requisito
    prestamo: Prestamo;                       // Préstamo (objeto)
    tipoRequisito: TipoRequisitoPrestamo;     // Tipo de requisito (objeto)
    validado: number;                         // Validado
    alerta: number;                           // Requiere alerta
    descripcion: string;                      // Descripción
    observacion: string;                      // Observación
    usuarioRegistro: string;                  // Usuario registro
    fechaRegistro: string;                    // Fecha registro (Timestamp)
    estado: number;                           // Estado
}
