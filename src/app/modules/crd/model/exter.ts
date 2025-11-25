import { Canton } from "./canton";
import { EstadoCivil } from "./estado-civil";
import { NivelEstudio } from "./nivel-estudio";
import { Profesion } from "./profesion";
import { Provincia } from "./provincia";

export interface Exter {
    cedula: string;               // Cédula
    nombre: string;               // Nombre
    estado: string;               // Estado
    fechaNacimiento: string;      // Fecha de nacimiento (Timestamp)
    estadoCivil: EstadoCivil;          // Estado civil
    nivelEstudios: NivelEstudio;        // Nivel de estudios
    edad: string;                 // Edad
    profesion: Profesion;            // Profesión
    genero: string;               // Género
    fechaDefuncion: string;           // Fecha desde (Timestamp)
    nacionalidad: string;         // Nacionalidad
    provincia: Provincia;            // Provincia
    canton: Canton;               // Cantón
    movil: string;                // Móvil
    telefono: string;             // Teléfono
    correoPrincipal: string;      // Correo principal
    correoInstitucional: string;  // Correo institucional
    celular1: string;             // Celular 1
    celular2: string;             // Celular 2
    correoExtra: string;          // Correo extra
    telefonoLaboralIE: string;    // Teléfono laboral (Institución Empleadora)
    correoIE: string;             // Correo de la Institución Empleadora
    salarioFijo: number;          // Salario fijo
    salarioVariable: number;      // Salario variable
    salarioTotal: number;         // Salario total
    sumadosIngresos: number;      // Sumados ingresos
    sumadosEgresos: number;       // Sumados egresos
    disponible: number;           // Disponible
}
