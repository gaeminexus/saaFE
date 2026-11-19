import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { ExportService } from '../../../../../shared/services/export.service';
import { FileService } from '../../../../../shared/services/file.service';
import {
  JustificarNovedadV2DialogComponent,
  JustificarV2Data,
} from '../../../dialog/justificar-novedad-v2-dialog/justificar-novedad-v2-dialog.component';
import { MotivoV2DialogComponent, MotivoV2Data } from '../../../dialog/justificar-novedad-v2-dialog/motivo-v2-dialog.component';
import { HechoCreditoV2DialogComponent, HechoCreditoV2Data } from '../../../dialog/hecho-credito-v2-dialog/hecho-credito-v2-dialog.component';
import { NotaNovedadV2DialogComponent, NotaNovedadV2Data } from '../../../dialog/nota-novedad-v2-dialog/nota-novedad-v2-dialog.component';
import { PermisosService } from '../../../../../shared/services/permisos.service';
import { Permisos } from '../../../../../shared/model/permisos';
import {
  AdjuntoV2,
  DetalleNovedadV2,
  DetalleOrigenV2,
  FilaNovedadV2,
  HechoV2,
  JustificacionV2,
  CalculoHechoV2,
  LineaV2,
  NotaV2,
  PedidoV2,
  ResultadoAccionV2,
  dinero,
  fechaCorta,
} from '../../../model/novedades-v2';
import { NovedadesV2Service } from '../../../service/novedades-v2.service';

interface BloqueOrigen {
  grupo: string;
  filas: DetalleOrigenV2[];
  prestamos: number;
  resumenEstados: string;
}

/**
 * C34 — Detalle de una novedad para el usuario de ASOPREP: qué pasó, por qué, cuánto, qué la originó, qué tiene que
 * hacer y en qué va; con las acciones del siguiente paso (justificar, responder, cerrar, dar por conocida).
 */
@Component({
  selector: 'app-detalle-novedad-v2',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './detalle-novedad-v2.component.html',
  styleUrl: './detalle-novedad-v2.component.scss',
})
export class DetalleNovedadV2Component implements OnChanges {
  @Input({ required: true }) idNovedad!: number;
  @Input({ required: true }) idEmpresa!: number;
  /** La fila de la bandeja cambió (después de una acción): el padre la reemplaza y recarga los contadores. */
  @Output() actualizada = new EventEmitter<FilaNovedadV2>();
  @Output() cerrarPanel = new EventEmitter<void>();

