import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CierreCaja } from '../../../model/cierre-caja';
import { UsuarioPorCaja } from '../../../model/usuario-por-caja';
import { CierreCajaService } from '../../../service/cierre-caja.service';
import { UsuarioPorCajaService } from '../../../service/usuario-por-caja.service';

@Component({
  selector: 'app-cierre-caja',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './cierre-caja.component.html',
  styleUrls: ['./cierre-caja.component.scss'],
})
export class CierreCajaComponent implements OnInit {
  // Estado
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Filtros / datos de cierre
  fechaCierre = signal<Date>(new Date());
  cajaCodigo = signal<number | null>(null);
  nombreUsuario = signal<string>('');
  usuarioPorCaja = signal<UsuarioPorCaja | null>(null);
  cierreHabilitado = signal<boolean>(true);

  // Totales
  montoEfectivo = signal<number>(0);
  montoCheque = signal<number>(0);
  montoTarjeta = signal<number>(0);
  montoTransferencia = signal<number>(0);
  montoRetencion = signal<number>(0);

  montoTotal = computed(
    () =>
      (this.montoEfectivo() || 0) +
      (this.montoCheque() || 0) +
      (this.montoTarjeta() || 0) +
      (this.montoTransferencia() || 0) +
      (this.montoRetencion() || 0),
  );

  constructor(
    private cierreService: CierreCajaService,
    private usuarioPorCajaService: UsuarioPorCajaService,
  ) {}

  ngOnInit(): void {
    this.nombreUsuario.set(this.getNombreUsuarioLocal());
    this.cargarUsuarioCaja();
  }

  private cargarUsuarioCaja(): void {
    const idUsuario = this.getIdUsuarioLocal();
    if (!idUsuario) {
      this.cierreHabilitado.set(false);
      this.errorMsg.set('No se pudo identificar el usuario para cierre de caja.');
      return;
    }

    this.usuarioPorCajaService.getAll().subscribe({
      next: (data) => {
        const usuariosCaja = data ?? [];
        const asignado = usuariosCaja.find(
          (item) => item.usuario?.codigo === idUsuario && item.estado === 1,
        );
        if (!asignado) {
          this.cierreHabilitado.set(false);
          this.errorMsg.set('EL USUARIO NO TIENE CAJAS ASIGNADAS');
          return;
        }
        this.usuarioPorCaja.set(asignado);
        this.cajaCodigo.set(asignado.cajaFisica?.codigo ?? null);
        this.cargarTotales();
      },
      error: (error: any) => {
        console.error('Error al cargar UsuarioPorCaja', error);
        this.cierreHabilitado.set(false);
        this.errorMsg.set('No se pudo validar la caja del usuario.');
      },
    });
  }

  cargarTotales(): void {
    this.errorMsg.set('');
    this.loading.set(true);

    const usuarioCaja = this.usuarioPorCaja();
    const criterios: any = {
      fechaCierre: this.formatDate(this.fechaCierre()),
      cajaCodigo: this.cajaCodigo(),
      nombreUsuario: this.nombreUsuario(),
    };
    if (usuarioCaja?.codigo) {
      criterios.usuarioPorCaja = { codigo: usuarioCaja.codigo };
    }

    this.cierreService.selectByCriteria(criterios).subscribe({
      next: (lista) => {
        // Estrategia: si el backend devuelve una lista de cierres o un resumen,
        // se mapea a los montos. Por ahora, soportar ambos escenarios.
        if (lista && Array.isArray(lista) && lista.length > 0) {
          // Tomar el primer elemento como referencia de totales
          const resumen: any = lista[0] as CierreCaja | any;
          this.montoEfectivo.set(resumen.montoEfectivo ?? 0);
          this.montoCheque.set(resumen.montoCheque ?? 0);
          this.montoTarjeta.set(resumen.montoTarjeta ?? 0);
          this.montoTransferencia.set(resumen.montoTransferencia ?? 0);
          this.montoRetencion.set(resumen.montoRetencion ?? 0);
        } else {
          // Si no hay datos, resetear a 0
          this.montoEfectivo.set(0);
          this.montoCheque.set(0);
          this.montoTarjeta.set(0);
          this.montoTransferencia.set(0);
          this.montoRetencion.set(0);
          this.errorMsg.set('COBROS NO EXISTENTES');
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al calcular los totales');
        this.loading.set(false);
      },
    });
  }

  cerrarCaja(): void {
    this.errorMsg.set('');
    this.loading.set(true);

    const usuarioCaja = this.usuarioPorCaja();
    if (!usuarioCaja) {
      this.loading.set(false);
      this.errorMsg.set('EL USUARIO NO TIENE CAJAS ASIGNADAS');
      return;
    }

    const payload: CierreCaja = {
      codigo: 0,
      usuarioPorCaja: usuarioCaja,
      fechaCierre: this.formatDate(this.fechaCierre()),
      nombreUsuario: this.nombreUsuario() || '',
      monto: this.montoTotal(),
      rubroEstadoP: 0,
      rubroEstadoH: 0,
      montoEfectivo: this.montoEfectivo(),
      montoCheque: this.montoCheque(),
      montoTarjeta: this.montoTarjeta(),
      montoTransferencia: this.montoTransferencia(),
      montoRetencion: this.montoRetencion(),
      deposito: undefined as any,
      asiento: undefined as any,
    };

    this.cierreService.add(payload).subscribe({
      next: (res) => {
        if (res) {
          this.errorMsg.set('');
        }
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cerrar la caja');
        this.loading.set(false);
      },
    });
  }

  private formatDate(d: Date): string {
    const pad = (n: number) => n.toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    const mm = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    return `${yyyy}-${mm}-${dd}`;
  }

  private getIdUsuarioLocal(): number | null {
    const raw = localStorage.getItem('idUsuario');
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getNombreUsuarioLocal(): string {
    const username = localStorage.getItem('userName') || localStorage.getItem('usuario');
    return username?.toString().trim() ?? '';
  }
}
