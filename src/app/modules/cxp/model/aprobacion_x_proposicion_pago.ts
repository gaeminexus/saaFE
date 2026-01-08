import { Usuario } from "../../../shared/model/usuario";

export interface AprobacionXProposicionPago{
    codigo:number;
    fechaAprobacion:Date;
    nivelAprobacion:number;
    usuarioAprueba: Usuario;
    nombreUsuarioAprueba:String;
    estado: number;
    observacion: String;
      

}