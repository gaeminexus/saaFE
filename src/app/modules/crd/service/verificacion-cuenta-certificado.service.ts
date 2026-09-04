import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { CuentaBancariaParticipe } from '../model/cuenta-bancaria-participe';
import { CuentaBancariaParticipeService } from './cuenta-bancaria-participe.service';

const ESTADO_CNBP_ACTIVO = 1;

export interface VerificacionCuentaCertificado {
  /** `true` = existe EXACTAMENTE una cuenta bancaria activa (mismo criterio que `unicaCuentaActiva` del backend). */
  tieneCuenta: boolean;
  cuenta: CuentaBancariaParticipe | null;
  /** `null` = no se pudo verificar (ver `avisoCertificados` del resultado); NO se debe tratar como bloqueo. */
  tieneCertificado: boolean | null;
}

export interface ResultadoVerificacionCuentasCertificados {
  porEntidad: Map<number, VerificacionCuentaCertificado>;
  /**
   * No nulo cuando HAY jubilados con cuenta activa pero NINGUNO tiene certificado: es más
   * probable que falte cargar la fila `'CERTIFICADO BANCARIO'` en `CRD.TPDJ` (de la que depende
   * `resolverTipoCertificadoBancario()` en el backend) que que a todos les falte el documento.
   * Mostrar este aviso; NUNCA degradarlo a un simple "Falta" por fila.
   */
  avisoCertificados: string | null;
  /** `true` si no se pudo consultar las cuentas bancarias activas (falla de red/servidor). */
  errorCuentas: boolean;
}

/**
 * Los dos vistos de un jubilado — cuenta bancaria activa y certificado — compartidos entre el
 * padrón (`proceso-pago-jubilados`, sección 3) y el prevuelo de la corrida mensual
 * (`corrida-mes-pago-jubilados`). Contrato: docs/crd/API-PAGO-PENSION-COMPLEMENTARIA.md. Diseño:
 * docs/crd/DISENO-PANTALLA-PAGO-JUBILADOS.md §4.
 *
 * ⛔ NO duplicar esta lógica en cada pantalla: con 191 jubilados, duplicada hace 382 llamadas de
 * certificado en vez de 191, y las dos vistas se desincronizan con el tiempo.
 *
 * "✔ certificado" se verifica con `CuentaBancariaParticipeService.obtenerCertificado()` (GET
 * /cnbp/{id}/certificado — recibe el código de la CUENTA, `CNBPCDGO`, no el del partícipe) en vez
 * de repetir el cruce crudo TPDJ→CNBP→ADJN del §4 del diseño: reusa un endpoint ya existente y ya
 * usado en `entidad-participe-info`, así que si mañana cambia la regla del certificado, cambia en
 * un solo lugar.
 */
@Injectable({ providedIn: 'root' })
export class VerificacionCuentaCertificadoService {
  private cuentaBancariaService = inject(CuentaBancariaParticipeService);

  /** `codigosEntidad`: los partícipes a verificar. Solo se piden certificados de ESE grupo. */
  verificar(codigosEntidad: number[]): Observable<ResultadoVerificacionCuentasCertificados> {
    const criterioEstadoCnbp = new DatosBusqueda();
    criterioEstadoCnbp.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'estado',
      String(ESTADO_CNBP_ACTIVO),
      TipoComandosBusqueda.IGUAL,
    );

    return this.cuentaBancariaService.selectByCriteria([criterioEstadoCnbp]).pipe(
      catchError(() => of(null as CuentaBancariaParticipe[] | null)),
      switchMap((cuentas) => this.completarConCertificados(codigosEntidad, cuentas)),
    );
  }

  private completarConCertificados(
    codigosEntidad: number[],
    cuentas: CuentaBancariaParticipe[] | null,
  ): Observable<ResultadoVerificacionCuentasCertificados> {
    const codigosSet = new Set(codigosEntidad);
    const cuentasPorEntidad = new Map<number, CuentaBancariaParticipe[]>();
    for (const c of cuentas ?? []) {
      if (Number(c.estado) !== ESTADO_CNBP_ACTIVO || c.entidad?.codigo == null) continue;
      if (!codigosSet.has(c.entidad.codigo)) continue;
      const lista = cuentasPorEntidad.get(c.entidad.codigo) ?? [];
      lista.push(c);
      cuentasPorEntidad.set(c.entidad.codigo, lista);
    }

    const entidadesConUnaCuenta: { codigo: number; cuenta: CuentaBancariaParticipe }[] = [];
    cuentasPorEntidad.forEach((lista, codigo) => {
      if (lista.length === 1) entidadesConUnaCuenta.push({ codigo, cuenta: lista[0] });
    });

    const certificados$ = entidadesConUnaCuenta.length
      ? forkJoin(
          entidadesConUnaCuenta.map((e) =>
            this.cuentaBancariaService.obtenerCertificado(e.cuenta.codigo).pipe(catchError(() => of(null))),
          ),
        )
      : of([] as (unknown | null)[]);

    return certificados$.pipe(
      map((certificados) => {
        const totalConCuenta = entidadesConUnaCuenta.length;
        const totalConCertificado = certificados.filter((c) => c != null).length;
        const noSePudoVerificarCertificados = totalConCuenta > 0 && totalConCertificado === 0;

        const certificadoPorEntidad = new Map<number, boolean>();
        entidadesConUnaCuenta.forEach((e, i) => certificadoPorEntidad.set(e.codigo, certificados[i] != null));

        const porEntidad = new Map<number, VerificacionCuentaCertificado>();
        codigosEntidad.forEach((codigo) => {
          const lista = cuentasPorEntidad.get(codigo) ?? [];
          const tieneCuenta = lista.length === 1;
          let tieneCertificado: boolean | null = null;
          if (tieneCuenta) {
            tieneCertificado = noSePudoVerificarCertificados ? null : (certificadoPorEntidad.get(codigo) ?? false);
          }
          porEntidad.set(codigo, { tieneCuenta, cuenta: tieneCuenta ? lista[0] : null, tieneCertificado });
        });

        return {
          porEntidad,
          avisoCertificados: noSePudoVerificarCertificados
            ? 'No se encontró certificado bancario en NINGÚN jubilado con cuenta activa. Es más probable que ' +
              'falte cargar el catálogo "CERTIFICADO BANCARIO" en este ambiente que no que a todos les falte el ' +
              'documento. No se bloquea por certificado hasta poder verificarlo — revise con el equipo técnico.'
            : null,
          errorCuentas: cuentas == null,
        };
      }),
    );
  }
}
