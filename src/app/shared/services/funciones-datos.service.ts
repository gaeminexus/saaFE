import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { DetalleRubroService } from './detalle-rubro.service';

const FECHA_HORA = 1;
const SOLO_FECHA = 2;

@Injectable({
  providedIn: 'root'
})
export class FuncionesDatosService {

  public static FECHA_HORA = 1;
  public static SOLO_FECHA = 2;

  constructor(
    private datePipe: DatePipe,
    public detalleRubroService: DetalleRubroService,
  ) { }

  tCase(str1: any): string {
    let str = '';
    if (str1) {
      str = str1.toString();
    }
    let newStr = '';
    if (str) {
      newStr = str.toUpperCase();
    }
    return newStr;
  }

  tLowCase(str1: any): string {
    let str = '';
    if (str1) {
      str = str1.toString();
    }
    let newStr = '';
    if (str) {
      newStr = str.toLowerCase();
    }
    return newStr;
  }

  nvl(valor: any, campo: any): any {
    let resultado: any;
    if (valor) {
      resultado = valor;
    } else {
      resultado = campo;
    }
    return resultado;
  }

  mostrarSoloNumeros(evento: any): boolean{
    let continuar = false;
    if (evento.keyCode === 46){
      continuar = true;
    }
    if ((evento.keyCode >= 48) && (evento.keyCode <= 57)){
      continuar = true;
    }
    return continuar;
  }

  formatoFecha(fecha: any, tipo: number): string{
    let fechaFac: Date|null;
    let strFecha = '';
    if (typeof fecha === 'undefined'){
      fechaFac = null;
    }else{
      if (tipo === 2){
        fecha = fecha + 'T12:00:00';
      }
      fechaFac = new Date(fecha);
    }
    if (fechaFac){
      /* 1 ***  DD-MM-YYYY / HH:mm  *** */
      if (tipo === FECHA_HORA){
        strFecha = fechaFac.getDate().toString().padStart(2, '0') + '-' +
        (fechaFac.getMonth() + 1).toString().padStart(2, '0') + '-' +
        fechaFac.getFullYear() + ' / ' +
        fechaFac.getHours().toString().padStart(2, '0') + ':' +
        fechaFac.getMinutes().toString().padStart(2, '0');
      }
      /* 2 ***  DD-MM-YYYY *** */
      if (tipo === SOLO_FECHA){
        strFecha = fechaFac.getDate().toString().padStart(2, '0') + '-' +
        (fechaFac.getMonth() + 1).toString().padStart(2, '0') + '-' +
        fechaFac.getFullYear();
      }
    }
    return strFecha;
  }

  formatoFechaOrigenConHora(fecha: any, tipo: number): string{
    let fechaFac: Date|null;
    let strFecha = '';
    if (typeof fecha === 'undefined'){
      fechaFac = null;
    }else{
      fechaFac = new Date(fecha);
    }
    if (fechaFac){
      /* 1 ***  DD-MM-YYYY / HH:mm  *** */
      if (tipo === FECHA_HORA){
        strFecha = fechaFac.getDate().toString().padStart(2, '0') + '-' +
        (fechaFac.getMonth() + 1).toString().padStart(2, '0') + '-' +
        fechaFac.getFullYear() + ' / ' +
        fechaFac.getHours().toString().padStart(2, '0') + ':' +
        fechaFac.getMinutes().toString().padStart(2, '0');
      }
      /* 2 ***  DD-MM-YYYY *** */
      if (tipo === SOLO_FECHA){
        strFecha = fechaFac.getDate().toString().padStart(2, '0') + '-' +
        (fechaFac.getMonth() + 1).toString().padStart(2, '0') + '-' +
        fechaFac.getFullYear();
      }
    }
    return strFecha;
  }

}
