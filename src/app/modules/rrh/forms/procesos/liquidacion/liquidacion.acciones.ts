import { AccionLiquidacion, SalidaEjecutada } from '../../../model/estados-liquidacion';

/** Lo que se le dice al usuario cuando cada proceso termina bien. */
export const MENSAJE_EXITO: Record<AccionLiquidacion, string> = {
  aprobar: 'Finiquito aprobado.',
  ejecutarSalida: 'Salida ejecutada: contrato cerrado y colaborador en situación de cesante.',
  contabilizar: 'Asiento del finiquito emitido.',
};

/**
 * Texto de la confirmación de la salida.
 *
 * Enumera lo que el proceso hace de verdad —lo dice el servicio del backend— porque es el único
 * paso del finiquito que no se deshace: cierra el contrato, cambia la situación del colaborador,
 * avisa al IESS, cancela sus descuentos y caduca sus saldos de vacaciones.
 */
export function textoConfirmacionSalida(nombre: string, yaEjecutada: SalidaEjecutada = 'desconocido'): string {
  const base =
    `Ejecutar la salida de ${nombre} cierra su contrato, lo pasa a CESANTE, avisa al IESS, ` +
    'cancela sus descuentos y caduca sus saldos de vacaciones.\n\n' +
    'Esta acción no se puede deshacer. ¿Continuar?';

  if (yaEjecutada !== 'si') return base;

  // El estado del finiquito no lo delata —`ejecutarSalida` no lo mueve al terminar—, así que la
  // última oportunidad de decirlo es aquí, con el dedo ya sobre el botón.
  return (
    `ATENCIÓN: esta salida parece EJECUTADA YA. El contrato de ${nombre} está CERRADO y el ` +
    'colaborador consta como CESANTE.\n\n' +
    'Volver a ejecutarla DUPLICA el aviso de salida al IESS: ese paso no es idempotente y ' +
    'genera una segunda novedad, no la reescribe.\n\n' +
    `${base}`
  );
}
