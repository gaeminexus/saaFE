import { MontoAprobacion } from "./monto_aprobacion";

export interface AprobacionXMonto{
    codigo:number;
    montoAprobacion:MontoAprobacion;
    nombreNivel: string;
    estado: number;
    fechaIngreso: Date;
    usuarioIngresa: string;
    ordenAprobacion: number;
    seleccionaBanco: number;
    
}