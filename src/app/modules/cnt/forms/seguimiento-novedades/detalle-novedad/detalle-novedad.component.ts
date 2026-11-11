import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, computed, inject, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Permisos } from '../../../../../shared/model/permisos';
import { FileService } from '../../../../../shared/services/file.service';
import { PermisosService } from '../../../../../shared/services/permisos.service';
import {
  AccionNovedadDialogComponent,
  AccionNovedadDialogData,
} from '../../../dialog/accion-novedad-dialog/accion-novedad-dialog.component';
import {
  AccionNovedad,
  AdjuntoNovedad,
  DetalleNovedad,
  ESTADOS_NOVEDAD,
  ESTADOS_REQUERIMIENTO,
  ESTADOS_RESPUESTA,
  RequerimientoNovedad,
  RespuestaNovedad,
  VinculoDetalle,
  claseEstadoNovedad,
  claseEstadoRequerimiento,
  etiquetaArea,
  etiquetaTipo,
} from '../../../model/seguimiento-novedades';
import { formatoFecha } from '../../../service/cierre-periodo.service';
import { SeguimientoNovedadesService } from '../../../service/seguimiento-novedades.service';

/**
 * C25 — Detalle de una novedad: textos tal como se comunicaron, requerimientos con sus respuestas y adjuntos,
 * asientos de origen y de ajuste (con sus líneas), cuentas por regularizar, decisiones, relacionadas e historial,
 * y todas las acciones del seguimiento. Cada acción verifica su permiso antes de abrir el diálogo; el backend
 * valida igual (estados, usuario, cuatro ojos) y sus mensajes se muestran tal cual.
 */
@Component({
  selector: 'app-detalle-novedad',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './detalle-novedad.component.html',
  styleUrl: './detalle-novedad.component.scss',
})
export class DetalleNovedadComponent implements OnChanges {
  @Input({ required: true }) idNovedad!: number;
  @Input() idEmpresa: number | null = null;
  /** Avisa al contenedor que algo cambió (para refrescar bandeja y resumen). */
  @Output() cambio = new EventEmitter<void>();
  @Output() cerrarPanel = new EventEmitter<void>();

