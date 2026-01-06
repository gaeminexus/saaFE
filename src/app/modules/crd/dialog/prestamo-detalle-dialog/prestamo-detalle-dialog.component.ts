import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { PrestamoService } from '../../service/prestamo.service';
import { DetallePrestamoService } from '../../service/detalle-prestamo.service';
import { ExportService } from '../../../../shared/services/export.service';
import { Prestamo } from '../../model/prestamo';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

@Component({
  selector: 'app-prestamo-detalle-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatDividerModule
  ],
  templateUrl: './prestamo-detalle-dialog.component.html',
  styleUrls: ['./prestamo-detalle-dialog.component.scss']
})
export class PrestamoDetalleDialogComponent implements OnInit {
  prestamo: Prestamo | null = null;
  detalles: DetallePrestamo[] = [];
  loading = true;
  error = '';

  displayedColumns = ['numeroCuota', 'fechaVencimiento', 'capital', 'interes', 'cuota', 'saldo', 'estado'];

  constructor(
    public dialogRef: MatDialogRef<PrestamoDetalleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { codigoPrestamo: number },
    private prestamoService: PrestamoService,
    private detallePrestamoService: DetallePrestamoService,
    private exportService: ExportService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.loading = true;
    this.error = '';

    // Cargar datos del préstamo
    this.prestamoService.getById(this.data.codigoPrestamo.toString()).subscribe({
      next: (prestamo) => {
        if (prestamo) {
          // Convertir fechas del préstamo
          this.prestamo = {
            ...prestamo,
            fecha: this.convertirFecha(prestamo.fecha) as Date,
            fechaInicio: this.convertirFecha(prestamo.fechaInicio) as Date,
            fechaFin: this.convertirFecha(prestamo.fechaFin) as Date,
            fechaRegistro: this.convertirFecha(prestamo.fechaRegistro) as Date,
            fechaModificacion: this.convertirFecha(prestamo.fechaModificacion) as Date
          };
        }

        // Cargar detalles de cuotas usando DatosBusqueda
        const criterioConsultaArray: DatosBusqueda[] = [];

        const criterio = new DatosBusqueda();
        criterio.asignaValorConCampoPadre(
          TipoDatosBusqueda.LONG,
          'prestamo',
          'codigo',
          this.data.codigoPrestamo.toString(),
          TipoComandosBusqueda.IGUAL
        );
        criterioConsultaArray.push(criterio);

        const criterioOrden = new DatosBusqueda();
        criterioOrden.orderBy('numeroCuota');
        criterioOrden.setTipoOrden(DatosBusqueda.ORDER_ASC);
        criterioConsultaArray.push(criterioOrden);

        this.detallePrestamoService.selectByCriteria(criterioConsultaArray).subscribe({
          next: (detalles) => {
            this.detalles = (detalles || []).map(detalle => ({
              ...detalle,
              fechaVencimiento: this.convertirFecha(detalle.fechaVencimiento) as Date,
              fechaPagado: this.convertirFecha(detalle.fechaPagado) as Date,
              fechaRegistro: this.convertirFecha(detalle.fechaRegistro) as Date
            }));
            this.loading = false;
          },
          error: (err) => {
            console.error('Error al cargar detalles:', err);
            this.error = 'Error al cargar las cuotas del préstamo';
            this.loading = false;
          }
        });
      },
      error: (err) => {
        console.error('Error al cargar préstamo:', err);
        this.error = 'Error al cargar los datos del préstamo';
        this.loading = false;
      }
    });
  }

  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;
    if (Array.isArray(fecha)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, ms = 0] = fecha;
      return new Date(year, month - 1, day, hour, minute, second, ms);
    }
    if (fecha instanceof Date) return fecha;
    if (typeof fecha === 'string' || typeof fecha === 'number') {
      return new Date(fecha);
    }
    return null;
  }

  formatearFecha(fecha: Date | null): string {
    if (!fecha) return 'N/A';
    const d = new Date(fecha);
    const dia = d.getDate().toString().padStart(2, '0');
    const mes = (d.getMonth() + 1).toString().padStart(2, '0');
    const anio = d.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  obtenerEstadoCuota(detalle: DetallePrestamo): string {
    if (detalle.fechaPagado) return 'Pagada';

    const hoy = new Date();
    const fechaVencimiento = new Date(detalle.fechaVencimiento);

    if (fechaVencimiento < hoy) return 'Vencida';

    const diferenciaDias = Math.floor((fechaVencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diferenciaDias <= 7) return 'Por vencer';

    return 'Pendiente';
  }

  exportarCuotasCSV(): void {
    if (!this.detalles || this.detalles.length === 0) return;

    const rows = this.detalles.map(d => ({
      'Cuota': d.numeroCuota,
      'Vencimiento': this.formatearFecha(d.fechaVencimiento),
      'Capital': d.capital.toFixed(2),
      'Interés': d.interes.toFixed(2),
      'Valor Cuota': d.cuota.toFixed(2),
      'Saldo': d.saldo.toFixed(2),
      'Estado': this.obtenerEstadoCuota(d)
    }));

    const headers = ['Cuota', 'Vencimiento', 'Capital', 'Interés', 'Valor Cuota', 'Saldo', 'Estado'];
    const dataKeys = ['Cuota', 'Vencimiento', 'Capital', 'Interés', 'Valor Cuota', 'Saldo', 'Estado'];

    this.exportService.exportToCSV(
      rows,
      `cuotas-prestamo-${this.prestamo?.idAsoprep || this.data.codigoPrestamo}`,
      headers,
      dataKeys
    );
  }

  exportarTodoPDF(): void {
    if (!this.prestamo) return;

    const infoPrestamo = [
      ['Número Préstamo (ASOPREP)', this.prestamo.idAsoprep?.toString() || 'N/A'],
      ['Código Interno', this.prestamo.codigo?.toString() || 'N/A'],
      ['Tipo de Préstamo', this.prestamo.producto?.nombre || 'N/A'],
      ['Estado', this.prestamo.estadoPrestamo?.nombre || 'N/A'],
      ['Entidad', this.prestamo.entidad?.razonSocial || this.prestamo.entidad?.nombreComercial || 'N/A'],
      ['Monto Solicitado', `$${this.prestamo.montoSolicitado?.toFixed(2) || '0.00'}`],
      ['Total Préstamo', `$${this.prestamo.totalPrestamo?.toFixed(2) || '0.00'}`],
      ['Valor Cuota', `$${this.prestamo.valorCuota?.toFixed(2) || '0.00'}`],
      ['Plazo', `${this.prestamo.plazo || 0} meses`],
      ['Tasa Nominal', `${this.prestamo.tasaNominal || 0}%`],
      ['Saldo Total', `$${this.prestamo.saldoTotal?.toFixed(2) || '0.00'}`],
      ['Total Pagado', `$${this.prestamo.totalPagado?.toFixed(2) || '0.00'}`],
      ['Fecha Solicitud', this.formatearFecha(this.prestamo.fecha)],
      ['Fecha Inicio', this.formatearFecha(this.prestamo.fechaInicio)],
      ['Fecha Fin', this.formatearFecha(this.prestamo.fechaFin)]
    ];

    const cuotasData = this.detalles.map(d => ({
      cuota: d.numeroCuota.toString(),
      vencimiento: this.formatearFecha(d.fechaVencimiento),
      capital: d.capital.toFixed(2),
      interes: d.interes.toFixed(2),
      valorCuota: d.cuota.toFixed(2),
      saldo: d.saldo.toFixed(2),
      estado: this.obtenerEstadoCuota(d)
    }));

    // Combinar información general y cuotas
    const allData = [
      ...infoPrestamo.map(([label, value]) => ({
        campo: label,
        valor: value,
        detalle: '',
        info: ''
      })),
      { campo: '---', valor: 'PLAN DE PAGOS', detalle: '---', info: '---' },
      ...cuotasData.map((c, idx) => ({
        campo: `Cuota ${c.cuota}`,
        valor: c.vencimiento,
        detalle: `Cap: $${c.capital} | Int: $${c.interes}`,
        info: `Total: $${c.valorCuota} | Saldo: $${c.saldo}`
      }))
    ];

    const headers = ['Campo', 'Valor', 'Detalle', 'Info'];
    const dataKeys = ['campo', 'valor', 'detalle', 'info'];

    this.exportService.exportToPDF(
      allData,
      `prestamo-completo-${this.prestamo.idAsoprep || this.data.codigoPrestamo}`,
      `Préstamo Nº ${this.prestamo.idAsoprep || this.data.codigoPrestamo} - Detalle Completo`,
      headers,
      dataKeys
    );
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
