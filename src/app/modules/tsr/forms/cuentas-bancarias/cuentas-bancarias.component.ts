import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { Banco } from '../../model/banco';
import { CuentaBancaria } from '../../model/cuenta-bancaria';
import { BancoService } from '../../service/banco.service';
import { CuentaBancariaService } from '../../service/cuenta-bancaria.service';

@Component({
  selector: 'app-cuentas-bancarias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './cuentas-bancarias.component.html',
  styleUrls: ['./cuentas-bancarias.component.scss'],
})
export class CuentasBancariasComponent implements OnInit {
  // Estado
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Bancos
  bancos = signal<Banco[]>([]);
  bancoSeleccionado = signal<Banco | null>(null);
  filtroBancos = signal<string>('');
  bancosPage = signal<Banco[]>([]);
  bancosTotal = signal<number>(0);
  bancosPageSize = signal<number>(8);
  bancosPageIndex = signal<number>(0);

  // Cuentas
  cuentas = signal<CuentaBancaria[]>([]);
  cuentasFiltradas = signal<CuentaBancaria[]>([]);
  filtroCuentas = signal<string>('');
  cuentasPage = signal<CuentaBancaria[]>([]);
  cuentasTotal = signal<number>(0);
  cuentasPageSize = signal<number>(8);
  cuentasPageIndex = signal<number>(0);

  // Formulario (información general)
  numeroCuenta = '';
  tipoCuentaSel: DetalleRubro | null = null;
  saldoInicial: number | null = null;
  cuentaContableNombre = '';
  fechaApertura = '';
  titular = '';
  oficialCuenta = '';
  observaciones = '';
  telefono1 = '';
  telefono2 = '';
  celular = '';
  fax = '';
  direccion = '';
  email = '';
  estado: 0 | 1 = 1;

  // Catálogos
  tiposCuenta = signal<DetalleRubro[]>([]); // TODO: ajustar id de rubro real

  // Tablas: columnas
  displayedColumnsBancos: string[] = ['nombre'];
  displayedColumnsCuentas: string[] = [
    'numero',
    'tipo',
    'saldo',
    'cuentaContable',
    'fIngreso',
    'fDesactiva',
    'estado',
  ];

  hasBanco = computed(() => !!this.bancoSeleccionado());

  constructor(
    private bancoService: BancoService,
    private cuentaService: CuentaBancariaService,
    private detalleRubroService: DetalleRubroService
  ) {}

  ngOnInit(): void {
    this.cargarBancos();
    this.cargarTiposCuenta();
    this.cargarCuentas();
  }

  cargarBancos(): void {
    const criterios: DatosBusqueda[] = [];
    const dbOrder = new DatosBusqueda();
    dbOrder.orderBy('codigo');
    criterios.push(dbOrder);

    this.bancoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const arr = Array.isArray(data) ? data : [];
        this.bancos.set(arr);
        this.bancosTotal.set(arr.length);
        this.bancosPageIndex.set(0);
        this.updateBancoPage();
      },
      error: () => {
        this.bancoService.getAll().subscribe({
          next: (arr) => {
            const list = Array.isArray(arr) ? arr : [];
            this.bancos.set(list);
            this.bancosTotal.set(list.length);
            this.bancosPageIndex.set(0);
            this.updateBancoPage();
          },
          error: () => this.errorMsg.set('Error al cargar bancos'),
        });
      },
    });
  }

  cargarCuentas(): void {
    this.cuentaService.getAll().subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        this.cuentas.set(items);
        this.applyCuentaFilter();
      },
      error: () => this.errorMsg.set('Error al cargar cuentas bancarias'),
    });
  }

  cargarTiposCuenta(): void {
    // Intentar cargar desde caché un rubro hipotético (ID por definir)
    const cached = this.detalleRubroService.getDetallesByParent(0);
    if (Array.isArray(cached) && cached.length) {
      this.tiposCuenta.set(cached);
      return;
    }
  }

  seleccionarBanco(b: Banco): void {
    this.bancoSeleccionado.set(b);
    this.applyCuentaFilter();
  }

  // Bancos
  aplicarFiltroBancos(value: string): void {
    this.filtroBancos.set(value || '');
    this.bancosPageIndex.set(0);
    this.updateBancoPage();
  }

  updateBancoPage(): void {
    const filtro = this.filtroBancos().toLowerCase();
    const filtered = this.bancos().filter((b) =>
      `${(b as any).nombre ?? ''}`.toLowerCase().includes(filtro)
    );
    this.bancosTotal.set(filtered.length);
    const start = this.bancosPageIndex() * this.bancosPageSize();
    const end = start + this.bancosPageSize();
    this.bancosPage.set(filtered.slice(start, end));
  }

  onBancosPageChange(event: PageEvent): void {
    this.bancosPageIndex.set(event.pageIndex);
    this.bancosPageSize.set(event.pageSize);
    this.updateBancoPage();
  }

  // Cuentas
  aplicarFiltroCuentas(value: string): void {
    this.filtroCuentas.set(value || '');
    this.cuentasPageIndex.set(0);
    this.updateCuentaPage();
  }

  applyCuentaFilter(): void {
    const banco = this.bancoSeleccionado();
    const items = this.cuentas();
    const filtered = banco
      ? items.filter((c) => (c as any).banco?.codigo === (banco as any).codigo)
      : items;
    this.cuentasFiltradas.set(filtered);
    this.cuentasTotal.set(filtered.length);
    this.cuentasPageIndex.set(0);
    this.updateCuentaPage();
  }

  updateCuentaPage(): void {
    const filtro = this.filtroCuentas().toLowerCase();
    const filtered = this.cuentasFiltradas().filter((c) => {
      const base = `${(c as any).numeroCuenta ?? ''}`.toLowerCase();
      return base.includes(filtro);
    });
    this.cuentasTotal.set(filtered.length);
    const start = this.cuentasPageIndex() * this.cuentasPageSize();
    const end = start + this.cuentasPageSize();
    this.cuentasPage.set(filtered.slice(start, end));
  }

  onCuentasPageChange(event: PageEvent): void {
    this.cuentasPageIndex.set(event.pageIndex);
    this.cuentasPageSize.set(event.pageSize);
    this.updateCuentaPage();
  }

  // Helpers de render
  mostrarTipoCuenta(row: CuentaBancaria): string {
    const p: number = (row as any).rubroTipoCuentaP;
    const h: number = (row as any).rubroTipoCuentaH;
    const found = this.tiposCuenta().find(
      (r) => r.rubro?.codigoAlterno === p && r.codigoAlterno === h
    );
    return found ? found.descripcion : '—';
  }

  mostrarEstado(row: CuentaBancaria): string {
    return (row as any).estado === 1 ? 'Activo' : 'Inactivo';
  }
}
