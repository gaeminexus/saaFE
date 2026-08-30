import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  Certificado,
  CampoCertificado,
  ESTADO_CERTIFICADO,
  GRUPOS_CALIDAD_CERTIFICADO,
  LiquidacionCertificado,
  MotivoBloqueo,
  NOMBRE_TIPO_CERTIFICADO,
  PrecargaCertificado,
  PrestamoCertificado,
  ResultadoAnulacionCertificado,
  ResultadoEmisionCertificado,
  SolicitudEmisionCertificado,
  TIPO_CERTIFICADO,
} from '../model/certificado-participe';
import { ServiciosCrd } from './ws-crd';

/**
 * Certificados de partícipe (docs/crd/API-CERTIFICADOS-PARTICIPE.md) — contrato congelado. El
 * backend todavía no publica /rest/crtf/*: mientras `environment.mockCertificadosParticipe` esté
 * en `true`, este servicio simula los 6 tipos en memoria contra el contrato. Apagar el flag (o que
 * el backend publique y se borre) hace que llame al backend real sin tocar los componentes.
 */
@Injectable({
  providedIn: 'root',
})
export class CertificadoParticipeService {
  // ── Mock de desarrollo ──────────────────────────────────────────────────────────────────
  private mockEmitidosPorEntidad = new Map<number, Certificado[]>();
  private mockSiguienteCodigo = 1;
  private mockSiguienteNumeroPorAnio = new Map<number, number>();

  constructor(private http: HttpClient) {}

  /** §3.1 — GET /crtf/precarga/{idEntidad}/{tipo}. */
  obtenerPrecarga(
    idEntidad: number,
    tipo: number,
    idPrestamo?: number | null,
    idLiquidacion?: number | null
  ): Observable<PrecargaCertificado | null> {
    if (environment.mockCertificadosParticipe) {
      try {
        return of(this.mockPrecarga(idEntidad, tipo, idPrestamo ?? null, idLiquidacion ?? null)).pipe(delay(300));
      } catch (err) {
        return throwError(() => err);
      }
    }
    let params = new HttpParams();
    if (idPrestamo != null) params = params.set('idPrestamo', idPrestamo);
    if (idLiquidacion != null) params = params.set('idLiquidacion', idLiquidacion);
    return this.http
      .get<PrecargaCertificado>(`${ServiciosCrd.RS_CRTF}/precarga/${idEntidad}/${tipo}`, { params })
      .pipe(catchError(this.handleError));
  }

  /** §3.2 — POST /crtf/emitir. Re-evalúa bloqueos y MANUAL_REQUERIDO como lo haría el backend real. */
  emitir(solicitud: SolicitudEmisionCertificado): Observable<ResultadoEmisionCertificado | null> {
    if (environment.mockCertificadosParticipe) {
      try {
        return of(this.mockEmitir(solicitud)).pipe(delay(400));
      } catch (err) {
        return throwError(() => err);
      }
    }
    return this.http
      .post<ResultadoEmisionCertificado>(`${ServiciosCrd.RS_CRTF}/emitir`, solicitud)
      .pipe(catchError(this.handleError));
  }

  /** §3.3 — GET /crtf/getByEntidad/{idEntidad}. Más reciente primero, incluye anulados. */
  obtenerPorEntidad(idEntidad: number): Observable<Certificado[] | null> {
    if (environment.mockCertificadosParticipe) {
      const lista = [...(this.mockEmitidosPorEntidad.get(idEntidad) ?? [])].sort((a, b) => b.codigo - a.codigo);
      return of(lista).pipe(delay(300));
    }
    return this.http
      .get<Certificado[]>(`${ServiciosCrd.RS_CRTF}/getByEntidad/${idEntidad}`)
      .pipe(catchError(this.handleError));
  }

  /** §3.3 — GET /crtf/getByAnio/{anio}. La serie completa del año, por número. */
  obtenerPorAnio(anio: number): Observable<Certificado[] | null> {
    if (environment.mockCertificadosParticipe) {
      const todos: Certificado[] = [];
      for (const lista of this.mockEmitidosPorEntidad.values()) {
        todos.push(...lista.filter((c) => c.anio === anio));
      }
      todos.sort((a, b) => a.numero - b.numero);
      return of(todos).pipe(delay(300));
    }
    return this.http
      .get<Certificado[]>(`${ServiciosCrd.RS_CRTF}/getByAnio/${anio}`)
      .pipe(catchError(this.handleError));
  }

