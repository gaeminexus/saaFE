// Clasificación masiva de productos de una carga TXT — §6.4 y §6.5 del
// PLAN-CARGA-AUTOMATICA-SRI. Destraba en un solo viaje los PRODUCTOS_SIN_CLASIFICAR
// que de otro modo bloquean el registro por lote documento por documento.

/** Fila de GET /productosSinClasificarLote/{idCargaTxt} (§6.5). */
export interface ProductoSinClasificar {
  id: number;
  nombre: string;
  codigo: string | null;
  grupoActual: string;
  /** Series de los comprobantes de la carga que usan este producto */
  documentos: string[];
}

export interface ProductosSinClasificarLote {
  idCargaTxt: number;
  productos: ProductoSinClasificar[];
}

/** Una asignación producto → grupo del cuerpo de POST /clasificarProductosLote (§6.4). */
export interface AsignacionGrupo {
  idProducto: number;
  idGrupo: number;
}

export interface ClasificarProductosLotePayload {
  idEmpresa: number;
  asignaciones: AsignacionGrupo[];
}

export interface ResultadoClasificacion {
  actualizados: number;
  /** §6.4 solo muestra el arreglo vacío; se acepta cualquiera de las dos formas plausibles */
  noEncontrados: (number | string)[];
}
