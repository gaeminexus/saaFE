/**
 * Identificadores de permiso de las pantallas de Recursos Humanos.
 *
 * Sustituyen al 811 de todos los grupos y al 830 de todas las hojas que había antes, que era
 * copia y pega sin granularidad.
 *
 * **Pendiente de la otra capa:** estos códigos deben existir en el catálogo de permisos del
 * backend para que `UsuarioService.verificaPermiso` los resuelva. Hoy no se valida ninguno:
 * `menu-list.component.ts` tiene la comprobación comentada, de modo que el menú navega sin
 * consultar permisos. Se declaran aquí para que la granularidad quede definida y el día que se
 * reactive la verificación no haya que rehacer el menú.
 */
export class PermisosRrh {
  // Grupos del menú
  public static readonly GRUPO_PARAMETRIZACION = 840;
  public static readonly GRUPO_PERSONAL = 841;
  public static readonly GRUPO_PROCESOS = 842;
  public static readonly GRUPO_MIGRACION = 843;
  public static readonly GRUPO_ASISTENCIA = 844;

  // Parametrización
  public static readonly CONCEPTOS_NOMINA = 850;
  public static readonly PARAMETROS_ANUALES = 851;
  public static readonly TABLA_IMPUESTO_RENTA = 852;
  public static readonly TOPES_GASTOS_PERSONALES = 853;
  public static readonly CAUSALES_TERMINACION = 854;
  public static readonly CONFIGURACION_NOMINA = 855;
  public static readonly FORMATOS_MARCACION = 856;
  public static readonly DEPARTAMENTOS = 857;
  public static readonly CARGOS = 858;
  public static readonly DEPARTAMENTO_CARGO = 859;
  public static readonly TIPOS_CONTRATO = 860;
  public static readonly TURNOS = 861;

  // Personal
  public static readonly COLABORADORES = 870;
  public static readonly FICHA_COLABORADOR = 871;
  public static readonly VACACIONES = 872;
  public static readonly PERMISOS_LICENCIAS = 873;
  public static readonly MARCACIONES = 874;
  public static readonly RESUMEN_DIARIO = 877;

  // Migración
  public static readonly SALDOS_APERTURA = 875;
  public static readonly ACUMULADOS = 876;

  // Procesos
  public static readonly NOMINA = 880;
  public static readonly ROLES_PAGO = 881;
  public static readonly APORTES_RETENCIONES = 882;
  public static readonly LIQUIDACION = 883;
  public static readonly DESCUENTOS_RECURRENTES = 884;
  public static readonly PERIODOS_NOMINA = 885;
  public static readonly NOVEDADES_NOMINA = 886;
  public static readonly HORAS_EXTRA = 887;
  public static readonly PROYECCION_IR = 888;
  public static readonly REPORTES_NOMINA = 889;
  public static readonly ORDENES_PAGO = 890;
  public static readonly SALIDAS_OFICIALES = 892;
  public static readonly UTILIDADES = 893;
  /**
   * Novedades del mes ante el IESS.
   *
   * **Pendiente de alta en la tabla de permisos del backend.** Hoy no molesta: la comprobación
   * de `MenuListComponent.onItemSelected` está comentada y el menú navega sin verificar, así que
   * el id es decorativo. El día que se reactive, una entrada con un permiso inexistente
   * desaparecerá del menú sin decir por qué.
   */
  public static readonly NOVEDADES_IESS = 894;

  /** Anticipos a trabajadores (PROMPT 08). */
  public static readonly ANTICIPOS_TRABAJADORES = 895;

  /** Acreditar vacaciones — proceso anual, ya en producción, sin pantalla hasta ahora. */
  public static readonly ACREDITAR_VACACIONES = 896;

  /** Pago de beneficios sociales (décimos acumulados, fondos de reserva) — docs/rrh/API-PAGO-BENEFICIOS-SOCIALES.md. */
  public static readonly PAGO_BENEFICIOS_SOCIALES = 897;

  // Parametrización de la fase 6
  public static readonly FORMATOS_ARCHIVO_BANCARIO = 862;

  // Procesos de la fase 7
  public static readonly IMPORTACION_MARCACIONES = 891;
}
