import { Component, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { ExportService } from '../../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Periodo } from '../../../../cnt/model/periodo';
import { PeriodoService } from '../../../../cnt/service/periodo.service';
import { DetalleExtractoBancario } from '../../../model/detalle-extracto-bancario';
import { EstadoCargaExtracto, ExtractoBancario } from '../../../model/extracto-bancario';
import { DetalleExtractoBancarioService } from '../../../service/detalle-extracto-bancario.service';
import { ExtractoBancarioService } from '../../../service/extracto-bancario.service';

const TODOS_LOS_PERIODOS = -1;

@Component({
  selector: 'app-consulta-extractos-bancarios',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './consulta-extractos-bancarios.component.html',
  styleUrl: './consulta-extractos-bancarios.component.scss',
})
export class ConsultaExtractosBancariosComponent implements OnInit {
  extractos: ExtractoBancario[] = [];
  extractosFiltrados: ExtractoBancario[] = [];
  filtroTexto: string = '';

  periodos: Periodo[] = [];
  periodoSeleccionado: number = TODOS_LOS_PERIODOS;
  readonly TODOS_LOS_PERIODOS = TODOS_LOS_PERIODOS;

  isLoading: boolean = false;
  isLoadingPeriodos: boolean = false;
  codigoDescargando: number | null = null;

  displayedColumns: string[] = [
    'banco',
    'cuenta',
    'periodo',
    'saldoInicial',
    'saldoFinal',
    'estadoCarga',
    'archivoNombre',
    'usuarioCreacion',
    'fechaCreacion',
    'acciones',
  ];

  constructor(
    private extractoBancarioService: ExtractoBancarioService,
    private detalleExtractoBancarioService: DetalleExtractoBancarioService,
    private periodoService: PeriodoService,
    private router: Router,
    private funcionesDatosService: FuncionesDatosService,
    private exportService: ExportService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargarPeriodos();
    this.cargarExtractos();
  }

  cargarPeriodos(): void {
    this.isLoadingPeriodos = true;
    this.periodoService.getAll().subscribe({
      next: (periodos) => {
        this.periodos = (Array.isArray(periodos) ? periodos : []).sort(
          (a, b) => b.anio - a.anio || b.mes - a.mes
        );
        // Por defecto se abre en el mes ANTERIOR al actual, no en "todos" ni
        // en el mes en curso - el banco recien publica el extracto de un mes
        // despues de que cierra, asi que el uso real de esta pantalla casi
        // siempre es conciliar el mes pasado, no explorar el historial ni
        // revisar el mes en curso (que normalmente aun no tiene extracto).
        this.periodoSeleccionado = this.obtenerCodigoPeriodoAnterior() ?? this.periodos[0]?.codigo ?? TODOS_LOS_PERIODOS;
        this.isLoadingPeriodos = false;
        this.aplicarFiltro();
      },
      error: () => {
        this.periodos = [];
        this.isLoadingPeriodos = false;
      },
    });
  }

  private obtenerCodigoPeriodoAnterior(): number | null {
    const hoy = new Date();
    // getMonth() es 0-based (enero=0), lo que numericamente ya coincide con
    // el mes anterior en base 1 (ej. julio=7 en PRDOMSSS -> getMonth()=6=junio).
    let mesAnterior = hoy.getMonth();
    let anioAnterior = hoy.getFullYear();
    if (mesAnterior === 0) {
      mesAnterior = 12;
      anioAnterior -= 1;
    }
    const periodoAnterior = this.periodos.find((p) => p.mes === mesAnterior && p.anio === anioAnterior);
    return periodoAnterior ? periodoAnterior.codigo : null;
  }

  cargarExtractos(): void {
    this.isLoading = true;
    this.extractoBancarioService.getAll().subscribe({
      next: (data) => {
        this.extractos = Array.isArray(data) ? data : [];
        this.aplicarFiltro();
        this.isLoading = false;
      },
      error: () => {
        this.extractos = [];
        this.extractosFiltrados = [];
        this.isLoading = false;
      },
    });
  }

  aplicarFiltro(): void {
    const texto = this.filtroTexto.trim().toLowerCase();
    this.extractosFiltrados = this.extractos.filter((e) => {
      const coincidePeriodo =
        this.periodoSeleccionado === TODOS_LOS_PERIODOS || e.periodo?.codigo === this.periodoSeleccionado;
      if (!coincidePeriodo) {
        return false;
      }
      if (!texto) {
        return true;
      }
      const base = `${e.cuentaBancaria?.banco?.nombre ?? ''} ${e.cuentaBancaria?.numeroCuenta ?? ''} ${
        e.archivoNombre ?? ''
      } ${e.usuarioCreacion ?? ''}`.toLowerCase();
      return base.includes(texto);
    });
  }

  verDetalle(extracto: ExtractoBancario): void {
    this.router.navigate(['/menutesoreria/procesos/extractos-bancarios/detalle'], {
      queryParams: { idExtracto: extracto.codigo },
    });
  }

  /**
   * Descarga las transacciones (DEXB) de un extracto ya cargado como CSV -
   * reparsea desde la BD, no desde el archivo origen del banco.
   */
  descargarCSV(extracto: ExtractoBancario): void {
    this.codigoDescargando = extracto.codigo;
    const criterios: DatosBusqueda[] = [];
    const dbExtracto = new DatosBusqueda();
    dbExtracto.asignaValorConCampoPadre(
      TipoDatos.LONG,
      'extractoBancario',
      'codigo',
      extracto.codigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbExtracto);

    this.detalleExtractoBancarioService.selectByCriteria(criterios).subscribe({
      next: (detalles) => {
        this.codigoDescargando = null;
        const lista = Array.isArray(detalles) ? [...detalles].sort((a, b) => a.numeroFila - b.numeroFila) : [];
        if (lista.length === 0) {
          this.snackBar.open('Este extracto no tiene movimientos para descargar', 'Cerrar', { duration: 4000 });
          return;
        }
        this.exportarDetalles(extracto, lista);
      },
      error: (error) => {
        this.codigoDescargando = null;
        this.snackBar.open(`Error al descargar el extracto: ${error?.error || error?.message || error}`, 'Cerrar', {
          duration: 6000,
        });
      },
    });
  }

  private exportarDetalles(extracto: ExtractoBancario, detalles: DetalleExtractoBancario[]): void {
    const filas = detalles.map((d) => ({
      fecha: this.formatearSoloFecha(d.fechaTransaccion),
      descripcion: d.descripcion,
      referencia: d.referencia,
      debito: d.debito ?? 0,
      credito: d.credito ?? 0,
      saldo: d.saldo,
    }));

    const banco = extracto.cuentaBancaria?.banco?.nombre ?? 'Banco';
    const cuenta = extracto.cuentaBancaria?.numeroCuenta ?? '';
    const periodo = extracto.periodo?.nombre ?? '';
    const nombreArchivo = `Extracto_${banco}_${cuenta}_${periodo}`.replace(/[^a-zA-Z0-9_-]+/g, '_');

    this.exportService.exportToCSV(
      filas,
      nombreArchivo,
      ['Fecha', 'Descripción', 'Referencia', 'Débito', 'Crédito', 'Saldo'],
      ['fecha', 'descripcion', 'referencia', 'debito', 'credito', 'saldo']
    );
  }

  formatearSoloFecha(fecha: any): string {
    return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  formatearFechaHora(fecha: any): string {
    return this.funcionesDatosService.formatoFecha(fecha, FuncionesDatosService.FECHA_HORA);
  }

  obtenerEstadoInfo(estadoCarga: number): { texto: string; clase: string } {
    switch (estadoCarga) {
      case EstadoCargaExtracto.CARGADO:
        return { texto: 'Cargado', clase: 'estado-cargado' };
      case EstadoCargaExtracto.VALIDADO:
        return { texto: 'Validado', clase: 'estado-validado' };
      case EstadoCargaExtracto.APLICADO:
        return { texto: 'Aplicado', clase: 'estado-aplicado' };
      case EstadoCargaExtracto.ERROR:
        return { texto: 'Error', clase: 'estado-error' };
      default:
        return { texto: 'N/A', clase: 'estado-desconocido' };
    }
  }
}
