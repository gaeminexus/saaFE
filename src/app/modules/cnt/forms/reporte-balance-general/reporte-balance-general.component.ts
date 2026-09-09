import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { AppStateService } from '../../../../shared/services/app-state.service';
import { TemporalReporte } from '../../model/temporal-reporte';
import { ReporteContable } from '../../model/reporte-contable';
import { ReporteBalanceService } from '../../service/reporte-balance.service';
import { ReporteContableService } from '../../service/reporte-contable.service';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../shared/services/funciones-datos.service';
import { ExportService } from '../../../../shared/services/export.service';
import { JasperReportesService } from '../../../../shared/services/jasper-reportes.service';
import { guardarArchivo, mensajeReporteFallido } from '../../../../shared/services/descarga-reporte';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { ReportesContables } from '../descarga-reporte';

@Component({
  selector: 'cnt-reporte-balance-general',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './reporte-balance-general.component.html',
  styleUrls: ['./reporte-balance-general.component.scss'],
})
export class ReporteBalanceGeneralComponent implements OnInit, OnDestroy {

  // ── Services ────────────────────────────────────────────────
  private fb                    = inject(FormBuilder);
  private snackBar              = inject(MatSnackBar);
  private balanceService        = inject(ReporteBalanceService);
  private reporteContableService = inject(ReporteContableService);
  private appState              = inject(AppStateService);
  private funcionesDatos        = inject(FuncionesDatosService);
  private exportService         = inject(ExportService);
  private jasperService         = inject(JasperReportesService);

  // ── Catálogos ────────────────────────────────────────────────
  reportes = signal<ReporteContable[]>([]);

  // ── Estado ──────────────────────────────────────────────────
  loading       = signal(false);
  errorMsg      = signal('');
  generado      = signal(false);
  mostrarDebeHaber = signal(false);

  idEjecucion   = signal<number | null>(null);
  totalRegistros = signal<number | null>(null);
  fechaProceso  = signal<string | null>(null);
  balanceData   = signal<TemporalReporte[]>([]);

  // ── Reporte Jasper (2026-09-08) ──
  imprimiendo = signal(false);

  // ── Computed totales ────────────────────────────────────
  totalSaldoAnterior = computed(() =>
    this.balanceData().reduce((s, r) => s + (r.saldoCuenta || 0), 0));
  totalDebe = computed(() =>
    this.balanceData().reduce((s, r) => s + (r.valorDebe || 0), 0));
  totalHaber = computed(() =>
    this.balanceData().reduce((s, r) => s + (r.valorHaber || 0), 0));
  totalSaldoActual = computed(() =>
    this.balanceData().reduce((s, r) => s + (r.valorActual || 0), 0));

  // ── Columnas ───────────────────────────────────────────
  colsBalance = computed(() => {
    const base = ['cuentaContable', 'nombreCuenta', 'nivel', 'saldoCuenta'];
    if (this.mostrarDebeHaber()) {
      base.push('valorDebe', 'valorHaber');
    }
    base.push('valorActual');
    return base;
  });

  // ── Formulario ───────────────────────────────────────────────
  form!: FormGroup;

  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaInicio = '';
  private _rawFechaFin = '';

