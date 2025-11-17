import { HistConciliacion } from "./hist-conciliacion";
import { Cheque } from "./cheque";
import { DetalleDeposito } from "./detalle-deposito";
import { Asiento } from "../../cnt/model/asiento";
import { Periodo } from "../../cnt/model/periodo";


export interface HistDetalleConciliacion {
    codigo: number;                      // Identificador único del detalle histórico de conciliación
    histConciliacion: HistConciliacion;  // Conciliación histórica a la que pertenece el registro
    rubroTipoMovimientoP: number;        // Rubro 37. Tipo de movimiento de conciliación (padre)
    rubroTipoMovimientoH: number;        // Rubro 37. Detalle de tipo de movimiento (hijo)
    asiento: Asiento;                    // Asiento contable relacionado con el movimiento
    valor: number;                       // Valor del movimiento
    conciliado: number;                  // Indica si el movimiento está conciliado (0 = Sí, 1 = No)
    numeroCheque: string;                // Número del cheque asociado (si aplica)
    rubroOrigenP: number;                // Rubro 41. Tipo de movimiento de origen (padre)
    rubroOrigenH: number;                // Rubro 41. Detalle de movimiento de origen (hijo)
    estado: number;                      // Estado del movimiento bancario (1 = Activo, 2 = Anulado)
    numeroAsiento: number;               // Número de asiento contable
    descripcion: string;                 // Descripción del movimiento
    fechaRegistro: Date;                 // Fecha de registro del movimiento
    idMovimiento: number;                // Id del movimiento dependiendo del tipo (ingreso, egreso, etc.)
    cheque: Cheque;                      // Cheque con que se realizó el pago (en egresos)
    detalleDeposito: DetalleDeposito;    // Detalle del depósito que generó el movimiento (en cobros)
    periodo: Periodo;                    // Periodo contable en el que se realiza la conciliación
    numeroMes: number;                   // Número del mes del movimiento
    numeroAnio: number;                  // Número del año del movimiento
}
