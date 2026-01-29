import { environment } from '../../../../environments/environment';

const API_URL = environment.apiUrl;

export class ServiciosTsr {
  // RESTFULL SERVICES - Configuración dinámica según ambiente
  public static RS_ADTD = `${API_URL}/adtd`;
  public static RS_ACPD = `${API_URL}/acpd`;
  public static RS_APDS = `${API_URL}/apds`;
  public static RS_BEXT = `${API_URL}/bext`;
  public static RS_BNCO = `${API_URL}/bnco`;
  public static RS_CJAA = `${API_URL}/cjaa`;
  public static RS_CCXC = `${API_URL}/ccxc`;
  public static RS_CJCN = `${API_URL}/cjcn`;
  public static RS_CHQR = `${API_URL}/chqr`;
  public static RS_DTCH = `${API_URL}/dtch`;
  public static RS_CRCJ = `${API_URL}/crcj`;
  public static RS_CCHQ = `${API_URL}/cchq`;
  public static RS_CEFC = `${API_URL}/cefc`;
  public static RS_CBRO = `${API_URL}/cbro`;
  public static RS_CRTN = `${API_URL}/crtn`;
  public static RS_CTRJ = `${API_URL}/ctrj`;
  public static RS_CTRN = `${API_URL}/ctrn`;
  public static RS_CNCL = `${API_URL}/cncl`;
  public static RS_CNBC = `${API_URL}/cnbc`;
  public static RS_DBCR = `${API_URL}/dbcr`;
  public static RS_DPST = `${API_URL}/dpst`;
  public static RS_DSDT = `${API_URL}/dsdt`;
  public static RS_DTCR = `${API_URL}/dtcr`;
  public static RS_DTCL = `${API_URL}/dtcl`;
  public static RS_DTDC = `${API_URL}/dtdc`;
  public static RS_DTDP = `${API_URL}/dtdp`;
  public static RS_PDRC = `${API_URL}/pdrc`;
  public static RS_CJIN = `${API_URL}/cjin`;
  public static RS_CNCH = `${API_URL}/cnch`;
  public static RS_DCHI = `${API_URL}/dchi`;
  public static RS_CMTV = `${API_URL}/cmtv`;
  public static RS_MVCB = `${API_URL}/mvcb`;
  public static RS_PGSS = `${API_URL}/pgss`;
  public static RS_PRSN = `${API_URL}/prsn`;
  public static RS_PRCC = `${API_URL}/prcc`;
  public static RS_PRRL = `${API_URL}/prrl`;
  public static RS_SLCB = `${API_URL}/slcb`;
  public static RS_PCNT = `${API_URL}/pcnt`;
  public static RS_TCBR = `${API_URL}/tcbr`;
  public static RS_TCCH = `${API_URL}/tcch`;
  public static RS_TCEF = `${API_URL}/tcef`;
  public static RS_TCRT = `${API_URL}/tcrt`;
  public static RS_TCTJ = `${API_URL}/tctj`;
  public static RS_TCTR = `${API_URL}/tctr`;
  public static RS_TDBC = `${API_URL}/tdbc`;
  public static RS_TCMT = `${API_URL}/tcmt`;
  public static RS_TPMT = `${API_URL}/tpmt`;
  public static RS_TPGS = `${API_URL}/tpgs`;
  public static RS_TRNS = `${API_URL}/trns`;
  public static RS_USXC = `${API_URL}/usxc`;
  public static RS_PMTV = `${API_URL}/pmtv`;
}
