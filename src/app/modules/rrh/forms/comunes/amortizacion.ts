/**
 * La tabla de amortización se genera, no se teclea.
 *
 * El bug real que motivó esto: un anticipo se registraba y no aparecía en el cálculo porque no
 * existía ninguna cuota — el motor no busca «el descuento de esta persona», busca **la cuota que
 * vence dentro del período**. Sin cuotas no hay nada que descontar. Tecleando doce cuotas a mano
 * —número, fecha, total, capital, interés, saldo— es fácil que falte alguna o que las fechas no
 * calcen; generarlas desde la cabecera —valor, número de cuotas, primera fecha— lo hace imposible.
 *
 * Sin interés por defecto: la mayoría de lo que entra aquí —anticipos, préstamos internos— no
 * cobra interés, y quien sí lo necesite lo teclea fila por fila antes de confirmar. No se inventa
 * una tasa que nadie pidió.
 */

export interface FilaCuota {
  numeroCuota: number;
  fechaVencimiento: Date;
  capital: number;
  interes: number;
  total: number;
  saldo: number;
}

/**
 * Reparte `valorTotal` en `numeroCuotas` partes iguales, con la última absorbiendo el redondeo
 * para que la suma de capitales dé exacto el valor total, nunca un centavo de más o de menos.
 */
export function generarCuotas(
  valorTotal: number,
  numeroCuotas: number,
  fechaPrimera: Date,
): FilaCuota[] {
  if (!(valorTotal > 0) || !(numeroCuotas > 0) || !(fechaPrimera instanceof Date) || isNaN(fechaPrimera.getTime())) {
    return [];
  }

  const base = Math.floor((valorTotal / numeroCuotas) * 100) / 100;
  const filas: FilaCuota[] = [];
  let acumulado = 0;

  for (let i = 1; i <= numeroCuotas; i++) {
    const esUltima = i === numeroCuotas;
    const capital = esUltima ? redondear(valorTotal - acumulado) : base;
    acumulado = redondear(acumulado + capital);

    filas.push({
      numeroCuota: i,
      fechaVencimiento: new Date(
        fechaPrimera.getFullYear(),
        fechaPrimera.getMonth() + (i - 1),
        fechaPrimera.getDate(),
      ),
      capital,
      interes: 0,
      total: capital,
      saldo: redondear(valorTotal - acumulado),
    });
  }

  return filas;
}

/**
 * Tras editar el capital o el interés de una fila a mano, el total y los saldos de esa fila en
 * adelante dejan de ser los que se generaron — se recalculan sobre lo que quedó, no sobre lo
 * propuesto.
 */
export function recomputarSaldos(filas: FilaCuota[], valorTotal: number): FilaCuota[] {
  let acumulado = 0;
  return filas.map((fila) => {
    const total = redondear(fila.capital + fila.interes);
    acumulado = redondear(acumulado + fila.capital);
    return { ...fila, total, saldo: redondear(valorTotal - acumulado) };
  });
}

function redondear(valor: number): number {
  return Math.round(valor * 100) / 100;
}
