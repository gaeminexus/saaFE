import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { guardarArchivo } from '../../../../shared/services/descarga-reporte';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { formatearMoneda } from '../../../../shared/utils/moneda.util';
import {
  CandidatoListadoSeguro,
  ClaseDocumentoSeguro,
  DocumentoSeguro,
  EstadoDocumentoSeguro,
  ResultadoCargaSumaAsegurada,
  TEXTO_CLASE_DOCUMENTO_SEGURO,
  TEXTO_ESTADO_DOCUMENTO_SEGURO,
  TEXTO_TIPO_SEGURO,
  TipoSeguro,
} from '../../model/poliza-seguro/poliza-seguro.model';
import { PolizaSeguroService } from '../../service/poliza-seguro.service';
import { DetalleDocumentoSeguroDialogComponent } from './dialogs/detalle-documento-seguro-dialog.component';

/** Tipos que tienen `PRSTVLAS` — desgravamen no aplica (su base es el saldo de capital). */
type TipoSumaAsegurada = TipoSeguro.INCENDIO | TipoSeguro.PRENDARIO;

/**
 * Pólizas de seguro de préstamos — desgravamen, incendio, prendario (docs/crd/API-POLIZAS-SEGURO.md).
 * Reemplaza la maqueta `crd/forms/asignacion-seguros` (que simulaba sin backend real).
 *
 * ⛔ H13: los errores del servicio se muestran TAL CUAL (`PolizaSeguroService` ya los entrega así).
 * ⚠️ La carga y las exportaciones de Excel las resuelve el BACKEND (corregido 2026-10-02): no hay
 * librería de Excel en el frontend. La carga sube el `File` crudo por multipart; las exportaciones
 * bajan un blob `.xlsx` ya armado — ninguna de las dos se parsea ni se arma acá.
 */
@Component({
  selector: 'app-polizas-seguro',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './polizas-seguro.component.html',
  styleUrl: './polizas-seguro.component.scss',
})
export class PolizasSeguroComponent {
  private servicio = inject(PolizaSeguroService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly hoy = new Date();
  readonly TipoSeguro = TipoSeguro;
  readonly textoTipoSeguro = TEXTO_TIPO_SEGURO;
  readonly EstadoDocumentoSeguro = EstadoDocumentoSeguro;
  readonly textoEstado = TEXTO_ESTADO_DOCUMENTO_SEGURO;
  readonly ClaseDocumentoSeguro = ClaseDocumentoSeguro;
  readonly textoClase = TEXTO_CLASE_DOCUMENTO_SEGURO;
  formatMoneda = formatearMoneda;

  // ========================= Pestaña 1: Suma asegurada =========================

  tipoSumaAsegurada = signal<TipoSumaAsegurada>(TipoSeguro.INCENDIO);
  fechaSumaAsegurada = signal<Date>(new Date());
  consultandoSumaAsegurada = signal(false);
  errorSumaAsegurada = signal<string | null>(null);
  filasSumaAsegurada = signal<CandidatoListadoSeguro[]>([]);
  filtroTextoSumaAsegurada = signal('');
  valoresEditados = signal<Map<number, string>>(new Map());
  guardandoFila = signal<Set<number>>(new Set());

  filasSumaAseguradaFiltradas = computed(() => {
    const texto = this.normalizarTexto(this.filtroTextoSumaAsegurada());
    if (!texto) return this.filasSumaAsegurada();
    return this.filasSumaAsegurada().filter(
      (f) =>
        this.normalizarTexto(f.numeroPrestamo).includes(texto) ||
        this.normalizarTexto(f.nombreParticipe).includes(texto) ||
        this.normalizarTexto(f.cedula).includes(texto)
    );
  });

  consultarSumaAsegurada(): void {
    const fecha = this.servicio.formatearFecha(this.fechaSumaAsegurada());
    if (!fecha) {
      this.errorSumaAsegurada.set('Indique una fecha válida.');
      return;
    }

    this.consultandoSumaAsegurada.set(true);
    this.errorSumaAsegurada.set(null);
    this.servicio.previewListado(this.tipoSumaAsegurada(), fecha).subscribe({
      next: (filas) => {
        this.consultandoSumaAsegurada.set(false);
        this.filasSumaAsegurada.set(filas);
        this.valoresEditados.set(new Map());
      },
      error: (e: Error) => {
        this.consultandoSumaAsegurada.set(false);
        this.filasSumaAsegurada.set([]);
        this.errorSumaAsegurada.set(e.message);
      },
    });
  }

  valorEditadoDe(fila: CandidatoListadoSeguro): string {
    const editado = this.valoresEditados().get(fila.idPrestamo);
    if (editado !== undefined) return editado;
    return fila.sinSumaAsegurada ? '' : String(fila.base ?? '');
  }

  setValorEditado(idPrestamo: number, valor: string): void {
    const map = new Map(this.valoresEditados());
    map.set(idPrestamo, valor);
    this.valoresEditados.set(map);
  }

  guardandoEsta(idPrestamo: number): boolean {
    return this.guardandoFila().has(idPrestamo);
  }

  guardarSumaAsegurada(fila: CandidatoListadoSeguro): void {
    const texto = this.valorEditadoDe(fila);
    const valor = parseFloat(texto);
    if (!Number.isFinite(valor) || valor <= 0) {
      this.mostrarError('El valor debe ser mayor a cero.');
      return;
    }

    const enCurso = new Set(this.guardandoFila());
    enCurso.add(fila.idPrestamo);
    this.guardandoFila.set(enCurso);

    this.servicio.actualizarSumaAsegurada({ idPrestamo: fila.idPrestamo, valor, usuario: usuarioSesion() }).subscribe({
      next: () => {
        this.quitarGuardando(fila.idPrestamo);
        this.snackBar.open(`Suma asegurada de ${fila.numeroPrestamo} actualizada.`, 'Cerrar', { duration: 3500 });
        this.filasSumaAsegurada.update((filas) =>
          filas.map((f) => (f.idPrestamo === fila.idPrestamo ? { ...f, base: valor, sinSumaAsegurada: false } : f))
        );
      },
      error: (e: Error) => {
        this.quitarGuardando(fila.idPrestamo);
        this.mostrarError(e.message);
      },
    });
  }

  private quitarGuardando(idPrestamo: number): void {
    const enCurso = new Set(this.guardandoFila());
    enCurso.delete(idPrestamo);
    this.guardandoFila.set(enCurso);
  }

  // ---- carga por Excel (la lee el backend; el frontend solo sube el archivo) ----

  archivoSeleccionado = signal<File | null>(null);
  previsualizandoExcel = signal(false);
  confirmandoExcel = signal(false);
  resultadoCargaExcel = signal<ResultadoCargaSumaAsegurada | null>(null);
  errorCargaExcel = signal<string | null>(null);

  onArchivoExcelSeleccionado(event: Event): void {
    const archivo = (event.target as HTMLInputElement).files?.[0] ?? null;
    (event.target as HTMLInputElement).value = '';
    if (!archivo) return;

    const extension = archivo.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xls' && extension !== 'xlsx') {
      this.mostrarError('Solo se aceptan archivos Excel (.xls o .xlsx).');
      return;
    }

    this.archivoSeleccionado.set(archivo);
    this.resultadoCargaExcel.set(null);
    this.errorCargaExcel.set(null);
    this.previsualizarCargaExcel();
  }

