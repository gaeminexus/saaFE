import { Empresa } from "../../../shared/model/empresa";
import { CentroCosto } from "../../cnt/model/centro-costo";
import { DocumentoCobro } from "./documento-cobro";
import { ProductoCobro } from "./producto-cobro";


export interface DetalleDocumentoCobro {
    codigo: number;                  // Código de la entidad
    empresa: Empresa;                // Empresa a la que pertenece el detalle de documento
    documentoCobro: DocumentoCobro;  // Documento al que pertenece el detalle
    productoCobro: ProductoCobro;    // Producto incluido en el detalle tomado de la tabla de productos
    descripcion: string;             // Descripción del detalle
    cantidad: number;                // Cantidad de productos incluidos en el detalle
    precioUnitario: number;          // Precio unitario del producto
    subtotal: number;                // Subtotal = cantidad por precio unitario
    totalImpuesto: number;           // Total de impuestos que se aplican al producto
    total: number;                   // Total = subtotal más impuestos
    centroCosto: CentroCosto;        // Centro de costo que se aplica en caso de que maneje centro de costo
    numeroLinea: number;             // Número de línea de este detalle dentro del documento
    estado: number;                  // Estado del detalle de documento. 1 = activo, 2 = anulado
    fechaIngreso: string;            // Fecha de ingreso (Timestamp)
}
