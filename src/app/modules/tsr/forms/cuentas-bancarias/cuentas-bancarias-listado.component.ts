import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { CuentaBancaria } from '../../model/cuenta-bancaria';
import { CuentaBancariaService } from '../../service/cuenta-bancaria.service';

@Component({
  selector: 'app-cuentas-bancarias-listado',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  template: `
    <div class="cuentas-page">
      <h2>Cuentas Bancarias</h2>

      <div class="table-card">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Filtrar</mat-label>
          <input
            matInput
            placeholder="Buscar por código, número o titular"
            (input)="aplicarFiltro($event.target.value)"
          />
          <button mat-icon-button matSuffix (click)="aplicarFiltro('')">
            <mat-icon>close</mat-icon>
          </button>
        </mat-form-field>

        <div class="spinner" *ngIf="loading()">
          <mat-spinner diameter="32"></mat-spinner>
        </div>

        <table mat-table [dataSource]="pageData()" class="mat-elevation-z2">
          <ng-container matColumnDef="codigo">
            <th mat-header-cell *matHeaderCellDef>Código</th>
            <td mat-cell *matCellDef="let row">{{ row.codigo }}</td>
          </ng-container>

          <ng-container matColumnDef="numeroCuenta">
            <th mat-header-cell *matHeaderCellDef>Nº Cuenta</th>
            <td mat-cell *matCellDef="let row">{{ row.numeroCuenta }}</td>
          </ng-container>

          <ng-container matColumnDef="titular">
            <th mat-header-cell *matHeaderCellDef>Titular</th>
            <td mat-cell *matCellDef="let row">{{ row.titular }}</td>
          </ng-container>

          <ng-container matColumnDef="estado">
            <th mat-header-cell *matHeaderCellDef>Estado</th>
            <td mat-cell *matCellDef="let row">{{ row.estado }}</td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns; trackBy: trackByCodigo"></tr>
        </table>

        <mat-paginator
          [length]="totalItems()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[5, 10, 20, 50]"
          (page)="onPageChange($event)"
        ></mat-paginator>
      </div>
    </div>
  `,
})
export class CuentasBancariasListadoComponent implements OnInit {
  // Signals de estado
  loading = signal<boolean>(false);
  errorMsg = signal<string>('');

  // Datos completos y página actual
  allData = signal<CuentaBancaria[]>([]);
  pageData = signal<CuentaBancaria[]>([]);
  totalItems = signal<number>(0);

  // Paginación
  pageSize = signal<number>(10);
  pageIndex = signal<number>(0);

  // Filtro
  filtro = signal<string>('');

  // Columnas de la tabla
  displayedColumns: string[] = ['codigo', 'numeroCuenta', 'titular', 'estado'];

  // Computados
  hasItems = computed(() => this.pageData().length > 0);

  constructor(private cuentaService: CuentaBancariaService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading.set(true);
    this.errorMsg.set('');

    this.cuentaService.getAll().subscribe({
      next: (data) => {
        const items = Array.isArray(data) ? data : [];
        this.allData.set(items);
        this.totalItems.set(items.length);
        this.pageIndex.set(0);
        this.updatePageData();
        this.loading.set(false);
      },
      error: () => {
        this.errorMsg.set('Error al cargar cuentas bancarias');
        this.loading.set(false);
      },
    });
  }

  updatePageData(): void {
    const filtroTxt = this.filtro().toLowerCase();
    const filtered = this.allData().filter((item) => {
      const base = `${item.codigo} ${item.numeroCuenta ?? ''} ${item.titular ?? ''}`.toLowerCase();
      return base.includes(filtroTxt);
    });

    this.totalItems.set(filtered.length);

    const start = this.pageIndex() * this.pageSize();
    const end = start + this.pageSize();
    this.pageData.set(filtered.slice(start, end));
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.updatePageData();
  }

  aplicarFiltro(value: string): void {
    this.filtro.set(value);
    this.pageIndex.set(0);
    this.updatePageData();
  }

  trackByCodigo(index: number, item: CuentaBancaria): number {
    return item.codigo;
  }
}
