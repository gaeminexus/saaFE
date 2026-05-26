import { CommonModule } from '@angular/common';
import { Component, signal, computed } from '@angular/core';
import { Observable } from 'rxjs';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { UsuarioService } from '../../../../shared/services/usuario.service';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { EjecucionReporteService } from '../../service/ejecucion-reporte.service';
import { DetalleEjecucionReporteService } from '../../service/detalle-ejecucion-reporte.service';
import { CreditoG40Service } from '../../service/credito-g40.service';
import { ParticipeActivoG41Service } from '../../service/participe-activo-g41.service';
import { SaldoCuentaG42Service } from '../../service/saldo-cuenta-g42.service';
import { ParticipeCesanteG43Service } from '../../service/participe-cesante-g43.service';
import { ParticipeJubiladoG44Service } from '../../service/participe-jubilado-g44.service';
import { NuevoParticipeG45Service } from '../../service/nuevo-participe-g45.service';
import { NuevoPrestamoG46Service } from '../../service/nuevo-prestamo-g46.service';
import { NovacionG47Service } from '../../service/novacion-g47.service';
import { SaldoOperacionG48Service } from '../../service/saldo-operacion-g48.service';
import { CancelacionG49Service } from '../../service/cancelacion-g49.service';
import { GaranteG50Service } from '../../service/garante-g50.service';
import { GarantiaRealG51Service } from '../../service/garantia-real-g51.service';
import { DetalleEjecucionReporte } from '../../model/detalle-ejecucion-reporte';
import { EjecucionReporte } from '../../model/ejecucion-reporte';

@Component({
  selector: 'app-reportes-super-bancos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './reportes-super-bancos.component.html',
  styleUrls: ['./reportes-super-bancos.component.scss'],
})
export class ReportesSuperBancosComponent {

