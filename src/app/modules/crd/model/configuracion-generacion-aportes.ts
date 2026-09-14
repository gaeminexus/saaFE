/**
 * Flag de generación de aportes por contratos, rubro 242 / detalle 1
 * (`docs/crd/API-INTERRUPTOR-GENERACION-POR-FALTANTE.md` §B, H64).
 *
 * Apagado (valor de fábrica): el archivo Petro de aportes y el asiento ③ de apertura del cierre
 * de cartera toman el aporte mensual esperado de CRD.HSTR (historial de sueldos, estado 99).
 * Encendido: lo toman de las vigencias de contrato (CRD.VGCN) que rigen cada mes. No afecta la
 * carga del archivo Petro, que siempre compara contra HSTR.
 */

export interface EstadoGeneracionPorFaltante {
  activa: boolean;
  usuarioUltimoCambio?: string | null;
  fechaUltimoCambio?: string | number[] | null;
  motivoUltimoCambio?: string | null;
}

export interface ActualizarGeneracionPorFaltante {
  activa: boolean;
  usuario: string;
  motivo: string;
}
