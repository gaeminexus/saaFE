import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { LOGO_ASOPREP_BASE64 } from './logo-asoprep.const';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import { ExportService } from '../../../../shared/services/export.service';
import { EjccService, EjecutarReporteCarteraRequest } from '../../service/ejcc.service';
import { CprmService } from '../../service/cprm.service';
import { CjbmService } from '../../service/cjbm.service';
import { CcpmService } from '../../service/ccpm.service';
import { Ejcc } from '../../model/ejcc';
import { Cprm } from '../../model/cprm';
import { Cjbm } from '../../model/cjbm';
import { Ccpm } from '../../model/ccpm';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

type ReporteTipo = 'CPRM' | 'CJBM' | 'CCPM';

interface FilaResumen {
  concepto:  string;
  categoria: string;
  valor:     number;
}

interface ResumenGrupo {
  categoria: string;
  filas:     FilaResumen[];
  total:     number;
}

interface ResumenReporte {
  tipo: ReporteTipo;
  label: string;
  icon: string;
  cantidad: number | null;
}

/** Definición de columna para la tabla */
interface ColumnaTabla {
  campo: string;
  campoPadre?: string;
  header: string;
  esFecha?: boolean;
  esNumero?: boolean;
}

@Component({
  selector: 'app-informes-mensuales-credito',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './informes-mensuales-credito.component.html',
  styleUrls: ['./informes-mensuales-credito.component.scss'],
})
export class InformesMensualesCreditoComponent implements OnInit {

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
  mesSeleccionado  = signal<number>(new Date().getMonth() + 1);
  anioSeleccionado = signal<number>(new Date().getFullYear());

  consultando  = signal<boolean>(false);
  ejecutando   = signal<boolean>(false);
  eliminando   = signal<boolean>(false);

  ejecucion    = signal<Ejcc | null>(null);
  errorMsg     = signal<string>('');
  mensajeInfo  = signal<string>('');

  /** El período ya fue generado → deshabilitar "Generar", habilitar "Regenerar" */
  yaGenerado = computed(() => this.ejecucion() !== null);

  reporteSel     = signal<ReporteTipo | null>(null);
  cargandoReg    = signal<boolean>(false);
  registros      = signal<any[]>([]);
  columnasDef    = signal<ColumnaTabla[]>([]);
  errorRegistros = signal<string>('');

  resumenFinanciero = signal<FilaResumen[]>([]);
  cargandoResumen   = signal<boolean>(false);

  resumenGrupos = computed<ResumenGrupo[]>(() => {
    const filas = this.resumenFinanciero();
    const grupos = new Map<string, ResumenGrupo>();
    for (const f of filas) {
      const key = f.categoria;
      if (!grupos.has(key)) grupos.set(key, { categoria: key, filas: [], total: 0 });
      const g = grupos.get(key)!;
      g.filas.push(f);
      g.total += f.valor;
    }
    return [...grupos.values()];
  });

  resumenes = signal<ResumenReporte[]>([
    { tipo: 'CPRM', label: 'Partícipes',      icon: 'people',      cantidad: null },
    { tipo: 'CJBM', label: 'Jubilados',        icon: 'elderly',     cantidad: null },
    { tipo: 'CCPM', label: 'Cuotas Préstamos', icon: 'credit_card', cantidad: null },
  ]);

  mesNombre = computed(() =>
    this.meses.find(m => m.valor === this.mesSeleccionado())?.nombre ?? ''
  );

  // ── Definiciones de columnas por reporte ─────────────────────────

  private readonly colsCPRM: ColumnaTabla[] = [
    { campo: 'identificacion',       header: 'Identificación' },
    { campo: 'tipoAporte', campoPadre: 'nombre', header: 'Tipo de Aporte' },
    { campo: 'total',                header: 'Total', esNumero: true },
    { campo: 'nombreEstado',         header: 'Estado' },
  ];

  private readonly colsCJBM: ColumnaTabla[] = [
    { campo: 'identificacion',         header: 'Identificación' },
    { campo: 'tipoJubilacion',         header: 'Tipo Jub.' },
    { campo: 'fechaJubilacion',        header: 'Fecha Jub.',       esFecha: true },
    { campo: 'imposicionesAcumuladas', header: 'Imposiciones',     esNumero: true },
    { campo: 'valorPension',           header: 'Pensión',          esNumero: true },
    { campo: 'valorJubilacion',        header: 'Valor Jubilación', esNumero: true },
    { campo: 'valorSeguro',            header: 'Valor Seguro',     esNumero: true },
    { campo: 'valoresCompensados',     header: 'Compensados',      esNumero: true },
    { campo: 'valorNetoRecibir',       header: 'Neto a Recibir',   esNumero: true },
    { campo: 'saldoCuenta',            header: 'Saldo Cuenta',     esNumero: true },
    { campo: 'jubilacionIess',         header: 'IESS' },
  ];

