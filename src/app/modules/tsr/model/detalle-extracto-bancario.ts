import { Periodo } from "../../cnt/model/periodo";
import { CuentaBancaria } from "./cuenta-bancaria";
import { ExtractoBancario } from "./extracto-bancario";

export interface DetalleExtractoBancario {
    codigo: number;                    // DEXBCDGO
    extractoBancario: ExtractoBancario; // EXBCCDGO
    cuentaBancaria: CuentaBancaria;     // CNBCCDGO (denormalizado)
    periodo: Periodo;                  // PRDOCDGO (denormalizado desde ExtractoBancario)
    fechaTransaccion: string;          // DEXBFTRN (LocalDate → ISO string)
    fechaContable: string;             // DEXBFCNT (LocalDate → ISO string, nullable)
    descripcion: string;               // DEXBDSCR
    referencia: string;                // DEXBREFR
    codigoMovimiento: string;          // DEXBCDMV - codigo tal cual lo reporta el banco
    debito: number;                    // DEXBDBTO
    credito: number;                   // DEXBCRDT
    saldo: number;                     // DEXBSLDO
    hash: string;                      // DEXBHASH - hash de deduplicacion
    numeroFila: number;                // DEXBNFIL - numero de fila en el archivo origen
    filaCruda: string;                 // DEXBCRDO - fila cruda tal como fue extraida (CLOB, auditoria)
    movimientoConciliado: number;      // DEXBCNCL - FK a MovimientoBanco, nullable
    estadoRevision: number;            // DEXBESTR - rubro 173: 1=Pendiente,2=Conciliada,3=Descartada
    fechaCreacion: string;             // DEXBFCRG (LocalDateTime → ISO string)
    usuarioCreacion: string;           // DEXBUSAR
    estado: number;                    // DEXBESTD - 1 activo, 0 inactivo
}

/**
 * Estados de revision de una fila de detalle (rubro 173 - ASPEstadoRevisionExtracto).
 */
export enum EstadoRevisionExtracto {
    PENDIENTE_REVISION = 1,
    CONCILIADA = 2,
    DESCARTADA = 3,
}
