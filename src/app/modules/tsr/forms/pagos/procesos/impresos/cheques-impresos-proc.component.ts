import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

interface ChequeImpresoRow {
  numero: string;
  beneficiario: string;
  banco: string;
  cuenta: string;
  valor: number;
  fechaImpresion: string; // ISO
}

@Component({
  selector: 'app-cheques-impresos-proc',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
  ],
  templateUrl: './cheques-impresos-proc.component.html',
  styleUrls: ['./cheques-impresos-proc.component.scss'],
})
export class ChequesImpresosProcComponent {
  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  beneficiario = signal<string>('');
  banco = signal<string>('');
  cuenta = signal<string>('');

  rows = signal<ChequeImpresoRow[]>([
    {
      numero: '000300',
      beneficiario: 'Proveedor A',
      banco: 'Banco Uno',
      cuenta: '100-001',
      valor: 600,
      fechaImpresion: new Date().toISOString().slice(0, 10),
    },
    {
      numero: '000301',
      beneficiario: 'Proveedor B',
      banco: 'Banco Dos',
      cuenta: '200-002',
      valor: 1020.5,
      fechaImpresion: new Date().toISOString().slice(0, 10),
    },
  ]);

  filtered = computed(() => {
    const fi = this.fechaInicio();
    const ff = this.fechaFin();
    const ben = this.beneficiario().toLowerCase();
    const b = this.banco().toLowerCase();
    const c = this.cuenta().toLowerCase();
    return this.rows().filter((r) => {
      const inRange =
        (!fi || r.fechaImpresion >= fi.toISOString().slice(0, 10)) &&
        (!ff || r.fechaImpresion <= ff.toISOString().slice(0, 10));
      const matchBen = !ben || r.beneficiario.toLowerCase().includes(ben);
      const matchBanco = !b || r.banco.toLowerCase().includes(b);
      const matchCta = !c || r.cuenta.toLowerCase().includes(c);
      return inRange && matchBen && matchBanco && matchCta;
    });
  });

  total = computed(() => this.filtered().reduce((s, r) => s + r.valor, 0));

  limpiar(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.beneficiario.set('');
    this.banco.set('');
    this.cuenta.set('');
  }
}
