import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface RegistroAporte {
  codigoAporte: string;
  descripcionAporte: string;
  codigo: string;
  nombre: string;
  plazoInicial: string;
  saldoActual: string;
  mesesPlazo: string;
  interesAnual: string;
  valorSeguro: string;
  totalDescontar: string;
  capitalDescontado: string;
  interesDescontado: string;
  seguroDescontado: string;
  totalDescontado: string;
  capitalNoDescontado: string;
  interesNoDescontado: string;
  desgravamenNoDescontado: string;
}

export interface AporteAgrupado {
  codigoAporte: string;
  descripcionAporte: string;
  registros: RegistroAporte[];
  totales: {
    saldoActual: number;
    interesAnual: number;
    valorSeguro: number;
    totalDescontar: number;
    capitalDescontado: number;
    interesDescontado: number;
    seguroDescontado: number;
    totalDescontado: number;
    capitalNoDescontado: number;
    interesNoDescontado: number;
    desgravamenNoDescontado: number;
  };
}

export interface ResultadoProcesamiento {
  aporteAgrupados: AporteAgrupado[];
  totalRegistros: number;
  totalesGenerales: {
    saldoActual: number;
    interesAnual: number;
    valorSeguro: number;
    totalDescontar: number;
    capitalDescontado: number;
    interesDescontado: number;
    seguroDescontado: number;
    totalDescontado: number;
    capitalNoDescontado: number;
    interesNoDescontado: number;
    desgravamenNoDescontado: number;
  };
  archivoUTF8: File;
}

@Injectable({
  providedIn: 'root'
})
export class ArchivoPetroService {

  constructor() { }

  /**
   * Lee y procesa un archivo Petro
   * Recibe el archivo ya leído como ISO-8859-1 desde el componente
   * @param file Archivo original (para reference)
   * @param nombreArchivo Nombre del archivo
   * @returns Promise con el resultado del procesamiento
   */
  async procesarArchivoPetro(file: File, nombreArchivo: string): Promise<ResultadoProcesamiento> {
    // Leer archivo como ArrayBuffer
    const arrayBuffer = await this.leerArchivoComoArrayBuffer(file);

    // Leer como ISO-8859-1 (el formato del archivo Petro)
    const decoder = new TextDecoder('iso-8859-1');
    const contenido = decoder.decode(new Uint8Array(arrayBuffer));

    console.log('📄 Procesando archivo Petro leído como ISO-8859-1');

    // Procesar contenido
    const registrosProcesados = this.procesarContenido(contenido);

    // Agrupar por código de aporte
    const aporteAgrupados = this.agruparPorAporte(registrosProcesados);

    // Calcular totales generales
    const totalesGenerales = this.calcularTotalesGenerales(aporteAgrupados);

    return {
      aporteAgrupados,
      totalRegistros: registrosProcesados.length,
      totalesGenerales,
      archivoUTF8: file // Retornar archivo original (el componente lo convertirá)
    };
  }

