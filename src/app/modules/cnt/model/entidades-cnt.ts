import { HeaderComponent } from './../../../shared/header/header.component';
export class EntidadesContabilidad {
  // Entidades principales
  public static readonly ASIENTO = 1;
  public static readonly CENTRO_COSTO = 2;
  public static readonly PLAN_CUENTA = 3;
  public static readonly MAYORIZACION = 4;
  public static readonly TIPO_ASIENTO = 5;
  public static readonly REPORTE_CONTABLE = 6;
  public static readonly PERIODO = 7;
  public static readonly NATURALEZA_CUENTA = 8;
  public static readonly MAYOR_ANALITICO = 9;
  public static readonly PLANTILLA = 10;
  public static readonly TEMP_REPORTES = 11;
  public static readonly DESGLOSE_MAYORIZACION_CC = 12;
  public static readonly DETALLE_ASIENTO = 13;
  public static readonly DETALLE_MAYORIZACION_CC = 14;
  public static readonly DETALLE_MAYORIZACION = 15;

  // Entidades históricas
  public static readonly HIST_ASIENTO = 16;
  public static readonly HIST_MAYORIZACION = 17;
  public static readonly HIST_DETALLE_ASIENTO = 18;
  public static readonly HIST_DETALLE_MAYORIZACION = 19;

  // Entidades de centro de costo
  public static readonly MAYORIZACION_CC = 20;
  public static readonly REPORTE_CUENTA_CC = 21;
  public static readonly DETALLE_REPORTE_CUENTA_CC = 22;

  // Entidades de detalle
  public static readonly DETALLE_PLANTILLA = 23;
  public static readonly DETALLE_REPORTE_CONTABLE = 24;
  public static readonly DETALLE_MAYOR_ANALITICO = 25;

  // Entidades de relación
  public static readonly MATCH_CUENTA = 26;
}

