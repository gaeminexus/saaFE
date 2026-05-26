export interface EjecucionReporte {
  codigo: number | null;
  mes: number;
  anio: number;
  usuario: string;
  fechaGeneracion: any;
  tipoEjecucion: number; // 1=Inicial / 2=Corrección
  estado: number;        // 1=En proceso / 2=Con novedades / 3=Completo
  observaciones: string;
}
