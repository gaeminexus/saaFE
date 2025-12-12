import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { EstadoTipoAsiento, TipoAsientoGeneral } from '../model/tipo-asiento';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root',
})
export class TipoAsientoGeneralService {
  // Usamos el mismo endpoint real de TipoAsiento (plnt)
  private readonly baseUrl = ServiciosCnt.RS_PLNT;

  // Obtener empresa desde localStorage
  private get EMPRESA_CODIGO(): number {
    return parseInt(localStorage.getItem('idSucursal') || '280', 10);
  }

  // Datos de ejemplo/mock
  private mockData: TipoAsientoGeneral[] = [
    {
      id: 1,
      nombre: 'Asiento de Apertura',
      estado: EstadoTipoAsiento.ACTIVO,
      fechaCreacion: new Date('2024-01-15'),
      fechaUpdate: new Date('2024-01-15'),
      usuarioCreacion: 'admin',
      usuarioUpdate: 'admin',
    },
    {
      id: 2,
      nombre: 'Asiento de Cierre',
      estado: EstadoTipoAsiento.ACTIVO,
      fechaCreacion: new Date('2024-01-15'),
      fechaUpdate: new Date('2024-01-15'),
      usuarioCreacion: 'admin',
      usuarioUpdate: 'admin',
    },
    {
      id: 3,
      nombre: 'Asiento de Ajuste',
      estado: EstadoTipoAsiento.ACTIVO,
      fechaCreacion: new Date('2024-01-16'),
      fechaUpdate: new Date('2024-01-16'),
      usuarioCreacion: 'admin',
      usuarioUpdate: 'admin',
    },
    {
      id: 4,
      nombre: 'Asiento de Corrección',
      estado: EstadoTipoAsiento.ACTIVO,
      fechaCreacion: new Date('2024-01-16'),
      fechaUpdate: new Date('2024-01-16'),
      usuarioCreacion: 'admin',
      usuarioUpdate: 'admin',
    },
    {
      id: 5,
      nombre: 'Asiento de Reclasificación',
      estado: EstadoTipoAsiento.INACTIVO,
      fechaCreacion: new Date('2024-01-17'),
      fechaUpdate: new Date('2024-02-01'),
      usuarioCreacion: 'admin',
      usuarioUpdate: 'admin',
    },
  ];

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de asientos generales
   */
  getAll(): Observable<TipoAsientoGeneral[]> {
    // Consumimos /plnt/getAll y mapeamos a modelo "general" (sistema = 0)
    return this.http.get<any[]>(`${this.baseUrl}/getAll`).pipe(
      map((items) =>
        (items || [])
          .filter(
            (i) =>
              i.empresa?.codigo === this.EMPRESA_CODIGO &&
              (i.sistema === 0 || i.sistema === undefined)
          )
          .map(
            (i) =>
              ({
                id: i.codigo,
                nombre: i.nombre,
                estado: i.estado,
                fechaCreacion: i.fechaIngreso || null,
                fechaUpdate: i.fechaUpdate || null,
                usuarioCreacion: i.usuarioCreacion || '---',
                usuarioUpdate: i.usuarioUpdate || '---',
              } as TipoAsientoGeneral)
          )
      ),
      catchError(() => {
        console.log('[TipoAsientoGeneralService] Usando datos mock');
        return of(this.mockData);
      })
    );
  }

  /**
   * Obtiene un tipo de asiento general por ID
   */
  getById(id: number): Observable<TipoAsientoGeneral | undefined> {
    return this.http.get<any>(`${this.baseUrl}/getId/${id}`).pipe(
      map((i) =>
        i
          ? ({
              id: i.codigo,
              nombre: i.nombre,
              estado: i.estado,
              fechaCreacion: i.fechaIngreso || null,
              fechaUpdate: i.fechaUpdate || null,
              usuarioCreacion: i.usuarioCreacion || '---',
              usuarioUpdate: i.usuarioUpdate || '---',
            } as TipoAsientoGeneral)
          : undefined
      ),
      catchError(() => of(this.mockData.find((item) => item.id === id)))
    );
  }

