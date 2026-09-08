import { DatosBusqueda } from '../model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../model/datos-busqueda/tipo-datos-busqueda';

/**
 * Filtros comunes a las pantallas de consulta de documentos emitidos de `cxc`
 * (Factura/NotaCredito/NotaDebito/RetencionV2/LiquidacionCompra, todas bajo `CBR`).
 */
export interface FiltrosDocumentoEmitido {
  textoCliente?: string;
  autorizacion?: string;
  fechaDesde?: Date | null;
  fechaHasta?: Date | null;
  estadoEmision?: number | null;
}

/**
 * Arma los criterios de `POST .../selectByCriteria` comunes a los 5 documentos emitidos de `CBR`
 * (lote 2, ítem 2.1/2.4 — antes traían todo con `getAll()` y filtraban en memoria).
 *
 * ⚠️ El LIKE genérico (`EntityDaoImpl.selectByCriteria` en saaBE) NO envuelve la columna en
 * `UPPER()`: solo mayusculiza el parámetro (`"%" + valor.toUpperCase() + "%"`). Si el dato
 * guardado no está en mayúsculas, este LIKE no matchea nada. Se sigue la misma convención que ya
 * usa el resto del sistema para este mismo genérico (ver `AnticiposComponent.buildEmpleadoCriteria`
 * en `rrh`): mandar el texto de búsqueda ya en mayúsculas, asumiendo — como el resto del sistema —
 * que los nombres/identificaciones se graban en mayúsculas.
 *
 * @param campoRelacion Nombre REAL del campo de relación en la entidad JPA — `'titular'` en
 *   Factura/NotaCredito/NotaDebito/LiquidacionCompra, pero **`'proveedor'`** en RetencionV2
 *   (columna `PROVEEDOR` en `CBR.RTV2` — confirmado leyendo la entidad; el modelo del frontend la
 *   llama `titular` por error de nombre, no hay que copiarle eso al criterio).
 * @param fechaConHora `Factura.fecha` es `LocalDate` (usar `false`, formato `yyyy-MM-dd`);
 *   `NotaCredito`/`NotaDebito`/`RetencionV2`/`LiquidacionCompra.fecha` son `LocalDateTime` (usar
 *   `true`, formato `yyyy-MM-dd HH:mm`) — confirmado por entidad, no asumido por similitud.
 */
export function criteriosDocumentoEmitido(
  filtros: FiltrosDocumentoEmitido,
  campoRelacion: string,
  fechaConHora: boolean,
): DatosBusqueda[] {
  const criterios: DatosBusqueda[] = [];

  const texto = (filtros.textoCliente || '').trim().toUpperCase();
  if (texto) {
    const dbOpen = new DatosBusqueda();
    dbOpen.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
    criterios.push(dbOpen);

    const dbIdent = new DatosBusqueda();
    dbIdent.asignaValorConCampoPadre(TipoDatosBusqueda.STRING, campoRelacion, 'identificacion', texto, TipoComandosBusqueda.LIKE);
    criterios.push(dbIdent);

    const dbRazon = new DatosBusqueda();
    dbRazon.asignaValorConCampoPadre(TipoDatosBusqueda.STRING, campoRelacion, 'razonSocial', texto, TipoComandosBusqueda.LIKE);
    dbRazon.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterios.push(dbRazon);

    const dbNombre = new DatosBusqueda();
    dbNombre.asignaValorConCampoPadre(TipoDatosBusqueda.STRING, campoRelacion, 'nombre', texto, TipoComandosBusqueda.LIKE);
    dbNombre.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterios.push(dbNombre);

    const dbClose = new DatosBusqueda();
    dbClose.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
    criterios.push(dbClose);
  }

  const autorizacion = (filtros.autorizacion || '').trim().toUpperCase();
  if (autorizacion) {
    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'autorizacion', autorizacion, TipoComandosBusqueda.LIKE);
    criterios.push(db);
  }

  // Rango de fecha: BETWEEN si vienen los dos extremos, MAYOR_IGUAL/MENOR_IGUAL si viene uno solo
  // — sintetizar el extremo que falta con el otro valor angostaría la búsqueda a un solo día en
  // vez de dejarla abierta, perdiendo la capacidad que sí tenía el filtro en memoria.
  if (filtros.fechaDesde && filtros.fechaHasta) {
    const db = new DatosBusqueda();
    const tipo = fechaConHora ? TipoDatosBusqueda.DATE_TIME : TipoDatosBusqueda.DATE;
    db.asignaUnCampoConBetween(
      'fecha',
      tipo,
      formatearFecha(filtros.fechaDesde, fechaConHora, false),
      TipoComandosBusqueda.BETWEEN,
      formatearFecha(filtros.fechaHasta, fechaConHora, true),
    );
    criterios.push(db);
  } else if (filtros.fechaDesde) {
    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(
      fechaConHora ? TipoDatosBusqueda.DATE_TIME : TipoDatosBusqueda.DATE,
      'fecha',
      formatearFecha(filtros.fechaDesde, fechaConHora, false),
      TipoComandosBusqueda.MAYOR_IGUAL,
    );
    criterios.push(db);
  } else if (filtros.fechaHasta) {
    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(
      fechaConHora ? TipoDatosBusqueda.DATE_TIME : TipoDatosBusqueda.DATE,
      'fecha',
      formatearFecha(filtros.fechaHasta, fechaConHora, true),
      TipoComandosBusqueda.MENOR_IGUAL,
    );
    criterios.push(db);
  }

  if (filtros.estadoEmision != null) {
    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'estadoEmision', String(filtros.estadoEmision), TipoComandosBusqueda.IGUAL);
    criterios.push(db);
  }

  return criterios;
}

/** `finDeDia` solo aplica cuando `conHora` es true: fija la hora en 23:59 para incluir todo el día. */
function formatearFecha(fecha: Date, conHora: boolean, finDeDia: boolean): string {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  const soloFecha = `${y}-${m}-${d}`;
  return conHora ? `${soloFecha} ${finDeDia ? '23:59' : '00:00'}` : soloFecha;
}
