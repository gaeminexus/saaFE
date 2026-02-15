import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { PlantillaService } from '../../../../cnt/service/plantilla.service';
import { CajaLogica } from '../../../model/caja-logica';
import { PersonaRol } from '../../../model/persona-rol';
import { TempCobro } from '../../../model/temp-cobro';
import { Titular } from '../../../model/titular';
import { CajaLogicaService } from '../../../service/caja-logica.service';
import { PersonaCuentaContableService } from '../../../service/persona-cuenta-contable.service';
import { PersonaRolService } from '../../../service/persona-rol.service';
import { TempCobroService } from '../../../service/temp-cobro.service';
import { TitularService } from '../../../service/titular.service';

@Component({
  selector: 'app-cobros-ingresar',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './cobros-ingresar.component.html',
  styleUrls: ['./cobros-ingresar.component.scss'],
})
export class CobrosIngresarComponent implements OnInit {
  title = 'INGRESO COBRO';

  tiposIdentificacion = signal<DetalleRubro[]>([]);
  cajasLogicas = signal<CajaLogica[]>([]);
  estadosCobro = signal<DetalleRubro[]>([]);
  motivosAnulacion = signal<DetalleRubro[]>([]);
  rolesCliente = signal<number[]>([]);
  personasClientes = signal<number[]>([]);

  // Form state based on TempCobro
  tipoId = signal<number | null>(null); // 1=Cedula, 2=RUC, 3=Pasaporte
  numeroId = signal<string>('');
  cliente = signal<string>('');
  descripcion = signal<string>('');
  fecha = signal<Date | null>(new Date());
  nombreUsuario = signal<string>('');
  valor = signal<number | null>(null);
  tipoCobro = signal<number | null>(1); // 1=Factura, 2=Anticipo
  formaPago = signal<string>('');
  clienteBloqueado = signal<boolean>(true);
  descripcionBloqueada = signal<boolean>(true);
  cajaLogicaBloqueada = signal<boolean>(false);
  formHabilitado = signal<boolean>(true);
  idCobro = signal<number | null>(null);
  formasPago = ['EFECTIVO', 'CHEQUE', 'TARJETA', 'TRANSFERENCIA', 'RETENCION'] as const;

  // Rubros (placeholders)
  rubroEstadoH = signal<number | null>(null); // Detalle Rubro 28
  rubroMotivoAnulacionH = signal<number | null>(null); // Detalle Rubro 29

  // Caja lógica / Persona (placeholder selects)
  cajaLogicaId = signal<number | null>(null);
  personaId = signal<number | null>(null);

  private readonly RUBRO_TIPO_IDENTIFICACION = 36;
  private readonly RUBRO_ESTADO_COBRO = 28;
  private readonly RUBRO_MOTIVO_ANULACION = 29;
  private readonly RUBRO_ROL_TITULAR = 55;
  private readonly PLANTILLA_RETENCIONES = 2;
  private readonly PLANTILLA_TARJETA_CREDITO = 3;
  private readonly PLANTILLA_MOTIVOS_COBRO = 7;

  constructor(
    private detalleRubroService: DetalleRubroService,
    private cajaLogicaService: CajaLogicaService,
    private titularService: TitularService,
    private personaCuentaContableService: PersonaCuentaContableService,
    private personaRolService: PersonaRolService,
    private tempCobroService: TempCobroService,
    private plantillaService: PlantillaService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.nombreUsuario.set(this.getNombreUsuarioLocal());
    this.cargarRubros();
    this.cargarRolesCliente();
    this.cargarCajasLogicas();
    this.validarPlantillas();
  }

  private cargarRubros(): void {
    const tiposI = this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION);
    this.tiposIdentificacion.set(tiposI);

    const estados = this.detalleRubroService.getDetallesByParent(this.RUBRO_ESTADO_COBRO);
    this.estadosCobro.set(estados);
    this.rubroEstadoH.set(this.findEstadoIngresado(estados));

    const motivos = this.detalleRubroService.getDetallesByParent(this.RUBRO_MOTIVO_ANULACION);
    this.motivosAnulacion.set(motivos);

