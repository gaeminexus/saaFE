import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { forkJoin } from 'rxjs';
import { ExterHistoricoDialogComponent } from '../../../dialog/exter-historico-dialog/exter-historico-dialog.component';

import { Entidad } from '../../../model/entidad';
import { Participe } from '../../../model/participe';
import { Exter } from '../../../model/exter';
import { Filial } from '../../../model/filial';
import { TipoIdentificacion } from '../../../model/tipo-identificacion';
import { TipoHidrocarburifica } from '../../../model/tipo-hidrocarburifica';
import { TipoVivienda } from '../../../model/tipo-vivienda';
import { TipoParticipe } from '../../../model/tipo-participe';
import { EstadoCivil } from '../../../model/estado-civil';
import { TipoAporte } from '../../../model/tipo-aporte';
import { Direccion } from '../../../model/direccion';
import { Conyuge } from '../../../model/conyuge';
import { ReferenciaFamiliar } from '../../../model/referencia-familiar';
import { ReferenciaPersonal } from '../../../model/referencia-personal';
import { CuentaBancariaParticipe } from '../../../model/cuenta-bancaria-participe';
import { BancoExterno } from '../../../../tsr/model/banco-externo.model';

import { EntidadService } from '../../../service/entidad.service';
import { ParticipeService } from '../../../service/participe.service';
import { ExterService } from '../../../service/exter.service';
import { FilialService } from '../../../service/filial.service';
import { TipoIdentificacionService } from '../../../service/tipo-identificacion.service';
import { TipoParticipeService } from '../../../service/tipo-participe.service';
import { EstadoCivilService } from '../../../service/estado-civil.service';
import { TipoAporteService } from '../../../service/tipo-aporte.service';
import { DireccionService } from '../../../service/direccion.service';
import { ConyugeService } from '../../../service/conyuge.service';
import { ReferenciaFamiliarService } from '../../../service/referencia-familiar.service';
import { ReferenciaPersonalService } from '../../../service/referencia-personal.service';
import { CuentaBancariaParticipeService } from '../../../service/cuenta-bancaria-participe.service';
import { BancoExternoService } from '../../../../tsr/service/banco-externo.service';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Component({
  selector: 'app-entidad-participe-info',
  standalone: true,
  imports: [
    CommonModule,
    MaterialFormModule
  ],
  templateUrl: './entidad-participe-info.component.html',
  styleUrl: './entidad-participe-info.component.scss'
})
export class EntidadParticipeInfoComponent implements OnInit {

  // Servicios
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private entidadService = inject(EntidadService);
  private participeService = inject(ParticipeService);
  private filialService = inject(FilialService);
  private tipoIdentificacionService = inject(TipoIdentificacionService);
  private tipoParticipeService = inject(TipoParticipeService);
  private estadoCivilService = inject(EstadoCivilService);
  private tipoAporteService = inject(TipoAporteService);
  private direccionService = inject(DireccionService);
  private conyugeService = inject(ConyugeService);
  private referenciaFamiliarService = inject(ReferenciaFamiliarService);
  private referenciaPersonalService = inject(ReferenciaPersonalService);
  private cuentaBancariaParticipeService = inject(CuentaBancariaParticipeService);
  private bancoExternoService = inject(BancoExternoService);
  private detalleRubroService = inject(DetalleRubroService);
  private funcionesDatosService = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private exterService = inject(ExterService);

  // Signals de estado
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  hasError = signal<boolean>(false);
  errorMsg = signal<string>('');
  exterData = signal<Exter | null>(null);
  loadingExter = signal<boolean>(false);

  // Signals de datos
  codigoEntidad = signal<number | null>(null);
  codigoParticipe = signal<number | null>(null);
  entidadActual = signal<Entidad | null>(null);
  participeActual = signal<Participe | null>(null);
  direccionActual = signal<Direccion | null>(null);

  // Opciones para selects
  filialesOptions = signal<Filial[]>([]);
  tiposIdentificacionOptions = signal<TipoIdentificacion[]>([]);
  tiposParticipeOptions = signal<TipoParticipe[]>([]);
  estadosCivilOptions = signal<EstadoCivil[]>([]);
  tiposAporteOptions = signal<TipoAporte[]>([]);
  bancoExternosOptions = signal<BancoExterno[]>([]);
  tiposCuentaBancaria = signal<DetalleRubro[]>([]);

