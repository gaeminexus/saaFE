import { Injectable } from '@angular/core';

/**
 * Servicio de utilidades compartidas para Centro de Costo
 * Contiene funciones de cálculo, formateo y validación reutilizables
 */
@Injectable({
  providedIn: 'root',
})
export class CentroCostoUtilsService {
  /**
   * Formatea una fecha de forma segura para mostrar en UI
   * @param fecha - Fecha en formato string, Date o null/undefined
   * @returns String formateado en formato DD/MM/YYYY o mensaje de error
   */
  formatFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return '-';

    try {
      const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
      // Remover zona horaria problemática
      const fechaLimpia = fechaStr.split('[')[0].replace('Z', '');
      const fechaObj = new Date(fechaLimpia);

      if (isNaN(fechaObj.getTime())) return '-';

      return fechaObj.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch (err) {
      console.error('Error formateando fecha:', err);
      return '-';
    }
  }

  /**
   * Calcula el nivel jerárquico basándose en el código del centro
   * @param codigoStr - Código jerárquico (ej: "1", "1.1", "1.1.2")
   * @returns Nivel del centro (1 para "1", 2 para "1.1", etc.)
   */
  calculateLevel(codigoStr: string): number {
    if (!codigoStr) return 1;

    const dots = (codigoStr.match(/\./g) || []).length;
    return dots + 1;
  }

  /**
   * Convierte un código jerárquico a formato ordenable con padding
   * @param codigo - Código del centro (ej: "1", "1.1", "1.1.2")
   * @returns String con padding (ej: "0001", "0001.0001", "0001.0001.0002")
   */
  getCodigoForSorting(codigo: string): string {
    if (!codigo) return '0000';

    const parts = codigo.split('.').filter((p) => p.length > 0);
    const paddedParts = parts.map((part) => {
      const numPart = parseInt(part.trim(), 10) || 0;
      return numPart.toString().padStart(4, '0');
    });

    return paddedParts.join('.');
  }

