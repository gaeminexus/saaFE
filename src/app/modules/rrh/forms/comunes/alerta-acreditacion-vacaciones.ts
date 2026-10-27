import { EstadoAcreditacionVacaciones } from '../../model/saldo-vacaciones';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';

const ORIGEN: Record<string, string> = {
  MANUAL: 'manual',
  CIERRE_NOMINA: 'cierre de nómina',
};

/**
 * Texto del aviso de acreditación de vacaciones (banner del menú y pantalla de solicitud).
 * `null` cuando no hay nada que avisar: acreditación al día y la última corrida sin error.
 */
export function textoAlertaAcreditacion(
  estado: EstadoAcreditacionVacaciones | null | undefined,
  funcionesDatosS: FuncionesDatosService,
): string | null {
  if (!estado) return null;

  const corrida = estado.ultimaCorrida;
  const conError = corrida?.estado === 'ERROR';
  if (!estado.desactualizada && !conError) return null;

  const partes: string[] = [];
  if (corrida) {
    const corte = funcionesDatosS.formatoFecha(corrida.fechaCorte, FuncionesDatosService.SOLO_FECHA) || '-';
    const origen = ORIGEN[corrida.origen] ?? corrida.origen;
    partes.push(`Última acreditación de vacaciones: corte ${corte} (${corrida.usuario}, ${origen}).`);
  } else {
    partes.push('Aún no se ha acreditado el período de vacaciones.');
  }

  const n = Number(estado.activosSinSaldo) || 0;
  if (n > 0) {
    partes.push(`${n} ${n === 1 ? 'empleado activo sin saldo' : 'empleados activos sin saldo'} del año.`);
  }

  if (conError && corrida?.mensaje) {
    partes.push(`La última corrida terminó con error: ${corrida.mensaje}`);
  }

  return partes.join(' ');
}
