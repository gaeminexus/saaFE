import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, delay, of, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CuadreDistribucionBandas,
  ErrorAuditoriaBandas,
  FilaDistribucionBanda,
  FiltroDetalleDistribucion,
  FiltroOrigenes,
  OrigenListado,
  RespuestaDetalleDistribucion,
} from '../model/auditoria-bandas';
import { ServiciosCrd } from './ws-crd';

/**
 * Auditoría de distribución en bandas (`docs/crd/API-AUDITORIA-BANDAS.md`). Todo el contrato es
 * de sólo lectura.
 *
 * ⚠️ **A propósito NO usa el `handleError` compartido** (`if (+error.status === 200) return
 * of(null)`) que usan los demás servicios generados del proyecto — lo pide la nota final del
 * contrato: en una herramienta de auditoría, un `null` "exitoso" donde hubo un fallo de parseo es
 * indistinguible de "sin datos", y acá eso es peor que mostrar el error. Los tres métodos
 * propagan el fallo como error de verdad (`throwError`), nunca como un valor vacío silencioso.
 */
@Injectable({ providedIn: 'root' })
export class AuditoriaBandasService {
  constructor(private http: HttpClient) {}

  obtenerCuadre(origen: string, idOrigen: number): Observable<CuadreDistribucionBandas> {
    if (environment.mockAuditoriaBandas) {
      return this.mockCuadre(origen, idOrigen).pipe(delay(250));
    }

    const params = new HttpParams().set('origen', origen).set('idOrigen', String(idOrigen));
    return this.http
      .get<CuadreDistribucionBandas>(`${ServiciosCrd.RS_DSBN}/cuadre`, { params })
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => this.normalizarError(error))));
  }

  obtenerDetalle(filtro: FiltroDetalleDistribucion): Observable<RespuestaDetalleDistribucion> {
    if (environment.mockAuditoriaBandas) {
      return this.mockDetalle(filtro).pipe(delay(250));
    }

    return this.http
      .post<RespuestaDetalleDistribucion>(`${ServiciosCrd.RS_DSBN}/detalle`, filtro)
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => this.normalizarError(error))));
  }

  obtenerOrigenes(filtro?: FiltroOrigenes): Observable<OrigenListado[]> {
    if (environment.mockAuditoriaBandas) {
      return this.mockOrigenes(filtro).pipe(delay(250));
    }

    let params = new HttpParams();
    if (filtro?.origen) params = params.set('origen', filtro.origen);
    if (filtro?.fechaDesde) params = params.set('fechaDesde', filtro.fechaDesde);
    if (filtro?.fechaHasta) params = params.set('fechaHasta', filtro.fechaHasta);
    if (filtro?.limite) params = params.set('limite', String(filtro.limite));

    return this.http
      .get<OrigenListado[]>(`${ServiciosCrd.RS_DSBN}/origenes`, { params })
      .pipe(catchError((error: HttpErrorResponse) => throwError(() => this.normalizarError(error))));
  }

  /**
   * `MensajeErrorJsonFilter` envuelve toda respuesta ≥400 como `{"mensaje": "..."}` — nunca
   * texto plano, pese a lo que digan documentos viejos (nota del propio contrato).
   */
  private normalizarError(error: HttpErrorResponse): ErrorAuditoriaBandas {
    const mensaje =
      typeof error.error?.mensaje === 'string' ? error.error.mensaje : 'No se pudo completar la consulta.';
    return { mensaje, status: error.status };
  }

  // ════════════════════════ Mock de desarrollo — contra el contrato congelado ════════════════════════
  //
  // La carga Petro 449 es la misma de los ejemplos del contrato (recibido 354.491,37, distribuido
  // 351.584,85, diferencia 2.906,52 — no cuadra a propósito, es el caso que motivó la pantalla).
  // Se agrega un segundo origen con `contabilidadConectada: false` (venta separada) y un tercero
  // sin ninguna fila (origen que corrió y no distribuyó nada), para poder probar los tres
  // escenarios que exige el plan sin esperar al backend.

  private mockFilasCache: FilaDistribucionBanda[] | null = null;

  private mockCuadre(origen: string, idOrigen: number): Observable<CuadreDistribucionBandas> {
    if (origen === 'CARGA_PETRO' && idOrigen === 449) {
      return of({
        origen: 'CARGA_PETRO',
        idOrigen: 449,
        descripcionOrigen: 'Carga Petro 8/2026',
        recibido: 354491.37,
        distribuido: 351584.85,
        diferencia: 2906.52,
        cuadra: false,
        contabilidadConectada: true,
        asientos: [{ idAsiento: 36, tipo: 'TRANSITORIO', fecha: '2026-08-31', estado: 'ACTIVO' }],
        bandas: this.mockBandasCatalogo(),
      });
    }

    if (origen === 'COBRO_INDIVIDUAL' && idOrigen === 87) {
      return of({
        origen: 'COBRO_INDIVIDUAL',
        idOrigen: 87,
        descripcionOrigen: 'Cobro individual #87',
        // Solo CARGA_PETRO tiene hoy una fuente de "recibido" independiente conectada
        // (`ResultadoCuadreDistribucionBanda.java`, verificado 2026-09-02) — los demás orígenes
        // no pueden decir si cuadran, así que estos tres van `null`, no un valor inventado.
        recibido: null,
        distribuido: 842.5,
        diferencia: null,
        cuadra: null,
        contabilidadConectada: false,
        asientos: [],
        bandas: [],
      });
    }

    if (origen === 'EVENTO_PRESTAMO' && idOrigen === 12) {
      return of({
        origen: 'EVENTO_PRESTAMO',
        idOrigen: 12,
        descripcionOrigen: 'Abono a capital #12',
        recibido: null,
        distribuido: 0,
        diferencia: null,
        cuadra: null,
        contabilidadConectada: true,
        asientos: [],
        bandas: [],
      });
    }

    return throwError(() => ({
      mensaje: `No se encontró distribución para ${origen} ${idOrigen} (mock).`,
      status: 404,
    }));
  }

  private mockDetalle(filtro: FiltroDetalleDistribucion): Observable<RespuestaDetalleDistribucion> {
    const todas = this.obtenerMockFilas(filtro.origen, filtro.idOrigen);

    let filtradas = todas.filter((f) => {
      if (filtro.conceptos?.length && !filtro.conceptos.includes(f.concepto)) return false;
      if (filtro.idsBanda?.length && (f.idBanda == null || !filtro.idsBanda.includes(f.idBanda))) return false;
      if (filtro.idsProducto?.length && (f.idProducto == null || !filtro.idsProducto.includes(f.idProducto))) return false;
      if (
        filtro.idsTipoPrestamo?.length &&
        (f.idTipoPrestamo == null || !filtro.idsTipoPrestamo.includes(f.idTipoPrestamo))
      )
        return false;
      if (
        filtro.idsTipoAporte?.length &&
        (f.idTipoAporte == null || !filtro.idsTipoAporte.includes(f.idTipoAporte))
      )
        return false;
      if (filtro.idsEntidad?.length && (f.idEntidad == null || !filtro.idsEntidad.includes(f.idEntidad))) return false;
      if (
        filtro.cuentasContables?.length &&
        (f.cuentaContable == null || !filtro.cuentasContables.includes(f.cuentaContable))
      )
        return false;
      if (filtro.fechaDesde && (!f.fechaAplicacion || f.fechaAplicacion < filtro.fechaDesde)) return false;
      if (filtro.fechaHasta && (!f.fechaAplicacion || f.fechaAplicacion > filtro.fechaHasta)) return false;
      return true;
    });

    if (filtro.ordenarPor) {
      const campo = filtro.ordenarPor as keyof FilaDistribucionBanda;
      const signo = filtro.orden === 'asc' ? 1 : -1;
      filtradas = [...filtradas].sort((a, b) => {
        const va = a[campo];
        const vb = b[campo];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        return va > vb ? signo : va < vb ? -signo : 0;
      });
    }

    const resumenPorConcepto = Object.values(
      filtradas.reduce<Record<string, { concepto: FilaDistribucionBanda['concepto']; valor: number; filas: number }>>(
        (acc, f) => {
          const actual = (acc[f.concepto] ??= { concepto: f.concepto, valor: 0, filas: 0 });
          actual.valor = +(actual.valor + f.valor).toFixed(2);
          actual.filas += 1;
          return acc;
        },
        {}
      )
    );

    const totalValorFiltrado = +filtradas.reduce((sum, f) => sum + f.valor, 0).toFixed(2);
    const pagina = filtro.pagina ?? 0;
    const tamanio = filtro.tamanio ?? 50;
    const filas = filtradas.slice(pagina * tamanio, pagina * tamanio + tamanio);

    return of({
      totalFilas: filtradas.length,
      pagina,
      tamanio,
      totalValorFiltrado,
      resumenPorConcepto,
      filas,
    });
  }

  private mockOrigenes(filtro?: FiltroOrigenes): Observable<OrigenListado[]> {
    let origenes: OrigenListado[] = [
      { origen: 'CARGA_PETRO', idOrigen: 449, descripcion: 'Carga Petro 8/2026', fecha: '2026-08-31', distribuido: 351584.85, cuadra: false },
      { origen: 'COBRO_INDIVIDUAL', idOrigen: 87, descripcion: 'Cobro individual #87', fecha: '2026-08-28', distribuido: 842.5, cuadra: null },
      { origen: 'EVENTO_PRESTAMO', idOrigen: 12, descripcion: 'Abono a capital #12', fecha: '2026-08-20', distribuido: 0, cuadra: null },
    ];

    if (filtro?.origen) {
      origenes = origenes.filter((o) => o.origen === filtro.origen);
    }
    if (filtro?.fechaDesde) {
      origenes = origenes.filter((o) => o.fecha >= filtro.fechaDesde!);
    }
    if (filtro?.fechaHasta) {
      origenes = origenes.filter((o) => o.fecha <= filtro.fechaHasta!);
    }
    if (filtro?.limite) {
      origenes = origenes.slice(0, filtro.limite);
    }

    return of(origenes);
  }

  private obtenerMockFilas(origen: string, idOrigen: number): FilaDistribucionBanda[] {
    if (origen === 'EVENTO_PRESTAMO' && idOrigen === 12) {
      return []; // Origen que corrió y no distribuyó nada — dato real, no error.
    }
    if (origen === 'COBRO_INDIVIDUAL' && idOrigen === 87) {
      return this.filasCobroIndividualMock();
    }
    if (origen === 'CARGA_PETRO' && idOrigen === 449) {
      return this.filasCargaPetroMock();
    }
    return [];
  }

  /**
   * Catálogo de bandas del mock — mismos `idBanda` que usan las filas de `filasCargaPetroMock`.
   * En el backend real esto sale de `ClasificadorBandaService.derivarRangos`, por producto y por
   * empresa; acá es fijo solo porque es un mock de una única carga/producto.
   */
  private mockBandasCatalogo(): { idBanda: number; numero: number; etiqueta: string; diaInicio: number | null; diaFin: number | null }[] {
    return [
      { idBanda: 1, numero: 1, etiqueta: 'de 1 a 30 dias', diaInicio: 1, diaFin: 30 },
      { idBanda: 2, numero: 2, etiqueta: 'de 31 a 60 dias', diaInicio: 31, diaFin: 60 },
      { idBanda: 3, numero: 3, etiqueta: 'de 61 a 90 dias', diaInicio: 61, diaFin: 90 },
      { idBanda: 4, numero: 4, etiqueta: 'de 91 a 180 dias', diaInicio: 91, diaFin: 180 },
      { idBanda: 5, numero: 5, etiqueta: 'mas de 180 (resto)', diaInicio: 181, diaFin: null },
    ];
  }

  /** Contabilidad desconectada: cuenta/asiento vienen null, el resto de la fila va completo. */
  private filasCobroIndividualMock(): FilaDistribucionBanda[] {
    return [
      {
        id: 90001, concepto: 'CAPITAL', valor: 620.0,
        idEntidad: 5501, participe: 'TORRES MEJIA CARLOS ANDRES', cedula: '1712345678', codigoAsoprep: 5501,
        idPrestamo: 8102, numeroCuota: 4, fechaVencimiento: '2026-08-28', fechaAplicacion: '2026-08-28',
        idProducto: 12, producto: 'CREDITO ORDINARIO', idTipoPrestamo: 1, idTipoAporte: null,
        tipoCartera: 1, dias: 5, idBanda: 1, banda: 'de 1 a 30 dias',
        cuentaContable: null, nombreCuenta: null, idAsiento: null,
      },
      {
        id: 90002, concepto: 'INTERES_ORDINARIO', valor: 222.5,
        idEntidad: 5501, participe: 'TORRES MEJIA CARLOS ANDRES', cedula: '1712345678', codigoAsoprep: 5501,
        idPrestamo: 8102, numeroCuota: 4, fechaVencimiento: '2026-08-28', fechaAplicacion: '2026-08-28',
        idProducto: 12, producto: 'CREDITO ORDINARIO', idTipoPrestamo: 1, idTipoAporte: null,
        tipoCartera: 1, dias: 5, idBanda: null, banda: null,
        cuentaContable: null, nombreCuenta: null, idAsiento: null,
      },
    ];
  }

  private filasCargaPetroMock(): FilaDistribucionBanda[] {
    if (this.mockFilasCache) return this.mockFilasCache;

    const participes = [
      { idEntidad: 401, participe: 'BUSTOS ALMEIDA LUIS GUILLERMO', cedula: '1701122334', codigoAsoprep: 401, idPrestamo: 7991 },
      { idEntidad: 1234, participe: 'PONCE VIVANCO MARIA FERNANDA', cedula: '1709988776', codigoAsoprep: 1234, idPrestamo: 7973 },
      { idEntidad: 2210, participe: 'ZAMBRANO LEON JORGE ENRIQUE', cedula: '1305544332', codigoAsoprep: 2210, idPrestamo: 7455 },
      { idEntidad: 3387, participe: 'ROMERO CASTILLO ANA LUCIA', cedula: '1102233445', codigoAsoprep: 3387, idPrestamo: 8021 },
    ];

    // `tipoCartera`: 1 = POR_VENCER, 2 = VENCIDO (com.saa.rubros.TipoCarteraBanda) — no hay un
    // tercer código "al día", el enum real solo tiene dos valores.
    const bandas: { idBanda: number; banda: string; tipoCartera: number; dias: number }[] = [
      { idBanda: 1, banda: 'de 1 a 30 dias', tipoCartera: 1, dias: 15 },
      { idBanda: 2, banda: 'de 31 a 60 dias', tipoCartera: 1, dias: 45 },
      { idBanda: 3, banda: 'de 61 a 90 dias', tipoCartera: 1, dias: 75 },
      { idBanda: 4, banda: 'de 91 a 180 dias', tipoCartera: 2, dias: 120 },
      { idBanda: 5, banda: 'mas de 180 (resto)', tipoCartera: 2, dias: 210 },
    ];

    const cuentasPorConcepto: Record<string, { cuenta: string; nombre: string }> = {
      CAPITAL: { cuenta: '1.3.01.10', nombre: 'CARTERA DE CRÉDITOS POR VENCER' },
      INTERES_ORDINARIO: { cuenta: '1.3.01.15', nombre: 'INTERESES POR COBRAR CARTERA' },
      INTERES_MORA: { cuenta: '1.3.01.15', nombre: 'INTERESES POR COBRAR CARTERA' },
      INTERES_VENCIDO: { cuenta: '1.3.02.15', nombre: 'INTERESES POR COBRAR CARTERA VENCIDA' },
      SEGURO_DESGRAVAMEN: { cuenta: '2.5.03.05', nombre: 'SEGUROS POR PAGAR - DESGRAVAMEN' },
      SEGURO_INCENDIO: { cuenta: '2.5.03.10', nombre: 'SEGUROS POR PAGAR - INCENDIO' },
      APORTE: { cuenta: '2.1.05.01', nombre: 'APORTES DE PARTÍCIPES' },
    };

    let idFila = 88000;
    const filas: FilaDistribucionBanda[] = [];
    const idAsiento = 36;

    participes.forEach((p, ip) => {
      // Capital: una fila por banda para que se note el desglose (§ el punto entero de la pantalla).
      bandas.forEach((b, ib) => {
        idFila++;
        const cuenta = cuentasPorConcepto['CAPITAL'];
        filas.push({
          id: idFila, concepto: 'CAPITAL', valor: +(120 + ip * 17 + ib * 6.4).toFixed(2),
          idEntidad: p.idEntidad, participe: p.participe, cedula: p.cedula, codigoAsoprep: p.codigoAsoprep,
          idPrestamo: p.idPrestamo, numeroCuota: 10 + ib, fechaVencimiento: '2026-07-31', fechaAplicacion: '2026-08-31',
          idProducto: 12, producto: 'CREDITO ORDINARIO', idTipoPrestamo: (ip % 2) + 1, idTipoAporte: null,
          tipoCartera: b.tipoCartera, dias: b.dias, idBanda: b.idBanda, banda: b.banda,
          cuentaContable: cuenta.cuenta, nombreCuenta: cuenta.nombre, idAsiento,
        });
      });

      // Interés ordinario e interés de mora: MISMA cuenta contable, distinta descripción — es
      // exactamente el caso que el contrato pide no fusionar.
      (['INTERES_ORDINARIO', 'INTERES_MORA', 'INTERES_VENCIDO'] as const).forEach((concepto, ic) => {
        idFila++;
        const cuenta = cuentasPorConcepto[concepto];
        filas.push({
          id: idFila, concepto, valor: +(8.4 + ip * 2.1 + ic * 1.7).toFixed(2),
          idEntidad: p.idEntidad, participe: p.participe, cedula: p.cedula, codigoAsoprep: p.codigoAsoprep,
          idPrestamo: p.idPrestamo, numeroCuota: 10, fechaVencimiento: '2026-07-31', fechaAplicacion: '2026-08-31',
          idProducto: 12, producto: 'CREDITO ORDINARIO', idTipoPrestamo: (ip % 2) + 1, idTipoAporte: null,
          tipoCartera: 1, dias: 45, idBanda: null, banda: null,
          cuentaContable: cuenta.cuenta, nombreCuenta: cuenta.nombre, idAsiento,
        });
      });

      // Seguros.
      (['SEGURO_DESGRAVAMEN', 'SEGURO_INCENDIO'] as const).forEach((concepto) => {
        idFila++;
        const cuenta = cuentasPorConcepto[concepto];
        filas.push({
          id: idFila, concepto, valor: +(3.2 + ip * 0.6).toFixed(2),
          idEntidad: p.idEntidad, participe: p.participe, cedula: p.cedula, codigoAsoprep: p.codigoAsoprep,
          idPrestamo: p.idPrestamo, numeroCuota: 10, fechaVencimiento: '2026-07-31', fechaAplicacion: '2026-08-31',
          idProducto: 12, producto: 'CREDITO ORDINARIO', idTipoPrestamo: (ip % 2) + 1, idTipoAporte: null,
          tipoCartera: 1, dias: 45, idBanda: null, banda: null,
          cuentaContable: cuenta.cuenta, nombreCuenta: cuenta.nombre, idAsiento,
        });
      });

      // Aporte del excedente, sin préstamo/cuota/banda.
      idFila++;
      const cuentaAporte = cuentasPorConcepto['APORTE'];
      filas.push({
        id: idFila, concepto: 'APORTE', valor: +(45.3 + ip * 9.1).toFixed(2),
        idEntidad: p.idEntidad, participe: p.participe, cedula: p.cedula, codigoAsoprep: p.codigoAsoprep,
        idPrestamo: null, numeroCuota: null, fechaVencimiento: null, fechaAplicacion: '2026-08-31',
        idProducto: null, producto: null, idTipoPrestamo: null, idTipoAporte: 23,
        tipoCartera: null, dias: null, idBanda: null, banda: null,
        cuentaContable: cuentaAporte.cuenta, nombreCuenta: cuentaAporte.nombre, idAsiento,
      });
    });

    this.mockFilasCache = filas;
    return filas;
  }
}
