import { Periodo } from "../../cnt/model/periodo";
import { Entidad } from "./entidad";
import { Prestamo } from "./prestamo";

export interface PerfilEconomico {
    codigo: number;
    entidad: Entidad;
    salarioFijo: number;
    salarioVariable: number;
    origenOtrosIngresos: string;
    otrosIngresos: number;
    totalIngresos: number;
    gastosMensuales: number;
    totalBienes: number;
    totalVehiculos: number;
    totalOtrosActivos: number;
    totalActivos: number;
    totalDeudas: number;
    patrimonioNeto: number;
    fechaActualizacion: string;
    fechaRegistro: string;
    usuarioRegistro: string;
    estado: number;
    fechaIngresoTrabajo: string;
    fechaRegistroTrabajo: string;
    salarioNeto: number;
    periodo: Periodo;
    prestamo: Prestamo;
}
