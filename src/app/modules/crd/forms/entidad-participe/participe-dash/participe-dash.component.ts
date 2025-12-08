import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';

import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { PdfParticipeDetalleDialogComponent } from '../../../dialog/pdf-participe-detalle-dialog/pdf-participe-detalle-dialog.component';
import { PrestamoPagosDialogComponent } from '../../../dialog/prestamo-pagos-dialog/prestamo-pagos-dialog.component';

import { Aporte } from '../../../model/aporte';
import { Contrato } from '../../../model/contrato';
import { DetallePrestamo } from '../../../model/detalle-prestamo';
import { Entidad } from '../../../model/entidad';
import { EstadoPrestamo } from '../../../model/estado-prestamo';
import { PagoPrestamo } from '../../../model/pago-prestamo';
import { Participe } from '../../../model/participe';
import { Prestamo } from '../../../model/prestamo';
import { TipoAporte } from '../../../model/tipo-aporte';

import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../../shared/services/export.service';
import {
  AuditoriaDialogComponent,
  CambiarEstadoDialogData,
} from '../../../dialog/auditoria-dialog/auditoria-dialog.component';
import { AporteService } from '../../../service/aporte.service';
import { AuditoriaService } from '../../../service/auditoria.service';
import { ContratoService } from '../../../service/contrato.service';
import { DetallePrestamoService } from '../../../service/detalle-prestamo.service';
import { EntidadService } from '../../../service/entidad.service';
import { EstadoPrestamoService } from '../../../service/estado-prestamo.service';
import { PagoPrestamoService } from '../../../service/pago-prestamo.service';
import { ParticipeService } from '../../../service/participe.service';
import { PrestamoService } from '../../../service/prestamo.service';
import { TipoAporteService } from '../../../service/tipo-aporte.service';

interface DetalleConPagos {
  detalle: DetallePrestamo;
  pagos: PagoPrestamo[];
  mostrarPagos: boolean;
}

interface AportesPorTipo {
  tipoAporte: string;
  codigoTipo: number;
  estadoTipo: number; // Estado del TipoAporte
  aportes: Aporte[];
  totalValor: number;
  totalPagado: number;
  totalSaldo: number;
  expandido: boolean;
}

@Component({
  selector: 'app-participe-dash',
  standalone: true,
  imports: [FormsModule, MaterialFormModule],
  templateUrl: './participe-dash.component.html',
  styleUrl: './participe-dash.component.scss',
})
export class ParticipeDashComponent implements OnInit {
  // Búsqueda
  searchText: string = '';
  isSearching: boolean = false;
  mostrarBusqueda: boolean = true; // Controla si se muestra el campo de búsqueda

  // Entidad encontrada
  entidadEncontrada: Entidad | null = null;
  contratoEncontrado: Contrato | null = null;
  participeEncontrado: Participe | null = null;

  // Dashboard
  prestamos: Prestamo[] = [];
  aportes: Aporte[] = [];
  aportesPorTipo: AportesPorTipo[] = [];
  totalAportes: number = 0;
  estadosPrestamo: EstadoPrestamo[] = [];

  // Vista de detalle
  vistaActual: 'dashboard' | 'detallePrestamos' | 'detalleAportes' = 'dashboard';
  prestamoSeleccionado: Prestamo | null = null;

  // Detalles de préstamos
  detallesPrestamo: Map<number, DetalleConPagos[]> = new Map();
  prestamoExpandido: number | null = null;

  // Columnas de las tablas
  displayedColumns: string[] = [
    'numeroCuota',
    'fechaVencimiento',
    'capital',
    'interes',
    'cuota',
    'saldo',
    'estado',
    'acciones',
  ];
  displayedColumnsAportes: string[] = [
    'fechaTransaccion',
    'tipoAporte',
    'glosa',
    'valor',
    'valorPagado',
    'saldo',
  ];

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
    private tipoAporteService: TipoAporteService,
    private contratoService: ContratoService,
    private participeService: ParticipeService,
    private estadoPrestamoService: EstadoPrestamoService,
    private auditoriaService: AuditoriaService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Cargar estados de préstamo
    this.cargarEstadosPrestamo();

