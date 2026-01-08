import { Empresa } from "../../../shared/model/empresa";
import { CentroCosto } from "../../cnt/model/centro-costo";
import { ProductoPago } from "./producto_pago";

export interface TempDetalleDocumentoPago{
    codigo: number;
    empresa: Empresa;
    tempDocumentoPago: TempDetalleDocumentoPago;
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