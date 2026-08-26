import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { guardarArchivo } from '../../../shared/services/descarga-reporte';
import {
  GeneracionArchivoPetro,
  ResultadoEliminacionPetro,
} from '../model/generacion-archivo-petro';
import { GeneracionArchivoPetroService } from './generacion-archivo-petro.service';

const NOMBRES_MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
];

/**
 * Descarga y eliminación de una generación Petro. Vive aparte porque la
 * pantalla de consulta y la de detalle tienen que comportarse igual: la
 * descarga marca la generación en el backend y hay que refrescarla después,
 * y la eliminación es física e irreversible, así que siempre se confirma.
 */
@Injectable({ providedIn: 'root' })
export class AccionesGeneracionPetroService {
  private gnapS = inject(GeneracionArchivoPetroService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  /** Queda como auditoría de quién sacó el archivo del sistema. */
  usuarioSesion(): string {
    return (
      sessionStorage.getItem('userName')
      || localStorage.getItem('userName')
      || localStorage.getItem('usuario')
      || 'sistema'
    ).trim();
  }

  etiquetaPeriodo(gen: GeneracionArchivoPetro | null | undefined): string {
    if (!gen) return '';
    const mes = NOMBRES_MESES[(Number(gen.mesPeriodo) || 0) - 1] ?? `MES ${gen.mesPeriodo}`;
    return `${mes} ${gen.anioPeriodo}`;
  }

  /**
   * Descarga el TXT por el endpoint que estampa la marca y devuelve la
   * generación ya refrescada, para que la pantalla deshabilite "Eliminar".
   * Devuelve null si la descarga falló (el mensaje ya se mostró).
   */
  descargar(gen: GeneracionArchivoPetro): Observable<GeneracionArchivoPetro | null> {
    const codigo = gen?.codigo;
    if (!codigo) {
      this.snackBar.open('La generación no tiene código para descargar', 'Cerrar', { duration: 4000 });
      return of(null);
    }

    return this.gnapS.descargarArchivo(codigo, this.usuarioSesion()).pipe(
      switchMap((archivo) => {
        // Si el backend está en otro host, Content-Disposition puede no leerse:
        // en ese caso vale el nombre que ya trae la generación.
        const nombre = archivo.nombreArchivo
          || gen.nombreArchivo
          || `DESCUENTOS_PETRO_${codigo}.txt`;
        guardarArchivo(archivo.blob, nombre);
        this.snackBar.open('Archivo descargado', 'Cerrar', { duration: 3000 });

        // La generación quedó marcada: hay que releerla o el botón Eliminar
        // seguiría habilitado y el usuario recibiría un 409.
        return this.gnapS.getById(String(codigo)).pipe(catchError(() => of(null)));
      }),
      catchError((err: Error) => {
        this.snackBar.open(err.message, 'Cerrar', { duration: 7000 });
        return of(null);
      })
    );
  }

  /**
   * Pide confirmación explícita y elimina. Devuelve null si el usuario canceló
   * o si el backend la rechazó (409 con el motivo ya redactado).
   */
  eliminar(gen: GeneracionArchivoPetro): Observable<ResultadoEliminacionPetro | null> {
    const codigo = gen?.codigo;
    if (!codigo) {
      return of(null);
    }

    const data: ConfirmDialogData = {
      title: 'Eliminar generación',
      message:
        `¿Eliminar la generación de ${this.etiquetaPeriodo(gen)}? Se borrarán la cabecera, `
        + 'su detalle completo y el archivo TXT. Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger',
      details: [
        { label: 'Código', value: String(codigo) },
        { label: 'Archivo', value: gen.nombreArchivo || 'Sin archivo generado' },
        { label: 'Registros', value: String(gen.totalRegistros ?? 0) },
      ],
    };

    return this.dialog
      .open(ConfirmDialogComponent, { width: '520px', data })
      .afterClosed()
      .pipe(
        switchMap((confirmado) => {
          if (!confirmado) return of(null);

          return this.gnapS.eliminar(codigo, this.usuarioSesion()).pipe(
            map((resultado) => {
              // archivoEliminado:false solo significa que el TXT ya no estaba
              // en disco; los registros sí se borraron, no es una advertencia.
              this.snackBar.open(
                resultado?.mensaje ?? 'Generación eliminada exitosamente.',
                'Cerrar',
                { duration: 6000 }
              );
              return resultado;
            }),
            catchError((err: Error) => {
              this.snackBar.open(err.message, 'Cerrar', { duration: 9000 });
              return of(null);
            })
          );
        })
      );
  }
}
