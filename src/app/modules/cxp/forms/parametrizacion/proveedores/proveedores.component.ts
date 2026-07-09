import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

import { Titular } from '../../../../tsr/model/titular';
import { PersonaRol } from '../../../../tsr/model/persona-rol';
import { PersonaCuentaContable } from '../../../../tsr/model/persona-cuenta-contable';
import { PlanCuenta } from '../../../../cnt/model/plan-cuenta';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';

import { TitularService } from '../../../../tsr/service/titular.service';
import { PersonaRolService } from '../../../../tsr/service/persona-rol.service';
import { PersonaCuentaContableService } from '../../../../tsr/service/persona-cuenta-contable.service';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { PlanCuentaSelectorDialogComponent } from '../../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';

/** Rubro 55: Roles de Persona - Código alterno 2 = Proveedor */
const RUBRO_ROLES_PERSONA = 55;
const CODIGO_ROL_PROVEEDOR = 2;

/** Rubro 82: Tipos de Persona */
const RUBRO_TIPOS_PERSONA = 82;

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
})
export class ProveedoresComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private titularService = inject(TitularService);
  private personaRolService = inject(PersonaRolService);
  private cuentaContableService = inject(PersonaCuentaContableService);
  private detalleRubroService = inject(DetalleRubroService);
  private appState = inject(AppStateService);

  // ── Estado general ──────────────────────────────────────────────────────────
  cargando = signal(false);
  guardando = signal(false);
  modoVista = signal<'lista' | 'nuevo' | 'editar' | 'cuentas'>('lista');

  // ── Proveedores ─────────────────────────────────────────────────────────────
  proveedores = signal<Titular[]>([]);
  proveedorSeleccionado = signal<Titular | null>(null);
  filtroBusqueda = signal('');

  proveedoresFiltrados = computed(() => {
    const filtro = this.filtroBusqueda().toLowerCase();
    return this.proveedores().filter(
      (p) =>
        !filtro ||
        p.nombre?.toLowerCase().includes(filtro) ||
        p.apellido?.toLowerCase().includes(filtro) ||
        p.identificacion?.toLowerCase().includes(filtro) ||
        p.razonSocial?.toLowerCase().includes(filtro)
    );
  });

  // ── Tabla de proveedores ────────────────────────────────────────────────────
  dataSource = new MatTableDataSource<Titular>([]);
  columnasTabla: string[] = [
    'identificacion',
    'razonSocial',
    'nombres',
    'direccion',
    'telefono',
    'correo',
    'estado',
    'acciones',
  ];

  // ── Cuentas Contables del proveedor ─────────────────────────────────────────
  cuentasContables = signal<PersonaCuentaContable[]>([]);
  dataSourceCuentas = new MatTableDataSource<PersonaCuentaContable>([]);
  columnasCuentas: string[] = ['tipoCuenta', 'planCuenta', 'estado', 'acciones'];

  // ── Opciones de catálogos ────────────────────────────────────────────────────
  tiposPersonaOptions = signal<DetalleRubro[]>([]);
  estadosOptions = signal<DetalleRubro[]>([]);

  // ── Formulario Proveedor ────────────────────────────────────────────────────
  formProveedor!: FormGroup;

  // ── Formulario Cuenta Contable ──────────────────────────────────────────────
  formCuenta!: FormGroup;
  cuentaSeleccionada = signal<PlanCuenta | null>(null);
  cuentaEditando = signal<PersonaCuentaContable | null>(null);

  // ── Opciones ─────────────────────────────────────────────────────────────────
  readonly opcionesTipoCuenta = [
    { value: 1, label: 'Facturas por Pagar' },
    { value: 2, label: 'Anticipos' },
  ];

  readonly opcionesEstado = [
    { value: 1, label: 'Activo' },
    { value: 2, label: 'Inactivo' },
  ];

  // ── Empresa ─────────────────────────────────────────────────────────────────
  private get empresa() {
    return this.appState.getEmpresa();
  }

  ngOnInit(): void {
    this.inicializarFormularios();
    this.cargarProveedores();
    this.cargarCatalogos();
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INICIALIZACIÓN
  // ════════════════════════════════════════════════════════════════════════════

  private inicializarFormularios(): void {
    // Formulario de proveedor
    this.formProveedor = this.fb.group({
      codigo: [null],
      empresa: [this.empresa],
      identificacion: ['', [Validators.required, Validators.maxLength(20)]],
      tipoPersona: [1, Validators.required], // 1=Natural por defecto
      razonSocial: [''],
      nombres: [''],
      apellidos: [''],
      direccion: ['', Validators.maxLength(250)],
      telefono: ['', Validators.maxLength(20)],
      correo: ['', [Validators.email, Validators.maxLength(100)]],
      observaciones: ['', Validators.maxLength(500)],
      estado: [1, Validators.required],
    });

    // Formulario de cuenta contable
    this.formCuenta = this.fb.group({
      codigo: [null],
      empresa: [this.empresa, Validators.required],
      titular: [null, Validators.required],
      tipoPersona: [2, Validators.required], // 2 = Proveedor
      tipoCuenta: [1, Validators.required], // 1 = Facturas
      planCuenta: [null, Validators.required],
      estado: [1, Validators.required],
    });
  }

  private cargarCatalogos(): void {
    // Tipos de Persona (Natural/Jurídica)
    const tipos = this.detalleRubroService.getDetallesByParent(RUBRO_TIPOS_PERSONA);
    if (tipos && tipos.length > 0) {
      this.tiposPersonaOptions.set(tipos);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CARGA DE DATOS
  // ════════════════════════════════════════════════════════════════════════════

  cargarProveedores(): void {
    this.cargando.set(true);

    // Criterio: buscar personas con rol "Proveedor" (código 2 en rubro 55)
    const criterios: DatosBusqueda[] = [];

    // Buscar por empresa
    if (this.empresa) {
      const dbEmpresa = new DatosBusqueda();
      dbEmpresa.asignaUnCampoSinTrunc(
        TipoDatos.LONG,
        'empresa',
        this.empresa.toString(),
        TipoComandosBusqueda.IGUAL
      );
      dbEmpresa.setNumeroCampoRepetido(0);
      criterios.push(dbEmpresa);
    }

    this.titularService.selectByCriteria(criterios).subscribe({
      next: (titulares) => {
        if (titulares) {
          // Filtrar solo los que tienen rol de proveedor
          this.filtrarProveedores(titulares);
        } else {
          this.proveedores.set([]);
          this.dataSource.data = [];
        }
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar proveedores:', err);
        this.mostrarError('Error al cargar proveedores');
        this.cargando.set(false);
      },
    });
  }

  /**
   * Filtra titulares que tienen rol de proveedor asignado
   */
  private filtrarProveedores(titulares: Titular[]): void {
    if (!titulares || titulares.length === 0) {
      this.proveedores.set([]);
      this.dataSource.data = [];
      return;
    }

    // Cargar roles de todos los titulares
    const criterios: DatosBusqueda[] = [];

    if (this.empresa) {
      const dbEmpresa = new DatosBusqueda();
      dbEmpresa.asignaUnCampoSinTrunc(
        TipoDatos.LONG,
        'empresa',
        this.empresa.toString(),
        TipoComandosBusqueda.IGUAL
      );
      dbEmpresa.setNumeroCampoRepetido(0);
      criterios.push(dbEmpresa);
    }

    // Filtrar por código de rol (rubro 55, código alterno 2 = Proveedor)
    const dbRol = new DatosBusqueda();
    dbRol.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'rubroRolPersonaH',
      'codigoAlterno',
      CODIGO_ROL_PROVEEDOR.toString(),
      TipoComandosBusqueda.IGUAL
    );
    dbRol.setNumeroCampoRepetido(0);
    criterios.push(dbRol);

    this.personaRolService.selectByCriteria(criterios).subscribe({
      next: (roles) => {
        if (roles && roles.length > 0) {
          // Extraer IDs de titulares que son proveedores
          const idsProveedores = roles
            .map((r) => r.titular?.codigo)
            .filter((id): id is number => id !== undefined);

          const soloProveedores = titulares.filter((t) =>
            t.codigo !== undefined && idsProveedores.includes(t.codigo)
          );
          this.proveedores.set(soloProveedores);
          this.dataSource.data = soloProveedores;
        } else {
          this.proveedores.set([]);
          this.dataSource.data = [];
        }
      },
      error: (err) => {
        console.error('Error al filtrar proveedores por rol:', err);
        // Si falla, mostrar todos los titulares
        this.proveedores.set(titulares);
        this.dataSource.data = titulares;
      },
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // OPERACIONES CRUD - PROVEEDOR
  // ════════════════════════════════════════════════════════════════════════════

  nuevoProveedor(): void {
    this.formProveedor.reset({
      empresa: this.empresa,
      tipoPersona: 1,
      estado: 1,
    });
    this.modoVista.set('nuevo');
  }

  editarProveedor(proveedor: Titular): void {
    this.proveedorSeleccionado.set(proveedor);
    this.formProveedor.patchValue(proveedor);
    this.modoVista.set('editar');
  }

  guardarProveedor(): void {
    if (this.formProveedor.invalid) {
      this.mostrarError('Por favor complete todos los campos requeridos');
      return;
    }

    this.guardando.set(true);
    const titular: Titular = this.formProveedor.value;

    const operacion$ =
      this.modoVista() === 'nuevo'
        ? this.titularService.add(titular)
        : this.titularService.update(titular);

    operacion$.subscribe({
      next: (titularGuardado) => {
        if (titularGuardado) {
          // Si es nuevo, asignar rol de proveedor
          if (this.modoVista() === 'nuevo') {
            this.asignarRolProveedor(titularGuardado.codigo || 0);
          } else {
            this.mostrarExito('Proveedor actualizado correctamente');
            this.cargarProveedores();
            this.cancelar();
          }
        }
        this.guardando.set(false);
      },
      error: (err) => {
        console.error('Error al guardar proveedor:', err);
        this.mostrarError('Error al guardar proveedor');
        this.guardando.set(false);
      },
    });
  }

  /**
   * Asigna el rol de proveedor a un titular recién creado
   */
  private asignarRolProveedor(idTitular: number): void {
    if (!this.empresa) return;

    const personaRol: any = {
      empresa: this.empresa,
      titular: { codigo: idTitular },
      rubroRolPersonaP: RUBRO_ROLES_PERSONA,
      rubroRolPersonaH: CODIGO_ROL_PROVEEDOR,
      estado: 1,
    };

    this.personaRolService.add(personaRol).subscribe({
      next: () => {
        this.mostrarExito('Proveedor creado correctamente');
        this.cargarProveedores();
        this.cancelar();
      },
      error: (err) => {
        console.error('Error al asignar rol:', err);
        this.mostrarError('Proveedor creado pero no se pudo asignar el rol');
        this.cargarProveedores();
      },
    });
  }

  eliminarProveedor(proveedor: Titular): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Confirmar Eliminación',
          message: `¿Está seguro de eliminar al proveedor "${proveedor.razonSocial || proveedor.nombre}"?`,
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && proveedor.codigo) {
        this.titularService.delete(proveedor.codigo).subscribe({
          next: () => {
            this.mostrarExito('Proveedor eliminado correctamente');
            this.cargarProveedores();
          },
          error: (err) => {
            console.error('Error al eliminar:', err);
            this.mostrarError('Error al eliminar proveedor');
          },
        });
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CUENTAS CONTABLES
  // ════════════════════════════════════════════════════════════════════════════

  gestionarCuentas(proveedor: Titular): void {
    this.proveedorSeleccionado.set(proveedor);
    this.cargarCuentasProveedor(proveedor.codigo || 0);
    this.modoVista.set('cuentas');
  }

  private cargarCuentasProveedor(idTitular: number): void {
    const criterios: DatosBusqueda[] = [];

    const dbTitular = new DatosBusqueda();
    dbTitular.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'titular',
      idTitular.toString(),
      TipoComandosBusqueda.IGUAL
    );
    dbTitular.setNumeroCampoRepetido(0);
    criterios.push(dbTitular);

    const dbTipoPersona = new DatosBusqueda();
    dbTipoPersona.asignaUnCampoSinTrunc(
      TipoDatos.LONG,
      'tipoPersona',
      '2', // 2 = Proveedor
      TipoComandosBusqueda.IGUAL
    );
    dbTipoPersona.setNumeroCampoRepetido(0);
    criterios.push(dbTipoPersona);

    this.cuentaContableService.selectByCriteria(criterios).subscribe({
      next: (cuentas) => {
        if (cuentas) {
          this.cuentasContables.set(cuentas);
          this.dataSourceCuentas.data = cuentas;
        } else {
          this.cuentasContables.set([]);
          this.dataSourceCuentas.data = [];
        }
      },
      error: (err) => {
        console.error('Error al cargar cuentas:', err);
        this.mostrarError('Error al cargar cuentas contables');
      },
    });
  }

  nuevaCuenta(): void {
    this.formCuenta.reset({
      empresa: this.empresa,
      titular: this.proveedorSeleccionado()?.codigo,
      tipoPersona: 2, // Proveedor
      tipoCuenta: 1, // Facturas
      estado: 1,
    });
    this.cuentaSeleccionada.set(null);
    this.cuentaEditando.set(null);
  }

  seleccionarPlanCuenta(): void {
    const dialogRef = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '80%',
      maxWidth: '900px',
    });

    dialogRef.afterClosed().subscribe((cuenta: PlanCuenta) => {
      if (cuenta) {
        this.cuentaSeleccionada.set(cuenta);
        this.formCuenta.patchValue({ planCuenta: cuenta.codigo });
      }
    });
  }

  guardarCuenta(): void {
    if (this.formCuenta.invalid) {
      this.mostrarError('Por favor complete todos los campos requeridos');
      return;
    }

    const cuenta: PersonaCuentaContable = this.formCuenta.value;

    const operacion$ = this.cuentaEditando()
      ? this.cuentaContableService.update(cuenta)
      : this.cuentaContableService.add(cuenta);

    operacion$.subscribe({
      next: () => {
        this.mostrarExito('Cuenta contable guardada correctamente');
        this.cargarCuentasProveedor(this.proveedorSeleccionado()?.codigo || 0);
        this.formCuenta.reset();
        this.cuentaSeleccionada.set(null);
      },
      error: (err) => {
        console.error('Error al guardar cuenta:', err);
        this.mostrarError('Error al guardar cuenta contable');
      },
    });
  }

  eliminarCuenta(cuenta: PersonaCuentaContable): void {
    const dialogRef = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData>(
      ConfirmDialogComponent,
      {
        width: '400px',
        data: {
          title: 'Confirmar Eliminación',
          message: '¿Está seguro de eliminar esta cuenta contable?',
          confirmText: 'Eliminar',
          cancelText: 'Cancelar',
        },
      }
    );

    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed && cuenta.codigo) {
        this.cuentaContableService.delete(cuenta.codigo).subscribe({
          next: () => {
            this.mostrarExito('Cuenta contable eliminada correctamente');
            this.cargarCuentasProveedor(this.proveedorSeleccionado()?.codigo || 0);
          },
          error: (err) => {
            console.error('Error al eliminar cuenta:', err);
            this.mostrarError('Error al eliminar cuenta contable');
          },
        });
      }
    });
  }

  // ════════════════════════════════════════════════════════════════════════════
  // NAVEGACIÓN
  // ════════════════════════════════════════════════════════════════════════════

  cancelar(): void {
    this.modoVista.set('lista');
    this.proveedorSeleccionado.set(null);
    this.formProveedor.reset();
  }

  volverALista(): void {
    this.modoVista.set('lista');
    this.proveedorSeleccionado.set(null);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ════════════════════════════════════════════════════════════════════════════

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['snackbar-success'],
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['snackbar-error'],
    });
  }

  obtenerNombreTipoCuenta(tipo: number): string {
    const opcion = this.opcionesTipoCuenta.find((o) => o.value === tipo);
    return opcion?.label || 'Desconocido';
  }

  obtenerNombreEstado(estado: number): string {
    const opcion = this.opcionesEstado.find((o) => o.value === estado);
    return opcion?.label || 'Desconocido';
  }

  obtenerClaseEstado(estado: number): string {
    return estado === 1 ? 'estado-activo' : 'estado-inactivo';
  }
}
