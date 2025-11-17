import { Empresa } from "../../../shared/model/empresa";


export interface GrupoCaja {
    codigo: number;            // Identificador único del grupo de cajas
    nombre: string;            // Nombre del grupo de cajas
    empresa: Empresa;          // Empresa a la que pertenece el grupo
    fechaIngreso: Date;        // Fecha de ingreso al sistema
    fechaInactivo: Date;       // Fecha de desactivación
    estado: number;            // Estado del grupo (activo/inactivo)
}
