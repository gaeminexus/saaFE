import { TablaImpuestoRenta } from '../../../model/tabla-impuesto-renta';

/** Tolerancia de céntimo con la que se comparan los importes de la tabla. */
const TOLERANCIA = 0.01;

/**
 * Comprueba la coherencia aritmética de la tabla del impuesto a la renta.
 *
 * La regla es la misma que verifica el script de parametrización con `LAG(...)`: el impuesto
 * sobre la fracción básica de un tramo debe ser el del tramo anterior más su fracción excedente
 * por su porcentaje. Además, la fracción básica de un tramo debe coincidir con el "exceso hasta"
 * del anterior, y solo el último tramo puede quedar sin límite superior.
 *
 * Devuelve la lista de inconsistencias en texto; vacía significa que la tabla cuadra.
 */
export function verificarCoherencia(tramos: TablaImpuestoRenta[]): string[] {
  if (!tramos || tramos.length === 0) return [];

  const ordenados = [...tramos].sort((a, b) => a.orden - b.orden);
  const problemas: string[] = [];

  ordenados.forEach((tramo, indice) => {
    const anterior = indice > 0 ? ordenados[indice - 1] : null;
    const esUltimo = indice === ordenados.length - 1;

    if (!esUltimo && (tramo.excesoHasta === null || tramo.excesoHasta === undefined)) {
      problemas.push(`Tramo ${tramo.orden}: solo el último tramo puede quedar sin "exceso hasta".`);
    }

    if (esUltimo && tramo.excesoHasta !== null && tramo.excesoHasta !== undefined) {
      problemas.push(`Tramo ${tramo.orden}: el último tramo no debe tener "exceso hasta".`);
    }

    if (!anterior) {
      if (Math.abs(Number(tramo.impuestoFraccionBasica)) > TOLERANCIA) {
        problemas.push(`Tramo ${tramo.orden}: el primer tramo debe partir de impuesto cero.`);
      }
      return;
    }

    const limiteAnterior = Number(anterior.excesoHasta ?? NaN);
    if (!Number.isNaN(limiteAnterior)) {
      const salto = Math.abs(Number(tramo.fraccionBasica) - limiteAnterior);
      if (salto > TOLERANCIA) {
        problemas.push(
          `Tramo ${tramo.orden}: la fracción básica no continúa donde terminó el tramo ${anterior.orden}.`,
        );
      }

      const excedente = limiteAnterior - Number(anterior.fraccionBasica);
      const esperado =
        Number(anterior.impuestoFraccionBasica) + (excedente * Number(anterior.porcentaje)) / 100;
      const diferencia = Math.abs(Number(tramo.impuestoFraccionBasica) - esperado);

      if (diferencia > TOLERANCIA) {
        problemas.push(
          `Tramo ${tramo.orden}: el impuesto sobre la fracción básica debería ser ` +
            `${esperado.toFixed(2)} y está en ${Number(tramo.impuestoFraccionBasica).toFixed(2)}.`,
        );
      }
    }
  });

  return problemas;
}
