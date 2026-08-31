/**
 * Cuentas contables por tipo de aporte y empresa — mantenimiento de `CRD.CTAP`
 * (docs/crd/API-CUENTAS-TIPO-APORTE.md, contrato congelado, verificado contra
 * `CuentaTipoAporteRest.java`).
 *
 * Por cada (tipo de aporte, empresa): `cuentaPasivo` es el DEBE del asiento de reclasificación
 * de la devolución de aportes; `cuentaLiquidacion` es el HABER, y también la cuenta que CXP
 * debita al confirmarse el pago — de ahí la advertencia de la pantalla (§1 del contrato).
 */

/**
 * Referencia liviana a una cuenta del plan de cuentas (`CNT.PLNN`) — solo lo que esta pantalla
 * necesita mostrar y enviar. En escritura basta `{ codigo }`; en lectura vienen también
 * `cuentaContable`/`nombre` (el nombre REAL del campo en `PlanCuenta.java` es `cuentaContable`,
 * no `numeroCuenta` — el contrato lo ilustra distinto, pero el DTO real dice `cuentaContable`).
 */
export interface CuentaContableRef {
  codigo: number;
  cuentaContable?: string;
  nombre?: string;
}

export interface CuentaTipoAporte {
  codigo?: number;
  tipoAporte: { codigo: number; nombre?: string };
  empresa: { codigo: number; nombre?: string };
  cuentaPasivo: CuentaContableRef;
  cuentaLiquidacion: CuentaContableRef;
  /** 1 = activo, 0 = inactivo. Lo pone el servidor al crear; PUT lo ignora aunque venga. */
  estado?: number;
}

/** Cuerpo de `POST /rest/ctap` — nunca lleva `codigo` ni `estado` (los pone el servidor). */
export interface SolicitudCrearCuentaTipoAporte {
  tipoAporte: { codigo: number };
  empresa: { codigo: number };
  cuentaPasivo: { codigo: number };
  cuentaLiquidacion: { codigo: number };
}

/**
 * Cuerpo de `PUT /rest/ctap` — SOLO estas tres claves. `tipoAporte`/`empresa`/`estado` se
 * IGNORAN aunque vengan (§2 del contrato): no mandarlos, para no sugerir que hacen algo.
 */
export interface SolicitudEditarCuentaTipoAporte {
  codigo: number;
  cuentaPasivo: { codigo: number };
  cuentaLiquidacion: { codigo: number };
}
