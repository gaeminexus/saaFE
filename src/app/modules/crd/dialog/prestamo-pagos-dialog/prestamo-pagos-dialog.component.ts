import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { DetallePrestamo } from '../../model/detalle-prestamo';
import { PagoPrestamo } from '../../model/pago-prestamo';

export interface PrestamoPagosDialogData {
  detalle: DetallePrestamo;
  pagos: PagoPrestamo[];
}

@Component({
  selector: 'app-prestamo-pagos-dialog',
  standalone: true,
  imports: [MaterialFormModule],
  templateUrl: './prestamo-pagos-dialog.component.html',
  styleUrls: ['./prestamo-pagos-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class PrestamoPagosDialogComponent {
  displayedColumns: string[] = ['fecha', 'capitalPagado', 'interesPagado', 'moraPagada', 'valor'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: PrestamoPagosDialogData,
    private snackBar: MatSnackBar
  ) {}

  /**
   * Genera PDF con el detalle de la cuota y sus pagos
   */
  generarPDF(): void {
    if (!this.data || !this.data.detalle) {
      this.snackBar.open('No hay información de la cuota', 'Cerrar', { duration: 3000 });
      return;
    }

    try {
      this.snackBar.open('Generando PDF de pagos de cuota...', '', { duration: 2000 });

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
          doc.text('Detalle de Pagos de Cuota', 105, yPosition, { align: 'center' });

          yPosition += 15;

          // Información de la cuota
          doc.setFontSize(14);
          doc.setTextColor(102, 126, 234);
          doc.text(`Cuota #${this.data.detalle.numeroCuota}`, 14, yPosition);

          yPosition += 10;
          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'normal');

          const detalle = this.data.detalle;
          const fechaVenc = new Date(detalle.fechaVencimiento).toLocaleDateString('es-ES');

          doc.text(`Vencimiento: ${fechaVenc}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Capital: $${(detalle.capital || 0).toFixed(2)}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Interés: $${(detalle.interes || 0).toFixed(2)}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Cuota: $${(detalle.cuota || 0).toFixed(2)}`, 14, yPosition);
          yPosition += 6;
          doc.text(`Saldo: $${(detalle.saldo || 0).toFixed(2)}`, 14, yPosition);
          yPosition += 12;

          checkPageBreak(40);

          // Historial de pagos
          if (this.data.pagos && this.data.pagos.length > 0) {
            doc.setFontSize(12);
            doc.setTextColor(102, 126, 234);
            doc.setFont(undefined, 'bold');
            doc.text(`Historial de Pagos (${this.data.pagos.length})`, 14, yPosition);
            yPosition += 8;

            const pagosData = this.data.pagos.map((p) => {
              return [
                new Date(p.fecha).toLocaleDateString('es-ES'),
                `$${(p.capitalPagado || 0).toFixed(2)}`,
                `$${(p.interesPagado || 0).toFixed(2)}`,
                `$${(p.moraPagada || 0).toFixed(2)}`,
                `$${(p.valor || 0).toFixed(2)}`,
              ];
            });

            // Calcular totales
            const totalCapital = this.data.pagos.reduce(
              (sum, p) => sum + (p.capitalPagado || 0),
              0
            );
            const totalInteres = this.data.pagos.reduce(
              (sum, p) => sum + (p.interesPagado || 0),
              0
            );
            const totalMora = this.data.pagos.reduce((sum, p) => sum + (p.moraPagada || 0), 0);
            const totalValor = this.data.pagos.reduce((sum, p) => sum + (p.valor || 0), 0);

            if (doc.autoTable) {
              doc.autoTable({
                startY: yPosition,
                head: [['Fecha', 'Capital Pagado', 'Interés Pagado', 'Mora Pagada', 'Valor Total']],
                body: pagosData,
                theme: 'striped',
                styles: { fontSize: 9, cellPadding: 3 },
                headStyles: {
                  fillColor: [102, 126, 234],
                  textColor: 255,
                  fontSize: 9,
                  fontStyle: 'bold',
                },
                columnStyles: {
                  0: { cellWidth: 30, halign: 'center' },
                  1: { cellWidth: 35, halign: 'right' },
                  2: { cellWidth: 35, halign: 'right' },
                  3: { cellWidth: 35, halign: 'right' },
                  4: { cellWidth: 35, halign: 'right' },
                },
                footStyles: {
                  fillColor: [102, 126, 234],
                  textColor: 255,
                  fontStyle: 'bold',
                },
                foot: [
                  [
                    'TOTALES',
                    `$${totalCapital.toFixed(2)}`,
                    `$${totalInteres.toFixed(2)}`,
                    `$${totalMora.toFixed(2)}`,
                    `$${totalValor.toFixed(2)}`,
                  ],
                ],
              });
              yPosition = (doc as any).lastAutoTable.finalY + 10;
            }
          } else {
            doc.setFontSize(10);
            doc.setTextColor(128, 128, 128);
            doc.text('No se encontraron pagos registrados para esta cuota.', 14, yPosition);
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
          const filename = `Pagos_Cuota_${
            this.data.detalle.numeroCuota
          }_${new Date().getTime()}.pdf`;
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
}
