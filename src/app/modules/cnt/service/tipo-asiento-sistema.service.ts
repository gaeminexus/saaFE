import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { TipoAsientoSistema, EstadoTipoAsiento } from '../model/tipo-asiento';
import { ServiciosCnt } from './ws-cnt';

@Injectable({
  providedIn: 'root'
})
export class TipoAsientoSistemaService {
  // Reutilizamos el endpoint real de TipoAsiento (plnt)
  private readonly baseUrl = ServiciosCnt.RS_PLNT;
  private readonly EMPRESA_CODIGO = 280;

  // Datos de ejemplo/mock
  private mockData: TipoAsientoSistema[] = [
    {
      id: 1,
      nombre: 'Depreciación Automática',
      codigoAlterno: 'DEP-AUTO',
      estado: EstadoTipoAsiento.ACTIVO,
      fechaCreacion: new Date('2024-01-15'),
      fechaUpdate: new Date('2024-01-15'),
      usuarioCreacion: 'sistema',
      usuarioUpdate: 'sistema'
    },
    {
      id: 2,
      nombre: 'Provisión de Nomina',
      codigoAlterno: 'PROV-NOM',
      estado: EstadoTipoAsiento.ACTIVO,
      fechaCreacion: new Date('2024-01-15'),
      fechaUpdate: new Date('2024-01-15'),
      usuarioCreacion: 'sistema',
      usuarioUpdate: 'sistema'
    },
    {
      id: 3,
      nombre: 'Amortización de Diferidos',
      codigoAlterno: 'AMOR-DIF',
      estado: EstadoTipoAsiento.ACTIVO,
      fechaCreacion: new Date('2024-01-16'),
      fechaUpdate: new Date('2024-01-16'),
      usuarioCreacion: 'sistema',
      usuarioUpdate: 'sistema'
    },
    {
      id: 4,
      nombre: 'Provisión de Intereses',
      codigoAlterno: 'PROV-INT',
      estado: EstadoTipoAsiento.ACTIVO,
      fechaCreacion: new Date('2024-01-16'),
      fechaUpdate: new Date('2024-01-16'),
      usuarioCreacion: 'sistema',
      usuarioUpdate: 'sistema'
    },
    {
      id: 5,
      nombre: 'Cierre Automático de Periodo',
      codigoAlterno: 'CIE-AUTO',
      estado: EstadoTipoAsiento.INACTIVO,
      fechaCreacion: new Date('2024-01-17'),
      fechaUpdate: new Date('2024-02-01'),
      usuarioCreacion: 'sistema',
      usuarioUpdate: 'admin'
    },
    {
      id: 6,
      nombre: 'Recalculo de Saldos',
      codigoAlterno: 'REC-SALD',
      estado: EstadoTipoAsiento.ACTIVO,
      fechaCreacion: new Date('2024-01-18'),
      fechaUpdate: new Date('2024-01-18'),
      usuarioCreacion: 'sistema',
      usuarioUpdate: 'sistema'
    }
  ];

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los tipos de asientos del sistema
   */
  getAll(): Observable<TipoAsientoSistema[]> {
    return this.http.get<any[]>(`${this.baseUrl}/getAll`)
      .pipe(
        map(items => (items || [])
          .filter(i => (i.empresa?.codigo === this.EMPRESA_CODIGO) && i.sistema === 1)
          .map(i => ({
            id: i.codigo,
            nombre: i.nombre,
            codigoAlterno: i.codigoAlterno || '',
            estado: i.estado,
            fechaCreacion: i.fechaIngreso || null,
            fechaUpdate: i.fechaUpdate || null,
            usuarioCreacion: i.usuarioCreacion || 'sistema',
            usuarioUpdate: i.usuarioUpdate || 'sistema'
          }) as TipoAsientoSistema)
        ),
        catchError(() => {
          console.log('[TipoAsientoSistemaService] Usando datos mock');
          return of(this.mockData);
        })
      );
  }

