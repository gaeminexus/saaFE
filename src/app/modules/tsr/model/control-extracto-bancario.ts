import { Empresa } from "../../../shared/model/empresa";
import { Periodo } from "../../cnt/model/periodo";

export interface ControlExtractoBancario {
    codigo: number;              // CTEBCDGO
    empresa: Empresa;            // PJRQCDGO
    periodo: Periodo;            // PRDOCDGO
    mes: number;                 // CTEBMSSS - denormalizado del periodo
    anio: number;                // CTEBANOO - denormalizado del periodo
    fechaVencimiento: string;    // CTEBFVNC (LocalDate → ISO string)
    totalCuentas: number;        // CTEBTOTC - fijado al generar, no se recalcula
    cuentasCargadas: number;     // CTEBCARG
    cuentasConciliadas: number;  // CTEBCONC
    observaciones: string;       // CTEBOBSR
    fechaCreacion: string;       // CTEBFCRG (LocalDateTime → ISO string) - snapshot, no "vivo"
    estado: number;              // CTEBESTD - 1 activo, 0 inactivo
    cerrado?: number;            // CTEBCRRE - 1 = cerrado para conciliacion bancaria (exclusivo TSR)
    usuarioCierre?: string;      // CTEBUSCR - quien cerro (auditoria)
    fechaCierre?: string;        // CTEBFCCR (LocalDateTime → ISO string) - cuando se cerro
}
