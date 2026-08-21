import { FieldConfig } from '../../../../../shared/basics/table/dynamic-form/model/field.interface';
import { RubrosRrh } from '../../../model/rubros-rrh';

/** Campos del formato de archivo (RHH.FMRC). */
export function camposFormato(
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
    { type: 'input', name: 'marca', label: 'Marca y modelo del equipo', inputType: 'text' },
    {
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
    { type: 'input', name: 'lineasCabecera', label: 'Líneas de cabecera a saltar', inputType: 'number' },
    { type: 'input', name: 'lineasPie', label: 'Líneas de pie a ignorar', inputType: 'number' },
    { type: 'input', name: 'formatoFecha', label: 'Patrón de fecha', inputType: 'text' },
    { type: 'input', name: 'formatoHora', label: 'Patrón de hora', inputType: 'text' },
    { type: 'input', name: 'formatoFechaHora', label: 'Patrón de fecha y hora', inputType: 'text' },
    { type: 'input', name: 'codificacion', label: 'Codificación del archivo', inputType: 'text' },
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

/** Campos del mapeo campo a campo (RHH.DFMR). */
export function camposDetalleFormato(
  opcionesSiNo: { codigo: string; descripcion: string }[],
  opcionesEstado: { codigo: number; descripcion: string }[],
  validadorRequerido: any,
): FieldConfig[] {
  return [
    {
      type: 'autocomplete',
      name: 'campo',
      label: 'Campo lógico',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.CAMPO_ARCHIVO_MARCACION,
      selectField: ['descripcion'],
    },
    {
      type: 'input',
      name: 'orden',
      label: 'Orden en la línea',
      inputType: 'number',
      validations: [
        { name: 'required', validator: validadorRequerido, message: 'El orden es requerido' },
      ],
    },
    {
      type: 'input',
      name: 'posicion',
      label: 'Posición (delimitado, base 1)',
      inputType: 'number',
    },
    {
      type: 'input',
      name: 'indiceInicio',
      label: 'Índice de inicio (ancho fijo, base 0)',
      inputType: 'number',
    },
    { type: 'input', name: 'longitud', label: 'Longitud (ancho fijo)', inputType: 'number' },
    {
      type: 'input',
      name: 'mapeo',
      label: 'Mapeo de valores origen',
      inputType: 'text',
    },
    {
      type: 'select',
      name: 'obligatorio',
      label: 'Obligatorio',
      value: 'S',
      autocompleteType: 1,
      selectField: ['descripcion'],
      collections: opcionesSiNo,
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
