import { Periodo } from "../../cnt/model/periodo";
import { Empresa } from "../../../shared/model/empresa";
import { CuentaBancaria } from "./cuenta-bancaria";

export interface ExtractoBancario {
    codigo: number;                  // EXBCCDGO
    cuentaBancaria: CuentaBancaria;  // CNBCCDGO
    empresa: Empresa;                // PJRQCDGO
    periodo: Periodo;                // PRDOCDGO - periodo contable elegido por el usuario al cargar
    archivoNombre: string;           // EXBCARCH
    archivoHash: string;             // EXBCHASH - SHA-256 del archivo origen
    formato: string;                 // EXBCFRMT - XLS/XLSX/PDF/CSV
    parser: string;                  // EXBCPRSR - parser/adaptador usado
    fechaDesde: string;              // EXBCFDSD (LocalDate → ISO string)
    fechaHasta: string;              // EXBCFHST (LocalDate → ISO string)
    saldoInicial: number;            // EXBCSLIN
    saldoFinal: number;              // EXBCSLFN
    estadoCarga: number;             // EXBCESTP - rubro 172: 0=Raiz,1=Cargado,2=Validado,3=Aplicado,4=Error
    observaciones: string;           // EXBCOBSR
    fechaCreacion: string;           // EXBCFCRG (LocalDateTime → ISO string)
    usuarioCreacion: string;         // EXBCUSAR - quien cargo el archivo
    estado: number;                  // EXBCESTD - 1 activo, 0 inactivo
}

/**
 * Estados de carga de un extracto bancario (rubro 172 - ASPEstadoCargaExtracto).
 */
export enum EstadoCargaExtracto {
    RAIZ = 0,
    CARGADO = 1,
    VALIDADO = 2,
    APLICADO = 3,
    ERROR = 4,
}
