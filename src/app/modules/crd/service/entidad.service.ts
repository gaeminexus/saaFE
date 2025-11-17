import { HttpHeaders, HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, catchError, of, throwError, tap, map, switchMap } from 'rxjs';
import { Entidad } from '../model/entidad';
import { Filial } from '../model/filial';
import { TipoHidrocarburifica } from '../model/tipo-hidrocarburifica';
import { TipoIdentificacion } from '../model/tipo-identificacion';
import { TipoVivienda } from '../model/tipo-vivienda';
import { ServiciosCrd } from './ws-crd';

@Injectable({
  providedIn: 'root'
})
export class EntidadService {
  httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient
  ) { }

  getAll(): Observable<Entidad[]> {
    const wsGetAll = '/getAll';
    const proxyUrl = `${ServiciosCrd.RS_ENTD}${wsGetAll}`;
    const directUrl = `http://127.0.0.1:8080/saa-backend/rest/entd${wsGetAll}`;
    console.log('Llamando URL:', proxyUrl);

    // 1) Intento vía proxy /api
    return this.http.get(proxyUrl, { responseType: 'text' }).pipe(
      tap(response => this.logTextResponse('Proxy', response)),
      switchMap(textResponse => {
        if (this.isHtml(textResponse)) {
          console.warn('⚠️ Proxy devolvió HTML. Reintentando directo:', directUrl);
          // 2) Reintento directo al backend
          return this.http.get(directUrl, { responseType: 'text' }).pipe(
            tap(resp => this.logTextResponse('Directo', resp)),
            map(resp => this.parseEntidadesFromText(resp))
          );
        }
        return of(this.parseEntidadesFromText(textResponse));
      }),
      catchError(error => {
        console.error('Error en getAll:', error);
        if (error && error.status === 200) {
          console.warn('Status 200 pero error de parsing. Backend probablemente devuelve respuesta vacía');
          return of([]);
        }
        if (error?.error && Array.isArray(error.error)) {
          console.log('Datos encontrados en error.error:', error.error);
          return of(error.error);
        }
        return of([]);
      })
    );
  }

  private isHtml(text: string): boolean {
    if (!text) return false;
    const t = text.trim().toLowerCase();
    return t.startsWith('<!doctype html') || t.startsWith('<html');
  }

  private logTextResponse(origen: 'Proxy' | 'Directo', response: string): void {
    console.log(`${origen} -> Respuesta como texto (primeros 500 chars):`, response.substring(0, 500));
    console.log(`${origen} -> Tipo de respuesta texto:`, typeof response);
    console.log(`${origen} -> Longitud respuesta:`, response?.length ?? 0);
    console.log(`${origen} -> ¿Parece JSON?`, !!response && (response.trim().startsWith('[') || response.trim().startsWith('{')));
  }

  private parseEntidadesFromText(textResponse: string): Entidad[] {
    // Detectar si es HTML (backend no disponible)
    if (this.isHtml(textResponse)) {
      console.error('⚠️ BACKEND NO DISPONIBLE: El servidor devolvió HTML en lugar de JSON');
      console.log('🔧 Usando datos mock temporales para desarrollo');
      return this.getMockEntidades();
    }

    try {
      if (!textResponse || textResponse.trim() === '') {
        console.warn('Respuesta vacía del backend, usando datos mock');
        return this.getMockEntidades();
      }
      const parsed = JSON.parse(textResponse);
      console.log('JSON parseado exitosamente. Total elementos:', Array.isArray(parsed) ? parsed.length : 'No es array');
      if (Array.isArray(parsed)) {
        console.log('✅ Backend funcionando - Total entidades recibidas:', parsed.length);
        return parsed as Entidad[];
      } else {
        console.warn('Respuesta no es un array:', parsed);
        return this.getMockEntidades();
      }
    } catch (parseError) {
      console.error('Error parseando JSON, usando datos mock:', parseError);
      return this.getMockEntidades();
    }
  }

  getById(id: string): Observable<Entidad | null> {
    const wsGetById = '/getId/';
    const url = `${ServiciosCrd.RS_ENTD}${wsGetById}${id}`;
    return this.http.get<Entidad>(url).pipe(
      catchError(this.handleError)
    );
  }

  /** POST: add a new Entidad */
  add(datos: any): Observable<Entidad | null> {
    return this.http.post<Entidad>(ServiciosCrd.RS_ENTD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** PUT: update an existing Entidad */
  update(datos: any): Observable<Entidad | null> {
    return this.http.put<Entidad>(ServiciosCrd.RS_ENTD, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  selectByCriteria(datos: any): Observable<Entidad[] | null> {
    const wsSelect = '/selectByCriteria/';
    const url = `${ServiciosCrd.RS_ENTD}${wsSelect}`;
    return this.http.post<Entidad[]>(url, datos, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  /** DELETE: delete an Entidad */
  delete(id: any): Observable<Entidad | null> {
    const wsDelete = '/' + id;
    const url = `${ServiciosCrd.RS_ENTD}${wsDelete}`;
    return this.http.delete<Entidad>(url, this.httpOptions).pipe(
      catchError(this.handleError)
    );
  }

  // tslint:disable-next-line: typedef
  private handleError(error: HttpErrorResponse): Observable<null> {
    if (+error.status === 200) {
      return of(null);
    } else {
      return throwError(() => error.error);
    }
  }

  /**
   * Genera datos mock para desarrollo cuando el backend no está disponible
   */
  private getMockEntidades(): Entidad[] {
    const currentDate = new Date();

    return [
      {
        codigo: 1001,
        filial: null as any,  // Mock: Se mantiene null para simplicidad
        tipoHidrocarburifica: null as any,
        TipoIdentificacion: null as any,
        numeroIdentificacion: '1791234567001',
        razonSocial: 'CORPORACIÓN EJEMPLO S.A.',
        numeroCargasFamiliares: 3,
        nombreComercial: 'Corp Ejemplo',
        fechaNacimiento: new Date('1985-03-15'),
        TipoVivienda: null as any,
        sectorPublico: 0,
        correoPersonal: 'contacto@ejemplo.com',
        correoInstitucional: 'admin@ejemplo.com',
        telefono: '02-2345678',
        tieneCorreoPersonal: 1,
        tieneCorreoTrabajo: 1,
        tieneTelefono: 1,
        migrado: 0,
        movil: '0987654321',
        idCiudad: 'UIO',
        porcentajeSimilitud: 100,
        busqueda: 'corporacion ejemplo ruc 1791234567001',
        ipIngreso: '192.168.1.100',
        usuarioIngreso: 'admin',
        fechaIngreso: new Date('2024-01-15T09:30:00'),
        ipModificacion: '192.168.1.100',
        usuarioModificacion: 'admin',
        fechaModificacion: currentDate,
        idEstado: 1,
        urlFotoLogo: 'https://via.placeholder.com/150x150/4f46e5/ffffff?text=CE'
      },
      {
        codigo: 1002,
        filial: null as any,
        tipoHidrocarburifica: null as any,
        TipoIdentificacion: null as any,
        numeroIdentificacion: '0992876543001',
        razonSocial: 'EMPRESA DEMO LTDA.',
        numeroCargasFamiliares: 2,
        nombreComercial: 'Demo Enterprise',
        fechaNacimiento: new Date('1990-07-22'),
        TipoVivienda: null as any,
        sectorPublico: 0,
        correoPersonal: 'info@demo.com',
        correoInstitucional: 'empresa@demo.com',
        telefono: '04-3456789',
        tieneCorreoPersonal: 1,
        tieneCorreoTrabajo: 1,
        tieneTelefono: 1,
        migrado: 0,
        movil: '0976543210',
        idCiudad: 'GYE',
        porcentajeSimilitud: 95,
        busqueda: 'empresa demo ltda guayaquil',
        ipIngreso: '192.168.1.101',
        usuarioIngreso: 'system',
        fechaIngreso: new Date('2024-02-20T14:15:00'),
        ipModificacion: '192.168.1.101',
        usuarioModificacion: 'system',
        fechaModificacion: currentDate,
        idEstado: 1,
        urlFotoLogo: 'https://via.placeholder.com/150x150/059669/ffffff?text=DE'
      },
      {
        codigo: 1003,
        filial: null as any,
        tipoHidrocarburifica: null as any,
        TipoIdentificacion: null as any,
        numeroIdentificacion: '0102334455',
        razonSocial: 'SERVICIOS INTEGRALES CIA.',
        numeroCargasFamiliares: 1,
        nombreComercial: 'Servicios Int.',
        fechaNacimiento: new Date('1988-11-10'),
        TipoVivienda: null as any,
        sectorPublico: 1,
        correoPersonal: 'servicios@integral.com',
        correoInstitucional: 'admin@integral.com',
        telefono: '07-4567890',
        tieneCorreoPersonal: 1,
        tieneCorreoTrabajo: 1,
        tieneTelefono: 1,
        migrado: 0,
        movil: '0965432109',
        idCiudad: 'CUE',
        porcentajeSimilitud: 90,
        busqueda: 'servicios integrales cuenca sector publico',
        ipIngreso: '192.168.1.102',
        usuarioIngreso: 'user1',
        fechaIngreso: new Date('2024-03-10T11:20:00'),
        ipModificacion: '192.168.1.102',
        usuarioModificacion: 'user1',
        fechaModificacion: currentDate,
        idEstado: 1,
        urlFotoLogo: 'https://via.placeholder.com/150x150/dc2626/ffffff?text=SI'
      },
      {
        codigo: 1004,
        filial: null as any,
        tipoHidrocarburifica: null as any,
        TipoIdentificacion: null as any,
        numeroIdentificacion: 'EC1234567',
        razonSocial: 'COMERCIAL ANDINA S.A.',
        numeroCargasFamiliares: 4,
        nombreComercial: 'Andina Comercial',
        fechaNacimiento: new Date('1982-05-18'),
        TipoVivienda: null as any,
        sectorPublico: 0,
        correoPersonal: 'info@andina.com',
        correoInstitucional: 'gerencia@andina.com',
        telefono: '02-5678901',
        tieneCorreoPersonal: 1,
        tieneCorreoTrabajo: 1,
        tieneTelefono: 1,
        migrado: 0,
        movil: '0998765432',
        idCiudad: 'UIO',
        porcentajeSimilitud: 88,
        busqueda: 'comercial andina pasaporte extranjero',
        ipIngreso: '192.168.1.103',
        usuarioIngreso: 'admin',
        fechaIngreso: new Date('2024-04-05T16:45:00'),
        ipModificacion: '192.168.1.103',
        usuarioModificacion: 'admin',
        fechaModificacion: currentDate,
        idEstado: 1,
        urlFotoLogo: 'https://via.placeholder.com/150x150/7c3aed/ffffff?text=CA'
      },
      {
        codigo: 1005,
        filial: null as any,
        tipoHidrocarburifica: null as any,
        TipoIdentificacion: null as any,
        numeroIdentificacion: '0923456789',
        razonSocial: 'DISTRIBUIDORA COSTA S.A.',
        numeroCargasFamiliares: 0,
        nombreComercial: 'Distri Costa',
        fechaNacimiento: new Date('1995-12-03'),
        TipoVivienda: null as any,
        sectorPublico: 0,
        correoPersonal: 'contacto@costa.com',
        correoInstitucional: 'ventas@costa.com',
        telefono: '04-6789012',
        tieneCorreoPersonal: 1,
        tieneCorreoTrabajo: 1,
        tieneTelefono: 1,
        migrado: 1,
        movil: '0987123456',
        idCiudad: 'GYE',
        porcentajeSimilitud: 92,
        busqueda: 'distribuidora costa guayaquil migrado',
        ipIngreso: '192.168.1.104',
        usuarioIngreso: 'system',
        fechaIngreso: new Date('2024-05-12T08:30:00'),
        ipModificacion: '192.168.1.104',
        usuarioModificacion: 'system',
        fechaModificacion: currentDate,
        idEstado: 1,
        urlFotoLogo: 'https://via.placeholder.com/150x150/ea580c/ffffff?text=DC'
      },
      {
        codigo: 1006,
        filial: null as any,
        tipoHidrocarburifica: null as any,
        TipoIdentificacion: null as any,
        numeroIdentificacion: '1715987654001',
        razonSocial: 'TECNOLOGÍA AVANZADA CIA. LTDA.',
        numeroCargasFamiliares: 2,
        nombreComercial: 'TechAdvanced',
        fechaNacimiento: new Date('1992-09-25'),
        TipoVivienda: null as any,
        sectorPublico: 0,
        correoPersonal: 'tech@advanced.com',
        correoInstitucional: 'contact@techadvanced.com',
        telefono: '02-7890123',
        tieneCorreoPersonal: 1,
        tieneCorreoTrabajo: 1,
        tieneTelefono: 1,
        migrado: 0,
        movil: '0956789012',
        idCiudad: 'UIO',
        porcentajeSimilitud: 85,
        busqueda: 'tecnologia avanzada software desarrollo',
        ipIngreso: '192.168.1.105',
        usuarioIngreso: 'admin',
        fechaIngreso: new Date('2024-06-18T13:22:00'),
        ipModificacion: '192.168.1.105',
        usuarioModificacion: 'user2',
        fechaModificacion: currentDate,
        idEstado: 1,
        urlFotoLogo: 'https://via.placeholder.com/150x150/10b981/ffffff?text=TA'
      }
    ];
  }
}
