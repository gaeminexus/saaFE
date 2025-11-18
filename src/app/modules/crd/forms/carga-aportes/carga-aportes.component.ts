import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { Filial } from '../../model/filial';
import { FilialService } from '../../service/filial.service';

interface Mes {
  valor: number;
  nombre: string;
}

@Component({
  selector: 'app-carga-aportes',
  standalone: true,
  imports: [
    FormsModule,
    MaterialFormModule
  ],
  templateUrl: './carga-aportes.component.html',
  styleUrl: './carga-aportes.component.scss'
})
export class CargaAportesComponent implements OnInit {
  // Filtros
  anioSeleccionado: number | null = null;
  mesSeleccionado: number | null = null;
  filialSeleccionada: number | null = null;

  // Datos para los combos
  anios: number[] = [];
  meses: Mes[] = [
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
    { valor: 12, nombre: 'Diciembre' }
  ];
  filiales: Filial[] = [];

  // Loading states
  isLoadingFiliales: boolean = false;

  constructor(
    private filialService: FilialService,
    private snackBar: MatSnackBar
  ) {
    // Generar años del 2025 al 2035
    for (let anio = 2025; anio <= 2035; anio++) {
      this.anios.push(anio);
    }
  }

  ngOnInit(): void {
    this.cargarFiliales();
  }

  cargarFiliales(): void {
    this.isLoadingFiliales = true;

    this.filialService.getAll().subscribe({
      next: (filiales: any) => {
        this.isLoadingFiliales = false;
        if (filiales && Array.isArray(filiales)) {
          this.filiales = filiales as Filial[];
        } else {
          this.filiales = [];
        }
      },
      error: (error) => {
        this.isLoadingFiliales = false;
        console.error('Error al cargar filiales:', error);
        this.snackBar.open('Error al cargar filiales', 'Cerrar', { duration: 3000 });
        this.filiales = [];
      }
    });
  }

  limpiarFiltros(): void {
    this.anioSeleccionado = null;
    this.mesSeleccionado = null;
    this.filialSeleccionada = null;
  }

  getFilialNombre(codigo: number | null): string {
    if (!codigo) return 'N/A';
    const filial = this.filiales.find(f => f.codigo === codigo);
    return filial?.nombre || 'N/A';
  }
}
