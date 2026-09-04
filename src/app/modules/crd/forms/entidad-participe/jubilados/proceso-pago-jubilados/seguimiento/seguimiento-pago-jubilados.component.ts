import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import {
  ESTADO_PGPC,
  NOMBRE_ESTADO_PGPC,
  PagoPensionComplementaria,
} from '../../../../../model/pago-pension-complementaria';
import { PagoPensionComplementariaService } from '../../../../../service/pago-pension-complementaria.service';

const MESES = [
  { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' }, { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' }, { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' }, { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' }, { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
];

/**
 * Pestaña C reducida — «Seguimiento». Contrato: docs/crd/API-PAGO-PENSION-COMPLEMENTARIA.md §3/§4/§5.
 *
 * ⛔ Reducida a propósito: NO tiene botón de anular ni columnas `totalCruzado`/`cruces`/`anulable`
 * — dependen de `CRD.PGCE`, reservada con DDL sin autorizar (§4 del contrato, §6bis del diseño).
 * Cuando se autorice, este componente se amplía.
 *
 * Es más que una pestaña secundaria: `generarPagosDelMes` no repite su informe en una segunda
 * corrida (§1 del contrato), así que `porPeriodo` es la ÚNICA forma de recuperar qué se pagó un
 * período si el operador cerró la pantalla B después de ejecutar.
 */
@Component({
  selector: 'app-seguimiento-pago-jubilados',
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
  ],
  templateUrl: './seguimiento-pago-jubilados.component.html',
  styleUrl: './seguimiento-pago-jubilados.component.scss',
})
export class SeguimientoPagoJubiladosComponent implements OnInit {
  readonly MESES = MESES;
  readonly ESTADO_PGPC = ESTADO_PGPC;

  private pgpcService = inject(PagoPensionComplementariaService);
  private snackBar = inject(MatSnackBar);

  anio: number;
  mes: number;

  cargando = signal(false);
  reconciliando = signal(false);
  error = signal<string | null>(null);
  pagos = signal<PagoPensionComplementaria[]>([]);

  constructor() {
    const hoy = new Date();
    if (hoy.getMonth() === 0) {
      this.anio = hoy.getFullYear() - 1;
      this.mes = 12;
    } else {
      this.anio = hoy.getFullYear();
      this.mes = hoy.getMonth();
    }
  }

  ngOnInit(): void {
    this.consultar();
  }

  ocupado(): boolean {
    return this.cargando() || this.reconciliando();
  }

  consultar(): void {
    if (this.ocupado()) {
      return;
    }
    this.error.set(null);
    this.cargando.set(true);
    this.pgpcService.porPeriodo(this.anio, this.mes).subscribe({
      next: (rows) => {
        this.cargando.set(false);
        this.pagos.set(rows ?? []);
      },
      error: (mensaje: string) => {
        this.cargando.set(false);
        this.pagos.set([]);
        this.error.set(typeof mensaje === 'string' ? mensaje : 'No se pudo consultar el período.');
      },
    });
  }

  reconciliar(): void {
    if (this.ocupado()) {
      return;
    }
    this.reconciliando.set(true);
    this.pgpcService.sincronizarPagos().subscribe((resp) => {
      this.reconciliando.set(false);
      if (resp.exito && resp.resultado) {
        const r = resp.resultado;
        this.notificar(
          `Reconciliado: ${r.marcadasPagadas} pagadas, ${r.marcadasRechazadas} rechazadas` +
          (r.conError > 0 ? `, ${r.conError} con error` : '') + '.',
          r.conError === 0,
        );
        this.consultar();
      } else {
        this.notificar(resp.mensaje ?? 'No se pudo reconciliar.', false);
      }
    });
  }

  get periodoTexto(): string {
    return `${this.nombreMes(this.mes)} ${this.anio}`;
  }

  nombreMes(mes: number): string {
    return MESES.find((m) => m.valor === mes)?.nombre ?? String(mes);
  }

  nombreEstado(estado: number): string {
    return NOMBRE_ESTADO_PGPC[estado] ?? String(estado);
  }

  claseEstado(estado: number): string {
    switch (estado) {
      case ESTADO_PGPC.PAGADA:
        return 'badge-pagada';
      case ESTADO_PGPC.RECHAZADA:
        return 'badge-rechazada';
      case ESTADO_PGPC.ANULADA:
        return 'badge-anulada';
      case ESTADO_PGPC.EN_PAGO:
        return 'badge-en-pago';
      default:
        return 'badge-registrada';
    }
  }

  /**
   * Un pago cruzado íntegro contra préstamo queda en REGISTRADA para siempre: nunca hay orden
   * que sincronizar. NO es un atasco (§5 del contrato).
   */
  quedaEnRegistradaPorCruce(pago: PagoPensionComplementaria): boolean {
    return pago.estado === ESTADO_PGPC.REGISTRADA && pago.idPagoProgramado == null;
  }

  /** Formatea un LocalDate del backend ([y,m,d]) como "dd/MM/yyyy". */
  formatoFecha(arr: number[] | null | undefined): string {
    if (!arr || arr.length < 3) {
      return '—';
    }
    const [y, m, d] = arr;
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  }

  money(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private notificar(mensaje: string, exito: boolean): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: exito ? 5000 : 9000,
      panelClass: [exito ? 'success-snackbar' : 'error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  trackPago(_: number, p: PagoPensionComplementaria): number {
    return p.codigo;
  }
}
