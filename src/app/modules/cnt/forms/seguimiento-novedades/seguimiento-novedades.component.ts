import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { Permisos } from '../../../../shared/model/permisos';
import { PermisosService } from '../../../../shared/services/permisos.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import {
  AccionNovedadDialogComponent,
  AccionNovedadDialogData,
} from '../../dialog/accion-novedad-dialog/accion-novedad-dialog.component';
import {
  AccionNovedad,
  AREAS_ASOPREP,
  ESTADOS_NOVEDAD,
  ESTADOS_REQUERIMIENTO,
  FilaBandejaNovedad,
  FilaRequerimiento,
  MODULOS_NOVEDAD,
  ReporteActa,
  ResumenMesNovedades,
  TIPOS_NOVEDAD,
  claseEstadoNovedad,
  claseEstadoRequerimiento,
  etiquetaArea,
  etiquetaTipo,
} from '../../model/seguimiento-novedades';
import { formatoFecha, nombreMes } from '../../service/cierre-periodo.service';
import { FiltrosNovedades, SeguimientoNovedadesService } from '../../service/seguimiento-novedades.service';
import { DetalleNovedadComponent } from './detalle-novedad/detalle-novedad.component';
import { DecisionesTomadasComponent } from './decisiones-tomadas/decisiones-tomadas.component';
import { Referencia } from './referencias/detector-referencias';
import { NavegacionReferenciasService } from './referencias/navegacion-referencias.service';
import { TextoEnlazadoComponent } from './referencias/texto-enlazado.component';

/**
 * C25 — Seguimiento de novedades (Contabilidad > Procesos > Seguimiento Novedades).
 *
 * Cabecera con el resumen vivo del mes (estados, tipos, módulos, antigüedad de los pedidos y cuentas por
 * regularizar leídas de la contabilidad), bandeja de novedades (todas, clasificadas por tipo: D-056 (6)), vista
 * por requerimiento (lista de trabajo de cada área; el área es dato del pedido, D-056 (5)), carga del lote del
 * expediente (simulación y carga), y el reporte para el acta y el pedido pendiente por área. El detalle y sus
 * acciones viven en DetalleNovedadComponent. Diseño: cuadreSuper 03-trabajo/cambios-saa/c25-seguimiento-novedades.
 */