  /**
   * Obtiene un tipo de asiento del sistema por ID
   */
  getById(id: number): Observable<TipoAsientoSistema | undefined> {
    return this.http.get<any>(`${this.baseUrl}/getId/${id}`)
      .pipe(
        map(i => i ? ({
          id: i.codigo,
          nombre: i.nombre,
          codigoAlterno: i.codigoAlterno || '',
          estado: i.estado,
          fechaCreacion: i.fechaIngreso || null,
          fechaUpdate: i.fechaUpdate || null,
          usuarioCreacion: i.usuarioCreacion || 'sistema',
          usuarioUpdate: i.usuarioUpdate || 'sistema'
        }) as TipoAsientoSistema : undefined),
        catchError(() => of(this.mockData.find(item => item.id === id)))
      );
  }

  /**
   * Obtiene un tipo de asiento del sistema por código alterno
   */
  getByCodigoAlterno(codigoAlterno: string): Observable<TipoAsientoSistema | undefined> {
    // No existe endpoint específico; resolvemos en cliente sobre getAll
    return this.getAll().pipe(
      map(list => list.find(i => i.codigoAlterno === codigoAlterno)),
      catchError(() => of(this.mockData.find(item => item.codigoAlterno === codigoAlterno)))
    );
  }

  /**
   * Crea un nuevo tipo de asiento del sistema
   */
  create(tipoAsiento: Partial<TipoAsientoSistema>): Observable<TipoAsientoSistema> {
    return this.http.post<TipoAsientoSistema>(this.baseUrl, tipoAsiento)
      .pipe(
        catchError(() => {
          // Simular creación en mock
          const newId = Math.max(...this.mockData.map(t => t.id)) + 1;
          const newItem: TipoAsientoSistema = {
            id: newId,
            nombre: tipoAsiento.nombre || '',
            codigoAlterno: tipoAsiento.codigoAlterno || '',
            estado: tipoAsiento.estado || EstadoTipoAsiento.ACTIVO,
            fechaCreacion: new Date(),
            fechaUpdate: new Date(),
            usuarioCreacion: 'sistema',
            usuarioUpdate: 'sistema'
          };
          this.mockData.push(newItem);
          return of(newItem);
        })
      );
  }

  /**
   * Actualiza un tipo de asiento del sistema
   */
  update(id: number, tipoAsiento: Partial<TipoAsientoSistema>): Observable<TipoAsientoSistema> {
    return this.http.put<TipoAsientoSistema>(`${this.baseUrl}`, tipoAsiento)
      .pipe(
        catchError(() => {
          // Simular actualización en mock
          const index = this.mockData.findIndex(item => item.id === id);
          if (index !== -1) {
            this.mockData[index] = {
              ...this.mockData[index],
              ...tipoAsiento,
              fechaUpdate: new Date(),
              usuarioUpdate: 'sistema'
            };
            return of(this.mockData[index]);
          }
          throw new Error('Tipo de asiento no encontrado');
        })
      );
  }

  /**
   * Elimina un tipo de asiento del sistema
   */
  delete(id: number): Observable<boolean> {
    return this.http.delete<boolean>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(() => {
          // Simular eliminación en mock
          const index = this.mockData.findIndex(item => item.id === id);
          if (index !== -1) {
            this.mockData.splice(index, 1);
            return of(true);
          }
          return of(false);
        })
      );
  }

  /**
   * Cambia el estado de un tipo de asiento del sistema
   */
  cambiarEstado(id: number, estado: EstadoTipoAsiento): Observable<boolean> {
    return this.update(id, { estado }).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  /**
   * Valida que un código alterno no exista
   */
  validarCodigoAlterno(codigoAlterno: string, excludeId?: number): Observable<boolean> {
    // Resolver validación en cliente
    return this.getAll().pipe(
      map(list => {
        const exists = list.some(item => item.codigoAlterno === codigoAlterno && (excludeId === undefined || item.id !== excludeId));
        return !exists;
      }),
      catchError(() => {
        const exists = this.mockData.some(item => item.codigoAlterno === codigoAlterno && (excludeId === undefined || item.id !== excludeId));
        return of(!exists);
      })
    );
  }
}
