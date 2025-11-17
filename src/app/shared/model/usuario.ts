import { Jerarquia } from './jerarquia';

export interface Usuario {
  codigo: number;
  jerarquia: Jerarquia;
  nombre: string;
  nivel: number;
  codigoPadre: number;
  ingresado: number;
}

// Interfaz para el inicio de sesión
export interface LoginCredentials {
    usuario: string;
    password: string;
}

// Interfaz para la respuesta del login
export interface LoginResponse {
    usuario: Usuario;
    token: string;
    expiraEn: number; // Tiempo de expiración en segundos
}

// Interfaz para el cambio de contraseña
export interface CambioPassword {
    passwordActual: string;
    passwordNuevo: string;
    confirmacionPassword: string;
}

// Interfaz para la recuperación de contraseña
export interface RecuperacionPassword {
    email: string;
}

// Enumeración para el estado del usuario
export enum EstadoUsuario {
    INACTIVO = 0,
    ACTIVO = 1,
    BLOQUEADO = 2,
    PENDIENTE_ACTIVACION = 3
}