export interface BotOpcion {
    codigo: number;          // Código de la opción
    estado: number;          // Estado
    codigoPadre: number;    // Código de la opción padre (puede ser nulo)
    nombre: string;          // Nombre de la opción
    numero: number;          // Número de la opción
}
