import { ParticipeXCargaArchivo } from "./participe-x-carga-archivo";

export interface NovedadParticipeCarga {
  codigo: number;
  participeXCargaArchivo: ParticipeXCargaArchivo;
  codigoCargaArchivo: number | null;
  tipoNovedad: number;
  descripcion: string;
  codigoProducto: number | null;
  codigoPrestamo: number | null;
  idAsoprepPrestamo: number | null;
  codigoCuota: number | null;
  montoEsperado: number | null;
  montoRecibido: number | null;
  montoDiferencia: number | null;
  estado: number;
}