  loadingFiliales = signal<boolean>(false);
  loadingTiposId = signal<boolean>(false);
  loadingTiposParticipe = signal<boolean>(false);

  // Sub-entidades por entidad
  conyuges = signal<Conyuge[]>([]);
  referenciasFamiliares = signal<ReferenciaFamiliar[]>([]);
  referenciasPersonales = signal<ReferenciaPersonal[]>([]);
  cuentasBancariasParticipe = signal<CuentaBancariaParticipe[]>([]);

  // Formularios sub-entidades
  conyugeForm!: FormGroup;
  referenciaFamiliarForm!: FormGroup;
  referenciaPersonalForm!: FormGroup;
  cuentaBancariaParticipeForm!: FormGroup;
  direccionForm!: FormGroup;

  // Estado de formularios inline
  modoConyugeForm = signal<'nuevo' | 'editar' | null>(null);
  modoRefFamiliarForm = signal<'nuevo' | 'editar' | null>(null);
  modoRefPersonalForm = signal<'nuevo' | 'editar' | null>(null);
  modoCuentaBancariaForm = signal<'nuevo' | 'editar' | null>(null);

  savingSubEntidad = signal<boolean>(false);

  // Formularios
  entidadForm!: FormGroup;
  participeForm!: FormGroup;

  // Computeds
  modoEdicion = computed(() => !!this.codigoEntidad() && !!this.codigoParticipe());
  titulo = computed(() => this.modoEdicion() ? 'Editar Información de Partícipe' : 'Nueva Información de Partícipe');

  /** Método regular (evaluado en cada CD cycle) para no tener estados transitorios */
  isFormValid(): boolean {
    if (!this.entidadForm || !this.participeForm) return false;
    return this.entidadForm.valid && this.participeForm.valid;
  }

  // Opciones estáticas
  estadosOptions = [
    { value: 0, label: 'Inactivo' },
    { value: 1, label: 'Activo' }
  ];

  sectorPublicoOptions = [
    { value: 0, label: 'No' },
    { value: 1, label: 'Sí' }
  ];

  ngOnInit(): void {
    this.inicializarFormularios();
    this.cargarDatosIniciales();
  }