  /** §3.3 — GET /crtf/pdf/{idCertificado}. No es una llamada HTTP: se abre inline en una pestaña. */
  urlPdf(idCertificado: number): string {
    return `${ServiciosCrd.RS_CRTF}/pdf/${idCertificado}`;
  }

  /** §3.3 — POST /crtf/anular/{idCertificado}?motivo=X&usuario=Y. */
  anular(idCertificado: number, motivo: string, usuario: string): Observable<ResultadoAnulacionCertificado | null> {
    if (environment.mockCertificadosParticipe) {
      try {
        return of(this.mockAnular(idCertificado, motivo, usuario)).pipe(delay(300));
      } catch (err) {
        return throwError(() => err);
      }
    }
    const params = new HttpParams().set('motivo', motivo).set('usuario', usuario);
    return this.http
      .post<ResultadoAnulacionCertificado>(`${ServiciosCrd.RS_CRTF}/anular/${idCertificado}`, null, { params })
      .pipe(catchError(this.handleError));
  }

  // ══════════════════════════════ Mock — helpers deterministicos ══════════════════════════════

  /** 2 préstamos por entidad, deterministicos (nada de Math.random). */
  private mockPrestamosDeEntidad(idEntidad: number): PrestamoCertificado[] {
    const estadoVigenteOMora = idEntidad % 4 === 0 ? 8 : 2; // 8 = EN MORA, 2 = VIGENTE
    return [
      {
        idPrestamo: idEntidad * 10 + 1,
        numeroCredito: 60000 + idEntidad,
        producto: 'EMERGENTE',
        productoTexto: 'Crédito Emergente',
        fecha: '2022-01-15',
        estado: estadoVigenteOMora,
        estadoTexto: this.mockEstadoPrestamoTexto(estadoVigenteOMora),
        cancelado: false,
      },
      {
        idPrestamo: idEntidad * 10 + 2,
        numeroCredito: 60000 + idEntidad + 1,
        producto: 'HIPOTECARIO',
        productoTexto: 'Crédito Hipotecario',
        fecha: '2020-05-10',
        estado: idEntidad % 6 === 0 ? 9 : 3, // 9 = CANCELADO POR REVISAR (no cuenta como cancelado), 3 = CANCELADO
        estadoTexto: this.mockEstadoPrestamoTexto(idEntidad % 6 === 0 ? 9 : 3),
        cancelado: idEntidad % 6 !== 0,
      },
    ];
  }

  private mockEstadoPrestamoTexto(estado: number): string {
    const textos: Record<number, string> = {
      2: 'VIGENTE',
      3: 'CANCELADO',
      4: 'CANCELADO',
      5: 'CANCELADO',
      8: 'EN MORA',
      9: 'CANCELADO POR REVISAR',
      11: 'EN MORA',
    };
    return textos[estado] ?? `ESTADO ${estado}`;
  }

  private mockLiquidacionesDeEntidad(idEntidad: number): LiquidacionCertificado[] {
    if (idEntidad % 3 === 0) return []; // sin liquidaciones (mock) — dispara MANUAL_REQUERIDO
    return [
      {
        idLiquidacion: idEntidad * 100 + 1,
        fechaPago: '2024-11-20',
        tipo: 'CP',
        tipoTexto: 'Cesantía patronal',
        valor: 1200 + (idEntidad % 50) * 10,
        observacion: null,
      },
    ];
  }

  private campoSistema(valor: string | number | boolean, valorTexto: string, editable: boolean, fuente: string): CampoCertificado {
    return { valor, valorTexto, origen: 'SISTEMA', editable, fuente };
  }

  private campoFaltante(editable: boolean): CampoCertificado {
    return { valor: null, valorTexto: '', origen: 'MANUAL_REQUERIDO', editable, fuente: null };
  }

