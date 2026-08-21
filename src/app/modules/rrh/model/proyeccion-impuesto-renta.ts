import { Empleado } from './empleado';

/**
 * Proyección anual del impuesto a la renta. Tabla `RHH.PYIR`.
 *
 * Guarda el rastro completo del cálculo, no solo el resultado: qué ingresos se proyectaron, qué
 * aporte personal se descontó, qué tramo salió, qué tope de gastos aplicó y con cuántas cargas.
 * Eso es lo que permite explicarle a un empleado por qué se le retiene lo que se le retiene.
 *
 * Se reproyecta en enero, al ingresar un empleado, al cambiar el sueldo y cuando el empleado
 * presenta su anexo de gastos; la proyección anterior queda con `vigente = 'N'`.
 */
export interface ProyeccionImpuestoRenta {
  codigo: number; // PYIRCDGO
  empleado: Empleado | { codigo: number } | null; // MPLDCDGO
  anio: number; // PYIRANOO
  mesDesde: number; // PYIRMSDS - mes desde el que rige

  // Ingresos
  ingresosRealizados: number | null; // PYIRINRL
  ingresosFuturos: number | null; // PYIRINFT
  ingresosProyectados: number | null; // PYIRINPR
  aportePersonalProyectado: number | null; // PYIRAPPR
  baseImponible: number | null; // PYIRBSIM - ingresos proyectados menos aporte personal

  // Impuesto
  impuestoCausado: number | null; // PYIRIMCS - según la tabla progresiva
  gastosDeclarados: number | null; // PYIRGSDC
  topeGastos: number | null; // PYIRTPGS - según cargas familiares
  rebaja: number | null; // PYIRRBJA
  impuestoAPagar: number | null; // PYIRIMPG

  // Prorrateo
  retencionesEfectuadas: number | null; // PYIRRTEF
  mesesRestantes: number | null; // PYIRMSRS
  retencionMensual: number | null; // PYIRRTEM

  // Contexto del cálculo
  numeroCargas: number | null; // PYIRNCRG
  enfermedadCatastrofica: string; // PYIRCTSF - 'S' / 'N'; eleva el tope a 100 canastas
  vigente: string; // PYIRVGNT - 'S' / 'N'
  motivo: string | null; // PYIRMTVO - motivo de la reproyección

  estado: number; // PYIRESTD
  fechaRegistro?: Date; // PYIRFCHR
  usuarioRegistro?: string; // PYIRUSRR
}
