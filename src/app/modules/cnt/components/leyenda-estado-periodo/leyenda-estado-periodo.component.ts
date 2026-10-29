import { CommonModule } from '@angular/common';
import { Component, Input, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EstadoCierrePeriodo } from '../../model/periodo';
import { CierrePeriodoService, fechaDeBackend, formatoFecha } from '../../service/cierre-periodo.service';

/**
 * C17 — Leyenda PRELIMINAR / DEFINITIVO del mes de una fecha de corte, según `GET /prdo/estado`
 * (período contable CERRADO = DEFINITIVO). Para el encabezado de las pantallas de balances.
 *
 * Uso: `<cnt-leyenda-estado-periodo [fecha]="form.get('fechaFin')?.value" />`
 */
@Component({
  selector: 'cnt-leyenda-estado-periodo',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  template: `
    @if (estado(); as e) {
      <span
        class="leyenda"
        [class.definitiva]="e.definitivo"
        [matTooltip]="tooltip(e)"
      >
        <mat-icon>{{ e.definitivo ? 'verified' : 'pending' }}</mat-icon>
        {{ e.definitivo ? 'DEFINITIVO' : 'PRELIMINAR' }}
        <small>{{ etiquetaMes() }}</small>
      </span>
    } @else if (error()) {
      <span class="leyenda sin-estado" [matTooltip]="error()!">
        <mat-icon>help_outline</mat-icon> Estado del período no disponible
      </span>
    }
  `,
  styles: [
    `
      .leyenda {
        display: inline-flex; align-items: center; gap: 0.35rem;
        padding: 0.25rem 0.75rem; border-radius: 999px;
        font-weight: 700; font-size: 0.85rem; letter-spacing: 0.04em;
        background: #fff3e0; color: #e65100; border: 1px solid #ffb74d;
        mat-icon { font-size: 18px; width: 18px; height: 18px; }
        small { font-weight: 500; letter-spacing: normal; opacity: 0.85; }
      }
      .leyenda.definitiva { background: #e8f5e9; color: #1b5e20; border-color: #81c784; }
      .leyenda.sin-estado { background: #f1f5f9; color: #64748b; border-color: #cbd5e1; font-weight: 500; }
    `,
  ],
})
export class LeyendaEstadoPeriodoComponent {
  private cierreService = inject(CierrePeriodoService);

  estado = signal<EstadoCierrePeriodo | null>(null);
  error = signal<string | null>(null);
  etiquetaMes = signal('');

  private claveActual: string | null = null;

  /** Empresa; si no viene, la de la sesión (`idSucursal`). */
  @Input() idEmpresa: number | null = null;

  /** Fecha de corte del reporte (Date, texto ISO o arreglo del backend). */
  @Input() set fecha(valor: any) {
    const f = fechaDeBackend(valor);
    if (!f) {
      this.claveActual = null;
      this.estado.set(null);
      this.error.set(null);
      return;
    }
    const empresa = this.idEmpresa ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);
    const anio = f.getFullYear();
    const mes = f.getMonth() + 1;
    const clave = `${empresa}-${anio}-${mes}`;
    if (clave === this.claveActual || !empresa) return;
    this.claveActual = clave;
    this.etiquetaMes.set(`${String(mes).padStart(2, '0')}/${anio}`);
    this.cierreService.estado(empresa, anio, mes).subscribe({
      next: (e) => {
        if (this.claveActual !== clave) return;
        this.estado.set(e);
        this.error.set(null);
      },
      error: (mensaje: string) => {
        if (this.claveActual !== clave) return;
        this.estado.set(null);
        this.error.set(mensaje);
      },
    });
  }

  tooltip(e: EstadoCierrePeriodo): string {
    return e.definitivo
      ? `Período contable CERRADO el ${formatoFecha(e.fechaCierre, true)}${e.usuarioCierre ? ' por ' + e.usuarioCierre : ''}: cifras definitivas.`
      : `${e.leyenda}. Las cifras pueden cambiar hasta el cierre contable del mes.`;
  }
}
