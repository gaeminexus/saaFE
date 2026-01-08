import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const API_URL = environment.apiUrl;

export class ServiciosCxp {

  // RESTFULL SERVICES - Configuración dinámica según ambiente
  public static RS_APXM = `${API_URL}/apxm`;
  public static RS_AXPR = `${API_URL}/axpr`;
  public static RS_CCIP = `${API_URL}/ccip`;
  public static RS_CXDP = `${API_URL}/cxdp`;
  public static RS_DTDP = `${API_URL}/dtdp`;
  public static RS_DCMP = `${API_URL}/dcmp`;
  public static RS_FXDP = `${API_URL}/fxdp`;
  public static RS_GRPP = `${API_URL}/grpp`;
  public static RS_IXGP = `${API_URL}/ixgp`;
  public static RS_MNAP = `${API_URL}/mnap`;
  public static RS_PAFP = `${API_URL}/pafp`;
  public static RS_PRDP = `${API_URL}/prdp`;
  public static RS_PRPD = `${API_URL}/prpd`;
  public static RS_RVDP = `${API_URL}/rvdp`;
  public static RS_TIDP = `${API_URL}/tidp`;
  public static RS_TAPX = `${API_URL}/tapx`;
  public static RS_TCIP = `${API_URL}/tcip`;
  public static RS_TCDP = `${API_URL}/tcdp`;
  public static RS_TDTP = `${API_URL}/tdtp`;
  public static RS_TDCP = `${API_URL}/tdcp`;
  public static RS_TFDP = `${API_URL}/tfdp`;
  public static RS_TMNA = `${API_URL}/tmna`;
  public static RS_TPFP = `${API_URL}/tpfp`;
  public static RS_TRDP = `${API_URL}/trdp`;
  public static RS_TUXA = `${API_URL}/tuxa`;
  public static RS_TITP = `${API_URL}/titp`;
  public static RS_UXAP = `${API_URL}/uxap`;
  public static RS_VITP = `${API_URL}/vitp`;
  public static RS_VIDP = `${API_URL}/vidp`;







}


/*
export class ServiciosCxp {

    public static RS_APXM = http://localhost:8080/saa-backend/rest/apxm;

}
*/
