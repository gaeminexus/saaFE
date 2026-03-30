import { DetallePrestamo } from './detalle-prestamo';
import { NovedadParticipeCarga } from './novedad-participe-carga';
import { Prestamo } from './prestamo';

export interface AfectacionValoresParticipeCarga {
  codigo?: number;
  novedadParticipeCarga: NovedadParticipeCarga;
  prestamo: Prestamo;
  detallePrestamo: DetallePrestamo;
  valorCuotaOriginal?: number | null;
  capitalCuotaOriginal?: number | null;
  interesCuotaOriginal?: number | null;
  desgravamenCuotaOriginal?: number | null;
  valorAfectar?: number | null;
  capitalAfectar?: number | null;
  interesAfectar?: number | null;
  desgravamenAfectar?: number | null;
  diferenciaTotal?: number | null;
  diferenciaCapital?: number | null;
  diferenciaInteres?: number | null;
  diferenciaDesgravamen?: number | null;
  fechaAfectacion?: Date | string | null;
  usuarioRegistro?: string | null;
  fechaCreacionRegistro?: Date | string | null;
  observaciones?: string | null;
  estado?: number | null;
}
