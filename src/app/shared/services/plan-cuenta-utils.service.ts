import { Injectable } from '@angular/core';

/**
 * Servicio de utilidades compartidas para Plan de Cuentas
 * Contiene funciones de cálculo, formateo y validación reutilizables
 */
@Injectable({
  providedIn: 'root'
})
export class PlanCuentaUtilsService {

  /**
   * Formatea una fecha de forma segura para mostrar en UI
   * @param fecha - Fecha en formato string, Date o null/undefined
   * @returns String formateado en formato DD/MM/YYYY o mensaje de error
   */
  formatFecha(fecha: string | Date | null | undefined): string {
    if (!fecha) return '-';
    
    try {
      const fechaStr = typeof fecha === 'string' ? fecha : fecha.toISOString();
      // Remover zona horaria problemática: "2024-01-15T05:00:00Z[UTC]"
      const fechaLimpia = fechaStr.split('[')[0].replace('Z', '');
      const fechaObj = new Date(fechaLimpia);
      
      if (isNaN(fechaObj.getTime())) return 'Fecha inválida';
      
      return fechaObj.toLocaleDateString('es-EC', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (err) {
      console.error('Error formateando fecha:', err);
      return 'Error de formato';
    }
  }

  /**
   * Calcula el nivel jerárquico de una cuenta basándose en su código contable
   * @param cuentaContable - Código de la cuenta (ej: "1", "1.1", "1.1.01")
   * @returns Nivel de la cuenta (0 para raíz "0", 1 para "1", 2 para "1.1", etc.)
   */
  calculateLevel(cuentaContable: string): number {
    if (!cuentaContable) return 0;
    
    // Cuenta especial raíz
    if (cuentaContable === '0') return 0;
    
    // Contar puntos para determinar el nivel
    const dots = (cuentaContable.match(/\./g) || []).length;
    return dots + 1;
  }

  /**
   * Convierte un número de cuenta jerárquico a formato ordenable
   * Agrega padding de 4 dígitos a cada segmento para ordenamiento correcto
   * @param accountNumber - Número de cuenta (ej: "1", "1.1", "1.1.01")
   * @returns String con padding (ej: "0001", "0001.0001", "0001.0001.0001")
   */
  getAccountNumberForSorting(accountNumber: string): string {
    if (!accountNumber) return '0000';

    // Si no tiene puntos, es un número simple
    if (!accountNumber.includes('.')) {
      const numPart = parseInt(accountNumber.trim()) || 0;
      return numPart.toString().padStart(4, '0');
    }

    // Dividir por puntos y convertir cada parte a número con padding
    const parts = accountNumber.split('.');
    const paddedParts = parts.map(part => {
      const numPart = parseInt(part.trim()) || 0;
      return numPart.toString().padStart(4, '0');
    });

    return paddedParts.join('.');
  }

  /**
   * Genera el siguiente número de cuenta contable para un hijo de una cuenta padre
   * @param parentNumber - Número de cuenta del padre (ej: "1", "1.1")
   * @param existingAccounts - Array de códigos de cuentas existentes
   * @returns Nuevo número de cuenta sugerido (ej: "1.1", "1.1.3")
   */
  generateNewCuentaContable(parentNumber: string, existingAccounts: string[]): string {
    // Caso especial: padre raíz '0' => hijos son cuentas de primer nivel sin prefijo '0.'
    if (parentNumber === '0') {
      const rootChildren = existingAccounts
        .filter(acc => acc && !acc.includes('.') && acc !== '0')
        .map(acc => parseInt(acc, 10))
        .filter(n => !isNaN(n));
      
      const next = rootChildren.length === 0 ? 1 : Math.max(...rootChildren) + 1;
      return String(next);
    }

    // Buscar hijos directos del padre
    const children = existingAccounts.filter(acc => {
      if (!acc) return false;
      // Debe empezar con el número del padre + punto
      if (!acc.startsWith(parentNumber + '.')) return false;
      
      // Validar que sea hijo directo (misma cantidad de puntos + 1)
      const parentDots = (parentNumber.match(/\./g) || []).length;
      const childDots = (acc.match(/\./g) || []).length;
      return childDots === parentDots + 1;
    });

    // Extraer el último segmento de cada hijo
    const lastSegments = children.map(child => {
      const parts = child.split('.');
      return parseInt(parts[parts.length - 1], 10) || 0;
    });

    // Generar siguiente número secuencial
    const nextSegment = (Math.max(0, ...lastSegments) + 1);
    return `${parentNumber}.${nextSegment}`;
  }

  /**
   * Calcula la profundidad máxima permitida para el árbol de cuentas
   * @param existingMaxLevel - Máximo nivel existente en los datos
   * @param naturalezaCount - Cantidad de naturalezas disponibles
   * @returns Profundidad máxima permitida
   */
  getMaxDepthAllowed(existingMaxLevel: number, naturalezaCount: number): number {
    // Permitir al menos la profundidad actual existente + 1 para no bloquear
    return Math.max(existingMaxLevel + 1, naturalezaCount || 1);
  }

  /**
   * Obtiene el siguiente código de naturaleza disponible para cuentas raíz
   * @param existingRootNumbers - Números de cuentas raíz ya existentes
   * @param naturalezaCodigos - Array de códigos de naturaleza ordenados
   * @returns Código de naturaleza disponible o null si no hay
   */
  getNextAvailableRootNaturalezaCodigo(
    existingRootNumbers: number[], 
    naturalezaCodigos: number[]
  ): number | null {
    const existingSet = new Set(existingRootNumbers);
    
    for (const codigo of naturalezaCodigos) {
      if (!existingSet.has(codigo)) {
        return codigo;
      }
    }
    
    return null;
  }

  /**
   * Calcula el siguiente número de cuenta raíz secuencial (máximo + 1)
   * @param existingRootNumbers - Array de números de cuentas raíz existentes
   * @returns Siguiente número disponible
   */
  getNextRootSequentialCuenta(existingRootNumbers: number[]): number {
    if (existingRootNumbers.length === 0) {
      return 1; // Primera cuenta raíz
    }
    
    return Math.max(...existingRootNumbers) + 1;
  }

  /**
   * Valida si se puede agregar un hijo a una cuenta
   * @param currentLevel - Nivel actual de la cuenta
   * @param maxDepth - Profundidad máxima permitida
   * @returns true si se puede agregar hijo, false si no
   */
  canAddChild(currentLevel: number, maxDepth: number): boolean {
    return currentLevel < maxDepth;
  }

  /**
   * Extrae números de cuentas raíz (sin puntos, distintos de '0')
   * @param accounts - Array de códigos de cuentas
   * @returns Array de números de cuentas raíz
   */
  extractRootNumbers(accounts: string[]): number[] {
    return accounts
      .filter(acc => acc && !acc.includes('.') && acc !== '0')
      .map(acc => parseInt(acc, 10))
      .filter(n => !isNaN(n));
  }

  /**
   * Obtiene el label del tipo de cuenta
   * @param tipo - Código del tipo (1, 2, 3)
   * @returns Label descriptivo
   */
  getTipoLabel(tipo?: number): string {
    switch (tipo) {
      case 1: return 'Acumulación';
      case 2: return 'Movimiento';
      case 3: return 'Orden';
      default: return 'Desconocido';
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
   * Construye la ruta completa de una cuenta usando su jerarquía
   * @param cuentaContable - Código de la cuenta
   * @param allAccounts - Mapa de todas las cuentas (codigo -> cuenta)
   * @returns Ruta textual (ej: "ACTIVOS / ACTIVOS CORRIENTES / CAJA")
   */
  getFullPath(
    cuentaContable: string, 
    allAccounts: Map<string, { nombre: string }>
  ): string {
    if (!cuentaContable) return '';
    
    const parts = cuentaContable.split('.');
    const path: string[] = [];
    let current = '';
    
    for (const part of parts) {
      current = current ? `${current}.${part}` : part;
      const account = allAccounts.get(current);
      if (account) {
        path.push(account.nombre);
      }
    }
    
    return path.join(' / ');
  }

  /**
   * Cuenta descendientes de una cuenta
   * @param accountNumber - Número de cuenta
   * @param allAccountNumbers - Todos los números de cuenta disponibles
   * @returns Cantidad de descendientes
   */
  countDescendants(accountNumber: string, allAccountNumbers: string[]): number {
    const prefix = `${accountNumber}.`;
    return allAccountNumbers.filter(acc => acc.startsWith(prefix)).length;
  }
}
