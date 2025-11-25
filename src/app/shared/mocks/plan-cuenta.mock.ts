import { PlanCuenta } from '../../modules/cnt/model/plan-cuenta';
import { NaturalezaCuenta } from '../../modules/cnt/model/naturaleza-cuenta';

/**
 * Datos mock para desarrollo y testing de Plan de Cuentas
 * Centraliza los datos de ejemplo para evitar duplicación
 */

// Jerarquía mock base
export const MOCK_JERARQUIA = {
  codigo: 1,
  nombre: 'Jerarquía Demo',
  nivel: 1,
  codigoPadre: 0,
  descripcion: 'Jerarquía de prueba',
  ultimoNivel: 1,
  rubroTipoEstructuraP: 1,
  rubroTipoEstructuraH: 1,
  codigoAlterno: 1,
  rubroNivelCaracteristicaP: 1,
  rubroNivelCaracteristicaH: 1
};

// Empresa mock base
export const MOCK_EMPRESA = {
  codigo: 280,
  jerarquia: MOCK_JERARQUIA,
  nombre: 'Empresa Demo',
  nivel: 1,
  codigoPadre: 0,
  ingresado: 1
};

// Naturalezas de cuenta mock
export const MOCK_NATURALEZAS: NaturalezaCuenta[] = [
  {
    codigo: 1,
    nombre: 'Deudora',
    tipo: 1,
    numero: 1,
    estado: 1,
    empresa: MOCK_EMPRESA,
    manejaCentroCosto: 0
  },
  {
    codigo: 2,
    nombre: 'Acreedora',
    tipo: 2,
    numero: 2,
    estado: 1,
    empresa: MOCK_EMPRESA,
    manejaCentroCosto: 0
  }
];

// Plan de cuentas mock completo con estructura jerárquica
export const MOCK_PLAN_CUENTAS: PlanCuenta[] = [
  // Cuenta Raíz Técnica (nivel 0)
  {
    codigo: 1,
    cuentaContable: '0',
    nombre: 'PLANARBOL',
    tipo: 1,
    nivel: 0,
    idPadre: 0,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },

  // Nivel 1 - Cuentas principales
  {
    codigo: 2,
    cuentaContable: '1',
    nombre: 'ACTIVOS',
    tipo: 1,
    nivel: 1,
    idPadre: 1,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },
  {
    codigo: 3,
    cuentaContable: '2',
    nombre: 'PASIVOS',
    tipo: 1,
    nivel: 1,
    idPadre: 1,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[1]
  },
  {
    codigo: 4,
    cuentaContable: '3',
    nombre: 'CAPITAL',
    tipo: 1,
    nivel: 1,
    idPadre: 1,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[1]
  },
  {
    codigo: 5,
    cuentaContable: '4',
    nombre: 'INGRESOS',
    tipo: 1,
    nivel: 1,
    idPadre: 1,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[1]
  },
  {
    codigo: 6,
    cuentaContable: '5',
    nombre: 'EGRESOS',
    tipo: 1,
    nivel: 1,
    idPadre: 1,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },

  // Nivel 2 - Subcuentas de ACTIVOS
  {
    codigo: 7,
    cuentaContable: '1.1',
    nombre: 'ACTIVOS CORRIENTES',
    tipo: 1,
    nivel: 2,
    idPadre: 2,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },
  {
    codigo: 8,
    cuentaContable: '1.2',
    nombre: 'ACTIVOS FIJOS',
    tipo: 1,
    nivel: 2,
    idPadre: 2,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },
  {
    codigo: 9,
    cuentaContable: '1.3',
    nombre: 'OTROS ACTIVOS',
    tipo: 1,
    nivel: 2,
    idPadre: 2,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },
  {
    codigo: 10,
    cuentaContable: '1.4',
    nombre: 'ACTIVO A LARGO PLAZO',
    tipo: 1,
    nivel: 2,
    idPadre: 2,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },

  // Nivel 3 - Subcuentas de ACTIVOS CORRIENTES
  {
    codigo: 11,
    cuentaContable: '1.1.01',
    nombre: 'CAJA',
    tipo: 2,
    nivel: 3,
    idPadre: 7,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },
  {
    codigo: 12,
    cuentaContable: '1.1.02',
    nombre: 'BANCOS',
    tipo: 2,
    nivel: 3,
    idPadre: 7,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },
  {
    codigo: 13,
    cuentaContable: '1.1.03',
    nombre: 'CUENTAS POR COBRAR',
    tipo: 2,
    nivel: 3,
    idPadre: 7,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },

  // Nivel 3 - Subcuentas de ACTIVOS FIJOS
  {
    codigo: 14,
    cuentaContable: '1.2.01',
    nombre: 'MUEBLES Y ENSERES',
    tipo: 2,
    nivel: 3,
    idPadre: 8,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },
  {
    codigo: 15,
    cuentaContable: '1.2.02',
    nombre: 'EQUIPOS DE COMPUTACION',
    tipo: 2,
    nivel: 3,
    idPadre: 8,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[0]
  },

  // Nivel 2 - Subcuentas de PASIVOS
  {
    codigo: 16,
    cuentaContable: '2.1',
    nombre: 'PASIVOS CORRIENTES',
    tipo: 1,
    nivel: 2,
    idPadre: 3,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[1]
  },
  {
    codigo: 17,
    cuentaContable: '2.1.01',
    nombre: 'CUENTAS POR PAGAR',
    tipo: 2,
    nivel: 3,
    idPadre: 16,
    estado: 1,
    fechaInactivo: new Date(),
    empresa: MOCK_EMPRESA,
    fechaUpdate: new Date(),
    naturalezaCuenta: MOCK_NATURALEZAS[1]
  }
];

/**
 * Función helper para obtener naturalezas mock
 */
export function getMockNaturalezas(): NaturalezaCuenta[] {
  return [...MOCK_NATURALEZAS];
}

/**
 * Función helper para obtener plan de cuentas mock
 */
export function getMockPlanCuentas(): PlanCuenta[] {
  return [...MOCK_PLAN_CUENTAS];
}
