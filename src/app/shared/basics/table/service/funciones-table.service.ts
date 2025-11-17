import { Injectable } from '@angular/core';
import { DetalleRubroService } from '../../../services/detalle-rubro.service';
import { FieldFormat } from '../model/field-format-interface';
import { ColumnaTipo } from '../model/fields-constants';
import { FuncionesDatosService } from '../../../services/funciones-datos.service';

@Injectable({
  providedIn: 'root'
})
export class FuncionesTableService {

  constructor(
    public detalleRubroService: DetalleRubroService,
    public funciones: FuncionesDatosService,
  ) { }

  procesaCampo(row: any, reg: FieldFormat): string {
    if (!row || !reg?.column) {
      return '';
    }
    const column = reg.column;
    let resultado = row[column] ?? '';
    const cPunto = '.';
    const cGuion = '_';
    const puntos = this.numRepeticion(column, cPunto);
    const guiones = this.numRepeticion(column, cGuion);
    if (puntos > 1) { // para campos que leen de entidad
        if (guiones <= 1) { // para que ignore los campos de tipo combo que leen de entidad
          resultado = '';
          if (row[this.recuperaCampo(column, 0, cPunto)]) { // para validar que exista dato en el campo de tipo entidad
            switch (puntos) {
              case 2: {
                resultado = row[this.recuperaCampo(column, 0, cPunto)]
                            [this.recuperaCampo(column, 1, cPunto)];
                break;
              }
              case 3: {
                if (row[this.recuperaCampo(column, 0, cPunto)]
                    [this.recuperaCampo(column, 1, cPunto)]) {
                  resultado = row[this.recuperaCampo(column, 0, cPunto)]
                              [this.recuperaCampo(column, 1, cPunto)]
                              [this.recuperaCampo(column, 2, cPunto)];
                } else {
                  resultado = null;
                }
                break;
              }
              case 4: {
                if (row[this.recuperaCampo(column, 0, cPunto)]
                    [this.recuperaCampo(column, 1, cPunto)]
                    [this.recuperaCampo(column, 2, cPunto)]) {
                  resultado = row[this.recuperaCampo(column, 0, cPunto)]
                            [this.recuperaCampo(column, 1, cPunto)]
                            [this.recuperaCampo(column, 2, cPunto)]
                            [this.recuperaCampo(column, 3, cPunto)];
                } else {
                  resultado = null;
                }
                break;
              }
              case 5: {
                if (row[this.recuperaCampo(column, 0, cPunto)]
                    [this.recuperaCampo(column, 1, cPunto)]
                    [this.recuperaCampo(column, 2, cPunto)]
                    [this.recuperaCampo(column, 3, cPunto)]) {
                  resultado = row[this.recuperaCampo(column, 0, cPunto)]
                            [this.recuperaCampo(column, 1, cPunto)]
                            [this.recuperaCampo(column, 2, cPunto)]
                            [this.recuperaCampo(column, 3, cPunto)]
                            [this.recuperaCampo(column, 4, cPunto)];
                } else {
                  resultado = null;
                }
                break;
              }
              case 6: {
                if (row[this.recuperaCampo(column, 0, cPunto)]
                    [this.recuperaCampo(column, 1, cPunto)]
                    [this.recuperaCampo(column, 2, cPunto)]
                    [this.recuperaCampo(column, 3, cPunto)]
                    [this.recuperaCampo(column, 4, cPunto)]) {
                  resultado = row[this.recuperaCampo(column, 0, cPunto)]
                            [this.recuperaCampo(column, 1, cPunto)]
                            [this.recuperaCampo(column, 2, cPunto)]
                            [this.recuperaCampo(column, 3, cPunto)]
                            [this.recuperaCampo(column, 4, cPunto)]
                            [this.recuperaCampo(column, 5, cPunto)];
                } else {
                  resultado = null;
                }
                break;
              }
              default: {
                resultado = row[column];
                break;
              }
            }
          }
        }
    }
    if (guiones > 1) {
        const codRubro = +this.recuperaCampo(column, 1, cGuion);
        const nombreCampo = this.recuperaCampo(column, 2, cGuion);
        const puntosRubro = this.numRepeticion(nombreCampo, cPunto);

        let descripRubro = row[this.recuperaCampo(column, 2, cGuion)];
        if (puntosRubro > 1) {
          descripRubro = '';
          if (row[this.recuperaCampo(nombreCampo, 0, cPunto)]) { // Para validar que exista dato en el campo de tipo entidad
            puntosRubro === 2 ?
              descripRubro = row[this.recuperaCampo(nombreCampo, 0, cPunto)]
                                [this.recuperaCampo(nombreCampo, 1, cPunto)] :
            puntosRubro === 3 ?
              descripRubro = row[this.recuperaCampo(nombreCampo, 0, cPunto)]
                                [this.recuperaCampo(nombreCampo, 1, cPunto)]
                                [this.recuperaCampo(nombreCampo, 2, cPunto)] :
            puntosRubro === 4 ?
              descripRubro = row[this.recuperaCampo(nombreCampo, 0, cPunto)]
                                [this.recuperaCampo(nombreCampo, 1, cPunto)]
                                [this.recuperaCampo(nombreCampo, 2, cPunto)]
                                [this.recuperaCampo(nombreCampo, 3, cPunto)] :
              descripRubro = row[this.recuperaCampo(column, 2, cGuion)];
          }
        }
        resultado = this.detalleRubroService.getDescripcionByParentAndAlterno(codRubro, descripRubro);
    }
    switch (reg.fType) {
      case ColumnaTipo.MONEDA: {
        resultado = this.formatoCash(resultado);
        break;
      }
      case ColumnaTipo.FECHA_HORA: {
        resultado = this.funciones.formatoFecha(resultado, FuncionesDatosService.FECHA_HORA);
        break;
      }
      case ColumnaTipo.SOLO_FECHA: {
        resultado = this.funciones.formatoFecha(resultado, FuncionesDatosService.SOLO_FECHA);
        break;
      }
      case ColumnaTipo.PORCENTAJE: {
        resultado = this.funciones.nvl(resultado, 0).toFixed(2);
        resultado = resultado + '%';
        break;
      }
      case ColumnaTipo.CHECK: {
        if (resultado) {
          if (+resultado === 1) {
            resultado = '\u2B24';
          }
        } else {
          resultado = null;
        }
        break;
      }
      default: {
        resultado = this.funciones.tCase(resultado);
        break;
      }
    }
    return resultado;
  }

