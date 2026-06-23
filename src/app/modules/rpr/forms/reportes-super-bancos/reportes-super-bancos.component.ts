import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { EjecucionReporteService } from '../../service/ejecucion-reporte.service';
import { DetalleEjecucionReporteService } from '../../service/detalle-ejecucion-reporte.service';
import { CreditoG40Service } from '../../service/credito-g40.service';
import { ParticipeActivoG41Service } from '../../service/participe-activo-g41.service';
import { SaldoCuentaG42Service } from '../../service/saldo-cuenta-g42.service';
import { ParticipeCesanteG43Service } from '../../service/participe-cesante-g43.service';
import { ParticipeJubiladoG44Service } from '../../service/participe-jubilado-g44.service';
import { NuevoParticipeG45Service } from '../../service/nuevo-participe-g45.service';
import { NuevoPrestamoG46Service } from '../../service/nuevo-prestamo-g46.service';
import { NovacionG47Service } from '../../service/novacion-g47.service';
import { SaldoOperacionG48Service } from '../../service/saldo-operacion-g48.service';
import { CancelacionG49Service } from '../../service/cancelacion-g49.service';
import { GaranteG50Service } from '../../service/garante-g50.service';
import { GarantiaRealG51Service } from '../../service/garantia-real-g51.service';
import { DetalleEjecucionReporte } from '../../model/detalle-ejecucion-reporte';
import { EjecucionReporte } from '../../model/ejecucion-reporte';

@Component({
  selector: 'app-reportes-super-bancos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './reportes-super-bancos.component.html',
  styleUrls: ['./reportes-super-bancos.component.scss'],
})
export class ReportesSuperBancosComponent implements OnInit {

