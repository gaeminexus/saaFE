import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { guardarArchivo, mensajeReporteFallido } from '../../../../../shared/services/descarga-reporte';
import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { JasperReportesService } from '../../../../../shared/services/jasper-reportes.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { BancoExternoService } from '../../../../tsr/service/banco-externo.service';
import { ProductoPagoService } from '../../../../cxp/service/producto-pago.service';
import { CausalTerminacionService } from '../../../service/causal-terminacion.service';
import { LiquidacionExternaService } from '../../../service/liquidacion-externa.service';
import {
  DetalleLiquidacionExterna,
  ESTADO_LIQUIDACION_EXTERNA_LABELS,
  EstadoLiquidacionExterna,
  LiquidacionExterna,
  OPCIONES_TIPO_CONCEPTO_LIQUIDACION_EXTERNA,
  RegistrarLiquidacionExternaRequest,
  TIPO_CONCEPTO_LIQUIDACION_EXTERNA_LABELS,
  esDescuentoLiquidacionExterna,
  esIngresoLiquidacionExterna,
} from '../../../model/liquidacion-externa';
import { criteriosPorEmpresa, extraerCodigo, referenciaEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { CampoFormularioComponent } from '../../comunes/campo-formulario/campo-formulario.component';
import { referencia, referenciaSinResolver } from '../../comunes/cuerpo-entidad';
import { mensajeDeError } from '../../comunes/mensajes';
import { CampoFormulario } from '../../comunes/modelo-formulario';
import { ReportesNomina } from '../descarga-reporte';
import { opcionesAviso } from '../../comunes/avisos';
import { camposLiquidacionExterna } from './liquidacion-externa.campos';

interface GrupoCampos {
  titulo: string;
  campos: CampoFormulario[];
}

/** Una fila de la grilla de conceptos, en edición (contrato §5.1). `valor` siempre positivo. */
interface FilaConcepto {
  tipoConcepto: number | null;
  descripcion: string;
  valor: number | null;
}

const FECHA_LIMITE_SALIDA = '2026-01-01';

/** `fechaSalida` debe ser anterior a 2026-01-01 (D7 del contrato) — se valida también en pantalla. */
function validadorFechaSalida(control: AbstractControl): ValidationErrors | null {
  const valor: string | null = control.value;
  if (!valor) return null; // Validators.required ya cubre el caso vacío
  return valor < FECHA_LIMITE_SALIDA ? null : { fechaSalidaPosterior2026: true };
}

/**
 * Liquidación de un ex-colaborador de la administración anterior, en vista propia. Contrato:
 * `docs/rrh/API-LIQUIDACION-EXCOLABORADORES.md`.
 *
 * **`tipoIdentificacion` no pasa por `app-campo-formulario`**: es `'C'/'P'` fijo (CHECK de la
 * base), no una tabla ni un rubro, y ningún `TipoCampo` de `modelo-formulario.ts` lo representa
 * sin forzarlo — se pinta aparte, como control propio del mismo `FormGroup`.
 *
 * El circuito (contrato §4): REGISTRADA (editable) → enviarATesoreria → EN_TESORERIA →
 * (Tesorería confirma) → sincronizarPago → PAGADA. Anular es posible desde REGISTRADA y desde
 * EN_TESORERIA (si el pago sigue POR_APROBAR); una PAGADA no se anula acá.
 */
@Component({
  selector: 'app-liquidacion-excolaboradores-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    CampoFormularioComponent,
  ],
  templateUrl: './liquidacion-excolaboradores-form.component.html',
  styleUrls: ['./liquidacion-excolaboradores-form.component.scss'],
})
export class LiquidacionExcolaboradoresFormComponent implements OnInit {
  readonly cargando = signal<boolean>(true);
  readonly ocupado = signal<boolean>(false);
  readonly descargandoActa = signal<boolean>(false);
  readonly liquidacion = signal<LiquidacionExterna | null>(null);
  readonly campos = signal<CampoFormulario[]>([]);
  readonly detalles = signal<FilaConcepto[]>([]);

