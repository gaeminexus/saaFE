import { EntidadesRrh } from '../../../model/entidades-rrh';
import { RubrosRrh } from '../../../model/rubros-rrh';
import {
  CampoFormulario,
  ColumnaTabla,
  LineaResumen,
  TonoPastilla,
} from '../../comunes/modelo-formulario';

/**
 * Definición de las secciones de la ficha del colaborador.
 *
 * Es el mismo conocimiento de negocio que tenía `tablas-empleado.config.ts` —columnas, campos,
 * banderas, avisos y qué viaja como escalar o como referencia— expresado en el modelo propio del
 * módulo. Los nombres de propiedad **son contrato** (`CONTRATO-DTO-PARAMETRIZACION-RRHH.md`):
 * un nombre mal escrito aquí no rompe el build, se ve como un campo que no guarda.
 */
export type ClaveSeccion =
  | 'cargas-familiares'
  | 'contratos'
  | 'historial-cargos'
  | 'datos-bancarios'
  | 'gastos-personales'
  | 'conceptos-fijos'
  | 'novedades-iess';

/** Colecciones que la ficha carga una vez y reparte entre las secciones. */
export interface ColeccionesFicha {
  bancos: any[];
  conceptosNomina: any[];
  tiposContrato: any[];
  causalesTerminacion: any[];
  departamentosCargo: any[];
  contratos: any[];
}

export interface SeccionFicha {
  clave: ClaveSeccion;
  titulo: string;
  icono: string;
  entidad: number;
  /** Frase que explica para qué sirve la sección; se muestra bajo el título. */
  proposito: string;
  columnas: ColumnaTabla[];
  campos: CampoFormulario[];
  permiteBorrar: boolean;
  /** Campos que viajan como escalar y hay que desenvolver antes de enviar. */
  camposEscalares: string[];
  /** Campos que viajan como referencia `{ codigo }`. */
  camposReferencia: string[];
  mensajeVacio: string;
  /** Si la sección tiene formulario en vista propia, el segmento de ruta que lo abre. */
  rutaFormulario?: string;
  resumen?: (filas: any[]) => LineaResumen[];
}

const bandera = (name: string, label: string, valor = 'N'): CampoFormulario => ({
  name,
  label,
  tipo: 'siNo',
  valor,
});

const campoEstado: CampoFormulario = { name: 'estado', label: 'Estado', tipo: 'estado', valor: 1 };

/** El estado se ve de un vistazo: verde activo, gris inactivo. */
const tonoEstado = (fila: any): TonoPastilla => (Number(fila.estado) === 1 ? 'ok' : 'neutro');

const columnaEstado: ColumnaTabla = {
  campo: 'estadoLabel',
  titulo: 'Estado',
  ancho: '12%',
  pastilla: tonoEstado,
};

