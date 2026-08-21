import { RubrosRrh } from '../../../model/rubros-rrh';
import { TonoPastilla } from '../../comunes/modelo-formulario';
import { DependenciasFormato, aFecha } from './formato-ficha';

/** Un dato de la cabecera de la ficha: etiqueta corta, valor y tono. */
export interface PastillaFicha {
  icono: string;
  etiqueta: string;
  valor: string;
  tono: TonoPastilla;
  detalle?: string;
  /** Ruta a la que lleva la pastilla, cuando el dato vive en otra pantalla. */
  enlace?: any[];
}

/** Estado del colaborador que la cabecera pinta en verde. Los demás no son «inactivo». */
const ESTADO_ACTIVO = 1;

/**
 * Valores de `CNTE.CNTEESTD` que cierran un contrato.
 *
 * El campo es texto libre y no rubro —decisión del backend, igual que `RLPGESTD`—, y su
 * vocabulario es binario: `'ACTIVO'` en el resto de las filas y `'TERMINADO'` el que escribe
 * `ejecutarSalida`. Se listan los cierres en vez de dar por cerrado «todo lo que no sea ACTIVO»
 * porque un valor nuevo e inesperado haría desaparecer contratos vigentes de la cabecera, que es
 * el fallo ruidoso; al revés solo deja una vigencia obsoleta que `fechaTerminacion` ya corrige.
 */
const ESTADOS_CONTRATO_CERRADO = ['TERMINADO'];

/**
 * Lo que hay que saber del colaborador sin abrir ninguna sección.
 *
 * Se calcula con lo que la ficha ya cargó —el empleado, sus contratos y su liquidación si la
 * tiene—, sin pedir nada más por cada dato.
 *
 * Ningún importe ni plazo sale de aquí: el sueldo es el del contrato, la situación y la región
 * se leen de su rubro, y la fecha de salida del propio contrato.
 */
export function resumenDelColaborador(
  empleado: any | null,
  contratos: any[],
  deps: DependenciasFormato,
  liquidacion?: any | null,
): PastillaFicha[] {
  if (!empleado) return [];

  const pastillas: PastillaFicha[] = [];

  // La situación sale del rubro 185: cesante, jubilado y suspendido responden preguntas
  // distintas y colapsarlos en «inactivo» no contesta ninguna.
  const activo = Number(empleado.estado) === ESTADO_ACTIVO;
  const situacion =
    deps.detalleRubroService.getDescripcionByParentAndAlterno(
      RubrosRrh.ESTADO_EMPLEADO,
      Number(empleado.estado),
    ) || '—';

  pastillas.push({
    icono: activo ? 'check_circle' : 'cancel',
    etiqueta: 'Situación',
    valor: situacion,
    tono: activo ? 'ok' : 'neutro',
  });

  const vigente = contratoVigente(contratos, deps);
  const terminado = contratoTerminado(contratos, deps);

  if (vigente) {
    pastillas.push({
      icono: 'assignment_turned_in',
      etiqueta: 'Contrato vigente',
      valor: vigente.numero ?? 'sin número',
      tono: 'ok',
      detalle: vigente.tipoContratoEmpleado?.nombre ?? '',
    });
    if (vigente.salarioBase !== null && vigente.salarioBase !== undefined) {
      pastillas.push({
        icono: 'payments',
        etiqueta: 'Sueldo base',
        valor: Number(vigente.salarioBase).toFixed(2),
        tono: 'neutro',
      });
    }
  } else if (terminado) {
    // Salió: decir «ninguno» sería cierto y no explicaría nada
    pastillas.push({
      icono: 'event_busy',
      etiqueta: 'Contrato terminado',
      valor: fechaCorta(aFecha(terminado.fechaTerminacion, deps)),
      tono: 'neutro',
      detalle: terminado.causalTerminacion?.nombre ?? '',
    });
  } else {
    pastillas.push({
      icono: 'assignment_late',
      etiqueta: 'Contrato vigente',
      valor: 'Ninguno',
      tono: 'error',
      detalle: 'Sin contrato vigente el colaborador no entra en ninguna nómina',
    });
  }

  const hasta = terminado ? aFecha(terminado.fechaTerminacion, deps) : null;
  const antiguedad = antiguedadDesde(empleado.fechaIngreso, hasta, deps);
  if (antiguedad) {
    pastillas.push({
      icono: 'schedule',
      etiqueta: hasta ? 'Antigüedad al salir' : 'Antigüedad',
      valor: antiguedad,
      tono: 'neutro',
    });
  }

  const region = deps.detalleRubroService.getDescripcionByParentAndAlterno(
    RubrosRrh.REGION_DECIMO_CUARTO,
    empleado.region,
  );
  if (region) {
    pastillas.push({
      icono: 'public',
      etiqueta: 'Región',
      valor: region,
      tono: 'neutro',
      detalle: 'Determina el período de cálculo del décimo cuarto',
    });
  }

  /**
   * La liquidación no se duplica en la ficha: se anuncia y se enlaza.
   *
   * Responde la pregunta que le hacen al cliente —«¿qué le pagaron y por qué?»— sin abrir una
   * segunda vista del mismo dato, que es como dos pantallas acaban diciendo cosas distintas.
   * De paso explica por qué su saldo de vacaciones ya no está: se lo liquidaron.
   */
  if (liquidacion) {
    pastillas.push({
      icono: 'receipt_long',
      etiqueta: 'Liquidado',
      valor: `${fechaCorta(aFecha(liquidacion.fechaSalida, deps))} · ${Number(
        liquidacion.neto ?? 0,
      ).toFixed(2)}`,
      tono: 'aviso',
      detalle: liquidacion.causalTerminacion?.nombre
        ? `${liquidacion.causalTerminacion.nombre} · abre la liquidación`
        : 'Abre la liquidación',
      enlace: ['/menurecursoshumanos/procesos/liquidacion', liquidacion.codigo],
    });
  }

  return pastillas;
}

