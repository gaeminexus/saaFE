import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PlanCuentaSelectorDialogComponent } from '../../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { PlanCuenta } from '../../../../cnt/model/plan-cuenta';
import { CajaChica, CajaChicaRegistrarRequest } from '../../../model/caja-chica';
import { SaldoCajaChica } from '../../../model/saldo-caja-chica';
import { CajaChicaService } from '../../../service/caja-chica.service';

/** Fila combinada: datos completos de la caja + su saldo, para la tabla y el formulario. */
interface FilaCajaChica {
  caja: CajaChica;
  saldo: SaldoCajaChica | null;
}

/**
 * Parametrización de cajas chicas: alta, edición y listado con saldo/alerta.
 *
 * El custodio de `CajaChica` (`CJCHUSCS`) es FK a `Usuario` (SCP.PJRQ, la
 * misma tabla de usuarios de login) — NO un `Titular` de negocio. El
 * frontend no tiene hoy un selector de usuarios del sistema (solo el de
 * titulares CLIENTE/PROVEEDOR), así que el campo queda deshabilitado en el
 * formulario y no se envía en ninguno de los dos payloads hasta que exista
 * ese selector; ver el campo `custodio` en `caja-chica.ts`.
 */
@Component({
  selector: 'app-cajas-chicas',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './cajas-chicas.component.html',
  styleUrl: './cajas-chicas.component.scss',
})
export class CajasChicasComponent implements OnInit {
  private cajaChicaS = inject(CajaChicaService);
  private appState = inject(AppStateService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  loading = signal(false);
  guardando = signal(false);
  filas = signal<FilaCajaChica[]>([]);

  modoEdicion = signal(false);
  codigoEdicion = signal<number | null>(null);

  // ── Formulario ──────────────────────────────────────────
  // Los cuatro campos numéricos están en inputs type="number": ngModel les
  // escribe un `number` (o '' al vaciarse), nunca un string, así que el tipo
  // ficticio `string` de abajo no refleja lo que realmente llega en runtime.
  nombre = '';
  planCuentaSeleccionada: PlanCuenta | null = null;
  montoFondo: string | number = '';
  montoMaximoGasto: string | number = '';
  porcentajeAlerta: string | number = '20';
  responsable = '';
  observacion = '';
  /** Solo se usa (y se envía) al crear; nunca al editar. */
  saldoInicialMigrado: string | number = '';

  readonly columnas = ['nombre', 'fondo', 'saldo', 'disponible', 'alerta', 'acciones'];

  estaCreando = computed(() => this.modoEdicion() && this.codigoEdicion() === null);

  ngOnInit(): void {
    this.cargarCajas();
  }

  private idEmpresa(): number | null {
    return this.appState.getEmpresa()?.codigo ?? null;
  }

  cargarCajas(): void {
    const idEmpresa = this.idEmpresa();
    if (!idEmpresa) return;

    this.loading.set(true);

    this.cajaChicaS.getAll().subscribe({
      next: (cajas) => {
        const propias = (cajas ?? []).filter((c) => c.empresa?.codigo === idEmpresa);
        this.cajaChicaS.saldos(idEmpresa).subscribe({
          next: (saldos) => {
            this.loading.set(false);
            const porId = new Map((saldos ?? []).map((s) => [s.idCaja, s]));
            this.filas.set(propias.map((caja) => ({ caja, saldo: porId.get(caja.codigo) ?? null })));
          },
          error: (err) => {
            this.loading.set(false);
            // Sin saldos igual se puede administrar la parametrización.
            this.filas.set(propias.map((caja) => ({ caja, saldo: null })));
            this.snackBar.open(CajaChicaService.mensajeError(err), 'Cerrar', { duration: 5000 });
          },
        });
      },
      error: (err) => {
        this.loading.set(false);
        this.filas.set([]);
        this.snackBar.open(CajaChicaService.mensajeError(err), 'Cerrar', { duration: 5000 });
      },
    });
  }

  nuevaCaja(): void {
    this.codigoEdicion.set(null);
    this.nombre = '';
    this.planCuentaSeleccionada = null;
    this.montoFondo = '';
    this.montoMaximoGasto = '';
    this.porcentajeAlerta = '20';
    this.responsable = '';
    this.observacion = '';
    this.saldoInicialMigrado = '';
    this.modoEdicion.set(true);
  }

  editarCaja(fila: FilaCajaChica): void {
    const caja = fila.caja;
    this.codigoEdicion.set(caja.codigo);
    this.nombre = caja.nombre ?? '';
    this.planCuentaSeleccionada = caja.planCuenta ?? null;
    this.montoFondo = caja.montoFondo != null ? String(caja.montoFondo) : '';
    this.montoMaximoGasto = caja.montoMaximoGasto != null ? String(caja.montoMaximoGasto) : '';
    this.porcentajeAlerta = caja.porcentajeAlerta != null ? String(caja.porcentajeAlerta) : '20';
    this.responsable = caja.responsable ?? '';
    this.observacion = caja.observacion ?? '';
    this.saldoInicialMigrado = '';
    this.modoEdicion.set(true);
  }

  cancelar(): void {
    this.modoEdicion.set(false);
    this.codigoEdicion.set(null);
  }

  buscarCuentaContable(): void {
    this.dialog
      .open(PlanCuentaSelectorDialogComponent, {
        width: '900px',
        maxWidth: '98vw',
        data: { titulo: 'Cuenta contable del fondo', cuentaPreseleccionada: this.planCuentaSeleccionada ?? undefined },
      })
      .afterClosed()
      .subscribe((cuenta: PlanCuenta | null) => {
        if (cuenta) this.planCuentaSeleccionada = cuenta;
      });
  }

  private numero(valor: unknown): number {
    const n = parseFloat(String(valor ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * No confiar en el tipo declarado del campo: un input type="number" con
   * ngModel escribe un `number` en runtime aunque el campo esté tipado
   * `string` — `.trim()` directo revienta ("(25).trim is not a function").
   * Sirve para cualquiera de los dos tipos, y para null/undefined.
   */
  private tieneValor(v: unknown): boolean {
    return v !== null && v !== undefined && String(v).trim() !== '';
  }

  get formValido(): boolean {
    return !!this.nombre.trim()
      && !!this.planCuentaSeleccionada
      && this.numero(this.montoFondo) > 0
      && !!this.responsable.trim()
      && this.numero(this.porcentajeAlerta) > 0
      && !this.guardando();
  }

  guardar(): void {
    if (!this.formValido || !this.planCuentaSeleccionada) return;
    const idEmpresa = this.idEmpresa();
    if (!idEmpresa) {
      this.snackBar.open('No se pudo determinar la empresa activa.', 'Cerrar', { duration: 4000 });
      return;
    }

    this.guardando.set(true);

    if (this.codigoEdicion() === null) {
      // Claves planas: CajaChicaRest.registrar() lee un Map<String,Object> a
      // mano (idEmpresa/idPlanCuenta/...), no el objeto CajaChica anidado.
      const payload: CajaChicaRegistrarRequest = {
        idEmpresa,
        nombre: this.nombre.trim(),
        idPlanCuenta: this.planCuentaSeleccionada.codigo,
        montoFondo: this.numero(this.montoFondo),
        montoMaximoGasto: this.tieneValor(this.montoMaximoGasto) ? this.numero(this.montoMaximoGasto) : null,
        porcentajeAlerta: this.numero(this.porcentajeAlerta),
        responsable: this.responsable.trim(),
        observacion: this.observacion.trim() || null,
        saldoInicialMigrado: this.tieneValor(this.saldoInicialMigrado) ? this.numero(this.saldoInicialMigrado) : undefined,
        idUsuario: this.appState.getIdUsuario(),
      };

      this.cajaChicaS.registrar(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.snackBar.open('✓ Caja chica registrada', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
          this.cancelar();
          this.cargarCajas();
        },
        error: (err) => {
          this.guardando.set(false);
          this.snackBar.open('✗ ' + CajaChicaService.mensajeError(err), 'Cerrar', { duration: 6000, panelClass: ['snackbar-error'] });
        },
      });
      return;
    }

    // Edición: PUT /cjch deserializa directo a la entidad CajaChica (a
    // diferencia de /registrar, que lee un Map plano) — el objeto anidado sí
    // es correcto aquí. Nunca se envía saldoInicialMigrado: el backend no
    // debe volver a tocar el saldo.
    // OJO con `custodio`: EntityDaoImpl.save() hace em.merge() en edición, que
    // sobrescribe TODO el registro con lo que llegue en el JSON — omitir un
    // campo lo deja en null, no lo conserva. Como esta pantalla nunca llegó a
    // enviar un custodio válido (ver comentario de clase), no hay nada que
    // perder hoy, pero si se agrega el selector de usuario del sistema hay
    // que releer aquí el custodio actual antes de guardar para no borrarlo.
    const payload: any = {
      codigo: this.codigoEdicion(),
      empresa: { codigo: idEmpresa },
      nombre: this.nombre.trim(),
      planCuenta: { codigo: this.planCuentaSeleccionada.codigo },
      montoFondo: this.numero(this.montoFondo),
      montoMaximoGasto: this.tieneValor(this.montoMaximoGasto) ? this.numero(this.montoMaximoGasto) : null,
      porcentajeAlerta: this.numero(this.porcentajeAlerta),
      responsable: this.responsable.trim(),
      observacion: this.observacion.trim() || null,
    };

    this.cajaChicaS.update(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('✓ Caja chica actualizada', 'Cerrar', { duration: 3000, panelClass: ['snackbar-success'] });
        this.cancelar();
        this.cargarCajas();
      },
      error: (err) => {
        this.guardando.set(false);
        this.snackBar.open('✗ ' + CajaChicaService.mensajeError(err), 'Cerrar', { duration: 6000, panelClass: ['snackbar-error'] });
      },
    });
  }

  formatearMonto(monto: number | null | undefined): string {
    return (Number(monto) || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  porcentajeDisponible(fila: FilaCajaChica): number {
    return Math.max(0, Math.min(100, Number(fila.saldo?.porcentaje ?? 0)));
  }

  tieneAlerta(fila: FilaCajaChica): boolean {
    return fila.saldo?.alerta === true;
  }
}
