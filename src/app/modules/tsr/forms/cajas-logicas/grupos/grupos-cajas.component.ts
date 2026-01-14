import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';

interface GrupoCaja {
  nombre: string;
  fIngreso: string;
  fEliminacion: string;
  estado: string;
}

@Component({
  selector: 'app-grupos-cajas',
  standalone: true,
  imports: [CommonModule, MatTableModule, MatPaginatorModule, MatButtonModule, MatIconModule],
  templateUrl: './grupos-cajas.component.html',
  styleUrls: ['./grupos-cajas.component.scss'],
})
export class GruposCajasComponent {
  title = 'GRUPO CAJA';

  grupos = signal<GrupoCaja[]>([]);
  displayedColumns = ['nombre', 'fIngreso', 'fEliminacion', 'estado'];

  constructor() {
    // Mock data for shell
    this.grupos.set([
      {
        nombre: 'CAJA CHICA',
        fIngreso: '25/05/2010 12:44:39',
        fEliminacion: '',
        estado: 'INACTIVO',
      },
      {
        nombre: 'CAJA DE TESORERIA',
        fIngreso: '29/12/2009 00:00:00',
        fEliminacion: '',
        estado: 'ACTIVO',
      },
      {
        nombre: 'CAJA VEINTE',
        fIngreso: '22/04/2010 15:23:43',
        fEliminacion: '',
        estado: 'ACTIVO',
      },
    ]);
  }

  // Toolbar actions (no-op placeholders for shell)
  insertar(): void {}
  eliminar(): void {}
  modificar(): void {}
  aceptar(): void {}
  cancelar(): void {}
}
