import { NOMBRES_MES, nombreMes } from './meses';

describe('nombreMes', () => {
  it('enero es 1, no 0', () => {
    expect(nombreMes(1)).toBe('Enero');
    expect(nombreMes(12)).toBe('Diciembre');
  });

  it('doce meses, ni uno más', () => {
    expect(NOMBRES_MES.length).toBe(12);
  });

  it('fuera de rango da cadena vacía, no revienta', () => {
    expect(nombreMes(0)).toBe('');
    expect(nombreMes(13)).toBe('');
    expect(nombreMes(null)).toBe('');
    expect(nombreMes(undefined)).toBe('');
  });
});
