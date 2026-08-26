import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import {
  CierreCartera,
  CorridaCierreCartera,
  ESTADO_CORRIDA,
  NOMBRE_ESTADO_CORRIDA,
  SolicitudCierreCartera,
  SubProcesoCierre,
  TIPO_CARTERA_CIERRE,
} from '../../model/cierre-cartera/cierre-cartera.model';
import { CierreCarteraService } from '../../service/cierre-cartera.service';
import {
  ReversarCorridaDialogComponent,
  ReversarCorridaResult,
} from './reversar-corrida-dialog.component';

/** De dónde salió el resultado que se está mostrando: cambia el encabezado y las acciones. */
type OrigenResultado = 'previsualizacion' | 'ejecucion' | 'consulta';

/** Tolerancia de cuadre para el indicador visual D = H (el backend usa 0.5 en plantillas). */
const TOLERANCIA_CUADRE = 0.005;

const MESES = [
  { valor: 1, nombre: 'Enero' },
  { valor: 2, nombre: 'Febrero' },
  { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' },
  { valor: 5, nombre: 'Mayo' },
  { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' },
  { valor: 8, nombre: 'Agosto' },
  { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' },
  { valor: 11, nombre: 'Noviembre' },
  { valor: 12, nombre: 'Diciembre' },
];

/**
 * Pantalla del cierre mensual de cartera (Fase 2).
 *
 * Flujo: elegir período → previsualizar → revisar → ejecutar → consultar → (si hace falta)
 * reversar. Las tres fechas y los rangos/asientos los calcula el backend; la pantalla los
 * muestra. Contrato: docs/crd/API-CIERRE-CARTERA.md.
 */
@Component({
  selector: 'app-cierre-cartera',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
  ],
  templateUrl: './cierre-cartera.component.html',
  styleUrl: './cierre-cartera.component.scss',
})
export class CierreCarteraComponent implements OnInit {
  readonly ESTADO_CORRIDA = ESTADO_CORRIDA;
  readonly MESES = MESES;

  private cierreService = inject(CierreCarteraService);
  private usuarioService = inject(UsuarioService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Contexto de sesión
  idEmpresa: number | null = null;
  private usuarioAuditoria: string | null = null;

  // Selección de período
  anio = 2026;
  mes = 8;

  // Estado de operaciones
  previsualizando = signal(false);
  ejecutando = signal(false);
  consultando = signal(false);
  reversando = signal(false);
  cargandoCorridas = signal(false);

  // Resultado actual (previsualización, ejecución o consulta)
  resultado = signal<CierreCartera | null>(null);
  origen = signal<OrigenResultado | null>(null);
  error = signal<string | null>(null);

  // Historial
  corridas = signal<CorridaCierreCartera[]>([]);
  mostrarHistorial = signal(false);

  // Snapshot colapsable (son ~143 filas)
  mostrarSnapshot = signal(false);

  ngOnInit(): void {
    this.resolverContextoSesion();
    if (this.idEmpresa == null) {
      this.error.set(
        'No se pudo determinar la empresa de la sesión. Vuelva a iniciar sesión y reintente.',
      );
    }
  }

  private resolverContextoSesion(): void {
    const empresa = this.usuarioService.getEmpresaLog();
    if (empresa?.codigo) {
      this.idEmpresa = empresa.codigo;
    } else {
      const raw = sessionStorage.getItem('idEmpresa') ?? localStorage.getItem('idEmpresa');
      const codigo = raw ? parseInt(raw, 10) : NaN;
      this.idEmpresa = isNaN(codigo) ? null : codigo;
    }
    const usuario = this.usuarioService.getUsuarioLog();
    this.usuarioAuditoria = usuario?.nombre ?? sessionStorage.getItem('username') ?? null;
  }

  private construirSolicitud(): SolicitudCierreCartera {
    return {
      idEmpresa: this.idEmpresa as number,
      anio: this.anio,
      mes: this.mes,
      usuario: this.usuarioAuditoria,
      ip: null,
      observacion: `Cierre de ${this.nombreMes(this.mes)} ${this.anio}`,
    };
  }

  private get periodoTexto(): string {
    return `${this.nombreMes(this.mes)} ${this.anio}`;
  }

  // ===================== Previsualizar =====================

  previsualizar(): void {
    if (this.idEmpresa == null || this.ocupado()) {
      return;
    }
    this.error.set(null);
    this.previsualizando.set(true);
    this.cierreService.previsualizar(this.construirSolicitud()).subscribe({
      next: (res) => {
        this.previsualizando.set(false);
        this.resultado.set(res);
        this.origen.set('previsualizacion');
        this.mostrarSnapshot.set(false);
      },
      error: (mensaje: string) => {
        this.previsualizando.set(false);
        this.resultado.set(null);
        this.origen.set(null);
        this.error.set(mensaje);
      },
    });
  }

  // ===================== Ejecutar =====================

  ejecutar(): void {
    const res = this.resultado();
    if (!res || this.origen() !== 'previsualizacion' || this.ocupado()) {
      return;
    }

    const detalles = res.subProcesos
      .filter((sp) => !sp.omitido)
      .map((sp) => ({
        label: `${sp.referencia} ${sp.nombre}`,
        value: `D = H = $${this.money(sp.totalDebe)}`,
      }));
    if (res.advertencias?.length) {
      detalles.push({ label: '⚠ Advertencias', value: `${res.advertencias.length} — revíselas antes de continuar` });
    }

    const data: ConfirmDialogData = {
      title: `Ejecutar cierre de ${this.periodoTexto}`,
      message:
        'Se grabará la corrida y se generarán los asientos contables de los sub-procesos ' +
        'listados. Esta acción contabiliza dinero real y solo se deshace reversando la corrida.',
      confirmText: 'Ejecutar y contabilizar',
      cancelText: 'Cancelar',
      type: 'warning',
      details: detalles,
    };

    this.dialog
      .open(ConfirmDialogComponent, { data, width: '560px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) {
          this.ejecutarConfirmado();
        }
      });
  }

  private ejecutarConfirmado(): void {
    this.error.set(null);
    this.ejecutando.set(true);
    this.cierreService.ejecutar(this.construirSolicitud()).subscribe({
      next: (res) => {
        this.ejecutando.set(false);
        this.resultado.set(res);
        this.origen.set('ejecucion');
        this.notificar(
          `Cierre de ${this.periodoTexto} ejecutado. Corrida ${res.idCorrida ?? ''}.`,
          true,
        );
        if (this.mostrarHistorial()) {
          this.cargarCorridas();
        }
      },
      error: (mensaje: string) => {
        this.ejecutando.set(false);
        this.error.set(mensaje);
        this.notificar(mensaje, false);
      },
    });
  }

  // ===================== Consultar =====================

  consultar(): void {
    if (this.idEmpresa == null || this.ocupado()) {
      return;
    }
    this.error.set(null);
    this.consultando.set(true);
    this.cierreService.consultar(this.idEmpresa, this.anio, this.mes).subscribe({
      next: (res) => {
        this.consultando.set(false);
        this.resultado.set(res);
        this.origen.set('consulta');
        this.mostrarSnapshot.set(false);
      },
      error: (mensaje: string) => {
        this.consultando.set(false);
        this.resultado.set(null);
        this.origen.set(null);
        this.error.set(mensaje);
      },
    });
  }

  // ===================== Reversar =====================

  reversar(corrida: CorridaCierreCartera): void {
    if (corrida.idEstado !== ESTADO_CORRIDA.EJECUTADA || this.ocupado()) {
      return;
    }
    this.dialog
      .open(ReversarCorridaDialogComponent, {
        width: '560px',
        data: {
          periodo: `${this.nombreMes(corrida.mes)} ${corrida.anio}`,
          idCorrida: corrida.codigo,
          cantidadAsientos: 0,
        },
      })
      .afterClosed()
      .subscribe((resultado?: ReversarCorridaResult) => {
        if (resultado?.motivo) {
          this.reversarConfirmado(corrida, resultado.motivo);
        }
      });
  }

  private reversarConfirmado(corrida: CorridaCierreCartera, motivo: string): void {
    this.error.set(null);
    this.reversando.set(true);
    this.cierreService
      .reversar(corrida.codigo, { usuario: this.usuarioAuditoria, ip: null, motivo })
      .subscribe({
        next: (res) => {
          this.reversando.set(false);
          this.notificar(`Corrida ${corrida.codigo} reversada.`, true);
          this.cargarCorridas();
          // Si se estaba mostrando esa corrida, refrescar con lo reversado.
          if (this.resultado()?.idCorrida === corrida.codigo) {
            this.resultado.set(res);
            this.origen.set('consulta');
          }
        },
        error: (mensaje: string) => {
          this.reversando.set(false);
          this.error.set(mensaje);
          this.notificar(mensaje, false);
        },
      });
  }

  // ===================== Historial =====================

  toggleHistorial(): void {
    const abrir = !this.mostrarHistorial();
    this.mostrarHistorial.set(abrir);
    if (abrir) {
      this.cargarCorridas();
    }
  }

  private cargarCorridas(): void {
    if (this.idEmpresa == null) {
      return;
    }
    this.cargandoCorridas.set(true);
    this.cierreService.corridas(this.idEmpresa).subscribe({
      next: (data) => {
        this.cargandoCorridas.set(false);
        this.corridas.set(data ?? []);
      },
      error: (mensaje: string) => {
        this.cargandoCorridas.set(false);
        this.corridas.set([]);
        this.notificar(mensaje, false);
      },
    });
  }

  // ===================== Derivados de vista =====================

  ocupado(): boolean {
    return (
      this.previsualizando() ||
      this.ejecutando() ||
      this.consultando() ||
      this.reversando()
    );
  }

  get puedeEjecutar(): boolean {
    return this.origen() === 'previsualizacion' && this.resultado() != null && !this.ocupado();
  }

  cuadra(sp: SubProcesoCierre): boolean {
    return Math.abs((sp.totalDebe ?? 0) - (sp.totalHaber ?? 0)) < TOLERANCIA_CUADRE;
  }

  nombreMes(mes: number): string {
    return MESES.find((m) => m.valor === mes)?.nombre ?? String(mes);
  }

  nombreTipoCartera(tipo: number | null | undefined): string {
    return tipo != null ? (TIPO_CARTERA_CIERRE[tipo] ?? String(tipo)) : '';
  }

  nombreEstadoCorrida(idEstado: number | null | undefined): string {
    return idEstado != null ? (NOMBRE_ESTADO_CORRIDA[idEstado] ?? String(idEstado)) : '—';
  }

  claseEstado(idEstado: number | null | undefined): string {
    switch (idEstado) {
      case ESTADO_CORRIDA.EJECUTADA:
        return 'est-ejecutada';
      case ESTADO_CORRIDA.REVERSADA:
        return 'est-reversada';
      case ESTADO_CORRIDA.PREPARADA:
        return 'est-preparada';
      default:
        return '';
    }
  }

  /** Formatea un LocalDate del backend ([y,m,d]) como "dd/MM/yyyy". */
  formatoFechaArray(arr: number[] | null | undefined): string {
    if (!arr || arr.length < 3) {
      return '—';
    }
    const [y, m, d] = arr;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  /** Formatea un LocalDateTime del backend ([y,m,d,h,mi,s,ns]) como "dd/MM/yyyy HH:mm". */
  formatoFechaHoraArray(arr: number[] | null | undefined): string {
    if (!arr || arr.length < 3) {
      return '—';
    }
    const [y, m, d, h = 0, mi = 0] = arr;
    return (
      `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}` +
      ` ${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
    );
  }

  /** Número con 2 decimales y separador de miles. */
  money(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** Entradas visibles de una desviación, para mostrarla sin asumir su forma exacta. */
  entradasDesviacion(d: Record<string, unknown>): { clave: string; valor: string }[] {
    return Object.entries(d)
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([clave, v]) => ({ clave, valor: typeof v === 'number' ? this.money(v) : String(v) }));
  }

  private notificar(mensaje: string, exito: boolean): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: exito ? 5000 : 9000,
      panelClass: [exito ? 'success-snackbar' : 'error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  trackSubProceso(_: number, sp: SubProcesoCierre): number {
    return sp.subProceso;
  }

  trackCorrida(_: number, c: CorridaCierreCartera): number {
    return c.codigo;
  }
}
