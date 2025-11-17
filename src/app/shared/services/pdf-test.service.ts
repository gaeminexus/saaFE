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
    console.log('🔍 Probando carga de jsPDF...');

    // Verificar si window.loadJsPDF está disponible
    if (typeof window !== 'undefined' && (window as any).loadJsPDF) {
      console.log('✅ Función loadJsPDF encontrada');

      (window as any).loadJsPDF()
        .then((jsPDF: any) => {
          console.log('✅ jsPDF cargado exitosamente:', jsPDF);

          // Crear un PDF de prueba simple
          const doc = new jsPDF();
          doc.text('¡jsPDF funciona correctamente!', 10, 10);
          doc.text('Fecha: ' + new Date().toLocaleDateString(), 10, 20);

          console.log('✅ PDF de prueba creado exitosamente');
          console.log('📋 Puedes generar PDFs sin problemas');

        })
        .catch((error: any) => {
          console.error('❌ Error al cargar jsPDF:', error);
          console.log('⚠️ Se usará el método alternativo (window.print)');
        });
    } else {
      console.warn('⚠️ Función loadJsPDF no encontrada');

      // Verificar si jsPDF ya está cargado
      if ((window as any).jsPDF) {
        console.log('✅ jsPDF ya está disponible globalmente');
      } else {
        console.log('❌ jsPDF no está disponible');
      }
    }
  }
}
