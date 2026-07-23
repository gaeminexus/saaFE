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

  // --- Comprobantes de compra (recibidos de proveedores) ---
  public static RS_FCTC = `${API_URL}/fctc`; // FacturaCompra
  public static RS_DFCC = `${API_URL}/dfcc`; // DetalleFacturaCompra
  public static RS_PFCC = `${API_URL}/pfcc`; // PathFacturaCompra
  public static RS_FPFM = `${API_URL}/fpfm`; // FormaPagoFacturaCompra
  public static RS_LQCC = `${API_URL}/lqcc`; // LiquidacionCompraCompra
  public static RS_DLCM = `${API_URL}/dlcm`; // DetalleLiquidacionCompraCompra
  public static RS_PLCC = `${API_URL}/plcc`; // PathLiquidacionCompraCompra
  public static RS_FPLM = `${API_URL}/fplm`; // FormaPagoLiquidacionCompraCompra
  public static RS_NTCC = `${API_URL}/ntcc`; // NotaCreditoCompra
  public static RS_DTCC = `${API_URL}/dtcc`; // DetalleNotaCreditoCompra
  public static RS_PTCV = `${API_URL}/ptcv`; // PathNotaCreditoCompra
  public static RS_NTDC = `${API_URL}/ntdc`; // NotaDebitoCompra
  public static RS_DTDC = `${API_URL}/dtdc`; // DetalleNotaDebitoCompra
  public static RS_PTDC = `${API_URL}/ptdc`; // PathNotaDebitoCompra
  public static RS_RTCM = `${API_URL}/rtcm`; // RetencionCompra
  public static RS_DRCM = `${API_URL}/drcm`; // DetalleRetencionCompra
  public static RS_PRCM = `${API_URL}/prcm`; // PathRetencionCompra
  public static RS_RCV2 = `${API_URL}/rcv2`; // RetencionCompraV2

  // Bandeja electrónica (proceso de carga TXT-SRI)
  public static RS_CRTX = `${API_URL}/crtx`; // CargaArchivoTxt
  public static RS_DCTX = `${API_URL}/dctx`; // DetalleCargaTxt
  public static RS_DCXP = `${API_URL}/dcxp`; // DocumentoCxp

  // Datos SRI - CXP
  public static RS_LSRP = `${API_URL}/lsriCompra`; // Listados SRI CXP
  public static RS_TSRP = `${API_URL}/tsriCompra`; // Detalle SRI CXP

  // Negociaciones con Proveedores (PGS)
  public static RS_NGCP = `${API_URL}/ngcp`; // NegociacionProveedor
  public static RS_FPNG = `${API_URL}/fpng`; // FormaPagoNegociacion
  public static RS_PGNG = `${API_URL}/pgng`; // PagoNegociacion
  public static RS_ADNG = `${API_URL}/adng`; // AdendumNegociacion
  public static RS_PTNG = `${API_URL}/ptng`; // PathNegociacion







}


/*
export class ServiciosCxp {

    public static RS_APXM = http://localhost:8080/saa-backend/rest/apxm;

}
*/
