import { Validators } from '@angular/forms';
import { FieldConfig } from '../../../../../shared/basics/table/dynamic-form/model/field.interface';
import { ConceptoNomina } from '../../../model/concepto-nomina';
import { ESTADOS_CUOTA } from '../../../model/descuento-recurrente';
import { RubrosRrh } from '../../../model/rubros-rrh';

const requerido = (mensaje: string) => [
  { name: 'required', validator: Validators.required, message: mensaje },
];

/** Formulario del descuento recurrente (RHH.DSRC). */
export function camposDescuento(conceptos: ConceptoNomina[]): FieldConfig[] {
  return [
    {
      type: 'autocomplete',
      name: 'tipoDescuento',
      label: 'Tipo de descuento',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.TIPO_DESCUENTO_RECURRENTE,
      selectField: ['descripcion'],
    },
    {
      type: 'autocomplete',
      name: 'conceptoNomina',
      label: 'Concepto con el que se descuenta',
      autocompleteType: 1,
      // Combo de tabla: busca por nombre y por código alterno del concepto
      selectField: ['nombre', 'codigoAlterno'],
      collections: conceptos,
    },
    { type: 'input', name: 'numero', label: 'Número de referencia', inputType: 'text' },
    {
      type: 'input',
      name: 'valor',
      label: 'Monto original',
      inputType: 'number',
      validations: requerido('El monto es requerido'),
    },
    {
      type: 'input',
      name: 'saldo',
      label: 'Saldo pendiente',
      inputType: 'number',
      validations: requerido('El saldo es requerido'),
    },
    { type: 'input', name: 'numeroCuotas', label: 'Número de cuotas', inputType: 'number' },
    { type: 'input', name: 'cuotasPagadas', label: 'Cuotas ya descontadas', inputType: 'number' },
    { type: 'input', name: 'valorCuota', label: 'Valor de la cuota', inputType: 'number' },
    {
      type: 'input',
      name: 'porcentaje',
      label: '% sobre el neto (retención judicial)',
      inputType: 'number',
    },
    { type: 'date', name: 'fechaInicio', label: 'Vigente desde' },
    { type: 'date', name: 'fechaFin', label: 'Fin estimado' },
    { type: 'input', name: 'beneficiario', label: 'Beneficiario', inputType: 'text' },
    { type: 'input', name: 'observacion', label: 'Observación', inputType: 'text' },
    {
      type: 'autocomplete',
      name: 'estado',
      label: 'Estado',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.ESTADO_DESCUENTO_RECURRENTE,
      selectField: ['descripcion'],
    },
  ];
}

/** Formulario de la cuota de amortización (RHH.CTDS). */
export function camposCuota(): FieldConfig[] {
  return [
    {
      type: 'input',
      name: 'numeroCuota',
      label: 'Número de cuota',
      inputType: 'number',
      validations: requerido('El número es requerido'),
    },
    { type: 'date', name: 'fechaVencimiento', label: 'Fecha de vencimiento' },
    {
      type: 'input',
      name: 'total',
      label: 'Valor total de la cuota',
      inputType: 'number',
      validations: requerido('El total es requerido'),
    },
    { type: 'input', name: 'capital', label: 'Capital', inputType: 'number' },
    { type: 'input', name: 'interes', label: 'Interés', inputType: 'number' },
    { type: 'input', name: 'saldo', label: 'Saldo tras la cuota', inputType: 'number' },
    {
      type: 'select',
      name: 'estado',
      label: 'Estado',
      value: 1,
      autocompleteType: 1,
      selectField: ['descripcion'],
      collections: ESTADOS_CUOTA,
    },
  ];
}
