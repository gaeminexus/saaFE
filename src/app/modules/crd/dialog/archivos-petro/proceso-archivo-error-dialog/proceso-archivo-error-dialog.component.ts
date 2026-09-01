import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, computed, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { ExportService } from '../../../../../shared/services/export.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { NovedadParticipeCarga } from '../../../model/novedad-participe-carga';
import {
  EstadisticasNovedadesCarga,
  NovedadParticipeCargaService,
} from '../../../service/novedad-participe-carga.service';

interface DialogData {
  idCarga: number;
  /** Mensaje del servidor tal cual llegó (`{"mensaje": "..."}` ya desenvuelto por `mensajeDeError`). */
  mensaje: string;
}

/**
 * Diálogo de error al procesar un archivo Petro (pedido del usuario 2026-08-31).
 *
 * El mensaje del servidor es un texto armado por concatenación en el backend: lista hasta 20
 * novedades y corta con "y N más" — ni siquiera contiene todas las que hacen falta para el CSV.
 * Por eso este diálogo NO lo parsea: muestra ese mensaje como encabezado (es el resumen de "qué
 * pasó") y pide el detalle completo, sin truncar, a `GET /rest/nvpc/getByCargaArchivo/{idCarga}`
 * (verificado leyendo `NovedadParticipeCargaRest.java`).
 */
@Component({
  selector: 'app-proceso-archivo-error-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './proceso-archivo-error-dialog.component.html',
  styleUrl: './proceso-archivo-error-dialog.component.scss',
})
export class ProcesoArchivoErrorDialogComponent implements OnInit {
  private novedadService = inject(NovedadParticipeCargaService);
  private exportService = inject(ExportService);

  cargando = signal(true);
  errorCarga = signal<string | null>(null);
  novedades = signal<NovedadParticipeCarga[]>([]);
  estadisticas = signal<EstadisticasNovedadesCarga | null>(null);

  total = computed(() => this.novedades().length);

  constructor(
    public dialogRef: MatDialogRef<ProcesoArchivoErrorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    this.cargarNovedades();
  }

  private cargarNovedades(): void {
    this.cargando.set(true);
    this.errorCarga.set(null);

    this.novedadService.getByCargaArchivo(this.data.idCarga).subscribe({
      next: (lista) => {
        this.novedades.set(lista ?? []);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorCarga.set(mensajeDeError(err, 'No se pudo cargar el detalle de novedades de esta carga.'));
      },
    });

    // Informativo: si falla, la tabla y el CSV siguen funcionando igual con `novedades`.
    this.novedadService.estadisticas(this.data.idCarga).subscribe({
      next: (resp) => this.estadisticas.set(resp),
      error: () => this.estadisticas.set(null),
    });
  }

  formatMonto(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  descargarCSV(): void {
    const data = this.novedades();
    if (!data.length) return;

    const filas = data.map((n) => ({
      codigoPetro: n.participeXCargaArchivo?.codigoPetro || '-',
      participe: n.participeXCargaArchivo?.nombre || '-',
      tipoNovedad: n.tipoNovedad ?? '-',
      descripcion: n.descripcion || '-',
      codigoPrestamo: n.codigoPrestamo || '-',
      codigoProducto: n.codigoProducto || '-',
      montoEsperado: Number(n.montoEsperado || 0),
      montoRecibido: Number(n.montoRecibido || 0),
      montoDiferencia: Number(n.montoDiferencia || 0),
    }));

    const headers = [
      'Código Petro',
      'Partícipe',
      'Tipo Novedad',
      'Descripción',
      'Código Préstamo',
      'Código Producto',
      'Monto Esperado',
      'Monto Recibido',
      'Monto Diferencia',
    ];

    const dataKeys = [
      'codigoPetro',
      'participe',
      'tipoNovedad',
      'descripcion',
      'codigoPrestamo',
      'codigoProducto',
      'montoEsperado',
      'montoRecibido',
      'montoDiferencia',
    ];

    this.exportService.exportToCSV(filas, `novedades_error_proceso_carga_${this.data.idCarga}`, headers, dataKeys);
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
