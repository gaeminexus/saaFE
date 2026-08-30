import { Component, ElementRef, OnInit, computed, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { ContratoService } from '../../../service/contrato.service';
import { VigenciaContratoService } from '../../../service/vigencia-contrato.service';
import { Contrato } from '../../../model/contrato';
import { Entidad } from '../../../model/entidad';
import {
  ContratoPorEntidadDTO,
  ID_TIPO_APORTE,
  MODO_VIGENCIA,
  VigenciaDTO,
} from '../../../model/vigencia-contrato';
import { CanComponentDeactivate } from '../../../../../shared/guard/can-deactivate.guard';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';

const TIPOS_APORTE = [
  { id: ID_TIPO_APORTE.JUBILACION, nombre: 'Jubilación' },
  { id: ID_TIPO_APORTE.CESANTIA, nombre: 'Cesantía' },
];

@Component({
  selector: 'app-contrato-edit',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatButtonToggleModule, MatIconModule, MatCardModule, MatDatepickerModule,
    MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './contrato-edit.component.html',
  styleUrls: ['./contrato-edit.component.scss'],
})
export class ContratoEditComponent implements OnInit, CanComponentDeactivate {
  @ViewChild('fechaInicioInput', { read: ElementRef }) fechaInicioInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('fechaFinInput', { read: ElementRef }) fechaFinInputRef!: ElementRef<HTMLInputElement>;
  private _rawFechaInicio = '';
  private _rawFechaFin = '';

  // ---- modo creación (contrato nuevo, sin vigencias todavía) ----
  form!: FormGroup;
  editMode = signal<boolean>(false);
  codigoContrato: number = 0;
  formularioModificado = signal<boolean>(false);

  // ---- modo edición: cabecera + historial de vigencias (§4.1 del plan de devengo) ----
  loading = signal<boolean>(false);
  error = signal<string>('');
  cabecera = signal<ContratoPorEntidadDTO | null>(null);
  /** La entidad real (el mock de `cabecera()` trae identificación/razón social de relleno). */
  entidadReal = signal<Entidad | null>(null);

  readonly tiposAporte = TIPOS_APORTE;
  readonly MODO_VIGENCIA = MODO_VIGENCIA;
  readonly ID_TIPO_APORTE = ID_TIPO_APORTE;

  vigenciasJubilacion = computed(() => this.vigenciasPorTipo(ID_TIPO_APORTE.JUBILACION));
  vigenciasCesantia = computed(() => this.vigenciasPorTipo(ID_TIPO_APORTE.CESANTIA));

  // ---- formulario "nueva vigencia" ----
  mostrarFormNuevaVigencia = signal(false);
  guardandoVigencia = signal(false);
  anulandoIdVigencia = signal<number | null>(null);

  formVigencia!: FormGroup;

  /**
   * Espejo en signal del control `idTipoAporte`, actualizado por `valueChanges` (ver ngOnInit).
   * `vigenciaAbiertaDelTipoElegido` es un `computed()` que se usa tanto en el hint de fecha como
   * en la validación al guardar — un `computed()` solo se invalida cuando cambia un SIGNAL que
   * leyó, y leer `formVigencia.get('idTipoAporte')?.value` directamente ahí adentro no cuenta
   * como esa dependencia: al cambiar el tipo de aporte en el select, el computed se hubiera
   * quedado con la vigencia abierta del tipo anterior (mismo defecto de fondo que el pedido 5).
   */
  private tipoAporteElegido = signal<number>(ID_TIPO_APORTE.JUBILACION);

  /** La vigencia abierta del tipo elegido en el formulario, o null si no hay ninguna todavía. */
  vigenciaAbiertaDelTipoElegido = computed(() => {
    const tipo = this.tipoAporteElegido();
    return this.cabecera()?.vigencias.find((v) => v.idTipoAporte === tipo && v.fechaFin === null) ?? null;
  });

  /** Modo CALCULADO exige remuneración; si no hay, se deshabilita con el motivo a la vista. */
  puedeUsarModoCalculado = computed(() => (this.cabecera()?.remuneracionUnificada ?? 0) > 0);

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private contratoService: ContratoService,
    private vigenciaContratoService: VigenciaContratoService,
    private snackBar: MatSnackBar,
    private funcionesDatosS: FuncionesDatosService,
    private dialog: MatDialog
  ) {
    this.buildForm();
    this.formVigencia = this.fb.group({
      idTipoAporte: [ID_TIPO_APORTE.JUBILACION as number, [Validators.required]],
      fechaInicio: [null as Date | null, [Validators.required]],
      modo: [MODO_VIGENCIA.FIJO as number, [Validators.required]],
      monto: [0, [Validators.required, Validators.min(0.01)]],
      porcentaje: [0, [Validators.min(0), Validators.max(100)]],
      observacion: [''],
    });
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.codigoContrato = +params['id'];
        this.editMode.set(true);
        this.cargarCabecera();
      }
    });

    this.form.valueChanges.subscribe(() => {
      this.formularioModificado.set(true);
    });

    // Recalcula el monto en modo CALCULADO y limpia el porcentaje al pasar a FIJO.
    this.formVigencia.get('modo')!.valueChanges.subscribe((modo) => {
      if (modo === MODO_VIGENCIA.FIJO) {
        this.formVigencia.get('porcentaje')?.setValue(0, { emitEvent: false });
      }
      this.actualizarMontoCalculado();
    });
    this.formVigencia.get('porcentaje')!.valueChanges.subscribe(() => this.actualizarMontoCalculado());
    this.formVigencia.get('idTipoAporte')!.valueChanges.subscribe((tipo) => this.tipoAporteElegido.set(tipo));
  }

  buildForm(): void {
    this.form = this.fb.group({
      codigo: [{ value: 0, disabled: true }],
      codigoEntidad: [null, [Validators.required]],
      fechaInicio: [null, [Validators.required]],
      fechaFin: [null],
      filial: [''],
      porcentajeAporteIndividual: [0, [Validators.min(0), Validators.max(100)]],
      porcentajeAporteJubilacion: [0, [Validators.min(0), Validators.max(100)]],
      estado: ['Activo'],
      observacion: ['']
    }, { validators: this.alMenosUnAporteValidator });
  }

  alMenosUnAporteValidator(group: FormGroup): { [key: string]: boolean } | null {
    const individual = group.get('porcentajeAporteIndividual')?.value || 0;
    const jubilacion = group.get('porcentajeAporteJubilacion')?.value || 0;
    return (individual > 0 || jubilacion > 0) ? null : { alMenosUnAporte: true };
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.snackBar.open('Por favor complete los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const contrato: Contrato = { ...this.form.getRawValue() };

    this.contratoService.add(contrato).subscribe({
      next: () => {
        this.formularioModificado.set(false);
        this.snackBar.open('Contrato creado exitosamente', 'Cerrar', { duration: 3000 });
        this.volver();
      },
      error: (err) => {
        console.error('Error al guardar:', err);
        this.snackBar.open('Error al guardar contrato', 'Cerrar', { duration: 3000 });
        this.loading.set(false);
      }
    });
  }

  volver(): void {
    this.router.navigate(['/menucontabilidad/menucreditos/contrato-consulta']);
  }

  canDeactivate(): boolean {
    if (!this.editMode() && this.formularioModificado()) {
      return confirm('¿Deseas salir sin guardar los cambios?');
    }
    return true;
  }

  // ══════════════════════ Cabecera + historial de vigencias ══════════════════════

  cargarCabecera(): void {
    this.loading.set(true);
    this.error.set('');

    this.contratoService.getById(this.codigoContrato.toString()).subscribe({
      next: (contrato) => {
        if (!contrato?.entidad?.codigo) {
          this.loading.set(false);
          this.error.set('No se encontró el contrato o no tiene entidad asociada');
          return;
        }
        this.entidadReal.set(contrato.entidad);
        this.vigenciaContratoService.porEntidad(contrato.entidad.codigo).subscribe({
          next: (data) => {
            this.loading.set(false);
            if (!data) {
              this.error.set('No se pudo cargar el contrato');
              return;
            }
            this.cabecera.set(data);
          },
          error: (err) => {
            this.loading.set(false);
            this.error.set(err?.mensaje || 'No se pudo cargar el contrato');
          },
        });
      },
      error: (err) => {
        console.error('Error al cargar contrato:', err);
        this.loading.set(false);
        this.error.set('Error al cargar contrato');
      },
    });
  }

  private vigenciasPorTipo(idTipoAporte: number): VigenciaDTO[] {
    const vigencias = this.cabecera()?.vigencias ?? [];
    return vigencias
      .filter((v) => v.idTipoAporte === idTipoAporte)
      .sort((a, b) => this.comparaFechasDesc(a.fechaInicio, b.fechaInicio));
  }

  private comparaFechasDesc(a: string | number[], b: string | number[]): number {
    const fa = this.aTexto(a);
    const fb = this.aTexto(b);
    return fa < fb ? 1 : fa > fb ? -1 : 0;
  }

  private aTexto(fecha: string | number[]): string {
    if (Array.isArray(fecha)) {
      const [y, m, d] = fecha;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return fecha;
  }

  esVigente(v: VigenciaDTO): boolean {
    return v.fechaFin === null;
  }

  formatFecha(fecha: unknown): string {
    return this.funcionesDatosS.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  formatFechaFin(fecha: string | number[] | null): string {
    return fecha === null ? 'Vigente' : this.formatFecha(fecha);
  }

  formatMonto(n: number | null | undefined): string {
    return n == null ? '—' : '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatPorcentaje(n: number | null | undefined): string {
    return n == null ? '—' : `${n}%`;
  }

  // ══════════════════════ Nueva vigencia ══════════════════════

  abrirFormNuevaVigencia(idTipoAporte?: number): void {
    this.formVigencia.reset({
      idTipoAporte: idTipoAporte ?? ID_TIPO_APORTE.JUBILACION,
      fechaInicio: null,
      modo: MODO_VIGENCIA.FIJO,
      monto: 0,
      porcentaje: 0,
      observacion: '',
    });
    this.mostrarFormNuevaVigencia.set(true);
  }

  cerrarFormNuevaVigencia(): void {
    this.mostrarFormNuevaVigencia.set(false);
  }

  /**
   * Lee cada control por separado (`.get('x')?.value`), nunca `this.formVigencia.value`: este
   * método se llama desde el `valueChanges` de un control HIJO (modo o porcentaje), y en ese
   * momento el `.value` agregado del FormGroup PADRE todavía no se actualizó — Angular emite el
   * `valueChanges` del hijo antes de sincronizar el valor del padre. Leer el agregado ahí adentro
   * da el valor de un paso atrás (probado: tipear "20" en porcentaje calculaba con el "12"
   * anterior). Cada control hijo sí tiene su propio valor ya actualizado en ese punto.
   */
  private actualizarMontoCalculado(): void {
    const modo = this.formVigencia.get('modo')?.value;
    const porcentaje = this.formVigencia.get('porcentaje')?.value;
    if (modo !== MODO_VIGENCIA.CALCULADO) return;
    const remuneracion = this.cabecera()?.remuneracionUnificada ?? 0;
    const monto = +((remuneracion * (porcentaje ?? 0)) / 100).toFixed(2);
    this.formVigencia.get('monto')?.setValue(monto, { emitEvent: false });
  }

  guardarNuevaVigencia(): void {
    if (this.formVigencia.invalid) {
      this.formVigencia.markAllAsTouched();
      this.snackBar.open('Complete los campos requeridos', 'Cerrar', { duration: 3000 });
      return;
    }

    const cabecera = this.cabecera();
    if (!cabecera) return;

    const { idTipoAporte, fechaInicio, modo, monto, porcentaje, observacion } = this.formVigencia.getRawValue();
    const fechaInicioTexto = this.funcionesDatosS.formatearFechaParaBackend(fechaInicio as Date, TipoFormatoFechaBackend.SOLO_FECHA);
    if (!fechaInicioTexto) {
      this.snackBar.open('Seleccione una fecha de inicio válida', 'Cerrar', { duration: 3000 });
      return;
    }

    const abierta = this.vigenciaAbiertaDelTipoElegido();
    if (abierta) {
      const inicioAbierta = this.aTexto(abierta.fechaInicio);
      if (fechaInicioTexto < inicioAbierta) {
        this.snackBar.open(
          `La fecha de inicio no puede ser anterior al ${this.formatFecha(abierta.fechaInicio)}, cuando empezó la vigencia actual.`,
          'Cerrar',
          { duration: 6000 }
        );
        return;
      }
    }

    const nombreTipo = this.tiposAporte.find((t) => t.id === idTipoAporte)?.nombre ?? 'este tipo';
    const fechaCierreTexto = this.formatFecha(this.restarUnDia(fechaInicioTexto));
    const fechaInicioFormateada = this.formatFecha(fechaInicioTexto);

    const mensajeConfirmacion = abierta
      ? `Esto cierra la vigencia actual de ${nombreTipo} el ${fechaCierreTexto} y abre una nueva desde el ${fechaInicioFormateada}.`
      : `Esto abre una nueva vigencia de ${nombreTipo} desde el ${fechaInicioFormateada}.`;

    const datosDialogo: ConfirmDialogData = {
      title: abierta ? `Nueva vigencia de ${nombreTipo}` : `Abrir vigencia de ${nombreTipo}`,
      message: mensajeConfirmacion,
      confirmText: 'Guardar vigencia',
      cancelText: 'Cancelar',
      type: 'warning',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: datosDialogo, width: '560px', autoFocus: false })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.crearVigenciaConfirmada(idTipoAporte!, fechaInicioTexto, modo!, monto!, porcentaje ?? null, observacion ?? null);
      });
  }

  private crearVigenciaConfirmada(
    idTipoAporte: number,
    fechaInicio: string,
    modo: number,
    monto: number,
    porcentaje: number | null,
    observacion: string | null
  ): void {
    this.guardandoVigencia.set(true);
    this.vigenciaContratoService
      .crear({
        idContrato: this.codigoContrato,
        idTipoAporte,
        fechaInicio,
        modo,
        monto,
        porcentaje: modo === MODO_VIGENCIA.CALCULADO ? porcentaje : null,
        observacion: observacion?.trim() || null,
        usuario: usuarioSesion(),
      })
      .subscribe({
        next: (resultado) => {
          this.guardandoVigencia.set(false);
          if (!resultado) {
            this.snackBar.open('No se pudo crear la vigencia', 'Cerrar', { duration: 5000 });
            return;
          }
          this.snackBar.open('Vigencia creada exitosamente', 'Cerrar', { duration: 3000 });
          this.mostrarFormNuevaVigencia.set(false);
          this.cargarCabecera();
        },
        error: (err) => {
          this.guardandoVigencia.set(false);
          this.snackBar.open(err?.mensaje || 'No se pudo crear la vigencia', 'Cerrar', { duration: 5000 });
        },
      });
  }

  anularVigencia(v: VigenciaDTO): void {
    if (!this.esVigente(v)) return;

    const datosDialogo: ConfirmDialogData = {
      title: 'Anular vigencia',
      message: `¿Anular la vigencia de ${v.nombreTipoAporte} abierta desde el ${this.formatFecha(v.fechaInicio)}?`,
      confirmText: 'Anular vigencia',
      cancelText: 'Cancelar',
      type: 'danger',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: datosDialogo, width: '520px', autoFocus: false })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;

        this.anulandoIdVigencia.set(v.idVigencia);
        this.vigenciaContratoService.anular(v.idVigencia).subscribe({
          next: () => {
            this.anulandoIdVigencia.set(null);
            this.snackBar.open('Vigencia anulada', 'Cerrar', { duration: 3000 });
            this.cargarCabecera();
          },
          error: (err) => {
            this.anulandoIdVigencia.set(null);
            this.snackBar.open(err?.mensaje || 'No se pudo anular la vigencia', 'Cerrar', { duration: 5000 });
          },
        });
      });
  }

  private restarUnDia(fechaISO: string): string {
    const [y, m, d] = fechaISO.split('-').map(Number);
    const fecha = new Date(y, m - 1, d - 1);
    return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
  }

  // ══════════════════════ Fechas del formulario de creación (modo "nuevo contrato") ══════════════════════

  capturarFechaInicioRaw(event: Event): void {
    this._rawFechaInicio = (event.target as HTMLInputElement).value;
  }

  syncFechaInicioFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaInicio || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaInicio = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.form.get('fechaInicio')?.setValue(date, { emitEvent: false });
        this.form.get('fechaInicio')?.setErrors(null);
        setTimeout(() => {
          if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaInicioPickerChange(date: Date | null | undefined): void {
    this.form.get('fechaInicio')?.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaInicioInputRef?.nativeElement) this.fechaInicioInputRef.nativeElement.value = formatted;
    });
  }

  capturarFechaFinRaw(event: Event): void {
    this._rawFechaFin = (event.target as HTMLInputElement).value;
  }

  syncFechaFinFromRaw(event: FocusEvent): void {
    const rawValue = (this._rawFechaFin || (event.target as HTMLInputElement)?.value || '').trim();
    this._rawFechaFin = '';
    if (!rawValue) return;
    const parts = rawValue.split('/');
    if (parts.length !== 3) return;
    const dia = Number(parts[0]), mes = Number(parts[1]) - 1, anio = Number(parts[2]);
    if (!isNaN(dia) && dia >= 1 && dia <= 31 && !isNaN(mes) && mes >= 0 && mes <= 11 && !isNaN(anio) && anio >= 1000 && anio <= 9999) {
      const date = new Date(anio, mes, dia);
      if (date.getFullYear() === anio && date.getMonth() === mes && date.getDate() === dia) {
        const formatted = this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '';
        this.form.get('fechaFin')?.setValue(date, { emitEvent: false });
        this.form.get('fechaFin')?.setErrors(null);
        setTimeout(() => {
          if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
        });
      }
    }
  }

  onFechaFinPickerChange(date: Date | null | undefined): void {
    this.form.get('fechaFin')?.setValue(date || null, { emitEvent: false });
    const formatted = date ? this.funcionesDatosS.formatoFecha(date, FuncionesDatosService.SOLO_FECHA) || '' : '';
    setTimeout(() => {
      if (this.fechaFinInputRef?.nativeElement) this.fechaFinInputRef.nativeElement.value = formatted;
    });
  }
}
