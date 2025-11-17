export interface Banco {
    codigo: number;
    nombre: string;
    sigla: string;
    tipo: number;
    estado: number;
    fechaIngreso: string; // o Date, según cómo manejes las fechas en el frontend
}
