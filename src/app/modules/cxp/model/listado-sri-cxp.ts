/**
 * LSRP - Listados SRI (CXP)
 * Tabla equivalente a LSRI pero en el módulo de Cuentas por Pagar
 * Definición de tipos de listados SRI para compras (retenciones, impuestos, etc)
 */
export interface ListadoSriCxp {
  id: number;           // ID único del listado
  tabla: string;        // Nombre de la tabla relacionada (max 100)
  detalle: string;      // Descripción del listado (max 500)
  estado: number;       // Estado: 1 = activo, 2 = inactivo
}
