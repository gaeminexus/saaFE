import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
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

interface ChequeraRow {
  fechaSolicitud: string;
  fechaEntrega: string;
  numeroCheques: number;
  chequeDesde: string;
  chequeHasta: string;
  estado: string;
}

interface ChequeRow {
  cheque: string;
  numero: string;
  fechaUso: string;
  fechaImpresion: string;
  fechaEntrega: string;
  asiento: string;
  beneficiario: string;
  monto: number;
  fechaCaducidad: string;
  fechaAnulacion: string;
  estado: string;
}

@Component({
  selector: 'app-chequera',
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
  templateUrl: './chequera.component.html',
  styleUrls: ['./chequera.component.scss'],
})
export class ChequeraComponent {
  // Catálogos
  bancos = signal<Banco[]>([]);
  cuentas = signal<CuentaBancaria[]>([]);

  // Filtros
  selectedBancoId = signal<number | null>(null);
  selectedCuentaId = signal<number | null>(null);

  // Tablas
  chequeras = signal<ChequeraRow[]>([]);
  cheques = signal<ChequeRow[]>([]);

  chequerasColumns = [
    'fechaSolicitud',
    'fechaEntrega',
    'numeroCheques',
    'chequeDesde',
    'chequeHasta',
    'estado',
  ];
  chequesColumns = [
    'cheque',
    'numero',
    'fechaUso',
    'fechaImpresion',
    'fechaEntrega',
    'asiento',
    'beneficiario',
    'monto',
    'fechaCaducidad',
    'fechaAnulacion',
    'estado',
  ];

  constructor(private exportService: ExportService) {
    // Mock para cascarón visual
    this.bancos.set([
      { id: 1, nombre: 'Banco A' },
      { id: 2, nombre: 'Banco B' },
    ]);
    this.cuentas.set([
      { id: 10, bancoId: 1, numero: '001-123456-7' },
      { id: 11, bancoId: 2, numero: '002-987654-3' },
    ]);

    // Tablas vacías inicialmente
    this.chequeras.set([]);
    this.cheques.set([]);
  }

  onBancoChange(id: number | null): void {
    this.selectedBancoId.set(id);
    this.selectedCuentaId.set(null);
  }

  onCuentaChange(id: number | null): void {
    this.selectedCuentaId.set(id);
  }

  // Exportaciones
  exportChequerasCSV(): void {
    const headers = [
      'Fecha Solicitud',
      'Fecha Entrega',
      'Nº Cheques',
      'Cheque Desde',
      'Cheque Hasta',
      'Estado',
    ];
    const rows = this.chequeras().map((r) => ({
      fechaSolicitud: r.fechaSolicitud ?? '',
      fechaEntrega: r.fechaEntrega ?? '',
      numeroCheques: r.numeroCheques ?? '',
      chequeDesde: r.chequeDesde ?? '',
      chequeHasta: r.chequeHasta ?? '',
      estado: r.estado ?? '',
    }));
    this.exportService.exportToCSV(rows, 'chequeras', headers, [
      'fechaSolicitud',
      'fechaEntrega',
      'numeroCheques',
      'chequeDesde',
      'chequeHasta',
      'estado',
    ]);
  }

  exportChequerasPDF(): void {
    const headers = [
      'Fecha Solicitud',
      'Fecha Entrega',
      'Nº Cheques',
      'Cheque Desde',
      'Cheque Hasta',
      'Estado',
    ];
    const rows = this.chequeras().map((r) => ({
      fechaSolicitud: r.fechaSolicitud ?? '',
      fechaEntrega: r.fechaEntrega ?? '',
      numeroCheques: r.numeroCheques ?? '',
      chequeDesde: r.chequeDesde ?? '',
      chequeHasta: r.chequeHasta ?? '',
      estado: r.estado ?? '',
    }));
    this.exportService.exportToPDF(rows, 'chequeras', 'Chequeras', headers, [
      'fechaSolicitud',
      'fechaEntrega',
      'numeroCheques',
      'chequeDesde',
      'chequeHasta',
      'estado',
    ]);
  }

  exportChequesCSV(): void {
    const headers = [
      'Cheque',
      'Número',
      'F. Uso',
      'F. Impresión',
      'F. Entrega',
      'Asiento',
      'Beneficiario',
      'Monto',
      'F. Caducidad',
      'F. Anulación',
      'Estado',
    ];
    const rows = this.cheques().map((r) => ({
      cheque: r.cheque ?? '',
      numero: r.numero ?? '',
      fechaUso: r.fechaUso ?? '',
      fechaImpresion: r.fechaImpresion ?? '',
      fechaEntrega: r.fechaEntrega ?? '',
      asiento: r.asiento ?? '',
      beneficiario: r.beneficiario ?? '',
      monto: r.monto ?? '',
      fechaCaducidad: r.fechaCaducidad ?? '',
      fechaAnulacion: r.fechaAnulacion ?? '',
      estado: r.estado ?? '',
    }));
    this.exportService.exportToCSV(rows, 'cheques', headers, [
      'cheque',
      'numero',
      'fechaUso',
      'fechaImpresion',
      'fechaEntrega',
      'asiento',
      'beneficiario',
      'monto',
      'fechaCaducidad',
      'fechaAnulacion',
      'estado',
    ]);
  }

  exportChequesPDF(): void {
    const headers = [
      'Cheque',
      'Número',
      'F. Uso',
      'F. Impresión',
      'F. Entrega',
      'Asiento',
      'Beneficiario',
      'Monto',
      'F. Caducidad',
      'F. Anulación',
      'Estado',
    ];
    const rows = this.cheques().map((r) => ({
      cheque: r.cheque ?? '',
      numero: r.numero ?? '',
      fechaUso: r.fechaUso ?? '',
      fechaImpresion: r.fechaImpresion ?? '',
      fechaEntrega: r.fechaEntrega ?? '',
      asiento: r.asiento ?? '',
      beneficiario: r.beneficiario ?? '',
      monto: r.monto ?? '',
      fechaCaducidad: r.fechaCaducidad ?? '',
      fechaAnulacion: r.fechaAnulacion ?? '',
      estado: r.estado ?? '',
    }));
    this.exportService.exportToPDF(rows, 'cheques', 'Cheques', headers, [
      'cheque',
      'numero',
      'fechaUso',
      'fechaImpresion',
      'fechaEntrega',
      'asiento',
      'beneficiario',
      'monto',
      'fechaCaducidad',
      'fechaAnulacion',
      'estado',
    ]);
  }
}
