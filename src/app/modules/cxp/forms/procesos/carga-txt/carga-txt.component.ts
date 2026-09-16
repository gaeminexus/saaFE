import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { Periodo } from '../../../../cnt/model/periodo';
import { PeriodoService } from '../../../../cnt/service/periodo.service';
import { CargaDocumentosService } from '../../../service/carga-documentos.service';

/** Lo que devuelve POST /carga-documentos/cargarTxt (verificado contra ProcesoCargaDocumentosServiceImpl:386-395 en saaBE). */
interface ResultadoCargaTxt {
  idCargaTxt: number;
  nombreArchivo: string;
  totalRegistros: number;
  nuevos: number;
  duplicados: number;
  novedades: number;
}

/**
 * Carga de TXT (ítem 13, docs/cxp/API-CARGAS-TXT-BANDEJA-ELECTRONICA.md §3.1): pantalla propia,
 * separada de la bandeja electrónica (que queda para trabajar los documentos ya cargados).
 * Mismo endpoint y mismo payload que usaba `bandeja-electronica.component.ts` — no se inventa
 * otro.
 */
@Component({
  selector: 'app-carga-txt',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './carga-txt.component.html',
  styleUrl: './carga-txt.component.scss',
})
export class CargaTxtComponent implements OnInit {
  @ViewChild('inputArchivo') inputArchivo!: ElementRef<HTMLInputElement>;

  private processService = inject(CargaDocumentosService);
  private periodoService = inject(PeriodoService);
  private router = inject(Router);

  periodos = signal<Periodo[]>([]);
  periodoSeleccionado: number | null = null;

  archivoSeleccionado = signal<File | null>(null);
  arrastrando = signal(false);
  cargando = signal(false);
  error = signal('');
  resultado = signal<ResultadoCargaTxt | null>(null);

  private get idEmpresa(): number { return Number(localStorage.getItem('empresaCodigo') || localStorage.getItem('empresaId') || 1); }
  private get idUsuario(): number { try { const u = JSON.parse(localStorage.getItem('usuario') || sessionStorage.getItem('usuario') || '{}'); return u.codigo || u.id || 1; } catch { return 1; } }

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  private cargarPeriodos(): void {
    this.periodoService.getAll().subscribe({
      next: (data) => {
        const sorted = (data || []).sort((a, b) => b.anio !== a.anio ? b.anio - a.anio : b.mes - a.mes);
        this.periodos.set(sorted);
      },
      error: () => this.periodos.set([]),
    });
  }

  // ─── ARRASTRAR Y SOLTAR ─────────────────────────────────

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastrando.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.elegirArchivo(file);
  }

  abrirSelectorArchivo(): void {
    this.inputArchivo.nativeElement.value = '';
    this.inputArchivo.nativeElement.click();
  }

  onArchivoInputChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.elegirArchivo(file);
  }

  private elegirArchivo(file: File): void {
    this.error.set('');
    this.resultado.set(null);
    if (!file.name.toLowerCase().endsWith('.txt')) {
      this.error.set('Solo se aceptan archivos .TXT del SRI.');
      this.archivoSeleccionado.set(null);
      return;
    }
    this.archivoSeleccionado.set(file);
  }

  quitarArchivo(): void {
    this.archivoSeleccionado.set(null);
    this.error.set('');
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  get puedeCargar(): boolean {
    return !!this.archivoSeleccionado() && !!this.periodoSeleccionado && !this.cargando();
  }

  // ─── CARGAR — mismo endpoint/payload que bandeja-electronica.component.ts:134 ───

  cargar(): void {
    const file = this.archivoSeleccionado();
    if (!file || !this.periodoSeleccionado) {
      this.error.set('Seleccione un período contable y un archivo antes de cargar.');
      return;
    }

    this.cargando.set(true);
    this.error.set('');
    this.resultado.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const contenidoTxt = (e.target?.result as string) || '';
      this.processService.cargarTxt({
        contenidoTxt,
        nombreArchivo: file.name,
        idEmpresa: this.idEmpresa,
        idUsuario: this.idUsuario,
        idPeriodo: this.periodoSeleccionado!,
      }).subscribe({
        next: (resp) => {
          this.cargando.set(false);
          this.resultado.set(resp as ResultadoCargaTxt);
        },
        error: (err) => {
          this.cargando.set(false);
          this.error.set('Error al procesar el TXT: ' + this.extraerMensajeError(err));
        },
      });
    };
    reader.readAsText(file, 'ISO-8859-1');
  }

  irABandeja(): void {
    const r = this.resultado();
    this.router.navigate(['/menucuentaxpagar/procesos/bandeja-electronica'], {
      queryParams: {
        idCargaTxt: r?.idCargaTxt,
        idPeriodo: this.periodoSeleccionado,
      },
    });
  }

  cargarOtro(): void {
    this.archivoSeleccionado.set(null);
    this.resultado.set(null);
    this.error.set('');
  }

  private extraerMensajeError(err: any): string {
    if (!err) return 'Error desconocido';
    if (typeof err === 'string') return err;
    return err?.error || err?.mensaje || err?.message || JSON.stringify(err);
  }
}
