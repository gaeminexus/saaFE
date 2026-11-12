import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { LOGO_ASOPREP_BASE64 } from './logo-asoprep.const';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import { ExportService } from '../../../../shared/services/export.service';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import { EjccService, EjecutarReporteCarteraRequest } from '../../service/ejcc.service';
import { CprmService } from '../../service/cprm.service';
import { CjbmService } from '../../service/cjbm.service';
import { CcpmService } from '../../service/ccpm.service';
import { Ejcc } from '../../model/ejcc';
import { Cprm } from '../../model/cprm';
import { Cjbm } from '../../model/cjbm';
import { Ccpm } from '../../model/ccpm';
import { LineaResumenFinanciero, ResumenFinancieroCartera } from '../../model/resumen-financiero';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

type ReporteTipo = 'CPRM' | 'CJBM' | 'CCPM';

/** C27-E: grupo del Resumen Financiero; el total sale de la línea de total del backend o de la suma de líneas. */
interface ResumenGrupo {
  categoria: string;
  filas:     LineaResumenFinanciero[];
  /** Línea de total del grupo (backend) o suma de las líneas redondeadas */
  total:     LineaResumenFinanciero;
}

/** Redondeo a 2 decimales (cada línea ya viene redondeada del backend). */
const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

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

  resumenFinanciero = signal<LineaResumenFinanciero[]>([]);
  /** C27-E: cabecera del resumen (fechas de generación y de cierre, aviso de desactualizada) */
  resumenCabecera   = signal<ResumenFinancieroCartera | null>(null);
  cargandoResumen   = signal<boolean>(false);

  /** C27-E: líneas comparables con diferencia distinta de cero */
  lineasConDiferencia = computed<number>(() =>
    this.resumenFinanciero().filter(l => l.comparable && Math.abs(l.diferencia ?? 0) >= 0.005).length
  );

  resumenGrupos = computed<ResumenGrupo[]>(() => {
    const filas = this.resumenFinanciero();
    const grupos = new Map<string, { filas: LineaResumenFinanciero[]; total: LineaResumenFinanciero | null }>();
    for (const f of filas) {
      const key = f.grupo;
      if (!grupos.has(key)) grupos.set(key, { filas: [], total: null });
      const g = grupos.get(key)!;
      if (f.total) {
        g.total = f;
      } else {
        g.filas.push(f);
      }
    }
    const resultado: ResumenGrupo[] = [];
    for (const [categoria, g] of grupos.entries()) {
      let total = g.total;
      if (!total) {
        // Sin línea de total del backend: suma de las líneas (ya redondeadas), comparando solo si todas comparan.
        const comparables = g.filas.length > 0 && g.filas.every(l => l.comparable);
        const informe = r2(g.filas.reduce((s, l) => s + (l.valorInforme ?? 0), 0));
        const contable = comparables ? r2(g.filas.reduce((s, l) => s + (l.saldoContable ?? 0), 0)) : null;
        total = {
          grupo: categoria, concepto: 'SUBTOTAL', cuenta: null, valorInforme: informe, saldoContable: contable,
          diferencia: contable !== null ? r2(informe - contable) : null, comparable: comparables,
          registros: null, nota: null, total: true,
        };
      }
      resultado.push({ categoria, filas: g.filas, total });
    }
    return resultado;
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
    { campo: 'razonSocial',                header: 'Partícipe' },
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
    { campo: 'fechaVencimiento',         header: 'Fec. Vencim.',     esFecha: true },
    { campo: 'montoSolicitado',          header: 'Monto Solicitado', esNumero: true },
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
        this.errorMsg.set('Error al consultar: ' + mensajeDeError(err));
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
        this.errorMsg.set('Error al generar: ' + mensajeDeError(err));
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
        this.errorMsg.set('Error al eliminar la ejecución: ' + mensajeDeError(err));
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
        this.errorRegistros.set('Error al cargar: ' + mensajeDeError(err));
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

    forkJoin({
      cprm: this.cprmService.selectByCriteria(criterios),
      cjbm: this.cjbmService.selectByCriteria(criterios),
      ccpm: this.ccpmService.selectByCriteria(criterios),
    }).subscribe({
      next: ({ cprm, cjbm, ccpm }) => {
        this.actualizarResumen('CPRM', (cprm ?? []).length);
        this.actualizarResumen('CJBM', (cjbm ?? []).length);
        this.actualizarResumen('CCPM', (ccpm ?? []).length);
      },
      error: (err) => {
        console.error('[ResumenFinanciero] Error en forkJoin:', err);
        this.actualizarResumen('CPRM', 0);
        this.actualizarResumen('CJBM', 0);
        this.actualizarResumen('CCPM', 0);
      },
    });
    this.cargarResumenFinanciero(ejccCodigo);
  }

  /**
   * C27-E: el Resumen Financiero lo arma el backend (GET /ejcc/resumenFinanciero/{codigo}) con cada
   * linea junto al saldo contable de su cuenta y la diferencia. Antes se armaba aqui sumando campos del
   * CCPM por NOMBRE de producto, con el vencido de cada prestamo en la banda de sus dias maximos, el
   * interes de la cuota del mes como "por cobrar" y sin redondear las lineas (diagnostico de junio 2025).
   */
  private cargarResumenFinanciero(ejccCodigo: number): void {
    this.cargandoResumen.set(true);
    this.ejccService.resumenFinanciero(ejccCodigo).subscribe({
      next: (resumen) => {
        this.cargandoResumen.set(false);
        this.resumenCabecera.set(resumen);
        this.resumenFinanciero.set(resumen?.lineas ?? []);
      },
      error: (err: any) => {
        this.cargandoResumen.set(false);
        this.resumenCabecera.set(null);
        this.resumenFinanciero.set([]);
        this.errorMsg.set("Error al armar el resumen financiero: " + mensajeDeError(err));
      },
    });
  }

  exportarResumenCSV(): void {
    const grupos = this.resumenGrupos();
    if (!grupos.length) return;

    const n = (v: number | null): string => (v === null || v === undefined ? '' : v.toFixed(2));
    const flatRows: Record<string, string>[] = [];
    const agregar = (categoria: string, fila: LineaResumenFinanciero): void => {
      flatRows.push({
        categoria,
        concepto:   fila.concepto,
        cuenta:     fila.cuenta ?? '',
        informe:    n(fila.valorInforme),
        contable:   n(fila.saldoContable),
        diferencia: fila.comparable ? n(fila.diferencia) : '',
        nota:       fila.nota ?? '',
      });
    };
    for (const grupo of grupos) {
      for (const fila of grupo.filas) {
        agregar(grupo.categoria, fila);
      }
      agregar('', grupo.total);
    }

    const mes  = String(this.mesSeleccionado()).padStart(2, '0');
    const anio = this.anioSeleccionado();
    this.exportService.exportToCSV(
      flatRows,
      `ResumenFinanciero_${anio}${mes}`,
      ['Categoría', 'Concepto', 'Cuenta', 'Informe', 'Contabilidad', 'Diferencia', 'Nota'],
      ['categoria', 'concepto', 'cuenta', 'informe', 'contable', 'diferencia', 'nota'],
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

    const fmt = (n: number | null): string =>
      n === null || n === undefined ? ''
        : n.toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const logoHtml = '<img src="' + LOGO_ASOPREP_BASE64 + '" alt="Logo ASOPREP">';
    const cabecera = this.resumenCabecera();
    const avisoHtml = cabecera?.desactualizada && cabecera.aviso
      ? `<div style="background:#fff3e0;border:1px solid #fb8c00;padding:8px 12px;margin-bottom:12px;border-radius:6px">${cabecera.aviso}</div>`
      : '';

    const celdas = (fila: LineaResumenFinanciero): string => {
      const dif = fila.comparable ? fila.diferencia : null;
      const marca = dif !== null && Math.abs(dif) >= 0.005 ? ' style="color:#c62828;font-weight:700"' : '';
      return `<td class="col-cuenta">${fila.cuenta ?? ''}</td>
          <td class="col-valor">${fmt(fila.valorInforme)}</td>
          <td class="col-valor">${fmt(fila.saldoContable)}</td>
          <td class="col-valor"${marca}>${fmt(dif)}</td>`;
    };

    let filasTbody = '';
    for (const grupo of grupos) {
      filasTbody += `
        <tr class="fila-grupo">
          <td colspan="5">${grupo.categoria}</td>
        </tr>`;
      for (const fila of grupo.filas) {
        filasTbody += `
        <tr class="fila-detalle">
          <td class="col-concepto">${fila.concepto}</td>
          ${celdas(fila)}
        </tr>`;
      }
      filasTbody += `
        <tr class="fila-subtotal">
          <td class="subtotal-label">${grupo.total.concepto}</td>
          ${celdas(grupo.total)}
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
  ${avisoHtml}
  <table>
    <thead>
      <tr>
        <th class="col-concepto">Concepto</th>
        <th>Cuenta</th>
        <th class="col-valor">Informe</th>
        <th class="col-valor">Contabilidad</th>
        <th class="col-valor">Diferencia</th>
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
    this.resumenCabecera.set(null);
  }

  /** C27-E: fecha con hora (LocalDateTime como texto ISO o arreglo [a,m,d,h,mi,...]). */
  formatFechaHora(v: any): string {
    if (!v) return '';
    if (Array.isArray(v) && v.length >= 3) {
      const [y, m, d, h, mi] = v;
      const hora = h !== undefined ? ` ${String(h).padStart(2, '0')}:${String(mi ?? 0).padStart(2, '0')}` : '';
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}${hora}`;
    }
    if (typeof v === 'string') {
      const [fecha, hora] = v.split('T');
      return this.formatFecha(fecha) + (hora ? ' ' + hora.substring(0, 5) : '');
    }
    return String(v);
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
