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
import { Empresa } from '../../../../shared/model/empresa';

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
    const titularesConDet = this.titularesConDetalles();

    if (!filtro) {
      return titularesConDet;
    }

    return titularesConDet.filter((t) => {
      const nombre = `${t.nombre || ''} ${t.apellido || ''}`.toLowerCase();
      const identificacion = (t.identificacion || '').toLowerCase();
      const razon = (t.razonSocial || '').toLowerCase();

      return (
        nombre.includes(filtro) || identificacion.includes(filtro) || razon.includes(filtro)
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
    private detalleRubroService: DetalleRubroService,
    private personaRolService: PersonaRolService,
    private personaCuentaService: PersonaCuentaContableService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {
    this.inicializarFormulario();
  }

  ngOnInit(): void {
    this.cargarEmpresa();
    this.cargarRubros();
    this.cargarTitulares();
  }

  // ==================== INICIALIZACIÓN ====================

  private inicializarFormulario(): void {
    this.formTitular = this.fb.group({
      codigo: [0],
      rubroTipoPersonaH: [null, Validators.required],
      rubroTipoIdentificacionH: [null, Validators.required],
      identificacion: ['', [Validators.required, Validators.maxLength(20)]],
      nombre: ['', [Validators.required, Validators.maxLength(100)]],
      apellido: ['', [Validators.required, Validators.maxLength(100)]],
      razonSocial: ['', Validators.maxLength(200)],
      telefono: ['', Validators.maxLength(20)],
      email: ['', [Validators.email, Validators.maxLength(100)]],
      direccion: ['', Validators.maxLength(200)],
      estado: [1, Validators.required],
    });
  }

  private cargarEmpresa(): void {
    const empresaStr = localStorage.getItem('empresa');
    if (empresaStr) {
      try {
        this.empresa = JSON.parse(empresaStr);
      } catch (e) {
        console.error('Error al parsear empresa desde localStorage', e);
      }
    }
  }

  private cargarRubros(): void {
    const tipos = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_PERSONA);
    const tiposId = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION);
    const roles = this.detalleRubroService.getDetallesByParent(this.RUBRO_ROL_PERSONA);

    this.tiposPersona.set(tipos);
    this.tiposIdentificacion.set(tiposId);
    this.rolesDisponibles.set(roles);

    console.log('Rubros cargados:', {
      tiposPersona: tipos.length,
      tiposIdentificacion: tiposId.length,
      roles: roles.length,
    });
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
          console.error('Error al cargar titulares:', err);
          this.mostrarError('Error al cargar titulares');
          this.loading.set(false);
        }
      },
    });
  }

  private cargarDetallesTitulares(titulares: Titular[]): void {
    if (!this.empresa) {
      this.loading.set(false);
      return;
    }

    // Crear observables para cargar roles de cada titular
    const rolesObservables = titulares.map(titular => {
      const db1 = new DatosBusqueda();
      db1.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'titular',
        'codigo',
        titular.codigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      db1.setNumeroCampoRepetido(0);

      return this.personaRolService.selectByCriteria([db1]);
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
          console.log(`🔍 Cargando cuentas para ${cuentasObservables.length} roles...`);
          forkJoin(cuentasObservables.map(c => c.observable)).subscribe({
            next: (resultadosCuentas) => {
              console.log('✅ Resultados de cuentas:', resultadosCuentas);
              // Mapear cuentas a sus roles correspondientes
              resultadosCuentas.forEach((cuentas, index) => {
                const { titularCodigo, rolCodigo } = cuentasObservables[index];
                console.log(`  Rol ${rolCodigo}: ${cuentas?.length || 0} cuentas`);
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

    console.log(`🔎 Buscando cuentas para rol ${codigoRol}...`);
    return this.personaCuentaService.selectByCriteria([datos]).pipe(
      catchError((err) => {
        // Si el error es porque no hay registros, devolver array vacío
        const errorMsg = err?.toString() || '';
        if (errorMsg.includes('no devolvio ningun registro') || errorMsg.includes('no devolvi')) {
          console.log(`  ⚠️ Rol ${codigoRol}: Sin cuentas (backend devolvió "no devolvio ningun registro")`);
          return of([]);
        }
        // Para otros errores, propagar
        console.error(`  ❌ Error al cargar cuentas del rol ${codigoRol}:`, err);
        return of([]);
      })
    );
  }

  filtrarPorRol(): void {
    const rolCodigo = this.rolFiltro();
    if (!rolCodigo || !this.empresa) {
      this.cargarTitulares();
      return;
    }

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

    const dbEmpresa = new DatosBusqueda();
    dbEmpresa.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      this.empresa.codigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    dbEmpresa.setNumeroCampoRepetido(0);
    criterios.push(dbEmpresa);

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
          this.loading.set(false);
          this.mostrarExito('No se encontraron titulares con este rol');
        } else {
          console.error('Error al filtrar por rol:', err);
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
        this.loading.set(false);
        this.mostrarExito(`${titulares.length} titulares encontrados con este rol`);
      },
      error: (err) => {
        // Si el error es porque no hay registros, tratarlo como resultado válido
        const errorMsg = err?.toString() || '';
        if (errorMsg.includes('no devolvio ningun registro') || errorMsg.includes('no devolvi')) {
          this.titulares.set([]);
          this.titularesFiltrados.set([]);
          this.loading.set(false);
          this.mostrarExito('No se encontraron titulares con este rol');
        } else {
          console.error('Error al cargar titulares:', err);
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
      const nombre = `${t.nombre || ''} ${t.apellido || ''}`.toLowerCase();
      const identificacion = (t.identificacion || '').toLowerCase();
      const razon = (t.razonSocial || '').toLowerCase();

      return (
        nombre.includes(filtro) || identificacion.includes(filtro) || razon.includes(filtro)
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
      nombre: titular.nombre,
      apellido: titular.apellido,
      razonSocial: titular.razonSocial,
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
      apellido: formValue.apellido,
      razonSocial: formValue.razonSocial,
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
            this.mostrarExito('Titular creado exitosamente');
            // Actualizar solo el código del formulario con el que devolvió el backend
            this.formTitular.patchValue({ codigo: response.codigo }, { emitEvent: false });
            // Actualizar titularSeleccionado con los datos del formulario + código del backend
            this.titularSeleccionado.set({ ...formValue, codigo: response.codigo });
            this.cargarTitulares();
            this.formTitular.markAsPristine();
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al crear titular:', err);
          this.mostrarError('Error al crear titular');
          this.loading.set(false);
        },
      });
    } else {
      // Actualizar existente
      titular.codigo = formValue.codigo;

      this.titularService.update(titular).subscribe({
        next: (response) => {
          if (response) {
            this.mostrarExito('Titular actualizado exitosamente');
            // Actualizar titularSeleccionado con los datos del formulario
            this.titularSeleccionado.set(formValue);
            this.cargarTitulares();
            this.formTitular.markAsPristine();
          }
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al actualizar titular:', err);
          this.mostrarError('Error al actualizar titular');
          this.loading.set(false);
        },
      });
    }
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
      error: (err) => {
        console.error('Error al inactivar titular:', err);
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
    if (!this.empresa) {
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
      this.empresa.codigo.toString(),
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
          console.error('Error al cargar roles:', err);
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

  agregarRol(codigoRol: number): void {
    const titular = this.titularSeleccionado();
    if (!titular || !this.empresa) {
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
      empresa: { codigo: this.empresa.codigo },
      estado: 1,
    };

    this.personaRolService.add(nuevoRol).subscribe({
      next: (response) => {
        if (response) {
          this.mostrarExito('Rol asignado exitosamente');
          this.cargarRolesAsignados(titular.codigo);
        }
      },
      error: (err) => {
        console.error('Error al asignar rol:', err);
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
      error: (err) => {
        console.error('Error al eliminar rol:', err);
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
    if (!this.empresa) {
      this.mostrarError('No se pudo cargar la empresa');
      return;
    }

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
          console.error('Error al cargar cuentas:', err);
          this.mostrarError('Error al cargar cuentas contables');
          this.loading.set(false);
        }
      },
    });
  }

  tipoCuentaYaAsignado(tipoCuenta: number): boolean {
    return this.cuentasAsignadas().some((c) => c.tipoCuenta === tipoCuenta);
  }

  agregarCuenta(tipoCuenta: number): void {
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
        this.solicitarSaldoInicial(planCuenta, (saldoInicial) => {
          this.crearCuentaPersona(rol, planCuenta, tipoCuenta, saldoInicial);
        });
      }
    });
  }

  editarCuenta(cuenta: PersonaCuentaContable): void {
    const dialogRef = this.dialog.open(PlanCuentaSelectorDialogComponent, {
      width: '800px',
      data: { titulo: 'Cambiar Cuenta Contable' },
    });

    dialogRef.afterClosed().subscribe((planCuenta) => {
      if (planCuenta) {
        // Al cambiar la cuenta, mantener el saldo actual
        this.actualizarCuentaPersona(cuenta, planCuenta, cuenta.saldoInicial);
      }
    });
  }

  editarSaldoInicial(cuenta: PersonaCuentaContable): void {
    console.log('💰 editarSaldoInicial llamado con cuenta:', cuenta);
    console.log('   Cuenta contable:', cuenta.planCuenta?.cuentaContable);
    console.log('   Saldo actual:', cuenta.saldoInicial);

    // Verificación defensiva
    if (!cuenta || !cuenta.planCuenta) {
      console.error('❌ Cuenta o planCuenta es null/undefined');
      this.mostrarError('Error: Datos de cuenta inválidos');
      return;
    }

    const saldoActual = cuenta.saldoInicial ?? 0;

    const saldoStr = window.prompt(
      `Ingrese el nuevo saldo inicial para ${cuenta.planCuenta.cuentaContable}:`,
      saldoActual.toString()
    );

    console.log('✏️ Usuario ingresó:', saldoStr);

    if (saldoStr === null) {
      // Usuario canceló
      console.log('❌ Usuario canceló el diálogo');
      return;
    }

    const nuevoSaldo = parseFloat(saldoStr);
    console.log('🔢 Saldo parseado:', nuevoSaldo);

    if (isNaN(nuevoSaldo)) {
      console.log('⚠️ Saldo inválido (NaN)');
      this.mostrarError('El saldo inicial debe ser un número válido');
      return;
    }

    // Actualizar solo el saldo inicial
    const cuentaActualizada: any = {
      codigo: cuenta.codigo,
      personaRol: { codigo: cuenta.personaRol.codigo },
      empresa: { codigo: cuenta.empresa.codigo },
      planCuenta: { codigo: cuenta.planCuenta.codigo },
      tipoCuenta: cuenta.tipoCuenta,
      tipoPersona: null,
      saldoInicial: nuevoSaldo,
    };

    console.log('📤 Enviando actualización:', cuentaActualizada);

    this.personaCuentaService.update(cuentaActualizada).subscribe({
      next: () => {
        console.log('✅ Saldo actualizado exitosamente');
        this.mostrarExito('Saldo inicial actualizado exitosamente');
        const rol = this.rolSeleccionado();
        if (rol) {
          this.cargarCuentasAsignadas(rol.codigo);
        }
      },
      error: (err: any) => {
        console.error('❌ Error al actualizar saldo inicial:', err);
        this.mostrarError('Error al actualizar saldo inicial');
      },
    });
  }

  private solicitarSaldoInicial(planCuenta: any, callback: (saldo: number) => void, saldoActual?: number): void {
    console.log('🔔 Solicitando saldo inicial para:', planCuenta.cuentaContable, 'Saldo actual:', saldoActual);

    const mensaje = saldoActual !== undefined
      ? `Ingrese el saldo inicial para ${planCuenta.cuentaContable}:\n(Saldo actual: ${saldoActual})`
      : `Ingrese el saldo inicial para ${planCuenta.cuentaContable}:`;

    const valorDefecto = saldoActual !== undefined ? saldoActual.toString() : '0';
    const saldoStr = window.prompt(mensaje, valorDefecto);

    console.log('✏️ Usuario ingresó saldo:', saldoStr);

    if (saldoStr === null) {
      // Usuario canceló
      console.log('❌ Usuario canceló el ingreso de saldo');
      return;
    }

    const saldo = parseFloat(saldoStr);
    if (isNaN(saldo)) {
      this.mostrarError('El saldo inicial debe ser un número válido');
      console.log('⚠️ Saldo inválido:', saldoStr);
      return;
    }

    console.log('✅ Saldo válido, ejecutando callback con:', saldo);
    callback(saldo);
  }

  private crearCuentaPersona(rol: PersonaRol, planCuenta: any, tipoCuenta: number, saldoInicial: number): void {
    const titular = this.titularSeleccionado();
    if (!titular || !this.empresa) return;

    const cuenta: any = {
      personaRol: { codigo: rol.codigo },
      empresa: { codigo: this.empresa.codigo },
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
      error: (err: any) => {
        console.error('Error al asignar cuenta:', err);
        this.mostrarError('Error al asignar cuenta');
      },
    });
  }

  private actualizarCuentaPersona(cuenta: PersonaCuentaContable, planCuenta: any, saldoInicial: number): void {
    const cuentaActualizada: any = {
      codigo: cuenta.codigo,
      personaRol: { codigo: cuenta.personaRol.codigo },
      empresa: { codigo: cuenta.empresa.codigo },
      planCuenta: { codigo: planCuenta.codigo },
      tipoCuenta: cuenta.tipoCuenta,
      tipoPersona: null,
      saldoInicial: saldoInicial,
    };

    this.personaCuentaService.update(cuentaActualizada).subscribe({
      next: () => {
        this.mostrarExito('Cuenta actualizada exitosamente');
        const rol = this.rolSeleccionado();
        if (rol) {
          this.cargarCuentasAsignadas(rol.codigo);
        }
      },
      error: (err: any) => {
        console.error('Error al actualizar cuenta:', err);
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
      error: (err) => {
        console.error('Error al eliminar cuenta:', err);
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
    const saldo = cuenta.saldoInicial ?? 0;
    return `${nombre}\nSaldo Inicial: $${saldo.toFixed(2)}`;
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
    return `${titular.apellido || ''} ${titular.nombre || ''}`.trim();
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

  // ==================== MENSAJES ====================

  private mostrarExito(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      panelClass: ['success-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  private mostrarError(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 5000,
      panelClass: ['error-snackbar'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
