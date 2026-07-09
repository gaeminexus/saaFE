/**
 * Modelo de Titular para el módulo de Tesorería (TSR).
 * Representa titulares de cuentas bancarias, beneficiarios de pagos, etc.
 *
 * ⚠️ IMPORTANTE: El backend acepta 12 campos principales:
 * ✅ CAMPOS VÁLIDOS PARA POST/PUT:
 *    1. codigo           (Long)    - Identificador único
 *    2. nombre           (String)  - Nombre (singular)
 *    3. apellido         (String)  - Apellido (singular)
 *    4. estado           (Integer) - Estado: 0=INACTIVO, 1=ACTIVO
 *    5. genero           (String)  - Género: M o F
 *    6. estadoCivil      (String)  - Estado civil: Soltero, Casado, etc.
 *    7. filial           (String)  - Filial del titular
 *    8. usuarioIngreso   (String)  - Usuario que creó el registro
 *    9. fechaIngreso     (String)  - Fecha de creación
 *   10. telefono         (String)  - Teléfono de contacto
 *   11. email            (String)  - Correo electrónico
 *   12. direccion        (String)  - Dirección
 *
 * ❌ CAMPOS NO SOPORTADOS POR EL BACKEND (uso solo en frontend):
 *    - identificacion, razonSocial
 *    - tipoCliente, tipoProveedor, tipoBeneficiario, tipoEmpleado, tipoSocio
 *    - rubroTipoPersonaP, rubroTipoPersonaH, rubroTipoIdentificacionP, rubroTipoIdentificacionH
 *    - aplicaIVA, aplicaRetencion
 *
 */
export interface Titular {
  // ===== CAMPOS BASE =====
  codigo: number; // Identificador único (OBLIGATORIO en backend)
  estado: number; // Estado del registro: 1 = ACTIVO, 0 = INACTIVO (OBLIGATORIO)

  // ===== CAMPOS DE BACKEND =====
  nombre?: string; // Nombre (singular) - campo backend
  apellido?: string; // Apellido (singular) - campo backend
  genero?: string; // Género: M o F
  estadoCivil?: string; // Estado civil: Soltero, Casado, Divorciado, Viudo, Union Libre
  filial?: string; // Filial del titular
  usuarioIngreso?: string; // Usuario que creó el registro
  fechaIngreso?: string; // Fecha de creación del registro

  // ===== CAMPOS EXTENDIDOS (Modelo completo) =====
  identificacion?: string; // Número de identificación (RUC, Cédula, Pasaporte)
  razonSocial?: string; // Razón social (para personas jurídicas)
  telefono?: string; // Teléfono (para todos)
  email?: string; // Correo electrónico (para todos)
  direccion?: string; // Dirección (para todos)

  // ===== TIPOS/ROLES =====
  tipoCliente?: number; // 1 = Es cliente, 0 = No es cliente
  tipoProveedor?: number; // 1 = Es proveedor, 0 = No es proveedor
  tipoBeneficiario?: number; // 1 = Es beneficiario, 0 = No es beneficiario
  tipoEmpleado?: number; // 1 = Es empleado, 0 = No es empleado
  tipoSocio?: number; // 1 = Es socio, 0 = No es socio

  // ===== RUBROS =====
  rubroTipoPersonaP?: number; // Código de rubro padre (tipo de persona) - Usar 35
  rubroTipoPersonaH?: number; // Código de detalle rubro (tipo específico de persona)
  rubroTipoIdentificacionP?: number; // Código de rubro padre (tipo de identificación) - Usar 36
  rubroTipoIdentificacionH?: number; // Código de detalle rubro (tipo específico de identificación)
  rubroRolP?: number; // Código de rubro padre (rol) - Usar 55
  rubroRolH?: number; // Código de detalle rubro (rol específico)

  // ===== CONFIGURACIÓN FISCAL =====
  aplicaIVA?: number; // 1 = Aplica IVA, 0 = No aplica IVA
  aplicaRetencion?: number; // 1 = Aplica retención, 0 = No aplica retención
}
