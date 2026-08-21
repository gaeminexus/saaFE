import { AccionLiquidacion } from '../../../model/estados-liquidacion';

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
export function textoConfirmacionSalida(nombre: string): string {
  return (
    `Ejecutar la salida de ${nombre} cierra su contrato, lo pasa a CESANTE, avisa al IESS, ` +
    'cancela sus descuentos y caduca sus saldos de vacaciones.\n\n' +
    'Esta acción no se puede deshacer. ¿Continuar?'
  );
}
