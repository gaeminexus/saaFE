import { CommonModule } from '@angular/common';
import { Component, Inject, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LineaAsientoNomina, lineaSinConfigurar } from '../../../model/resultados-nomina';

export interface PrevisualizacionAsientoData {
  titulo: string;
  lineas: LineaAsientoNomina[];
}

/**
 * Previsualización del asiento antes de emitirlo.
 *
 * Es lo que permite al contador detectar una cuenta mal mapeada **antes** de que el asiento
 * exista. Funciona incluso en modo histórico, que es el único modo de ver qué se emitiría
 * mientras no haya plan de cuentas cargado.
 *
 * Las líneas que siguen apuntando a la cuenta marcadora se pintan como pendientes de
 * configurar: son las que hay que mapear antes de pasar a producción, y confundirlas con
 * cuentas válidas es exactamente el error que esta pantalla existe para evitar.
 */
@Component({
  selector: 'app-previsualizacion-asiento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './previsualizacion-asiento-dialog.component.html',
  styleUrls: ['./previsualizacion-asiento-dialog.component.scss'],
})
export class PrevisualizacionAsientoDialogComponent {
  columnas = ['linea', 'cuenta', 'descripcion', 'debe', 'haber'];

  lineas = signal<LineaAsientoNomina[]>([]);

  totalDebe = computed(() => this.suma('debe'));
  totalHaber = computed(() => this.suma('haber'));

  /** La diferencia se muestra siempre: un asiento descuadrado se rechaza al emitirlo. */
  diferencia = computed(() => Math.round((this.totalDebe() - this.totalHaber()) * 100) / 100);

  sinConfigurar = computed(() => this.lineas().filter((l) => lineaSinConfigurar(l)).length);

  constructor(
    public dialogRef: MatDialogRef<PrevisualizacionAsientoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PrevisualizacionAsientoData,
  ) {
    this.lineas.set(data.lineas ?? []);
  }

  esPendiente(linea: LineaAsientoNomina): boolean {
    return lineaSinConfigurar(linea);
  }

  /** El sufijo del backend sobra en la celda: la fila ya se ve marcada. */
  nombreLimpio(linea: LineaAsientoNomina): string {
    return (linea.nombreCuenta ?? '').replace(/\s*\(SIN CONFIGURAR:[^)]*\)/i, '').trim();
  }

  private suma(campo: 'debe' | 'haber'): number {
    const total = this.lineas().reduce((acc, linea) => acc + Number(linea[campo] ?? 0), 0);
    return Math.round(total * 100) / 100;
  }
}
