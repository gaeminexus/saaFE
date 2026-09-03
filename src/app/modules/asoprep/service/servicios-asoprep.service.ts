import { HttpHeaders, HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';
import { ServiciosAsoprep } from './ws-asgn';
import { CargaArchivo } from '../../crd/model/carga-archivo';
import { ParticipeXCargaArchivo } from '../../crd/model/participe-x-carga-archivo';
import { TopeAfectacionManual } from '../../crd/model/tope-afectacion-manual';
import { PrevueloAfectacionCarga } from '../../crd/model/prevuelo-afectacion';
import { environment } from '../../../../environments/environment';
import {
  AnulacionTransferenciaResponse,
  AsientoCobroPetroDTO,
  ConfirmarRecepcionRequest,
  ConfirmarRecepcionResponse,
  EstadoContableCargaDTO,
  EstadoTransferenciasCargaDTO,
  NuevaTransferenciaRequest,
  ReversarRecepcionRequest,
  ReversarRecepcionResponse,
  TransferenciaDTO,
} from '../../crd/model/cobro-petro';

@Injectable({
  providedIn: 'root'
})
export class ServiciosAsoprepService {

  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  // ── Mock de desarrollo — Cobro de Petro en dos pasos (docs/crd/API-COBRO-PETRO-DOS-PASOS.md) ──
  /** idCarga → estado simulado. Sembrado la primera vez que se pide esa carga. */
  private mockEstadoPorCarga = new Map<number, EstadoTransferenciasCargaDTO>();
  private mockAsientosPorCarga = new Map<number, AsientoCobroPetroDTO[]>();
  private mockSiguienteIdTransferencia = 9000;
  private mockSiguienteIdAsiento = 5000;

  constructor(private http: HttpClient) { }

  /**
   * Almacena datos completos del archivo Petro con archivo físico
   * POST application/x-www-form-urlencoded: Envía archivo + 3 variables JSON
   */
  almacenaDatosArchivoPetro(
    archivo: File,
    cargaArchivo: any,
    detallesCargaArchivos: any[],
    participesXCargaArchivo: any[]
  ): Observable<any | null> {
    const wsEndpoint = '/procesarArchivoPetro';
    const url = `${ServiciosAsoprep.RS_ASGN}${wsEndpoint}`;
    const formData = new FormData();

    // Archivo físico
    formData.append('archivo', archivo);

    // Nombre del archivo
    formData.append('archivoNombre', archivo.name);

    // Variables JSON como strings en FormData
    formData.append('cargaArchivo', JSON.stringify(cargaArchivo));
    formData.append('detallesCargaArchivos', JSON.stringify(detallesCargaArchivos));
    formData.append('participesXCargaArchivo', JSON.stringify(participesXCargaArchivo));

    // Para FormData NO usar httpOptions (el navegador establece Content-Type automáticamente)
    return this.http.post<any>(url, formData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Almacena datos completos del archivo Petro con archivo físico
   * POST application/x-www-form-urlencoded: Envía archivo + 3 variables JSON
   */
  validaDatosArchivoPetro(
    archivo: File,
    cargaArchivo: any,
  ): Observable<CargaArchivo | null> {
    const wsEndpoint = '/validarArchivoPetro';
    const url = `${ServiciosAsoprep.RS_ASGN}${wsEndpoint}`;
    const formData = new FormData();
    // Archivo físico
    formData.append('archivo', archivo);
    // Nombre del archivo
    formData.append('archivoNombre', archivo.name);
    // Variables JSON como strings en FormData
    formData.append('cargaArchivo', JSON.stringify(cargaArchivo));

    // Para FormData NO usar httpOptions (el navegador establece Content-Type automáticamente)
    return this.http.post<CargaArchivo>(url, formData).pipe(
      catchError(this.handleError)
    );
  }

  actualizaCodigoPetroEntidad(codigoPetro: number, idParticipeXCarga: number, idEntidad: number): Observable<ParticipeXCargaArchivo | null> {
      const wsGetById = '/actualizaCodigoPetroEntidad/';
      const url = `${ServiciosAsoprep.RS_ASGN}${wsGetById}${codigoPetro}/${idParticipeXCarga}/${idEntidad}`;
      return this.http.get<ParticipeXCargaArchivo>(url).pipe(catchError(this.handleError));
  }

  aplicarPagosArchivoPetro(idCargaArchivo: number): Observable<any | null> {
    const wsEndpoint = `/aplicarPagosArchivoPetro/${idCargaArchivo}`;
    const url = `${ServiciosAsoprep.RS_ASGN}${wsEndpoint}`;
    return this.http.post<any>(url, {}).pipe(catchError(this.handleError));
  }

  /**
   * Tope de afectación manual por partícipe — solo lectura, informa (`VALIDACION-TOPE-
   * AFECTACION-MANUAL.md` §8). No reimplementa la regla: consulta la misma fórmula que el
   * backend usa para bloquear al procesar.
   */
  topeAfectacion(idCarga: number, codigoPetro: number): Observable<TopeAfectacionManual | null> {
    const url = `${ServiciosAsoprep.RS_ASGN}/topeAfectacion`;
    const params = new HttpParams().set('idCarga', String(idCarga)).set('codigoPetro', String(codigoPetro));
    return this.http.get<TopeAfectacionManual>(url, { params }).pipe(catchError(this.handleError));
  }

  /**
   * El prevuelo — ve el descuadre ANTES de procesar (`VALIDACION-TOPE-AFECTACION-MANUAL.md` §9).
   * Sólo lectura, corre la misma validación en seco sobre toda la carga. No bloquea nada.
   */
  prevueloAfectacion(idCarga: number): Observable<PrevueloAfectacionCarga | null> {
    const url = `${ServiciosAsoprep.RS_ASGN}/prevueloAfectacion`;
    const params = new HttpParams().set('idCarga', String(idCarga));
    return this.http.get<PrevueloAfectacionCarga>(url, { params }).pipe(catchError(this.handleError));
  }

  // ═══════════════ Cobro de Petro en dos pasos — §2 del contrato congelado ═══════════════

  /** §2.1 — GET /asgn/transferencias/{idCarga}. */
  obtenerTransferencias(idCarga: number): Observable<EstadoTransferenciasCargaDTO | null> {
    if (environment.mockCobroPetro) {
      return of(this.mockClonarEstado(this.mockObtenerOSembrar(idCarga))).pipe(delay(300));
    }
    return this.http
      .get<EstadoTransferenciasCargaDTO>(`${ServiciosAsoprep.RS_ASGN}/transferencias/${idCarga}`)
      .pipe(catchError(this.handleError));
  }

  /** §2.1 — POST /asgn/transferencias. Rechaza si la carga ya está confirmada. */
  agregarTransferencia(datos: NuevaTransferenciaRequest): Observable<TransferenciaDTO | null> {
    if (environment.mockCobroPetro) {
      const estado = this.mockObtenerOSembrar(datos.idCarga);
      if (estado.confirmada) {
        return throwError(() => ({ mensaje: 'La carga ya está confirmada (mock): reverse antes de agregar transferencias.' }));
      }
      const nueva: TransferenciaDTO = {
        idTransferencia: this.mockSiguienteIdTransferencia++,
        idCarga: datos.idCarga,
        idCuentaBancaria: datos.idCuentaBancaria,
        cuentaBancaria: `Cuenta ${datos.idCuentaBancaria} (mock)`,
        idBanco: datos.idBanco,
        nombreBanco: `Banco ${datos.idBanco} (mock)`,
        idBancoExterno: datos.idBancoExterno,
        nombreBancoExterno: `Banco externo ${datos.idBancoExterno} (mock)`,
        cuentaOrigen: datos.cuentaOrigen,
        numero: datos.numero,
        valor: datos.valor,
        fecha: datos.fecha,
        observacion: datos.observacion,
        estado: 1,
        usuarioRegistro: datos.usuario,
        fechaRegistro: new Date().toISOString(),
      };
      estado.transferencias.unshift(nueva);
      this.mockRecalcularTotales(estado);
      return of({ ...nueva }).pipe(delay(300));
    }
    return this.http
      .post<TransferenciaDTO>(`${ServiciosAsoprep.RS_ASGN}/transferencias`, datos)
      .pipe(catchError(this.handleError));
  }

  /** §2.1 — DELETE /asgn/transferencias/{id}?usuario=X. Anula (estado 0), no borra. */
  anularTransferencia(idTransferencia: number, usuario: string): Observable<AnulacionTransferenciaResponse | null> {
    if (environment.mockCobroPetro) {
      for (const estado of this.mockEstadoPorCarga.values()) {
        const transferencia = estado.transferencias.find((t) => t.idTransferencia === idTransferencia);
        if (!transferencia) continue;
        if (estado.confirmada) {
          return throwError(() => ({ mensaje: 'La carga ya está confirmada (mock): reverse antes de anular transferencias.' }));
        }
        transferencia.estado = 0;
        this.mockRecalcularTotales(estado);
        return of({ anulada: true as const }).pipe(delay(300));
      }
      return throwError(() => ({ mensaje: 'Transferencia no encontrada (mock).' }));
    }
    const params = new HttpParams().set('usuario', usuario);
    return this.http
      .delete<AnulacionTransferenciaResponse>(`${ServiciosAsoprep.RS_ASGN}/transferencias/${idTransferencia}`, { params })
      .pipe(catchError(this.handleError));
  }

  /** §2.2 — POST /asgn/confirmarRecepcion/{idCarga}. Validaciones del §2.2, en orden. */
  confirmarRecepcion(idCarga: number, datos: ConfirmarRecepcionRequest): Observable<ConfirmarRecepcionResponse | null> {
    if (environment.mockCobroPetro) {
      const estado = this.mockEstadoPorCarga.get(idCarga);
      if (!estado) {
        return throwError(() => ({ mensaje: `La carga ${idCarga} no existe (mock).` }));
      }
      if (estado.confirmada) {
        return throwError(() => ({ mensaje: 'La carga ya está confirmada (mock).' }));
      }
      const vigentes = estado.transferencias.filter((t) => t.estado === 1);
      if (!vigentes.length) {
        return throwError(() => ({ mensaje: 'No hay ninguna transferencia vigente (mock).' }));
      }
      if (!estado.cuadra) {
        return throwError(() => ({
          mensaje: `La suma de las transferencias no cuadra con el total del archivo (mock): diferencia ${estado.diferencia.toFixed(2)}.`,
        }));
      }

      const ahora = new Date().toISOString();
      estado.confirmada = true;
      estado.usuarioConfirma = datos.usuario;
      estado.fechaConfirmacion = ahora;

      // Mock siempre con contabilidad activa; PIEZA 3 debe poder probar el caso false a mano
      // cambiando esta constante mientras no exista un mock del interruptor de contabilidad CRD.
      const contabilidadActiva = true;
      const idAsiento = this.mockSiguienteIdAsiento++;
      if (contabilidadActiva) {
        const asientos = this.mockAsientosPorCarga.get(idCarga) ?? [];
        asientos.push({
          tipo: 1,
          tipoTexto: 'TRANSITORIO',
          idAsiento,
          numeroAsiento: `MOCK-${idAsiento}`,
          fecha: ahora,
          valor: estado.totalTransferencias,
          lineas: vigentes.length + 1,
          estado: 1,
          usuarioRegistro: datos.usuario,
          fechaRegistro: ahora,
        });
        this.mockAsientosPorCarga.set(idCarga, asientos);
      }

      const respuesta: ConfirmarRecepcionResponse = {
        idCarga,
        confirmada: true,
        idAsiento,
        numeroAsiento: `MOCK-${idAsiento}`,
        fechaAsiento: ahora,
        valorAsiento: estado.totalTransferencias,
        contabilidadActiva,
        mensaje: 'Recepción confirmada (mock).',
      };
      return of(respuesta).pipe(delay(300));
    }
    return this.http
      .post<ConfirmarRecepcionResponse>(`${ServiciosAsoprep.RS_ASGN}/confirmarRecepcion/${idCarga}`, datos)
      .pipe(catchError(this.handleError));
  }

  /** §2.3 — POST /asgn/reversarRecepcion/{idCarga}. `motivo` obligatorio. */
  reversarRecepcion(idCarga: number, datos: ReversarRecepcionRequest): Observable<ReversarRecepcionResponse | null> {
    if (environment.mockCobroPetro) {
      if (!datos.motivo?.trim()) {
        return throwError(() => ({ mensaje: 'El motivo del reverso es obligatorio (mock).' }));
      }
      const estado = this.mockEstadoPorCarga.get(idCarga);
      if (!estado || !estado.confirmada) {
        return throwError(() => ({ mensaje: 'La carga no está confirmada (mock): no hay nada que reversar.' }));
      }
      const asientos = this.mockAsientosPorCarga.get(idCarga) ?? [];
      const transitorio = [...asientos].reverse().find((a) => a.tipo === 1 && a.estado === 1);
      if (transitorio) {
        transitorio.estado = 0;
      }
      estado.confirmada = false;
      estado.usuarioConfirma = null;
      estado.fechaConfirmacion = null;
      const respuesta: ReversarRecepcionResponse = {
        idCarga,
        confirmada: false,
        idAsientoAnulado: transitorio?.idAsiento ?? 0,
        mensaje: 'Recepción reversada (mock).',
      };
      return of(respuesta).pipe(delay(300));
    }
    return this.http
      .post<ReversarRecepcionResponse>(`${ServiciosAsoprep.RS_ASGN}/reversarRecepcion/${idCarga}`, datos)
      .pipe(catchError(this.handleError));
  }

  /** §2.4 — GET /asgn/estadoContable/{idCarga}. Lista vacía = no contabilizado, no es error. */
  obtenerEstadoContable(idCarga: number): Observable<EstadoContableCargaDTO | null> {
    if (environment.mockCobroPetro) {
      return of({
        idCarga,
        contabilidadActiva: true,
        asientos: [...(this.mockAsientosPorCarga.get(idCarga) ?? [])],
      }).pipe(delay(300));
    }
    return this.http
      .get<EstadoContableCargaDTO>(`${ServiciosAsoprep.RS_ASGN}/estadoContable/${idCarga}`)
      .pipe(catchError(this.handleError));
  }

  private mockObtenerOSembrar(idCarga: number): EstadoTransferenciasCargaDTO {
    let estado = this.mockEstadoPorCarga.get(idCarga);
    if (!estado) {
      // Determinístico por idCarga (nada de Math.random) para que no cambie en cada carga.
      const totalArchivo = +(10000 + (idCarga % 5) * 2500).toFixed(2);
      estado = {
        idCarga,
        periodo: this.mockPeriodoActual(),
        nombreFilial: idCarga % 2 === 0 ? 'PETROCOMERCIAL' : 'ARCH',
        totalArchivo,
        totalTransferencias: 0,
        diferencia: totalArchivo,
        cuadra: false,
        confirmada: false,
        usuarioConfirma: null,
        fechaConfirmacion: null,
        transferencias: [],
      };
      this.mockEstadoPorCarga.set(idCarga, estado);
    }
    return estado;
  }

  private mockClonarEstado(estado: EstadoTransferenciasCargaDTO): EstadoTransferenciasCargaDTO {
    return { ...estado, transferencias: [...estado.transferencias] };
  }

  private mockRecalcularTotales(estado: EstadoTransferenciasCargaDTO): void {
    const vigentes = estado.transferencias.filter((t) => t.estado === 1);
    const totalTransferencias = +vigentes.reduce((suma, t) => suma + t.valor, 0).toFixed(2);
    estado.totalTransferencias = totalTransferencias;
    estado.diferencia = +(estado.totalArchivo - totalTransferencias).toFixed(2);
    estado.cuadra = Math.abs(estado.diferencia) <= 0.01;
  }

  private mockPeriodoActual(): string {
    const hoy = new Date();
    return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

}