    if (tiposI.length === 0 || estados.length === 0 || motivos.length === 0) {
      this.detalleRubroService.inicializar().subscribe(() => {
        this.tiposIdentificacion.set(
          this.detalleRubroService.getDetallesByParent(this.RUBRO_TIPO_IDENTIFICACION),
        );
        const estadosActualizados = this.detalleRubroService.getDetallesByParent(
          this.RUBRO_ESTADO_COBRO,
        );
        this.estadosCobro.set(estadosActualizados);
        this.rubroEstadoH.set(this.findEstadoIngresado(estadosActualizados));
        this.motivosAnulacion.set(
          this.detalleRubroService.getDetallesByParent(this.RUBRO_MOTIVO_ANULACION),
        );
      });
    }
  }

  private cargarCajasLogicas(): void {
    this.cajaLogicaService.getAll().subscribe({
      next: (data: CajaLogica[] | null) => {
        const cajas = data ?? [];
        this.cajasLogicas.set(cajas);
        if (cajas.length === 0) {
          this.formHabilitado.set(false);
          this.mostrarAviso('EL USUARIO NO TIENE CAJAS ASIGNADAS');
          return;
        }
        if (cajas.length === 1) {
          this.cajaLogicaId.set(cajas[0].codigo ?? null);
          this.cajaLogicaBloqueada.set(true);
        }
      },
      error: (error: any) => {
        console.error('Error al cargar cajas logicas', error);
        this.cajasLogicas.set([]);
        this.formHabilitado.set(false);
        this.mostrarAviso('EL USUARIO NO TIENE CAJAS ASIGNADAS');
      },
    });
  }

  private cargarRolesCliente(): void {
    const roles = this.detalleRubroService.getDetallesByParent(this.RUBRO_ROL_TITULAR);
    if (roles.length === 0) {
      this.detalleRubroService.inicializar().subscribe(() => {
        const rolesActualizados = this.detalleRubroService.getDetallesByParent(
          this.RUBRO_ROL_TITULAR,
        );
        this.rolesCliente.set(this.filtrarRolesCliente(rolesActualizados));
        this.cargarPersonasConRolCliente();
      });
    } else {
      this.rolesCliente.set(this.filtrarRolesCliente(roles));
      this.cargarPersonasConRolCliente();
    }
  }

  private cargarPersonasConRolCliente(): void {
    const roles = this.rolesCliente();
    if (roles.length === 0) {
      this.personasClientes.set([]);
      return;
    }

    this.personaRolService.getAll().subscribe({
      next: (data: PersonaRol[] | null) => {
        const items = data ?? [];
        const personas = items
          .filter((item) => roles.includes(item.rubroRolPersonaH))
          .map((item) => item.titular?.codigo)
          .filter((codigo): codigo is number => Number.isFinite(codigo));
        this.personasClientes.set(personas);
      },
      error: (error: any) => {
        console.error('Error al cargar roles de clientes', error);
        this.personasClientes.set([]);
      },
    });
  }

  private filtrarRolesCliente(roles: DetalleRubro[]): number[] {
    return roles
      .filter((rol) => rol.descripcion?.toUpperCase().includes('CLIENTE'))
      .map((rol) => rol.codigo);
  }

  updateNumeroId(value: string): void {
    this.numeroId.set(this.normalizeUpper(value));
  }

  updateCliente(value: string): void {
    this.cliente.set(this.normalizeUpper(value));
  }

  updateDescripcion(value: string): void {
    this.descripcion.set(this.normalizeUpper(value));
  }

  updateNombreUsuario(value: string): void {
    this.nombreUsuario.set(this.normalizeUpper(value));
  }

  updateValor(value: string): void {
    const parsed = Number(value);
    this.valor.set(Number.isFinite(parsed) ? parsed : null);
  }

  cancelar(): void {
    this.tipoId.set(null);
    this.numeroId.set('');
    this.cliente.set('');
    this.descripcion.set('');
    this.fecha.set(new Date());
    this.nombreUsuario.set(this.getNombreUsuarioLocal());
    this.valor.set(null);
    this.tipoCobro.set(1);
    this.formaPago.set('');
    this.rubroEstadoH.set(null);
    this.rubroMotivoAnulacionH.set(null);
    this.cajaLogicaId.set(null);
    this.personaId.set(null);
    this.clienteBloqueado.set(true);
    this.descripcionBloqueada.set(true);
  }

  guardar(): void {
    if (!this.formHabilitado()) {
      this.mostrarAviso('La pantalla no esta habilitada: faltan plantillas del sistema.');
      return;
    }

    if (!this.numeroId() || !this.cliente() || !this.descripcion()) {
      this.mostrarAviso('Complete CI/RUC, cliente y descripcion.');
      return;
    }

    if (!this.cajaLogicaId() || !this.tipoCobro() || !this.formaPago()) {
      this.mostrarAviso('Seleccione caja contable, tipo de cobro y forma de pago.');
      return;
    }

    if (!this.personaId()) {
      this.mostrarAviso('No se pudo determinar el cliente. Verifique la identificacion.');
      return;
    }

    const empresaCodigo = this.getEmpresaCodigo();
    const estadoIngresado = this.rubroEstadoH() ?? this.findEstadoIngresado(this.estadosCobro());

    const cobro: Partial<TempCobro> = {
      codigo: this.idCobro() ?? 0,
      tipoId: this.tipoId() ?? this.resolveTipoId(this.numeroId()),
      numeroId: this.numeroId(),
      cliente: this.cliente(),
      descripcion: this.descripcion(),
      fecha: this.fecha() ?? new Date(),
      nombreUsuario: this.nombreUsuario(),
      valor: Number(this.valor() ?? 0),
      empresa: empresaCodigo ? ({ codigo: empresaCodigo } as any) : ({} as any),
      cajaLogica: { codigo: this.cajaLogicaId() } as any,
      persona: { codigo: this.personaId() } as any,
      rubroEstadoP: this.RUBRO_ESTADO_COBRO,
      rubroEstadoH: estadoIngresado ?? 0,
      rubroMotivoAnulacionP: this.RUBRO_MOTIVO_ANULACION,
      rubroMotivoAnulacionH: this.rubroMotivoAnulacionH() ?? 0,
      tipoCobro: this.tipoCobro() ?? 1,
    };

    this.tempCobroService.add(cobro).subscribe({
      next: (response: TempCobro | null) => {
        if (response?.codigo) {
          this.idCobro.set(response.codigo);
        }
        this.mostrarExito('Cobro temporal guardado.');
      },
      error: (error: any) => {
        console.error('Error al guardar cobro temporal', error);
        this.mostrarAviso('No se pudo guardar el cobro temporal.');
      },
    });
  }

  getTitularLabel(titular: Titular): string {
    if (titular.razonSocial && titular.razonSocial.trim() !== '') {
      return titular.razonSocial;
    }

    const apellido = titular.apellido || titular.apellidos || '';
    const nombre = titular.nombre || titular.nombres || '';
    const fullName = `${apellido} ${nombre}`.trim();

    if (fullName !== '') {
      return fullName;
    }

    return titular.identificacion || '';
  }

  getCajaLogicaLabel(caja: CajaLogica): string {
    return caja.nombre || caja.cuentaContable || '';
  }

  private normalizeUpper(value: string): string {
    return value?.toString().trim().toUpperCase() ?? '';
  }

  verificarIdentificacion(): void {
    const identificacion = this.numeroId().trim();
    if (!identificacion) {
      this.cliente.set('');
      this.personaId.set(null);
      this.clienteBloqueado.set(true);
      this.descripcionBloqueada.set(true);
      return;
    }

    const tipoId = this.resolveTipoId(identificacion);
    this.tipoId.set(tipoId);
    this.buscarCliente(identificacion);
  }

  onTipoCobroChange(value: number | null): void {
    this.tipoCobro.set(value);
    if (value) {
      this.validarTipoCobro(value);
    }
  }

  private buscarCliente(identificacion: string): void {
    this.titularService.selectByCriteria({ identificacion, estado: 1 }).subscribe({
      next: (data: Titular[] | null) => {
        const titulares = data ?? [];
        if (titulares.length === 0) {
          this.cliente.set('');
          this.personaId.set(null);
          this.clienteBloqueado.set(true);
          this.descripcionBloqueada.set(true);
          this.mostrarAviso('El cliente no existe. Registre la persona en Titulares.');
          return;
        }

        const titular = titulares[0];
        if (!this.personasClientes().includes(titular.codigo)) {
          this.personaId.set(null);
          this.cliente.set('');
          this.clienteBloqueado.set(true);
          this.descripcionBloqueada.set(true);
          this.mostrarAviso('El titular no tiene rol Cliente.');
          return;
        }
        this.personaId.set(titular.codigo ?? null);
        this.cliente.set(this.getTitularLabel(titular));
        this.clienteBloqueado.set(true);
        this.descripcionBloqueada.set(false);

        if (titular.tipoCliente !== undefined && titular.tipoCliente !== 1) {
          this.mostrarAviso('La persona no esta registrada como cliente.');
        }
      },
      error: (error: any) => {
        console.error('Error al buscar cliente', error);
        this.mostrarAviso('No se pudo validar el cliente.');
      },
    });
  }

  private validarTipoCobro(tipoCobro: number): void {
    const personaCodigo = this.personaId();
    if (!personaCodigo) {
      this.tipoCobro.set(null);
      this.mostrarAviso('Ingrese un cliente antes de seleccionar tipo de cobro.');
      return;
    }

    const empresaCodigo = this.getEmpresaCodigo();
    const criteria: any = {
      persona: { codigo: personaCodigo },
      tipoPersona: 1,
    };
    if (empresaCodigo) {
      criteria.empresa = { codigo: empresaCodigo };
    }

    this.personaCuentaContableService.selectByCriteria(criteria).subscribe({
      next: (data: any[] | null) => {
        const cuentas = data ?? [];
        if (cuentas.length === 0) {
          this.tipoCobro.set(null);
          this.mostrarAviso('El cliente no tiene cuentas contables asignadas.');
          return;
        }

        const permitido = cuentas.some((cuenta) => cuenta.tipoCuenta === tipoCobro);
        if (!permitido) {
          this.tipoCobro.set(null);
          this.mostrarAviso('El cliente no tiene habilitado este tipo de cobro.');
        }
      },
      error: (error: any) => {
        console.error('Error al validar tipo de cobro', error);
        this.mostrarAviso('No se pudo validar el tipo de cobro.');
      },
    });
  }

  private validarPlantillas(): void {
    this.plantillaService.getAll().subscribe({
      next: (data) => {
        const plantillas = data ?? [];
        const empresaCodigo = this.getEmpresaCodigo();
        const filtradas = empresaCodigo
          ? plantillas.filter((p) => p.empresa?.codigo === empresaCodigo)
          : plantillas;

        const requeridas = [
          this.PLANTILLA_RETENCIONES,
          this.PLANTILLA_TARJETA_CREDITO,
          this.PLANTILLA_MOTIVOS_COBRO,
        ];

        const existentes = new Set(
          filtradas.map((p) => p.codigoAlterno).filter((v): v is number => !!v),
        );
        const faltantes = requeridas.filter((codigo) => !existentes.has(codigo));
        if (faltantes.length > 0) {
          this.formHabilitado.set(false);
          this.mostrarAviso('Faltan plantillas del sistema para cobros.');
        }
      },
      error: (error: any) => {
        console.error('Error al validar plantillas', error);
        this.mostrarAviso('No se pudo validar plantillas del sistema.');
      },
    });
  }

  private resolveTipoId(identificacion: string): number {
    const length = identificacion?.trim().length ?? 0;
    if (length === 10) {
      return 1;
    }
    if (length === 13) {
      return 2;
    }
    return 3;
  }

  private findEstadoIngresado(estados: DetalleRubro[]): number | null {
    const match = estados.find((estado) => estado.descripcion?.toUpperCase().includes('INGRESADO'));
    return match?.codigo ?? null;
  }

  private getEmpresaCodigo(): number | null {
    const raw = localStorage.getItem('idEmpresa');
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private getNombreUsuarioLocal(): string {
    const username = localStorage.getItem('userName') || localStorage.getItem('usuario');
    return this.normalizeUpper(username ?? '');
  }

  private mostrarAviso(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar'],
    });
  }

  private mostrarExito(message: string): void {
    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar'],
    });
  }
}