/**
 * Contrato vigente: el que no ha terminado ni ha vencido.
 *
 * **`fechaTerminacion` manda sobre `fechaFin`**, y `CNTEESTD` es la tercera señal —ya la escribe
 * `ejecutarSalida`—. El orden es de la más fuerte a la más débil: terminación, estado, fin
 * previsto. Quedarse con la más débil es lo que hacía que la ficha de alguien que ya salió
 * afirmara que su contrato seguía vigente, porque su `fechaFin` prevista aún no había llegado.
 */
function contratoVigente(contratos: any[], deps: DependenciasFormato): any | null {
  const hoy = sinHora(new Date());

  const candidatos = (contratos ?? [])
    .filter((contrato) => {
      const terminacion = aFecha(contrato.fechaTerminacion, deps);
      if (terminacion !== null && terminacion.getTime() < hoy.getTime()) return false;

      const estado = String(contrato.estado ?? '').trim().toUpperCase();
      if (ESTADOS_CONTRATO_CERRADO.includes(estado)) return false;

      const fin = aFecha(contrato.fechaFin, deps);
      return fin === null || fin.getTime() >= hoy.getTime();
    })
    .sort((a, b) => inicio(b, deps) - inicio(a, deps));

  return candidatos[0] ?? null;
}

/**
 * El contrato que se cerró: el de terminación más reciente.
 *
 * Vale tanto la fecha como el estado, porque los contratos que la migración cerró a mano pueden
 * llevar una sin el otro; el orden es por fecha de terminación y, a falta de ella, por inicio.
 */
function contratoTerminado(contratos: any[], deps: DependenciasFormato): any | null {
  const terminados = (contratos ?? [])
    .filter(
      (c) =>
        aFecha(c.fechaTerminacion, deps) !== null ||
        ESTADOS_CONTRATO_CERRADO.includes(String(c.estado ?? '').trim().toUpperCase()),
    )
    .sort(
      (a, b) =>
        (aFecha(b.fechaTerminacion, deps)?.getTime() ?? inicio(b, deps)) -
        (aFecha(a.fechaTerminacion, deps)?.getTime() ?? inicio(a, deps)),
    );
  return terminados[0] ?? null;
}

function inicio(contrato: any, deps: DependenciasFormato): number {
  return aFecha(contrato.fechaInicio, deps)?.getTime() ?? 0;
}

/**
 * Antigüedad en años y meses cumplidos, **hasta la salida si la hubo**.
 *
 * Seguir contándola después de que alguien se va es afirmar que sigue acumulando derechos.
 * El corte es la misma fecha que usa el finiquito para sus años de servicio.
 */
function antiguedadDesde(
  fechaIngreso: any,
  hasta: Date | null,
  deps: DependenciasFormato,
): string | null {
  const ingreso = aFecha(fechaIngreso, deps);
  if (ingreso === null) return null;

  const referencia = hasta ?? new Date();
  let meses =
    (referencia.getFullYear() - ingreso.getFullYear()) * 12 +
    (referencia.getMonth() - ingreso.getMonth());
  if (referencia.getDate() < ingreso.getDate()) meses -= 1;
  if (meses < 0) return null;

  const anios = Math.floor(meses / 12);
  const resto = meses % 12;
  if (anios === 0) return `${resto} mes(es)`;
  return `${anios} año(s) ${resto} mes(es)`;
}

function fechaCorta(fecha: Date | null): string {
  if (fecha === null) return '—';
  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${dia}/${mes}/${fecha.getFullYear()}`;
}

function sinHora(fecha: Date): Date {
  const copia = new Date(fecha.getTime());
  copia.setHours(0, 0, 0, 0);
  return copia;
}