  private servicio = inject(NovedadesV2Service);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);
  private exportService = inject(ExportService);
  private fileService = inject(FileService);
  private permisos = inject(PermisosService);

  readonly dinero = dinero;
  readonly fecha = fechaCorta;
  readonly Math = Math;

  detalle = signal<DetalleNovedadV2 | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);
  seleccion = signal<Set<number>>(new Set<number>());
  soloPendientes = signal(true);
  abiertas = signal<Set<number>>(new Set<number>());

  fila = computed(() => this.detalle()?.fila ?? null);
  lineasVisibles = computed(() => {
    const d = this.detalle();
    if (!d) return [];
    return this.soloPendientes() ? d.lineas.filter((l) => l.saldo > 0.004) : d.lineas;
  });
  totalSeleccionado = computed(() => {
    const d = this.detalle();
    if (!d) return 0;
    return d.lineas.filter((l) => this.seleccion().has(l.codigo)).reduce((s, l) => s + l.saldo, 0);
  });
  bloquesOrigen = computed<BloqueOrigen[]>(() => {
    const d = this.detalle();
    if (!d) return [];
    const mapa = new Map<string, DetalleOrigenV2[]>();
    for (const f of d.detalleOrigen) {
      mapa.set(f.grupo, [...(mapa.get(f.grupo) || []), f]);
    }
    return [...mapa.entries()].map(([grupo, filas]) => {
      const estados = new Map<string, number>();
      for (const f of filas) {
        const e = f.estadoHoy || '—';
        estados.set(e, (estados.get(e) || 0) + 1);
      }
      return {
        grupo,
        filas,
        prestamos: new Set(filas.filter((f) => f.idPrestamo).map((f) => f.idPrestamo)).size,
        resumenEstados: [...estados.entries()].map(([e, n]) => `${n} ${e.toLowerCase()}`).join(', '),
      };
    });
  });
  pedidosPendientes = computed(() => (this.detalle()?.pedidos || []).filter((p) => !p.atendido));

  /** Paso de la barra: 1 justificar/responder, 2 lista para cerrar, 3 cerrada. */
  paso = computed(() => {
    const f = this.fila();
    if (!f) return 1;
    if (f.estado === 'CERRADA') return 3;
    if (f.estado === 'LISTA' || f.estado === 'POR_CONOCER') return 2;
    return 1;
  });

  ngOnChanges(): void {
    this.seleccion.set(new Set());
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.detalle(this.idNovedad).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.cargando.set(false);
        this.soloPendientes.set(d.lineas.some((l) => l.saldo > 0.004));
      },
      error: (e) => {
        this.error.set(String(e));
        this.cargando.set(false);
      },
    });
  }

  rutaSubida(): string {
    const f = this.fila();
    return f ? `novedades/${f.periodo}/${f.codigo}` : 'novedades';
  }

  // ---------------------------------------------------------------- selección de líneas

  alternar(l: LineaV2): void {
    if (l.saldo <= 0.004) return;
    const s = new Set(this.seleccion());
    s.has(l.codigo) ? s.delete(l.codigo) : s.add(l.codigo);
    this.seleccion.set(s);
  }

  seleccionarPendientes(sentido: 'D' | 'H' | null): void {
    const d = this.detalle();
    if (!d) return;
    this.seleccion.set(new Set(d.lineas.filter((l) => l.saldo > 0.004 && (!sentido || l.sentido === sentido)).map((l) => l.codigo)));
  }

  limpiarSeleccion(): void {
    this.seleccion.set(new Set());
  }

  alternarDetalle(l: LineaV2): void {
    const s = new Set(this.abiertas());
    s.has(l.codigo) ? s.delete(l.codigo) : s.add(l.codigo);
    this.abiertas.set(s);
  }

  // ---------------------------------------------------------------- acciones

  /** Botón del banner «Siguiente paso». */
  siguientePaso(): void {
    const f = this.fila();
    if (!f) return;
    if (f.estado === 'CERRADA') return this.reabrir();
    if (f.puedeCerrar) return this.cerrar();
    if (f.grupo === 'POR_REGULARIZAR') {
      if (this.seleccion().size === 0) {
        const d = this.detalle()!;
        const primera = d.lineas.find((l) => l.saldo > 0.004);
        if (primera) this.seleccion.set(new Set([primera.codigo]));
      }
      return this.justificar();
    }
    const p = this.pedidosPendientes()[0];
    if (p) this.responder(p);
  }

  textoBotonPaso(): string {
    const f = this.fila();
    if (!f) return '';
    if (f.estado === 'CERRADA') return 'Reabrir';
    if (f.grupo === 'INFORMATIVA') return 'Dar por conocida';
    if (f.puedeCerrar) return 'Cerrar la novedad';
    return f.grupo === 'POR_REGULARIZAR' ? (this.seleccion().size ? 'Justificar seleccionados' : 'Justificar el primero pendiente') : 'Responder';
  }

  justificar(): void {
    const d = this.detalle();
    if (!d) return;
    const lineas = d.lineas.filter((l) => this.seleccion().has(l.codigo));
    if (!lineas.length) {
      this.snack.open('Marque en la lista los movimientos que va a justificar.', 'Cerrar', { duration: 4000 });
      return;
    }
    if (new Set(lineas.map((l) => l.sentido)).size > 1) {
      this.snack.open('Marcó salidas y entradas a la vez: justifíquelas por separado.', 'Cerrar', { duration: 5000 });
      return;
    }
    this.abrirJustificar({ modo: 'lineas', lineas, todasLasLineas: d.lineas });
  }

  /** Botón de cada fila: justifica ese movimiento solo, sin marcarlo ni volver a la barra de la sección. */
  justificarLinea(l: LineaV2): void {
    const d = this.detalle();
    if (!d || l.saldo <= 0.004) return;
    this.abrirJustificar({ modo: 'lineas', lineas: [l], todasLasLineas: d.lineas });
  }

  responder(p: PedidoV2): void {
    this.abrirJustificar({ modo: 'pedido', pedido: p, detalleOrigen: this.detalle()?.detalleOrigen || [] });
  }

  private abrirJustificar(parcial: Partial<JustificarV2Data>): void {
    const f = this.fila()!;
    const data: JustificarV2Data = {
      idEmpresa: this.idEmpresa,
      idNovedad: f.codigo,
      codigoNovedad: f.codigoNovedad,
      rutaSubida: this.rutaSubida(),
      modo: 'lineas',
      ...parcial,
    } as JustificarV2Data;
    this.dialog
      .open(JustificarNovedadV2DialogComponent, { data, width: '900px', maxWidth: '96vw', maxHeight: '92vh' })
      .afterClosed()
      .subscribe((r?: ResultadoAccionV2) => {
        if (r) this.despues(r);
      });
  }

  /** C34d: resolver con un hecho de crédito (desde un movimiento, un pedido o la sección). */
  hechoCredito(linea?: LineaV2, pedido?: PedidoV2, nota?: NotaV2): void {
    const f = this.fila();
    if (!f) return;
    this.permisos.ejecutarSiPermitido(
      Permisos.CNT_SN_RESPONDER_REQUERIMIENTO,
      () => {
        const data: HechoCreditoV2Data = { idEmpresa: this.idEmpresa, idNovedad: f.codigo, rutaSubida: this.rutaSubida(), linea, pedido, nota };
        this.dialog
          .open(HechoCreditoV2DialogComponent, { data, width: '1100px', maxWidth: '97vw', maxHeight: '94vh' })
          .afterClosed()
          .subscribe((r?: ResultadoAccionV2) => {
            if (r) this.despues(r);
          });
      },
      (m) => this.falla(m || 'No tiene permiso para responder novedades.'),
    );
  }

  /** C34d: respuesta escrita de ASOPREP, sin cuentas. */
  escribirNota(): void {
    const f = this.fila();
    if (!f) return;
    const data: NotaNovedadV2Data = { idNovedad: f.codigo, codigoNovedad: f.codigoNovedad, rutaSubida: this.rutaSubida() };
    this.dialog
      .open(NotaNovedadV2DialogComponent, { data, width: '760px', maxWidth: '96vw' })
      .afterClosed()
      .subscribe((r?: ResultadoAccionV2) => {
        if (r) this.despues(r);
      });
  }

  anularNota(n: NotaV2): void {
    this.pedirTexto({ titulo: 'Anular la respuesta', explicacion: 'La respuesta queda anulada en el historial.', etiqueta: 'Motivo', obligatorio: true, boton: 'Anular' })
      .subscribe((t) => t !== null && this.servicio.anularNota(n.codigo, t).subscribe({ next: (r) => this.despues(r), error: (e) => this.falla(e) }));
  }

  /** C34d §10: cuotas que paga un hecho de pago de cuotas, con lo que se debía de cada una a la fecha. */
  cuotasDelHecho(h: HechoV2): { numeros: string; total: number } | null {
    if (!h.detalleCalculado) return null;
    try {
      const c = JSON.parse(h.detalleCalculado);
      if (!c || !c.totales || !Array.isArray(c.filas)) return null;
      return { numeros: c.filas.map((f: { numeroCuota: number }) => f.numeroCuota).join(', '), total: c.total };
    } catch {
      return null;
    }
  }

  /** C34d §10: resumen de la condonación guardada en el hecho. */
  condonacionDe(h: HechoV2): { totalCondonado: number; texto: string; cuentaAlRegistrar?: { cuenta?: string } } | null {
    if (!h.condonacion) return null;
    try {
      const c = JSON.parse(h.condonacion);
      const nombres: Record<string, string> = { MORA: 'mora', INTERES: 'interés', CAPITAL: 'capital' };
      const partes = Object.entries(c.condonadoPorConcepto || {})
        .filter(([, v]) => (v as number) > 0.004)
        .map(([k, v]) => `${nombres[k] || k} ${dinero(v as number)}`);
      return { totalCondonado: c.totalCondonado, texto: partes.join(', '), cuentaAlRegistrar: c.cuentaAlRegistrar };
    } catch {
      return null;
    }
  }

  /** Reparto por mes guardado en el hecho (precancelación o cruce mensual con precancelación). */
  repartoCalculado(h: HechoV2): CalculoHechoV2 | null {
    if (!h.detalleCalculado) return null;
    try {
      const c = JSON.parse(h.detalleCalculado);
      // C34d §10: en el pago de cuotas el detalle es lo adeudado por cuota y concepto (componentes), no un reparto por mes.
      return c && c.totales ? null : (c as CalculoHechoV2);
    } catch {
      return null;
    }
  }

  anularHecho(h: HechoV2): void {
    const otros = h.resuelve.length + h.atiende.length;
    this.pedirTexto({
      titulo: 'Anular el hecho de crédito',
      explicacion: `Se anula el hecho N.º ${h.codigo} completo: ${otros} movimiento(s) y pedido(s) que resolvía vuelven a quedar pendientes y sus orígenes quedan libres. Queda en el historial.`,
      etiqueta: 'Motivo',
      obligatorio: true,
      boton: 'Anular el hecho',
    }).subscribe((t) => t !== null && this.servicio.anularHecho(h.codigo, t).subscribe({ next: (r) => this.despues(r), error: (e) => this.falla(e) }));
  }

  anularJustificacion(j: JustificacionV2): void {
    this.pedirTexto({
      titulo: 'Anular justificación',
      explicacion: `Se anula la justificación de ${dinero(j.monto)}; el movimiento vuelve a tener ese saldo por justificar. Queda en el historial.`,
      etiqueta: 'Motivo',
      obligatorio: true,
      boton: 'Anular',
    }).subscribe((t) => t !== null && this.servicio.anularJustificacion(j.codigo, t).subscribe({ next: (r) => this.despues(r), error: (e) => this.falla(e) }));
  }

  anularRespuesta(idRespuesta: number): void {
    this.pedirTexto({
      titulo: 'Anular respuesta',
      explicacion: 'El pedido vuelve a quedar pendiente para responderlo de nuevo. Queda en el historial.',
      etiqueta: 'Motivo',
      obligatorio: true,
      boton: 'Anular',
    }).subscribe((t) => t !== null && this.servicio.anularRespuesta(idRespuesta, t).subscribe({ next: (r) => this.despues(r), error: (e) => this.falla(e) }));
  }

  cerrar(): void {
    const f = this.fila()!;
    const informativa = f.grupo === 'INFORMATIVA';
    this.pedirTexto({
      titulo: informativa ? 'Dar por conocida' : 'Cerrar la novedad',
      explicacion: informativa
        ? 'La novedad queda como leída y conocida por ASOPREP.'
        : 'Cerrar significa que la novedad tiene su resolución completa: el próximo re-proceso registra cada valor en las cuentas que usted indicó. Cerrar no cambia hoy la contabilidad.',
      etiqueta: 'Comentario',
      obligatorio: false,
      boton: informativa ? 'Dar por conocida' : 'Cerrar',
    }).subscribe((t) => t !== null && this.servicio.cerrar(f.codigo, t || null).subscribe({ next: (r) => this.despues(r), error: (e) => this.falla(e) }));
  }

  reabrir(): void {
    const f = this.fila()!;
    this.pedirTexto({
      titulo: 'Reabrir la novedad',
      explicacion: 'Vuelve a quedar abierta con lo que ya tenía registrado.',
      etiqueta: 'Motivo',
      obligatorio: true,
      boton: 'Reabrir',
    }).subscribe((t) => t !== null && this.servicio.reabrir(f.codigo, t).subscribe({ next: (r) => this.despues(r), error: (e) => this.falla(e) }));
  }

  private pedirTexto(data: MotivoV2Data) {
    return new (class {
      constructor(private dialog: MatDialog) {}
      subscribe(f: (t: string | null) => void) {
        this.dialog
          .open(MotivoV2DialogComponent, { data })
          .afterClosed()
          .subscribe((r?: { texto: string }) => f(r ? r.texto : null));
      }
    })(this.dialog);
  }

  /** Después de una acción: aviso, fila nueva al padre (grid y contadores) y detalle recargado. */
  private despues(r: ResultadoAccionV2): void {
    this.snack.open(r.mensaje, 'Cerrar', { duration: 4000 });
    if (r.fila) this.actualizada.emit(r.fila);
    for (const x of r.filas || []) this.actualizada.emit(x);
    this.seleccion.set(new Set());
    this.cargar();
  }

  private falla(e: any): void {
    this.snack.open(String(e), 'Cerrar', { duration: 8000, panelClass: ['error-snackbar'] });
  }

  descargar(a: AdjuntoV2): void {
    this.fileService.downloadAndSaveFile(a.url, a.nombreArchivo);
  }

  exportarOrigen(b: BloqueOrigen): void {
    const f = this.fila()!;
    const filas = b.filas.map((x) => ({
      prestamo: x.idAsoprep ?? '',
      cedula: x.cedula ?? '',
      nombre: x.nombre ?? '',
      codigoParticipe: x.codigoParticipe ?? '',
      cuota: x.numeroCuota ?? '',
      fecha1: fechaCorta(x.fecha1),
      fecha2: fechaCorta(x.fecha2),
      estadoAntes: x.estadoAntes ?? '',
      estadoDespues: x.estadoDespues ?? '',
      estadoHoy: x.estadoHoy ?? '',
      valor1: x.valor1 ?? '',
      valor2: x.valor2 ?? '',
      descripcion: x.descripcion ?? '',
    }));
    this.exportService.exportToCSV(
      filas,
      `Novedad_${f.codigoNovedad}_detalle`,
      ['Préstamo', 'Cédula', 'Nombre', 'Código partícipe', 'Cuota', 'Fecha', 'Fecha 2', 'Estado antes', 'Estado después', 'Estado hoy', 'Valor', 'Valor 2', 'Descripción'],
      Object.keys(filas[0] || {}),
    );
  }
}
