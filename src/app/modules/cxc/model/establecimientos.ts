import { Facturador } from './facturador';

export interface Establecimiento {
    id: number;
    facturador: Facturador;
    codigo: string;
    nombre: string;
    descripcion: string;
    direccion: string;
    telefono: string;
    mail: string;
    logo: string;
    creacion: Date;
    matriz: number;  // 0/1
    estado: number;
}
