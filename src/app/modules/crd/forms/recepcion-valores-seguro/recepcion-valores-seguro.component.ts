import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { MotivoDialogComponent, MotivoDialogData } from '../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { usuarioSesion } from '../../../../shared/services/usuario-sesion';
import { RespaldoCobroComponent } from '../../dialog/pagos/respaldo-cobro.component';
import { Entidad } from '../../model/entidad';
import { RVSG_APROBADO, RecepcionValorSeguro, nombreEstadoRecepcion } from '../../model/recepcion-valor-seguro';
import { TipoAporte } from '../../model/tipo-aporte';
import { ComprobanteCobroService } from '../../service/comprobante-cobro.service';
import { EntidadService } from '../../service/entidad.service';
import { RecepcionValorSeguroService } from '../../service/recepcion-valor-seguro.service';
import { TipoAporteService } from '../../service/tipo-aporte.service';

/** Nombre exacto del tipo de aporte que crea crd/sql/231. Se resuelve por nombre, no por código. */
const NOMBRE_TIPO_VALORES_SEGURO = 'VALOR DE SEGURO POR ENTREGAR A BENEFICIARIOS';

/**
 * Registro de una recepción de valores de seguro (sepelio): el dinero ya entró a una cuenta de
 * ASOPREP y hay que dejarlo registrado a nombre del partícipe.
 * Contrato: docs/crd/API-RECEPCION-VALORES-SEGURO.md §3 y §4 (fase 1).
 *
 * Registrar NO mueve nada: la recepción queda pendiente y recién cuando contabilidad la aprueba
 * (Bandeja de Contabilidad) se genera el asiento y el valor entra a la cuenta del partícipe.
 * Beneficiarios, porcentajes y pago son la fase 2 y no están en esta pantalla.
 */
