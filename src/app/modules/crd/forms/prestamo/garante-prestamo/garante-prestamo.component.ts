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
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { GarantePrestamo } from '../../../model/garante-prestamo';
import { GarantePrestamoService } from '../../../service/garante-prestamo.service';
import { ParticipeElegido, ParticipeSelectorComponent } from '../../participe-selector/participe-selector.component';

type ModoGarante = 'PARTICIPE' | 'MANUAL';

/** Estados del préstamo en los que el garante se puede agregar, cambiar o anular: PENDIENTE (6) y GENERADO (1). */
const ESTADOS_EDITABLES = [6, 1];

/**
 * Sección «Garante» de `prestamo-edit` (DISENO-SOLICITUD-V1 §B3/B7). Es opcional: casilla «Tiene garante»;
 * el garante es un partícipe (se busca por cédula o nombre y viaja `idEntidad`) o un tercero con datos a
 * mano (nombre y cédula obligatorios). Solo editable con el préstamo en 6 o 1; después, solo lectura.
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

  idPrestamo = input.required<number>();
  idEstado = input<number | null>(null);

  /** Garante activo guardado en el backend (`null` si no tiene). */
  garante = signal<GarantePrestamo | null>(null);
  tieneGarante = signal(false);
  cargando = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);

  modo: ModoGarante = 'PARTICIPE';
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

  get puedeGuardar(): boolean {
    return (
      this.editable &&
      this.tieneGarante() &&
      !this.guardando() &&
      this.nombre.trim().length > 0 &&
      this.cedula.trim().length > 0 &&
      (this.modo === 'MANUAL' || this.idEntidad != null)
    );
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
        },
        error: (err) => this.error.set(mensajeDeError(err, 'No se pudo consultar el garante')),
      });
  }

  alCambiarCasilla(marcada: boolean): void {
    if (!this.editable) return;
    const guardado = this.garante();
    if (marcada || !guardado?.codigo) {
      this.tieneGarante.set(marcada);
      if (!marcada) this.llenarDesde(null);
      return;
    }

    // Desmarcar con un garante guardado = anularlo; hay que confirmar.
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
              this.tieneGarante.set(false);
              this.llenarDesde(null);
              this.snackBar.open('Garante quitado', 'Cerrar', { duration: 3000 });
            },
            error: (err) => this.avisarError(err, 'No se pudo quitar el garante'),
          });
      });
  }

  alCambiarModo(): void {
    this.idEntidad = null;
    this.nombre = '';
    this.cedula = '';
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
      idEntidad: this.modo === 'PARTICIPE' ? this.idEntidad : null,
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
    this.modo = g && !g.idEntidad ? 'MANUAL' : 'PARTICIPE';
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
