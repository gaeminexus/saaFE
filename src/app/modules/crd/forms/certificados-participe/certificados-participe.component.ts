import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/basics/confirm-dialog/confirm-dialog.component';
import { MotivoDialogComponent, MotivoDialogData } from '../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { FuncionesDatosService, TipoFormatoFechaBackend } from '../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { CertificadoParticipeService } from '../../service/certificado-participe.service';
import {
  Certificado,
  ESTADO_CERTIFICADO,
  GRUPOS_CALIDAD_CERTIFICADO,
  LiquidacionCertificado,
  NOMBRE_TIPO_CERTIFICADO,
  PrecargaCertificado,
  PrestamoCertificado,
  ResultadoEmisionCertificado,
  SolicitudEmisionCertificado,
  TIPO_CERTIFICADO,
  grupoDeCalidad,
} from '../../model/certificado-participe';

/** Claves comunes a los 6 tipos (§4): nunca editables, siempre SISTEMA — se muestran aparte, no
 * como campos "interactivos" del certificado. */
const CLAVES_FIJAS = ['firmante', 'cargo', 'ciudad', 'fuenteDatos'];

type TipoInputCampo = 'texto' | 'numero' | 'fecha' | 'boolean' | 'tipoCuenta';

/** Etiqueta legible y tipo de input por clave conocida (§4). No forma parte del contrato — es
 * solo presentación; si el backend manda una clave que no está acá, se pinta como texto genérico. */
const META_CAMPO: Record<string, { label: string; tipo: TipoInputCampo }> = {
  anioDesde: { label: 'Año desde', tipo: 'numero' },
  fechaLiquidacion: { label: 'Fecha de liquidación', tipo: 'fecha' },
  numeroCredito: { label: 'Número de crédito', tipo: 'numero' },
  productoTexto: { label: 'Producto', tipo: 'texto' },
  monto: { label: 'Monto', tipo: 'numero' },
  fechaPago: { label: 'Fecha de pago', tipo: 'fecha' },
  conceptoDevolucion: { label: 'Concepto de la devolución', tipo: 'texto' },
  tipoCuenta: { label: 'Tipo de cuenta', tipo: 'tipoCuenta' },
  numeroCuenta: { label: 'Número de cuenta', tipo: 'texto' },
  banco: { label: 'Banco', tipo: 'texto' },
  recibioCesantiaPatronal: { label: 'Recibió cesantía patronal', tipo: 'boolean' },
  jubilacionPatronalSinMovimientos: { label: 'Jubilación patronal sin movimientos', tipo: 'boolean' },
  recibePensionMensual: { label: 'Recibe pensión mensual', tipo: 'boolean' },
  fechaCortePension: { label: 'Fecha de corte', tipo: 'fecha' },
};

interface OpcionTipoCertificado {
  tipo: number;
  nombre: string;
}

