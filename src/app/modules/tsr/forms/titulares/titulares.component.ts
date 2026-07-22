import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatCardModule } from '@angular/material/card';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { PersonaRol } from '../../model/persona-rol';
import { Titular } from '../../model/titular';
import { PersonaRolService } from '../../service/persona-rol.service';
import { TitularService } from '../../service/titular.service';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { PersonaCuentaContable } from '../../model/persona-cuenta-contable';
import { PersonaCuentaContableService } from '../../service/persona-cuenta-contable.service';
import { PlanCuentaSelectorDialogComponent } from '../../../../shared/components/plan-cuenta-selector-dialog/plan-cuenta-selector-dialog.component';
import { ConfirmDialogComponent } from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { PaisService } from '../../../crd/service/pais.service';
import { Pais } from '../../../crd/model/pais';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Empresa } from '../../../../shared/model/empresa';
import { ExportService } from '../../../../shared/services/export.service';

type Vista = 'lista' | 'form' | 'roles' | 'cuentas';

interface RolConCuentas {
  rol: PersonaRol;
  cuentas: PersonaCuentaContable[];
}

interface TitularConDetalles extends Titular {
  rolesConCuentas?: RolConCuentas[];
}

@Component({
  selector: 'app-titulares',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatChipsModule,
    MatBadgeModule,
    MatCardModule,
    MatDialogModule,
    MatAutocompleteModule,
  ],
  templateUrl: './titulares.component.html',
  styleUrls: ['./titulares.component.scss'],
})
export class TitularesComponent implements OnInit {
  // Signals para estado reactivo
  titulares = signal<Titular[]>([]);
  titularesFiltrados = signal<Titular[]>([]);
  titularesConDetalles = signal<TitularConDetalles[]>([]);
  tiposPersona = signal<DetalleRubro[]>([]);
  tiposIdentificacion = signal<DetalleRubro[]>([]);
  rolesDisponibles = signal<DetalleRubro[]>([]);
  rolesAsignados = signal<PersonaRol[]>([]);
  cuentasAsignadas = signal<PersonaCuentaContable[]>([]);
  paises = signal<Pais[]>([]);
  paisesFiltrados = signal<Pais[]>([]);
  loading = signal<boolean>(false);
  vistaActual = signal<Vista>('lista');
  titularSeleccionado = signal<Titular | null>(null);
  rolSeleccionado = signal<PersonaRol | null>(null);
  empresa: Empresa | null = null;

  // Formularios reactivos
  formTitular!: FormGroup;
  busqueda = signal<string>('');
  rolFiltro = signal<number | null>(null);

  // Computed
  totalRegistros = computed(() => this.titulares().length);
  totalFiltrados = computed(() => this.titularesFiltrados().length);
  esNuevo = computed(() => !this.titularSeleccionado() || this.titularSeleccionado()!.codigo === 0);
  tieneCambios = computed(() => this.formTitular?.dirty || false);

  // Computed para filtrar titulares con detalles (roles y cuentas)
  titularesFiltradosConDetalles = computed(() => {
    const filtro = this.busqueda().toLowerCase().trim();
    const titularesConDet = this.titularesConDetalles().length > 0
      ? this.titularesConDetalles()
      : this.titulares().map((titular) => ({
          ...titular,
          rolesConCuentas: [],
        }));

    if (!filtro) {
      return titularesConDet;
    }

    return titularesConDet.filter((t) => {
      const nombreComercial = (t.nombre || '').toLowerCase();
      const identificacion = (t.identificacion || '').toLowerCase();
      const razon = (t.razonSocial || '').toLowerCase();

      return (
        nombreComercial.includes(filtro) || identificacion.includes(filtro) || razon.includes(filtro)
      );
    });
  });

  // Códigos de rubro
  private readonly RUBRO_TIPO_PERSONA = 35;
  private readonly RUBRO_TIPO_IDENTIFICACION = 36;
  private readonly RUBRO_ROL_PERSONA = 55;
  private readonly RUBRO_TIPO_CUENTA_PERSONA = 99; // Tipo de cuenta (Facturas, Anticipos, etc.)

  constructor(
    private fb: FormBuilder,
    private titularService: TitularService,
    private detalleRuboService: DetalleRubroService,
    private personaRolService: PersonaRolService,
    private personaCuentaService: PersonaCuentaContableService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private paisService: PaisService,
    private exportService: ExportService,
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarEmpresa();
    this.cargarRubros();
    this.cargarPaises();
    this.cargarTitulares();
  }

  // ==================== INICIALIZACIÓN ====================

  private inicializarFormulario(): void {
    this.formTitular = this.fb.group({
      codigo: [0],
      rubroTipoPersonaH: [null, Validators.required],
      rubroTipoIdentificacionH: [null, Validators.required],
      identificacion: ['', [Validators.required, Validators.maxLength(20)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      extranjero: [0],
      pais: [null], // Pais object
      paisBusqueda: [''], // String para búsqueda en autocomplete
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(100)]],
      direccion: ['', [Validators.required, Validators.maxLength(200)]],
      estado: [1, Validators.required],
    });

    // Subscribirse a cambios de razonSocial para copiar automáticamente a nombre
    this.formTitular.get('razonSocial')?.valueChanges.subscribe((value) => {
      // Solo copiar si el campo nombre está vacío o si acabamos de crear el formulario
      const nombreControl = this.formTitular.get('nombre');
      if (nombreControl && value && !nombreControl.value) {
        nombreControl.setValue(value);
      }
    });

    // Subscribirse a cambios de extranjero para habilitar/deshabilitar campo pais
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

    // Subscribirse a cambios de paisBusqueda para filtrar países
    this.formTitular.get('paisBusqueda')?.valueChanges.subscribe((value) => {
      this.filtrarPaises(value || '');
    });
  }

