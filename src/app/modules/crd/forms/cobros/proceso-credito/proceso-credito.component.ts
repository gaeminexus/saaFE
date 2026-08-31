import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MotivoDialogComponent, MotivoDialogData } from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import { EstadoCobro, nombreTipoOperacionCobro } from '../../../model/cobros/catalogos-cobro';
import { CobroCredito, DetalleCobroCredito, DetalleCobroCreditoLectura } from '../../../model/cobros/cobro-credito';
import { CobroCreditoService } from '../../../service/cobro-credito.service';
import { ComprobanteCobroService } from '../../../service/comprobante-cobro.service';
import { ComprobanteViewerComponent } from '../../../dialog/cobros/comprobante-viewer.component';

/**
 * Proceso de crédito (§5.2 de docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md).
 *
 * Dos listas: APROBADOS (`bandeja/2`), con la acción Procesar que finalmente aplica el cobro; y
 * RECHAZADOS (`bandeja/4`), que se abren en modo EDICIÓN —no un simple reenvío— porque los motivos
 * reales de rechazo ("la referencia no coincide", "el comprobante está ilegible", "el valor no es
 * el que entró") exigen corregir el dato, no repetirlo.
 *
 * Simplificación consciente en la edición: los cobros de UNA sola línea (PAGO_CUOTA, ABONO_CAPITAL,
 * PRECANCELACION) permiten editar el valor total libremente. Los de VARIAS líneas (PAGO_MULTIPLE,
 * REGISTRO_APORTE) muestran el detalle de solo lectura y el valor total queda fijo en la suma de
 * esas líneas — editar la distribución entre préstamos/aportes no es parte de esta entrega.
 */
@Component({
  selector: 'app-proceso-credito',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, ComprobanteViewerComponent],
  templateUrl: './proceso-credito.component.html',
  styleUrl: './proceso-credito.component.scss',
})
export class ProcesoCreditoComponent {
  private cobros = inject(CobroCreditoService);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private comprobantes = inject(ComprobanteCobroService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly hoy = new Date();
  readonly nombreTipoOperacionCobro = nombreTipoOperacionCobro;
  readonly extensionesComprobante = this.comprobantes.extensionesAceptadas;

  cargando = signal(false);
  aprobados = signal<CobroCredito[]>([]);
  rechazados = signal<CobroCredito[]>([]);

  procesandoId = signal<number | null>(null);
  anulandoId = signal<number | null>(null);

  cuentasBancarias = signal<CuentaBancaria[]>([]);

  // ---- edición de un rechazado ----
  cobroEnEdicion = signal<CobroCredito | null>(null);
  editCuentaBancaria = signal<CuentaBancaria | null>(null);
  editReferencia = signal('');
  editValorTexto = signal('');
  editFecha = signal<Date | null>(new Date());
  editObservacion = '';
  editArchivoNuevo = signal<File | null>(null);
  guardandoEdicion = signal(false);
  errorEdicion = signal<string | null>(null);

  /**
   * Líneas reales del cobro en edición, pedidas aparte con `getId` — `bandeja/{estado}` (de donde
   * sale `cobroEnEdicion`) NUNCA trae el detalle, así que `cobro.detalles` acá siempre viene
   * `undefined` (docs/crd/API-COBROS-APROBACION-CONTABILIDAD.md §4).
   */
  editDetalleLineas = signal<DetalleCobroCreditoLectura[]>([]);
  cargandoDetalleEdicion = signal(false);

  /** Cobros de una sola línea: el valor total se puede editar libre. Con varias, queda fijo en la suma. */
  editEsUnaLinea = computed(() => this.editDetalleLineas().length <= 1);

  editValor = computed(() => this.parseMoneda(this.editValorTexto()));

  puedeGuardarEdicion = computed(() => {
    if (this.guardandoEdicion()) return false;
    if (this.cargandoDetalleEdicion()) return false;
    if (!this.editDetalleLineas().length) return false;
    if (!this.editCuentaBancaria()) return false;
    if (!this.editReferencia().trim()) return false;
    if (this.editValor() <= 0.004) return false;
    const fecha = this.editFecha();
    if (!fecha || isNaN(fecha.getTime())) return false;
    // Comprobante: obligatorio en el registro original, así que si no hay uno nuevo tiene que
    // quedar el que ya tenía — nunca se manda vacío.
    if (!this.editArchivoNuevo() && !this.cobroEnEdicion()?.rutaRespaldo) return false;
    return true;
  });

  constructor() {
    this.cargar();
    this.cargarCuentasBancarias();
  }

  cargar(): void {
    this.cargando.set(true);
    this.cobros.bandeja(EstadoCobro.APROBADO).subscribe((lista) => {
      this.aprobados.set(lista);
      this.terminarCarga();
    });
    this.cobros.bandeja(EstadoCobro.RECHAZADO).subscribe((lista) => {
      this.rechazados.set(lista);
      this.terminarCarga();
    });
  }

  private cargasPendientes = 0;
  private terminarCarga(): void {
    // Simple: alcanza con apagar el spinner cuando ambas listas ya respondieron una vez.
    this.cargando.set(false);
  }

  private cargarCuentasBancarias(): void {
    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'estado', '1', TipoComandosBusqueda.IGUAL);
    const criterioCobroCredito = new DatosBusqueda();
    criterioCobroCredito.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'cobroCredito', '1', TipoComandosBusqueda.IGUAL);

