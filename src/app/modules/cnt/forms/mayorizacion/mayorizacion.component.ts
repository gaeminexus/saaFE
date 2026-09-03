import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, AfterViewChecked, ViewChild, computed, signal } from '@angular/core';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { EstadoPeriodo, Periodo } from '../../model/periodo';
import { PeriodoService } from '../../service/periodo.service';

@Component({
  selector: 'app-mayorizacion',
  standalone: true,
  imports: [
    CommonModule,
    MaterialFormModule,
  ],
  templateUrl: './mayorizacion.component.html',
  styleUrl: './mayorizacion.component.scss',
})
export class MayorizacionComponent implements OnInit, AfterViewInit, AfterViewChecked {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Estado con Signals
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  periodos = signal<Periodo[]>([]);
  seleccionado = signal<Periodo | null>(null);

  totalRegistros = computed(() => this.periodos().length);

  dataSource = new MatTableDataSource<Periodo>([]);
  displayedColumns: string[] = ['periodo', 'anio', 'mes', 'periodoCierre', 'estado'];

  constructor(private periodoService: PeriodoService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.cargarPeriodos();
  }

  ngAfterViewInit(): void {
    // `ngOnInit` llama a `cargarPeriodos()`, que pone `loading` en `true` de forma síncrona —
    // y `ngOnInit` corre antes que `ngAfterViewInit`. El contenedor de la tabla vive detrás de
    // `*ngIf="!loading()"`, así que acá ya está en falso: el paginador todavía no existe en el DOM
    // y `ViewChild` resuelve `undefined`. `ngAfterViewInit` corre una sola vez, así que esta
    // asignación por sí sola nunca se repite cuando `loading()` vuelve a `false`. La reconexión
    // real está en `ngAfterViewChecked`.
    this.conectarPaginadorYOrden();
  }

  ngAfterViewChecked(): void {
    this.conectarPaginadorYOrden();
  }

  /** Idempotente: solo reasigna cuando la referencia cambió, para no forzar trabajo en cada check. */
  private conectarPaginadorYOrden(): void {
    if (this.paginator && this.dataSource.paginator !== this.paginator) {
      this.dataSource.paginator = this.paginator;
    }
    if (this.sort && this.dataSource.sort !== this.sort) {
      this.dataSource.sort = this.sort;
    }
  }

  cargarPeriodos(): void {
    this.loading.set(true);
    this.periodoService.getAll().subscribe({
      next: (items) => {
        const ordenados = (items || []).sort((a, b) => {
          if (a.anio !== b.anio) return b.anio - a.anio;
          return b.mes - a.mes;
        });
        this.periodos.set(ordenados);
        this.dataSource.data = ordenados;
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar períodos');
        this.loading.set(false);
      },
    });
  }

  seleccionar(row: Periodo): void {
    this.seleccionado.set(row);
  }

  mayorizarSeleccionado(): void {
    const periodo = this.seleccionado();
    if (!periodo) {
      this.showMessage('Seleccione un período para mayorizar', 'warn');
      return;
    }
    if (periodo.estado !== EstadoPeriodo.ABIERTO) {
      this.showMessage('Solo se pueden mayorizar períodos abiertos', 'warn');
      return;
    }

    this.loading.set(true);
    this.periodoService.mayorizar(periodo.codigo).subscribe({
      next: (ok) => {
        if (ok) {
          this.showMessage('Período mayorizado correctamente', 'success');
          this.cargarPeriodos();
          this.seleccionado.set(null);
        } else {
          this.showMessage('No se pudo mayorizar el período', 'error');
          this.loading.set(false);
        }
      },
      error: () => {
        this.showMessage('Error al mayorizar el período', 'error');
        this.loading.set(false);
      },
    });
  }

  getNombreMes(mes: number): string {
    return this.periodoService.getNombreMes(mes);
  }

  getEstadoTexto(estado: EstadoPeriodo): string {
    return this.periodoService.getEstadoTexto(estado);
  }

  getEstadoBadgeClass(estado: EstadoPeriodo): string {
    return this.periodoService.getEstadoBadgeClass(estado);
  }

  private showMessage(message: string, type: 'success' | 'error' | 'warn' | 'info'): void {
    let panelClass = '';
    switch (type) {
      case 'success':
        panelClass = 'snackbar-success';
        break;
      case 'error':
        panelClass = 'snackbar-error';
        break;
      case 'warn':
        panelClass = 'snackbar-warn';
        break;
      case 'info':
        panelClass = 'snackbar-info';
        break;
    }
    this.snackBar.open(message, 'Cerrar', {
      duration: 4000,
      panelClass: [panelClass],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
