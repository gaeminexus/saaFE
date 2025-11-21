import { Component, OnInit, Inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { PrestamoPagosDialogComponent } from '../../../dialog/prestamo-pagos-dialog/prestamo-pagos-dialog.component';
import { PdfParticipeDetalleDialogComponent } from '../../../dialog/pdf-participe-detalle-dialog/pdf-participe-detalle-dialog.component';

import { Entidad } from '../../../model/entidad';
import { Prestamo } from '../../../model/prestamo';
import { DetallePrestamo } from '../../../model/detalle-prestamo';
import { PagoPrestamo } from '../../../model/pago-prestamo';
import { Producto } from '../../../model/producto';
import { Aporte } from '../../../model/aporte';
import { Contrato } from '../../../model/contrato';
import { Participe } from '../../../model/participe';

import { EntidadService } from '../../../service/entidad.service';
import { PrestamoService } from '../../../service/prestamo.service';
import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { PagoPrestamoService } from '../../../service/pago-prestamo.service';
import { AporteService } from '../../../service/aporte.service';
import { ContratoService } from '../../../service/contrato.service';
import { ParticipeService } from '../../../service/participe.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';

interface DetalleConPagos {
  detalle: DetallePrestamo;
  pagos: PagoPrestamo[];
  mostrarPagos: boolean;
}

interface AportesPorTipo {
  tipoAporte: string;
  codigoTipo: number;
  aportes: Aporte[];
  totalValor: number;
  totalPagado: number;
  totalSaldo: number;
  expandido: boolean;
}

@Component({
  selector: 'app-participe-dash',
  standalone: true,
  imports: [
    FormsModule,
    MaterialFormModule
  ],
  templateUrl: './participe-dash.component.html',
  styleUrl: './participe-dash.component.scss'
})
export class ParticipeDashComponent implements OnInit {
  // Búsqueda
  searchText: string = '';
  isSearching: boolean = false;

  // Entidad encontrada
  entidadEncontrada: Entidad | null = null;
  contratoEncontrado: Contrato | null = null;
  participeEncontrado: Participe | null = null;

  // Dashboard
  prestamos: Prestamo[] = [];
  aportes: Aporte[] = [];
  aportesPorTipo: AportesPorTipo[] = [];
  totalAportes: number = 0;

  // Vista de detalle
  vistaActual: 'dashboard' | 'detallePrestamos' | 'detalleAportes' = 'dashboard';
  prestamoSeleccionado: Prestamo | null = null;

  // Detalles de préstamos
  detallesPrestamo: Map<number, DetalleConPagos[]> = new Map();
  prestamoExpandido: number | null = null;

  // Columnas de las tablas
  displayedColumns: string[] = ['numeroCuota', 'fechaVencimiento', 'capital', 'interes', 'cuota', 'saldo', 'acciones'];
  displayedColumnsAportes: string[] = ['fechaTransaccion', 'tipoAporte', 'glosa', 'valor', 'valorPagado', 'saldo'];

  // Loading states
  isLoadingDetalles: boolean = false;
  isLoadingPagos: boolean = false;
  isLoadingAportes: boolean = false;
  isLoadingDashboard: boolean = false;

  constructor(
    private entidadService: EntidadService,
    private prestamoService: PrestamoService,
    private detallePrestamoService: DetallePrestamoService,
    private pagoPrestamoService: PagoPrestamoService,
    private aporteService: AporteService,
    private contratoService: ContratoService,
    private participeService: ParticipeService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Verificar si hay código de entidad en los query params (cuando regresa de entidad-participe-info)
    this.route.queryParams.subscribe((params: any) => {
      const codigoEntidadParam = params['codigoEntidad'];
      if (codigoEntidadParam) {
        const codigo = Number(codigoEntidadParam);
        this.cargarEntidadPorCodigo(codigo);
      }
    });
  }

  /**
   * Genera un PDF con la información de la entidad
   */
  generarPDF(): void {
    if (!this.entidadEncontrada) {
      this.snackBar.open('No hay información de entidad para generar el PDF', 'Cerrar', { duration: 3000 });
      return;
    }

    // Abrir diálogo para seleccionar tipo de reporte
    const dialogRef = this.dialog.open(PdfParticipeDetalleDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.generarPDFConDetalles(result === 'conDetalles');
      }
    });
  }

  /**
   * Navega al formulario de edición de partícipe
   */
  editarParticipe(): void {
    if (!this.entidadEncontrada || !this.entidadEncontrada.codigo) {
      this.snackBar.open('No hay información de entidad para editar', 'Cerrar', { duration: 3000 });
      return;
    }

    if (!this.participeEncontrado || !this.participeEncontrado.codigo) {
      this.snackBar.open('No hay información de partícipe para editar', 'Cerrar', { duration: 3000 });
      return;
    }

    // Navegar a entidad-participe-info con los códigos de entidad y partícipe
    // Mantener el query param para poder regresar a la misma entidad
    this.router.navigate(['/menucreditos/entidad-participe-info'], {
      queryParams: {
        codigoEntidad: this.entidadEncontrada.codigo,
        codigoParticipe: this.participeEncontrado.codigo,
        returnUrl: `/menucreditos/participe-dash`
      }
    });
  }

  /**
   * Genera el PDF según la opción seleccionada
   */
  private generarPDFConDetalles(conDetalles: boolean): void {
    if (conDetalles) {
      this.generarPDFConDetalle();
    } else {
      this.generarPDFResumido();
    }
  }

  /**
   * Genera PDF resumido con información del dashboard sin detalles
   */
  private generarPDFResumido(): void {
    if (!this.entidadEncontrada) return;

    const entidad = this.entidadEncontrada; // Guardar referencia para evitar errores de null

    try {
      // Cargar jsPDF dinámicamente
      this.cargarJsPDF().then((jsPDF: any) => {
        const doc = new jsPDF();
        let yPosition = 20;

        // Título principal
        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Reporte Financiero de Partícipe', 105, yPosition, { align: 'center' });

        yPosition += 15;

        // Información de la entidad
        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text('Información del Partícipe', 14, yPosition);

        yPosition += 8;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');

        doc.text(`Razón Social: ${entidad.razonSocial || 'N/A'}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Identificación: ${entidad.numeroIdentificacion || 'N/A'}`, 14, yPosition);
        yPosition += 6;
        if (entidad.nombreComercial && entidad.razonSocial !== entidad.nombreComercial) {
          doc.text(`Nombre Comercial: ${entidad.nombreComercial}`, 14, yPosition);
          yPosition += 6;
        }

        yPosition += 10;

        // Resumen de Aportes
        doc.setFontSize(14);
        doc.setTextColor(246, 173, 85);
        doc.setFont(undefined, 'bold');
        doc.text('Resumen de Aportes', 14, yPosition);

        yPosition += 8;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Acumulado: $${this.totalAportes.toFixed(2)}`, 14, yPosition);

        yPosition += 8;

        // Tabla de aportes por tipo
        if (this.aportesPorTipo.length > 0) {
          const aportesData = this.aportesPorTipo.map(tipo => [
            tipo.tipoAporte,
            `$${tipo.totalValor.toFixed(2)}`
          ]);

          if (doc.autoTable) {
            doc.autoTable({
              startY: yPosition,
              head: [['Tipo de Aporte', 'Total']],
              body: aportesData,
              theme: 'grid',
              styles: { fontSize: 9, cellPadding: 3 },
              headStyles: {
                fillColor: [246, 173, 85],
                textColor: 255,
                fontSize: 10,
                fontStyle: 'bold'
              },
              alternateRowStyles: { fillColor: [255, 250, 240] },
              margin: { left: 14, right: 14 }
            });
            yPosition = (doc as any).lastAutoTable.finalY + 10;
          } else {
            yPosition += 5;
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.text('Tipo de Aporte', 14, yPosition);
            doc.text('Total', 150, yPosition);
            yPosition += 5;
            doc.setFont(undefined, 'normal');
            aportesData.forEach(([tipo, total]) => {
              doc.text(tipo, 14, yPosition);
              doc.text(total, 150, yPosition);
              yPosition += 5;
            });
            yPosition += 5;
          }
        }

        // Resumen de Préstamos
        if (this.prestamos.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(102, 126, 234);
          doc.setFont(undefined, 'bold');
          doc.text('Resumen de Préstamos', 14, yPosition);

          yPosition += 8;

          const prestamosData = this.prestamos.map(prestamo => [
            prestamo.producto?.nombre || 'N/A',
            `#${prestamo.codigo}`,
            `$${prestamo.totalPrestamo.toFixed(2)}`,
            `$${prestamo.saldoTotal.toFixed(2)}`,
            `$${this.calcularTotalPagado(prestamo).toFixed(2)}`,
            prestamo.estadoPrestamo?.nombre || 'N/A'
          ]);

          if (doc.autoTable) {
            doc.autoTable({
              startY: yPosition,
              head: [['Producto', 'Código', 'Monto Total', 'Saldo', 'Total Pagado', 'Estado']],
              body: prestamosData,
              theme: 'grid',
              styles: { fontSize: 8, cellPadding: 2 },
              headStyles: {
                fillColor: [102, 126, 234],
                textColor: 255,
                fontSize: 9,
                fontStyle: 'bold'
              },
              alternateRowStyles: { fillColor: [248, 250, 252] },
              margin: { left: 14, right: 14 },
              columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 20 },
                2: { cellWidth: 30 },
                3: { cellWidth: 30 },
                4: { cellWidth: 30 },
                5: { cellWidth: 30 }
              }
            });
          }
        } else {
          doc.setFontSize(10);
          doc.setTextColor(128, 128, 128);
          doc.setFont(undefined, 'italic');
          doc.text('No hay préstamos registrados', 14, yPosition);
        }

        // Footer con fecha de generación
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Generado el: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`,
            14,
            doc.internal.pageSize.height - 10
          );
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          );
        }

        // Guardar el PDF
        const filename = `Reporte_${entidad.numeroIdentificacion}_${new Date().getTime()}.pdf`;
        doc.save(filename);

        this.snackBar.open('PDF generado exitosamente', 'Cerrar', { duration: 3000 });
      }).catch(error => {
        console.error('Error al cargar jsPDF:', error);
        this.snackBar.open('Error al generar el PDF. Por favor, intente nuevamente.', 'Cerrar', { duration: 5000 });
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.snackBar.open('Error al generar el PDF', 'Cerrar', { duration: 3000 });
    }
  }

  /**
   * Genera PDF detallado con información de aportes por tipo y préstamos con cuotas
   */
  private async generarPDFConDetalle(): Promise<void> {
    if (!this.entidadEncontrada) return;

    const entidad = this.entidadEncontrada;

    // Mostrar mensaje de carga
    this.snackBar.open('Cargando información detallada...', '', { duration: 2000 });

    try {
      // Cargar detalles de todos los préstamos primero
      const promesasCarga = this.prestamos.map(prestamo =>
        this.cargarDetallesPrestamoAsync(prestamo.codigo)
      );

      await Promise.all(promesasCarga);

      // Ahora generar el PDF con los datos cargados
      this.cargarJsPDF().then((jsPDF: any) => {
        const doc = new jsPDF();
        let yPosition = 20;

        // Función auxiliar para verificar espacio y agregar página si es necesario
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
        doc.text('Reporte Financiero Detallado de Partícipe', 105, yPosition, { align: 'center' });

        yPosition += 15;

        // Información de la entidad
        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234);
        doc.text('Información del Partícipe', 14, yPosition);

        yPosition += 8;
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');

        doc.text(`Razón Social: ${entidad.razonSocial || 'N/A'}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Identificación: ${entidad.numeroIdentificacion || 'N/A'}`, 14, yPosition);
        yPosition += 6;
        if (entidad.nombreComercial && entidad.razonSocial !== entidad.nombreComercial) {
          doc.text(`Nombre Comercial: ${entidad.nombreComercial}`, 14, yPosition);
          yPosition += 6;
        }

        yPosition += 10;
        checkPageBreak(30);

        // SECCIÓN DE APORTES DETALLADOS
        doc.setFontSize(16);
        doc.setTextColor(246, 173, 85);
        doc.setFont(undefined, 'bold');
        doc.text('Detalle de Aportes', 14, yPosition);

        yPosition += 8;
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text(`Total Acumulado: $${this.totalAportes.toFixed(2)}`, 14, yPosition);
        yPosition += 10;

        // Iterar por cada tipo de aporte
        if (this.aportesPorTipo.length > 0) {
          this.aportesPorTipo.forEach((tipoAporte, index) => {
            checkPageBreak(40);

            // Encabezado del tipo de aporte
            doc.setFontSize(12);
            doc.setTextColor(246, 173, 85);
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${tipoAporte.tipoAporte}`, 14, yPosition);

            yPosition += 6;
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');
            doc.text(`Total: $${tipoAporte.totalValor.toFixed(2)} | Cantidad: ${tipoAporte.aportes.length}`, 20, yPosition);
            yPosition += 8;

            // Tabla de aportes del tipo
            const aportesData = tipoAporte.aportes.map(aporte => {
              const fecha = this.convertirFecha(aporte.fechaTransaccion);
              return [
                fecha ? fecha.toLocaleDateString('es-ES') : 'N/A',
                aporte.glosa || 'N/A',
                `$${(aporte.valor || 0).toFixed(2)}`,
                `$${(aporte.valorPagado || 0).toFixed(2)}`,
                `$${(aporte.saldo || 0).toFixed(2)}`
              ];
            });

            if (doc.autoTable) {
              doc.autoTable({
                startY: yPosition,
                head: [['Fecha', 'Glosa', 'Valor', 'Pagado', 'Saldo']],
                body: aportesData,
                theme: 'striped',
                styles: { fontSize: 8, cellPadding: 2 },
                headStyles: {
                  fillColor: [246, 173, 85],
                  textColor: 255,
                  fontSize: 8,
                  fontStyle: 'bold'
                },
                margin: { left: 20, right: 14 },
                columnStyles: {
                  0: { cellWidth: 25 },
                  1: { cellWidth: 80 },
                  2: { cellWidth: 25 },
                  3: { cellWidth: 25 },
                  4: { cellWidth: 25 }
                }
              });
              yPosition = (doc as any).lastAutoTable.finalY + 8;
            } else {
              // Fallback sin autoTable
              yPosition += 5;
              aportesData.forEach(row => {
                checkPageBreak();
                doc.setFontSize(7);
                doc.text(row.join(' | '), 20, yPosition);
                yPosition += 5;
              });
              yPosition += 5;
            }
          });
        } else {
          doc.setFontSize(10);
          doc.setTextColor(128, 128, 128);
          doc.setFont(undefined, 'italic');
          doc.text('No hay aportes registrados', 14, yPosition);
          yPosition += 10;
        }

        checkPageBreak(30);

        // SECCIÓN DE PRÉSTAMOS DETALLADOS
        doc.setFontSize(16);
        doc.setTextColor(102, 126, 234);
        doc.setFont(undefined, 'bold');
        doc.text('Detalle de Préstamos', 14, yPosition);
        yPosition += 10;

        if (this.prestamos.length > 0) {
          for (const prestamo of this.prestamos) {
            checkPageBreak(50);

            // Encabezado del préstamo
            doc.setFontSize(12);
            doc.setTextColor(102, 126, 234);
            doc.setFont(undefined, 'bold');
            doc.text(`Préstamo #${prestamo.codigo} - ${prestamo.producto?.nombre || 'N/A'}`, 14, yPosition);

            yPosition += 6;
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.setFont(undefined, 'normal');

            const fechaPrestamo = this.convertirFecha(prestamo.fecha);
            const fechaStr = fechaPrestamo ? fechaPrestamo.toLocaleDateString('es-ES') : 'N/A';

            doc.text(`Fecha: ${fechaStr} | Estado: ${prestamo.estadoPrestamo?.nombre || 'N/A'}`, 20, yPosition);
            yPosition += 5;
            doc.text(`Monto Total: $${prestamo.totalPrestamo.toFixed(2)} | Saldo: $${prestamo.saldoTotal.toFixed(2)} | Pagado: $${this.calcularTotalPagado(prestamo).toFixed(2)}`, 20, yPosition);
            yPosition += 8;

            // Cargar detalles del préstamo si no están cargados
            const detalles = this.detallesPrestamo.get(prestamo.codigo);

            if (detalles && detalles.length > 0) {
              // Tabla de cuotas
              const cuotasData = detalles.map(dc => {
                const fechaVenc = this.convertirFecha(dc.detalle.fechaVencimiento);
                return [
                  dc.detalle.numeroCuota?.toString() || 'N/A',
                  fechaVenc ? fechaVenc.toLocaleDateString('es-ES') : 'N/A',
                  `$${(dc.detalle.capital || 0).toFixed(2)}`,
                  `$${(dc.detalle.interes || 0).toFixed(2)}`,
                  `$${(dc.detalle.cuota || 0).toFixed(2)}`,
                  `$${(dc.detalle.saldo || 0).toFixed(2)}`
                ];
              });

              if (doc.autoTable) {
                doc.autoTable({
                  startY: yPosition,
                  head: [['Cuota', 'Vencimiento', 'Capital', 'Interés', 'Cuota', 'Saldo']],
                  body: cuotasData,
                  theme: 'striped',
                  styles: { fontSize: 7, cellPadding: 2 },
                  headStyles: {
                    fillColor: [102, 126, 234],
                    textColor: 255,
                    fontSize: 7,
                    fontStyle: 'bold'
                  },
                  margin: { left: 20, right: 14 },
                  columnStyles: {
                    0: { cellWidth: 15 },
                    1: { cellWidth: 25 },
                    2: { cellWidth: 28 },
                    3: { cellWidth: 28 },
                    4: { cellWidth: 28 },
                    5: { cellWidth: 28 }
                  }
                });
                yPosition = (doc as any).lastAutoTable.finalY + 10;
              } else {
                // Fallback
                yPosition += 5;
                cuotasData.forEach(row => {
                  checkPageBreak();
                  doc.setFontSize(7);
                  doc.text(row.join(' | '), 20, yPosition);
                  yPosition += 5;
                });
                yPosition += 8;
              }
            } else {
              doc.setFontSize(9);
              doc.setTextColor(128, 128, 128);
              doc.setFont(undefined, 'italic');
              doc.text('Sin detalles de cuotas disponibles', 20, yPosition);
              yPosition += 10;
            }
          }
        } else {
          doc.setFontSize(10);
          doc.setTextColor(128, 128, 128);
          doc.setFont(undefined, 'italic');
          doc.text('No hay préstamos registrados', 14, yPosition);
        }

        // Footer con fecha de generación en todas las páginas
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setTextColor(128, 128, 128);
          doc.text(
            `Generado el: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`,
            14,
            doc.internal.pageSize.height - 10
          );
          doc.text(
            `Página ${i} de ${pageCount}`,
            doc.internal.pageSize.width - 30,
            doc.internal.pageSize.height - 10
          );
        }

        // Guardar el PDF
        const filename = `Reporte_Detallado_${entidad.numeroIdentificacion}_${new Date().getTime()}.pdf`;
        doc.save(filename);

        this.snackBar.open('PDF detallado generado exitosamente', 'Cerrar', { duration: 3000 });
      }).catch(error => {
        console.error('Error al cargar jsPDF:', error);
        this.snackBar.open('Error al generar el PDF. Por favor, intente nuevamente.', 'Cerrar', { duration: 5000 });
      });
    } catch (error) {
      console.error('Error al generar PDF:', error);
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
        reject('jsPDF no está disponible');
      }
    });
  }

  /**
   * Convierte una fecha de forma segura manejando diferentes formatos
   */
  private convertirFecha(fecha: any): Date | null {
    if (!fecha) return null;

    if (fecha instanceof Date) return fecha;

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

  buscarEntidad(): void {
    if (!this.searchText.trim()) {
      this.snackBar.open('Por favor ingrese un criterio de búsqueda', 'Cerrar', { duration: 3000 });
      return;
    }

    this.isSearching = true;
    this.entidadEncontrada = null;
    this.vistaActual = 'dashboard';

    const criterioConsultaArray: DatosBusqueda[] = [];

    // Búsqueda por número de identificación, razón social o nombre comercial
    let criterio = new DatosBusqueda();
    criterio.asigna3(TipoDatosBusqueda.STRING, 'numeroIdentificacion',
      this.searchText.trim(), TipoComandosBusqueda.LIKE);
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.asigna3(TipoDatosBusqueda.STRING, 'razonSocial',
      this.searchText.trim(), TipoComandosBusqueda.LIKE);
    criterio.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.asigna3(TipoDatosBusqueda.STRING, 'nombreComercial',
      this.searchText.trim(), TipoComandosBusqueda.LIKE);
    criterio.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterioConsultaArray.push(criterio);

    this.entidadService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (entidades: any) => {
        this.isSearching = false;
        if (entidades && entidades.length > 0) {
          this.entidadEncontrada = entidades[0] as Entidad;
          this.cargarDashboard();
        } else {
          this.snackBar.open('No se encontró ninguna entidad', 'Cerrar', { duration: 3000 });
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error al buscar entidad:', error);
        this.snackBar.open('Error al buscar entidad', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarEntidadPorCodigo(codigo: number): void {
    if (!codigo) return;

    this.isSearching = true;
    this.entidadEncontrada = null;
    this.vistaActual = 'dashboard';

    this.entidadService.getById(codigo.toString()).subscribe({
      next: (entidad: any) => {
        this.isSearching = false;
        if (entidad) {
          this.entidadEncontrada = entidad as Entidad;
          this.searchText = entidad.numeroIdentificacion || entidad.razonSocial || '';
          this.cargarDashboard();
        } else {
          this.snackBar.open('No se encontró la entidad', 'Cerrar', { duration: 3000 });
        }
      },
      error: (error) => {
        this.isSearching = false;
        console.error('Error al cargar entidad:', error);
        this.snackBar.open('Error al cargar entidad', 'Cerrar', { duration: 3000 });
      }
    });
  }

  cargarDashboard(): void {
    if (!this.entidadEncontrada) return;

    this.isLoadingDashboard = true;

    // Contador para saber cuándo terminan todas las cargas
    let loadedCount = 0;
    const totalToLoad = 4; // contrato, partícipe, préstamos, aportes

    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalToLoad) {
        this.isLoadingDashboard = false;
      }
    };

    // Cargar contrato
    this.cargarContrato(checkAllLoaded);

    // Cargar partícipe
    this.cargarParticipe(checkAllLoaded);

    // Cargar préstamos
    this.cargarPrestamos(checkAllLoaded);

    // Cargar aportes
    this.cargarAportes(checkAllLoaded);
  }

  cargarContrato(onComplete?: () => void): void {
    if (!this.entidadEncontrada || !this.entidadEncontrada.codigo) {
      if (onComplete) onComplete();
      return;
    }

    const criterioConsultaArray: DatosBusqueda[] = [];

    let criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      this.entidadEncontrada.codigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterio);

    this.contratoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (contratos: any) => {
        if (contratos && contratos.length > 0) {
          const contrato = contratos[0] as Contrato;

          // Convertir fechas
          const fechaInicio = this.convertirFecha(contrato.fechaInicio);
          const fechaRegistro = this.convertirFecha(contrato.fechaRegistro);
          const fechaTerminacion = this.convertirFecha(contrato.fechaTerminacion);
          const fechaAprobacion = this.convertirFecha(contrato.fechaAprobacion);
          const fechaReporte = this.convertirFecha(contrato.fechaReporte);

          this.contratoEncontrado = {
            ...contrato,
            fechaInicio: fechaInicio || contrato.fechaInicio,
            fechaRegistro: fechaRegistro || contrato.fechaRegistro,
            fechaTerminacion: fechaTerminacion || contrato.fechaTerminacion,
            fechaAprobacion: fechaAprobacion || contrato.fechaAprobacion,
            fechaReporte: fechaReporte || contrato.fechaReporte
          };
        } else {
          this.contratoEncontrado = null;
        }
        if (onComplete) onComplete();
      },
      error: (error) => {
        console.error('Error al cargar contrato:', error);
        this.contratoEncontrado = null;
        if (onComplete) onComplete();
      }
    });
  }

  cargarParticipe(onComplete?: () => void): void {
    if (!this.entidadEncontrada || !this.entidadEncontrada.codigo) {
      if (onComplete) onComplete();
      return;
    }

    const criterioConsultaArray: DatosBusqueda[] = [];

    let criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      this.entidadEncontrada.codigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterio);

    this.participeService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (participes: any) => {
        if (participes && Array.isArray(participes) && participes.length > 0) {
          const participe = participes[0] as Participe;

          // Convertir fechas que puedan tener formato [UTC]
          const fechaIngresoTrabajo = this.convertirFecha(participe.fechaIngresoTrabajo);
          const fechaIngresoFondo = this.convertirFecha(participe.fechaIngresoFondo);
          const fechaFallecimiento = this.convertirFecha(participe.fechaFallecimiento);
          const fechaSalida = this.convertirFecha(participe.fechaSalida);
          const fechaIngreso = this.convertirFecha(participe.fechaIngreso);

          this.participeEncontrado = {
            ...participe,
            fechaIngresoTrabajo: fechaIngresoTrabajo || participe.fechaIngresoTrabajo,
            fechaIngresoFondo: fechaIngresoFondo || participe.fechaIngresoFondo,
            fechaFallecimiento: fechaFallecimiento || participe.fechaFallecimiento,
            fechaSalida: fechaSalida || participe.fechaSalida,
            fechaIngreso: fechaIngreso || participe.fechaIngreso
          };
        } else {
          this.participeEncontrado = null;
        }
        if (onComplete) onComplete();
      },
      error: (error) => {
        console.error('Error al cargar partícipe:', error);
        this.participeEncontrado = null;
        if (onComplete) onComplete();
      }
    });
  }

  cargarPrestamos(onComplete?: () => void): void {
    if (!this.entidadEncontrada || !this.entidadEncontrada.codigo) {
      if (onComplete) onComplete();
      return;
    }

    const criterioConsultaArray: DatosBusqueda[] = [];

    let criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      this.entidadEncontrada.codigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.orderBy('codigo');
    criterioConsultaArray.push(criterio);

    this.prestamoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (prestamos: any) => {
        if (!prestamos) {
          this.prestamos = [];
          return;
        }

        if (Array.isArray(prestamos)) {
          this.procesarPrestamosPorTipo(prestamos as Prestamo[]);
        } else {
          this.prestamos = [];
        }
        if (onComplete) onComplete();
      },
      error: (error) => {
        console.error('Error al cargar préstamos:', error);
        this.snackBar.open('Error al cargar préstamos', 'Cerrar', { duration: 3000 });
        if (onComplete) onComplete();
      }
    });
  }

  cargarAportes(onComplete?: () => void): void {
    if (!this.entidadEncontrada || !this.entidadEncontrada.codigo) {
      if (onComplete) onComplete();
      return;
    }

    const criterioConsultaArray: DatosBusqueda[] = [];

    let criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'entidad',
      'codigo',
      this.entidadEncontrada.codigo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.orderBy('fechaTransaccion');
    criterioConsultaArray.push(criterio);

    this.isLoadingAportes = true;

    this.aporteService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (aportes: any) => {
        if (!aportes) {
          this.aportes = [];
          this.totalAportes = 0;
          this.isLoadingAportes = false;
          return;
        }

        if (Array.isArray(aportes)) {
          // Convertir fechas
          this.aportes = (aportes as Aporte[]).map(aporte => ({
            ...aporte,
            fechaTransaccion: this.convertirFecha(aporte.fechaTransaccion) || aporte.fechaTransaccion,
            fechaRegistro: this.convertirFecha(aporte.fechaRegistro) || aporte.fechaRegistro
          }));

          // Ordenar por fecha descendente (más recientes primero)
          this.aportes.sort((a, b) => {
            const fechaA = new Date(a.fechaTransaccion).getTime();
            const fechaB = new Date(b.fechaTransaccion).getTime();
            return fechaB - fechaA;
          });

          // Agrupar por tipo de aporte
          this.agruparAportesPorTipo();

          this.totalAportes = this.aportes.reduce((sum, aporte) => sum + (aporte.valor || 0), 0);
        } else {
          this.aportes = [];
          this.aportesPorTipo = [];
          this.totalAportes = 0;
        }

        this.isLoadingAportes = false;
        if (onComplete) onComplete();
      },
      error: (error) => {
        console.error('Error al cargar aportes:', error);
        this.aportes = [];
        this.totalAportes = 0;
        this.isLoadingAportes = false;
        this.snackBar.open('Error al cargar aportes', 'Cerrar', { duration: 3000 });
        if (onComplete) onComplete();
      }
    });
  }

  agruparAportesPorTipo(): void {
    const tiposMap = new Map<number, AportesPorTipo>();

    this.aportes.forEach(aporte => {
      const codigoTipo = aporte.tipoAporte?.codigo || 0;
      const nombreTipo = aporte.tipoAporte?.nombre || 'Sin tipo';

      if (!tiposMap.has(codigoTipo)) {
        tiposMap.set(codigoTipo, {
          tipoAporte: nombreTipo,
          codigoTipo: codigoTipo,
          aportes: [],
          totalValor: 0,
          totalPagado: 0,
          totalSaldo: 0,
          expandido: false
        });
      }

      const grupo = tiposMap.get(codigoTipo)!;
      grupo.aportes.push(aporte);
      grupo.totalValor += aporte.valor || 0;
      grupo.totalPagado += aporte.valorPagado || 0;
      grupo.totalSaldo += aporte.saldo || 0;
    });

    this.aportesPorTipo = Array.from(tiposMap.values());
  }

  toggleTipoAporte(tipo: AportesPorTipo): void {
    tipo.expandido = !tipo.expandido;
  }

  procesarPrestamosPorTipo(prestamos: Prestamo[]): void {
    if (!prestamos || prestamos.length === 0) {
      this.prestamos = [];
      return;
    }

    // Asignar directamente los préstamos sin agrupar
    this.prestamos = prestamos;
  }

  verDetallePrestamo(prestamo: Prestamo): void {
    this.prestamoSeleccionado = prestamo;
    this.vistaActual = 'detallePrestamos';

    // Cargar detalles si no están cargados
    if (!this.detallesPrestamo.has(prestamo.codigo)) {
      this.cargarDetallesPrestamo(prestamo.codigo);
    }
  }

  verDetalleAportes(): void {
    this.vistaActual = 'detalleAportes';
  }

  volverDashboard(): void {
    this.vistaActual = 'dashboard';
    this.prestamoSeleccionado = null;
    this.prestamoExpandido = null;
  }

  togglePrestamo(prestamo: Prestamo): void {
    if (this.prestamoExpandido === prestamo.codigo) {
      this.prestamoExpandido = null;
    } else {
      this.prestamoExpandido = prestamo.codigo;
      this.cargarDetallesPrestamo(prestamo.codigo);
    }
  }

  cargarDetallesPrestamo(codigoPrestamo: number): void {
    if (this.detallesPrestamo.has(codigoPrestamo)) {
      return; // Ya está cargado
    }

    this.isLoadingDetalles = true;

    const criterioConsultaArray: DatosBusqueda[] = [];

    let criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'prestamo',
      'codigo',
      codigoPrestamo.toString(),
      TipoComandosBusqueda.IGUAL
    );
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.orderBy('numeroCuota');
    criterioConsultaArray.push(criterio);

    this.detallePrestamoService.selectByCriteria(criterioConsultaArray).subscribe({
      next: (detalles: any) => {
        if (!detalles || !Array.isArray(detalles)) {
          this.detallesPrestamo.set(codigoPrestamo, []);
          this.isLoadingDetalles = false;
          return;
        }

        const detallesConPagos: DetalleConPagos[] = (detalles as DetallePrestamo[]).map(det => {
          // Convertir fechas de string a Date de forma segura
          const fechaVencimiento = this.convertirFecha(det.fechaVencimiento);
          const fechaPagado = this.convertirFecha(det.fechaPagado);
          const fechaRegistro = this.convertirFecha(det.fechaRegistro);

          return {
            detalle: {
              ...det,
              fechaVencimiento: fechaVencimiento || det.fechaVencimiento,
              fechaPagado: fechaPagado || det.fechaPagado,
              fechaRegistro: fechaRegistro || det.fechaRegistro
            },
            pagos: [],
            mostrarPagos: false
          };
        });
        this.detallesPrestamo.set(codigoPrestamo, detallesConPagos);
        this.isLoadingDetalles = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles del préstamo:', error);
        this.snackBar.open('Error al cargar detalles del préstamo', 'Cerrar', { duration: 3000 });
        this.isLoadingDetalles = false;
      }
    });
  }

  /**
   * Carga los detalles de un préstamo y retorna una Promise
   */
  private cargarDetallesPrestamoAsync(codigoPrestamo: number): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.detallesPrestamo.has(codigoPrestamo)) {
        resolve(); // Ya está cargado
        return;
      }

      const criterioConsultaArray: DatosBusqueda[] = [];

      let criterio = new DatosBusqueda();
      criterio.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'prestamo',
        'codigo',
        codigoPrestamo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterioConsultaArray.push(criterio);

      criterio = new DatosBusqueda();
      criterio.orderBy('numeroCuota');
      criterioConsultaArray.push(criterio);

      this.detallePrestamoService.selectByCriteria(criterioConsultaArray).subscribe({
        next: (detalles: any) => {
          if (!detalles || !Array.isArray(detalles)) {
            this.detallesPrestamo.set(codigoPrestamo, []);
            resolve();
            return;
          }

          const detallesConPagos: DetalleConPagos[] = (detalles as DetallePrestamo[]).map(det => {
            // Convertir fechas de string a Date de forma segura
            const fechaVencimiento = this.convertirFecha(det.fechaVencimiento);
            const fechaPagado = this.convertirFecha(det.fechaPagado);
            const fechaRegistro = this.convertirFecha(det.fechaRegistro);

            return {
              detalle: {
                ...det,
                fechaVencimiento: fechaVencimiento || det.fechaVencimiento,
                fechaPagado: fechaPagado || det.fechaPagado,
                fechaRegistro: fechaRegistro || det.fechaRegistro
              },
              pagos: [],
              mostrarPagos: false
            };
          });
          this.detallesPrestamo.set(codigoPrestamo, detallesConPagos);
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar detalles del préstamo:', error);
          reject(error);
        }
      });
    });
  }

  togglePagosDetalle(detalleConPagos: DetalleConPagos): void {
    // Si ya tiene pagos cargados, mostrar directamente el diálogo
    if (detalleConPagos.pagos.length > 0) {
      this.abrirDialogPagos(detalleConPagos);
    } else {
      // Cargar pagos y luego mostrar el diálogo
      this.isLoadingPagos = true;
      this.cargarPagosDetalle(detalleConPagos).then(() => {
        this.abrirDialogPagos(detalleConPagos);
      });
    }
  }

  abrirDialogPagos(detalleConPagos: DetalleConPagos): void {
    this.dialog.open(PrestamoPagosDialogComponent, {
      width: '900px',
      maxHeight: '80vh',
      data: {
        detalle: detalleConPagos.detalle,
        pagos: detalleConPagos.pagos
      }
    });
  }

  cargarPagosDetalle(detalleConPagos: DetalleConPagos): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.isLoadingPagos = true;

      const criterioConsultaArray: DatosBusqueda[] = [];

      let criterio = new DatosBusqueda();
      criterio.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'detallePrestamo',
        'codigo',
        detalleConPagos.detalle.codigo.toString(),
        TipoComandosBusqueda.IGUAL
      );
      criterioConsultaArray.push(criterio);

      criterio = new DatosBusqueda();
      criterio.orderBy('fecha');
      criterioConsultaArray.push(criterio);

      this.pagoPrestamoService.selectByCriteria(criterioConsultaArray).subscribe({
        next: (pagos: any) => {
          if (!pagos || !Array.isArray(pagos)) {
            detalleConPagos.pagos = [];
            detalleConPagos.mostrarPagos = true;
            this.isLoadingPagos = false;
            resolve();
            return;
          }

          // Convertir fechas de string a Date en los pagos de forma segura
          const pagosConvertidos = (pagos as PagoPrestamo[]).map(pago => {
            const fecha = this.convertirFecha(pago.fecha);
            const fechaRegistro = this.convertirFecha(pago.fechaRegistro);

            return {
              ...pago,
              fecha: fecha || pago.fecha,
              fechaRegistro: fechaRegistro || pago.fechaRegistro
            };
          });

          detalleConPagos.pagos = pagosConvertidos;
          detalleConPagos.mostrarPagos = true;
          this.isLoadingPagos = false;
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar pagos:', error);
          this.snackBar.open('Error al cargar pagos', 'Cerrar', { duration: 3000 });
          this.isLoadingPagos = false;
          reject(error);
        }
      });
    });
  }

  calcularTotales(codigoPrestamo: number): { capital: number, interes: number, cuota: number } {
    const detalles = this.detallesPrestamo.get(codigoPrestamo);
    if (!detalles) return { capital: 0, interes: 0, cuota: 0 };

    return detalles.reduce((acc, dc) => ({
      capital: acc.capital + (dc.detalle.capital || 0),
      interes: acc.interes + (dc.detalle.interes || 0),
      cuota: acc.cuota + (dc.detalle.cuota || 0)
    }), { capital: 0, interes: 0, cuota: 0 });
  }

  calcularTotalPagado(prestamo: Prestamo): number {
    // Calcular el total pagado como la diferencia entre el monto total y el saldo
    const totalPrestamo = prestamo.totalPrestamo || 0;
    const saldoTotal = prestamo.saldoTotal || 0;
    return totalPrestamo - saldoTotal;
  }

  get totalIngresos(): number {
    if (!this.participeEncontrado) return 0;
    const remuneracion = this.participeEncontrado.remuneracionUnificada || 0;
    const ingresoAdicional = this.participeEncontrado.ingresoAdicionalMensual || 0;
    return remuneracion + ingresoAdicional;
  }

  limpiarBusqueda(): void {
    this.searchText = '';
    this.entidadEncontrada = null;
    this.contratoEncontrado = null;
    this.participeEncontrado = null;
    this.prestamos = [];
    this.totalAportes = 0;
    this.vistaActual = 'dashboard';
    this.detallesPrestamo.clear();
    this.prestamoExpandido = null;
  }
}
