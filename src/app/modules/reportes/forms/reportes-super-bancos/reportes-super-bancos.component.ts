import { CommonModule } from '@angular/common';
import { Component, Inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

@Component({
  selector: 'app-reportes-super-bancos',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  templateUrl: './reportes-super-bancos.component.html',
  styleUrls: ['./reportes-super-bancos.component.scss'],
})
export class ReportesSuperBancosComponent {
  meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' },
  ];

  anios: number[] = [];
  opcionesGeneradas = signal<string[]>([]);
  procesoEjecutado = signal<boolean>(false);
  mesSeleccionado = signal<number>(new Date().getMonth() + 1);
  anioSeleccionado = signal<number>(new Date().getFullYear());

  constructor(private dialog: MatDialog) {
    const anioActual = new Date().getFullYear();
    for (let anio = anioActual - 10; anio <= anioActual + 1; anio++) {
      this.anios.push(anio);
    }
  }

  onMesChange(mes: number): void {
    this.mesSeleccionado.set(mes);
  }

  onAnioChange(anio: number): void {
    this.anioSeleccionado.set(anio);
  }

  generarArchivos(): void {
    const opciones = Array.from({ length: 12 }, (_, index) => `G${40 + index}`);
    this.opcionesGeneradas.set(opciones);
    this.procesoEjecutado.set(true);
  }

  abrirDialogoOpcion(opcion: string): void {
    this.dialog.open(OpcionGeneradaDialogComponent, {
      width: '320px',
      data: { opcion },
    });
  }
}

@Component({
  selector: 'app-opcion-generada-dialog',
  standalone: true,
  imports: [CommonModule, MaterialFormModule],
  template: `
    <h2 mat-dialog-title>Opción seleccionada</h2>
    <mat-dialog-content>
      <p>{{ data.opcion }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
})
export class OpcionGeneradaDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { opcion: string }) {}
}
