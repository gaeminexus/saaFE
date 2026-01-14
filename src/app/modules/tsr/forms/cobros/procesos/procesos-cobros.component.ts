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
import { MatTableModule } from '@angular/material/table';
import { TempCobro } from '../../../../tsr/model/temp-cobro';
import { TempMotivoCobro } from '../../../../tsr/model/temp-motivo-cobro';

@Component({
  selector: 'app-procesos-cobros',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatTableModule,
    MatCheckboxModule,
  ],
  templateUrl: './procesos-cobros.component.html',
  styleUrls: ['./procesos-cobros.component.scss'],
})
export class ProcesosCobrosComponent {
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  fechaInicio = signal<Date | null>(null);
  fechaFin = signal<Date | null>(null);
  selectedIds = signal<Set<number>>(new Set());

  tempCobros = signal<TempCobro[]>([
    {
      codigo: 1,
      tipoId: 1,
      numeroId: '0102030405',
      cliente: 'Juan Pérez',
      descripcion: 'Cobro de factura 001',
      fecha: new Date(),
      nombreUsuario: 'operador',
      valor: 120.5,
      empresa: {} as any,
      usuarioPorCaja: {} as any,
      cierreCaja: {} as any,
      fechaInactivo: new Date(),
      rubroMotivoAnulacionP: 0,
      rubroMotivoAnulacionH: 0,
      rubroEstadoP: 28,
      rubroEstadoH: 1,
      cajaLogica: {} as any,
      persona: {} as any,
      tipoCobro: 1,
    },
    {
      codigo: 2,
      tipoId: 2,
      numeroId: '1790012345001',
      cliente: 'Comercial XYZ',
      descripcion: 'Anticipo',
      fecha: new Date(),
      nombreUsuario: 'cajero',
      valor: 300,
      empresa: {} as any,
      usuarioPorCaja: {} as any,
      cierreCaja: {} as any,
      fechaInactivo: new Date(),
      rubroMotivoAnulacionP: 0,
      rubroMotivoAnulacionH: 0,
      rubroEstadoP: 28,
      rubroEstadoH: 1,
      cajaLogica: {} as any,
      persona: {} as any,
      tipoCobro: 2,
    },
  ]);

  motivos = signal<TempMotivoCobro[]>([
    {
      codigo: 10,
      tempCobro: {} as any,
      descripcion: 'Pago efectivo',
      valor: 100,
      detallePlantilla: {} as any,
    },
    {
      codigo: 11,
      tempCobro: {} as any,
      descripcion: 'Pago tarjeta',
      valor: 20.5,
      detallePlantilla: {} as any,
    },
  ]);

  filteredCobros = computed(() => {
    const start = this.fechaInicio();
    const end = this.fechaFin();
    return this.tempCobros().filter(
      (c) => (!start || c.fecha >= start) && (!end || c.fecha <= end)
    );
  });

  totalFiltrado = computed(() => this.filteredCobros().reduce((acc, c) => acc + (c.valor || 0), 0));

  toggleSelect(codigo: number, checked: boolean): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (checked) next.add(codigo);
      else next.delete(codigo);
      return next;
    });
  }

  limpiar(): void {
    this.fechaInicio.set(null);
    this.fechaFin.set(null);
    this.errorMsg.set('');
    this.selectedIds.set(new Set());
  }

  consolidarSeleccionados(): void {
    if (this.selectedIds().size === 0) return;
    this.loading.set(true);
    const seleccion = this.filteredCobros().filter((c) => this.selectedIds().has(c.codigo));
    console.log('Consolidando TempCobros a Cobro:', seleccion);
    setTimeout(() => {
      this.loading.set(false);
      this.selectedIds.set(new Set());
    }, 600);
  }
}