export function seccionesFicha(col: ColeccionesFicha): SeccionFicha[] {
  return [
    {
      clave: 'cargas-familiares',
      titulo: 'Cargas familiares',
      icono: 'family_restroom',
      entidad: EntidadesRrh.CARGA_FAMILIAR,
      proposito:
        'Las cargas que califican determinan el tope de gastos personales deducibles del impuesto a la renta.',
      mensajeVacio: 'Sin cargas familiares registradas.',
      columnas: [
        { campo: 'nombreCompleto', titulo: 'Dependiente', ancho: '30%' },
        { campo: 'parentescoLabel', titulo: 'Parentesco', ancho: '18%' },
        { campo: 'identificacion', titulo: 'Identificación', ancho: '16%' },
        { campo: 'calificaIrLabel', titulo: 'Rebaja IR', ancho: '12%', alinear: 'centro' },
        { campo: 'calificaUtilidadesLabel', titulo: 'Utilidades', ancho: '12%', alinear: 'centro' },
        columnaEstado,
      ],
      campos: [
        { name: 'parentesco', label: 'Parentesco', tipo: 'rubro', rubro: RubrosRrh.PARENTESCO_CARGA },
        { name: 'identificacion', label: 'Identificación', tipo: 'texto' },
        { name: 'apellidos', label: 'Apellidos', tipo: 'texto', mayusculas: true, requerido: true },
        { name: 'nombres', label: 'Nombres', tipo: 'texto', mayusculas: true, requerido: true },
        { name: 'fechaNacimiento', label: 'Fecha de nacimiento', tipo: 'fecha' },
        bandera('discapacidad', 'Tiene discapacidad'),
        { name: 'porcentajeDiscapacidad', label: '% de discapacidad', tipo: 'numero' },
        bandera('calificaIr', 'Califica para la rebaja de IR', 'S'),
        bandera('calificaUtilidades', 'Califica para utilidades', 'S'),
        bandera('dependeEconomicamente', 'Depende económicamente', 'S'),
        { name: 'fechaInicio', label: 'Rige desde', tipo: 'fecha' },
        { name: 'fechaFin', label: 'Rige hasta', tipo: 'fecha' },
        campoEstado,
      ],
      permiteBorrar: true,
      camposEscalares: [
        'parentesco',
        'discapacidad',
        'calificaIr',
        'calificaUtilidades',
        'dependeEconomicamente',
        'estado',
      ],
      camposReferencia: [],
      resumen: (filas) => {
        const activas = filas.filter((f) => Number(f.estado) === 1);
        const conRebaja = activas.filter((f) => f.calificaIr === 'S').length;
        return [
          {
            icono: 'family_restroom',
            texto: `${conRebaja} carga(s) califican para la rebaja de impuesto a la renta; son las que determinan el tope de gastos personales.`,
          },
        ];
      },
    },

    {
      clave: 'contratos',
      titulo: 'Contratos',
      icono: 'assignment',
      entidad: EntidadesRrh.CONTRATO_EMPLEADO,
      proposito:
        'La modalidad de décimos y de fondos de reserva del contrato vigente decide qué renglones calcula el motor cada mes.',
      mensajeVacio: 'Sin contratos registrados: el colaborador no entra en ninguna nómina.',
      columnas: [
        { campo: 'numero', titulo: 'Número', ancho: '10%' },
        { campo: 'tipoContratoLabel', titulo: 'Tipo', ancho: '14%' },
        { campo: 'relacionLaboralLabel', titulo: 'Relación laboral', ancho: '13%' },
        // La jornada no es el tipo de contrato: sin ella la fila dice «tiempo completo» dos
        // veces junto a medio sueldo, y quien revisa se para ahí sin saber que es media jornada.
        { campo: 'jornadaLabel', titulo: 'Jornada', ancho: '10%' },
        { campo: 'fechaInicio', titulo: 'Desde', ancho: '9%', formato: 'fecha' },
        { campo: 'fechaFin', titulo: 'Hasta', ancho: '9%', formato: 'fecha' },
        // «Hasta» es el fin previsto y «Terminado» el real: son fechas distintas y la tabla las
        // enseñaba como una sola. Un contrato cerrado antes de tiempo se leía como vigente.
        { campo: 'fechaTerminacion', titulo: 'Terminado', ancho: '10%', formato: 'fecha' },
        { campo: 'causalTerminacionLabel', titulo: 'Causal', ancho: '14%' },
        {
          campo: 'salarioBase',
          titulo: 'Sueldo',
          ancho: '11%',
          formato: 'dinero',
          alinear: 'derecha',
        },
      ],
      campos: [
        { name: 'numero', label: 'Número de contrato', tipo: 'texto', grupo: 'Identificación' },
        {
          name: 'tipoContratoEmpleado',
          label: 'Tipo de contrato',
          tipo: 'referencia',
          coleccion: col.tiposContrato,
          // RHH.TPCE no tiene un segundo campo identificatorio, solo banderas: aplica la excepción
          buscarPor: ['nombre'],
          grupo: 'Identificación',
        },
        {
          name: 'tipoRelacionLaboral',
          label: 'Relación laboral',
          tipo: 'rubro',
          rubro: RubrosRrh.TIPO_RELACION_LABORAL,
          grupo: 'Identificación',
        },
        { name: 'jornada', label: 'Jornada', tipo: 'rubro', rubro: RubrosRrh.TIPO_JORNADA, grupo: 'Identificación' },
        { name: 'fechaInicio', label: 'Fecha de inicio', tipo: 'fecha', grupo: 'Vigencia' },
        { name: 'fechaFin', label: 'Fecha de fin', tipo: 'fecha', grupo: 'Vigencia' },
        { name: 'salarioBase', label: 'Sueldo base', tipo: 'numero', requerido: true, grupo: 'Remuneración' },
        { name: 'horasSemanales', label: 'Horas semanales', tipo: 'numero', grupo: 'Vigencia' },
        { name: 'valorHora', label: 'Valor hora', tipo: 'numero', grupo: 'Remuneración' },
        {
          name: 'modalidadDecimoTercero',
          label: 'Modalidad décimo tercero',
          tipo: 'rubro',
          rubro: RubrosRrh.MODALIDAD_DECIMO_TERCERO,
          grupo: 'Beneficios',
        },
        {
          name: 'modalidadDecimoCuarto',
          label: 'Modalidad décimo cuarto',
          tipo: 'rubro',
          rubro: RubrosRrh.MODALIDAD_DECIMO_CUARTO,
          grupo: 'Beneficios',
        },
        {
          name: 'modalidadFondosReserva',
          label: 'Modalidad fondos de reserva',
          tipo: 'rubro',
          rubro: RubrosRrh.MODALIDAD_FONDOS_RESERVA,
          grupo: 'Beneficios',
        },
        { ...bandera('derechoDecimoCuarto', 'Tiene derecho a décimo cuarto', 'S'), grupo: 'Beneficios' },
        { ...bandera('aportaIess', 'Aporta al IESS', 'S'), grupo: 'Aportes y retenciones' },
        { ...bandera('retieneFuente', 'Se le retiene en la fuente'), grupo: 'Aportes y retenciones' },
        { name: 'porcentajeRetencionFuente', label: '% de retención en la fuente', tipo: 'numero', grupo: 'Aportes y retenciones' },
        { name: 'ocupacionMdt', label: 'Ocupación sectorial MDT', tipo: 'texto', grupo: 'Otros' },
        { name: 'observacion', label: 'Observación', tipo: 'texto', ancho: 'completo', grupo: 'Otros' },
      ],
      permiteBorrar: false,
      rutaFormulario: 'contratos',
      camposEscalares: [
        'tipoRelacionLaboral',
        'jornada',
        'modalidadDecimoTercero',
        'modalidadDecimoCuarto',
        'modalidadFondosReserva',
        'derechoDecimoCuarto',
        'aportaIess',
        'retieneFuente',
      ],
      camposReferencia: ['tipoContratoEmpleado'],
    },

    {
      clave: 'historial-cargos',
      titulo: 'Historial de cargos',
      icono: 'timeline',
      entidad: EntidadesRrh.HISTORIAL_CARGO,
      proposito: 'Deja constancia de cada cambio de cargo, de departamento o de sueldo.',
      mensajeVacio: 'Sin movimientos registrados.',
      columnas: [
        { campo: 'departamentoCargoLabel', titulo: 'Departamento — Cargo', ancho: '34%' },
        { campo: 'tipoCambioLabel', titulo: 'Tipo de cambio', ancho: '20%' },
        { campo: 'fechaInicio', titulo: 'Desde', ancho: '13%', formato: 'fecha' },
        { campo: 'fechaFin', titulo: 'Hasta', ancho: '13%', formato: 'fecha' },
        {
          campo: 'sueldoNuevo',
          titulo: 'Sueldo',
          ancho: '14%',
          formato: 'dinero',
          alinear: 'derecha',
        },
      ],
      campos: [
        {
          name: 'departamentoCargo',
          label: 'Departamento — Cargo',
          tipo: 'referencia',
          coleccion: col.departamentosCargo,
          // Combo de tabla: busca por el nombre del departamento y por el del cargo. Se listan
          // las dos grafías de la FK porque la serialización varía; ver `model/departamento-cargo.ts`.
          buscarPor: ['departamento.nombre', 'Departamento.nombre', 'cargo.nombre', 'Cargo.nombre'],
        },
        {
          name: 'tipoCambio',
          label: 'Tipo de cambio',
          tipo: 'rubro',
          rubro: RubrosRrh.TIPO_CAMBIO_HISTORIAL,
        },
        { name: 'fechaInicio', label: 'Vigente desde', tipo: 'fecha' },
        { name: 'fechaFin', label: 'Vigente hasta', tipo: 'fecha' },
        { name: 'sueldoAnterior', label: 'Sueldo anterior', tipo: 'numero' },
        { name: 'sueldoNuevo', label: 'Sueldo nuevo', tipo: 'numero' },
        { name: 'observacion', label: 'Observación', tipo: 'texto', ancho: 'completo' },
      ],
      permiteBorrar: false,
      camposEscalares: ['tipoCambio'],
      camposReferencia: ['departamentoCargo'],
    },

    {
      clave: 'datos-bancarios',
      titulo: 'Datos bancarios',
      icono: 'account_balance',
      entidad: EntidadesRrh.CUENTA_BANCARIA_EMPLEADO,
      proposito:
        'Sin al menos una cuenta activa no se puede generar la orden de pago del período: la corrida se detiene con el nombre del colaborador.',
      mensajeVacio: 'Sin cuentas registradas: no se le podrá acreditar el sueldo.',
      columnas: [
        { campo: 'bancoLabel', titulo: 'Banco', ancho: '26%' },
        { campo: 'tipoCuentaLabel', titulo: 'Tipo', ancho: '16%' },
        { campo: 'numeroCuenta', titulo: 'Número de cuenta', ancho: '22%' },
        { campo: 'principalLabel', titulo: 'Principal', ancho: '12%', alinear: 'centro' },
        { campo: 'porcentaje', titulo: '% del neto', ancho: '12%', alinear: 'derecha' },
        columnaEstado,
      ],
      campos: [
        {
          name: 'banco',
          label: 'Banco',
          tipo: 'referencia',
          coleccion: col.bancos,
          // TSR.BNCO solo expone el nombre como campo propio buscable
          buscarPor: ['nombre'],
        },
        {
          name: 'tipoCuenta',
          label: 'Tipo de cuenta',
          tipo: 'rubro',
          rubro: RubrosRrh.TIPO_CUENTA_BANCARIA,
        },
        { name: 'numeroCuenta', label: 'Número de cuenta', tipo: 'texto', requerido: true },
        { name: 'titular', label: 'Titular (si difiere)', tipo: 'texto' },
        { name: 'identificacionTitular', label: 'Identificación del titular', tipo: 'texto' },
        bandera('principal', 'Es la cuenta principal', 'S'),
        { name: 'porcentaje', label: '% del neto a acreditar', tipo: 'numero' },
        campoEstado,
      ],
      permiteBorrar: true,
      camposEscalares: ['tipoCuenta', 'principal', 'estado'],
      camposReferencia: ['banco'],
      resumen: (filas) => {
        const activas = filas.filter((f) => Number(f.estado) === 1);
        const suma = activas.reduce((total, f) => total + Number(f.porcentaje ?? 0), 0);

        if (activas.length === 0) {
          return [
            {
              icono: 'warning',
              texto:
                'Sin cuentas activas: no se podrá acreditar el sueldo ni generar el archivo bancario.',
              alerta: true,
            },
          ];
        }
        if (Math.abs(suma - 100) > 0.01) {
          return [
            {
              icono: 'report_problem',
              texto: `El reparto suma ${suma.toFixed(2)} % y debe sumar 100 % entre las cuentas activas.`,
              alerta: true,
            },
          ];
        }
        return [
          { icono: 'check_circle', texto: `Reparto completo entre ${activas.length} cuenta(s).` },
        ];
      },
    },

    {
      clave: 'gastos-personales',
      titulo: 'Gastos personales',
      icono: 'receipt_long',
      entidad: EntidadesRrh.GASTO_PERSONAL_PROYECTADO,
      proposito:
        'Lo que el colaborador proyecta gastar en el ejercicio; con el tope por cargas, es lo que rebaja su retención mensual.',
      mensajeVacio: 'Sin gastos proyectados para ningún ejercicio.',
      columnas: [
        { campo: 'anio', titulo: 'Ejercicio', ancho: '14%', alinear: 'centro' },
        { campo: 'tipoGastoLabel', titulo: 'Tipo de gasto', ancho: '32%' },
        {
          campo: 'valor',
          titulo: 'Valor proyectado',
          ancho: '22%',
          formato: 'dinero',
          alinear: 'derecha',
        },
        { campo: 'vigenteLabel', titulo: 'Vigente', ancho: '14%', alinear: 'centro' },
        columnaEstado,
      ],
      campos: [
        { name: 'anio', label: 'Ejercicio fiscal', tipo: 'numero', requerido: true },
        {
          name: 'tipoGasto',
          label: 'Tipo de gasto',
          tipo: 'rubro',
          rubro: RubrosRrh.TIPO_GASTO_PERSONAL,
        },
        { name: 'valor', label: 'Valor proyectado', tipo: 'numero', requerido: true },
        { name: 'fechaPresentacion', label: 'Fecha de presentación', tipo: 'fecha' },
        bandera('vigente', 'Es la versión vigente', 'S'),
        campoEstado,
      ],
      permiteBorrar: true,
      camposEscalares: ['tipoGasto', 'vigente', 'estado'],
      camposReferencia: [],
    },

    {
      clave: 'conceptos-fijos',
      titulo: 'Conceptos fijos',
      icono: 'repeat',
      entidad: EntidadesRrh.CONCEPTO_FIJO_EMPLEADO,
      proposito:
        'Ingresos o descuentos que se repiten cada mes sin necesidad de cargarlos como novedad.',
      mensajeVacio: 'Sin conceptos fijos asignados.',
      columnas: [
        { campo: 'conceptoLabel', titulo: 'Concepto', ancho: '32%' },
        { campo: 'valor', titulo: 'Valor', ancho: '15%', formato: 'dinero', alinear: 'derecha' },
        { campo: 'porcentaje', titulo: '%', ancho: '12%', alinear: 'derecha' },
        { campo: 'fechaInicio', titulo: 'Desde', ancho: '15%', formato: 'fecha' },
        { campo: 'fechaFin', titulo: 'Hasta', ancho: '15%', formato: 'fecha' },
        { campo: 'estadoLabel', titulo: 'Estado', ancho: '11%', pastilla: tonoEstado },
      ],
      campos: [
        {
          name: 'concepto',
          label: 'Concepto de nómina',
          tipo: 'referencia',
          coleccion: col.conceptosNomina,
          // Combo de tabla: busca por nombre y por código alterno del concepto
          buscarPor: ['nombre', 'codigoAlterno'],
        },
        {
          name: 'contrato',
          label: 'Contrato',
          tipo: 'referencia',
          coleccion: col.contratos,
          buscarPor: ['numero', 'fechaInicio'],
        },
        { name: 'valor', label: 'Valor fijo', tipo: 'numero' },
        { name: 'porcentaje', label: 'Porcentaje', tipo: 'numero' },
        { name: 'cantidad', label: 'Cantidad', tipo: 'numero' },
        { name: 'fechaInicio', label: 'Vigente desde', tipo: 'fecha' },
        {
          name: 'fechaFin',
          label: 'Vigente hasta',
          tipo: 'fecha',
          ayuda: 'Vacío significa indefinido',
        },
        { name: 'observacion', label: 'Observación', tipo: 'texto', ancho: 'completo' },
        campoEstado,
      ],
      permiteBorrar: true,
      camposEscalares: ['estado'],
      camposReferencia: ['concepto', 'contrato'],
    },

    {
      clave: 'novedades-iess',
      titulo: 'Novedades IESS',
      icono: 'health_and_safety',
      entidad: EntidadesRrh.NOVEDAD_IESS,
      // El plazo de cada aviso está parametrizado en el rubro 204 y la columna «Vence» lo
      // calcula con él: nombrar aquí los días de hoy convertiría esta frase en mentira el día
      // que cambien por un UPDATE.
      proposito:
        'Cada tipo de aviso tiene su propio plazo legal, y presentarlo fuera de él tiene multa. ' +
        'La columna «Vence» lo calcula con el plazo vigente.',
      mensajeVacio: 'Sin novedades registradas.',
      columnas: [
        { campo: 'tipoNovedadLabel', titulo: 'Novedad', ancho: '24%' },
        { campo: 'fechaHecho', titulo: 'Fecha del hecho', ancho: '15%', formato: 'fecha' },
        { campo: 'fechaLimiteEfectiva', titulo: 'Vence', ancho: '15%', formato: 'fecha' },
        { campo: 'fechaReporte', titulo: 'Reportada', ancho: '15%', formato: 'fecha' },
        {
          campo: 'plazoLabel',
          titulo: 'Plazo',
          ancho: '17%',
          pastilla: (fila) => {
            if (fila.plazoVencido) return 'error';
            if (fila.plazoPorVencer) return 'aviso';
            return 'ok';
          },
        },
        { campo: 'estadoLabel', titulo: 'Envío', ancho: '14%', pastilla: () => 'neutro' },
      ],
      campos: [
        {
          name: 'tipoNovedad',
          label: 'Tipo de novedad',
          tipo: 'rubro',
          rubro: RubrosRrh.TIPO_NOVEDAD_IESS,
        },
        { name: 'fechaHecho', label: 'Fecha del hecho', tipo: 'fecha' },
        { name: 'fechaReporte', label: 'Fecha en que se reportó', tipo: 'fecha' },
        { name: 'sueldoAnterior', label: 'Sueldo anterior', tipo: 'numero' },
        { name: 'sueldoNuevo', label: 'Sueldo nuevo', tipo: 'numero' },
        {
          name: 'modalidadFondosReserva',
          label: 'Modalidad de fondos de reserva',
          tipo: 'rubro',
          rubro: RubrosRrh.MODALIDAD_FONDOS_RESERVA,
        },
        {
          name: 'causalTerminacion',
          label: 'Causal de terminación (avisos de salida)',
          tipo: 'referencia',
          coleccion: col.causalesTerminacion,
          // Combo de tabla: busca por nombre y por artículo del Código del Trabajo
          buscarPor: ['nombre', 'articulo'],
        },
        {
          name: 'estado',
          label: 'Estado del envío',
          tipo: 'rubro',
          rubro: RubrosRrh.ESTADO_NOVEDAD_IESS,
        },
        { name: 'observacion', label: 'Observación', tipo: 'texto', ancho: 'completo' },
      ],
      permiteBorrar: true,
      camposEscalares: ['tipoNovedad', 'modalidadFondosReserva', 'estado'],
      camposReferencia: ['causalTerminacion'],
      resumen: (filas) => {
        const vencidas = filas.filter((f) => f.plazoVencido).length;
        const porVencer = filas.filter((f) => f.plazoPorVencer).length;
        const calculadas = filas.filter((f) => f.limiteCalculado).length;
        const discrepantes = filas.filter((f) => f.limiteDiscrepante).length;
        const lineas: LineaResumen[] = [];

        if (vencidas > 0) {
          lineas.push({
            icono: 'report_problem',
            texto: `${vencidas} novedad(es) fuera de plazo legal y sin reportar.`,
            alerta: true,
          });
        }
        if (porVencer > 0) {
          lineas.push({
            icono: 'schedule',
            texto: `${porVencer} novedad(es) con el plazo por vencer.`,
            alerta: true,
          });
        }
        // El vencimiento sale del rubro 204; si el backend calculó otro, hay que revisarlo
        if (discrepantes > 0) {
          lineas.push({
            icono: 'rule',
            texto:
              `${discrepantes} novedad(es) con un vencimiento distinto al que resulta del plazo ` +
              'parametrizado en el rubro de tipo de novedad IESS.',
            alerta: true,
          });
        }
        if (calculadas > 0) {
          lineas.push({
            icono: 'calculate',
            texto: `${calculadas} novedad(es) sin vencimiento del backend: se muestra el calculado con el plazo parametrizado.`,
          });
        }
        if (lineas.length === 0 && filas.length > 0) {
          lineas.push({ icono: 'check_circle', texto: 'Todas las novedades están en plazo.' });
        }
        return lineas;
      },
    },
  ];
}
