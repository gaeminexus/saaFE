import { Empresa } from "../../../shared/model/empresa";
import { GrupoProductoPago } from "./grupo_producto_pago";

export interface ProductoPago{
    codigo: number;
    empresa: Empresa;
    nombre:String;
    aplicaIVA: number;
    aplicaRetencion: number;
    estado: number;
    fechaIngreso: Date;
    nivel: number;
    idPadre: number;
    grupoProductoPago: GrupoProductoPago;
    porcentajeBaseRetencion: number;
    fechaAnulacion: Date;
    numero: String;
    tipoNivel: number;


}
