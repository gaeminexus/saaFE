import { Component, OnInit, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, UntypedFormControl } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

import { FacturaCompraService } from '../../../service/factura-compra.service';
import { NotaCreditoCompraService } from '../../../service/nota-credito-compra.service';
import { NotaDebitoCompraService } from '../../../service/nota-debito-compra.service';
import { LiquidacionCompraCompraService } from '../../../service/liquidacion-compra-compra.service';
import { RetencionCompraService } from '../../../service/retencion-compra.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';

export interface DashboardRow {
  grupo: string;
  cantidadDocumentos: number;
  subtotal: number;
  subcero: number;
  vIVA: number;
  vICE: number;
  descuento: number;
  total: number;
}

export type AgrupacionTipo = 'proveedor' | 'tipo' | 'grupo';

@Component({
  selector: 'app-dashboard-cxp',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTableModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './dashboard-cxp.component.html',
  styleUrls: ['./dashboard-cxp.component.scss'],
})
export class DashboardCxpComponent implements OnInit {

  @ViewChild('fechaDesdeInput') fechaDesdeInput!: ElementRef;
  @ViewChild('fechaHastaInput') fechaHastaInput!: ElementRef;
  @ViewChild(MatSort) sort!: MatSort;

  fechaDesdeControl = new UntypedFormControl(null);
  fechaHastaControl = new UntypedFormControl(null);

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  agrupacion = signal<AgrupacionTipo>('proveedor');

  // Datos crudos normalizados
  private rawData: any[] = [];

  rows = signal<DashboardRow[]>([]);

  // Totales generales
  totalSubtotal = computed(() => this.rows().reduce((s, r) => s + r.subtotal, 0));
  totalSubcero = computed(() => this.rows().reduce((s, r) => s + r.subcero, 0));
  totalIVA = computed(() => this.rows().reduce((s, r) => s + r.vIVA, 0));
  totalICE = computed(() => this.rows().reduce((s, r) => s + r.vICE, 0));
  totalDescuento = computed(() => this.rows().reduce((s, r) => s + r.descuento, 0));
  totalGeneral = computed(() => this.rows().reduce((s, r) => s + r.total, 0));
  totalDocs = computed(() => this.rows().reduce((s, r) => s + r.cantidadDocumentos, 0));

  displayedColumns = ['grupo', 'cantidadDocumentos', 'subtotal', 'subcero', 'vIVA', 'vICE', 'descuento', 'total'];

  constructor(
    private facturaService: FacturaCompraService,
    private notaCreditoService: NotaCreditoCompraService,
    private notaDebitoService: NotaDebitoCompraService,
    private liquidacionService: LiquidacionCompraCompraService,
    private retencionService: RetencionCompraService,
    private fn: FuncionesDatosService,
  ) {}

  ngOnInit(): void {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.fechaDesdeControl.setValue(primerDia);
    this.fechaHastaControl.setValue(hoy);
  }

  private getEmpresaId(): string {
    return localStorage.getItem('empresaCodigo') || localStorage.getItem('empresaId') || '';
  }

  private toDate(val: any): Date | null {
    if (!val) return null;
    if (Array.isArray(val)) {
      return new Date(val[0], val[1] - 1, val[2]);
    }
    return new Date(val);
  }

