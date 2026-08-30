import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';

import { CajaChica } from '../../../model/caja-chica';
import { ReposicionCajaChicaRequest, ReposicionCajaChicaResponse } from '../../../model/movimiento-caja-chica';
import { SaldoCajaChica } from '../../../model/saldo-caja-chica';
import { CajaChicaService } from '../../../service/caja-chica.service';
import { MovimientoCajaChicaService } from '../../../service/movimiento-caja-chica.service';

/**
 * Reposición (o apertura, cuando la caja todavía no tiene saldo) de una caja
 * chica. Desde 2026-08-30 esta pantalla solo registra el pedido: la cuenta
 * bancaria de origen y la forma de pago las asigna tesorería al aprobar en
 * su bandeja (/menutesoreria/procesos/aprobacion-pagos).
 */
@Component({
  selector: 'app-reposicion-caja-chica',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './reposicion-caja-chica.component.html',
  styleUrls: ['./reposicion-caja-chica.component.scss'],
})
export class ReposicionCajaChicaComponent implements OnInit {
  private cajaS = inject(CajaChicaService);
  private movimientoS = inject(MovimientoCajaChicaService);
  private appState = inject(AppStateService);
  private snackBar = inject(MatSnackBar);

  cajas = signal<CajaChica[]>([]);
  cargandoCajas = signal(false);
  cajaSeleccionada: CajaChica | null = null;

  saldo = signal<SaldoCajaChica | null>(null);
  cargandoSaldo = signal(false);

  valor = '';
  fecha: Date | null = new Date();
  descripcion = '';

  procesando = signal(false);
  error = signal('');
  resultado = signal<ReposicionCajaChicaResponse | null>(null);

  /**
   * `SaldoCajaChica` no dice si la caja "nunca tuvo movimientos" — solo su
   * saldo actual. Con saldo 0 se trata como primer fondeo (Aperturar); es la
   * única señal disponible desde el frontend sin un endpoint nuevo.
   */
  get esApertura(): boolean {
    return Number(this.saldo()?.saldo ?? 0) === 0;
  }

  get valorNumerico(): number {
    const v = parseFloat(String(this.valor).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  get excedeSugerido(): boolean {
    const sugerido = this.saldo()?.montoSugeridoReposicion;
    return sugerido != null && this.valorNumerico > sugerido + 0.01;
  }

  ngOnInit(): void {
    this.cargarCajas();
  }

  private cargarCajas(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.cajas.set([]);
      this.error.set('No se pudo determinar la empresa de la sesión');
      return;
    }
    this.cargandoCajas.set(true);
    this.cajaS.activas(idEmpresa).subscribe({
      next: (data) => {
        this.cajas.set(Array.isArray(data) ? data : []);
        this.cargandoCajas.set(false);
      },
      error: () => {
        this.cajas.set([]);
        this.cargandoCajas.set(false);
      },
    });
  }

  onCambioCaja(): void {
    this.saldo.set(null);
    this.resultado.set(null);
    this.error.set('');
    this.valor = '';
    if (!this.cajaSeleccionada) return;
    this.cargarSaldo(this.cajaSeleccionada.codigo);
  }

  private cargarSaldo(idCaja: number): void {
    this.cargandoSaldo.set(true);
    this.cajaS.saldo(idCaja).subscribe({
      next: (s) => {
        this.cargandoSaldo.set(false);
        this.saldo.set(s);
        this.valor = s?.montoSugeridoReposicion ? s.montoSugeridoReposicion.toFixed(2) : '';
      },
      error: () => {
        this.cargandoSaldo.set(false);
        this.saldo.set(null);
      },
    });
  }

  /** El valor no puede superar lo sugerido; se recorta al salir del campo. */
  ajustarAlSugerido(): void {
    const sugerido = this.saldo()?.montoSugeridoReposicion;
    if (sugerido != null && this.valorNumerico > sugerido + 0.01) {
      this.valor = sugerido.toFixed(2);
    }
  }

  get puedeGuardar(): boolean {
    return !!this.cajaSeleccionada
      && this.valorNumerico > 0
      && !this.excedeSugerido
      && !!this.fecha
      && !this.procesando();
  }

  private fechaISO(fecha: Date | null): string {
    const d = fecha instanceof Date ? fecha : new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  guardar(): void {
    if (!this.puedeGuardar || !this.cajaSeleccionada) return;

    this.procesando.set(true);
    this.error.set('');
    this.resultado.set(null);

    const payload: ReposicionCajaChicaRequest = {
      idCaja: this.cajaSeleccionada.codigo,
      valor: this.valorNumerico,
      fecha: this.fechaISO(this.fecha),
      descripcion: this.descripcion.trim() || undefined,
      idUsuario: this.appState.getIdUsuario(),
    };

    const operacion = this.esApertura ? this.movimientoS.apertura(payload) : this.movimientoS.reposicion(payload);

    operacion.subscribe({
      next: (resp) => {
        this.procesando.set(false);
        this.resultado.set(resp);
        this.snackBar.open('Operación registrada. Queda pendiente de aprobación en tesorería.', 'Cerrar', { duration: 6000 });
        if (this.cajaSeleccionada) this.cargarSaldo(this.cajaSeleccionada.codigo);
      },
      error: (err) => {
        this.procesando.set(false);
        this.error.set(MovimientoCajaChicaService.mensajeError(err));
      },
    });
  }
}
