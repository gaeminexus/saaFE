/**
 * Niveles de aprobación configurables (DISENO-SOLICITUD-V1 §B4): reglas (`CRD.RGAP`), niveles (`CRD.NVAP`),
 * usuarios por nivel (`CRD.UNAP`) y el estado de aprobación de un préstamo. `estado` 1 = activo, 0 = inactivo.
 */
export interface ReglaAprobacion {
  codigo?: number;
  /** `null` = cualquier tipo de préstamo. */
  idTipoPrestamo: number | null;
  /** `null` = cualquier operación; 1 = Nuevo, 2 = Novación, 3 = Reestructuración. */
  operacion?: number | null;
  nombre: string;
  /** Vacío (`null`) = sin límite. */
  montoMinimo: number | null;
  montoMaximo: number | null;
  plazoMinimo: number | null;
  plazoMaximo: number | null;
  prioridad: number;
  estado?: number;
}

export interface NivelAprobacion {
  codigo?: number;
  idRegla: number;
  orden: number;
  nombre: string;
  estado?: number;
}

export interface UsuarioNivelAprobacion {
  codigo?: number;
  idNivel: number;
  /** `SCP.PJRQ.PJRQCDGO`. */
  idUsuario: number;
  estado?: number;
}

/** Respuesta de `GET rgap/completa/{id}`. */
export interface ReglaAprobacionCompleta {
  regla: ReglaAprobacion;
  niveles: {
    codigo: number;
    orden: number;
    nombre: string;
    usuarios: { codigo: number; idUsuario: number; nombre: string }[];
  }[];
}

/** Respuesta de `GET rgap/simular`. */
export interface SimulacionReglaAprobacion {
  sinReglasActivas: boolean;
  regla: ReglaAprobacionCompleta | null;
  mensaje: string | null;
}

/** Respuesta de `GET prst/estadoAprobacion/{id}?idUsuario=`. `decision`: 1 aprobado, 2 negado, `null` pendiente. */
export interface EstadoAprobacionPrestamo {
  regla: { id: number; nombre: string } | null;
  sinNiveles: boolean;
  niveles: {
    idNivel: number;
    orden: number;
    nombre: string;
    usuarios: string[];
    aprobadoPor: string | null;
    fecha: unknown;
    decision: number | null;
  }[];
  nivelPendiente: number | null;
  totalNiveles: number;
  puedeAprobar: boolean;
  mensaje: string | null;
}

/** Respuesta de `POST prst/aprobar/{id}?conDetalle=true`. */
export interface ResultadoAprobacionPrestamo<TPrestamo = any> {
  prestamo: TPrestamo;
  aprobacionCompleta: boolean;
  nivelAprobado: number | null;
  totalNiveles: number;
  siguienteNivel: string | null;
  mensaje: string | null;
}
