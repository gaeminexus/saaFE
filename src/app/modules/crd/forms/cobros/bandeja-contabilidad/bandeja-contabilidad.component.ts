import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';

import { MotivoDialogComponent, MotivoDialogData } from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { RecepcionValorSeguro } from '../../../model/recepcion-valor-seguro';
import { RecepcionValorSeguroService } from '../../../service/recepcion-valor-seguro.service';
import { nombreTipoOperacionCobro } from '../../../model/cobros/catalogos-cobro';
import { FilaBandejaAprobacion, RespuestaCobroCreditoDetalle } from '../../../model/cobros/cobro-credito';
import { CobroCreditoService } from '../../../service/cobro-credito.service';
import { ComprobanteViewerComponent } from '../../../dialog/cobros/comprobante-viewer.component';
import { CobroPetroPaso1Component } from '../../archivos-petro/carga/detalle-consulta-carga/cobro-petro-paso1/cobro-petro-paso1.component';

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
  imports: [CommonModule, FormsModule, MaterialFormModule, ComprobanteViewerComponent, CobroPetroPaso1Component],
  templateUrl: './bandeja-contabilidad.component.html',
  styleUrl: './bandeja-contabilidad.component.scss',
})
export class BandejaContabilidadComponent {
  private cobros = inject(CobroCreditoService);
  private recepcionesSeguro = inject(RecepcionValorSeguroService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  cargando = signal(false);
  filas = signal<FilaBandejaAprobacion[]>([]);
  filaSeleccionada = signal<FilaBandejaAprobacion | null>(null);

  cargandoDetalle = signal(false);
  detalle = signal<RespuestaCobroCreditoDetalle | null>(null);
  errorDetalle = signal<string | null>(null);

  procesando = signal(false);

  /** Recepciones de valores de seguro pendientes, por código: el detalle sale de la propia lista. */
  recepcionesPorId = signal<Map<number, RecepcionValorSeguro>>(new Map());
  errorRecepciones = signal(false);

  readonly nombreTipoOperacionCobro = nombreTipoOperacionCobro;

  totalPendientes = computed(() => this.filas().length);

  constructor() {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.filaSeleccionada.set(null);
    this.detalle.set(null);
    forkJoin({
      filas: this.cobros.bandejaAprobacion(),
      recepciones: this.recepcionesSeguro.pendientes(),
    }).subscribe(({ filas, recepciones }) => {
      this.cargando.set(false);
      // `null` = la consulta falló: se avisa, no se hace pasar por «no hay pendientes».
      this.errorRecepciones.set(recepciones === null);
      this.recepcionesPorId.set(new Map((recepciones ?? []).map((r) => [r.codigo, r])));
      const filasRecepcion: FilaBandejaAprobacion[] = (recepciones ?? []).map((r) => ({
        tipo: 'RECEPCION_SEGURO',
        id: r.codigo,
        descripcion: r.entidad?.razonSocial ?? '—',
        valor: r.valor,
        usuarioRegistro: r.usuarioRegistro ?? '',
        fechaRegistro: r.fechaRegistro ?? r.fecha,
      }));
      this.filas.set([...filas, ...filasRecepcion]);
    });
  }

  /** Recepción de seguro de la fila seleccionada, o `null` si la fila es de otro tipo. */
  recepcionSeleccionada(): RecepcionValorSeguro | null {
    const fila = this.filaSeleccionada();
    return fila?.tipo === 'RECEPCION_SEGURO' ? this.recepcionesPorId().get(fila.id) ?? null : null;
  }

  etiquetaTipo(tipo: FilaBandejaAprobacion['tipo']): string {
    return tipo === 'CARGA_PETRO' ? 'Carga Petro' : tipo === 'RECEPCION_SEGURO' ? 'Seguro' : 'Cobro';
  }

  seleccionar(fila: FilaBandejaAprobacion): void {
    this.filaSeleccionada.set(fila);
    this.detalle.set(null);
    this.errorDetalle.set(null);

    // El detalle de una recepción de seguro ya viene completo en la lista de pendientes.
    if (fila.tipo === 'RECEPCION_SEGURO') return;

    if (fila.tipo === 'CARGA_PETRO') {
      // Detalle y acciones (transferencias, confirmar recepción, reversar) los resuelve el propio
      // `CobroPetroPaso1Component` embebido en la plantilla — se le pasa `fila.id` como `idCarga`
      // y se autoabastece (docs/crd/API-COBRO-PETRO-DOS-PASOS.md). No hay "rechazar" simétrico acá:
      // en una fila pendiente la única acción es confirmar; si contabilidad no está de acuerdo,
      // simplemente no confirma.
      return;
    }

    this.cargandoDetalle.set(true);
    this.cobros.getId(fila.id).subscribe((resp) => {
      this.cargandoDetalle.set(false);
      if (!resp) {
        this.errorDetalle.set('No se pudo cargar el detalle de este cobro.');
        return;
      }
      this.detalle.set(resp);
    });
  }

  /** Préstamo #idAsoprep, o el tipo de aporte, según a cuál corresponda la línea. */
  nombreLineaDetalle(linea: RespuestaCobroCreditoDetalle['detalle'][number]): string {
    if (linea.prestamo) return `Préstamo #${linea.prestamo.idAsoprep ?? linea.prestamo.codigo}`;
    if (linea.tipoAporte) return linea.tipoAporte.nombre;
    return '—';
  }

  aprobarRecepcion(): void {
    const fila = this.filaSeleccionada();
    if (!fila || fila.tipo !== 'RECEPCION_SEGURO' || this.procesando()) return;

    this.procesando.set(true);
    this.recepcionesSeguro.aprobar(fila.id, { usuario: usuarioSesion() }).subscribe((resp) => {
      this.procesando.set(false);
      if (!resp.exito) {
        // Mensaje del servidor tal cual: incluye el 409 de contabilidad de CRD desactivada.
        this.snackBar.open(resp.mensaje ?? 'No se pudo aprobar la recepción.', 'Cerrar', { duration: 12000 });
        return;
      }
      this.snackBar.open('Recepción aprobada: el valor ya está en la cuenta del partícipe.', 'Cerrar', { duration: 5000 });
      this.cargar();
    });
  }

  rechazarRecepcion(): void {
    const fila = this.filaSeleccionada();
    if (!fila || fila.tipo !== 'RECEPCION_SEGURO' || this.procesando()) return;

    const data: MotivoDialogData = {
      titulo: 'Rechazar recepción de seguro',
      advertencia: 'La recepción queda rechazada y no genera asiento. Indique por qué se rechaza.',
      textoConfirmar: 'Rechazar',
    };

    this.dialog
      .open(MotivoDialogComponent, { width: '480px', data })
      .afterClosed()
      .subscribe((motivo?: string | null) => {
        if (!motivo) return;
        this.procesando.set(true);
        this.recepcionesSeguro.rechazar(fila.id, { usuario: usuarioSesion(), motivo }).subscribe((resp) => {
          this.procesando.set(false);
          if (!resp.exito) {
            this.snackBar.open(resp.mensaje ?? 'No se pudo rechazar la recepción.', 'Cerrar', { duration: 8000 });
            return;
          }
          this.snackBar.open('Recepción rechazada.', 'Cerrar', { duration: 4000 });
          this.cargar();
        });
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