  previsualizarCargaExcel(): void {
    const archivo = this.archivoSeleccionado();
    if (!archivo) return;

    this.previsualizandoExcel.set(true);
    this.errorCargaExcel.set(null);
    this.servicio.cargarSumaAseguradaExcel(archivo, false, usuarioSesion()).subscribe({
      next: (resultado) => {
        this.previsualizandoExcel.set(false);
        this.resultadoCargaExcel.set(resultado);
      },
      error: (e: Error) => {
        this.previsualizandoExcel.set(false);
        this.resultadoCargaExcel.set(null);
        this.errorCargaExcel.set(e.message);
      },
    });
  }

  confirmarCargaExcel(): void {
    const archivo = this.archivoSeleccionado();
    if (!archivo) return;

    this.confirmandoExcel.set(true);
    this.servicio.cargarSumaAseguradaExcel(archivo, true, usuarioSesion()).subscribe({
      next: (resultado) => {
        this.confirmandoExcel.set(false);
        this.resultadoCargaExcel.set(resultado);
        this.archivoSeleccionado.set(null);
        this.snackBar.open(`Carga confirmada: ${resultado.ok} de ${resultado.total} OK.`, 'Cerrar', { duration: 5000 });
        if (this.filasSumaAsegurada().length) this.consultarSumaAsegurada();
      },
      error: (e: Error) => {
        this.confirmandoExcel.set(false);
        this.mostrarError(e.message);
      },
    });
  }

  cancelarCargaExcel(): void {
    this.archivoSeleccionado.set(null);
    this.resultadoCargaExcel.set(null);
    this.errorCargaExcel.set(null);
  }

  // ========================= Pestaña 2: Pólizas — nuevo listado =========================

  tipoPoliza = signal<TipoSeguro>(TipoSeguro.DESGRAVAMEN);
  fechaCortePoliza = signal<Date>(new Date());
  observacionListado = signal('');
  consultandoPreviewListado = signal(false);
  errorPreviewListado = signal<string | null>(null);
  previewListadoFilas = signal<CandidatoListadoSeguro[] | null>(null);
  generandoListado = signal(false);
  exportandoPreviewExcel = signal(false);

  hayPrestamosSinSumaAsegurada = computed(() => (this.previewListadoFilas() ?? []).some((f) => f.sinSumaAsegurada));

