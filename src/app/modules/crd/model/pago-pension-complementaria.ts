import { Entidad } from './entidad';
import { Filial } from './filial';

/**
 * Contrato: docs/crd/API-PAGO-PENSION-COMPLEMENTARIA.md.
 *
 * Sobre común de `generarPagosDelMes` y `sincronizarPagos`: `exito`, `mensaje`, y el cuerpo real
 * anidado bajo `resultado` (nunca al nivel superior). En fallo HTTP ≥400 el mismo sobre trae
 * `error` con el código estable (§6).
 */
export interface RespuestaPgpc<T> {
  exito: boolean;
  mensaje?: string;
  error?: string;
  resultado?: T;
}

/** §1 — un renglón de `detalle` dentro de `ResultadoGeneracionPagos`. */
export interface DetallePagoPension {
  idEntidad: number;
  /**
   * Ausente en la rama `YA_EXISTIA` de una segunda corrida sobre el mismo período (§1 del
   * contrato): esa rama solo trae `idEntidad`, `idPago`, `valorPension`, `valorSeguroSalud` y
   * `estado`. No asumir que siempre viene.
   */
  nombre?: string;
  idPago: number;
  valorPension: number;
  valorSeguroSalud: number;
  valorCruzadoAPrestamo?: number;
  valorOrdenPago?: number;
  generoOrdenPago?: boolean;
  idAsientoDevengo?: number;
  estado: 'GENERADO' | 'YA_EXISTIA' | 'ERROR';
  mensaje?: string | null;
}

/** §1 — cuerpo de `resultado` de `POST /pgpc/generarPagosDelMes`. */
export interface ResultadoGeneracionPagos {
  anio: number;
  mes: number;
  evaluados: number;
  generados: number;
  yaGenerados: number;
  conError: number;
  totalPagado: number;
  totalCruzadoAPrestamos: number;
  totalOrdenesGeneradas: number;
  errores: string[];
  detalle: DetallePagoPension[];
}

/** §2 — cuerpo de `resultado` de `POST /pgpc/sincronizarPagos`. */
export interface ResultadoSincronizacion {
  evaluadas: number;
  marcadasPagadas: number;
  marcadasRechazadas: number;
  huerfanas: number;
  conError: number;
  errores: string[];
}

/**
 * §3/§4 — la entidad JPA cruda de `CRD.PGPC`, tal cual la devuelven `porEntidad` y `porPeriodo`
 * (arreglo pelado, sin sobre `{exito,...}`). NO trae `valorCruzadoAPrestamo`, `valorOrdenPago` ni
 * `generoOrdenPago`: esos campos existen solo en `DetallePagoPension`, el DTO de la corrida.
 */
export interface PagoPensionComplementaria {
  codigo: number;
  entidad: Entidad;
  filial: Filial;
  anio: number;
  mes: number;
  valorPension: number;
  valorSeguro: number;
  valor: number;
  /** `LocalDate` del backend: `[y, m, d]`. Formatear con un helper, nunca mostrar crudo. */
  fecha: number[];
  estado: number;
  idPagoProgramado: number | null;
  idAporte: number | null;
  numeroAsiento: number | null;
  numeroAsientoDevengo: number | null;
  usuarioRegistro: string;
  /** `LocalDateTime` del backend: `[y, m, d, h, mi, s, ns]`. */
  fechaRegistro: number[];
  /** `LocalDate` del backend, o `null`. */
  fechaPago: number[] | null;
  usuarioAnulacion: string | null;
  fechaAnulacion: number[] | null;
  motivoAnulacion: string | null;
}

/** §5 — estados de `PGPC.PGPCESTD`. Constantes planas, no catálogo `Rubro`. */
export const ESTADO_PGPC = {
  REGISTRADA: 1,
  EN_PAGO: 2,
  PAGADA: 3,
  RECHAZADA: 4,
  ANULADA: 5,
} as const;

export const NOMBRE_ESTADO_PGPC: Record<number, string> = {
  1: 'Registrada',
  2: 'En pago',
  3: 'Pagada',
  4: 'Rechazada',
  5: 'Anulada',
};
