import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ConfiguracionContabilidadService } from '../../../service/configuracion-contabilidad.service';

/**
 * Interruptor de contabilidad de CRD (§4.3 del plan de devengo — restringido a administrador
 * por el guard de la ruta, no acá).
 *
 * Apagarlo no detiene los procesos de créditos: los deja correr y calcular igual, pero sin
 * generar asientos contables. Es global — afecta a todos los procesos del módulo, no a uno.
 */
@Component({
  selector: 'app-interruptor-contabilidad',
  standalone: true,
  imports: [MaterialFormModule, MatSlideToggleModule],
  templateUrl: './interruptor-contabilidad.component.html',
  styleUrl: './interruptor-contabilidad.component.scss',
})
export class InterruptorContabilidadComponent {
  private servicio = inject(ConfiguracionContabilidadService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  cargando = signal(true);
  /**
   * `null` = no se pudo determinar (el GET falló). Se muestra "desconocido", nunca "apagado":
   * inventar un estado acá es peor que no saberlo.
   */
  activa = signal<boolean | null>(null);
  motivo = signal<string | null>(null);
  cambiando = signal(false);

  estadoTexto = computed(() => {
    if (this.cargando()) return 'Consultando…';
    const valor = this.activa();
    if (valor === null) return 'Desconocido';
    return valor ? 'Encendida' : 'Apagada';
  });

  estadoClase = computed(() => {
    if (this.cargando()) return 'cargando';
    const valor = this.activa();
    if (valor === null) return 'desconocido';
    return valor ? 'encendida' : 'apagada';
  });

  constructor() {
    this.cargarEstado();
  }

  private cargarEstado(): void {
    this.cargando.set(true);
    this.servicio.obtenerEstado().subscribe({
      next: (estado) => {
        this.cargando.set(false);
        if (!estado) {
          this.activa.set(null);
          this.motivo.set(null);
          return;
        }
        this.activa.set(!!estado.activa);
        this.motivo.set(estado.motivoUltimoCambio ?? null);
      },
      error: () => {
        this.cargando.set(false);
        this.activa.set(null);
        this.motivo.set(null);
        this.snackBar.open('No se pudo consultar el estado de la contabilidad de CRD.', 'Cerrar', {
          duration: 5000,
        });
      },
    });
  }

  /** El switch dispara esto en vez de mutar `activa` directamente: primero se pide el motivo. */
  solicitarCambio(): void {
    if (this.cargando() || this.cambiando()) return;

    const estadoActual = this.activa();
    const encenderla = estadoActual !== true; // desde "desconocido" el único movimiento sensato es encenderla

    const datos: MotivoDialogData = {
      titulo: encenderla ? 'Encender la contabilidad de CRD' : 'Apagar la contabilidad de CRD',
      advertencia: encenderla
        ? 'Con la contabilidad encendida, los procesos de créditos vuelven a generar asientos contables. Es global: afecta a todos los procesos del módulo.'
        : 'Con la contabilidad apagada, los procesos de créditos se ejecutan y calculan normalmente pero NO generan asientos contables. Es global: afecta a todos los procesos del módulo.',
      textoConfirmar: encenderla ? 'Encender' : 'Apagar',
    };

    this.dialog
      .open(MotivoDialogComponent, { data: datos, width: '520px', maxWidth: '96vw', autoFocus: false })
      .afterClosed()
      .subscribe((motivo?: string | null) => {
        if (!motivo) return;
        this.aplicarCambio(encenderla, motivo);
      });
  }

  private aplicarCambio(activa: boolean, motivo: string): void {
    this.cambiando.set(true);
    this.servicio.actualizar({ activa, usuario: usuarioSesion(), motivo }).subscribe({
      next: (resultado) => {
        this.cambiando.set(false);
        if (!resultado) {
          this.snackBar.open('No se pudo actualizar la contabilidad de CRD.', 'Cerrar', { duration: 5000 });
          return;
        }
        this.activa.set(!!resultado.activa);
        this.motivo.set(resultado.motivoUltimoCambio ?? motivo);
        this.snackBar.open(
          resultado.activa ? 'Contabilidad de CRD encendida.' : 'Contabilidad de CRD apagada.',
          'Cerrar',
          { duration: 4000 }
        );
      },
      error: (error) => {
        this.cambiando.set(false);
        this.snackBar.open(error?.mensaje || 'No se pudo actualizar la contabilidad de CRD.', 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }
}
