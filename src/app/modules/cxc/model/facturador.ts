import { Empresa } from '../../../shared/model/empresa';

export interface Facturador {
    id: number;
    numDoc: string;
    nombre: string;
    razonSocial: string;
    nombreComercial: string;
    mail: string;
    telefono: string;
    direccion: string;
    creado: Date;
    logo: string;
    firma: string;
    claveFirma: string;
    empresaFirma: number;
    codClave: string;
    contabilidad: number;  // 0/1
    agenteRetencion: string;
    contribuyenteEspecial: string;
    artesano: string;
    microEmpresa: number;  // 0/1
    rimpe: number;  // 0/1
    popularRimpe: number;  // 0/1
    turistico: number;  // 0/1
    inicia: Date;
    vence: Date;
    docEmitidos: number;
    docPermitidos: number;
    impCodProd: number;  // 0/1
    inventario: number;  // 0/1
    empTransporte: number;  // 0/1
    sinLimiteConsFinal: number;  // 0/1
    empresa?: Empresa | { codigo: number } | null;
    ambiente?: number | null; // 1 = Pruebas, 2 = Producción
    generaConta?: number | null; // 1 = Sí, 0 = No, null = No definido
    estado: number;
}
