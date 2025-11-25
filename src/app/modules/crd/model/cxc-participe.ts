import { Entidad } from "./entidad";

export interface CxcParticipe {
    codigo: number;          // Código
    entidad: Entidad;        // Entidad (Participe)
    idCliente: number;       // ID Cliente
    idCuenta: number;        // ID Cuenta
    saldoCuenta: number;     // Saldo de la cuenta
    fechaCreacion: string;   // Fecha de creación
}
