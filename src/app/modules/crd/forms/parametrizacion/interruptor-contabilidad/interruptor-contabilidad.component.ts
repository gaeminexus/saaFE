import { Component, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { ConfiguracionContabilidadService } from '../../../service/configuracion-contabilidad.service';
import { ConfiguracionGeneracionAportesService } from '../../../service/configuracion-generacion-aportes.service';

/**
 * Parámetros de créditos (CRD) — restringido a administrador por el guard de la ruta, no acá.
 *
 * Dos interruptores INDEPENDIENTES, cada uno con su propio estado y su propio ciclo de
 * carga/cambio (§B.3 de `docs/crd/API-INTERRUPTOR-GENERACION-POR-FALTANTE.md`, H64):
 *
 * 1. Contabilidad de créditos (CRD) — la de siempre, sin cambios de comportamiento.
 * 2. Generación de aportes por contratos (rubro 242) — nueva. Un cambio en una NUNCA toca la otra:
 *    tienen señales, servicios y manejo de error separados a propósito.
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
  private servicioGeneracionAportes = inject(ConfiguracionGeneracionAportesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // ================= tarjeta 1: contabilidad de créditos (CRD) — sin cambios =================

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
    this.cargarEstadoGeneracionAportes();
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

  // ================= tarjeta 2: generación de aportes por contratos (rubro 242) =================

  cargandoGeneracionAportes = signal(true);
  /** `null` = no se pudo determinar (el GET falló). Igual criterio que la tarjeta 1. */
  activaGeneracionAportes = signal<boolean | null>(null);
  motivoGeneracionAportes = signal<string | null>(null);
  cambiandoGeneracionAportes = signal(false);

  estadoTextoGeneracionAportes = computed(() => {
    if (this.cargandoGeneracionAportes()) return 'Consultando…';
    const valor = this.activaGeneracionAportes();
    if (valor === null) return 'Desconocido';
    return valor ? 'Encendida' : 'Apagada';
  });

  estadoClaseGeneracionAportes = computed(() => {
    if (this.cargandoGeneracionAportes()) return 'cargando';
    const valor = this.activaGeneracionAportes();
    if (valor === null) return 'desconocido';
    return valor ? 'encendida' : 'apagada';
  });

  private cargarEstadoGeneracionAportes(): void {
    this.cargandoGeneracionAportes.set(true);
    this.servicioGeneracionAportes.obtenerEstado().subscribe({
      next: (estado) => {
        this.cargandoGeneracionAportes.set(false);
        if (!estado) {
          this.activaGeneracionAportes.set(null);
          this.motivoGeneracionAportes.set(null);
          return;
        }
        this.activaGeneracionAportes.set(!!estado.activa);
        this.motivoGeneracionAportes.set(estado.motivoUltimoCambio ?? null);
      },
      error: () => {
        this.cargandoGeneracionAportes.set(false);
        this.activaGeneracionAportes.set(null);
        this.motivoGeneracionAportes.set(null);
        this.snackBar.open('No se pudo consultar el estado de la generación de aportes por contratos.', 'Cerrar', {
          duration: 5000,
        });
      },
    });
  }

  /**
   * El switch dispara esto en vez de mutar `activaGeneracionAportes` directamente. Al ENCENDER
   * (§B.3), primero hay que confirmar el aviso de impacto — cambia la fuente del próximo archivo
   * Petro y del próximo asiento de apertura — y solo si confirma se pide el motivo.
   */
  solicitarCambioGeneracionAportes(): void {
    if (this.cargandoGeneracionAportes() || this.cambiandoGeneracionAportes()) return;

    const estadoActual = this.activaGeneracionAportes();
    const encenderla = estadoActual !== true; // desde "desconocido" el único movimiento sensato es encenderla

    if (encenderla) {
      const confirmacion: ConfirmDialogData = {
        title: 'Encender la generación de aportes por contratos',
        message:
          'Cambia la fuente del próximo archivo Petro de aportes y del próximo asiento de apertura. ' +
          'Revise primero que los contratos tengan sus vigencias cargadas.',
        confirmText: 'Continuar',
        cancelText: 'Cancelar',
        type: 'warning',
      };
      this.dialog
        .open(ConfirmDialogComponent, { data: confirmacion, width: '520px' })
        .afterClosed()
        .subscribe((confirmado) => {
          if (confirmado) this.pedirMotivoGeneracionAportes(true);
        });
      return;
    }

    this.pedirMotivoGeneracionAportes(false);
  }

  private pedirMotivoGeneracionAportes(encenderla: boolean): void {
    const datos: MotivoDialogData = {
      titulo: encenderla
        ? 'Encender la generación de aportes por contratos'
        : 'Apagar la generación de aportes por contratos',
      advertencia: encenderla
        ? 'El archivo Petro de aportes y el asiento de apertura del cierre de cartera pasarán a tomar el monto de las vigencias de contrato en vez del historial de sueldos.'
        : 'El archivo Petro de aportes y el asiento de apertura del cierre de cartera volverán a tomar el monto del historial de sueldos (HSTR).',
      textoConfirmar: encenderla ? 'Encender' : 'Apagar',
    };

    this.dialog
      .open(MotivoDialogComponent, { data: datos, width: '520px', maxWidth: '96vw', autoFocus: false })
      .afterClosed()
      .subscribe((motivo?: string | null) => {
        if (!motivo) return;
        this.aplicarCambioGeneracionAportes(encenderla, motivo);
      });
  }

  private aplicarCambioGeneracionAportes(activa: boolean, motivo: string): void {
    this.cambiandoGeneracionAportes.set(true);
    this.servicioGeneracionAportes.actualizar({ activa, usuario: usuarioSesion(), motivo }).subscribe({
      next: (resultado) => {
        this.cambiandoGeneracionAportes.set(false);
        if (!resultado) {
          this.snackBar.open('No se pudo actualizar la generación de aportes por contratos.', 'Cerrar', {
            duration: 5000,
          });
          return;
        }
        this.activaGeneracionAportes.set(!!resultado.activa);
        this.motivoGeneracionAportes.set(resultado.motivoUltimoCambio ?? motivo);
        this.snackBar.open(
          resultado.activa
            ? 'Generación de aportes por contratos encendida.'
            : 'Generación de aportes por contratos apagada.',
          'Cerrar',
          { duration: 4000 }
        );
      },
      error: (error) => {
        this.cambiandoGeneracionAportes.set(false);
        this.snackBar.open(
          this.mensajeDeError(error, 'No se pudo actualizar la generación de aportes por contratos.'),
          'Cerrar',
          { duration: 6000 }
        );
      },
    });
  }

  /**
   * Los errores ≥ 400 de este backend llegan como `{ mensaje }`: `MensajeErrorJsonFilter`
   * (`saaBE/src/main/java/com/saa/ws/rest/MensajeErrorJsonFilter.java:73-90`), un `@Provider`
   * global, envuelve en ese JSON cualquier respuesta de error cuya entidad sea un `String` con
   * tipo declarado JSON — el caso del 500 del catálogo faltante de
   * `ConfiguracionGeneracionAportesServiceImpl.actualizar:107-114`. La rama del string crudo es
   * solo un respaldo, por si algún endpoint quedara fuera de ese filtro.
   */
  private mensajeDeError(error: unknown, generico: string): string {
    if (typeof error === 'string' && error.trim()) return error;
    if (error && typeof error === 'object' && 'mensaje' in error) {
      const mensaje = (error as { mensaje?: unknown }).mensaje;
      if (typeof mensaje === 'string' && mensaje.trim()) return mensaje;
    }
    return generico;
  }
}
