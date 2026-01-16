import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Empleado } from '../../../model/empleado';
import { EmpleadoService } from '../../../service/empleado.service';

@Component({
  selector: 'app-rrh-empleados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
  ],
  templateUrl: './rrh-empleados.component.html',
  styleUrls: ['./rrh-empleados.component.scss'],
})
export class RrhEmpleadosComponent implements OnInit {
  // Título
  titulo = signal<string>('Gestión de Personal · Empleados');

  // Estado UI
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Datos
  allData = signal<Empleado[]>([]);
  pageData = signal<Empleado[]>([]);
  totalItems = signal<number>(0);

  // Paginación
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);

  // Filtros (criterios)
  codigo?: number;
  identificacion = '';
  nombres = '';
  apellidos = '';
  estado: 0 | 1 | undefined = 1;

  // Columnas
  displayedColumns: string[] = ['codigo', 'identificacion', 'nombres', 'apellidos', 'estado'];
  hasItems = computed(() => this.pageData().length > 0);

  constructor(private empleadoService: EmpleadoService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    const criterios: DatosBusqueda[] = [];

    // Orden por código
    const dbOrder = new DatosBusqueda();
    dbOrder.orderBy('codigo');
    criterios.push(dbOrder);

    // Filtros
    if (this.codigo && this.codigo > 0) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.LONG,
        'codigo',
        String(this.codigo),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }
    if (this.identificacion?.trim()) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'identificacion',
        this.identificacion.trim(),
        TipoComandosBusqueda.LIKE
      );
      criterios.push(db);
    }
    if (this.nombres?.trim()) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'nombres',
        this.nombres.trim(),
        TipoComandosBusqueda.LIKE
      );
      criterios.push(db);
    }
    if (this.apellidos?.trim()) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.STRING,
        'apellidos',
        this.apellidos.trim(),
        TipoComandosBusqueda.LIKE
      );
      criterios.push(db);
    }
    if (this.estado === 0 || this.estado === 1) {
      const db = new DatosBusqueda();
      db.asignaUnCampoSinTrunc(
        TipoDatosBusqueda.INTEGER,
        'estado',
        String(this.estado),
        TipoComandosBusqueda.IGUAL
      );
      criterios.push(db);
    }

    this.empleadoService.selectByCriteria(criterios).subscribe({
      next: (data: Empleado[] | null) => {
        const items = Array.isArray(data) ? data : [];
        this.allData.set(items);
        this.totalItems.set(items.length);
        this.pageIndex.set(0);
        this.updatePageData();
        this.loading.set(false);
      },
      error: () => {
        // Fallback a getAll
        this.empleadoService.getAll().subscribe({
          next: (data2: Empleado[] | null) => {
            const items2 = Array.isArray(data2) ? data2 : [];
            this.allData.set(items2);
            this.totalItems.set(items2.length);
            this.pageIndex.set(0);
            this.updatePageData();
            this.loading.set(false);
          },
          error: () => {
            this.errorMsg.set('Error al cargar empleados');
            this.loading.set(false);
          },
        });
      },
    });
  }

  guardar(): void {
    // Validaciones básicas de frontend coherentes con backend
    if (!this.identificacion?.trim() || !this.nombres?.trim() || !this.apellidos?.trim()) {
      this.errorMsg.set('Complete identificación, nombres y apellidos');
      return;
    }
    const payload: any = {
      identificacion: this.identificacion.trim(),
      nombres: this.nombres.trim(),
      apellidos: this.apellidos.trim(),
      estado: this.estado ?? 1,
    };
    this.loading.set(true);
    this.empleadoService.add(payload).subscribe({
      next: () => {
        this.identificacion = '';
        this.nombres = '';
        this.apellidos = '';
        this.estado = 1;
        this.cargarDatos();
      },
      error: () => {
        this.errorMsg.set('No se pudo guardar el empleado');
        this.loading.set(false);
      },
    });
  }

  cancelar(): void {
    this.identificacion = '';
    this.nombres = '';
    this.apellidos = '';
    this.estado = 1;
  }

  volver(): void {
    history.back();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updatePageData();
  }

  updatePageData(): void {
    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    const items = this.allData();
    this.pageData.set(items.slice(start, end));
  }
}
