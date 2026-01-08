import { TempMontoAprobacion } from "./temp_monto_aprobacion";

export interface TempAprobacionXMonto{
    codigo: number;
    tempMontoAprobacion: TempMontoAprobacion;
    nombreNivel: String;
    estado: number;
    fechaIngreso: Date;
    usuarioIngresa: String;
    ordenAprobacion: number;
    seleccionaBanco: number;
    
}