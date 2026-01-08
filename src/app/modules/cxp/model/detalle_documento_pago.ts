import { Empresa } from "../../../shared/model/empresa";
import { CentroCosto } from "../../cnt/model/centro-costo";
import { DocumentoPago } from "./documento_pago";
import { ProductoPago } from "./producto_pago";

export interface DetalleDocumentoPago{
    codigo: number;
    empresa: Empresa;
    documentoPago:DocumentoPago;
    productoPago: ProductoPago;
    descripcion: String;
    cantidad: number;
    precioUnitario: number;
    subtotal: number;
    totalImpuesto: number;
    total: number; 
    centroCosto: CentroCosto;
    numeroLinea: number;
    estado: number;
    fechaIngreso: Date;
    
}