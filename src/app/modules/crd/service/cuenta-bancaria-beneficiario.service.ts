import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError } from 'rxjs';
import { DatosBusqueda } from '../../../shared/model/datos-busqueda/datos-busqueda';
import { BancoExterno } from '../../tsr/model/banco-externo.model';
import { AdjuntoCertificadoCbbp, CuentaBancariaBeneficiario } from '../model/cuenta-bancaria-beneficiario';
import { Entidad } from '../model/entidad';
import { ServiciosCrd } from './ws-crd';

/**
 * Beneficiarios del partícipe (sepelio fase 2a) — `docs/crd/API-BENEFICIARIOS-PARTICIPE.md`,
 * contrato congelado. Sin mock: el backend se está escribiendo en paralelo contra este mismo
 * contrato (H72 — un mock que se queda vivo más de la cuenta termina tapando desajustes reales).
 */
@Injectable({ providedIn: 'root' })
export class CuentaBancariaBeneficiarioService {

  constructor(private http: HttpClient) {}

  getAll(): Observable<CuentaBancariaBeneficiario[]> {
    return this.http.get<CuentaBancariaBeneficiario[]>(`${ServiciosCrd.RS_CBBP}/getAll`).pipe(catchError(this.handleError));
  }

  getId(id: number): Observable<CuentaBancariaBeneficiario> {
    return this.http.get<CuentaBancariaBeneficiario>(`${ServiciosCrd.RS_CBBP}/getId/${id}`).pipe(catchError(this.handleError));
  }

  selectByCriteria(datos: DatosBusqueda[]): Observable<CuentaBancariaBeneficiario[]> {
    return this.http
      .post<CuentaBancariaBeneficiario[]>(`${ServiciosCrd.RS_CBBP}/selectByCriteria`, datos)
      .pipe(catchError(this.handleError));
  }

  /**
   * §3.1 — `GET /cbbp/porEntidad/{idEntidad}`. Los beneficiarios del partícipe, **activos e
   * inactivos** (la pantalla muestra los inactivos en gris, no los oculta). Ordenados por
   * porcentaje descendente y luego por código — eso lo hace el backend, no hay que reordenar acá.
   *
   * ⚠️ Excepción al `handleError` de este servicio: acá el error NO se propaga, se traga a
   * `[]` (mismo patrón que `CuentaBancariaParticipeService.getByParent()`). Este método se llama
   * dentro del `forkJoin` que carga TODA la ficha del partícipe (entidad, datos del partícipe,
   * cónyuge, referencias, cuentas bancarias); si propagara, un error acá (p. ej. `CRD.CBBP`
   * todavía no existe en la base porque el DDL 233 no corrió) tumbaría el `forkJoin` entero y
   * dejaría la ficha completa sin cargar, no solo la pestaña de beneficiarios.
   */
  porEntidad(idEntidad: number): Observable<CuentaBancariaBeneficiario[]> {
    return this.http
      .get<CuentaBancariaBeneficiario[]>(`${ServiciosCrd.RS_CBBP}/porEntidad/${idEntidad}`)
      .pipe(catchError(() => of([])));
  }

