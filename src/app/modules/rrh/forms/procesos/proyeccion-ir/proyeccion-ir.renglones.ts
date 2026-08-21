import { ProyeccionImpuestoRenta } from '../../../model/proyeccion-impuesto-renta';

export interface RenglonProyeccion {
  campo: keyof ProyeccionImpuestoRenta;
  etiqueta: string;
  /** Marca los tres resultados que el usuario busca de un vistazo. */
  destacado?: boolean;
  /** Nota que explica de dónde sale el número. */
  nota?: string;
}

/**
 * Desglose de la proyección, en el mismo orden en que la calcula el motor.
 *
 * La secuencia importa: leída de arriba abajo cuenta la historia completa del cálculo, que es
 * justo lo que hay que poder explicarle a un colaborador que pregunta por su retención.
 */
export const RENGLONES_PROYECCION: RenglonProyeccion[] = [
  { campo: 'ingresosRealizados', etiqueta: 'Ingresos gravados ya percibidos' },
  { campo: 'ingresosFuturos', etiqueta: 'Ingresos gravados futuros proyectados' },
  {
    campo: 'ingresosProyectados',
    etiqueta: 'Total de ingresos gravados del año',
    nota: 'Excluye décimos y fondos de reserva: son exentos',
  },
  { campo: 'aportePersonalProyectado', etiqueta: 'Aporte personal al IESS proyectado' },
  {
    campo: 'baseImponible',
    etiqueta: 'Base imponible',
    nota: 'Ingresos proyectados menos aporte personal',
  },
  {
    campo: 'impuestoCausado',
    etiqueta: 'Impuesto causado',
    nota: 'Según el tramo de la tabla del ejercicio',
  },
  { campo: 'gastosDeclarados', etiqueta: 'Gastos personales declarados' },
  {
    campo: 'topeGastos',
    etiqueta: 'Tope de gastos deducibles',
    nota: 'Según el número de cargas familiares',
  },
  { campo: 'rebaja', etiqueta: 'Rebaja aplicada' },
  { campo: 'impuestoAPagar', etiqueta: 'Impuesto a pagar del año', destacado: true },
  { campo: 'retencionesEfectuadas', etiqueta: 'Retenciones ya efectuadas' },
  { campo: 'mesesRestantes', etiqueta: 'Meses restantes del ejercicio' },
  { campo: 'retencionMensual', etiqueta: 'Retención mensual vigente', destacado: true },
];
