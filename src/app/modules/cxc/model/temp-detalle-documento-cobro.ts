
import { TempDocumentoCobro } from "./temp-documento-cobro";
import { ProductoCobro } from "./producto-cobro";
import { Empresa } from "../../../shared/model/empresa";
import { CentroCosto } from "../../cnt/model/centro-costo";


export interface TempDetalleDocumentoCobro {
    codigo: number;                      // Código de la entidad
    empresa: Empresa;                    // Empresa a la que pertenece el detalle del documento
    tempDocumentoCobro: TempDocumentoCobro; // Documento al que pertenece el detalle
    productoCobro: ProductoCobro;        // Producto incluido en el detalle
    descripcion: string;                 // Descripción del detalle
    cantidad: number;                    // Cantidad del producto incluido
    precioUnitario: number;              // Precio unitario del producto
    subtotal: number;                    // Subtotal = cantidad * precio unitario
    totalImpuesto: number;               // Total de impuestos aplicados
    total: number;                       // Total = subtotal + impuestos
    centroCosto: CentroCosto;            // Centro de costo aplicado
    numeroLinea: number;                 // Número de línea dentro del documento
    estado: number;                      // Estado del detalle. 1 = activo, 2 = anulado
    fechaIngreso: string;                // Fecha de ingreso del detalle (Timestamp)
}
