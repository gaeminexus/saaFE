import { PlanCuenta } from './plan-cuenta';
import { Plantilla } from './plantilla';


export interface DetallePlantilla {
    codigo: number;
    plantilla: Plantilla;
		planCuenta: PlanCuenta;
		descripcion: string;
		movimiento: number;
		fechaDesde: Date;
		fechaHasta: Date;
		auxiliar1:  number;
		auxiliar2:  number;
		auxiliar3:  number;
		auxiliar4 :  number;
		auxiliar5 :  number;
		estado: number;
		fechaInactivo: Date;
}
