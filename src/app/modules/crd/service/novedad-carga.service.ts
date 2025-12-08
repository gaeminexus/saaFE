import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { NovedadCarga, NovedadAgrupada, ParticipeSimilar } from '../model/novedad-carga';
import { ParticipeXCargaArchivo } from '../model/participe-x-carga-archivo';
import { environment } from '../../../../environments/environment';

/**
 * Servicio para gestión de novedades de carga de archivos
 */
@Injectable({ providedIn: 'root' })
export class NovedadCargaService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;





  /**
   * Agrupar registros por tipo de novedad
   */
  agruparPorNovedad(
    registros: ParticipeXCargaArchivo[],
    catalogo: NovedadCarga[]
  ): NovedadAgrupada[] {
    const grupos = new Map<number, ParticipeXCargaArchivo[]>();

    // Agrupar registros por novedadesCarga
    registros.forEach(reg => {
      const existente = grupos.get(reg.novedadesCarga) || [];
      grupos.set(reg.novedadesCarga, [...existente, reg]);
    });

    // Convertir a array de NovedadAgrupada
    return Array.from(grupos.entries())
      .map(([codigo, regs]) => {
        const novedad = catalogo.find(n => n.codigo === codigo);

        // Si no existe en catálogo, crear novedad genérica
        if (!novedad) {
          return {
            novedad: {
              codigo,
              descripcion: `Novedad ${codigo}`,
              tipo: (codigo <= 3 ? 'PARTICIPE' : 'DESCUENTO') as 'PARTICIPE' | 'DESCUENTO',
              severidad: 'warning' as 'warning',
              icono: 'help',
              colorChip: 'accent'
            },
            registros: regs,
            total: regs.length
          };
        }

        return {
          novedad,
          registros: regs,
          total: regs.length
        };
      })
      .sort((a, b) => a.novedad.codigo - b.novedad.codigo); // Ordenar por código
  }

  /**
   * Buscar partícipes similares para resolver Novedad 1
   * TODO: Implementar endpoint en backend
   */
  buscarParticipesSimilares(
    nombre: string,
    codigoPetro: number
  ): Observable<ParticipeSimilar[]> {
    const url = `${this.apiUrl}/participes/similares`;
    const params = { nombre, codigoPetro: codigoPetro.toString() };

    // Por ahora retornar mock data hasta que backend implemente
    return of([
      {
        participe: {
          codigo: 1001,
          nombre: nombre.toUpperCase(),
          codigoPetro: codigoPetro + 1
        },
        similitud: 85,
        coincidencias: ['Nombre muy similar', 'Código Petro cercano']
      },
      {
        participe: {
          codigo: 1002,
          nombre: nombre.substring(0, 10) + '...',
          codigoPetro: codigoPetro
        },
        similitud: 72,
        coincidencias: ['Código Petro exacto']
      }
    ]);

    // Implementación real (comentada hasta que backend esté listo):
    // return this.http.get<ParticipeSimilar[]>(url, { params });
  }

  /**
   * Vincular partícipe a registro de carga
   * TODO: Implementar endpoint en backend
   */
  vincularParticipe(
    codigoRegistro: number,
    codigoParticipe: number
  ): Observable<any> {
    const url = `${this.apiUrl}/participes-carga/vincular`;
    const body = { codigoRegistro, codigoParticipe };

    // Mock response
    return of({ success: true, message: 'Partícipe vinculado correctamente' });

    // Implementación real:
    // return this.http.post(url, body);
  }

  /**
   * Mapear código de novedad a severidad
   */
  private mapearSeveridad(codigo: number): 'success' | 'warning' | 'error' {
    if (codigo === 0) return 'success';
    if (codigo <= 2) return 'warning';
    return 'error';
  }

  /**
   * Mapear código de novedad a icono Material
   */
  private mapearIcono(codigo: number): string {
    const iconos: Record<number, string> = {
      0: 'check_circle',
      1: 'person_search',
      2: 'content_copy',
      3: 'error',
      4: 'payments',
      5: 'account_balance',
      6: 'receipt',
      7: 'warning',
      8: 'priority_high'
    };
    return iconos[codigo] || 'help';
  }

  /**
   * Mapear código de novedad a color de chip
   */
  private mapearColor(codigo: number): string {
    if (codigo === 0) return 'primary';
    if (codigo <= 2) return 'accent';
    return 'warn';
  }
}