  private readonly colsCCPM: ColumnaTabla[] = [
    { campo: 'identificacion',             header: 'Identificación' },
    { campo: 'numeroOperacion',            header: 'Operación' },
    { campo: 'tipoCredito',               header: 'Tipo Créd.' },
    { campo: 'diasMorosidad',             header: 'Días Mora',       esNumero: true },
    { campo: 'calificacionPropia',        header: 'Calif.' },
    { campo: 'tasaInteres',              header: 'Tasa %',           esNumero: true },
    { campo: 'valorPorVencer',           header: 'Por Vencer',       esNumero: true },
    { campo: 'capitalPorVencer1a30',     header: 'CV 1-30d',         esNumero: true },
    { campo: 'capitalPorVencer31a90',    header: 'CV 31-90d',        esNumero: true },
    { campo: 'capitalPorVencer91a180',   header: 'CV 91-180d',       esNumero: true },
    { campo: 'capitalPorVencer181a360',  header: 'CV 181-360d',      esNumero: true },
    { campo: 'capitalPorVencerMas360',   header: 'CV >360d',         esNumero: true },
    { campo: 'estadoDesglose',           header: 'Est. Desglose' },
    { campo: 'valorVencido',             header: 'Vencido',          esNumero: true },
    { campo: 'interesOrdinario',         header: 'Int. Ordinario',   esNumero: true },
    { campo: 'interesOrdinarioDelMes',   header: 'Int. Ord. Mes',    esNumero: true },
    { campo: 'interesMoraDelMes',        header: 'Int. Mora Mes',    esNumero: true },
    { campo: 'interesMora',              header: 'Int. Mora',        esNumero: true },
    { campo: 'valorSujetoProvision',     header: 'Suj. Provisión',   esNumero: true },
    { campo: 'provisionRequeridaOriginal', header: 'Prov. Req.',     esNumero: true },
    { campo: 'provisionConstituida',     header: 'Prov. Const.',     esNumero: true },
    { campo: 'valorDesgravamen',         header: 'Desgravamen',      esNumero: true },
    { campo: 'valorIncendio',            header: 'Incendio',         esNumero: true },
    { campo: 'fechaExigibilidad',        header: 'Fec. Exigib.',     esFecha: true },
    { campo: 'fechaPrestamo',            header: 'Fec. Préstamo',    esFecha: true },
  ];

  constructor(
    private ejccService:    EjccService,
    private cprmService:    CprmService,
    private cjbmService:    CjbmService,
    private ccpmService:    CcpmService,
    private usuarioService: UsuarioService,
    private exportService:  ExportService,
  ) {
    const anioActual = new Date().getFullYear();
    for (let a = anioActual - 10; a <= anioActual + 1; a++) {
      this.anios.push(a);
    }
  }

  ngOnInit(): void {}

  // ── Acciones principales ──────────────────────────────────────────

  /** Verifica si el período ya fue generado */
  consultar(): void {
    this.limpiarEstado();
    this.consultando.set(true);

    this.ejccService.getByMesAnio(this.mesSeleccionado(), this.anioSeleccionado()).subscribe({
      next: (lista) => {
        this.consultando.set(false);
        if (!lista || lista.length === 0) {
          this.mensajeInfo.set(
            `No hay informes generados para ${this.mesNombre()} ${this.anioSeleccionado()}. Puede generarlos con el botón "Generar".`
          );
          return;
        }
        const ejcc = lista[lista.length - 1];
        this.ejecucion.set(ejcc);
        if (ejcc.observaciones) {
          this.mensajeInfo.set(ejcc.observaciones);
        }
        this.cargarConteos(ejcc.codigo!);
      },
      error: (err: any) => {
        this.consultando.set(false);
        this.errorMsg.set('Error al consultar: ' + (err?.message ?? 'Error desconocido'));
      },
    });
  }

