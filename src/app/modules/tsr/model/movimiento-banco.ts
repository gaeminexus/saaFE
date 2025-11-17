
import { Conciliacion } from "./conciliacion";
import { Cheque } from "./cheque";
import { CuentaBancaria } from "./cuenta-bancaria";
import { DetalleDeposito } from "./detalle-deposito";
import { Empresa } from "../../../shared/model/empresa";
import { Asiento } from "../../cnt/model/asiento";
import { Periodo } from "../../cnt/model/periodo";


/**
 * Representa un movimiento bancario.
 * Equivalente a la entidad TSR.MVCB en Java.
 * Contiene la información de los movimientos realizados sobre una cuenta bancaria.
 */
export interface MovimientoBanco {
    codigo: number;                   // Identificador único del movimiento bancario
    empresa: Empresa;                 // Empresa a la que pertenece el movimiento
    descripcion: string;              // Descripción del movimiento
    asiento: Asiento;                 // Asiento contable relacionado
    valor: number;                    // Valor del movimiento
    conciliado: number;               // Indica si ha sido conciliado (1 = Sí, 0 = No)
    fechaConciliacion: string;        // Fecha de conciliación (ISO 8601, equiv. a LocalDateTime)
    numeroCheque: number;             // Número de cheque asociado
    conciliacion: Conciliacion;       // Conciliación a la que pertenece el movimiento
    rubroTipoMovimientoP: number;     // Rubro principal del tipo de movimiento
    rubroTipoMovimientoH: number;     // Rubro detalle del tipo de movimiento
    fechaRegistro: string;            // Fecha de registro del movimiento (ISO 8601)
    numeroAsiento: number;            // Número de asiento contable relacionado
    idMovimiento: number;             // Id del movimiento según su tipo (ingreso, egreso, etc.)
    estado: number;                   // Estado del movimiento (0 = Anulado, 1 = Activo)
    cheque: Cheque;                   // Cheque con el que se realizó el pago (para egresos)
    cuentaBancaria: CuentaBancaria;   // Cuenta bancaria donde se realizó el movimiento
    detalleDeposito: DetalleDeposito; // Detalle del depósito (para cobros)
    periodo: Periodo;                 // Periodo contable asociado
    numeroMes: number;                // Número del mes en el que se realiza el movimiento
    numeroAnio: number;               // Número del año en el que se realiza el movimiento
    rubroOrigenP: number;             // Rubro principal del origen del movimiento
    rubroOrigenH: number;             // Rubro detalle del origen del movimiento
}
