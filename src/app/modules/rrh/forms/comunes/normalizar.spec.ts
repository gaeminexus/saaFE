import { coincideTexto, normalizar } from './normalizar';

describe('normalizar (D14)', () => {
  it('quita acentos y mayúsculas', () => {
    expect(normalizar('Peñafiel')).toBe('penafiel');
    expect(normalizar('MUÑOZ')).toBe('munoz');
  });

  it('recorta espacios de sobra', () => {
    expect(normalizar('  Renuncia  ')).toBe('renuncia');
  });

  it('null/undefined no revientan, dan cadena vacía', () => {
    expect(normalizar(null)).toBe('');
    expect(normalizar(undefined)).toBe('');
  });
});

describe('coincideTexto (D14)', () => {
  it('encuentra sin importar mayúsculas ni acentos en ninguno de los dos lados', () => {
    expect(coincideTexto('Núñez Peñafiel', 'nunez')).toBeTrue();
    expect(coincideTexto('Núñez Peñafiel', 'PEÑAFIEL')).toBeTrue();
    expect(coincideTexto('Núñez Peñafiel', 'Núñez')).toBeTrue();
  });

  it('no encuentra lo que no está', () => {
    expect(coincideTexto('Torres Chávez', 'castro')).toBeFalse();
  });
});
