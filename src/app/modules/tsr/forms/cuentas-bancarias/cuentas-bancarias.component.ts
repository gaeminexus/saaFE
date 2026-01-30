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
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../shared/services/export.service';
import { FuncionesDatosService } from '../../../../shared/services/funciones-datos.service';
import { PlanCuenta } from '../../../cnt/model/plan-cuenta';
import { PlanCuentaService } from '../../../cnt/service/plan-cuenta.service';
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
    MatTooltipModule,
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
  saldoInicial = '';
  cuentaContableSeleccionada: PlanCuenta | null = null;
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
  estadoSeleccionado: DetalleRubro | null = null;
  codigoEdicion: number | null = null; // null = crear, número = editar

  // Catálogos
  tiposCuenta = signal<DetalleRubro[]>([]);
  estadosCuenta = signal<DetalleRubro[]>([]);
  cuentasContables = signal<PlanCuenta[]>([]);

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
    'acciones',
  ];

  hasBanco = computed(() => !!this.bancoSeleccionado());

  constructor(
    private bancoService: BancoService,
    private cuentaService: CuentaBancariaService,
    private detalleRubroService: DetalleRubroService,
    private planCuentaService: PlanCuentaService,
    private exportService: ExportService,
    private funcionesDatos: FuncionesDatosService,
  ) {}

  ngOnInit(): void {
    this.cargarBancos();
    this.cargarTiposCuenta();
    this.cargarEstadosCuenta();
    this.cargarCuentasContables();
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
        // Fallback a getAll si selectByCriteria falla
        this.bancoService.getAll().subscribe({
          next: (arr) => {
            const list = Array.isArray(arr) ? arr : [];
            // Ordenar por código en frontend como fallback
            list.sort((a, b) => (a.codigo ?? 0) - (b.codigo ?? 0));
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
    // Cargar tipos de cuenta del rubro 23 (acceso síncrono - datos ya cargados en memoria)
    const rubros = this.detalleRubroService.getDetallesByParent(23);
    this.tiposCuenta.set(Array.isArray(rubros) ? rubros : []);
  }

  cargarEstadosCuenta(): void {
    // Cargar estados de cuenta del rubro 50 (acceso síncrono - datos ya cargados en memoria)
    const estados = this.detalleRubroService.getDetallesByParent(50);
    this.estadosCuenta.set(Array.isArray(estados) ? estados : []);

    // Establecer valor por defecto en 3
    const estadoPorDefecto = estados?.find((e) => e.codigoAlterno === 3);
    if (estadoPorDefecto) {
      this.estadoSeleccionado = estadoPorDefecto;
    }
  }

  cargarCuentasContables(): void {
    this.planCuentaService.getAll().subscribe({
      next: (data) => {
        const cuentas = Array.isArray(data) ? data : [];
        // Filtrar solo cuentas activas
        const activas = cuentas.filter((c) => c.estado === 1);
        // Ordenar por cuentaContable (número de cuenta)
        activas.sort((a, b) => {
          const cuentaA = a.cuentaContable || '';
          const cuentaB = b.cuentaContable || '';
          return cuentaA.localeCompare(cuentaB, undefined, { numeric: true });
        });
        this.cuentasContables.set(activas);
      },
      error: () => this.errorMsg.set('Error al cargar cuentas contables'),
    });
  }

  // Función para comparar cuentas contables en el mat-select
  compararCuentas(c1: PlanCuenta | null, c2: PlanCuenta | null): boolean {
    if (!c1 || !c2) return c1 === c2;
    return c1.codigo === c2.codigo;
  }

  // Función para comparar rubros en los mat-select (tipos y estados)
  compararRubros(r1: DetalleRubro | null, r2: DetalleRubro | null): boolean {
    if (!r1 || !r2) return r1 === r2;
    return (
      r1.codigoAlterno === r2.codigoAlterno && r1.rubro?.codigoAlterno === r2.rubro?.codigoAlterno
    );
  }

  formatearSaldo(): void {
    if (!this.saldoInicial) return;

    // Remover todo excepto números y punto decimal
    const valorLimpio = this.saldoInicial.replace(/[^0-9.]/g, '');
    const numero = parseFloat(valorLimpio);

    if (isNaN(numero)) {
      this.saldoInicial = '';
      return;
    }

    // Formatear con 2 decimales y separadores de miles
    this.saldoInicial = numero.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  parsearSaldo(): number {
    if (!this.saldoInicial) return 0;
    // Remover comas y convertir a número
    return parseFloat(this.saldoInicial.replace(/,/g, '')) || 0;
  }

  guardar(): void {
    if (!this.formValido()) {
      this.errorMsg.set('Debe seleccionar un banco y completar los campos obligatorios');
      return;
    }

    const payload: any = {
      banco: { codigo: this.bancoSeleccionado()?.codigo },
      numeroCuenta: this.numeroCuenta.trim(),
      saldoInicial: this.parsearSaldo(),
      titular: this.titular.trim(),
      oficialCuenta: this.oficialCuenta.trim(),
      observacion: this.observaciones.trim(),
      telefono1: this.telefono1.trim(),
      telefono2: this.telefono2.trim(),
      celular: this.celular.trim(),
      fax: this.fax.trim(),
      direccion: this.direccion.trim(),
      email: this.email.trim(),
    };

    // Tipo de cuenta (rubro 23)
    if (this.tipoCuentaSel) {
      payload.rubroTipoCuentaP = this.tipoCuentaSel.rubro?.codigoAlterno ?? 23;
      payload.rubroTipoCuentaH = this.tipoCuentaSel.codigoAlterno;
    }

    // Estado (rubro 50) - por defecto 3
    if (this.estadoSeleccionado) {
      payload.estado = this.estadoSeleccionado.codigoAlterno;
    } else {
      payload.estado = 3; // Valor por defecto
    }

    // Cuenta contable
    if (this.cuentaContableSeleccionada) {
      payload.planCuenta = { codigo: this.cuentaContableSeleccionada.codigo };
    }

    // Fecha de apertura - convertir a LocalDateTime (ISO 8601 con hora)
    if (this.fechaApertura) {
      payload.fechaCreacion = `${this.fechaApertura}T00:00:00`;
    }

    // Fecha de ingreso - siempre la fecha actual
    const now = new Date();
    const fechaActual = now.toISOString().substring(0, 19); // Formato: YYYY-MM-DDTHH:mm:ss
    payload.fechaIngreso = fechaActual;

    this.loading.set(true);
    this.errorMsg.set('');

    this.cuentaService.add(payload).subscribe({
      next: () => {
        this.limpiarFormulario();
        this.cargarCuentas();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al guardar cuenta bancaria:', err);
        this.errorMsg.set('No se pudo guardar la cuenta bancaria');
        this.loading.set(false);
      },
    });
  }

  limpiarFormulario(): void {
    this.numeroCuenta = '';
    this.tipoCuentaSel = null;
    this.saldoInicial = '';
    this.cuentaContableSeleccionada = null;
    this.fechaApertura = '';
    this.titular = '';
    this.oficialCuenta = '';
    this.observaciones = '';
    this.telefono1 = '';
    this.telefono2 = '';
    this.celular = '';
    this.fax = '';
    this.direccion = '';
    this.email = '';

    // Restablecer estado por defecto (3)
    const estadoPorDefecto = this.estadosCuenta().find((e) => e.codigoAlterno === 3);
    this.estadoSeleccionado = estadoPorDefecto ?? null;

    this.codigoEdicion = null;
    this.errorMsg.set('');
  }

  editar(row: CuentaBancaria): void {
    this.codigoEdicion = row.codigo ?? null;

    // Solo cargar los campos editables
    this.oficialCuenta = (row as any).oficialCuenta ?? '';

    // Cargar cuenta contable
    const planCuenta = (row as any).planCuenta;
    if (planCuenta) {
      const found = this.cuentasContables().find((c) => c.codigo === planCuenta.codigo);
      this.cuentaContableSeleccionada = found ?? null;
    } else {
      this.cuentaContableSeleccionada = null;
    }

    // Cargar datos para mostrar (campos deshabilitados)
    this.numeroCuenta = row.numeroCuenta ?? '';
    this.titular = (row as any).titular ?? '';
    this.saldoInicial = row.saldoInicial
      ? row.saldoInicial.toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : '';

    const p = (row as any).rubroTipoCuentaP;
    const h = (row as any).rubroTipoCuentaH;
    const foundTipo = this.tiposCuenta().find(
      (r) => r.rubro?.codigoAlterno === p && r.codigoAlterno === h,
    );
    this.tipoCuentaSel = foundTipo ?? null;

    const codigoEstado = (row as any).estado;
    const foundEstado = this.estadosCuenta().find((e) => e.codigoAlterno === codigoEstado);
    this.estadoSeleccionado = foundEstado ?? null;

    this.errorMsg.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  actualizar(): void {
    if (!this.codigoEdicion) return;

    // Buscar registro original para preservar datos
    const registroOriginal = this.cuentas().find((c) => c.codigo === this.codigoEdicion);
    if (!registroOriginal) {
      this.errorMsg.set('No se encontró el registro a actualizar');
      return;
    }

    const payload: any = {
      codigo: this.codigoEdicion,
      // Campos editables
      oficialCuenta: this.oficialCuenta.trim(),

      // Preservar campos no editables del registro original
      banco: (registroOriginal as any).banco,
      numeroCuenta: (registroOriginal as any).numeroCuenta,
      saldoInicial: (registroOriginal as any).saldoInicial,
      titular: (registroOriginal as any).titular,
      rubroTipoCuentaP: (registroOriginal as any).rubroTipoCuentaP,
      rubroTipoCuentaH: (registroOriginal as any).rubroTipoCuentaH,
      estado: (registroOriginal as any).estado,
      fechaCreacion: (registroOriginal as any).fechaCreacion,
      fechaIngreso: (registroOriginal as any).fechaIngreso,
      observacion: (registroOriginal as any).observacion,
      telefono1: (registroOriginal as any).telefono1,
      telefono2: (registroOriginal as any).telefono2,
      celular: (registroOriginal as any).celular,
      fax: (registroOriginal as any).fax,
      direccion: (registroOriginal as any).direccion,
      email: (registroOriginal as any).email,
    };

    // Cuenta contable (editable)
    if (this.cuentaContableSeleccionada) {
      payload.planCuenta = { codigo: this.cuentaContableSeleccionada.codigo };
    } else if ((registroOriginal as any).planCuenta) {
      payload.planCuenta = (registroOriginal as any).planCuenta;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    this.cuentaService.update(payload).subscribe({
      next: () => {
        this.limpiarFormulario();
        this.cargarCuentas();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al actualizar cuenta bancaria:', err);
        this.errorMsg.set('No se pudo actualizar la cuenta bancaria');
        this.loading.set(false);
      },
    });
  }

  cancelarEdicion(): void {
    this.limpiarFormulario();
  }

  estaEditando(): boolean {
    return this.codigoEdicion !== null;
  }

  formValido(): boolean {
    return !!this.bancoSeleccionado() && !!this.numeroCuenta.trim();
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
      `${(b as any).nombre ?? ''}`.toLowerCase().includes(filtro),
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
      (r) => r.rubro?.codigoAlterno === p && r.codigoAlterno === h,
    );
    return found ? found.descripcion : '—';
  }

  mostrarCuentaContable(row: CuentaBancaria): string {
    const planCuenta = (row as any).planCuenta;
    if (!planCuenta) return '—';
    // Intentar mostrar cuentaContable o cuenta
    return planCuenta.cuentaContable || planCuenta.cuenta || '—';
  }

  mostrarFechaIngreso(row: CuentaBancaria): string {
    // Intentar con fechaIngreso primero, si no existe usar fechaCreacion
    let fecha = (row as any).fechaIngreso || (row as any).fechaCreacion;
    if (!fecha) return '—';

    // Si viene como array [year, month, day, hour, minute], convertir a Date
    if (Array.isArray(fecha)) {
      const [year, month, day, hour = 0, minute = 0] = fecha;
      fecha = new Date(year, month - 1, day, hour, minute);
    }

    try {
      return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
    } catch (e) {
      console.error('Error al formatear fechaIngreso:', e, fecha);
      return '—';
    }
  }

  mostrarFechaInactivo(row: CuentaBancaria): string {
    const fecha = (row as any).fechaInactivo;
    if (!fecha) return '—';

    // Si viene como array [year, month, day, hour, minute], convertir a Date
    let fechaObj = fecha;
    if (Array.isArray(fecha)) {
      const [year, month, day, hour = 0, minute = 0] = fecha;
      fechaObj = new Date(year, month - 1, day, hour, minute);
    }

    try {
      return this.funcionesDatos.formatoFecha(fechaObj, FuncionesDatosService.SOLO_FECHA);
    } catch (e) {
      console.error('Error al formatear fechaInactivo:', e, fecha);
      return '—';
    }
  }

  mostrarEstado(row: CuentaBancaria): string {
    const codigoEstado = (row as any).estado;
    const found = this.estadosCuenta().find((e) => e.codigoAlterno === codigoEstado);
    return found ? found.descripcion : '—';
  }

  // Exportaciones
  exportCuentasCSV(): void {
    const headers = ['Código', 'Nº Cuenta', 'Titular', 'Estado'];
    const rows = this.cuentasFiltradas().map((c) => ({
      codigo: (c as any).codigo ?? '',
      numeroCuenta: (c as any).numeroCuenta ?? '',
      titular: (c as any).titular ?? '',
      estadoLabel: this.mostrarEstado(c),
    }));
    this.exportService.exportToCSV(rows, 'cuentas-bancarias', headers, [
      'codigo',
      'numeroCuenta',
      'titular',
      'estadoLabel',
    ]);
  }

  exportCuentasPDF(): void {
    const headers = ['Código', 'Nº Cuenta', 'Titular', 'Estado'];
    const rows = this.cuentasFiltradas().map((c) => ({
      codigo: (c as any).codigo ?? '',
      numeroCuenta: (c as any).numeroCuenta ?? '',
      titular: (c as any).titular ?? '',
      estadoLabel: this.mostrarEstado(c),
    }));
    this.exportService.exportToPDF(rows, 'cuentas-bancarias', 'Cuentas Bancarias', headers, [
      'codigo',
      'numeroCuenta',
      'titular',
      'estadoLabel',
    ]);
  }
}
