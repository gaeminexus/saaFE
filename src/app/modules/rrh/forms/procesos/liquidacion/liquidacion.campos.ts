import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { CampoFormulario } from '../../comunes/modelo-formulario';

/**
 * Datos de la salida que hay que dar antes de simular o calcular un finiquito.
 *
 * Los tres combos de tabla buscan por **dos campos**, como exige la regla del proyecto: el
 * colaborador por apellidos, nombres y cédula; el contrato por número y fecha de inicio; y la
 * causal por nombre y artículo del Código del Trabajo —que es lo que decide qué rubros de ley
 * entran en el finiquito—.
 */
export function camposLiquidacion(
  empleados: any[],
  contratos: any[],
  causales: any[],
): CampoFormulario[] {
  return [
    {
      name: 'empleado',
      label: 'Colaborador',
      tipo: 'referencia',
      coleccion: empleados,
      buscarPor: ['apellidos', 'nombres', 'identificacion'],
      requerido: true,
    },
    {
      name: 'contrato',
      label: 'Contrato',
      tipo: 'referencia',
      coleccion: contratos,
      buscarPor: ['numero', 'fechaInicio'],
      requerido: true,
      ayuda: 'Elija primero el colaborador para acotar la lista',
    },
    { name: 'fechaSalida', label: 'Fecha de salida', tipo: 'fecha', requerido: true },
    {
      name: 'causal',
      label: 'Causal de terminación',
      tipo: 'referencia',
      coleccion: causales,
      buscarPor: ['nombre', 'articulo'],
      requerido: true,
      ayuda: 'Decide qué rubros de ley entran en el finiquito',
    },
    { name: 'observaciones', label: 'Observaciones', tipo: 'texto', ancho: 'completo' },
  ];
}

/**
 * Criterios para leer el detalle (`TMLQ`) de un finiquito, ordenado como se calculó.
 *
 * `liquidacion.codigo` va como `LONG`, que es lo único que el DAO genérico sabe enlazar para una
 * FK; el orden por `orden` respeta la secuencia con la que el motor emitió los rubros.
 */
export function criteriosDetalleLiquidacion(idLiquidacion: number): DatosBusqueda[] {
  const db = new DatosBusqueda();
  db.asignaValorConCampoPadre(
    TipoDatosBusqueda.LONG,
    'liquidacion',
    'codigo',
    String(idLiquidacion),
    TipoComandosBusqueda.IGUAL,
  );

  const orden = new DatosBusqueda();
  orden.orderBy('orden');

  return [db, orden];
}
