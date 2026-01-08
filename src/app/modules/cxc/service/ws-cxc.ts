import { HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

const API_URL = environment.apiUrl;

export class ServiciosCxc {

  // RESTFULL SERVICES - Configuración dinámica según ambiente
public static RS_CCIC = `${API_URL}/ccic`;
public static RS_CXDC = `${API_URL}/cxdc`;
public static RS_DTDC = `${API_URL}/dtdc`;
public static RS_DCMC = `${API_URL}/dcmc`;
public static RS_FXDC = `${API_URL}/fxdc`;
public static RS_GRPC = `${API_URL}/grpc`;
public static RS_IXGC = `${API_URL}/ixgc`;
public static RS_PAFC = `${API_URL}/pafc`;
public static RS_PRDC = `${API_URL}/prdc`;
public static RS_RVDC = `${API_URL}/rvdc`;
public static RS_TCIC = `${API_URL}/tcic`;
public static RS_TCDC = `${API_URL}/tcdc`;
public static RS_TDTC = `${API_URL}/tctc`;
public static RS_TDCC = `${API_URL}/tdcc`;
public static RS_TFDC = `${API_URL}/tfdc`;
public static RS_TPFC = `${API_URL}/tpfc`;
public static RS_TRDC = `${API_URL}/trdc`;
public static RS_TITC = `${API_URL}/titc`;
public static RS_TIDC = `${API_URL}/tidc`;
public static RS_VITC = `${API_URL}/vitc`;
public static RS_VIDC = `${API_URL}/vidc`;


}
