import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleMayorizacion } from '../../model/detalle-mayorizacion';
import { DetalleMayorizacionService } from '../../service/detalle-mayorizacion.service';

@Component({
  selector: 'app-detalle-mayorizacion',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './detalle-mayorizacion.component.html',
  styleUrls: ['./detalle-mayorizacion.component.scss'],
})
export class DetalleMayorizacionComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  loading = signal<boolean>(false);
  errorMsg = signal<string>('');
  totalRegistros = computed(() => this.dataSource.data.length);

  displayedColumns: string[] = [
    'numeroCuenta',
    'nombreCuenta',
    'saldoAnterior',
    'valorDebe',
    'valorHaber',
    'saldoActual',
    'tipoCuenta',
    'nivelCuenta',
  ];

  dataSource = new MatTableDataSource<DetalleMayorizacion>([]);
  filtroTexto = '';
  private readonly idEmpresa: number = Number(localStorage.getItem('idSucursal') || '0');

  constructor(private detalleService: DetalleMayorizacionService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;

    // Filtro por múltiples campos
    this.dataSource.filterPredicate = (data: DetalleMayorizacion, filter: string) => {
      const f = filter.trim().toLowerCase();
      const texto = [
        data.numeroCuenta || '',
        data.nombreCuenta || '',
        String(data.saldoAnterior ?? ''),
        String(data.valorDebe ?? ''),
        String(data.valorHaber ?? ''),
        String(data.saldoActual ?? ''),
        String(data.tipoCuenta ?? ''),
        String(data.nivelCuenta ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      return texto.includes(f);
    };
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    // Intento principal: filtrar por empresa en backend (selectByCriteria)
    const criterios: Array<DatosBusqueda> = [];

    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      String(this.idEmpresa),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEmpresa);

    this.detalleService.selectByCriteria(criterios).subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
        if (list.length > 0) {
          this.dataSource.data = list;
          this.loading.set(false);
        } else {
          // Fallback a getAll() y filtrar en cliente por empresa
          this.cargarDatosFallback();
        }
      },
      error: () => {
        // Fallback a getAll() y filtrar en cliente por empresa
        this.cargarDatosFallback();
      },
    });
  }

  private cargarDatosFallback(): void {
    this.detalleService.getAll().subscribe({
      next: (res) => {
        const list = Array.isArray(res) ? res : (res as any)?.data ?? [];
        const filtered = list.filter((row: any) => {
          const empresaCodigo =
            row?.empresa?.codigo ??
            row?.planCuenta?.empresa?.codigo ??
            row?.mayorizacion?.empresa?.codigo;
          return Number(empresaCodigo) === this.idEmpresa;
        });
        this.dataSource.data = filtered;
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar Detalle de Mayorización');
        this.dataSource.data = [];
        this.loading.set(false);
      },
    });
  }

  aplicarFiltro(value: string): void {
    this.filtroTexto = value;
    this.dataSource.filter = value.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  limpiarFiltro(): void {
    this.aplicarFiltro('');
  }
}
