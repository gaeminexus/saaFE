/**
 * Catálogo de estados de `Entidad` (endpoint /rest/espr/getAll).
 *
 * OJO con el nombre: pese a llamarse EstadoParticipe, describe el estado de la
 * **Entidad** (`Entidad.idEstado`), no el de `Participe`. Los campos de estado
 * de Participe (`idEstado`, `estadoActual`, `estadoCesante`) son ajenos a este
 * catálogo.
 */
export interface EstadoParticipe {
    /**
     * PK interna del catálogo. NO comparar contra `Entidad.idEstado` ni enviar
     * al backend: guarda los valores previos a la migración de códigos, así que
     * usarla devuelve datos incorrectos sin fallar. Solo la pantalla de
     * mantenimiento del catálogo tiene motivo para tocarla.
     */
    codigo: number;
    /** Nombre del estado; es lo que se muestra al usuario. */
    nombre: string;
    /**
     * Código de negocio (código alterno). Único valor comparable con
     * `Entidad.idEstado` y único que se envía al backend.
     */
    codigoExterno: number;
    /**
     * Bandera activo/inactivo de la propia fila del catálogo (1 = vigente).
     * No es un estado de partícipe, pese a llamarse igual que el campo de
     * Entidad: sirve para ocultar estados dados de baja.
     */
    idEstado: number;
}

/** Filas del catálogo vigentes; las de baja no deben ofrecerse en combos. */
export function esEstadoVigente(estado: EstadoParticipe): boolean {
    return estado?.idEstado === 1;
}

/**
 * Códigos alternos de estado de Entidad.
 *
 * Usar SOLO donde una regla de negocio apunta a un estado concreto (el proceso
 * de jubilados complementarios, el estado inicial de una entidad nueva). Los
 * combos, filtros y leyendas NO se construyen desde aquí: se leen de
 * /rest/espr/getAll para que un estado nuevo aparezca solo.
 */
export enum CodigoEstadoParticipe {
    ACTIVO = 1,
    CESANTE = 2,
    JUBILADO_COMPLEMENTARIO = 3,
    CESANTE_DESAFILIADO = 4,
    CESANTE_FALLECIDO = 5,
    JUBILADO_APORTANTE = 6,
    JUBILADO_PASIVO = 7,
    ACTIVO_EN_MORA = 8,
    NUEVO = 9,
}
