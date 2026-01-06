import { Component, OnInit, ViewChild, signal, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Exter } from '../../../model/exter';
import { ExterService } from '../../../service/exter.service';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-exters-grid',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule
  ],
  templateUrl: './exters.component.html',
  styleUrls: ['./exters.component.scss']
})
export class ExtersComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'cedula','nombre','estado','fechaNacimiento','estadoCivil','nivelEstudios','edad','profesion','genero','fechaDesde','nacionalidad','provincia','canton','movil','telefono','correoPrincipal','correoInstitucional','celular1','celular2','correoExtra','telefonoLaboralIE','correoIE','salarioFijo','salarioVariable','salarioTotal','sumadosIngresos','sumadosEgresos','disponible'
  ];
  dataSource = new MatTableDataSource<Exter>([]);
  pageSize = 20;
  pageIndex = 0;
  totalRegistros = signal<number>(0);
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  currentFilter = '';
  allData: Exter[] = [];
  isScrolled = signal<boolean>(false);

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('tableContainer', { read: ElementRef }) tableContainer!: ElementRef<HTMLDivElement>;

  constructor(private exterService: ExterService) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  ngAfterViewInit(): void {
    // Configurar detección de scroll después de que la vista esté inicializada
    setTimeout(() => {
      if (this.tableContainer) {
        this.setupScrollDetection();
      }
    }, 100);
  }

  private setupScrollDetection(): void {
    const container = this.tableContainer.nativeElement;

    container.addEventListener('scroll', () => {
      const scrolled = container.scrollTop > 0 || container.scrollLeft > 0;
      this.isScrolled.set(scrolled);

      // Agregar clase CSS para efectos visuales
      if (scrolled) {
        container.classList.add('scrolled');
      } else {
        container.classList.remove('scrolled');
      }
    });
  }

  scrollToTop(): void {
    if (this.tableContainer) {
      this.tableContainer.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  scrollToLeft(): void {
    if (this.tableContainer) {
      this.tableContainer.nativeElement.scrollTo({ left: 0, behavior: 'smooth' });
    }
  }

  loadAllData(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    // Priorizar selectByCriteria con fallback a getAll
    this.exterService.selectByCriteria({}).pipe(
      catchError(err => {
        console.warn('selectByCriteria falló, intentando getAll como fallback:', err);
        return this.exterService.getAll();
      }),
      catchError(err => {
        this.errorMsg.set(typeof err === 'string' ? err : 'Error al cargar datos');
        return of([]);
      }),
      finalize(() => this.loading.set(false))
    ).subscribe(res => {
      // Convertir fechas que puedan venir en formato array desde el backend
      const exterConFechas = (res || []).map(exter => ({
        ...exter,
        fechaNacimiento: this.convertirFecha(exter.fechaNacimiento) || exter.fechaNacimiento,
        fechaDefuncion: this.convertirFecha(exter.fechaDefuncion) || exter.fechaDefuncion
      })) as Exter[];

      this.allData = exterConFechas;
      this.totalRegistros.set(this.allData.length);
      this.updatePageData();
    });
  }

  updatePageData(): void {
    let filteredData = this.allData;

    // Aplicar filtro si existe
    if (this.currentFilter) {
      const filterValue = this.currentFilter.toLowerCase();
      filteredData = this.allData.filter(item =>
        Object.values(item).some(val =>
          val?.toString().toLowerCase().includes(filterValue)
        )
      );
    }

    // Paginar datos filtrados
    const startIndex = this.pageIndex * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.dataSource.data = filteredData.slice(startIndex, endIndex);

    // Actualizar total basado en datos filtrados
    this.totalRegistros.set(filteredData.length);
  }

  pageChanged(e: PageEvent): void {
    this.pageSize = e.pageSize;
    this.pageIndex = e.pageIndex;
    this.updatePageData();
  }

  applyFilter(value: string): void {
    this.currentFilter = value.trim();
    this.pageIndex = 0;
    this.updatePageData();
  }

  trackRow(index: number, item: Exter): string {
    return item?.cedula || index.toString();
  }

  onRowClick(row: Exter): void {
    console.log('Fila seleccionada:', row);
    // Aquí puedes agregar lógica para abrir modal de edición, etc.
  }

  /**
   * Formatea el valor de una celda, especialmente para fechas
   */
  formatCellValue(value: any, columnName: string): string {
    // Si es una columna de fecha, formatear
    if (columnName === 'fechaNacimiento' || columnName === 'fechaDefuncion') {
      if (!value) return 'N/A';

      const fecha = value instanceof Date ? value : new Date(value);
      if (isNaN(fecha.getTime())) return value?.toString() || 'N/A';

      return fecha.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    }

    // Para otros valores, devolver como string o 'N/A'
    return value?.toString() || 'N/A';
  }

  /**
   * Convierte una fecha de forma segura manejando diferentes formatos
   */
  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;

    if (fecha instanceof Date) return fecha;

    // Si es un array (como [2023,7,31,0,0]), convertir a Date
    if (Array.isArray(fecha)) {
      // Array format: [year, month, day, hour, minute, second?, millisecond?]
      const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = fecha;
      // Nota: los meses en JavaScript Date van de 0-11, pero el backend puede enviar 1-12
      // Asumimos que el backend envía 1-12 (mes real), así que restamos 1
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }

    if (typeof fecha === 'string') {
      // Limpiar el string de fecha quitando el timezone [UTC] si existe
      const fechaLimpia = fecha.replace(/\[.*?\]/, '');
      const fechaConvertida = new Date(fechaLimpia);

      // Verificar si la fecha es válida
      if (!isNaN(fechaConvertida.getTime())) {
        return fechaConvertida;
      }
    }

    if (typeof fecha === 'number') {
      return new Date(fecha);
    }

    return null;
  }
}