  /**
   * §3.2 — `POST /cbbp/conCertificado`, único camino para crear un beneficiario. Multipart,
   * calcado de `CuentaBancariaParticipeService.addConCertificado()`: los numéricos van como
   * `String` a propósito (un `@FormParam` `Long` vacío o mal formado revienta antes de entrar al
   * método), y el nombre del archivo va con `encodeURIComponent()` — el backend lo decodifica con
   * `URLDecoder`/UTF-8; sin esto un nombre con tilde o eñe llega corrupto.
   *
   * Errores esperados (§3.2/§3.3): 400 (falta el archivo, no es PDF, supera 10 MB, un numérico no
   * parsea, o `porcentaje` fuera de `(0, 100]`), 409 (ya existe un beneficiario con esa
   * identificación PARA ESE PARTÍCIPE), 500 (`TIPO_ADJUNTO_CERTIFICADO_NO_CONFIGURADO` u otro).
   * El `handleError` de este servicio propaga el `mensaje` del backend sin envolverlo, para que el
   * llamador lo muestre tal cual.
   */
  addConCertificado(
    datos: {
      entidad: Entidad;
      nombre: string;
      numeroIdentificacion: string;
      bancoExterno: BancoExterno;
      tipoCuenta: number;
      numeroCuenta: string;
      porcentaje: number;
    },
    certificado: File,
    usuarioRegistro: string
  ): Observable<CuentaBancariaBeneficiario> {
    const formData = new FormData();
    formData.append('archivo', certificado);
    formData.append('archivoNombre', encodeURIComponent(certificado.name));
    formData.append('idEntidad', String(datos.entidad.codigo));
    formData.append('nombre', datos.nombre);
    formData.append('numeroIdentificacion', datos.numeroIdentificacion);
    formData.append('idBancoExterno', String(datos.bancoExterno.codigo));
    formData.append('tipoCuenta', String(datos.tipoCuenta));
    formData.append('numeroCuenta', datos.numeroCuenta);
    formData.append('porcentaje', String(datos.porcentaje));
    formData.append('usuarioRegistro', usuarioRegistro);

    // Sin Content-Type: el navegador pone el suyo con el boundary del multipart.
    return this.http
      .post<CuentaBancariaBeneficiario>(`${ServiciosCrd.RS_CBBP}/conCertificado`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * §3.4 — `PUT /cbbp`. Cambia `porcentaje`, `estado`, `tipoCuenta`, `numeroCuenta`,
   * `bancoExterno`, `nombre` y `numeroIdentificacion`. **No cambia `entidad`** — a qué partícipe
   * pertenece no se puede reasignar. También el camino para "desactivar" (`estado = 2`).
   *
   * ⚠️ Si el `numeroIdentificacion` editado ya existe para OTRO beneficiario del mismo partícipe,
   * responde **409** — mostrar el `mensaje` del cuerpo, no deducirlo del código HTTP.
   */
  update(datos: any): Observable<CuentaBancariaBeneficiario> {
    return this.http.put<CuentaBancariaBeneficiario>(ServiciosCrd.RS_CBBP, datos).pipe(catchError(this.handleError));
  }

  /**
   * Metadatos del certificado bancario de un beneficiario (`GET /cbbp/{id}/certificado`), mismo
   * contrato que `CuentaBancariaParticipeService.obtenerCertificado()`.
   *
   * **404 significa "este beneficiario no tiene certificado" y se traduce a `null` acá — no es
   * un error.** Solo se loguea (sin mostrarlo al usuario) cuando el fallo es otra cosa, para no
   * dejar una falla real de red disfrazada de "sin certificado".
   */
  obtenerCertificado(idBeneficiario: number): Observable<AdjuntoCertificadoCbbp | null> {
    return this.http
      .get<AdjuntoCertificadoCbbp>(`${ServiciosCrd.RS_CBBP}/${idBeneficiario}/certificado`)
      .pipe(
        catchError((e: HttpErrorResponse) => {
          if (e.status !== 404) {
            console.error('Error al consultar el certificado del beneficiario:', e);
          }
          return of(null);
        })
      );
  }

  /**
   * Descarga el PDF del certificado bancario (`GET /cbbp/{id}/certificado/descargar`). Llamar
   * solo cuando `obtenerCertificado()` ya confirmó que el beneficiario tiene certificado.
   */
  descargarCertificado(idBeneficiario: number): Observable<Blob> {
    return this.http.get(`${ServiciosCrd.RS_CBBP}/${idBeneficiario}/certificado/descargar`, {
      responseType: 'blob',
    });
  }

  /**
   * `DELETE /cbbp/{id}` — elimina de verdad el beneficiario, además de poder desactivarlo
   * (decisión del usuario, actualiza al §3.5 original del contrato). El backend borra también el
   * certificado adjunto.
   *
   * ⚠️ Puede responder **409** (p. ej. un beneficiario que ya cobró) — mostrar el `mensaje` del
   * cuerpo, no deducirlo del código HTTP.
   */
  delete(idBeneficiario: number): Observable<void> {
    return this.http.delete<void>(`${ServiciosCrd.RS_CBBP}/${idBeneficiario}`).pipe(catchError(this.handleError));
  }

  /** Propaga `error.error` (el `{ mensaje }` del backend) tal cual, sin envolverlo. */
  private handleError(error: HttpErrorResponse): Observable<never> {
    return throwError(() => error.error);
  }
}