  formatoDate(dato: Date): string {
    let resultado = '';
    if (dato) {
      resultado = dato.toLocaleString('en-US', {
        weekday: 'short', // "Sat"
        month: 'long', // "June"
        day: '2-digit', // "01"
        year: 'numeric' // "2019"
      });
    }
    return resultado;
  }

  formatoCash(dato: number): string {
    let resultado = '';
    if (dato || dato === 0) {
      resultado = dato.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
      });
    }
    return resultado;
  }

  numRepeticion(cadena: string, caracter: string): number {
    return cadena.split(caracter).length;
  }

  recuperaCampo(cadena: string, posicion: number, caracter: string): string {
    const partes = cadena.split(caracter);
    return posicion < partes.length ? partes[posicion] : '';
  }

  darFormatoColumn(reg: FieldFormat, sizeTabla: string): string {
    let resultado = '';
    if (reg.fWidth) {
      resultado = resultado + reg.fWidth + ' ';
    }
    if (reg.fAlign) {
      resultado = resultado + reg.fAlign + ' ';
    }
    if (reg.fBold) {
      resultado = resultado + reg.fBold + ' ';
    }
    if (reg.fColor) {
      resultado = resultado + reg.fColor + ' ';
    }
    if (sizeTabla) {
      resultado = resultado + sizeTabla + ' ';
    }
    return resultado;
  }

  darFormatoHeader(reg: FieldFormat, sizeTabla: string): string {
    let resultado = '';
    if (reg.fWidth) {
      resultado = resultado + reg.fWidth + ' ';
    }
    if (reg.fAlign) {
      resultado = resultado + reg.fAlign + ' ';
    }
    if (reg.fBold) {
      resultado = resultado + reg.fBold + ' ';
    }
    if (sizeTabla) {
      resultado = resultado + sizeTabla + ' ';
    }
    return resultado;
  }

  darFormatoFila(filaSeleccionada: number, codigo: number, size: string, id: number): string {
    let resultado = '';
    if (filaSeleccionada === codigo) {
      resultado = resultado + 'highlight ';
    }
    if (size) {
      resultado = resultado + size + ' ';
    }
    if (id % 2 === 0) {
      resultado = resultado + 'par ';
    }
    return resultado;
  }

  darFormatoBotones(size: string): string {
    let resultado = '';
    if (size) {
      resultado = resultado + size + ' ';
    }
    return resultado;
  }

}
