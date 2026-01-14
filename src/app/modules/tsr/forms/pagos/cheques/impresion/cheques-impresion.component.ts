import { CommonModule } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

interface ChequePorImprimir {
  numero: string;
  beneficiario: string;
  valor: number;
  fechaEmision: string; // ISO
  banco: string;
  cuenta: string;
}

@Component({
  selector: 'app-cheques-impresion',
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
    MatCheckboxModule,
  ],
  templateUrl: './cheques-impresion.component.html',
  styleUrls: ['./cheques-impresion.component.scss'],
})
export class ChequesImpresionComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Filtros
  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  bancoCodigo = signal<number | null>(null);
  cuentaNumero = signal<string>('');

  bancos = [
    { codigo: 1, nombre: 'Banco Uno' },
    { codigo: 2, nombre: 'Banco Dos' },
  ];
  cuentas = [
    { numero: '100-001', bancoCodigo: 1 },
    { numero: '200-002', bancoCodigo: 2 },
  ];

  cheques = signal<ChequePorImprimir[]>([
    {
      numero: '000123',
      beneficiario: 'Proveedor A',
      valor: 450.25,
      fechaEmision: new Date().toISOString().slice(0, 10),
      banco: 'Banco Uno',
      cuenta: '100-001',
    },
    {
      numero: '000124',
      beneficiario: 'Proveedor B',
      valor: 1200,
      fechaEmision: new Date().toISOString().slice(0, 10),
      banco: 'Banco Dos',
      cuenta: '200-002',
    },
  ]);

  selected = signal<Set<number>>(new Set());
  allSelected = computed(
    () => this.selected().size === this.cheques().length && this.cheques().length > 0
  );
  selectedCount = computed(() => this.selected().size);
  selectedTotal = computed(() =>
    Array.from(this.selected()).reduce((sum, idx) => sum + (this.cheques()[idx]?.valor || 0), 0)
  );

  toggleAll(checked: boolean): void {
    this.selected.update(() => {
      if (!checked) return new Set();
      return new Set(this.cheques().map((_, i) => i));
    });
  }

  toggleOne(index: number, checked: boolean): void {
    this.selected.update((s) => {
      const copy = new Set(s);
      if (checked) copy.add(index);
      else copy.delete(index);
      return copy;
    });
  }

  limpiarFiltros(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.bancoCodigo.set(null);
    this.cuentaNumero.set('');
    this.errorMsg.set('');
  }

  imprimirSeleccionados(): void {
    if (this.selected().size === 0) {
      this.errorMsg.set('Seleccione al menos un cheque para imprimir.');
      return;
    }
    this.loading.set(true);
    const payload = Array.from(this.selected()).map((i) => this.cheques()[i]);
    console.log('Imprimir cheques:', payload);
    setTimeout(() => {
      this.loading.set(false);
      this.selected.set(new Set());
    }, 700);
  }
}
