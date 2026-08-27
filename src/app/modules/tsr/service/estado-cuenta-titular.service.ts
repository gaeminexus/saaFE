import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, from, map, mergeMap, of, toArray } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { FilaAbono } from '../../../shared/model/pagos-cobros/catalogos-aplicacion-pago';
import { ServiciosCxc } from '../../cxc/service/ws-cxc';
import { ServiciosCxp } from '../../cxp/service/ws-cxp';
import {
  AsientoRelacionado,
  DocumentoEstadoCuenta,
  EstadoCuentaResultado,
  OrigenDocumento,
  RolTitular,
  SaldoDocumento,
  TipoDocumentoEstadoCuenta,
} from '../model/estado-cuenta-titular';
import { ServiciosTsr } from './ws-tsr';

/** Un endpoint del estado de cuenta y cómo normalizar sus filas. */
interface FuenteDocumento {
  etiqueta: string;
  url: string;
  /** Campo por el que la entidad referencia al titular. */
  campoTitular: string;
  tipo: TipoDocumentoEstadoCuenta;
  origen: OrigenDocumento;
  campoFecha: string;
  campoNumero: string;
  campoTotal: string;
  /**
   * Valores de `estado` que marcan un documento de esta fuente como anulado.
   * OJO: en CXC y CXP anulado es `Estado.INACTIVO` = **0**, no 2 — ver
   * com/saa/rubros/Estado.java y *ServiceImpl#anular*(Factura|NotaCredito|
   * NotaDebito|RetencionV2|Retencion) en saaBE. En CXC además el 6
   * ("devuelta"/no autorizada por el SRI) cuenta como anulado: nunca fue un
   * documento válido. No "corregir" esto de vuelta a `[2]`.
   */
  estadosAnulados: number[];
  /** Familia de catálogo de `estado`, para elegir el mapa de etiquetas. */
  familiaEstado: 'CXC' | 'CXP' | 'ANTICIPO';
}

const ETIQUETAS_ESTADO: Record<FuenteDocumento['familiaEstado'], Record<number, string>> = {
  CXC: { 0: 'Anulada', 1: 'Ingresada', 3: 'Firmada', 4: 'Enviada', 5: 'Autorizada', 6: 'No autorizada' },
  CXP: { 0: 'Anulada', 1: 'Activa' },
  ANTICIPO: { 1: 'Ingresado', 2: 'Confirmado', 3: 'Anulado', 4: 'Migrado' },
};

/**
 * Estado de cuenta de un titular: reúne en una sola consulta los documentos
 * de su rol, el saldo de cada factura y sus abonos.
 *
 * Dos particularidades del backend que condicionan el diseño:
 *
 * 1. `selectByCriteria` responde 500 cuando no encuentra nada, así que cada
 *    fuente se consulta por separado y un vacío nunca tumba la consulta.
 * 2. No existe un endpoint que devuelva los documentos de un titular ya
 *    filtrados por fecha o tipo, ni saldos agregados: se trae todo lo del
 *    titular y el filtrado fino ocurre en el cliente, que además es lo que
 *    hace instantáneos los filtros de la pantalla.
 */
@Injectable({ providedIn: 'root' })
export class EstadoCuentaTitularService {
  private http = inject(HttpClient);

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  /** Consultas de saldo simultáneas; evita disparar cientos de GET a la vez. */
  private readonly CONCURRENCIA_SALDOS = 6;