  /**
   * Lee un archivo como ArrayBuffer
   */
  private leerArchivoComoArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        resolve(e.target?.result as ArrayBuffer);
      };
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Procesa el contenido del archivo y extrae los registros
   */
  private procesarContenido(contenido: string): RegistroAporte[] {
    const lineas = contenido.split('\n');
    const registrosProcesados: RegistroAporte[] = [];
    let i = 0;

    while (i < lineas.length) {
      const lineaActual = lineas[i];

      if (lineaActual && lineaActual.trim().startsWith('EP')) {
        i += 8;
        if (i >= lineas.length) break;

        const lineaAporte = lineas[i];
        const codigoAporte = lineaAporte.substring(0, 4).trim();
        const descripcionAporte = lineaAporte.substring(4).trim();

        i++;
        i++;
        if (i >= lineas.length) break;

        while (i < lineas.length) {
          const lineaRegistro = lineas[i];

          if (lineaRegistro && lineaRegistro.trim().startsWith('EP')) {
            break;
          }

          if (lineaRegistro && lineaRegistro.trim().length > 0) {
            const registro: RegistroAporte = {
              codigoAporte: codigoAporte,
              descripcionAporte: descripcionAporte,
              codigo: this.extraerCampo(lineaRegistro, 0, 7).trim(),
              nombre: this.extraerCampo(lineaRegistro, 7, 44).trim(),
              plazoInicial: this.extraerCampo(lineaRegistro, 44, 50).trim(),
              saldoActual: this.extraerCampo(lineaRegistro, 50, 61).trim(),
              mesesPlazo: this.extraerCampo(lineaRegistro, 61, 65).trim(),
              interesAnual: this.extraerCampo(lineaRegistro, 65, 70).trim(),
              valorSeguro: this.extraerCampo(lineaRegistro, 70, 80).trim(),
              totalDescontar: this.extraerCampo(lineaRegistro, 80, 95).trim(),
              capitalDescontado: this.extraerCampo(lineaRegistro, 95, 110).trim(),
              interesDescontado: this.extraerCampo(lineaRegistro, 110, 125).trim(),
              seguroDescontado: this.extraerCampo(lineaRegistro, 125, 140).trim(),
              totalDescontado: this.extraerCampo(lineaRegistro, 140, 155).trim(),
              capitalNoDescontado: this.extraerCampo(lineaRegistro, 155, 170).trim(),
              interesNoDescontado: this.extraerCampo(lineaRegistro, 170, 184).trim(),
              desgravamenNoDescontado: this.extraerCampo(lineaRegistro, 184, 198).trim()
            };

            if (registro.codigo) {
              registrosProcesados.push(registro);
            }
          }

          i++;
        }

        continue;
      }

      i++;
    }

    return registrosProcesados;
  }

  /**
   * Extrae un campo de una línea
   */
  private extraerCampo(linea: string, inicio: number, fin: number): string {
    if (!linea) return '';
    const lineaCompleta = linea.padEnd(fin, ' ');
    return lineaCompleta.substring(inicio, fin);
  }

  /**
   * Agrupa registros por código de aporte
   */
  private agruparPorAporte(registrosProcesados: RegistroAporte[]): AporteAgrupado[] {
    const mapaAportes = new Map<string, AporteAgrupado>();

    registrosProcesados.forEach(registro => {
      const key = registro.codigoAporte;

      if (!mapaAportes.has(key)) {
        mapaAportes.set(key, {
          codigoAporte: registro.codigoAporte,
          descripcionAporte: registro.descripcionAporte,
          registros: [],
          totales: {
            saldoActual: 0,
            interesAnual: 0,
            valorSeguro: 0,
            totalDescontar: 0,
            capitalDescontado: 0,
            interesDescontado: 0,
            seguroDescontado: 0,
            totalDescontado: 0,
            capitalNoDescontado: 0,
            interesNoDescontado: 0,
            desgravamenNoDescontado: 0
          }
        });
      }

      const aporte = mapaAportes.get(key)!;
      aporte.registros.push(registro);

      aporte.totales.saldoActual += this.parseNumber(registro.saldoActual);
      aporte.totales.interesAnual += this.parseNumber(registro.interesAnual);
      aporte.totales.valorSeguro += this.parseNumber(registro.valorSeguro);
      aporte.totales.totalDescontar += this.parseNumber(registro.totalDescontar);
      aporte.totales.capitalDescontado += this.parseNumber(registro.capitalDescontado);
      aporte.totales.interesDescontado += this.parseNumber(registro.interesDescontado);
      aporte.totales.seguroDescontado += this.parseNumber(registro.seguroDescontado);
      aporte.totales.totalDescontado += this.parseNumber(registro.totalDescontado);
      aporte.totales.capitalNoDescontado += this.parseNumber(registro.capitalNoDescontado);
      aporte.totales.interesNoDescontado += this.parseNumber(registro.interesNoDescontado);
      aporte.totales.desgravamenNoDescontado += this.parseNumber(registro.desgravamenNoDescontado);
    });

    return Array.from(mapaAportes.values());
  }

  /**
   * Calcula totales generales
   */
  private calcularTotalesGenerales(aporteAgrupados: AporteAgrupado[]) {
    const totales = {
      saldoActual: 0,
      interesAnual: 0,
      valorSeguro: 0,
      totalDescontar: 0,
      capitalDescontado: 0,
      interesDescontado: 0,
      seguroDescontado: 0,
      totalDescontado: 0,
      capitalNoDescontado: 0,
      interesNoDescontado: 0,
      desgravamenNoDescontado: 0
    };

    aporteAgrupados.forEach(aporte => {
      totales.saldoActual += aporte.totales.saldoActual;
      totales.interesAnual += aporte.totales.interesAnual;
      totales.valorSeguro += aporte.totales.valorSeguro;
      totales.totalDescontar += aporte.totales.totalDescontar;
      totales.capitalDescontado += aporte.totales.capitalDescontado;
      totales.interesDescontado += aporte.totales.interesDescontado;
      totales.seguroDescontado += aporte.totales.seguroDescontado;
      totales.totalDescontado += aporte.totales.totalDescontado;
      totales.capitalNoDescontado += aporte.totales.capitalNoDescontado;
      totales.interesNoDescontado += aporte.totales.interesNoDescontado;
      totales.desgravamenNoDescontado += aporte.totales.desgravamenNoDescontado;
    });

    return totales;
  }

  /**
   * Convierte string a número manejando formatos europeos
   */
  parseNumber(valor: string): number {
    if (!valor || valor.trim() === '') return 0;

    let valorLimpio = valor.trim().replace(/\s/g, '');
    const tieneComa = valorLimpio.includes(',');
    const tienePunto = valorLimpio.includes('.');

    if (tieneComa && tienePunto) {
      valorLimpio = valorLimpio.replace(/\./g, '').replace(',', '.');
    } else if (tieneComa) {
      valorLimpio = valorLimpio.replace(',', '.');
    }

    const numero = parseFloat(valorLimpio);
    return isNaN(numero) ? 0 : numero;
  }

}
