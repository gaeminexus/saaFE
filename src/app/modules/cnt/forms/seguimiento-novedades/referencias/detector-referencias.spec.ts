import { buscarReferencias, segmentarReferencias, tipoDeReferenciaRequerimiento } from './detector-referencias';

/** Pares [tipo, valor] de las referencias encontradas, para comparar en una línea. */
function refs(texto: string, anio?: number): string[] {
  return buscarReferencias(texto, { anio }).map((c) => `${c.tipo}:${c.valor}`);
}

describe('C25b detector de referencias', () => {
  it('decisiones D-nnn y D-015b', () => {
    expect(refs('Por D-033 y D-015b (punto 2), ver D-047 (6).')).toEqual(['DECISION:D-033', 'DECISION:D-015b', 'DECISION:D-047']);
  });

  it('números oficiales de asiento de todos los prefijos', () => {
    expect(refs('IN-A-2025-06-0053, EG-A-2025-06-0094, DI-A-2025-06-0001, DIA-2025-06-0032 y CRE-2025-06-0100')).toEqual([
      'ASIENTO:IN-A-2025-06-0053',
      'ASIENTO:EG-A-2025-06-0094',
      'ASIENTO:DI-A-2025-06-0001',
      'ASIENTO:DIA-2025-06-0032',
      'ASIENTO:CRE-2025-06-0100',
    ]);
    expect(refs('CXP-2025-06-0001 CXC-2025-06-0002 RRH-2025-06-0003')).toEqual(['ASIENTO:CXP-2025-06-0001', 'ASIENTO:CXC-2025-06-0002', 'ASIENTO:RRH-2025-06-0003']);
  });

  it('un número de asiento no se confunde con una novedad (A-20…)', () => {
    expect(refs('IN-A-2025-06-0053').length).toBe(1);
  });

  it('asiento por código interno: "asiento N", lista y rango, "(id N)" y "(N)"', () => {
    expect(refs('asiento 13295')).toEqual(['ASIENTO:13295']);
    expect(refs('asientos 14518 a 14522')).toEqual(['ASIENTO:14518', 'ASIENTO:14522']);
    expect(refs('los asientos 13162-13176 y 13180')).toEqual(['ASIENTO:13162', 'ASIENTO:13176', 'ASIENTO:13180']);
    expect(refs('quedó en DIA-2025-06-0032 (id 13610) y en (13584).')).toEqual(['ASIENTO:DIA-2025-06-0032', 'ASIENTO:13610', 'ASIENTO:13584']);
  });

  it('códigos de novedad del mes y de otro mes', () => {
    expect(refs('Ver C-05 y B-04; detalle en K-01 y TABLAS-59.')).toEqual(['NOVEDAD:C-05', 'NOVEDAD:B-04', 'NOVEDAD:K-01', 'NOVEDAD:TABLAS-59']);
    expect(refs('igual que la novedad N-01 de julio', 2025)).toEqual(['NOVEDAD:2025-07/N-01']);
    expect(refs('B-07 de agosto de 2025')).toEqual(['NOVEDAD:2025-08/B-07']);
    expect(refs('E-03 de junio')).toEqual(['NOVEDAD:E-03']); // sin año de contexto queda en el mes de la pantalla
  });

  it('préstamos, operaciones y entidades, con listas', () => {
    expect(refs('Comprobante de los pagos del préstamo 2996')).toEqual(['PRESTAMO:2996']);
    expect(refs('préstamos 4061, 4062 y 4070')).toEqual(['PRESTAMO:4061', 'PRESTAMO:4062', 'PRESTAMO:4070']);
    expect(refs('operación 63031 (prestamo 8252, grupo H)')).toEqual(['OPERACION:63031', 'PRESTAMO:8252']);
    expect(refs('las operaciones 63417 y 64481')).toEqual(['OPERACION:63417', 'OPERACION:64481']);
    expect(refs('entidad 3978; entidades 4237 y 5154; partícipe 6621')).toEqual(['ENTIDAD:3978', 'ENTIDAD:4237', 'ENTIDAD:5154', 'ENTIDAD:6621']);
  });

  it('la palabra clave queda dentro del enlace del primer número', () => {
    const s = segmentarReferencias('del préstamo 2996 y 3001');
    expect(s.map((x) => x.texto)).toEqual(['del ', 'préstamo 2996', ' y ', '3001']);
    expect(s[1].ref).toEqual({ tipo: 'PRESTAMO', valor: '2996' });
    expect(s[3].ref).toEqual({ tipo: 'PRESTAMO', valor: '3001' });
  });

  it('cobros, filas, cargas, corridas, ejecuciones y pagos', () => {
    expect(refs('Cobro 201 reversado; nuevo cobro por el motor (cobro 227)')).toEqual(['COBRO:201', 'COBRO:227']);
    expect(refs('cobros 304 a 337')).toEqual(['COBRO:304', 'COBRO:337']);
    expect(refs('cobro CBCR 228')).toEqual(['COBRO:228']);
    expect(refs('filas 1706, 1723 y 1798 del extracto; DEXB 1934')).toEqual(['FILA:1706', 'FILA:1723', 'FILA:1798', 'FILA:1934']);
    expect(refs('Carga 352 (535.477,39, recibida el 26 y 30-jun)')).toEqual(['CARGA:352']);
    expect(refs('carga Petro 352')).toEqual(['CARGA:352']);
    expect(refs('Corrida 48 con el motor de cobros corregido; la corrida 47')).toEqual(['CORRIDA:48', 'CORRIDA:47']);
    expect(refs('Ejecución 604 según los manuales')).toEqual(['EJECUCION:604']);
    expect(refs('pago PGPR 812345 y PGPR 812346')).toEqual(['PAGO:812345', 'PAGO:812346']);
  });

  it('cuentas contables, sin confundirlas con montos ni fechas', () => {
    expect(refs('a 1.4.90.90.05 y 2.3.90.90.09; intereses a 5.1.90; 2.5.01')).toEqual([
      'CUENTA:1.4.90.90.05',
      'CUENTA:2.3.90.90.09',
      'CUENTA:5.1.90',
      'CUENTA:2.5.01',
    ]);
    expect(refs('Total 1.300,24 y 42.029,89; versión 1.2; 12.916,83')).toEqual([]);
  });

  it('empleados del lote de nómina y facturas', () => {
    expect(refs('Anticipos de sueldo (E09 4500, E23 1000)')).toEqual(['EMPLEADO:E09', 'EMPLEADO:E23']);
    expect(refs('el exceso de 0,26 de la factura 577')).toEqual(['FACTURA:577']);
    expect(refs('(factura 001-006-020473071, 175,10); facturas 1091, 1082 y 1100')).toEqual(['FACTURA:001-006-020473071', 'FACTURA:1091', 'FACTURA:1082', 'FACTURA:1100']);
  });

  it('no enlaza montos, años ni números sueltos', () => {
    expect(refs('91 pagos migrados borrados; 49 créditos del banco (21.425,82) en 2025')).toEqual([]);
    expect(refs('el 30-jun-2025 quedaron 109 filas')).toEqual([]);
  });

  it('los segmentos reconstruyen el texto original', () => {
    const t = 'Por D-040 la operación 63031 (préstamo 8252) va a 1.4.90.90.05 en DIA-2025-06-0001; ver K-06.';
    expect(segmentarReferencias(t).map((s) => s.texto).join('')).toBe(t);
    expect(segmentarReferencias(t).filter((s) => s.ref).length).toBe(6);
  });

  it('texto vacío o nulo', () => {
    expect(segmentarReferencias(null)).toEqual([]);
    expect(segmentarReferencias('')).toEqual([]);
    expect(segmentarReferencias('sin referencias')).toEqual([{ texto: 'sin referencias' }]);
  });

  it('tipo de referencia del requerimiento', () => {
    expect(tipoDeReferenciaRequerimiento('FILA_EXTRACTO')).toBe('FILA');
    expect(tipoDeReferenciaRequerimiento('PRESTAMO')).toBe('PRESTAMO');
    expect(tipoDeReferenciaRequerimiento('ORDEN')).toBeNull();
    expect(tipoDeReferenciaRequerimiento(null)).toBeNull();
  });
});
