import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Observable } from 'rxjs';

import { FirmaContratoService } from '../../../../service/firma-contrato.service';
import { Entidad } from '../../../../model/entidad';
import { ESTADO_FIRMA, FirmaContrato, RespuestaFirma, TramiteFirma } from '../../../../model/firma-contrato';
import { FuncionesDatosService } from '../../../../../../shared/services/funciones-datos.service';
import { EnviarFirmaDialogComponent, EnviarFirmaDialogData } from './enviar-firma-dialog.component';

const ESTADOS: Record<number, { texto: string; clase: string }> = {
  [ESTADO_FIRMA.PENDIENTE_ENVIO]: { texto: 'Pendiente de envío', clase: 'pendiente' },
  [ESTADO_FIRMA.ENVIADO]: { texto: 'Enviado', clase: 'enviado' },
  [ESTADO_FIRMA.FIRMADO]: { texto: 'Firmado', clase: 'firmado' },
  [ESTADO_FIRMA.RECHAZADO]: { texto: 'Rechazado', clase: 'rechazado' },
  [ESTADO_FIRMA.VENCIDO]: { texto: 'Vencido', clase: 'vencido' },
  [ESTADO_FIRMA.ANULADO]: { texto: 'Anulado', clase: 'anulado' },
};

/** Códigos del backend que se muestran en texto claro; el resto se muestra tal cual vino. */
const MENSAJES_POR_CODIGO: Record<string, string> = {
  FORMATO_CONTRATO_PENDIENTE: 'El formato del contrato todavía no está disponible.',
  PROVEEDOR_NO_DISPONIBLE: 'El servicio de firma de Security Data no está disponible todavía.',
  PROVEEDOR_NO_CONFIGURADO: 'Falta configurar el servicio de firma electrónica en el servidor.',
  REPRESENTANTE_SIN_FIRMA: 'Security Data todavía no tiene cargada la firma del representante legal de ASOPREP.',
};

/**
 * Tarjeta «Firma electrónica» del contrato de adhesión. Se envía el PDF y los datos del partícipe a
 * Security Data, que firma por el partícipe y por el representante legal y devuelve el PDF firmado por
 * los dos: aquí no hay gestión de firmantes ni de enlaces. El envío puede volver ya FIRMADO o quedar
 * ENVIADO; la pantalla siempre toma el trámite de lo que responde el servidor.
 */
@Component({
  selector: 'app-firma-electronica-contrato',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule,
    MatInputModule, MatProgressSpinnerModule, MatSnackBarModule,
  ],
  templateUrl: './firma-electronica-contrato.component.html',
  styleUrls: ['./firma-electronica-contrato.component.scss'],
})
export class FirmaElectronicaContratoComponent implements OnInit {
  private servicio = inject(FirmaContratoService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private funcionesDatos = inject(FuncionesDatosService);

  readonly idContrato = input.required<number>();
  readonly entidad = input<Entidad | null>(null);

  readonly ESTADO_FIRMA = ESTADO_FIRMA;

  cargando = signal(false);
  errorCarga = signal('');
  historial = signal<TramiteFirma[]>([]);
  /** Operación en curso ('enviar', 'reintentar', 'actualizar', 'anular', 'original', 'firmado'). */
  operando = signal<string | null>(null);
  /** Mensaje del último intento, en texto claro (no es un error genérico). */
  aviso = signal<{ texto: string; ok: boolean } | null>(null);
  mostrandoAnular = signal(false);
  motivoAnulacion = signal('');
  historialAbierto = signal(false);

  /** El trámite más reciente; es el único que puede estar vivo. */
  actual = computed(() => this.historial()[0] ?? null);
  anteriores = computed(() => this.historial().slice(1));
  estadoActual = computed(() => this.actual()?.firma.estado ?? null);
  vivo = computed(() => {
    const e = this.estadoActual();
    return e === ESTADO_FIRMA.PENDIENTE_ENVIO || e === ESTADO_FIRMA.ENVIADO;
  });
  puedeEnviar = computed(() => !this.vivo() && this.estadoActual() !== ESTADO_FIRMA.FIRMADO);

  // ---- datos del partícipe que se mandan ----
  cedula = computed(() => (this.entidad()?.numeroIdentificacion || '').trim());
  nombres = computed(() => (this.entidad()?.razonSocial || '').trim());
  /** Correo personal o, si no hay, el institucional (misma regla del backend). */
  correo = computed(() => (this.entidad()?.correoPersonal || '').trim() || (this.entidad()?.correoInstitucional || '').trim());
  celular = computed(() => (this.entidad()?.movil || '').trim());
  faltantes = computed(() => {
    const f: string[] = [];
    if (!this.cedula()) f.push('la cédula');
    if (!this.nombres()) f.push('el nombre');
    if (!this.correo()) f.push('el correo');
    if (!this.celular()) f.push('el celular');
    return f;
  });
  /** El backend exige cédula, nombre y al menos correo o celular: sin eso rechaza el envío. */
  sinContacto = computed(() => !this.cedula() || !this.nombres() || (!this.correo() && !this.celular()));

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.servicio.porContrato(this.idContrato()).subscribe({
      next: (lista) => {
        this.historial.set(lista);
        this.cargando.set(false);
      },
      error: (msg) => {
        this.errorCarga.set(typeof msg === 'string' ? msg : 'No se pudo consultar la firma electrónica del contrato');
        this.cargando.set(false);
      },
    });
  }

  // ══════════════════════ Presentación ══════════════════════

