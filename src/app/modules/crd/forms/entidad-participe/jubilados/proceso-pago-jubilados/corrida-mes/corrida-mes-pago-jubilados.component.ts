import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { empresaSesionCodigo } from '../../../../../../../shared/services/empresa-sesion';
import { ExportService } from '../../../../../../../shared/services/export.service';
import { usuarioSesion } from '../../../../../../../shared/services/usuario-sesion';
import {
  DetallePagoPension,
  DetallePrevisualizacionPago,
  Participacion,
  ResultadoGeneracionPagos,
  ResultadoPrevisualizacionCorrida,
} from '../../../../../model/pago-pension-complementaria';
import { PagoPensionComplementariaService } from '../../../../../service/pago-pension-complementaria.service';
import {
  ConfirmarGeneracionData,
  ConfirmarGeneracionDialogComponent,
} from './confirmar-generacion-dialog.component';

const MESES = [
  { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' }, { valor: 3, nombre: 'Marzo' },
  { valor: 4, nombre: 'Abril' }, { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
  { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' }, { valor: 9, nombre: 'Septiembre' },
  { valor: 10, nombre: 'Octubre' }, { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
];

/**
 * Pestaña B — «Corrida del mes». Contrato: docs/crd/API-PAGO-PENSION-COMPLEMENTARIA.md §4bis/§6.
 * Diseño: docs/crd/DISENO-PANTALLA-PAGO-JUBILADOS.md §3/§3bis. Patrón copiado de `cierre-cartera`
 * (botón «Previsualizar» separado de «Ejecutar», sin auto-cargar al entrar a la pestaña).
 *
 * El prevuelo YA NO se calcula en el cliente: viene de `POST /pgpc/previsualizarCorrida`, que
 * simula `generarPagosDelMes` con la misma regla del tope (por préstamo, cuotas exigibles) que
 * vive en el backend. Calcularlo acá habría significado cientos de consultas para ~187 jubilados
 * y reimplementar esa regla en TypeScript — dos copias que se desincronizan, y un prevuelo que
 * miente es peor que no tenerlo (§4bis del contrato).
 *
 * ⛔ Estado de participación (§6, decisión del usuario 2026-09-04, reemplaza el bloqueo total de
 * `b631193`): el certificado gobierna la SALIDA de dinero, no el cruce contra el préstamo. El
 * backend manda el campo explícito `participacion` — no se deduce cruzando `tieneCertificado` /
 * `montoADinero` / `montoACruzar`, porque eso se rompe la primera vez que cambie una regla:
 * - `COMPLETA`: nada quedó retenido — entra y suma a los dos totales.
 * - `SOLO_CRUCE`: hubo remanente que no pudo salir (sin certificado/cuenta): entra, cancela deuda,
 *   NO suma a "Total a dinero". Es ACCIONABLE — mismo criterio visual que una "Desviación", nunca
 *   un bloqueo.
 * - `BLOQUEADO`: no participa, con su motivo.
 * - `null`: no es un evento de participación de esta corrida (ya pagado, al día, retroactivo con
 *   0 meses).
 */
@Component({
  selector: 'app-corrida-mes-pago-jubilados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule,
  ],
  templateUrl: './corrida-mes-pago-jubilados.component.html',
  styleUrl: './corrida-mes-pago-jubilados.component.scss',
})
export class CorridaMesPagoJubiladosComponent implements OnInit {
  readonly MESES = MESES;

  private pgpcService = inject(PagoPensionComplementariaService);
  private exportService = inject(ExportService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Contexto de sesión
  idEmpresa: number | null = null;
  private usuario = 'SYSTEM';

  // Selección de período — por defecto, el mes calendario anterior al actual (el caso de uso
  // real: procesar agosto durante septiembre).
  anio: number;
  mes: number;

  previsualizando = signal(false);
  ejecutando = signal(false);

  prevuelo = signal<ResultadoPrevisualizacionCorrida | null>(null);
  errorPrevuelo = signal<string | null>(null);
  /** El texto EXACTO que manda el backend sobre por qué el cruce es estimado — no se reescribe acá. */
  mensajePrevuelo = signal<string | null>(null);

  resultado = signal<ResultadoGeneracionPagos | null>(null);
  mensajeResultado = signal<string | null>(null);
  errorEjecucion = signal<string | null>(null);

  constructor() {
    const hoy = new Date();
    if (hoy.getMonth() === 0) {
      this.anio = hoy.getFullYear() - 1;
      this.mes = 12;
    } else {
      this.anio = hoy.getFullYear();
      this.mes = hoy.getMonth(); // getMonth() es 0-based → mes calendario anterior en 1-based
    }
  }

  ngOnInit(): void {
    this.idEmpresa = empresaSesionCodigo();
    this.usuario = usuarioSesion();
    if (this.idEmpresa == null) {
      this.errorPrevuelo.set('No se pudo determinar la empresa de la sesión. Vuelva a iniciar sesión y reintente.');
    }
    // Sin auto-cargar: igual que `cierre-cartera`, previsualizar es una acción explícita del
    // operador (el cálculo real recorre ~187 jubilados en el servidor, no es gratis).
  }

  get periodoTexto(): string {
    return `${this.nombreMes(this.mes)} ${this.anio}`;
  }

  ocupado(): boolean {
    return this.previsualizando() || this.ejecutando();
  }

  // ===================== Derivados del prevuelo =====================

  get detalle(): DetallePrevisualizacionPago[] {
    return this.prevuelo()?.detalle ?? [];
  }

  get filasCompletas(): DetallePrevisualizacionPago[] {
    return this.detalle.filter((d) => d.participacion === 'COMPLETA');
  }

  get filasSoloCruce(): DetallePrevisualizacionPago[] {
    return this.detalle.filter((d) => d.participacion === 'SOLO_CRUCE');
  }

  get filasBloqueadas(): DetallePrevisualizacionPago[] {
    return this.detalle.filter((d) => d.participacion === 'BLOQUEADO');
  }

  /** Ya pagado este período, al día, o retroactivo sin meses adeudados: no es un bloqueo. */
  get filasSinNovedad(): DetallePrevisualizacionPago[] {
    return this.detalle.filter((d) => d.participacion == null);
  }

  /** Lo que de verdad va a hacer algo si se ejecuta ahora: COMPLETA + SOLO_CRUCE. */
  get cantidadAccionable(): number {
    return this.filasCompletas.length + this.filasSoloCruce.length;
  }

  // ===================== Previsualizar =====================

  previsualizar(): void {
    if (this.ocupado() || this.idEmpresa == null) {
      return;
    }
    this.errorPrevuelo.set(null);
    this.previsualizando.set(true);

    this.pgpcService.previsualizarCorrida(this.idEmpresa, this.anio, this.mes, this.usuario).subscribe((resp) => {
      this.previsualizando.set(false);
      if (resp.exito && resp.resultado) {
        this.prevuelo.set(resp.resultado);
        this.mensajePrevuelo.set(resp.mensaje ?? null);
      } else {
        this.prevuelo.set(null);
        this.mensajePrevuelo.set(null);
        this.errorPrevuelo.set(resp.mensaje ?? 'No se pudo previsualizar la corrida.');
      }
    });
  }

  // ===================== Ejecutar =====================

  ejecutar(): void {
    const res = this.prevuelo();
    if (!res || this.ocupado() || this.idEmpresa == null) {
      return;
    }
    if (this.cantidadAccionable === 0) {
      this.notificar('No hay jubilados listos para pagar en este período.', false);
      return;
    }

    const data: ConfirmarGeneracionData = {
      periodo: this.periodoTexto,
      cantidadAptos: this.cantidadAccionable,
      cantidadBloqueados: res.bloqueados,
      totalACruzarPrestamos: res.totalACruzarPrestamos,
      totalADinero: res.totalADinero,
      totalGeneral: res.totalGeneral,
    };

    this.dialog
      .open(ConfirmarGeneracionDialogComponent, { data, width: '540px' })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) {
          this.ejecutarConfirmado();
        }
      });
  }

  private ejecutarConfirmado(): void {
    if (this.idEmpresa == null) {
      return;
    }
    this.resultado.set(null);
    this.mensajeResultado.set(null);
    this.errorEjecucion.set(null);
    this.ejecutando.set(true);

    this.pgpcService.generarPagosDelMes(this.idEmpresa, this.anio, this.mes, this.usuario).subscribe((resp) => {
      this.ejecutando.set(false);
      // ⛔ Un 200 no significa que salió bien: hay que leer resp.exito y, adentro, conError/errores.
      if (resp.exito && resp.resultado) {
        this.resultado.set(resp.resultado);
        this.mensajeResultado.set(resp.mensaje ?? null);
        const conError = resp.resultado.conError ?? 0;
        this.notificar(
          conError > 0
            ? `Corrida generada con ${conError} error(es). Revise el detalle.`
            : 'Corrida generada correctamente.',
          conError === 0,
        );
      } else {
        this.errorEjecucion.set(resp.mensaje ?? 'No se pudo generar la corrida.');
        this.notificar(resp.mensaje ?? 'No se pudo generar la corrida.', false);
      }
    });
  }

  // ===================== Derivados del resultado ejecutado =====================

  /**
   * ⛔ Preferir el campo explícito `participacion` (§6) sobre la inferencia vieja
   * (`generoOrdenPago === false && valorCruzadoAPrestamo > 0`): un backend que todavía no mande
   * `participacion` sigue funcionando con la inferencia como respaldo.
   */
  esDesviacion(d: DetallePagoPension): boolean {
    if (d.participacion) {
      return d.participacion === 'SOLO_CRUCE';
    }
    return d.generoOrdenPago === false && (d.valorCruzadoAPrestamo ?? 0) > 0;
  }

  esError(d: DetallePagoPension): boolean {
    return d.estado === 'ERROR';
  }

  claseEstadoDetalle(d: DetallePagoPension): string {
    if (this.esError(d)) return 'badge-error';
    if (this.esDesviacion(d)) return 'badge-desviacion';
    if (d.estado === 'YA_EXISTIA') return 'badge-ya-existia';
    return 'badge-generado';
  }

  // ===================== Presentación de `participacion` (prevuelo) =====================

  claseParticipacion(p: Participacion | null | undefined): string {
    switch (p) {
      case 'COMPLETA':
        return 'badge-listo';
      case 'SOLO_CRUCE':
        return 'badge-desviacion';
      case 'BLOQUEADO':
        return 'badge-bloqueado';
      default:
        return 'badge-ya-existia';
    }
  }

  textoParticipacion(p: Participacion | null | undefined): string {
    switch (p) {
      case 'COMPLETA':
        return 'Completa';
      case 'SOLO_CRUCE':
        return 'Solo cruce';
      case 'BLOQUEADO':
        return 'Bloqueado';
      default:
        return 'Sin novedad';
    }
  }

  private notificar(mensaje: string, exito: boolean): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: exito ? 5000 : 9000,
      panelClass: [exito ? 'success-snackbar' : 'error-snackbar'],
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
    });
  }

  nombreMes(mes: number): string {
    return MESES.find((m) => m.valor === mes)?.nombre ?? String(mes);
  }

  // ===================== Exportar CSV =====================
  // Ninguno de los dos exports trae fechas-arreglo del backend: ni `DetallePrevisualizacionPago`
  // ni `DetallePagoPension` tienen campo de fecha — esas viven solo en `PagoPensionComplementaria`,
  // que usa la pestaña «Seguimiento», no esta. Los importes van con `ExportService.exportToCSV`,
  // que ya usa punto decimal sin separador de miles (`toFixed(2)`) — mismo patrón que el módulo.

  private periodoArchivo(): string {
    return `${this.anio}-${String(this.mes).padStart(2, '0')}`;
  }

  exportarPrevueloCSV(): void {
    const detalle = this.detalle;
    if (detalle.length === 0) {
      return;
    }
    const filas = detalle.map((d) => ({
      idEntidad: d.idEntidad,
      nombre: d.nombre ?? '',
      mesesAdeudados: d.mesesAdeudados,
      montoACruzar: d.montoACruzar,
      montoADinero: d.montoADinero,
      total: d.total,
      participacion: this.textoParticipacion(d.participacion),
      motivoBloqueo: d.motivoBloqueo ?? '',
    }));
    this.exportService.exportToCSV(
      filas,
      `corrida-jubilados-prevuelo-${this.periodoArchivo()}`,
      ['Entidad', 'Nombre', 'Meses adeudados', 'Monto a cruzar', 'Monto a dinero', 'Total', 'Participación', 'Motivo bloqueo'],
      ['idEntidad', 'nombre', 'mesesAdeudados', 'montoACruzar', 'montoADinero', 'total', 'participacion', 'motivoBloqueo'],
    );
  }

  exportarResultadoCSV(): void {
    const res = this.resultado();
    if (!res || res.detalle.length === 0) {
      return;
    }
    const filas = res.detalle.map((d) => ({
      idEntidad: d.idEntidad,
      nombre: d.nombre ?? '',
      valorPension: d.valorPension ?? '',
      valorSeguroSalud: d.valorSeguroSalud ?? '',
      valorCruzadoAPrestamo: d.valorCruzadoAPrestamo ?? '',
      valorOrdenPago: d.valorOrdenPago ?? '',
      estado: this.esDesviacion(d) ? 'Desviación' : d.estado,
      mensaje: d.mensaje || (this.esDesviacion(d) ? 'Cruzado íntegro contra préstamo: no generó orden de pago.' : ''),
    }));
    this.exportService.exportToCSV(
      filas,
      `corrida-jubilados-resultado-${this.periodoArchivo()}`,
      ['Entidad', 'Nombre', 'Pensión', 'Seguro', 'Cruzado a préstamo', 'Orden de pago', 'Estado', 'Mensaje'],
      ['idEntidad', 'nombre', 'valorPension', 'valorSeguroSalud', 'valorCruzadoAPrestamo', 'valorOrdenPago', 'estado', 'mensaje'],
    );
  }

  money(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  trackEntidad(_: number, d: DetallePrevisualizacionPago): number {
    return d.idEntidad;
  }

  trackDetalle(_: number, d: DetallePagoPension): number {
    return d.idPago ?? d.idEntidad;
  }
}
