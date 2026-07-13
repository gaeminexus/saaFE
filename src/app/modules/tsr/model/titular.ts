import { Pais } from "../../crd/model/pais";

/**
 * Modelo de Titular para el módulo de Tesorería (TSR).
 * Representa titulares de cuentas bancarias, beneficiarios de pagos, etc.
 *
 * ⚠️ IMPORTANTE: El backend acepta los siguientes campos principales:
 * ✅ CAMPOS VÁLIDOS PARA POST/PUT:
 *    1. codigo           (Long)    - Identificador único
 *    2. nombre           (String)  - Nombre Comercial (OBLIGATORIO)
 *    3. apellido         (String)  - ⚠️ DEPRECADO - Ya no se usa en el frontend
 *    4. estado           (Integer) - Estado: 0=INACTIVO, 1=ACTIVO (OBLIGATORIO)
 *    5. genero           (String)  - Género: M o F
 *    6. estadoCivil      (String)  - Estado civil: Soltero, Casado, etc.
 *    7. filial           (String)  - Filial del titular
 *    8. usuarioIngreso   (String)  - Usuario que creó el registro
 *    9. fechaIngreso     (String)  - Fecha de creación
 *   10. telefono         (String)  - Teléfono de contacto (OBLIGATORIO)
 *   11. email            (String)  - Correo electrónico (OBLIGATORIO)
 *   12. direccion        (String)  - Dirección (OBLIGATORIO)
 *   13. extranjero       (Integer) - 1 si es extranjero, 0 si no
 *   14. pais             (String)  - País de residencia (solo si extranjero=1)
 *
 * ℹ️ CAMPOS ADICIONALES (Modelo completo):
 *    - identificacion    (String)  - RUC, Cédula, Pasaporte (OBLIGATORIO)
 *    - razonSocial       (String)  - Razón Social (OBLIGATORIO) - Se copia automáticamente a 'nombre'
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
  nombre?: string; // Nombre Comercial - Se copia automáticamente desde razonSocial pero puede editarse
  apellido?: string; // ⚠️ DEPRECADO - Ya no se usa en el frontend
  genero?: string; // Género: M o F
  estadoCivil?: string; // Estado civil: Soltero, Casado, Divorciado, Viudo, Union Libre
  filial?: string; // Filial del titular
  usuarioIngreso?: string; // Usuario que creó el registro
  fechaIngreso?: string; // Fecha de creación del registro
  extranjero?: number; // Indica si el titular es extranjero (1=Sí, 0=No)
  pais?: Pais; // País de residencia (solo si extranjero=1)

  // ===== CAMPOS EXTENDIDOS (Modelo completo) =====
  identificacion?: string; // Número de identificación (RUC, Cédula, Pasaporte) - OBLIGATORIO
  razonSocial?: string; // Razón Social - OBLIGATORIO - Se copia automáticamente a nombre
  telefono?: string; // Teléfono de contacto - OBLIGATORIO
  email?: string; // Correo electrónico - OBLIGATORIO
  direccion?: string; // Dirección - OBLIGATORIO

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