  textoEstado(f: FirmaContrato): string {
    return ESTADOS[f.estado]?.texto ?? `Estado ${f.estado}`;
  }

  claseEstado(f: FirmaContrato): string {
    return ESTADOS[f.estado]?.clase ?? 'pendiente';
  }

  fecha(valor: unknown): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(valor);
    return d ? this.funcionesDatos.formatoFecha(d, FuncionesDatosService.FECHA_HORA) || '—' : '—';
  }

  /**
   * Traduce los códigos conocidos («CODIGO: texto» o el código solo) y deja el resto como vino, sin el prefijo.
   * FIRMANTE_RECHAZADO muestra el motivo de Security Data tal cual; FIRMANTE_REQUIERE_DATOS antepone el aviso a la lista.
   */
  traducir(texto: string | null | undefined, codigo?: string | null): string {
    const base = (texto || '').trim();
    const es = (cod: string) => codigo === cod || base.startsWith(cod);
    const detalle = base.replace(/^[A-Z_]{4,}:\s*/, '');
    if (es('FIRMANTE_REQUIERE_DATOS')) {
      return `Security Data pide datos adicionales del socio:${detalle ? ' ' + detalle : ''}`;
    }
    if (es('FIRMANTE_RECHAZADO')) {
      return detalle || 'Security Data rechazó los datos del socio.';
    }
    for (const cod of Object.keys(MENSAJES_POR_CODIGO)) {
      if (es(cod)) return MENSAJES_POR_CODIGO[cod];
    }
    return detalle || 'No se pudo completar la operación.';
  }

  // ══════════════════════ Acciones ══════════════════════

  enviarAFirmar(): void {
    this.pedirCodigoDactilar('Enviar a firmar', (codigo) =>
      this.ejecutar('enviar', this.servicio.enviar(this.idContrato(), codigo)));
  }

  reintentar(): void {
    const f = this.actual()?.firma;
    if (!f) return;
    this.pedirCodigoDactilar('Reintentar envío', (codigo) =>
      this.ejecutar('reintentar', this.servicio.reintentar(f.codigo, codigo)));
  }

  /** El código dactilar no se guarda: se pide cada vez y solo vive mientras dura el diálogo. */
  private pedirCodigoDactilar(titulo: string, alConfirmar: (codigo: string) => void): void {
    const datos: EnviarFirmaDialogData = {
      titulo,
      nombres: this.nombres(),
      cedula: this.cedula(),
      correo: this.correo(),
      celular: this.celular(),
    };
    this.dialog
      .open<EnviarFirmaDialogComponent, EnviarFirmaDialogData, string | null>(EnviarFirmaDialogComponent, {
        data: datos, width: '560px', autoFocus: 'input', disableClose: true,
      })
      .afterClosed()
      .subscribe((codigo) => {
        if (codigo) alConfirmar(codigo);
      });
  }

  actualizar(): void {
    const f = this.actual()?.firma;
    if (f) this.ejecutar('actualizar', this.servicio.actualizar(f.codigo));
  }

  abrirAnular(): void {
    this.motivoAnulacion.set('');
    this.mostrandoAnular.set(true);
  }

  cancelarAnular(): void {
    this.mostrandoAnular.set(false);
  }

  confirmarAnular(): void {
    const f = this.actual()?.firma;
    const motivo = this.motivoAnulacion().trim();
    if (!f || !motivo) return;
    this.ejecutar('anular', this.servicio.anular(f.codigo, motivo), () => this.mostrandoAnular.set(false));
  }

  descargar(f: FirmaContrato, tipo: 'ORIGINAL' | 'FIRMADO'): void {
    this.operando.set(tipo === 'ORIGINAL' ? 'original' : 'firmado');
    this.servicio.descargar(f.codigo, tipo).subscribe({
      next: (blob) => {
        this.operando.set(null);
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = `contrato-adhesion-${f.idContrato}-${tipo === 'ORIGINAL' ? 'original' : 'firmado'}.pdf`;
        enlace.click();
        URL.revokeObjectURL(url);
      },
      error: (msg) => {
        this.operando.set(null);
        this.snackBar.open(this.traducir(typeof msg === 'string' ? msg : '', null), 'Cerrar', { duration: 8000 });
      },
    });
  }

  /**
   * Toda operación POST responde el mismo cuerpo. Con éxito o sin él, si trae `tramite` se refresca el
   * historial con lo que dice el servidor (en un 502 el trámite queda guardado con su error); si no, se
   * vuelve a consultar. El mensaje se muestra en texto claro.
   */
  private ejecutar(operacion: string, llamada: Observable<RespuestaFirma>, alTerminar?: () => void): void {
    this.operando.set(operacion);
    this.aviso.set(null);
    llamada.subscribe((resp) => {
      this.operando.set(null);
      alTerminar?.();
      const texto = resp.exito ? (resp.mensaje || 'Operación realizada.') : this.traducir(resp.mensaje, resp.error);
      this.aviso.set({ texto, ok: resp.exito });
      this.snackBar.open(texto, 'Cerrar', { duration: resp.exito ? 4000 : 10000 });
      if (resp.tramite?.firma) this.reemplazarTramite(resp.tramite);
      else this.cargar();
    });
  }

  private reemplazarTramite(t: TramiteFirma): void {
    const lista = this.historial();
    const i = lista.findIndex((x) => x.firma.codigo === t.firma.codigo);
    if (i >= 0) {
      const copia = [...lista];
      copia[i] = t;
      this.historial.set(copia);
    } else {
      this.historial.set([t, ...lista]);
    }
  }
}
