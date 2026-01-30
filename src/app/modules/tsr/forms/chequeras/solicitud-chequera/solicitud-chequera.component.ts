import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { Banco } from '../../../model/banco';
import { CuentaBancaria } from '../../../model/cuenta-bancaria';
import { BancoService } from '../../../service/banco.service';
import { ChequeraService } from '../../../service/chequera.service';
import { CuentaBancariaService } from '../../../service/cuenta-bancaria.service';

@Component({
  selector: 'app-solicitud-chequera',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './solicitud-chequera.component.html',
  styleUrls: ['./solicitud-chequera.component.scss'],
})
export class SolicitudChequeraComponent implements OnInit {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  successMsg = signal<string>('');

  bancos = signal<Banco[]>([]);
  cuentas = signal<CuentaBancaria[]>([]);
  cuentasFiltradas = signal<CuentaBancaria[]>([]);

  // Solicitudes y paginación
  solicitudes = signal<any[]>([]);
  solicitudesPage = signal<any[]>([]);
  totalSolicitudes = signal<number>(0);
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);

  // Estados de chequera
  estadosChequera = signal<DetalleRubro[]>([]);

  // Formulario
  bancoSel: Banco | null = null;
  cuentaSel: CuentaBancaria | null = null;
  fechaSolicitud = '';
  numeroCheques: number | null = null;
  codigoEdicion: number | null = null;

  displayedColumns: string[] = [
    'codigo',
    'banco',
    'cuenta',
    'fechaSolicitud',
    'numeroCheques',
    'estado',
    'acciones',
  ];

  constructor(
    private bancoService: BancoService,
    private cuentaService: CuentaBancariaService,
    private chequeraService: ChequeraService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatos: FuncionesDatosService,
  ) {}

  ngOnInit(): void {
    this.cargarBancos();
    this.cargarCuentas();
    this.cargarEstadosChequera();
    this.cargarSolicitudes();
  }

  cargarBancos(): void {
    const criterios: DatosBusqueda[] = [];
    const order = new DatosBusqueda();
    order.orderBy('codigo');
    criterios.push(order);
    this.bancoService.selectByCriteria(criterios).subscribe({
      next: (data) => this.bancos.set(Array.isArray(data) ? data : []),
      error: () =>
        this.bancoService.getAll().subscribe({
          next: (d2) => this.bancos.set(Array.isArray(d2) ? d2 : []),
          error: () => this.errorMsg.set('Error al cargar bancos'),
        }),
    });
  }

  cargarCuentas(): void {
    this.cuentaService.getAll().subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        this.cuentas.set(items);
        this.filtrarCuentas();
      },
      error: () => this.errorMsg.set('Error al cargar cuentas bancarias'),
    });
  }

  onBancoChange(b: Banco | null): void {
    this.bancoSel = b;
    this.cuentaSel = null;
    this.filtrarCuentas();
  }

  filtrarCuentas(): void {
    const b = this.bancoSel;
    const filtered = b
      ? this.cuentas().filter((c) => (c as any).banco?.codigo === (b as any).codigo)
      : [];
    this.cuentasFiltradas.set(filtered);
  }

  cargarEstadosChequera(): void {
    // Cargar estados de chequera del rubro 25
    const estados = this.detalleRubroService.getDetallesByParent(25);
    this.estadosChequera.set(Array.isArray(estados) ? estados : []);
  }

  cargarSolicitudes(): void {
    this.loading.set(true);
    this.chequeraService.getAll().subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        items.sort((a, b) => (b.codigo ?? 0) - (a.codigo ?? 0)); // Más recientes primero
        this.solicitudes.set(items);
        this.totalSolicitudes.set(items.length);
        this.pageIndex.set(0);
        this.updatePage();
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar solicitudes');
        this.loading.set(false);
      },
    });
  }

  updatePage(): void {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    this.solicitudesPage.set(this.solicitudes().slice(start, end));
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updatePage();
  }

  formValido(): boolean {
    return (
      !!this.bancoSel &&
      !!this.cuentaSel &&
      !!this.fechaSolicitud &&
      !!this.numeroCheques &&
      this.numeroCheques! > 0
    );
  }

  solicitar(): void {
    if (!this.formValido()) return;

    const payload: any = {
      numeroCheques: this.numeroCheques,
      cuentaBancaria: { codigo: (this.cuentaSel as any).codigo },
    };

    // Convertir fecha a LocalDateTime
    if (this.fechaSolicitud) {
      payload.fechaSolicitud = `${this.fechaSolicitud}T00:00:00`;
    }

    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    if (this.codigoEdicion === null) {
      // Estado por defecto: rubro 25, valor 3 (se usa solo P)
      payload.rubroEstadoChequeraP = 3;
      const estadoDefault = this.estadosChequera().find((e) => e.codigoAlterno === 3);
      if (estadoDefault) {
        payload.rubroEstadoChequeraH = estadoDefault.codigoAlterno;
      }
      // Crear
      this.chequeraService.add(payload).subscribe({
        next: () => {
          this.successMsg.set('Solicitud registrada exitosamente');
          this.limpiarFormulario();
          this.cargarSolicitudes();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al crear solicitud:', err);
          this.errorMsg.set('No se pudo registrar la solicitud');
          this.loading.set(false);
        },
      });
    } else {
      // Actualizar
      payload.codigo = this.codigoEdicion;
      this.chequeraService.update(payload).subscribe({
        next: () => {
          this.successMsg.set('Solicitud actualizada exitosamente');
          this.limpiarFormulario();
          this.cargarSolicitudes();
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error al actualizar solicitud:', err);
          this.errorMsg.set('No se pudo actualizar la solicitud');
          this.loading.set(false);
        },
      });
    }
  }

  editar(row: any): void {
    this.codigoEdicion = row.codigo ?? null;

    // Cargar banco
    const bancoRow = (row as any).cuentaBancaria?.banco;
    if (bancoRow) {
      const foundBanco = this.bancos().find((b) => b.codigo === bancoRow.codigo);
      this.bancoSel = foundBanco ?? null;
      this.filtrarCuentas();
    }

    // Cargar cuenta
    const cuentaRow = (row as any).cuentaBancaria;
    if (cuentaRow) {
      const foundCuenta = this.cuentasFiltradas().find((c) => c.codigo === cuentaRow.codigo);
      this.cuentaSel = foundCuenta ?? null;
    }

    // Cargar fecha (convertir de array a string si viene como array)
    let fechaSol = (row as any).fechaSolicitud;
    if (Array.isArray(fechaSol)) {
      const [year, month, day] = fechaSol;
      this.fechaSolicitud = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    } else if (fechaSol) {
      this.fechaSolicitud = fechaSol.substring(0, 10); // YYYY-MM-DD
    }

    this.numeroCheques = (row as any).numeroCheques ?? null;

    this.errorMsg.set('');
    this.successMsg.set('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  eliminar(row: any): void {
    const codigo = row.codigo;
    if (!confirm(`¿Está seguro de eliminar la solicitud #${codigo}?`)) return;

    this.loading.set(true);
    this.chequeraService.delete(codigo).subscribe({
      next: () => {
        this.successMsg.set('Solicitud eliminada');
        this.cargarSolicitudes();
      },
      error: () => {
        this.errorMsg.set('No se pudo eliminar la solicitud');
        this.loading.set(false);
      },
    });
  }

  limpiarFormulario(): void {
    this.bancoSel = null;
    this.cuentaSel = null;
    this.fechaSolicitud = '';
    this.numeroCheques = null;
    this.codigoEdicion = null;
    this.cuentasFiltradas.set([]);
    this.errorMsg.set('');
    this.successMsg.set('');
  }

  estaEditando(): boolean {
    return this.codigoEdicion !== null;
  }

  // Helpers de render
  mostrarBanco(row: any): string {
    return (row as any).cuentaBancaria?.banco?.nombre ?? '—';
  }

  mostrarCuenta(row: any): string {
    return (row as any).cuentaBancaria?.numeroCuenta ?? '—';
  }

  mostrarFechaSolicitud(row: any): string {
    const fecha = (row as any).fechaSolicitud;
    if (!fecha) return '—';

    if (Array.isArray(fecha)) {
      const [year, month, day] = fecha;
      const fechaObj = new Date(year, month - 1, day);
      return this.funcionesDatos.formatoFecha(fechaObj, FuncionesDatosService.SOLO_FECHA);
    }

    return this.funcionesDatos.formatoFecha(fecha, FuncionesDatosService.SOLO_FECHA);
  }

  mostrarEstado(row: any): string {
    const p = (row as any).rubroEstadoChequeraP;
    const h = (row as any).rubroEstadoChequeraH;
    if (p == null) return '—';

    const estados = this.estadosChequera();
    let found;

    if (h != null) {
      // Caso completo P/H
      found = estados.find(
        (e) =>
          String(e.rubro?.codigoAlterno) === String(p) && String(e.codigoAlterno) === String(h),
      );
    } else {
      // Backend solo llena P (como en tus logs)
      found = estados.find((e) => String(e.codigoAlterno) === String(p));
    }

    return found ? found.descripcion : '—';
  }
}
