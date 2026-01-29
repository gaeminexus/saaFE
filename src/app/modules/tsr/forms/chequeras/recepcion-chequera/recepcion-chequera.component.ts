import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ExportService } from '../../../../../shared/services/export.service';

interface Banco {
  id: number;
  nombre: string;
}

interface CuentaBancaria {
  id: number;
  bancoId: number;
  numero: string;
}

interface ChequeraSolicitud {
  banco: string;
  cuentaBancaria: string;
  fechaSolicitud: string;
  numeroCheques: number;
}

@Component({
  selector: 'app-recepcion-chequera',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './recepcion-chequera.component.html',
  styleUrls: ['./recepcion-chequera.component.scss'],
})
export class RecepcionChequeraComponent {
  // Catálogos (cascarón): se poblarán desde servicios luego
  bancos = signal<Banco[]>([]);
  cuentas = signal<CuentaBancaria[]>([]);

  // Filtros
  selectedBancoId = signal<number | null>(null);
  selectedCuentaId = signal<number | null>(null);

  // Tabla de chequeras solicitadas (cascarón)
  solicitudes = signal<ChequeraSolicitud[]>([]);
  displayedColumns = ['banco', 'cuentaBancaria', 'fechaSolicitud', 'numeroCheques'];

  // Subconjunto filtrado según banco/cuenta seleccionados
  filteredSolicitudes = computed(() => {
    const data = this.solicitudes();
    const bancoId = this.selectedBancoId();
    const cuentaId = this.selectedCuentaId();

    const bancoNombre = bancoId
      ? (this.bancos().find((b) => b.id === bancoId)?.nombre ?? null)
      : null;
    const cuentaNumero = cuentaId
      ? (this.cuentas().find((c) => c.id === cuentaId)?.numero ?? null)
      : null;

    return data.filter((s) => {
      const byBanco = bancoNombre ? s.banco === bancoNombre : true;
      const byCuenta = cuentaNumero ? s.cuentaBancaria === cuentaNumero : true;
      return byBanco && byCuenta;
    });
  });

  // Simular carga mínima para visualizar estructura
  constructor(private exportService: ExportService) {
    const mockBancos: Banco[] = [
      { id: 1, nombre: 'Banco A' },
      { id: 2, nombre: 'Banco B' },
    ];
    const mockCuentas: CuentaBancaria[] = [
      { id: 10, bancoId: 1, numero: '001-123456-7' },
      { id: 11, bancoId: 2, numero: '002-987654-3' },
    ];

    this.bancos.set(mockBancos);
    this.cuentas.set(mockCuentas);

    // Tabla vacía por defecto (como referencia),
    // deja una fila de muestra opcional para ver layout
    this.solicitudes.set([]);
  }

  onBancoChange(bancoId: number | null): void {
    this.selectedBancoId.set(bancoId);
    // Reset cuenta al cambiar banco
    this.selectedCuentaId.set(null);
  }

  onCuentaChange(cuentaId: number | null): void {
    this.selectedCuentaId.set(cuentaId);
  }

  // Exportaciones
  exportSolicitudesCSV(): void {
    const headers = ['Banco', 'Cuenta Bancaria', 'Fecha Solicitud', 'Número de Cheques'];
    const rows = this.filteredSolicitudes().map((s) => ({
      banco: s.banco ?? '',
      cuentaBancaria: s.cuentaBancaria ?? '',
      fechaSolicitud: s.fechaSolicitud ?? '',
      numeroCheques: s.numeroCheques ?? '',
    }));
    this.exportService.exportToCSV(rows, 'recepcion-chequera', headers, [
      'banco',
      'cuentaBancaria',
      'fechaSolicitud',
      'numeroCheques',
    ]);
  }

  exportSolicitudesPDF(): void {
    const headers = ['Banco', 'Cuenta Bancaria', 'Fecha Solicitud', 'Número de Cheques'];
    const rows = this.filteredSolicitudes().map((s) => ({
      banco: s.banco ?? '',
      cuentaBancaria: s.cuentaBancaria ?? '',
      fechaSolicitud: s.fechaSolicitud ?? '',
      numeroCheques: s.numeroCheques ?? '',
    }));
    this.exportService.exportToPDF(rows, 'recepcion-chequera', 'Chequeras Solicitadas', headers, [
      'banco',
      'cuentaBancaria',
      'fechaSolicitud',
      'numeroCheques',
    ]);
  }
}