  /**
   * Como CLIENTE se miran las cuentas por cobrar: lo que la empresa le emitió.
   * Como PROVEEDOR, las cuentas por pagar: lo que recibió de él, más las
   * retenciones que la empresa le emitió y que rebajan lo que le debe.
   */
  private fuentes(rol: RolTitular): FuenteDocumento[] {
    if (rol === RolTitular.CLIENTE) {
      return [
        {
          etiqueta: 'Facturas de venta', url: ServiciosCxc.RS_FCTR, campoTitular: 'titular',
          tipo: TipoDocumentoEstadoCuenta.FACTURA, origen: 'EMITIDO',
          campoFecha: 'fecha', campoNumero: 'numero', campoTotal: 'total',
          estadosAnulados: [0, 6], familiaEstado: 'CXC',
        },
        {
          etiqueta: 'Notas de crédito', url: ServiciosCxc.RS_NTCR, campoTitular: 'titular',
          tipo: TipoDocumentoEstadoCuenta.NOTA_CREDITO, origen: 'EMITIDO',
          campoFecha: 'fecha', campoNumero: 'numero', campoTotal: 'total',
          estadosAnulados: [0, 6], familiaEstado: 'CXC',
        },
        {
          etiqueta: 'Notas de débito', url: ServiciosCxc.RS_NTDB, campoTitular: 'titular',
          tipo: TipoDocumentoEstadoCuenta.NOTA_DEBITO, origen: 'EMITIDO',
          campoFecha: 'fecha', campoNumero: 'numero', campoTotal: 'total',
          estadosAnulados: [0, 6], familiaEstado: 'CXC',
        },
        {
          // CBR.RCV2: la retención que el cliente le hace a la empresa sobre su
          // factura de venta. El modelo referencia al titular por `proveedor`
          // (nombre de campo heredado del lado de compras), no por `titular`.
          etiqueta: 'Retenciones recibidas', url: ServiciosCxp.RS_RCV2, campoTitular: 'proveedor',
          tipo: TipoDocumentoEstadoCuenta.RETENCION, origen: 'RECIBIDO',
          campoFecha: 'fecha', campoNumero: 'numero', campoTotal: 'total',
          estadosAnulados: [0], familiaEstado: 'CXP',
        },
        {
          etiqueta: 'Anticipos de cliente', url: ServiciosTsr.RS_ANTC, campoTitular: 'titular',
          tipo: TipoDocumentoEstadoCuenta.ANTICIPO, origen: 'RECIBIDO',
          campoFecha: 'fechaAnticipo', campoNumero: 'numeroDoc', campoTotal: 'valor',
          estadosAnulados: [3], familiaEstado: 'ANTICIPO',
        },
      ];
    }

    return [
      {
        etiqueta: 'Facturas de compra', url: ServiciosCxp.RS_FCTC, campoTitular: 'titular',
        tipo: TipoDocumentoEstadoCuenta.FACTURA, origen: 'RECIBIDO',
        campoFecha: 'fecha', campoNumero: 'numero', campoTotal: 'total',
        estadosAnulados: [0], familiaEstado: 'CXP',
      },
      {
        etiqueta: 'Notas de crédito de compra', url: ServiciosCxp.RS_NTCC, campoTitular: 'titular',
        tipo: TipoDocumentoEstadoCuenta.NOTA_CREDITO, origen: 'RECIBIDO',
        campoFecha: 'fecha', campoNumero: 'numero', campoTotal: 'total',
        estadosAnulados: [0], familiaEstado: 'CXP',
      },
      {
        etiqueta: 'Notas de débito de compra', url: ServiciosCxp.RS_NTDC, campoTitular: 'titular',
        tipo: TipoDocumentoEstadoCuenta.NOTA_DEBITO, origen: 'RECIBIDO',
        campoFecha: 'fecha', campoNumero: 'numero', campoTotal: 'total',
        estadosAnulados: [0], familiaEstado: 'CXP',
      },
      {
        // CBR.RTV2: la retención que la empresa le emite al proveedor y que se
        // aplica sola contra su factura de compra. Referencia al titular por
        // `proveedor`, no por `titular`.
        etiqueta: 'Retenciones emitidas', url: ServiciosCxc.RS_RTV2, campoTitular: 'proveedor',
        tipo: TipoDocumentoEstadoCuenta.RETENCION, origen: 'EMITIDO',
        campoFecha: 'fecha', campoNumero: 'numero', campoTotal: 'total',
        estadosAnulados: [0, 6], familiaEstado: 'CXC',
      },
      {
        etiqueta: 'Anticipos a proveedor', url: ServiciosTsr.RS_ANTP, campoTitular: 'titular',
        tipo: TipoDocumentoEstadoCuenta.ANTICIPO, origen: 'EMITIDO',
        campoFecha: 'fechaAnticipo', campoNumero: 'numeroDoc', campoTotal: 'valor',
        estadosAnulados: [3], familiaEstado: 'ANTICIPO',
      },
    ];
  }

