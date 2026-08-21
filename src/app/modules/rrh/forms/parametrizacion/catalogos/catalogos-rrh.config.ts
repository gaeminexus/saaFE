import { Validators } from '@angular/forms';
import { FieldConfig } from '../../../../../shared/basics/table/dynamic-form/model/field.interface';
import { FieldFormat } from '../../../../../shared/basics/table/model/field-format-interface';
import { Cargo } from '../../../model/cargo';
import { Departamento } from '../../../model/departamento';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { extraerCodigo, referenciaEmpresa } from '../utiles-parametrizacion';

export type ClaveCatalogo =
  | 'cargos'
  | 'departamentos'
  | 'departamento-cargo'
  | 'tipos-contrato'
  | 'turnos';

export interface DefinicionCatalogo {
  titulo: string;
  subtitulo: string;
  icono: string;
  entidad: number;
  fields: FieldFormat[];
  regConfig: FieldConfig[];
  permiteBorrar: boolean;
  onBeforeSave: (datos: any) => any;
}

/** Colecciones que algunos catálogos necesitan cargar antes de construir su formulario. */
export interface DependenciasCatalogo {
  departamentos: Departamento[];
  cargos: Cargo[];
}

/**
 * Las tablas de parametrización que ya existían en RHH guardan el estado como 'A' / 'I', a
 * diferencia de las creadas en esta fase, que usan el rubro numérico. Se respeta cada convención
 * en su tabla en vez de forzar una migración desde el frontend.
 */
const OPCIONES_ESTADO_TEXTO = [
  { codigo: 'A', descripcion: 'Activo' },
  { codigo: 'I', descripcion: 'Inactivo' },
];

const OPCIONES_SI_NO_TEXTO = [
  { codigo: 'S', descripcion: 'Sí' },
  { codigo: 'N', descripcion: 'No' },
];

const campoEstadoTexto: FieldConfig = {
  type: 'select',
  name: 'estado',
  label: 'Estado',
  value: 'A',
  autocompleteType: 1,
  selectField: ['descripcion'],
  collections: OPCIONES_ESTADO_TEXTO,
};

const requerido = (mensaje: string) => [
  { name: 'required', validator: Validators.required, message: mensaje },
];

