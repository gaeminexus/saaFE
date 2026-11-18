import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { ExportService } from '../../../../shared/services/export.service';
import { MotivoV2DialogComponent } from '../../dialog/justificar-novedad-v2-dialog/motivo-v2-dialog.component';
import {
  AREAS_V2,
  ESTADOS_V2,
  FilaNovedadV2,
  GRUPOS_V2,
  GrupoNovedad,
  ResumenV2,
  dinero,
  fechaCorta,
} from '../../model/novedades-v2';
import { NovedadesV2Service } from '../../service/novedades-v2.service';
import { DetalleNovedadV2Component } from './detalle-novedad-v2/detalle-novedad-v2.component';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/**
 * C34 — Seguimiento de Novedades v2 (Contabilidad > Procesos > Seguimiento Novedades v2). Pantalla aparte de la v1 (C25)
 * para comparar. Tres pestañas: por regularizar (se justifican los movimientos hasta saldo 0), decisiones y documentos
 * (se responden los pedidos) e informativas (se dan por conocidas). Sin paso de «envío»: todo empieza en ASOPREP.
 * Cada acción devuelve la fila actualizada y el grid se refresca con ella (queja 9).
 */
@Component({
  selector: 'app-seguimiento-novedades-v2',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, DetalleNovedadV2Component],
  templateUrl: './seguimiento-novedades-v2.component.html',
  styleUrl: './seguimiento-novedades-v2.component.scss',
})
export class SeguimientoNovedadesV2Component implements OnInit {
  private servicio = inject(NovedadesV2Service);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private exportService = inject(ExportService);

  readonly grupos = GRUPOS_V2;
  readonly areas = AREAS_V2;
  readonly estados = ESTADOS_V2;
  readonly meses = MESES.map((n, i) => ({ valor: i + 1, etiqueta: n }));
  readonly anios = [2025, 2026];
  readonly dinero = dinero;
  readonly fecha = fechaCorta;

  idEmpresa = parseInt(localStorage.getItem('idSucursal') || '0', 10) || 0;
  anio: number | null = null;
  mes: number | null = null;
  area: string | null = null;
  estado: string | null = 'ABIERTAS';
  texto = '';