  private inicializarFormularios(): void {
    // Formulario de Entidad
    this.entidadForm = this.fb.group({
      codigo: [{ value: null, disabled: true }],
      filial: [null as Filial | null, Validators.required],
      tipoIdentificacion: [null as TipoIdentificacion | null, Validators.required],
      numeroIdentificacion: ['', [Validators.required, Validators.maxLength(20)]],
      razonSocial: ['', [Validators.required, Validators.maxLength(200)]],
      nombreComercial: ['', Validators.maxLength(200)],
      correoPersonal: ['', [Validators.email, Validators.maxLength(100)]],
      correoInstitucional: ['', [Validators.email, Validators.maxLength(100)]],
      telefono: ['', Validators.maxLength(20)],
      movil: ['', Validators.maxLength(20)],
      tieneCorreoPersonal: [0],
      tieneCorreoTrabajo: [0],
      tieneTelefono: [0],
      idCiudad: [''],
      tipoHidrocarburifica: [null as TipoHidrocarburifica | null],
      tipoVivienda: [null as TipoVivienda | null],
      estadoCivil: [null as EstadoCivil | null],
      cargasFamiliares: [0, Validators.min(0)],
      sectorPublico: [0],
      porcentajeSimilitud: [0, [Validators.min(0), Validators.max(100)]],
      busqueda: [''],
      fechaNacimiento: [null as Date | null],
      urlFotoLogo: [''],
      idEstado: [1],
      migrado: [0],
      usuarioIngreso: [{ value: '', disabled: true }],
      fechaIngreso: [{ value: null, disabled: true }],
      usuarioModificacion: [{ value: '', disabled: true }],
      ipIngreso: [{ value: '', disabled: true }],
      ipModificacion: [{ value: '', disabled: true }]
    });

    // Formulario de Partícipe
    this.participeForm = this.fb.group({
      codigo: [{ value: null, disabled: true }],
      entidad: [null as Entidad | null],
      codigoAlterno: [0],
      tipoParticipante: [null as TipoParticipe | null],
      tipoAporte: [null as TipoAporte | null],
      remuneracionUnificada: [0, Validators.min(0)],
      fechaIngresoTrabajo: [null as Date | null],
      lugarTrabajo: ['', Validators.maxLength(200)],
      unidadAdministrativa: ['', Validators.maxLength(200)],
      cargoActual: ['', Validators.maxLength(200)],
      nivelEstudios: ['', Validators.maxLength(100)],
      ingresoAdicionalMensual: [0, Validators.min(0)],
      ingresoAdicionalActividad: ['', Validators.maxLength(200)],
      tipoCalificacion: [null],
      fechaIngresoFondo: [null as Date | null],
      estadoActual: [1],
      fechaFallecimiento: [null as Date | null],
      causaFallecimiento: ['', Validators.maxLength(200)],
      motivoSalida: ['', Validators.maxLength(200)],
      fechaSalida: [null as Date | null],
      estadoCesante: [0],
      fechaIngreso: [{ value: null, disabled: true }],
      idEstado: [1]
    });

    // Formulario de Dirección
    this.direccionForm = this.fb.group({
      codigo: [null],
      descripcion: ['', Validators.maxLength(300)],
      referencia: ['', Validators.maxLength(200)],
      callePrincipal: ['', Validators.maxLength(200)],
      calleSecundaria: ['', Validators.maxLength(200)],
      numero: ['', Validators.maxLength(50)],
      telefono: ['', Validators.maxLength(20)],
      celular: ['', Validators.maxLength(20)],
      estado: [1]
    });

    // Formulario de Cónyuge
    this.conyugeForm = this.fb.group({
      codigo: [null],
      nombres: ['', [Validators.required, Validators.maxLength(200)]],
      cedula: ['', Validators.maxLength(20)],
      correo: ['', [Validators.email, Validators.maxLength(100)]],
      estado: [1]
    });

    // Formulario de Referencia Familiar
    this.referenciaFamiliarForm = this.fb.group({
      codigo: [null],
      nombres: ['', [Validators.required, Validators.maxLength(200)]],
      cedula: ['', Validators.maxLength(20)],
      contacto: ['', Validators.maxLength(20)],
      parentesco: ['', Validators.maxLength(100)],
      estado: [1]
    });

    // Formulario de Referencia Personal
    this.referenciaPersonalForm = this.fb.group({
      codigo: [null],
      nombres: ['', [Validators.required, Validators.maxLength(200)]],
      cedula: ['', Validators.maxLength(20)],
      contacto: ['', Validators.maxLength(20)],
      parentesco: ['', Validators.maxLength(100)],
      estado: [1]
    });

    // Formulario de Cuenta Bancaria del Partícipe
    this.cuentaBancariaParticipeForm = this.fb.group({
      codigo: [null],
      bancoExterno: [null as BancoExterno | null, Validators.required],
      tipoCuenta: [null, Validators.required],
      numeroCuenta: ['', [Validators.required, Validators.maxLength(30)]],
      estado: [1]
    });
  }

  private cargarDatosIniciales(): void {
    this.loading.set(true);

    // Obtener códigos de la ruta
    const codigoEntidadParam = this.route.snapshot.queryParamMap.get('codigoEntidad');
    const codigoParticipeParam = this.route.snapshot.queryParamMap.get('codigoParticipe');

    if (codigoEntidadParam) this.codigoEntidad.set(+codigoEntidadParam);
    if (codigoParticipeParam) this.codigoParticipe.set(+codigoParticipeParam);

    // Cargar opciones de selects
    this.cargarOpcionesSelects();

    // Si tiene codigoEntidad pero no codigoParticipe, buscar el partícipe por la entidad
    if (codigoEntidadParam && !codigoParticipeParam) {
      const criterio = new DatosBusqueda();
      criterio.asignaValorConCampoPadre(TipoDatos.LONG, 'entidad', 'codigo', codigoEntidadParam, TipoComandosBusqueda.IGUAL);
      this.participeService.selectByCriteria([criterio]).subscribe({
        next: (participes) => {
          const p = participes?.[0];
          if (p?.codigo) {
            this.codigoParticipe.set(p.codigo);
          }
          if (this.modoEdicion()) {
            this.cargarDatosEdicion();
          } else {
            this.loading.set(false);
          }
        },
        error: () => {
          this.loading.set(false);
        }
      });
      return;
    }

    // Si es modo edición, cargar datos
    if (this.modoEdicion()) {
      this.cargarDatosEdicion();
    } else {
      this.loading.set(false);
    }
  }

