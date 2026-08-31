import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { empresaSesionCodigo } from '../../../../../shared/services/empresa-sesion';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { CuentaBancaria } from '../../../../tsr/model/cuenta-bancaria';
import { CuentaBancariaService } from '../../../../tsr/service/cuenta-bancaria.service';
import {
  AcuerdoCondonacion,
  AporteAcuerdoCondonacion,
  DetalleAcuerdoCondonacion,
  SolicitudRegistroAcuerdo,
} from '../../../model/acuerdos/acuerdo-condonacion';
import {
  ConceptoPrestamo,
  EstadoAcuerdo,
  NOMBRE_CONCEPTO_PRESTAMO,
  ORDEN_CONCEPTOS,
  TOLERANCIA_ACUERDO,
  admiteAcuerdo,
  esCondonable,
  nombreEstadoAcuerdo,
} from '../../../model/acuerdos/catalogos-acuerdo';
import { Entidad } from '../../../model/entidad';
import { NOMBRE_ESTADO_PRESTAMO } from '../../../model/pagos/catalogos-pago';
import { SaldoAporte } from '../../../model/pagos/operaciones-pago';
import { Prestamo } from '../../../model/prestamo';
import { AcuerdoCondonacionService } from '../../../service/acuerdo-condonacion.service';
import { ComprobanteCobroService } from '../../../service/comprobante-cobro.service';
import { EntidadService } from '../../../service/entidad.service';
import { OperacionesPagoPrestamoService } from '../../../service/operaciones-pago-prestamo.service';
import { PrestamoService } from '../../../service/prestamo.service';

/** Fila del desglose en pantalla: un concepto con sus tres montos y si el operador lo puede tocar. */
interface FilaConcepto {
  concepto: ConceptoPrestamo;
  nombre: string;
  condonable: boolean;
  adeudado: number;
  /** Editable solo si `condonable`; si no, siempre igual a `adeudado` (K3: los seguros se pagan al 100%). */
  pagadoTexto: string;
}

/**
 * Renglón del reparto entre las dos fuentes del pago: un tipo de aporte del socio (se CONSUME, el
 * saldo baja) o el depósito/transferencia (`idTipoAporte: null`). Mismo patrón que el reparto de
 * `PrecancelacionDialogComponent` — acá con dos fuentes en vez de N+1, pero misma lógica de cuadre.
 */
interface RenglonFondoAcuerdo {
  clave: string;
  nombre: string;
  idTipoAporte: number | null;
  /** `Infinity` para el depósito; el saldo disponible para un tipo de aporte. */
  disponible: number;
  texto: string;
}

/**
 * Acuerdo de pago con condonación (docs/crd/API-ACUERDOS-CONDONACION.md).
 *
 * ⚠️ La previsualización ES el control (K4 derogada: ya no hay aprobación de un segundo usuario).
 * Los 5 conceptos van SIEMPRE completos y visibles, con lo adeudado al lado de lo que el operador
 * decide pagar y el condonado calculándose en vivo — nunca un resumen colapsado.
 *
 * Esta pantalla NO procesa (eso vive en Proceso de Crédito), NO aprueba nada (no existe ese estado)
 * y NO anula el acuerdo directamente (la anulación llega en cascada al anular su cobro, desde las
 * pantallas de cobros).
 */