  /**
   * Crea un nuevo tipo de asiento general
   */
  create(tipoAsiento: Partial<TipoAsientoGeneral>): Observable<TipoAsientoGeneral> {
    // Mapear TipoAsientoGeneral a TipoAsiento con empresa
    const tipoAsientoBackend: any = {
      nombre: tipoAsiento.nombre,
      estado: tipoAsiento.estado,
      empresa: {
        codigo: this.EMPRESA_CODIGO,
      },
      sistema: 0,
      codigoAlterno: 0,
      observacion: '',
      fechaInactivo: null,
    };

    return this.http.post<any>(this.baseUrl, tipoAsientoBackend).pipe(
      map((response) => {
        // Mapear respuesta del backend a TipoAsientoGeneral
        return {
          id: response.codigo,
          nombre: response.nombre,
          estado: response.estado,
          fechaCreacion: response.fechaIngreso || new Date(),
          fechaUpdate: response.fechaUpdate || new Date(),
          usuarioCreacion: response.usuarioCreacion || 'sistema',
          usuarioUpdate: response.usuarioUpdate || 'sistema',
        } as TipoAsientoGeneral;
      }),
      catchError(() => {
        // Simular creación en mock
        const newId = Math.max(...this.mockData.map((t) => t.id)) + 1;
        const newItem: TipoAsientoGeneral = {
          id: newId,
          nombre: tipoAsiento.nombre || '',
          estado: tipoAsiento.estado || EstadoTipoAsiento.ACTIVO,
          fechaCreacion: new Date(),
          fechaUpdate: new Date(),
          usuarioCreacion: 'current-user',
          usuarioUpdate: 'current-user',
        };
        this.mockData.push(newItem);
        return of(newItem);
      })
    );
  }

  /**
   * Actualiza un tipo de asiento general
   */
  update(id: number, tipoAsiento: Partial<TipoAsientoGeneral>): Observable<TipoAsientoGeneral> {
    // Mapear TipoAsientoGeneral a TipoAsiento con empresa
    const tipoAsientoBackend: any = {
      codigo: id,
      nombre: tipoAsiento.nombre,
      estado: tipoAsiento.estado,
      empresa: {
        codigo: this.EMPRESA_CODIGO,
      },
      sistema: 0,
      codigoAlterno: 0,
      observacion: '',
      fechaInactivo: null,
    };

    return this.http.put<any>(`${this.baseUrl}`, tipoAsientoBackend).pipe(
      map((response) => {
        // Mapear respuesta del backend a TipoAsientoGeneral
        return {
          id: response.codigo,
          nombre: response.nombre,
          estado: response.estado,
          fechaCreacion: response.fechaIngreso,
          fechaUpdate: response.fechaUpdate || new Date(),
          usuarioCreacion: response.usuarioCreacion,
          usuarioUpdate: response.usuarioUpdate || 'sistema',
        } as TipoAsientoGeneral;
      }),
      catchError(() => {
        // Simular actualización en mock
        const index = this.mockData.findIndex((item) => item.id === id);
        if (index !== -1) {
          this.mockData[index] = {
            ...this.mockData[index],
            ...tipoAsiento,
            fechaUpdate: new Date(),
            usuarioUpdate: 'current-user',
          };
          return of(this.mockData[index]);
        }
        throw new Error('Tipo de asiento no encontrado');
      })
    );
  }

  /**
   * Elimina un tipo de asiento general
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/${id}`).pipe(
      catchError(() => {
        // Simular eliminación en mock
        const index = this.mockData.findIndex((item) => item.id === id);
        if (index !== -1) {
          this.mockData.splice(index, 1);
          return of(true);
        }
        return of(false);
      })
    );
  }

  /**
   * Cambia el estado de un tipo de asiento general
   */
  cambiarEstado(id: number, estado: EstadoTipoAsiento): Observable<boolean> {
    return this.update(id, { estado }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }
}