  private servicio = inject(SeguimientoNovedadesService);
  private permisos = inject(PermisosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private fileService = inject(FileService);
  private router = inject(Router);

  readonly formatoFecha = formatoFecha;
  readonly etiquetaTipo = etiquetaTipo;
  readonly etiquetaArea = etiquetaArea;
  readonly claseEstadoNovedad = claseEstadoNovedad;
  readonly claseEstadoRequerimiento = claseEstadoRequerimiento;
  readonly estadosRespuesta = ESTADOS_RESPUESTA;
  readonly estadosNovedad = ESTADOS_NOVEDAD;
  readonly estadosRequerimiento = ESTADOS_REQUERIMIENTO;

  detalle = signal<DetalleNovedad | null>(null);
  cargando = signal(false);
  procesando = signal(false);
  error = signal<string | null>(null);
  verTrazabilidad = signal(false);
  lineasAbiertas = signal<Set<number>>(new Set());
  textoDecision = signal<{ numero: string; texto: string; idDecision: number } | null>(null);

  novedad = computed(() => this.detalle()?.novedad ?? null);
  ajustes = computed(() => (this.detalle()?.vinculos ?? []).filter((v) => v.tipo === 'ASIENTO_AJUSTE' && v.estado === 1));
  origen = computed(() => (this.detalle()?.vinculos ?? []).filter((v) => v.tipo === 'ASIENTO_ORIGEN' && v.estado === 1));
  decisiones = computed(() => (this.detalle()?.vinculos ?? []).filter((v) => v.tipo === 'DECISION' && v.estado === 1));
  relacionadas = computed(() => (this.detalle()?.vinculos ?? []).filter((v) => v.tipo === 'NOVEDAD' && v.estado === 1));
  otrosVinculos = computed(() =>
    (this.detalle()?.vinculos ?? []).filter((v) => (v.tipo === 'PARTIDA_C22' || v.tipo === 'DOCUMENTO_MODULO') && v.estado === 1),
  );
  anulados = computed(() => (this.detalle()?.vinculos ?? []).filter((v) => v.estado !== 1));

  /** En seguimiento: enviada y no cerrada, anulada ni reemplazada. */
  enSeguimiento = computed(() => {
    const e = this.novedad()?.estado ?? 0;
    return e >= 2 && e <= 6;
  });

  ngOnChanges(): void {
    this.cargar();
    this.permisos.verificar(Permisos.CNT_SN_VER_TRAZABILIDAD).subscribe((r) => this.verTrazabilidad.set(!!r.permitido));
  }

  cargar(): void {
    if (!this.idNovedad) return;
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.detalle(this.idNovedad).subscribe({
      next: (d) => {
        this.detalle.set(d);
        this.cargando.set(false);
      },
      error: (m: string) => {
        this.cargando.set(false);
        this.error.set(m);
      },
    });
  }

  formatoMonto(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  alternarLineas(v: VinculoDetalle): void {
    const s = new Set(this.lineasAbiertas());
    s.has(v.codigo) ? s.delete(v.codigo) : s.add(v.codigo);
    this.lineasAbiertas.set(s);
  }

  irAsiento(v: VinculoDetalle): void {
    if (v.idAsiento) this.router.navigate(['/menucontabilidad/procesos/asientos-dinamico', v.idAsiento]);
  }

  descargar(a: AdjuntoNovedad): void {
    this.fileService.downloadAndSaveFile(a.url, a.nombreArchivo);
  }

  rutaSubida(): string {
    const n = this.novedad();
    if (!n) return 'novedades';
    return `novedades/${n.anio}-${String(n.mes).padStart(2, '0')}/${n.codigo}`;
  }

  // ============================ Acciones ============================

  /** Verifica el permiso, abre el diálogo y ejecuta la llamada con lo que devuelve. */
  private accion(
    permiso: number,
    datos: AccionNovedadDialogData,
    llamada: (r: AccionNovedad) => Observable<any>,
    alTerminar?: (respuesta: any) => void,
  ): void {
    if (this.procesando()) return;
    this.permisos.ejecutarSiPermitido(
      permiso,
      () => {
        this.dialog
          .open(AccionNovedadDialogComponent, { data: datos, width: '680px', maxHeight: '90vh' })
          .afterClosed()
          .subscribe((r?: AccionNovedad) => {
            if (!r) return;
            this.procesando.set(true);
            llamada(r).subscribe({
              next: (resp) => {
                this.procesando.set(false);
                this.notificar(resp?.mensaje ?? 'Listo.', true);
                alTerminar?.(resp);
                this.cargar();
                this.cambio.emit();
              },
              error: (m: string) => {
                this.procesando.set(false);
                this.notificar(m, false);
              },
            });
          });
      },
      (m) => this.notificar((m || 'No tiene permiso para esta acción.').toUpperCase(), false),
    );
  }

  enviar(): void {
    const n = this.novedad();
    if (!n || !this.idEmpresa) return;
    this.accion(
      Permisos.CNT_SN_ENVIAR_NOVEDADES,
      {
        titulo: `Enviar ${n.codigoNovedad} a ASOPREP`,
        icono: 'send',
        mensaje: 'La novedad pasa de BORRADOR a ENVIADA y desde ahí admite respuestas.',
        textoConfirmar: 'Enviar',
        fechaLimite: true,
      },
      (r) => this.servicio.enviar(this.idEmpresa!, null, null, { ...r, ids: [n.codigo] }),
    );
  }

  responder(req: RequerimientoNovedad): void {
    const opciones =
      req.tipo === 'ELECCION'
        ? (req.opciones ?? '').split('|').map((o) => o.trim()).filter(Boolean)
        : req.tipo === 'CONFIRMACION' || req.tipo === 'APROBACION'
          ? ['SI', 'NO']
          : undefined;
    this.accion(
      Permisos.CNT_SN_RESPONDER_REQUERIMIENTO,
      {
        titulo: `Responder el requerimiento ${req.secuencia} (${etiquetaTipo(req.tipo)})`,
        icono: 'reply',
        mensaje: req.descripcion,
        detalles: req.supuesto ? [{ etiqueta: 'Mientras tanto rige', valor: req.supuesto }] : [],
        textoConfirmar: 'Registrar respuesta',
        opciones,
        texto: { etiqueta: 'Respuesta de ASOPREP', ayuda: 'Solo números internos: nunca nombres ni cédulas.' },
        canal: true,
        fecha: { etiqueta: 'Fecha de la respuesta', conHora: true },
        area: req.area ?? true,
        adjuntos: { rutaSubida: this.rutaSubida() },
      },
      (r) => this.servicio.accionRequerimiento(req.codigo, 'responder', r),
    );
  }

  noExiste(req: RequerimientoNovedad): void {
    this.accion(
      Permisos.CNT_SN_RESPONDER_REQUERIMIENTO,
      {
        titulo: `El documento del requerimiento ${req.secuencia} no existe`,
        icono: 'report',
        mensaje: 'Lo que no tiene sustento lo decide Contabilidad de ASOPREP con constancia escrita (regla 6).',
        textoConfirmar: 'Registrar',
        color: 'warn',
        motivo: { etiqueta: 'Explicación de ASOPREP', obligatorio: true },
        canal: true,
      },
      (r) => this.servicio.accionRequerimiento(req.codigo, 'noExiste', r),
    );
  }

  noAplica(req: RequerimientoNovedad): void {
    this.accion(
      Permisos.CNT_SN_CERRAR_NOVEDAD,
      {
        titulo: `El requerimiento ${req.secuencia} ya no aplica`,
        icono: 'block',
        textoConfirmar: 'Marcar NO APLICA',
        color: 'warn',
        motivo: { etiqueta: 'Motivo', obligatorio: true, placeholder: 'El documento llegó por otra vía / el caso desapareció en el re-proceso' },
      },
      (r) => this.servicio.accionRequerimiento(req.codigo, 'noAplica', r),
    );
  }

  aplicar(req: RequerimientoNovedad): void {
    this.accion(
      Permisos.CNT_SN_REGISTRAR_AJUSTE,
      {
        titulo: `Aplicar el requerimiento ${req.secuencia}`,
        icono: 'task_alt',
        mensaje: 'Registre el asiento o los asientos manuales con que Contabilidad hizo el ajuste, o indique por qué no hace falta ajuste.',
        textoConfirmar: 'Aplicar',
        asientos: { obligatorio: true },
        sinAjuste: true,
      },
      (r) => this.servicio.accionRequerimiento(req.codigo, 'aplicar', r),
    );
  }

  aceptar(resp: RespuestaNovedad, req: RequerimientoNovedad): void {
    const exige = req.estado === 5 || req.tipo === 'DECISION' || req.tipo === 'APROBACION';
    this.accion(
      Permisos.CNT_SN_REVISAR_RESPUESTA,
      {
        titulo: 'Aceptar la respuesta',
        icono: 'thumb_up',
        mensaje: 'La revisa un usuario distinto del que la registró.',
        advertencias: exige && !resp.idDecision ? ['Este pedido exige una decisión registrada con constancia: regístrela antes de aceptar.'] : [],
        textoConfirmar: 'Aceptar',
        motivo: { etiqueta: 'Comentario (opcional)' },
      },
      (r) => this.servicio.revisarRespuesta(resp.codigo, 'aceptar', r),
    );
  }

  observar(resp: RespuestaNovedad): void {
    this.accion(
      Permisos.CNT_SN_REVISAR_RESPUESTA,
      {
        titulo: 'Observar la respuesta',
        icono: 'feedback',
        mensaje: 'El requerimiento vuelve a ASOPREP con la observación.',
        textoConfirmar: 'Observar',
        color: 'warn',
        motivo: { etiqueta: 'Observación', obligatorio: true },
      },
      (r) => this.servicio.revisarRespuesta(resp.codigo, 'observar', r),
    );
  }

  registrarDecision(req: RequerimientoNovedad | null, resp: RespuestaNovedad | null): void {
    const n = this.novedad();
    if (!n) return;
    this.accion(
      Permisos.CNT_SN_REGISTRAR_DECISION,
      {
        titulo: 'Registrar la decisión de Contabilidad de ASOPREP',
        icono: 'gavel',
        mensaje:
          'D-056: autoriza Contabilidad de ASOPREP; la decisión se registra en el SAA y en DECISIONES-Y-PARTIDAS.md. ' +
          'La constancia (acta o correo) es obligatoria.',
        textoConfirmar: 'Registrar decisión',
        decision: true,
        texto: { etiqueta: 'Decisión', obligatorio: true },
        fecha: { etiqueta: 'Fecha de la decisión' },
        adjuntos: { obligatorio: true, rutaSubida: this.rutaSubida(), tipoSugerido: 'ACTA' },
      },
      (r) =>
        this.servicio.registrarDecision(n.idEmpresa, {
          ...r,
          idNovedad: n.codigo,
          idRequerimiento: req?.codigo ?? null,
          idRespuesta: resp?.codigo ?? null,
        }),
      (resp2) => {
        if (resp2?.textoExpediente) {
          this.textoDecision.set({ numero: resp2.numero, texto: resp2.textoExpediente, idDecision: resp2.decision?.codigo });
        }
      },
    );
  }

  copiarTextoDecision(): void {
    const t = this.textoDecision();
    if (!t) return;
    navigator.clipboard?.writeText(t.texto).then(
      () => this.notificar('Fila copiada: péguela en la tabla §1 de DECISIONES-Y-PARTIDAS.md.', true),
      () => this.notificar('No se pudo copiar; selecciónela a mano.', false),
    );
  }

  marcarDecisionCopiada(): void {
    const t = this.textoDecision();
    if (!t) return;
    this.servicio.marcarDecisionCopiada(t.idDecision).subscribe({
      next: () => {
        this.notificar(`${t.numero} marcada como copiada al expediente.`, true);
        this.textoDecision.set(null);
      },
      error: (m: string) => this.notificar(m, false),
    });
  }

  verTextoDecision(v: VinculoDetalle): void {
    if (!v.idDecision) return;
    this.servicio.textoExpediente(v.idDecision).subscribe({
      next: (r) => this.textoDecision.set({ numero: v.numeroDecision ?? '', texto: r.texto, idDecision: v.idDecision! }),
      error: (m: string) => this.notificar(m, false),
    });
  }

  registrarAjuste(): void {
    const n = this.novedad();
    if (!n) return;
    const reqs = (this.detalle()?.requerimientos ?? []).filter((r) => r.requerimiento.estado === 3);
    this.accion(
      Permisos.CNT_SN_REGISTRAR_AJUSTE,
      {
        titulo: `Asientos de ajuste de ${n.codigoNovedad}`,
        icono: 'playlist_add_check',
        mensaje:
          'D-056 (7): los ajustes los hace Contabilidad con asientos manuales. Registre el número de cada asiento con que se ' +
          'arregló la novedad (uno o varios). Para dejar un requerimiento ACEPTADO como APLICADO use "Aplicar" en el requerimiento.',
        advertencias: reqs.length ? [`Hay ${reqs.length} requerimiento(s) ACEPTADO(s): use "Aplicar" en cada uno para dejarlos aplicados.`] : [],
        textoConfirmar: 'Registrar asientos',
        asientos: { obligatorio: true },
        motivo: { etiqueta: 'Observación (opcional)' },
      },
      (r) => this.servicio.accionNovedad(n.codigo, 'ajuste', r),
    );
  }

  vincularDecision(): void {
    const n = this.novedad();
    if (!n) return;
    this.accion(
      Permisos.CNT_SN_REGISTRAR_AJUSTE,
      {
        titulo: 'Vincular una decisión existente',
        icono: 'link',
        textoConfirmar: 'Vincular',
        decision: false,
        texto: { etiqueta: 'Número de la decisión (D-nnn)', obligatorio: true },
      },
      (r) => this.servicio.accionNovedad(n.codigo, 'vincular', { tipoVinculo: 'DECISION', numero: (r.texto ?? '').trim() }),
    );
  }

  vincularAsientoOrigen(): void {
    const n = this.novedad();
    if (!n) return;
    this.accion(
      Permisos.CNT_SN_REGISTRAR_AJUSTE,
      {
        titulo: 'Vincular un asiento de origen',
        icono: 'link',
        mensaje: 'El asiento donde quedó registrada la novedad (por ejemplo, el que la envió a una cuenta por regularizar).',
        textoConfirmar: 'Vincular',
        asientos: { obligatorio: true },
      },
      (r) => this.servicio.accionNovedad(n.codigo, 'vincular', { tipoVinculo: 'ASIENTO_ORIGEN', asientos: (r.asientos ?? []).slice(0, 1) }),
    );
  }

  desvincular(v: VinculoDetalle): void {
    this.accion(
      Permisos.CNT_SN_REGISTRAR_AJUSTE,
      {
        titulo: `Quitar el vínculo ${v.tipo}`,
        icono: 'link_off',
        mensaje: 'El vínculo se anula (queda en el historial), no se borra.',
        textoConfirmar: 'Quitar',
        color: 'warn',
        motivo: { etiqueta: 'Motivo', obligatorio: true },
      },
      (r) => this.servicio.desvincular(v.codigo, r.motivo ?? ''),
    );
  }

  adjuntar(): void {
    const n = this.novedad();
    if (!n) return;
    this.accion(
      Permisos.CNT_SN_RESPONDER_REQUERIMIENTO,
      {
        titulo: `Adjuntar a ${n.codigoNovedad}`,
        icono: 'attach_file',
        textoConfirmar: 'Registrar adjuntos',
        adjuntos: { obligatorio: true, rutaSubida: this.rutaSubida() },
      },
      (r) => this.servicio.registrarAdjunto({ idNovedad: n.codigo, adjuntos: r.adjuntos }),
    );
  }

  marcarCopiado(a: AdjuntoNovedad): void {
    this.permisos.ejecutarSiPermitido(
      Permisos.CNT_SN_VER_TRAZABILIDAD,
      () =>
        this.servicio.marcarAdjuntoCopiado(a.codigo).subscribe({
          next: () => {
            this.notificar('Adjunto marcado como copiado a 02-informacion-cliente.', true);
            this.cargar();
          },
          error: (m: string) => this.notificar(m, false),
        }),
      (m) => this.notificar((m || 'Sin permiso').toUpperCase(), false),
    );
  }

  cerrar(): void {
    const n = this.novedad();
    if (!n) return;
    this.accion(
      Permisos.CNT_SN_CERRAR_NOVEDAD,
      {
        titulo: `Cerrar ${n.codigoNovedad}`,
        icono: 'lock',
        mensaje: 'Todos los requerimientos tienen que estar APLICADOS (con su asiento de ajuste o sin ajuste) o NO APLICA.',
        textoConfirmar: 'Cerrar novedad',
        motivo: { etiqueta: 'Cómo se cerró', obligatorio: true, placeholder: 'Ajuste con DIA-2026-11-0005 / sin ajuste / decisión D-057' },
      },
      (r) => this.servicio.accionNovedad(n.codigo, 'cerrar', r),
    );
  }

  reabrir(): void {
    const n = this.novedad();
    if (!n) return;
    this.accion(
      Permisos.CNT_SN_CERRAR_NOVEDAD,
      { titulo: `Reabrir ${n.codigoNovedad}`, icono: 'lock_open', textoConfirmar: 'Reabrir', color: 'warn', motivo: { etiqueta: 'Motivo', obligatorio: true } },
      (r) => this.servicio.accionNovedad(n.codigo, 'reabrir', r),
    );
  }

  anular(): void {
    const n = this.novedad();
    if (!n) return;
    this.accion(
      Permisos.CNT_SN_CERRAR_NOVEDAD,
      {
        titulo: `Anular ${n.codigoNovedad}`,
        icono: 'delete_forever',
        mensaje: 'Para un error de carga o un caso que ya no existe. Los requerimientos abiertos quedan ANULADOS.',
        textoConfirmar: 'Anular',
        color: 'warn',
        motivo: { etiqueta: 'Motivo', obligatorio: true },
      },
      (r) => this.servicio.accionNovedad(n.codigo, 'anular', r),
    );
  }

  nuevaVersion(): void {
    const n = this.novedad();
    if (!n) return;
    this.accion(
      Permisos.CNT_SN_CARGAR_NOVEDADES,
      {
        titulo: `Nueva versión de ${n.codigoNovedad}`,
        icono: 'content_copy',
        mensaje: 'Se copia la novedad y sus requerimientos como versión nueva en BORRADOR; la actual queda REEMPLAZADA.',
        textoConfirmar: 'Crear versión',
        motivo: { etiqueta: 'Motivo', obligatorio: true },
      },
      (r) => this.servicio.accionNovedad(n.codigo, 'nuevaVersion', r),
    );
  }

  private notificar(mensaje: string, exito: boolean): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: exito ? 5000 : 10000,
      panelClass: [exito ? 'success-snackbar' : 'error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
