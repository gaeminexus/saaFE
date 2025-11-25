import { EstadoCivil } from "./estado-civil";
import { Filial } from "./filial";

export interface PersonaNatural {
    codigo: number;           // Código (PK y FK de Entidad)
    filial: Filial;           // Filial (objeto)
    nombres: string;          // Nombres
    apellidos: string;        // Apellidos
    estadoCivil: EstadoCivil;      // Estado civil
    genero: string;           // Género
    usuarioIngreso: string;   // Usuario ingreso
    fechaIngreso: string;     // Fecha ingreso (Timestamp)
    estado: number;           // Estado
}
