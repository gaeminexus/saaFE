
import { Empresa } from "../../../shared/model/empresa";
import { GrupoProductoCobro } from "./grupo-producto-cobro";

export interface ProductoCobro {
    codigo: number;                      // Código de la entidad
    empresa: Empresa;                    // Empresa a la que pertenece el grupo de producto
    nombre: string;                      // Nombre del grupo de productos
    aplicaIVA: number;                   // Aplica IVA. 1 = sí, 0 = no
    aplicaRetencion: number;             // Aplica retención. 1 = sí, 0 = no
    estado: number;                      // Estado: 1 = activo, 2 = inactivo
    fechaIngreso: string;                // Fecha de ingreso (Timestamp)
    nivel: number;                       // Nivel del producto en el árbol
    idPadre: number;                     // Código del padre del producto. Tomado del id de esta misma entidad
    grupoProductoCobro: GrupoProductoCobro; // Grupo de producto de pagos al que pertenece
    porcentajeBaseRetencion: number;     // Porcentaje de la base para la retención. Usualmente 100%. Para productos de seguros puede ser 10%
    fechaAnulacion: string;              // Fecha de anulación (Timestamp)
    numero: string;                      // Número que identifica al producto en el árbol
    tipoNivel: number;                   // Tipo de producto dependiendo del nivel que ocupa: acumulación o movimiento
}
