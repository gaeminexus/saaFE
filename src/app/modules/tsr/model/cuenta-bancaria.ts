import { PlanCuenta } from "../../cnt/model/plan-cuenta";
import { Banco } from "./banco";


export interface CuentaBancaria {
    codigo: number;                    // Identificador único de la cuenta bancaria
    banco: Banco;                      // Banco al que pertenece la cuenta
    numeroCuenta: string;              // Número de cuenta bancaria
    rubroTipoCuentaP: number;          // Rubro principal del tipo de cuenta
    rubroTipoCuentaH: number;          // Rubro detalle del tipo de cuenta
    saldoInicial: number;              // Saldo inicial de la cuenta
    planCuenta: PlanCuenta;            // Plan de cuenta contable asociado
    fechaCreacion: string;             // Fecha de creación (LocalDateTime → ISO string)
    titular: string;                   // Titular de la cuenta
    rubroTipoMonedaP: number;          // Rubro principal del tipo de moneda
    rubroTipoMonedaH: number;          // Rubro detalle del tipo de moneda
    oficialCuenta: string;             // Oficial responsable de la cuenta
    telefono1: string;                 // Teléfono 1 de contacto
    telefono2: string;                 // Teléfono 2 de contacto
    celular: string;                   // Celular de contacto
    fax: string;                       // Número de fax
    email: string;                     // Correo electrónico de contacto
    direccion: string;                 // Dirección de la cuenta o del banco
    observacion: string;               // Observaciones generales
    estado: number;                    // Estado de la cuenta (activa/inactiva)
    fechaIngreso: string;              // Fecha de ingreso (LocalDateTime → ISO string)
    fechaInactivo: string;             // Fecha en que fue inactivada (LocalDateTime → ISO string)
    cuentaApertura: PlanCuenta;        // Cuenta contable usada en la apertura
}
