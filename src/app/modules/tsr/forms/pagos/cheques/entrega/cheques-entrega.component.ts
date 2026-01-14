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

interface ChequePorEntregar {
  numero: string;
  beneficiario: string;
  valor: number;
  fechaImpresion: string; // ISO
  banco: string;
  cuenta: string;
}

@Component({
  selector: 'app-cheques-entrega',
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
  templateUrl: './cheques-entrega.component.html',
  styleUrls: ['./cheques-entrega.component.scss'],
})
export class ChequesEntregaComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Filtros
  fechaDesde = signal<Date | null>(null);
  fechaHasta = signal<Date | null>(null);
  beneficiarioFiltro = signal<string>('');

  cheques = signal<ChequePorEntregar[]>([
    {
      numero: '000130',
      beneficiario: 'Proveedor C',
      valor: 300,
      fechaImpresion: new Date().toISOString().slice(0, 10),
      banco: 'Banco Uno',
      cuenta: '100-001',
    },
    {
      numero: '000131',
      beneficiario: 'Proveedor D',
      valor: 980.75,
      fechaImpresion: new Date().toISOString().slice(0, 10),
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
    this.fechaDesde.set(null);
    this.fechaHasta.set(null);
    this.beneficiarioFiltro.set('');
    this.errorMsg.set('');
  }

  registrarEntrega(): void {
    if (this.selected().size === 0) {
      this.errorMsg.set('Seleccione al menos un cheque para entregar.');
      return;
    }
    this.loading.set(true);
    const payload = Array.from(this.selected()).map((i) => this.cheques()[i]);
    console.log('Registrar entrega de cheques:', payload);
    setTimeout(() => {
      this.loading.set(false);
      this.selected.set(new Set());
    }, 700);
  }
}