  private mockPrecarga(
    idEntidad: number,
    tipo: number,
    idPrestamo: number | null,
    idLiquidacion: number | null
  ): PrecargaCertificado {
    const tipoTexto = NOMBRE_TIPO_CERTIFICADO[tipo];
    if (!tipoTexto) {
      throw { mensaje: `PARAMETRO_INVALIDO: tipo de certificado desconocido (mock): ${tipo}` };
    }

    const calidadSistema = 1 + (idEntidad % 9);
    const base: Omit<PrecargaCertificado, 'campos' | 'bloqueos' | 'prestamos' | 'liquidaciones' | 'puedeEmitir'> = {
      idEntidad,
      tipo,
      tipoTexto,
      nombre: `PARTÍCIPE MOCK ${idEntidad}`,
      cedula: String(1700000000 + idEntidad),
      calidadSistema,
      calidadSistemaTexto: `CALIDAD ${calidadSistema} (mock)`,
    };

    let campos: Record<string, CampoCertificado> = {};
    let bloqueos: MotivoBloqueo[] = [];
    let prestamos: PrestamoCertificado[] = [];
    let liquidaciones: LiquidacionCertificado[] = [];

    switch (tipo) {
      case TIPO_CERTIFICADO.AL_DIA_EN_OBLIGACIONES: {
        campos = {
          anioDesde: this.campoSistema(2015 + (idEntidad % 8), String(2015 + (idEntidad % 8)), true, 'CRD.CNTR.CNTRFCIN (mock)'),
        };
        const resto = idEntidad % 4;
        if (resto === 0) {
          bloqueos = [this.mockBloqueoPrestamo('PRESTAMO_EN_MORA', idEntidad)];
        } else if (resto === 1) {
          bloqueos = [
            {
              codigo: 'CUOTA_VENCIDA',
              mensaje: `El préstamo Emergente No. ${60000 + idEntidad} tiene 2 cuotas vencidas (mock)`,
              idPrestamo: idEntidad * 10 + 1,
              numeroCredito: 60000 + idEntidad,
              producto: 'EMERGENTE',
              estado: 2,
              estadoTexto: 'VIGENTE',
            },
          ];
        } else if (resto === 2) {
          bloqueos = [
            {
              codigo: 'PARTICIPE_EN_MORA',
              mensaje: 'El partícipe está marcado ACTIVO EN MORA por falta de aportes (mock)',
              idPrestamo: null,
              numeroCredito: null,
              producto: null,
              estado: null,
              estadoTexto: null,
            },
          ];
        }
        break;
      }

      case TIPO_CERTIFICADO.HABER_RECIBIDO_APORTES: {
        liquidaciones = this.mockLiquidacionesDeEntidad(idEntidad);
        const elegida = idLiquidacion != null ? liquidaciones.find((l) => l.idLiquidacion === idLiquidacion) : liquidaciones[0];
        campos = {
          fechaLiquidacion: elegida
            ? this.campoSistema(elegida.fechaPago as string, this.mockFechaLarga(elegida.fechaPago as string), true, `CRD.HPCS #${elegida.idLiquidacion} (mock)`)
            : this.campoFaltante(true),
        };
        break;
      }

      case TIPO_CERTIFICADO.NO_ADEUDAR_CREDITO: {
        prestamos = this.mockPrestamosDeEntidad(idEntidad);
        if (idPrestamo == null) {
          campos = {};
          break;
        }
        const prestamo = prestamos.find((p) => p.idPrestamo === idPrestamo);
        if (!prestamo) {
          bloqueos = [
            { codigo: 'PRESTAMO_NO_PERTENECE', mensaje: 'El préstamo indicado no pertenece a este partícipe (mock)', idPrestamo, numeroCredito: null, producto: null, estado: null, estadoTexto: null },
          ];
          campos = {};
          break;
        }
        campos = {
          numeroCredito: this.campoSistema(prestamo.numeroCredito, String(prestamo.numeroCredito), false, 'PRST.PRSTIDAS (mock)'),
          productoTexto: this.campoSistema(prestamo.productoTexto, prestamo.productoTexto, false, 'PRDC.PRDCNMBR (mock)'),
        };
        if (!prestamo.cancelado) {
          bloqueos =
            prestamo.estado === 9
              ? [this.mockBloqueoDePrestamo('PRESTAMO_POR_REVISAR', prestamo)]
              : [this.mockBloqueoDePrestamo('PRESTAMO_NO_CANCELADO', prestamo)];
        }
        break;
      }

      case TIPO_CERTIFICADO.NO_ADEUDAR_GLOBAL: {
        prestamos = this.mockPrestamosDeEntidad(idEntidad);
        campos = {};
        for (const p of prestamos) {
          if (p.cancelado) continue;
          if (p.estado === 8 || p.estado === 11) bloqueos.push(this.mockBloqueoDePrestamo('PRESTAMO_EN_MORA', p));
          else if (p.estado === 9) bloqueos.push(this.mockBloqueoDePrestamo('PRESTAMO_POR_REVISAR', p));
          else bloqueos.push(this.mockBloqueoDePrestamo('PRESTAMO_NO_CANCELADO', p));
        }
        break;
      }

      case TIPO_CERTIFICADO.LICITUD_DE_FONDOS: {
        liquidaciones = this.mockLiquidacionesDeEntidad(idEntidad);
        const elegida = idLiquidacion != null ? liquidaciones.find((l) => l.idLiquidacion === idLiquidacion) : liquidaciones[0];
        if (elegida) {
          campos = {
            monto: this.campoSistema(elegida.valor, this.mockMoneda(elegida.valor), true, `CRD.HPCS #${elegida.idLiquidacion}.HPCSVLRR (mock)`),
            fechaPago: this.campoSistema(elegida.fechaPago as string, this.mockFechaLarga(elegida.fechaPago as string), true, `CRD.HPCS #${elegida.idLiquidacion}.HPCSFCHP (mock)`),
            conceptoDevolucion: this.campoSistema('fondo de cesantía', 'fondo de cesantía', true, 'HPCS.HPCSTIPC (mock)'),
            tipoCuenta: this.campoSistema(2, 'Ahorros', true, 'CRD.CNBP.CNBPTPCN (mock)'),
            numeroCuenta: this.campoSistema('2201234567', '2201234567', true, 'CNBP.CNBPNMRO (mock)'),
            banco: this.campoSistema('BANCO PICHINCHA', 'BANCO PICHINCHA', true, 'TSR.BEXT.BEXTNMBR (mock)'),
          };
        } else {
          campos = {
            monto: this.campoFaltante(true),
            fechaPago: this.campoFaltante(true),
            conceptoDevolucion: this.campoFaltante(true),
            tipoCuenta: this.campoFaltante(true),
            numeroCuenta: this.campoFaltante(true),
            banco: this.campoFaltante(true),
          };
        }
        break;
      }

      case TIPO_CERTIFICADO.APORTES_PATRONALES_SIN_JUBILACION: {
        const recibioCesantiaPatronal = idEntidad % 10 !== 0; // medido: minoría SÍ la tiene en S.A.A.
        const recibePensionMensual = idEntidad % 5 === 0;
        campos = {
          recibioCesantiaPatronal: this.campoSistema(recibioCesantiaPatronal, recibioCesantiaPatronal ? 'Sí' : 'No', true, 'EXISTS CRD.APRT TPAPCDGO IN (14,16) (mock)'),
          jubilacionPatronalSinMovimientos: this.campoSistema(true, 'Sí', true, 'NOT EXISTS CRD.APRT TPAPCDGO IN (13,15) (mock)'),
          recibePensionMensual: this.campoSistema(recibePensionMensual, recibePensionMensual ? 'Sí' : 'No', true, 'EXISTS CRD.APRT TPAPCDGO=23 / CRD.HPPJ (mock)'),
          fechaCortePension: this.campoFaltante(true),
        };
        if (recibePensionMensual) {
          bloqueos = [
            {
              codigo: 'RECIBE_PENSION',
              mensaje: 'El partícipe registra pagos de pensión complementaria: no se puede certificar que no la recibe (mock)',
              idPrestamo: null,
              numeroCredito: null,
              producto: null,
              estado: null,
              estadoTexto: null,
            },
          ];
        }
        break;
      }
    }

    // Comunes a los 6 (§4): nunca editables, siempre SISTEMA — van en la precarga, no solo al emitir.
    campos = {
      ...campos,
      firmante: this.campoSistema('Lic. Gabriel Patricio Robayo Rueda', 'Lic. Gabriel Patricio Robayo Rueda', false, 'rubro 243 alt 1 (mock)'),
      cargo: this.campoSistema('Jefe de Crédito', 'Jefe de Crédito', false, 'rubro 243 alt 2 (mock)'),
      ciudad: this.campoSistema('Quito', 'Quito', false, 'rubro 243 alt 3 (mock)'),
      fuenteDatos: this.campoSistema('sistema S.A.A.', 'sistema S.A.A.', false, 'fijo (mock)'),
    };

    const faltaAlgunManual = Object.values(campos).some((c) => c.origen === 'MANUAL_REQUERIDO' && (c.valor === null || c.valor === ''));
    const puedeEmitir = bloqueos.length === 0 && !faltaAlgunManual;

    return { ...base, puedeEmitir, bloqueos, campos, prestamos, liquidaciones };
  }