  /**
   * Ordena dos códigos jerárquicos
   * @param a - Primer código
   * @param b - Segundo código
   * @returns Resultado de comparación para sort
   */
  sortCodigos(a: string, b: string): number {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;

    const aParts = a
      .split('.')
      .filter((p) => p.length > 0)
      .map((p) => p.padStart(4, '0'));
    const bParts = b
      .split('.')
      .filter((p) => p.length > 0)
      .map((p) => p.padStart(4, '0'));

    const max = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < max; i++) {
      const av = aParts[i] || '0000';
      const bv = bParts[i] || '0000';
      if (av !== bv) return av.localeCompare(bv);
    }
    return 0;
  }

  /**
   * Genera el siguiente código disponible manteniendo secuencia secuencial
   * Para nivel 1: busca el primer número libre en secuencia (1,2,3...) o añade al final
   * Para niveles inferiores: genera código hijo basado en el padre
   * @param parentCodigo - Código del padre (opcional, null para nivel 1)
   * @param existingCodigos - Array de códigos jerárquicos existentes
   * @returns Nuevo código sugerido siguiendo secuencia secuencial
   */
  generateNuevoCodigo(parentCodigo: string | null, existingCodigos: string[]): string {
    if (!parentCodigo) {
      // Generar código raíz manteniendo secuencia secuencial
      const rootNums = existingCodigos
        .filter((c) => !c.includes('.'))
        .map((c) => parseInt(c, 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => a - b);

      if (rootNums.length === 0) {
        return '1';
      }

      // Buscar el primer hueco en la secuencia o agregar al final
      for (let i = 1; i <= rootNums.length + 1; i++) {
        if (!rootNums.includes(i)) {
          return String(i);
        }
      }

      // Si no hay huecos, agregar después del máximo
      const next = Math.max(...rootNums) + 1;
      return String(next);
    }

    // Generar código hijo
    const children = existingCodigos
      .filter((c) => c.startsWith(parentCodigo + '.'))
      .filter((c) => {
        // Solo hijos directos (mismo número de puntos + 1)
        const parentDots = (parentCodigo.match(/\./g) || []).length;
        const childDots = (c.match(/\./g) || []).length;
        return childDots === parentDots + 1;
      });

    const segs = children.map((ch) => {
      const parts = ch.split('.');
      const last = parts[parts.length - 1] || '0';
      return parseInt(last, 10) || 0;
    });

    const nextSeg = Math.max(0, ...segs) + 1;
    return `${parentCodigo}.${nextSeg}`;
  }

  /**
   * Calcula la profundidad máxima permitida
   * @param existingMaxLevel - Máximo nivel existente
   * @returns Profundidad máxima permitida
   */
  getMaxDepthAllowed(existingMaxLevel: number): number {
    return Math.max(3, existingMaxLevel + 1);
  }

  /**
   * Valida si se puede agregar un hijo
   * @param currentLevel - Nivel actual
   * @param maxDepth - Profundidad máxima
   * @returns true si se puede agregar hijo
   */
  canAddChild(currentLevel: number, maxDepth: number): boolean {
    return currentLevel < maxDepth;
  }

  /**
   * Obtiene el label del tipo de centro
   * @param tipo - Código del tipo (1, 2)
   * @returns Label descriptivo
   */
  getTipoLabel(tipo?: number): string {
    switch (tipo) {
      case 1:
        return 'Acumulación';
      case 2:
        return 'Movimiento';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Obtiene la clase CSS del tipo
   * @param tipo - Código del tipo
   * @returns Nombre de clase CSS
   */
  getTipoClass(tipo?: number): string {
    switch (tipo) {
      case 1:
        return 'movimiento';
      case 2:
        return 'acumulacion';
      default:
        return 'desconocido';
    }
  }

  /**
   * Obtiene el label del estado
   * @param estado - Valor del estado (0 o 1)
   * @returns Label descriptivo
   */
  getEstadoLabel(estado: any): string {
    return Number(estado) === 1 ? 'Activo' : 'Inactivo';
  }

  /**
   * Construye código jerárquico a partir de un centro y su padre
   * @param numero - Número del centro
   * @param parentCodigo - Código del padre (opcional)
   * @returns Código jerárquico completo
   */
  buildCodigoStr(numero: number, parentCodigo?: string): string {
    if (!parentCodigo) {
      return String(numero);
    }
    return `${parentCodigo}.${numero}`;
  }

  /**
   * Extrae el número de un código jerárquico
   * @param codigoStr - Código completo (ej: "1.2.3")
   * @returns Último segmento como número
   */
  extractNumeroFromCodigo(codigoStr: string): number {
    if (!codigoStr) return 0;
    const parts = codigoStr.split('.');
    const last = parts[parts.length - 1] || '0';
    return parseInt(last, 10) || 0;
  }

  /**
   * Cuenta descendientes de un centro
   * @param codigoPadre - Código del centro padre
   * @param allCodigos - Todos los códigos disponibles
   * @returns Cantidad de descendientes
   */
  countDescendants(codigoPadre: string, allCodigos: string[]): number {
    const prefix = `${codigoPadre}.`;
    return allCodigos.filter((c) => c.startsWith(prefix)).length;
  }

  /**
   * Obtiene la ruta completa de nombres de un centro
   * @param codigoStr - Código del centro
   * @param allCentros - Mapa de códigos a centros
   * @returns Ruta textual (ej: "Producción / Manufactura / Línea 1")
   */
  getFullPath(codigoStr: string, allCentros: Map<string, { nombre: string }>): string {
    if (!codigoStr) return '';

    const parts = codigoStr.split('.');
    const path: string[] = [];
    let current = '';

    for (const part of parts) {
      current = current ? `${current}.${part}` : part;
      const centro = allCentros.get(current);
      if (centro) {
        path.push(centro.nombre);
      }
    }

    return path.join(' / ');
  }

  /**
   * Calcula el indentado en píxeles para un nivel
   * @param level - Nivel del centro
   * @returns Píxeles de indentación
   */
  getIndentPx(level: number): number {
    return Math.max(0, (level - 1) * 16);
  }
}
