/*export class ServiciosShare {

  // RESTFULL SERVICES
  public static RS_ANIO = '/api/saa-backend/rest/anio';
  public static RS_USRO = '/api/saa-backend/rest/usro';
  public static RS_PDTR = '/api/saa-backend/rest/pdtr';
  public static RS_FILE = '/api/saa-backend/rest/file';

}*/

export class ServiciosShare {

  // RESTFULL SERVICES
  public static RS_ANIO = 'http://localhost:8080/saa-backend/rest/anio';
  public static RS_USRO = 'http://localhost:8080/saa-backend/rest/usro';
  public static RS_PDTR = 'http://localhost:8080/saa-backend/rest/pdtr';
  public static RS_FILE = 'http://localhost:8080/saa-backend/rest/file';


}
// Servicios para pruebas locales
/*
export class ServiciosAot {

  // RESTFULL SERVICES
  public static RS_ANIO = 'http://gs-et01:8080/AotBEP/jaxrs/anio';
  public static RS_TPMT = 'http://gs-et01:8080/AotBEP/jaxrs/tpmt';
  public static RS_MTXT = 'http://gs-et01:8080/AotBEP/jaxrs/mtxt';
  public static RS_FRMT = 'http://gs-et01:8080/AotBEP/jaxrs/frmt';
  public static RS_PRMT = 'http://gs-et01:8080/AotBEP/jaxrs/prmt';
  public static RS_DTPM = 'http://gs-et01:8080/AotBEP/jaxrs/dtpm';
  public static RS_SDXP = 'http://gs-et01:8080/AotBEP/jaxrs/sdxp';
  public static RS_ESTC = 'http://gs-et01:8080/AotBEP/jaxrs/estc';
  public static RS_EXPM = 'http://gs-et01:8080/AotBEP/jaxrs/expm';
  public static RS_CLND = 'http://gs-et01:8080/AotBEP/jaxrs/clnd';
  public static RS_MRCA = 'http://gs-et01:8080/AotBEP/jaxrs/mrca';
  public static RS_MDLO = 'http://gs-et01:8080/AotBEP/jaxrs/mdlo';
  public static RS_MXMT = 'http://gs-et01:8080/AotBEP/jaxrs/mxmt';
  public static RS_VETM = 'http://gs-et01:8080/AotBEP/jaxrs/vetm';
  public static RS_RPST = 'http://gs-et01:8080/AotBEP/jaxrs/rpst';
  public static RS_MRRP = 'http://gs-et01:8080/AotBEP/jaxrs/mrrp';
  public static RS_MDRP = 'http://gs-et01:8080/AotBEP/jaxrs/mdrp';
  public static RS_INSM = 'http://gs-et01:8080/AotBEP/jaxrs/insm';
  public static RS_PRVD = 'http://gs-et01:8080/AotBEP/jaxrs/prvd';
  public static RS_PZFL = 'http://gs-et01:8080/AotBEP/jaxrs/pzfl';
  public static RS_TPOP = 'http://gs-et01:8080/AotBEP/jaxrs/tpop';
  public static RS_OPRR = 'http://gs-et01:8080/AotBEP/jaxrs/oprr';
  public static RS_OPTF = 'http://gs-et01:8080/AotBEP/jaxrs/optf';
  public static RS_TRBJ = 'http://gs-et01:8080/AotBEP/jaxrs/trbj';
  public static RS_TPCS = 'http://gs-et01:8080/AotBEP/jaxrs/tpcs';
  public static RS_CSTR = 'http://gs-et01:8080/AotBEP/jaxrs/cstr';
  public static RS_TPMR = 'http://gs-et01:8080/AotBEP/jaxrs/tpmr';
  public static RS_MTRB = 'http://gs-et01:8080/AotBEP/jaxrs/mtrb';
  public static RS_RTRB = 'http://gs-et01:8080/AotBEP/jaxrs/rtrb';
  public static RS_OTSG = 'http://gs-et01:8080/AotBEP/jaxrs/otsg';
  public static RS_TRAA = 'http://gs-et01:8080/AotBEP/jaxrs/traa';
  public static RS_ANTR = 'http://gs-et01:8080/AotBEP/jaxrs/antr';
  public static RS_BTCR = 'http://gs-et01:8080/AotBEP/jaxrs/btcr';
  public static RS_CRXO = 'http://gs-et01:8080/AotBEP/jaxrs/crxo';
  public static RS_CSTT = 'http://gs-et01:8080/AotBEP/jaxrs/cstt';
  public static RS_DNOO = 'http://gs-et01:8080/AotBEP/jaxrs/dnoo';
  public static RS_DXSD = 'http://gs-et01:8080/AotBEP/jaxrs/dxsd';
  public static RS_DTNO = 'http://gs-et01:8080/AotBEP/jaxrs/dtno';
  public static RS_RXTR = 'http://gs-et01:8080/AotBEP/jaxrs/rxtr';
  public static RS_TRXT = 'http://gs-et01:8080/AotBEP/jaxrs/trxt';
  public static RS_TRXD = 'http://gs-et01:8080/AotBEP/jaxrs/trxd';
  public static RS_NMOR = 'http://gs-et01:8080/AotBEP/jaxrs/nmor';
  public static RS_MTRN = 'http://gs-et01:8080/AotBEP/jaxrs/mtrn';
  public static RS_INXO = 'http://gs-et01:8080/AotBEP/jaxrs/inxo';

  public static WS_IPUS = 'https://api.ipify.org/?format=json';

  public static RS_MDXR = 'http://gs-et01:8080/AotBEP/jaxrs/mdxr';

  // SERVICIOS BASICOS
  public static RS_PDTR = 'http://gs-et01:8080/AotBEP/jaxrs/pdtr';
  public static RS_USRO = 'http://gs-et01:8080/AotBEP/jaxrs/usro';
  public static RS_AUXO = 'http://gs-et01:8080/AotBEP/jaxrs/auxo';
  public static RS_CLNT = 'http://gs-et01:8080/AotBEP/jaxrs/clnt';
  public static RS_CNTC = 'http://gs-et01:8080/AotBEP/jaxrs/cntc';
  public static RS_CTXP = 'http://gs-et01:8080/AotBEP/jaxrs/ctxp';
  public static RS_DXSO = 'http://gs-et01:8080/AotBEP/jaxrs/dxso';
  public static RS_DTAR = 'http://gs-et01:8080/AotBEP/jaxrs/dtar';
  public static RS_DTCT = 'http://gs-et01:8080/AotBEP/jaxrs/dtct';
  public static RS_DPXO = 'http://gs-et01:8080/AotBEP/jaxrs/dpxo';
  public static RS_DTRI = 'http://gs-et01:8080/AotBEP/jaxrs/dtri';
  public static RS_DRPF = 'http://gs-et01:8080/AotBEP/jaxrs/drpf';
  public static RS_DTRR = 'http://gs-et01:8080/AotBEP/jaxrs/dtrr';
  public static RS_DRPM = 'http://gs-et01:8080/AotBEP/jaxrs/drpm';
  public static RS_ORDN = 'http://gs-et01:8080/AotBEP/jaxrs/ordn';
  public static RS_PMXO = 'http://gs-et01:8080/AotBEP/jaxrs/pmxo';
  public static RS_TDXO = 'http://gs-et01:8080/AotBEP/jaxrs/tdxo';
  public static RS_RTXO = 'http://gs-et01:8080/AotBEP/jaxrs/rtxo';
  public static RS_PFXO = 'http://gs-et01:8080/AotBEP/jaxrs/pfxo';
  public static RS_SDPO = 'http://gs-et01:8080/AotBEP/jaxrs/sdpo';
  public static RS_PRMM = 'http://gs-et01:8080/AotBEP/jaxrs/prmm';
  public static RS_STRA = 'http://gs-et01:8080/AotBEP/jaxrs/stra';
  public static RS_SRPA = 'http://gs-et01:8080/AotBEP/jaxrs/srpa';
  public static RS_ORET = 'http://gs-et01:8080/AotBEP/jaxrs/oret';
  public static RS_PCXC = 'http://gs-et01:8080/AotBEP/jaxrs/pcxc';

  // VISTAS
  public static RS_VTTTO = 'http://gs-et01:8080/AotBEP/jaxrs/vttto';
  public static RS_VRTTO = 'http://gs-et01:8080/AotBEP/jaxrs/vrtto';

  // WEBSERVICES SOAP
  public static WS_MRCA = 'http://gs-et01:8080/AotBEP/MarcaMotoresWSService';

}
*/
/*
export class ServiciosAot {

  // RESTFULL SERVICES
  public static RS_ANIO = '../AotBEP/jaxrs/anio';
  public static RS_TPMT = '../AotBEP/jaxrs/tpmt';
  public static RS_MTXT = '../AotBEP/jaxrs/mtxt';
  public static RS_FRMT = '../AotBEP/jaxrs/frmt';
  public static RS_PRMT = '../AotBEP/jaxrs/prmt';
  public static RS_DTPM = '../AotBEP/jaxrs/dtpm';
  public static RS_SDXP = '../AotBEP/jaxrs/sdxp';
  public static RS_ESTC = '../AotBEP/jaxrs/estc';
  public static RS_EXPM = '../AotBEP/jaxrs/expm';
  public static RS_CLND = '../AotBEP/jaxrs/clnd';
  public static RS_MRCA = '../AotBEP/jaxrs/mrca';
  public static RS_MDLO = '../AotBEP/jaxrs/mdlo';
  public static RS_MXMT = '../AotBEP/jaxrs/mxmt';
  public static RS_VETM = '../AotBEP/jaxrs/vetm';
  public static RS_RPST = '../AotBEP/jaxrs/rpst';
  public static RS_MRRP = '../AotBEP/jaxrs/mrrp';
  public static RS_MDRP = '../AotBEP/jaxrs/mdrp';
  public static RS_INSM = '../AotBEP/jaxrs/insm';
  public static RS_PRVD = '../AotBEP/jaxrs/prvd';
  public static RS_PZFL = '../AotBEP/jaxrs/pzfl';
  public static RS_TPOP = '../AotBEP/jaxrs/tpop';
  public static RS_OPRR = '../AotBEP/jaxrs/oprr';
  public static RS_OPTF = '../AotBEP/jaxrs/optf';
  public static RS_TRBJ = '../AotBEP/jaxrs/trbj';
  public static RS_TPCS = '../AotBEP/jaxrs/tpcs';
  public static RS_CSTR = '../AotBEP/jaxrs/cstr';
  public static RS_TPMR = '../AotBEP/jaxrs/tpmr';
  public static RS_MTRB = '../AotBEP/jaxrs/mtrb';
  public static RS_RTRB = '../AotBEP/jaxrs/rtrb';
  public static RS_OTSG = '../AotBEP/jaxrs/otsg';
  public static RS_TRAA = '../AotBEP/jaxrs/traa';
  public static RS_ANTR = '../AotBEP/jaxrs/antr';
  public static RS_BTCR = '../AotBEP/jaxrs/btcr';
  public static RS_CRXO = '../AotBEP/jaxrs/crxo';
  public static RS_CSTT = '../AotBEP/jaxrs/cstt';
  public static RS_DNOO = '../AotBEP/jaxrs/dnoo';
  public static RS_DXSD = '../AotBEP/jaxrs/dxsd';
  public static RS_DTNO = '../AotBEP/jaxrs/dtno';
  public static RS_RXTR = '../AotBEP/jaxrs/rxtr';
  public static RS_TRXT = '../AotBEP/jaxrs/trxt';
  public static RS_TRXD = '../AotBEP/jaxrs/trxd';
  public static RS_NMOR = '../AotBEP/jaxrs/nmor';
  public static RS_MTRN = '../AotBEP/jaxrs/mtrn';
  public static RS_INXO = '../AotBEP/jaxrs/inxo';
  public static RS_REPO = '../AotBEP/jaxrs/repor';

  public static WS_IPUS = 'https://api.ipify.org/?format=json';

  public static RS_MDXR = '../AotBEP/jaxrs/mdxr';

  // SERVICIOS BASICOS
  public static RS_PDTR = '../AotBEP/jaxrs/pdtr';
  public static RS_USRO = '../AotBEP/jaxrs/usro';
  public static RS_AUXO = '../AotBEP/jaxrs/auxo';
  public static RS_CLNT = '../AotBEP/jaxrs/clnt';
  public static RS_CNTC = '../AotBEP/jaxrs/cntc';
  public static RS_CTXP = '../AotBEP/jaxrs/ctxp';
  public static RS_DXSO = '../AotBEP/jaxrs/dxso';
  public static RS_DTAR = '../AotBEP/jaxrs/dtar';
  public static RS_DTCT = '../AotBEP/jaxrs/dtct';
  public static RS_DPXO = '../AotBEP/jaxrs/dpxo';
  public static RS_DTRI = '../AotBEP/jaxrs/dtri';
  public static RS_DRPF = '../AotBEP/jaxrs/drpf';
  public static RS_DTRR = '../AotBEP/jaxrs/dtrr';
  public static RS_DRPM = '../AotBEP/jaxrs/drpm';
  public static RS_ORDN = '../AotBEP/jaxrs/ordn';
  public static RS_PMXO = '../AotBEP/jaxrs/pmxo';
  public static RS_TDXO = '../AotBEP/jaxrs/tdxo';
  public static RS_RTXO = '../AotBEP/jaxrs/rtxo';
  public static RS_PFXO = '../AotBEP/jaxrs/pfxo';
  public static RS_SDPO = '../AotBEP/jaxrs/sdpo';
  public static RS_PRMM = '../AotBEP/jaxrs/prmm';
  public static RS_STRA = '../AotBEP/jaxrs/stra';
  public static RS_SRPA = '../AotBEP/jaxrs/srpa';
  public static RS_ORET = '../AotBEP/jaxrs/oret';
  public static RS_PCXC = '../AotBEP/jaxrs/pcxc';
  public static RS_CMST = '../AotBEP/jaxrs/cmst';
  public static RS_CLXC = '../AotBEP/jaxrs/clxc';

  // VISTAS
  public static RS_VTTTO = '../AotBEP/jaxrs/vttto';
  public static RS_VRTTO = '../AotBEP/jaxrs/vrtto';

  // CARGA ARCHIVOS
  public static RS_UPFL = '../AotBEP/jaxrs/upfl';

  // WEBSERVICES SOAP
  public static WS_MRCA = '../AotBEP/MarcaMotoresWSService';
}
*/