  copiarRazonSocialANombre(): void {
    const razonSocial = this.formTitular.get('razonSocial')?.value;
    if (razonSocial) {
      this.formTitular.get('nombre')?.setValue(razonSocial);
    }
  }

  private cargarEmpresa(): void {
    const empresaStr = sessionStorage.getItem('empresa') || localStorage.getItem('empresa');
    if (empresaStr) {
      try {
        this.empresa = JSON.parse(empresaStr);
      } catch (e) {
        // Error parsing empresa
      }
    }

    if (!this.empresa) {
      const codigo = this.getEmpresaCodigo();
      if (codigo) {
        this.empresa = {
          codigo,
          nombre: sessionStorage.getItem('empresaName') || localStorage.getItem('empresaName') || 'Empresa',
          jerarquia: {} as any,
          nivel: 0,
          codigoPadre: 0,
          ingresado: 0,
        };
      }
    }
  }

  private getEmpresaCodigo(): number | null {
    if (this.empresa?.codigo) {
      return this.empresa.codigo;
    }

    const idEmpresa = sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa');
    if (idEmpresa) {
      const codigo = parseInt(idEmpresa, 10);
      if (!isNaN(codigo)) return codigo;
    }

    const empresaId = sessionStorage.getItem('empresaId') || localStorage.getItem('empresaId');
    if (empresaId) {
      const codigo = parseInt(empresaId, 10);
      if (!isNaN(codigo)) return codigo;
    }

    const idSucursal = sessionStorage.getItem('idSucursal') || localStorage.getItem('idSucursal');
    if (idSucursal) {
      const codigo = parseInt(idSucursal, 10);
      if (!isNaN(codigo)) return codigo;
    }

    const empresaStr = sessionStorage.getItem('empresa') || localStorage.getItem('empresa');
    if (empresaStr) {
      try {
        const empresaObj = JSON.parse(empresaStr);
        const codigo = Number(empresaObj?.codigo);
        return isNaN(codigo) ? null : codigo;
      } catch {
        return null;
      }
    }

    return null;
  }

  private cargarRubros(): void {
    const tipos = this.detalleRuboService.getDetallesByParent(this.RUBRO_TIPO_PERSONA);
    const tiposId = this.detalleRuboService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION);
    const roles = this.detalleRuboService.getDetallesByParent(this.RUBRO_ROL_PERSONA);

