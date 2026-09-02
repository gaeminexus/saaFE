import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DocumentoCxp } from '../model/documento-cxp';
import { DetalleCargaTxt } from '../model/detalle-carga-txt';
import { CuadraturaReembolso } from '../model/reembolso-factura-compra';
import { ProgresoLote } from '../model/progreso-lote';
import { ClasificarProductosLotePayload, ProductosSinClasificarLote, ResultadoClasificacion } from '../model/productos-sin-clasificar';
import { PlanCuenta } from '../../cnt/model/plan-cuenta';
import { Empresa } from '../../../shared/model/empresa';
import { environment } from '../../../../environments/environment';

const PROCESS_URL = `${environment.apiUrl}/carga-documentos`;

export interface ResumenCarga {
  cabecera: any;
  lineas: DetalleCargaTxt[];
}

/**
 * Lo que devuelve /gruposProducto: la entidad completa, con el identificador en `codigo`
 * (NO `id`) — verificado contra el endpoint real. Ojo al consumirla:
 *  · trae los grupos de TODAS las empresas y sin filtrar estado → filtrar por
 *    empresa.codigo y estado === 1;
 *  · rubroTipoGrupoH === 3 es el grupo POR CLASIFICAR, del que hay que sacar los productos;
 *  · planCuenta puede venir null, y ese grupo no destraba nada: solo cambia el bloqueante
 *    PRODUCTOS_SIN_CLASIFICAR por GRUPOS_SIN_CUENTA_CONTABLE.
 */
export interface GrupoProducto {
  codigo: number;
  nombre: string;
  rubroTipoGrupoH: number;
  planCuenta: PlanCuenta | null;
  estado: number;
  empresa: Empresa;
}

export interface ProductoNuevo {
  nombre: string;
  codigo: string;
  codigoAux: string;
  precioUnitario: number;
  idGrupo?: number;
}

@Injectable({ providedIn: 'root' })
export class CargaDocumentosService {

  private httpOptions = { headers: new HttpHeaders({ 'Content-Type': 'application/json' }) };

  constructor(private http: HttpClient) {}

