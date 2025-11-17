import { Injectable } from '@angular/core';

// Declaraciones para jsPDF
declare let window: any;

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  constructor() { }

  /**
   * Exporta datos a formato CSV
   */
  exportToCSV(data: any[], filename: string, headers: string[]): void {
    const csvContent = this.convertToCSV(data, headers);
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');

    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${filename}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Exporta datos a formato PDF
   */
  exportToPDF(data: any[], filename: string, title: string, headers: string[], dataKeys: string[]): void {
    // Intentar cargar jsPDF dinámicamente si no está disponible
    this.ensureJsPDFLoaded().then((jsPDF: any) => {
      try {
        const doc = new jsPDF();

        // Título del documento
        doc.setFontSize(16);
        doc.text(title, 14, 15);

        // Fecha de generación
        const currentDate = new Date().toLocaleDateString('es-ES');
        doc.setFontSize(10);
        doc.text(`Generado el: ${currentDate}`, 14, 25);

        // Configurar la tabla
        const tableData = data.map(item =>
          dataKeys.map(key => {
            const value = this.getNestedValue(item, key);
            return value !== null && value !== undefined ? value.toString() : '';
          })
        );

        // Usar autoTable si está disponible
        if (doc.autoTable) {
          doc.autoTable({
            head: [headers],
            body: tableData,
            startY: 35,
            theme: 'grid',
            styles: {
              fontSize: 8,
              cellPadding: 2
            },
            headStyles: {
              fillColor: [102, 126, 234],
              textColor: 255,
              fontSize: 9,
              fontStyle: 'bold'
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            }
          });
        } else {
          // Fallback básico sin autoTable
          let yPosition = 35;

          // Headers
          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          headers.forEach((header, index) => {
            doc.text(header, 14 + (index * 30), yPosition);
          });

          // Data
          yPosition += 10;
          doc.setFont(undefined, 'normal');
          tableData.forEach((row, rowIndex) => {
            row.forEach((cell, cellIndex) => {
              doc.text(cell, 14 + (cellIndex * 30), yPosition + (rowIndex * 8));
            });
          });
        }

        // Guardar el PDF
        doc.save(`${filename}.pdf`);
      } catch (error) {
        console.error('Error al generar PDF:', error);
        alert('Error al generar el archivo PDF. Por favor, intenta nuevamente.');
      }
    }).catch(() => {
      console.warn('jsPDF no está disponible. Usando método alternativo...');
      this.exportToPDFAlternative(data, filename, title, headers, dataKeys);
    });
  }

  /**
   * Convierte array de objetos a formato CSV
   */
  private convertToCSV(data: any[], headers: string[]): string {
    const csvArray = [];

    // Agregar headers
    csvArray.push(headers.join(','));

    // Agregar filas de datos
    data.forEach(item => {
      const row = headers.map(header => {
        const value = this.getValueForHeader(item, header);
        // Escapar comillas y envolver en comillas si contiene comas
        if (value && (value.toString().includes(',') || value.toString().includes('"'))) {
          return `"${value.toString().replace(/"/g, '""')}"`;
        }
        return value || '';
      });
      csvArray.push(row.join(','));
    });

    return csvArray.join('\n');
  }

  /**
   * Obtiene valor según el header (para CSV)
   */
  private getValueForHeader(item: any, header: string): any {
    switch (header) {
      case 'Nombre':
        return item.nombre;
      case 'Tipo de Naturaleza':
        return this.getTipoLabel(item.tipo);
      case 'Número de Cuenta':
        return item.numero;
      case 'Centro de Costos':
        return this.getManejaCentroCostoLabel(item.manejaCentroCosto);
      case 'Estado':
        return this.getEstadoLabel(item.estado);
      default:
        return '';
    }
  }

  /**
   * Obtiene valor anidado de un objeto
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Helpers para obtener labels formateados
   */
  private getTipoLabel(valor: any): string {
    const n = Number(valor);
    if (n === 1) return 'Deudora';
    if (n === 2) return 'Acreedora';
    return String(valor ?? '');
  }

  private getManejaCentroCostoLabel(valor: any): string {
    if (valor === 1 || valor === true || String(valor).toUpperCase() === '1') return 'Sí';
    return 'No';
  }

  private getEstadoLabel(valor: any): string {
    return Number(valor) === 1 ? 'Activo' : 'Inactivo';
  }

  /**
   * Asegura que jsPDF esté cargado, usando la función global si está disponible
   */
  private ensureJsPDFLoaded(): Promise<any> {
    return new Promise((resolve, reject) => {
      // Verificar si ya está disponible
      const existingJsPDF = this.getJsPDFInstance();
      if (existingJsPDF) {
        resolve(existingJsPDF);
        return;
      }

      // Intentar usar la función de carga global
      if (typeof window !== 'undefined' && (window as any).loadJsPDF) {
        (window as any).loadJsPDF()
          .then((jsPDF: any) => resolve(jsPDF))
          .catch((error: any) => reject(error));
      } else {
        // Fallback: cargar directamente
        this.loadJsPDFDirectly()
          .then((jsPDF: any) => resolve(jsPDF))
          .catch((error: any) => reject(error));
      }
    });
  }

  /**
   * Obtiene la instancia de jsPDF de diferentes formas posibles
   */
  private getJsPDFInstance(): any {
    // Verificar múltiples formas de acceso a jsPDF
    if (typeof window !== 'undefined') {
      // Forma 1: window.jsPDF (más común)
      if (window.jsPDF) {
        return window.jsPDF;
      }

      // Forma 2: window.jspdf
      if (window.jspdf && window.jspdf.jsPDF) {
        return window.jspdf.jsPDF;
      }

      // Forma 3: Buscar en el objeto window
      const globalJsPDF = (window as any)['jsPDF'];
      if (globalJsPDF) {
        return globalJsPDF;
      }
    }

    return null;
  }

  /**
   * Carga jsPDF directamente si no está disponible la función global
   */
  private loadJsPDFDirectly(): Promise<any> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

      script.onload = () => {
        const jsPDF = this.getJsPDFInstance();
        if (jsPDF) {
          resolve(jsPDF);
        } else {
          reject('jsPDF no se pudo inicializar después de la carga');
        }
      };

      script.onerror = () => {
        reject('Error al cargar jsPDF');
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Método alternativo para exportar PDF usando window.print()
   */
  private exportToPDFAlternative(data: any[], filename: string, title: string, headers: string[], dataKeys: string[]): void {
    const printWindow = window.open('', '_blank');

    if (printWindow) {
      const htmlContent = this.generatePrintableHTML(data, title, headers, dataKeys);

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // Esperar a que el contenido se cargue antes de imprimir
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      alert('No se pudo abrir la ventana de impresión. Por favor, permite ventanas emergentes para esta función.');
    }
  }

  /**
   * Genera HTML imprimible para el reporte
   */
  private generatePrintableHTML(data: any[], title: string, headers: string[], dataKeys: string[]): string {
    const currentDate = new Date().toLocaleDateString('es-ES');

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
          .date { font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #667eea; color: white; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
          @media print {
            body { margin: 10px; }
            .header { margin-bottom: 15px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title}</div>
          <div class="date">Generado el: ${currentDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              ${headers.map(header => `<th>${header}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
    `;

    // Agregar filas de datos
    data.forEach(item => {
      html += '<tr>';
      dataKeys.forEach(key => {
        const value = this.getNestedValue(item, key);
        html += `<td>${value !== null && value !== undefined ? value.toString() : ''}</td>`;
      });
      html += '</tr>';
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    return html;
  }
}