  consultarPreviewListado(): void {
    const fecha = this.servicio.formatearFecha(this.fechaCortePoliza());
    if (!fecha) {
      this.errorPreviewListado.set('Indique una fecha de corte válida.');
      return;
    }

    this.consultandoPreviewListado.set(true);
    this.errorPreviewListado.set(null);
    this.servicio.previewListado(this.tipoPoliza(), fecha).subscribe({
      next: (filas) => {
        this.consultandoPreviewListado.set(false);
        this.previewListadoFilas.set(filas);
      },
      error: (e: Error) => {
        this.consultandoPreviewListado.set(false);
        this.previewListadoFilas.set(null);
        this.errorPreviewListado.set(e.message);
      },
    });
  }

  generarListado(): void {
    const fecha = this.servicio.formatearFecha(this.fechaCortePoliza());
    if (!fecha) return;

    this.generandoListado.set(true);
    this.servicio
      .generarListado({
        tipoSeguro: this.tipoPoliza(),
        fechaCorte: fecha,
        usuario: usuarioSesion(),
        observacion: this.observacionListado().trim() || null,
      })
      .subscribe({
        next: (doc) => {
          this.generandoListado.set(false);
          this.snackBar.open(`Listado generado: ${doc.cantidadPrestamos} préstamo(s).`, 'Cerrar', { duration: 5000 });
          this.previewListadoFilas.set(null);
          this.observacionListado.set('');
          this.buscarDocumentos();
        },
        error: (e: Error) => {
          this.generandoListado.set(false);
          this.mostrarError(e.message);
        },
      });
  }

  exportarPreviewListadoExcel(): void {
    const fecha = this.servicio.formatearFecha(this.fechaCortePoliza());
    if (!fecha) return;

    this.exportandoPreviewExcel.set(true);
    this.servicio.previewListadoExcel(this.tipoPoliza(), fecha).subscribe({
      next: (archivo) => {
        this.exportandoPreviewExcel.set(false);
        guardarArchivo(archivo.blob, archivo.nombreArchivo || `LISTADO_PREVIEW_${fecha}.xlsx`);
      },
      error: (e: Error) => {
        this.exportandoPreviewExcel.set(false);
        this.mostrarError(e.message);
      },
    });
  }

  // ---- bandeja de documentos ----

  filtroTipoDocumentos = signal<TipoSeguro | null>(null);
  filtroEstadoDocumentos = signal<EstadoDocumentoSeguro | null>(null);
  filtroClaseDocumentos = signal<ClaseDocumentoSeguro | null>(null);
  cargandoDocumentos = signal(false);
  errorDocumentos = signal<string | null>(null);
  documentos = signal<DocumentoSeguro[]>([]);
  descargandoListadoExcel = signal<Set<number>>(new Set());

  constructor() {
    this.buscarDocumentos();
  }

  buscarDocumentos(): void {
    const filtros = {
      tipoSeguro: this.filtroTipoDocumentos() ?? undefined,
      estado: this.filtroEstadoDocumentos() ?? undefined,
      clase: this.filtroClaseDocumentos() ?? undefined,
    };

    this.cargandoDocumentos.set(true);
    this.errorDocumentos.set(null);
    this.servicio.listar(filtros).subscribe({
      next: (lista) => {
        this.cargandoDocumentos.set(false);
        this.documentos.set(lista);
      },
      error: (e: Error) => {
        this.cargandoDocumentos.set(false);
        this.errorDocumentos.set(e.message);
      },
    });
  }

  limpiarFiltrosDocumentos(): void {
    this.filtroTipoDocumentos.set(null);
    this.filtroEstadoDocumentos.set(null);
    this.filtroClaseDocumentos.set(null);
    this.buscarDocumentos();
  }

  abrirDetalle(doc: DocumentoSeguro): void {
    this.dialog
      .open(DetalleDocumentoSeguroDialogComponent, {
        data: { idDocumento: doc.id },
        width: '900px',
        maxWidth: '96vw',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((huboCambios?: boolean) => {
        if (huboCambios) this.buscarDocumentos();
      });
  }

  descargandoEsta(id: number): boolean {
    return this.descargandoListadoExcel().has(id);
  }

  descargarListadoExcel(doc: DocumentoSeguro): void {
    const enCurso = new Set(this.descargandoListadoExcel());
    enCurso.add(doc.id);
    this.descargandoListadoExcel.set(enCurso);

    this.servicio.listadoExcel(doc.id).subscribe({
      next: (archivo) => {
        this.quitarDescargando(doc.id);
        guardarArchivo(archivo.blob, archivo.nombreArchivo || `LISTADO_${doc.numeroDocumento ?? doc.id}.xlsx`);
      },
      error: (e: Error) => {
        this.quitarDescargando(doc.id);
        this.mostrarError(e.message);
      },
    });
  }

  private quitarDescargando(id: number): void {
    const enCurso = new Set(this.descargandoListadoExcel());
    enCurso.delete(id);
    this.descargandoListadoExcel.set(enCurso);
  }

  // ========================= utilidades =========================

  formatFecha(fecha: Date | null): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  private normalizarTexto(texto: string): string {
    return texto
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '');
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 8000 });
  }
}