@Component({
  selector: 'app-recepcion-valores-seguro',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, RespaldoCobroComponent],
  templateUrl: './recepcion-valores-seguro.component.html',
  styleUrl: './recepcion-valores-seguro.component.scss',
})
export class RecepcionValoresSeguroComponent {
  private entidadService = inject(EntidadService);
  private tipoAporteService = inject(TipoAporteService);
  private recepciones = inject(RecepcionValorSeguroService);
  private comprobantes = inject(ComprobanteCobroService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private funcionesDatos = inject(FuncionesDatosService);

  /** Bloque de respaldo: cuenta ASOPREP donde entró el dinero, referencia y comprobante. */
  respaldo = viewChild(RespaldoCobroComponent);

  readonly hoy = new Date();

  // ---------- búsqueda del partícipe ----------
  criterioIdentificacion = '';
  criterioRolPetro = '';
  criterioNombre = '';
  buscando = signal(false);
  resultados = signal<Entidad[]>([]);
  mostrandoResultados = signal(false);
  entidadSeleccionada = signal<Entidad | null>(null);

  // ---------- tipo de aporte ----------
  tiposAporte = signal<TipoAporte[]>([]);
  cargandoTipos = signal(false);
  tipoSeleccionado = signal<TipoAporte | null>(null);
  filtroTipo = signal('');
  /** `true` si el tipo «valores de seguro» no está en TPAP (el script 231 todavía no corrió). */
  tipoSeguroNoConfigurado = signal(false);

  /** Combo alimentado desde una tabla: se busca por nombre y por código (CLAUDE.md). */
  tiposFiltrados = computed(() => {
    const texto = this.filtroTipo().trim().toLowerCase();
    const lista = this.tiposAporte();
    // Con un tipo ya elegido el campo muestra su texto: se ofrecen todos para poder cambiarlo.
    if (!texto || texto === this.textoTipo(this.tipoSeleccionado()).toLowerCase()) return lista;
    return lista.filter(
      (t) => (t.nombre ?? '').toLowerCase().includes(texto) || String(t.codigo).includes(texto)
    );
  });

  // ---------- datos de la recepción ----------
  valorTexto = signal('');
  fecha = signal<Date>(new Date());
  observacion = '';

  // ---------- recepciones ya registradas del partícipe ----------
  historial = signal<RecepcionValorSeguro[]>([]);
  cargandoHistorial = signal(false);
  historialFallido = signal(false);
  anulando = signal(false);
  errorHistorial = signal<string | null>(null);

  registrando = signal(false);
  errorMensaje = signal<string | null>(null);
  ultimoRegistro = signal<string | null>(null);

  valor = computed(() => this.parseMoneda(this.valorTexto()));

  fechaValida = computed(() => {
    const fecha = this.fecha();
    if (!fecha || isNaN(fecha.getTime())) return false;
    const limite = new Date(this.hoy);
    limite.setHours(23, 59, 59, 999);
    return fecha.getTime() <= limite.getTime();
  });

  /** Qué falta para poder registrar. Se muestra junto al botón. */
  faltantes = computed<string[]>(() => {
    const motivos: string[] = [];
    if (!this.entidadSeleccionada()) motivos.push('busque y elija al partícipe');
    if (!this.tipoSeleccionado()) motivos.push('elija el tipo de aporte');
    if (this.valor() <= 0.004) motivos.push('ingrese el valor recibido');
    if (!this.fechaValida()) motivos.push('indique la fecha de recepción (no puede ser futura)');
    if (this.entidadSeleccionada() && !(this.respaldo()?.completo() ?? false)) {
      motivos.push('complete el respaldo (cuenta, referencia y comprobante)');
    }
    return motivos;
  });

  puedeRegistrar = computed(() => !this.registrando() && this.faltantes().length === 0);

  constructor() {
    this.cargarTipos();
  }

  // ================= tipos de aporte =================

  private cargarTipos(): void {
    this.cargandoTipos.set(true);
    this.tipoAporteService.getAll().subscribe({
      next: (tipos) => {
        this.cargandoTipos.set(false);
        this.tiposAporte.set([...(tipos ?? [])].sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '')));
        this.preseleccionarTipoSeguro();
      },
      error: () => {
        this.cargandoTipos.set(false);
        this.snackBar.open('No se pudieron cargar los tipos de aporte.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  /**
   * Preselecciona el tipo de valores de seguro por su NOMBRE (lo fija crd/sql/231), nunca por un
   * código numérico. Sigue editable: el mismo circuito sirve para otros valores de seguro.
   * Si no existe todavía, no se preselecciona nada y se avisa sin bloquear.
   */
  private preseleccionarTipoSeguro(): void {
    if (!this.tiposAporte().length) return;
    const buscado = NOMBRE_TIPO_VALORES_SEGURO.trim().toLowerCase();
    const tipo = this.tiposAporte().find((t) => (t.nombre ?? '').trim().toLowerCase() === buscado);
    this.tipoSeguroNoConfigurado.set(!tipo);
    if (tipo) this.onTipoElegido(tipo);
  }

  textoTipo(tipo: TipoAporte | null): string {
    return tipo ? `${tipo.codigo} · ${tipo.nombre}` : '';
  }

  onTipoEscrito(texto: string): void {
    this.filtroTipo.set(texto);
    // Si el operador edita el texto, la selección anterior deja de valer.
    const elegido = this.tipoSeleccionado();
    if (elegido && texto !== this.textoTipo(elegido)) this.tipoSeleccionado.set(null);
  }

  onTipoElegido(tipo: TipoAporte): void {
    this.tipoSeleccionado.set(tipo);
    this.filtroTipo.set(this.textoTipo(tipo));
  }

  // ================= búsqueda del partícipe =================

  buscar(): void {
    const criterios: DatosBusqueda[] = [];

    if (this.criterioIdentificacion.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'numeroIdentificacion', this.criterioIdentificacion.trim(), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    } else if (this.criterioRolPetro.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.LONG, 'rolPetroComercial', this.criterioRolPetro.trim(), TipoComandosBusqueda.IGUAL);
      criterios.push(c);
    } else if (this.criterioNombre.trim()) {
      const c = new DatosBusqueda();
      c.asignaUnCampoSinTrunc(TipoDatosBusqueda.STRING, 'razonSocial', this.criterioNombre.trim(), TipoComandosBusqueda.LIKE);
      criterios.push(c);
    } else {
      this.snackBar.open('Ingrese al menos un criterio de búsqueda.', 'Cerrar', { duration: 3000 });
      return;
    }

    this.buscando.set(true);
    this.entidadService.selectByCriteria(criterios).subscribe({
      next: (entidades) => {
        this.buscando.set(false);
        this.resultados.set(entidades ?? []);
        this.mostrandoResultados.set(true);
        this.entidadSeleccionada.set(null);
        if (!entidades || entidades.length === 0) {
          this.snackBar.open('No se encontraron coincidencias.', 'Cerrar', { duration: 3000 });
        }
      },
      error: () => {
        this.buscando.set(false);
        this.snackBar.open('Ocurrió un error al buscar. Intente nuevamente.', 'Cerrar', { duration: 4000 });
      },
    });
  }

  seleccionarEntidad(entidad: Entidad): void {
    this.entidadSeleccionada.set(entidad);
    this.mostrandoResultados.set(false);
    this.errorMensaje.set(null);
    this.errorHistorial.set(null);
    this.cargarHistorial(entidad.codigo);
  }

  // ================= recepciones del partícipe y anulación =================

  private cargarHistorial(idEntidad: number): void {
    this.historial.set([]);
    this.historialFallido.set(false);
    this.cargandoHistorial.set(true);
    this.recepciones.porEntidad(idEntidad).subscribe((lista) => {
      // Se descarta la respuesta si el operador ya cambió de partícipe.
      if (this.entidadSeleccionada()?.codigo !== idEntidad) return;
      this.cargandoHistorial.set(false);
      this.historialFallido.set(lista === null);
      this.historial.set(
        [...(lista ?? [])].sort((a, b) => b.codigo - a.codigo)
      );
    });
  }

  /**
   * Anular no es cosmético: reversa el aporte del partícipe y anula el asiento. Pide confirmación con
   * motivo obligatorio. Si el partícipe ya usó ese dinero el servidor responde 409 y ese mensaje se
   * muestra tal cual: es la respuesta correcta, no un error del sistema.
   */
  anular(recepcion: RecepcionValorSeguro): void {
    if (this.anulando() || recepcion.estado !== RVSG_APROBADO) return;

    const data: MotivoDialogData = {
      titulo: 'Anular recepción de seguro',
      advertencia:
        `Se reversa el aporte de ${this.formatMoneda(recepcion.valor)} del partícipe y se anula el asiento contable. ` +
        'Si el partícipe ya usó ese dinero (por ejemplo, si se le devolvió), el sistema no permitirá anularla. Indique el motivo.',
      textoConfirmar: 'Anular',
    };

    this.dialog
      .open(MotivoDialogComponent, { width: '520px', data })
      .afterClosed()
      .subscribe((motivo?: string | null) => {
        if (!motivo) return;
        this.anulando.set(true);
        this.errorHistorial.set(null);
        this.recepciones.anular(recepcion.codigo, { usuario: usuarioSesion(), motivo }).subscribe((resp) => {
          this.anulando.set(false);
          if (!resp.exito) {
            this.errorHistorial.set(`NO se anuló la recepción. ${resp.mensaje ?? ''}`.trim());
            return;
          }
          this.snackBar.open('Recepción anulada: se reversó el aporte y el asiento.', 'Cerrar', { duration: 5000 });
          const entidad = this.entidadSeleccionada();
          if (entidad) this.cargarHistorial(entidad.codigo);
        });
      });
  }

  nombreEstado = nombreEstadoRecepcion;
  readonly RVSG_APROBADO = RVSG_APROBADO;

  formatFecha(fecha: unknown): string {
    return this.funcionesDatos.formatoFecha(fecha, 2) || '—';
  }

  volverABuscar(): void {
    this.entidadSeleccionada.set(null);
    this.mostrandoResultados.set(this.resultados().length > 0);
  }

  // ================= registrar =================

  onValorBlur(): void {
    const v = Math.max(this.valor(), 0);
    this.valorTexto.set(v > 0.004 ? this.formatMoneda(v) : '');
  }

  /**
   * Primero se archiva el comprobante —su ruta viaja dentro del request— y recién con el archivo en
   * el servidor se registra la recepción. Si la subida falla no se toca nada; si el registro falla,
   * el comprobante ya subido se descarta para no dejarlo huérfano.
   */
  registrar(): void {
    if (!this.puedeRegistrar()) return;

    const entidad = this.entidadSeleccionada()!;
    const tipo = this.tipoSeleccionado()!;
    const datosRespaldo = this.respaldo()?.datos();
    const fecha = this.recepciones.formatearFecha(this.fecha());

    if (!datosRespaldo?.cuenta || !datosRespaldo.archivo || !fecha) {
      this.errorMensaje.set('Faltan datos del respaldo de la recepción. Revise el formulario.');
      return;
    }

    this.errorMensaje.set(null);
    this.registrando.set(true);

    const valor = +this.valor().toFixed(2);
    const archivo = datosRespaldo.archivo;
    const cuenta = datosRespaldo.cuenta;

    this.comprobantes
      .archivar(archivo, `CRD/SEGUROS/RECEPCIONES/${entidad.codigo}`, String(entidad.codigo))
      .subscribe((archivado) => {
        if (archivado.error || !archivado.ruta) {
          this.registrando.set(false);
          this.errorMensaje.set(this.comprobantes.mensajeDeFallo(archivado.error ?? ''));
          return;
        }

        const ruta = archivado.ruta;
        this.recepciones
          .registrar({
            idEntidad: entidad.codigo,
            idTipoAporte: tipo.codigo,
            valor,
            fecha,
            idCuentaBancaria: cuenta.codigo,
            referencia: datosRespaldo.referencia,
            rutaRespaldo: ruta,
            observacion: this.observacion.trim() || null,
            usuario: usuarioSesion(),
          })
          .subscribe((resp) => {
            this.registrando.set(false);
            if (!resp.exito) {
              this.errorMensaje.set(`NO se registró la recepción. ${resp.mensaje ?? ''}`.trim());
              this.comprobantes.descartar(ruta);
              return;
            }
            this.ultimoRegistro.set(
              `Recepción de ${this.formatMoneda(valor)} de ${entidad.razonSocial} registrada. ` +
                'Queda pendiente: el dinero entra a la cuenta del partícipe cuando contabilidad la apruebe.'
            );
            this.limpiarFormulario();
          });
      });
  }

  private limpiarFormulario(): void {
    this.entidadSeleccionada.set(null);
    this.resultados.set([]);
    this.mostrandoResultados.set(false);
    this.criterioIdentificacion = '';
    this.criterioRolPetro = '';
    this.criterioNombre = '';
    this.tipoSeleccionado.set(null);
    this.filtroTipo.set('');
    this.preseleccionarTipoSeguro();
    this.valorTexto.set('');
    this.fecha.set(new Date());
    this.observacion = '';
    this.errorMensaje.set(null);
  }

  // ================= utilidades =================

  formatMoneda(n: number | null | undefined): string {
    return '$' + (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  private parseMoneda(texto: string | null | undefined): number {
    if (!texto) return 0;
    const n = parseFloat(String(texto).replace(/[^0-9.-]/g, ''));
    return isNaN(n) ? 0 : n;
  }
}
