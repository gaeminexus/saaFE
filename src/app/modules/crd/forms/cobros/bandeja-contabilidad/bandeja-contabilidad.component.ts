import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MotivoDialogComponent, MotivoDialogData } from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { nombreTipoOperacionCobro } from '../../../model/cobros/catalogos-cobro';
import { CobroCredito, FilaBandejaAprobacion } from '../../../model/cobros/cobro-credito';
import { CobroCreditoService } from '../../../service/cobro-credito.service';
import { ComprobanteViewerComponent } from '../../../dialog/cobros/comprobante-viewer.component';

/**
 * Bandeja de contabilidad (§5.1 de docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md).
 *
 * Lista COMBINADA: cobros de crédito y cargas Petro pendientes en una sola lista — un tercer tipo
 * de fila, no un tercer mecanismo. La aprobación del archivo Petro se movió acá desde la pantalla
 * de carga; lo que se queda ahí es *procesar* el archivo ya aprobado.
 *
 * La fila de `bandejaAprobacion()` es deliberadamente pobre (tipo, id, descripción, valor, quién y
 * cuándo la registró) porque cobro de crédito y carga Petro no comparten modelo. El detalle —y el
 * comprobante, que es lo único que contabilidad realmente necesita ver— se pide aparte al abrir la
 * fila: lista + panel de detalle, no una grilla que ya lo tenga todo.
 */
@Component({
  selector: 'app-bandeja-contabilidad',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, ComprobanteViewerComponent],
  templateUrl: './bandeja-contabilidad.component.html',
  styleUrl: './bandeja-contabilidad.component.scss',
})
export class BandejaContabilidadComponent {
  private cobros = inject(CobroCreditoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  cargando = signal(false);
  filas = signal<FilaBandejaAprobacion[]>([]);
  filaSeleccionada = signal<FilaBandejaAprobacion | null>(null);

  cargandoDetalle = signal(false);
  detalle = signal<CobroCredito | null>(null);
  errorDetalle = signal<string | null>(null);

  procesando = signal(false);

  readonly nombreTipoOperacionCobro = nombreTipoOperacionCobro;

  totalPendientes = computed(() => this.filas().length);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.filaSeleccionada.set(null);
    this.detalle.set(null);
    this.cobros.bandejaAprobacion().subscribe((filas) => {
      this.cargando.set(false);
      this.filas.set(filas);
    });
  }

  seleccionar(fila: FilaBandejaAprobacion): void {
    this.filaSeleccionada.set(fila);
    this.detalle.set(null);
    this.errorDetalle.set(null);

    if (fila.tipo === 'CARGA_PETRO') {
      // No hay endpoint de detalle/aprobación de carga Petro en este contrato todavía — ver reporte
      // a saabe-4b. Se muestra la fila igual (no se oculta de la lista) pero sin acciones.
      return;
    }

    this.cargandoDetalle.set(true);
    this.cobros.getId(fila.id).subscribe((cobro) => {
      this.cargandoDetalle.set(false);
      if (!cobro) {
        this.errorDetalle.set('No se pudo cargar el detalle de este cobro.');
        return;
      }
      this.detalle.set(cobro);
    });
  }

  aprobar(): void {
    const fila = this.filaSeleccionada();
    if (!fila || fila.tipo !== 'COBRO_CREDITO' || this.procesando()) return;

    this.procesando.set(true);
    this.cobros.aprobar(fila.id, { usuario: usuarioSesion() }).subscribe((resp) => {
      this.procesando.set(false);
      if (!resp.exito) {
        this.snackBar.open(resp.mensaje ?? 'No se pudo aprobar el cobro.', 'Cerrar', { duration: 6000 });
        return;
      }
      this.snackBar.open('Cobro aprobado.', 'Cerrar', { duration: 4000 });
      this.cargar();
    });
  }

  rechazar(): void {
    const fila = this.filaSeleccionada();
    if (!fila || fila.tipo !== 'COBRO_CREDITO' || this.procesando()) return;

    const data: MotivoDialogData = {
      titulo: 'Rechazar cobro',
      advertencia: 'El cobro vuelve a crédito para corregir y reenviar. Indique por qué se rechaza.',
      textoConfirmar: 'Rechazar',
    };

    this.dialog
      .open(MotivoDialogComponent, { width: '480px', data })
      .afterClosed()
      .subscribe((motivo?: string | null) => {
        if (!motivo) return;
        this.procesando.set(true);
        this.cobros.rechazar(fila.id, { usuario: usuarioSesion(), motivo }).subscribe((resp) => {
          this.procesando.set(false);
          if (!resp.exito) {
            this.snackBar.open(resp.mensaje ?? 'No se pudo rechazar el cobro.', 'Cerrar', { duration: 6000 });
            return;
          }
          this.snackBar.open('Cobro rechazado.', 'Cerrar', { duration: 4000 });
          this.cargar();
        });
      });
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }
}
