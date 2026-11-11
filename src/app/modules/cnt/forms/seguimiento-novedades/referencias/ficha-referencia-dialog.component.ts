import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FichaReferencia } from '../../../model/seguimiento-novedades';
import { SeguimientoNovedadesService } from '../../../service/seguimiento-novedades.service';
import { TipoReferencia } from './detector-referencias';
import { ContextoNavegacion, NavegacionReferenciasService } from './navegacion-referencias.service';
import { TextoEnlazadoComponent } from './texto-enlazado.component';

export interface FichaReferenciaDialogData {
  tipo: string;
  valor: string;
  ctx: ContextoNavegacion;
}

const NOMBRE_TIPO: Record<string, string> = {
  ASIENTO: 'Asiento', PRESTAMO: 'Préstamo', OPERACION: 'Operación', PAGO: 'Pago de préstamo', ENTIDAD: 'Entidad / partícipe', COBRO: 'Cobro',
  FILA: 'Fila del extracto', CARGA: 'Carga Petro', CORRIDA: 'Corrida de cierre de cartera', CUENTA: 'Cuenta contable', CXP: 'Factura de compra',
  CXC: 'Factura de venta', EMPLEADO: 'Empleado', EJECUCION: 'Ejecución de estructuras G', DECISION: 'Decisión', NOVEDAD: 'Novedad',
};

/**
 * C25b — Ficha de solo lectura de una referencia (GET /nvdd/referencia). Toda celda o campo que sea a su vez una
 * referencia es un enlace: se abre aquí mismo y «Volver» regresa a la ficha anterior. Si la ficha es de una novedad o
 * de una decisión, se cierra y la pantalla abre la novedad o la pestaña Decisiones. «Abrir en el módulo» lleva a la
 * pantalla existente del módulo cuando acepta el id (asiento, entidad, carga Petro, extracto, empleado).
 */
