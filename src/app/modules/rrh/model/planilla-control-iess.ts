/**
 * Planilla de control del IESS de un período: la nuestra, calculada desde las nóminas, para
 * enfrentarla contra la que emite el portal **antes de pagar** (ver `docs/rrh/API-PLANILLA-IESS.md`
 * §7.a). POJO de transporte del backend (`com.saa.model.rhh.PlanillaControlIess`), no una entidad.
 *
 * Reproduce el comprobante completo, no solo la suma de aportes: al 20,60 % de la masa salarial
 * se le suman la contribución CCC del 1 % —calculada sobre la masa, no por afiliado, por eso no
 * aparece en ninguna línea— y el seguro de tiempo parcial. Con todo lo demás en cero, el total es
 * el 21,60 % de la masa.
 */
export interface PlanillaControlIess {
  idPeriodo: number;
  anio: number;
  mes: number;
  fechaInicio: any; // LocalDate del backend: normalizar con FuncionesDatosService.
  fechaFin: any;
  /** Una fila por afiliado con nómina en el período. */
  lineas: LineaPlanillaControlIess[];
  numeroAfiliados: number;
  /** Suma de las bases imponibles: la masa salarial declarada. */
  masaSalarial: number;
  totalAportePersonal: number;
  totalAportePatronal: number;
  /** Suma de los aportes: el 20,60 % de la masa. */
  totalAportes: number;
  /** Contribución CCC, 1 % de la masa salarial — no está en ninguna línea, solo en el total. */
  contribucionCcc: number;
  totalSeguroTiempoParcial: number;
  /** Lo que habría que pagar: aportes + CCC + seguro de tiempo parcial. */
  totalComprobante: number;
  /**
   * Advertencias que no bloquean pero que hay que leer antes de dar la planilla por buena: p.ej.
   * novedades del período que siguen sin reportarse, que es justo la diferencia que va a aparecer
   * contra el portal.
   */
  avisos: string[];
}

/** Una fila de la planilla: un afiliado (`com.saa.model.rhh.LineaPlanillaControlIess`). */
export interface LineaPlanillaControlIess {
  /** Código de relación de trabajo del IESS, dos dígitos. */
  relacionTrabajo?: string | null;
  identificacion: string;
  nombre: string;
  /** Base imponible del mes: lo que el IESS llama SUELDO. */
  sueldo: number;
  /** Días declarados. */
  dias?: number | null;
  aportePersonal: number;
  aportePatronal: number;
  /** Suma de personal y patronal: lo que la planilla llama VALOR. */
  totalIess: number;
  /**
   * Seguro de salud de la jornada parcial, cuando corresponde. No sale del rol de nadie: es una
   * línea del comprobante que paga el patrono sobre la diferencia entre el salario básico y el
   * sueldo real del afiliado a tiempo parcial.
   */
  seguroTiempoParcial?: number | null;
}
