import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableDataSource } from '@angular/material/table';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { CuotaXFinanciacionPago } from '../../../model/cuota_x_financiacion_pago';
import { DocumentoPago } from '../../../model/documento_pago';
import { ProposicionPagoXCuota } from '../../../model/proposicion_pago_x_cuota';
import { CuotaXFinanciacionPagoService } from '../../../service/cuota-x-financiacion-pago.service';
import { DocumentoPagoService } from '../../../service/documento-pago.service';
import { FacturaCompraService } from '../../../service/factura-compra.service';
import { FinanciacionXDocumentoPagoService } from '../../../service/financiacion-x-documento-pago.service';
import { LiquidacionCompraCompraService } from '../../../service/liquidacion-compra-compra.service';
import { NotaCreditoCompraService } from '../../../service/nota-credito-compra.service';
import { NotaDebitoCompraService } from '../../../service/nota-debito-compra.service';
import { ProposicionPagoXCuotaService } from '../../../service/proposicion-pago-x-cuota.service';
import { RetencionCompraService } from '../../../service/retencion-compra.service';

// ─── Modelo unificado de presentación ────────────────────────
export type TipoDocProposicion =
  | 'FACTURA_COMPRA'
  | 'LIQUIDACION_COMPRA'
  | 'NOTA_CREDITO_COMPRA'
  | 'NOTA_DEBITO_COMPRA'
  | 'RETENCION_COMPRA';

export interface DocumentoProposicion {
  /** Id en la tabla de origen (FacturaCompra.id, etc.) */
  idOrigen: number;
  tipo: TipoDocProposicion;
  tipoLabel: string;
  ruc: string;
  razonSocial: string;
  serie: string;
  fecha: string;
  total: number;
  estado: number;
}

@Component({
  selector: 'app-proposicion-pago',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MaterialFormModule],
  templateUrl: './proposicion-pago.component.html',
  styleUrl: './proposicion-pago.component.scss',
})
export class ProposicionPagoComponent implements OnInit {
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private facturaS = inject(FacturaCompraService);
  private liqS = inject(LiquidacionCompraCompraService);
  private ncS = inject(NotaCreditoCompraService);
  private ndS = inject(NotaDebitoCompraService);
  private retS = inject(RetencionCompraService);
  private documentoPagoS = inject(DocumentoPagoService);
  private financiacionS = inject(FinanciacionXDocumentoPagoService);
  private cuotaS = inject(CuotaXFinanciacionPagoService);
  private proposicionS = inject(ProposicionPagoXCuotaService);

  // ─── Estado general ───────────────────────────────────
  cargandoDocumentos = signal(false);
  cargandoCuotas = signal(false);
  guardando = signal(false);
  errorMsg = signal('');

  // ─── Vista ────────────────────────────────────────────
  vista = signal<'lista' | 'detalle'>('lista');

  // ─── Documentos pendientes ────────────────────────────
  todosDocumentos: DocumentoProposicion[] = [];
  dsDocumentos = new MatTableDataSource<DocumentoProposicion>([]);
  columnasDocumentos = [
    'tipo',
    'serie',
    'razonSocial',
    'ruc',
    'fecha',
    'total',
    'acciones',
  ];

  // Filtros lista
  filtroProveedor = '';
  filtroRuc = '';
  filtroTipo = '';

  // ─── Documento seleccionado ───────────────────────────
  docSeleccionado = signal<DocumentoProposicion | null>(null);
  /** DocumentoPago cruzado por idFisico al seleccionar un doc */
  documentoPagoActual = signal<DocumentoPago | null>(null);
  cuotas: CuotaXFinanciacionPago[] = [];
  dsCuotas = new MatTableDataSource<CuotaXFinanciacionPago>([]);
  columnasCuotas = [
    'numeroCuotaLetra',
    'fechaVencimiento',
    'valor',
    'totalAbono',
    'saldo',
    'acciones',
  ];

  // ─── Formulario de proposición ────────────────────────
  cuotaSeleccionada = signal<CuotaXFinanciacionPago | null>(null);
  formProposicion!: FormGroup;
  modoFormulario = signal<'nuevo' | null>(null);

  saldoCuota = computed(() => {
    const c = this.cuotaSeleccionada();
    return c ? c.saldo : 0;
  });

