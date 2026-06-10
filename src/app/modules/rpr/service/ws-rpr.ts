import { environment } from '../../../../environments/environment';

const API_URL = environment.apiUrl;

export class ServiciosRpr {
  // RESTFULL SERVICES - Configuración dinámica según ambiente

  public static RS_CG40 = `${API_URL}/cg40`; // CreditoG40
  public static RS_CG41 = `${API_URL}/cg41`; // ParticipeActivoG41
  public static RS_CG42 = `${API_URL}/cg42`; // SaldoCuentaG42
  public static RS_CG43 = `${API_URL}/cg43`; // ParticipeCesanteG43
  public static RS_CG44 = `${API_URL}/cg44`; // ParticipeJubiladoG44
  public static RS_CG45 = `${API_URL}/cg45`; // NuevoParticipeG45
  public static RS_CG46 = `${API_URL}/cg46`; // NuevoPrestamoG46
  public static RS_CG47 = `${API_URL}/cg47`; // NovacionG47
  public static RS_CG48 = `${API_URL}/cg48`; // SaldoOperacionG48
  public static RS_CG49 = `${API_URL}/cg49`; // CancelacionG49
  public static RS_CG50 = `${API_URL}/cg50`; // GaranteG50
  public static RS_CG51 = `${API_URL}/cg51`; // GarantiaRealG51
  public static RS_EJRC = `${API_URL}/ejrc`; // EjecucionReporte
  public static RS_EJRD = `${API_URL}/ejrd`; // DetalleEjecucionReporte

  // ── Informes Mensuales de Crédito ─────────────────────────────────
  public static RS_EJCC = `${API_URL}/ejcc`; // EJCC – Control ejecución reportes cartera
  public static RS_CPRM = `${API_URL}/cprm`; // CPRM – Crédito Partícipes Mensual
  public static RS_CJBM = `${API_URL}/cjbm`; // CJBM – Crédito Jubilados Mensual
  public static RS_CCPM = `${API_URL}/ccpm`; // CCPM – Crédito Cuotas Préstamos Mensual
  public static RS_HMPR = `${API_URL}/hmpr`; // HMPR – Histórico CPRM
  public static RS_HMJB = `${API_URL}/hmjb`; // HMJB – Histórico CJBM
  public static RS_HMCP = `${API_URL}/hmcp`; // HMCP – Histórico CCPM
}
