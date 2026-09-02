import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { extraerCodigo } from '../../parametrizacion/utiles-parametrizacion';
import { fechaHoraLocalISO } from '../utiles-asistencia';

/**
 * Criterios de `selectByCriteria` para las marcaciones de un colaborador en un rango de fechas.
 *
 * `fechaHora` es `LocalDateTime`, no `LocalDate`: hay que filtrar con `DATE_TIME`, porque con
 * `DATE` el DAO enlaza un `LocalDate` y la consulta revienta por tipo de argumento (mismo motivo
 * que `ServiceLocatorRrhService.criteriosDelRango`). El rango llega como `yyyy-MM-dd`; se completa
 * con la hora, abriendo y cerrando el día.
 */
export function criteriosMarcaciones(idEmpleado: number, desde: string, hasta: string): DatosBusqueda[] {
  const dbEmpleado = new DatosBusqueda();
  dbEmpleado.asignaValorConCampoPadre(
    TipoDatosBusqueda.LONG,
    'empleado',
    'codigo',
    idEmpleado.toString(),
    TipoComandosBusqueda.IGUAL,
  );

  const dbDesde = new DatosBusqueda();
  dbDesde.asignaUnCampoSinTrunc(
    TipoDatosBusqueda.DATE_TIME,
    'fechaHora',
    `${desde} 00:00`,
    TipoComandosBusqueda.MAYOR_IGUAL,
  );

  const dbHasta = new DatosBusqueda();
  dbHasta.asignaUnCampoSinTrunc(
    TipoDatosBusqueda.DATE_TIME,
    'fechaHora',
    `${hasta} 23:59`,
    TipoComandosBusqueda.MENOR_IGUAL,
  );

  const orden = new DatosBusqueda();
  orden.orderBy('fechaHora');

  return [dbEmpleado, dbDesde, dbHasta, orden];
}

export interface ValoresMarcacion {
  fechaHora: Date;
  tipo: DetalleRubro | null;
  origen: DetalleRubro | null;
  observacion: string;
}

/**
 * Campos comunes de alta y edición, ya en la forma que espera el backend: `fechaHora` como ISO
 * local con la hora real (nunca `Date` crudo — ver `fechaHoraLocalISO`), `tipo`/`origen` reducidos
 * a su código alterno de rubro.
 */
export function camposMarcacion(v: ValoresMarcacion): {
  fechaHora: string;
  tipo: number | null;
  origen: number | null;
  observacion: string;
} {
  return {
    fechaHora: fechaHoraLocalISO(v.fechaHora),
    tipo: extraerCodigo(v.tipo),
    origen: extraerCodigo(v.origen),
    observacion: v.observacion.trim(),
  };
}

/** El código alterno de rubro (`tipo`/`origen`) al `DetalleRubro` que lo representa en el combo. */
export function rubroPorAlterno(lista: DetalleRubro[], alterno: number | null | undefined): DetalleRubro | null {
  if (alterno === null || alterno === undefined) return null;
  return lista.find((d) => d.codigoAlterno === alterno) ?? null;
}
