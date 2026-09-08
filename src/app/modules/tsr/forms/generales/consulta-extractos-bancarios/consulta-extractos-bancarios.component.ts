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
import { fechaCsv } from '../../../../../shared/utils/fecha-csv.util';
import { textoDeError } from '../texto-error';

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
    // `cargarExtractos()` ya no filtra en memoria sobre un `getAll()` cacheado: el período
    // seleccionado viaja en la propia consulta al servidor. Antes daba igual el orden porque
    // ambas llamadas terminaban recalculando sobre el mismo arreglo completo ya en memoria; ahora
    // hay que esperar a que `cargarPeriodos()` resuelva el default (mes anterior) antes de pedir
    // los extractos, o la primera consulta saldría con "todos los períodos" por un instante y
    // traería la tabla entera sin necesidad.
    this.cargarPeriodos();
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
        this.cargarExtractos();
      },
      error: () => {
        this.periodos = [];
        this.isLoadingPeriodos = false;
        this.cargarExtractos();
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

  /**
   * `POST .../selectByCriteria` sobre `TSR.EXBC` (ítem 2.3 del lote 2 — antes `getAll()` pelado
   * con filtro de período y texto libre en memoria). Campos reales confirmados leyendo la
   * entidad `ExtractoBancario` en saaBE: `periodo` (relación), `cuentaBancaria.banco.nombre` y
   * `cuentaBancaria.numeroCuenta` (dos y un salto respectivamente), `archivoNombre` y
   * `usuarioCreacion` (directos).
   *
   * ⚠️ El LIKE genérico no envuelve la columna en `UPPER()` — se manda el texto en mayúsculas,
   * misma convención que el resto del sistema para este mecanismo.
   */
  cargarExtractos(): void {
    this.isLoading = true;
    const criterios: DatosBusqueda[] = [];

    if (this.periodoSeleccionado !== TODOS_LOS_PERIODOS) {
      const dbPeriodo = new DatosBusqueda();
      dbPeriodo.asignaValorConCampoPadre(TipoDatos.LONG, 'periodo', 'codigo', String(this.periodoSeleccionado), TipoComandosBusqueda.IGUAL);
      criterios.push(dbPeriodo);
    }

    const texto = this.filtroTexto.trim().toUpperCase();
    if (texto) {
      const dbOpen = new DatosBusqueda();
      dbOpen.usaParentesis(TipoComandosBusqueda.ABRE_PARENTESIS);
      criterios.push(dbOpen);

      const dbBanco = new DatosBusqueda();
      dbBanco.asignaValorConCampoPadre(TipoDatos.STRING, 'cuentaBancaria.banco', 'nombre', texto, TipoComandosBusqueda.LIKE);
      criterios.push(dbBanco);

      const dbCuenta = new DatosBusqueda();
      dbCuenta.asignaValorConCampoPadre(TipoDatos.STRING, 'cuentaBancaria', 'numeroCuenta', texto, TipoComandosBusqueda.LIKE);
      dbCuenta.setTipoOperadorLogico(TipoComandosBusqueda.OR);
      criterios.push(dbCuenta);

      const dbArchivo = new DatosBusqueda();
      dbArchivo.asignaUnCampoSinTrunc(TipoDatos.STRING, 'archivoNombre', texto, TipoComandosBusqueda.LIKE);
      dbArchivo.setTipoOperadorLogico(TipoComandosBusqueda.OR);
      criterios.push(dbArchivo);

      const dbUsuario = new DatosBusqueda();
      dbUsuario.asignaUnCampoSinTrunc(TipoDatos.STRING, 'usuarioCreacion', texto, TipoComandosBusqueda.LIKE);
      dbUsuario.setTipoOperadorLogico(TipoComandosBusqueda.OR);
      criterios.push(dbUsuario);

      const dbClose = new DatosBusqueda();
      dbClose.usaParentesis(TipoComandosBusqueda.CIERRA_PARENTESIS);
      criterios.push(dbClose);
    }

    this.extractoBancarioService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.extractos = Array.isArray(data) ? data : [];
        this.extractosFiltrados = this.extractos;
        this.isLoading = false;
      },
      error: () => {
        this.extractos = [];
        this.extractosFiltrados = [];
        this.isLoading = false;
      },
    });
  }

  /**
   * El texto ya no filtra en memoria en cada tecla (`(ngModelChange)` disparaba `aplicarFiltro()`
   * al instante) — ahora es una consulta al servidor, y repetirla en cada tecla lo martillaría
   * sin necesidad. El template pasa a disparar `buscar()` con Enter o con el botón, no con cada
   * tecla; ver el reporte del lote 2 (cambio de comportamiento explícito, ítem 2.3).
   */
  buscar(): void {
    this.cargarExtractos();
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
        this.snackBar.open(`Error al descargar el extracto: ${textoDeError(error)}`, 'Cerrar', {
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

  /**
   * Exporta el LISTADO de extractos que se está viendo (con período y texto ya aplicados) — no
   * confundir con `descargarCSV()`, que exporta los movimientos DENTRO de un extracto elegido.
   * Ítem 3.3 del lote 3: esta pantalla solo tenía la exportación de detalle, no la del listado.
   */
  exportarListadoCSV(): void {
    if (!this.extractosFiltrados.length) {
      this.snackBar.open('No hay extractos para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const plano = this.extractosFiltrados.map((e) => ({
      banco: e.cuentaBancaria?.banco?.nombre ?? '',
      cuenta: e.cuentaBancaria?.numeroCuenta ?? '',
      periodo: e.periodo?.nombre ?? '',
      saldoInicial: Number(e.saldoInicial || 0),
      saldoFinal: Number(e.saldoFinal || 0),
      estado: this.obtenerEstadoInfo(e.estadoCarga).texto,
      archivo: e.archivoNombre ?? '',
      usuario: e.usuarioCreacion ?? '',
      fechaCreacion: fechaCsv(this.funcionesDatosService.convertirFechaDesdeBackend(e.fechaCreacion)),
    }));

    const headers = ['Banco', 'Cuenta', 'Período', 'Saldo inicial', 'Saldo final', 'Estado', 'Archivo', 'Usuario', 'Fecha de carga'];
    const keys = ['banco', 'cuenta', 'periodo', 'saldoInicial', 'saldoFinal', 'estado', 'archivo', 'usuario', 'fechaCreacion'];
    this.exportService.exportToCSV(plano, `extractos_bancarios_${fechaCsv(new Date())}`, headers, keys);
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
