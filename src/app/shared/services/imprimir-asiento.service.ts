import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { JasperReportesService } from './jasper-reportes.service';
import { guardarArchivo, mensajeReporteFallido } from './descarga-reporte';

/**
 * Imprime el asiento contable con la plantilla oficial de Contabilidad (`RPRT_ASNT_CNTB`), desde
 * cualquier pantalla que lo haya generado — docs/cnt/DISENO-IMPRIMIR-ASIENTO-DESDE-ORIGEN.md.
 * Lógica sacada de `cxp/forms/pagos/pagos-transferencia/pagos-transferencia.component.ts:1020-1049`
 * (y su gemela en `tsr/forms/pagos-transferencia/consulta/consulta.component.ts:265-300`), que
 * siguen con su propia copia sin tocar — este servicio es para los llamadores nuevos.
 */
@Injectable({ providedIn: 'root' })
export class ImprimirAsientoService {
  private jasperS = inject(JasperReportesService);

  /**
   * ⚠️ `codigoAsiento` es el CÓDIGO (PK) del asiento, no el número alterno — es lo que exige el
   * parámetro `P_ASNTCDGO` del reporte. `numeroAlterno`, si se tiene, solo se usa para nombrar el
   * archivo descargado.
   */
  imprimir(codigoAsiento: number, numeroAlterno?: string): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.jasperS.generar('cnt', 'RPRT_ASNT_CNTB', {
        P_PATH: '',
        P_REPORTE: 'ASIENTO',
        P_ASNTCDGO: codigoAsiento,
        P_IMAGEN: null,
      }).subscribe({
        next: (blob) => {
          guardarArchivo(blob, `asiento-${numeroAlterno || codigoAsiento}.pdf`);
          subscriber.next();
          subscriber.complete();
        },
        error: (err) => {
          mensajeReporteFallido(err).then((mensaje) => subscriber.error(new Error(mensaje)));
        },
      });
    });
  }
}
