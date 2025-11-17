import { Jerarquia } from './jerarquia';

export interface Empresa {
  codigo: number;
  jerarquia: Jerarquia;
  nombre: string;
  nivel: number;
  codigoPadre: number;
  ingresado: number;
}