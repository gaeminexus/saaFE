
import { Empresa } from "../../../shared/model/empresa";
import { GrupoProductoCobro } from "./grupo-producto-cobro";

export interface ProductoCobro {
    id: number;
    empresa: Empresa;
    grupoProducto: GrupoProductoCobro;
    nombre: string;
    codigo: string;
    codigoAux: string;
    precioUnitario: number;
    descuento: number;
    tipoDescuento: number;  // 0 - Valor, 1 - Porcentaje
    incluyeIVA: number;     // 0/1
    tipoIVA: number;
    tipoICE: number;
    ice: number;
    descripcion: string;
    subsidio: number;
    precioSinSub: number;
    irbpnr: number;
    multiPrecio: number;    // 0=NO, 1=SI
    stock: number;
    manejaUnidad: number;
    unidad: number;
    estado: number;
}
