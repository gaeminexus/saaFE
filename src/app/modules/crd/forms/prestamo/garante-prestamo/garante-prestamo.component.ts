import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { finalize } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FileService } from '../../../../../shared/services/file.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { Adjunto } from '../../../model/adjunto';
import { GarantePrestamo } from '../../../model/garante-prestamo';
import { ComprobanteCobroService } from '../../../service/comprobante-cobro.service';
import { GarantePrestamoService } from '../../../service/garante-prestamo.service';
import { ParticipeElegido, ParticipeSelectorComponent } from '../../participe-selector/participe-selector.component';

/** Estados del préstamo en los que el garante se puede agregar, cambiar o anular: PENDIENTE (6) y GENERADO (1). */
const ESTADOS_EDITABLES = [6, 1];

/** Préstamos vivos (2, 8, 10, 11): el garante se agrega solo con su autorización firmada (DISENO §G4). */
const ESTADOS_OTORGADOS = [2, 8, 10, 11];

/**
 * Sección «Garante» de `prestamo-edit` (DISENO-SOLICITUD-V1 §B3/B7). Es opcional: casilla «Tiene garante»;
 * el garante es SIEMPRE un partícipe (se busca por cédula o nombre y viaja `idEntidad`). Un garante histórico
 * sin `idEntidad` (tercero) se muestra en solo lectura con aviso, y se puede anular para agregar otro.
 * Solo editable con el préstamo en 6 o 1; después, solo lectura.
 * Desmarcar la casilla anula al garante (con confirmación). Los 422 del backend se muestran tal cual.
 */
