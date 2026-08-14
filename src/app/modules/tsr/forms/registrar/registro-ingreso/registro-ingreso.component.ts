import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import {
  MotivoDialogComponent,
  MotivoDialogData,
} from '../../../../../shared/components/motivo-dialog/motivo-dialog.component';
import { TitularSelectorDialogComponent } from '../../../../../shared/components/titular-selector-dialog/titular-selector-dialog.component';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';

import { GrupoProductoCobro } from '../../../../cxc/model/grupo-producto-cobro';
import { ProductoCobro } from '../../../../cxc/model/producto-cobro';
import { GrupoProductoCobroService } from '../../../../cxc/service/grupo-producto-cobro.service';
import { ProductoCobroService } from '../../../../cxc/service/producto-cobro.service';

import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import {
  ESTADO_INGRESO_LABELS,
  EstadoIngresoTesoreria,
  Ingreso,
} from '../../../model/ingreso';
import { Titular } from '../../../model/titular';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';
import { IngresoService } from '../../../service/ingreso.service';

/**
 * Ingresos de tesorería sin documento físico (intereses ganados, créditos del
 * banco, devoluciones). Se registran cuando el dinero YA está en la cuenta: la
 * misma llamada graba, genera el asiento y el movimiento bancario.
 *
 * La cuenta contable no se pide en el formulario: sale del grupo del producto
 * CXC elegido. Si el grupo no tiene cuenta configurada el backend rechaza el
 * registro con un mensaje que dice qué configurar, y no queda nada grabado.
 */
@Component({
  selector: 'app-registro-ingreso',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule],
  templateUrl: './registro-ingreso.component.html',
  styleUrls: ['./registro-ingreso.component.scss'],
})
export class RegistroIngresoComponent implements OnInit {
  private ingresoS = inject(IngresoService);
  private cuentaBancariaS = inject(CuentaBancariaService);
  private grupoProductoS = inject(GrupoProductoCobroService);
  private productoS = inject(ProductoCobroService);
  private funcionesDatos = inject(FuncionesDatosService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  private readonly ROL_CLIENTE = 1;

  tabActiva = 0;

  // ─── Catálogos ─────────────────────────────────────────
  cargandoCatalogos = signal(false);
  cuentasBancarias = signal<CuentaBancaria[]>([]);
  gruposProducto = signal<GrupoProductoCobro[]>([]);
  private todosProductos = signal<ProductoCobro[]>([]);

  // ─── a) Registrar ──────────────────────────────────────
  regCuentaBancaria: CuentaBancaria | null = null;
  regIdGrupo: number | null = null;
  regGrupo: GrupoProductoCobro | null = null;
  /** Texto tecleado en el autocompletado; pasa a ser el grupo al elegir opción. */
  grupoFiltro: string | GrupoProductoCobro = '';
  gruposFiltrados: GrupoProductoCobro[] = [];
  regIdProducto: number | null = null;
  regTitular = signal<Titular | null>(null);
  regDescripcion = '';
  regValor = '';
  regFecha: Date | null = new Date();
  regReferencia = '';
  regObservacion = '';
  registrando = signal(false);
  regError = signal('');
  regExito = signal('');

  /** El producto se elige dentro del grupo: la lista completa es muy larga. */
  get productosFiltrados(): ProductoCobro[] {
    const idGrupo = this.regIdGrupo;
    if (!idGrupo) return [];
    return this.todosProductos().filter(
      (p) => p.grupoProducto?.codigo === idGrupo && p.estado === 1
    );
  }

  // ─── b) Consulta ───────────────────────────────────────
  conEstado: number | null = null;
  ingresos = signal<Ingreso[]>([]);
  cargandoConsulta = signal(false);
  conError = signal('');
  readonly columnasConsulta = [
    'fecha', 'descripcion', 'producto', 'cuenta', 'referencia', 'valor', 'asiento', 'estado', 'acciones',
  ];
  readonly estadosFiltro = [
    { valor: EstadoIngresoTesoreria.ACTIVO, texto: 'Activo' },
    { valor: EstadoIngresoTesoreria.ANULADO, texto: 'Anulado' },
  ];

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarIngresos();
  }