  private cargarOpcionesSelects(): void {
    this.loadingFiliales.set(true);
    this.loadingTiposId.set(true);
    this.loadingTiposParticipe.set(true);

    forkJoin({
      filiales: this.filialService.getAll(),
      tiposIdentificacion: this.tipoIdentificacionService.getAll(),
      tiposParticipe: this.tipoParticipeService.getAll(),
      estadosCivil: this.estadoCivilService.getAll(),
      tiposAporte: this.tipoAporteService.getAll(),
      bancoExternos: this.bancoExternoService.getAll()
    }).subscribe({
      next: (data) => {
        this.filialesOptions.set(data.filiales || []);
        this.tiposIdentificacionOptions.set(data.tiposIdentificacion || []);
        this.tiposParticipeOptions.set(data.tiposParticipe || []);
        this.estadosCivilOptions.set(data.estadosCivil || []);
        this.tiposAporteOptions.set(data.tiposAporte || []);
        this.bancoExternosOptions.set(data.bancoExternos || []);

        // Cargar tipos de cuenta bancaria desde rubro 23
        const fromCache = this.detalleRubroService.getDetallesByParent(23);
        if (fromCache && fromCache.length > 0) {
          this.tiposCuentaBancaria.set(fromCache);
        } else {
          this.detalleRubroService.getAll().subscribe(all => {
            this.tiposCuentaBancaria.set((all || []).filter(d => d.rubro?.codigoAlterno === 23));
          });
        }

        this.loadingFiliales.set(false);
        this.loadingTiposId.set(false);
        this.loadingTiposParticipe.set(false);
      },
      error: (err) => {
        this.hasError.set(true);
        this.errorMsg.set('Error al cargar las opciones. Por favor, recargue la página.');

        this.loadingFiliales.set(false);
        this.loadingTiposId.set(false);
        this.loadingTiposParticipe.set(false);
      }
    });
  }

  private cargarDatosEdicion(): void {
    const codigoEnt = this.codigoEntidad();
    const codigoPart = this.codigoParticipe();

    if (!codigoEnt || !codigoPart) {
      this.loading.set(false);
      return;
    }

    forkJoin({
      entidad: this.entidadService.getById(codigoEnt.toString()),
      participe: this.participeService.getById(codigoPart.toString()),
      direcciones: this.direccionService.getByParent(codigoEnt),
      conyuges: this.conyugeService.getByParent(codigoEnt),
      referenciasFamiliares: this.referenciaFamiliarService.getByParent(codigoEnt),
      referenciasPersonales: this.referenciaPersonalService.getByParent(codigoEnt),
      cuentasBancarias: this.cuentaBancariaParticipeService.getByParent(codigoEnt)
    }).subscribe({
      next: (data) => {
        if (data.entidad) {
          this.entidadActual.set(data.entidad);
          this.cargarDatosEnFormularioEntidad(data.entidad);
          this.buscarExterPorCedula(data.entidad.numeroIdentificacion);
        }
        if (data.participe) {
          this.participeActual.set(data.participe);
          this.cargarDatosEnFormularioParticipe(data.participe);
        }
        // Dirección principal (porDefecto=1 o primera disponible)
        const dirs = data.direcciones || [];
        const dirPrincipal = dirs.find(d => d.porDefecto === 1) || dirs[0] || null;
        if (dirPrincipal) {
          this.direccionActual.set(dirPrincipal);
          this.cargarDatosEnFormularioDireccion(dirPrincipal);
        }
        this.conyuges.set(data.conyuges || []);
        this.referenciasFamiliares.set(data.referenciasFamiliares || []);
        this.referenciasPersonales.set(data.referenciasPersonales || []);
        this.cuentasBancariasParticipe.set(data.cuentasBancarias || []);

        this.loading.set(false);
      },
      error: (err) => {
        this.hasError.set(true);
        this.errorMsg.set('Error al cargar los datos. Por favor, intente nuevamente.');
        this.loading.set(false);
      }
    });
  }