    this.tiposPersona.set(tipos);
    this.tiposIdentificacion.set(tiposId);
    this.rolesDisponibles.set(roles);
  }

  private cargarPaises(): void {
    this.paisService.getAll().subscribe({
      next: (data) => {
        if (data) {
          this.paises.set(data);
          this.paisesFiltrados.set(data);
        }
      },
    });
  }

  filtrarPaises(value: string | Pais | null): void {
    // Extraer string del valor (puede ser string o objeto Pais)
    let filtro = '';
    if (typeof value === 'string') {
      filtro = value;
    } else if (value && typeof value === 'object' && 'nombre' in value) {
      // Si es un objeto Pais, extraer el nombre
      filtro = value.nombre;
    }

    if (!filtro || filtro.trim() === '') {
      this.paisesFiltrados.set(this.paises());
      return;
    }

    const filtroLower = filtro.toLowerCase().trim();
    const filtrados = this.paises().filter((p) =>
      p.nombre.toLowerCase().includes(filtroLower)
    );
    this.paisesFiltrados.set(filtrados);
  }

  onPaisSelected(pais: Pais): void {
    this.formTitular.get('pais')?.setValue(pais, { emitEvent: false });
    this.formTitular.get('paisBusqueda')?.setValue(pais.nombre, { emitEvent: false });
  }

  // ==================== CARGA DE DATOS ====================

  cargarTitulares(): void {
    this.loading.set(true);

    // Si hay filtro de rol seleccionado, filtrar por rol
    if (this.rolFiltro()) {
      this.filtrarPorRol();
      return;
    }

    // Cargar todos los titulares activos
    const db = new DatosBusqueda();
    db.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'estado',
      '1',
      TipoComandosBusqueda.IGUAL
    );
    db.setNumeroCampoRepetido(0);

    this.titularService.selectByCriteria([db]).subscribe({
      next: (data) => {
        const titulares = data || [];
        this.titulares.set(titulares);
        this.titularesFiltrados.set(titulares);

        // Cargar roles y cuentas de cada titular
        if (titulares.length > 0) {
          this.cargarDetallesTitulares(titulares);
        } else {
          this.titularesConDetalles.set([]);
          this.loading.set(false);
          this.mostrarExito('No se encontraron titulares activos');
        }
      },
      error: (err) => {
        // Si el error es porque no hay registros, tratarlo como resultado válido
        const errorMsg = err?.toString() || '';
        if (errorMsg.includes('no devolvio ningun registro') || errorMsg.includes('no devolvi')) {
          this.titulares.set([]);
          this.titularesFiltrados.set([]);
          this.titularesConDetalles.set([]);
          this.loading.set(false);
          this.mostrarExito('No se encontraron titulares activos');
        } else {
          this.mostrarError('Error al cargar titulares');
          this.loading.set(false);
        }
      },
    });
  }

  private cargarDetallesTitulares(titulares: Titular[]): void {
    const empresaCodigo = this.getEmpresaCodigo();
    if (!empresaCodigo) {
      const titularesBasicos: TitularConDetalles[] = titulares.map((t) => ({
        ...t,
        rolesConCuentas: [],
      }));
      this.titularesConDetalles.set(titularesBasicos);
      this.loading.set(false);
      return;
    }

    // Crear observables para cargar roles de cada titular
    const rolesObservables = titulares.map(titular => {
      const criteriosRol: DatosBusqueda[] = [];

      const dbTitular = new DatosBusqueda();
      dbTitular.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'titular',
        'codigo',
        titular.codigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      dbTitular.setNumeroCampoRepetido(0);
      criteriosRol.push(dbTitular);

      const dbEmpresa = new DatosBusqueda();
      dbEmpresa.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'empresa',
        'codigo',
        empresaCodigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      dbEmpresa.setNumeroCampoRepetido(0);
      criteriosRol.push(dbEmpresa);

      return this.personaRolService.selectByCriteria(criteriosRol).pipe(
        catchError(() => of([]))
      );
    });

    forkJoin(rolesObservables).subscribe({
      next: (resultadosRoles) => {
        // Crear observables para cargar cuentas de cada rol
        const cuentasObservables: any[] = [];
        const titularesConRoles: TitularConDetalles[] = titulares.map((titular, index) => {
          const roles: PersonaRol[] = resultadosRoles[index] || [];
          return {
            ...titular,
            rolesConCuentas: roles.map(rol => {
              // Guardar índice para mapear después
              cuentasObservables.push({
                titularCodigo: titular.codigo,
                rolCodigo: rol.codigo,
                observable: this.cargarCuentasPorRol(rol.codigo)
              });
              return { rol, cuentas: [] };
            })
          };
        });

        // Si hay cuentas para cargar, hacerlo
        if (cuentasObservables.length > 0) {
          forkJoin(cuentasObservables.map(c => c.observable)).subscribe({
            next: (resultadosCuentas) => {
              // Mapear cuentas a sus roles correspondientes
              resultadosCuentas.forEach((cuentas, index) => {
                const { titularCodigo, rolCodigo } = cuentasObservables[index];
                const titular = titularesConRoles.find(t => t.codigo === titularCodigo);
                if (titular && titular.rolesConCuentas) {
                  const rolConCuentas = titular.rolesConCuentas.find(rc => rc.rol.codigo === rolCodigo);
                  if (rolConCuentas) {
                    rolConCuentas.cuentas = cuentas || [];
                  }
                }
              });

              this.titularesConDetalles.set(titularesConRoles);
              this.loading.set(false);
              this.mostrarExito(`${titulares.length} titulares cargados con sus roles y cuentas`);
            },
            error: () => {
              // Aunque falle la carga de cuentas, mostrar lo que ya tenemos
              this.titularesConDetalles.set(titularesConRoles);
              this.loading.set(false);
              this.mostrarExito(`${titulares.length} titulares cargados`);
            }
          });
        } else {
          this.titularesConDetalles.set(titularesConRoles);
          this.loading.set(false);
          this.mostrarExito(`${titulares.length} titulares cargados`);
        }
      },
      error: () => {
        // Si falla la carga de roles, mostrar titulares sin detalles
        const titularesBasicos: TitularConDetalles[] = titulares.map(t => ({ ...t, rolesConCuentas: [] }));
        this.titularesConDetalles.set(titularesBasicos);
        this.loading.set(false);
        this.mostrarExito(`${titulares.length} titulares cargados`);
      }
    });
  }

  private cargarCuentasPorRol(codigoRol: number) {
    const datos = new DatosBusqueda();
    datos.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'personaRol.codigo',
      codigoRol.toString(),
      TipoComandosBusqueda.IGUAL
    );
    datos.setNumeroCampoRepetido(0);

    return this.personaCuentaService.selectByCriteria([datos]).pipe(
      catchError((err) => {
        // Si el error es porque no hay registros, devolver array vacío
        const errorMsg = err?.toString() || '';
        if (errorMsg.includes('no devolvio ningun registro') || errorMsg.includes('no devolvi')) {
          return of([]);
        }
        return of([]);
      })
    );
  }

  filtrarPorRol(): void {
    const rolCodigo = this.rolFiltro();
    if (!rolCodigo) {
      this.cargarTitulares();
      return;
    }

    const empresaCodigo = this.getEmpresaCodigo();

    this.loading.set(true);

    // Buscar roles de persona con el rol seleccionado
    const criterios: DatosBusqueda[] = [];

    const dbRol = new DatosBusqueda();
    dbRol.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'rubroRolPersonaH',
      rolCodigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    dbRol.setNumeroCampoRepetido(0);
    criterios.push(dbRol);

    if (empresaCodigo) {
      const dbEmpresa = new DatosBusqueda();
      dbEmpresa.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'empresa',
        'codigo',
        empresaCodigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      dbEmpresa.setNumeroCampoRepetido(0);
      criterios.push(dbEmpresa);
    }

    const dbEstado = new DatosBusqueda();
    dbEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'estado',
      '1',
      TipoComandosBusqueda.IGUAL
    );
    dbEstado.setNumeroCampoRepetido(0);
    criterios.push(dbEstado);

    this.personaRolService.selectByCriteria(criterios).subscribe({
      next: (roles) => {
        if (roles && roles.length > 0) {
          // Extraer IDs únicos de titulares
          const idsTitulares = [...new Set(roles.map((r) => r.titular?.codigo).filter((id): id is number => id !== undefined))];

          // Cargar titulares con los IDs encontrados
          this.cargarTitularesPorIds(idsTitulares);
        } else {
          this.titulares.set([]);
          this.titularesFiltrados.set([]);
          this.titularesConDetalles.set([]);
          this.loading.set(false);
          this.mostrarExito('No se encontraron titulares con este rol');
        }
      },
      error: (err) => {
        // Si el error es porque no hay registros, tratarlo como resultado válido
        const errorMsg = err?.toString() || '';
        if (errorMsg.includes('no devolvio ningun registro') || errorMsg.includes('no devolvi')) {
          this.titulares.set([]);
          this.titularesFiltrados.set([]);
          this.titularesConDetalles.set([]);
          this.loading.set(false);
          this.mostrarExito('No se encontraron titulares con este rol');
        } else {
          this.mostrarError('Error al filtrar por rol');
          this.loading.set(false);
        }
      },
    });
  }

  private cargarTitularesPorIds(ids: number[]): void {
    if (ids.length === 0) {
      this.titulares.set([]);
      this.titularesFiltrados.set([]);
      this.titularesConDetalles.set([]);
      this.loading.set(false);
      return;
    }

    const criterios: DatosBusqueda[] = [];

    // Crear criterios para cada ID con OR
    ids.forEach((id, index) => {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.LONG,
        'codigo',
        id.toString(),
        TipoComandosBusqueda.IGUAL
      );
      db.setNumeroCampoRepetido(index);
      if (index > 0) {
        db.setTipoOperadorLogico(TipoComandosBusqueda.OR);
      }
      criterios.push(db);
    });

    this.titularService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const titulares = data || [];
        this.titulares.set(titulares);
        this.titularesFiltrados.set(titulares);

        if (titulares.length > 0) {
          this.cargarDetallesTitulares(titulares);
          this.mostrarExito(`${titulares.length} titulares encontrados con este rol`);
        } else {
          this.titularesConDetalles.set([]);
          this.loading.set(false);
          this.mostrarExito('No se encontraron titulares con este rol');
        }
      },
      error: (err) => {
        // Si el error es porque no hay registros, tratarlo como resultado válido
        const errorMsg = err?.toString() || '';
        if (errorMsg.includes('no devolvio ningun registro') || errorMsg.includes('no devolvi')) {
          this.titulares.set([]);
          this.titularesFiltrados.set([]);
          this.titularesConDetalles.set([]);
          this.loading.set(false);
          this.mostrarExito('No se encontraron titulares con este rol');
        } else {
          this.mostrarError('Error al cargar titulares');
          this.loading.set(false);
        }
      },
    });
  }

  // ==================== BÚSQUEDA Y FILTRADO ====================

  aplicarFiltro(): void {
    const filtro = this.busqueda().toLowerCase().trim();
    if (!filtro) {
      this.titularesFiltrados.set(this.titulares());
      return;
    }

    const filtrados = this.titulares().filter((t) => {
      const nombreComercial = (t.nombre || '').toLowerCase();
      const identificacion = (t.identificacion || '').toLowerCase();
      const razon = (t.razonSocial || '').toLowerCase();

      return (
        nombreComercial.includes(filtro) || identificacion.includes(filtro) || razon.includes(filtro)
      );
    });

    this.titularesFiltrados.set(filtrados);
  }

  limpiarBusqueda(): void {
    this.busqueda.set('');
    this.aplicarFiltro();
  }

  onRolFiltroChange(): void {
    this.cargarTitulares();
  }

  limpiarFiltroRol(): void {
    this.rolFiltro.set(null);
    this.cargarTitulares();
  }

  // ==================== NAVEGACIÓN DE VISTAS ====================

  volverALista(): void {
    if (this.tieneCambios()) {
      const dialogRef = this.dialog.open(ConfirmDialogComponent, {
        data: {
          title: 'Cambios sin guardar',
          message: '¿Está seguro de que desea salir sin guardar los cambios?',
        },
      });

      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          this.resetearFormulario();
          this.vistaActual.set('lista');
          // Refrescar datos al volver a la lista
          this.cargarTitulares();
        }
      });
    } else {
      this.resetearFormulario();
      this.vistaActual.set('lista');
      // Refrescar datos al volver a la lista
      this.cargarTitulares();
    }
  }

  volverAFormulario(): void {
    this.vistaActual.set('form');
  }

  // ==================== CRUD - CREAR ====================

  nuevo(): void {
    this.resetearFormulario();
    this.titularSeleccionado.set(null);
    this.vistaActual.set('form');
  }

  // ==================== CRUD - EDITAR ====================

  editar(titular: Titular): void {
    this.titularSeleccionado.set(titular);
    this.cargarDatosTitular(titular);
    this.vistaActual.set('form');
  }

  private cargarDatosTitular(titular: Titular): void {
    this.formTitular.patchValue({
      codigo: titular.codigo,
      rubroTipoPersonaH: titular.rubroTipoPersonaH,
      rubroTipoIdentificacionH: titular.rubroTipoIdentificacionH,
      identificacion: titular.identificacion,
      razonSocial: titular.razonSocial,
      nombre: titular.nombre,
      extranjero: titular.extranjero || 0,
      pais: titular.pais || null,
      paisBusqueda: titular.pais?.nombre || '',
      telefono: titular.telefono,
      email: titular.email,
      direccion: titular.direccion,
      estado: titular.estado,
    });
    this.formTitular.markAsPristine();
  }

  // ==================== CRUD - GUARDAR ====================

  guardar(): void {
    if (this.formTitular.invalid) {
      this.mostrarError('Por favor complete todos los campos requeridos');
      this.formTitular.markAllAsTouched();
      return;
    }

    const formValue = this.formTitular.value;
    const titular: any = {
      rubroTipoPersonaP: this.RUBRO_TIPO_PERSONA,
      rubroTipoPersonaH: formValue.rubroTipoPersonaH,
      rubroTipoIdentificacionP: this.RUBRO_TIPO_IDENTIFICACION,
      rubroTipoIdentificacionH: formValue.rubroTipoIdentificacionH,
      identificacion: formValue.identificacion,
      nombre: formValue.nombre,
      razonSocial: formValue.razonSocial,
      extranjero: formValue.extranjero || 0,
      pais: formValue.pais || null, // Enviar objeto Pais completo
      telefono: formValue.telefono,
      email: formValue.email,
      direccion: formValue.direccion,
      estado: formValue.estado,
    };

    this.loading.set(true);

    if (this.esNuevo()) {
      // Crear nuevo
      this.titularService.add(titular).subscribe({
        next: (response) => {
          if (response) {
            // Actualizar solo el código del formulario con el que devolvió el backend
            this.formTitular.patchValue({ codigo: response.codigo }, { emitEvent: false });
            // Actualizar titularSeleccionado con los datos del formulario + código del backend
            this.titularSeleccionado.set({ ...formValue, codigo: response.codigo });
            this.cargarTitulares();
            this.formTitular.markAsPristine();
            this.loading.set(false);
            this.mostrarDialogoGuardadoExitoso();
          } else {
            this.loading.set(false);
          }
        },
        error: (error: any) => {
          this.mostrarError(this.obtenerMensajeErrorGuardado(error, 'crear'));
          this.loading.set(false);
        },
      });
    } else {
      // Actualizar existente
      titular.codigo = formValue.codigo;

      this.titularService.update(titular).subscribe({
        next: (response) => {
          if (response) {
            // Actualizar titularSeleccionado con los datos del formulario
            this.titularSeleccionado.set(formValue);
            this.cargarTitulares();
            this.formTitular.markAsPristine();
            this.loading.set(false);
            this.mostrarDialogoGuardadoExitoso();
          } else {
            this.loading.set(false);
          }
        },
        error: (error: any) => {
          this.mostrarError(this.obtenerMensajeErrorGuardado(error, 'actualizar'));
          this.loading.set(false);
        },
      });
    }
  }

  private mostrarDialogoGuardadoExitoso(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Registro guardado exitosamente',
        message: '¿Desea continuar editando o regresar a la gestión de titulares?',
        confirmText: 'Regresar a la lista',
        cancelText: 'Continuar aquí',
      },
    });

    dialogRef.afterClosed().subscribe((result: boolean) => {
      if (result) {
        // Usuario eligió regresar a la lista
        this.vistaActual.set('lista');
        this.titularSeleccionado.set(null);
      }
      // Si result es false o undefined, el usuario eligió quedarse
    });
  }

  // ==================== CRUD - ELIMINAR ====================

  eliminar(titular: Titular): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar eliminación',
        message: `¿Está seguro de que desea inactivar al titular "${this.getNombreCompleto(titular)}"?`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ejecutarEliminacion(titular);
      }
    });
  }

  private ejecutarEliminacion(titular: Titular): void {
    const titularUpdate = { ...titular, estado: 0 };

    this.titularService.update(titularUpdate).subscribe({
      next: () => {
        this.mostrarExito('Titular inactivado exitosamente');
        this.cargarTitulares();
      },
      error: () => {
        this.mostrarError('Error al inactivar titular');
      },
    });
  }

  // ==================== GESTIÓN DE ROLES ====================

  gestionarRoles(titular: Titular): void {
    this.titularSeleccionado.set(titular);
    this.cargarRolesAsignados(titular.codigo);
    this.vistaActual.set('roles');
  }

  private cargarRolesAsignados(codigoTitular: number): void {
    const empresaCodigo = this.getEmpresaCodigo();
    if (!empresaCodigo) {
      this.mostrarError('No se pudo cargar la empresa');
      return;
    }

    this.loading.set(true);

    const db1 = new DatosBusqueda();
    db1.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'titular',
      'codigo',
      codigoTitular.toString(),
      TipoComandosBusqueda.IGUAL
    );
    db1.setNumeroCampoRepetido(0);

    const db2 = new DatosBusqueda();
    db2.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      empresaCodigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    db2.setNumeroCampoRepetido(0);

    this.personaRolService.selectByCriteria([db1, db2]).subscribe({
      next: (data) => {
        this.rolesAsignados.set(data || []);
        this.loading.set(false);
      },
      error: (err) => {
        // Si el error es porque no hay registros, tratarlo como resultado válido
        const errorMsg = err?.toString() || '';
        if (errorMsg.includes('no devolvio ningun registro') || errorMsg.includes('no devolvi')) {
          this.rolesAsignados.set([]);
          this.loading.set(false);
        } else {
          this.mostrarError('Error al cargar roles');
          this.loading.set(false);
        }
      },
    });
  }

  // Verificar si un rol ya está asignado al titular actual
  rolYaAsignado(codigoRol: number): boolean {
    return this.rolesAsignados().some((r) => r.rubroRolPersonaH === codigoRol);
  }

  agregarRol(codigoRol: number, diasCredito: number): void {
    const titular = this.titularSeleccionado();
    const empresaCodigo = this.getEmpresaCodigo();
    if (!titular || !empresaCodigo) {
      this.mostrarError('Datos incompletos');
      return;
    }

    // Verificar si ya existe
    const yaExiste = this.rolYaAsignado(codigoRol);
    if (yaExiste) {
      this.mostrarError('Este rol ya está asignado');
      return;
    }

    const nuevoRol: any = {
      titular: { codigo: titular.codigo },
      rubroRolPersonaP: this.RUBRO_ROL_PERSONA,
      rubroRolPersonaH: codigoRol,
      empresa: { codigo: empresaCodigo },
      diasCredito: diasCredito,
      diasVencimientoFactura: 0,
      calificacionRiesgo: '',
      estado: 1,
    };

    this.personaRolService.add(nuevoRol).subscribe({
      next: (response) => {
        if (response) {
          this.mostrarExito('Rol asignado exitosamente');
          this.cargarRolesAsignados(titular.codigo);
        }
      },
      error: () => {
        this.mostrarError('Error al asignar rol');
      },
    });
  }

  eliminarRol(rol: PersonaRol): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar eliminación',
        message: `¿Está seguro de que desea eliminar este rol? Se eliminarán también sus cuentas asociadas.`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ejecutarEliminacionRol(rol);
      }
    });
  }

  private ejecutarEliminacionRol(rol: PersonaRol): void {
    this.personaRolService.delete(rol.codigo).subscribe({
      next: () => {
        this.mostrarExito('Rol eliminado exitosamente');
        const titular = this.titularSeleccionado();
        if (titular) {
          this.cargarRolesAsignados(titular.codigo);
        }
      },
      error: () => {
        this.mostrarError('Error al eliminar rol');
      },
    });
  }

  // ==================== GESTIÓN DE CUENTAS CONTABLES POR ROL ====================

  gestionarCuentas(rol: PersonaRol): void {
    this.rolSeleccionado.set(rol);
    this.cargarCuentasAsignadas(rol.codigo);
    this.vistaActual.set('cuentas');
  }

  private cargarCuentasAsignadas(codigoRol: number): void {
    this.loading.set(true);

    const datos = new DatosBusqueda();
    datos.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'personaRol.codigo',
      codigoRol.toString(),
      TipoComandosBusqueda.IGUAL
    );
    datos.setNumeroCampoRepetido(0);

    this.personaCuentaService.selectByCriteria([datos]).subscribe({
      next: (cuentas) => {
        const cuentasArray = Array.isArray(cuentas) ? cuentas : [];
        this.cuentasAsignadas.set(cuentasArray);
        this.loading.set(false);
      },
      error: (err) => {
        const errorMsg = err?.toString() || '';
        if (errorMsg.includes('no devolvio ningun registro') || errorMsg.includes('no devolvi')) {
          this.cuentasAsignadas.set([]);
          this.loading.set(false);
        } else {
          this.mostrarError('Error al cargar cuentas contables');
          this.loading.set(false);
        }
      },
    });
  }

  tipoCuentaYaAsignado(tipoCuenta: number): boolean {
    return this.cuentasAsignadas().some((c) => c.tipoCuenta === tipoCuenta);
  }

  agregarCuenta(tipoCuenta: number, saldoInicial: number = 0): void {
    const rol = this.rolSeleccionado();
    if (!rol) {
      this.mostrarError('No hay rol seleccionado');
      return;
    }

    // Verificar si ya existe una cuenta para este tipo
    if (this.tipoCuentaYaAsignado(tipoCuenta)) {
      this.mostrarError(`Ya existe una cuenta asignada para ${this.getTipoCuentaDescripcion(tipoCuenta)}. Use el botón de editar para cambiarla.`);
      return;
    }

    const dialogRef = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '800px',
      data: { titulo: 'Seleccionar Cuenta Contable' },
    });

    dialogRef.afterClosed().subscribe((planCuenta) => {
      if (planCuenta) {
        this.crearCuentaPersona(rol, planCuenta, tipoCuenta, saldoInicial);
      }
    });
  }

  editarSaldoCuenta(cuenta: PersonaCuentaContable): void {
    const saldoActual = cuenta.saldoInicial ?? 0;
    const saldoStr = window.prompt(
      `Ingrese el saldo inicial para ${this.getTipoCuentaDescripcion(cuenta.tipoCuenta)} - ${cuenta.planCuenta?.nombre || ''}:`,
      saldoActual.toString()
    );
    if (saldoStr === null) { return; }
    const nuevoSaldo = parseFloat(saldoStr);
    if (isNaN(nuevoSaldo) || nuevoSaldo < 0) {
      this.mostrarError('El saldo inicial debe ser un número válido >= 0');
      return;
    }
    const cuentaActualizada: any = {
      codigo: cuenta.codigo,
      personaRol: { codigo: cuenta.personaRol.codigo },
      empresa: { codigo: cuenta.empresa.codigo },
      planCuenta: { codigo: cuenta.planCuenta.codigo },
      tipoCuenta: cuenta.tipoCuenta,
      tipoPersona: cuenta.tipoPersona ?? null,
      saldoInicial: nuevoSaldo,
    };
    this.personaCuentaService.update(cuentaActualizada).subscribe({
      next: () => {
        this.mostrarExito('Saldo inicial actualizado');
        const rol = this.rolSeleccionado();
        if (rol) { this.cargarCuentasAsignadas(rol.codigo); }
      },
      error: () => this.mostrarError('Error al actualizar saldo inicial'),
    });
  }

  editarCuenta(cuenta: PersonaCuentaContable): void {
    const dialogRef = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '800px',
      data: { titulo: 'Cambiar Cuenta Contable' },
    });

    dialogRef.afterClosed().subscribe((planCuenta) => {
      if (planCuenta) {
        this.actualizarCuentaPersona(cuenta, planCuenta);
      }
    });
  }

  editarDatosRol(rol: PersonaRol): void {
    const diasActual = rol.diasCredito ?? 0;

    const diasStr = window.prompt(
      `Ingrese los días de crédito para el rol ${this.getRolDescripcion(rol.rubroRolPersonaH || 0)}:`,
      diasActual.toString()
    );

    if (diasStr === null) {
      return;
    }

    const nuevosDias = parseInt(diasStr, 10);

    if (isNaN(nuevosDias) || nuevosDias < 0) {
      this.mostrarError('Días crédito debe ser un valor numérico válido >= 0');
      return;
    }

    const rolActualizado: PersonaRol = {
      ...rol,
      diasCredito: nuevosDias,
    };

    this.personaRolService.update(rolActualizado).subscribe({
      next: () => {
        this.mostrarExito('Datos del rol actualizados exitosamente');
        const titular = this.titularSeleccionado();
        if (titular) {
          this.cargarRolesAsignados(titular.codigo);
        }
      },
      error: () => {
        this.mostrarError('Error al actualizar datos del rol');
      },
    });
  }

  private crearCuentaPersona(rol: PersonaRol, planCuenta: any, tipoCuenta: number, saldoInicial: number = 0): void {
    const titular = this.titularSeleccionado();
    const empresaCodigo = this.getEmpresaCodigo();
    if (!titular || !empresaCodigo) {
      this.mostrarError('No se pudo cargar la empresa');
      return;
    }

    const cuenta: any = {
      personaRol: { codigo: rol.codigo },
      empresa: { codigo: empresaCodigo },
      planCuenta: { codigo: planCuenta.codigo },
      tipoCuenta: tipoCuenta,
      tipoPersona: null,
      saldoInicial: saldoInicial,
    };

    this.personaCuentaService.add(cuenta).subscribe({
      next: () => {
        this.mostrarExito('Cuenta asignada exitosamente');
        this.cargarCuentasAsignadas(rol.codigo);
      },
      error: () => {
        this.mostrarError('Error al asignar cuenta');
      },
    });
  }

  private actualizarCuentaPersona(cuenta: PersonaCuentaContable, planCuenta: any): void {
    const cuentaActualizada: any = {
      codigo: cuenta.codigo,
      personaRol: { codigo: cuenta.personaRol.codigo },
      empresa: { codigo: cuenta.empresa.codigo },
      planCuenta: { codigo: planCuenta.codigo },
      tipoCuenta: cuenta.tipoCuenta,
      tipoPersona: null,
      saldoInicial: cuenta.saldoInicial ?? 0,
    };

    this.personaCuentaService.update(cuentaActualizada).subscribe({
      next: () => {
        this.mostrarExito('Cuenta actualizada exitosamente');
        const rol = this.rolSeleccionado();
        if (rol) {
          this.cargarCuentasAsignadas(rol.codigo);
        }
      },
      error: () => {
        this.mostrarError('Error al actualizar cuenta');
      },
    });
  }

  eliminarCuenta(cuenta: PersonaCuentaContable): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Confirmar eliminación',
        message: `¿Está seguro de que desea eliminar la cuenta ${cuenta.planCuenta.codigo}?`,
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ejecutarEliminacionCuenta(cuenta);
      }
    });
  }

  private ejecutarEliminacionCuenta(cuenta: PersonaCuentaContable): void {
    this.personaCuentaService.delete(cuenta.codigo).subscribe({
      next: () => {
        this.mostrarExito('Cuenta eliminada exitosamente');
        const rol = this.rolSeleccionado();
        if (rol) {
          this.cargarCuentasAsignadas(rol.codigo);
        }
      },
      error: () => {
        this.mostrarError('Error al eliminar cuenta');
      },
    });
  }

  volverARoles(): void {
    this.vistaActual.set('roles');
    this.cuentasAsignadas.set([]);
  }

  refrescar(): void {
    this.cargarTitulares();
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

  getTooltipCuenta(cuenta: PersonaCuentaContable): string {
    const nombre = cuenta.planCuenta?.nombre || 'Sin nombre';
    return nombre;
  }

  getTipoPersonaDescripcion(tipo: number): string {
    switch (tipo) {
      case 1:
        return 'Cliente';
      case 2:
        return 'Proveedor';
      default:
        return 'Desconocido';
    }
  }

  // ==================== UTILIDADES ====================

  private resetearFormulario(): void {
    this.formTitular.reset({
      codigo: 0,
      estado: 1,
    });
    this.titularSeleccionado.set(null);
    this.rolesAsignados.set([]);
    this.formTitular.markAsPristine();
  }

  getNombreCompleto(titular: Titular): string {
    if (titular.razonSocial) {
      return titular.razonSocial;
    }
    return titular.nombre || '';
  }

  getRolDescripcion(codigoRol: number): string {
    const rol = this.rolesDisponibles().find((r) => r.codigoAlterno === codigoRol);
    return rol?.descripcion || 'Desconocido';
  }

  getTipoPersonaDesc(codigo: number): string {
    const tipo = this.tiposPersona().find((t) => t.codigoAlterno === codigo);
    return tipo?.descripcion || '';
  }

  getTipoIdentificacionDesc(codigo: number): string {
    const tipo = this.tiposIdentificacion().find((t) => t.codigoAlterno === codigo);
    return tipo?.descripcion || '';
  }

  getEstadoClass(estado: number): string {
    return estado === 1 ? 'estado-activo' : 'estado-inactivo';
  }

  getEstadoTexto(estado: number): string {
    return estado === 1 ? 'ACTIVO' : 'INACTIVO';
  }

  private obtenerMensajeErrorGuardado(error: any, accion: 'crear' | 'actualizar'): string {
    const errorTexto = this.obtenerTextoError(error).trim();
    const errorMsg = errorTexto.toLowerCase();
    const esDuplicado =
      errorMsg.includes('ora-00001') ||
      errorMsg.includes('restricción única') ||
      errorMsg.includes('unique constraint') ||
      errorMsg.includes('duplicate') ||
      errorMsg.includes('duplicado');

    if (esDuplicado) {
      const constraint = this.extraerConstraintUnica(errorTexto);
      const campo = this.inferirCampoDuplicado(errorTexto, constraint);

      if (campo && constraint) {
        return `No se puede guardar el titular: valor duplicado en ${campo} (restricción ${constraint}).`;
      }

      if (campo) {
        return `No se puede guardar el titular: valor duplicado en ${campo}.`;
      }

      if (constraint) {
        return `No se puede guardar el titular: registro duplicado (restricción ${constraint}).`;
      }

      return 'No se puede guardar el titular porque ya existe un registro con la misma información.';
    }

    return errorTexto
      ? `No se pudo ${accion} el titular: ${errorTexto}`
      : `No se pudo ${accion} el titular.`;
  }

  private extraerConstraintUnica(textoError: string): string | null {
    if (!textoError) {
      return null;
    }

    const patrones = [
      /unique constraint\s*\(([^)]+)\)/i,
      /restricci[oó]n\s+[úu]nica\s*\(([^)]+)\)/i,
      /constraint\s*\(([^)]+)\)\s*violated/i,
    ];

    for (const patron of patrones) {
      const match = textoError.match(patron);
      if (match?.[1]) {
        const nombreCompleto = match[1].trim();
        const nombre = nombreCompleto.split('.').pop();
        return nombre || nombreCompleto;
      }
    }

    return null;
  }

  private inferirCampoDuplicado(textoError: string, constraint: string | null): string | null {
    const fuente = `${textoError} ${constraint || ''}`.toLowerCase();

    if (fuente.includes('identificacion') || fuente.includes('cedula') || fuente.includes('ruc') || fuente.includes('dni')) {
      return 'Identificación';
    }

    if (fuente.includes('razon_social') || fuente.includes('razon social')) {
      return 'Razón social';
    }

    if (fuente.includes('nombre')) {
      return 'Nombre';
    }

    if (fuente.includes('email') || fuente.includes('correo')) {
      return 'Email';
    }

    if (fuente.includes('telefono') || fuente.includes('fono') || fuente.includes('celular')) {
      return 'Teléfono';
    }

    return null;
  }

  private obtenerTextoError(error: any): string {
    const partes: string[] = [];
    const visitados = new Set<any>();

    const recorrer = (valor: any): void => {
      if (valor === null || valor === undefined) {
        return;
      }

      if (typeof valor === 'string') {
        partes.push(valor);
        return;
      }

      if (typeof valor === 'number' || typeof valor === 'boolean') {
        partes.push(String(valor));
        return;
      }

      if (typeof valor !== 'object') {
        return;
      }

      if (visitados.has(valor)) {
        return;
      }
      visitados.add(valor);

      if (Array.isArray(valor)) {
        valor.forEach(recorrer);
        return;
      }

      Object.values(valor).forEach(recorrer);
    };

    recorrer(error);

    return partes
      .join(' | ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ==================== EXPORTAR CSV ====================

  exportarCSV(): void {
    const titulares = this.titularesFiltradosConDetalles();
    if (!titulares.length) {
      this.mostrarError('No hay datos para exportar');
      return;
    }

    const TIPO_CUENTA: Record<number, string> = {
      1: 'Facturas', 2: 'Anticipos', 3: 'Retenciones', 4: 'Otros',
    };
    const TIPO_PERSONA: Record<number, string> = {
      1: 'Cliente', 2: 'Proveedor',
    };

    const rolFiltroActual = this.rolFiltro();
    const rows: Record<string, any>[] = [];

    for (const titular of titulares) {
      const rolesConCuentas = titular.rolesConCuentas || [];

      // Filtrar roles según el filtro activo
      const rolesFiltrados = rolFiltroActual
        ? rolesConCuentas.filter(rc => rc.rol.rubroRolPersonaH === rolFiltroActual)
        : rolesConCuentas;

      if (rolesFiltrados.length === 0) {
        // Titular sin roles (o sin coincidencia de filtro): una fila base
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
        for (const rc of rolesFiltrados) {
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
    this.mostrarExito(`${rows.length} registros exportados`);
  }

  // ==================== MENSAJES ====================

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }
}
