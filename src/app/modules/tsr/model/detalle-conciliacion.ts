import { Asiento } from "../../cnt/model/asiento";
import { Periodo } from "../../cnt/model/periodo";
import { Cheque } from "./cheque";
import { Conciliacion } from "./conciliacion";
import { DetalleDeposito } from "./detalle-deposito";

export interface DetalleConciliacion {
    codigo: number;                     // Identificador único del detalle de conciliación
    conciliacion: Conciliacion;         // Conciliación a la que pertenece
    descripcion: string;                // Descripción del movimiento
    asiento: Asiento;                   // Asiento contable relacionado con el movimiento
    valor: number;                      // Valor del movimiento
    conciliado: number;                 // Indica si ha sido conciliado (0 = Sí, 1 = No)
    numeroCheque: number;               // Número de cheque
    rubroTipoMovimientoP: number;       // Rubro 37 - Tipo de movimiento (padre)
    rubroTipoMovimientoH: number;       // Rubro 37 - Tipo de movimiento (hijo)
    estado: number;                     // Estado del movimiento (1 = Activo, 2 = Anulado)
    numeroAsiento: number;              // Número de asiento contable
    fechaRegistro: string;              // Fecha de registro (LocalDateTime → ISO string)
    idMovimiento: number;               // Id del movimiento (ingreso, egreso, etc.)
    cheque: Cheque;                     // Cheque asociado (para egresos)
    detalleDeposito: DetalleDeposito;   // Detalle del depósito (para cobros)
    periodo: Periodo;                   // Periodo contable de la conciliación
    numeroMes: number;                  // Número del mes del movimiento
    numeroAnio: number;                 // Año del movimiento
    rubroOrigenP: number;               // Rubro 41 - Tipo de movimiento (padre)
    rubroOrigenH: number;               // Rubro 41 - Tipo de movimiento (hijo)
}
