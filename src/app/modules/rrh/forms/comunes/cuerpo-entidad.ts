import { extraerCodigo } from '../parametrizacion/utiles-parametrizacion';
import { CampoFormulario } from './modelo-formulario';

/**
 * Armado del cuerpo que se envía al backend, y su comprobación previa.
 *
 * Vive fuera de cualquier componente **a propósito**: no depende de cómo se pinte el formulario
 * —panel, página o lo que venga— sino del contrato. Verificado contra el desplegado el
 * 2026-08-20.
 */

/** Datos con los que se completa el cuerpo, siempre desde la sesión, nunca escritos a mano. */
export interface ContextoCuerpo {
  /** Referencias fijas de la pantalla, p. ej. `{ empleado: { codigo: 7 } }`. */
  fijos?: Record<string, any>;
  usuarioRegistro: string;
}

/**
 * Nombre visible del primer campo de referencia que quedó a medias, o `null` si están todos bien.
 *
 * Un combo de referencia guarda el **objeto** de la fila elegida. Si el usuario escribe y no
 * llega a elegir, el control se queda con la cadena tecleada, y esa cadena viajaría como
 * `{ codigo: 'renun' }`. Comprobado contra el desplegado: el backend responde **400 «Not able to
 * deserialize data provided»**, que no le dice al usuario que le faltó elegir de la lista. Y con
 * un código inexistente responde **ORA-02291** con el nombre de la FK. Ninguno de los dos crea
 * fila, pero ninguno de los dos se entiende: por eso se corta antes de enviar.
 */
export function referenciaSinResolver(
  campos: CampoFormulario[],
  valores: Record<string, any>,
): string | null {
  for (const campo of campos) {
    if (campo.tipo !== 'referencia') continue;

    const valor = valores[campo.name];
    if (valor === null || valor === undefined || valor === '') continue;
    if (typeof valor === 'object') continue;

    return campo.label;
  }
  return null;
}

/**
 * La fila sin sus propiedades de adorno, lista para viajar al backend.
 *
 * Las tablas de este módulo pintan etiquetas calculadas —`conceptoLabel`, `estadoLabel`,
 * `cuotasLabel`— que no existen en la entidad. Si la fila formateada se manda tal cual en un
 * `PUT`, el backend responde **400 «Not able to deserialize data provided»** y la pantalla no
 * enseña nada. Por convención todas terminan en `Label`, así que se retiran por el nombre.
 * Verificado contra el desplegado el 2026-08-20.
 */
export function sinAdornos<T extends Record<string, any>>(datos: T): T {
  const limpio: Record<string, any> = {};
  for (const clave of Object.keys(datos ?? {})) {
    if (!clave.endsWith('Label')) limpio[clave] = datos[clave];
  }
  return limpio as T;
}

/**
 * Referencia a una fila de otra tabla, con su **clave primaria**.
 *
 * No sirve `extraerCodigo`: prefiere `codigoAlterno`, que es lo correcto para un detalle de
 * rubro —donde la columna guarda la alterna— pero no para una FK a una entidad. `ConceptoNomina`
 * tiene las dos, `CPNMCDGO` y `CPNMALTR`, y mandar la alterna no da error: apunta a otra fila.
 * Verificado contra el desplegado el 2026-08-20 con el préstamo hipotecario, alterna 24, que
 * quedó grabado como el concepto 24, «Seguro privado».
 *
 * Se aplica a todos los `camposReferencia` de `armarCuerpo`, no solo a los conceptos: cualquier
 * entidad con código alterno caía en lo mismo.
 */
export function referencia(valor: any): { codigo: any } | null {
  if (valor && typeof valor === 'object' && valor.codigo !== undefined && valor.codigo !== null) {
    return { codigo: valor.codigo };
  }
  const codigo = extraerCodigo(valor);
  return codigo === null || codigo === undefined ? null : { codigo };
}

/**
 * Cuerpo listo para el CRUD: escalares desenvueltos y referencias como `{ codigo }`.
 *
 * `base` tiene que ser el registro **tal como llegó del backend**, no la fila formateada de la
 * tabla: las propiedades de adorno —etiquetas de rubro, plazos calculados— no existen en la
 * entidad y el backend las rechaza entero con «Not able to deserialize data provided».
 *
 * `fechaRegistro` no se toca: los campos de auditoría los sella el servidor.
 */
export function armarCuerpo(
  base: any,
  valores: Record<string, any>,
  camposEscalares: string[],
  camposReferencia: string[],
  contexto: ContextoCuerpo,
): any {
  const cuerpo: any = {
    ...(base ?? {}),
    ...valores,
    ...(contexto.fijos ?? {}),
    usuarioRegistro: contexto.usuarioRegistro,
  };

  for (const campo of camposEscalares) {
    cuerpo[campo] = extraerCodigo(cuerpo[campo]);
  }
  for (const campo of camposReferencia) {
    cuerpo[campo] = referencia(cuerpo[campo]);
  }

  return cuerpo;
}