@Component({
  selector: 'app-seguimiento-novedades',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, DetalleNovedadComponent, DecisionesTomadasComponent, TextoEnlazadoComponent],
  templateUrl: './seguimiento-novedades.component.html',
  styleUrl: './seguimiento-novedades.component.scss',
})
export class SeguimientoNovedadesComponent implements OnInit {
  private servicio = inject(SeguimientoNovedadesService);
  private permisos = inject(PermisosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private nav = inject(NavegacionReferenciasService);
  private destroyRef = inject(DestroyRef);

  /** Índice de la pestaña Decisiones (C25b). */
  readonly PESTANA_DECISIONES = 3;
  decisionSeleccionada = signal<string | null>(null);

  readonly modulos = MODULOS_NOVEDAD;
  readonly tipos = TIPOS_NOVEDAD;
  readonly areas = AREAS_ASOPREP;
  readonly estadosNovedad = ESTADOS_NOVEDAD;
  readonly estadosRequerimiento = ESTADOS_REQUERIMIENTO;
  readonly estadosNovedadLista = Object.entries(ESTADOS_NOVEDAD).map(([k, v]) => ({ valor: Number(k), etiqueta: v }));
  readonly estadosReqLista = Object.entries(ESTADOS_REQUERIMIENTO).map(([k, v]) => ({ valor: Number(k), etiqueta: v }));
  readonly formatoFecha = formatoFecha;
  readonly nombreMes = nombreMes;
  readonly etiquetaTipo = etiquetaTipo;
  readonly etiquetaArea = etiquetaArea;
  readonly claseEstadoNovedad = claseEstadoNovedad;
  readonly claseEstadoRequerimiento = claseEstadoRequerimiento;
  readonly meses = Array.from({ length: 12 }, (_, i) => i + 1);
  readonly anios = Array.from({ length: 4 }, (_, i) => 2025 + i);

  idEmpresa = parseInt(localStorage.getItem('idSucursal') || '0', 10) || null;

  anio = signal(2025);
  mes = signal(6);
  modulo = signal<string | null>(null);
  tipo = signal<string | null>(null);
  estado = signal<number | null>(null);
  estadoReq = signal<number | null>(null);
  area = signal<string | null>(null);
  texto = signal('');
  pestana = signal(0);

  resumen = signal<ResumenMesNovedades | null>(null);
  bandeja = signal<FilaBandejaNovedad[]>([]);
  requerimientos = signal<FilaRequerimiento[]>([]);
  acta = signal<ReporteActa | null>(null);
  pedido = signal<string | null>(null);
  seleccion = signal<number | null>(null);
  cargando = signal(false);
  procesando = signal(false);
  error = signal<string | null>(null);

  titulo = computed(() => `${nombreMes(this.mes())} ${this.anio()}`);
  conteoTipos = computed(() => {
    const c: Record<string, number> = {};
    for (const f of this.bandeja()) c[f.tipoRespuesta] = (c[f.tipoRespuesta] ?? 0) + 1;
    return c;
  });
  totalPendientes = computed(() => this.requerimientos().filter((r) => r.estado === 1 || r.estado === 4).length);

  ngOnInit(): void {
    // C25b: toda referencia de la pantalla (textos, fichas, decisiones) abre la novedad o la decisión por aquí
    this.nav.peticiones.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((p) => {
      if (p.tipo === 'NOVEDAD') {
        this.pestana.set(0);
        this.abrir(p.idNovedad);
      } else {
        this.decisionSeleccionada.set(null);
        setTimeout(() => {
          this.decisionSeleccionada.set(p.numero);
          this.pestana.set(this.PESTANA_DECISIONES);
          document.querySelector('mat-tab-group')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
    if (!this.idEmpresa) {
      this.error.set('No hay empresa seleccionada. Vuelva a iniciar sesión.');
      return;
    }
    this.cargar();
  }

  private filtros(): FiltrosNovedades {
    return {
      anio: this.anio(),
      mes: this.mes(),
      modulo: this.modulo(),
      tipo: this.tipo(),
      estado: this.estado(),
      area: this.area(),
      texto: this.texto().trim() || null,
    };
  }

  cargar(): void {
    if (!this.idEmpresa) return;
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.resumenMes(this.idEmpresa, this.anio(), this.mes()).subscribe({
      next: (r) => this.resumen.set(r),
      error: (m: string) => this.error.set(m),
    });
    this.servicio.bandeja(this.idEmpresa, this.filtros()).subscribe({
      next: (b) => {
        this.bandeja.set(b ?? []);
        this.cargando.set(false);
      },
      error: (m: string) => {
        this.cargando.set(false);
        this.error.set(m);
      },
    });
    const fr = { ...this.filtros(), tipo: null, estado: this.estadoReq() };
    this.servicio.vistaRequerimientos(this.idEmpresa, fr).subscribe({
      next: (r) => this.requerimientos.set(r ?? []),
      error: (m: string) => this.error.set(m),
    });
  }

  filtrarTipo(t: string | null): void {
    this.tipo.set(this.tipo() === t ? null : t);
    this.cargar();
  }

  limpiarFiltros(): void {
    this.modulo.set(null);
    this.tipo.set(null);
    this.estado.set(null);
    this.estadoReq.set(null);
    this.area.set(null);
    this.texto.set('');
    this.cargar();
  }

  abrir(id: number): void {
    this.seleccion.set(id);
    setTimeout(() => document.getElementById('detalle-novedad')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }

  /** C25b: abre una referencia de las tablas del resumen (cuenta, ejecución G, novedad del reparto). */
  ver(tipo: Referencia['tipo'], valor: string | number | null | undefined): void {
    if (valor === null || valor === undefined || valor === '') return;
    this.nav.abrir({ tipo, valor: String(valor) }, { idEmpresa: this.idEmpresa, anio: this.anio(), mes: this.mes() });
  }

  /** Novedad del reparto de cuentas por regularizar: por id si ya está cargada; si no, por código. */
  verNovedad(idNovedad: number | null | undefined, codigo: string): void {
    if (idNovedad) this.abrir(idNovedad);
    else if (codigo !== 'SIN-NOVEDAD') this.ver('NOVEDAD', codigo);
  }

  etiquetaCuadratura(clave: string): string {
    return { aportes: 'Aportes: cuenta 21 = G42', cartera: 'Cartera bruta: 13 − 1399 = G48', provision: 'Provisión 1399', sumaControl: 'Suma de control del B17' }[clave] ?? clave;
  }

  formatoMonto(v: number | null | undefined): string {
    if (v === null || v === undefined) return '—';
    return v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  entradasTexto(o: Record<string, string> | null | undefined): { clave: string; valor: string }[] {
    return Object.entries(o ?? {}).map(([clave, valor]) => ({ clave, valor }));
  }

  entradas(o: Record<string, number> | null | undefined): { clave: string; valor: number }[] {
    return Object.entries(o ?? {}).map(([clave, valor]) => ({ clave, valor }));
  }

  // ============================ Carga del lote (F1) ============================

  /** Lee el JSON del expediente, simula, muestra el resultado y carga si se confirma. */
  cargarArchivo(evento: Event, que: 'novedades' | 'decisiones'): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files?.[0];
    input.value = '';
    if (!archivo || !this.idEmpresa) return;
    this.permisos.ejecutarSiPermitido(
      Permisos.CNT_SN_CARGAR_NOVEDADES,
      () => {
        archivo.text().then((t) => {
          let lote: any;
          try {
            lote = JSON.parse(t);
          } catch {
            this.notificar('El archivo no es un JSON válido.', false);
            return;
          }
          const llamada = (simular: boolean): Observable<any> =>
            que === 'novedades'
              ? this.servicio.cargarLote(this.idEmpresa!, lote, simular)
              : this.servicio.cargarDecisiones(this.idEmpresa!, lote, simular);
          this.procesando.set(true);
          llamada(true).subscribe({
            next: (sim) => {
              this.procesando.set(false);
              const avisos: string[] = sim?.avisos ?? [];
              const data: ConfirmDialogData = {
                title: `Simulación de la carga (${archivo.name})`,
                message:
                  que === 'novedades'
                    ? `Lote ${sim.lote}: ${sim.nuevas} nuevas, ${sim.actualizadas} actualizadas, ${sim.omitidas} sin cambios; ` +
                      `${sim.requerimientos} requerimientos, ${sim.vinculosAsiento} asientos, ${sim.vinculosDecision} decisiones, ` +
                      `${sim.vinculosNovedad} relacionadas. ${avisos.length} aviso(s). ¿Cargar de verdad?`
                    : `${sim.nuevas} decisiones nuevas; ${sim.yaExistentes} ya estaban. ¿Cargar de verdad?`,
                confirmText: 'Cargar',
                type: avisos.length ? 'warning' : 'info',
                details: avisos.slice(0, 12).map((a) => ({ label: 'Aviso', value: a })),
              };
              this.dialog
                .open(ConfirmDialogComponent, { data, width: '720px' })
                .afterClosed()
                .subscribe((ok?: boolean) => {
                  if (!ok) return;
                  this.procesando.set(true);
                  llamada(false).subscribe({
                    next: (r) => {
                      this.procesando.set(false);
                      this.notificar(r?.mensaje ?? 'Carga terminada.', true);
                      this.cargar();
                    },
                    error: (m: string) => {
                      this.procesando.set(false);
                      this.notificar(m, false);
                    },
                  });
                });
            },
            error: (m: string) => {
              this.procesando.set(false);
              this.notificar(m, false);
            },
          });
        });
      },
      (m) => this.notificar((m || 'No tiene permiso para cargar novedades.').toUpperCase(), false),
    );
  }

  // ============================ Acciones del mes ============================

  private accionMes(permiso: number, datos: AccionNovedadDialogData, llamada: (r: AccionNovedad) => Observable<any>): void {
    if (!this.idEmpresa || this.procesando()) return;
    this.permisos.ejecutarSiPermitido(
      permiso,
      () =>
        this.dialog
          .open(AccionNovedadDialogComponent, { data: datos, width: '620px' })
          .afterClosed()
          .subscribe((r?: AccionNovedad) => {
            if (!r) return;
            this.procesando.set(true);
            llamada(r).subscribe({
              next: (resp) => {
                this.procesando.set(false);
                this.notificar(resp?.mensaje ?? 'Listo.', true);
                this.cargar();
              },
              error: (m: string) => {
                this.procesando.set(false);
                this.notificar(m, false);
              },
            });
          }),
      (m) => this.notificar((m || 'No tiene permiso para esta acción.').toUpperCase(), false),
    );
  }

  enviarMes(): void {
    const borradores = this.bandeja().filter((f) => f.estado === 1).length;
    this.accionMes(
      Permisos.CNT_SN_ENVIAR_NOVEDADES,
      {
        titulo: `Enviar a ASOPREP las novedades de ${this.titulo()}`,
        icono: 'send',
        mensaje: `Pasan de BORRADOR a ENVIADA las ${borradores} novedad(es) en borrador del mes (también las informativas).`,
        textoConfirmar: 'Enviar todo el mes',
        fechaLimite: true,
        motivo: { etiqueta: 'Comentario (p. ej. correo con el que se mandaron los .txt)' },
      },
      (r) => this.servicio.enviar(this.idEmpresa!, this.anio(), this.mes(), { ...r, ids: [] }),
    );
  }

  cerrarInformativas(): void {
    this.accionMes(
      Permisos.CNT_SN_CERRAR_NOVEDAD,
      {
        titulo: `Cerrar las informativas de ${this.titulo()}`,
        icono: 'done_all',
        mensaje: 'Las novedades INFORMATIVAS enviadas se dan por conocidas con la firma del acta del mes.',
        textoConfirmar: 'Cerrar informativas',
        motivo: { etiqueta: 'Acta', obligatorio: true, placeholder: 'Acta de validación de junio 2025 firmada el …' },
      },
      (r) => this.servicio.cerrarInformativas(this.idEmpresa!, this.anio(), this.mes(), r),
    );
  }

  generarActa(): void {
    if (!this.idEmpresa) return;
    this.servicio.reporteActa(this.idEmpresa, this.anio(), this.mes()).subscribe({
      next: (a) => this.acta.set(a),
      error: (m: string) => this.notificar(m, false),
    });
  }

  generarPedido(): void {
    if (!this.idEmpresa) return;
    this.servicio.pendientePorArea(this.idEmpresa, this.anio(), this.mes(), this.area()).subscribe({
      next: (p) => this.pedido.set(p.texto),
      error: (m: string) => this.notificar(m, false),
    });
  }

  copiar(texto: string | null | undefined): void {
    if (!texto) return;
    navigator.clipboard?.writeText(texto).then(
      () => this.notificar('Copiado al portapapeles.', true),
      () => this.notificar('No se pudo copiar; selecciónelo a mano.', false),
    );
  }

  descargar(texto: string | null | undefined, nombre: string): void {
    if (!texto) return;
    const url = URL.createObjectURL(new Blob([texto], { type: 'text/markdown;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nombre;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** CSV de la bandeja visible (para trabajar fuera del SAA sin datos personales: solo números internos). */
  exportarBandeja(): void {
    const cab = ['Mes', 'Modulo', 'Codigo', 'Titulo', 'Tipo', 'Area', 'Estado', 'Requerimientos', 'Pendientes', 'PorRevisar', 'PorAplicar', 'AsientosAjuste', 'SaldoPorRegularizar'];
    const filas = this.bandeja().map((f) => [
      `${f.anio}-${String(f.mes).padStart(2, '0')}`, f.modulo, f.codigoNovedad, `"${(f.titulo ?? '').replace(/"/g, '""')}"`, f.tipoRespuesta,
      f.area ?? '', f.estadoNombre, f.requerimientos, f.pendientes, f.porRevisar, f.porAplicar, f.asientosAjuste, f.saldoPorRegularizar,
    ].join(';'));
    this.descargar([cab.join(';'), ...filas].join('\n'), `novedades-${this.anio()}-${String(this.mes()).padStart(2, '0')}.csv`);
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