@Component({
  selector: 'app-certificados-participe',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './certificados-participe.component.html',
  styleUrl: './certificados-participe.component.scss',
})
export class CertificadosParticipeComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private certificadoService = inject(CertificadoParticipeService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  codigoEntidad = 0;
  private returnUrl = '/menucreditos/participe-dash';

  readonly clavesFijas = CLAVES_FIJAS;
  readonly grupos = GRUPOS_CALIDAD_CERTIFICADO;
  readonly opcionesTipo: OpcionTipoCertificado[] = Object.values(TIPO_CERTIFICADO).map((tipo) => ({
    tipo,
    nombre: NOMBRE_TIPO_CERTIFICADO[tipo],
  }));

  tipoSeleccionado = signal<number | null>(null);

  cargandoPrecarga = signal(false);
  error = signal<string>('');
  precarga = signal<PrecargaCertificado | null>(null);

  /** Tipo 3: hay que elegir el préstamo antes de pedir la precarga con datos. */
  prestamoSeleccionado = signal<number | null>(null);
  liquidacionSeleccionada = signal<number | null>(null);

  /** Valor actual de cada clave (arranca en `campo.valor`; el operador lo edita acá). */
  valoresEditados = signal<Record<string, string | number | boolean | null>>({});
  /** null = no tocado, se manda `calidadSistema` tal cual. */
  calidadElegida = signal<number | null>(null);

  emitiendo = signal(false);
  resultadoEmision = signal<ResultadoEmisionCertificado | null>(null);

  cargandoListado = signal(false);
  certificados = signal<Certificado[]>([]);
  anulandoId = signal<number | null>(null);

  readonly ESTADO_CERTIFICADO = ESTADO_CERTIFICADO;
  readonly TIPO_CERTIFICADO = TIPO_CERTIFICADO;

  /** Grupo de calidad preseleccionado: el elegido por el operador, o el que trae calidadSistema. */
  grupoCalidadActual = computed(() => {
    const elegida = this.calidadElegida();
    if (elegida != null) return grupoDeCalidad(elegida);
    return grupoDeCalidad(this.precarga()?.calidadSistema ?? null);
  });

  /** Valor que se manda en `calidad` al emitir. */
  private calidadAEnviar = computed(() => this.calidadElegida() ?? this.precarga()?.calidadSistema ?? null);

  /**
   * Recalculado en el cliente, no el `puedeEmitir` viejo de la precarga: ese se congeló ANTES de
   * que el operador empiece a llenar los MANUAL_REQUERIDO. El backend vuelve a validar todo esto
   * al emitir de todas formas (§5) — esto es solo para no ofrecer un botón que va a rebotar.
   */
  puedeEmitirAhora = computed(() => {
    const p = this.precarga();
    if (!p) return false;
    if (p.bloqueos.length > 0) return false;
    if (this.tipoSeleccionado() === TIPO_CERTIFICADO.NO_ADEUDAR_CREDITO && this.prestamoSeleccionado() == null) return false;
    const valores = this.valoresEditados();
    return Object.entries(p.campos).every(([clave, campo]) => {
      if (campo.origen !== 'MANUAL_REQUERIDO') return true;
      const v = valores[clave];
      return v !== null && v !== undefined && v !== '';
    });
  });

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.codigoEntidad = +(params.get('codigoEntidad') ?? 0);
    this.returnUrl = params.get('returnUrl') || this.returnUrl;
    if (!this.codigoEntidad) {
      this.snackBar.open('No se indicó el partícipe.', 'Cerrar', { duration: 4000 });
      this.volver();
      return;
    }
    this.cargarListado();
  }

  volver(): void {
    this.router.navigateByUrl(this.returnUrl);
  }

  claveLabel(clave: string): string {
    return META_CAMPO[clave]?.label ?? clave;
  }

  claveTipo(clave: string): TipoInputCampo {
    return META_CAMPO[clave]?.tipo ?? 'texto';
  }

  // ══════════════════════ Selección de tipo y precarga ══════════════════════

  seleccionarTipo(tipo: number): void {
    this.tipoSeleccionado.set(tipo);
    this.resultadoEmision.set(null);
    this.error.set('');
    this.precarga.set(null);
    this.prestamoSeleccionado.set(null);
    this.liquidacionSeleccionada.set(null);
    this.calidadElegida.set(null);
    this.valoresEditados.set({});

    // Tipo 3 (§6): la precarga sin idPrestamo trae "prestamos" y campos vacíos — se pide igual,
    // recién con idPrestamo trae los datos.
    this.cargarPrecarga();
  }

  elegirPrestamo(p: PrestamoCertificado): void {
    if (!p.cancelado) return; // los no cancelados se ven pero no se pueden elegir (§6)
    this.prestamoSeleccionado.set(p.idPrestamo);
    this.cargarPrecarga();
  }

  elegirLiquidacion(idLiquidacion: number): void {
    this.liquidacionSeleccionada.set(idLiquidacion);
    this.cargarPrecarga();
  }

  private cargarPrecarga(): void {
    const tipo = this.tipoSeleccionado();
    if (!tipo) return;

    this.cargandoPrecarga.set(true);
    this.error.set('');
    this.certificadoService
      .obtenerPrecarga(this.codigoEntidad, tipo, this.prestamoSeleccionado(), this.liquidacionSeleccionada())
      .subscribe({
        next: (data) => {
          this.cargandoPrecarga.set(false);
          if (!data) {
            this.error.set('No se pudo cargar la precarga del certificado.');
            return;
          }
          this.precarga.set(data);
          const valores: Record<string, string | number | boolean | null> = {};
          for (const [clave, campo] of Object.entries(data.campos)) {
            valores[clave] = campo.valor;
          }
          this.valoresEditados.set(valores);
        },
        error: (err) => {
          this.cargandoPrecarga.set(false);
          this.error.set(err?.mensaje || 'No se pudo cargar la precarga del certificado.');
        },
      });
  }

  actualizarValor(clave: string, valor: string | number | boolean | null): void {
    this.valoresEditados.update((v) => ({ ...v, [clave]: valor }));
  }

  /**
   * `matDatepicker` necesita un `Date` para su `[ngModel]`, no el string "yyyy-MM-dd" que trae
   * `campo.valor` — sin esta conversión el datepicker no muestra ni escribe nada, aunque el
   * signal sí tenga el string (bug real encontrado al probar en navegador).
   */
  valorFecha(clave: string): Date | null {
    return this.funcionesDatos.convertirFechaDesdeBackend(this.valoresEditados()[clave] as string | null);
  }

  actualizarValorFecha(clave: string, fecha: Date | null): void {
    const texto = this.funcionesDatos.formatearFechaParaBackend(fecha, TipoFormatoFechaBackend.SOLO_FECHA);
    this.actualizarValor(clave, texto);
  }

  elegirGrupoCalidad(grupo: { label: string; alternos: number[] }): void {
    this.calidadElegida.set(grupo.alternos[0]);
  }

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  formatMonto(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ══════════════════════ Emisión (§3.2) ══════════════════════

  confirmarEmision(): void {
    const p = this.precarga();
    const tipo = this.tipoSeleccionado();
    if (!p || !tipo || !this.puedeEmitirAhora()) return;

    const datosDialogo: ConfirmDialogData = {
      title: `Emitir certificado — ${p.tipoTexto}`,
      message:
        'El número del certificado no existe hasta confirmar acá: no hay forma de "reservarlo" ni de deshacerlo después. Verifique los datos, en especial los que capturó a mano.',
      confirmText: 'Emitir certificado',
      cancelText: 'Cancelar',
      type: 'warning',
    };

    this.dialog
      .open(ConfirmDialogComponent, { data: datosDialogo, width: '520px', autoFocus: false })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) this.emitir();
      });
  }

  private emitir(): void {
    const p = this.precarga();
    const tipo = this.tipoSeleccionado();
    const calidad = this.calidadAEnviar();
    if (!p || !tipo || calidad == null) return;

    const solicitud: SolicitudEmisionCertificado = {
      idEntidad: this.codigoEntidad,
      tipo,
      idPrestamo: this.prestamoSeleccionado(),
      idLiquidacion: this.liquidacionSeleccionada(),
      calidad,
      campos: this.valoresEditados(),
      usuario: usuarioSesion(),
    };

    this.emitiendo.set(true);
    this.certificadoService.emitir(solicitud).subscribe({
      next: (resultado) => {
        this.emitiendo.set(false);
        if (!resultado) {
          this.snackBar.open('No se pudo emitir el certificado.', 'Cerrar', { duration: 5000 });
          return;
        }
        this.resultadoEmision.set(resultado);
        this.snackBar.open(`Certificado ${resultado.numeroAlterno} emitido.`, 'Cerrar', { duration: 5000 });
        window.open(this.certificadoService.urlPdf(resultado.idCertificado), '_blank');
        this.cargarListado();
      },
      error: (err) => {
        this.emitiendo.set(false);
        this.snackBar.open(err?.mensaje || 'No se pudo emitir el certificado.', 'Cerrar', { duration: 6000 });
      },
    });
  }

  // ══════════════════════ Listado, reimpresión y anulación (§3.3) ══════════════════════

  private cargarListado(): void {
    this.cargandoListado.set(true);
    this.certificadoService.obtenerPorEntidad(this.codigoEntidad).subscribe({
      next: (data) => {
        this.cargandoListado.set(false);
        this.certificados.set(data ?? []);
      },
      error: () => {
        this.cargandoListado.set(false);
        this.snackBar.open('No se pudo cargar el historial de certificados.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  nombreTipoCertificado(tipoCertificado: number): string {
    return NOMBRE_TIPO_CERTIFICADO[tipoCertificado] ?? `Tipo ${tipoCertificado}`;
  }

  /** §3.3, confirmado por el árbitro: objeto Prestamo JPA completo — leer solo idAsoprep/codigo. */
  numeroCreditoDe(cert: Certificado): string | null {
    const prestamo = cert.prestamo;
    if (!prestamo) return null;
    return String(prestamo.idAsoprep ?? prestamo.codigo ?? '—');
  }

  reimprimir(cert: Certificado): void {
    this.abrirPdf(cert.codigo);
  }

  abrirPdf(idCertificado: number): void {
    window.open(this.certificadoService.urlPdf(idCertificado), '_blank');
  }

  puedeAnular(cert: Certificado): boolean {
    return cert.estado === ESTADO_CERTIFICADO.VIGENTE;
  }

  anular(cert: Certificado): void {
    if (!this.puedeAnular(cert)) return;

    const datosDialogo: MotivoDialogData = {
      titulo: `Anular certificado ${cert.numeroAlterno}`,
      advertencia: 'El certificado queda marcado como anulado, no se borra. Se puede reimprimir después y se va a ver como anulado.',
      textoConfirmar: 'Anular certificado',
    };

    this.dialog
      .open(MotivoDialogComponent, { data: datosDialogo, width: '520px', maxWidth: '96vw', autoFocus: false })
      .afterClosed()
      .subscribe((motivo?: string | null) => {
        if (!motivo) return;

        this.anulandoId.set(cert.codigo);
        this.certificadoService.anular(cert.codigo, motivo, usuarioSesion()).subscribe({
          next: (resultado) => {
            this.anulandoId.set(null);
            if (!resultado) {
              this.snackBar.open('No se pudo anular el certificado.', 'Cerrar', { duration: 5000 });
              return;
            }
            this.snackBar.open('Certificado anulado.', 'Cerrar', { duration: 3000 });
            this.cargarListado();
          },
          error: (err) => {
            this.anulandoId.set(null);
            this.snackBar.open(err?.mensaje || 'No se pudo anular el certificado.', 'Cerrar', { duration: 5000 });
          },
        });
      });
  }
}
