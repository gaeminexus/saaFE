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
import { ExportService } from '../../../../shared/services/export.service';
import { BancoExterno } from '../../model/banco-externo.model';
import { CuentaBancariaTitular } from '../../model/cuenta-bancaria-titular';
import { BancoExternoService } from '../../service/banco-externo.service';
import { CuentaBancariaTitularService } from '../../service/cuenta-bancaria-titular.service';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

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
  private exportService = inject(ExportService);
  private bancoExternoService = inject(BancoExternoService);
  private cuentaBancariaService = inject(CuentaBancariaTitularService);

  // Signals principales
  vistaActual = signal<Vista>('lista');
  loading = signal<boolean>(false);
  titulares = signal<Titular[]>([]);
  titularSeleccionado = signal<TitularConRoles | null>(null);
  busqueda = signal<string>('');
  rolFiltro = signal<number | null>(null);
  rolesTitular = signal<PersonaRol[]>([]);
  cuentasTitular = signal<PersonaCuentaContable[]>([]);
  rolesEnEdicion = signal<RolEnEdicion[]>([]);
  estadoGuardado = signal<'idle' | 'guardando' | 'guardado' | 'error'>('idle');

  // Datos para combos
  rolesDisponibles = signal<DetalleRubro[]>([]);
  tiposCuenta = signal<DetalleRubro[]>([]);
  tiposPersona = signal<DetalleRubro[]>([]);
  tiposIdentificacion = signal<DetalleRubro[]>([]);
  paises = signal<Pais[]>([]);
  paisesFiltrados = signal<Pais[]>([]);
  // Cuentas bancarias del titular en edición
  cuentasBancariasEnEdicion = signal<CuentaBancariaTitular[]>([]);
  bancos = signal<BancoExterno[]>([]);
  bancosFiltrados = signal<BancoExterno[]>([]);
  tiposCuentaBancaria = signal<DetalleRubro[]>([]);
  formCuentaBancaria!: FormGroup;
  modoFormCuentaBancaria = signal<'oculto' | 'nuevo' | 'editar'>('oculto');
  cuentaBancariaEditando = signal<CuentaBancariaTitular | null>(null);

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

  resumenSaldos = computed(() => {
    const titularesCodigos = new Set(this.titularesFiltrados().map(t => t.codigo));
    const roles = this.rolesTitular().filter(r => r.titular?.codigo && titularesCodigos.has(r.titular.codigo));
    const rolesCodigos = new Set(roles.map(r => r.codigo));
    const cuentas = this.cuentasTitular().filter(c => c.personaRol?.codigo && rolesCodigos.has(c.personaRol.codigo));
    const rolMap = new Map(roles.map(r => [r.codigo, r]));
    let factCliente = 0, factProveedor = 0, antCliente = 0, antProveedor = 0;
    for (const c of cuentas) {
      const s = c.saldoInicial || 0;
      let esProveedor: boolean;
      if (c.tipoPersona === 1) {
        esProveedor = false;
      } else if (c.tipoPersona === 2) {
        esProveedor = true;
      } else {
        // tipoPersona es null: inferir desde la descripción del rubro del rol
        const rol = rolMap.get(c.personaRol?.codigo);
        const desc = (this.rolesDisponibles().find(r => r.codigoAlterno === rol?.rubroRolPersonaH)?.descripcion || '').toLowerCase();
        esProveedor = desc.includes('proveedor');
      }
      if (c.tipoCuenta === 1) {
        if (esProveedor) factProveedor += s; else factCliente += s;
      } else if (c.tipoCuenta === 2) {
        if (esProveedor) antProveedor += s; else antCliente += s;
      }
    }
    return { factCliente, factProveedor, antCliente, antProveedor };
  });

  // Retorna los roles (con sus cuentas) de un titular, respetando el filtro de rol activo
  getRolesConCuentasDeTitular(titularCodigo: number): { rol: PersonaRol; cuentas: PersonaCuentaContable[] }[] {
    const rolFiltroActual = this.rolFiltro();
    const roles = this.rolesTitular().filter(r =>
      r.titular?.codigo === titularCodigo &&
      (!rolFiltroActual || r.rubroRolPersonaH === rolFiltroActual)
    );
    return roles.map(rol => ({
      rol,
      cuentas: this.cuentasTitular().filter(c => c.personaRol?.codigo === rol.codigo),
    }));
  }

  getNombreRol(rubroRolPersonaH: number): string {
    return this.rolesDisponibles().find(r => r.codigoAlterno === rubroRolPersonaH)?.descripcion || String(rubroRolPersonaH);
  }

  getTipoCuentaLabel(tipoCuenta: number): string {
    const labels: Record<number, string> = { 1: 'Facturas', 2: 'Anticipos', 3: 'Retenciones', 4: 'Otros' };
    return labels[tipoCuenta] || String(tipoCuenta);
  }

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

    this.formCuentaBancaria = this.fb.group({
      codigo: [0],
      banco: [null, Validators.required],
      bancoBusqueda: [''],
      tipoCuenta: [null, Validators.required],
      numeroCuenta: ['', [Validators.required, Validators.maxLength(50)]],
      observaciones: ['', Validators.maxLength(500)],
      estado: [1, Validators.required],
    });

    this.formCuentaBancaria.get('bancoBusqueda')?.valueChanges.subscribe((value) => {
      this.filtrarBancos(value || '');
    });

    this.formNuevaRol = this.fb.group({
      // rubroRolPersonaP = codigoAlterno del rubro padre, siempre 55
      // rubroRolPersonaH = codigoAlterno del detalle (el rol que elige el usuario)
      rubroRolPersonaH: ['', Validators.required],
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
    const RUBRO_TIPO_CUENTA_BANCARIA = 23;

    const rolesMemoria = this.detalleService.getDetallesByParent(RUBRO_ROL_PERSONA);
    const tiposCuentaMemoria = this.detalleService.getDetallesByParent(RUBRO_TIPO_CUENTA);
    const tiposPersonaMemoria = this.detalleService.getDetallesByParent(RUBRO_TIPO_PERSONA);
    const tiposIdentificacionMemoria = this.detalleService.getDetallesByParent(RUBRO_TIPO_IDENTIFICACION);
    const tiposCuentaBancariaMemoria = this.detalleService.getDetallesByParent(RUBRO_TIPO_CUENTA_BANCARIA);

    if (rolesMemoria.length > 0) {
      this.rolesDisponibles.set(rolesMemoria);
      this.tiposCuenta.set(tiposCuentaMemoria);
      this.tiposPersona.set(tiposPersonaMemoria);
      this.tiposIdentificacion.set(tiposIdentificacionMemoria);
      this.tiposCuentaBancaria.set(tiposCuentaBancariaMemoria);
    } else {
      // Fallback: pedir al servidor si la caché aún no tiene datos
      this.detalleService.getAll().pipe(catchError(() => of([] as DetalleRubro[]))).subscribe(all => {
        const todos = all || [];
        this.rolesDisponibles.set(todos.filter((item) => item.rubro?.codigoAlterno === RUBRO_ROL_PERSONA));
        this.tiposCuenta.set(todos.filter((item) => item.rubro?.codigoAlterno === RUBRO_TIPO_CUENTA));
        this.tiposPersona.set(todos.filter((item) => item.rubro?.codigoAlterno === RUBRO_TIPO_PERSONA));
        this.tiposIdentificacion.set(todos.filter((item) => item.rubro?.codigoAlterno === RUBRO_TIPO_IDENTIFICACION));
        this.tiposCuentaBancaria.set(todos.filter((item) => item.rubro?.codigoAlterno === RUBRO_TIPO_CUENTA_BANCARIA));
      });
    }

    // Cargar bancos externos para los combos
    this.bancoExternoService.getAll().pipe(catchError(() => of([] as BancoExterno[]))).subscribe(bancos => {
      this.bancos.set(bancos || []);
      this.bancosFiltrados.set(bancos || []);
    });

    this.loading.set(true);
    forkJoin({
      titulares: this.titularService.getAll().pipe(catchError(() => of([] as Titular[]))),
      personaRoles: this.rolService.getAll().pipe(catchError(() => of([] as PersonaRol[]))),
      cuentas: this.cuentaService.getAll().pipe(catchError(() => of([] as PersonaCuentaContable[]))),
    }).subscribe({
      next: (datos) => {
        this.titulares.set(datos.titulares || []);
        this.rolesTitular.set(datos.personaRoles || []);
        this.cuentasTitular.set(datos.cuentas || []);
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
        this.cargarCuentasBancariasDelTitular(titular.codigo!);
        this.modoFormCuentaBancaria.set('oculto');
        this.vistaActual.set('editar');
        this.loading.set(false);
      },
      error: () => {
        this.titularSeleccionado.set({ ...titular, rolesConCuentas: [] });
        this.rolesEnEdicion.set(
          rolesFiltrados.map((rol) => ({ rol, cuentas: [], expandido: false }))
        );
        this.cargarDatosTitularEnFormulario(titular);
        this.cargarCuentasBancariasDelTitular(titular.codigo!);
        this.modoFormCuentaBancaria.set('oculto');
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
    this.cuentasBancariasEnEdicion.set([]);
    this.modoFormCuentaBancaria.set('oculto');
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
      diasCredito,
      rubroRolPersonaP: RUBRO_ROL_PERSONA,  // siempre 55
      titular: { codigo: titular.codigo },
      empresa: { codigo: empresaCodigo },
      estado: 1,
    };

    this.rolService.add(rolData).subscribe({
      next: () => {

        this.formNuevaRol.reset({ rubroRolPersonaH: '', diasCredito: 0, estado: 1 });
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

  agregarCuentaARol(rolEnEdicion: RolEnEdicion, tipoCuenta: number, saldoInicial: number = 0): void {
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
      width: '95vw',
      maxWidth: '1100px',
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
          saldoInicial,
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

  editarSaldoCuenta(rolEnEdicion: RolEnEdicion, cuenta: PersonaCuentaContable): void {
    const saldoActual = cuenta.saldoInicial || 0;
    const saldoStr = window.prompt(
      `Saldo inicial para ${this.getTipoCuentaDescripcion(cuenta.tipoCuenta)} - ${cuenta.planCuenta?.nombre || ''}:`,
      saldoActual.toString()
    );
    if (saldoStr === null) { return; }
    const nuevoSaldo = parseFloat(saldoStr);
    if (isNaN(nuevoSaldo) || nuevoSaldo < 0) {
      this.snackBar.open('El saldo inicial debe ser un número válido >= 0', 'Cerrar', { duration: 3000 });
      return;
    }
    const payload: any = {
      codigo: cuenta.codigo,
      personaRol: { codigo: cuenta.personaRol.codigo },
      empresa: { codigo: cuenta.empresa.codigo },
      planCuenta: { codigo: cuenta.planCuenta.codigo },
      tipoCuenta: cuenta.tipoCuenta,
      tipoPersona: cuenta.tipoPersona ?? null,
      saldoInicial: nuevoSaldo,
    };
    this.cuentaService.update(payload).subscribe({
      next: () => {
        this.recargarCuentasRol(rolEnEdicion.rol.codigo);
        this.snackBar.open('Saldo inicial actualizado', 'Cerrar', { duration: 2000 });
      },
      error: () => this.snackBar.open('Error al actualizar saldo', 'Cerrar', { duration: 3000 }),
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
    this.formNuevaRol.reset({ rubroRolPersonaH: '', diasCredito: 0, estado: 1 });
    this.cargarDatos();
  }

  editarDatosRol(rolEnEdicion: RolEnEdicion): void {
    const rol = rolEnEdicion.rol;
    const diasCreditoActual = Number(rol.diasCredito ?? 0);

    const diasStr = window.prompt(
      `Ingrese los días de crédito para el rol ${this.obtenerNombreRubrica(rol.rubroRolPersonaH)}:`,
      diasCreditoActual.toString()
    );

    if (diasStr === null) {
      return;
    }

    const nuevosDias = Number(diasStr);

    if (Number.isNaN(nuevosDias) || nuevosDias < 0) {
      this.snackBar.open('Días de crédito debe ser un número válido >= 0', 'Cerrar', { duration: 3000 });
      return;
    }

    const rolActualizado: PersonaRol = {
      ...rol,
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

  // ==================== EXPORTAR CSV ====================

  exportarCSV(): void {
    const titulares = this.titularesFiltrados();
    if (!titulares.length) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const TIPO_CUENTA: Record<number, string> = {
      1: 'Facturas', 2: 'Anticipos', 3: 'Retenciones', 4: 'Otros',
    };

    const rolFiltroActual = this.rolFiltro();
    const rows: Record<string, any>[] = [];

    for (const titular of titulares) {
      const rolesConCuentas = this.getRolesConCuentasDeTitular(titular.codigo);

      if (rolesConCuentas.length === 0) {
        rows.push({
          identificacion: titular.identificacion || '',
          razonSocial: titular.razonSocial || '',
          nombre: titular.nombre || '',
          email: titular.email || '',
          telefono: titular.telefono || '',
          direccion: titular.direccion || '',
          estado: titular.estado === 1 ? 'Activo' : 'Inactivo',
          rol: '',
          saldoInicial: '',
          diasCredito: '',
          tipoCuenta: '',
          cuentaContable: '',
        });
      } else {
        for (const rc of rolesConCuentas) {
          const rolNombre = this.rolesDisponibles().find(
            r => r.codigoAlterno === rc.rol.rubroRolPersonaH
          )?.descripcion || String(rc.rol.rubroRolPersonaH);

          if (!rc.cuentas || rc.cuentas.length === 0) {
            rows.push({
              identificacion: titular.identificacion || '',
              razonSocial: titular.razonSocial || '',
              nombre: titular.nombre || '',
              email: titular.email || '',
              telefono: titular.telefono || '',
              direccion: titular.direccion || '',
              estado: titular.estado === 1 ? 'Activo' : 'Inactivo',
              rol: rolNombre,
              saldoInicial: '',
              diasCredito: rc.rol.diasCredito ?? '',
              tipoCuenta: '',
              cuentaContable: '',
            });
          } else {
            for (const cuenta of rc.cuentas) {
              rows.push({
                identificacion: titular.identificacion || '',
                razonSocial: titular.razonSocial || '',
                nombre: titular.nombre || '',
                email: titular.email || '',
                telefono: titular.telefono || '',
                direccion: titular.direccion || '',
                estado: titular.estado === 1 ? 'Activo' : 'Inactivo',
                rol: rolNombre,
                saldoInicial: cuenta.saldoInicial ?? '',
                diasCredito: rc.rol.diasCredito ?? '',
                tipoCuenta: TIPO_CUENTA[cuenta.tipoCuenta] || String(cuenta.tipoCuenta),
                cuentaContable: cuenta.planCuenta
                  ? `${cuenta.planCuenta.codigo} - ${cuenta.planCuenta.nombre}`
                  : '',
              });
            }
          }
        }
      }
    }

    const headers = [
      'Identificación', 'Razón Social', 'Nombre', 'Email', 'Teléfono',
      'Dirección', 'Estado', 'Rol', 'Saldo Inicial', 'Días Crédito',
      'Tipo Cuenta', 'Cuenta Contable',
    ];
    const keys = [
      'identificacion', 'razonSocial', 'nombre', 'email', 'telefono',
      'direccion', 'estado', 'rol', 'saldoInicial', 'diasCredito',
      'tipoCuenta', 'cuentaContable',
    ];

    const rolLabel = rolFiltroActual
      ? this.rolesDisponibles().find(r => r.codigoAlterno === rolFiltroActual)?.descripcion || 'rol'
      : 'todos';
    const fecha = new Date().toISOString().slice(0, 10);

    this.exportService.exportToCSV(rows, `titulares_${rolLabel}_${fecha}`, headers, keys);
    this.snackBar.open(`${rows.length} registros exportados`, 'Cerrar', { duration: 3000 });
  }

  // ========== CUENTAS BANCARIAS DEL TITULAR ==========

  cargarCuentasBancariasDelTitular(titularCodigo: number): void {
    if (!titularCodigo || titularCodigo === 0) {
      this.cuentasBancariasEnEdicion.set([]);
      return;
    }
    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(TipoDatos.LONG, 'titular', 'codigo', String(titularCodigo), TipoComandosBusqueda.IGUAL);
    this.cuentaBancariaService.selectByCriteria([criterio]).pipe(
      catchError(() => of([] as CuentaBancariaTitular[]))
    ).subscribe(res => {
      this.cuentasBancariasEnEdicion.set(res || []);
    });
  }

  nuevaCuentaBancaria(): void {
    this.cuentaBancariaEditando.set(null);
    this.formCuentaBancaria.reset({
      codigo: null,
      banco: null,
      bancoBusqueda: '',
      tipoCuenta: null,
      numeroCuenta: '',
      observaciones: '',
      estado: 1,
    });
    this.modoFormCuentaBancaria.set('nuevo');
  }

  editarCuentaBancaria(cuenta: CuentaBancariaTitular): void {
    this.cuentaBancariaEditando.set(cuenta);
    const bancoCodigo = typeof cuenta.banco === 'object' ? (cuenta.banco as any).codigo : cuenta.banco;
    const bancoNombre = this.bancos().find((b) => b.codigo === bancoCodigo)?.nombre || '';
    this.formCuentaBancaria.patchValue({
      codigo: cuenta.codigo,
      banco: bancoCodigo,
      bancoBusqueda: bancoNombre,
      tipoCuenta: cuenta.tipoCuenta,
      numeroCuenta: cuenta.numeroCuenta,
      observaciones: cuenta.observaciones || '',
      estado: cuenta.estado,
    });
    this.modoFormCuentaBancaria.set('editar');
  }

  filtrarBancos(value: string | BancoExterno | null): void {
    let filtro = '';
    if (typeof value === 'string') {
      filtro = value;
    } else if (value && typeof value === 'object' && 'nombre' in value) {
      filtro = (value as BancoExterno).nombre;
    }

    if (!filtro || filtro.trim() === '') {
      this.bancosFiltrados.set(this.bancos());
      return;
    }

    const filtroLower = filtro.toLowerCase().trim();
    this.bancosFiltrados.set(
      this.bancos().filter((b) => b.nombre?.toLowerCase().includes(filtroLower))
    );
  }

  onBancoSelected(banco: BancoExterno): void {
    this.formCuentaBancaria.get('banco')?.setValue(banco.codigo, { emitEvent: false });
    this.formCuentaBancaria.get('bancoBusqueda')?.setValue(banco.nombre, { emitEvent: false });
  }

  guardarCuentaBancaria(): void {
    if (!this.formCuentaBancaria.valid) {
      this.formCuentaBancaria.markAllAsTouched();
      this.snackBar.open('Complete los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const titular = this.titularSeleccionado();
    if (!titular?.codigo) {
      this.snackBar.open('Debe guardar el titular antes de agregar cuentas bancarias', 'Cerrar', { duration: 4000 });
      return;
    }

    const v = this.formCuentaBancaria.value;
    const usuario = localStorage.getItem('userName') || localStorage.getItem('usuario') || 'sistema';

    const payload: any = {
      codigo: v.codigo || null,
      titular: { codigo: titular.codigo },
      banco: { codigo: v.banco },
      tipoCuenta: v.tipoCuenta,
      numeroCuenta: v.numeroCuenta,
      observaciones: v.observaciones || '',
      estado: v.estado,
      usuarioCreacion: usuario,
    };

    const esNuevo = !payload.codigo || payload.codigo === 0;
    const op = esNuevo
      ? this.cuentaBancariaService.add(payload)
      : this.cuentaBancariaService.update(payload);

    op.pipe(catchError(() => of(null))).subscribe(res => {
      if (res !== undefined) {
        this.snackBar.open(esNuevo ? 'Cuenta bancaria agregada' : 'Cuenta bancaria actualizada', 'Cerrar', { duration: 3000 });
        this.modoFormCuentaBancaria.set('oculto');
        this.cargarCuentasBancariasDelTitular(titular.codigo!);
      } else {
        this.snackBar.open('Error al guardar cuenta bancaria', 'Cerrar', { duration: 3000 });
      }
    });
  }

  eliminarCuentaBancaria(cuenta: CuentaBancariaTitular): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: { message: `¿Eliminar la cuenta bancaria ${cuenta.numeroCuenta}?` },
    });
    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado) {
        this.cuentaBancariaService.delete(cuenta.codigo).pipe(catchError(() => of(null))).subscribe(() => {
          this.snackBar.open('Cuenta bancaria eliminada', 'Cerrar', { duration: 3000 });
          const titular = this.titularSeleccionado();
          if (titular?.codigo) {
            this.cargarCuentasBancariasDelTitular(titular.codigo);
          }
        });
      }
    });
  }

  cancelarFormCuentaBancaria(): void {
    this.modoFormCuentaBancaria.set('oculto');
    this.cuentaBancariaEditando.set(null);
  }

  getNombreBanco(codigo: number | any): string {
    const cod = typeof codigo === 'object' ? codigo?.codigo : codigo;
    return this.bancos().find(b => b.codigo === cod)?.nombre || String(cod || '-');
  }

  getNombreTipoCuentaBancaria(tipo: number): string {
    return this.tiposCuentaBancaria().find(d => d.codigoAlterno === tipo)?.descripcion || String(tipo);
  }
}


