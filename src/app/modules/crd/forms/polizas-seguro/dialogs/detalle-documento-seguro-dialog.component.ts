import { CommonModule } from '@angular/common';
import { Component, Inject, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { guardarArchivo } from '../../../../../shared/services/descarga-reporte';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { formatearMoneda } from '../../../../../shared/utils/moneda.util';
import {
  CandidatoListadoSeguro,
  ClaseDocumentoSeguro,
  DistribucionPreviewSeguro,
  DocumentoSeguro,
  EstadoDocumentoSeguro,
  NovedadesSeguro,
  PrestamoDocumentoSeguro,
  TEXTO_CLASE_DOCUMENTO_SEGURO,
  TEXTO_ESTADO_DOCUMENTO_SEGURO,
} from '../../../model/poliza-seguro/poliza-seguro.model';
import { PolizaSeguroService } from '../../../service/poliza-seguro.service';
import { ConfirmarDistribucionDialogComponent } from './confirmar-distribucion-dialog.component';
import { MotivoAnularSeguroDialogComponent } from './motivo-anular-seguro-dialog.component';
import {
  RegistrarNotaSeguroDialogComponent,
  RegistrarNotaSeguroDialogResultado,
} from './registrar-nota-seguro-dialog.component';

export interface DetalleDocumentoSeguroDialogData {
  idDocumento: number;
}

/**
 * Detalle de un documento de seguro (factura, ND o NC) — registrar el documento (§4), ver y
 * confirmar la distribución (§5), anular (§6), liberar a pago (§9, siempre 409 en fase 1) y, solo
 * para facturas DISTRIBUIDAS o LIBERADAS, las novedades (§7).
 */
@Component({
  selector: 'app-detalle-documento-seguro-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  templateUrl: './detalle-documento-seguro-dialog.component.html',
  styleUrl: './detalle-documento-seguro-dialog.component.scss',
})
export class DetalleDocumentoSeguroDialogComponent {
  private servicio = inject(PolizaSeguroService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly hoy = new Date();
  readonly EstadoDocumentoSeguro = EstadoDocumentoSeguro;
  readonly ClaseDocumentoSeguro = ClaseDocumentoSeguro;
  readonly textoEstado = TEXTO_ESTADO_DOCUMENTO_SEGURO;
  readonly textoClase = TEXTO_CLASE_DOCUMENTO_SEGURO;
  formatMoneda = formatearMoneda;

  cargando = signal(true);
  error = signal<string | null>(null);
  documento = signal<DocumentoSeguro | null>(null);
  prestamos = signal<PrestamoDocumentoSeguro[]>([]);

  /** §4: solo se puede (re)registrar en estado 1 o 2. */
  puedeRegistrarDocumento = computed(() => {
    const d = this.documento();
    return !!d && (d.estado === EstadoDocumentoSeguro.LISTADO_ENVIADO || d.estado === EstadoDocumentoSeguro.DOCUMENTO_REGISTRADO);
  });

  puedeAnular = computed(() => this.documento()?.estado !== EstadoDocumentoSeguro.ANULADO);

  /** §7: novedades solo tienen sentido contra una FACTURA en estado 3 o 4. */
  mostrarNovedades = computed(() => {
    const d = this.documento();
    if (!d || d.clase !== ClaseDocumentoSeguro.FACTURA) return false;
    return d.estado === EstadoDocumentoSeguro.DISTRIBUIDO || d.estado === EstadoDocumentoSeguro.LIBERADO_A_PAGO;
  });

  constructor(
    private dialogRef: MatDialogRef<DetalleDocumentoSeguroDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: DetalleDocumentoSeguroDialogData
  ) {
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.getId(this.data.idDocumento).subscribe({
      next: (doc) => {
        this.cargando.set(false);
        this.documento.set(doc);
        this.precargarFormularioDocumento(doc);
      },
      error: (e: Error) => {
        this.cargando.set(false);
        this.error.set(e.message);
      },
    });
    this.servicio.prestamos(this.data.idDocumento).subscribe({
      next: (lista) => this.prestamos.set(lista),
      error: () => this.prestamos.set([]),
    });
  }

  cerrar(): void {
    this.dialogRef.close(this.huboCambios);
  }

  /** `true` si alguna acción tuvo éxito — el llamador (la bandeja) refresca su tabla solo si hizo falta. */
  private huboCambios = false;

  // ========================= §4: registrar documento =========================

  formAseguradora = '';
  formRuc = '';
  formNumeroPoliza = '';
  formNumeroDocumento = '';
  formClaveAcceso = '';
  formFechaEmision: Date | null = null;
  formFechaInicio: Date | null = null;
  formFechaFin: Date | null = null;
  formTasa: number | null = null;
  formValorTotal: number | null = null;
  guardandoDocumento = signal(false);

  private precargarFormularioDocumento(doc: DocumentoSeguro): void {
    this.formAseguradora = doc.aseguradora ?? '';
    this.formRuc = doc.ruc ?? '';
    this.formNumeroPoliza = doc.numeroPoliza ?? '';
    this.formNumeroDocumento = doc.numeroDocumento ?? '';
    this.formClaveAcceso = doc.claveAcceso ?? '';
    this.formFechaEmision = doc.fechaEmision;
    this.formFechaInicio = doc.fechaInicio;
    this.formFechaFin = doc.fechaFin;
    this.formTasa = doc.tasa;
    this.formValorTotal = doc.valorTotal;
  }

  puedeGuardarDocumento(): boolean {
    return (
      !!this.formAseguradora.trim() &&
      !!this.formRuc.trim() &&
      !!this.formNumeroPoliza.trim() &&
      !!this.formNumeroDocumento.trim() &&
      !!this.formClaveAcceso.trim() &&
      !!this.formFechaEmision &&
      !!this.formFechaInicio &&
      !!this.formFechaFin &&
      (this.formValorTotal ?? 0) > 0 &&
      this.formFechaFin! >= this.formFechaInicio!
    );
  }

  guardarDocumento(): void {
    if (!this.puedeGuardarDocumento()) return;
    const fechaEmision = this.servicio.formatearFecha(this.formFechaEmision);
    const fechaInicio = this.servicio.formatearFecha(this.formFechaInicio);
    const fechaFin = this.servicio.formatearFecha(this.formFechaFin);
    if (!fechaEmision || !fechaInicio || !fechaFin) return;

    this.guardandoDocumento.set(true);
    this.servicio
      .registrarDocumento(this.data.idDocumento, {
        aseguradora: this.formAseguradora.trim(),
        ruc: this.formRuc.trim(),
        numeroPoliza: this.formNumeroPoliza.trim(),
        numeroDocumento: this.formNumeroDocumento.trim(),
        claveAcceso: this.formClaveAcceso.trim(),
        fechaEmision,
        fechaInicio,
        fechaFin,
        tasa: this.formTasa ?? 0,
        valorTotal: this.formValorTotal as number,
        usuario: usuarioSesion(),
      })
      .subscribe({
        next: (doc) => {
          this.guardandoDocumento.set(false);
          this.huboCambios = true;
          this.documento.set(doc);
          this.snackBar.open('Documento registrado.', 'Cerrar', { duration: 4000 });
        },
        error: (e: Error) => {
          this.guardandoDocumento.set(false);
          this.mostrarError(e.message);
        },
      });
  }

  // ========================= §9: liberar a pago (fase 1: siempre 409) =========================

  liberandoAPago = signal(false);

  liberarAPago(): void {
    this.liberandoAPago.set(true);
    this.servicio.liberarAPago(this.data.idDocumento, { usuario: usuarioSesion() }).subscribe({
      next: (doc) => {
        this.liberandoAPago.set(false);
        this.huboCambios = true;
        this.documento.set(doc);
        this.snackBar.open('Documento liberado a pago.', 'Cerrar', { duration: 4000 });
      },
      error: (e: Error) => {
        this.liberandoAPago.set(false);
        this.mostrarError(e.message);
      },
    });
  }

  // ========================= §6: anular =========================

  anulando = signal(false);

  anular(): void {
    const doc = this.documento();
    this.dialog
      .open(MotivoAnularSeguroDialogComponent, {
        data: { numeroDocumento: doc?.numeroDocumento ?? null, aseguradora: doc?.aseguradora ?? null },
        width: '480px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.anulando.set(true);
        this.servicio.anular(this.data.idDocumento, { usuario: usuarioSesion(), motivo }).subscribe({
          next: (docAnulado) => {
            this.anulando.set(false);
            this.huboCambios = true;
            this.documento.set(docAnulado);
            this.snackBar.open('Documento anulado.', 'Cerrar', { duration: 4000 });
          },
          error: (e: Error) => {
            this.anulando.set(false);
            this.mostrarError(e.message);
          },
        });
      });
  }

  // ========================= §5: distribución =========================

  cargandoDistribucion = signal(false);
  errorDistribucion = signal<string | null>(null);
  distribucionPreview = signal<DistribucionPreviewSeguro | null>(null);
  prestamosExpandidos = signal<Set<number>>(new Set());
  distribuyendo = signal(false);

  verDistribucion(): void {
    this.cargandoDistribucion.set(true);
    this.errorDistribucion.set(null);
    this.servicio.previewDistribucion(this.data.idDocumento).subscribe({
      next: (preview) => {
        this.cargandoDistribucion.set(false);
        this.distribucionPreview.set(preview);
      },
      error: (e: Error) => {
        this.cargandoDistribucion.set(false);
        this.distribucionPreview.set(null);
        this.errorDistribucion.set(e.message);
      },
    });
  }

  prestamoExpandido(idPrestamo: number): boolean {
    return this.prestamosExpandidos().has(idPrestamo);
  }

  alternarExpansionPrestamo(idPrestamo: number): void {
    const set = new Set(this.prestamosExpandidos());
    if (set.has(idPrestamo)) set.delete(idPrestamo);
    else set.add(idPrestamo);
    this.prestamosExpandidos.set(set);
  }

  confirmarDistribucion(): void {
    const preview = this.distribucionPreview();
    const doc = this.documento();
    if (!preview || !doc || !preview.cuadra) return;

    this.dialog
      .open(ConfirmarDistribucionDialogComponent, {
        data: {
          cantidadPrestamos: preview.prestamos.length,
          valorTotal: preview.valorTotal,
          sumaPrestamos: preview.sumaPrestamos,
          sumaCuotas: preview.sumaCuotas,
          cuadra: preview.cuadra,
        },
        width: '480px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (!confirmado) return;
        this.distribuyendo.set(true);
        this.servicio.distribuir(this.data.idDocumento, { usuario: usuarioSesion() }).subscribe({
          next: (docDistribuido) => {
            this.distribuyendo.set(false);
            this.huboCambios = true;
            this.documento.set(docDistribuido);
            this.snackBar.open('Distribución confirmada.', 'Cerrar', { duration: 4000 });
          },
          error: (e: Error) => {
            this.distribuyendo.set(false);
            this.mostrarError(e.message);
          },
        });
      });
  }

  // ========================= §7: novedades =========================

  filtroDesdeNovedades: Date | null = null;
  filtroHastaNovedades: Date | null = null;
  cargandoNovedades = signal(false);
  errorNovedades = signal<string | null>(null);
  novedades = signal<NovedadesSeguro | null>(null);
  exportandoNovedadesExcel = signal(false);

  consultarNovedades(): void {
    const desde = this.servicio.formatearFecha(this.filtroDesdeNovedades);
    const hasta = this.servicio.formatearFecha(this.filtroHastaNovedades);
    this.cargandoNovedades.set(true);
    this.errorNovedades.set(null);
    this.servicio.novedades(this.data.idDocumento, desde, hasta).subscribe({
      next: (resp) => {
        this.cargandoNovedades.set(false);
        this.novedades.set(resp);
      },
      error: (e: Error) => {
        this.cargandoNovedades.set(false);
        this.novedades.set(null);
        this.errorNovedades.set(e.message);
      },
    });
  }

  exportarNovedadesExcel(): void {
    const desde = this.servicio.formatearFecha(this.filtroDesdeNovedades);
    const hasta = this.servicio.formatearFecha(this.filtroHastaNovedades);
    this.exportandoNovedadesExcel.set(true);
    this.servicio.novedadesExcel(this.data.idDocumento, desde, hasta).subscribe({
      next: (archivo) => {
        this.exportandoNovedadesExcel.set(false);
        const doc = this.documento();
        guardarArchivo(archivo.blob, archivo.nombreArchivo || `NOVEDADES_${doc?.numeroDocumento ?? this.data.idDocumento}.xlsx`);
      },
      error: (e: Error) => {
        this.exportandoNovedadesExcel.set(false);
        this.mostrarError(e.message);
      },
    });
  }

  registrarNotaDebito(): void {
    const inclusiones = this.novedades()?.inclusiones ?? [];
    this.abrirRegistrarNota(ClaseDocumentoSeguro.NOTA_DEBITO, inclusiones);
  }

  registrarNotaCredito(): void {
    const exclusiones = this.novedades()?.exclusiones ?? [];
    this.abrirRegistrarNota(ClaseDocumentoSeguro.NOTA_CREDITO, exclusiones);
  }

  private abrirRegistrarNota(
    clase: ClaseDocumentoSeguro.NOTA_DEBITO | ClaseDocumentoSeguro.NOTA_CREDITO,
    candidatos: CandidatoListadoSeguro[]
  ): void {
    if (!candidatos.length) {
      this.mostrarError('No hay préstamos para esta nota.');
      return;
    }

    this.dialog
      .open(RegistrarNotaSeguroDialogComponent, {
        data: { clase, candidatos },
        width: '640px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((resultado?: RegistrarNotaSeguroDialogResultado) => {
        if (!resultado) return;
        const fechaEmision = this.servicio.formatearFecha(resultado.fechaEmision);
        if (!fechaEmision) return;

        this.servicio
          .registrarNota(this.data.idDocumento, {
            clase,
            prestamos: resultado.prestamos,
            usuario: usuarioSesion(),
            aseguradora: resultado.aseguradora,
            ruc: resultado.ruc,
            numeroPoliza: resultado.numeroPoliza,
            numeroDocumento: resultado.numeroDocumento,
            claveAcceso: resultado.claveAcceso,
            fechaEmision,
            valorTotal: resultado.valorTotal,
          })
          .subscribe({
            next: () => {
              this.huboCambios = true;
              this.snackBar.open('Nota registrada.', 'Cerrar', { duration: 4000 });
              this.consultarNovedades();
            },
            error: (e: Error) => this.mostrarError(e.message),
          });
      });
  }

  // ========================= utilidades =========================

  formatFecha(fecha: Date | null): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 8000 });
  }
}
