import { environment } from '../../../../environments/environment';

const API_URL = environment.apiUrl;

export class ServiciosRhh {
  // RESTFULL SERVICES - Configuración dinámica según ambiente
  public static RS_NXOO = `${API_URL}/nxoo`;
  public static RS_PRTE = `${API_URL}/prte`;
  public static RS_CRGO = `${API_URL}/crgo`;
  public static RS_CTLG = `${API_URL}/ctlg`;
  public static RS_CNTE = `${API_URL}/cnte`;
  public static RS_DPRT = `${API_URL}/dprt`;
  public static RS_DPTC = `${API_URL}/dptc`;
  public static RS_TMLQ = `${API_URL}/tmlq`;
  public static RS_DTLL = `${API_URL}/dtll`;
  public static RS_MPLD = `${API_URL}/mpld`;
  // Tabla RHH.HSTR (Historial de cargos). El backend expone su @Path como 'hscg' para
  // resolver la colisión con crd/HistorialSueldoRest, que declaraba el mismo @Path("hstr").
  public static RS_HSTR = `${API_URL}/hscg`;
  public static RS_LQDC = `${API_URL}/lqdc`;
  public static RS_MRCC = `${API_URL}/mrcc`;
  public static RS_NMNA = `${API_URL}/nmna`;
  public static RS_PRDN = `${API_URL}/prdn`;
  public static RS_PTCN = `${API_URL}/ptcn`;
  public static RS_RNGL = `${API_URL}/rngl`;
  public static RS_RSMN = `${API_URL}/rsmn`;
  public static RS_RLPG = `${API_URL}/rlpg`;
  public static RS_SLDV = `${API_URL}/sldv`;
  public static RS_SLCT = `${API_URL}/slct`;
  public static RS_TPCE = `${API_URL}/tpce`;
  public static RS_TRNO = `${API_URL}/trno`;

  // Parametrización de nómina (fase 1)
  public static RS_CPNM = `${API_URL}/cpnm`;
  public static RS_CFNM = `${API_URL}/cfnm`;
  public static RS_PRNM = `${API_URL}/prnm`;
  public static RS_TBIR = `${API_URL}/tbir`;
  public static RS_TPGP = `${API_URL}/tpgp`;
  public static RS_CSTR = `${API_URL}/cstr`;
  public static RS_FMRC = `${API_URL}/fmrc`;
  public static RS_DFMR = `${API_URL}/dfmr`;

  // Maestro de personal (fase 2)
  public static RS_CRGF = `${API_URL}/crgf`;
  public static RS_CBEM = `${API_URL}/cbem`;
  public static RS_GSPR = `${API_URL}/gspr`;
  public static RS_CPXM = `${API_URL}/cpxm`;
  public static RS_NVIS = `${API_URL}/nvis`;

  // Migración de apertura y descuentos recurrentes (fase 3)
  public static RS_SLAP = `${API_URL}/slap`;
  public static RS_ACMN = `${API_URL}/acmn`;
  public static RS_DSRC = `${API_URL}/dsrc`;
  public static RS_CTDS = `${API_URL}/ctds`;

  // Motor de nómina (fase 4)
  public static RS_NVNM = `${API_URL}/nvnm`;
  public static RS_PVNM = `${API_URL}/pvnm`;
  public static RS_PYIR = `${API_URL}/pyir`;
  public static RS_HREX = `${API_URL}/hrex`;

  // Contabilización y pago (fase 6)
  public static RS_RDPG = `${API_URL}/rdpg`;
  public static RS_DRPG = `${API_URL}/drpg`;
  public static RS_FMBN = `${API_URL}/fmbn`;

  // Fase 9 — salidas oficiales y utilidades
  public static RS_UTLD = `${API_URL}/utld`;
  public static RS_DTUT = `${API_URL}/dtut`;
  public static RS_SLOF = `${API_URL}/slof`;
  public static RS_DFMB = `${API_URL}/dfmb`;

  // Importación del biométrico (fase 7). La consolidación cuelga de RS_RSMN, ya declarado
  public static RS_CRMR = `${API_URL}/crmr`;

  // Agregar más endpoints de RRHH acá según necesidades
}
