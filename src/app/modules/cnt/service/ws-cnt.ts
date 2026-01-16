import { environment } from '../../../../environments/environment';

/*export class ServiciosDash {

  // RESTFULL SERVICES
  public static RS_NTRL = '/api/saa-backend/rest/ntrl';
  public static RS_PLNN = '/api/saa-backend/rest/plnn';
  public static RS_CNCS = '/api/saa-backend/rest/cncs';
  public static RS_PLNT = '/api/saa-backend/rest/plnt';
  public static RS_PLNS = '/api/saa-backend/rest/plns';
  public static RS_PRDO = '/api/saa-backend/rest/prdo';
  public static RS_DTPL = '/api/saa-backend/rest/dtpl';
  public static RS_DTMA = '/api/saa-backend/rest/dtma';
  public static RS_MYCC = '/api/saa-backend/rest/mycc';
  public static RS_DTMC = '/api/saa-backend/rest/dtmc';
  public static RS_DTAS = '/api/saa-backend/rest/dtas';
  public static RS_DTMY = '/api/saa-backend/rest/dtmy';
  public static RS_DTRP = '/api/saa-backend/rest/dtrp';
  public static RS_RDTC = '/api/saa-backend/rest/rdtc';
  public static RS_ASNH = '/api/saa-backend/rest/asnh';
  public static RS_DTAH = '/api/saa-backend/rest/dtah';
  public static RS_DTMH = '/api/saa-backend/rest/dtmh';
  public static RS_MYRH = '/api/saa-backend/rest/myrh';
  public static RS_MTCH = '/api/saa-backend/rest/mtch';
  public static RS_MYAN = '/api/saa-backend/rest/myan';
  public static RS_MYRZ = '/api/saa-backend/rest/myrz';
  public static RS_MYRC = '/api/saa-backend/rest/myrc';
  public static RS_RPRT = '/api/saa-backend/rest/rprt';
  public static RS_RCNC = '/api/saa-backend/rest/rcnc';

}*/

const API_URL = environment.apiUrl;

export class ServiciosCnt {

  // RESTFULL SERVICES - Configuración dinámica según ambiente
  public static RS_NTRL = `${API_URL}/ntrl`;
  public static RS_PLNN = `${API_URL}/plnn`;
  public static RS_CNCS = `${API_URL}/cncs`;
  public static RS_PLNT = `${API_URL}/plnt`;
  public static RS_PLNS = `${API_URL}/plns`;
  public static RS_PRDO = `${API_URL}/prdo`;
  public static RS_DTPL = `${API_URL}/dtpl`;
  public static RS_DTMA = `${API_URL}/dtma`;
  public static RS_MYCC = `${API_URL}/mycc`;
  public static RS_DTMC = `${API_URL}/dtmc`;
  public static RS_DTAS = `${API_URL}/dtas`;
  public static RS_DTMY = `${API_URL}/dtmy`;
  public static RS_DTRP = `${API_URL}/dtrp`;
  public static RS_RDTC = `${API_URL}/rdtc`;
  public static RS_ASNT = `${API_URL}/asnt`;
  public static RS_ASNH = `${API_URL}/asnh`;
  public static RS_DTAH = `${API_URL}/dtah`;
  public static RS_DTMH = `${API_URL}/dtmh`;
  public static RS_MYRH = `${API_URL}/myrh`;
  public static RS_MTCH = `${API_URL}/mtch`;
  public static RS_MYAN = `${API_URL}/myan`;
  public static RS_MYRZ = `${API_URL}/myrz`;
  public static RS_MYRC = `${API_URL}/myrc`;
  public static RS_RPRT = `${API_URL}/rprt`;
  public static RS_RCNC = `${API_URL}/rcnc`;
  public static RS_SLDS = `${API_URL}/slds`;


}