  meses = [
    { valor: 1,  nombre: 'Enero' },
    { valor: 2,  nombre: 'Febrero' },
    { valor: 3,  nombre: 'Marzo' },
    { valor: 4,  nombre: 'Abril' },
    { valor: 5,  nombre: 'Mayo' },
    { valor: 6,  nombre: 'Junio' },
    { valor: 7,  nombre: 'Julio' },
    { valor: 8,  nombre: 'Agosto' },
    { valor: 9,  nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' },
  ];

  anios: number[] = [];
  mesSeleccionado  = signal<number>(6);
  anioSeleccionado = signal<number>(2025);

  cargandoPeriodo = signal<boolean>(true);
  /** Período único habilitado: {mes, anio} */
  periodoPermitido = signal<{ mes: number; anio: number }>({ mes: 6, anio: 2025 });

  ejecutando      = signal<boolean>(false);
  cargandoDetalle = signal<boolean>(false);
  ejecucion       = signal<EjecucionReporte | null>(null);
  detalles        = signal<DetalleEjecucionReporte[]>([]);
  mensajeInfo     = signal<string>('');
  errorMsg        = signal<string>('');

  // Tabla inline del G seleccionado
  detalleSeleccionado = signal<DetalleEjecucionReporte | null>(null);
  cargandoRegistros   = signal<boolean>(false);
  errorRegistros      = signal<string>('');
  registrosG          = signal<any[]>([]);
  columnasG           = signal<string[]>([]);

  readonly estadoEjrcLabel: Partial<Record<number, string>> = {
    1: 'En proceso',
    2: 'Con novedades',
    3: 'Completo',
  };

  readonly estadoEjrdLabel: Partial<Record<number, string>> = {
    1: 'OK',
    2: 'Con novedades',
    3: 'Pendiente',
  };

  readonly estadoEjrdClass: Partial<Record<number, string>> = {
    1: 'estado-ok',
    2: 'estado-novedad',
    3: 'estado-pendiente',
  };

  readonly estadoEjrdIcon: Partial<Record<number, string>> = {
    1: 'check_circle',
    2: 'warning',
    3: 'schedule',
  };

  puedeReintentar    = computed(() => this.ejecucion()?.estado === 2);
  descargandoTodos    = signal<boolean>(false);

  /** True cuando el período seleccionado coincide exactamente con el siguiente período a generar */
  esPeriodoPermitido = computed(() => {
    const p = this.periodoPermitido();
    return this.mesSeleccionado() === p.mes && this.anioSeleccionado() === p.anio;
  });

  /** Campos numéricos por tipo de reporte — null/0 deben salir como "0.00" en el TXT */
  private readonly numericColsMap: Record<string, Set<string>> = {
    G40: new Set(['porcentajeAportePatronalCesantia','porcentajeAportePersonalCesantia','porcentajeAportePatronalJubilacion','porcentajeAportePersonalJubilacion','valorAportePersonalCesantia','valorAportePersonalJubilacion']),
    G41: new Set(['baseCalculoAportacion']),
    G42: new Set(['aportePatronal','aportePersonal','aporteVoluntario','saldoAportePatronal','saldoAportePersonal','saldoAporteVoluntario','rendimiento']),
    G43: new Set(['numeroImposicionesPersonales','numeroImposicionesPatronales','saldoCuentaIndividual','valoresCompensados','valoresPagados']),
    G44: new Set(['imposicionesAcumuladas','valorPension','valorNetoRecibir','saldoCuenta','valoresCompensados']),
    G45: new Set(['patrimonio','cargasFamiliares']),
    G46: new Set(['valorOperacion','tasaInteresNominal']),
    G47: new Set([]),
    G48: new Set(['diasMorosidad','tasaInteres','valorPorVencer','valorVencido','costosOperativos','interesOrdinario','interesMora','valorDemandaJudicial','carteraCastigada','provisionRequeridaOriginal','provisionConstituida','valorTotalCuentaIndividual','valorSujetoProvision','cuotaCredito','dividendo']),
    G49: new Set([]),
    G50: new Set([]),
    G51: new Set(['valorAvaluo','porcentajeCubre']),
  };

  /** Columnas por defecto para cada tipo de reporte (excluyendo codigo y detalleEjecucion) */
  readonly columnasMap: Record<string, string[]> = {
    G40: ['tipoIdentificacionFcpc','identificacionFcpc','numeroResolucion','fechaResolucion','provincia','canton','direccion','telefonos','correoElectronico','tipoSistema','tipoPrestacion','tipoAporte','tipoAdministracion','fechaTraspaso','tipoFcpc','numeroResolucionCambioEstatuto','fechaResolucionCambioEstatuto','cambioNombre','porcentajeAportePatronalCesantia','porcentajeAportePersonalCesantia','porcentajeAportePatronalJubilacion','porcentajeAportePersonalJubilacion','valorAportePersonalCesantia','valorAportePersonalJubilacion'],
    G41: ['tipoIdentificacion','identificacion','genero','estadoCivil','fechaNacimiento','fechaIngreso','estadoParticipe','tipoSistema','baseCalculoAportacion','tipoRelacionLaboral','estadoRegistro','fechaActualizacionEstado'],
    G42: ['tipoIdentificacion','identificacion','tipoPrestacion','aportePatronal','aportePersonal','aporteVoluntario','saldoAportePatronal','saldoAportePersonal','saldoAporteVoluntario','rendimiento'],
    G43: ['tipoIdentificacion','identificacion','fechaTerminoRelacionLaboral','numeroImposicionesPersonales','numeroImposicionesPatronales','fechaLiquidacion','saldoCuentaIndividual','valoresCompensados','valoresPagados'],
    G44: ['tipoIdentificacion','identificacion','tipoJubilacion','fechaJubilacion','imposicionesAcumuladas','valorPension','valorNetoRecibir','saldoCuenta','valoresCompensados','jubilacionIess'],
    G45: ['tipoIdentificacion','identificacion','tipoParticipe','actividadEconomica','patrimonio','provincia','canton','parroquia','genero','estadoCivil','fechaNacimiento','profesion','cargasFamiliares','origenIngresos'],
    G46: ['tipoIdentificacion','identificacion','numeroOperacion','tipoCredito','estadoOperacion','situacionOperacion','destinoProvincia','destinoCanton','destinoParroquia','fechaConcesion','fechaVencimiento','valorOperacion','tasaInteresNominal','periodicidadPago','frecuenciaRevision','garantias'],
    G47: ['tipoIdentificacion','identificacion','numeroOperacion','numeroOperacionAnterior','fechaNovacion'],
    G48: ['tipoIdentificacion','identificacion','numeroOperacion','tipoCredito','diasMorosidad','calificacionPropia','tasaInteres','valorPorVencer','valorVencido','costosOperativos','interesOrdinario','interesMora','valorDemandaJudicial','carteraCastigada','provisionRequeridaOriginal','provisionConstituida','valorTotalCuentaIndividual','valorSujetoProvision','tipoSistemaAmortizacion','cuotaCredito','dividendo','fechaExigibilidad'],
    G49: ['tipoIdentificacion','identificacion','numeroOperacion','fechaCancelacion','formaCancelacion'],
    G50: ['tipoIdentificacion','identificacion','numeroOperacion','tipoIdentificacionGarante','identificacionGarante','tipoGarante','fechaEliminacion','causaEliminacion'],
    G51: ['tipoIdentificacion','identificacion','numeroOperacion','numeroGarantia','tipoGarantia','descripcionGarantia','valorAvaluo','fechaAvaluo','numeroRegistroGarantia','fechaContabilizacion','porcentajeCubre','estadoRegistro'],
  };

  private readonly servicioMap: Record<string, (c: DatosBusqueda[]) => Observable<any[] | null>>;

  constructor(
    private ejecucionService: EjecucionReporteService,
    private detalleService:   DetalleEjecucionReporteService,
    private usuarioService:   UsuarioService,
    private g40Svc: CreditoG40Service,
    private g41Svc: ParticipeActivoG41Service,
    private g42Svc: SaldoCuentaG42Service,
    private g43Svc: ParticipeCesanteG43Service,
    private g44Svc: ParticipeJubiladoG44Service,
    private g45Svc: NuevoParticipeG45Service,
    private g46Svc: NuevoPrestamoG46Service,
    private g47Svc: NovacionG47Service,
    private g48Svc: SaldoOperacionG48Service,
    private g49Svc: CancelacionG49Service,
    private g50Svc: GaranteG50Service,
    private g51Svc: GarantiaRealG51Service,
  ) {
    const anioActual = new Date().getFullYear();
    for (let a = anioActual - 10; a <= anioActual + 1; a++) {
      this.anios.push(a);
    }

    this.servicioMap = {
      G40: (c) => this.g40Svc.selectByCriteria(c),
      G41: (c) => this.g41Svc.selectByCriteria(c),
      G42: (c) => this.g42Svc.selectByCriteria(c),
      G43: (c) => this.g43Svc.selectByCriteria(c),
      G44: (c) => this.g44Svc.selectByCriteria(c),
      G45: (c) => this.g45Svc.selectByCriteria(c),
      G46: (c) => this.g46Svc.selectByCriteria(c),
      G47: (c) => this.g47Svc.selectByCriteria(c),
      G48: (c) => this.g48Svc.selectByCriteria(c),
      G49: (c) => this.g49Svc.selectByCriteria(c),
      G50: (c) => this.g50Svc.selectByCriteria(c),
      G51: (c) => this.g51Svc.selectByCriteria(c),
    };
  }

  ngOnInit(): void {
    this.ejecucionService.getAll().subscribe({
      next: (lista) => {
        const periodo = this.calcularPeriodoPermitido(lista ?? []);
        this.periodoPermitido.set(periodo);
        this.mesSeleccionado.set(periodo.mes);
        this.anioSeleccionado.set(periodo.anio);
        this.cargandoPeriodo.set(false);
      },
      error: () => {
        // Si falla la carga, usar junio 2025 por defecto
        this.cargandoPeriodo.set(false);
      },
    });
  }

  /**
   * Calcula el período permitido para generar:
   * - Sin historial → junio 2025
   * - Con historial → mes siguiente al último (en orden cronológico)
   */
  private calcularPeriodoPermitido(ejecuciones: EjecucionReporte[]): { mes: number; anio: number } {
    if (!ejecuciones.length) {
      return { mes: 6, anio: 2025 };
    }
    // Ordenar cronológicamente y tomar el último
    const ultima = ejecuciones.reduce((prev, curr) => {
      const prevVal = prev.anio * 100 + prev.mes;
      const currVal = curr.anio * 100 + curr.mes;
      return currVal > prevVal ? curr : prev;
    });
    // Avanzar un mes
    const mesNext  = ultima.mes === 12 ? 1 : ultima.mes + 1;
    const anioNext = ultima.mes === 12 ? ultima.anio + 1 : ultima.anio;
    return { mes: mesNext, anio: anioNext };
  }

  /** Etiqueta del período permitido para mostrar al usuario */
  periodoPermitidoLabel = computed(() => {
    const p = this.periodoPermitido();
    const nombreMes = this.meses.find(m => m.valor === p.mes)?.nombre ?? '';
    return `${nombreMes} ${p.anio}`;
  });

  buscarEjecucion(): void {
    this.mensajeInfo.set('');
    this.errorMsg.set('');
    this.ejecucion.set(null);
    this.detalles.set([]);
    this.detalleSeleccionado.set(null);
    this.registrosG.set([]);
    this.columnasG.set([]);

    this.cargandoDetalle.set(true);
    this.ejecucionService.getByMesAnio(this.mesSeleccionado(), this.anioSeleccionado()).subscribe({
      next: (lista) => {
        this.cargandoDetalle.set(false);
        const arr = lista ?? [];
        if (arr.length === 0) {
          this.mensajeInfo.set(`No se encontraron ejecuciones para ${this.mesNombre()} ${this.anioSeleccionado()}.`);
          return;
        }
        // Tomar la más reciente por código
        const ej = arr.reduce((a: EjecucionReporte, b: EjecucionReporte) =>
          (a.codigo ?? 0) > (b.codigo ?? 0) ? a : b
        );
        this.ejecucion.set(ej);
        if (ej.codigo) { this.cargarDetalle(ej.codigo); }
      },
      error: () => {
        this.cargandoDetalle.set(false);
        this.errorMsg.set('Error al consultar ejecuciones del período seleccionado.');
      },
    });
  }

  generarArchivos(): void {
    this.mensajeInfo.set('');
    this.errorMsg.set('');
    this.ejecucion.set(null);
    this.detalles.set([]);
    this.detalleSeleccionado.set(null);
    this.registrosG.set([]);
    this.columnasG.set([]);

    const usuario = this.usuarioService.getUsuarioLog()?.nombre || 'sistema';

    this.ejecucionService.ejecutar({
      mes:  this.mesSeleccionado(),
      anio: this.anioSeleccionado(),
      usuario,
    }).subscribe({
      next: (resp) => {
        this.ejecutando.set(false);
        if (!resp) return;
        if ('mensaje' in resp) {
          this.mensajeInfo.set(resp.mensaje);
          const match = resp.mensaje.match(/id:\s*(\d+)/i);
          if (match) { this.cargarDetalle(Number(match[1])); }
        } else {
          this.ejecucion.set(resp as EjecucionReporte);
          if ((resp as EjecucionReporte).codigo) {
            this.cargarDetalle((resp as EjecucionReporte).codigo!);
          }
        }
        // Avanzar solo el período permitido al mes siguiente para que el label
        // "Próximo mes a generar" se actualice, pero los combos y mensajes
        // permanecen en el mes recién generado.
        const mesGen  = this.mesSeleccionado();
        const anioGen = this.anioSeleccionado();
        const mesNext  = mesGen === 12 ? 1 : mesGen + 1;
        const anioNext = mesGen === 12 ? anioGen + 1 : anioGen;
        this.periodoPermitido.set({ mes: mesNext, anio: anioNext });
      },
      error: (err) => {
        this.ejecutando.set(false);
        this.errorMsg.set(err?.error ?? err?.message ?? 'Error inesperado al generar los reportes.');
        console.error('[ReportesSuperBancos] Error ejecutar:', err);
      },
    });
  }

  /** Todos los tipos de reporte que deben aparecer siempre al descargar. */
  private static readonly TIPOS_REPORTE_COMPLETOS = [
    'G40','G41','G42','G43','G44','G45','G46','G47','G48','G49','G50','G51',
  ] as const;

  private cargarDetalle(idEjecucion: number): void {
    this.cargandoDetalle.set(true);
    this.detalleService.getByEjecucion(idEjecucion).subscribe({
      next: (data) => {
        this.cargandoDetalle.set(false);
        const raw: DetalleEjecucionReporte[] = data ?? [];

        // Deduplicar por tipoReporte: preferir correcciones (detalleOriginal != null)
        // sobre originales; entre iguales, el de mayor codigo gana.
        const mapaReciente = new Map<string, DetalleEjecucionReporte>();
        for (const d of raw) {
          const existing = mapaReciente.get(d.tipoReporte);
          if (!existing) {
            mapaReciente.set(d.tipoReporte, d);
          } else {
            const dEsCorreccion       = d.detalleOriginal != null;
            const existingEsCorreccion = existing.detalleOriginal != null;

            if (dEsCorreccion && !existingEsCorreccion) {
              // d es corrección y existing es original → d gana
              mapaReciente.set(d.tipoReporte, d);
            } else if (!dEsCorreccion && existingEsCorreccion) {
              // existing es corrección y d es original → existing se queda
            } else {
              // Ambos del mismo tipo → gana el de mayor codigo
              if ((d.codigo ?? 0) > (existing.codigo ?? 0)) {
                mapaReciente.set(d.tipoReporte, d);
              }
            }
          }
        }
        const lista: DetalleEjecucionReporte[] = [...mapaReciente.values()];

        // Completar con entradas vacías los tipos que el backend no retornó
        for (const tipo of ReportesSuperBancosComponent.TIPOS_REPORTE_COMPLETOS) {
          if (!mapaReciente.has(tipo)) {
            lista.push({
              codigo: null,
              ejecucionReporte: { codigo: idEjecucion } as any,
              tipoReporte: tipo,
              estado: 3,
              fechaGeneracion: null,
              cantidadRegistros: 0,
              novedades: '',
              detalleOriginal: null,
            });
          }
        }

        // Ordenar G40 → G51
        lista.sort((a, b) => a.tipoReporte.localeCompare(b.tipoReporte));
        this.detalles.set(lista);
      },
      error: () => this.cargandoDetalle.set(false),
    });
  }

  seleccionarDetalle(detalle: DetalleEjecucionReporte): void {
    // Click en el mismo G = colapsar
    if (this.detalleSeleccionado()?.tipoReporte === detalle.tipoReporte) {
      this.detalleSeleccionado.set(null);
      this.registrosG.set([]);
      this.columnasG.set([]);
      this.errorRegistros.set('');
      return;
    }

    this.detalleSeleccionado.set(detalle);
    this.registrosG.set([]);
    // Cargar columnas desde el mapa estático siempre, sin importar si hay filas
    this.columnasG.set(this.columnasMap[detalle.tipoReporte] ?? []);
    this.errorRegistros.set('');

    if ((detalle.cantidadRegistros ?? 0) === 0) {
      return;
    }

    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'detalleEjecucion',
      'codigo',
      String(detalle.codigo),
      TipoComandosBusqueda.IGUAL,
    );

    const fn = this.servicioMap[detalle.tipoReporte];
    if (!fn) {
      this.errorRegistros.set('No hay servicio configurado para este tipo de reporte.');
      return;
    }

    this.cargandoRegistros.set(true);
    fn([criterio]).subscribe({
      next: (rows) => {
        this.cargandoRegistros.set(false);
        const data = rows ?? [];
        this.registrosG.set(data);
        // Las columnas ya están seteadas desde el mapa estático; no sobreescribir
      },
      error: () => {
        this.cargandoRegistros.set(false);
        if ((detalle.cantidadRegistros ?? 0) > 0) {
          this.errorRegistros.set('Error al cargar los registros.');
        }
      },
    });
  }