  onCambioTab(indice: number): void {
    if (indice === this.tabActiva) return;
    this.tabActiva = indice;
    if (indice === 1) this.cargarIngresos();
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos.set(true);

    this.cuentaBancariaS.getAll().subscribe({
      next: (data) => this.cuentasBancarias.set(data ?? []),
      error: () => {
        this.cuentasBancarias.set([]);
        this.snackBar.open('No se pudieron cargar las cuentas bancarias.', 'Cerrar', { duration: 5000 });
      },
    });

    this.grupoProductoS.getAll().subscribe({
      next: (data) => {
        this.gruposProducto.set((data ?? []).filter((g) => g.estado === 1));
        this.gruposFiltrados = this.gruposProducto();
      },
      error: () => {
        this.gruposProducto.set([]);
        this.gruposFiltrados = [];
      },
    });

    this.productoS.getAll().subscribe({
      next: (data) => {
        this.todosProductos.set(data ?? []);
        this.cargandoCatalogos.set(false);
      },
      error: () => {
        this.todosProductos.set([]);
        this.cargandoCatalogos.set(false);
        this.snackBar.open('No se pudieron cargar los productos de cobro.', 'Cerrar', { duration: 5000 });
      },
    });
  }

  // ═══ a) REGISTRAR ═══════════════════════════════════════

  onCambioGrupo(): void {
    this.regIdProducto = null;
  }

  /** Busca el grupo por nombre o por la cuenta contable (número o nombre). */
  filtrarGrupos(): void {
    // Mientras se teclea no hay grupo elegido: obliga a seleccionar una opción.
    if (this.regIdGrupo != null) {
      this.regGrupo = null;
      this.regIdGrupo = null;
      this.onCambioGrupo();
    }

    const q = (typeof this.grupoFiltro === 'string' ? this.grupoFiltro : '').trim().toLowerCase();
    const grupos = this.gruposProducto();
    this.gruposFiltrados = q
      ? grupos.filter(
          (g) =>
            g.nombre?.toLowerCase().includes(q) ||
            g.planCuenta?.cuentaContable?.toLowerCase().includes(q) ||
            g.planCuenta?.nombre?.toLowerCase().includes(q)
        )
      : grupos;
  }

  onGrupoSeleccionado(grupo: GrupoProductoCobro): void {
    this.regGrupo = grupo;
    this.regIdGrupo = grupo.codigo;
    this.grupoFiltro = grupo;
    this.onCambioGrupo();
  }

  quitarGrupo(): void {
    this.regGrupo = null;
    this.regIdGrupo = null;
    this.grupoFiltro = '';
    this.gruposFiltrados = this.gruposProducto();
    this.onCambioGrupo();
  }

  /** En el campo queda la cuenta contable del grupo, que es lo que se contabiliza. */
  displayGrupo = (g: GrupoProductoCobro | string): string => {
    if (!g) return '';
    if (typeof g === 'string') return g;
    return g.planCuenta?.cuentaContable ?? g.nombre ?? '';
  };

  /** El titular es opcional: solo deja constancia de quién originó el dinero. */
  buscarTitular(): void {
    this.dialog.open(TitularSelectorDialogComponent, {
      width: '1100px',
      maxWidth: '98vw',
      data: { rolCodigo: this.ROL_CLIENTE, rolNombre: 'CLIENTE', titulo: 'Buscar Titular' },
    }).afterClosed().subscribe((titular: Titular | null) => {
      if (titular) this.regTitular.set(titular);
    });
  }

  quitarTitular(): void {
    this.regTitular.set(null);
  }

  nombreTitular(): string {
    const t = this.regTitular();
    if (!t) return '';
    return t.razonSocial || t.nombre || t.identificacion || `Titular ${t.codigo}`;
  }

  get regValorNumerico(): number {
    const v = parseFloat(String(this.regValor).replace(',', '.'));
    return Number.isFinite(v) ? v : 0;
  }

  get puedeRegistrar(): boolean {
    return !!this.regCuentaBancaria
      && this.regIdProducto != null
      && !!this.regDescripcion.trim()
      && this.regValorNumerico > 0
      && !this.registrando();
  }