  formulario: FormGroup = new FormGroup({});

  private codigo: number | null = null;

  readonly esNuevo = computed(() => this.liquidacion() === null);

  readonly estadoActual = computed<number | null>(() => {
    const l = this.liquidacion();
    return l ? Number(l.estado) : null;
  });

  /** REGISTRADA (o todavía sin guardar): la cabecera y los conceptos se editan. */
  readonly puedeEditar = computed(() => this.esNuevo() || this.estadoActual() === EstadoLiquidacionExterna.REGISTRADA);

  readonly puedeEnviarATesoreria = computed(() => this.estadoActual() === EstadoLiquidacionExterna.REGISTRADA);
  readonly puedeSincronizarPago = computed(() => this.estadoActual() === EstadoLiquidacionExterna.EN_TESORERIA);
  readonly puedeAnular = computed(
    () =>
      this.estadoActual() === EstadoLiquidacionExterna.REGISTRADA ||
      this.estadoActual() === EstadoLiquidacionExterna.EN_TESORERIA,
  );
  /** Disponible en cualquier estado salvo ANULADA (contrato §7), y sólo si ya se guardó. */
  readonly puedeDescargarActa = computed(
    () => !this.esNuevo() && this.estadoActual() !== EstadoLiquidacionExterna.ANULADA,
  );

  readonly titulo = computed(() => {
    const l = this.liquidacion();
    if (!l) return 'Nueva liquidación de ex-colaborador';
    return `Liquidación N.º ${l.codigo} · ${l.apellidos ?? ''} ${l.nombres ?? ''}`.trim();
  });

  readonly etiquetaEstado = computed(() => {
    const estado = this.estadoActual();
    return estado === null ? 'Sin guardar' : ESTADO_LIQUIDACION_EXTERNA_LABELS[estado] || `Estado ${estado}`;
  });

  readonly tiposConcepto = OPCIONES_TIPO_CONCEPTO_LIQUIDACION_EXTERNA;

