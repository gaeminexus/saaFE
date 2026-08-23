import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, DestroyRef, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, UntypedFormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { Subscription, catchError, of, switchMap, timer } from 'rxjs';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Periodo } from '../../../../cnt/model/periodo';
import { PeriodoService } from '../../../../cnt/service/periodo.service';
import { Titular } from '../../../../tsr/model/titular';
import { CargaArchivoTxt } from '../../../model/carga-archivo-txt';
import { DocumentoCxp } from '../../../model/documento-cxp';
import { ErrorBloqueante } from '../../../model/error-bloqueante';
import { ProgresoLote } from '../../../model/progreso-lote';
import { CargaArchivoTxtService } from '../../../service/carga-archivo-txt.service';
import { CargaDocumentosService } from '../../../service/carga-documentos.service';
import { DocumentoCxpService } from '../../../service/documento-cxp.service';
import { ClasificarProductosDialogComponent, ClasificarProductosDialogResult } from '../dialogs/clasificar-productos-dialog/clasificar-productos-dialog.component';
import { SubirXmlDialogComponent, SubirXmlDialogResult } from '../dialogs/subir-xml-dialog/subir-xml-dialog.component';
import { ReembolsosFacturaComponent } from '../reembolsos-factura/reembolsos-factura.component';

// Estados que aún no están registrados en BD (pendientes de proceso)
const ESTADOS_PENDIENTES = [1, 2, 4, 5, 6];

// ─── Dialog: errores de validación al cargar un XML ─────────────────────────
const CAMPO_LABELS: Record<string, string> = {
  claveAcceso:       'Clave de acceso',
  rucEmisor:         'RUC emisor',
  razonSocialEmisor: 'Razón social emisor',
  serieComprobante:  'Serie comprobante',
  valorSinImpuestos: 'Subtotal',
  importeTotal:      'Importe total',
  iva:               'IVA',
};

