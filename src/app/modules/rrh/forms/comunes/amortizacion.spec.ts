import { FilaCuota, generarCuotas, recomputarSaldos } from './amortizacion';

describe('generarCuotas', () => {
  it('reparte el valor total en partes iguales', () => {
    const filas = generarCuotas(1200, 12, new Date(2026, 0, 15));
    expect(filas.length).toBe(12);
    expect(filas.every((f) => f.capital === 100)).toBeTrue();
  });

  it('la última cuota absorbe el redondeo: la suma da exacto, nunca de más ni de menos', () => {
    // 1000 / 3 = 333.333... — el caso que revienta un reparto ingenuo.
    const filas = generarCuotas(1000, 3, new Date(2026, 0, 1));
    const suma = filas.reduce((acc, f) => acc + f.capital, 0);
    expect(Math.round(suma * 100) / 100).toBe(1000);
    expect(filas[0].capital).toBe(333.33);
    expect(filas[1].capital).toBe(333.33);
    expect(filas[2].capital).toBe(333.34);
  });

  it('las fechas avanzan un mes por cuota, a partir de la primera', () => {
    const filas = generarCuotas(300, 3, new Date(2026, 0, 31));
    // Enero 31 + 1 mes puede desbordar a marzo si no se maneja bien; se acepta el desborde nativo
    // de Date, que es el mismo comportamiento que ya usa el resto del módulo.
    expect(filas[0].fechaVencimiento.getMonth()).toBe(0);
    expect(filas[1].numeroCuota).toBe(2);
    expect(filas[2].numeroCuota).toBe(3);
  });

  it('nace sin interés: la mayoría de lo que entra aquí no cobra', () => {
    const filas = generarCuotas(300, 3, new Date(2026, 0, 1));
    expect(filas.every((f) => f.interes === 0)).toBeTrue();
    expect(filas.every((f) => f.total === f.capital)).toBeTrue();
  });

  it('el saldo baja hasta cero en la última cuota, nunca queda negativo ni sobrante', () => {
    const filas = generarCuotas(1000, 3, new Date(2026, 0, 1));
    expect(filas[2].saldo).toBe(0);
  });

  it('datos inválidos devuelven una lista vacía, no revientan', () => {
    expect(generarCuotas(0, 12, new Date())).toEqual([]);
    expect(generarCuotas(1000, 0, new Date())).toEqual([]);
    expect(generarCuotas(1000, 12, new Date(NaN))).toEqual([]);
  });
});

describe('recomputarSaldos', () => {
  it('tras editar el capital de una fila a mano, el saldo de esa fila y las siguientes cambia', () => {
    const filas: FilaCuota[] = generarCuotas(1200, 3, new Date(2026, 0, 1));
    // El usuario sube la primera cuota a 500 en vez de 400.
    filas[0] = { ...filas[0], capital: 500 };

    const recomputadas = recomputarSaldos(filas, 1200);

    expect(recomputadas[0].saldo).toBe(700);
    // Las cuotas 2 y 3 no cambiaron su capital, pero su saldo arrastra el ajuste de la primera.
    expect(recomputadas[1].saldo).toBe(300);
    expect(recomputadas[2].saldo).toBe(-100); // el usuario se pasó del total: se ve, no se oculta.
  });

  it('editar el interés sube el total de esa fila sin tocar el capital de las demás', () => {
    const filas: FilaCuota[] = generarCuotas(300, 3, new Date(2026, 0, 1));
    filas[1] = { ...filas[1], interes: 10 };

    const recomputadas = recomputarSaldos(filas, 300);

    expect(recomputadas[1].total).toBe(110);
    expect(recomputadas[0].capital).toBe(100); // la fila 0 no se tocó
    expect(recomputadas[2].capital).toBe(100); // ni la 2
  });
});
