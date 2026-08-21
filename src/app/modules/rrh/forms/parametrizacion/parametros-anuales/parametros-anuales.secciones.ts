/** Un campo del formulario de parámetros anuales. */
export interface CampoParametro {
  name: keyof CamposEditables;
  label: string;
  /** Unidad que se muestra como sufijo del input. */
  sufijo?: string;
  requerido?: boolean;
  /** Pista bajo el campo, para los que tienen una base legal concreta. */
  ayuda?: string;
}

export interface SeccionParametros {
  titulo: string;
  icono: string;
  campos: CampoParametro[];
}

/** Campos de `ParametroNomina` que el usuario edita; el resto son de auditoría o clave. */
export interface CamposEditables {
  sbu: number | null;
  canastaBasica: number | null;
  aportePersonal: number | null;
  aportePatronal: number | null;
  iece: number | null;
  secap: number | null;
  fondosReserva: number | null;
  porcentajeGastosPersonales: number | null;
  canastasCatastrofica: number | null;
  utilidadPorcentaje: number | null;
  utilidadDias: number | null;
  utilidadCargas: number | null;
  utilidadTopeSbu: number | null;
  diasMes: number | null;
  diasAnio: number | null;
  horasMes: number | null;
  horasDia: number | null;
  recargoSuplementaria: number | null;
  recargoExtraordinaria: number | null;
  recargoNocturno: number | null;
  maxHorasDia: number | null;
  maxHorasSemana: number | null;
  diasVacaciones: number | null;
  anioVacacionAdicional: number | null;
  maxDiasVacaciones: number | null;
  aniosCaducidadVacaciones: number | null;
  porcentajeDesahucio: number | null;
  indemnizacionMinima: number | null;
  indemnizacionMaxima: number | null;
  aniosIndemnizacionMinima: number | null;
}

/**
 * Secciones del formulario de parámetros anuales (RHH.PRNM).
 *
 * Ningún valor por defecto se declara aquí: los importes y porcentajes salen siempre de la base
 * de datos. Esto es solo la disposición de la pantalla.
 */
export const SECCIONES_PARAMETROS: SeccionParametros[] = [
  {
    titulo: 'Valores base',
    icono: 'payments',
    campos: [
      { name: 'sbu', label: 'Salario Básico Unificado', sufijo: 'USD', requerido: true },
      {
        name: 'canastaBasica',
        label: 'Canasta familiar básica',
        sufijo: 'USD',
        ayuda: 'Valor de enero; es la base del tope de gastos personales',
      },
    ],
  },
  {
    titulo: 'IESS',
    icono: 'health_and_safety',
    campos: [
      { name: 'aportePersonal', label: 'Aporte personal', sufijo: '%' },
      { name: 'aportePatronal', label: 'Aporte patronal', sufijo: '%' },
      { name: 'iece', label: 'IECE', sufijo: '%' },
      { name: 'secap', label: 'SECAP', sufijo: '%' },
      {
        name: 'fondosReserva',
        label: 'Fondos de reserva',
        sufijo: '%',
        ayuda: 'Aplica desde el año de servicio cumplido',
      },
    ],
  },
  {
    titulo: 'Impuesto a la renta',
    icono: 'receipt_long',
    campos: [
      {
        name: 'porcentajeGastosPersonales',
        label: 'Rebaja sobre gastos personales',
        sufijo: '%',
      },
      {
        name: 'canastasCatastrofica',
        label: 'Canastas de tope en enfermedad catastrófica',
        sufijo: 'canastas',
      },
    ],
  },
  {
    titulo: 'Utilidades',
    icono: 'pie_chart',
    campos: [
      { name: 'utilidadPorcentaje', label: 'Total a repartir', sufijo: '%' },
      { name: 'utilidadDias', label: 'Reparto por días trabajados', sufijo: '%' },
      { name: 'utilidadCargas', label: 'Reparto por cargas familiares', sufijo: '%' },
      {
        name: 'utilidadTopeSbu',
        label: 'Tope por trabajador',
        sufijo: 'SBU',
        ayuda: 'El excedente se transfiere al IESS',
      },
    ],
  },
  {
    titulo: 'Bases de cálculo',
    icono: 'calculate',
    campos: [
      { name: 'diasMes', label: 'Días del mes comercial', sufijo: 'días' },
      { name: 'diasAnio', label: 'Días del año comercial', sufijo: 'días' },
      { name: 'horasMes', label: 'Horas base del mes', sufijo: 'horas' },
      { name: 'horasDia', label: 'Jornada ordinaria diaria', sufijo: 'horas' },
    ],
  },
  {
    titulo: 'Horas extra',
    icono: 'more_time',
    campos: [
      { name: 'recargoSuplementaria', label: 'Recargo de suplementarias', sufijo: '%' },
      { name: 'recargoExtraordinaria', label: 'Recargo de extraordinarias', sufijo: '%' },
      { name: 'recargoNocturno', label: 'Recargo nocturno', sufijo: '%' },
      { name: 'maxHorasDia', label: 'Máximo de horas extra por día', sufijo: 'horas' },
      { name: 'maxHorasSemana', label: 'Máximo de horas extra por semana', sufijo: 'horas' },
    ],
  },
  {
    titulo: 'Vacaciones',
    icono: 'beach_access',
    campos: [
      { name: 'diasVacaciones', label: 'Días por año cumplido', sufijo: 'días' },
      {
        name: 'anioVacacionAdicional',
        label: 'Año desde el que se suma un día',
        sufijo: 'año',
      },
      { name: 'maxDiasVacaciones', label: 'Máximo de días acreditables', sufijo: 'días' },
      { name: 'aniosCaducidadVacaciones', label: 'Años hasta la caducidad', sufijo: 'años' },
    ],
  },
  {
    titulo: 'Indemnizaciones',
    icono: 'gavel',
    campos: [
      {
        name: 'porcentajeDesahucio',
        label: 'Desahucio por año de servicio',
        sufijo: '%',
        ayuda: 'Porcentaje de la última remuneración',
      },
      {
        name: 'indemnizacionMinima',
        label: 'Despido intempestivo, mínimo',
        sufijo: 'remuneraciones',
      },
      {
        name: 'indemnizacionMaxima',
        label: 'Despido intempestivo, máximo',
        sufijo: 'remuneraciones',
      },
      {
        name: 'aniosIndemnizacionMinima',
        label: 'Antigüedad bajo la que aplica el mínimo',
        sufijo: 'años',
      },
    ],
  },
];

/** Todos los campos editables, en orden de sección. */
export const CAMPOS_PARAMETROS: CampoParametro[] = SECCIONES_PARAMETROS.flatMap((s) => s.campos);