  private mockBloqueoPrestamo(codigo: 'PRESTAMO_EN_MORA', idEntidad: number): MotivoBloqueo {
    const numeroCredito = 60000 + idEntidad;
    return {
      codigo,
      mensaje: `El préstamo Emergente No. ${numeroCredito} está EN MORA (mock)`,
      idPrestamo: idEntidad * 10 + 1,
      numeroCredito,
      producto: 'EMERGENTE',
      estado: 8,
      estadoTexto: 'EN MORA',
    };
  }

  private mockBloqueoDePrestamo(
    codigo: 'PRESTAMO_EN_MORA' | 'PRESTAMO_NO_CANCELADO' | 'PRESTAMO_POR_REVISAR',
    p: PrestamoCertificado
  ): MotivoBloqueo {
    const mensajes: Record<string, string> = {
      PRESTAMO_EN_MORA: `El préstamo ${p.productoTexto.replace('Crédito ', '')} No. ${p.numeroCredito} está EN MORA (mock)`,
      PRESTAMO_NO_CANCELADO: `El préstamo ${p.productoTexto.replace('Crédito ', '')} No. ${p.numeroCredito} está ${p.estadoTexto}, no cancelado (mock)`,
      PRESTAMO_POR_REVISAR: `El préstamo ${p.productoTexto.replace('Crédito ', '')} No. ${p.numeroCredito} está CANCELADO POR REVISAR: debe revisarse antes de certificar (mock)`,
    };
    return {
      codigo,
      mensaje: mensajes[codigo],
      idPrestamo: p.idPrestamo,
      numeroCredito: p.numeroCredito,
      producto: p.producto,
      estado: p.estado,
      estadoTexto: p.estadoTexto,
    };
  }

