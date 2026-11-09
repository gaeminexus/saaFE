import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/** Cantidad y monto de un grupo de solicitudes. */
export interface CifraSolicitudes {
  cantidad: number;
  monto: number;
}

/**
 * Cifras de la sección «Solicitudes» del dashboard (DISENO-NOVACION-EN-CURSO-Y-DASHBOARD-SOLICITUDES §2).
 * Contrato: GET prst/resumenSolicitudes. Recibidas, en trámite, aprobadas, rechazadas y anuladas se cuentan por fecha
 * de registro; las desembolsadas por fecha de desembolso (no tienen por qué ser ≤ recibidas).
 */
export interface ResumenSolicitudes {
  /** Arreglos de Jackson [2026,11,1]. */
  desde?: unknown;
  hasta?: unknown;
  recibidas: CifraSolicitudes;
  enTramite: CifraSolicitudes;
  aprobadas: CifraSolicitudes;
  desembolsadas: CifraSolicitudes;
  rechazadas: CifraSolicitudes;
  anuladas: CifraSolicitudes;
}

export interface RangoSolicitudes {
  desde: Date;
  hasta: Date;
}

/** Primer y último día del mes en curso: el rango por defecto de la sección. */
export function rangoMesEnCurso(hoy = new Date()): RangoSolicitudes {
  return {
    desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
    hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0),
  };
}

/**
 * Sección «Solicitudes» de `prestamo-dash`: seis tarjetas (recibidas, en trámite, aprobadas pendientes de
 * desembolso, desembolsadas, rechazadas, anuladas) con cantidad y monto, y su propio rango de fechas (por fecha
 * de registro; mes en curso por defecto). Es solo presentación: el padre trae los datos y escucha `consultar`.
 * Los filtros de producto/filial del dashboard los aplica el padre al llamar al endpoint.
 */
@Component({
  selector: 'app-solicitudes-resumen',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="sol-panel">
      <header class="sol-cabecera">
        <h2><mat-icon>assignment</mat-icon> Solicitudes</h2>
        <div class="sol-rango">
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Registradas desde</mat-label>
            <input matInput [matDatepicker]="pDesde" [ngModel]="desde()" (ngModelChange)="desde.set($event)" name="solDesde" />
            <mat-datepicker-toggle matIconSuffix [for]="pDesde"></mat-datepicker-toggle>
            <mat-datepicker #pDesde></mat-datepicker>
          </mat-form-field>
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Hasta</mat-label>
            <input matInput [matDatepicker]="pHasta" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" name="solHasta" />
            <mat-datepicker-toggle matIconSuffix [for]="pHasta"></mat-datepicker-toggle>
            <mat-datepicker #pHasta></mat-datepicker>
          </mat-form-field>
          <button mat-stroked-button type="button" (click)="pedirConsulta()" [disabled]="cargando() || !desde() || !hasta()">
            <mat-icon>refresh</mat-icon> Consultar
          </button>
        </div>
      </header>

      @if (cargando()) {
        <mat-spinner diameter="28"></mat-spinner>
      } @else if (error()) {
        <p class="sol-error">{{ error() }}</p>
      } @else if (tarjetas(); as lista) {
        <div class="sol-tarjetas">
          @for (t of lista; track t.clave) {
            <article class="sol-tarjeta" [ngClass]="t.clase">
              <mat-icon>{{ t.icono }}</mat-icon>
              <div>
                <span class="sol-etiqueta">{{ t.etiqueta }}</span>
                <strong class="sol-cantidad">{{ t.cifra.cantidad | number: '1.0-0' }}</strong>
                <span class="sol-monto">$ {{ t.cifra.monto | number: '1.2-2' }}</span>
                @if (t.nota) {
                  <small>{{ t.nota }}</small>
                }
              </div>
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: [
    `
      .sol-panel { border: 1px solid var(--mat-sys-outline-variant, #cfd8dc); border-radius: 12px; padding: 16px; margin: 16px 0; }
      .sol-cabecera { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
      .sol-cabecera h2 { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 1.1rem; }
      .sol-rango { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .sol-tarjetas { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
      .sol-tarjeta { display: flex; gap: 12px; align-items: flex-start; padding: 12px; border-radius: 10px; border: 1px solid #e0e4e8; }
      .sol-tarjeta > div { display: flex; flex-direction: column; }
      .sol-etiqueta { font-size: 0.85rem; color: #5f6b73; }
      .sol-cantidad { font-size: 1.6rem; line-height: 1.2; }
      .sol-monto { font-size: 0.9rem; }
      .sol-tarjeta small { color: #6d6d6d; }
      .sol-tarjeta.recibidas { border-left: 4px solid #1d4ed8; }
      .sol-tarjeta.tramite { border-left: 4px solid #ca8a04; }
      .sol-tarjeta.aprobadas { border-left: 4px solid #b45309; }
      .sol-tarjeta.desembolsadas { border-left: 4px solid #15803d; }
      .sol-tarjeta.rechazadas { border-left: 4px solid #b91c1c; }
      .sol-tarjeta.anuladas { border-left: 4px solid #6b7280; }
      .sol-error { color: #c62828; }
    `,
  ],
})
export class SolicitudesResumenComponent {
  datos = input<ResumenSolicitudes | null>(null);
  cargando = input<boolean>(false);
  error = input<string | null>(null);

  /** Rango propio de la sección: mes en curso por defecto. */
  desde = signal<Date | null>(rangoMesEnCurso().desde);
  hasta = signal<Date | null>(rangoMesEnCurso().hasta);

  /** El usuario pidió consultar con este rango (el padre llama al endpoint con sus propios filtros). */
  consultar = output<RangoSolicitudes>();

  readonly tarjetas = computed(() => {
    const d = this.datos();
    if (!d) return null;
    return [
      { clave: 'recibidas', etiqueta: 'Recibidas', icono: 'inbox', clase: 'recibidas', cifra: d.recibidas, nota: 'Registradas en el rango (cualquier estado)' },
      { clave: 'tramite', etiqueta: 'En trámite', icono: 'hourglass_top', clase: 'tramite', cifra: d.enTramite, nota: 'Pendientes y generadas' },
      { clave: 'aprobadas', etiqueta: 'Aprobadas', icono: 'how_to_reg', clase: 'aprobadas', cifra: d.aprobadas, nota: 'Pendientes de desembolso' },
      { clave: 'desembolsadas', etiqueta: 'Desembolsadas', icono: 'payments', clase: 'desembolsadas', cifra: d.desembolsadas, nota: 'Por fecha de desembolso: puede incluir registradas antes' },
      { clave: 'rechazadas', etiqueta: 'Rechazadas', icono: 'thumb_down', clase: 'rechazadas', cifra: d.rechazadas, nota: null },
      { clave: 'anuladas', etiqueta: 'Anuladas', icono: 'block', clase: 'anuladas', cifra: d.anuladas, nota: null },
    ];
  });

  pedirConsulta(): void {
    const desde = this.desde();
    const hasta = this.hasta();
    if (desde && hasta) this.consultar.emit({ desde, hasta });
  }
}