@Component({
  selector: 'app-garante-prestamo',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, ParticipeSelectorComponent],
  templateUrl: './garante-prestamo.component.html',
  styleUrl: './garante-prestamo.component.scss',
})
export class GarantePrestamoComponent {
  private servicio = inject(GarantePrestamoService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private comprobantes = inject(ComprobanteCobroService);
  private fileService = inject(FileService);

  idPrestamo = input.required<number>();
  idEstado = input<number | null>(null);

  /** Garante activo guardado en el backend (`null` si no tiene). */
  garante = signal<GarantePrestamo | null>(null);
  tieneGarante = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  /** Autorización firmada del garante guardada (solo si el garante la tiene). */
  autorizacion = signal<Adjunto | null>(null);
  /** Archivo elegido para el alta en un préstamo otorgado. */
  archivoAutorizacion = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  readonly aceptaArchivo = this.comprobantes.extensionesAceptadas;

  idEntidad: number | null = null;
  nombre = '';
  cedula = '';
  direccion = '';
  telefono = '';
  correo = '';

  constructor() {
    effect(() => {
      const id = this.idPrestamo();
      if (id) this.cargar(id);
    });
  }

  get editable(): boolean {
    const estado = this.idEstado();
    return estado != null && ESTADOS_EDITABLES.includes(estado);
  }

  /** Préstamo vivo (2, 8, 10, 11): modo «préstamo otorgado», alta con autorización y sin edición. */
  get otorgado(): boolean {
    const estado = this.idEstado();
    return estado != null && ESTADOS_OTORGADOS.includes(estado);
  }

  get puedeGuardarOtorgado(): boolean {
    return (
      this.otorgado &&
      this.tieneGarante() &&
      !this.garante()?.codigo &&
      !this.guardando() &&
      this.idEntidad != null &&
      this.archivoAutorizacion() != null
    );
  }

  get puedeGuardar(): boolean {
    return (
      this.editable &&
      this.tieneGarante() &&
      !this.guardando() &&
      !this.esTercero &&
      this.nombre.trim().length > 0 &&
      this.cedula.trim().length > 0 &&
      this.idEntidad != null
    );
  }

  /** Garante histórico registrado sin `idEntidad`: solo lectura, hay que reemplazarlo por un partícipe. */
  get esTercero(): boolean {
    const g = this.garante();
    return !!g?.codigo && !g.idEntidad;
  }

  cargar(idPrestamo: number): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio
      .porPrestamo(idPrestamo)
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (g) => {
          this.garante.set(g);
          this.tieneGarante.set(!!g);
          this.llenarDesde(g);
          this.cargarAutorizacion(g);
        },
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo consultar el garante')),
      });
  }

  private cargarAutorizacion(g: GarantePrestamo | null): void {
    this.autorizacion.set(null);
    if (!g?.codigo) return;
    // Es un dato accesorio: si falla, simplemente no se ofrece el enlace.
    this.servicio.autorizacion(g.codigo).subscribe({
      next: (a) => this.autorizacion.set(a),
      error: () => this.autorizacion.set(null),
    });
  }

  verAutorizacion(): void {
    const a = this.autorizacion();
    if (!a?.urlArchivo) return;
    this.fileService.downloadAndSaveFile(a.urlArchivo, a.nombreArchivo || undefined);
  }

  alElegirArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0] ?? null;
    input.value = '';
    if (!archivo) return;
    const problema = this.comprobantes.problemaDelArchivo(archivo);
    this.errorArchivo.set(problema);
    this.archivoAutorizacion.set(problema ? null : archivo);
  }

  quitarArchivo(): void {
    this.archivoAutorizacion.set(null);
    this.errorArchivo.set(null);
  }

  guardarOtorgado(): void {
    const archivo = this.archivoAutorizacion();
    if (!this.puedeGuardarOtorgado || !archivo || this.idEntidad == null) return;
    this.guardando.set(true);
    this.error.set(null);
    this.servicio
      .addConAutorizacion(this.idPrestamo(), this.idEntidad, archivo)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (g) => {
          this.garante.set(g);
          this.llenarDesde(g);
          this.archivoAutorizacion.set(null);
          this.cargarAutorizacion(g);
          this.snackBar.open('Garante guardado con su autorización', 'Cerrar', { duration: 3000 });
        },
        error: (err) => this.avisarError(err, 'No se pudo guardar el garante'),
      });
  }

  alCambiarCasilla(marcada: boolean): void {
    if (!this.editable && !this.otorgado) return;
    const guardado = this.garante();
    if (marcada || !guardado?.codigo) {
      this.tieneGarante.set(marcada);
      if (!marcada) this.llenarDesde(null);
      return;
    }

    // Desmarcar con un garante guardado = anularlo; hay que confirmar.
    this.anularConConfirmacion(guardado, false);
  }

  /** Anula al garante tercero y deja el selector de partícipe listo para agregar otro. */
  reemplazarTercero(): void {
    const guardado = this.garante();
    if ((!this.editable && !this.otorgado) || !guardado?.codigo) return;
    this.anularConConfirmacion(guardado, true);
  }

  private anularConConfirmacion(guardado: GarantePrestamo, agregarOtro: boolean): void {
    const data: ConfirmDialogData = {
      title: 'Quitar garante',
      message: `Se va a quitar a ${guardado.nombre} como garante del préstamo.`,
      confirmText: 'Quitar',
      type: 'danger',
    };
    this.tieneGarante.set(true);
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '480px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.guardando.set(true);
        this.servicio
          .anular(guardado.codigo as number)
          .pipe(finalize(() => this.guardando.set(false)))
          .subscribe({
            next: () => {
              this.garante.set(null);
              this.autorizacion.set(null);
              this.quitarArchivo();
              this.tieneGarante.set(agregarOtro);
              this.llenarDesde(null);
              this.snackBar.open('Garante quitado', 'Cerrar', { duration: 3000 });
            },
            error: (err) => this.avisarError(err, 'No se pudo quitar el garante'),
          });
      });
  }

  alElegirParticipe(p: ParticipeElegido | null): void {
    this.idEntidad = p?.codigoEntidad ?? null;
    this.nombre = p?.nombre ?? '';
    this.cedula = p?.numeroIdentificacion ?? '';
  }

  guardar(): void {
    if (!this.puedeGuardar) return;
    const existente = this.garante();
    const cuerpo: GarantePrestamo = {
      idPrestamo: this.idPrestamo(),
      idEntidad: this.idEntidad,
      nombre: this.nombre.trim(),
      cedula: this.cedula.trim(),
      direccion: this.direccion.trim() || null,
      telefono: this.telefono.trim() || null,
      correo: this.correo.trim() || null,
    };

    this.guardando.set(true);
    this.error.set(null);
    const llamada = existente?.codigo
      ? this.servicio.update({ ...cuerpo, codigo: existente.codigo })
      : this.servicio.add(cuerpo);
    llamada.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (g) => {
        this.garante.set(g);
        this.llenarDesde(g);
        this.snackBar.open('Garante guardado correctamente', 'Cerrar', { duration: 3000 });
      },
      error: (err) => this.avisarError(err, 'No se pudo guardar el garante'),
    });
  }

  private llenarDesde(g: GarantePrestamo | null): void {
    this.idEntidad = g?.idEntidad ?? null;
    this.nombre = g?.nombre ?? '';
    this.cedula = g?.cedula ?? '';
    this.direccion = g?.direccion ?? '';
    this.telefono = g?.telefono ?? '';
    this.correo = g?.correo ?? '';
  }

  private avisarError(err: unknown, porDefecto: string): void {
    const mensaje = mensajeDeError(err, porDefecto);
    this.error.set(mensaje);
    this.snackBar.open(mensaje, 'Cerrar', { duration: 8000, panelClass: ['error-snackbar'] });
  }
}