@Component({
  selector: 'app-xml-validacion-error-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="xv-titulo">
      <mat-icon class="xv-titulo-icon">warning</mat-icon>
      XML no corresponde al documento
    </h2>

    <mat-dialog-content class="xv-content">
      <p class="xv-descripcion">
        El archivo XML cargado tiene valores distintos a los registrados en el TXT del SRI.
        Verifique que está subiendo el archivo correcto.
      </p>

      <table class="xv-tabla">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Esperado (TXT del SRI)</th>
            <th>Encontrado en el XML</th>
          </tr>
        </thead>
        <tbody>
          @for (e of data.errores; track e.campo) {
            <tr>
              <td class="xv-campo">{{ label(e.campo) }}</td>
              <td class="xv-esperado">{{ e.esperado }}</td>
              <td class="xv-en-xml">{{ e.enXml }}</td>
            </tr>
          }
        </tbody>
      </table>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="true">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .xv-titulo {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--mat-sys-error, #b00020);
    }
    .xv-titulo-icon {
      color: var(--mat-sys-error, #b00020);
    }
    .xv-content {
      min-width: 560px;
      max-width: 90vw;
    }
    .xv-descripcion {
      margin: 0 0 16px;
      color: #555;
      font-size: 0.9rem;
    }
    .xv-tabla {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .xv-tabla thead tr {
      background: #f5f5f5;
    }
    .xv-tabla th {
      padding: 8px 12px;
      text-align: left;
      font-weight: 600;
      color: #333;
      border-bottom: 2px solid #e0e0e0;
    }
    .xv-tabla tbody tr {
      border-bottom: 1px solid #eeeeee;
    }
    .xv-tabla tbody tr:last-child {
      border-bottom: none;
    }
    .xv-campo {
      padding: 7px 12px;
      font-weight: 500;
      white-space: nowrap;
    }
    .xv-esperado {
      padding: 7px 12px;
      color: #2e7d32;
      word-break: break-all;
    }
    .xv-en-xml {
      padding: 7px 12px;
      color: var(--mat-sys-error, #b00020);
      word-break: break-all;
    }
  `],
})
export class XmlValidacionErrorDialogComponent {
  data: { errores: { campo: string; esperado: string; enXml: string }[] } = inject(MAT_DIALOG_DATA);
  label(campo: string): string { return CAMPO_LABELS[campo] ?? campo; }
}

// ─── Dialog: condiciones bloqueantes al registrar factura ────────────────────
// La forma de ErrorBloqueante vive en model/error-bloqueante.ts: la comparten el 422 de
// registrarBD y el progresoLote del lote (§6.3).

const TIPO_LABELS: Record<string, { label: string; icon: string }> = {
  PROVEEDOR_SIN_CUENTA:         { label: 'Proveedor sin cuenta contable CxP',           icon: 'account_balance' },
  PRODUCTOS_SIN_CLASIFICAR:     { label: 'Productos sin grupo asignado',                 icon: 'category' },
  GRUPOS_SIN_CUENTA_CONTABLE:   { label: 'Grupos sin cuenta contable',                   icon: 'folder_open' },
  TIPO_ASIENTO_NO_CONFIGURADO:  { label: 'Tipo de asiento no configurado',               icon: 'receipt_long' },
  CODIGOS_RETENCION_SIN_CUENTA: { label: 'Códigos de retención sin cuenta contable',     icon: 'percent' },
  FACTURA_VENTA_NO_ENCONTRADA:  { label: 'Factura de venta del sustento no encontrada',  icon: 'search_off' },
  RETENCION_MULTIDOCUMENTO:     { label: 'Retención con varios documentos sustento',     icon: 'call_split' },
};

@Component({
  selector: 'app-registro-bloqueantes-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="rb-titulo">
      <mat-icon class="rb-titulo-icon">block</mat-icon>
      No se puede registrar la factura
    </h2>

    <mat-dialog-content class="rb-content">
      <p class="rb-descripcion">
        Se encontraron <strong>{{ data.bloqueantes.length }} condición(es) bloqueante(s)</strong>
        que deben resolverse antes de registrar este documento.
      </p>

      @for (b of data.bloqueantes; track b.tipo; let i = $index) {
        <div class="rb-item">
          <div class="rb-item-header">
            <mat-icon class="rb-item-icon">{{ tipoIcon(b.tipo) }}</mat-icon>
            <span class="rb-item-label">{{ tipoLabel(b.tipo) }}</span>
          </div>
          <p class="rb-item-detalle">{{ b.detalle }}</p>
          @if (b.productos && b.productos.length > 0) {
            <ul class="rb-lista">
              @for (p of b.productos; track p) {
                <li>{{ p }}</li>
              }
            </ul>
          }
          @if (b.grupos && b.grupos.length > 0) {
            <ul class="rb-lista">
              @for (g of b.grupos; track g) {
                <li>{{ g }}</li>
              }
            </ul>
          }
        </div>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="true">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .rb-titulo {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--mat-sys-error, #b00020);
    }
    .rb-titulo-icon {
      color: var(--mat-sys-error, #b00020);
    }
    .rb-content {
      min-width: 500px;
      max-width: 90vw;
    }
    .rb-descripcion {
      margin: 0 0 16px;
      color: #444;
      font-size: 0.9rem;
    }
    .rb-item {
      border: 1px solid #e0e0e0;
      border-left: 4px solid var(--mat-sys-error, #b00020);
      border-radius: 4px;
      padding: 12px 14px;
      margin-bottom: 10px;
      background: #fff8f8;
    }
    .rb-item:last-child { margin-bottom: 0; }
    .rb-item-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .rb-item-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #c62828;
    }
    .rb-item-label {
      font-weight: 600;
      font-size: 0.88rem;
      color: #333;
    }
    .rb-item-detalle {
      margin: 0 0 6px;
      font-size: 0.85rem;
      color: #555;
    }
    .rb-lista {
      margin: 4px 0 0 16px;
      padding: 0;
      font-size: 0.83rem;
      color: #444;
    }
    .rb-lista li { margin-bottom: 2px; }
  `],
})
export class RegistroBloqueantesDialogComponent {
  data: { bloqueantes: ErrorBloqueante[] } = inject(MAT_DIALOG_DATA);
  tipoLabel(tipo: string): string { return TIPO_LABELS[tipo]?.label ?? tipo; }
  tipoIcon(tipo: string): string  { return TIPO_LABELS[tipo]?.icon  ?? 'error_outline'; }
}

// ─── Dialog genérico de error al registrar ───────────────────────────────────
@Component({
  selector: 'app-error-registro-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="er-titulo">
      <mat-icon class="er-titulo-icon">error_outline</mat-icon>
      Error al registrar el documento
    </h2>
    <mat-dialog-content class="er-content">
      <div class="er-cuerpo">
        <mat-icon class="er-icono-grande">cancel</mat-icon>
        <p class="er-mensaje">{{ data.mensaje }}</p>
      </div>
      @if (data.detalle) {
        <div class="er-detalle">
          <mat-icon class="er-detalle-icon">info_outline</mat-icon>
          <span>{{ data.detalle }}</span>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="true">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .er-titulo {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--mat-sys-error, #b00020);
    }
    .er-titulo-icon { color: var(--mat-sys-error, #b00020); }
    .er-content { min-width: 440px; max-width: 90vw; }
    .er-cuerpo {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding: 8px 0 12px;
    }
    .er-icono-grande {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--mat-sys-error, #b00020);
      flex-shrink: 0;
    }
    .er-mensaje {
      margin: 0;
      font-size: 0.95rem;
      color: #333;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .er-detalle {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      background: #fff3e0;
      border-left: 4px solid #ff9800;
      border-radius: 4px;
      padding: 10px 12px;
      font-size: 0.85rem;
      color: #555;
    }
    .er-detalle-icon { font-size: 18px; width: 18px; height: 18px; color: #ff9800; flex-shrink: 0; }
  `],
})
export class ErrorRegistroDialogComponent {
  data: { mensaje: string; detalle?: string } = inject(MAT_DIALOG_DATA);
}

// ─── Dialog: documentos de reembolso de una factura ───────────────────
export interface ReembolsosFacturaDialogData {
  idFacturaCompra: number;
  contabilizacionPendiente: boolean;
  idUsuario: number;
  idEmpresa: number;
}

@Component({
  selector: 'app-reembolsos-factura-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatIconModule, MatButtonModule, ReembolsosFacturaComponent],
  template: `
    <h2 mat-dialog-title class="rfd-titulo">
      <mat-icon>fact_check</mat-icon> Documentos de reembolso
    </h2>
    <mat-dialog-content class="rfd-content">
      <app-reembolsos-factura
        [idFacturaCompra]="data.idFacturaCompra"
        [editable]="true"
        [contabilizacionPendiente]="data.contabilizacionPendiente"
        [idUsuario]="data.idUsuario"
        [idEmpresa]="data.idEmpresa"
        (contabilizado)="onContabilizado()" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="cambios">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .rfd-titulo { display: flex; align-items: center; gap: 8px; }
    .rfd-content { min-width: 1100px; max-width: 96vw; }
  `],
})
export class ReembolsosFacturaDialogComponent {
  private ref = inject(MatDialogRef<ReembolsosFacturaDialogComponent, boolean>);
  data: ReembolsosFacturaDialogData = inject(MAT_DIALOG_DATA);
  cambios = false;
  onContabilizado(): void { this.cambios = true; this.ref.close(true); }
}

/** Contadores de §6.3 que se pueden usar como filtro rápido de la grilla. */
export type FiltroLote = 'sinXml' | 'conXml' | 'registrados' | 'requierenAtencion' | 'conError' | 'fueraVentana';

@Component({
  selector: 'app-gestion-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule, MatTabsModule],
  templateUrl: './gestion-documentos.component.html',
  styleUrl: './gestion-documentos.component.scss',
})
export class GestionDocumentosComponent implements OnInit, AfterViewInit, OnDestroy {
  private snackBar = inject(MatSnackBar);
  private docService = inject(DocumentoCxpService);
  private processService = inject(CargaDocumentosService);
  private cargaTxtService = inject(CargaArchivoTxtService);
  private dialog = inject(MatDialog);
  private funcionesDatos = inject(FuncionesDatosService);
  private periodoService = inject(PeriodoService);
  private destroyRef = inject(DestroyRef);

  // Periodos contables
  periodos = signal<Periodo[]>([]);
  periodoSeleccionado = signal<number | null>(null);

  // ViewChild para datepickers de fecha
  @ViewChild('fechaDesdeInput', { read: ElementRef }) fechaDesdeInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaHastaInput', { read: ElementRef }) fechaHastaInputRef!: ElementRef<HTMLInputElement>;

  // FormControls para los datepickers
  fechaDesdeControl = new UntypedFormControl(null);
  fechaHastaControl = new UntypedFormControl(null);
  private _rawFechaDesde = '';
  private _rawFechaHasta = '';

  private readonly ROL_PROVEEDOR = 2;

  // Señales
  cargando = signal(false);
  procesando = signal(false);
  filtroEstado = signal<number | null>(null);

  // Datos
  rawDatos: DocumentoCxp[] = [];          // todos los estados (para totales)
  todosDocumentos: DocumentoCxp[] = [];   // todos los estados (para tabla)
  dsDocumentos   = new MatTableDataSource<DocumentoCxp>([]);   // pendientes (≠ 3)
  dsRegistrados  = new MatTableDataSource<DocumentoCxp>([]);   // procesados (= 3)
  columnas = ['id', 'tipoComprobante', 'reembolso', 'rucEmisor', 'razonSocialEmisor', 'serieComprobante', 'claveAcceso', 'fechaEmision', 'valorSinImpuestos', 'iva', 'importeTotal', 'estadoDocumento', 'novedad', 'acciones'];

  // Totales (calculados sobre el conjunto filtrado por texto/fecha, antes del filtro de estado)
  totalesRegistrados = signal({ subtotal: 0, iva: 0, total: 0, count: 0 });
  totalesPendientes  = signal({ subtotal: 0, iva: 0, total: 0, count: 0 });

  // Filtros de búsqueda
  filtroRuc = '';
  filtroProveedor = '';
  filtroTipo = '';

  // Documentos con una llamada de marcado de reembolso en curso (evita el doble clic por fila)
  private idsReembolsoEnCurso = signal<ReadonlySet<number>>(new Set<number>());

  // ─── LOTE POR CARGA TXT ───────────────────────────────────────────────────
  // Los botones son POR CARGA, no por período: dentro de un período conviven TXT de facturas
  // y de retenciones (decisión (b) del usuario, §3 del plan).
  /** Fase 3 pendiente en el backend: /registrarLote aún no existe. */
  readonly REGISTRO_LOTE_DISPONIBLE = false;

  cargasTxt = signal<CargaArchivoTxt[]>([]);
  cargaTxtSeleccionada = signal<number | null>(null);
  progreso = signal<ProgresoLote | null>(null);
  /** Optimista: pasa a true con el 202/409 y solo lo baja un progreso con enCurso=false. */
  loteEnCurso = signal(false);
  /** POST de arranque en vuelo (aún no sabemos si el lote arrancó). */
  lanzandoLote = signal(false);
  filtroLote = signal<FiltroLote | null>(null);

  private pollingSub: Subscription | null = null;
  private erroresPolling = 0;
  /** Último procesados/total leídos con el lote en curso, para el resumen al terminar */
  private ultimoAvance = { procesados: 0, total: 0 };
  private readonly MAX_ERRORES_POLLING = 3;
  private readonly INTERVALO_POLLING_MS = 2000;

  porcentajeLote = computed(() => {
    const p = this.progreso();
    if (!p || !p.total) return 0;
    return Math.min(100, Math.round((p.procesados / p.total) * 100));
  });

  loteBloqueado = computed(() => this.loteEnCurso() || this.lanzandoLote() || !this.cargaTxtSeleccionada());

  private get idEmpresa(): number { return Number(localStorage.getItem('empresaCodigo') || localStorage.getItem('empresaId') || 1); }
  private get idUsuario(): number { try { const u = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}'); return u.codigo || u.id || 1; } catch { return 1; } }

  ngOnInit(): void {
    this.cargarPeriodos();
    // No cargamos documentos hasta que se seleccione un periodo
  }

  ngAfterViewInit(): void {
    // Inicialización después de que las vistas estén disponibles
  }

  ngOnDestroy(): void {
    this.detenerPolling();
  }

  // ─── PERIODOS ────────────────────────────────────────────

  cargarPeriodos(): void {
    this.periodoService.getAll().subscribe({
      next: (data) => {
        const sorted = (data || []).sort((a, b) => b.anio !== a.anio ? b.anio - a.anio : b.mes - a.mes);
        this.periodos.set(sorted);
      },
      error: () => this.mostrarError('No se pudieron cargar los períodos contables'),
    });
  }

  seleccionarPeriodo(idPeriodo: number | null): void {
    this.periodoSeleccionado.set(idPeriodo);
    this.dsDocumentos.data = [];
    this.rawDatos = [];
    this.todosDocumentos = [];
    this.limpiarEstadoLote();
    this.cargasTxt.set([]);
    if (idPeriodo) { this.cargar(); this.cargarCargasTxt(idPeriodo); }
  }

  // ─── CARGAS TXT DEL PERÍODO ─────────────────────────────

  private cargarCargasTxt(idPeriodo: number): void {
    const criterios: DatosBusqueda[] = [];
    const dbEmpresa = new DatosBusqueda();
    dbEmpresa.asignaValorConCampoPadre(TipoDatos.LONG, 'empresa', 'codigo', String(this.idEmpresa), TipoComandosBusqueda.IGUAL);
    criterios.push(dbEmpresa);
    const dbPeriodo = new DatosBusqueda();
    dbPeriodo.asignaValorConCampoPadre(TipoDatos.LONG, 'periodoContable', 'codigo', String(idPeriodo), TipoComandosBusqueda.IGUAL);
    criterios.push(dbPeriodo);
    this.cargaTxtService.selectByCriteria(criterios).subscribe({
      next: (data) => this.cargasTxt.set((data || []).sort((a, b) => b.id - a.id)),
      error: () => { this.cargasTxt.set([]); this.mostrarError('No se pudieron cargar los archivos TXT del período'); },
    });
  }

  seleccionarCargaTxt(idCargaTxt: number | null): void {
    this.limpiarEstadoLote();
    this.cargaTxtSeleccionada.set(idCargaTxt);
    // Una sola consulta al elegir la carga: muestra los contadores y engancha el polling si el
    // lote ya venía corriendo (otra pestaña, o la pantalla se cerró a media ejecución).
    if (idCargaTxt) { this.consultarProgreso(idCargaTxt, true); }
  }

  private limpiarEstadoLote(): void {
    this.detenerPolling();
    this.cargaTxtSeleccionada.set(null);
    this.progreso.set(null);
    this.loteEnCurso.set(false);
    this.lanzandoLote.set(false);
    if (this.filtroLote() !== null) { this.filtroLote.set(null); this.aplicarFiltrosBusqueda(); }
  }

  // ─── BOTONES DE LOTE (§6.1 y §6.2) ──────────────────────

  /** §6.1 — Baja del SRI los XML que todavía sirva para esta carga. */
  descargarXmlLote(): void {
    const idCarga = this.cargaTxtSeleccionada();
    if (!idCarga) { this.mostrarError('Seleccione una carga TXT.'); return; }
    this.lanzandoLote.set(true);
    this.processService.descargarXmlLote(idCarga, { idEmpresa: this.idEmpresa, idUsuario: this.idUsuario }).subscribe({
      next: (resp: any) => {
        this.lanzandoLote.set(false);
        const detalle = resp?.aProcesar != null
          ? ` ${resp.aProcesar} de ${resp.total} documento(s); ${resp.yaConXml ?? 0} ya tenían XML.`
          : '';
        this.mostrarExito(`${resp?.mensaje || 'Descarga iniciada.'}${detalle}`);
        this.arrancarLote(idCarga);
      },
      error: (err) => this.manejarErrorArranqueLote(err, idCarga, 'No se pudo iniciar la descarga'),
    });
  }

  /** §6.2 — Registra y contabiliza toda la carga, en el orden que impone el backend. */
  registrarLote(): void {
    const idCarga = this.cargaTxtSeleccionada();
    if (!idCarga) { this.mostrarError('Seleccione una carga TXT.'); return; }
    this.lanzandoLote.set(true);
    this.processService.registrarLote(idCarga, { idEmpresa: this.idEmpresa, idUsuario: this.idUsuario }).subscribe({
      next: (resp: any) => {
        this.lanzandoLote.set(false);
        const detalle = resp?.aProcesar != null
          ? ` ${resp.aProcesar} documento(s); ${resp.sinXml ?? 0} sin XML, ${resp.yaRegistrados ?? 0} ya registrados.`
          : '';
        this.mostrarExito(`${resp?.mensaje || 'Registro iniciado.'}${detalle}`);
        this.arrancarLote(idCarga);
      },
      error: (err) => this.manejarErrorArranqueLote(err, idCarga, 'No se pudo iniciar el registro'),
    });
  }

  private arrancarLote(idCarga: number): void {
    this.loteEnCurso.set(true);   // optimista: el 202 confirma que el lote arrancó
    this.iniciarPolling(idCarga);
  }

  /** El 409 no es un fallo: ya hay un lote corriendo para esta carga, nos enganchamos a él. */
  private manejarErrorArranqueLote(err: any, idCarga: number, titulo: string): void {
    this.lanzandoLote.set(false);
    if (err?.httpStatus === 409) {
      this.mostrarAdvertencia(this.extraerMensajeError(err));
      this.arrancarLote(idCarga);
      return;
    }
    this.mostrarErrorDialog(titulo, this.extraerMensajeError(err));
  }

  // ─── CLASIFICACIÓN MASIVA DE PRODUCTOS (§6.4, §6.5) ─────

  /**
   * Último prerequisito del registro por lote: en una carga de 50 documentos, muchos se bloquean
   * por PRODUCTOS_SIN_CLASIFICAR y hoy resolverlos es de uno en uno desde otra pantalla.
   */
  abrirClasificacionProductos(): void {
    const idCarga = this.cargaTxtSeleccionada();
    if (!idCarga) { this.mostrarError('Seleccione una carga TXT.'); return; }
    const ref = this.dialog.open(ClasificarProductosDialogComponent, {
      data: { idCargaTxt: idCarga, idEmpresa: this.idEmpresa },
      width: '1100px',
      maxWidth: '97vw',
    });
    ref.afterClosed().subscribe((huboCambios: ClasificarProductosDialogResult | undefined) => {
      if (huboCambios) { this.consultarProgreso(idCarga, false); }
    });
  }

  // ─── PROGRESO DEL LOTE (§6.3) ───────────────────────────

  private iniciarPolling(idCarga: number): void {
    this.detenerPolling();
    this.erroresPolling = 0;
    this.ultimoAvance = { procesados: 0, total: 0 };
    // El error se absorbe DENTRO del switchMap: si se dejara subir al subscriber terminaría la
    // suscripción y el polling moriría en silencio en el primer fallo de red, dejando el lote
    // marcado como en curso y los dos botones deshabilitados para siempre.
    // Con esto el stream sobrevive y aplicarProgreso recibe null, que es lo que espera.
    this.pollingSub = timer(this.INTERVALO_POLLING_MS, this.INTERVALO_POLLING_MS).pipe(
      switchMap(() => this.processService.progresoLote(idCarga).pipe(catchError(() => of(null)))),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe((p) => this.aplicarProgreso(p));
  }

  private detenerPolling(): void {
    this.pollingSub?.unsubscribe();
    this.pollingSub = null;
  }

  /**
   * Lectura suelta del progreso (al elegir carga): no arranca el polling salvo que haya lote.
   * progresoLote siempre responde 200 —corra o no un lote, y aunque la carga no exista (§6.3)—,
   * así que cualquier error aquí es de transporte y se le muestra al usuario tal cual.
   */
  private consultarProgreso(idCarga: number, engancharSiEnCurso: boolean): void {
    this.processService.progresoLote(idCarga).subscribe({
      next: (p) => {
        if (!p) return;
        this.progreso.set(p);
        if (p.enCurso && engancharSiEnCurso) {
          this.loteEnCurso.set(true);
          this.iniciarPolling(idCarga);
        }
      },
      error: (err) => this.mostrarError(`No se pudo consultar el estado de la carga: ${this.extraerMensajeError(err)}`),
    });
  }

  private aplicarProgreso(p: ProgresoLote | null): void {
    if (!p) { this.falloPolling(); return; }
    this.erroresPolling = 0;
    const veniaEnCurso = this.loteEnCurso();
    this.progreso.set(p);
    if (p.enCurso) {
      // total y procesados los mantiene el orquestador y vuelven a 0 al terminar el lote
      // (§11 decisión 16): se guarda el último avance visto para poder resumirlo al cerrar.
      this.ultimoAvance = { procesados: p.procesados, total: p.total };
      return;
    }
    // El 202 garantiza que el indicador ya estaba levantado (§6.1), así que una sola lectura con
    // enCurso=false después de haber estado en curso significa terminado.
    this.detenerPolling();
    this.loteEnCurso.set(false);
    if (veniaEnCurso) {
      const avance = p.total > 0 ? { procesados: p.procesados, total: p.total } : this.ultimoAvance;
      this.mostrarExito(`Lote terminado: ${avance.procesados} de ${avance.total} documento(s) procesado(s).`);
      this.cargar();
    }
  }

  private falloPolling(): void {
    this.erroresPolling++;
    if (this.erroresPolling < this.MAX_ERRORES_POLLING) { return; }
    this.detenerPolling();
    this.loteEnCurso.set(false);
    this.mostrarError('Se perdió el seguimiento del lote. El proceso puede seguir corriendo en el servidor: actualice para ver el resultado.');
  }

  // ─── FILTRO POR CONTADOR DEL LOTE ───────────────────────

  setFiltroLote(filtro: FiltroLote): void {
    this.filtroLote.set(this.filtroLote() === filtro ? null : filtro);
    this.aplicarFiltrosBusqueda();
  }

  /**
   * Mismos criterios que los contadores de §6.3, para que el chip y la grilla digan lo mismo.
   *
   * Los cinco primeros reparten SOLO por estadoDocumento: así son disjuntos y suman total por
   * construcción. Mirar pathXml rompía el cierre, porque revertirDocumento deja estado 6 sin
   * limpiarlo y ese documento no caía en ningún chip (§11 decisión 11).
   * fueraVentana es la excepción declarada: subconjunto de sinXml, no una categoría aparte.
   */
  private cumpleFiltroLote(d: DocumentoCxp, filtro: FiltroLote): boolean {
    const estado = d.estadoDocumento;
    switch (filtro) {
      // Cajón de pendientes de procesar (se rotula "Pendientes"): incluye los revertidos.
      case 'sinXml':            return estado == null || (estado !== 2 && estado !== 3 && estado !== 4);
      case 'conXml':            return estado === 2 && !d.observacion;
      case 'requierenAtencion': return estado === 2 && !!d.observacion;
      case 'registrados':       return estado === 3;
      case 'conError':          return estado === 4;
      case 'fueraVentana':      return d.resultadoSri === 'FUERA_VENTANA';
      default:                  return true;
    }
  }

  /** Ids de la carga según el último progreso; null si todavía no hay progreso que acotar. */
  private idsDeLaCarga(): ReadonlySet<number> | null {
    const docs = this.progreso()?.documentos;
    return docs?.length ? new Set(docs.map(d => d.id)) : null;
  }

  /** Bloqueantes que el último progreso reportó para un documento (§6.3). */
  bloqueantesDe(doc: DocumentoCxp): ErrorBloqueante[] {
    return this.progreso()?.documentos?.find(d => d.id === doc.id)?.bloqueantes ?? [];
  }

  verBloqueantes(doc: DocumentoCxp): void {
    const bloqueantes = this.bloqueantesDe(doc);
    if (bloqueantes.length > 0) { this.mostrarBloqueantes(bloqueantes); }
  }

  // ─── CARGA Y FILTROS ────────────────────────────────────

  cargar(): void {
    const idPeriodo = this.periodoSeleccionado();
    if (!idPeriodo) return;
    this.cargando.set(true);
    // Cargamos TODOS los estados para calcular totales correctamente
    const criterios: DatosBusqueda[] = [];
    const dbEmpresa = new DatosBusqueda();
    dbEmpresa.asignaValorConCampoPadre(TipoDatos.LONG, 'empresa', 'codigo', String(this.idEmpresa), TipoComandosBusqueda.IGUAL);
    criterios.push(dbEmpresa);
    const dbPeriodo = new DatosBusqueda();
    dbPeriodo.asignaValorConCampoPadre(TipoDatos.LONG, 'periodoContable', 'codigo', String(idPeriodo), TipoComandosBusqueda.IGUAL);
    criterios.push(dbPeriodo);
    this.docService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.rawDatos = data || [];
        this.todosDocumentos = [...this.rawDatos];
        this.aplicarFiltrosBusqueda();
        this.cargando.set(false);
      },
      error: () => { this.mostrarError('No se pudo cargar los documentos'); this.cargando.set(false); },
    });
  }

  setFiltroEstado(estado: number | null): void {
    this.filtroEstado.set(estado);
    this.cargar();
  }

  buscar(): void {
    this.aplicarFiltrosBusqueda();
  }

  limpiarFiltros(): void {
    this.filtroRuc = '';
    this.filtroProveedor = '';
    this.filtroTipo = '';
    this.fechaDesdeControl.setValue(null, { emitEvent: false });
    this.fechaHastaControl.setValue(null, { emitEvent: false });
    if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = '';
    if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = '';
    this.aplicarFiltrosBusqueda();
  }

  private aplicarFiltrosBusqueda(): void {
    // 1. Aplicar filtros de texto y fecha sobre TODOS los datos (raw, todos los estados)
    let filtradosTodos = [...this.rawDatos];

    if (this.filtroRuc.trim()) {
      const ruc = this.filtroRuc.trim().toLowerCase();
      filtradosTodos = filtradosTodos.filter(d => d.rucEmisor?.toLowerCase().includes(ruc));
    }
    if (this.filtroProveedor.trim()) {
      const prov = this.filtroProveedor.trim().toLowerCase();
      filtradosTodos = filtradosTodos.filter(d => d.razonSocialEmisor?.toLowerCase().includes(prov));
    }
    if (this.filtroTipo.trim()) {
      const tipo = this.filtroTipo.trim().toLowerCase();
      filtradosTodos = filtradosTodos.filter(d => d.tipoComprobante?.toLowerCase().includes(tipo));
    }
    const fechaDesdeStr = this.dateToYMD(this.fechaDesdeControl.value);
    const fechaHastaStr = this.dateToYMD(this.fechaHastaControl.value);
    if (fechaDesdeStr) {
      filtradosTodos = filtradosTodos.filter(d => this.compareFecha(d.fechaEmision) >= fechaDesdeStr);
    }
    if (fechaHastaStr) {
      filtradosTodos = filtradosTodos.filter(d => this.compareFecha(d.fechaEmision) <= fechaHastaStr);
    }

    // 2. Calcular totales antes del filtro de estado (registrados vs pendientes)
    this.calcularTotales(filtradosTodos);

    // 3. Aplicar filtro de estado para la tabla de pendientes (≠ 3)
    let paraPendientes = filtradosTodos.filter(d => d.estadoDocumento !== 3);
    const estado = this.filtroEstado();
    if (estado !== null) {
      paraPendientes = estado === 5
        ? paraPendientes.filter(d => d.estadoDocumento === 5 && !!d.novedad)
        : paraPendientes.filter(d => d.estadoDocumento === estado);
    }

    // 4. Tabla de procesados (= 3), aplica solo filtros de texto/fecha
    let paraRegistrados = filtradosTodos.filter(d => d.estadoDocumento === 3);

    // 5. Chip de contador del lote: acota AMBAS tablas y, si hay progreso, se limita a los
    //    documentos de la carga seleccionada para que el número del chip cuadre con la grilla.
    const chip = this.filtroLote();
    if (chip !== null) {
      const idsCarga = this.idsDeLaCarga();
      const cumple = (d: DocumentoCxp) => this.cumpleFiltroLote(d, chip) && (!idsCarga || idsCarga.has(d.id));
      paraPendientes  = paraPendientes.filter(cumple);
      paraRegistrados = paraRegistrados.filter(cumple);
    }

    this.dsDocumentos.data  = paraPendientes;
    this.dsRegistrados.data = paraRegistrados;
  }

  private calcularTotales(docs: DocumentoCxp[]): void {
    const sum = (arr: DocumentoCxp[]) => arr.reduce(
      (acc, d) => ({
        subtotal: acc.subtotal + Number(d.valorSinImpuestos || 0),
        iva:      acc.iva      + Number(d.iva || 0),
        total:    acc.total    + Number(d.importeTotal || 0),
        count:    acc.count    + 1,
      }),
      { subtotal: 0, iva: 0, total: 0, count: 0 }
    );
    this.totalesRegistrados.set(sum(docs.filter(d => d.estadoDocumento === 3)));
    this.totalesPendientes .set(sum(docs.filter(d => d.estadoDocumento !== 3)));
  }

  // ─── BUSCAR TITULAR PROVEEDOR ───────────────────────────

  abrirBusquedaTitular(): void {
    const dialogRef = this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_PROVEEDOR, rolNombre: 'PROVEEDOR', titulo: 'Buscar Proveedor' },
    });
    dialogRef.afterClosed().subscribe((titular: Titular | null) => {
      if (titular) {
        this.filtroProveedor = titular.nombre || titular.razonSocial || '';
        this.aplicarFiltrosBusqueda();
      }
    });
  }

  // ─── DATEPICKER: FECHA DESDE ────────────────────────────

  capturarFechaDesdeRaw(event: Event): void {
    this._rawFechaDesde = (event.target as HTMLInputElement).value;
  }

  syncFechaDesdeFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaDesde || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaDesde = '';
    if (!raw) return;
    const date = this.parseFechaLocal(raw);
    if (date) {
      this.fechaDesdeControl.setValue(date, { emitEvent: false });
      const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
      setTimeout(() => { if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = formatted; });
    }
  }

  onFechaDesdePickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.fechaDesdeControl.setValue(d, { emitEvent: false });
    const formatted = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (this.fechaDesdeInputRef?.nativeElement) this.fechaDesdeInputRef.nativeElement.value = formatted; });
  }

  // ─── DATEPICKER: FECHA HASTA ────────────────────────────

  capturarFechaHastaRaw(event: Event): void {
    this._rawFechaHasta = (event.target as HTMLInputElement).value;
  }

  syncFechaHastaFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaHasta || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaHasta = '';
    if (!raw) return;
    const date = this.parseFechaLocal(raw);
    if (date) {
      this.fechaHastaControl.setValue(date, { emitEvent: false });
      const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
      setTimeout(() => { if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = formatted; });
    }
  }

  onFechaHastaPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    this.fechaHastaControl.setValue(d, { emitEvent: false });
    const formatted = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    setTimeout(() => { if (this.fechaHastaInputRef?.nativeElement) this.fechaHastaInputRef.nativeElement.value = formatted; });
  }

  // ─── HELPERS FECHA ──────────────────────────────────────

  private parseFechaLocal(valor: any): Date | null {
    if (!valor) return null;
    if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
    const str = String(valor).trim();
    const parts = str.split('/');
    if (parts.length === 3) {
      const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
      if (!isNaN(dia) && !isNaN(mes) && !isNaN(anio) && anio >= 1000) {
        const d = new Date(anio, mes, dia);
        if (d.getFullYear() === anio && d.getMonth() === mes && d.getDate() === dia) return d;
      }
    }
    return null;
  }

  private dateToYMD(val: any): string {
    if (!val) return '';
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  private compareFecha(val: any): string {
    if (!val) return '';
    if (Array.isArray(val)) {
      const [y, mo, d] = val as number[];
      return `${y}-${String(mo).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    }
    return String(val).substring(0, 10);
  }

  // ─── SUBIR XML ──────────────────────────────────────────

  abrirSelectorXml(doc: DocumentoCxp): void {
    const ref = this.dialog.open(SubirXmlDialogComponent, {
      data: { documento: doc },
      width: '520px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((result: SubirXmlDialogResult | null) => {
      if (result?.file) { this.subirXml(result.file, doc, result.esReembolso); }
    });
  }

  private subirXml(file: File, doc: DocumentoCxp, esReembolso: boolean): void {
    this.procesando.set(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const contenidoXml = (e.target?.result as string) || '';
      this.processService.cargarXml(doc.id, { contenidoXml, idUsuario: this.idUsuario, esReembolso: esReembolso ? 1 : 0 }).subscribe({
        next: (resp: any) => {
          this.procesando.set(false);
          this.mostrarExito('XML subido correctamente');
          this.procesarRespuestaReembolso(resp, doc);
          this.cargar();
        },
        error: (err) => {
          this.procesando.set(false);
          if (err?.valido === false && Array.isArray(err?.errores) && err.errores.length > 0) {
            this.mostrarErrorValidacionXml(err.errores);
          } else {
            this.mostrarError('Error al subir XML: ' + this.extraerMensajeError(err));
          }
        },
      });
    };
    reader.readAsText(file, 'UTF-8');
  }

  /** Reacciona a los campos NUEVOS de la respuesta del proceso XML (reembolso). */
  private procesarRespuestaReembolso(resp: any, doc: DocumentoCxp): void {
    if (!resp) return;
    if (resp.advertenciaReembolso) {
      this.snackBar.open(resp.advertenciaReembolso, 'Cerrar', { duration: 8000, panelClass: ['warning-snackbar'] });
    }
    if (resp.reembolsoManualPendiente || resp.contabilizacionPendiente) {
      const idFactura = resp.idFacturaCompra || resp.idDocumentoBD || doc.idDocumentoBD;
      const snackRef = this.snackBar.open(
        resp.motivoContabilizacionPendiente || 'Reembolso pendiente de sustentos / contabilización',
        'Gestionar reembolsos',
        { duration: 10000, panelClass: ['warning-snackbar'] },
      );
      snackRef.onAction().subscribe(() => {
        if (idFactura) {
          this.abrirDialogoReembolsos({ ...doc, idDocumentoBD: idFactura, esReembolso: 1, estadoDocumento: 2 });
        }
      });
    }
  }

  // ─── REGISTRAR EN BD ────────────────────────────────────

  registrar(doc: DocumentoCxp): void {
    if (!confirm(`¿Registrar en BD el documento ${doc.serieComprobante}?`)) return;
    this.procesando.set(true);
    this.processService.registrarBD(doc.id, { idEmpresa: this.idEmpresa, idUsuario: this.idUsuario }).subscribe({
      next: (resp) => {
        this.procesando.set(false);
        if (Array.isArray(resp?.bloqueantes) && resp.bloqueantes.length > 0) {
          this.mostrarBloqueantes(resp.bloqueantes);
        } else if (resp?.error === 'TITULAR_NO_ENCONTRADO') {
          this.mostrarErrorDialog(`Proveedor no encontrado`, `RUC: ${resp.rucEmisor}\nEl proveedor no existe en el sistema. Créelo en TSR primero.`);
        } else if (resp?.exito === false || (resp?.error && resp.error !== 'TITULAR_NO_ENCONTRADO')) {
          this.mostrarErrorDialog(resp?.mensaje || resp?.error || 'Error al registrar la factura');
        } else if (!resp?.idDocumentoBD && resp?.mensaje) {
          this.mostrarErrorDialog(resp.mensaje);
        } else if (resp?.mensaje?.includes('PENDIENTE DE CLASIFICAR')) {
          this.mostrarAdvertencia(resp.mensaje);
          this.cargar();
        } else {
          this.mostrarExito(`Registrado: ${resp?.mensaje || 'OK'}`);
          this.cargar();
        }
      },
      error: (err) => {
        this.procesando.set(false);
        if (Array.isArray(err?.bloqueantes) && err.bloqueantes.length > 0) {
          this.mostrarBloqueantes(err.bloqueantes);
        } else {
          this.mostrarErrorDialog('Error al registrar', this.extraerMensajeError(err));
        }
      },
    });
  }

  // ─── RESOLVER NOVEDAD ───────────────────────────────────

  resolverNovedad(doc: DocumentoCxp, accion: 'MANTENER' | 'REEMPLAZAR', xmlFile?: File, esReembolso?: boolean): void {
    if (accion === 'MANTENER') {
      if (!confirm(`¿Mantener el documento ${doc.serieComprobante} sin cambios?`)) return;
      this.procesando.set(true);
      this.processService.resolverNovedad(doc.id, { accion: 'MANTENER', idUsuario: this.idUsuario }).subscribe({
        next: () => { this.procesando.set(false); this.mostrarExito('Documento mantenido'); this.cargar(); },
        error: (err) => { this.procesando.set(false); this.mostrarError(this.extraerMensajeError(err)); },
      });
    } else if (xmlFile) {
      this.procesando.set(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const contenidoXml = (e.target?.result as string) || '';
        this.processService.resolverNovedad(doc.id, { accion: 'REEMPLAZAR', contenidoXml, idUsuario: this.idUsuario, esReembolso: esReembolso ? 1 : 0 }).subscribe({
          next: (resp) => { this.procesando.set(false); this.mostrarExito(resp?.mensaje || 'Reemplazado'); this.cargar(); },
          error: (err) => { this.procesando.set(false); this.mostrarError(this.extraerMensajeError(err)); },
        });
      };
      reader.readAsText(xmlFile, 'UTF-8');
    }
  }

  abrirResolverReemplazar(doc: DocumentoCxp): void {
    const ref = this.dialog.open(SubirXmlDialogComponent, {
      data: { documento: doc },
      width: '520px',
      maxWidth: '95vw',
    });
    ref.afterClosed().subscribe((result: SubirXmlDialogResult | null) => {
      if (result?.file) { this.resolverNovedad(doc, 'REEMPLAZAR', result.file, result.esReembolso); }
    });
  }

  // ─── MARCAR / DESMARCAR REEMBOLSO ───────────────────────

  /** ¿Hay una llamada de marcado en curso para esta fila? */
  reembolsoEnCurso(doc: DocumentoCxp): boolean { return this.idsReembolsoEnCurso().has(doc.id); }

  private setReembolsoEnCurso(id: number, enCurso: boolean): void {
    const ids = new Set(this.idsReembolsoEnCurso());
    if (enCurso) { ids.add(id); } else { ids.delete(id); }
    this.idsReembolsoEnCurso.set(ids);
  }

  /**
   * Checkbox de la grilla. El marcado de reembolso es un paso masivo previo al registro
   * (50+ documentos por lote), así que NO lleva confirmación por fila: se aplica optimista y se
   * revierte el check si el backend lo rechaza.
   *
   * Excepción: en estado 3 (REGISTRADO) sí se confirma, porque el backend anula el asiento
   * contable y devuelve el documento a estado 2 pendiente de contabilizar. Es la única ruta para
   * corregir una factura de reembolso que se registró mal.
   */
  onToggleReembolso(doc: DocumentoCxp, event: MatCheckboxChange): void {
    const nuevoValor = event.checked;
    const estadoPrevio = doc.estadoDocumento;
    const valorPrevio = doc.esReembolso === 1;

    if (estadoPrevio === 3 && !confirm(
      `El documento ${doc.serieComprobante} ya está REGISTRADO.\n\n` +
      `Al ${nuevoValor ? 'marcarlo' : 'desmarcarlo'} como reembolso de gastos se ANULA su asiento contable ` +
      `y la factura vuelve al estado XML CARGADO, pendiente de contabilizar.\n\n¿Desea continuar?`)) {
      event.source.checked = valorPrevio;   // el usuario canceló: el check vuelve a su estado real
      return;
    }

    doc.esReembolso = nuevoValor ? 1 : 0;   // optimista: la grilla responde sin esperar al backend
    this.setReembolsoEnCurso(doc.id, true);
    this.processService.marcarReembolso(doc.id, nuevoValor, this.idUsuario).subscribe({
      next: (resp: any) => {
        this.setReembolsoEnCurso(doc.id, false);
        if (resp?.esReembolso != null) { doc.esReembolso = Number(resp.esReembolso) ? 1 : 0; }
        if (resp?.idFacturaCompra) { doc.idDocumentoBD = resp.idFacturaCompra; }
        this.mostrarExito(`${doc.serieComprobante}: ${nuevoValor ? 'marcado como reembolso de gastos' : 'reembolso desmarcado'}`);
        // Si el backend movió el documento de estado (3 → 2 al anular el asiento) la fila cambia de
        // pestaña y hay que recargar. En el marcado masivo el estado no cambia y no se recarga nada.
        if (resp?.estadoDocumento != null && Number(resp.estadoDocumento) !== estadoPrevio) { this.cargar(); }
      },
      error: (err) => {
        this.setReembolsoEnCurso(doc.id, false);
        doc.esReembolso = valorPrevio ? 1 : 0;   // el backend rechazó: revertimos el check
        event.source.checked = valorPrevio;
        this.mostrarError(this.mensajeErrorReembolso(err, doc));
      },
    });
  }

  /**
   * El 422 es una regla de negocio del backend (pagos aplicados, sustentos activos, tabla destino
   * no soportada): su texto se muestra tal cual, sin envolverlo en un mensaje genérico.
   */
  private mensajeErrorReembolso(err: any, doc: DocumentoCxp): string {
    const mensaje = this.extraerMensajeError(err);
    return err?.httpStatus === 422 ? mensaje : `${doc.serieComprobante}: ${mensaje}`;
  }

  // ─── DIÁLOGO DOCUMENTOS DE REEMBOLSO ────────────────────

  puedeGestionarReembolsos(doc: DocumentoCxp): boolean {
    return doc.esReembolso === 1
      && doc.tipoTablaDestino === 'FACTURA_COMPRA'
      && !!doc.idDocumentoBD
      && (doc.estadoDocumento === 2 || doc.estadoDocumento === 3);
  }

  abrirDialogoReembolsos(doc: DocumentoCxp): void {
    const ref = this.dialog.open(ReembolsosFacturaDialogComponent, {
      data: {
        idFacturaCompra: doc.idDocumentoBD,
        contabilizacionPendiente: doc.estadoDocumento === 2,
        idUsuario: this.idUsuario,
        idEmpresa: this.idEmpresa,
      },
      width: '1200px',
      maxWidth: '98vw',
    });
    ref.afterClosed().subscribe(() => this.cargar());
  }

  // ─── REVERTIR (estado 3 → 6) ───────────────────────────────────
  revertir(doc: DocumentoCxp): void {
    if (!confirm(`¿Revertir el registro del documento ${doc.serieComprobante}? Esta acción eliminará el registro en las tablas CXP y devolverá el documento al estado XML CARGADO.`)) return;
    this.procesando.set(true);
    this.processService.revertir(doc.id, this.idUsuario).subscribe({
      next: () => { this.procesando.set(false); this.mostrarExito('Documento revertido correctamente'); this.cargar(); },
      error: (err) => { this.procesando.set(false); this.mostrarError('Error al revertir: ' + this.extraerMensajeError(err)); },
    });
  }

  // ─── HELPERS ────────────────────────────────────────────

  estadoLabel(estado: number): string {
    const labels: Record<number, string> = { 1: 'LEÍDO', 2: 'XML CARGADO', 3: 'REGISTRADO', 4: 'ERROR', 5: 'NOVEDAD', 6: 'REVERTIDO' };
    return labels[estado] || String(estado);
  }

  estadoColor(estado: number): string {
    const colors: Record<number, string> = { 1: 'badge-leido', 2: 'badge-xml', 3: 'badge-registrado', 4: 'badge-error', 5: 'badge-novedad', 6: 'badge-revertido' };
    return colors[estado] || '';
  }

  tipoLoteLabel(tipo: 'DESCARGA' | 'REGISTRO' | null): string {
    if (tipo === 'DESCARGA') return 'Descarga de XML del SRI';
    if (tipo === 'REGISTRO')  return 'Registro y contabilización';
    return 'Último lote';
  }

  /**
   * Tooltip único de la celda de estado (§11 decisión 6): explica el distintivo FUERA DE VENTANA
   * —el SRI solo sirve comprobantes del último mes, así que esos documentos solo se completan
   * subiendo el XML a mano— y muestra el mensajeSri cuando viene con valor.
   * Va en la celda y no en la fila para no superponerse con los tooltips de las otras columnas.
   */
  tooltipEstado(doc: DocumentoCxp): string {
    if (doc.resultadoSri === 'FUERA_VENTANA') {
      const base = 'El SRI solo devuelve comprobantes emitidos en el último mes y este documento quedó '
        + 'fuera de esa ventana: ya no se puede descargar. Suba el XML manualmente con el botón «Subir XML».';
      return doc.mensajeSri ? `${base} — SRI: ${doc.mensajeSri}` : base;
    }
    return doc.mensajeSri || '';
  }

  toDate(value: any): Date | null {
    if (!value) return null;
    if (Array.isArray(value)) { const [y, mo, d, h = 0, m = 0, s = 0] = value as number[]; return new Date(y, mo - 1, d, h, m, s); }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  /** Decodifica entidades HTML (ej: &#xf3; → ó) que vienen del SRI en tipoComprobante */
  decodeHtml(str: string | null | undefined): string {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  /** Abre el dialog de condiciones bloqueantes al registrar */
  private mostrarBloqueantes(bloqueantes: ErrorBloqueante[]): void {
    this.dialog.open(RegistroBloqueantesDialogComponent, {
      data: { bloqueantes },
      width: '600px',
      maxWidth: '95vw',
    });
  }

  /** Abre un dialog de error genérico con título y detalle opcional */
  private mostrarErrorDialog(mensaje: string, detalle?: string): void {
    this.dialog.open(ErrorRegistroDialogComponent, {
      data: { mensaje, detalle },
      width: '520px',
      maxWidth: '95vw',
    });
  }

  /** Abre un dialog con la tabla de diferencias entre el TXT del SRI y el XML subido */
  private mostrarErrorValidacionXml(errores: { campo: string; esperado: string; enXml: string }[]): void {
    this.dialog.open(XmlValidacionErrorDialogComponent, {
      data: { errores },
      width: '700px',
      maxWidth: '95vw',
      disableClose: false,
    });
  }

  /** Extrae el mensaje legible de un error HTTP (el backend puede usar 'mensaje', 'message' o 'error') */
  private extraerMensajeError(err: any): string {
    if (!err) return 'Error desconocido';
    if (typeof err === 'string') return err;
    return err?.mensaje || err?.message || err?.error || JSON.stringify(err);
  }

  private mostrarExito(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-success'] }); }
  private mostrarAdvertencia(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 8000, panelClass: ['warning-snackbar'] }); }
  private mostrarError(msg: string): void { this.snackBar.open(msg, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] }); }
}