  /**
   * Trae todos los documentos del titular en ese rol y completa el saldo de
   * cada factura. Las fuentes que fallen se reportan como advertencia en vez
   * de abortar: es preferible un estado de cuenta parcial y avisado.
   */
  consultar(codigoTitular: number, rol: RolTitular): Observable<EstadoCuentaResultado> {
    const advertencias: string[] = [];

    const consultas = this.fuentes(rol).map((fuente) =>
      this.consultarFuente(fuente, codigoTitular, advertencias)
    );

    return forkJoin(consultas).pipe(
      map((grupos) => grupos.flat()),
      mergeMap((documentos) => this.completarSaldos(documentos, rol)),
      map((documentos) => ({
        documentos: documentos.sort((a, b) => this.aTiempo(b.fecha) - this.aTiempo(a.fecha)),
        advertencias,
      }))
    );
  }

  private consultarFuente(
    fuente: FuenteDocumento,
    codigoTitular: number,
    advertencias: string[]
  ): Observable<DocumentoEstadoCuenta[]> {
    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      fuente.campoTitular,
      'codigo',
      String(codigoTitular),
      TipoComandosBusqueda.IGUAL
    );

    return this.http.post<any[]>(`${fuente.url}/selectByCriteria/`, [criterio], this.httpOptions).pipe(
      map((filas) => (Array.isArray(filas) ? filas : []).map((fila) => this.normalizar(fila, fuente))),
      catchError((error) => {
        // 500 con "no devolvio ningun registro" es la forma que tiene el DAO
        // genérico de decir "vacío": no es un problema que haya que mostrar.
        if (!this.esRespuestaVacia(error)) {
          advertencias.push(`No se pudieron consultar: ${fuente.etiqueta}`);
        }
        return of([] as DocumentoEstadoCuenta[]);
      })
    );
  }

  private esRespuestaVacia(error: any): boolean {
    const cuerpo = error?.error;
    const texto = typeof cuerpo === 'string' ? cuerpo : (cuerpo?.message ?? cuerpo?.error ?? '');
    return typeof texto === 'string' && texto.toLowerCase().includes('no devolvio ningun registro');
  }

  private normalizar(fila: any, fuente: FuenteDocumento): DocumentoEstadoCuenta {
    const id = Number(fila?.id ?? fila?.codigo ?? 0);
    const total = Number(fila?.[fuente.campoTotal] ?? 0);
    const signo = fuente.tipo === TipoDocumentoEstadoCuenta.NOTA_CREDITO
      || fuente.tipo === TipoDocumentoEstadoCuenta.RETENCION
      ? -1
      : fuente.tipo === TipoDocumentoEstadoCuenta.ANTICIPO ? 0 : 1;

    // El anticipo es el único documento que lleva su propio saldo disponible.
    const esAnticipo = fuente.tipo === TipoDocumentoEstadoCuenta.ANTICIPO;

    // `0` es un estado válido (INACTIVO/anulado) en CXC y CXP, así que no se
    // puede usar Number(null) === 0 para decidir "sin estado": eso marcaría
    // como anulado cualquier documento que no traiga el campo.
    const estadoCrudo = fila?.estado;
    const estadoNum = estadoCrudo === null || estadoCrudo === undefined || estadoCrudo === ''
      ? null
      : Number(estadoCrudo);
    const anulado = estadoNum !== null && !Number.isNaN(estadoNum) && fuente.estadosAnulados.includes(estadoNum);
    const etiquetaEstado = estadoNum !== null && !Number.isNaN(estadoNum)
      ? (ETIQUETAS_ESTADO[fuente.familiaEstado][estadoNum] ?? `Estado ${estadoNum}`)
      : '—';

    return {
      clave: `${fuente.tipo}-${id}`,
      id,
      tipo: fuente.tipo,
      origen: fuente.origen,
      numero: String(fila?.[fuente.campoNumero] ?? '').trim() || `#${id}`,
      fecha: fila?.[fuente.campoFecha] ?? fila?.fechaRegistro ?? null,
      total: Math.abs(total),
      totalConSigno: Math.abs(total) * signo,
      totalAplicado: esAnticipo ? Math.abs(total) - Number(fila?.saldo ?? 0) : null,
      saldoPendiente: esAnticipo ? Number(fila?.saldo ?? 0) : null,
      estadoPago: fila?.estadoPago ?? null,
      estado: fila?.estado ?? null,
      anulado,
      etiquetaEstado,
      observacion: fila?.observacion ?? fila?.observaciones ?? null,
      asiento: this.asientoDe(fila?.asiento, 'Documento'),
      abonosCargados: false,
      cargandoAbonos: false,
      original: fila,
    };
  }

  private asientoDe(asiento: any, origen: string): AsientoRelacionado | null {
    if (!asiento?.codigo) return null;
    return {
      codigo: Number(asiento.codigo),
      numeroAlterno: asiento.numeroAlterno,
      fecha: asiento.fechaAsiento ?? asiento.fecha ?? null,
      origen,
      observaciones: asiento.observaciones ?? null,
    };
  }

  /**
   * Solo las facturas tienen saldo calculado por el flujo de abonos; el resto
   * de documentos se aplica entero y no arrastra saldo propio.
   */
  private completarSaldos(
    documentos: DocumentoEstadoCuenta[],
    rol: RolTitular
  ): Observable<DocumentoEstadoCuenta[]> {
    const facturas = documentos.filter((d) => d.tipo === TipoDocumentoEstadoCuenta.FACTURA && d.id > 0);
    if (!facturas.length) {
      return of(documentos);
    }

    return from(facturas).pipe(
      mergeMap((factura) => this.saldoDeFactura(factura.id, rol).pipe(
        map((resultado) => ({ factura, ...resultado }))
      ), this.CONCURRENCIA_SALDOS),
      toArray(),
      map((resultados) => {
        resultados.forEach(({ factura, saldo, fallo }) => {
          if (fallo) {
            // La consulta de saldo falló: no se sabe el estado de pago, pero
            // el documento sigue siendo parte del estado de cuenta.
            factura.saldoDesconocido = true;
            return;
          }
          if (!saldo) return;
          factura.totalAplicado = Number(saldo.totalAplicado ?? 0);
          factura.saldoPendiente = Number(saldo.saldoPendiente ?? 0);
          factura.estadoPago = saldo.estadoPago ?? factura.estadoPago;
          if (saldo.total) {
            factura.total = Number(saldo.total);
            factura.totalConSigno = Number(saldo.total);
          }
        });
        return documentos;
      })
    );
  }

  private saldoDeFactura(
    idFactura: number,
    rol: RolTitular
  ): Observable<{ saldo: SaldoDocumento | null; fallo: boolean }> {
    const base = rol === RolTitular.CLIENTE ? ServiciosCxc.RS_APLC : ServiciosCxp.RS_APLP;
    return this.http.get<SaldoDocumento>(`${base}/saldo/${idFactura}`).pipe(
      map((saldo) => ({ saldo, fallo: false })),
      catchError(() => of({ saldo: null, fallo: true }))
    );
  }

  /**
   * Abonos de una factura, con los asientos que generó cada uno. Se piden al
   * expandir la fila para no lanzar una consulta por documento al abrir.
   */
  abonosDeFactura(idFactura: number, rol: RolTitular): Observable<FilaAbono[]> {
    const base = rol === RolTitular.CLIENTE ? ServiciosCxc.RS_APLC : ServiciosCxp.RS_APLP;
    return this.http
      .get<FilaAbono[]>(`${base}/factura/${idFactura}`, { params: { soloActivas: false } })
      .pipe(
        map((filas) => (Array.isArray(filas) ? filas : [])),
        catchError(() => of([] as FilaAbono[]))
      );
  }

  /** Milisegundos de una fecha del backend en cualquiera de sus tres formas. */
  aTiempo(fecha: any): number {
    if (!fecha) return 0;
    if (Array.isArray(fecha)) {
      const [anio, mes, dia, hora = 0, minuto = 0] = fecha as number[];
      return new Date(anio, (mes || 1) - 1, dia || 1, hora, minuto).getTime();
    }
    const parsed = new Date(fecha);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
  }
}
