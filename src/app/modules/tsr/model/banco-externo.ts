export interface BancoExterno {
    codigo: number;
    nombre: string;
    tarjeta: number;
    estado: number;
    fechaIngreso: string; // o Date, según cómo manejes fechas en el frontend
}