  formatVal(v: any, col?: string): string {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v) && v.length >= 3 && typeof v[0] === 'number') {
      const [y, m, d] = v;
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
    if (typeof v === 'object') return '';
    if (typeof v === 'number') {
      if (col === 'diasMorosidad' || col === 'cargasFamiliares') return Number.isInteger(v) ? String(v) : v.toFixed(2);
      return v.toFixed(2);
    }
    if (typeof v === 'string' && /^\d{4}-\d{1,2}-\d{1,2}/.test(v)) {
      const parts = v.substring(0, 10).split('-');
      const y = parts[0];
      const m = String(parts[1]).padStart(2, '0');
      const d = String(parts[2]).padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
    return String(v);
  }

  /** Variante para el TXT: campos numéricos con null/0 emiten "0.00" */
  private formatValTxt(v: any, isNumeric: boolean, col?: string): string {
    if (Array.isArray(v) && v.length >= 3 && typeof v[0] === 'number') {
      const [y, m, d] = v;
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
    if (isNumeric) {
      // Campos que representan contadores/enteros (sin decimales)
      if (col === 'diasMorosidad' ||
          col === 'cargasFamiliares' ||
          col === 'numeroImposicionesPersonales' ||
          col === 'numeroImposicionesPatronales' ||
          col === 'imposicionesAcumuladas') {
        const n = Number(v);
        return (v === null || v === undefined || v === '') ? '0' : (Number.isInteger(n) ? String(n) : n.toFixed(2));
      }
      if (v === null || v === undefined || v === '' || Number(v) === 0) return '0.00';
      return Number(v).toFixed(2);
    }
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return '';
    if (typeof v === 'number') return v.toFixed(2);
    // Fechas que llegan como string ISO: "YYYY-MM-DD" o "YYYY-M-D"
    if (typeof v === 'string' && /^\d{4}-\d{1,2}-\d{1,2}/.test(v)) {
      const parts = v.substring(0, 10).split('-');
      const y = parts[0];
      const m = String(parts[1]).padStart(2, '0');
      const d = String(parts[2]).padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
    return String(v);
  }

  descargarTodosTxt(): void {
    const dets = this.detalles();
    if (dets.length === 0) return;

    this.descargandoTodos.set(true);
    const mes  = this.mesSeleccionado();
    const anio = this.anioSeleccionado();
    const lastDay     = new Date(anio, mes, 0).getDate();
    const fechaCierre = `${String(lastDay).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;

    const requests = dets.map(detalle => {
      if ((detalle.cantidadRegistros ?? 0) === 0) {
        return of({ detalle, rows: [] as any[] });
      }
      const criterio = new DatosBusqueda();
      criterio.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'detalleEjecucion',
        'codigo',
        String(detalle.codigo),
        TipoComandosBusqueda.IGUAL,
      );
      const fn = this.servicioMap[detalle.tipoReporte];
      if (!fn) return of({ detalle, rows: [] as any[] });
      return fn([criterio]).pipe(map(rows => ({ detalle, rows: rows ?? [] })));
    });

    forkJoin(requests).subscribe({
      next: (results) => {
        this.descargandoTodos.set(false);
        results.forEach(({ detalle, rows }, index) => {
          setTimeout(() => {
            const { tipoReporte } = detalle;
            const cols        = this.columnasMap[tipoReporte] ?? [];
            const numericCols = this.numericColsMap[tipoReporte] ?? new Set<string>();
            const totalConCabecera = rows.length + 1;

            const lines: string[] = [];
            lines.push([tipoReporte, '3968', fechaCierre, String(totalConCabecera)].join('\t'));
            for (const row of rows) {
              lines.push(cols.map(c => this.formatValTxt(row[c], numericCols.has(c), c)).join('	'));
            }

            const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
            const url  = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const periodicidad = tipoReporte === 'G40' ? 'S' : 'M';
            const fechaNombre  = `${String(lastDay).padStart(2, '0')}${String(mes).padStart(2, '0')}${anio}`;
            link.href     = url;
            link.download = `${tipoReporte}${periodicidad}3968${fechaNombre}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, index * 300);
        });
      },
      error: () => {
        this.descargandoTodos.set(false);
        this.errorMsg.set('Error al descargar los archivos TXT.');
      },
    });
  }

  descargarTxt(): void {
    const detalle = this.detalleSeleccionado();
    if (!detalle) return;
    const { tipoReporte } = detalle;
    const mes  = this.mesSeleccionado();
    const anio = this.anioSeleccionado();

    const lastDay     = new Date(anio, mes, 0).getDate();
    const fechaCierre = `${String(lastDay).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;

    const rows = this.registrosG();
    const cols = this.columnasG();
    const totalConCabecera = rows.length + 1;
    const numericCols = this.numericColsMap[tipoReporte] ?? new Set<string>();

    const lines: string[] = [];
    lines.push([tipoReporte, '3968', fechaCierre, String(totalConCabecera)].join('\t'));
    for (const row of rows) {
      lines.push(cols.map(c => this.formatValTxt(row[c], numericCols.has(c), c)).join('	'));
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const periodicidad = tipoReporte === 'G40' ? 'S' : 'M';
    const fechaNombre  = `${String(lastDay).padStart(2, '0')}${String(mes).padStart(2, '0')}${anio}`;
    link.href     = url;
    link.download = `${tipoReporte}${periodicidad}3968${fechaNombre}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  mesNombre(): string {
    return this.meses.find(m => m.valor === this.mesSeleccionado())?.nombre ?? '';
  }

  isNumericCol(col: string): boolean {
    const tipo = this.detalleSeleccionado()?.tipoReporte;
    if (!tipo) return false;
    return this.numericColsMap[tipo]?.has(col) ?? false;
  }
}
