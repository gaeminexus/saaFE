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
          const participe = participes[0];

          // Convertir fechas que puedan tener formato array
          const fechaIngresoTrabajo = this.convertirFecha(participe?.fechaIngresoTrabajo);
          const fechaIngresoFondo = this.convertirFecha(participe?.fechaIngresoFondo);
          const fechaFallecimiento = this.convertirFecha(participe?.fechaFallecimiento);
          const fechaSalida = this.convertirFecha(participe?.fechaSalida);
          const fechaIngreso = this.convertirFecha(participe?.fechaIngreso);

          this.participeEncontrado = {
            ...participe,
            fechaIngresoTrabajo: fechaIngresoTrabajo || participe?.fechaIngresoTrabajo,
            fechaIngresoFondo: fechaIngresoFondo || participe?.fechaIngresoFondo,
            fechaFallecimiento: fechaFallecimiento || participe?.fechaFallecimiento,
            fechaSalida: fechaSalida || participe?.fechaSalida,
            fechaIngreso: fechaIngreso || participe?.fechaIngreso,
          } as Participe;
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

        // Convertir fechas que puedan venir en formato array desde el backend
        this.prestamos = prestamos.map((p: any) => {
          const fechaPrestamo = this.convertirFecha(p.fecha);
          const fechaDesembolso = this.convertirFecha(p.fechaDesembolso);
          const fechaRegistro = this.convertirFecha(p.fechaRegistro);

          return {
            ...p,
            fecha: fechaPrestamo || p.fecha,
            fechaDesembolso: fechaDesembolso || p.fechaDesembolso,
            fechaRegistro: fechaRegistro || p.fechaRegistro,
          };
        });

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

    const headers = ['Código', 'Producto', 'Fecha', 'Monto Solicitado', 'Total Pagado', 'Saldo Total', 'Estado'];
    const dataKeys = ['Código', 'Producto', 'Fecha', 'Monto Solicitado', 'Total Pagado', 'Saldo Total', 'Estado'];

    this.exportService.exportToCSV(
      datos,
      `prestamos_${this.entidadEncontrada?.numeroIdentificacion}_${new Date().getTime()}`,
      headers,
      dataKeys
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
   * Calcula el total solicitado de todos los préstamos
   */
  calcularTotalSolicitado(): number {
    return this.prestamos.reduce((sum, p) => sum + (p.montoSolicitado || 0), 0);
  }

  /**
   * Calcula el total pagado de todos los préstamos
   */
  calcularTotalPagado(): number {
    return this.prestamos.reduce((sum, p) => sum + (p.totalPagado || 0), 0);
  }

  /**
   * Calcula el saldo pendiente total de todos los préstamos
   */
  calcularSaldoPendiente(): number {
    return this.prestamos.reduce((sum, p) => sum + (p.saldoTotal || 0), 0);
  }

  /**
   * Genera PDF con el resumen de préstamos
   */
  generarPDFResumen(): void {
    if (!this.prestamos || this.prestamos.length === 0) {
      this.snackBar.open('No hay préstamos para generar el resumen', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.entidadEncontrada) {
      this.snackBar.open('No hay información de entidad disponible', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.snackBar.open('Generando PDF resumen de préstamos...', '', { duration: 2000 });

      this.cargarJsPDF()
        .then((jsPDF: any) => {
          const doc = new jsPDF();
          let yPosition = 20;

          // Función auxiliar para verificar espacio
          const checkPageBreak = (requiredSpace: number = 20) => {
            if (yPosition + requiredSpace > doc.internal.pageSize.height - 20) {
              doc.addPage();
              yPosition = 20;
              return true;
            }
            return false;
          };

          // Título principal
          doc.setFontSize(18);
          doc.setFont(undefined, 'bold');
          doc.text('Resumen de Préstamos', 105, yPosition, { align: 'center' });

          yPosition += 15;

          // Información de la entidad
          doc.setFontSize(12);
          doc.setTextColor(102, 126, 234);
          doc.text('Información del Partícipe', 14, yPosition);

          yPosition += 8;
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');

          const entidad = this.entidadEncontrada!;
          doc.text(`Razón Social: ${entidad.razonSocial || 'N/A'}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Identificación: ${entidad.numeroIdentificacion || 'N/A'}`, 14, yPosition);
          yPosition += 6;
          if (entidad.nombreComercial && entidad.razonSocial !== entidad.nombreComercial) {
            doc.text(`Nombre Comercial: ${entidad.nombreComercial}`, 14, yPosition);
            yPosition += 6;
          }

          yPosition += 10;
          checkPageBreak(40);

          // Totales generales
          doc.setFontSize(14);
          doc.setTextColor(102, 126, 234);
          doc.setFont(undefined, 'bold');
          doc.text('Totales Generales', 14, yPosition);

          yPosition += 8;
          doc.setFontSize(11);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');

          const totalPrestamos = this.prestamos.length;
          const totalSolicitado = this.calcularTotalSolicitado();
          const totalPagado = this.calcularTotalPagado();
          const saldoPendiente = this.calcularSaldoPendiente();

          doc.text(`Total de Préstamos: ${totalPrestamos}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Monto Total Solicitado: $${totalSolicitado.toFixed(2)}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Total Pagado: $${totalPagado.toFixed(2)}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Saldo Pendiente: $${saldoPendiente.toFixed(2)}`, 14, yPosition);
          yPosition += 6;

          // Calcular porcentaje de pago
          const porcentajePagado = totalSolicitado > 0 ? (totalPagado / totalSolicitado) * 100 : 0;
          doc.text(`Porcentaje Pagado: ${porcentajePagado.toFixed(1)}%`, 14, yPosition);
          yPosition += 12;

          checkPageBreak(40);

          // Tabla resumen por préstamo
          doc.setFontSize(12);
          doc.setTextColor(102, 126, 234);
          doc.setFont(undefined, 'bold');
          doc.text('Detalle de Préstamos', 14, yPosition);
          yPosition += 8;

          const prestamosData = this.prestamos.map((p) => {
            return [
              p.codigo?.toString() || 'N/A',
              p.producto?.nombre || 'Sin Producto',
              new Date(p.fecha).toLocaleDateString('es-ES'),
              `$${(p.montoSolicitado || 0).toFixed(2)}`,
              `$${(p.totalPagado || 0).toFixed(2)}`,
              `$${(p.saldoTotal || 0).toFixed(2)}`,
              p.estadoPrestamo?.nombre || 'N/A',
            ];
          });

          if (doc.autoTable) {
            doc.autoTable({
              startY: yPosition,
              head: [
                [
                  'Código',
                  'Producto',
                  'Fecha',
                  'Monto Solicitado',
                  'Total Pagado',
                  'Saldo',
                  'Estado',
                ],
              ],
              body: prestamosData,
              theme: 'striped',
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: {
                fillColor: [102, 126, 234],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold',
              },
              columnStyles: {
                0: { cellWidth: 20, halign: 'center' },
                1: { cellWidth: 40 },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 30, halign: 'right' },
                4: { cellWidth: 30, halign: 'right' },
                5: { cellWidth: 25, halign: 'right' },
                6: { cellWidth: 25, halign: 'center' },
              },
              footStyles: {
                fillColor: [102, 126, 234],
                textColor: 255,
                fontStyle: 'bold',
              },
              foot: [
                [
                  'TOTALES',
                  '',
                  '',
                  `$${totalSolicitado.toFixed(2)}`,
                  `$${totalPagado.toFixed(2)}`,
                  `$${saldoPendiente.toFixed(2)}`,
                  '',
                ],
              ],
            });
            yPosition = (doc as any).lastAutoTable.finalY + 15;
          }

          // Footer
          const pageCount = (doc as any).internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.setFont(undefined, 'normal');
            doc.text(
              `Generado: ${new Date().toLocaleString('es-ES')} - Página ${i} de ${pageCount}`,
              105,
              doc.internal.pageSize.height - 10,
              { align: 'center' }
            );
          }

          // Guardar el PDF
          const filename = `Resumen_Prestamos_${
            entidad.numeroIdentificacion
          }_${new Date().getTime()}.pdf`;
          doc.save(filename);

          this.snackBar.open('PDF resumen generado exitosamente', 'Cerrar', { duration: 3000 });
        })
        .catch((error) => {
          console.error('Error al cargar jsPDF:', error);
          this.snackBar.open('Error al generar el PDF. Por favor, intente nuevamente.', 'Cerrar', {
            duration: 5000,
          });
        });
    } catch (error) {
      console.error('Error al generar PDF resumen:', error);
      this.snackBar.open('Error al generar el PDF', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Carga jsPDF dinámicamente
   */
  private cargarJsPDF(): Promise<any> {
    return new Promise((resolve, reject) => {
      if ((window as any).jspdf && (window as any).jspdf.jsPDF) {
        resolve((window as any).jspdf.jsPDF);
      } else if ((window as any).jsPDF) {
        resolve((window as any).jsPDF);
      } else {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = () => {
          if ((window as any).jspdf && (window as any).jspdf.jsPDF) {
            resolve((window as any).jspdf.jsPDF);
          } else if ((window as any).jsPDF) {
            resolve((window as any).jsPDF);
          } else {
            reject(new Error('jsPDF no se cargó correctamente'));
          }
        };
        script.onerror = () => reject(new Error('Error al cargar jsPDF'));
        document.head.appendChild(script);

        // Cargar también autoTable
        const autoTableScript = document.createElement('script');
        autoTableScript.src =
          'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
        document.head.appendChild(autoTableScript);
      }
    });
  }

  /**
   * Regresa a la pantalla anterior
   */
  regresarAPantallaAnterior(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
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
