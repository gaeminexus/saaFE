/**
 * Representa una persona con la que interactúa la empresa.
 * Equivalente a la entidad TSR.PRSN en Java.
 * Se utiliza para almacenar clientes, proveedores, empleados, socios, etc.
 */
export interface Persona {
    codigo: number;                    // Identificador único de la persona
    identificacion: string;            // Número de identificación (RUC, cédula, etc.)
    nombre: string;                    // Nombre (para personas naturales)
    apellido: string;                  // Apellido (para personas naturales)
    razonSocial: string;               // Razón social (para personas jurídicas)
    tipoCliente: number;               // 1 = Cliente, 0 = No es cliente
    tipoProveedor: number;             // 1 = Proveedor, 0 = No es proveedor
    rubroTipoPersonaP: number;         // Rubro principal (tipo de persona)
    rubroTipoPersonaH: number;         // Rubro detalle (tipo de persona)
    rubroTipoIdentificacionP: number;  // Rubro principal (tipo de identificación)
    rubroTipoIdentificacionH: number;  // Rubro detalle (tipo de identificación)
    estado: number;                    // Estado del registro (activo/inactivo)
    tipoBeneficiario: number;          // 1 = Beneficiario, 0 = No es beneficiario
    tipoEmpleado: number;              // 1 = Empleado, 0 = No es empleado
    aplicaIVA: number;                 // 1 = Aplica IVA, 0 = No aplica
    aplicaRetencion: number;           // 1 = Aplica retención, 0 = No aplica
    tipoSocio: number;                 // 1 = Socio, 0 = No es socio
}
