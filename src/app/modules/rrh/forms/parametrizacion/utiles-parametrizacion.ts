import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { empresaSesionCodigo } from '../../../../shared/services/empresa-sesion';
import { primerEjercicio } from '../comunes/ejercicios';

/** Colecciones reutilizables de los combos de parametrización. */
export const OPCIONES_SI_NO = [
  { codigo: 'S', descripcion: 'Sí' },
  { codigo: 'N', descripcion: 'No' },
];

export const OPCIONES_ESTADO = [
  { codigo: 1, descripcion: 'Activo' },
  { codigo: 0, descripcion: 'Inactivo' },
];

/**
 * Criterios de búsqueda filtrados por la empresa de la sesión.
 * Toda tabla de parametrización de RRHH lleva `PJRQCDGO`, así que este filtro es obligatorio.
 */
export function criteriosPorEmpresa(...ordenarPor: string[]): DatosBusqueda[] {
  const criterios: DatosBusqueda[] = [];
  const empresa = empresaSesionCodigo();

  if (empresa !== null) {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      empresa.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    criterios.push(db);
  }

  for (const campo of ordenarPor) {
    const orden = new DatosBusqueda();
    orden.orderBy(campo);
    criterios.push(orden);
  }

  return criterios;
}

/**
 * Filtra por año del lado del cliente.
 *
 * **No se puede filtrar por año en el servidor.** `anio` está mapeado como `Integer` en todas las
 * entidades de RHH, pero el `switch` de `EntityDaoImpl.selectByCriteria` solo sabe enlazar
 * `STRING`, `LONG`, `DATE`, `DATE_TIME` y `DOUBLE`: `INTEGER` cae en su `default` y el parámetro
 * queda sin enlazar, con la cláusula ya escrita en el `WHERE`. Enviar `LONG` produce
 * «Argument of type Long did not match parameter type Integer»; enviar `INTEGER` produce un
 * parámetro sin valor. Ninguno de los dos funciona.
 *
 * Filtrar en el cliente es además el patrón que ya usa el resto del sistema con este DAO
 * genérico, que tampoco pagina del lado del servidor. Los volúmenes lo permiten: los parámetros
 * anuales son dos filas por empresa y la tabla de IR son diez por ejercicio.
 *
 * La corrección de fondo es de una línea en el backend —añadir `case INTEGER` al `switch`— y
 * beneficiaría a todos los módulos. Está reportada.
 */
export function filtrarPorAnio<T extends { anio?: number | null }>(
  filas: T[] | null | undefined,
  anio: number,
): T[] {
  return (filas ?? []).filter((fila) => Number(fila.anio) === Number(anio));
}

/**
 * Extrae el valor escalar que espera el backend de un campo del formulario dinámico.
 * Los `select` devuelven el objeto de la colección y los `autocomplete` de rubro el detalle
 * completo, según por dónde haya pasado el usuario.
 *
 * Un campo que el usuario deja vacío llega como cadena vacía, no como nulo. Se normaliza aquí:
 * `''` en una columna numérica —`CPNMROLM`, sin ir más lejos, donde el nulo significa "concepto
 * ordinario"— no es un valor válido para el backend.
 */
export function extraerCodigo(valor: any): any {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor !== 'object') return valor;
  if (valor.codigoAlterno !== undefined) return valor.codigoAlterno;
  if (valor.codigo !== undefined) return valor.codigo;
  return null;
}

/** Referencia a la empresa de la sesión, en la forma que espera el backend. */
export function referenciaEmpresa(): { codigo: number } | null {
  const codigo = empresaSesionCodigo();
  return codigo === null ? null : { codigo };
}

/** Etiqueta legible de una bandera 'S' / 'N'. */
export function etiquetaSiNo(valor: string | null | undefined): string {
  return valor === 'S' ? 'Sí' : 'No';
}

/** Etiqueta legible del estado. */
export function etiquetaEstado(valor: number | string | null | undefined): string {
  return Number(valor) === 1 ? 'Activo' : 'Inactivo';
}

/**
 * Años ofrecidos en los selectores de ejercicio, del siguiente hacia atrás.
 *
 * El piso **no está escrito aquí**: sale del ejercicio más antiguo que el módulo haya visto
 * (`primerEjercicio()`), y mientras no se conozca ninguno cae en una ventana móvil respecto del
 * año en curso. Un año fijo envejece: en 2030 seguiría ofreciendo 2025.
 */
export function aniosDisponibles(desde = primerEjercicio()): number[] {
  const hasta = new Date().getFullYear() + 1;
  const anios: number[] = [];
  for (let anio = hasta; anio >= desde; anio--) anios.push(anio);
  return anios;
}