  private cargarDatosEnFormularioEntidad(entidad: Entidad): void {
    this.entidadForm.patchValue({
      codigo: entidad.codigo,
      filial: entidad.filial,
      tipoIdentificacion: entidad.tipoIdentificacion,
      numeroIdentificacion: entidad.numeroIdentificacion || '',
      razonSocial: entidad.razonSocial || '',
      nombreComercial: entidad.nombreComercial || '',
      correoPersonal: entidad.correoPersonal || '',
      correoInstitucional: entidad.correoInstitucional || '',
      telefono: entidad.telefono || '',
      movil: entidad.movil || '',
      tieneCorreoPersonal: entidad.tieneCorreoPersonal || 0,
      tieneCorreoTrabajo: entidad.tieneCorreoTrabajo || 0,
      tieneTelefono: entidad.tieneTelefono || 0,
      idCiudad: entidad.idCiudad || '',
      tipoHidrocarburifica: entidad.tipoHidrocarburifica,
      tipoVivienda: entidad.tipoVivienda,
      estadoCivil: entidad.estadoCivil || null,
      cargasFamiliares: entidad.cargasFamiliares || 0,
      sectorPublico: entidad.sectorPublico || 0,
      porcentajeSimilitud: entidad.porcentajeSimilitud || 0,
      busqueda: entidad.busqueda || '',
      fechaNacimiento: this.funcionesDatosService.convertirFechaDesdeBackend(entidad.fechaNacimiento),
      urlFotoLogo: entidad.urlFotoLogo || '',
      idEstado: entidad.idEstado || 1,
      migrado: entidad.migrado || 0,
      usuarioIngreso: entidad.usuarioIngreso || '',
      fechaIngreso: this.funcionesDatosService.convertirFechaDesdeBackend(entidad.fechaIngreso),
      usuarioModificacion: entidad.usuarioModificacion || '',
      ipIngreso: entidad.ipIngreso || '',
      ipModificacion: entidad.ipModificacion || ''
    });
  }

  private cargarDatosEnFormularioParticipe(participe: Participe): void {
    this.participeForm.patchValue({
      codigo: participe.codigo,
      entidad: participe.entidad,
      codigoAlterno: participe.codigoAlterno || 0,
      tipoParticipante: participe.tipoParticipante,
      tipoAporte: participe.tipoAporte || null,
      remuneracionUnificada: participe.remuneracionUnificada || 0,
      fechaIngresoTrabajo: this.funcionesDatosService.convertirFechaDesdeBackend(participe.fechaIngresoTrabajo),
      lugarTrabajo: participe.lugarTrabajo || '',
      unidadAdministrativa: participe.unidadAdministrativa || '',
      cargoActual: participe.cargoActual || '',
      nivelEstudios: participe.nivelEstudios || '',
      ingresoAdicionalMensual: participe.ingresoAdicionalMensual || 0,
      ingresoAdicionalActividad: participe.ingresoAdicionalActividad || '',
      tipoCalificacion: participe.tipoCalificacion || null,
      fechaIngresoFondo: this.funcionesDatosService.convertirFechaDesdeBackend(participe.fechaIngresoFondo),
      estadoActual: participe.estadoActual || 1,
      fechaFallecimiento: this.funcionesDatosService.convertirFechaDesdeBackend(participe.fechaFallecimiento),
      causaFallecimiento: participe.causaFallecimiento || '',
      motivoSalida: participe.motivoSalida || '',
      fechaSalida: this.funcionesDatosService.convertirFechaDesdeBackend(participe.fechaSalida),
      estadoCesante: participe.estadoCesante || 0,
      fechaIngreso: this.funcionesDatosService.convertirFechaDesdeBackend(participe.fechaIngreso),
      idEstado: participe.idEstado || 1
    });
  }

  private cargarDatosEnFormularioDireccion(direccion: Direccion): void {
    this.direccionForm.patchValue({
      codigo: direccion.codigo,
      descripcion: direccion.descripcion || '',
      referencia: direccion.referencia || '',
      callePrincipal: (direccion as any).callePrincipal || '',
      calleSecundaria: (direccion as any).calleSecundaria || '',
      numero: (direccion as any).numero || '',
      telefono: direccion.telefono || '',
      celular: direccion.celular || '',
      estado: direccion.estado ?? 1
    });
  }

  guardar(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.saving.set(true);

    const entidadData = this.prepararDatosEntidad();

    const entidadObservable = this.modoEdicion()
      ? this.entidadService.update(entidadData)
      : this.entidadService.add(entidadData);

    entidadObservable.subscribe({
      next: (entidadGuardada: Entidad | null) => {
        if (entidadGuardada) {
          const participeData = this.prepararDatosParticipe(entidadGuardada);
          const participeObservable = this.modoEdicion()
            ? this.participeService.update(participeData)
            : this.participeService.add(participeData);

          participeObservable.subscribe({
            next: () => {
              // Guardar dirección si el formulario tiene datos
              this.guardarDireccion(entidadGuardada);
            },
            error: () => {
              this.hasError.set(true);
              this.errorMsg.set('Error al guardar los datos del partícipe');
              this.saving.set(false);
            }
          });
        }
      },
      error: () => {
        this.hasError.set(true);
        this.errorMsg.set('Error al guardar los datos de la entidad');
        this.saving.set(false);
      }
    });
  }