  /** FASE 1 — Lee el TXT y crea/actualiza registros en DCXP */
  cargarTxt(payload: {
    contenidoTxt: string;
    nombreArchivo: string;
    idEmpresa: number;
    idUsuario: number;
    idPeriodo: number;
  }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/cargarTxt`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** Consulta resumen de una carga (cabecera + lineas con DocumentoCxp embebido) */
  getResumen(idCargaTxt: number): Observable<ResumenCarga | null> {
    return this.http.get<ResumenCarga>(`${PROCESS_URL}/resumen/${idCargaTxt}`).pipe(catchError(this.handleError));
  }

  /** Consulta un DocumentoCxp específico */
  getDocumento(idDocumentoCxp: number): Observable<DocumentoCxp | null> {
    return this.http.get<DocumentoCxp>(`${PROCESS_URL}/documento/${idDocumentoCxp}`).pipe(catchError(this.handleError));
  }

  /** Consulta novedades pendientes de una empresa — retorna DocumentoCxp[] con estadoDocumento=5 */
  getNovedades(idEmpresa: number): Observable<DocumentoCxp[] | null> {
    return this.http.get<DocumentoCxp[]>(`${PROCESS_URL}/novedades/${idEmpresa}`).pipe(catchError(this.handleError));
  }

  /** Consulta grupos de productos disponibles */
  getGruposProducto(): Observable<GrupoProducto[] | null> {
    return this.http.get<GrupoProducto[]>(`${PROCESS_URL}/gruposProducto`).pipe(catchError(this.handleError));
  }

  /** FASE 2 — Sube el XML de un documento (idDocumentoCxp = ID de DCXP) */
  cargarXml(idDocumentoCxp: number, payload: {
    contenidoXml: string;
    idUsuario: number;
    esReembolso?: number;
  }): Observable<DocumentoCxp | null> {
    return this.http.post<DocumentoCxp>(`${PROCESS_URL}/cargarXml/${idDocumentoCxp}`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * FASE 3 — Registra el documento en las tablas CXP.
   * `esIntermediario`/`idProductoIntermediario`: docs/logica-negocio/cxp/DISENO-FACTURA-INTERMEDIARIO.md
   * en saaBE. `esIntermediario` opcional — si no viene, el backend lo trata como `false` (mismo
   * criterio que `agruparEnUnCheque` en tsr/aprobación de pagos); `idProductoIntermediario`
   * obligatorio solo cuando `esIntermediario` va en `true`, el backend responde 422 si falta.
   */
  registrarBD(idDocumentoCxp: number, payload: {
    idEmpresa: number;
    idUsuario: number;
    esIntermediario?: boolean;
    idProductoIntermediario?: number;
  }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/registrarBD/${idDocumentoCxp}`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /**
   * Anula solo el asiento contable de un documento REGISTRADO_BD(3) — la factura queda intacta.
   * docs/cxp/API-ANULAR-RECONTABILIZAR-DOCUMENTO-CXP.md. 409 si no está en ese estado o si hay
   * pagos programados vigentes; el cuerpo del error es `{error}`, mostrarlo tal cual.
   */
  anularContabilidad(idDocumentoCxp: number, payload: { motivo: string; idUsuario: number }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/anularContabilidad/${idDocumentoCxp}`, payload, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /**
   * Regenera el asiento de un documento XML_CARGADO(2) que viene de `anularContabilidad`. 409 si
   * no está en ese estado, si no es FACTURA_COMPRA, o si el asiento no se puede generar — en ese
   * caso el documento NO vuelve solo a REGISTRADO_BD, queda en XML_CARGADO para reintentar.
   */
  recontabilizar(idDocumentoCxp: number, payload: { idUsuario: number }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/recontabilizar/${idDocumentoCxp}`, payload, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** FASE 3b — Crea productos faltantes y registra en BD */
  crearProductosYRegistrar(idDocumentoCxp: number, payload: {
    idEmpresa: number;
    idUsuario: number;
    productosConGrupo: ProductoNuevo[];
  }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/crearProductosYRegistrar/${idDocumentoCxp}`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** FASE 4 — Resuelve una novedad (MANTENER o REEMPLAZAR) */
  resolverNovedad(idDocumentoCxp: number, payload: {
    accion: 'MANTENER' | 'REEMPLAZAR';
    contenidoXml?: string;
    idUsuario: number;
    esReembolso?: number;
  }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/resolverNovedad/${idDocumentoCxp}`, payload, this.httpOptions).pipe(catchError(this.handleError));
  }

  /** FASE 5 — Revierte un documento ya registrado en BD */
  revertir(idDocumentoCxp: number, idUsuario: number): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/revertir/${idDocumentoCxp}`, { idUsuario }, this.httpOptions).pipe(catchError(this.handleError));
  }

  // ─── LOTES POR CARGA TXT (§6.1, §6.2, §6.3) ─────────────
  // Los tres usan handleErrorConEstado: la pantalla necesita el 409 (ya hay un lote corriendo)
  // para engancharse al lote existente en vez de tratarlo como un error cualquiera.

  /**
   * §6.1 — Descarga desde el SRI los XML de la carga. Asíncrono.
   * 202: {idCargaTxt, total, aProcesar, yaConXml, mensaje} · 409: {error}
   */
  descargarXmlLote(idCargaTxt: number, payload: { idEmpresa: number; idUsuario: number }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/descargarXmlLote/${idCargaTxt}`, payload, this.httpOptions)
      .pipe(catchError(this.handleErrorConEstado));
  }

  /**
   * §6.2 — Registra y contabiliza toda la carga. Asíncrono.
   * 202: {idCargaTxt, aProcesar, sinXml, yaRegistrados, mensaje} · 409: {error}
   */
  registrarLote(idCargaTxt: number, payload: { idEmpresa: number; idUsuario: number }): Observable<any> {
    return this.http.post<any>(`${PROCESS_URL}/registrarLote/${idCargaTxt}`, payload, this.httpOptions)
      .pipe(catchError(this.handleErrorConEstado));
  }

  /** §6.3 — Progreso en vivo de la carga; sirve a los dos lotes. Se consulta cada 2 s mientras enCurso. */
  progresoLote(idCargaTxt: number): Observable<ProgresoLote | null> {
    return this.http.get<ProgresoLote>(`${PROCESS_URL}/progresoLote/${idCargaTxt}`)
      .pipe(catchError(this.handleErrorConEstado));
  }

  /** §6.5 — Productos de la carga que siguen en POR CLASIFICAR, con los documentos que los usan. */
  productosSinClasificarLote(idCargaTxt: number): Observable<ProductosSinClasificarLote | null> {
    return this.http.get<ProductosSinClasificarLote>(`${PROCESS_URL}/productosSinClasificarLote/${idCargaTxt}`)
      .pipe(catchError(this.handleErrorConEstado));
  }

  /** §6.4 — Asigna grupo a varios productos en un solo viaje. 200: {actualizados, noEncontrados} */
  clasificarProductosLote(payload: ClasificarProductosLotePayload): Observable<ResultadoClasificacion | null> {
    return this.http.post<ResultadoClasificacion>(`${PROCESS_URL}/clasificarProductosLote`, payload, this.httpOptions)
      .pipe(catchError(this.handleErrorConEstado));
  }

  // ─── REEMBOLSO DE GASTOS ────────────────────────────────

  /**
   * Marca/desmarca un documento como factura de reembolso de gastos.
   * Usa handleErrorConEstado porque la pantalla necesita distinguir el 422 (regla de negocio:
   * pagos aplicados / sustentos activos) de un error genérico para mostrar su texto tal cual.
   */
  marcarReembolso(idDocumentoCxp: number, esReembolso: boolean, idUsuario: number): Observable<any> {
    return this.http.post(`${PROCESS_URL}/marcarReembolso/${idDocumentoCxp}`,
      { esReembolso: esReembolso ? 1 : 0, idUsuario }, this.httpOptions)
      .pipe(catchError(this.handleErrorConEstado));
  }

  /** Contabiliza una factura de reembolso pendiente (requiere sustentos clasificados y cuadratura). */
  contabilizarReembolso(idFacturaCompra: number, idEmpresa: number, idUsuario: number): Observable<any> {
    return this.http.post(`${PROCESS_URL}/contabilizarReembolso/${idFacturaCompra}`,
      { idEmpresa, idUsuario }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** Recalcula y persiste en la cabecera los totales de los sustentos; devuelve la cuadratura. */
  recalcularTotalesReembolso(idFacturaCompra: number): Observable<CuadraturaReembolso | null> {
    return this.http.post<CuadraturaReembolso>(
      `${PROCESS_URL}/recalcularTotalesReembolso/${idFacturaCompra}`, {}, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  /** Crea un producto en el grupo POR CLASIFICAR para asignar a un sustento. */
  crearProductoPorClasificar(nombre: string, codigo: string | null, idEmpresa: number): Observable<any> {
    return this.http.post(`${PROCESS_URL}/crearProductoPorClasificar`,
      { nombre, codigo, idEmpresa }, this.httpOptions)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    return throwError(() => error.error);
  }

  /**
   * Igual que handleError pero agrega httpStatus al cuerpo lanzado, sin quitarle ninguna clave:
   * los llamadores que solo leen mensaje/message/error siguen funcionando igual.
   */
  private handleErrorConEstado(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) { return of(null); }
    const cuerpo = error.error;
    if (cuerpo && typeof cuerpo === 'object') {
      return throwError(() => ({ ...cuerpo, httpStatus: error.status }));
    }
    return throwError(() => ({ mensaje: cuerpo || error.message, httpStatus: error.status }));
  }
}
