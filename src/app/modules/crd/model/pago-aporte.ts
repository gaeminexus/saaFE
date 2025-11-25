import { Filial } from "./filial";
import { Aporte } from "./aporte";

export interface PagoAporte {
    codigo: number;
    filial: Filial;
    aporte: Aporte;
    valor: number;
    fechaContable: string;
    numeroAsiento: number;
    concepto: string;
    fechaRegistro: string;
    usuarioRegistro: string;
    estado: number;
}