  registrar(): void {
    if (!this.puedeRegistrar || !this.regCuentaBancaria || this.regIdProducto == null) return;

    this.registrando.set(true);
    this.regError.set('');
    this.regExito.set('');

    this.ingresoS.procesar({
      idEmpresa: this.idEmpresaSesion(),
      idTitular: this.regTitular()?.codigo ?? undefined,
      idProductoCobro: this.regIdProducto,
      descripcion: this.regDescripcion.trim(),
      valor: this.regValorNumerico,
      fecha: this.fechaISO(this.regFecha),
      idCuentaBancaria: this.regCuentaBancaria.codigo,
      referencia: this.regReferencia.trim() || undefined,
      observacion: this.regObservacion.trim() || undefined,
      idUsuario: this.idUsuarioSesion(),
    }).subscribe({
      next: (resp) => {
        this.registrando.set(false);

        let mensaje = resp.mensaje
          ?? 'Ingreso registrado. El asiento contable y el movimiento bancario fueron generados.';
        if (resp.asiento) {
          mensaje += ` Asiento N° ${resp.asiento}.`;
        }
        this.regExito.set(mensaje);
        this.limpiar();
        this.cargarIngresos();
        this.snackBar.open(mensaje, 'Cerrar', { duration: 6000 });
      },
      error: (err: Error) => {
        this.registrando.set(false);
        this.regError.set(err.message);
      },
    });
  }

  /** Se conservan la cuenta y el grupo: lo habitual es cargar varios seguidos. */
  limpiar(): void {
    this.regIdProducto = null;
    this.regTitular.set(null);
    this.regDescripcion = '';
    this.regValor = '';
    this.regReferencia = '';
    this.regObservacion = '';
    this.regFecha = new Date();
  }

  // ═══ b) CONSULTA ════════════════════════════════════════

  cargarIngresos(): void {
    this.cargandoConsulta.set(true);
    this.conError.set('');

    this.ingresoS.listar(this.idEmpresaSesion(), this.conEstado ?? undefined).subscribe({
      next: (data) => {
        this.ingresos.set(data ?? []);
        this.cargandoConsulta.set(false);
      },
      error: (err: Error) => {
        this.ingresos.set([]);
        this.cargandoConsulta.set(false);
        this.conError.set(err.message);
      },
    });
  }

  puedeAnular(ingreso: Ingreso): boolean {
    return Number(ingreso.estado) === EstadoIngresoTesoreria.ACTIVO;
  }

  /** Anular reversa el asiento y el movimiento bancario ya generados. */
  confirmarAnulacion(ingreso: Ingreso): void {
    const data: MotivoDialogData = {
      titulo: `Anular ingreso N° ${ingreso.id}`,
      advertencia:
        'Este ingreso ya generó asiento contable y movimiento bancario. Al anularlo se reversa '
        + 'esa contabilidad y el movimiento queda anulado para la conciliación.',
      textoConfirmar: 'Sí, anular',
      requiereDobleConfirmacion: true,
    };

    this.dialog.open(MotivoDialogComponent, { width: '520px', data }).afterClosed().subscribe((motivo) => {
      if (!motivo) return;
      this.ingresoS.anular(ingreso.id, { motivo, idUsuario: this.idUsuarioSesion() }).subscribe({
        next: (resp) => {
          this.snackBar.open(resp.mensaje ?? 'Ingreso anulado.', 'Cerrar', { duration: 6000 });
          this.cargarIngresos();
        },
        error: (err: Error) => this.snackBar.open(err.message, 'Cerrar', { duration: 6000 }),
      });
    });
  }

  // ═══ HELPERS ════════════════════════════════════════════

  etiquetaEstado(estado: number): { texto: string; clase: string } {
    return ESTADO_INGRESO_LABELS[Number(estado)] ?? { texto: `Estado ${estado}`, clase: 'badge-neutro' };
  }

  etiquetaCuenta(cuenta: CuentaBancaria): string {
    return `${cuenta.banco?.nombre ?? 'Banco'} — ${cuenta.numeroCuenta}`;
  }

  formatearFecha(fecha: any): string {
    const d = this.funcionesDatos.convertirFechaDesdeBackend(fecha);
    if (!d) return '—';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private fechaISO(fecha: Date | null): string | undefined {
    if (!fecha) return undefined;
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return undefined;
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  private idEmpresaSesion(): number {
    return +(sessionStorage.getItem('idEmpresa') || localStorage.getItem('idEmpresa') || '0');
  }

  private idUsuarioSesion(): number {
    return +(sessionStorage.getItem('idUsuario') || localStorage.getItem('idUsuario') || '0');
  }
}
