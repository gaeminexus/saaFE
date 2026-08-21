import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Titular } from '../../../model/titular';
import {
  AnticipoSeguimiento,
  AnticipoService,
  SeguimientoAnticipos,
  VerificacionAnulacionAnticipo,
} from '../../../service/anticipo.service';
import {
  AnularAnticipoDialogComponent,
  AnularAnticipoDialogResult,
} from '../dialogs/anular-anticipo-dialog/anular-anticipo-dialog.component';

type TipoTitular = 'cliente' | 'proveedor';

/**
 * Seguimiento de anticipos: el estado de cuenta completo de un cliente o un
 * proveedor. Por cada anticipo muestra su documento, sus fechas, su asiento y
 * el detalle de los cruces que lo consumieron — activos y reversados, de modo
 * que también se puede seguir una anulación.
 *
 * Incluye el cuadre entre la suma de los saldos por anticipo y el saldo global
 * de la cuenta contable: si no coinciden hay movimientos sin atribuir (típico
 * de cruces anteriores a la migración del 2026-08-20).
 */
@Component({
  selector: 'app-seguimiento-anticipos',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatButtonToggleModule],
  templateUrl: './seguimiento-anticipos.component.html',
  styleUrl: './seguimiento-anticipos.component.scss',
})
export class SeguimientoAnticiposComponent {
  private dialog = inject(MatDialog);
  private anticipoS = inject(AnticipoService);
  private snackBar = inject(MatSnackBar);
  private funcionesDatos = inject(FuncionesDatosService);

  private readonly ROL_CLIENTE = 1;
  private readonly ROL_PROVEEDOR = 2;
  private readonly ESTADO_ANULADO = 3;

  tipo = signal<TipoTitular>('proveedor');
  titular = signal<Titular | null>(null);
  datos = signal<SeguimientoAnticipos | null>(null);
  cargando = signal(false);
  error = signal('');
  anulandoId = signal<number | null>(null);
  /** Ids de los anticipos con el detalle de cruces desplegado. */
  expandidos = signal<Set<number>>(new Set());

  cambiarTipo(tipo: TipoTitular): void {
    if (this.tipo() === tipo) return;
    this.tipo.set(tipo);
    this.limpiar();
  }

  limpiar(): void {
    this.titular.set(null);
    this.datos.set(null);
    this.error.set('');
    this.expandidos.set(new Set());
  }

  buscarTitular(): void {
    const esProveedor = this.tipo() === 'proveedor';
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: {
        rolCodigo: esProveedor ? this.ROL_PROVEEDOR : this.ROL_CLIENTE,
        rolNombre: esProveedor ? 'PROVEEDOR' : 'CLIENTE',
        titulo: esProveedor ? 'Buscar Proveedor' : 'Buscar Cliente',
      },
    }).afterClosed().subscribe((t: Titular | null) => {
      if (!t) return;
      this.titular.set(t);
      this.cargar();
    });
  }

  cargar(): void {
    const t = this.titular();
    if (!t?.codigo) return;

    this.cargando.set(true);
    this.error.set('');
    const idEmpresa = this.idEmpresaSesion();

    const peticion = this.tipo() === 'proveedor'
      ? this.anticipoS.seguimientoProveedor(t.codigo, idEmpresa)
      : this.anticipoS.seguimientoCliente(t.codigo, idEmpresa);

    peticion.subscribe({
      next: (resp) => {
        this.datos.set(resp);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.cargando.set(false);
        this.datos.set(null);
        this.error.set(err.message);
      },
    });
  }

  nombreTitular(): string {
    const t = this.titular();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  // ── Detalle de cruces ────────────────────────────────────────────────────

  estaExpandido(a: AnticipoSeguimiento): boolean {
    return this.expandidos().has(a.id);
  }

  alternarDetalle(a: AnticipoSeguimiento): void {
    const copia = new Set(this.expandidos());
    if (copia.has(a.id)) {
      copia.delete(a.id);
    } else {
      copia.add(a.id);
    }
    this.expandidos.set(copia);
  }

  expandirTodo(): void {
    const ids = (this.datos()?.anticipos ?? [])
      .filter((a) => (a.cruces?.length ?? 0) > 0)
      .map((a) => a.id);
    this.expandidos.set(new Set(ids));
  }

  colapsarTodo(): void {
    this.expandidos.set(new Set());
  }

  // ── Anulación ────────────────────────────────────────────────────────────

  puedeAnular(a: AnticipoSeguimiento): boolean {
    return Number(a?.valor ?? 0) > 0 && Number(a?.estado ?? 0) !== this.ESTADO_ANULADO;
  }

  anular(a: AnticipoSeguimiento): void {
    const id = Number(a?.id ?? 0);
    if (!id) return;

    this.anulandoId.set(id);
    const verificar = this.tipo() === 'proveedor'
      ? this.anticipoS.verificarAnulacionProveedor(id)
      : this.anticipoS.verificarAnulacionCliente(id);

    verificar.subscribe({
      next: (verificacion) => {
        this.anulandoId.set(null);
        if (verificacion?.puedeAnular === false) {
          this.snackBar.open(verificacion?.mensaje || 'El anticipo no se puede anular.',
            'Cerrar', { duration: 6000 });
          return;
        }
        this.abrirDialogo(id, a, verificacion);
      },
      error: (err: Error) => {
        this.anulandoId.set(null);
        this.snackBar.open(err.message, 'Cerrar', { duration: 5000 });
      },
    });
  }

  private abrirDialogo(id: number, anticipo: AnticipoSeguimiento,
                       verificacion: VerificacionAnulacionAnticipo): void {
    this.dialog.open(AnularAnticipoDialogComponent, {
      width: '640px',
      maxWidth: '96vw',
      disableClose: true,
      data: { tipo: this.tipo(), anticipo, verificacion },
    }).afterClosed().subscribe((res: AnularAnticipoDialogResult | null) => {
      if (!res) return;
      this.ejecutarAnulacion(id, anticipo, res);
    });
  }

  private ejecutarAnulacion(id: number, anticipo: AnticipoSeguimiento,
                            res: AnularAnticipoDialogResult): void {
    const payload = {
      motivo: res.motivo,
      idUsuario: this.idUsuarioSesion(),
      confirmarReversionCruces: res.confirmarReversionCruces,
    };
    this.anulandoId.set(id);

    const peticion = this.tipo() === 'proveedor'
      ? this.anticipoS.anularProveedor(id, payload)
      : this.anticipoS.anularCliente(id, payload);

    peticion.subscribe({
      next: (resp) => {
        this.anulandoId.set(null);
        // El backend pudo detectar cruces nuevos entre la verificación y la
        // anulación: se vuelve a preguntar con el detalle actualizado.
        if (resp?.requiereConfirmacion) {
          this.abrirDialogo(id, anticipo, resp);
          return;
        }
        this.snackBar.open(resp?.mensaje || 'Anticipo anulado correctamente.',
          'Cerrar', { duration: 5000 });
        this.cargar();
      },
      error: (err: Error) => {
        this.anulandoId.set(null);
        this.snackBar.open(err.message, 'Cerrar', { duration: 6000 });
      },
    });
  }

  // ── Presentación ─────────────────────────────────────────────────────────

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearFechaHora(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleString('es-EC', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  claseEstado(a: AnticipoSeguimiento): string {
    switch (Number(a?.estado ?? 0)) {
      case 1: return 'chip-ingresado';
      case 2: return 'chip-confirmado';
      case 3: return 'chip-anulado';
      default: return 'chip-otro';
    }
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
