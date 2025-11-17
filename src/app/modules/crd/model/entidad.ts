import { Filial } from "./filial";
import { TipoHidrocarburifica } from "./tipo-hidrocarburifica";
import { TipoIdentificacion } from "./tipo-identificacion";
import { TipoVivienda } from "./tipo-vivienda";

// Interfaz para la tabla Entidad (ENTD)
export interface Entidad {
    codigo: number;              // ENTDCDGO - Código
    filial: Filial;       // FLLLCDGO - FK Código Filial (opcional)
    tipoHidrocarburifica: TipoHidrocarburifica;    // TPHDCDGO - FK Código Tipo Hidrocarburífica (opcional)
    TipoIdentificacion: TipoIdentificacion;    // TPDNCDGO - FK Código Tipo Identificación (opcional)
    numeroIdentificacion: string; // ENTDNMID - Número de identificación (opcional)
    razonSocial: string;        // ENTDRZNS - Razón social (opcional)
    numeroCargasFamiliares: number; // ENTDNMCF - Número de cargas familiares (opcional)
    nombreComercial: string;    // ENTDNMCM - Nombre comercial (opcional)
    fechaNacimiento: Date;      // ENTDFCNC - Fecha Nacimiento (opcional)
    TipoVivienda: TipoVivienda; // TPVVCDGO - FK Código Tipo Vivienda (opcional)
    sectorPublico: number;      // ENTDSCPB - Sector público (opcional)
    correoPersonal: string;     // ENTDCRPR - Correo Personal (opcional)
    correoInstitucional: string; // ENTDCRIN - Correo Institucional (opcional)
    telefono: string;           // ENTDTLFN - Teléfono (opcional)
    tieneCorreoPersonal: number; // ENTDCPVR - Tiene Correo Personal (opcional)
    tieneCorreoTrabajo: number;  // ENTDCIVR - Tiene Correo Trabajo (opcional)
    tieneTelefono: number;       // ENTDTLVR - Tiene Teléfono (opcional)
    migrado: number;            // ENTDMGRD - Migrado (opcional)
    movil: string;              // ENTDMVLI - Móvil (opcional)
    idCiudad: string;           // ENTDIDCD - ID ciudad (opcional)
    porcentajeSimilitud: number; // ENTDPRSM - Porcentaje Similitud (opcional)
    busqueda: string;           // ENTDBSQD - Búsqueda (opcional)
    ipIngreso: string;          // ENTDIPIN - IP ingreso (opcional)
    usuarioIngreso: string;     // ENTDUSIN - Usuario ingreso (opcional)
    fechaIngreso: Date;         // ENTDFCIN - Fecha Ingreso (opcional)
    ipModificacion: string;     // ENTDIPMD - IP modificación (opcional)
    usuarioModificacion: string;// ENTDUSMD - Usuario modificación (opcional)
    fechaModificacion: Date;    // ENTDFCMD - Fecha modificación (opcional)
    idEstado: number;            // ENTDIDST - ID Estado
    urlFotoLogo: string;        // ENTDURFL - URL Foto Logo (opcional)
}