  private get idEmpresa(): number {
    return Number(
      localStorage.getItem('empresaCodigo') ||
        localStorage.getItem('empresaId') ||
        1
    );
  }

  private get nombreUsuario(): string {
    return localStorage.getItem('nombreUsuario') || 'Sistema';
  }

  // ─── Init ─────────────────────────────────────────────
  ngOnInit(): void {
    this.initForm();
    this.cargarDocumentos();
  }

  private initForm(): void {
    this.formProposicion = this.fb.group({
      fechaPago: [null, Validators.required],
      valorPropuesto: [null, [Validators.required, Validators.min(0.01)]],
      observacion: [''],
    });
  }

  // ─── Construcción de criterios con filtros activos ───
  private buildCriterios(usarTitular: boolean = true): DatosBusqueda[] {
    const criterios: DatosBusqueda[] = [];

    // Siempre filtra por empresa
    const dbEmpresa = new DatosBusqueda();
    dbEmpresa.asignaValorConCampoPadre(
      TipoDatos.LONG, 'empresa', 'codigo',
      this.idEmpresa.toString(), TipoComandosBusqueda.IGUAL
    );
    criterios.push(dbEmpresa);

    // Filtro por razón social
    const campoRazon = usarTitular ? 'titular' : 'proveedor';
    if (this.filtroProveedor.trim()) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatos.STRING, campoRazon, 'razonSocial',
        this.filtroProveedor.trim(), TipoComandosBusqueda.LIKE
      );
      criterios.push(db);
    }

    // Filtro por RUC/identificación
    if (this.filtroRuc.trim()) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatos.STRING, campoRazon, 'identificacion',
        this.filtroRuc.trim(), TipoComandosBusqueda.LIKE
      );
      criterios.push(db);
    }

    return criterios;
  }

  // ─── Carga documentos de todas las tablas ─────────────
  cargarDocumentos(): void {
    this.buscarConCriterios();
  }

  buscar(): void {
    this.buscarConCriterios();
  }

  private buscarConCriterios(): void {
    this.cargandoDocumentos.set(true);
    this.errorMsg.set('');

    const criterioTitular   = this.buildCriterios(true);
    const criterioProveedor = this.buildCriterios(false);

    // Si hay filtro de tipo, solo consultar esa tabla
    const soloTipo = this.filtroTipo as TipoDocProposicion | '';

    const obs = {
      facturas:      (soloTipo === '' || soloTipo === 'FACTURA_COMPRA')
        ? this.facturaS.selectByCriteria(criterioTitular).pipe(catchError(() => of([])))
        : of([]),
      liquidaciones: (soloTipo === '' || soloTipo === 'LIQUIDACION_COMPRA')
        ? this.liqS.selectByCriteria(criterioTitular).pipe(catchError(() => of([])))
        : of([]),
      notasCredito:  (soloTipo === '' || soloTipo === 'NOTA_CREDITO_COMPRA')
        ? this.ncS.selectByCriteria(criterioTitular).pipe(catchError(() => of([])))
        : of([]),
      notasDebito:   (soloTipo === '' || soloTipo === 'NOTA_DEBITO_COMPRA')
        ? this.ndS.selectByCriteria(criterioTitular).pipe(catchError(() => of([])))
        : of([]),
      retenciones:   (soloTipo === '' || soloTipo === 'RETENCION_COMPRA')
        ? this.retS.selectByCriteria(criterioProveedor).pipe(catchError(() => of([])))
        : of([]),
    };

    forkJoin(obs).subscribe({
      next: ({ facturas, liquidaciones, notasCredito, notasDebito, retenciones }) => {
        const unified: DocumentoProposicion[] = [
          ...(facturas || []).map(f => this.mapDoc(
            f.id, 'FACTURA_COMPRA', 'Factura Compra',
            f.titular?.identificacion || '', f.titular?.razonSocial || '',
            `${f.numEstablecimiento}-${f.numPtoEmision}-${f.secuencial}`,
            f.fecha, f.total, f.estado)),

          ...(liquidaciones || []).map(l => this.mapDoc(
            l.id, 'LIQUIDACION_COMPRA', 'Liquidación Compra',
            l.titular?.identificacion || '', l.titular?.razonSocial || '',
            `${l.numEstablecimiento}-${l.numPtoEmision}-${l.secuencial}`,
            l.fecha, l.total, l.estado)),

          ...(notasCredito || []).map(n => this.mapDoc(
            n.id, 'NOTA_CREDITO_COMPRA', 'Nota Crédito',
            n.titular?.identificacion || '', n.titular?.razonSocial || '',
            `${n.numEstablecimiento}-${n.numPtoEmision}-${n.secuencial}`,
            n.fecha, n.total, n.estado)),

          ...(notasDebito || []).map(n => this.mapDoc(
            n.id, 'NOTA_DEBITO_COMPRA', 'Nota Débito',
            n.titular?.identificacion || '', n.titular?.razonSocial || '',
            `${n.numEstablecimiento}-${n.numPtoEmision}-${n.secuencial}`,
            n.fecha, n.total, n.estado)),

          ...(retenciones || []).map(r => this.mapDoc(
            r.id, 'RETENCION_COMPRA', 'Retención',
            r.proveedor?.identificacion || '', r.proveedor?.razonSocial || '',
            `${r.numEstablecimiento}-${r.numPtoEmision}-${r.secuencial}`,
            r.fecha || '', r.total || 0, r.estado)),
        ];

        this.todosDocumentos = unified;
        this.dsDocumentos.data = unified;
        this.cargandoDocumentos.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar los documentos pendientes de pago.');
        this.cargandoDocumentos.set(false);
      },
    });
  }

  private mapDoc(
    idOrigen: number, tipo: TipoDocProposicion, tipoLabel: string,
    ruc: string, razonSocial: string, serie: string,
    fecha: string, total: number, estado: number
  ): DocumentoProposicion {
    return { idOrigen, tipo, tipoLabel, ruc, razonSocial, serie, fecha, total: total ?? 0, estado: estado ?? 0 };
  }

  limpiarFiltros(): void {
    this.filtroProveedor = '';
    this.filtroRuc = '';
    this.filtroTipo = '';
    this.buscarConCriterios();
  }

  private aplicarFiltros(): void {
    this.dsDocumentos.data = [...this.todosDocumentos];
  }

  // ─── Seleccionar documento ────────────────────────────
  seleccionarDocumento(doc: DocumentoProposicion): void {
    this.docSeleccionado.set(doc);
    this.documentoPagoActual.set(null);
    this.cuotaSeleccionada.set(null);
    this.modoFormulario.set(null);
    this.formProposicion.reset();
    this.cuotas = [];
    this.dsCuotas.data = [];
    this.vista.set('detalle');
    this.cargarCuotas(doc);
  }

  volverLista(): void {
    this.vista.set('lista');
    this.docSeleccionado.set(null);
    this.documentoPagoActual.set(null);
    this.cuotas = [];
    this.dsCuotas.data = [];
    this.cuotaSeleccionada.set(null);
    this.modoFormulario.set(null);
  }

  // ─── Cuotas ───────────────────────────────────────────────────────────────
  private cargarCuotas(doc: DocumentoProposicion): void {
    this.cargandoCuotas.set(true);
    // Buscar DocumentoPago por idFisico
    const dbFisico = new DatosBusqueda();
    dbFisico.asignaUnCampoSinTrunc(
      TipoDatos.LONG, 'idFisico', doc.idOrigen.toString(), TipoComandosBusqueda.IGUAL
    );
    this.documentoPagoS.selectByCriteria([dbFisico]).subscribe({
      next: (dps) => {
        if (!dps || dps.length === 0) {
          this.snackBar.open('El documento no tiene registro de pago asociado.', 'Cerrar', { duration: 4000 });
          this.cargandoCuotas.set(false);
          return;
        }
        this.documentoPagoActual.set(dps[0]);
        this.buscarFinanciaciones(dps[0].codigo);
      },
      error: () => {
        this.snackBar.open('No se pudo encontrar el documento de pago.', 'Cerrar', { duration: 4000 });
        this.cargandoCuotas.set(false);
      },
    });
  }

  private buscarFinanciaciones(documentoPagoCodigo: number): void {
    const dbFin = new DatosBusqueda();
    dbFin.asignaValorConCampoPadre(
      TipoDatos.LONG, 'documentoPago', 'codigo',
      documentoPagoCodigo.toString(), TipoComandosBusqueda.IGUAL
    );
    this.financiacionS.selectByCriteria([dbFin]).subscribe({
      next: (fins) => {
        if (!fins || fins.length === 0) {
          this.snackBar.open('El documento no tiene cuotas de financiación registradas.', 'Cerrar', { duration: 4000 });
          this.cargandoCuotas.set(false);
          return;
        }
        const dbCuota = new DatosBusqueda();
        dbCuota.asignaValorConCampoPadre(
          TipoDatos.LONG, 'financiacionXDocumentoPago', 'codigo',
          fins[0].codigo.toString(), TipoComandosBusqueda.IGUAL
        );
        this.cuotaS.selectByCriteria([dbCuota]).subscribe({
          next: (cuotas) => {
            this.cuotas = (cuotas || []).filter(c => (c.saldo ?? 0) > 0);
            this.dsCuotas.data = this.cuotas;
            this.cargandoCuotas.set(false);
          },
          error: () => {
            this.snackBar.open('No se pudieron cargar las cuotas.', 'Cerrar', { duration: 4000 });
            this.cargandoCuotas.set(false);
          },
        });
      },
      error: () => {
        this.snackBar.open('No se pudo cargar la financiación del documento.', 'Cerrar', { duration: 4000 });
        this.cargandoCuotas.set(false);
      },
    });
  }

  // ─── Formulario de proposición ────────────────────────
  abrirFormulario(cuota: CuotaXFinanciacionPago): void {
    this.cuotaSeleccionada.set(cuota);
    this.modoFormulario.set('nuevo');
    this.formProposicion.reset({
      fechaPago: null,
      valorPropuesto: cuota.saldo,
      observacion: '',
    });
  }

  cancelarFormulario(): void {
    this.modoFormulario.set(null);
    this.cuotaSeleccionada.set(null);
    this.formProposicion.reset();
  }

  guardarProposicion(): void {
    if (this.formProposicion.invalid) {
      this.formProposicion.markAllAsTouched();
      return;
    }
    const cuota = this.cuotaSeleccionada();
    if (!cuota) return;

    const { fechaPago, valorPropuesto, observacion } = this.formProposicion.value;

    const payload: Partial<ProposicionPagoXCuota> = {
      cuotaXFinanciacionPago: cuota,
      valorCuota: cuota.valor,
      valorPropuesto: Number(valorPropuesto),
      fechaPago: this.toDate(fechaPago),
      fechaIngreso: new Date(),
      tipo: 1,
      numeroAbono: 0,
      estado: 1,
      nombreUsuario: this.nombreUsuario,
      aprobacionesRealizadas: 0,
    };

    this.guardando.set(true);
    this.proposicionS.add(payload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.snackBar.open('Proposición de pago registrada exitosamente.', 'Cerrar', {
          duration: 4000,
          panelClass: ['snack-success'],
        });
        this.cancelarFormulario();
        const doc = this.docSeleccionado();
        if (doc) this.cargarCuotas(doc);
      },
      error: () => {
        this.guardando.set(false);
        this.snackBar.open('Error al guardar la proposición de pago.', 'Cerrar', {
          duration: 5000,
          panelClass: ['snack-error'],
        });
      },
    });
  }

  // ─── Utilidades ───────────────────────────────────────
  formatFecha(fecha: any): string {
    if (!fecha) return '—';
    try {
      const d = new Date(fecha);
      if (isNaN(d.getTime())) return '—';
      return new Intl.DateTimeFormat('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
    } catch { return '—'; }
  }

  formatMoneda(valor: number | undefined | null): string {
    if (valor == null) return '$0.00';
    return `$${Number(valor).toFixed(2)}`;
  }

  private toDate(val: any): Date {
    if (!val) return new Date();
    if (val instanceof Date) return val;
    return new Date(val);
  }

  /** Determina si un documento o cuota está vencido/a */
  estaVencida(item: { fechaVencimiento?: any }): boolean {
    if (!item?.fechaVencimiento) return false;
    return new Date(item.fechaVencimiento) < new Date();
  }

  trackByCuota(_: number, item: CuotaXFinanciacionPago): number { return item.codigo; }
  trackByDoc(_: number, item: DocumentoProposicion): number { return item.idOrigen; }
}
