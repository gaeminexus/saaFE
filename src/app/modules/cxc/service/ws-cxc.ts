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
public static RS_PCCC = `${API_URL}/pccc`;
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

// Facturación Electrónica
public static RS_FCDR = `${API_URL}/fcdr`;  // Facturador
public static RS_ESTB = `${API_URL}/estb`;  // Establecimiento
public static RS_PTEM = `${API_URL}/ptem`;  // Punto de Emisión
public static RS_NXPE = `${API_URL}/nxpe`;  // Numeración por Punto de Emisión

// Datos SRI
public static RS_LSRI = `${API_URL}/lsri`;  // Listados SRI
public static RS_TSRI = `${API_URL}/tsri`;  // Detalle SRI

// Emisión Documentos Tributarios
public static RS_FCTR = `${API_URL}/fctr`;  // Factura
public static RS_ANTC = `${API_URL}/antc`;  // Anticipo cliente
public static RS_DTFC = `${API_URL}/dtfc`;  // Detalle Factura
public static RS_NTCR = `${API_URL}/ntcr`;  // Nota Crédito
public static RS_DTNC = `${API_URL}/dtnc`;  // Detalle Nota Crédito
public static RS_NTDB = `${API_URL}/ntdb`;  // Nota Débito
public static RS_DTND = `${API_URL}/dtnd`;  // Detalle Nota Débito
public static RS_LQCS = `${API_URL}/lqcs`;  // Liquidación compras
public static RS_DTLC = `${API_URL}/dtlc`;  // Detalle Liquidación
public static RS_RTNC = `${API_URL}/rtnc`;  // Retención v1
public static RS_DTRT = `${API_URL}/dtrt`;  // Detalle Retención v1
public static RS_RTV2 = `${API_URL}/rtv2`;  // Retención v2
public static RS_DRV2 = `${API_URL}/drv2`;  // Detalle Retención v2


}
