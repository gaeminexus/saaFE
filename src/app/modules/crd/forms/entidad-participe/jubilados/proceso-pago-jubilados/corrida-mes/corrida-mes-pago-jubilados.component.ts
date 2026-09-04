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
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { DatosBusqueda } from '../../../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { empresaSesionCodigo } from '../../../../../../../shared/services/empresa-sesion';
import { usuarioSesion } from '../../../../../../../shared/services/usuario-sesion';
import { CuentaBancariaParticipe } from '../../../../../model/cuenta-bancaria-participe';
import { Entidad } from '../../../../../model/entidad';
import { DetallePagoPension, ResultadoGeneracionPagos } from '../../../../../model/pago-pension-complementaria';
import { SaldoAporte } from '../../../../../model/pagos/operaciones-pago';
import { RespuestaPago } from '../../../../../model/pagos/respuesta-pago';
import { ValorPagoPensionComplementaria } from '../../../../../model/valor-pago-pension-complementaria';
import { CuentaBancariaParticipeService } from '../../../../../service/cuenta-bancaria-participe.service';
import { OperacionesPagoPrestamoService } from '../../../../../service/operaciones-pago-prestamo.service';
import { PagoPensionComplementariaService } from '../../../../../service/pago-pension-complementaria.service';
import { ValorPagoPensionComplementariaService } from '../../../../../service/valor-pago-pension-complementaria.service';
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

const ESTADO_VPPC_ACTIVO = 1;
const ESTADO_CNBP_ACTIVO = 1;

type MotivoBloqueo =
  | 'Sin cuenta bancaria activa'
  | 'Sin certificado bancario'
  | 'Saldo insuficiente'
  | 'Ya pagado este período';

interface PrevueloItem {
  entidad: Entidad;
  valorTotal: number;
  tieneCuenta: boolean;
  /** `null` = no se pudo verificar (ver `avisoCertificados`); en ese caso NO bloquea. */
  tieneCertificado: boolean | null;
  saldoAporte: number;
  saldoSuficiente: boolean;
  yaPagado: boolean;
  listo: boolean;
  motivos: MotivoBloqueo[];
}

