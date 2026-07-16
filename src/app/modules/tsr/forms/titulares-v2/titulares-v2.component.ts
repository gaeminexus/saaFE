import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Titular } from '../../model/titular';
import { PersonaRol } from '../../model/persona-rol';
import { PersonaCuentaContable } from '../../model/persona-cuenta-contable';
import { TitularService } from '../../service/titular.service';
import { PersonaRolService } from '../../service/persona-rol.service';
import { PersonaCuentaContableService } from '../../service/persona-cuenta-contable.service';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { PlanCuentaSelectorDialogComponent } from '../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';
import { ConfirmDialogComponent } from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { Empresa } from '../../../../shared/model/empresa';
import { PlanCuenta } from '../../../cnt/model/plan-cuenta';
import { Pais } from '../../../crd/model/pais';
import { PaisService } from '../../../crd/service/pais.service';

type Vista = 'lista' | 'editar';

interface TitularConRoles extends Titular {
  rolesConCuentas?: {
    rol: PersonaRol;
    cuentas: PersonaCuentaContable[];
  }[];
}

interface RolEnEdicion {
  rol: PersonaRol;
  cuentas: PersonaCuentaContable[];
  expandido: boolean;
}

@Component({
  selector: 'app-titulares-v2',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatCardModule,
    MatDialogModule,
    MatExpansionModule,
    MatTableModule,
    MatCheckboxModule,
    MatBadgeModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './titulares-v2.component.html',
  styleUrls: ['./titulares-v2.component.scss'],
})
export class TitularesV2Component implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private titularService = inject(TitularService);
  private rolService = inject(PersonaRolService);
  private cuentaService = inject(PersonaCuentaContableService);
  private detalleService = inject(DetalleRubroService);
  private paisService = inject(PaisService);

  // Signals principales
  vistaActual = signal<Vista>('lista');
  loading = signal<boolean>(false);
  titulares = signal<Titular[]>([]);
  titularSeleccionado = signal<TitularConRoles | null>(null);
  busqueda = signal<string>('');
  rolFiltro = signal<number | null>(null);
  rolesTitular = signal<PersonaRol[]>([]);
  rolesEnEdicion = signal<RolEnEdicion[]>([]);
  estadoGuardado = signal<'idle' | 'guardando' | 'guardado' | 'error'>('idle');

  // Datos para combos
  rolesDisponibles = signal<DetalleRubro[]>([]);
  tiposCuenta = signal<DetalleRubro[]>([]);
  tiposPersona = signal<DetalleRubro[]>([]);
  tiposIdentificacion = signal<DetalleRubro[]>([]);
  paises = signal<Pais[]>([]);
  paisesFiltrados = signal<Pais[]>([]);
  readonly tiposCuentaOpciones = [
    { codigo: 1, descripcion: 'Facturas' },
    { codigo: 2, descripcion: 'Anticipos' },
    { codigo: 3, descripcion: 'Retenciones' },
    { codigo: 4, descripcion: 'Otros' },
  ];

  // Material table
  columnasCuentas = ['planCuenta', 'tipoCuenta', 'tipoPersona', 'acciones'];
  dataSourceCuentas = new MatTableDataSource<PersonaCuentaContable>([]);

  // Paginación
  pageSize = 10;
  pageIndex = 0;

  // Empresa (de localStorage)
  empresa: Empresa | null = null;
  private ultimoNombreAutocopiado = '';

  // Formularios
  formTitular!: FormGroup;
  formNuevaRol!: FormGroup;

  // Computed
  titularesFiltrados = computed(() => {
    const busca = this.busqueda().toLowerCase().trim();
    const rolSeleccionado = this.rolFiltro();
    const roles = this.rolesTitular();

    return this.titulares().filter((titular) => {
      const cumpleTexto = !busca ||
        titular.nombre?.toLowerCase().includes(busca) ||
        titular.identificacion?.toLowerCase().includes(busca);

      if (!cumpleTexto) {
        return false;
      }

      if (!rolSeleccionado) {
        return true;
      }

      return roles.some((rol) =>
        rol.titular?.codigo === titular.codigo &&
        rol.rubroRolPersonaH === rolSeleccionado
      );
    });
  });

  totalFiltrados = computed(() => this.titularesFiltrados().length);
  esNuevo = computed(() => !this.titularSeleccionado()?.codigo || this.titularSeleccionado()!.codigo === 0);

  ngOnInit(): void {
    this.obtenerEmpresa();
    this.inicializarFormularios();
    this.cargarDatos();
    this.cargarPaises();
  }

  private obtenerEmpresa(): void {
    try {
      const datosEmpresa = localStorage.getItem('empresa');
      if (datosEmpresa) {
        this.empresa = JSON.parse(datosEmpresa);
      }
    } catch (e) {
      // Si hay error, empresa mantiene su valor null
    }
  }

  private inicializarFormularios(): void {
    this.formTitular = this.fb.group({
      codigo: [0],
      rubroTipoPersonaH: [null, Validators.required],
      rubroTipoIdentificacionH: [null, Validators.required],
      identificacion: ['', [Validators.required, Validators.maxLength(20)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      extranjero: [0],
      pais: [null],
      paisBusqueda: [''],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(200)]],
      estado: [1, Validators.required],
    });

    this.formTitular.get('razonSocial')?.valueChanges.subscribe((value) => {
      this.sincronizarNombreComercial(value);
    });

    this.formTitular.get('extranjero')?.valueChanges.subscribe((value) => {
      const paisControl = this.formTitular.get('pais');
      const paisBusquedaControl = this.formTitular.get('paisBusqueda');

      if (value === 1 || value === true) {
        paisControl?.enable();
        paisBusquedaControl?.enable();
      } else {
        paisControl?.disable();
        paisControl?.setValue(null);
        paisBusquedaControl?.disable();
        paisBusquedaControl?.setValue('');
      }
    });

    this.formTitular.get('paisBusqueda')?.valueChanges.subscribe((value) => {
      this.filtrarPaises(value || '');
    });

    this.formNuevaRol = this.fb.group({
      // rubroRolPersonaP = codigoAlterno del rubro padre, siempre 55
      // rubroRolPersonaH = codigoAlterno del detalle (el rol que elige el usuario)
      rubroRolPersonaH: ['', Validators.required],
      saldoInicial: [0, [Validators.required, Validators.min(0)]],
      diasCredito: [0, [Validators.required, Validators.min(0)]],
      estado: [1],
    });
  }

  private cargarDatos(): void {
    // Carga el catálogo desde la memoria (ya inicializado en el login)
    // usando los mismos IDs de rubro que usa Titulares V1
    const RUBRO_ROL_PERSONA = 55;
    const RUBRO_TIPO_CUENTA = 38;
    const RUBRO_TIPO_PERSONA = 35;
    const RUBRO_TIPO_IDENTIFICACION = 36;

    const rolesMemoria = this.detalleService.getDetallesByParent(RUBRO_ROL_PERSONA);
    const tiposCuentaMemoria = this.detalleService.getDetallesByParent(RUBRO_TIPO_CUENTA);
    const tiposPersonaMemoria = this.detalleService.getDetallesByParent(RUBRO_TIPO_PERSONA);
    const tiposIdentificacionMemoria = this.detalleService.getDetallesByParent(RUBRO_TIPO_IDENTIFICACION);

    if (rolesMemoria.length > 0) {
      this.rolesDisponibles.set(rolesMemoria);
      this.tiposCuenta.set(tiposCuentaMemoria);
      this.tiposPersona.set(tiposPersonaMemoria);
      this.tiposIdentificacion.set(tiposIdentificacionMemoria);
    } else {
      // Fallback: pedir al servidor si la caché aún no tiene datos
      this.detalleService.getAll().pipe(catchError(() => of([] as DetalleRubro[]))).subscribe(all => {
        const todos = all || [];
        this.rolesDisponibles.set(todos.filter((item) => item.rubro?.codigoAlterno === RUBRO_ROL_PERSONA));
        this.tiposCuenta.set(todos.filter((item) => item.rubro?.codigoAlterno === RUBRO_TIPO_CUENTA));
        this.tiposPersona.set(todos.filter((item) => item.rubro?.codigoAlterno === RUBRO_TIPO_PERSONA));
        this.tiposIdentificacion.set(todos.filter((item) => item.rubro?.codigoAlterno === RUBRO_TIPO_IDENTIFICACION));
      });
    }

    this.loading.set(true);
    forkJoin({
      titulares: this.titularService.getAll().pipe(catchError(() => of([] as Titular[]))),
      personaRoles: this.rolService.getAll().pipe(catchError(() => of([] as PersonaRol[]))),
    }).subscribe({
      next: (datos) => {
        this.titulares.set(datos.titulares || []);
        this.rolesTitular.set(datos.personaRoles || []);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Error al cargar datos', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  // ========== VISTA LISTA ==========

  abrirEdicion(titular: Titular): void {
    this.loading.set(true);

    // Filtrar desde los signals ya cargados en memoria
    const rolesFiltrados = this.rolesTitular().filter(
      (r) => r.titular?.codigo === titular.codigo
    );

    // Cargar cuentas contables solo para los roles de este titular
    this.cuentaService.getAll().pipe(catchError(() => of([] as PersonaCuentaContable[]))).subscribe({
      next: (todasLasCuentas) => {
        const cuentas = todasLasCuentas || [];
        const rolesCuentas = rolesFiltrados.map((rol) => ({
          rol,
          cuentas: cuentas.filter((c) => c.personaRol?.codigo === rol.codigo),
        }));

        this.titularSeleccionado.set({ ...titular, rolesConCuentas: rolesCuentas });
        this.rolesEnEdicion.set(
          rolesCuentas.map((rc) => ({
            rol: rc.rol,
            cuentas: rc.cuentas,
            expandido: false,
          }))
        );
        this.cargarDatosTitularEnFormulario(titular);
        this.vistaActual.set('editar');
        this.loading.set(false);
      },
      error: () => {
        this.titularSeleccionado.set({ ...titular, rolesConCuentas: [] });
        this.rolesEnEdicion.set(
          rolesFiltrados.map((rol) => ({ rol, cuentas: [], expandido: false }))
        );
        this.cargarDatosTitularEnFormulario(titular);
        this.vistaActual.set('editar');
        this.loading.set(false);
      },
    });
  }

  crearNuevoTitular(): void {
    this.titularSeleccionado.set({ codigo: 0, nombre: '', identificacion: '', razonSocial: '', estado: 1, extranjero: 0 });
    this.rolesEnEdicion.set([]);
    this.formTitular.reset({
      codigo: 0,
      rubroTipoPersonaH: null,
      rubroTipoIdentificacionH: null,
      identificacion: '',
      razonSocial: '',
      nombre: '',
      extranjero: 0,
      pais: null,
      paisBusqueda: '',
      telefono: '',
      email: '',
      direccion: '',
      estado: 1,
    });
    this.ultimoNombreAutocopiado = '';
    this.vistaActual.set('editar');
  }

  // ========== VISTA EDICIÓN ==========

  guardarTitular(): void {
    if (!this.formTitular.valid) {
      this.snackBar.open('Formulario inválido', 'Cerrar', { duration: 3000 });
      this.formTitular.markAllAsTouched();
      return;
    }

    this.estadoGuardado.set('guardando');

    const formValue = this.formTitular.getRawValue();
    const titular: any = {
      rubroTipoPersonaP: 35,
      rubroTipoPersonaH: formValue.rubroTipoPersonaH,
      rubroTipoIdentificacionP: 36,
      rubroTipoIdentificacionH: formValue.rubroTipoIdentificacionH,
      identificacion: formValue.identificacion,
      nombre: formValue.nombre,
      razonSocial: formValue.razonSocial,
      extranjero: formValue.extranjero || 0,
      pais: formValue.pais || null,
      telefono: formValue.telefono,
      email: formValue.email,
      direccion: formValue.direccion,
      estado: formValue.estado,
    };

    const operacion$ = this.esNuevo()
      ? this.titularService.add(titular)
      : this.titularService.update({ ...titular, codigo: formValue.codigo });

    operacion$.subscribe({
      next: (titularGuardado) => {
        if (this.esNuevo() && titularGuardado?.codigo) {
          this.formTitular.patchValue({ codigo: titularGuardado.codigo }, { emitEvent: false });
          this.titularSeleccionado.set({ ...formValue, codigo: titularGuardado.codigo });
        } else {
          this.titularSeleccionado.set({ ...formValue });
        }

        this.snackBar.open(
          this.esNuevo() ? 'Titular creado correctamente. Ahora puedes agregar roles y cuentas' : 'Titular actualizado correctamente',
          'Cerrar',
          { duration: 4000 }
        );

        // Actualizar lista sin salir de la pantalla
        this.cargarDatos();
        this.estadoGuardado.set('guardado');
      },
      error: (err) => {
        this.snackBar.open('Error al guardar', 'Cerrar', { duration: 3000 });
        this.estadoGuardado.set('error');
      },
    });
  }

  private cargarPaises(): void {
    this.paisService.getAll().pipe(catchError(() => of([] as Pais[]))).subscribe((data) => {
      const lista = data || [];
      this.paises.set(lista);
      this.paisesFiltrados.set(lista);
    });
  }

  private cargarDatosTitularEnFormulario(titular: Titular): void {
    this.formTitular.patchValue({
      codigo: titular.codigo,
      rubroTipoPersonaH: titular.rubroTipoPersonaH ?? null,
      rubroTipoIdentificacionH: titular.rubroTipoIdentificacionH ?? null,
      identificacion: titular.identificacion || '',
      razonSocial: titular.razonSocial || '',
      nombre: titular.nombre || '',
      extranjero: titular.extranjero || 0,
      pais: titular.pais || null,
      paisBusqueda: titular.pais?.nombre || '',
      telefono: titular.telefono || '',
      email: titular.email || '',
      direccion: titular.direccion || '',
      estado: titular.estado ?? 1,
    });
    this.ultimoNombreAutocopiado = titular.nombre === titular.razonSocial ? (titular.nombre || '') : '';
  }

  copiarRazonSocialANombre(): void {
    const razonSocial = this.formTitular.get('razonSocial')?.value;
    this.sincronizarNombreComercial(razonSocial);
  }

  private sincronizarNombreComercial(razonSocial: string | null | undefined): void {
    const nombreControl = this.formTitular.get('nombre');
    if (!nombreControl || !razonSocial) {
      return;
    }

    const nombreActual = `${nombreControl.value || ''}`.trim();
    const ultimoAutocopiado = `${this.ultimoNombreAutocopiado || ''}`.trim();
    const puedeSobrescribir = !nombreActual || nombreActual === ultimoAutocopiado;

    if (puedeSobrescribir) {
      nombreControl.setValue(razonSocial, { emitEvent: false });
      this.ultimoNombreAutocopiado = razonSocial;
    }
  }

  filtrarPaises(value: string | Pais | null): void {
    let filtro = '';
    if (typeof value === 'string') {
      filtro = value;
    } else if (value && typeof value === 'object' && 'nombre' in value) {
      filtro = value.nombre;
    }

    if (!filtro || filtro.trim() === '') {
      this.paisesFiltrados.set(this.paises());
      return;
    }

    const filtroLower = filtro.toLowerCase().trim();
    this.paisesFiltrados.set(
      this.paises().filter((p) => p.nombre.toLowerCase().includes(filtroLower))
    );
  }

  onPaisSelected(pais: Pais): void {
    this.formTitular.get('pais')?.setValue(pais, { emitEvent: false });
    this.formTitular.get('paisBusqueda')?.setValue(pais.nombre, { emitEvent: false });
  }

  agregarRolAlTitular(): void {
    if (!this.formNuevaRol.valid || !this.titularSeleccionado()) {
      this.snackBar.open('Datos incompletos', 'Cerrar', { duration: 3000 });
      return;
    }

    const codigoRol = Number(this.formNuevaRol.value.rubroRolPersonaH);
    if (this.rolYaAsignado(codigoRol)) {
      this.snackBar.open('Este rol ya está asignado', 'Cerrar', { duration: 3000 });
      return;
    }

    const RUBRO_ROL_PERSONA = 55;
    const saldoInicial = Number(this.formNuevaRol.value.saldoInicial ?? 0);
    const diasCredito = Number(this.formNuevaRol.value.diasCredito ?? 0);
    const titular = this.titularSeleccionado();
    const empresaCodigo = this.empresa?.codigo;

    if (!titular?.codigo || titular.codigo <= 0) {
      this.snackBar.open('Primero guarde el titular para poder agregar roles', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!empresaCodigo) {
      this.snackBar.open('No se pudo determinar la empresa de la sesión', 'Cerrar', { duration: 3000 });
      return;
    }

    // Payload equivalente a Titulares V1
    const rolData: any = {
      rubroRolPersonaH: codigoRol,
      diasVencimientoFactura: 0,
      calificacionRiesgo: '',
      saldoInicial,
      diasCredito,
      rubroRolPersonaP: RUBRO_ROL_PERSONA,  // siempre 55
      titular: { codigo: titular.codigo },
      empresa: { codigo: empresaCodigo },
      estado: 1,
    };

    this.rolService.add(rolData).subscribe({
      next: () => {

        this.formNuevaRol.reset({ rubroRolPersonaH: '', saldoInicial: 0, diasCredito: 0, estado: 1 });
        this.snackBar.open('Rol agregado', 'Cerrar', { duration: 2000 });

        // Refrescar roles desde backend y luego recargar edición
        // para que el nuevo rol aparezca inmediatamente.
        this.recargarRolesTitularYEdicion(titular.codigo);
      },
      error: () => {
        this.snackBar.open('Error al agregar rol', 'Cerrar', { duration: 3000 });
      },
    });
  }

  private recargarRolesTitularYEdicion(codigoTitular: number): void {
    this.rolService.getAll().pipe(catchError(() => of([] as PersonaRol[]))).subscribe((roles) => {
      this.rolesTitular.set(roles || []);

      const titularDesdeLista = this.titulares().find((t) => t.codigo === codigoTitular);
      const titularActual = titularDesdeLista || this.titularSeleccionado();
      if (titularActual) {
        this.abrirEdicion(titularActual);
      }
    });
  }

  agregarCuentaARol(rolEnEdicion: RolEnEdicion, tipoCuenta: number): void {
    if (!tipoCuenta) {
      this.snackBar.open('Seleccione un tipo de cuenta', 'Cerrar', { duration: 2500 });
      return;
    }

    if (this.tipoCuentaYaAsignado(rolEnEdicion, tipoCuenta)) {
      this.snackBar.open(`Ya existe una cuenta asignada para ${this.getTipoCuentaDescripcion(tipoCuenta)}`, 'Cerrar', { duration: 3000 });
      return;
    }

    const empresaCodigo = this.empresa?.codigo;
    if (!empresaCodigo) {
      this.snackBar.open('No se pudo determinar la empresa de la sesión', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!rolEnEdicion.rol?.codigo || rolEnEdicion.rol.codigo <= 0) {
      this.snackBar.open('Debe guardar/recargar el rol antes de asignar cuentas', 'Cerrar', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '600px',
      data: { titulo: 'Seleccionar Cuenta Contable' },
    });

    dialogRef.afterClosed().subscribe((cuentaSeleccionada: PlanCuenta) => {
      if (cuentaSeleccionada) {
        // Enviar payload igual que Titulares V1
        const cuentaPayload: any = {
          personaRol: { codigo: rolEnEdicion.rol.codigo },
          empresa: { codigo: empresaCodigo },
          planCuenta: { codigo: cuentaSeleccionada.codigo },
          tipoCuenta,
          tipoPersona: null,
        };

        this.cuentaService.add(cuentaPayload).subscribe({
          next: () => {
            this.recargarCuentasRol(rolEnEdicion.rol.codigo);
            this.snackBar.open('Cuenta agregada al rol', 'Cerrar', { duration: 2000 });
          },
          error: () => {
            this.snackBar.open('Error al agregar cuenta', 'Cerrar', { duration: 3000 });
          },
        });
      }
    });
  }

  private recargarCuentasRol(codigoRol: number): void {
    this.cuentaService.getAll().pipe(catchError(() => of([] as PersonaCuentaContable[]))).subscribe((todas) => {
      const cuentasRol = (todas || []).filter((c) => c.personaRol?.codigo === codigoRol);

      this.rolesEnEdicion.update((roles) =>
        roles.map((item) =>
          item.rol.codigo === codigoRol
            ? { ...item, cuentas: cuentasRol }
            : item
        )
      );
    });
  }

  tipoCuentaYaAsignado(rolEnEdicion: RolEnEdicion, tipoCuenta: number): boolean {
    return rolEnEdicion.cuentas.some((c) => Number(c.tipoCuenta) === Number(tipoCuenta));
  }

  getTipoCuentaDescripcion(tipo: number): string {
    switch (tipo) {
      case 1:
        return 'Facturas';
      case 2:
        return 'Anticipos';
      case 3:
        return 'Retenciones';
      case 4:
        return 'Otros';
      default:
        return 'Desconocido';
    }
  }

  eliminarCuentaRol(rolEnEdicion: RolEnEdicion, cuenta: PersonaCuentaContable): void {
    const confirm = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar cuenta',
        message: '¿Eliminar esta cuenta del rol?',
        type: 'danger',
        confirmText: 'Eliminar',
      },
    });

    confirm.afterClosed().subscribe((resultado) => {
      if (resultado) {
        this.cuentaService.delete(cuenta.codigo).subscribe({
          next: () => {
            rolEnEdicion.cuentas = rolEnEdicion.cuentas.filter(c => c.codigo !== cuenta.codigo);
            this.snackBar.open('Cuenta eliminada', 'Cerrar', { duration: 2000 });
            this.actualizarTabla(rolEnEdicion);
          },
          error: () => {
            this.snackBar.open('Error al eliminar', 'Cerrar', { duration: 3000 });
          },
        });
      }
    });
  }

  eliminarRol(rolEnEdicion: RolEnEdicion): void {
    const confirm = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Eliminar rol',
        message: '¿Eliminar este rol y todas sus cuentas?',
        type: 'danger',
        confirmText: 'Eliminar',
      },
    });

    confirm.afterClosed().subscribe((resultado) => {
      if (resultado) {
        this.rolService.delete(rolEnEdicion.rol.codigo).subscribe({
          next: () => {
            this.rolesEnEdicion.update(roles =>
              roles.filter(r => r.rol.codigo !== rolEnEdicion.rol.codigo)
            );
            this.snackBar.open('Rol eliminado', 'Cerrar', { duration: 2000 });
          },
          error: () => {
            this.snackBar.open('Error al eliminar rol', 'Cerrar', { duration: 3000 });
          },
        });
      }
    });
  }

  private actualizarTabla(rolEnEdicion: RolEnEdicion): void {
    this.dataSourceCuentas.data = [...rolEnEdicion.cuentas];
  }

  toggleRolExpandido(rolEnEdicion: RolEnEdicion): void {
    rolEnEdicion.expandido = !rolEnEdicion.expandido;
    if (rolEnEdicion.expandido) {
      this.actualizarTabla(rolEnEdicion);
    }
  }

  rolYaAsignado(codigoRol: number): boolean {
    if (!codigoRol) {
      return false;
    }

    return this.rolesEnEdicion().some((item) => item.rol.rubroRolPersonaH === codigoRol);
  }

  volverLista(): void {
    this.vistaActual.set('lista');
    this.titularSeleccionado.set(null);
    this.rolesEnEdicion.set([]);
    this.formTitular.reset();
    this.formNuevaRol.reset({ rubroRolPersonaH: '', saldoInicial: 0, diasCredito: 0, estado: 1 });
  }

  editarDatosRol(rolEnEdicion: RolEnEdicion): void {
    const rol = rolEnEdicion.rol;
    const saldoInicialActual = Number(rol.saldoInicial ?? 0);
    const diasCreditoActual = Number(rol.diasCredito ?? 0);

    const saldoStr = window.prompt(
      `Ingrese el saldo inicial para el rol ${this.obtenerNombreRubrica(rol.rubroRolPersonaH)}:`,
      saldoInicialActual.toString()
    );

    if (saldoStr === null) {
      return;
    }

    const diasStr = window.prompt(
      `Ingrese los días de crédito para el rol ${this.obtenerNombreRubrica(rol.rubroRolPersonaH)}:`,
      diasCreditoActual.toString()
    );

    if (diasStr === null) {
      return;
    }

    const nuevoSaldo = Number(saldoStr);
    const nuevosDias = Number(diasStr);

    if (Number.isNaN(nuevoSaldo) || nuevoSaldo < 0 || Number.isNaN(nuevosDias) || nuevosDias < 0) {
      this.snackBar.open('Saldo inicial y días de crédito deben ser números válidos >= 0', 'Cerrar', { duration: 3000 });
      return;
    }

    const rolActualizado: PersonaRol = {
      ...rol,
      saldoInicial: nuevoSaldo,
      diasCredito: nuevosDias,
    };

    this.rolService.update(rolActualizado).subscribe({
      next: (resp) => {
        const rolFinal = resp || rolActualizado;
        this.rolesEnEdicion.update((roles) =>
          roles.map((item) => (item.rol.codigo === rol.codigo ? { ...item, rol: rolFinal } : item))
        );
        this.rolesTitular.update((roles) =>
          roles.map((item) => (item.codigo === rol.codigo ? rolFinal : item))
        );

        this.titularSeleccionado.update((titular) => {
          if (!titular?.rolesConCuentas) {
            return titular;
          }

          return {
            ...titular,
            rolesConCuentas: titular.rolesConCuentas.map((rc) =>
              rc.rol.codigo === rol.codigo ? { ...rc, rol: rolFinal } : rc
            ),
          };
        });

        this.snackBar.open('Datos del rol actualizados', 'Cerrar', { duration: 2000 });
      },
      error: () => {
        this.snackBar.open('Error al actualizar datos del rol', 'Cerrar', { duration: 3000 });
      },
    });
  }

  cambiarPestana(selectedIndex: number): void {
    // Para futura funcionalidad si se necesita
  }

  obtenerNombreRubrica(rubroRolPersonaH: number): string {
    // rubroRolPersonaP = codigoAlterno del rubro padre (55)
    // rubroRolPersonaH = codigoAlterno del detalle dentro de ese rubro
    const detalle = this.rolesDisponibles().find((item) => item.codigoAlterno === rubroRolPersonaH);
    return detalle?.descripcion || `Rol ${rubroRolPersonaH}`;
  }

  obtenerNombreTipoCuenta(codigo: number): string {
    const detalle = this.tiposCuenta().find((t) => t.codigoAlterno === codigo || t.codigo === codigo);
    return detalle?.descripcion || this.getTipoCuentaDescripcion(codigo);
  }

  obtenerNombreTipoPersona(codigo: number): string {
    const detalle = this.tiposPersona().find((t) => t.codigoAlterno === codigo || t.codigo === codigo);
    return detalle?.descripcion || '';
  }
}

