export interface EstadoPrestamo {
    codigo: number;         // Código del estado préstamo (PK)
    nombre: string;         // Nombre del estado préstamo
    codigoAlterno: number;  // ESPSCDAL - Código alterno numérico
    codigoExterno: number;  // Código externo
    idEstado: number;       // ID del estado
}