/**
 * Pestaña B — «Corrida del mes». Contrato: docs/crd/API-PAGO-PENSION-COMPLEMENTARIA.md. Diseño:
 * docs/crd/DISENO-PANTALLA-PAGO-JUBILADOS.md §3/§3bis. Patrón copiado de `cierre-cartera`.
 *
 * El prevuelo es enteramente client-side (no hay endpoint de previsualización en el backend):
 * cruza VPPC activas + saldo del aporte tipo pensión complementaria + cuenta bancaria activa +
 * certificado + `porPeriodo` (para "ya pagado"). El único endpoint que muta algo es
 * `generarPagosDelMes`, disparado solo desde "Ejecutar" con confirmación previa.
 *
 * Verificación de certificado: en vez de repetir el cruce crudo TPDJ→CNBP→ADJN del §4 del
 * diseño, se usa `CuentaBancariaParticipeService.obtenerCertificado()` (GET
 * /cnbp/{id}/certificado, ya existente y usado en `entidad-participe-info`). La trampa que el §4
 * advierte — si el catálogo `'CERTIFICADO BANCARIO'` no está cargado, todos los certificados se
 * verían "faltantes" — se cubre igual: si HAY jubilados con cuenta activa pero NINGUNO tiene
 * certificado, se trata como "no se pudo verificar" (aviso, no bloqueo) en vez de "a todos les
 * falta".
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

  private vppcService = inject(ValorPagoPensionComplementariaService);
  private operacionesPagoService = inject(OperacionesPagoPrestamoService);
  private cuentaBancariaService = inject(CuentaBancariaParticipeService);
  private pgpcService = inject(PagoPensionComplementariaService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  // Contexto de sesión
  idEmpresa: number | null = null;
  private usuario = 'SYSTEM';

  // Selección de período — por defecto, el mes calendario anterior al actual (el caso de uso
  // real: procesar agosto durante septiembre).
  anio: number;
  mes: number;

  cargandoPrevuelo = signal(false);
  ejecutando = signal(false);

  prevuelo = signal<PrevueloItem[] | null>(null);
  errorPrevuelo = signal<string | null>(null);
  /** Distingue "no se pudo verificar certificados" de "a todos les falta" (§4 del diseño). */
  avisoCertificados = signal<string | null>(null);

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
      return;
    }
    this.cargarPrevuelo();
  }

  get periodoTexto(): string {
    return `${this.nombreMes(this.mes)} ${this.anio}`;
  }

  ocupado(): boolean {
    return this.cargandoPrevuelo() || this.ejecutando();
  }

  // ===================== Derivados del prevuelo =====================

  get totalJubilados(): number {
    return this.prevuelo()?.length ?? 0;
  }

  get totalSuma(): number {
    return (this.prevuelo() ?? []).reduce((acc, i) => acc + i.valorTotal, 0);
  }

  get listos(): PrevueloItem[] {
    return (this.prevuelo() ?? []).filter((i) => i.listo);
  }

  get bloqueados(): PrevueloItem[] {
    return (this.prevuelo() ?? []).filter((i) => !i.listo);
  }

  // ===================== Prevuelo =====================

  cargarPrevuelo(): void {
    if (this.ocupado() || this.idEmpresa == null) {
      return;
    }
    this.errorPrevuelo.set(null);
    this.avisoCertificados.set(null);
    this.cargandoPrevuelo.set(true);

    this.vppcService.getAll().subscribe({
      next: (rows) => {
        const asignaciones = (rows ?? []).filter(
          (v) => (v.estado ?? ESTADO_VPPC_ACTIVO) === ESTADO_VPPC_ACTIVO && v.entidad?.codigo != null,
        );
        if (asignaciones.length === 0) {
          this.prevuelo.set([]);
          this.cargandoPrevuelo.set(false);
          return;
        }
        this.completarPrevuelo(asignaciones);
      },
      error: () => {
        this.cargandoPrevuelo.set(false);
        this.prevuelo.set(null);
        this.errorPrevuelo.set('No se pudo consultar el padrón de valores asignados (VPPC).');
      },
    });
  }

  private completarPrevuelo(asignaciones: ValorPagoPensionComplementaria[]): void {
    const saldos$ = forkJoin(
      asignaciones.map((v) =>
        this.operacionesPagoService.saldosPorEntidad(v.entidad.codigo).pipe(
          catchError(() => of({ exito: false, resultado: [] as SaldoAporte[] } as RespuestaPago<SaldoAporte[]>)),
        ),
      ),
    );

    const criterioEstadoCnbp = new DatosBusqueda();
    criterioEstadoCnbp.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.LONG,
      'estado',
      String(ESTADO_CNBP_ACTIVO),
      TipoComandosBusqueda.IGUAL,
    );
    const cuentas$ = this.cuentaBancariaService
      .selectByCriteria([criterioEstadoCnbp])
      .pipe(catchError(() => of(null as CuentaBancariaParticipe[] | null)));

    const porPeriodo$ = this.pgpcService.porPeriodo(this.anio, this.mes).pipe(catchError(() => of(null)));

    forkJoin([saldos$, cuentas$, porPeriodo$]).subscribe(([saldosResp, cuentas, yaPagados]) => {
      const cuentasPorEntidad = new Map<number, CuentaBancariaParticipe[]>();
      for (const c of cuentas ?? []) {
        if (Number(c.estado) !== ESTADO_CNBP_ACTIVO || c.entidad?.codigo == null) continue;
        const lista = cuentasPorEntidad.get(c.entidad.codigo) ?? [];
        lista.push(c);
        cuentasPorEntidad.set(c.entidad.codigo, lista);
      }
      if (cuentas == null) {
        this.errorPrevuelo.set(
          (this.errorPrevuelo() ? this.errorPrevuelo() + ' ' : '') +
          'No se pudo consultar las cuentas bancarias activas: el prevuelo no puede confirmar quién tiene cuenta.',
        );
      }

      const entidadesConUnaCuenta: { codigo: number; cuenta: CuentaBancariaParticipe }[] = [];
      cuentasPorEntidad.forEach((lista, codigo) => {
        if (lista.length === 1) entidadesConUnaCuenta.push({ codigo, cuenta: lista[0] });
      });

      const yaPagadoSet = new Set<number>(
        (yaPagados ?? []).map((p) => p.entidad?.codigo).filter((c): c is number => c != null),
      );
      if (yaPagados == null) {
        this.errorPrevuelo.set(
          (this.errorPrevuelo() ? this.errorPrevuelo() + ' ' : '') +
          'No se pudo consultar qué jubilados ya fueron pagados este período (GET /pgpc/porPeriodo): ' +
          'ese motivo de bloqueo no se evalúa hasta poder verificarlo.',
        );
      }

      const certificados$ = entidadesConUnaCuenta.length
        ? forkJoin(
            entidadesConUnaCuenta.map((e) =>
              this.cuentaBancariaService.obtenerCertificado(e.cuenta.codigo).pipe(catchError(() => of(null))),
            ),
          )
        : of([] as (unknown | null)[]);

      certificados$.subscribe((certificados) => {
        const totalConCuenta = entidadesConUnaCuenta.length;
        const totalConCertificado = certificados.filter((c) => c != null).length;
        const noSePudoVerificarCertificados = totalConCuenta > 0 && totalConCertificado === 0;
        if (noSePudoVerificarCertificados) {
          this.avisoCertificados.set(
            'No se encontró certificado bancario en NINGÚN jubilado con cuenta activa. Es más probable que ' +
            'falte cargar el catálogo "CERTIFICADO BANCARIO" en este ambiente que no que a todos les falte el ' +
            'documento. El prevuelo no bloquea por certificado hasta poder verificarlo — revise con el equipo técnico.',
          );
        }

        const certificadoPorEntidad = new Map<number, boolean>();
        entidadesConUnaCuenta.forEach((e, i) => certificadoPorEntidad.set(e.codigo, certificados[i] != null));

        const items: PrevueloItem[] = asignaciones.map((v, i) => {
          const codigo = v.entidad.codigo;
          const valorTotal = this.valorMensual(v) + (v.valorSeguro ?? 0);
          const tieneCuenta = (cuentasPorEntidad.get(codigo)?.length ?? 0) === 1;

          let tieneCertificado: boolean | null = null;
          if (tieneCuenta) {
            tieneCertificado = noSePudoVerificarCertificados ? null : (certificadoPorEntidad.get(codigo) ?? false);
          }

          const saldos = saldosResp[i]?.resultado ?? [];
          const saldoAporte = this.saldoPensionComplementaria(saldos);
          const saldoSuficiente = saldoAporte + 0.005 >= valorTotal;

          const yaPagado = yaPagadoSet.has(codigo);

          const motivos: MotivoBloqueo[] = [];
          if (!tieneCuenta) motivos.push('Sin cuenta bancaria activa');
          if (tieneCertificado === false) motivos.push('Sin certificado bancario');
          if (!saldoSuficiente) motivos.push('Saldo insuficiente');
          if (yaPagado) motivos.push('Ya pagado este período');

          return {
            entidad: v.entidad,
            valorTotal,
            tieneCuenta,
            tieneCertificado,
            saldoAporte,
            saldoSuficiente,
            yaPagado,
            listo: motivos.length === 0,
            motivos,
          };
        });

        this.prevuelo.set(items);
        this.cargandoPrevuelo.set(false);
      });
    });
  }

  private valorMensual(v: ValorPagoPensionComplementaria): number {
    const valor = Number(v.valorPagar || 0);
    const cuotas = Number(v.numeroCuotas || 0);
    return cuotas > 0 ? valor / cuotas : valor;
  }

  private saldoPensionComplementaria(saldos: SaldoAporte[]): number {
    const item = saldos.find((s) => this.esNombrePensionComplementaria(s.nombre));
    return item?.saldo ?? 0;
  }

  private esNombrePensionComplementaria(nombre: string | null | undefined): boolean {
    if (!nombre) return false;
    const normalizado = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return normalizado.includes('pension complementaria');
  }

  // ===================== Ejecutar =====================

  ejecutar(): void {
    const items = this.prevuelo();
    if (!items || this.ocupado() || this.idEmpresa == null) {
      return;
    }
    const listos = this.listos;
    if (listos.length === 0) {
      this.notificar('No hay jubilados listos para pagar en este período.', false);
      return;
    }

    const data: ConfirmarGeneracionData = {
      periodo: this.periodoTexto,
      cantidadListos: listos.length,
      totalListos: listos.reduce((acc, i) => acc + i.valorTotal, 0),
      cantidadBloqueados: items.length - listos.length,
    };

    this.dialog
      .open(ConfirmarGeneracionDialogComponent, { data, width: '520px' })
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

  // ===================== Derivados del resultado =====================

  /** ⛔ `generoOrdenPago: false` con `valorCruzadoAPrestamo > 0` es una DESVIACIÓN, no un error. */
  esDesviacion(d: DetallePagoPension): boolean {
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

  claseEstadoPrevuelo(item: PrevueloItem): string {
    return item.listo ? 'badge-listo' : 'badge-bloqueado';
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

  money(n: number | null | undefined): string {
    return (n ?? 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  trackEntidad(_: number, item: PrevueloItem): number {
    return item.entidad.codigo;
  }

  trackDetalle(_: number, d: DetallePagoPension): number {
    return d.idPago ?? d.idEntidad;
  }
}