@Component({
  selector: 'app-ficha-referencia-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule, TextoEnlazadoComponent],
  template: `
    <h2 mat-dialog-title class="titulo">
      @if (pila().length > 1) {
        <button mat-icon-button (click)="volver()" matTooltip="Volver a la ficha anterior"><mat-icon>arrow_back</mat-icon></button>
      }
      <span>{{ ficha()?.titulo || nombreTipo(actual().tipo) + ' ' + actual().valor }}</span>
    </h2>
    <mat-dialog-content class="contenido">
      @if (cargando()) {
        <div class="loading-inline"><mat-spinner diameter="26"></mat-spinner><span>Consultando…</span></div>
      }
      @if (error()) {
        <div class="error-banner"><mat-icon>error_outline</mat-icon><span>{{ error() }}</span></div>
      }
      @if (ficha(); as f) {
        <div class="sub">{{ nombreTipo(f.tipo) }} · {{ f.subtitulo }}</div>
        @if (f.mensaje) {
          <div class="aviso-banner"><mat-icon>info</mat-icon><span>{{ f.mensaje }}</span></div>
        }
        @if (f.campos.length) {
          <table class="campos">
            <tbody>
              @for (c of f.campos; track $index) {
                <tr>
                  <th>{{ c.etiqueta }}</th>
                  <td>
                    @if (c.ref) {
                      <a class="enlace" (click)="ir(c.ref.tipo, c.ref.valor)">{{ c.valor }}</a>
                    } @else if (esTexto(c.valor)) {
                      <app-texto-enlazado [texto]="$any(c.valor)" [pre]="true" [idEmpresa]="data.ctx.idEmpresa" [anio]="data.ctx.anio ?? null"
                        [mes]="data.ctx.mes ?? null" [modulo]="data.ctx.modulo ?? null"></app-texto-enlazado>
                    } @else {
                      {{ formato(c.valor) }}
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
        @for (t of f.tablas; track $index) {
          <h4>{{ t.titulo }} <span class="tenue">({{ t.total }}{{ t.total > t.filas.length ? ', se muestran ' + t.filas.length : '' }})</span></h4>
          @if (t.filas.length === 0) {
            <p class="vacio">Sin filas.</p>
          } @else {
            <div class="tabla-scroll">
              <table class="tabla">
                <thead><tr>@for (col of t.columnas; track $index) {<th>{{ col }}</th>}</tr></thead>
                <tbody>
                  @for (fila of t.filas; track $index) {
                    <tr>
                      @for (v of fila; track $index; let i = $index) {
                        <td [class.num]="esNumero(v) && !t.refs[t.columnas[i]]">
                          @if (t.refs[t.columnas[i]] && v != null && v !== '') {
                            <a class="enlace" (click)="ir(t.refs[t.columnas[i]], v)">{{ v }}</a>
                          } @else {
                            {{ formato(v) }}
                          }
                        </td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (ficha()?.ruta; as r) {
        <button mat-stroked-button (click)="abrirModulo(r)"><mat-icon>open_in_new</mat-icon> {{ r.etiqueta }}</button>
      }
      <button mat-flat-button color="primary" mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
  styleUrl: './ficha-referencia-dialog.component.scss',
})
export class FichaReferenciaDialogComponent implements OnInit {
  readonly data = inject<FichaReferenciaDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<FichaReferenciaDialogComponent>);
  private servicio = inject(SeguimientoNovedadesService);
  private nav = inject(NavegacionReferenciasService);
  private router = inject(Router);

  pila = signal<{ tipo: string; valor: string }[]>([]);
  actual = signal<{ tipo: string; valor: string }>({ tipo: '', valor: '' });
  ficha = signal<FichaReferencia | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    this.ir(this.data.tipo, this.data.valor);
  }

  nombreTipo(t: string): string {
    return NOMBRE_TIPO[t] ?? t;
  }

  /** Abre otra referencia dentro del mismo diálogo (o, si es novedad o decisión, en la pantalla). */
  ir(tipo: string, valor: unknown): void {
    const v = String(valor);
    if (tipo === 'DECISION') {
      this.nav.abrirDecision(v);
      return;
    }
    if (tipo === 'NOVEDAD' && /^\d+$/.test(v)) {
      this.nav.abrirNovedad(Number(v));
      return;
    }
    if (tipo === 'FACTURA') tipo = (this.data.ctx.modulo || '').toUpperCase() === 'CXC' ? 'CXC' : 'CXP';
    this.pila.update((p) => [...p, { tipo, valor: v }]);
    this.cargar(tipo, v);
  }

  volver(): void {
    const p = this.pila().slice(0, -1);
    this.pila.set(p);
    const ult = p[p.length - 1];
    if (ult) this.cargar(ult.tipo, ult.valor);
  }

  private cargar(tipo: string, valor: string): void {
    this.actual.set({ tipo, valor });
    const idEmpresa = this.data.ctx.idEmpresa || parseInt(localStorage.getItem('idSucursal') || '0', 10);
    if (!idEmpresa) {
      this.error.set('No hay empresa seleccionada.');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.ficha.set(null);
    this.servicio.referencia(idEmpresa, tipo, valor, this.data.ctx.anio, this.data.ctx.mes).subscribe({
      next: (f) => {
        this.cargando.set(false);
        if (f.tipo === 'NOVEDAD' && f.idNovedad) {
          this.nav.abrirNovedad(f.idNovedad);
          return;
        }
        this.ficha.set(f);
      },
      error: (m: string) => {
        this.cargando.set(false);
        this.error.set(m);
      },
    });
  }

  abrirModulo(r: NonNullable<FichaReferencia['ruta']>): void {
    this.ref.close();
    this.router.navigate(r.path as unknown[], r.queryParams ? { queryParams: r.queryParams } : undefined);
  }

  esTexto(v: unknown): boolean {
    return typeof v === 'string' && v.length > 0 && !/^\d{4}-\d{2}-\d{2}/.test(v);
  }

  esNumero(v: unknown): boolean {
    return typeof v === 'number';
  }

  formato(v: unknown): string {
    if (v === null || v === undefined || v === '') return '—';
    if (typeof v === 'number') {
      return Number.isInteger(v) && Math.abs(v) < 1e7 ? String(v) : v.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    if (Array.isArray(v)) return v.join('-');
    if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)) return v.slice(0, 10) + ' ' + v.slice(11, 16);
    return String(v);
  }
}

/** Para los tipos que no son de la ficha (decisión, novedad) — reexport útil en plantillas. */
export type { TipoReferencia };
