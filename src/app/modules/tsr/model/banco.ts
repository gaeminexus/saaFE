export interface Banco {
    codigo: number;
    nombre: string;
    conciliaDescuadre: number;
    estado: number;
    empresa: number;
    rubroTipoBancoP: number;
    rubroTipoBancoH: number;
    fechaIngreso: Date; // o Date, según cómo manejes las fechas en el frontend
    fechaInactivo: Date; // o Date, según cómo manejes las fechas en el frontend
}