  meses = [
    { valor: 1,  nombre: 'Enero' },
    { valor: 2,  nombre: 'Febrero' },
    { valor: 3,  nombre: 'Marzo' },
    { valor: 4,  nombre: 'Abril' },
    { valor: 5,  nombre: 'Mayo' },
    { valor: 6,  nombre: 'Junio' },
    { valor: 7,  nombre: 'Julio' },
    { valor: 8,  nombre: 'Agosto' },
    { valor: 9,  nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' },
  ];

  anios: number[] = [];
  mesSeleccionado  = signal<number>(new Date().getMonth() + 1);
  anioSeleccionado = signal<number>(new Date().getFullYear());

  ejecutando      = signal<boolean>(false);
  cargandoDetalle = signal<boolean>(false);
  ejecucion       = signal<EjecucionReporte | null>(null);
  detalles        = signal<DetalleEjecucionReporte[]>([]);
  mensajeInfo     = signal<string>('');
  errorMsg        = signal<string>('');

  // Tabla inline del G seleccionado
  detalleSeleccionado = signal<DetalleEjecucionReporte | null>(null);
  cargandoRegistros   = signal<boolean>(false);
  errorRegistros      = signal<string>('');
  registrosG          = signal<any[]>([]);
  columnasG           = signal<string[]>([]);

  readonly estadoEjrcLabel: Partial<Record<number, string>> = {
    1: 'En proceso',
    2: 'Con novedades',
    3: 'Completo',
  };

  readonly estadoEjrdLabel: Partial<Record<number, string>> = {
    1: 'OK',
    2: 'Con novedades',
    3: 'Pendiente',
  };

  readonly estadoEjrdClass: Partial<Record<number, string>> = {
    1: 'estado-ok',
    2: 'estado-novedad',
    3: 'estado-pendiente',
  };

  readonly estadoEjrdIcon: Partial<Record<number, string>> = {
    1: 'check_circle',
    2: 'warning',
    3: 'schedule',
  };

  puedeReintentar = computed(() => this.ejecucion()?.estado === 2);

  /** Columnas por defecto para cada tipo de reporte (excluyendo codigo y detalleEjecucion) */
  readonly columnasMap: Record<string, string[]> = {
    G40: ['tipoIdentificacionFcpc','identificacionFcpc','numeroResolucion','fechaResolucion','provincia','canton','direccion','telefonos','correoElectronico','tipoSistema','tipoPrestacion','tipoAporte','tipoAdministracion','fechaTraspaso','tipoFcpc','numeroResolucionCambioEstatuto','fechaResolucionCambioEstatuto','cambioNombre','porcentajeAportePatronalCesantia','porcentajeAportePersonalCesantia','porcentajeAportePatronalJubilacion','porcentajeAportePersonalJubilacion','valorAportePersonalCesantia','valorAportePersonalJubilacion'],
    G41: ['tipoIdentificacion','identificacion','genero','estadoCivil','fechaNacimiento','fechaIngreso','estadoParticipe','tipoSistema','baseCalculoAportacion','tipoRelacionLaboral','estadoRegistro','fechaActualizacionEstado'],
    G42: ['tipoIdentificacion','identificacion','tipoPrestacion','aportePatronal','aportePersonal','aporteVoluntario','saldoAportePatronal','saldoAportePersonal','saldoAporteVoluntario','rendimiento'],
    G43: ['tipoIdentificacion','identificacion','fechaTerminoRelacionLaboral','numeroImposicionesPersonales','numeroImposicionesPatronales','fechaLiquidacion','saldoCuentaIndividual','valoresCompensados','valoresPagados'],
    G44: ['tipoIdentificacion','identificacion','tipoJubilacion','fechaJubilacion','imposicionesAcumuladas','valorPension','valorNetoRecibir','saldoCuenta','valoresCompensados','jubilacionIess'],
    G45: ['tipoIdentificacion','identificacion','tipoParticipe','actividadEconomica','patrimonio','provincia','canton','parroquia','genero','estadoCivil','fechaNacimiento','profesion','cargasFamiliares','origenIngresos'],
    G46: ['tipoIdentificacion','identificacion','numeroOperacion','tipoCredito','estadoOperacion','situacionOperacion','destinoProvincia','destinoCanton','destinoParroquia','fechaConcesion','fechaVencimiento','valorOperacion','tasaInteresNominal','periodicidadPago','frecuenciaRevision','garantias'],
    G47: ['tipoIdentificacion','identificacion','numeroOperacion','numeroOperacionAnterior','fechaNovacion'],
    G48: ['tipoIdentificacion','identificacion','numeroOperacion','tipoCredito','diasMorosidad','calificacionPropia','tasaInteres','valorPorVencer','valorVencido','costosOperativos','interesOrdinario','interesMora','valorDemandaJudicial','carteraCastigada','provisionRequeridaOriginal','provisionConstituida','valorTotalCuentaIndividual','valorSujetoProvision','tipoSistemaAmortizacion','cuotaCredito','dividendo','fechaExigibilidad'],
    G49: ['tipoIdentificacion','identificacion','numeroOperacion','fechaCancelacion','formaCancelacion'],
    G50: ['tipoIdentificacion','identificacion','numeroOperacion','tipoIdentificacionGarante','identificacionGarante','tipoGarante','fechaEliminacion','causaEliminacion'],
    G51: ['tipoIdentificacion','identificacion','numeroOperacion','numeroGarantia','tipoGarantia','descripcionGarantia','valorAvaluo','fechaAvaluo','numeroRegistroGarantia','fechaContabilizacion','porcentajeCubre','estadoRegistro'],
  };

  private readonly servicioMap: Record<string, (c: DatosBusqueda[]) => Observable<any[] | null>>;

  constructor(
    private ejecucionService: EjecucionReporteService,
    private detalleService:   DetalleEjecucionReporteService,
    private usuarioService:   UsuarioService,
    private g40Svc: CreditoG40Service,
    private g41Svc: ParticipeActivoG41Service,
    private g42Svc: SaldoCuentaG42Service,
    private g43Svc: ParticipeCesanteG43Service,
    private g44Svc: ParticipeJubiladoG44Service,
    private g45Svc: NuevoParticipeG45Service,
    private g46Svc: NuevoPrestamoG46Service,
    private g47Svc: NovacionG47Service,
    private g48Svc: SaldoOperacionG48Service,
    private g49Svc: CancelacionG49Service,
    private g50Svc: GaranteG50Service,
    private g51Svc: GarantiaRealG51Service,
  ) {
    const anioActual = new Date().getFullYear();
    for (let a = anioActual - 10; a <= anioActual + 1; a++) {
      this.anios.push(a);
    }

    this.servicioMap = {
      G40: (c) => this.g40Svc.selectByCriteria(c),
      G41: (c) => this.g41Svc.selectByCriteria(c),
      G42: (c) => this.g42Svc.selectByCriteria(c),
      G43: (c) => this.g43Svc.selectByCriteria(c),
      G44: (c) => this.g44Svc.selectByCriteria(c),
      G45: (c) => this.g45Svc.selectByCriteria(c),
      G46: (c) => this.g46Svc.selectByCriteria(c),
      G47: (c) => this.g47Svc.selectByCriteria(c),
      G48: (c) => this.g48Svc.selectByCriteria(c),
      G49: (c) => this.g49Svc.selectByCriteria(c),
      G50: (c) => this.g50Svc.selectByCriteria(c),
      G51: (c) => this.g51Svc.selectByCriteria(c),
    };
  }

  onMesChange(mes: number):   void { this.mesSeleccionado.set(mes); }
  onAnioChange(anio: number): void { this.anioSeleccionado.set(anio); }

  generarArchivos(): void {
    this.ejecutando.set(true);
    this.mensajeInfo.set('');
    this.errorMsg.set('');
    this.ejecucion.set(null);
    this.detalles.set([]);
    this.detalleSeleccionado.set(null);
    this.registrosG.set([]);
    this.columnasG.set([]);

    const usuario = this.usuarioService.getUsuarioLog()?.nombre || 'sistema';

    this.ejecucionService.ejecutar({
      mes:  this.mesSeleccionado(),
      anio: this.anioSeleccionado(),
      usuario,
    }).subscribe({
      next: (resp) => {
        this.ejecutando.set(false);
        if (!resp) return;
        if ('mensaje' in resp) {
          this.mensajeInfo.set(resp.mensaje);
          const match = resp.mensaje.match(/id:\s*(\d+)/i);
          if (match) { this.cargarDetalle(Number(match[1])); }
        } else {
          this.ejecucion.set(resp as EjecucionReporte);
          if ((resp as EjecucionReporte).codigo) {
            this.cargarDetalle((resp as EjecucionReporte).codigo!);
          }
        }
      },
      error: (err) => {
        this.ejecutando.set(false);
        this.errorMsg.set(err?.error ?? err?.message ?? 'Error inesperado al generar los reportes.');
        console.error('[ReportesSuperBancos] Error ejecutar:', err);
      },
    });
  }

  private cargarDetalle(idEjecucion: number): void {
    this.cargandoDetalle.set(true);
    this.detalleService.getByEjecucion(idEjecucion).subscribe({
      next:  (data)  => { this.cargandoDetalle.set(false); this.detalles.set(data ?? []); },
      error: ()      => this.cargandoDetalle.set(false),
    });
  }

  seleccionarDetalle(detalle: DetalleEjecucionReporte): void {
    // Click en el mismo G = colapsar
    if (this.detalleSeleccionado()?.tipoReporte === detalle.tipoReporte) {
      this.detalleSeleccionado.set(null);
      this.registrosG.set([]);
      this.columnasG.set([]);
      this.errorRegistros.set('');
      return;
    }

    this.detalleSeleccionado.set(detalle);
    this.registrosG.set([]);
    // Cargar columnas desde el mapa estático siempre, sin importar si hay filas
    this.columnasG.set(this.columnasMap[detalle.tipoReporte] ?? []);
    this.errorRegistros.set('');

    if ((detalle.cantidadRegistros ?? 0) === 0) {
      return;
    }

    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'detalleEjecucion',
      'codigo',
      String(detalle.codigo),
      TipoComandosBusqueda.IGUAL,
    );

    const fn = this.servicioMap[detalle.tipoReporte];
    if (!fn) {
      this.errorRegistros.set('No hay servicio configurado para este tipo de reporte.');
      return;
    }

    this.cargandoRegistros.set(true);
    fn([criterio]).subscribe({
      next: (rows) => {
        this.cargandoRegistros.set(false);
        const data = rows ?? [];
        this.registrosG.set(data);
        // Las columnas ya están seteadas desde el mapa estático; no sobreescribir
      },
      error: () => {
        this.cargandoRegistros.set(false);
        if ((detalle.cantidadRegistros ?? 0) > 0) {
          this.errorRegistros.set('Error al cargar los registros.');
        }
      },
    });
  }

  formatVal(v: any): string {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v) && v.length >= 3 && typeof v[0] === 'number') {
      const [y, m, d] = v;
      return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    }
    if (typeof v === 'object') return '';
    return String(v);
  }

  descargarTxt(): void {
    const detalle = this.detalleSeleccionado();
    if (!detalle) return;
    const { tipoReporte } = detalle;
    const mes  = this.mesSeleccionado();
    const anio = this.anioSeleccionado();

    const lastDay     = new Date(anio, mes, 0).getDate();
    const fechaCierre = `${String(lastDay).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${anio}`;

    const rows = this.registrosG();
    const cols = this.columnasG();
    const totalConCabecera = rows.length + 1;

    const lines: string[] = [];
    lines.push([tipoReporte, '3968', fechaCierre, String(totalConCabecera)].join('\t'));
    for (const row of rows) {
      lines.push(cols.map(c => this.formatVal(row[c])).join('\t'));
    }

    const blob = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `${tipoReporte}_${String(mes).padStart(2, '0')}_${anio}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  mesNombre(): string {
    return this.meses.find(m => m.valor === this.mesSeleccionado())?.nombre ?? '';
  }
}