  private formatFechaForCriteria(date: Date | null): string {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  buscar(): void {
    const desde = this.fechaDesdeControl.value as Date | null;
    const hasta = this.fechaHastaControl.value as Date | null;

    if (!desde || !hasta) {
      this.errorMsg.set('Seleccione el rango de fechas.');
      return;
    }

    this.errorMsg.set('');
    this.loading.set(true);
    this.rawData = [];

    const empresaId = this.getEmpresaId();
    const criteria = {
      empresa: { id: empresaId },
      fechaDesde: this.formatFechaForCriteria(desde),
      fechaHasta: this.formatFechaForCriteria(hasta),
    };

    forkJoin({
      facturas: this.facturaService.selectByCriteria(criteria).pipe(catchError(() => of([]))),
      notas_credito: this.notaCreditoService.selectByCriteria(criteria).pipe(catchError(() => of([]))),
      notas_debito: this.notaDebitoService.selectByCriteria(criteria).pipe(catchError(() => of([]))),
      liquidaciones: this.liquidacionService.selectByCriteria(criteria).pipe(catchError(() => of([]))),
      retenciones: this.retencionService.selectByCriteria(criteria).pipe(catchError(() => of([]))),
    }).subscribe({
      next: (res) => {
        const normalized: any[] = [];

        (res.facturas || []).forEach((d: any) => normalized.push({
          tipo: 'Factura Compra',
          proveedor: d.titular?.razonSocial || d.titular?.nombre || 'Sin nombre',
          idProveedor: d.titular?.id,
          subtotal: d.subtotal || 0,
          subcero: d.subcero || 0,
          vIVA: (d.vIVA || 0) + (d.vIVA5 || 0) + (d.vIVA8 || 0),
          vICE: d.vICE || 0,
          descuento: d.descuento || 0,
          total: d.total || 0,
        }));

        (res.notas_credito || []).forEach((d: any) => normalized.push({
          tipo: 'Nota Crédito Compra',
          proveedor: d.titular?.razonSocial || d.titular?.nombre || 'Sin nombre',
          idProveedor: d.titular?.id,
          subtotal: d.subtotal || 0,
          subcero: d.subcero || 0,
          vIVA: d.vIVA || 0,
          vICE: d.vICE || 0,
          descuento: d.descuento || 0,
          total: d.total || 0,
        }));

        (res.notas_debito || []).forEach((d: any) => normalized.push({
          tipo: 'Nota Débito Compra',
          proveedor: d.titular?.razonSocial || d.titular?.nombre || 'Sin nombre',
          idProveedor: d.titular?.id,
          subtotal: d.subtotal || 0,
          subcero: d.subcero || 0,
          vIVA: d.vIVA || 0,
          vICE: d.vICE || 0,
          descuento: d.descuento || 0,
          total: d.total || 0,
        }));

        (res.liquidaciones || []).forEach((d: any) => normalized.push({
          tipo: 'Liquidación Compra',
          proveedor: d.titular?.razonSocial || d.titular?.nombre || 'Sin nombre',
          idProveedor: d.titular?.id,
          subtotal: d.subtotal || 0,
          subcero: d.subcero || 0,
          vIVA: d.vIVA || 0,
          vICE: d.vICE || 0,
          descuento: d.descuento || 0,
          total: d.total || 0,
        }));

        (res.retenciones || []).forEach((d: any) => normalized.push({
          tipo: 'Retención Compra',
          proveedor: d.proveedor?.razonSocial || d.proveedor?.nombre || 'Sin nombre',
          idProveedor: d.proveedor?.id,
          subtotal: 0,
          subcero: 0,
          vIVA: 0,
          vICE: 0,
          descuento: 0,
          total: d.total || 0,
        }));

        this.rawData = normalized;
        this.agrupar();
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar los datos. Intente nuevamente.');
        this.loading.set(false);
      },
    });
  }

  cambiarAgrupacion(tipo: AgrupacionTipo): void {
    this.agrupacion.set(tipo);
    this.agrupar();
  }

  private agrupar(): void {
    const tipo = this.agrupacion();
    const map = new Map<string, DashboardRow>();

    this.rawData.forEach((d) => {
      const key = tipo === 'proveedor' ? d.proveedor
        : tipo === 'tipo' ? d.tipo
        : d.proveedor; // grupo productos: usamos proveedor como fallback

      if (!map.has(key)) {
        map.set(key, {
          grupo: key,
          cantidadDocumentos: 0,
          subtotal: 0,
          subcero: 0,
          vIVA: 0,
          vICE: 0,
          descuento: 0,
          total: 0,
        });
      }

      const row = map.get(key)!;
      row.cantidadDocumentos++;
      row.subtotal += d.subtotal;
      row.subcero += d.subcero;
      row.vIVA += d.vIVA;
      row.vICE += d.vICE;
      row.descuento += d.descuento;
      row.total += d.total;
    });

    this.rows.set(Array.from(map.values()).sort((a, b) => b.total - a.total));
  }

  getColumnHeader(col: string): string {
    const headers: Record<string, string> = {
      grupo: this.agrupacion() === 'proveedor' ? 'Proveedor'
        : this.agrupacion() === 'tipo' ? 'Tipo de Documento'
        : 'Grupo Productos',
      cantidadDocumentos: 'Docs',
      subtotal: 'Subtotal Gravado',
      subcero: 'Subtotal 0%',
      vIVA: 'IVA',
      vICE: 'ICE',
      descuento: 'Descuento',
      total: 'Total',
    };
    return headers[col] || col;
  }

  limpiar(): void {
    this.fechaDesdeControl.setValue(null);
    this.fechaHastaControl.setValue(null);
    this.rows.set([]);
    this.rawData = [];
    this.errorMsg.set('');
  }
}