export function definicionCatalogo(
  clave: ClaveCatalogo,
  deps: DependenciasCatalogo,
): DefinicionCatalogo {
  switch (clave) {
    case 'cargos':
      return {
        titulo: 'Cargos y puestos',
        subtitulo: 'Denominaciones de puesto y sus requisitos',
        icono: 'badge',
        entidad: EntidadesRrh.CARGO,
        fields: [
          { column: 'nombre', header: 'Cargo', fWidth: '30%' },
          { column: 'descripcion', header: 'Descripción', fWidth: '35%' },
          { column: 'estadoLabel', header: 'Estado', fWidth: '15%' },
        ],
        regConfig: [
          {
            type: 'input',
            name: 'nombre',
            label: 'Cargo',
            inputType: 'text',
            transformToUppercase: true,
            validations: requerido('El nombre del cargo es requerido'),
          },
          { type: 'input', name: 'descripcion', label: 'Descripción', inputType: 'text' },
          { type: 'input', name: 'requisitos', label: 'Requisitos', inputType: 'text' },
          campoEstadoTexto,
        ],
        permiteBorrar: false,
        onBeforeSave: (datos) => ({ ...datos, estado: extraerCodigo(datos.estado) }),
      };

    case 'departamentos':
      return {
        titulo: 'Departamentos',
        subtitulo: 'Estructura organizativa de la empresa',
        icono: 'account_tree',
        entidad: EntidadesRrh.DEPARTAMENTO,
        fields: [
          { column: 'nombre', header: 'Departamento', fWidth: '60%' },
          { column: 'estadoLabel', header: 'Estado', fWidth: '20%' },
        ],
        regConfig: [
          {
            type: 'input',
            name: 'nombre',
            label: 'Departamento',
            inputType: 'text',
            transformToUppercase: true,
            validations: requerido('El nombre del departamento es requerido'),
          },
          campoEstadoTexto,
        ],
        permiteBorrar: false,
        onBeforeSave: (datos) => ({ ...datos, estado: extraerCodigo(datos.estado) }),
      };

    case 'departamento-cargo':
      return {
        titulo: 'Departamento — Cargo',
        subtitulo: 'Cargos habilitados en cada departamento',
        icono: 'hub',
        entidad: EntidadesRrh.DEPARTAMENTO_CARGO,
        fields: [
          { column: 'departamentoLabel', header: 'Departamento', fWidth: '35%' },
          { column: 'cargoLabel', header: 'Cargo', fWidth: '35%' },
          { column: 'estadoLabel', header: 'Estado', fWidth: '20%' },
        ],
        regConfig: [
          {
            type: 'autocomplete',
            name: 'departamento',
            label: 'Departamento',
            autocompleteType: 1,
            // RHH.DPRT solo tiene nombre como campo propio: aplica la excepción de la regla de combos
            selectField: ['nombre'],
            collections: deps.departamentos,
          },
          {
            type: 'autocomplete',
            name: 'cargo',
            label: 'Cargo',
            autocompleteType: 1,
            // Combo de tabla: busca por nombre y descripción
            selectField: ['nombre', 'descripcion'],
            collections: deps.cargos,
          },
          campoEstadoTexto,
        ],
        permiteBorrar: true,
        onBeforeSave: (datos) => ({
          ...datos,
          departamento: refDe(datos.departamento),
          cargo: refDe(datos.cargo),
          estado: extraerCodigo(datos.estado),
        }),
      };

    case 'tipos-contrato':
      return {
        titulo: 'Tipos de contrato',
        subtitulo: 'Modalidades contractuales y su relación laboral',
        icono: 'description',
        entidad: EntidadesRrh.TIPO_CONTRATO_EMPLEADO,
        fields: [
          { column: 'nombre', header: 'Tipo de contrato', fWidth: '32%' },
          { column: 'relacionLaboralLabel', header: 'Relación laboral', fWidth: '28%' },
          { column: 'duracionMaximaMeses', header: 'Duración máx. (meses)', fWidth: '18%', fAlign: 'aC' },
          { column: 'estadoLabel', header: 'Estado', fWidth: '15%' },
        ],
        regConfig: [
          {
            type: 'input',
            name: 'nombre',
            label: 'Tipo de contrato',
            inputType: 'text',
            transformToUppercase: true,
            validations: requerido('El nombre del tipo de contrato es requerido'),
          },
          {
            type: 'autocomplete',
            name: 'tipoRelacionLaboral',
            label: 'Relación laboral',
            autocompleteType: 1,
            rubroAlterno: RubrosRrh.TIPO_RELACION_LABORAL,
            selectField: ['descripcion'],
          },
          {
            type: 'select',
            name: 'requiereFechaFin',
            label: 'Requiere fecha de fin',
            value: 'N',
            autocompleteType: 1,
            selectField: ['descripcion'],
            collections: OPCIONES_SI_NO_TEXTO,
          },
          {
            type: 'input',
            name: 'duracionMaximaMeses',
            label: 'Duración máxima (meses)',
            inputType: 'number',
          },
          campoEstadoTexto,
        ],
        permiteBorrar: false,
        onBeforeSave: (datos) => ({
          ...datos,
          empresa: referenciaEmpresa(),
          tipoRelacionLaboral: extraerCodigo(datos.tipoRelacionLaboral),
          requiereFechaFin: extraerCodigo(datos.requiereFechaFin),
          estado: extraerCodigo(datos.estado),
        }),
      };

    case 'turnos':
      return {
        titulo: 'Turnos y horarios',
        subtitulo: 'Jornadas de referencia para el control de asistencia',
        icono: 'schedule',
        entidad: EntidadesRrh.TURNO,
        fields: [
          { column: 'nombre', header: 'Turno', fWidth: '30%' },
          { column: 'horaEntrada', header: 'Entrada', fWidth: '15%', fAlign: 'aC' },
          { column: 'horaSalida', header: 'Salida', fWidth: '15%', fAlign: 'aC' },
          { column: 'toleranciaMinutos', header: 'Tolerancia (min)', fWidth: '18%', fAlign: 'aC' },
          { column: 'estadoLabel', header: 'Estado', fWidth: '15%' },
        ],
        regConfig: [
          {
            type: 'input',
            name: 'nombre',
            label: 'Turno',
            inputType: 'text',
            transformToUppercase: true,
            validations: requerido('El nombre del turno es requerido'),
          },
          { type: 'input', name: 'horaEntrada', label: 'Hora de entrada', inputType: 'time' },
          { type: 'input', name: 'horaSalida', label: 'Hora de salida', inputType: 'time' },
          {
            type: 'input',
            name: 'toleranciaMinutos',
            label: 'Tolerancia de atraso (minutos)',
            inputType: 'number',
          },
          {
            type: 'select',
            name: 'requiereMarcacionSalida',
            label: 'Requiere marcación de salida',
            value: true,
            autocompleteType: 1,
            selectField: ['descripcion'],
            collections: [
              { codigo: true, descripcion: 'Sí' },
              { codigo: false, descripcion: 'No' },
            ],
          },
          campoEstadoTexto,
        ],
        permiteBorrar: false,
        onBeforeSave: (datos) => ({
          ...datos,
          // RHH.TRNO guarda esta bandera como booleano, no como 'S' / 'N'
          requiereMarcacionSalida: extraerCodigo(datos.requiereMarcacionSalida) === true,
          estado: extraerCodigo(datos.estado),
        }),
      };
  }
}

/** Los combos de tabla devuelven el registro completo; el backend espera solo la referencia. */
function refDe(valor: any): { codigo: number } | null {
  const codigo = extraerCodigo(valor);
  return codigo === null || codigo === undefined ? null : { codigo };
}
