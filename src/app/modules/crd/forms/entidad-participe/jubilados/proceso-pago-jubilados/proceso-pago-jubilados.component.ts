import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { usuarioSesion } from '../../../../../../shared/services/usuario-sesion';
import { DatosBusqueda } from '../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Aporte } from '../../../../model/aporte';
import { Entidad } from '../../../../model/entidad';
import { CodigoEstadoParticipe } from '../../../../model/estado-participe';
import { ValorPagoPensionComplementaria } from '../../../../model/valor-pago-pension-complementaria';
import { AporteService } from '../../../../service/aporte.service';
import { EntidadService } from '../../../../service/entidad.service';
import { ValorPagoPensionComplementariaService } from '../../../../service/valor-pago-pension-complementaria.service';
import {
  VerificacionCuentaCertificado,
  VerificacionCuentaCertificadoService,
} from '../../../../service/verificacion-cuenta-certificado.service';
import { CorridaMesPagoJubiladosComponent } from './corrida-mes/corrida-mes-pago-jubilados.component';
import { SeguimientoPagoJubiladosComponent } from './seguimiento/seguimiento-pago-jubilados.component';

@Component({
  selector: 'app-proceso-pago-jubilados',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialFormModule,
    MatTableModule,
    MatPaginatorModule,
    MatTabsModule,
    CorridaMesPagoJubiladosComponent,
    SeguimientoPagoJubiladosComponent,
  ],
  templateUrl: './proceso-pago-jubilados.component.html',
  styleUrl: './proceso-pago-jubilados.component.scss',
})
export class ProcesoPagoJubiladosComponent implements OnInit {
  /** Expuesto al template para no repetir el código en el HTML. */
  protected readonly EstadoJubiladoComplementario = CodigoEstadoParticipe.JUBILADO_COMPLEMENTARIO;

  private static readonly ESTADO_JUBILADO_COMPLEMENTARIO =
    CodigoEstadoParticipe.JUBILADO_COMPLEMENTARIO;
  private static readonly ESTADO_REGISTRO_ACTIVO = 1;
  private static readonly ESTADO_REGISTRO_INACTIVO = 0;