    // Verificar si hay código de entidad en los query params
    this.route.queryParams.subscribe((params: any) => {
      const codigoEntidadParam = params['codigoEntidad'];
      const from = params['from'];

      if (codigoEntidadParam) {
        const codigo = Number(codigoEntidadParam);

        // Si viene desde entidad-consulta, ocultar el campo de búsqueda
        if (from === 'entidad-consulta') {
          this.mostrarBusqueda = false;
        }

        this.cargarEntidadPorCodigo(codigo);
      }
    });
  }

  /**
   * Regresa a la pantalla anterior (entidad-consulta)
   */
  regresarAPantallaAnterior(): void {
    this.router.navigate(['/menucreditos/entidad-consulta']);
  }

  /**
   * Genera un PDF con la información de la entidad
   */
  generarPDF(): void {
    if (!this.entidadEncontrada) {
      this.snackBar.open('No hay información de entidad para generar el PDF', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    // Abrir diálogo para seleccionar tipo de reporte
    const dialogRef = this.dialog.open(PdfParticipeDetalleDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      disableClose: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
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
      this.snackBar.open('No hay información de partícipe para editar', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    // Navegar a entidad-participe-info con los códigos de entidad y partícipe
    // Mantener el query param para poder regresar a la misma entidad
    this.router.navigate(['/menucreditos/entidad-participe-info'], {
      queryParams: {
        codigoEntidad: this.entidadEncontrada.codigo,
        codigoParticipe: this.participeEncontrado.codigo,
        returnUrl: `/menucreditos/participe-dash`,
      },
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
      this.cargarJsPDF()
        .then((jsPDF: any) => {
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
            const aportesData = this.aportesPorTipo.map((tipo) => [
              tipo.tipoAporte,
              `$${tipo.totalValor.toFixed(2)}`,
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
                  fontStyle: 'bold',
                },
                alternateRowStyles: { fillColor: [255, 250, 240] },
                margin: { left: 14, right: 14 },
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

            const prestamosData = this.prestamos.map((prestamo) => [
              prestamo.producto?.nombre || 'N/A',
              `#${prestamo.codigo}`,
              `$${prestamo.totalPrestamo.toFixed(2)}`,
              `$${prestamo.saldoTotal.toFixed(2)}`,
              `$${this.calcularTotalPagado(prestamo).toFixed(2)}`,
              prestamo.estadoPrestamo?.nombre || 'N/A',
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
                  fontStyle: 'bold',
                },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                margin: { left: 14, right: 14 },
                columnStyles: {
                  0: { cellWidth: 40 },
                  1: { cellWidth: 20 },
                  2: { cellWidth: 30 },
                  3: { cellWidth: 30 },
                  4: { cellWidth: 30 },
                  5: { cellWidth: 30 },
                },
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
              `Generado el: ${new Date().toLocaleDateString(
                'es-ES'
              )} ${new Date().toLocaleTimeString('es-ES')}`,
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
        })
        .catch((error) => {
          console.error('Error al cargar jsPDF:', error);
          this.snackBar.open('Error al generar el PDF. Por favor, intente nuevamente.', 'Cerrar', {
            duration: 5000,
          });
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
      const promesasCarga = this.prestamos.map((prestamo) =>
        this.cargarDetallesPrestamoAsync(prestamo.codigo)
      );

      await Promise.all(promesasCarga);

      // Ahora generar el PDF con los datos cargados
      this.cargarJsPDF()
        .then((jsPDF: any) => {
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
          doc.text('Reporte Financiero Detallado de Partícipe', 105, yPosition, {
            align: 'center',
          });

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
              doc.text(
                `Total: $${tipoAporte.totalValor.toFixed(2)} | Cantidad: ${
                  tipoAporte.aportes.length
                }`,
                20,
                yPosition
              );
              yPosition += 8;

              // Tabla de aportes del tipo
              const aportesData = tipoAporte.aportes.map((aporte) => {
                const fecha = this.convertirFecha(aporte.fechaTransaccion);
                return [
                  fecha ? fecha.toLocaleDateString('es-ES') : 'N/A',
                  aporte.glosa || 'N/A',
                  `$${(aporte.valor || 0).toFixed(2)}`,
                  `$${(aporte.valorPagado || 0).toFixed(2)}`,
                  `$${(aporte.saldo || 0).toFixed(2)}`,
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
                    fontStyle: 'bold',
                  },
                  margin: { left: 20, right: 14 },
                  columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 80 },
                    2: { cellWidth: 25 },
                    3: { cellWidth: 25 },
                    4: { cellWidth: 25 },
                  },
                });
                yPosition = (doc as any).lastAutoTable.finalY + 8;
              } else {
                // Fallback sin autoTable
                yPosition += 5;
                aportesData.forEach((row) => {
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
              doc.text(
                `Préstamo #${prestamo.codigo} - ${prestamo.producto?.nombre || 'N/A'}`,
                14,
                yPosition
              );

              yPosition += 6;
              doc.setFontSize(9);
              doc.setTextColor(0, 0, 0);
              doc.setFont(undefined, 'normal');

              const fechaPrestamo = this.convertirFecha(prestamo.fecha);
              const fechaStr = fechaPrestamo ? fechaPrestamo.toLocaleDateString('es-ES') : 'N/A';

              doc.text(
                `Fecha: ${fechaStr} | Estado: ${prestamo.estadoPrestamo?.nombre || 'N/A'}`,
                20,
                yPosition
              );
              yPosition += 5;
              doc.text(
                `Monto Total: $${prestamo.totalPrestamo.toFixed(
                  2
                )} | Saldo: $${prestamo.saldoTotal.toFixed(
                  2
                )} | Pagado: $${this.calcularTotalPagado(prestamo).toFixed(2)}`,
                20,
                yPosition
              );
              yPosition += 8;

              // Cargar detalles del préstamo si no están cargados
              const detalles = this.detallesPrestamo.get(prestamo.codigo);

              if (detalles && detalles.length > 0) {
                // Tabla de cuotas
                const cuotasData = detalles.map((dc) => {
                  const fechaVenc = this.convertirFecha(dc.detalle.fechaVencimiento);
                  return [
                    dc.detalle.numeroCuota?.toString() || 'N/A',
                    fechaVenc ? fechaVenc.toLocaleDateString('es-ES') : 'N/A',
                    `$${(dc.detalle.capital || 0).toFixed(2)}`,
                    `$${(dc.detalle.interes || 0).toFixed(2)}`,
                    `$${(dc.detalle.cuota || 0).toFixed(2)}`,
                    `$${(dc.detalle.saldo || 0).toFixed(2)}`,
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
                      fontStyle: 'bold',
                    },
                    margin: { left: 20, right: 14 },
                    columnStyles: {
                      0: { cellWidth: 15 },
                      1: { cellWidth: 25 },
                      2: { cellWidth: 28 },
                      3: { cellWidth: 28 },
                      4: { cellWidth: 28 },
                      5: { cellWidth: 28 },
                    },
                  });
                  yPosition = (doc as any).lastAutoTable.finalY + 10;
                } else {
                  // Fallback
                  yPosition += 5;
                  cuotasData.forEach((row) => {
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
              `Generado el: ${new Date().toLocaleDateString(
                'es-ES'
              )} ${new Date().toLocaleTimeString('es-ES')}`,
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
          const filename = `Reporte_Detallado_${
            entidad.numeroIdentificacion
          }_${new Date().getTime()}.pdf`;
          doc.save(filename);

          this.snackBar.open('PDF detallado generado exitosamente', 'Cerrar', { duration: 3000 });
        })
        .catch((error) => {
          console.error('Error al cargar jsPDF:', error);
          this.snackBar.open('Error al generar el PDF. Por favor, intente nuevamente.', 'Cerrar', {
            duration: 5000,
          });
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
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'numeroIdentificacion',
      this.searchText.trim(),
      TipoComandosBusqueda.LIKE
    );
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'razonSocial',
      this.searchText.trim(),
      TipoComandosBusqueda.LIKE
    );
    criterio.setTipoOperadorLogico(TipoComandosBusqueda.OR);
    criterioConsultaArray.push(criterio);

    criterio = new DatosBusqueda();
    criterio.asignaUnCampoSinTrunc(
      TipoDatosBusqueda.STRING,
      'nombreComercial',
      this.searchText.trim(),
      TipoComandosBusqueda.LIKE
    );
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
      },
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
      },
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
            fechaReporte: fechaReporte || contrato.fechaReporte,
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
      },
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
            fechaIngreso: fechaIngreso || participe.fechaIngreso,
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
      },
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
          // Normalizar estadoPrestamo: si viene como número, convertir a objeto
          const prestamosNormalizados = (prestamos as Prestamo[]).map((p) => {
            if (typeof p.estadoPrestamo === 'number') {
              const codigoEstado = p.estadoPrestamo as any;
              p.estadoPrestamo = {
                codigo: codigoEstado,
                nombre: this.obtenerNombreEstadoPrestamo(codigoEstado),
              } as EstadoPrestamo;
            }
            return p;
          });

          this.procesarPrestamosPorTipo(prestamosNormalizados);
        } else {
          this.prestamos = [];
        }
        if (onComplete) onComplete();
      },
      error: (error) => {
        console.error('Error al cargar préstamos:', error);
        this.snackBar.open('Error al cargar préstamos', 'Cerrar', { duration: 3000 });
        if (onComplete) onComplete();
      },
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
          this.aportes = (aportes as Aporte[]).map((aporte) => ({
            ...aporte,
            fechaTransaccion:
              this.convertirFecha(aporte.fechaTransaccion) || aporte.fechaTransaccion,
            fechaRegistro: this.convertirFecha(aporte.fechaRegistro) || aporte.fechaRegistro,
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
      },
    });
  }

  agruparAportesPorTipo(): void {
    const tiposMap = new Map<number, AportesPorTipo>();

    this.aportes.forEach((aporte) => {
      const codigoTipo = aporte.tipoAporte?.codigo || 0;
      const nombreTipo = aporte.tipoAporte?.nombre || 'Sin tipo';
      const estadoTipo = aporte.tipoAporte?.estado || 0;

      if (!tiposMap.has(codigoTipo)) {
        tiposMap.set(codigoTipo, {
          tipoAporte: nombreTipo,
          codigoTipo: codigoTipo,
          estadoTipo: estadoTipo,
          aportes: [],
          totalValor: 0,
          totalPagado: 0,
          totalSaldo: 0,
          expandido: false,
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

  /**
   * Carga los estados de préstamo disponibles desde el backend
   */
  cargarEstadosPrestamo(): void {
    this.estadoPrestamoService.getAll().subscribe({
      next: (estados) => {
        if (estados && Array.isArray(estados)) {
          this.estadosPrestamo = estados;
        }
      },
      error: (error) => {
        console.error('Error al cargar estados de préstamo:', error);
      },
    });
  }

  /**
   * Abre el diálogo para cambiar el estado de un préstamo
   * @param prestamo Préstamo a modificar
   * @param event Evento del click para evitar propagación
   */
  cambiarEstadoPrestamo(prestamo: Prestamo, event: Event): void {
    // Evitar que el click propague al card
    event.stopPropagation();

    if (!prestamo || !prestamo.codigo) {
      this.snackBar.open('No se puede cambiar el estado de este préstamo', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    // Verificar que se hayan cargado los estados
    if (!this.estadosPrestamo || this.estadosPrestamo.length === 0) {
      this.snackBar.open('No se han cargado los estados disponibles', 'Cerrar', {
        duration: 3000,
      });
      return;
    }

    const dialogData: CambiarEstadoDialogData = {
      entidad: prestamo,
      estadosDisponibles: this.estadosPrestamo,
      titulo: 'Cambiar Estado de Préstamo',
      entidadTipo: 'Préstamo',
      campoNombre: 'producto.nombre',
      campoIdentificacion: 'codigo',
      campoEstadoActual: 'estadoPrestamo.codigo',
    };

    const dialogRef = this.dialog.open(AuditoriaDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      autoFocus: 'first-tabbable',
      restoreFocus: true,
      disableClose: false,
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result && result.nuevoEstado !== undefined && result.motivo) {
        this.ejecutarCambioEstadoPrestamo(prestamo, result.nuevoEstado, result.motivo);
      }
    });
  }

  /**
   * Ejecuta el cambio de estado del préstamo
   * @param prestamo Préstamo a actualizar
   * @param nuevoEstadoCodigo Código del nuevo estado
   * @param motivo Motivo del cambio
   */
  private ejecutarCambioEstadoPrestamo(
    prestamo: Prestamo,
    nuevoEstadoCodigo: number,
    motivo: string
  ): void {
    // Recuperar el préstamo completo desde el backend
    this.prestamoService.getById(prestamo.codigo!.toString()).subscribe({
      next: (prestamoCompleto) => {
        if (!prestamoCompleto) {
          this.snackBar.open('No se pudo recuperar el préstamo', 'Cerrar', { duration: 5000 });
          return;
        }

        // Guardar estado anterior para auditoría
        const estadoAnteriorCodigo = prestamoCompleto.estadoPrestamo?.codigo || 0;
        const estadoAnterior = {
          codigo: estadoAnteriorCodigo,
          nombre: this.obtenerNombreEstadoPrestamo(estadoAnteriorCodigo),
        };

        // Preparar el objeto para enviar al backend
        // El backend espera estadoPrestamo como un número (código del estado)
        const prestamoParaBackend: any = {
          ...prestamoCompleto,
          estadoPrestamo: nuevoEstadoCodigo, // ← Solo el número, no un objeto
        };

        console.log('🔍 Préstamo completo recuperado:', prestamoCompleto);
        console.log('🔍 Estado ANTES (objeto):', prestamoCompleto.estadoPrestamo);
        console.log('🔍 Préstamo preparado para backend:', prestamoParaBackend);
        console.log(
          '🔍 Estado ENVIADO (número):',
          prestamoParaBackend.estadoPrestamo,
          typeof prestamoParaBackend.estadoPrestamo
        );
        console.log(
          '📤 JSON que se envía al backend:',
          JSON.stringify(prestamoParaBackend, null, 2)
        );

        // Enviar todo el registro actualizado
        this.prestamoService.update(prestamoParaBackend).subscribe({
          next: (respuesta) => {
            console.log('✅ Respuesta del backend (update préstamo):', respuesta);
            console.log('✅ Estado en respuesta:', respuesta?.estadoPrestamo);
            console.log('✅ Tipo de estadoPrestamo:', typeof respuesta?.estadoPrestamo);

            // Actualizar en la lista local con el objeto completo del estado
            const index = this.prestamos.findIndex((p) => p.codigo === prestamo.codigo);
            if (index !== -1) {
              console.log('🔄 Actualizando préstamo en índice:', index);
              console.log('🔄 Estado anterior en lista:', this.prestamos[index].estadoPrestamo);

              this.prestamos[index].estadoPrestamo = {
                codigo: nuevoEstadoCodigo,
                nombre: this.obtenerNombreEstadoPrestamo(nuevoEstadoCodigo),
              } as EstadoPrestamo;
              this.prestamos = [...this.prestamos]; // Trigger change detection

              console.log('🔄 Estado nuevo en lista:', this.prestamos[index].estadoPrestamo);
            } else {
              console.warn('⚠️ No se encontró el préstamo en la lista local');
            }

            // Registrar en auditoría
            this.registrarCambioEstadoPrestamoEnAuditoria(
              prestamo,
              estadoAnterior,
              nuevoEstadoCodigo,
              motivo
            );

            const estadoTexto = this.obtenerNombreEstadoPrestamo(nuevoEstadoCodigo);
            this.snackBar.open(`Estado del préstamo cambiado a ${estadoTexto}`, 'Cerrar', {
              duration: 3000,
            });
          },
          error: (error) => {
            console.error('❌ Error completo al actualizar préstamo:', error);
            console.error('❌ Status:', error?.status);
            console.error('❌ Message:', error?.message);
            console.error('❌ Error body:', error?.error);

            const mensaje = error?.mensaje || 'Error al cambiar el estado del préstamo';
            this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
          },
        });
      },
      error: (error) => {
        console.error('Error al recuperar préstamo:', error);
        this.snackBar.open('Error al recuperar el préstamo', 'Cerrar', { duration: 5000 });
      },
    });
  }

  /**
   * Obtiene el nombre del estado de préstamo por su código
   */
  private obtenerNombreEstadoPrestamo(codigo: number): string {
    const estado = this.estadosPrestamo.find((e) => e.codigo === codigo);
    return estado?.nombre || 'Desconocido';
  }

  /**
   * Obtiene el nombre y estilo del estado de una cuota
   * Basado en el catálogo de estados de préstamo
   */
  obtenerEstadoCuota(detalle: DetallePrestamo): { texto: string; clase: string } {
    const estadoId = detalle.idEstado || detalle.estado || 0;

    // Buscar el estado en el catálogo
    const estadoEncontrado = this.estadosPrestamo.find((e) => e.codigo === estadoId);

    if (estadoEncontrado) {
      // Usar el nombre real del catálogo
      const nombreEstado = estadoEncontrado.nombre.toUpperCase();

      // Determinar la clase CSS según el nombre o código
      let clase = 'estado-desconocido';

      // Mapeo de estados comunes a clases CSS
      if (nombreEstado.includes('PAGADO') || nombreEstado.includes('CANCELAD')) {
        clase = 'estado-pagado';
      } else if (nombreEstado.includes('VENCIDO') || nombreEstado.includes('MORA')) {
        clase = 'estado-vencido';
      } else if (
        nombreEstado.includes('PENDIENTE') ||
        nombreEstado.includes('VIGENTE') ||
        nombreEstado.includes('ACTIVO')
      ) {
        clase = 'estado-pendiente';
      } else if (nombreEstado.includes('REVISADO') || nombreEstado.includes('APROBADO')) {
        clase = 'estado-aprobado';
      } else if (nombreEstado.includes('LEGALIZADO') || nombreEstado.includes('DESEMBOLSADO')) {
        clase = 'estado-legalizado';
      }

      return { texto: nombreEstado, clase };
    }

    // Fallback si no se encuentra en el catálogo
    return { texto: 'SIN ESTADO', clase: 'estado-desconocido' };
  }

  /**
   * Abre el diálogo para cambiar el estado de una cuota
   */
  cambiarEstadoCuota(cuota: DetallePrestamo, event?: Event): void {
    if (event) {
      event.stopPropagation(); // Evitar que se expandan/colapsen los pagos
    }

    const dialogRef = this.dialog.open(AuditoriaDialogComponent, {
      width: '500px',
      data: {
        entidad: cuota,
        estadosDisponibles: this.estadosPrestamo, // Reutilizamos los mismos estados del préstamo
        titulo: 'Cambiar Estado de Cuota',
        entidadTipo: 'Cuota',
        campoNombre: 'numeroCuota',
        campoIdentificacion: 'codigo',
        campoEstadoActual: 'idEstado', // Campo que contiene el estado actual
      } as CambiarEstadoDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ejecutarCambioEstadoCuota(cuota, result.nuevoEstado, result.motivo);
      }
    });
  }

  /**
   * Ejecuta el cambio de estado de la cuota
   */
  private ejecutarCambioEstadoCuota(
    cuota: DetallePrestamo,
    nuevoEstadoCodigo: number,
    motivo: string
  ): void {
    // Recuperar la cuota completa desde el backend
    this.detallePrestamoService.getById(cuota.codigo!.toString()).subscribe({
      next: (cuotaCompleta) => {
        if (!cuotaCompleta) {
          this.snackBar.open('No se pudo recuperar la cuota', 'Cerrar', { duration: 5000 });
          return;
        }

        // Guardar estado anterior para auditoría
        const estadoAnteriorCodigo = cuotaCompleta.idEstado || 0;
        const estadoAnterior = {
          codigo: estadoAnteriorCodigo,
          nombre: this.obtenerNombreEstadoPrestamo(estadoAnteriorCodigo),
        };

        // Preparar el objeto para el backend (igual que préstamo, solo FK como número)
        const cuotaParaBackend: any = {
          ...cuotaCompleta,
          idEstado: nuevoEstadoCodigo, // Solo el número
        };

        // Enviar actualización
        this.detallePrestamoService.update(cuotaParaBackend).subscribe({
          next: (respuesta) => {
            // Actualizar en el Map local de detalles
            if (this.prestamoSeleccionado?.codigo) {
              const detalles = this.detallesPrestamo.get(this.prestamoSeleccionado.codigo);
              if (detalles) {
                const index = detalles.findIndex((d) => d.detalle.codigo === cuota.codigo);
                if (index !== -1) {
                  console.log('🔄 Estado anterior cuota:', detalles[index].detalle.idEstado);

                  // Actualizar ambos campos de estado
                  detalles[index].detalle.idEstado = nuevoEstadoCodigo;
                  detalles[index].detalle.estado = nuevoEstadoCodigo;

                  console.log('🔄 Estado nuevo cuota:', detalles[index].detalle.idEstado);

                  // Crear nueva referencia del array para forzar detección de cambios
                  const nuevosDetalles = [...detalles];
                  this.detallesPrestamo.set(this.prestamoSeleccionado.codigo, nuevosDetalles);

                  // Forzar detección de cambios en Angular
                  this.cdr.detectChanges();

                  console.log('✅ Vista actualizada con nuevos detalles');
                }
              }
            }

            // Registrar en auditoría
            this.registrarCambioEstadoCuotaEnAuditoria(
              cuota,
              estadoAnterior,
              nuevoEstadoCodigo,
              motivo
            );

            const estadoTexto = this.obtenerNombreEstadoPrestamo(nuevoEstadoCodigo);
            this.snackBar.open(`Estado de la cuota cambiado a ${estadoTexto}`, 'Cerrar', {
              duration: 3000,
            });
          },
          error: (error) => {
            console.error('Error al actualizar cuota:', error);
            const mensaje = error?.mensaje || 'Error al cambiar el estado de la cuota';
            this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
          },
        });
      },
      error: (error) => {
        console.error('Error al recuperar cuota:', error);
        this.snackBar.open('Error al recuperar la cuota', 'Cerrar', { duration: 5000 });
      },
    });
  }

  /**
   * Registra el cambio de estado de la cuota en auditoría
   */
  private registrarCambioEstadoCuotaEnAuditoria(
    cuota: DetallePrestamo,
    estadoAnterior: { codigo: number; nombre: string },
    nuevoEstadoCodigo: number,
    motivo: string
  ): void {
    const estadoNuevo = {
      codigo: nuevoEstadoCodigo,
      nombre: this.obtenerNombreEstadoPrestamo(nuevoEstadoCodigo),
    };

    const registroAuditoria = this.auditoriaService.construirRegistroCambioEstado({
      accion: 'UPDATE',
      nombreComponente: 'ParticipeDash',
      entidadLogica: 'DETALLE_PRESTAMO',
      idEntidad: cuota.codigo!,
      estadoAnterior: estadoAnterior,
      estadoNuevo: estadoNuevo,
      motivo: motivo,
    });

    this.auditoriaService.add(registroAuditoria).subscribe({
      next: () => {
        // Auditoría registrada exitosamente
      },
      error: (err) => {
        console.error('Error al registrar auditoría de cuota (no crítico):', err);
      },
    });
  }

  /**
   * Obtiene el nombre y estilo del estado de un aporte
   */
  obtenerEstadoAporte(aporte: Aporte): { texto: string; clase: string } {
    const estadoId = aporte.estado || 0;

    const estadoEncontrado = this.estadosPrestamo.find((e) => e.codigo === estadoId);

    if (estadoEncontrado) {
      const nombreEstado = estadoEncontrado.nombre.toUpperCase();

      let clase = 'estado-desconocido';

      if (nombreEstado.includes('PAGADO') || nombreEstado.includes('CANCELAD')) {
        clase = 'estado-pagado';
      } else if (nombreEstado.includes('VENCIDO') || nombreEstado.includes('MORA')) {
        clase = 'estado-vencido';
      } else if (
        nombreEstado.includes('PENDIENTE') ||
        nombreEstado.includes('VIGENTE') ||
        nombreEstado.includes('ACTIVO')
      ) {
        clase = 'estado-pendiente';
      } else if (nombreEstado.includes('REVISADO') || nombreEstado.includes('APROBADO')) {
        clase = 'estado-aprobado';
      } else if (nombreEstado.includes('LEGALIZADO') || nombreEstado.includes('DESEMBOLSADO')) {
        clase = 'estado-legalizado';
      }

      return { texto: nombreEstado, clase };
    }

    return { texto: 'SIN ESTADO', clase: 'estado-desconocido' };
  }

  /**
   * Abre el diálogo para cambiar el estado de un aporte
   */
  cambiarEstadoAporte(aporte: Aporte, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    const dialogRef = this.dialog.open(AuditoriaDialogComponent, {
      width: '500px',
      data: {
        entidad: aporte,
        estadosDisponibles: this.estadosPrestamo,
        titulo: 'Cambiar Estado de Aporte',
        entidadTipo: 'Aporte',
        campoNombre: 'glosa',
        campoIdentificacion: 'codigo',
        campoEstadoActual: 'estado',
      } as CambiarEstadoDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ejecutarCambioEstadoAporte(aporte, result.nuevoEstado, result.motivo);
      }
    });
  }

  /**
   * Ejecuta el cambio de estado del aporte
   */
  private ejecutarCambioEstadoAporte(
    aporte: Aporte,
    nuevoEstadoCodigo: number,
    motivo: string
  ): void {
    this.aporteService.getById(aporte.codigo!.toString()).subscribe({
      next: (aporteCompleto) => {
        if (!aporteCompleto) {
          this.snackBar.open('No se pudo recuperar el aporte', 'Cerrar', { duration: 5000 });
          return;
        }

        const estadoAnteriorCodigo = aporteCompleto.estado || 0;
        const estadoAnterior = {
          codigo: estadoAnteriorCodigo,
          nombre: this.obtenerNombreEstadoPrestamo(estadoAnteriorCodigo),
        };

        const aporteParaBackend: any = {
          ...aporteCompleto,
          estado: nuevoEstadoCodigo,
        };

        this.aporteService.update(aporteParaBackend).subscribe({
          next: (respuesta) => {
            const index = this.aportes.findIndex((a) => a.codigo === aporte.codigo);
            if (index !== -1) {
              this.aportes[index].estado = nuevoEstadoCodigo;
              this.agruparAportesPorTipo();
              this.cdr.detectChanges();
            }

            this.registrarCambioEstadoAporteEnAuditoria(
              aporte,
              estadoAnterior,
              nuevoEstadoCodigo,
              motivo
            );

            const estadoTexto = this.obtenerNombreEstadoPrestamo(nuevoEstadoCodigo);
            this.snackBar.open(`Estado del aporte cambiado a ${estadoTexto}`, 'Cerrar', {
              duration: 3000,
            });
          },
          error: (error) => {
            console.error('Error al actualizar aporte:', error);
            const mensaje = error?.mensaje || 'Error al cambiar el estado del aporte';
            this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
          },
        });
      },
      error: (error) => {
        console.error('Error al recuperar aporte:', error);
        this.snackBar.open('Error al recuperar el aporte', 'Cerrar', { duration: 5000 });
      },
    });
  }

  /**
   * Obtiene el estado del tipo de aporte (no de los aportes individuales)
   */
  obtenerEstadoPreferenteTipo(tipoAporte: AportesPorTipo): {
    texto: string;
    clase: string;
    icono: string;
  } | null {
    const estadoId = tipoAporte.estadoTipo || 0;

    // Obtener info del estado
    const estadoInfo = this.obtenerEstadoAporte({ estado: estadoId } as Aporte);

    let icono = 'check_circle';
    if (estadoInfo.clase.includes('vencido')) {
      icono = 'error';
    } else if (estadoInfo.clase.includes('pendiente')) {
      icono = 'schedule';
    } else if (estadoInfo.clase.includes('aprobado') || estadoInfo.clase.includes('revisado')) {
      icono = 'verified';
    } else if (estadoInfo.clase.includes('legalizado')) {
      icono = 'gavel';
    }

    return {
      texto: estadoInfo.texto,
      clase: estadoInfo.clase,
      icono: icono,
    };
  }

  /**
   * Abre el diálogo para cambiar el estado del tipo de aporte
   */
  cambiarEstadoTipoAporte(tipoAporte: AportesPorTipo, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    // Obtener el estado actual
    const estadoActual = this.obtenerEstadoPreferenteTipo(tipoAporte);

    const dialogRef = this.dialog.open(AuditoriaDialogComponent, {
      width: '500px',
      data: {
        entidad: {
          codigo: tipoAporte.codigoTipo,
          nombre: tipoAporte.tipoAporte,
          estadoActual: estadoActual?.texto || 'N/A',
        },
        estadosDisponibles: this.estadosPrestamo,
        titulo: 'Cambiar Estado del Tipo de Aporte',
        entidadTipo: 'Tipo de Aporte',
        campoNombre: 'nombre',
        campoIdentificacion: 'codigo',
        campoEstadoActual: 'estadoActual',
      } as CambiarEstadoDialogData,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.ejecutarCambioEstadoTipoAporte(tipoAporte, result.nuevoEstado, result.motivo);
      }
    });
  }

  /**
   * Ejecuta el cambio de estado del tipo de aporte
   */
  private ejecutarCambioEstadoTipoAporte(
    tipoAporte: AportesPorTipo,
    nuevoEstadoCodigo: number,
    motivo: string
  ): void {
    this.tipoAporteService.getById(tipoAporte.codigoTipo.toString()).subscribe({
      next: (tipoAporteCompleto) => {
        if (!tipoAporteCompleto) {
          this.snackBar.open('Error: No se encontró el tipo de aporte', 'Cerrar', {
            duration: 5000,
          });
          return;
        }

        const estadoAnteriorCodigo = tipoAporteCompleto.estado || 0;
        const estadoAnterior = {
          codigo: estadoAnteriorCodigo,
          nombre: this.obtenerNombreEstadoPrestamo(estadoAnteriorCodigo),
        };

        // Actualizar el tipo de aporte
        const tipoAporteParaBackend: any = {
          ...tipoAporteCompleto,
          estado: nuevoEstadoCodigo,
        };

        this.tipoAporteService.update(tipoAporteParaBackend).subscribe({
          next: () => {
            // Registrar auditoría
            this.registrarCambioEstadoTipoAporteEnAuditoria(
              tipoAporteCompleto,
              estadoAnterior,
              nuevoEstadoCodigo,
              motivo
            );

            // Recargar aportes para actualizar la visualización
            this.cargarAportes();

            this.snackBar.open('✅ Estado del tipo de aporte actualizado exitosamente', 'Cerrar', {
              duration: 5000,
            });
          },
          error: (error) => {
            console.error('Error al actualizar tipo de aporte:', error);
            const mensaje = error?.mensaje || 'Error al cambiar el estado del tipo de aporte';
            this.snackBar.open(mensaje, 'Cerrar', { duration: 5000 });
          },
        });
      },
      error: (error) => {
        console.error('Error al recuperar tipo de aporte:', error);
        this.snackBar.open('Error al recuperar el tipo de aporte', 'Cerrar', { duration: 5000 });
      },
    });
  }

  /**
   * Registra el cambio de estado del tipo de aporte en auditoría
   */
  private registrarCambioEstadoTipoAporteEnAuditoria(
    tipoAporte: TipoAporte,
    estadoAnterior: { codigo: number; nombre: string },
    nuevoEstadoCodigo: number,
    motivo: string
  ): void {
    const estadoNuevo = {
      codigo: nuevoEstadoCodigo,
      nombre: this.obtenerNombreEstadoPrestamo(nuevoEstadoCodigo),
    };

    const registroAuditoria = this.auditoriaService.construirRegistroCambioEstado({
      accion: 'UPDATE',
      nombreComponente: 'ParticipeDash',
      entidadLogica: 'TIPO_APORTE',
      idEntidad: tipoAporte.codigo!,
      estadoAnterior: estadoAnterior,
      estadoNuevo: estadoNuevo,
      motivo: motivo,
    });

    this.auditoriaService.add(registroAuditoria).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Error al registrar auditoría de tipo aporte (no crítico):', err);
      },
    });
  }

  /**
   * Registra el cambio de estado del aporte en auditoría
   */
  private registrarCambioEstadoAporteEnAuditoria(
    aporte: Aporte,
    estadoAnterior: { codigo: number; nombre: string },
    nuevoEstadoCodigo: number,
    motivo: string
  ): void {
    const estadoNuevo = {
      codigo: nuevoEstadoCodigo,
      nombre: this.obtenerNombreEstadoPrestamo(nuevoEstadoCodigo),
    };

    const registroAuditoria = this.auditoriaService.construirRegistroCambioEstado({
      accion: 'UPDATE',
      nombreComponente: 'ParticipeDash',
      entidadLogica: 'APORTE',
      idEntidad: aporte.codigo!,
      estadoAnterior: estadoAnterior,
      estadoNuevo: estadoNuevo,
      motivo: motivo,
    });

    this.auditoriaService.add(registroAuditoria).subscribe({
      next: () => {},
      error: (err) => {
        console.error('Error al registrar auditoría de aporte (no crítico):', err);
      },
    });
  }

  /**
   * Registra el cambio de estado del préstamo en el sistema de auditoría
   * @param prestamo Préstamo modificado
   * @param estadoAnterior Estado anterior (código + nombre)
   * @param nuevoEstadoCodigo Código del nuevo estado
   * @param motivo Motivo del cambio proporcionado por el usuario
   */
  private registrarCambioEstadoPrestamoEnAuditoria(
    prestamo: Prestamo,
    estadoAnterior: { codigo: number; nombre: string },
    nuevoEstadoCodigo: number,
    motivo: string
  ): void {
    const estadoNuevo = {
      codigo: nuevoEstadoCodigo,
      nombre: this.obtenerNombreEstadoPrestamo(nuevoEstadoCodigo),
    };

    // Construir el registro de auditoría
    const registroAuditoria = this.auditoriaService.construirRegistroCambioEstado({
      accion: 'UPDATE',
      nombreComponente: 'ParticipeDash',
      entidadLogica: 'PRESTAMO',
      idEntidad: prestamo.codigo!,
      estadoAnterior: estadoAnterior,
      estadoNuevo: estadoNuevo,
      motivo: motivo,
    });

    // Enviar registro de auditoría (no bloqueante)
    this.auditoriaService.add(registroAuditoria).subscribe({
      next: () => {
        // Auditoría registrada exitosamente
      },
      error: (err) => {
        console.error('❌ Error al registrar auditoría (no crítico):', err);
      },
    });
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

        const detallesConPagos: DetalleConPagos[] = (detalles as DetallePrestamo[]).map((det) => {
          // Convertir fechas de string a Date de forma segura
          const fechaVencimiento = this.convertirFecha(det.fechaVencimiento);
          const fechaPagado = this.convertirFecha(det.fechaPagado);
          const fechaRegistro = this.convertirFecha(det.fechaRegistro);

          return {
            detalle: {
              ...det,
              fechaVencimiento: fechaVencimiento || det.fechaVencimiento,
              fechaPagado: fechaPagado || det.fechaPagado,
              fechaRegistro: fechaRegistro || det.fechaRegistro,
            },
            pagos: [],
            mostrarPagos: false,
          };
        });
        this.detallesPrestamo.set(codigoPrestamo, detallesConPagos);
        this.isLoadingDetalles = false;
      },
      error: (error) => {
        console.error('Error al cargar detalles del préstamo:', error);
        this.snackBar.open('Error al cargar detalles del préstamo', 'Cerrar', { duration: 3000 });
        this.isLoadingDetalles = false;
      },
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

          const detallesConPagos: DetalleConPagos[] = (detalles as DetallePrestamo[]).map((det) => {
            // Convertir fechas de string a Date de forma segura
            const fechaVencimiento = this.convertirFecha(det.fechaVencimiento);
            const fechaPagado = this.convertirFecha(det.fechaPagado);
            const fechaRegistro = this.convertirFecha(det.fechaRegistro);

            return {
              detalle: {
                ...det,
                fechaVencimiento: fechaVencimiento || det.fechaVencimiento,
                fechaPagado: fechaPagado || det.fechaPagado,
                fechaRegistro: fechaRegistro || det.fechaRegistro,
              },
              pagos: [],
              mostrarPagos: false,
            };
          });
          this.detallesPrestamo.set(codigoPrestamo, detallesConPagos);
          resolve();
        },
        error: (error) => {
          console.error('Error al cargar detalles del préstamo:', error);
          reject(error);
        },
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
        pagos: detalleConPagos.pagos,
      },
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
          const pagosConvertidos = (pagos as PagoPrestamo[]).map((pago) => {
            const fecha = this.convertirFecha(pago.fecha);
            const fechaRegistro = this.convertirFecha(pago.fechaRegistro);

            return {
              ...pago,
              fecha: fecha || pago.fecha,
              fechaRegistro: fechaRegistro || pago.fechaRegistro,
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
        },
      });
    });
  }

  calcularTotales(codigoPrestamo: number): { capital: number; interes: number; cuota: number } {
    const detalles = this.detallesPrestamo.get(codigoPrestamo);
    if (!detalles) return { capital: 0, interes: 0, cuota: 0 };

    return detalles.reduce(
      (acc, dc) => ({
        capital: acc.capital + (dc.detalle.capital || 0),
        interes: acc.interes + (dc.detalle.interes || 0),
        cuota: acc.cuota + (dc.detalle.cuota || 0),
      }),
      { capital: 0, interes: 0, cuota: 0 }
    );
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
