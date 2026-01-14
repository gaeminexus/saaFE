import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

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
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, MatTableModule, MatPaginatorModule],
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

  constructor() {
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
}