    this.cuentaBancariaService.selectByCriteria([criterioEstado, criterioCobroCredito]).subscribe({
      next: (cuentas) => {
        this.cuentasBancarias.set((cuentas ?? []).filter((c) => Number(c.estado) === 1 && Number(c.cobroCredito) === 1));
      },
      error: () => this.cuentasBancarias.set([]),
    });
  }

  compararCuenta(a: CuentaBancaria | null, b: CuentaBancaria | null): boolean {
    return a?.codigo === b?.codigo;
  }

  // ================= procesar (aprobados) =================

  procesar(cobro: CobroCredito): void {
    if (this.procesandoId() != null) return;
    this.procesandoId.set(cobro.codigo);

    this.cobros.procesar(cobro.codigo, { usuario: usuarioSesion() }).subscribe((resp) => {
      this.procesandoId.set(null);
      if (!resp.exito || !resp.resultado) {
        this.snackBar.open(resp.mensaje ?? 'No se pudo procesar el cobro.', 'Cerrar', { duration: 6000 });
        return;
      }

      // ⚠️ HTTP 200 no es sinónimo de éxito acá: hay que mirar `procesado`, nunca el código HTTP.
      if (resp.resultado.procesado) {
        this.snackBar.open(resp.resultado.mensaje || 'Cobro procesado.', 'Cerrar', { duration: 5000 });
      } else {
        this.snackBar.open(
          `No se aplicó: ${resp.resultado.mensaje || 'el cobro quedó rechazado automáticamente (el monto ya no coincide con el préstamo).'}`,
          'Cerrar',
          { duration: 10000 }
        );
      }
      this.cargar();
    });
  }

  // ================= anular (aprobados y rechazados) =================

  anular(cobro: CobroCredito): void {
    if (this.anulandoId() != null) return;

    const data: MotivoDialogData = {
      titulo: `Anular cobro #${cobro.codigo}`,
      advertencia: 'El cobro queda anulado en forma terminal. Indique el motivo.',
      textoConfirmar: 'Anular',
    };

    this.dialog
      .open(MotivoDialogComponent, { width: '480px', data })
      .afterClosed()
      .subscribe((motivo?: string | null) => {
        if (!motivo) return;
        this.anulandoId.set(cobro.codigo);
        this.cobros.anular(cobro.codigo, { usuario: usuarioSesion(), motivo }).subscribe((resp) => {
          this.anulandoId.set(null);
          if (!resp.exito) {
            this.snackBar.open(resp.mensaje ?? 'No se pudo anular el cobro.', 'Cerrar', { duration: 6000 });
            return;
          }
          this.snackBar.open('Cobro anulado.', 'Cerrar', { duration: 4000 });
          if (this.cobroEnEdicion()?.codigo === cobro.codigo) this.cerrarEdicion();
          this.cargar();
        });
      });
  }

  // ================= editar y reenviar (rechazados) =================

  abrirEdicion(cobro: CobroCredito): void {
    this.cobroEnEdicion.set(cobro);
    this.errorEdicion.set(null);
    this.editReferencia.set(cobro.referencia ?? '');
    this.editValorTexto.set(this.formatMoneda(cobro.valor));
    this.editFecha.set(this.funcionesDatos.convertirFechaDesdeBackend(cobro.fecha as never) as Date | null);
    this.editObservacion = cobro.observacion ?? '';
    this.editArchivoNuevo.set(null);
    this.editDetalleLineas.set([]);

    const cuentaActual = cobro.cuentaBancaria;
    const encontrada = this.cuentasBancarias().find((c) => c.codigo === cuentaActual?.codigo);
    this.editCuentaBancaria.set(encontrada ?? cuentaActual ?? null);

    // `bandeja/{estado}` no trae el detalle: se pide aparte con `getId` antes de poder decidir si
    // el valor se edita libre (una línea) o queda fijo en la suma (varias).
    this.cargandoDetalleEdicion.set(true);
    this.cobros.getId(cobro.codigo).subscribe((resp) => {
      this.cargandoDetalleEdicion.set(false);
      if (!resp || !resp.detalle.length) {
        this.errorEdicion.set('No se pudo cargar el detalle de este cobro. Vuelva a intentarlo antes de reenviar.');
        return;
      }
      this.editDetalleLineas.set(resp.detalle);
    });
  }

  cerrarEdicion(): void {
    this.cobroEnEdicion.set(null);
  }

  onArchivoEdicionSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      const problema = this.comprobantes.problemaDelArchivo(file);
      if (problema) {
        input.value = '';
        this.snackBar.open(problema, 'Cerrar', { duration: 5000 });
        return;
      }
    }
    this.editArchivoNuevo.set(file);
  }

  guardarYReenviar(): void {
    const cobro = this.cobroEnEdicion();
    if (!cobro || !this.puedeGuardarEdicion()) return;

    this.errorEdicion.set(null);
    this.guardandoEdicion.set(true);

    const archivo = this.editArchivoNuevo();
    if (!archivo) {
      this.enviarReenvio(cobro, cobro.rutaRespaldo);
      return;
    }

    this.comprobantes
      .archivar(archivo, this.comprobantes.carpetaDeCobroCredito(cobro.codigo), `${cobro.codigo}-reenvio`)
      .subscribe((resultado) => {
        if (resultado.error || !resultado.ruta) {
          this.guardandoEdicion.set(false);
          this.errorEdicion.set(this.comprobantes.mensajeDeFallo(resultado.error ?? ''));
          return;
        }
        this.enviarReenvio(cobro, resultado.ruta);
      });
  }

  private enviarReenvio(cobro: CobroCredito, rutaRespaldo: string): void {
    const cuenta = this.editCuentaBancaria();
    const lineas = this.editDetalleLineas();
    if (!cuenta || !lineas.length) {
      this.guardandoEdicion.set(false);
      return;
    }

    const valorTotal = this.editValor();
    // Una línea: el valor editado la reemplaza. Varias: de solo lectura, se reenvían con su
    // propio monto (el total ya viene fijo en la suma — ver `editEsUnaLinea`).
    const detalles: DetalleCobroCredito[] = this.editEsUnaLinea()
      ? [this.aDetalleEscritura(lineas[0], valorTotal)]
      : lineas.map((l) => this.aDetalleEscritura(l, l.valor));

    this.cobros
      .reenviar(cobro.codigo, {
        idCuentaBancaria: cuenta.codigo,
        referencia: this.editReferencia().trim(),
        rutaRespaldo,
        valor: valorTotal,
        fecha: this.cobros.formatearFecha(this.editFecha()) ?? '',
        observacion: this.editObservacion.trim() || null,
        detalles,
        usuario: usuarioSesion(),
      })
      .subscribe((resp) => {
        this.guardandoEdicion.set(false);
        if (!resp.exito) {
          this.errorEdicion.set(resp.mensaje ?? 'No se pudo reenviar el cobro.');
          return;
        }
        this.snackBar.open('Cobro corregido y reenviado a contabilidad.', 'Cerrar', { duration: 5000 });
        this.cerrarEdicion();
        this.cargar();
      });
  }

  /**
   * Convierte una línea de LECTURA (`getId`, con `prestamo`/`tipoAporte` como objetos completos) a
   * la forma de ESCRITURA que espera `reenviar` (`idPrestamo`/`idTipoAporte` sueltos).
   */
  private aDetalleEscritura(linea: DetalleCobroCreditoLectura, valor: number): DetalleCobroCredito {
    const periodo = linea.periodoDevengo;
    return {
      idPrestamo: linea.prestamo?.codigo ?? null,
      idTipoAporte: linea.tipoAporte?.codigo ?? null,
      periodoDevengo:
        periodo != null
          ? this.cobros.formatearFecha(this.funcionesDatos.convertirFechaDesdeBackend(periodo as never) as Date | null)
          : null,
      modalidad: linea.modalidad ?? null,
      valor,
    };
  }

  /** Préstamo #idAsoprep, o el tipo de aporte, según a cuál corresponda la línea. Para el detalle de solo lectura. */
  nombreLineaDetalle(linea: DetalleCobroCreditoLectura): string {
    if (linea.prestamo) return `Préstamo #${linea.prestamo.idAsoprep ?? linea.prestamo.codigo}`;
    if (linea.tipoAporte) return linea.tipoAporte.nombre;
    return '—';
  }

  // ================= utilidades =================

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }
}
