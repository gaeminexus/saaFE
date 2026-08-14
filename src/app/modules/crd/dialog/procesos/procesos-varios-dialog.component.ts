import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { ResultadoCalculoMora } from '../../model/pagos/operaciones-pago';
import { mensajeDeRespuesta } from '../../model/pagos/respuesta-pago';
import { OperacionesPagoPrestamoService } from '../../service/operaciones-pago-prestamo.service';

type Alcance = 'todos' | 'uno';

/**
 * Procesos de mantenimiento del módulo de créditos que se ejecutan a demanda.
 *
 * Hoy contiene uno solo, el recálculo de mora. No es una operación de uso diario: la mora la
 * calcula la corrida automática de las 02:00 y esto es la recuperación manual para cuando esa
 * corrida falló o el servidor estuvo apagado. De ahí las advertencias y la confirmación explícita
 * antes de lanzarla sobre todo el sistema.
 */
@Component({
  selector: 'app-procesos-varios-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MaterialFormModule],
  templateUrl: './procesos-varios-dialog.component.html',
  styleUrl: './procesos-varios-dialog.component.scss',
})
export class ProcesosVariosDialogComponent {
  private servicio = inject(OperacionesPagoPrestamoService);
  private dialogRef = inject(MatDialogRef<ProcesosVariosDialogComponent, boolean>);

  readonly hoy = new Date();

  alcance = signal<Alcance>('todos');
  fechaCorte = signal<Date>(new Date());
  idPrestamoTexto = '';

  ejecutando = signal(false);
  resultado = signal<ResultadoCalculoMora | null>(null);
  mensaje = signal<string | null>(null);
  error = signal<string | null>(null);

  /** Se marca en cuanto una corrida termina bien: la pantalla que abrió el diálogo debe recargar. */
  private huboCambios = false;

  idPrestamo = computed(() => {
    const n = parseInt(this.idPrestamoTexto.replace(/[^0-9]/g, ''), 10);
    return isNaN(n) || n <= 0 ? null : n;
  });

  puedeEjecutar = computed(
    () => !this.ejecutando() && (this.alcance() === 'todos' || this.idPrestamo() != null)
  );

  cambiarAlcance(alcance: Alcance): void {
    this.alcance.set(alcance);
    this.error.set(null);
  }

  ejecutarCalculoMora(): void {
    if (!this.puedeEjecutar()) return;

    this.error.set(null);
    this.mensaje.set(null);
    this.resultado.set(null);
    this.ejecutando.set(true);

    const fecha = this.servicio.formatearFecha(this.fechaCorte());
    const idPrestamo = this.alcance() === 'uno' ? this.idPrestamo() : null;

    this.servicio.calcularMora(fecha, usuarioSesion(), idPrestamo).subscribe((resp) => {
      this.ejecutando.set(false);
      if (resp.exito && resp.resultado) {
        this.resultado.set(resp.resultado);
        this.mensaje.set(resp.mensaje ?? null);
        this.huboCambios = true;
      } else {
        this.error.set(mensajeDeRespuesta(resp));
      }
    });
  }

  /** Duración de la corrida en un formato legible: los ms crudos no dicen nada de un vistazo. */
  duracionTexto(ms: number | null | undefined): string {
    const total = ms ?? 0;
    if (total < 1000) return `${total} ms`;
    const segundos = total / 1000;
    if (segundos < 60) return `${segundos.toFixed(1)} s`;
    const minutos = Math.floor(segundos / 60);
    return `${minutos} min ${Math.round(segundos - minutos * 60)} s`;
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  cerrar(): void {
    this.dialogRef.close(this.huboCambios);
  }
}
