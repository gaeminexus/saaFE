import { ProvisionNomina } from '../../../model/provision-nomina';
import { ReglonNomina } from '../../../model/reglon-nomina';

/** Resuelve la descripción de un detalle de rubro; se inyecta para no atar estas funciones a Angular. */
export type ResolverRubro = (rubroAlterno: number, valor: number | null | undefined) => string;

/**
 * Construcción de los dos archivos con los que se cuadra el período contra el rol real.
 *
 * El resumen por colaborador dice *quién* no cuadra; estos dicen *en qué renglón* se rompe, que
 * es la diferencia entre "el neto de Pérez difiere en 12 dólares" y "el fondo de reserva de
 * Pérez sale de una base que incluye el décimo tercero".
 */

export const ENCABEZADOS_DETALLE = [
  'Identificación',
  'Colaborador',
  'Código concepto',
  'Concepto',
  'Tipo',
  'Cantidad',
  'Base',
  'Porcentaje',
  'Valor',
];

export const CLAVES_DETALLE = [
  'identificacion',
  'colaborador',
  'codigoConcepto',
  'concepto',
  'tipo',
  'cantidad',
  'base',
  'porcentaje',
  'valor',
];

export const ENCABEZADOS_PROVISIONES = [
  'Identificación',
  'Colaborador',
  'Tipo de provisión',
  'Base de cálculo',
  'Valor',
];

export const CLAVES_PROVISIONES = [
  'identificacion',
  'colaborador',
  'tipoProvision',
  'baseCalculo',
  'valor',
];

/**
 * Una fila por colaborador y concepto, ordenada por colaborador y luego por el orden con el que
 * el concepto aparece en el rol. Ese orden es el que permite leer el archivo en paralelo al rol
 * de ASOPREP sin ir saltando.
 */
export function filasDetalleRenglones(
  nominas: any[],
  renglonesPorNomina: Map<number, ReglonNomina[]>,
  resolverRubro: ResolverRubro,
  rubroTipoConcepto: number,
): any[] {
  const filas: any[] = [];

  for (const nomina of [...nominas].sort(comparaColaborador)) {
    const renglones = [...(renglonesPorNomina.get(nomina.codigo) ?? [])].sort(
      (a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0),
    );

    for (const renglon of renglones) {
      const concepto = renglon.conceptoNomina as any;
      filas.push({
        identificacion: nomina.identificacion ?? '',
        colaborador: nomina.nombreEmpleado ?? '',
        codigoConcepto: concepto?.codigoAlterno ?? '',
        // Si el concepto no viene expandido, la descripción del renglón es el snapshot del nombre
        concepto: concepto?.nombre ?? renglon.descripcion ?? '',
        tipo: resolverRubro(rubroTipoConcepto, renglon.tipoConcepto),
        cantidad: renglon.cantidad ?? '',
        base: renglon.baseCalculo ?? '',
        porcentaje: renglon.porcentaje ?? '',
        valor: renglon.valor ?? 0,
      });
    }
  }

  return filas;
}

/** Una fila por colaborador y tipo de provisión, en el mismo orden de colaborador. */
export function filasProvisiones(
  provisiones: any[],
  resolverRubro: ResolverRubro,
  rubroTipoProvision: number,
): any[] {
  return [...provisiones]
    .sort(
      (a, b) =>
        comparaColaborador(a, b) || Number(a.tipoProvision ?? 0) - Number(b.tipoProvision ?? 0),
    )
    .map((provision) => ({
      identificacion: provision.identificacion ?? '',
      colaborador: provision.nombreEmpleado ?? '',
      tipoProvision: resolverRubro(rubroTipoProvision, provision.tipoProvision),
      baseCalculo: provision.baseCalculo ?? '',
      valor: provision.valor ?? 0,
    }));
}

/** Totales por tipo de provisión, que es como se contrastan contra el asiento de provisiones. */
export function totalesPorTipoProvision(
  provisiones: ProvisionNomina[],
  resolverRubro: ResolverRubro,
  rubroTipoProvision: number,
): { tipo: number; etiqueta: string; total: number; colaboradores: number }[] {
  const porTipo = new Map<number, { total: number; colaboradores: Set<number> }>();

  for (const provision of provisiones) {
    const tipo = Number(provision.tipoProvision);
    if (!porTipo.has(tipo)) porTipo.set(tipo, { total: 0, colaboradores: new Set() });

    const acumulado = porTipo.get(tipo)!;
    acumulado.total += Number(provision.valor ?? 0);

    const codigo = (provision.empleado as any)?.codigo;
    if (codigo) acumulado.colaboradores.add(codigo);
  }

  return [...porTipo.entries()]
    .map(([tipo, acumulado]) => ({
      tipo,
      etiqueta: resolverRubro(rubroTipoProvision, tipo),
      total: acumulado.total,
      colaboradores: acumulado.colaboradores.size,
    }))
    .sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
}

function comparaColaborador(a: any, b: any): number {
  const nombreA = String(a.nombreEmpleado ?? '');
  const nombreB = String(b.nombreEmpleado ?? '');
  return nombreA.localeCompare(nombreB);
}