  private fb = inject(FormBuilder);
  private entidadService = inject(EntidadService);
  private aporteService = inject(AporteService);
  private valorPagoService = inject(ValorPagoPensionComplementariaService);
  private verificacionService = inject(VerificacionCuentaCertificadoService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  filtrosForm!: FormGroup;
  asignacionForm!: FormGroup;
  entidades = signal<Entidad[]>([]);
  /** Universo completo de JUBILADO_COMPLEMENTARIO (sin filtro de nombre/cédula) — para «sin pensión asignada». */
  private universoJubilados = signal<Entidad[]>([]);
  cargandoUniverso = signal<boolean>(false);
  /** «Ver solo los que no tienen pensión asignada» — sección 1 deja de usar la búsqueda por texto. */
  soloSinPension = signal<boolean>(false);
  /** Resultado crudo de `getAll()`, sin filtrar — activos e inactivos. Fuente de verdad para "existente". */
  private todasAsignaciones = signal<ValorPagoPensionComplementaria[]>([]);
  /** Lo que se ve en la tabla: activos siempre, inactivos solo si `mostrarInactivos()`. */
  asignaciones = signal<ValorPagoPensionComplementaria[]>([]);
  /** «Ver inactivos» — el padrón por defecto NO los muestra: si no, "sacar del padrón" no se vería en pantalla. */
  mostrarInactivos = signal<boolean>(false);
  /** «Ver solo sin seguro asignado» — activa + `valorSeguro` nulo o en cero. */
  soloSinSeguro = signal<boolean>(false);
  entidadSeleccionada = signal<Entidad | null>(null);
  isLoading = signal<boolean>(false);
  isLoadingSaldos = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  isLoadingAsignaciones = signal<boolean>(false);
  busquedaRealizada = signal<boolean>(false);
  totalPagarMensual = signal<number>(0);
  saldosPensionMap = signal<Map<number, number>>(new Map<number, number>());

  /** Cuenta bancaria activa + certificado por partícipe, para las columnas del resumen (sección 3). */
  isLoadingVerificacion = signal<boolean>(false);
  verificacionMap = signal<Map<number, VerificacionCuentaCertificado>>(new Map());
  /** No nulo si NINGÚN jubilado con cuenta tiene certificado — probable catálogo sin cargar. NO degradar a un simple "Falta". */
  avisoCertificadosPadron = signal<string | null>(null);

  displayedColumns: string[] = ['cedula', 'nombre', 'estado', 'saldoPension', 'acciones'];
  displayedColumnsAsignaciones: string[] = ['cedula', 'nombre', 'valorRegistrado', 'cuotas', 'valorMensual', 'tienePrestamo', 'valorSeguro', 'cuentaBancaria', 'certificado', 'acciones'];
  dataSource = new MatTableDataSource<Entidad>([]);
  dataSourceAsignaciones = new MatTableDataSource<ValorPagoPensionComplementaria>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('paginatorAsignaciones') paginatorAsignaciones!: MatPaginator;

  ngOnInit(): void {
    this.filtrosForm = this.fb.group({
      nombre: [''],
      cedula: [''],
    });

    this.asignacionForm = this.fb.group({
      valorPagar: [null],
      numeroCuotas: [null],
      tienePrestamo: [false],
      valorSeguro: [null],
    });

    // Filtro sobre "3. Resumen de pagos asignados": texto (cédula/nombre) + «solo sin seguro»,
    // combinados en un JSON dentro de `.filter` porque `MatTableDataSource` solo admite un
    // predicado con un string. Convive con «Ver inactivos» porque filtra sobre
    // `dataSourceAsignaciones.data`, que ya está recortado (o no) por `actualizarVistaAsignaciones()`.
    // `todasAsignaciones` (la fuente de verdad para detectar duplicados, corregido en 347af9a)
    // nunca se toca acá.
    this.dataSourceAsignaciones.filterPredicate = (item, filtroJson) => {
      const filtro = JSON.parse(filtroJson) as { texto: string; soloSinSeguro: boolean };
      const cedula = (item.entidad?.numeroIdentificacion || '').toLowerCase();
      const nombre = (item.entidad?.razonSocial || '').toLowerCase();
      const coincideTexto = !filtro.texto || cedula.includes(filtro.texto) || nombre.includes(filtro.texto);
      const coincideSeguro = !filtro.soloSinSeguro || this.esSinSeguro(item);
      return coincideTexto && coincideSeguro;
    };
    this.aplicarFiltroAsignaciones();

    this.cargarAsignaciones();
    this.cargarUniversoJubilados();
  }

  private filtroTextoAsignaciones = '';

  filtrarAsignaciones(valor: string): void {
    this.filtroTextoAsignaciones = valor.trim().toLowerCase();
    this.aplicarFiltroAsignaciones();
  }

  toggleSoloSinSeguro(): void {
    this.soloSinSeguro.set(!this.soloSinSeguro());
    this.aplicarFiltroAsignaciones();
  }

  private aplicarFiltroAsignaciones(): void {
    this.dataSourceAsignaciones.filter = JSON.stringify({
      texto: this.filtroTextoAsignaciones,
      soloSinSeguro: this.soloSinSeguro(),
    });
    if (this.dataSourceAsignaciones.paginator) {
      this.dataSourceAsignaciones.paginator.firstPage();
    }
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.paginatorAsignaciones) {
      this.dataSourceAsignaciones.paginator = this.paginatorAsignaciones;
    }
  }

