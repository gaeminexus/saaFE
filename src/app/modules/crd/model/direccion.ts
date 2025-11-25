import { Entidad } from "./entidad";
import { Parroquia } from "./parroquia";

export interface Direccion {
    codigo: number;           // Código
    entidad: Entidad;         // Entidad (objeto)
    parroquia: Parroquia;     // Parroquia (objeto)
    descripcion: string;      // Descripción Dirección
    referencia: string;       // Referencia
    telefono: string;         // Teléfono
    celular: string;          // Celular
    latitud: number;          // Latitud
    longitud: number;         // Longitud
    porDefecto: number;       // Dirección por defecto
    trabajo: number;          // Dirección de trabajo
    usuarioIngreso: string;   // Usuario ingreso
    fechaIngreso: string;     // Fecha ingreso (Timestamp)
    estado: number;           // Estado
}
