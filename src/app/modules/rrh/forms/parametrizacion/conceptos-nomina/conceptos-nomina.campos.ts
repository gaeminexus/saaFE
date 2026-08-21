import { FieldConfig } from '../../../../../shared/basics/table/dynamic-form/model/field.interface';
import { PlanCuenta } from '../../../../cnt/model/plan-cuenta';
import { RubrosRrh } from '../../../model/rubros-rrh';

interface OpcionesCampos {
  planCuentas: PlanCuenta[];
  opcionesSiNo: { codigo: string; descripcion: string }[];
  opcionesEstado: { codigo: number; descripcion: string }[];
  validadorRequerido: any;
}

/**
 * Definición del formulario de alta y edición de un concepto de nómina.
 *
 * Vive aparte del componente porque son 28 campos: dejarlo dentro dejaría el componente muy por
 * encima del límite de 300 líneas sin que ninguno de los dos ganara claridad.
 */
export function camposConceptoNomina(opciones: OpcionesCampos): FieldConfig[] {
  const { planCuentas, opcionesSiNo, opcionesEstado, validadorRequerido } = opciones;

  const bandera = (name: string, label: string, valor = 'N'): FieldConfig => ({
    type: 'select',
    name,
    label,
    value: valor,
    autocompleteType: 1,
    selectField: ['descripcion'],
    collections: opcionesSiNo,
  });

  return [
    {
      type: 'input',
      name: 'nombre',
      label: 'Concepto',
      inputType: 'text',
      transformToUppercase: true,
      validations: [
        { name: 'required', validator: validadorRequerido, message: 'El concepto es requerido' },
      ],
    },
    { type: 'input', name: 'abreviatura', label: 'Abreviatura (rol de pago)', inputType: 'text' },
    {
      type: 'input',
      name: 'codigoAlterno',
      label: 'Código alterno',
      inputType: 'number',
      validations: [
        {
          name: 'required',
          validator: validadorRequerido,
          message: 'El código alterno es requerido',
        },
      ],
    },
    {
      // El campo por el que el motor localiza cada concepto. Vacío es un valor válido y
      // frecuente: los conceptos ordinarios no tienen rol en el motor.
      type: 'autocomplete',
      name: 'rolMotor',
      label: 'Rol en el motor (vacío = concepto ordinario)',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.ROL_MOTOR_CONCEPTO,
      selectField: ['descripcion'],
    },
    {
      type: 'autocomplete',
      name: 'tipoConcepto',
      label: 'Tipo de concepto',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.TIPO_CONCEPTO_NOMINA,
      selectField: ['descripcion'],
    },
    {
      type: 'autocomplete',
      name: 'tipoCalculo',
      label: 'Tipo de cálculo',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.TIPO_CALCULO_CONCEPTO,
      selectField: ['descripcion'],
    },
    {
      type: 'autocomplete',
      name: 'baseCalculo',
      label: 'Base de cálculo',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.BASE_CALCULO,
      selectField: ['descripcion'],
    },
    {
      type: 'autocomplete',
      name: 'tipoRelacionLaboral',
      label: 'Relación laboral (vacío = todas)',
      autocompleteType: 1,
      rubroAlterno: RubrosRrh.TIPO_RELACION_LABORAL,
      selectField: ['descripcion'],
    },
    { type: 'input', name: 'valor', label: 'Valor fijo', inputType: 'number' },
    { type: 'input', name: 'porcentaje', label: 'Porcentaje', inputType: 'number' },
    { type: 'input', name: 'formula', label: 'Fórmula', inputType: 'text' },

    bandera('imponibleIess', 'Imponible IESS'),
    bandera('imponibleIr', 'Gravado impuesto a la renta'),
    bandera('aportaFondosReserva', 'Base de fondos de reserva'),
    bandera('baseDecimoTercero', 'Base del décimo tercero'),
    bandera('baseDecimoCuarto', 'Base del décimo cuarto'),
    bandera('baseVacaciones', 'Base de vacaciones'),
    bandera('baseUtilidades', 'Base de utilidades'),
    bandera('patronal', 'Costo patronal (no afecta el neto)'),
    bandera('provision', 'Genera provisión'),
    bandera('obligatorio', 'Se aplica a todo contrato vigente'),
    bandera('recortable', 'Recortable ante neto negativo', 'S'),

    { type: 'input', name: 'casilleroRdep', label: 'Casillero RDEP', inputType: 'text' },
    { type: 'input', name: 'codigoIess', label: 'Código en planilla IESS', inputType: 'text' },
    { type: 'input', name: 'casilleroF107', label: 'Casillero formulario 107', inputType: 'text' },
    {
      type: 'autocomplete',
      name: 'planCuenta',
      label: 'Cuenta contable',
      autocompleteType: 1,
      // Combo alimentado de CNT.PLNN: busca por número de cuenta y por nombre
      selectField: ['cuentaContable', 'nombre'],
      collections: planCuentas,
    },
    { type: 'input', name: 'orden', label: 'Orden', inputType: 'number' },
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