  private guardarDireccion(entidad: Entidad): void {
    const dirFormValue = this.direccionForm.getRawValue();
    const tieneDatos = dirFormValue.descripcion || dirFormValue.callePrincipal || dirFormValue.calleSecundaria;

    if (!tieneDatos) {
      this.saving.set(false);
      this.mostrarExito();
      return;
    }

    const dirData = { ...dirFormValue, entidad, porDefecto: 1, trabajo: 0 };
    const dirObs = dirFormValue.codigo
      ? this.direccionService.update(dirData)
      : this.direccionService.add(dirData);

    dirObs.subscribe({
      next: (dir) => {
        if (dir) this.direccionActual.set(dir);
        this.saving.set(false);
        this.mostrarExito();
      },
      error: () => {
        this.saving.set(false);
        this.mostrarExito(); // igual mostramos éxito aunque la dirección falle
      }
    });
  }

  private mostrarExito(): void {
    this.snackBar.open('Registro actualizado con éxito', 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['snack-success']
    });
  }

  // ─── CÓNYUGE ───────────────────────────────────────────────
  nuevoConyuge(): void {
    this.conyugeForm.reset({ estado: 1 });
    this.modoConyugeForm.set('nuevo');
  }

  editarConyuge(c: Conyuge): void {
    this.conyugeForm.patchValue({ ...c });
    this.modoConyugeForm.set('editar');
  }

  guardarConyuge(): void {
    if (this.conyugeForm.invalid) return;
    const entidad = this.entidadActual();
    if (!entidad) return;
    this.savingSubEntidad.set(true);
    const data = { ...this.conyugeForm.getRawValue(), entidad };
    const obs = data.codigo
      ? this.conyugeService.update(data)
      : this.conyugeService.add(data);
    obs.subscribe({
      next: () => {
        this.conyugeService.getByParent(entidad.codigo).subscribe(list => {
          this.conyuges.set(list || []);
        });
        this.modoConyugeForm.set(null);
        this.savingSubEntidad.set(false);
      },
      error: () => this.savingSubEntidad.set(false)
    });
  }

  eliminarConyuge(id: number): void {
    if (!confirm('¿Eliminar este cónyuge?')) return;
    this.conyugeService.delete(id).subscribe(() => {
      this.conyuges.update(list => list.filter(c => c.codigo !== id));
    });
  }

  cancelarConyuge(): void { this.modoConyugeForm.set(null); }

  // ─── REFERENCIAS FAMILIARES ─────────────────────────────────
  nuevaReferenciaFamiliar(): void {
    this.referenciaFamiliarForm.reset({ estado: 1 });
    this.modoRefFamiliarForm.set('nuevo');
  }

  editarReferenciaFamiliar(r: ReferenciaFamiliar): void {
    this.referenciaFamiliarForm.patchValue({ ...r });
    this.modoRefFamiliarForm.set('editar');
  }

  guardarReferenciaFamiliar(): void {
    if (this.referenciaFamiliarForm.invalid) return;
    const entidad = this.entidadActual();
    if (!entidad) return;
    this.savingSubEntidad.set(true);
    const data = { ...this.referenciaFamiliarForm.getRawValue(), entidad };
    const obs = data.codigo
      ? this.referenciaFamiliarService.update(data)
      : this.referenciaFamiliarService.add(data);
    obs.subscribe({
      next: () => {
        this.referenciaFamiliarService.getByParent(entidad.codigo).subscribe(list => {
          this.referenciasFamiliares.set(list || []);
        });
        this.modoRefFamiliarForm.set(null);
        this.savingSubEntidad.set(false);
      },
      error: () => this.savingSubEntidad.set(false)
    });
  }

  eliminarReferenciaFamiliar(id: number): void {
    if (!confirm('¿Eliminar esta referencia familiar?')) return;
    this.referenciaFamiliarService.delete(id).subscribe(() => {
      this.referenciasFamiliares.update(list => list.filter(r => r.codigo !== id));
    });
  }

  cancelarReferenciaFamiliar(): void { this.modoRefFamiliarForm.set(null); }

  // ─── REFERENCIAS PERSONALES ─────────────────────────────────
  nuevaReferenciaPersonal(): void {
    this.referenciaPersonalForm.reset({ estado: 1 });
    this.modoRefPersonalForm.set('nuevo');
  }

  editarReferenciaPersonal(r: ReferenciaPersonal): void {
    this.referenciaPersonalForm.patchValue({ ...r });
    this.modoRefPersonalForm.set('editar');
  }

  guardarReferenciaPersonal(): void {
    if (this.referenciaPersonalForm.invalid) return;
    const entidad = this.entidadActual();
    if (!entidad) return;
    this.savingSubEntidad.set(true);
    const data = { ...this.referenciaPersonalForm.getRawValue(), entidad };
    const obs = data.codigo
      ? this.referenciaPersonalService.update(data)
      : this.referenciaPersonalService.add(data);
    obs.subscribe({
      next: () => {
        this.referenciaPersonalService.getByParent(entidad.codigo).subscribe(list => {
          this.referenciasPersonales.set(list || []);
        });
        this.modoRefPersonalForm.set(null);
        this.savingSubEntidad.set(false);
      },
      error: () => this.savingSubEntidad.set(false)
    });
  }

  eliminarReferenciaPersonal(id: number): void {
    if (!confirm('¿Eliminar esta referencia personal?')) return;
    this.referenciaPersonalService.delete(id).subscribe(() => {
      this.referenciasPersonales.update(list => list.filter(r => r.codigo !== id));
    });
  }

  cancelarReferenciaPersonal(): void { this.modoRefPersonalForm.set(null); }

  // ─── CUENTAS BANCARIAS PARTÍCIPE ────────────────────────────
  nuevaCuentaBancaria(): void {
    this.cuentaBancariaParticipeForm.reset({ estado: 1 });
    this.modoCuentaBancariaForm.set('nuevo');
  }

  editarCuentaBancaria(cb: CuentaBancariaParticipe): void {
    this.cuentaBancariaParticipeForm.patchValue({ ...cb });
    this.modoCuentaBancariaForm.set('editar');
  }

  guardarCuentaBancaria(): void {
    if (this.cuentaBancariaParticipeForm.invalid) return;
    const entidad = this.entidadActual();
    if (!entidad) return;
    this.savingSubEntidad.set(true);
    const data = { ...this.cuentaBancariaParticipeForm.getRawValue(), entidad };
    const obs = data.codigo
      ? this.cuentaBancariaParticipeService.update(data)
      : this.cuentaBancariaParticipeService.add(data);
    obs.subscribe({
      next: () => {
        this.cuentaBancariaParticipeService.getByParent(entidad.codigo).subscribe(list => {
          this.cuentasBancariasParticipe.set(list || []);
        });
        this.modoCuentaBancariaForm.set(null);
        this.savingSubEntidad.set(false);
      },
      error: () => this.savingSubEntidad.set(false)
    });
  }

  eliminarCuentaBancaria(id: number): void {
    if (!confirm('¿Eliminar esta cuenta bancaria?')) return;
    this.cuentaBancariaParticipeService.delete(id).subscribe(() => {
      this.cuentasBancariasParticipe.update(list => list.filter(c => c.codigo !== id));
    });
  }

  cancelarCuentaBancaria(): void { this.modoCuentaBancariaForm.set(null); }

  // ─── EXTER HISTÓRICO ────────────────────────────────────────
  private buscarExterPorCedula(cedula: string | null | undefined): void {
    if (!cedula) return;
    this.loadingExter.set(true);
    this.exterService.getById(cedula).subscribe({
      next: (exter) => {
        this.exterData.set(exter ?? null);
        this.loadingExter.set(false);
      },
      error: () => {
        this.exterData.set(null);
        this.loadingExter.set(false);
      }
    });
  }

  verDatosHistoricos(): void {
    const exter = this.exterData();
    if (!exter) return;
    this.dialog.open(ExterHistoricoDialogComponent, {
      data: { exter },
      width: '820px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false
    });
  }

  getNombreTipoCuenta(codigoAlterno: number): string {
    return this.tiposCuentaBancaria().find(t => t.codigoAlterno === codigoAlterno)?.descripcion ?? String(codigoAlterno);
  }

  private prepararDatosEntidad(): any {
    const formValue = this.entidadForm.getRawValue();

    // Convertir checkboxes boolean → Long (0/1) que espera el backend
    formValue.tieneCorreoPersonal = formValue.tieneCorreoPersonal ? 1 : 0;
    formValue.tieneCorreoTrabajo  = formValue.tieneCorreoTrabajo  ? 1 : 0;
    formValue.tieneTelefono       = formValue.tieneTelefono       ? 1 : 0;

    // Formatear fechas
    const datosFormateados = this.funcionesDatosService.formatearFechasParaBackend(formValue, [
      { campo: 'fechaNacimiento', tipo: TipoFormatoFechaBackend.SOLO_FECHA },
      { campo: 'fechaIngreso', tipo: TipoFormatoFechaBackend.FECHA_HORA }
    ]);

    return datosFormateados;
  }

  private prepararDatosParticipe(entidad: Entidad): any {
    const formValue = this.participeForm.getRawValue();

    // Asignar la entidad guardada
    formValue.entidad = entidad;

    // Formatear fechas
    const datosFormateados = this.funcionesDatosService.formatearFechasParaBackend(formValue, [
      { campo: 'fechaIngresoTrabajo', tipo: TipoFormatoFechaBackend.FECHA_HORA_ISO },
      { campo: 'fechaIngresoFondo', tipo: TipoFormatoFechaBackend.FECHA_HORA_ISO },
      { campo: 'fechaFallecimiento', tipo: TipoFormatoFechaBackend.FECHA_HORA_ISO },
      { campo: 'fechaSalida', tipo: TipoFormatoFechaBackend.FECHA_HORA_ISO },
      { campo: 'fechaIngreso', tipo: TipoFormatoFechaBackend.FECHA_HORA_ISO }
    ]);

    return datosFormateados;
  }

  // Comparador para selects con objetos
  compararPorCodigo(obj1: any, obj2: any): boolean {
    return obj1 && obj2 && obj1.codigo === obj2.codigo;
  }

  // Validación de campos
  esCampoInvalido(nombreCampo: string, formulario: 'entidad' | 'participe' = 'entidad'): boolean {
    const form = formulario === 'entidad' ? this.entidadForm : this.participeForm;
    const campo = form.get(nombreCampo);
    return !!(campo && campo.invalid && (campo.dirty || campo.touched));
  }

  obtenerErrorCampo(nombreCampo: string, formulario: 'entidad' | 'participe' = 'entidad'): string {
    const form = formulario === 'entidad' ? this.entidadForm : this.participeForm;
    const campo = form.get(nombreCampo);

    if (campo?.hasError('required')) return 'Este campo es requerido';
    if (campo?.hasError('email')) return 'Email inválido';
    if (campo?.hasError('maxlength')) return `Máximo ${campo.errors?.['maxlength'].requiredLength} caracteres`;
    if (campo?.hasError('min')) return `Valor mínimo: ${campo.errors?.['min'].min}`;
    if (campo?.hasError('max')) return `Valor máximo: ${campo.errors?.['max'].max}`;

    return 'Campo inválido';
  }

  limpiarFormulario(): void {
    this.entidadForm.reset({
      idEstado: 1,
      migrado: 0,
      sectorPublico: 0,
      cargasFamiliares: 0,
      porcentajeSimilitud: 0,
      tieneCorreoPersonal: 0,
      tieneCorreoTrabajo: 0,
      tieneTelefono: 0,
      estadoCivil: null
    });

    this.participeForm.reset({
      idEstado: 1,
      estadoActual: 1,
      estadoCesante: 0,
      remuneracionUnificada: 0,
      ingresoAdicionalMensual: 0,
      codigoAlterno: 0,
      tipoCalificacion: null,
      tipoAporte: null
    });

    this.direccionForm.reset({ estado: 1 });
  }

  regresar(): void {
    // Intentar obtener el returnUrl de los query params
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');

    if (returnUrl) {
      // Si hay returnUrl, navegar allí con los códigos
      this.router.navigate([returnUrl], {
        queryParams: {
          codigoEntidad: this.codigoEntidad(),
          codigoParticipe: this.codigoParticipe()
        }
      });
    } else {
      // Por defecto, ir al dashboard de partícipes
      this.router.navigate(['/menucreditos/participe-dash']);
    }
  }
}

