import { CommonModule } from '@angular/common';
import { Component, OnInit, signal, computed } from '@angular/core';
import { Observable } from 'rxjs';
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
    this.cprmService.selectByCriteria(criterios).subscribe({
      next:  (data) => this.actualizarResumen('CPRM', data?.length ?? 0),
      error: ()     => this.actualizarResumen('CPRM', 0),
    });
    this.cjbmService.selectByCriteria(criterios).subscribe({
      next:  (data) => this.actualizarResumen('CJBM', data?.length ?? 0),
      error: ()     => this.actualizarResumen('CJBM', 0),
    });
    this.ccpmService.selectByCriteria(criterios).subscribe({
      next:  (data) => this.actualizarResumen('CCPM', data?.length ?? 0),
      error: ()     => this.actualizarResumen('CCPM', 0),
    });
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
    this.exportService.exportToCSV(flatRows, `${tipo}_${anio}${mes}`, headers, dataKeys);
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
        this.exportService.exportToCSV(flatRows, `${tipo}_${anio}${mes}`, headers, dataKeys);
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
