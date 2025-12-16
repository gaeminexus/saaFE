import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Asiento, EstadoAsiento } from '../../model/asiento';
import { AsientoService } from '../../service/asiento.service';

@Component({
  selector: 'app-listado-asientos',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatChipsModule,
  ],
  templateUrl: './listado-asientos.component.html',
  styleUrls: ['./listado-asientos.component.scss'],
})
export class ListadoAsientosComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Datos
  asientos: Asiento[] = [];
  dataSource = new MatTableDataSource<Asiento>();
  displayedColumns: string[] = [
    'numero',
    'fechaAsiento',
    'tipoAsiento',
    'observaciones',
    'estado',
    'acciones',
  ];
  totalElements = 0;
  error: string | null = null;

  // Estados
  loading = false;
  idEmpresa = parseInt(localStorage.getItem('idEmpresa') || '0', 10);

  // Enum para template
  EstadoAsiento = EstadoAsiento;

  constructor(
    private asientoService: AsientoService,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    if (!this.idEmpresa) {
      this.showMessage('⚠️ No se encontró empresa en sesión', 'error');
      return;
    }

    this.loadAsientos();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  /**
   * Carga asientos usando selectByCriteria con criterios DatosBusqueda
   */
  loadAsientos(): void {
    this.loading = true;
    this.error = null;

    const idEmpresa = this.idEmpresa;
    console.log(`🔍 Iniciando carga de asientos para empresa ${idEmpresa}...`);

    // Crear criterios usando el patrón DatosBusqueda
    const criterioConsultaArray: Array<DatosBusqueda> = [];

    // Filtro por empresa (código dinámico)
    const criterioEmpresa = new DatosBusqueda();
    criterioEmpresa.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empresa',
      'codigo',
      String(idEmpresa),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterioEmpresa);

    // Ordenar por fecha de asiento
    const criterioOrden = new DatosBusqueda();
    criterioOrden.orderBy('fechaAsiento');
    criterioConsultaArray.push(criterioOrden);

    this.asientoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (data) => {
        console.log(`📡 Respuesta del backend para asientos empresa ${idEmpresa}:`, data);
        const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
        console.log(`📋 Lista de asientos procesada para empresa ${idEmpresa}:`, list);

        // Transformar fechas y ordenar por fecha descendente (más recientes primero)
        this.asientos = list
          .map((item: any) => ({
            ...item,
            fechaAsiento: item.fechaAsiento ? this.normalizeFecha(item.fechaAsiento) : null,
          }))
          .sort((a: any, b: any) => {
            const fechaA = new Date(a.fechaAsiento || 0).getTime();
            const fechaB = new Date(b.fechaAsiento || 0).getTime();
            return fechaB - fechaA;
          });

        this.totalElements = this.asientos.length;
        this.dataSource.data = this.asientos;
        this.loading = false;

        console.log(
          `✅ Se cargaron ${list.length} asientos para empresa ${idEmpresa} exitosamente`
        );

        if (this.asientos.length > 0) {
          this.showMessage('Asientos cargados correctamente', 'success');
        }
      },
      error: (err) => {
        console.error(`❌ Error al cargar asientos con empresa ${idEmpresa}:`, err);

        // Fallback a getAll() si falla el filtro
        console.log('🔄 Probando getAll como fallback...');
        this.asientoService.getAll().subscribe({
          next: (data) => {
            console.log('📡 Respuesta fallback getAll:', data);
            const list = Array.isArray(data) ? data : (data as any)?.data ?? [];
            const filtered = list.filter((asiento: any) => asiento?.empresa?.codigo === idEmpresa);

            // Transformar fechas y ordenar por fecha descendente
            this.asientos = filtered
              .map((item: any) => ({
                ...item,
                fechaAsiento: item.fechaAsiento ? this.normalizeFecha(item.fechaAsiento) : null,
              }))
              .sort((a: any, b: any) => {
                const fechaA = new Date(a.fechaAsiento || 0).getTime();
                const fechaB = new Date(b.fechaAsiento || 0).getTime();
                return fechaB - fechaA;
              });

            this.totalElements = this.asientos.length;
            this.dataSource.data = this.asientos;
            this.loading = false;

            if (this.asientos.length > 0) {
              this.showMessage('Asientos cargados correctamente', 'success');
            }
          },
          error: () => {
            this.error = 'Error al recuperar datos de asientos contables';
            this.loading = false;
            this.showMessage('Error al cargar asientos. Verifique la conexión.', 'error');
          },
        });
      },
    });
  }

  /**
   * Obtiene el texto del estado del asiento
   */
  getEstadoTexto(estado: EstadoAsiento): string {
    return this.asientoService.getEstadoTexto(estado);
  }

  /**
   * Obtiene la clase CSS para el badge del estado
   */
  getEstadoBadgeClass(estado: EstadoAsiento): string {
    return this.asientoService.getEstadoBadgeClass(estado);
  }

  /**
   * Navega a la edición de un asiento
   */
  editarAsiento(asiento: Asiento): void {
    console.log('🔧 Editando asiento:', asiento);
    this.router.navigate(['/menucontabilidad/procesos/asientos-dinamico'], {
      queryParams: { id: asiento.codigo, mode: 'edit' },
    });
  }

  /**
   * Ver detalles de un asiento
   */
  verDetalle(asiento: Asiento): void {
    console.log('👁️ Viendo detalle de asiento:', asiento);
    this.router.navigate(['/menucontabilidad/procesos/asientos-dinamico'], {
      queryParams: { id: asiento.codigo, mode: 'view' },
    });
  }

  /**
   * Crear nuevo asiento
   */
  nuevoAsiento(): void {
    this.router.navigate(['/menucontabilidad/procesos/asientos-dinamico']);
  }

  /**
   * Recargar listado
   */
  refrescar(): void {
    this.loadAsientos();
  }

  /**
   * Muestra un mensaje usando MatSnackBar
   */
  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    const panelClass =
      type === 'success'
        ? 'snackbar-success'
        : type === 'error'
        ? 'snackbar-error'
        : 'snackbar-info';

    this.snackBar.open(message, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [panelClass],
    });
  }

  /**
   * Normaliza el formato de fecha para que sea compatible con DatePipe
   * Convierte "2025-12-10T00:09:35Z[UTC]" a formato ISO estándar
   */
  normalizeFecha(fecha: string): string {
    if (!fecha) return '';
    // Remover el sufijo [UTC] si existe
    const fechaLimpia = fecha.replace(/\[UTC\]$/, '');
    // Verificar si es una fecha válida
    const fechaObj = new Date(fechaLimpia);
    return fechaObj.toISOString();
  }

  /**
   * Obtiene el nombre del tipo de asiento
   */
  getTipoAsientoNombre(tipoAsiento: any): string {
    if (!tipoAsiento) return 'N/A';
    return typeof tipoAsiento === 'object' ? tipoAsiento.nombre : tipoAsiento;
  }
}
