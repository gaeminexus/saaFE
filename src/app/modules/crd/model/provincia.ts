import { Pais } from "../../../shared/model/pais";

export interface Provincia {
    codigo: number;          // Código de la provincia
    pais: Pais;              // País (objeto)
    nombre: string;          // Nombre de la provincia
    codigoAlterno: string;   // Código alterno
    codigoExterno: string;   // Código externo
    estado: number;          // Estado
}
