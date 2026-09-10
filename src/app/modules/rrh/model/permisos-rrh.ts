/**
 * Identificadores de permiso de las pantallas de Recursos Humanos.
 *
 * **Reescrito el 2026-09-10.** El rango viejo (840-900) era del árbol de permisos anterior a este
 * módulo de seguridades y ya no existe — esos números coincidían con pantallas de otro sistema
 * (PCC) en la base real. Los valores actuales salen de
 * `docs/seguridad/CODIGOS-PERMISOS-SAA.md` / `Permisos` (`shared/model/permisos.ts`), rango
 * 1253-1557. Se mantienen los nombres de las constantes porque están cableados en
 * `menurecursoshumanos.component.ts` — lo único que cambia acá es el número.
 *
 * Mientras `docs/logica-negocio/seguridad/sql/lap1-15-arbol-permisos-saa.sql` no se haya corrido,
 * estos códigos no existen en la base (ver `PermisosService`, que trata eso como "no validar").
 */
export class PermisosRrh {
  // Grupos del menú
  public static readonly GRUPO_PARAMETRIZACION = 1497;   // RRH_PARAMETRIZACION
  public static readonly GRUPO_PERSONAL = 1511;           // RRH_PERSONAL
  public static readonly GRUPO_PROCESOS = 1530;           // RRH_PROCESOS
  public static readonly GRUPO_MIGRACION = 1527;          // RRH_MIGRACION_DE_APERTURA
  public static readonly GRUPO_ASISTENCIA = 1522;         // RRH_ASISTENCIA

  // Parametrización
  public static readonly CONCEPTOS_NOMINA = 1498;         // RRH_CONCEPTOS_DE_NOMINA
  public static readonly PARAMETROS_ANUALES = 1499;       // RRH_PARAMETROS_ANUALES
  public static readonly TABLA_IMPUESTO_RENTA = 1500;     // RRH_TABLA_DE_IMPUESTO_A_LA_RENTA
  public static readonly TOPES_GASTOS_PERSONALES = 1501;  // RRH_TOPES_DE_GASTOS_PERSONALES
  public static readonly CAUSALES_TERMINACION = 1502;     // RRH_CAUSALES_DE_TERMINACION
  public static readonly CONFIGURACION_NOMINA = 1503;     // RRH_CONFIGURACION_DE_NOMINA
  public static readonly FORMATOS_MARCACION = 1504;       // RRH_FORMATOS_DE_MARCACION
  public static readonly DEPARTAMENTOS = 1506;             // RRH_DEPARTAMENTOS
  public static readonly CARGOS = 1507;                    // RRH_CARGOS_Y_PUESTOS
  public static readonly DEPARTAMENTO_CARGO = 1508;       // RRH_DEPARTAMENTO_CARGO
  public static readonly TIPOS_CONTRATO = 1509;           // RRH_TIPOS_DE_CONTRATO
  public static readonly TURNOS = 1510;                    // RRH_TURNOS_Y_HORARIOS

  // Personal
  public static readonly COLABORADORES = 1512;             // RRH_COLABORADORES
  /**
   * Ficha del colaborador. No tiene entrada propia en el menú (se llega por `navigate` desde
   * Colaboradores) pero sí nodo en el árbol de permisos: `RRH_FICHA_DEL_COLABORADOR`. Sin uso hoy
   * en `menurecursoshumanos.component.ts` — se cablea en el ÍTEM 7 (verificación en el punto de
   * `navigate`, no en el menú).
   */
  public static readonly FICHA_COLABORADOR = 1513;        // RRH_FICHA_DEL_COLABORADOR
  public static readonly VACACIONES = 1516;                // RRH_VACACIONES
  public static readonly PERMISOS_LICENCIAS = 1519;       // RRH_PERMISOS_Y_LICENCIAS
  public static readonly MARCACIONES = 1523;               // RRH_MARCACIONES
  public static readonly RESUMEN_DIARIO = 1525;             // RRH_RESUMEN_DIARIO

  // Migración
  public static readonly SALDOS_APERTURA = 1528;           // RRH_SALDOS_DE_APERTURA
  public static readonly ACUMULADOS = 1529;                // RRH_ACUMULADOS