  grupo = signal<GrupoNovedad>('POR_REGULARIZAR');
  filas = signal<FilaNovedadV2[]>([]);
  resumen = signal<ResumenV2 | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);
  seleccionada = signal<number | null>(null);
  marcadas = signal<Set<number>>(new Set<number>());

  filasGrupo = computed(() => this.filas().filter((f) => f.grupo === this.grupo()));
  totalesGrupo = computed(() => {
    const fs = this.filasGrupo();
    return {
      n: fs.length,
      valor: fs.reduce((s, f) => s + (f.valor || 0), 0),
      saldo: fs.reduce((s, f) => s + (f.saldo || 0), 0),
    };
  });
  indiceGrupo = computed(() => this.grupos.findIndex((g) => g.valor === this.grupo()));

  ngOnInit(): void {
    if (!this.idEmpresa) {
      this.error.set('No hay una empresa elegida en la sesión: vuelva a ingresar al sistema.');
      return;
    }
    this.buscar();
  }

  buscar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.marcadas.set(new Set());
    this.servicio
      .bandeja(this.idEmpresa, { anio: this.anio, mes: this.mes, area: this.area, estado: this.estado, texto: this.texto.trim() || null })
      .subscribe({
        next: (f) => {
          this.filas.set(f);
          this.cargando.set(false);
        },
        error: (e) => {
          this.error.set(String(e));
          this.cargando.set(false);
        },
      });
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.servicio.resumen(this.idEmpresa, this.anio, this.mes).subscribe({ next: (r) => this.resumen.set(r) });
  }

  limpiar(): void {
    this.anio = null;
    this.mes = null;
    this.area = null;
    this.estado = 'ABIERTAS';
    this.texto = '';
    this.buscar();
  }

  cambiarPestana(i: number): void {
    this.grupo.set(this.grupos[i].valor);
    this.marcadas.set(new Set());
  }

  etiquetaPestana(g: { valor: GrupoNovedad; etiqueta: string }): string {
    const r = this.resumen()?.[g.valor];
    if (!r) return g.etiqueta;
    if (g.valor === 'POR_REGULARIZAR') return `${g.etiqueta} · ${r.abiertas} abiertas · faltan ${dinero(r.saldo ?? 0)}`;
    if (g.valor === 'INFORMATIVA') return `${g.etiqueta} · ${r.abiertas} por leer`;
    return `${g.etiqueta} · ${r.abiertas} abiertas`;
  }

  abrir(f: FilaNovedadV2): void {
    this.seleccionada.set(this.seleccionada() === f.codigo ? null : f.codigo);
  }

  /** Reemplaza la fila en el grid con la que devolvió la acción y recarga los contadores (queja 9). */
  actualizarFila(nueva: FilaNovedadV2): void {
    this.filas.set(this.filas().map((f) => (f.codigo === nueva.codigo ? nueva : f)));
    this.cargarResumen();
  }

  // ---------------------------------------------------------------- informativas en bloque

  alternarMarca(f: FilaNovedadV2, ev?: Event): void {
    ev?.stopPropagation();
    const s = new Set(this.marcadas());
    s.has(f.codigo) ? s.delete(f.codigo) : s.add(f.codigo);
    this.marcadas.set(s);
  }

  marcarTodas(): void {
    const abiertas = this.filasGrupo().filter((f) => f.estado !== 'CERRADA');
    this.marcadas.set(this.marcadas().size === abiertas.length ? new Set() : new Set(abiertas.map((f) => f.codigo)));
  }

  darPorConocidas(): void {
    const ids = [...this.marcadas()];
    if (!ids.length) return;
    this.dialog
      .open(MotivoV2DialogComponent, {
        data: {
          titulo: `Dar por conocidas ${ids.length} novedad(es)`,
          explicacion: 'Quedan como leídas y conocidas por ASOPREP, con su usuario y la fecha de hoy.',
          etiqueta: 'Comentario',
          obligatorio: false,
          boton: 'Dar por conocidas',
        },
      })
      .afterClosed()
      .subscribe((r?: { texto: string }) => {
        if (!r) return;
        this.servicio.darPorConocidas(ids, r.texto || null).subscribe({
          next: (x) => {
            this.snack.open(x.mensaje, 'Cerrar', { duration: 5000 });
            for (const f of x.filas || []) this.actualizarFila(f);
            this.marcadas.set(new Set());
          },
          error: (e) => this.snack.open(String(e), 'Cerrar', { duration: 8000 }),
        });
      });
  }

  // ---------------------------------------------------------------- exportar

  exportar(formato: 'asoprep' | 'reproceso'): void {
    this.servicio.exportar(this.idEmpresa, this.anio, this.mes, formato).subscribe({
      next: (filas) => {
        if (!filas.length) {
          this.snack.open('Todavía no hay respuestas ni justificaciones registradas para exportar.', 'Cerrar', { duration: 5000 });
          return;
        }
        const sufijo = (this.anio ? '_' + this.anio : '') + (this.mes ? '-' + String(this.mes).padStart(2, '0') : '');
        if (formato === 'reproceso') {
          const blob = new Blob([JSON.stringify({ formato: 'C34-RESPUESTAS-1', generado: new Date().toISOString(), filas }, null, 1)], {
            type: 'application/json',
          });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `respuestas-novedades${sufijo}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
          return;
        }
        const columnas: [string, string][] = [
          ['periodo', 'Mes'], ['novedad', 'Novedad'], ['origen', 'Origen'], ['numero', 'N.º movimiento / pedido'], ['asiento', 'Asiento'],
          ['fecha', 'Fecha'], ['cuentaPorRegularizar', 'Cuenta por regularizar'], ['valorMovimiento', 'Valor del movimiento'],
          ['tipo', 'Tipo'], ['monto', 'Monto justificado'], ['opcion', 'Respuesta'], ['decision', 'Decisión'], ['tipoDocumento', 'Documento'],
          ['numeroDocumento', 'N.º documento'], ['fechaHecho', 'Fecha del hecho'], ['cuentaDestino', 'Cuenta destino'],
          ['nombreCuentaDestino', 'Nombre cuenta destino'], ['valorDestino', 'Valor en la cuenta'], ['sentidoDestino', 'D/H'],
          ['idAsoprep', 'Préstamo'], ['numeroCuota', 'Cuota'], ['cedula', 'Cédula'], ['nombre', 'Nombre'], ['texto', 'Explicación'],
          ['adjuntos', 'Adjuntos'], ['usuario', 'Registró'], ['fechaRegistro', 'Fecha de registro'],
        ];
        const datos = filas.map((f) => {
          const x: any = {};
          for (const [k] of columnas) x[k] = k.startsWith('fecha') ? fechaCorta(f[k]) : f[k] ?? '';
          return x;
        });
        this.exportService.exportToCSV(datos, `Respuestas_Novedades${sufijo}`, columnas.map((c) => c[1]), columnas.map((c) => c[0]));
      },
      error: (e) => this.snack.open(String(e), 'Cerrar', { duration: 8000 }),
    });
  }
}