  readonly totalIngresos = computed(() => this.sumar(esIngresoLiquidacionExterna));
  readonly totalDescuentos = computed(() => this.sumar(esDescuentoLiquidacionExterna));
  readonly neto = computed(() => this.totalIngresos() - this.totalDescuentos());

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private liquidacionExternaService: LiquidacionExternaService,
    private causalService: CausalTerminacionService,
    private productoPagoService: ProductoPagoService,
    private bancoService: BancoExternoService,
    private jasperService: JasperReportesService,
    private appState: AppStateService,
    private funcionesDatosS: FuncionesDatosService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    const param = this.route.snapshot.paramMap.get('codigo');
    this.codigo = param && param !== 'nuevo' ? Number(param) : null;
    this.cargar();
  }

  private cargar(): void {
    this.cargando.set(true);

    const sinFallo = (fuente: Observable<any[] | null>): Observable<any[]> =>
      fuente.pipe(
        map((filas) => filas ?? []),
        catchError(() => of<any[]>([])),
      );

    forkJoin({
      causales: sinFallo(this.causalService.selectByCriteria(criteriosPorEmpresa('nombre'))),
      productos: sinFallo(this.productoPagoService.selectByCriteria(criteriosPorEmpresa('nombre'))),
      bancos: sinFallo(this.bancoService.getAll()),
      liquidacion: this.codigo
        ? this.liquidacionExternaService.getById(this.codigo).pipe(catchError(() => of(null)))
        : of(null),
      detalles: this.codigo
        ? this.liquidacionExternaService.detalle(this.codigo).pipe(catchError(() => of([] as DetalleLiquidacionExterna[])))
        : of([] as DetalleLiquidacionExterna[]),
    }).subscribe({
      next: ({ causales, productos, bancos, liquidacion, detalles }) => {
        this.construirCampos(causales, productos, bancos);
        this.construirFormulario(liquidacion);
        this.liquidacion.set(liquidacion);
        this.detalles.set(
          (detalles ?? []).map((d) => ({
            tipoConcepto: d.tipoConcepto,
            descripcion: d.descripcion ?? '',
            valor: d.valor,
          })),
        );
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo abrir la liquidación.'), true);
        this.volver();
      },
    });
  }

  private construirCampos(causales: any[], productos: any[], bancos: any[]): void {
    this.campos.set(camposLiquidacionExterna(causales, productos, bancos));
  }

  private construirFormulario(l: LiquidacionExterna | null): void {
    const controles: Record<string, any> = {
      tipoIdentificacion: [l?.tipoIdentificacion ?? 'C', Validators.required],
    };

    for (const campo of this.campos()) {
      let valor: any = l ? (l as any)[campo.name] : (campo.valor ?? null);
      if (campo.tipo === 'fecha') {
        valor = l ? this.aValorDeInput((l as any)[campo.name]) : null;
      }
      const validadores = [];
      if (campo.requerido) validadores.push(Validators.required);
      if (campo.name === 'fechaSalida') validadores.push(validadorFechaSalida);
      controles[campo.name] = [valor, validadores];
    }

    this.formulario = this.fb.group(controles);
  }

  private aValorDeInput(valor: any): string | null {
    if (!valor) return null;
    const fecha = this.funcionesDatosS.convertirFechaDesdeBackend(valor);
    if (!(fecha instanceof Date) || Number.isNaN(fecha.getTime())) return null;
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${fecha.getFullYear()}-${mes}-${dia}`;
  }

  // ─── Grilla de conceptos ───────────────────────────────────────────────────

  agregarConcepto(): void {
    this.detalles.update((filas) => [...filas, { tipoConcepto: null, descripcion: '', valor: null }]);
  }

  quitarConcepto(indice: number): void {
    this.detalles.update((filas) => filas.filter((_, i) => i !== indice));
  }

  actualizarTipoConcepto(indice: number, tipoConcepto: number | null): void {
    this.detalles.update((filas) => filas.map((f, i) => (i === indice ? { ...f, tipoConcepto } : f)));
  }

  actualizarDescripcionConcepto(indice: number, descripcion: string): void {
    this.detalles.update((filas) => filas.map((f, i) => (i === indice ? { ...f, descripcion } : f)));
  }

  actualizarValorConcepto(indice: number, valor: string): void {
    const numero = valor === '' ? null : Number(valor);
    this.detalles.update((filas) => filas.map((f, i) => (i === indice ? { ...f, valor: numero } : f)));
  }

  etiquetaTipoConcepto(tipo: number | null): string {
    if (tipo === null) return '—';
    return TIPO_CONCEPTO_LIQUIDACION_EXTERNA_LABELS[tipo] || `Tipo ${tipo}`;
  }

  esIngreso(tipo: number | null): boolean {
    return tipo !== null && esIngresoLiquidacionExterna(tipo);
  }

  private sumar(filtro: (tipo: number) => boolean): number {
    return this.detalles()
      .filter((f) => f.tipoConcepto !== null && filtro(f.tipoConcepto))
      .reduce((suma, f) => suma + (Number(f.valor) || 0), 0);
  }

  // ─── Guardar ───────────────────────────────────────────────────────────────

  guardar(): void {
    if (this.ocupado()) return;

    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      this.avisar('Revise los campos obligatorios.', true);
      return;
    }

    const aMedias = referenciaSinResolver(this.campos(), this.formulario.getRawValue());
    if (aMedias) {
      this.avisar(`Elija «${aMedias}» de la lista: no basta con escribirlo.`, true);
      return;
    }

    const filas = this.detalles();
    if (filas.some((f) => f.tipoConcepto === null || !(Number(f.valor) > 0))) {
      this.avisar('Revise los conceptos: todos necesitan un tipo y un valor mayor que cero.', true);
      return;
    }
    if (!filas.some((f) => esIngresoLiquidacionExterna(f.tipoConcepto!))) {
      this.avisar('Agregue al menos un concepto de ingreso.', true);
      return;
    }
    if (this.neto() <= 0) {
      this.avisar('El neto a pagar debe ser mayor que cero.', true);
      return;
    }

    const v = this.formulario.getRawValue();
    const actual = this.liquidacion();
    const cuerpoLiquidacion: any = {
      ...(actual ? { codigo: actual.codigo } : {}),
      empresa: referenciaEmpresa(),
      tipoIdentificacion: v.tipoIdentificacion,
      identificacion: String(v.identificacion ?? '').trim(),
      apellidos: v.apellidos,
      nombres: v.nombres,
      cargo: v.cargo || null,
      fechaIngreso: v.fechaIngreso || null,
      fechaSalida: v.fechaSalida,
      causalTerminacion: referencia(v.causalTerminacion),
      ultimaRemuneracion: v.ultimaRemuneracion === '' || v.ultimaRemuneracion === null ? null : Number(v.ultimaRemuneracion),
      productoPago: referencia(v.productoPago),
      banco: referencia(v.banco),
      tipoCuenta: extraerCodigo(v.tipoCuenta),
      numeroCuenta: v.numeroCuenta || null,
      observacion: v.observacion || null,
      usuarioRegistro: usuarioSesion(),
    };

    const cuerpo: RegistrarLiquidacionExternaRequest = {
      liquidacion: cuerpoLiquidacion,
      detalles: filas.map((f, i) => ({
        tipoConcepto: f.tipoConcepto!,
        descripcion: f.descripcion || null,
        valor: Number(f.valor),
        orden: i + 1,
      })),
    };

    this.ocupado.set(true);
    const peticion = this.esNuevo()
      ? this.liquidacionExternaService.registrar(cuerpo)
      : this.liquidacionExternaService.actualizar(cuerpo);

    peticion.subscribe({
      next: (guardada) => {
        this.ocupado.set(false);
        this.avisar(this.esNuevo() ? 'Liquidación registrada.' : 'Cambios guardados.');
        if (guardada?.codigo) {
          this.router.navigate(['/menurecursoshumanos/procesos/liquidaciones-excolaboradores', guardada.codigo]);
        }
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo guardar la liquidación.'), true);
      },
    });
  }

  // ─── Circuito de pago ──────────────────────────────────────────────────────

  enviarATesoreria(): void {
    const l = this.liquidacion();
    if (!l || !this.puedeEnviarATesoreria() || this.ocupado()) return;

    const data: ConfirmDialogData = {
      title: 'Enviar a tesorería',
      message: `Se registrará el pago de la liquidación N.º ${l.codigo} en la bandeja de tesorería. Tesorería asigna cuenta y forma de pago; esto no contabiliza todavía.`,
      type: 'warning',
      confirmText: 'Sí, enviar',
      details: [
        { label: 'Colaborador', value: `${l.apellidos ?? ''} ${l.nombres ?? ''}`.trim() },
        { label: 'Neto', value: Number(l.neto ?? 0).toFixed(2) },
      ],
    };

    this.dialog
      .open(ConfirmDialogComponent, { width: '480px', data })
      .afterClosed()
      .subscribe((confirmado: boolean) => {
        if (!confirmado) return;

        const idUsuario = this.appState.getIdUsuario();
        if (!idUsuario) {
          this.avisar('No se pudo determinar el usuario de la sesión.', true);
          return;
        }

        this.ocupado.set(true);
        this.liquidacionExternaService.enviarATesoreria(l.codigo, { idUsuario }).subscribe({
          next: () => {
            this.ocupado.set(false);
            this.avisar('Liquidación enviada a tesorería.');
            this.recargar(l.codigo);
          },
          error: (err) => {
            this.ocupado.set(false);
            this.avisar(mensajeDeError(err, 'No se pudo enviar la liquidación a tesorería.'), true);
          },
        });
      });
  }

  sincronizarPago(): void {
    const l = this.liquidacion();
    if (!l || !this.puedeSincronizarPago() || this.ocupado()) return;

    this.ocupado.set(true);
    this.liquidacionExternaService.sincronizarPago(l.codigo).subscribe({
      next: (actualizada) => {
        this.ocupado.set(false);
        if (Number(actualizada?.estado) === EstadoLiquidacionExterna.PAGADA) {
          this.avisar('Pago confirmado por tesorería. Liquidación pagada.');
        } else {
          this.avisar('Todavía no hay confirmación de tesorería para este pago.');
        }
        this.recargar(l.codigo);
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo actualizar el estado del pago.'), true);
      },
    });
  }

  anular(): void {
    const l = this.liquidacion();
    if (!l || !this.puedeAnular() || this.ocupado()) return;

    const data: MotivoDialogData = {
      titulo: `Anular liquidación N.º ${l.codigo}`,
      advertencia: `Se anulará la liquidación de ${l.apellidos ?? ''} ${l.nombres ?? ''} por ${Number(l.neto ?? 0).toFixed(2)}.`,
      textoConfirmar: 'Sí, anular',
    };

    this.dialog
      .open(MotivoDialogComponent, { width: '520px', data })
      .afterClosed()
      .subscribe((motivo: string | null) => {
        if (!motivo) return;

        const idUsuario = this.appState.getIdUsuario();
        if (!idUsuario) {
          this.avisar('No se pudo determinar el usuario de la sesión.', true);
          return;
        }

        this.ocupado.set(true);
        this.liquidacionExternaService.anular(l.codigo, { idUsuario, motivo }).subscribe({
          next: () => {
            this.ocupado.set(false);
            this.avisar('Liquidación anulada.');
            this.recargar(l.codigo);
          },
          error: (err) => {
            this.ocupado.set(false);
            this.avisar(mensajeDeError(err, 'No se pudo anular la liquidación.'), true);
          },
        });
      });
  }

  /** `POST /rest/rprt/generar` con `modulo: 'rhh'` — mismo mecanismo que `liquidacion-form.descargarActa()`. */
  descargarActa(): void {
    const l = this.liquidacion();
    if (!l || !this.puedeDescargarActa() || this.descargandoActa()) return;

    this.descargandoActa.set(true);
    this.jasperService
      .generar('rhh', ReportesNomina.ACTA_FINIQUITO_EXCOLABORADOR, {
        P_LQEX_CODIGO: l.codigo,
        P_USUARIO: usuarioSesion(),
      })
      .subscribe({
        next: (blob) => {
          this.descargandoActa.set(false);
          guardarArchivo(blob, `acta-finiquito-excolaborador-${l.codigo}.pdf`);
        },
        error: (err) => {
          this.descargandoActa.set(false);
          mensajeReporteFallido(err).then((mensaje) => this.avisar(mensaje, true));
        },
      });
  }

  private recargar(codigo: number): void {
    forkJoin({
      liquidacion: this.liquidacionExternaService.getById(codigo),
      detalles: this.liquidacionExternaService.detalle(codigo).pipe(catchError(() => of([] as DetalleLiquidacionExterna[]))),
    }).subscribe({
      next: ({ liquidacion, detalles }) => {
        this.liquidacion.set(liquidacion);
        this.detalles.set(
          (detalles ?? []).map((d) => ({
            tipoConcepto: d.tipoConcepto,
            descripcion: d.descripcion ?? '',
            valor: d.valor,
          })),
        );
      },
      error: () => undefined,
    });
  }

  // ─── Presentación ──────────────────────────────────────────────────────────

  fecha(valor: any): Date | null {
    if (!valor) return null;
    const f = this.funcionesDatosS.convertirFechaDesdeBackend(valor);
    return f instanceof Date && !Number.isNaN(f.getTime()) ? f : null;
  }

  causalLabel(): string {
    return this.liquidacion()?.causalTerminacion && 'nombre' in (this.liquidacion()!.causalTerminacion as any)
      ? (this.liquidacion()!.causalTerminacion as any).nombre
      : '—';
  }

  productoPagoLabel(): string {
    const p = this.liquidacion()?.productoPago as any;
    return p?.nombre ?? '—';
  }

  bancoLabel(): string {
    const b = this.liquidacion()?.banco as any;
    return b?.nombre ?? '—';
  }

  volver(): void {
    this.router.navigate(['/menurecursoshumanos/procesos/liquidaciones-excolaboradores']);
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(esError, mensaje));
  }
}
