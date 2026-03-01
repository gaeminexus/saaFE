import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { ReporteContable } from '../../../model/reporte-contable';
import { DetalleReporteContable } from '../../../model/detalle-reporte-contable';
import { ReporteContableService } from '../../../service/reporte-contable.service';
import { DetalleReporteContableService } from '../../../service/detalle-reporte-contable.service';
import { ConfirmDialogComponent } from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { PlanCuentaSelectorDialogComponent } from '../../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Component({
  selector: 'cnt-reportes-contables',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './reportes-contables.component.html',
  styleUrls: ['./reportes-contables.component.scss'],
})
export class ReportesContablesComponent implements OnInit {

  // ── Services ────────────────────────────────────────────
  private fb            = inject(FormBuilder);
  private dialog        = inject(MatDialog);
  private snackBar      = inject(MatSnackBar);
  private appState      = inject(AppStateService);
  private rprtSvc       = inject(ReporteContableService);
  private dtrpSvc       = inject(DetalleReporteContableService);

  // ── Estado maestro ──────────────────────────────────────────
  reportes           = signal<ReporteContable[]>([]);
  filtro             = signal('');
  loadingMaestro     = signal(false);
  loadingDetalle     = signal(false);
  loadingGuardar     = signal(false);
  selected           = signal<ReporteContable | null>(null);
  modoNuevo          = signal(false);

  reportesFiltrados = computed(() => {
    const q = this.filtro().toLowerCase();
    return this.reportes().filter(r =>
      (r.nombreReporte ?? '').toLowerCase().includes(q) ||
      String(r.codigoAlterno ?? '').includes(q)
    );
  });

  // ── Estado detalle ──────────────────────────────────────────
  detalles           = signal<DetalleReporteContable[]>([]);
  selectedDetalle    = signal<DetalleReporteContable | null>(null);
  modoNuevoDetalle   = signal(false);

  // ── Formularios ───────────────────────────────────────────
  formMaestro!: FormGroup;
  formDetalle!: FormGroup;

  readonly colsDetalle = ['numeroDesde', 'nombreDesde', 'numeroHasta', 'nombreHasta', 'signo', 'acciones'];