  private construirCriterioEstadoJubilado(): DatosBusqueda {
    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'idEstado',
      ProcesoPagoJubiladosComponent.ESTADO_JUBILADO_COMPLEMENTARIO.toString(),
      TipoComandosBusqueda.IGUAL,
    );
    return criterioEstado;
  }

  /**
   * Universo completo de jubilados (sin nombre/cédula) para armar «sin pensión asignada» —
   * son los que la corrida va a rechazar con `SIN_VALOR_PENSION`. ~187 entidades, una sola consulta.
   */
  private cargarUniversoJubilados(): void {
    this.cargandoUniverso.set(true);
    this.entidadService.selectByCriteria([this.construirCriterioEstadoJubilado()]).subscribe({
      next: (rows) => {
        this.universoJubilados.set(rows || []);
        this.cargandoUniverso.set(false);
        if (this.soloSinPension()) {
          this.actualizarVistaSeccion1();
        }
      },
      error: () => {
        this.universoJubilados.set([]);
        this.cargandoUniverso.set(false);
      },
    });
  }

  /**
   * «Sin pensión asignada» = JUBILADO_COMPLEMENTARIO sin `VPPC` ACTIVA. ⛔ Una `VPPC` inactiva
   * (sacada del padrón) SÍ entra acá: efectivamente no se le va a pagar, no es «ya tiene».
   */
  get sinPensionFijada(): Entidad[] {
    const conPensionActiva = new Set(
      this.todasAsignaciones()
        .filter((a) => this.esRegistroActivo(a))
        .map((a) => a.entidad?.codigo)
        .filter((c): c is number => c != null),
    );
    return this.universoJubilados().filter((e) => !conPensionActiva.has(e.codigo));
  }

  /** De los que sí tienen pensión activa, cuántos no tienen cuenta bancaria — junto al de arriba, mide el trabajo de oficina pendiente. */
  get cantidadSinCuentaBancaria(): number {
    return this.todasAsignaciones().filter((a) => this.esRegistroActivo(a) && !this.tieneCuentaActivaDe(a)).length;
  }

  /**
   * Configuración activa con `valorSeguro` nulo o en cero. ⚠️ NO es necesariamente un error: un
   * jubilado puede legítimamente no tener seguro de salud — la pantalla informa, no acusa.
   */
  private esSinSeguro(item: ValorPagoPensionComplementaria): boolean {
    return this.esRegistroActivo(item) && (item.valorSeguro == null || Number(item.valorSeguro) === 0);
  }

  get cantidadSinSeguro(): number {
    return this.todasAsignaciones().filter((a) => this.esSinSeguro(a)).length;
  }

  toggleSoloSinPension(): void {
    this.soloSinPension.set(!this.soloSinPension());
    this.actualizarVistaSeccion1();
  }

  /** Alterna qué alimenta la tabla de la sección 1: la búsqueda por texto, o «sin pensión asignada». */
  private actualizarVistaSeccion1(): void {
    if (this.soloSinPension()) {
      const data = this.sinPensionFijada;
      this.entidades.set(data);
      this.dataSource.data = data;
      this.cargarSaldosPensionComplementaria(data);
      setTimeout(() => {
        if (this.paginator) {
          this.dataSource.paginator = this.paginator;
        }
      });
      this.busquedaRealizada.set(true);
    } else {
      this.entidades.set([]);
      this.dataSource.data = [];
      this.saldosPensionMap.set(new Map<number, number>());
      this.busquedaRealizada.set(false);
    }
  }

  buscar(): void {
    if (this.soloSinPension()) {
      return;
    }
    const nombre = (this.filtrosForm.get('nombre')?.value || '').trim();
    const cedula = (this.filtrosForm.get('cedula')?.value || '').trim();

    const criterios: DatosBusqueda[] = [this.construirCriterioEstadoJubilado()];

    if (nombre) {
      const criterioNombre = new DatosBusqueda();
      criterioNombre.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'razonSocial',
        nombre,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(criterioNombre);
    }

    if (cedula) {
      const criterioCedula = new DatosBusqueda();
      criterioCedula.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'numeroIdentificacion',
        cedula,
        TipoComandosBusqueda.LIKE,
      );
      criterios.push(criterioCedula);
    }

    const orderByNombre = new DatosBusqueda();
    orderByNombre.orderBy('razonSocial');
    orderByNombre.setTipoOrden(DatosBusqueda.ORDER_ASC);
    criterios.push(orderByNombre);

    this.isLoading.set(true);

    this.entidadService.selectByCriteria(criterios).subscribe({
      next: (rows) => {
        const data = rows || [];
        this.entidades.set(data);
        this.dataSource.data = data;
        this.cargarSaldosPensionComplementaria(data);
        setTimeout(() => {
          if (this.paginator) {
            this.dataSource.paginator = this.paginator;
          }
        });
        this.busquedaRealizada.set(true);
        this.isLoading.set(false);
      },
      error: () => {
        this.entidades.set([]);
        this.dataSource.data = [];
        this.busquedaRealizada.set(true);
        this.isLoading.set(false);
        this.snackBar.open('Error al consultar jubilados', 'Cerrar', { duration: 3000 });
      },
    });
  }

  limpiarFiltros(): void {
    this.filtrosForm.reset({ nombre: '', cedula: '' });
    this.entidades.set([]);
    this.dataSource.data = [];
    this.saldosPensionMap.set(new Map<number, number>());
    this.busquedaRealizada.set(false);
  }

  obtenerSaldoPensionComplementaria(entidad: Entidad): number {
    if (!entidad?.codigo) {
      return 0;
    }

    return this.saldosPensionMap().get(entidad.codigo) || 0;
  }

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada.set(entidad);
    const existente = this.todasAsignaciones().find((item) => item.entidad?.codigo === entidad.codigo);

    this.asignacionForm.patchValue({
      valorPagar: existente?.valorPagar ?? null,
      numeroCuotas: existente?.numeroCuotas ?? null,
      tienePrestamo: (existente?.tienePrestamo ?? 0) === 1,
      valorSeguro: existente?.valorSeguro ?? null,
    });
  }

  guardarAsignacion(): void {
    const entidad = this.entidadSeleccionada();
    if (!entidad?.codigo) {
      this.snackBar.open('Seleccione primero un jubilado', 'Cerrar', { duration: 3000 });
      return;
    }

    const valorPagar = Number(this.asignacionForm.get('valorPagar')?.value ?? 0);
    const numeroCuotasRaw = this.asignacionForm.get('numeroCuotas')?.value;
    const numeroCuotas = numeroCuotasRaw === null || numeroCuotasRaw === '' ? null : Number(numeroCuotasRaw);
    const tienePrestamo = this.asignacionForm.get('tienePrestamo')?.value ? 1 : 0;
    const valorSeguroRaw = this.asignacionForm.get('valorSeguro')?.value;
    const valorSeguro = valorSeguroRaw === null || valorSeguroRaw === '' ? null : Number(valorSeguroRaw);

    if (!Number.isFinite(valorPagar) || valorPagar <= 0) {
      this.snackBar.open('Ingrese un valor de pago mensual válido', 'Cerrar', { duration: 3000 });
      return;
    }

    if (numeroCuotas !== null && (!Number.isFinite(numeroCuotas) || numeroCuotas <= 0)) {
      this.snackBar.open('El número de cuotas debe ser mayor a cero', 'Cerrar', { duration: 3000 });
      return;
    }

    // ⛔ `fechaModificacion`/`fechaIngreso` son `LocalDateTime` en el backend y NO viajan: el
    // formato por defecto de `formatearFechaParaBackend` es "yyyy-MM-dd HH:mm:ss" (con espacio),
    // y `LocalDateTime` exige ISO con `T` — el backend respondía 400
    // ("Cannot deserialize value of type java.time.LocalDateTime from String ...") en cada
    // guardado. `TipoFormatoFechaBackend.FECHA_HORA_ISO` no sirve de reemplazo: fija la hora en
    // 00:00:00 (está pensado para un `LocalDate` representado como `LocalDateTime`), así que
    // mandaría una fecha de auditoría falsa en vez de la real. Son campos de auditoría que el
    // backend puede resolver solo; lo que importa de verdad es `usuarioModificacion`/`usuarioIngreso`.
    const payloadBase: Partial<ValorPagoPensionComplementaria> = {
      entidad: { codigo: entidad.codigo } as Entidad,
      valorPagar,
      numeroCuotas,
      tienePrestamo,
      valorSeguro,
      estado: ProcesoPagoJubiladosComponent.ESTADO_REGISTRO_ACTIVO,
      usuarioModificacion: usuarioSesion(),
    };

    // Busca en TODAS (no solo en las visibles): si el jubilado tenía un VPPC inactivo, guardar
    // acá lo actualiza y lo reactiva (siempre graba `estado: ACTIVO`, ver `payloadBase`), en vez
    // de crear un segundo registro duplicado para la misma entidad.
    const existente = this.todasAsignaciones().find((item) => item.entidad?.codigo === entidad.codigo);

    this.isSaving.set(true);

    if (existente?.codigo) {
      this.valorPagoService
        .update({
          ...existente,
          ...payloadBase,
        })
        .subscribe({
          next: () => {
            this.isSaving.set(false);
            this.snackBar.open('Asignación actualizada correctamente', 'Cerrar', { duration: 3000 });
            this.cargarAsignaciones();
          },
          error: () => {
            this.isSaving.set(false);
            this.snackBar.open('No se pudo actualizar la asignación', 'Cerrar', { duration: 3000 });
          },
        });
      return;
    }

    this.valorPagoService
      .add({
        ...payloadBase,
        usuarioIngreso: usuarioSesion(),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.snackBar.open('Asignación registrada correctamente', 'Cerrar', { duration: 3000 });
          this.cargarAsignaciones();
        },
        error: () => {
          this.isSaving.set(false);
          this.snackBar.open('No se pudo registrar la asignación', 'Cerrar', { duration: 3000 });
        },
      });
  }

  private cargarAsignaciones(): void {
    this.isLoadingAsignaciones.set(true);

    this.valorPagoService.getAll().subscribe({
      next: (rows) => {
        const todas = rows || [];
        this.todasAsignaciones.set(todas);
        this.actualizarVistaAsignaciones();
        this.isLoadingAsignaciones.set(false);

        const activas = todas.filter((a) => this.esRegistroActivo(a));
        this.actualizarTotalMensual(activas);
        // Los vistos de cuenta/certificado solo importan para quien va a cobrar: no se piden
        // certificados de gente que ya está fuera del padrón.
        this.cargarVerificacionCuentaCertificado(activas);
        // Si la sección 1 está mostrando «sin pensión asignada», refrescarla: alguien pudo haber
        // salido de esa lista (se le acaba de asignar un valor) o haber entrado (lo sacaron del padrón).
        if (this.soloSinPension()) {
          this.actualizarVistaSeccion1();
        }
      },
      error: () => {
        this.todasAsignaciones.set([]);
        this.asignaciones.set([]);
        this.dataSourceAsignaciones.data = [];
        this.totalPagarMensual.set(0);
        this.isLoadingAsignaciones.set(false);
        this.verificacionMap.set(new Map());
      },
    });
  }

  private esRegistroActivo(item: ValorPagoPensionComplementaria): boolean {
    return (item.estado ?? ProcesoPagoJubiladosComponent.ESTADO_REGISTRO_ACTIVO) ===
      ProcesoPagoJubiladosComponent.ESTADO_REGISTRO_ACTIVO;
  }

  /** El padrón, por defecto, solo muestra activos: mostrar inactivos es una elección explícita. */
  private actualizarVistaAsignaciones(): void {
    const todas = this.todasAsignaciones();
    const visibles = this.mostrarInactivos() ? todas : todas.filter((a) => this.esRegistroActivo(a));
    this.asignaciones.set(visibles);
    this.dataSourceAsignaciones.data = visibles;
    setTimeout(() => {
      if (this.paginatorAsignaciones) {
        this.dataSourceAsignaciones.paginator = this.paginatorAsignaciones;
      }
    });
  }

  toggleMostrarInactivos(): void {
    this.mostrarInactivos.set(!this.mostrarInactivos());
    this.actualizarVistaAsignaciones();
  }

  // ===================== Sacar del padrón / reactivar =====================

  /**
   * "Sacar del padrón" = desactivar (`estado: 0`), NUNCA `delete()`: el `DELETE /vppc/{id}` del
   * backend hace un remove físico, y si el jubilado ya tuvo pagos eso borra el registro de cuánto
   * se le había asignado y por qué. Desactivar es reversible (`reactivarAsignacion`) y conserva
   * el rastro.
   */
  desactivarAsignacion(item: ValorPagoPensionComplementaria): void {
    if (!item.entidad || !item.codigo) {
      return;
    }
    const nombre = item.entidad.razonSocial || 'Este jubilado';
    const data: ConfirmDialogData = {
      title: 'Sacar del padrón',
      message: `${nombre} deja de recibir pagos de pensión complementaria. Su saldo y su historial no se tocan.`,
      confirmText: 'Sacar del padrón',
      cancelText: 'Cancelar',
      type: 'warning',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '480px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) {
          this.cambiarEstadoAsignacion(item, ProcesoPagoJubiladosComponent.ESTADO_REGISTRO_INACTIVO, `${nombre} fue sacado del padrón.`, 'No se pudo sacar del padrón.');
        }
      });
  }

  reactivarAsignacion(item: ValorPagoPensionComplementaria): void {
    if (!item.entidad || !item.codigo) {
      return;
    }
    const nombre = item.entidad.razonSocial || 'Este jubilado';
    const data: ConfirmDialogData = {
      title: 'Reactivar en el padrón',
      message: `${nombre} vuelve a recibir pagos de pensión complementaria a partir de la próxima corrida.`,
      confirmText: 'Reactivar',
      cancelText: 'Cancelar',
      type: 'info',
    };
    this.dialog
      .open(ConfirmDialogComponent, { data, width: '480px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) {
          this.cambiarEstadoAsignacion(item, ProcesoPagoJubiladosComponent.ESTADO_REGISTRO_ACTIVO, `${nombre} fue reactivado en el padrón.`, 'No se pudo reactivar.');
        }
      });
  }

  private cambiarEstadoAsignacion(
    item: ValorPagoPensionComplementaria,
    estado: number,
    mensajeExito: string,
    mensajeError: string,
  ): void {
    this.isSaving.set(true);
    // ⛔ Sin `fechaModificacion`: ver la nota en `guardarAsignacion()` — `LocalDateTime` en el
    // backend, formato con espacio en vez de `T`, 400 en cada guardado.
    this.valorPagoService
      .update({
        ...item,
        estado,
        usuarioModificacion: usuarioSesion(),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.snackBar.open(mensajeExito, 'Cerrar', { duration: 4000 });
          this.cargarAsignaciones();
        },
        error: () => {
          this.isSaving.set(false);
          this.snackBar.open(mensajeError, 'Cerrar', { duration: 4000 });
        },
      });
  }

  /**
   * Los dos vistos ("✔ cuenta bancaria" / "✔ certificado") del resumen de asignados — misma
   * lógica compartida que usa el prevuelo de "Corrida del mes", vía
   * `VerificacionCuentaCertificadoService`. No duplicar: son 191 jubilados, y duplicarla harían
   * el doble de llamadas de certificado y desincronizaría las dos vistas con el tiempo.
   */
  private cargarVerificacionCuentaCertificado(asignacionesRows: ValorPagoPensionComplementaria[]): void {
    const codigos = asignacionesRows
      .map((a) => a.entidad?.codigo)
      .filter((c): c is number => c != null);

    if (codigos.length === 0) {
      this.verificacionMap.set(new Map());
      this.avisoCertificadosPadron.set(null);
      return;
    }

    this.isLoadingVerificacion.set(true);
    this.verificacionService.verificar(codigos).subscribe({
      next: (resultado) => {
        this.verificacionMap.set(resultado.porEntidad);
        this.avisoCertificadosPadron.set(resultado.avisoCertificados);
        this.isLoadingVerificacion.set(false);
      },
      error: () => {
        this.verificacionMap.set(new Map());
        this.avisoCertificadosPadron.set(null);
        this.isLoadingVerificacion.set(false);
      },
    });
  }

  /** `true`/`false`/`null` (no se pudo verificar) — ver `avisoCertificadosPadron`. */
  tieneCertificadoDe(item: ValorPagoPensionComplementaria): boolean | null {
    const codigo = item.entidad?.codigo;
    if (codigo == null) return null;
    return this.verificacionMap().get(codigo)?.tieneCertificado ?? null;
  }

  tieneCuentaActivaDe(item: ValorPagoPensionComplementaria): boolean {
    const codigo = item.entidad?.codigo;
    if (codigo == null) return false;
    return this.verificacionMap().get(codigo)?.tieneCuenta ?? false;
  }

  obtenerValorMensualRegistro(item: ValorPagoPensionComplementaria): number {
    const valor = Number(item.valorPagar || 0);
    const cuotas = Number(item.numeroCuotas || 0);

    if (cuotas > 0) {
      return valor / cuotas;
    }

    return valor;
  }

  get valorMensualCalculadoFormulario(): number {
    const valor = Number(this.asignacionForm.get('valorPagar')?.value || 0);
    const cuotas = Number(this.asignacionForm.get('numeroCuotas')?.value || 0);

    if (cuotas > 0) {
      return valor / cuotas;
    }

    return valor;
  }

  /**
   * ⛔ `valorPagar` YA INCLUYE el seguro (contrato §4bis: `valorPensionMensual = valorPagar −
   * valorSeguro`) — no se suman. Desglose en vivo para que quien carga el alta no cometa el error
   * de dejar `valorPagar` sin el seguro adentro (eso bloquea al jubilado con `SIN_VALOR_PENSION`).
   */
  get seguroCalculadoFormulario(): number {
    return Number(this.asignacionForm.get('valorSeguro')?.value || 0);
  }

  get pensionCalculadaFormulario(): number {
    const valorPagar = Number(this.asignacionForm.get('valorPagar')?.value || 0);
    return valorPagar - this.seguroCalculadoFormulario;
  }

  esAsignacionActiva(item: ValorPagoPensionComplementaria): boolean {
    return this.esRegistroActivo(item);
  }

  editarAsignacion(item: ValorPagoPensionComplementaria): void {
    if (!item.entidad) {
      return;
    }

    this.entidadSeleccionada.set(item.entidad);
    this.asignacionForm.patchValue({
      valorPagar: item.valorPagar ?? null,
      numeroCuotas: item.numeroCuotas ?? null,
      tienePrestamo: (item.tienePrestamo ?? 0) === 1,
      valorSeguro: item.valorSeguro ?? null,
    });
  }

  private actualizarTotalMensual(asignacionesRows: ValorPagoPensionComplementaria[]): void {
    const total = asignacionesRows.reduce((acc, row) => acc + this.obtenerValorMensualRegistro(row), 0);
    this.totalPagarMensual.set(total);
  }

  private cargarSaldosPensionComplementaria(entidades: Entidad[]): void {
    if (!entidades.length) {
      this.saldosPensionMap.set(new Map<number, number>());
      return;
    }

    this.isLoadingSaldos.set(true);

    const consultas = entidades.map((entidad) => {
      const criterioEntidad = new DatosBusqueda();
      criterioEntidad.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'entidad',
        'codigo',
        String(entidad.codigo),
        TipoComandosBusqueda.IGUAL,
      );

      return this.aporteService.selectByCriteria([criterioEntidad]);
    });

    forkJoin(consultas).subscribe({
      next: (resultados) => {
        const map = new Map<number, number>();

        entidades.forEach((entidad, index) => {
          const aportes = resultados[index] || [];
          const aportesPension = aportes.filter((aporte: Aporte) => this.esPensionComplementaria(aporte));
          const totalPension = aportesPension.reduce((sum, aporte) => sum + (aporte.valor || 0), 0);
          map.set(entidad.codigo, totalPension);
        });

        this.saldosPensionMap.set(map);
        this.isLoadingSaldos.set(false);
      },
      error: () => {
        this.saldosPensionMap.set(new Map<number, number>());
        this.isLoadingSaldos.set(false);
      },
    });
  }

  private esPensionComplementaria(aporte: Aporte): boolean {
    const nombreTipo = (aporte.tipoAporte?.nombre || '').toLowerCase();
    if (!nombreTipo) {
      return false;
    }

    const normalizado = nombreTipo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizado.includes('pension complementaria');
  }

  verDash(entidad: Entidad): void {
    if (!entidad?.codigo) {
      return;
    }

    this.router.navigate(['/menucreditos/participe-dash'], {
      queryParams: {
        codigoEntidad: entidad.codigo,
        from: 'entidad-consulta',
      },
    });
  }
}
