import { Entidad } from "./entidad";
import { Parroquia } from "./parroquia";
import { Ciudad } from "./ciudad";

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
    callePrincipal: string;   // DRCCCLPR - Calle principal
    calleSecundaria: string;  // DRCCCLSC - Calle secundaria
    numero: string;           // DRCCNMRO - Número de domicilio
    /** DRCCBRRO - Barrio / Sector, hasta 300 (opcional; Anexo I). */
    barrio?: string | null;
    /** CDDDCDGO - Ciudad del domicilio (combo; obligatoria al guardar desde la ficha). Al enviar va solo `{ codigo }`. */
    ciudad?: Ciudad | null;
}
