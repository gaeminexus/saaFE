import { CampoFormulario } from '../../comunes/modelo-formulario';
import { RubrosRrh, RubrosSistema } from '../../../model/rubros-rrh';

export interface SeccionPersonal {
  titulo: string;
  icono: string;
  campos: CampoFormulario[];
}

/** Disposición de la sección de datos personales (RHH.MPLD). */
export const SECCIONES_DATOS_PERSONALES: SeccionPersonal[] = [
  {
    titulo: 'Identificación',
    icono: 'badge',
    campos: [
      {
        name: 'tipoIdentificacion',
        label: 'Tipo de identificación',
        tipo: 'rubro',
        rubro: RubrosSistema.TIPO_IDENTIFICACION,
      },
      { name: 'identificacion', label: 'Identificación', tipo: 'texto', requerido: true },
      { name: 'apellidos', label: 'Apellidos', tipo: 'texto', requerido: true },
      { name: 'nombres', label: 'Nombres', tipo: 'texto', requerido: true },
      { name: 'fechaNacimiento', label: 'Fecha de nacimiento', tipo: 'fecha' },
      { name: 'estadoCivil', label: 'Estado civil', tipo: 'rubro', rubro: RubrosRrh.ESTADO_CIVIL },
      { name: 'genero', label: 'Género', tipo: 'rubro', rubro: RubrosRrh.GENERO },
      { name: 'nacionalidad', label: 'Nacionalidad', tipo: 'texto' },
      {
        name: 'nivelInstruccion',
        label: 'Nivel de instrucción',
        tipo: 'rubro',
        rubro: RubrosRrh.NIVEL_INSTRUCCION,
      },
      { name: 'profesion', label: 'Profesión o título', tipo: 'texto' },
      { name: 'tipoSangre', label: 'Tipo de sangre', tipo: 'texto' },
    ],
  },
  {
    titulo: 'Condiciones especiales',
    icono: 'accessible',
    campos: [
      {
        name: 'discapacidad',
        label: 'Tiene discapacidad',
        tipo: 'siNo',
        ayuda: 'Da derecho a exoneración del impuesto a la renta',
      },
      { name: 'porcentajeDiscapacidad', label: '% de discapacidad', tipo: 'numero' },
      { name: 'carneConadis', label: 'Carné del CONADIS', tipo: 'texto' },
      {
        name: 'enfermedadCatastrofica',
        label: 'Enfermedad catastrófica',
        tipo: 'siNo',
        ayuda: 'Eleva el tope de gastos personales deducibles',
      },
    ],
  },
  {
    titulo: 'Relación con la empresa',
    icono: 'work',
    campos: [
      { name: 'codigoAfiliacion', label: 'Código de afiliación al IESS', tipo: 'texto' },
      { name: 'fechaIngreso', label: 'Fecha de ingreso', tipo: 'fecha' },
      {
        name: 'region',
        label: 'Región para el décimo cuarto',
        tipo: 'rubro',
        rubro: RubrosRrh.REGION_DECIMO_CUARTO,
        ayuda: 'Determina el período de cálculo y la fecha de pago',
      },
      { name: 'codigoBiometrico', label: 'Código en el biométrico', tipo: 'texto' },
    ],
  },
  {
    titulo: 'Contacto',
    icono: 'contact_phone',
    campos: [
      { name: 'email', label: 'Correo electrónico', tipo: 'texto' },
      { name: 'telefono', label: 'Teléfono', tipo: 'texto' },
      { name: 'direccion', label: 'Dirección', tipo: 'texto', ancho: 'completo' },
      { name: 'contactoEmergencia', label: 'Contacto de emergencia', tipo: 'texto' },
      { name: 'telefonoEmergencia', label: 'Teléfono de emergencia', tipo: 'texto' },
    ],
  },
];

export const CAMPOS_DATOS_PERSONALES: CampoFormulario[] = SECCIONES_DATOS_PERSONALES.flatMap(
  (s) => s.campos,
);