  private get idEmpresa(): number {
    return this.appState.getEmpresa()?.codigo
      ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);
  }

  // ── Lifecycle ───────────────────────────────────────────
  ngOnInit(): void {
    this.initFormMaestro();
    this.initFormDetalle();
    this.cargarReportes();
  }

  private initFormMaestro(r?: ReporteContable): void {
    this.formMaestro = this.fb.group({
      nombre:        [r?.nombreReporte ?? '', [Validators.required, Validators.maxLength(120)]],
      codigoAlterno: [r?.codigoAlterno ?? null, [Validators.required, Validators.min(1)]],
      estado:        [r?.estado ?? 1, Validators.required],
    });
  }

  private initFormDetalle(d?: DetalleReporteContable): void {
    this.formDetalle = this.fb.group({
      numeroDesde: [d?.numeroDesde ?? '', Validators.required],
      nombreDesde: [d?.nombreDesde ?? ''],
      numeroHasta: [d?.numeroHasta ?? '', Validators.required],
      nombreHasta: [d?.nombreHasta ?? ''],
      signo:       [d?.signo ?? 1,  [Validators.required]],
    });
  }

  // ── Maestro ────────────────────────────────────────────
  cargarReportes(): void {
    this.loadingMaestro.set(true);
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(TipoDatos.LONG, 'empresa', 'codigo', String(this.idEmpresa), TipoComandosBusqueda.IGUAL);
    this.rprtSvc.selectByCriteria([criterioEmpresa]).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.reportes.set(data);
        } else {
          this.rprtSvc.getAll().subscribe({
            next: (all) => this.reportes.set(all ?? []),
            error: () => {}
          });
        }
        this.loadingMaestro.set(false);
      },
      error: () => { this.loadingMaestro.set(false); }
    });
  }

  seleccionarReporte(r: ReporteContable): void {
    this.selected.set(r);
    this.modoNuevo.set(false);
    this.initFormMaestro(r);
    // limpiar detalle previo
    this.selectedDetalle.set(null);
    this.modoNuevoDetalle.set(false);
    this.initFormDetalle();
    this.cargarDetalles(r.codigo);
  }

  nuevoReporte(): void {
    this.selected.set(null);
    this.modoNuevo.set(true);
    this.detalles.set([]);
    this.selectedDetalle.set(null);
    this.modoNuevoDetalle.set(false);
    this.initFormMaestro();
    this.initFormDetalle();
  }

  cancelarMaestro(): void {
    this.modoNuevo.set(false);
    if (this.selected()) {
      this.initFormMaestro(this.selected()!);
    } else {
      this.formMaestro.reset();
    }
  }

  guardarMaestro(): void {
    if (this.formMaestro.invalid) { this.formMaestro.markAllAsTouched(); return; }
    const v = this.formMaestro.value;
    const payload = {
      ...(this.selected() && !this.modoNuevo() ? { codigo: this.selected()!.codigo } : {}),
      empresa:        { codigo: this.idEmpresa },
      nombreReporte:  v.nombre,
      codigoAlterno:  v.codigoAlterno,
      estado:         v.estado,
    };
    this.loadingGuardar.set(true);
    const op$ = this.modoNuevo()
      ? this.rprtSvc.add(payload)
      : this.rprtSvc.update(payload);

    op$.subscribe({
      next: () => {
        this.loadingGuardar.set(false);
        this.snackBar.open(
          this.modoNuevo() ? 'Reporte creado correctamente' : 'Reporte actualizado',
          'OK', { duration: 3000 }
        );
        this.modoNuevo.set(false);
        this.cargarReportes();
      },
      error: () => {
        this.loadingGuardar.set(false);
        this.snackBar.open('Error al guardar el reporte', 'OK', { duration: 3500 });
      }
    });
  }

  eliminarReporte(r: ReporteContable): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar Reporte',
        message: `¿Eliminar el reporte "${r.nombreReporte}"? Se eliminarán también sus rangos de cuentas.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.rprtSvc.delete(r.codigo).subscribe({
        next: () => {
          this.snackBar.open('Reporte eliminado', 'OK', { duration: 3000 });
          if (this.selected()?.codigo === r.codigo) {
            this.selected.set(null);
            this.detalles.set([]);
          }
          this.cargarReportes();
        },
        error: () => this.snackBar.open('Error al eliminar', 'OK', { duration: 3500 })
      });
    });
  }

  // ── Detalle ───────────────────────────────────────────
  cargarDetalles(codigoReporte: number): void {
    this.loadingDetalle.set(true);
    const criterioReporte = new DatosBusqueda();
    criterioReporte.asignaValorConCampoPadre(TipoDatos.LONG, 'reporteContable', 'codigo', String(codigoReporte), TipoComandosBusqueda.IGUAL);
    this.dtrpSvc.selectByCriteria([criterioReporte]).subscribe({
      next: (data) => {
        this.detalles.set(data ?? []);
        this.loadingDetalle.set(false);
      },
      error: () => { this.loadingDetalle.set(false); }
    });
  }

  nuevoDetalle(): void {
    this.selectedDetalle.set(null);
    this.modoNuevoDetalle.set(true);
    this.initFormDetalle();
  }

  editarDetalle(d: DetalleReporteContable): void {
    this.selectedDetalle.set(d);
    this.modoNuevoDetalle.set(false);
    this.initFormDetalle(d);
  }

  cancelarDetalle(): void {
    this.selectedDetalle.set(null);
    this.modoNuevoDetalle.set(false);
    this.initFormDetalle();
  }

  guardarDetalle(): void {
    if (this.formDetalle.invalid) { this.formDetalle.markAllAsTouched(); return; }
    const sel = this.selected();
    if (!sel) return;
    const v = this.formDetalle.value;
    const payload = {
      ...(this.modoNuevoDetalle() ? {} : { codigo: this.selectedDetalle()!.codigo }),
      reporteContable: sel,
      numeroDesde: v.numeroDesde,
      nombreDesde: v.nombreDesde,
      numeroHasta: v.numeroHasta,
      nombreHasta: v.nombreHasta,
      signo:       v.signo,
    };
    this.loadingGuardar.set(true);
    const op$ = this.modoNuevoDetalle()
      ? this.dtrpSvc.add(payload)
      : this.dtrpSvc.update(payload);

    op$.subscribe({
      next: () => {
        this.loadingGuardar.set(false);
        this.snackBar.open(
          this.modoNuevoDetalle() ? 'Rango de cuentas agregado' : 'Rango de cuentas actualizado',
          'OK', { duration: 3000 }
        );
        this.cancelarDetalle();
        this.cargarDetalles(sel.codigo);
      },
      error: () => {
        this.loadingGuardar.set(false);
        this.snackBar.open('Error al guardar el rango', 'OK', { duration: 3500 });
      }
    });
  }

  eliminarDetalle(d: DetalleReporteContable): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar Rango',
        message: `¿Eliminar el rango ${d.numeroDesde} → ${d.numeroHasta}?`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
      }
    });
    ref.afterClosed().subscribe(ok => {
      if (!ok) return;
      this.dtrpSvc.delete(d.codigo).subscribe({
        next: () => {
          this.snackBar.open('Rango eliminado', 'OK', { duration: 3000 });
          this.cargarDetalles(this.selected()!.codigo);
        },
        error: () => this.snackBar.open('Error al eliminar el rango', 'OK', { duration: 3500 })
      });
    });
  }

  // ── Selectores de Plan de Cuentas ────────────────────
  abrirSelectorDesde(): void {
    const ref = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        titulo: 'Seleccionar Cuenta Desde',
        mostrarSoloMovimiento: false,
      }
    });
    ref.afterClosed().subscribe(cuenta => {
      if (!cuenta) return;
      this.formDetalle.patchValue({
        numeroDesde: cuenta.cuentaContable,
        nombreDesde: cuenta.nombre,
      });
    });
  }

  abrirSelectorHasta(): void {
    const ref = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        titulo: 'Seleccionar Cuenta Hasta',
        mostrarSoloMovimiento: false,
      }
    });
    ref.afterClosed().subscribe(cuenta => {
      if (!cuenta) return;
      this.formDetalle.patchValue({
        numeroHasta: cuenta.cuentaContable,
        nombreHasta: cuenta.nombre,
      });
    });
  }

  // ── Helpers ───────────────────────────────────────────
  signoLabel(s: number): string {
    return s === 1 ? '+ Suma' : s === -1 ? '− Resta' : String(s);
  }

  estadoLabel(e: number | null): string {
    return e === 1 ? 'Activo' : e === 0 ? 'Inactivo' : '-';
  }
}
