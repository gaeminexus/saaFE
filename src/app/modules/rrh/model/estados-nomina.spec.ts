import { EstadoPeriodo, claseEstado, iconoEstado, motivoBloqueado } from './estados-nomina';

/**
 * `motivoBloqueado`, `claseEstado`, `iconoEstado` — aditivos del rediseño de Períodos
 * (2026-08-26). No repiten la cobertura de `accionesDisponibles`, que es de quien se apoyan y no
 * tocan.
 */
describe('motivoBloqueado', () => {
  it('sin período, no hay motivo que dar', () => {
    expect(motivoBloqueado(null, 'calcular')).toBeNull();
  });

  it('una acción disponible no lleva motivo', () => {
    const abierto: any = { codigo: 1, estado: EstadoPeriodo.ABIERTO };
    expect(motivoBloqueado(abierto, 'validar')).toBeNull();
    expect(motivoBloqueado(abierto, 'calcular')).toBeNull();
  });

  it('aprobar sobre un período que no está calculado explica qué falta', () => {
    const abierto: any = { codigo: 1, estado: EstadoPeriodo.ABIERTO };
    expect(motivoBloqueado(abierto, 'aprobar')).toBe('Requiere el período Calculado.');
  });

  it('reabrir sobre PAGADO da el motivo de que el dinero ya salió, no el genérico', () => {
    const pagado: any = { codigo: 1, estado: EstadoPeriodo.PAGADO };
    expect(motivoBloqueado(pagado, 'reabrir')).toContain('dinero ya salió');
  });

  it('reabrir sobre ANULADO da su propio motivo', () => {
    const anulado: any = { codigo: 1, estado: EstadoPeriodo.ANULADO };
    expect(motivoBloqueado(anulado, 'reabrir')).toContain('Anulado');
  });

  it('reabrir con el asiento del rol ya emitido explica la reversión, no un genérico', () => {
    const cerrado: any = { codigo: 1, estado: EstadoPeriodo.CERRADO, asientoRol: { codigo: 900 } };
    expect(motivoBloqueado(cerrado, 'reabrir')).toContain('reversar contabilidad');
  });

  it('reabrir SÍ disponible (Cerrado, sin asiento) no lleva motivo', () => {
    const cerrado: any = { codigo: 1, estado: EstadoPeriodo.CERRADO, asientoRol: null };
    expect(motivoBloqueado(cerrado, 'reabrir')).toBeNull();
  });
});

describe('claseEstado / iconoEstado', () => {
  it('cada estado del rubro 182 tiene su propia clase — el color compartido es cosa del SCSS, no de aquí', () => {
    const clases = new Set([
      claseEstado(EstadoPeriodo.ABIERTO),
      claseEstado(EstadoPeriodo.EN_CALCULO),
      claseEstado(EstadoPeriodo.CALCULADO),
      claseEstado(EstadoPeriodo.APROBADO),
      claseEstado(EstadoPeriodo.CONTABILIZADO),
      claseEstado(EstadoPeriodo.PAGADO),
      claseEstado(EstadoPeriodo.CERRADO),
      claseEstado(EstadoPeriodo.ANULADO),
    ]);
    expect(clases.size).toBe(8);
  });

  it('un estado fuera de catálogo no revienta: cae en "desconocido"', () => {
    expect(claseEstado(999)).toBe('estado-desconocido');
    expect(iconoEstado(null)).toBe('help_outline');
  });
});
