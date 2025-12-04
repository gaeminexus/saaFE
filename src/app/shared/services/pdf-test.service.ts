import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class PdfTestService {

  constructor() { }

  /**
   * Método de prueba para verificar que jsPDF funciona correctamente
   */
  testPDF(): void {
    // Verificar si window.loadJsPDF está disponible
    if (typeof window !== 'undefined' && (window as any).loadJsPDF) {
      (window as any).loadJsPDF()
        .then((jsPDF: any) => {
          // Crear un PDF de prueba simple
          const doc = new jsPDF();
          doc.text('¡jsPDF funciona correctamente!', 10, 10);
          doc.text('Fecha: ' + new Date().toLocaleDateString(), 10, 20);

        })
        .catch((error: any) => {
          console.error('❌ Error al cargar jsPDF:', error);
        });
    } else {
      console.warn('⚠️ Función loadJsPDF no encontrada');
    }
  }
}