  private mockFechaLarga(fechaIso: string): string {
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const [y, m, d] = fechaIso.split('-').map(Number);
    return `${d} de ${meses[m - 1]} de ${y}`;
  }

  /**
   * Simula el objeto `Prestamo` JPA completo que trae `Certificado.prestamo` en el backend real
   * — acá solo con los dos campos que el listado (pieza 4) va a leer (`idAsoprep`/`codigo`, regla
   * `NVL(PRSTIDAS, PRSTCDGO)`), confirmado por el árbitro el 2026-08-29.
   */
  private mockPrestamoJpa(idPrestamo: number | null | undefined, prestamos: PrestamoCertificado[]): { idAsoprep: number | null; codigo: number } | null {
    if (idPrestamo == null) return null;
    const p = prestamos.find((x) => x.idPrestamo === idPrestamo);
    if (!p) return null;
    return { idAsoprep: p.numeroCredito, codigo: p.idPrestamo };
  }

  private mockMoneda(valor: number): string {
    return '$' + valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private mockEmitir(solicitud: SolicitudEmisionCertificado): ResultadoEmisionCertificado {
    if (!solicitud.usuario?.trim()) {
      throw { mensaje: 'PARAMETRO_INVALIDO: falta usuario (mock)' };
    }
    if (solicitud.tipo === TIPO_CERTIFICADO.NO_ADEUDAR_CREDITO && solicitud.idPrestamo == null) {
      throw { mensaje: 'PARAMETRO_INVALIDO: idPrestamo es obligatorio en el tipo 3 (mock)' };
    }

    // Re-evalúa contra la misma precarga — el backend no confía en lo que mandó el cliente.
    const precarga = this.mockPrecarga(solicitud.idEntidad, solicitud.tipo, solicitud.idPrestamo ?? null, solicitud.idLiquidacion ?? null);
    if (precarga.bloqueos.length > 0) {
      throw { mensaje: precarga.bloqueos[0].mensaje };
    }

    const campoFinal: Record<string, CampoCertificado> = {};
    for (const [clave, campoPrecarga] of Object.entries(precarga.campos)) {
      const mandado = solicitud.campos[clave];
      if (campoPrecarga.origen === 'SISTEMA') {
        const distinto = mandado != null && mandado !== campoPrecarga.valor;
        campoFinal[clave] =
          distinto && campoPrecarga.editable
            ? { ...campoPrecarga, valor: mandado, valorTexto: String(mandado), origen: 'MANUAL_EDITADO' }
            : campoPrecarga;
      } else {
        if (mandado == null || mandado === '') {
          throw { mensaje: `CAMPO_REQUERIDO: Falta capturar: ${clave} (mock)` };
        }
        campoFinal[clave] = { valor: mandado, valorTexto: String(mandado), origen: 'MANUAL_REQUERIDO', editable: campoPrecarga.editable, fuente: null };
      }
    }
    // firmante/cargo/ciudad/fuenteDatos ya están en precarga.campos (§4, comunes a los 6) y el
    // loop de arriba los procesa igual que cualquier campo SISTEMA no editable.

    const anio = new Date().getFullYear();
    const numero = (this.mockSiguienteNumeroPorAnio.get(anio) ?? 0) + 1;
    this.mockSiguienteNumeroPorAnio.set(anio, numero);
    const idCertificado = this.mockSiguienteCodigo++;
    const numeroAlterno = `ASOPREP-FCPC-PARTICIPE-${String(numero).padStart(3, '0')}-${anio}`;
    const hoy = new Date();
    const fechaEmision = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

    const calidadFinal = solicitud.calidad;
    const calidadTexto = GRUPOS_CALIDAD_CERTIFICADO.find((g) => g.alternos.includes(calidadFinal))?.label ?? `CALIDAD ${calidadFinal} (mock)`;

    const certificado: Certificado = {
      codigo: idCertificado,
      anio,
      numero,
      numeroAlterno,
      tipoCertificado: solicitud.tipo,
      entidad: { codigo: solicitud.idEntidad, razonSocial: precarga.nombre, numeroIdentificacion: precarga.cedula },
      prestamo: this.mockPrestamoJpa(solicitud.idPrestamo, precarga.prestamos),
      calidad: calidadFinal,
      fechaEmision,
      usuarioEmision: solicitud.usuario,
      datos: JSON.stringify({ campos: campoFinal, calidad: calidadFinal, firmante: campoFinal['firmante'].valor, cargo: campoFinal['cargo'].valor, ciudad: campoFinal['ciudad'].valor, fuenteDatos: campoFinal['fuenteDatos'].valor }),
      estado: ESTADO_CERTIFICADO.VIGENTE,
      usuarioAnulacion: null,
      fechaAnulacion: null,
      motivoAnulacion: null,
      fechaRegistro: fechaEmision,
    };
    const lista = this.mockEmitidosPorEntidad.get(solicitud.idEntidad) ?? [];
    lista.push(certificado);
    this.mockEmitidosPorEntidad.set(solicitud.idEntidad, lista);

    return {
      idCertificado,
      numero,
      anio,
      numeroAlterno,
      fechaEmision,
      tipo: solicitud.tipo,
      tipoTexto: precarga.tipoTexto,
      calidad: calidadFinal,
      calidadTexto,
      campos: campoFinal,
      urlPdf: this.urlPdf(idCertificado),
    };
  }

  private mockAnular(idCertificado: number, motivo: string, usuario: string): Certificado {
    if (!motivo?.trim()) {
      throw { mensaje: 'Falta el motivo de anulación (mock)' };
    }
    for (const lista of this.mockEmitidosPorEntidad.values()) {
      const cert = lista.find((c) => c.codigo === idCertificado);
      if (cert) {
        if (cert.estado === ESTADO_CERTIFICADO.ANULADO) {
          throw { mensaje: 'El certificado ya estaba anulado (mock)' };
        }
        cert.estado = ESTADO_CERTIFICADO.ANULADO;
        cert.usuarioAnulacion = usuario;
        cert.motivoAnulacion = motivo;
        const hoy = new Date();
        cert.fechaAnulacion = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
        return cert;
      }
    }
    throw { mensaje: `Certificado ${idCertificado} no encontrado (mock)` };
  }

  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    }
    return throwError(() => error.error);
  }
}
