import { Filial } from "./filial";
import { TipoPrestamo } from "./tipo-prestamo";

// Interfaz para la tabla Producto (PRDC)
export interface Producto {
    codigo: number;              // PRDCCDGO - Código
    codigoSBS: string;           // PRDCCSPB - Código Superintendencia de bancos SBS
    nombre: string;             // PRDCNMBR - Nombre (opcional)
    filial: Filial;       // FLLLCDGO - FK Código Filial (opcional)
    tipoPrestamo: TipoPrestamo; // TPPRCDGO - FK Código Tipo Préstamo (opcional)
    codigoExterno: number;      // PRDCCDEX - Código externo (opcional)
    fechaRegistro: Date;        // PRDCFCRG - Fecha registro (opcional)
    usuarioRegistro: string;    // PRDCUSRG - Usuario registro (opcional)
    ipRegistro: string;         // PRDCIPRG - IP registro (opcional)
    fechaModificacion: Date;    // PRDCFCMD - Fecha modificación (opcional)
    usuarioModificacion: string;// PRDCUSMD - Usuario modificación (opcional)
    ipModificacion: string;     // PRDCIPMD - IP modificación (opcional)
    estado: number;              // PRDCESTD - Estado
    codigoPetro: string;        // PRDCCDPTR - Código Petro
}
