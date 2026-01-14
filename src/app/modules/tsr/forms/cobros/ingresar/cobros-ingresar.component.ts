import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';

import { TempCobro } from '../../../model/temp-cobro';
import { TempMotivoCobro } from '../../../model/temp-motivo-cobro';

@Component({
  selector: 'app-cobros-ingresar',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './cobros-ingresar.component.html',
  styleUrls: ['./cobros-ingresar.component.scss'],
})
export class CobrosIngresarComponent {
  title = 'INGRESO DE COBROS';

  // Form state based on TempCobro
  tipoId = signal<number | null>(null); // 1=Cédula, 2=RUC
  numeroId = signal<string>('');
  cliente = signal<string>('');
  descripcion = signal<string>('');
  fecha = signal<Date | null>(new Date());
  nombreUsuario = signal<string>('');
  valor = signal<number | null>(null);
  tipoCobro = signal<number | null>(1); // 1=Factura, 2=Anticipo

  // Rubros (placeholders)
  rubroEstadoH = signal<number | null>(null); // Detalle Rubro 28
  rubroMotivoAnulacionH = signal<number | null>(null); // Detalle Rubro 29

  // Caja lógica / Persona (placeholder selects)
  cajaLogicaId = signal<number | null>(null);
  personaId = signal<number | null>(null);

  // Motivos de cobro grid
  motivos = signal<TempMotivoCobro[]>([]);
  displayedColumns = ['descripcion', 'valor', 'acciones'];

  addMotivo(): void {
    const nuevo: TempMotivoCobro = {
      codigo: Date.now(),
      tempCobro: {} as TempCobro,
      descripcion: '',
      valor: 0,
      detallePlantilla: {} as any,
    };
    this.motivos.update((arr) => [nuevo, ...arr]);
  }

  eliminarMotivo(codigo: number): void {
    this.motivos.update((arr) => arr.filter((m) => m.codigo !== codigo));
  }

  guardar(): void {
    // Cascarón: construir payload mínimo de TempCobro
    const cobro: Partial<TempCobro> = {
      tipoId: this.tipoId() ?? 0,
      numeroId: this.numeroId(),
      cliente: this.cliente(),
      descripcion: this.descripcion(),
      fecha: this.fecha() ?? new Date(),
      nombreUsuario: this.nombreUsuario(),
      valor: Number(this.valor() ?? 0),
      tipoCobro: this.tipoCobro() ?? 1,
    };
    console.log('Guardar cobro (shell):', cobro, this.motivos());
  }
}