  // Procesos
  /**
   * Sin equivalente en el árbol nuevo (`docs/seguridad/CODIGOS-PERMISOS-SAA.md` no tiene ningún
   * nodo RRH llamado "Nómina" ni parecido). Por instrucción del árbitro: se deja el valor viejo tal
   * cual, no se borra ni se inventa un código. Esta constante tampoco tiene ningún uso en
   * `src/app` (confirmado por grep) — es la otra de las dos "sin uso" del inventario.
   */
  public static readonly NOMINA = 880;
  public static readonly ROLES_PAGO = 1541;                // RRH_ROLES_DE_PAGO
  /**
   * Sin equivalente en el árbol nuevo — el nodo de menú "Aportes y retenciones" que la usaba está
   * comentado desde 2026-08-26 (pantalla a medio construir, sin entidad en el backend) y por eso el
   * árbitro no le generó código al armar el árbol desde el inventario. Mismo criterio que `NOMINA`:
   * se deja el valor viejo, no se borra ni se inventa uno. Si la pantalla se termina y se vuelve a
   * colgar del menú, hay que pedir un código nuevo antes.
   */
  public static readonly APORTES_RETENCIONES = 882;
  public static readonly LIQUIDACION = 1548;                // RRH_LIQUIDACION
  public static readonly DESCUENTOS_RECURRENTES = 1540;    // RRH_DESCUENTOS_RECURRENTES
  public static readonly PERIODOS_NOMINA = 1531;            // RRH_PERIODOS_DE_NOMINA
  public static readonly NOVEDADES_NOMINA = 1534;           // RRH_NOVEDADES_DEL_PERIODO
  /**
   * ⚠️ El árbol nuevo distingue dos nodos donde el viejo tenía uno solo: `RRH_HORAS_EXTRA` (1526,
   * bajo ASISTENCIA) y `RRH_PROCESOS_HORAS_EXTRA` (1538, bajo PROCESOS) — hoy
   * `menurecursoshumanos.component.ts` usa esta MISMA constante en los dos nodos de menú (líneas
   * 191 y 253). Mapeada acá a `RRH_HORAS_EXTRA` (la de Asistencia, la hoja "primaria"). El nodo de
   * Procesos queda temporalmente con el mismo código que el de Asistencia hasta que el árbitro
   * confirme si hace falta separarlos con una constante nueva y recablear esa línea del menú.
   */
  public static readonly HORAS_EXTRA = 1526;                // RRH_HORAS_EXTRA (ver nota — también cubre RRH_PROCESOS_HORAS_EXTRA=1538)
  public static readonly PROYECCION_IR = 1539;               // RRH_PROYECCION_DE_IMPUESTO_A_LA_RENTA
  public static readonly REPORTES_NOMINA = 1547;             // RRH_REPORTES_DE_NOMINA
  public static readonly ORDENES_PAGO = 1542;                 // RRH_ORDENES_DE_PAGO
  public static readonly SALIDAS_OFICIALES = 1550;           // RRH_SALIDAS_OFICIALES
  public static readonly UTILIDADES = 1551;                   // RRH_REPARTO_DE_UTILIDADES
  public static readonly NOVEDADES_IESS = 1535;               // RRH_NOVEDADES_DEL_MES_IESS

  /** Anticipos a trabajadores (PROMPT 08). */
  public static readonly ANTICIPOS_TRABAJADORES = 1552;      // RRH_ANTICIPOS_A_TRABAJADORES

  /** Acreditar vacaciones — proceso anual, ya en producción, sin pantalla hasta ahora. */
  public static readonly ACREDITAR_VACACIONES = 1557;        // RRH_ACREDITAR_VACACIONES

  /** Pago de beneficios sociales (décimos acumulados, fondos de reserva) — docs/rrh/API-PAGO-BENEFICIOS-SOCIALES.md. */
  public static readonly PAGO_BENEFICIOS_SOCIALES = 1546;    // RRH_PAGO_DE_BENEFICIOS_SOCIALES

  /** Planilla de control del IESS — docs/rrh/API-PLANILLA-IESS.md §7.a. */
  public static readonly PLANILLA_CONTROL_IESS = 1536;       // RRH_PLANILLA_DE_CONTROL_IESS

  /** Planillas del IESS: registrar, conciliar, pagar y anular — docs/rrh/API-PLANILLA-IESS.md §7.b. */
  public static readonly PLANILLAS_IESS = 1537;               // RRH_PLANILLAS_DEL_IESS

  // Parametrización de la fase 6
  public static readonly FORMATOS_ARCHIVO_BANCARIO = 1505;   // RRH_FORMATOS_DEL_ARCHIVO_BANCARIO

  // Procesos de la fase 7
  public static readonly IMPORTACION_MARCACIONES = 1524;     // RRH_IMPORTACION_DE_MARCACIONES

  /** Valores no pagados — saaBE/docs/logica-negocio/rhh/PLAN-VALORES-NO-PAGADOS.md. */
  public static readonly VALORES_NO_PAGADOS = 1543;           // RRH_VALORES_NO_PAGADOS
}