  // ── Datepicker: Fecha Inicio ─────────────────────────────────
  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }
  syncFechaInicioFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    const date = this.parseFechaLocalBG(raw);
    if (!date) return;
    const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    this.form.patchValue({ fechaInicio: date }, { emitEvent: false });
    this.form.get('fechaInicio')?.setErrors(null);
    this.form.get('fechaInicio')?.markAsUntouched();
    setTimeout(() => { if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted; });
  }
  onFechaInicioPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    const formatted = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    this.form.patchValue({ fechaInicio: d }, { emitEvent: false });
    this.form.get('fechaInicio')?.setErrors(null);
    this.form.get('fechaInicio')?.markAsUntouched();
    setTimeout(() => { if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted; });
  }

  // ── Datepicker: Fecha Fin ────────────────────────────────────
  capturarFechaFinRaw(event: Event): void {
    this._rawFechaFin = (event.target as HTMLInputElement).value;
  }
  syncFechaFinFromRaw(event: FocusEvent): void {
    const raw = (this._rawFechaFin || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaFin = '';
    const date = this.parseFechaLocalBG(raw);
    if (!date) return;
    const formatted = this.funcionesDatos.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
    this.form.patchValue({ fechaFin: date }, { emitEvent: false });
    this.form.get('fechaFin')?.setErrors(null);
    this.form.get('fechaFin')?.markAsUntouched();
    setTimeout(() => { if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted; });
  }
  onFechaFinPickerChange(date: Date | null | undefined): void {
    const d = date || new Date();
    const formatted = this.funcionesDatos.formatoFecha(d, FuncionesDatosService.SOLO_FECHA) || '';
    this.form.patchValue({ fechaFin: d }, { emitEvent: false });
    this.form.get('fechaFin')?.setErrors(null);
    this.form.get('fechaFin')?.markAsUntouched();
    setTimeout(() => { if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted; });
  }

  private parseFechaLocalBG(raw: string): Date | null {
    if (!raw) return null;
    const parts = raw.split('/');
    if (parts.length !== 3) return null;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (isNaN(dia) || dia < 1 || dia > 31 || isNaN(mes) || mes < 0 || mes > 11 || isNaN(anio) || anio < 1000) return null;
    const d = new Date(anio, mes, dia);
    return d.getFullYear() === anio && d.getMonth() === mes && d.getDate() === dia ? d : null;
  }

  ngOnInit(): void {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    this.form = this.fb.group({
      fechaInicio:         [firstDay, Validators.required],
      fechaFin:            [today,    Validators.required],
      codigoAlterno:       [null,     Validators.required],
      acumulacion:         ['0'],
      incluyeCentrosCosto: [false],
      reporteDistribuido:  [false],
      eliminarSaldosCero:  [true],
    });

    // "A fecha de corte" ('2') no pide fecha inicial — el reporte no la acepta (§ nombreReporte).
    // Se quita el `required` y se deshabilita el control mientras esa opción esté elegida, y se
    // repone tal como estaba (con su validador y sin tocar el valor que ya tenía el usuario) al
    // volver a cualquiera de las otras dos.
    this.form.get('acumulacion')?.valueChanges.subscribe((valor) => {
      const fechaInicioCtrl = this.form.get('fechaInicio');
      if (valor === '2') {
        fechaInicioCtrl?.disable({ emitEvent: false });
        fechaInicioCtrl?.clearValidators();
      } else {
        fechaInicioCtrl?.enable({ emitEvent: false });
        fechaInicioCtrl?.setValidators(Validators.required);
      }
      fechaInicioCtrl?.setErrors(null);
      fechaInicioCtrl?.updateValueAndValidity({ emitEvent: false });
    });

    this.cargarReportes();
  }

  private cargarReportes(): void {
    const empresa = this.appState.getEmpresa()?.codigo
      ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);

    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(TipoDatos.LONG, 'empresa', 'codigo', String(empresa), TipoComandosBusqueda.IGUAL);
    this.reporteContableService.selectByCriteria([criterioEmpresa]).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.reportes.set(data);
        } else {
          // Fallback: intentar getAll si selectByCriteria no devuelve datos
          this.reporteContableService.getAll().subscribe({
            next: (all) => this.reportes.set(all ?? []),
            error: (err) => this.errorMsg.set('No se pudieron cargar los tipos de reporte: ' + mensajeDeError(err, ''))
          });
        }
      },
      error: () => {
        this.reporteContableService.getAll().subscribe({
          next: (all) => this.reportes.set(all ?? []),
          error: (err) => this.errorMsg.set('No se pudieron cargar los tipos de reporte: ' + mensajeDeError(err, ''))
        });
      }
    });
  }

  // ── Acciones ──────────────────────────────────────────────────
  generar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.errorMsg.set('');

    // Limpiar ejecución anterior
    const prevId = this.idEjecucion();
    if (prevId) {
      this.balanceService.eliminarBalance(prevId).subscribe();
      this.idEjecucion.set(null);
    }

    this.loading.set(true);
    this.generado.set(false);
    this.balanceData.set([]);

    // `getRawValue()`, no `.value`: con "A fecha de corte" el control `fechaInicio` queda
    // deshabilitado, y `.value` excluye los controles deshabilitados del objeto — daría
    // `fechaInicio: undefined` justo cuando más hace falta calcular el sustituto de abajo.
    const v = this.form.getRawValue();
    const empresa = this.appState.getEmpresa()?.codigo
      ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);

    this.balanceService.generarBalance({
      fechaInicio: this.funcionesDatos.formatearFechaParaBackend(this.fechaInicioParaGenerar(v), TipoFormatoFechaBackend.SOLO_FECHA)!,
      fechaFin: this.funcionesDatos.formatearFechaParaBackend(v.fechaFin, TipoFormatoFechaBackend.SOLO_FECHA)!,
      empresa,
      codigoAlterno: Number(v.codigoAlterno),
      // "A fecha de corte" ('2') sigue siendo ACUMULADO (1) para el motor de cálculo — el
      // backend sólo conoce 0/1 (`ReporteTipoAcumulacion`); lo que cambia es qué `fechaInicio`
      // se le manda y qué Jasper se imprime después, no el tipo de cálculo. Ver el comentario
      // largo de `fechaInicioParaGenerar()` sobre por qué esto no rompe el saldo final.
      acumulacion: v.acumulacion === '0' ? 0 : 1,
      incluyeCentrosCosto: v.incluyeCentrosCosto,
      reporteDistribuido: v.reporteDistribuido,
      eliminarSaldosCero: v.eliminarSaldosCero,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        if (!res || !res.exitoso) {
          this.errorMsg.set(res?.mensaje || 'Error al generar el balance');
          return;
        }
        this.idEjecucion.set(res.idEjecucion);
        this.totalRegistros.set(res.totalRegistros);
        this.fechaProceso.set(res.fechaProceso);
        this.cargarBalance(res.idEjecucion!);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('Error de comunicación con el servidor');
      }
    });
  }

  private cargarBalance(idEjecucion: number): void {
    this.balanceService.obtenerBalance(idEjecucion).subscribe({
      next: (data) => {
        const sorted = (data ?? []).slice().sort((a, b) =>
          (a.cuentaContable ?? '').localeCompare(b.cuentaContable ?? '')
        );
        this.balanceData.set(sorted);
        this.generado.set(true);
      },
      error: () => {
        this.errorMsg.set('Error al obtener los datos del balance');
        this.generado.set(false);
      }
    });
  }

  exportarBalanceCsv(): void {
    const data = this.balanceData();
    if (!data || data.length === 0) {
      this.snackBar.open('No hay datos del balance para exportar', 'Cerrar', { duration: 3000 });
      return;
    }

    const incluyeDebeHaber = this.mostrarDebeHaber();

    const rows = data.map((row) => {
      const registro: any = {
        cuentaContable: row.cuentaContable ?? '',
        nombreCuenta: row.nombreCuenta ?? '',
        nivel: row.nivel ?? '',
        saldoCuenta: this.formatearMontoCsv(row.saldoCuenta),
        valorActual: this.formatearMontoCsv(row.valorActual),
      };

      if (incluyeDebeHaber) {
        registro.valorDebe = this.formatearMontoCsv(row.valorDebe);
        registro.valorHaber = this.formatearMontoCsv(row.valorHaber);
      }

      return registro;
    });

    const filaTotales: any = {
      cuentaContable: 'TOTALES',
      nombreCuenta: '',
      nivel: '',
      saldoCuenta: this.formatearMontoCsv(this.totalSaldoAnterior()),
      valorActual: this.formatearMontoCsv(this.totalSaldoActual()),
    };

    if (incluyeDebeHaber) {
      filaTotales.valorDebe = this.formatearMontoCsv(this.totalDebe());
      filaTotales.valorHaber = this.formatearMontoCsv(this.totalHaber());
    }

    rows.push(filaTotales);

    const headers = ['N° Cuenta', 'Nombre', 'Nivel', 'Saldo Anterior'];
    const dataKeys = ['cuentaContable', 'nombreCuenta', 'nivel', 'saldoCuenta'];

    if (incluyeDebeHaber) {
      headers.push('Debe', 'Haber');
      dataKeys.push('valorDebe', 'valorHaber');
    }

    headers.push('Saldo Actual');
    dataKeys.push('valorActual');

    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');

    this.exportService.exportToCSV(
      rows,
      `balance_general_${yyyy}${mm}${dd}_${hh}${min}`,
      headers,
      dataKeys
    );
  }

  /**
   * Cuál de los seis Jasper corresponde, según el estado que ya tiene el formulario. Dos ejes:
   * - `mostrarDebeHaber()` → variante `_DBHB` o no (explícito, ya existe en pantalla).
   * - `acumulacion`: '0' Por periodo → **RNGO_FIFF**; '1' Acumulado → **ACUM_CNFI**; '2' A fecha
   *   de corte → **ACUM_SNFI** (2026-09-09: habilitada a pedido del usuario — es la que
   *   corresponde al estado de situación financiera regulatorio, Resolución SBS-2013-0507, a
   *   diferencia de las otras dos que son de control interno).
   */
  private nombreReporte(): string {
    const conDebeHaber = this.mostrarDebeHaber();
    const acumulacion = this.form.value.acumulacion;
    if (acumulacion === '2') {
      return conDebeHaber ? ReportesContables.ACUM_SNFI_DBHB : ReportesContables.ACUM_SNFI;
    }
    if (acumulacion === '1') {
      return conDebeHaber ? ReportesContables.ACUM_CNFI_DBHB : ReportesContables.ACUM_CNFI;
    }
    return conDebeHaber ? ReportesContables.RNGO_FIFF_DBHB : ReportesContables.RNGO_FIFF;
  }

  /**
   * Qué `fechaInicio` mandarle a `generarBalance()` (que la exige siempre, no acepta null —
   * `TempReportesRest.generarBalance:178`) cuando el usuario eligió "A fecha de corte" y el
   * control real quedó deshabilitado y sin valor.
   *
   * **Verificado en `TempReportesServiceImpl.actualizaDebeHaberMovimiento` antes de escribir
   * esto, no asumido**: con `acumulacion = ACUMULADO`, el saldo final de cada cuenta se arma como
   * `saldoCuenta(fechaInicio - 1 día) + movimientos(fechaInicio..fechaFin)` — y eso es
   * matemáticamente **el mismo saldo a `fechaFin` sin importar qué `fechaInicio` se elija**: el
   * saldo anterior ya absorbe todo lo previo. O sea que el número final ("Saldo Actual") **no se
   * rompe con ningún valor que se mande acá** — el backend no necesitaba ningún cambio para esto,
   * confirmado antes de tocar código.
   *
   * Lo único que sí cambia según qué `fechaInicio` se mande es **cómo se reparte** ese total entre
   * "Saldo Anterior" y las columnas Debe/Haber del período. Elegí el **primer día del ejercicio
   * de `fechaFin`** (1 de enero de ese año): es la convención estándar de "acumulado del
   * ejercicio" — Saldo Anterior = lo acumulado hasta el cierre del año anterior, Debe/Haber =
   * movimiento del año en curso hasta la fecha de corte. Si el criterio correcto fuera otro
   * (p.ej. repetir `fechaFin`, que mostraría Debe/Haber en cero), es un cambio de una línea acá —
   * avisado al árbitro para que lo confirme, no es una decisión cerrada.
   */
  private fechaInicioParaGenerar(v: { fechaInicio: Date | null; fechaFin: Date; acumulacion: string }): Date {
    if (v.acumulacion !== '2') {
      return v.fechaInicio!;
    }
    const fechaFin = new Date(v.fechaFin);
    return new Date(fechaFin.getFullYear(), 0, 1);
  }

  /** Para la plantilla: oculta/deshabilita el campo Fecha Inicio cuando no se pide. */
  esFechaDeCorte(): boolean {
    return this.form.value.acumulacion === '2';
  }

  puedeImprimirPdf(): boolean {
    return this.generado() && this.idEjecucion() != null && !this.imprimiendo();
  }

  imprimirPdf(): void {
    const idEjecucion = this.idEjecucion();
    if (!this.puedeImprimirPdf() || idEjecucion == null) {
      return;
    }

    // getRawValue(): con "A fecha de corte" el control fechaInicio está deshabilitado y `.value`
    // no lo incluiría (no que importe acá: esa rama ni siquiera manda P_FECHAINICIAL).
    const v = this.form.getRawValue();
    const empresa = this.appState.getEmpresa()?.codigo
      ?? parseInt(localStorage.getItem('idSucursal') || '0', 10);

    const parametros: Record<string, any> = {
      P_DTMTSCRP: idEjecucion,
      // Mismo fallback que usa generarBalance() más arriba en esta pantalla.
      P_PJRQ_CODIGO: empresa,
      // Resolución SBS-2013-0507: el catálogo formal llega hasta seis dígitos, las cuentas
      // auxiliares internas de 7+ quedan afuera. Es una decisión regulatoria, no una
      // preferencia del usuario — por eso va fijo en 6 y no como control de la pantalla
      // (2026-09-09, confirmado con el árbitro; si algún día hace falta ver el analítico
      // interno, es una conversación aparte, no cambiar esto a ciegas).
      P_NIVEL_MAXIMO: 6,
      P_FECHAFINAL: this.funcionesDatos.formatearFechaParaBackend(v.fechaFin, TipoFormatoFechaBackend.SOLO_FECHA),
      P_USUARIO: usuarioSesion(),
      // ⚠️ P_FILTRO/P_MAYORIZADO: no hay ningún campo del formulario que los alimente hoy — se
      // mandan vacíos a propósito (no se inventó contenido). PENDIENTE (anotado con el árbitro
      // 2026-09-09): P_MAYORIZADO sí importa en un estado formal — un balance sobre un período
      // no mayorizado es provisional y debería decirlo en la cara del reporte. Falta decidir de
      // dónde sale ese dato (¿el período tiene un flag de mayorización que esta pantalla no
      // carga hoy?) antes de dejar de mandarlo vacío.
      P_FILTRO: '',
      P_MAYORIZADO: '',
    };
    // "A fecha de corte": ACUM_SNFI/ACUM_SNFI_DBHB no declaran este parámetro — mandarlo sería
    // ensuciar la llamada con algo que el reporte no conoce (confirmado en el .jrxml).
    if (!this.esFechaDeCorte()) {
      parametros['P_FECHAINICIAL'] = this.funcionesDatos.formatearFechaParaBackend(v.fechaInicio, TipoFormatoFechaBackend.SOLO_FECHA);
    }

    this.imprimiendo.set(true);
    this.jasperService
      .generar('cnt', this.nombreReporte(), parametros)
      .subscribe({
        next: (blob) => {
          this.imprimiendo.set(false);
          guardarArchivo(blob, `balance-general-${idEjecucion}.pdf`);
        },
        error: (error) => {
          this.imprimiendo.set(false);
          mensajeReporteFallido(error).then((mensaje) => this.errorMsg.set(mensaje));
        },
      });
  }

  onMostrarDebeHaberChange(checked: boolean): void {
    this.mostrarDebeHaber.set(checked);
  }

  private formatearMontoCsv(valor: number | null | undefined): string {
    const numero = Number(valor ?? 0);
    if (!Number.isFinite(numero)) {
      return '0.00';
    }
    return numero.toFixed(2);
  }

  // ── Cleanup ───────────────────────────────────────────────────
  formatFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return fecha ?? '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  ngOnDestroy(): void {
    const id = this.idEjecucion();
    if (id) {
      this.balanceService.eliminarBalance(id).subscribe();
    }
  }
}

