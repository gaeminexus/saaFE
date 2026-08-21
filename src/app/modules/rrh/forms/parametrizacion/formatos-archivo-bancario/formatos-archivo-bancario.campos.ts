import { FieldConfig } from '../../../../../shared/basics/table/dynamic-form/model/field.interface';
import { MARCADORES_PLANTILLA } from '../../../model/formato-archivo-bancario';
import { RubrosRrh } from '../../../model/rubros-rrh';

/** Texto de ayuda con los marcadores admitidos, para no obligar a memorizarlos. */
const AYUDA_MARCADORES = MARCADORES_PLANTILLA.map((m) => m.marcador).join(' ');

/**
 * Campos del formato bancario (RHH.FMBN).
 *
 * `plantillaCabecera` y `plantillaPie` son **texto libre con marcadores**, no filas de detalle:
 * el banco suele pedir una línea de control al principio y otra al final, con el total y el
 * número de registros. El backend sustituye los marcadores al generar.
 */
export function camposFormatoBancario(
  opcionesEstado: { codigo: number; descripcion: string }[],
  validadorRequerido: any,
): FieldConfig[] {
  return [
    {
      type: 'input',
      name: 'nombre',
      label: 'Nombre del formato',
      inputType: 'text',
      transformToUppercase: true,
      validations: [
        { name: 'required', validator: validadorRequerido, message: 'El nombre es requerido' },
      ],
    },
    {
      type: 'input',
      name: 'banco',
      label: 'Banco que exige el formato',
      inputType: 'text',
      transformToUppercase: true,
      validations: [
        { name: 'required', validator: validadorRequerido, message: 'El banco es requerido' },
      ],
    },
    {
      // Reutiliza el rubro 209: describe cualquier archivo plano, no solo los del reloj
      type: 'autocomplete',
      name: 'tipoFormato',
      label: 'Tipo de formato',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.FORMATO_ARCHIVO_MARCACION,
      selectField: ['descripcion'],
    },
    {
      type: 'input',
      name: 'delimitador',
      label: 'Delimitador (formatos delimitados)',
      inputType: 'text',
    },
    { type: 'input', name: 'extension', label: 'Extensión del archivo (txt, csv…)', inputType: 'text' },
    { type: 'input', name: 'codificacion', label: 'Codificación del archivo', inputType: 'text' },
    { type: 'input', name: 'formatoFecha', label: 'Patrón de fecha por defecto', inputType: 'text' },
    {
      type: 'input',
      name: 'plantillaCabecera',
      label: `Plantilla de cabecera · ${AYUDA_MARCADORES}`,
      inputType: 'text',
    },
    {
      type: 'input',
      name: 'plantillaPie',
      label: `Plantilla de pie · ${AYUDA_MARCADORES}`,
      inputType: 'text',
    },
    {
      type: 'input',
      name: 'mapaTipoCuenta',
      label: 'Mapa de tipo de cuenta (alterno=códigoBanco;…)',
      inputType: 'text',
    },
    {
      type: 'select',
      name: 'estado',
      label: 'Estado',
      value: 1,
      autocompleteType: 1,
      selectField: ['descripcion'],
      collections: opcionesEstado,
    },
  ];
}

/**
 * Campos del detalle (RHH.DFMB).
 *
 * `valorFijo` solo tiene sentido cuando el campo es LITERAL_FIJO: es el texto que se escribe tal
 * cual en esa columna. Es lo que resuelve, por ejemplo, el código del banco destino cuando se
 * paga siempre al mismo, ya que `TSR.BNCO` no guarda código de institución.
 */
export function camposDetalleFormatoBancario(
  opcionesSiNo: { codigo: string; descripcion: string }[],
  opcionesEstado: { codigo: number; descripcion: string }[],
  opcionesLado: { codigo: string; descripcion: string }[],
  validadorRequerido: any,
): FieldConfig[] {
  return [
    {
      type: 'autocomplete',
      name: 'campo',
      label: 'Campo',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.CAMPO_ARCHIVO_BANCARIO,
      selectField: ['descripcion'],
    },
    {
      type: 'input',
      name: 'orden',
      label: 'Orden en la línea (único en el formato)',
      inputType: 'number',
      validations: [
        { name: 'required', validator: validadorRequerido, message: 'El orden es requerido' },
      ],
    },
    {
      type: 'input',
      name: 'indiceInicio',
      label: 'Índice de inicio (ancho fijo, base 0)',
      inputType: 'number',
    },
    {
      type: 'input',
      name: 'longitud',
      label: 'Longitud (ancho fijo; un valor más largo se recorta)',
      inputType: 'number',
    },
    {
      type: 'select',
      name: 'ladoRelleno',
      label: 'Lado del relleno',
      autocompleteType: 1,
      selectField: ['descripcion'],
      collections: opcionesLado,
    },
    { type: 'input', name: 'caracterRelleno', label: 'Carácter de relleno', inputType: 'text' },
    { type: 'input', name: 'decimales', label: 'Decimales (campos de importe)', inputType: 'number' },
    {
      type: 'select',
      name: 'incluyeSeparadorDecimal',
      label: 'Incluye el separador decimal',
      value: 'N',
      autocompleteType: 1,
      selectField: ['descripcion'],
      collections: opcionesSiNo,
    },
    {
      type: 'input',
      name: 'formatoFecha',
      label: 'Patrón de fecha (vacío hereda el del formato)',
      inputType: 'text',
    },
    {
      type: 'input',
      name: 'valorFijo',
      label: 'Valor fijo (solo para el campo LITERAL_FIJO)',
      inputType: 'text',
    },
    {
      type: 'select',
      name: 'estado',
      label: 'Estado',
      value: 1,
      autocompleteType: 1,
      selectField: ['descripcion'],
      collections: opcionesEstado,
    },
  ];
}
