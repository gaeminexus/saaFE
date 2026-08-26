import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, catchError, forkJoin, of } from 'rxjs';
import { guardarArchivo } from '../../../../../shared/services/descarga-reporte';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import {
  AccionNovedad,
  EstadoNovedadIess,
  accionesDisponibles,
  bloqueaCierre,
  diasRestantes,
  estaVencida,
  motivoNoDisponible,
} from '../../../model/estados-novedad-iess';
import { NovedadIess } from '../../../model/novedad-iess';
import { PeriodoNomina } from '../../../model/periodo-nomina';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { ContratoEmpleadoService } from '../../../service/contrato-empleado.service';
import { EmpleadoService } from '../../../service/empleado.service';
import { NovedadIessService } from '../../../service/novedad-iess.service';
import { PeriodoNominaService } from '../../../service/periodo-nomina.service';
import { mensajeDeError } from '../../comunes/mensajes';
import { referencia } from '../../comunes/cuerpo-entidad';
import { ColumnaTabla, TonoPastilla } from '../../comunes/modelo-formulario';
import { TablaRrhComponent } from '../../comunes/tabla-rrh/tabla-rrh.component';
import {
  aniosDisponibles,
  criteriosPorEmpresa,
  extraerCodigo,
  filtrarPorAnio,
} from '../../parametrizacion/utiles-parametrizacion';
import { MotivoDialogComponent } from '../periodo-nomina/motivo-dialog.component';
import { NuevaNovedadDialogComponent } from './nueva-novedad-dialog.component';
import { opcionesAviso } from '../../comunes/avisos';

/** Lo que se le dice al usuario cuando cada acción termina bien. */
const MENSAJE_EXITO: Record<AccionNovedad, string> = {
  marcarEnviada: 'Novedad marcada como enviada al IESS.',
  marcarAceptada: 'Novedad aceptada por el IESS.',
  marcarRechazada: 'Rechazo registrado. La novedad vuelve a contar como pendiente.',
  anular: 'Novedad anulada.',
};

/**
 * Novedades del mes ante el IESS (`RHH.NVIS`).
 *
 * **Para qué existe.** El IESS no recibe una planilla que nosotros generemos: la genera él a
 * partir de las novedades que el empleador le reporta, cada una con su plazo legal. Un mes se
 * cierra bien cuando no le debe ninguna. Marzo se cerró debiendo dos avisos de salida y el
 * resultado fue declarar a dos personas que ya no estaban —208,22 sobredeclarados—, así que esta
 * pantalla existe para que eso se vea antes, no después. La regla que lo impide vive en el
 * backend (`NORMATIVA-IESS-NOVEDADES.md` §5.4.1); aquí se enseña lo que esa regla va a mirar.
 *
 * **Por qué se filtra por fecha del hecho y no por una FK.** `NVIS` no tiene columna de período,
 * y no hace falta: al IESS se le reporta un hecho —una entrada, una salida, un cambio de sueldo—
 * y el mes al que pertenece es el de ese hecho. Se filtra con el rango del período, que es la
 * misma ventana que usa el motor de nómina. Añadir la FK ataría una novedad a un período que
 * puede no existir todavía: los avisos de entrada se reportan antes de que nadie calcule nada.
 */
@Component({
  selector: 'app-novedades-iess',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatTooltipModule,
    TablaRrhComponent,
  ],
  templateUrl: './novedades-iess.component.html',
  styleUrls: ['./novedades-iess.component.scss'],
})
export class NovedadesIessComponent implements OnInit {
  readonly anios = aniosDisponibles();
  readonly anio = signal<number>(new Date().getFullYear());
  readonly periodos = signal<PeriodoNomina[]>([]);
  readonly periodoSeleccionado = signal<number | null>(null);

  /** Alimentan los combos del alta. Se piden una vez, al entrar, no en cada apertura. */
  readonly empleados = signal<any[]>([]);
  readonly contratos = signal<any[]>([]);

