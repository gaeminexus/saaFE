import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { guardarArchivo } from '../../../../shared/services/descarga-reporte';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { JasperReportesService } from '../../../../shared/services/jasper-reportes.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { formatearMoneda } from '../../../../shared/utils/moneda.util';
import { ConfirmarDeclaracionDialogComponent } from '../../dialog/plazo-vencido/confirmar-declaracion-dialog.component';
import { RevertirDeclaracionDialogComponent } from '../../dialog/plazo-vencido/revertir-declaracion-dialog.component';
import {
  CuadroPlazoVencido,
  DeclaracionPlazoVencido,
  EstadoPlazoVencido,
  FiltrosListarPlazoVencido,
  FormatoDocumentoPlazoVencido,
  PrestamoADeclararPlazoVencido,
  ResultadoDeclaracionPlazoVencido,
  TEXTO_ESTADO_PLAZO_VENCIDO,
} from '../../model/plazo-vencido/plazo-vencido.model';
import { PlazoVencidoService } from '../../service/plazo-vencido.service';

/** Fila mutable de la tabla de candidatos (pestaña 1): guarda el nro. de memorando que se teclea. */
interface FilaCandidatoPlazoVencido {
  cuadro: CuadroPlazoVencido;
  numeroMemorando: string;
}

/** Fila mutable de la bandeja "Por liquidar" (pestaña 2): cada una lleva su propia fecha de corte. */
interface FilaPorLiquidar {
  declaracion: DeclaracionPlazoVencido;
  fechaCorte: Date;
  liquidando: boolean;
}

/**
 * Declaración de plazo vencido — memorando, liquidación y reverso (§11,
 * docs/crd/API-PASE-A-PLAZO-VENCIDO.md).
 *
 * El backend recalcula SIEMPRE (§2.1 del contrato): esta pantalla nunca manda un monto que ella
 * misma calculó. Lo que muestra la tabla de candidatos es una vista previa; `declarar` vuelve a
 * calcular todo a la fecha de corte y graba eso.
 *
 * ⛔ H13: un 409/422 del backend se muestra TAL CUAL (`PlazoVencidoService` ya lo entrega así, sin
 * convertirlo en "sin datos"). No se reemplaza por un mensaje genérico.
 */
