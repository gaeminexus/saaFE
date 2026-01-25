import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

interface CuentaRow {
  numero: string;
  nombre: string;
  saldoAnterior: number;
}

interface DetalleRow {
  fecha: string;
  numero: string;
  descripcion: string;
  debe: number;
  haber: number;
  saldoActual: number;
  estado: string;
}

@Component({
  selector: 'cnt-reporte-mayor-analitico',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatTableModule,
  ],
  templateUrl: './reporte-mayor-analitico.component.html',
  styleUrls: ['./reporte-mayor-analitico.component.scss'],
})
export class ReporteMayorAnaliticoComponent {
  // Filtros
  cuentaInicial = signal<string>('');
  cuentaFinal = signal<string>('');
  fechaInicial = signal<string>('');
  fechaFinal = signal<string>('');
  acumulado = signal<boolean>(false);
  centroCosto = signal<boolean>(false);

  // Datos demo (placeholder)
  cuentasColumns = ['numero', 'nombre', 'saldoAnterior'];
  cuentasData = signal<CuentaRow[]>([
    { numero: '1.1.01', nombre: 'Caja', saldoAnterior: 1200 },
    { numero: '1.1.02', nombre: 'Bancos', saldoAnterior: 5400 },
  ]);

  detalleColumns = ['fecha', 'numero', 'descripcion', 'debe', 'haber', 'saldoActual', 'estado'];
  detalleData = signal<DetalleRow[]>([
    {
      fecha: '2025-12-01',
      numero: 'AS-0001',
      descripcion: 'Apertura',
      debe: 0,
      haber: 0,
      saldoActual: 1200,
      estado: 'Contabilizado',
    },
  ]);

  generar(): void {
    // Conectar a servicio posteriormente; por ahora, placeholder
    alert('Mayor Analítico generado (demo).');
  }
}