  readonly novedades = signal<NovedadIess[]>([]);
  readonly filas = signal<any[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly ocupado = signal<boolean>(false);
  readonly seleccionada = signal<NovedadIess | null>(null);

  /** Lo que el período le debe todavía al IESS. Es lo que el backend mira para dejar cerrar. */
  readonly pendientes = computed(() => this.novedades().filter((n) => bloqueaCierre(n)).length);

  /** Fuera de plazo. Se cuenta aparte porque una vencida sigue siendo pendiente. */
  readonly vencidas = computed(() => this.novedades().filter((n) => estaVencida(n)).length);

  readonly puedeCerrarse = computed(() => this.pendientes() === 0);

  /**
   * Por qué el exportador se negó a generar el archivo.
   *
   * En panel y no en `snackbar`, por lo mismo que el bloqueo del cierre: **es una instrucción, no
   * un error de sistema**. El mensaje enumera novedad por novedad qué dato falta —«no esta
   * configurado el codigo de tipo de empleador (CFNMTPEM en RHH.CFNM)»— y pasa de los trescientos
   * caracteres: diez segundos no dan ni para leerlo, menos para apuntar qué corregir.
   */
  readonly fallaExportacion = signal<string | null>(null);

  /**
   * Lo que el servidor advierte sobre el archivo que acaba de generar.
   *
   * El caso que importa es `noSubir`: el archivo salió bien formado pero **no debe subirse al
   * portal** —hoy porque se generó con un tipo de empleador provisional—. Es la peor clase de
   * dato, el que parece correcto, así que se queda en pantalla hasta que el usuario cambie de mes
   * en vez de irse solo a los cuatro segundos.
   */
  readonly avisoDelArchivo = signal<{ texto: string; noSubir: boolean } | null>(null);

  /**
   * Lo que el IESS contestó sobre la novedad elegida, cuando la devolvió.
   *
   * Se enseña porque es lo único que dice **qué hay que corregir antes de reenviarla**. Un motivo
   * que se guarda y no se lee vuelve al problema que `NVISRSPT` venía a resolver, sólo que una
   * capa más adentro.
   */
  readonly respuestaDelIess = computed(() => {
    const n = this.seleccionada();
    if (!n || Number(n.estado) !== EstadoNovedadIess.RECHAZADA) return null;
    return n.respuestaIess?.trim() || null;
  });

  /**
   * Tipos del mes que **sí** se exportan, uno por archivo.
   *
   * Se dejan fuera los que el IESS sólo admite registrados en el portal uno por uno —los que no
   * tienen código de archivo en `PDTRVLRV` del rubro 204—. Ofrecerlos en el menú sería ofrecer
   * una acción que sólo puede terminar en el rechazo del exportador; el sitio donde se explica
   * que van por el portal es el alta, al elegir el tipo.
   */
  readonly tiposDelPeriodo = computed(() => {
    const vistos = new Map<number, string>();
    for (const novedad of this.novedades()) {
      const tipo = Number(novedad.tipoNovedad);
      if (vistos.has(tipo) || !this.seExportaPorBatch(tipo)) continue;
      vistos.set(tipo, this.etiquetaTipo(tipo));
    }
    return [...vistos.entries()]
      .map(([codigo, nombre]) => ({ codigo, nombre }))
      .sort((a, b) => a.codigo - b.codigo);
  });

  /** Cuántas novedades del mes hay que subir al portal a mano. */
  readonly deRegistroEnPortal = computed(
    () => this.novedades().filter((n) => !this.seExportaPorBatch(Number(n.tipoNovedad))).length,
  );

  /**
   * Si el tipo viaja en el archivo de carga masiva.
   *
   * Sale del mismo `PDTRVLRV` del que el exportador saca el código de tres letras, así que la
   * pantalla y el backend no pueden discrepar: si el IESS habilita el archivo de algún tipo,
   * basta con darle su código en el rubro.
   */
  private seExportaPorBatch(tipo: number): boolean {
    return (
      this.detalleRubroService.getAlfanumericoByParentAndAlterno(
        RubrosRrh.TIPO_NOVEDAD_IESS,
        tipo,
      ) !== null
    );
  }

  readonly columnas: ColumnaTabla[] = [
    { campo: 'tipoLabel', titulo: 'Tipo', ancho: '20%' },
    { campo: 'colaborador', titulo: 'Colaborador', ancho: '22%' },
    { campo: 'identificacion', titulo: 'Identificación', ancho: '12%' },
    { campo: 'fechaHecho', titulo: 'Fecha del hecho', ancho: '12%', formato: 'fecha' },
    { campo: 'fechaLimite', titulo: 'Fecha límite', ancho: '12%', formato: 'fecha' },
    {
      campo: 'plazoLabel',
      titulo: 'Plazo',
      ancho: '10%',
      alinear: 'centro',
      pastilla: (fila) => this.tonoPlazo(fila),
    },
    {
      campo: 'estadoLabel',
      titulo: 'Estado',
      ancho: '12%',
      pastilla: (fila) => this.tonoEstado(fila),
    },
  ];

  constructor(
    private novedadService: NovedadIessService,
    private periodoService: PeriodoNominaService,
    private empleadoService: EmpleadoService,
    private contratoService: ContratoEmpleadoService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarCatalogos();
  }

  /**
   * Colaboradores y contratos para el alta.
   *
   * Un fallo aquí no rompe la pantalla: la lista de novedades y el semáforo del mes siguen
   * funcionando, y lo único que se pierde es poder dar de alta una nueva. Por eso no avisa.
   */
  private cargarCatalogos(): void {
    forkJoin({
      empleados: this.empleadoService
        .selectByCriteria(criteriosPorEmpresa('apellidos'))
        .pipe(catchError(() => of<any[]>([]))),
      contratos: this.contratoService.selectByCriteria([]).pipe(catchError(() => of<any[]>([]))),
    }).subscribe(({ empleados, contratos }) => {
      this.empleados.set(empleados ?? []);
      this.contratos.set(contratos ?? []);
    });
  }

  // ─── Período ───────────────────────────────────────────────────────────────

  onAnioChange(anio: number): void {
    this.anio.set(anio);
    this.periodoSeleccionado.set(null);
    this.limpiar();
    this.cargarPeriodos();
  }

  onPeriodoChange(codigo: number | null): void {
    this.periodoSeleccionado.set(codigo);
    this.limpiar();
    if (codigo !== null) this.cargar();
  }

  private cargarPeriodos(): void {
    this.periodoService.selectByCriteria(criteriosPorEmpresa('mes')).subscribe({
      next: (filas) => this.periodos.set(filtrarPorAnio(filas ?? [], this.anio())),
      error: (err) => {
        this.periodos.set([]);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar los períodos.'), true);
      },
    });
  }

  private get periodo(): PeriodoNomina | null {
    return this.periodos().find((p) => p.codigo === this.periodoSeleccionado()) ?? null;
  }

  // ─── Carga ─────────────────────────────────────────────────────────────────

  /**
   * Trae todas las novedades y se queda con las del período.
   *
   * Es `getAll` y filtrado en cliente **a sabiendas**: `selectByCriteria` del DAO genérico no sabe
   * expresar «entre dos fechas» sobre `NVISFCHC`, y `NVIS` es una tabla pequeña —una fila por
   * hecho reportable, no una por persona y mes—. Si algún día crece, la respuesta es un criterio
   * de rango en el backend, no paginar aquí.
   */
  cargar(): void {
    const periodo = this.periodo;
    if (!periodo) return;

    this.cargando.set(true);
    this.novedadService.getAll().subscribe({
      next: (filas) => {
        const delPeriodo = (filas ?? [])
          .map((n) => this.normalizar(n))
          .filter((n) => this.caeEnElPeriodo(n, periodo));
        this.novedades.set(delPeriodo);
        this.filas.set(delPeriodo.map((n) => this.formatear(n)));
        this.cargando.set(false);
      },
      error: (err) => {
        this.limpiar();
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar las novedades.'), true);
      },
    });
  }

  /**
   * Fechas normalizadas una sola vez, al entrar.
   *
   * `LocalDateTime` llega en tres formas distintas del backend y compararlas sin convertir es de
   * donde salen los errores de un día. Todo lo que se compara después —plazo, rango del período—
   * ya trabaja con `Date`.
   */
  private normalizar(novedad: NovedadIess): NovedadIess {
    return {
      ...novedad,
      fechaHecho: this.fecha(novedad.fechaHecho) as Date,
      fechaLimite: this.fecha(novedad.fechaLimite),
      fechaReporte: this.fecha(novedad.fechaReporte),
    };
  }

  private caeEnElPeriodo(novedad: NovedadIess, periodo: PeriodoNomina): boolean {
    const hecho = novedad.fechaHecho;
    if (!(hecho instanceof Date) || Number.isNaN(hecho.getTime())) return false;

    const desde = this.fecha(periodo.fechaInicio);
    const hasta = this.fecha(periodo.fechaFin);
    if (!desde || !hasta) return false;

    const dia = Date.UTC(hecho.getFullYear(), hecho.getMonth(), hecho.getDate());
    return (
      dia >= Date.UTC(desde.getFullYear(), desde.getMonth(), desde.getDate()) &&
      dia <= Date.UTC(hasta.getFullYear(), hasta.getMonth(), hasta.getDate())
    );
  }

  private formatear(novedad: NovedadIess): any {
    const empleado: any = novedad.empleado ?? {};
    const dias = diasRestantes(novedad.fechaLimite);
    return {
      ...novedad,
      colaborador: `${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim() || '—',
      identificacion: empleado.identificacion ?? '—',
      tipoLabel: this.etiquetaTipo(Number(novedad.tipoNovedad)),
      estadoLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.ESTADO_NOVEDAD_IESS,
          Number(novedad.estado),
        ) || '—',
      plazoLabel: this.etiquetaPlazo(novedad, dias),
      vencida: estaVencida(novedad),
      diasRestantes: dias,
    };
  }

  /**
   * El plazo en una celda. Dice el estado del plazo, no sólo un número.
   *
   * Una novedad ya respondida no arrastra cuenta atrás: lo único que interesa de ella es si se
   * envió dentro o fuera de plazo, y eso ya no cambia.
   */
  private etiquetaPlazo(novedad: NovedadIess, dias: number | null): string {
    if (dias === null) return '—';

    const estado = Number(novedad.estado);
    if (estado === EstadoNovedadIess.ANULADA) return '—';

    if (estado === EstadoNovedadIess.ENVIADA || estado === EstadoNovedadIess.ACEPTADA) {
      return estaVencida(novedad) ? 'Fuera de plazo' : 'En plazo';
    }

    if (dias < 0) return `Vencida hace ${Math.abs(dias)} d`;
    if (dias === 0) return 'Vence hoy';
    return `${dias} d`;
  }

  private etiquetaTipo(tipo: number): string {
    return (
      this.detalleRubroService.getDescripcionByParentAndAlterno(
        RubrosRrh.TIPO_NOVEDAD_IESS,
        tipo,
      ) || `Tipo ${tipo}`
    );
  }

  /** Rojo si incumplió el plazo, aviso si vence hoy o mañana. El color acompaña al texto. */
  private tonoPlazo(fila: any): TonoPastilla | null {
    if (fila.diasRestantes === null) return null;
    if (fila.vencida) return 'error';
    if (Number(fila.estado) === EstadoNovedadIess.ANULADA) return null;
    if (bloqueaCierre(fila) && fila.diasRestantes <= 1) return 'aviso';
    return 'neutro';
  }

  private tonoEstado(fila: any): TonoPastilla {
    switch (Number(fila.estado)) {
      case EstadoNovedadIess.ACEPTADA:
        return 'ok';
      case EstadoNovedadIess.RECHAZADA:
        return 'error';
      case EstadoNovedadIess.PENDIENTE:
        return 'aviso';
      default:
        return 'neutro';
    }
  }

  // ─── Acciones ──────────────────────────────────────────────────────────────

  seleccionar(fila: any): void {
    this.seleccionada.set(this.novedades().find((n) => n.codigo === fila.codigo) ?? null);
  }

  puede(accion: AccionNovedad): boolean {
    return accionesDisponibles(this.seleccionada()).has(accion) && !this.ocupado();
  }

  motivo(accion: AccionNovedad): string {
    return motivoNoDisponible(accion, this.seleccionada());
  }

  ejecutar(accion: AccionNovedad): void {
    const novedad = this.seleccionada();
    if (!novedad) return;

    // Rechazo y anulación exigen motivo: sin él, la fila no explica después qué pasó.
    if (accion === 'marcarRechazada' || accion === 'anular') {
      const titulo = accion === 'marcarRechazada' ? 'Rechazo del IESS' : 'Anular la novedad';
      const etiqueta =
        accion === 'marcarRechazada' ? 'Motivo que devolvió el IESS' : 'Motivo de la anulación';
      this.dialog
        .open(MotivoDialogComponent, { data: { titulo, etiqueta }, autoFocus: 'dialog' })
        .afterClosed()
        .subscribe((motivo: string | null) => {
          if (!motivo) return;
          this.lanzar(
            accion,
            accion === 'marcarRechazada'
              ? this.novedadService.marcarRechazada(novedad, motivo)
              : this.novedadService.anular(novedad, motivo),
          );
        });
      return;
    }

    this.lanzar(
      accion,
      accion === 'marcarEnviada'
        ? this.novedadService.marcarEnviada(novedad)
        : this.novedadService.marcarAceptada(novedad),
    );
  }

  private lanzar(accion: AccionNovedad, llamada: Observable<NovedadIess | null>): void {
    this.ocupado.set(true);
    llamada.subscribe({
      next: () => {
        this.ocupado.set(false);
        this.avisar(MENSAJE_EXITO[accion]);
        this.seleccionada.set(null);
        this.cargar();
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(mensajeDeError(err, 'La acción no se pudo completar.'), true);
      },
    });
  }

  // ─── Alta manual ───────────────────────────────────────────────────────────

  /**
   * Registra una novedad a mano.
   *
   * Las que el motor no genera solo —una licencia sin remuneración, un reintegro anticipado— sólo
   * pueden entrar por aquí. La fecha límite la calcula el backend a partir del tipo: es plazo
   * legal y no se decide en la pantalla.
   */
  nueva(): void {
    this.dialog
      .open(NuevaNovedadDialogComponent, {
        data: { empleados: this.empleados(), contratos: this.contratos() },
        autoFocus: 'dialog',
      })
      .afterClosed()
      .subscribe((valores: any) => {
        if (!valores) return;
        this.ocupado.set(true);
        this.novedadService.registrar(this.cuerpoDelAlta(valores)).subscribe({
          next: () => {
            this.ocupado.set(false);
            this.avisar('Novedad registrada.');
            this.cargar();
          },
          error: (err) => {
            this.ocupado.set(false);
            this.avisar(mensajeDeError(err, 'No se pudo registrar la novedad.'), true);
          },
        });
      });
  }

  /**
   * Cuerpo del alta: escalares como están, referencias como `{ codigo }`.
   *
   * `referencia()` toma el `codigo` y no el `codigoAlterno` — es el defecto 1 de la pantalla, el
   * que grabó un préstamo hipotecario como «Seguro privado».
   */
  private cuerpoDelAlta(valores: any): any {
    return {
      ...valores,
      empleado: referencia(valores.empleado),
      contrato: referencia(valores.contrato),
      tipoNovedad: extraerCodigo(valores.tipoNovedad),
      estado: EstadoNovedadIess.PENDIENTE,
    };
  }

  // ─── Batch ─────────────────────────────────────────────────────────────────

  /**
   * Pide al backend el archivo de carga masiva de un tipo.
   *
   * **El caso que importa es el error, no el éxito.** Los códigos de un dígito del formato están
   * sin verificar y `sql/41` los deja en `'?'`; el exportador debe negarse mientras quede alguno.
   * Ese mensaje llega como cuerpo de error y se enseña **entero y sin reformular**: dice qué
   * códigos faltan, que es lo único accionable. Un error de blob llega como `Blob`, no como
   * texto, así que hay que leerlo antes de pasárselo a `mensajeDeError`.
   */
  exportar(tipo: { codigo: number; nombre: string }): void {
    const idPeriodo = this.periodoSeleccionado();
    if (idPeriodo === null) return;

    this.ocupado.set(true);
    this.fallaExportacion.set(null);
    this.avisoDelArchivo.set(null);
    this.novedadService.exportarBatch(idPeriodo, tipo.codigo).subscribe({
      next: (archivo) => {
        this.ocupado.set(false);
        guardarArchivo(archivo.contenido, archivo.nombre);
        // Un archivo que no se debe subir se anuncia en panel, no en `snackbar`: si el aviso se
        // va solo a los cuatro segundos, alguien lo sube igual y el error ya es del IESS.
        this.avisoDelArchivo.set(
          archivo.aviso ? { texto: archivo.aviso, noSubir: archivo.noSubir } : null,
        );
        if (!archivo.aviso) {
          this.avisar(`${archivo.nombre} generado con ${archivo.registros} registro(s).`);
        }
        // El exportador sella el código IESS de la causa en las novedades que llegaron al
        // archivo, así que lo que hay en pantalla ya no es lo que hay en la base.
        this.cargar();
      },
      error: async (err) => {
        this.ocupado.set(false);
        const texto = await this.textoDelErrorBlob(err);
        this.fallaExportacion.set(
          mensajeDeError(texto ?? err, `No se pudo exportar el batch de ${tipo.nombre}.`),
        );
      },
    });
  }

  /**
   * Un error de una petición `responseType: 'blob'` trae el cuerpo como `Blob`, así que el texto
   * del backend viene envuelto y `mensajeDeError` no lo ve. Se desenvuelve aquí.
   */
  private async textoDelErrorBlob(err: any): Promise<string | null> {
    if (!(err?.error instanceof Blob)) return null;
    try {
      const texto = (await err.error.text()).trim();
      return texto.length > 0 ? texto : null;
    } catch {
      return null;
    }
  }

  // ─── Utilidades ────────────────────────────────────────────────────────────

  etiquetaPeriodo(periodo: PeriodoNomina): string {
    return `${String(periodo.mes).padStart(2, '0')}/${periodo.anio}`;
  }

  private limpiar(): void {
    this.novedades.set([]);
    this.filas.set([]);
    this.seleccionada.set(null);
    // Describen un intento sobre un período concreto: al cambiar de mes dejan de aplicar.
    this.fallaExportacion.set(null);
    this.avisoDelArchivo.set(null);
  }

  private fecha(valor: any): Date | null {
    if (!valor) return null;
    const f = this.funcionesDatosS.convertirFechaDesdeBackend(valor);
    return f instanceof Date && !Number.isNaN(f.getTime()) ? f : null;
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
