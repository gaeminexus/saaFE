import { GrupoProductoCobro } from "./grupo-producto-cobro";

export interface ImpuestoXGrupoCobro {
    codigo: number;                      // Código de la entidad
    grupoProductoCobro: GrupoProductoCobro; // Grupo de producto al que se aplicará el impuesto
    estado: number;                      // Estado del impuesto por grupo. 1 = activo, 2 = inactivo
}