  /** Genera los 3 reportes del período. Solo disponible si no fue generado aún. */
  generar(): void {
    const usuario = this.usuarioService.getUsuarioLog()?.nombre ?? 'usuario';
    const request: EjecutarReporteCarteraRequest = {
      mes:  this.mesSeleccionado(),
      anio: this.anioSeleccionado(),
      usuario,
    };

    this.ejecutando.set(true);
    this.errorMsg.set('');
    this.mensajeInfo.set('');

    this.ejccService.ejecutar(request).subscribe({
      next: (resp) => {
        this.ejecutando.set(false);
        if (!resp) {
          this.mensajeInfo.set('Generación completada.');
          this.consultar();
          return;
        }
        if ('mensaje' in resp) {
          this.mensajeInfo.set(resp.mensaje);
          this.consultar();
          return;
        }
        const ejcc = resp as Ejcc;
        this.ejecucion.set(ejcc);
        if (ejcc.observaciones) {
          this.mensajeInfo.set(ejcc.observaciones);
        }
        this.cargarConteos(ejcc.codigo!);
      },
      error: (err: any) => {
        this.ejecutando.set(false);
        this.errorMsg.set('Error al generar: ' + (err?.message ?? 'Error desconocido'));
      },
    });
  }

  /** Elimina la ejecución actual y vuelve a generar */
  regenerar(): void {
    const ejcc = this.ejecucion();
    if (!ejcc?.codigo) return;

    this.eliminando.set(true);
    this.errorMsg.set('');
    this.mensajeInfo.set('');

    this.ejccService.delete(ejcc.codigo).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.limpiarEstado();
        this.generar();
      },
      error: (err: any) => {
        this.eliminando.set(false);
        this.errorMsg.set('Error al eliminar la ejecución: ' + (err?.message ?? 'Error desconocido'));
      },
    });
  }

  limpiar(): void {
    this.limpiarEstado();
  }

  // ── Detalle de reportes ───────────────────────────────────────────

  seleccionarReporte(tipo: ReporteTipo): void {
    if (this.reporteSel() === tipo) {
      this.reporteSel.set(null);
      this.registros.set([]);
      return;
    }

    const ejcc = this.ejecucion();
    if (!ejcc) return;

    this.reporteSel.set(tipo);
    this.errorRegistros.set('');
    this.registros.set([]);
    this.columnasDef.set(
      tipo === 'CPRM' ? this.colsCPRM :
      tipo === 'CJBM' ? this.colsCJBM :
                        this.colsCCPM
    );

    const criterios = this.buildCriterio(ejcc.codigo!);
    this.cargandoReg.set(true);

    const obs$: Observable<Cprm[] | Cjbm[] | Ccpm[] | null> =
      tipo === 'CPRM' ? this.cprmService.selectByCriteria(criterios) :
      tipo === 'CJBM' ? this.cjbmService.selectByCriteria(criterios) :
                        this.ccpmService.selectByCriteria(criterios);

    obs$.subscribe({
      next: (data: Cprm[] | Cjbm[] | Ccpm[] | null) => {
        this.cargandoReg.set(false);
        this.registros.set(data ?? []);
      },
      error: (err: any) => {
        this.cargandoReg.set(false);
        this.errorRegistros.set('Error al cargar: ' + (err?.message ?? 'Error desconocido'));
      },
    });
  }

  /** Obtiene el valor de celda, soportando sub-objetos y formateo */
  getCellValue(row: any, col: ColumnaTabla): string {
    const v = row[col.campo];
    if (v === null || v === undefined) return '';
    if (col.campoPadre) return v[col.campoPadre] ?? '';
    if (col.esFecha)    return this.formatFecha(v);
    if (col.esNumero && typeof v === 'number') return v.toFixed(2);
    return String(v);
  }

  get colKeys(): string[] {
    return this.columnasDef().map(c => c.campo);
  }

  // ── Privados ──────────────────────────────────────────────────────

  private buildCriterio(ejccCodigo: number): DatosBusqueda[] {
    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'ejecucionReporte',
      'codigo',
      String(ejccCodigo),
      TipoComandosBusqueda.IGUAL,
    );
    return [criterio];
  }

  private cargarConteos(ejccCodigo: number): void {
    const criterios = this.buildCriterio(ejccCodigo);
    this.cargandoResumen.set(true);

    forkJoin({
      cprm: this.cprmService.selectByCriteria(criterios),
      cjbm: this.cjbmService.selectByCriteria(criterios),
      ccpm: this.ccpmService.selectByCriteria(criterios),
    }).subscribe({
      next: ({ cprm, cjbm, ccpm }) => {
        const cprmData = cprm ?? [];
        const cjbmData = cjbm ?? [];
        const ccpmData = ccpm ?? [];

        this.actualizarResumen('CPRM', cprmData.length);
        this.actualizarResumen('CJBM', cjbmData.length);
        this.actualizarResumen('CCPM', ccpmData.length);

        try {
          this.calcularResumenFinanciero(ccpmData, cprmData, cjbmData);
        } catch (e) {
          console.error('[ResumenFinanciero] Error al calcular resumen:', e);
        } finally {
          this.cargandoResumen.set(false);
        }
      },
      error: (err) => {
        console.error('[ResumenFinanciero] Error en forkJoin:', err);
        this.actualizarResumen('CPRM', 0);
        this.actualizarResumen('CJBM', 0);
        this.actualizarResumen('CCPM', 0);
        this.cargandoResumen.set(false);
      },
    });
  }

  private calcularResumenFinanciero(ccpm: Ccpm[], cprm: Cprm[], cjbm: Cjbm[]): void {
    const filas: FilaResumen[] = [];

    // ── Helpers ────────────────────────────────────────────────────
    const sf = (rows: any[], field: string): number =>
      rows.reduce((s: number, r: any) => s + (Number(r[field]) || 0), 0);

    /** Filtra CCPM por coincidencia exacta (case-insensitive) del campo tipoCredito */
    const filtrarTC = (...nombres: string[]): Ccpm[] => {
      const set = new Set(nombres.map(n => n.toUpperCase()));
      return ccpm.filter(r => set.has(String(r.tipoCredito ?? '').toUpperCase()));
    };

    const agregarPorVencer = (cat: string, rows: Ccpm[]): void => {
      filas.push({ concepto: 'DE 1 A 30 DIAS',       categoria: cat, valor: sf(rows, 'capitalPorVencer1a30') });
      filas.push({ concepto: 'DE 31 A 90 DIAS',       categoria: cat, valor: sf(rows, 'capitalPorVencer31a90') });
      filas.push({ concepto: 'DE 91 A 180 DIAS',      categoria: cat, valor: sf(rows, 'capitalPorVencer91a180') });
      filas.push({ concepto: 'DE 181 A 360 DIAS',     categoria: cat, valor: sf(rows, 'capitalPorVencer181a360') });
      filas.push({ concepto: 'DE MAS DE 360 DIAS',    categoria: cat, valor: sf(rows, 'capitalPorVencerMas360') });
    };

    const vencidoRango = (rows: Ccpm[], min: number, max: number | null): number =>
      rows
        .filter(r => r.diasMorosidad >= min && (max === null || r.diasMorosidad <= max) && (r.valorVencido ?? 0) > 0)
        .reduce((s, r) => s + (r.valorVencido ?? 0), 0);

    // ── Filtros por nombre exacto ──────────────────────────────────
    // Quirografarios: base + emergentes + express + sustituciones
    const quiro    = filtrarTC(
      'QUIROGRAFARIO',
      'QUIROGRAFARIO EXPRESS',
      'QUIROGRAFARIO SUSTITUCIÓN DE DEUDA BIESS',
      'QUIROGRAFARIO SUSTITUCIÓN DE DEUDA MERCADO FINANCIERO',
      'EMERGENTE',
    );
    const quiroNov = filtrarTC('QUIROGRAFARIO NOVACION');
    const quiroRee = filtrarTC('QUIROGRAFARIO RESTRUCTURADO', 'EMERGENTE RESTRUCTURADO');

    // Prendarios
    const prend    = filtrarTC('PRENDARIO');
    const prendRee = filtrarTC('PRENDARIO RESTRUCTURADO');
    const prendNov = filtrarTC('PRENDARIO NOVACION');

    // Hipotecarios
    const hipo     = filtrarTC('HIPOTECARIO');
    const hipoRee  = filtrarTC('HIPOTECARIO RESTRUCTURADO');
    const hipoNov  = filtrarTC('HIPOTECARIO NOVACION');

    // ── Quirografarios Por Vencer ──────────────────────────────────
    agregarPorVencer('PRESTAMOS QUIROGRAFARIOS POR VENCER', quiro);
    // ── Quirografarios Novación ────────────────────────────────────
    agregarPorVencer('PRESTAMOS QUIROGRAFARIOS NOVACION', quiroNov);
    // ── Quirografarios Reestructurados ─────────────────────────────
    agregarPorVencer('PRESTAMOS QUIROGRAFARIOS REESTRUCTURADOS', quiroRee);
    // ── Quirografarios Vencidos ────────────────────────────────────
    const catQV = 'PRESTAMOS QUIROGRAFARIOS VENCIDOS';
    const rowsQV = [...quiro, ...quiroRee];
    filas.push({ concepto: 'DE 1 A 30 DIAS',       categoria: catQV, valor: vencidoRango(rowsQV, 0, 30) });
    filas.push({ concepto: 'DE 31 A 90 DIAS',       categoria: catQV, valor: vencidoRango(rowsQV, 31, 90) });
    filas.push({ concepto: 'DE 91 A 180 DIAS',      categoria: catQV, valor: vencidoRango(rowsQV, 91, 180) });
    filas.push({ concepto: 'DE 181 A 270 DIAS',     categoria: catQV, valor: vencidoRango(rowsQV, 181, 270) });
    filas.push({ concepto: 'DE MAS DE 270 DIAS',    categoria: catQV, valor: vencidoRango(rowsQV, 271, null) });

    // ── Prendarios Por Vencer ──────────────────────────────────────
    agregarPorVencer('PRESTAMOS PRENDARIOS POR VENCER', prend);
    // ── Prendarios Reestructurados ─────────────────────────────────
    agregarPorVencer('PRESTAMOS PRENDARIOS REESTRUCTURADOS', prendRee);
    // ── Prendarios Novación ────────────────────────────────────────
    agregarPorVencer('PRESTAMOS PRENDARIOS NOVACION', prendNov);
    // ── Prendarios Vencidos ────────────────────────────────────────
    const catPV = 'PRESTAMOS PRENDARIOS VENCIDOS';
    const rowsPV = [...prend, ...prendRee];
    filas.push({ concepto: 'DE 1 A 30 DIAS',       categoria: catPV, valor: vencidoRango(rowsPV, 0, 30) });
    filas.push({ concepto: 'DE 31 A 90 DIAS',       categoria: catPV, valor: vencidoRango(rowsPV, 31, 90) });
    filas.push({ concepto: 'DE 91 A 180 DIAS',      categoria: catPV, valor: vencidoRango(rowsPV, 91, 180) });
    filas.push({ concepto: 'DE 181 A 360 DIAS',     categoria: catPV, valor: vencidoRango(rowsPV, 181, 360) });
    filas.push({ concepto: 'DE MAS DE 360 DIAS',    categoria: catPV, valor: vencidoRango(rowsPV, 361, null) });

    // ── Hipotecarios Por Vencer ────────────────────────────────────
    agregarPorVencer('PRESTAMOS HIPOTECARIOS POR VENCER', hipo);
    // ── Hipotecarios Reestructurados ───────────────────────────────
    agregarPorVencer('PRESTAMOS HIPOTECARIOS REESTRUCTURADOS', hipoRee);
    // ── Hipotecarios Novación ──────────────────────────────────────
    agregarPorVencer('PRESTAMOS HIPOTECARIOS NOVACION', hipoNov);
    // ── Hipotecarios Vencidos ──────────────────────────────────────
    const catHV = 'PRESTAMOS HIPOTECARIOS VENCIDOS';
    const rowsHV = [...hipo, ...hipoRee];
    filas.push({ concepto: 'DE 1 A 30 DIAS',       categoria: catHV, valor: vencidoRango(rowsHV, 0, 30) });
    filas.push({ concepto: 'DE 31 A 90 DIAS',       categoria: catHV, valor: vencidoRango(rowsHV, 31, 90) });
    filas.push({ concepto: 'DE 91 A 270 DIAS',      categoria: catHV, valor: vencidoRango(rowsHV, 91, 270) });
    filas.push({ concepto: 'DE 271 A 360 DIAS',     categoria: catHV, valor: vencidoRango(rowsHV, 271, 360) });
    filas.push({ concepto: 'DE 361 A 720 DIAS',     categoria: catHV, valor: vencidoRango(rowsHV, 361, 720) });
    filas.push({ concepto: 'DE MAS DE 720 DIAS',    categoria: catHV, valor: vencidoRango(rowsHV, 721, null) });

    // ── CXC Intereses (interesOrdinario + interesMora acumulados) ──────────────
    const catInt = 'CXC Interes Por Tabla de Amortizacion e Interes x Mora';
    const intQ = sf([...quiro, ...quiroNov, ...quiroRee], 'interesOrdinario') + sf([...quiro, ...quiroNov, ...quiroRee], 'interesMora');
    const intP = sf([...prend, ...prendRee, ...prendNov], 'interesOrdinario') + sf([...prend, ...prendRee, ...prendNov], 'interesMora');
    const intH = sf([...hipo,  ...hipoRee,  ...hipoNov],  'interesOrdinario') + sf([...hipo,  ...hipoRee,  ...hipoNov],  'interesMora');
    filas.push({ concepto: 'Intereses por préstamos quirografarios', categoria: catInt, valor: intQ });
    filas.push({ concepto: 'Intereses por préstamos prendarios',     categoria: catInt, valor: intP });
    filas.push({ concepto: 'Intereses por préstamos hipotecarios',   categoria: catInt, valor: intH });

    // ── Seguros ────────────────────────────────────────────────────
    const catSeg = 'Seguros';
    // Hipotecarios: valorIncendio de todos EXCEPTO prendarios y prendarios restructurados
    filas.push({ concepto: 'Seguro prestamos hipotecarios',                      categoria: catSeg, valor: sf([...quiro, ...quiroNov, ...quiroRee, ...hipo, ...hipoRee, ...hipoNov], 'valorIncendio') });
    // Prendarios: valorIncendio de prendarios y prendarios restructurados
    filas.push({ concepto: 'Seguro prestamos prendarios',                        categoria: catSeg, valor: sf([...prend, ...prendRee, ...prendNov], 'valorIncendio') });
    filas.push({ concepto: 'Seguro medico por cobrar',                           categoria: catSeg, valor: 0 });
    // Desgravamen: sumatoria de todos los préstamos
    filas.push({ concepto: 'Cuenta por Cobrar Seguro de Desgravamen Participes', categoria: catSeg,
      valor: sf([...quiro, ...quiroNov, ...quiroRee, ...prend, ...prendRee, ...prendNov, ...hipo, ...hipoRee, ...hipoNov], 'valorDesgravamen') });

    // ── Provisiones Requeridas ─────────────────────────────────────
    const catPR = 'PROVISIONES INVERSIONES PRIVATIVAS';
    filas.push({ concepto: 'Por prestamos quirografarios', categoria: catPR, valor: sf([...quiro, ...quiroNov, ...quiroRee], 'provisionRequeridaOriginal') });
    filas.push({ concepto: 'Por prestamos prendarios',     categoria: catPR, valor: sf([...prend, ...prendRee, ...prendNov], 'provisionRequeridaOriginal') });
    filas.push({ concepto: 'Por prestamos hipotecarios',   categoria: catPR, valor: sf([...hipo,  ...hipoRee,  ...hipoNov],  'provisionRequeridaOriginal') });

    // ── INGRESOS POR INVERSIONES PRIVATIVAS (interesOrdinarioDelMes + interesMoraDelMes) ────
    const catPIP = 'INGRESOS POR INVERSIONES PRIVATIVAS';
    filas.push({ concepto: 'Quirografarios', categoria: catPIP, valor: sf([...quiro, ...quiroNov, ...quiroRee], 'interesOrdinarioDelMes') + sf([...quiro, ...quiroNov, ...quiroRee], 'interesMoraDelMes') });
    filas.push({ concepto: 'Prendarios',     categoria: catPIP, valor: sf([...prend, ...prendRee, ...prendNov], 'interesOrdinarioDelMes') + sf([...prend, ...prendRee, ...prendNov], 'interesMoraDelMes') });
    filas.push({ concepto: 'Hipotecarios',   categoria: catPIP, valor: sf([...hipo,  ...hipoRee,  ...hipoNov],  'interesOrdinarioDelMes') + sf([...hipo,  ...hipoRee,  ...hipoNov],  'interesMoraDelMes') });

    // ── Aportes de CPRM agrupados dinámicamente por tipoAporte.nombre ─
    const aportePorTipo = new Map<string, number>();
    for (const r of cprm) {
      const nombre = r.tipoAporte?.nombre ?? '(Sin tipo)';
      aportePorTipo.set(nombre, (aportePorTipo.get(nombre) ?? 0) + (r.total ?? 0));
    }
    const excluirAportes = new Set(['Pensiones Complementarias por Pagar']);
    for (const [nombre, valor] of aportePorTipo.entries()) {
      if (excluirAportes.has(nombre)) continue;
      filas.push({ concepto: nombre, categoria: 'Aportes (por tipo)', valor });
    }

    this.resumenFinanciero.set(filas);
  }

  exportarResumenCSV(): void {
    const grupos = this.resumenGrupos();
    if (!grupos.length) return;

    const flatRows: Record<string, string>[] = [];
    for (const grupo of grupos) {
      for (const fila of grupo.filas) {
        flatRows.push({
          categoria: grupo.categoria,
          concepto:  fila.concepto,
          valor:     fila.valor.toFixed(2),
        });
      }
      flatRows.push({ categoria: '', concepto: 'SUBTOTAL', valor: grupo.total.toFixed(2) });
    }

    const mes  = String(this.mesSeleccionado()).padStart(2, '0');
    const anio = this.anioSeleccionado();
    this.exportService.exportToCSV(
      flatRows,
      `ResumenFinanciero_${anio}${mes}`,
      ['Categoría', 'Concepto', 'Valor'],
      ['categoria', 'concepto', 'valor'],
    );
  }

  exportarResumenPDF(): void {
    const grupos = this.resumenGrupos();
    if (!grupos.length) return;

    this.abrirVentanaPDF(grupos);
  }

  private abrirVentanaPDF(grupos: any[]): void {
    const mes  = String(this.mesSeleccionado()).padStart(2, '0');
    const anio = this.anioSeleccionado();
    const titulo = `Resumen Financiero — ${this.mesNombre()} ${anio}`;
    const d = new Date();
    const fecha = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;

    const fmt = (n: number): string =>
      n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const logoHtml = '<img src="' + LOGO_ASOPREP_BASE64 + '" alt="Logo ASOPREP">';

    let filasTbody = '';
    for (const grupo of grupos) {
      filasTbody += `
        <tr class="fila-grupo">
          <td colspan="2">${grupo.categoria}</td>
        </tr>`;
      for (const fila of grupo.filas) {
        const esCero = fila.valor === 0;
        filasTbody += `
        <tr class="fila-detalle">
          <td class="col-concepto">${fila.concepto}</td>
          <td class="col-valor${esCero ? ' val-cero' : ''}">${fmt(fila.valor)}</td>
        </tr>`;
      }
      filasTbody += `
        <tr class="fila-subtotal">
          <td class="subtotal-label">SUBTOTAL</td>
          <td class="subtotal-val">${fmt(grupo.total)}</td>
        </tr>`;
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #333; }

    /* ── Cabecera ── */
    .doc-header {
      display: flex;
      align-items: center;
      gap: 20px;
      background: linear-gradient(135deg, #0d47a1 0%, #1976d2 60%, #42a5f5 100%);
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 22px;
      color: #fff;
    }
    .doc-header img {
      height: 64px;
      width: auto;
      border-radius: 6px;
      background: #fff;
      padding: 4px;
      flex-shrink: 0;
    }
    .doc-header-text { flex: 1; }
    .doc-empresa {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 4px;
    }
    .doc-title {
      font-size: 17px;
      font-weight: bold;
      margin-bottom: 4px;
      line-height: 1.2;
    }
    .doc-fecha { font-size: 11px; opacity: 0.8; }
    .doc-badge {
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.35);
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    table { width: 100%; border-collapse: collapse; }
    thead tr {
      background: #1976d2;
      color: #fff;
    }
    thead th {
      padding: 8px 14px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
    }
    thead th.col-valor { text-align: right; padding-right: 20px; }
    .fila-grupo td {
      background: #e3f2fd;
      color: #0d47a1;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.4px;
      padding: 5px 14px;
      text-transform: uppercase;
      border-top: 2px solid #90caf9;
    }
    .fila-detalle td {
      padding: 4px 14px;
      border-bottom: 1px solid #f0f0f0;
      color: #333;
    }
    .fila-detalle .col-valor {
      text-align: right;
      padding-right: 20px;
      font-family: monospace;
    }
    .fila-detalle .val-cero { color: #bbb; }
    .fila-subtotal td {
      padding: 4px 14px;
      background: #fffde7;
      border-top: 1px solid #f9a825;
      border-bottom: 2px solid #f9a825;
    }
    .subtotal-label {
      font-weight: 600;
      font-size: 10px;
      color: #e65100;
      text-transform: uppercase;
    }
    .subtotal-val {
      font-weight: 700;
      font-family: monospace;
      color: #e65100;
      text-align: right;
      padding-right: 20px;
    }
    @media print {
      body { margin: 10px; }
      @page { margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="doc-header">
    ${logoHtml}
    <div class="doc-header-text">
      <div class="doc-empresa">ASOPREP</div>
      <div class="doc-title">${titulo}</div>
      <div class="doc-fecha">Generado el: ${fecha}</div>
    </div>
    <div class="doc-badge">${this.mesNombre()} ${anio}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th class="col-concepto">Concepto</th>
        <th class="col-valor">Valor</th>
      </tr>
    </thead>
    <tbody>
      ${filasTbody}
    </tbody>
  </table>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => setTimeout(() => printWindow.print(), 200);
    }
  }

  exportarCSV(tipo: ReporteTipo): void {
    const rows = this.registros();
    if (!rows.length) return;

    const cols = tipo === 'CPRM' ? this.colsCPRM :
                 tipo === 'CJBM' ? this.colsCJBM : this.colsCCPM;

    const headers  = cols.map(c => c.header);
    const dataKeys = cols.map(c => c.campo);

    // Pre-procesar las filas para aplanar sub-objetos y formatear valores
    const flatRows = rows.map(row => {
      const flat: Record<string, string> = {};
      cols.forEach(col => {
        flat[col.campo] = this.getCellValue(row, col);
      });
      return flat;
    });

    const mes  = String(this.mesSeleccionado()).padStart(2, '0');
    const anio = this.anioSeleccionado();
    const prefijo = tipo === 'CCPM' ? 'prestamos' : tipo === 'CPRM' ? 'participes' : tipo === 'CJBM' ? 'jubilados' : tipo;
    this.exportService.exportToCSV(flatRows, `${prefijo}_${mes}${anio}`, headers, dataKeys);
  }

  /** Carga y descarga CSV directamente desde la tarjeta, sin necesidad de abrir la tabla */
  descargarCSV(tipo: ReporteTipo): void {
    const ejcc = this.ejecucion();
    if (!ejcc) return;

    const cols = tipo === 'CPRM' ? this.colsCPRM :
                 tipo === 'CJBM' ? this.colsCJBM : this.colsCCPM;

    const criterios = this.buildCriterio(ejcc.codigo!);

    const obs$: Observable<Cprm[] | Cjbm[] | Ccpm[] | null> =
      tipo === 'CPRM' ? this.cprmService.selectByCriteria(criterios) :
      tipo === 'CJBM' ? this.cjbmService.selectByCriteria(criterios) :
                        this.ccpmService.selectByCriteria(criterios);

    obs$.subscribe({
      next: (data: Cprm[] | Cjbm[] | Ccpm[] | null) => {
        const rows = data ?? [];
        if (!rows.length) return;

        const headers  = cols.map(c => c.header);
        const dataKeys = cols.map(c => c.campo);
        const flatRows = rows.map(row => {
          const flat: Record<string, string> = {};
          cols.forEach(col => { flat[col.campo] = this.getCellValue(row, col); });
          return flat;
        });

        const mes  = String(this.mesSeleccionado()).padStart(2, '0');
        const anio = this.anioSeleccionado();
        const prefijo = tipo === 'CCPM' ? 'prestamos' : tipo === 'CPRM' ? 'participes' : tipo === 'CJBM' ? 'jubilados' : tipo;
        this.exportService.exportToCSV(flatRows, `${prefijo}_${mes}${anio}`, headers, dataKeys);
      },
    });
  }

  private actualizarResumen(tipo: ReporteTipo, cantidad: number): void {
    this.resumenes.update(lista =>
      lista.map(r => r.tipo === tipo ? { ...r, cantidad } : r)
    );
  }

  private limpiarEstado(): void {
    this.ejecucion.set(null);
    this.errorMsg.set('');
    this.mensajeInfo.set('');
    this.reporteSel.set(null);
    this.registros.set([]);
    this.columnasDef.set([]);
    this.errorRegistros.set('');
    this.resumenes.update(r => r.map(x => ({ ...x, cantidad: null })));
    this.resumenFinanciero.set([]);
  }

  private formatFecha(v: any): string {
    if (!v) return '';
    if (Array.isArray(v) && v.length >= 3) {
      const [y, m, d] = v;
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
    if (typeof v === 'string' && v.includes('-')) {
      const parts = v.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return String(v);
  }
}