@Component({
  selector: 'app-plazo-vencido',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './plazo-vencido.component.html',
  styleUrl: './plazo-vencido.component.scss',
})
export class PlazoVencidoComponent {
  private servicio = inject(PlazoVencidoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private jasperReportes = inject(JasperReportesService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly hoy = new Date();
  readonly EstadoPlazoVencido = EstadoPlazoVencido;
  readonly textoEstado = TEXTO_ESTADO_PLAZO_VENCIDO;
  formatMoneda = formatearMoneda;

  // ========================= Pestaña 1: Declarar =========================

  fechaCorteDeclarar = signal<Date>(new Date());
  consultandoCandidatos = signal(false);
  errorCandidatos = signal<string | null>(null);
  filasCandidatos = signal<FilaCandidatoPlazoVencido[]>([]);
  seleccionados = signal<Set<number>>(new Set());

  paraNombre = signal('');
  paraCargo = signal('');
  ccNombre = signal('');
  ccCargo = signal('');
  cargandoEncabezado = signal(false);

  declarando = signal(false);
  resultadoDeclaracion = signal<ResultadoDeclaracionPlazoVencido[] | null>(null);

  filasSeleccionadas = computed(() => {
    const set = this.seleccionados();
    return this.filasCandidatos().filter((f) => set.has(f.cuadro.idPrestamo));
  });

  totalSeleccionado = computed(() =>
    +this.filasSeleccionadas().reduce((s, f) => s + (f.cuadro.totalPorCobrar ?? 0), 0).toFixed(2)
  );

  cuotasSinSeguroSeleccionado = computed(() =>
    this.filasSeleccionadas().reduce((s, f) => s + (f.cuadro.cuotasConSeguroAAnular ?? 0), 0)
  );

  encabezadoCompleto = computed(
    () => !!this.paraNombre().trim() && !!this.paraCargo().trim() && !!this.ccNombre().trim() && !!this.ccCargo().trim()
  );

  puedeDeclarar = computed(() => {
    if (this.declarando() || !this.seleccionados().size || !this.encabezadoCompleto()) return false;
    return this.filasSeleccionadas().every((f) => f.numeroMemorando.trim().length > 0);
  });

  constructor() {
    this.cargarEncabezado();
    this.cargarPorLiquidar();
    this.buscarHistorial();
  }

  private cargarEncabezado(): void {
    this.cargandoEncabezado.set(true);
    this.servicio.ultimoEncabezado().subscribe({
      next: (enc) => {
        this.cargandoEncabezado.set(false);
        this.paraNombre.set(enc.paraNombre ?? '');
        this.paraCargo.set(enc.paraCargo ?? '');
        this.ccNombre.set(enc.ccNombre ?? '');
        this.ccCargo.set(enc.ccCargo ?? '');
      },
      error: (e: Error) => {
        this.cargandoEncabezado.set(false);
        this.mostrarError(e.message);
      },
    });
  }

  consultarCandidatos(): void {
    const fecha = this.servicio.formatearFecha(this.fechaCorteDeclarar());
    if (!fecha) {
      this.errorCandidatos.set('Indique una fecha de corte válida.');
      return;
    }

    this.consultandoCandidatos.set(true);
    this.errorCandidatos.set(null);
    this.resultadoDeclaracion.set(null);
    this.seleccionados.set(new Set());

    this.servicio.candidatos(fecha).subscribe({
      next: (filas) => {
        this.consultandoCandidatos.set(false);
        this.filasCandidatos.set(filas.map((cuadro) => ({ cuadro, numeroMemorando: '' })));
      },
      error: (e: Error) => {
        this.consultandoCandidatos.set(false);
        this.filasCandidatos.set([]);
        this.errorCandidatos.set(e.message);
      },
    });
  }

  alternarSeleccion(fila: FilaCandidatoPlazoVencido): void {
    if (!fila.cuadro.valido) return;
    const set = new Set(this.seleccionados());
    if (set.has(fila.cuadro.idPrestamo)) set.delete(fila.cuadro.idPrestamo);
    else set.add(fila.cuadro.idPrestamo);
    this.seleccionados.set(set);
  }

  estaSeleccionado(fila: FilaCandidatoPlazoVencido): boolean {
    return this.seleccionados().has(fila.cuadro.idPrestamo);
  }

  declararPlazoVencido(): void {
    if (!this.puedeDeclarar()) return;

    this.dialog
      .open(ConfirmarDeclaracionDialogComponent, {
        data: {
          cantidadPrestamos: this.seleccionados().size,
          totalPorCobrar: this.totalSeleccionado(),
          cuotasSinSeguro: this.cuotasSinSeguroSeleccionado(),
        },
        width: '480px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((confirmado?: boolean) => {
        if (confirmado) this.confirmarDeclaracion();
      });
  }

  private confirmarDeclaracion(): void {
    const fecha = this.servicio.formatearFecha(this.fechaCorteDeclarar());
    if (!fecha) return;

    const prestamos: PrestamoADeclararPlazoVencido[] = this.filasSeleccionadas().map((f) => ({
      idPrestamo: f.cuadro.idPrestamo,
      numeroMemorando: f.numeroMemorando.trim(),
    }));

    this.declarando.set(true);
    this.servicio
      .declarar({
        fechaCorte: fecha,
        usuario: usuarioSesion(),
        paraNombre: this.paraNombre().trim(),
        paraCargo: this.paraCargo().trim(),
        ccNombre: this.ccNombre().trim(),
        ccCargo: this.ccCargo().trim(),
        prestamos,
      })
      .subscribe({
        next: (resultado) => {
          this.declarando.set(false);
          this.resultadoDeclaracion.set(resultado);
          this.snackBar.open(
            `${resultado.length} préstamo${resultado.length === 1 ? '' : 's'} declarado${resultado.length === 1 ? '' : 's'} en plazo vencido.`,
            'Cerrar',
            { duration: 5000 }
          );
          this.consultarCandidatos();
          this.cargarPorLiquidar();
          this.buscarHistorial();
        },
        error: (e: Error) => {
          this.declarando.set(false);
          this.mostrarError(e.message);
        },
      });
  }

  // ========================= Pestaña 2: Por liquidar =========================

  filasPorLiquidar = signal<FilaPorLiquidar[]>([]);
  cargandoPorLiquidar = signal(false);
  errorPorLiquidar = signal<string | null>(null);

  cargarPorLiquidar(): void {
    this.cargandoPorLiquidar.set(true);
    this.errorPorLiquidar.set(null);
    this.servicio.listar({ estado: EstadoPlazoVencido.DECLARADA }).subscribe({
      next: (lista) => {
        this.cargandoPorLiquidar.set(false);
        this.filasPorLiquidar.set(lista.map((declaracion) => ({ declaracion, fechaCorte: new Date(), liquidando: false })));
      },
      error: (e: Error) => {
        this.cargandoPorLiquidar.set(false);
        this.errorPorLiquidar.set(e.message);
      },
    });
  }

  liquidar(fila: FilaPorLiquidar): void {
    const fecha = this.servicio.formatearFecha(fila.fechaCorte);
    if (!fecha) {
      this.mostrarError('Indique una fecha de corte válida.');
      return;
    }

    fila.liquidando = true;
    this.servicio.liquidar(fila.declaracion.idDeclaracion, { fechaCorte: fecha, usuario: usuarioSesion() }).subscribe({
      next: (declaracionLiquidada) => {
        fila.liquidando = false;
        this.snackBar.open(
          `Declaración ${declaracionLiquidada.numeroMemorando} liquidada. Ya puede descargar la liquidación desde Historial.`,
          'Cerrar',
          { duration: 6000 }
        );
        this.filasPorLiquidar.update((filas) => filas.filter((f) => f !== fila));
        this.buscarHistorial();
      },
      error: (e: Error) => {
        fila.liquidando = false;
        this.mostrarError(e.message);
      },
    });
  }

  // ========================= Pestaña 3: Historial =========================

  filtroEstadoHistorial = signal<EstadoPlazoVencido | null>(null);
  filtroDesdeHistorial = signal<Date | null>(null);
  filtroHastaHistorial = signal<Date | null>(null);
  cargandoHistorial = signal(false);
  errorHistorial = signal<string | null>(null);
  historial = signal<DeclaracionPlazoVencido[]>([]);

  buscarHistorial(): void {
    const filtros: FiltrosListarPlazoVencido = {};
    const estado = this.filtroEstadoHistorial();
    if (estado != null) filtros.estado = estado;
    const desde = this.servicio.formatearFecha(this.filtroDesdeHistorial());
    if (desde) filtros.desde = desde;
    const hasta = this.servicio.formatearFecha(this.filtroHastaHistorial());
    if (hasta) filtros.hasta = hasta;

    this.cargandoHistorial.set(true);
    this.errorHistorial.set(null);
    this.servicio.listar(filtros).subscribe({
      next: (lista) => {
        this.cargandoHistorial.set(false);
        this.historial.set(lista);
      },
      error: (e: Error) => {
        this.cargandoHistorial.set(false);
        this.errorHistorial.set(e.message);
      },
    });
  }

  limpiarFiltrosHistorial(): void {
    this.filtroEstadoHistorial.set(null);
    this.filtroDesdeHistorial.set(null);
    this.filtroHastaHistorial.set(null);
    this.buscarHistorial();
  }

  /** Revertir solo aparece en DECLARADA o LIQUIDADA (§7, §11). */
  puedeRevertir(d: DeclaracionPlazoVencido): boolean {
    return d.estado === EstadoPlazoVencido.DECLARADA || d.estado === EstadoPlazoVencido.LIQUIDADA;
  }

  revertir(d: DeclaracionPlazoVencido): void {
    this.dialog
      .open(RevertirDeclaracionDialogComponent, {
        data: { numeroMemorando: d.numeroMemorando, nombreParticipe: d.nombreParticipe },
        width: '480px',
        autoFocus: false,
      })
      .afterClosed()
      .subscribe((motivo?: string) => {
        if (!motivo) return;
        this.servicio.revertir(d.idDeclaracion, { usuario: usuarioSesion(), motivo }).subscribe({
          next: (resultado) => {
            this.snackBar.open(
              `Declaración revertida. Cuotas restituidas: ${resultado.cuotasRestituidas}, sin restituir: ${resultado.cuotasNoRestituidas}.`,
              'Cerrar',
              { duration: 7000 }
            );
            this.buscarHistorial();
            this.cargarPorLiquidar();
          },
          error: (e: Error) => this.mostrarError(e.message),
        });
      });
  }

  // ========================= Documentos (§8) =========================

  descargarMemorando(idDeclaracion: number, numeroMemorando: string, formato: FormatoDocumentoPlazoVencido): void {
    this.servicio.memorando(idDeclaracion, formato).subscribe({
      next: (doc) => guardarArchivo(doc.blob, doc.nombreArchivo || `ORDEN_DE_COBRO_${numeroMemorando}.${formato.toLowerCase()}`),
      error: (e: Error) => this.mostrarError(e.message),
    });
  }

  descargarLiquidacion(idDeclaracion: number, numeroMemorando: string, formato: FormatoDocumentoPlazoVencido): void {
    this.servicio.liquidacionDocumento(idDeclaracion, formato).subscribe({
      next: (doc) => guardarArchivo(doc.blob, doc.nombreArchivo || `LIQUIDACION_${numeroMemorando}.${formato.toLowerCase()}`),
      error: (e: Error) => this.mostrarError(e.message),
    });
  }

  /** Mismo llamado que `participe-dash.component.ts:958-976`: el reporte de tabla ya existe, no se crea otro. */
  imprimirTablaAmortizacion(idPrestamo: number, numeroPrestamo: string): void {
    const parametros = {
      P_PRSTCDGO: idPrestamo,
      P_IMAGEN: null,
      P_USUARIO: localStorage.getItem('username') || localStorage.getItem('userName') || '',
    };

    this.snackBar.open('Generando reporte...', '', { duration: 2000 });
    this.jasperReportes.generar('crd', 'RPRT_TBLA_ACML', parametros, 'PDF').subscribe({
      next: (blob) => guardarArchivo(blob, `tabla-amortizacion-${numeroPrestamo}.pdf`),
      error: () => this.mostrarError('No se pudo generar el reporte de la tabla de amortización.'),
    });
  }

  // ========================= utilidades =========================

  formatFecha(fecha: Date | null): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  formatFechaHora(fecha: Date | null): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA) || '—';
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 8000 });
  }
}