@Component({
  selector: 'app-acuerdo-condonacion',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './acuerdo-condonacion.component.html',
  styleUrl: './acuerdo-condonacion.component.scss',
})
export class AcuerdoCondonacionComponent {
  private entidadService = inject(EntidadService);
  private prestamoService = inject(PrestamoService);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private acuerdos = inject(AcuerdoCondonacionService);
  private comprobantes = inject(ComprobanteCobroService);
  private operaciones = inject(OperacionesPagoPrestamoService);
  private funcionesDatos = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);

  readonly hoy = new Date();
  readonly ordenConceptos = ORDEN_CONCEPTOS;
  readonly extensionesComprobante = this.comprobantes.extensionesAceptadas;

  // ---- búsqueda de partícipe ----
  criterioIdentificacion = '';
  criterioRolPetro = '';
  criterioNombre = '';
  buscando = signal(false);
  resultados = signal<Entidad[]>([]);
  mostrandoResultados = signal(false);
  entidadSeleccionada = signal<Entidad | null>(null);

  // ---- atajo: buscar directo por número de préstamo de ASOPREP ----
  criterioAsoprep = '';
  buscandoAsoprep = signal(false);

  // ---- préstamos elegibles (EN_MORA u DE_PLAZO_VENCIDO — §4 del contrato) ----
  cargandoPrestamos = signal(false);
  prestamosElegibles = signal<Prestamo[]>([]);
  prestamoSeleccionado = signal<Prestamo | null>(null);

  // ---- previsualización ----
  fecha = signal<Date>(new Date());
  cargandoDesglose = signal(false);
  errorDesglose = signal<string | null>(null);
  /** `null` mientras no hay una previsualización vigente para la fecha actual — gatea "Confirmar". */
  filas = signal<FilaConcepto[] | null>(null);
  /** Fecha con la que se pidió la previsualización vigente. Cambiar `fecha()` la invalida. */
  private fechaDesglose: string | null = null;

  // ---- reparto entre aportes (se consumen) y depósito ----
  cargandoSaldosAporte = signal(false);
  saldosAporte = signal<SaldoAporte[]>([]);
  /** Renglones del reparto; se mutan directamente, por eso el contador de versión. */
  fondos: RenglonFondoAcuerdo[] = [];
  private fondosVersion = signal(0);

  // ---- datos del depósito (solo si el reparto incluye depósito > 0) ----
  cargandoCuentas = signal(false);
  cuentasBancarias = signal<CuentaBancaria[]>([]);
  cuentaBancaria = signal<CuentaBancaria | null>(null);
  referencia = signal('');
  observacion = '';
  archivoComprobante = signal<File | null>(null);

  registrando = signal(false);
  errorRegistro = signal<string | null>(null);
  resultado = signal<AcuerdoCondonacion | null>(null);

  // ---- historial del partícipe ----
  cargandoHistorial = signal(false);
  historial = signal<AcuerdoCondonacion[]>([]);

  readonly nombreEstadoAcuerdo = nombreEstadoAcuerdo;

  constructor() {
    this.cargarCuentasBancarias();
  }

  totalAdeudado = computed(() => +(this.filas() ?? []).reduce((s, f) => s + f.adeudado, 0).toFixed(2));
  totalPagar = computed(() => +(this.filas() ?? []).reduce((s, f) => s + this.parseMoneda(f.pagadoTexto), 0).toFixed(2));
  totalCondonar = computed(() => +(this.totalAdeudado() - this.totalPagar()).toFixed(2));

  condonadoDe(fila: FilaConcepto): number {
    return Math.max(+(fila.adeudado - this.parseMoneda(fila.pagadoTexto)).toFixed(2), 0);
  }

  /** ¿La fecha actual sigue siendo la que se usó para previsualizar? Si no, hay que previsualizar de nuevo. */
  desgloseVigente = computed(() => this.filas() !== null && this.fechaDesglose === this.acuerdos.formatearFecha(this.fecha()));

  // ---- reparto: aportes (se consumen) + depósito, deben sumar exacto totalPagar() ----

  montoDeposito = computed(() => {
    this.fondosVersion();
    const f = this.fondos.find((x) => x.idTipoAporte == null);
    return +this.parseMoneda(f?.texto).toFixed(2);
  });

  montoAportes = computed(() => {
    this.fondosVersion();
    return +this.fondos
      .filter((x) => x.idTipoAporte != null)
      .reduce((s, x) => s + this.parseMoneda(x.texto), 0)
      .toFixed(2);
  });

  repartido = computed(() => +(this.montoAportes() + this.montoDeposito()).toFixed(2));
  diferenciaReparto = computed(() => +(this.totalPagar() - this.repartido()).toFixed(2));
  repartoCuadra = computed(() => Math.abs(this.diferenciaReparto()) <= TOLERANCIA_ACUERDO);

  hayExcesoEnAlgunAporte = computed(() => {
    this.fondosVersion();
    return this.fondos.some(
      (f) => f.idTipoAporte != null && this.parseMoneda(f.texto) > f.disponible + TOLERANCIA_ACUERDO
    );
  });

  /**
   * ¿El pago necesita depósito? Si `montoDeposito() > 0`, el acuerdo queda VIGENTE esperando
   * aprobación de contabilidad y exige cuenta/referencia/comprobante. Si es `0` (100% aportes), se
   * aplica en el acto y esos tres campos ni se piden — el backend los rechaza si se mandan.
   */
  requiereRespaldoDeposito = computed(() => this.montoDeposito() > 0.004);

  motivosNoConfirmar = computed<string[]>(() => {
    if (this.registrando()) return ['Registrando el acuerdo…'];
    const motivos: string[] = [];

    if (empresaSesionCodigo() == null) {
      // Sin esto el registro va a fallar seguro del lado del backend, y con un error que el
      // operador no va a saber interpretar — se bloquea acá, con un mensaje que sí dice qué pasa.
      motivos.push('no se pudo determinar la empresa de la sesión: vuelva a iniciar sesión e intente de nuevo');
    }
    if (!this.prestamoSeleccionado()) motivos.push('elija un préstamo');
    if (!this.filas() || !this.desgloseVigente()) motivos.push('previsualice el desglose para la fecha elegida');

    if (!this.repartoCuadra()) {
      const dif = this.diferenciaReparto();
      motivos.push(
        dif > 0
          ? `falta repartir ${this.formatMoneda(dif)} entre aportes y depósito`
          : `hay ${this.formatMoneda(-dif)} de más repartidos entre aportes y depósito: ajuste los montos`
      );
    }
    if (this.hayExcesoEnAlgunAporte()) {
      motivos.push('algún tipo de aporte supera su saldo disponible');
    }
    if (this.requiereRespaldoDeposito()) {
      if (!this.cuentaBancaria()) motivos.push('seleccione la cuenta de ASOPREP a la que ingresó el depósito');
      if (!this.referencia().trim()) motivos.push('ingrese el número de referencia del depósito');
      if (!this.archivoComprobante()) motivos.push('adjunte el comprobante del depósito');
    }

    return motivos;
  });

  puedeConfirmar = computed(() => this.motivosNoConfirmar().length === 0);

  // ================= búsqueda =================

  buscar(): void {
    const criterios: DatosBusqueda[] = [];

    if (this.criterioIdentificacion.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'numeroIdentificacion', this.criterioIdentificacion.trim(), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    } else if (this.criterioRolPetro.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'rolPetroComercial', this.criterioRolPetro.trim(), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    } else if (this.criterioNombre.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'razonSocial', this.criterioNombre.trim(), TipoComandosBusqueda.LIKE);
      criterios.push(c);
    } else {
      this.snackBar.open('Ingrese al menos un criterio de búsqueda.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.buscando.set(true);
    this.entidadService.selectByCriteria(criterios).subscribe({
      next: (entidades) => {
        this.buscando.set(false);
        this.resultados.set(entidades ?? []);
        this.mostrandoResultados.set(true);
        this.entidadSeleccionada.set(null);
        if (!entidades || entidades.length === 0) {
          this.snackBar.open('No se encontraron coincidencias.', 'Cerrar', { duration: 3000 });
        }
      },
      error: () => {
        this.buscando.set(false);
        this.snackBar.open('Ocurrió un error al buscar. Intente nuevamente.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  /**
   * Atajo: el operador llega con el número de préstamo de ASOPREP en la mano, no con el partícipe.
   * Salta directo al préstamo — sin pasar por la lista de resultados de partícipe — si existe y
   * admite un acuerdo.
   */
  buscarPorAsoprep(): void {
    const numero = Number(this.criterioAsoprep.trim());
    if (!this.criterioAsoprep.trim() || !Number.isFinite(numero) || numero <= 0) {
      this.snackBar.open('Ingrese un número de préstamo de ASOPREP válido.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.buscandoAsoprep.set(true);
    this.prestamoService.porIdAsoprep(numero).subscribe({
      next: (prestamo) => {
        this.buscandoAsoprep.set(false);
        if (!prestamo) {
          // 404 es el resultado normal de un número que no existe (el operador tipeó mal) — no es
          // una falla, así que no se muestra como error.
          this.snackBar.open(`No se encontró ningún préstamo con el número ${numero} en ASOPREP.`, 'Cerrar', { duration: 4000 });
          return;
        }
        if (!admiteAcuerdo(prestamo.idEstado)) {
          this.snackBar.open(
            `El préstamo #${prestamo.idAsoprep} está en estado «${this.nombreEstadoPrestamo(prestamo.idEstado)}» y no admite un acuerdo de condonación.`,
            'Cerrar',
            { duration: 6000 }
          );
          return;
        }
        this.mostrandoResultados.set(false);
        this.resultados.set([]);
        this.seleccionarEntidad(prestamo.entidad);
        this.seleccionarPrestamo(prestamo);
      },
      error: () => {
        this.buscandoAsoprep.set(false);
        this.snackBar.open('Ocurrió un error al buscar el préstamo. Intente nuevamente.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada.set(entidad);
    this.mostrandoResultados.set(false);
    this.resetProceso();
    this.prestamosElegibles.set([]);
    this.cargarPrestamos(entidad.codigo);
    this.cargarHistorial(entidad.codigo);
    this.cargarSaldosAporte(entidad.codigo);
  }

  volverABuscar(): void {
    this.mostrandoResultados.set(true);
    this.entidadSeleccionada.set(null);
  }

  private cargarPrestamos(codigoEntidad: number): void {
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(TipoDatosBusqueda.LONG, 'entidad', 'codigo', String(codigoEntidad), TipoComandosBusqueda.IGUAL);

    this.cargandoPrestamos.set(true);
    this.prestamoService.selectByCriteria([criterioEntidad]).subscribe({
      next: (prestamos) => {
        this.cargandoPrestamos.set(false);
        // Universo del acuerdo: solo EN_MORA (11) o DE_PLAZO_VENCIDO (8), por PRSTIDST — nunca
        // estadoPrestamo (§4 del contrato). El backend lo valida igual; acá se filtra antes para no
        // ofrecer algo que va a ser rechazado.
        this.prestamosElegibles.set((prestamos ?? []).filter((p) => admiteAcuerdo(p.idEstado)));
      },
      error: () => {
        this.cargandoPrestamos.set(false);
        this.snackBar.open('No se pudieron cargar los préstamos del partícipe.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  private cargarHistorial(codigoEntidad: number): void {
    this.cargandoHistorial.set(true);
    this.acuerdos.porEntidad(codigoEntidad).subscribe((lista) => {
      this.cargandoHistorial.set(false);
      this.historial.set(lista);
    });
  }

  /**
   * Saldos de aportes del partícipe, para el reparto: cuánto de cada tipo se puede consumir. Se
   * carga una vez por partícipe (no en cada previsualización) — mismo endpoint que usa el cruce de
   * saldos de aportes en cobros personales / precancelación.
   */
  private cargarSaldosAporte(idEntidad: number): void {
    this.cargandoSaldosAporte.set(true);
    this.operaciones.saldosPorEntidad(idEntidad).subscribe((resp) => {
      this.cargandoSaldosAporte.set(false);
      // Una lista vacía es 200 con []: el partícipe simplemente no tiene aportes.
      const disponibles = (resp.exito ? resp.resultado ?? [] : []).filter((a) => (a.saldo ?? 0) > 0.004);
      this.saldosAporte.set(disponibles);
      this.construirFondos(true);
    });
  }

  /**
   * Arma los renglones del reparto: un renglón por tipo de aporte disponible, más el depósito.
   *
   * @param precargarDeposito En `true` (préstamo recién seleccionado, o saldos recién cargados)
   * arranca con todo en depósito — es el caso más común y el comportamiento de siempre antes de que
   * existiera el cruce con aportes. En `false` (p.ej. al recalcular tras cambiar la fecha) conserva
   * lo que el usuario ya había repartido.
   */
  private construirFondos(precargarDeposito: boolean): void {
    const textoPrevio = new Map(this.fondos.map((f) => [f.clave, f.texto]));
    const texto = (clave: string, porDefecto = '') => (precargarDeposito ? porDefecto : textoPrevio.get(clave) ?? porDefecto);

    this.fondos = [
      ...this.saldosAporte().map((a) => ({
        clave: `aporte-${a.idTipoAporte}`,
        nombre: a.nombre,
        idTipoAporte: a.idTipoAporte,
        disponible: +(a.saldo ?? 0).toFixed(2),
        texto: texto(`aporte-${a.idTipoAporte}`),
      })),
      {
        clave: 'deposito',
        nombre: 'Depósito / transferencia',
        idTipoAporte: null,
        disponible: Number.POSITIVE_INFINITY,
        texto: texto('deposito', this.formatMoneda(this.totalPagar())),
      },
    ];
    this.fondosVersion.update((v) => v + 1);
  }

  onFondoBlur(fondo: RenglonFondoAcuerdo): void {
    let v = Math.max(this.parseMoneda(fondo.texto), 0);
    if (fondo.idTipoAporte != null && v > fondo.disponible + TOLERANCIA_ACUERDO) v = fondo.disponible;
    v = +v.toFixed(2);
    fondo.texto = v > 0.004 ? this.formatMoneda(v) : '';
    this.fondosVersion.update((n) => n + 1);
  }

  /** Asigna a este fondo lo que falta para cuadrar, sin pasarse de su disponible. */
  completarConEsteFondo(fondo: RenglonFondoAcuerdo): void {
    const yaPuesto = this.parseMoneda(fondo.texto);
    const objetivo = yaPuesto + this.diferenciaReparto();
    const tope = fondo.idTipoAporte != null ? fondo.disponible : Number.POSITIVE_INFINITY;
    const v = +Math.max(Math.min(objetivo, tope), 0).toFixed(2);
    fondo.texto = v > 0.004 ? this.formatMoneda(v) : '';
    this.fondosVersion.update((n) => n + 1);
  }

  montoDe(fondo: RenglonFondoAcuerdo): number {
    this.fondosVersion();
    return this.parseMoneda(fondo.texto);
  }

  private cargarCuentasBancarias(): void {
    const criterioEstado = new DatosBusqueda();
    criterioEstado.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'estado', '1', TipoComandosBusqueda.IGUAL);
    const criterioCobroCredito = new DatosBusqueda();
    criterioCobroCredito.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'cobroCredito', '1', TipoComandosBusqueda.IGUAL);

    this.cargandoCuentas.set(true);
    this.cuentaBancariaService.selectByCriteria([criterioEstado, criterioCobroCredito]).subscribe({
      next: (cuentas) => {
        this.cargandoCuentas.set(false);
        this.cuentasBancarias.set((cuentas ?? []).filter((c) => Number(c.estado) === 1 && Number(c.cobroCredito) === 1));
      },
      error: () => {
        this.cargandoCuentas.set(false);
        this.cuentasBancarias.set([]);
      },
    });
  }

  // ================= préstamo y previsualización =================

  seleccionarPrestamo(prestamo: Prestamo): void {
    this.prestamoSeleccionado.set(prestamo);
    this.filas.set(null);
    this.fechaDesglose = null;
    this.errorDesglose.set(null);
    // Préstamo distinto: el reparto anterior no aplica, que arranque de nuevo (todo en depósito).
    this.fondos = [];
    this.previsualizar();
  }

  /** Cambiar la fecha invalida la previsualización vigente: la mora depende de a qué fecha se calcula. */
  onFechaCambio(fecha: Date): void {
    this.fecha.set(fecha);
    this.filas.set(null);
    this.fechaDesglose = null;
  }

  previsualizar(): void {
    const prestamo = this.prestamoSeleccionado();
    const fechaTexto = this.acuerdos.formatearFecha(this.fecha());
    if (!prestamo || !fechaTexto) return;

    this.cargandoDesglose.set(true);
    this.errorDesglose.set(null);
    this.acuerdos.previsualizar(prestamo.codigo, fechaTexto).subscribe((desglose) => {
      this.cargandoDesglose.set(false);
      if (!desglose) {
        this.errorDesglose.set('No se pudo previsualizar el desglose de este préstamo.');
        return;
      }

      const adeudadoPorConcepto: Record<number, number> = {
        [ConceptoPrestamo.CAPITAL]: desglose.capitalPendiente,
        [ConceptoPrestamo.INTERES]: desglose.interesPendiente,
        [ConceptoPrestamo.MORA]: desglose.moraPendiente,
        [ConceptoPrestamo.DESGRAVAMEN]: desglose.desgravamenPendiente,
        [ConceptoPrestamo.SEGURO_INCENDIO]: desglose.seguroIncendioPendiente,
      };

      this.filas.set(
        ORDEN_CONCEPTOS.map((concepto) => {
          const adeudado = +(adeudadoPorConcepto[concepto] ?? 0).toFixed(2);
          const condonable = esCondonable(concepto);
          return {
            concepto,
            nombre: NOMBRE_CONCEPTO_PRESTAMO[concepto],
            condonable,
            adeudado,
            // No condonables (desgravamen, seguro): se pagan al 100%, no editables (K3).
            // Condonables: por defecto se ofrece pagar todo (condonado 0) — el operador decide cuánto perdonar.
            pagadoTexto: this.formatMoneda(adeudado),
          };
        })
      );
      this.fechaDesglose = fechaTexto;
      // El total a repartir recién ahora se conoce: si es la primera vez que se ve este préstamo,
      // arranca todo en depósito; si es un recálculo, conserva lo que el usuario ya había repartido.
      this.construirFondos(this.fondos.length === 0);
    });
  }

  onPagadoCambio(fila: FilaConcepto, texto: string): void {
    if (!fila.condonable) return; // defensivo: el campo ni se muestra editable para estos dos
    fila.pagadoTexto = texto;
    this.filas.update((f) => (f ? [...f] : f)); // fuerza recomputo de los computed()
  }

  onPagadoBlur(fila: FilaConcepto): void {
    if (!fila.condonable) return;
    let v = Math.max(this.parseMoneda(fila.pagadoTexto), 0);
    if (v > fila.adeudado + TOLERANCIA_ACUERDO) v = fila.adeudado;
    fila.pagadoTexto = this.formatMoneda(+v.toFixed(2));
    this.filas.update((f) => (f ? [...f] : f));
  }

  // ================= comprobante =================

  onArchivoSeleccionado(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (file) {
      const problema = this.comprobantes.problemaDelArchivo(file);
      if (problema) {
        input.value = '';
        this.snackBar.open(problema, 'Cerrar', { duration: 5000 });
        return;
      }
    }
    this.archivoComprobante.set(file);
  }

  // ================= confirmar =================

  /**
   * Confirma el acuerdo. Dos caminos según si el reparto incluye depósito:
   *
   * - Con depósito: se archiva el comprobante primero —su ruta viaja DENTRO del request— y recién
   *   con el archivo en el servidor se registra. El acuerdo queda VIGENTE, esperando aprobación de
   *   contabilidad; el préstamo no se toca todavía.
   * - 100% aportes (depósito en 0): no hay nada que archivar, se registra directo. El acuerdo se
   *   aplica EN EL ACTO y el préstamo queda cancelado — no hay marcha atrás de "esperar a ver si el
   *   depósito llega", porque acá no hay depósito que pueda no llegar.
   */
  confirmar(): void {
    if (!this.puedeConfirmar()) return;
    const prestamo = this.prestamoSeleccionado();
    const filas = this.filas();
    const fechaTexto = this.fechaDesglose;
    const idEmpresa = empresaSesionCodigo();
    if (!prestamo || !filas || !fechaTexto || idEmpresa == null) return;

    this.errorRegistro.set(null);
    this.registrando.set(true);

    const montoDeposito = this.montoDeposito();

    if (montoDeposito > 0.004) {
      const cuenta = this.cuentaBancaria();
      const archivo = this.archivoComprobante();
      if (!cuenta || !archivo) {
        // Defensivo: `motivosNoConfirmar()` ya exige los tres — no debería poder llegar acá sin ellos.
        this.registrando.set(false);
        return;
      }
      this.comprobantes
        .archivar(archivo, this.comprobantes.carpetaDeAcuerdo(prestamo.codigo), `${prestamo.codigo}-acuerdo`)
        .subscribe((resultadoArchivo) => {
          if (resultadoArchivo.error || !resultadoArchivo.ruta) {
            this.registrando.set(false);
            this.errorRegistro.set(this.comprobantes.mensajeDeFallo(resultadoArchivo.error ?? ''));
            return;
          }
          this.enviarRegistro(prestamo, filas, fechaTexto, idEmpresa, cuenta, resultadoArchivo.ruta);
        });
      return;
    }

    this.enviarRegistro(prestamo, filas, fechaTexto, idEmpresa, null, null);
  }

  private enviarRegistro(
    prestamo: Prestamo,
    filas: FilaConcepto[],
    fechaTexto: string,
    idEmpresa: number,
    cuenta: CuentaBancaria | null,
    rutaRespaldo: string | null
  ): void {
    const detalles: DetalleAcuerdoCondonacion[] = filas.map((f) => ({
      concepto: f.concepto,
      valorAdeudado: f.adeudado,
      valorPagado: this.parseMoneda(f.pagadoTexto),
      valorCondonado: this.condonadoDe(f),
    }));

    const aportes: AporteAcuerdoCondonacion[] = this.fondos
      .filter((f) => f.idTipoAporte != null && this.parseMoneda(f.texto) > 0.004)
      .map((f) => ({ idTipoAporte: f.idTipoAporte as number, valor: +this.parseMoneda(f.texto).toFixed(2) }));

    const solicitud: SolicitudRegistroAcuerdo = {
      idPrestamo: prestamo.codigo,
      idEmpresa,
      fecha: fechaTexto,
      observacion: this.observacion.trim() || null,
      usuario: usuarioSesion(),
      valorPagarAportes: this.montoAportes(),
      aportes,
      valorPagarDeposito: this.montoDeposito(),
      // Los tres campos de depósito NO se mandan en absoluto si no hubo depósito — el backend los
      // rechaza si vienen en 0/vacíos (§3 del contrato).
      ...(cuenta && rutaRespaldo
        ? { idCuentaBancaria: cuenta.codigo, referencia: this.referencia().trim(), rutaRespaldo }
        : {}),
      detalles,
    };

    this.acuerdos.registrar(solicitud).subscribe((resp) => {
      this.registrando.set(false);
      if (!resp.exito || !resp.resultado) {
        this.errorRegistro.set(resp.mensaje ?? 'No se pudo registrar el acuerdo.');
        this.comprobantes.descartar(rutaRespaldo);
        return;
      }
      this.resultado.set(resp.resultado);
      this.snackBar.open(
        resp.resultado.estado === EstadoAcuerdo.APLICADO
          ? 'Acuerdo aplicado: el préstamo quedó cancelado.'
          : 'Acuerdo registrado. El cobro quedó en la bandeja de contabilidad.',
        'Cerrar',
        { duration: 6000 }
      );
    });
  }

  nuevoAcuerdo(): void {
    this.resetProceso();
    const entidad = this.entidadSeleccionada();
    if (entidad) {
      this.cargarPrestamos(entidad.codigo);
      this.cargarHistorial(entidad.codigo);
      // El acuerdo recién confirmado pudo haber consumido saldo de aportes: refrescar.
      this.cargarSaldosAporte(entidad.codigo);
    }
  }

  private resetProceso(): void {
    this.prestamoSeleccionado.set(null);
    this.filas.set(null);
    this.fechaDesglose = null;
    this.errorDesglose.set(null);
    this.fecha.set(new Date());
    this.fondos = [];
    this.fondosVersion.update((v) => v + 1);
    this.cuentaBancaria.set(null);
    this.referencia.set('');
    this.observacion = '';
    this.archivoComprobante.set(null);
    this.registrando.set(false);
    this.errorRegistro.set(null);
    this.resultado.set(null);
  }

  // ================= utilidades =================

  nombreEstadoPrestamo(idEstado: number | null | undefined): string {
    if (idEstado == null) return '—';
    return NOMBRE_ESTADO_PRESTAMO[Number(idEstado)] ?? `Estado ${idEstado}`;
  }

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }
}
