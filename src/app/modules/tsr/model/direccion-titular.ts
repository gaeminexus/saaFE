import { Titular } from './titular';

export interface DireccionTitular {
  codigo: number; // Identificador único de la dirección de la persona
  persona: Titular; // Persona a la que pertenece la dirección
  rubroTipoDireccionP: number; // Rubro padre (tipo de dirección)
  rubroTipoDireccionH: number; // Rubro hijo (detalle del tipo de dirección)
  ubicacion: string; // Ubicación de la dirección (detalle de calle y numeración)
  principal: number; // Indica si es dirección principal (1 = Principal, 0 = No principal)
}
