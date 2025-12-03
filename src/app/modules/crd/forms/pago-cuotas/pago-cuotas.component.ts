import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router } from '@angular/router';

import { PagoCuotaDialogComponent } from './pago-cuota-dialog.component';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';

import { Banco } from '../../../tsr/model/banco';
import { CuentaAsoprep } from '../../model/cuenta-asoprep';
import { DatosPago } from '../../model/datos-pago';
import { Entidad } from '../../model/entidad';
import { Participe } from '../../model/participe';
import { Prestamo } from '../../model/prestamo';

import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../shared/services/export.service';
import { BancoService } from '../../../tsr/service/banco.service';
import { EntidadService } from '../../service/entidad.service';
import { ParticipeService } from '../../service/participe.service';
import { PrestamoService } from '../../service/prestamo.service';

@Component({
  selector: 'app-pago-cuotas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialFormModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    CurrencyPipe,
    DatePipe,
  ],
  templateUrl: './pago-cuotas.component.html',
  styleUrls: ['./pago-cuotas.component.scss'],
})
export class PagoCuotasComponent implements OnInit {
  // Servicios
  private entidadService = inject(EntidadService);
  private participeService = inject(ParticipeService);
  private prestamoService = inject(PrestamoService);
  private bancoService = inject(BancoService);
  private exportService = inject(ExportService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  // Variables de búsqueda
  searchText: string = '';
  isSearching: boolean = false;
  mostrarBusqueda: boolean = true;

  // Variables de datos
  entidadEncontrada: Entidad | null = null;
  participeEncontrado: Participe | null = null;
  prestamos: Prestamo[] = [];

  // Variables de estado
  isLoadingBusqueda: boolean = false;
  isLoadingDatos: boolean = false;

  ngOnInit(): void {
    // Verificar si viene una entidad como parámetro de navegación
    const state = history.state;
    if (state && state.entidad) {
      this.entidadEncontrada = state.entidad;
      this.searchText = state.entidad.numeroIdentificacion || '';
      this.mostrarBusqueda = false;
      this.cargarParticipe(state.entidad.codigo);
    }
  }

  /**
   * Busca una entidad por número de identificación, razón social o nombre comercial
   */
  buscarEntidad(): void {
    if (!this.searchText || this.searchText.trim() === '') {
      this.snackBar.open('Por favor, ingrese un criterio de búsqueda', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    this.isSearching = true;
    this.isLoadingBusqueda = true;
    this.entidadEncontrada = null;
    this.participeEncontrado = null;
    this.prestamos = [];

    const searchValue = this.searchText.trim();

    // Crear criterios de búsqueda usando el patrón de cruce-valores
    const criterioConsultaArray: DatosBusqueda[] = [];

    // Búsqueda por número de identificación
    let criterio = new DatosBusqueda();
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'numeroIdentificacion',
      searchValue,
      TipoComandosBusqueda.LIKE
    );
    criterioConsultaArray.push(criterio);

    // Búsqueda por razón social con operador OR
    criterio = new DatosBusqueda();
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'razonSocial',
      searchValue,
      TipoComandosBusqueda.LIKE
    );
    criterio.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterioConsultaArray.push(criterio);

    // Búsqueda por nombre comercial con operador OR
    criterio = new DatosBusqueda();
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'nombreComercial',
      searchValue,
      TipoComandosBusqueda.LIKE
    );
    criterio.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterioConsultaArray.push(criterio);

    this.entidadService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (entidades: any) => {
        this.isSearching = false;
        this.isLoadingBusqueda = false;

        if (entidades && entidades.length > 0) {
          this.entidadEncontrada = entidades[0] as Entidad;
          this.cargarParticipe(this.entidadEncontrada.codigo);
        } else {
          this.snackBar.open('No se encontró ninguna entidad con ese criterio', 'Cerrar', {
            duration: 3000,
          });
        }
      },
      error: (error) => {
        console.error('Error al buscar entidad:', error);
        this.isSearching = false;
        this.isLoadingBusqueda = false;
        this.snackBar.open('Error al buscar la entidad', 'Cerrar', { duration: 3000 });
      },
    });
  }

  /**
   * Carga la información del partícipe asociado a la entidad
   */
  cargarParticipe(codigoEntidad: number): void {
    this.isLoadingDatos = true;

    const criterios: DatosBusqueda[] = [];
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      String(codigoEntidad),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEntidad);

    this.participeService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const participes = Array.isArray(data) ? data : [data];
        if (participes && participes.length > 0) {
          this.participeEncontrado = participes[0];
        }
        this.cargarPrestamos();
      },
      error: (error) => {
        console.error('Error al cargar partícipe:', error);
        this.isLoadingDatos = false;
        this.cargarPrestamos();
      },
    });
  }

  /**
   * Carga los préstamos de la entidad
   */
  cargarPrestamos(): void {
    if (!this.entidadEncontrada) {
      this.isLoadingDatos = false;
      return;
    }

    const criterios: DatosBusqueda[] = [];
    const criterioEntidad = new DatosBusqueda();
    criterioEntidad.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      String(this.entidadEncontrada.codigo),
      TipoComandosBusqueda.IGUAL
    );
    criterios.push(criterioEntidad);

    this.prestamoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        const prestamos = Array.isArray(data) ? data : data ? [data] : [];
        this.prestamos = prestamos;

        this.isLoadingDatos = false;
      },
      error: (error) => {
        console.error('Error al cargar préstamos:', error);
        this.prestamos = [];
        this.isLoadingDatos = false;
        this.snackBar.open('Error al cargar los préstamos', 'Cerrar', { duration: 3000 });
      },
    });
  }

  /**
   * Limpia el campo de búsqueda
   */
  limpiarBusqueda(): void {
    this.searchText = '';
    this.entidadEncontrada = null;
    this.participeEncontrado = null;
    this.prestamos = [];
  }

  /**
   * Ver detalle del préstamo
   */
  verDetallePrestamo(prestamo: Prestamo): void {
    console.log('Ver detalle del préstamo:', prestamo);
    // TODO: Implementar navegación al detalle del préstamo
    this.snackBar.open('Detalle del préstamo - En desarrollo', 'Cerrar', { duration: 2000 });
  }

  /**
   * Realizar pago de cuota
   */
  realizarPagoCuota(prestamo: Prestamo): void {
    // Datos mock de bancos (tabla TSR.BNCO aún no existe en la base de datos)
    // TODO: Cuando la tabla TSR.BNCO esté disponible, usar: this.bancoService.getAll()
    const bancosMock: Banco[] = [
      {
        codigo: 1,
        nombre: 'Banco Pichincha',
        sigla: 'BP',
        tipo: 1,
        estado: 1,
        fechaIngreso: new Date().toISOString(),
      },
      {
        codigo: 2,
        nombre: 'Banco Guayaquil',
        sigla: 'BG',
        tipo: 1,
        estado: 1,
        fechaIngreso: new Date().toISOString(),
      },
      {
        codigo: 3,
        nombre: 'Banco Pacífico',
        sigla: 'BPAC',
        tipo: 1,
        estado: 1,
        fechaIngreso: new Date().toISOString(),
      },
      {
        codigo: 4,
        nombre: 'Banco Bolivariano',
        sigla: 'BB',
        tipo: 1,
        estado: 1,
        fechaIngreso: new Date().toISOString(),
      },
      {
        codigo: 5,
        nombre: 'Banco Internacional',
        sigla: 'BI',
        tipo: 1,
        estado: 1,
        fechaIngreso: new Date().toISOString(),
      },
      {
        codigo: 6,
        nombre: 'Produbanco',
        sigla: 'PB',
        tipo: 1,
        estado: 1,
        fechaIngreso: new Date().toISOString(),
      },
      {
        codigo: 7,
        nombre: 'Banco del Austro',
        sigla: 'BA',
        tipo: 1,
        estado: 1,
        fechaIngreso: new Date().toISOString(),
      },
    ];

    // Datos mock de cuentas ASOPREP (TODO: obtener desde servicio)
    const cuentasAsoprep: CuentaAsoprep[] = [
      { codigo: 1, numeroCuenta: '1234567890', tipoCuenta: 'Ahorros', banco: 'Pichincha' },
      { codigo: 2, numeroCuenta: '0987654321', tipoCuenta: 'Corriente', banco: 'Guayaquil' },
      { codigo: 3, numeroCuenta: '5555666677', tipoCuenta: 'Ahorros', banco: 'Pacífico' },
    ];

    const dialogRef = this.dialog.open(PagoCuotaDialogComponent, {
      width: '650px',
      maxWidth: '95vw',
      disableClose: true,
      data: {
        prestamo: prestamo,
        bancos: bancosMock,
        cuentasAsoprep: cuentasAsoprep,
      },
    });

    dialogRef.afterClosed().subscribe((result: DatosPago | undefined) => {
      if (result) {
        console.log('Datos de pago recibidos:', result);
        // TODO: Enviar datos al backend para procesar el pago
        this.snackBar.open(
          `Pago de $${result.monto.toFixed(2)} registrado exitosamente`,
          'Cerrar',
          { duration: 3000 }
        );
        // TODO: Refrescar lista de préstamos después del pago
        // this.cargarPrestamos();
      }
    });
  }

  /**
   * Exportar datos a CSV
   */
  exportarCSV(): void {
    if (!this.prestamos || this.prestamos.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 2000 });
      return;
    }

    const datos = this.prestamos.map((p) => ({
      Código: p.codigo,
      Producto: p.producto?.nombre || 'Sin Producto',
      Fecha: p.fecha,
      'Monto Solicitado': p.montoSolicitado,
      'Total Pagado': p.totalPagado,
      'Saldo Total': p.saldoTotal,
      Estado: p.estadoPrestamo?.nombre || 'Sin Estado',
    }));

    this.exportService.exportToCSV(
      datos,
      `prestamos_${this.entidadEncontrada?.numeroIdentificacion}_${new Date().getTime()}`,
      Object.keys(datos[0])
    );
  }

  /**
   * Exportar datos a PDF
   */
  exportarPDF(): void {
    if (!this.prestamos || this.prestamos.length === 0) {
      this.snackBar.open('No hay datos para exportar', 'Cerrar', { duration: 2000 });
      return;
    }

    if (!this.entidadEncontrada) {
      this.snackBar.open('No hay información de entidad disponible', 'Cerrar', { duration: 2000 });
      return;
    }

    const datos = this.prestamos.map((p) => ({
      codigo: p.codigo.toString(),
      producto: p.producto?.nombre || 'Sin Producto',
      fecha: new Date(p.fecha).toLocaleDateString('es-ES'),
      montoSolicitado: `$${p.montoSolicitado?.toFixed(2) || '0.00'}`,
      totalPagado: `$${p.totalPagado?.toFixed(2) || '0.00'}`,
      saldoTotal: `$${p.saldoTotal?.toFixed(2) || '0.00'}`,
      estado: p.estadoPrestamo?.nombre || 'Sin Estado',
    }));

    const headers = [
      'Código',
      'Producto',
      'Fecha',
      'Monto Solicitado',
      'Total Pagado',
      'Saldo Total',
      'Estado',
    ];
    const dataKeys = [
      'codigo',
      'producto',
      'fecha',
      'montoSolicitado',
      'totalPagado',
      'saldoTotal',
      'estado',
    ];

    const entidadInfo = `${this.entidadEncontrada.numeroIdentificacion} - ${this.entidadEncontrada.razonSocial}`;
    const filename = `prestamos_${
      this.entidadEncontrada.numeroIdentificacion
    }_${new Date().getTime()}`;
    const title = `Préstamos de la Entidad\n${entidadInfo}`;

    this.exportService.exportToPDF(datos, filename, title, headers, dataKeys);
  }

  /**
   * Regresa a la pantalla anterior
   */
  regresarAPantallaAnterior(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
