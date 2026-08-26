import { ReportesNomina } from './descarga-reporte';

describe('ReportesNomina', () => {
  /**
   * Tienen que coincidir carácter por carácter con los `.jrxml` del servidor: un nombre
   * equivocado no falla al compilar, devuelve el error en tiempo de ejecución.
   */
  it('conserva los nombres de plantilla confirmados contra los entregados', () => {
    expect(ReportesNomina.ROL_INDIVIDUAL).toBe('RPRT_ROLL_INDV');
    expect(ReportesNomina.ROL_CONSOLIDADO).toBe('RPRT_ROLL_CNSL');
    expect(ReportesNomina.PROVISIONES).toBe('RPRT_PRVS_PRDO');
    expect(ReportesNomina.RESUMEN_APORTES).toBe('RPRT_APRT_RSMN');
  });
});
