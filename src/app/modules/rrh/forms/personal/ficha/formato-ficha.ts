import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { departamentoDe, etiquetaDepartamentoCargo } from '../../../model/departamento-cargo';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { etiquetaEstado, etiquetaSiNo } from '../../parametrizacion/utiles-parametrizacion';
import { ClaveSeccion } from './secciones-ficha.config';

/**
 * Etiquetas y semáforos de las filas de la ficha.
 *
 * Se mantiene aparte del componente para que este quede en su tamaño: aquí no hay estado ni
 * ciclo de vida, solo la traducción de una fila del backend a lo que se ve en la tabla.
 */
export interface DependenciasFormato {
  detalleRubroService: DetalleRubroService;
  funcionesDatosS: FuncionesDatosService;
}

export function formatearFilas(
  filas: any[],
  clave: ClaveSeccion,
  deps: DependenciasFormato,
): any[] {
  const hoy = hoySinHora();

  return filas.map((row) => {
    const plazo = plazoDelIess(row, clave, deps);
    const sinReportar = !row.fechaReporte;
    const diasRestantes =
      plazo.limite === null
        ? null
        : Math.round((plazo.limite.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    return {
      ...row,
      // Las fechas se normalizan siempre: llegan como arreglo, como texto o como Date
      fechaInicio: aFecha(row.fechaInicio, deps),
      fechaFin: aFecha(row.fechaFin, deps),
      fechaTerminacion: aFecha(row.fechaTerminacion, deps),
      fechaNacimiento: aFecha(row.fechaNacimiento, deps),
      fechaHecho: aFecha(row.fechaHecho, deps),
      fechaReporte: aFecha(row.fechaReporte, deps),
      fechaPresentacion: aFecha(row.fechaPresentacion, deps),
      fechaLimiteEfectiva: plazo.limite,
      limiteCalculado: plazo.calculado,
      limiteDiscrepante: plazo.discrepante,
      nombreCompleto: `${row.apellidos ?? ''} ${row.nombres ?? ''}`.trim(),
      parentescoLabel: rubro(deps, RubrosRrh.PARENTESCO_CARGA, row.parentesco),
      tipoCuentaLabel: rubro(deps, RubrosRrh.TIPO_CUENTA_BANCARIA, row.tipoCuenta),
      tipoGastoLabel: rubro(deps, RubrosRrh.TIPO_GASTO_PERSONAL, row.tipoGasto),
      tipoNovedadLabel: rubro(deps, RubrosRrh.TIPO_NOVEDAD_IESS, row.tipoNovedad),
      tipoCambioLabel: rubro(deps, RubrosRrh.TIPO_CAMBIO_HISTORIAL, row.tipoCambio),
      relacionLaboralLabel: rubro(deps, RubrosRrh.TIPO_RELACION_LABORAL, row.tipoRelacionLaboral),
      jornadaLabel: rubro(deps, RubrosRrh.TIPO_JORNADA, row.jornada),
      tipoContratoLabel: row.tipoContratoEmpleado?.nombre ?? '—',
      // La causal no se deduce de la fecha: dos contratos cerrados el mismo día pueden ser una
      // renuncia y un despido, y solo el segundo genera indemnización
      causalTerminacionLabel: row.causalTerminacion?.nombre ?? '—',
      bancoLabel: row.banco?.nombre ?? '—',
      conceptoLabel: row.concepto?.nombre ?? '—',
      departamentoCargoLabel: etiquetaDepartamentoCargo(row.departamentoCargo),
      departamentoLabel: departamentoDe(row.departamentoCargo)?.nombre ?? '—',
      calificaIrLabel: etiquetaSiNo(row.calificaIr),
      calificaUtilidadesLabel: etiquetaSiNo(row.calificaUtilidades),
      principalLabel: etiquetaSiNo(row.principal),
      vigenteLabel: etiquetaSiNo(row.vigente),
      estadoLabel: etiquetaDeEstado(row, clave, deps),
      plazoLabel: etiquetaPlazo(diasRestantes, sinReportar),
      plazoVencido: sinReportar && diasRestantes !== null && diasRestantes < 0,
      plazoPorVencer: sinReportar && diasRestantes !== null && diasRestantes >= 0,
    };
  });
}

function etiquetaDeEstado(row: any, clave: ClaveSeccion, deps: DependenciasFormato): string {
  // Las novedades IESS guardan en `estado` el rubro de envío, no un activo/inactivo
  if (clave === 'novedades-iess') {
    return rubro(deps, RubrosRrh.ESTADO_NOVEDAD_IESS, row.estado);
  }
  return etiquetaEstado(row.estado);
}

/**
 * Resuelve el vencimiento legal de un aviso al IESS.
 *
 * El plazo en días está parametrizado en el `valorNumerico` de cada detalle del rubro 204
 * (`RHH_TIPO_NOVEDAD_IESS`), distinto para el aviso de entrada y para el resto. Con él:
 *
 * - si el backend no dejó `fechaLimite`, se calcula sobre la fecha del hecho en vez de mostrar
 *   el plazo como desconocido;
 * - si sí la dejó, se contrasta contra el parámetro y se marca la discrepancia, porque un
 *   vencimiento mal calculado se traduce en una multa.
 *
 * `getNumeroByParentAndAlterno` devuelve 0 cuando el detalle no tiene valor; un plazo de cero
 * días no existe, así que ese caso se trata como parámetro ausente.
 */
function plazoDelIess(
  row: any,
  clave: ClaveSeccion,
  deps: DependenciasFormato,
): { limite: Date | null; calculado: boolean; discrepante: boolean } {
  const limiteBackend = aFecha(row.fechaLimite, deps);

  if (clave !== 'novedades-iess') {
    return { limite: limiteBackend, calculado: false, discrepante: false };
  }

  const dias = deps.detalleRubroService.getNumeroByParentAndAlterno(
    RubrosRrh.TIPO_NOVEDAD_IESS,
    row.tipoNovedad,
  );
  const fechaHecho = aFecha(row.fechaHecho, deps);

  if (!dias || fechaHecho === null) {
    return { limite: limiteBackend, calculado: false, discrepante: false };
  }

  const limiteParametro = new Date(fechaHecho.getTime());
  limiteParametro.setDate(limiteParametro.getDate() + dias);

  if (limiteBackend === null) {
    return { limite: limiteParametro, calculado: true, discrepante: false };
  }

  const mismoDia = limiteBackend.toDateString() === limiteParametro.toDateString();
  return { limite: limiteBackend, calculado: false, discrepante: !mismoDia };
}

function etiquetaPlazo(diasRestantes: number | null, sinReportar: boolean): string {
  if (!sinReportar) return 'Reportada';
  if (diasRestantes === null) return '—';
  if (diasRestantes < 0) return `Vencida hace ${Math.abs(diasRestantes)} día(s)`;
  if (diasRestantes === 0) return 'Vence hoy';
  return `Vence en ${diasRestantes} día(s)`;
}

function rubro(
  deps: DependenciasFormato,
  rubroAlterno: number,
  valor: number | null | undefined,
): string {
  if (valor === null || valor === undefined) return '—';
  return (
    deps.detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '—'
  );
}

/** Las fechas llegan del backend en tres formas distintas; se normalizan siempre igual. */
export function aFecha(valor: any, deps: DependenciasFormato): Date | null {
  if (!valor) return null;
  const fecha = deps.funcionesDatosS.convertirFechaDesdeBackend(valor);
  return fecha instanceof Date && !Number.isNaN(fecha.getTime()) ? fecha : null;
}

/** Formato `yyyy-MM-dd`, que es el único que acepta un `input[type=date]`. */
export function aValorDeInput(valor: any, deps: DependenciasFormato): string | null {
  const fecha = aFecha(valor, deps);
  if (fecha === null) return null;
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

function hoySinHora(): Date {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}
