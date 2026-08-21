import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialFormModule } from '../../../../../../shared/modules/material-form.module';
import { DocumentoCxp } from '../../../../model/documento-cxp';

export interface SubirXmlDialogData {
  documento: DocumentoCxp;   // contexto: serie, emisor, tipo, y d.esReembolso para precargar
}
export interface SubirXmlDialogResult {
  file: File;
  esReembolso: boolean;
}

@Component({
  selector: 'app-subir-xml-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, MatDialogModule],
  templateUrl: './subir-xml-dialog.component.html',
  styleUrl: './subir-xml-dialog.component.scss',
})
export class SubirXmlDialogComponent {
  archivo: File | null = null;
  nombreArchivo = '';
  esReembolso = false;
  detectadoEnXml = false;

  constructor(
    private ref: MatDialogRef<SubirXmlDialogComponent, SubirXmlDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: SubirXmlDialogData,
  ) {
    // Pudo marcarse antes desde la bandeja: precargar el checkbox.
    this.esReembolso = data?.documento?.esReembolso === 1;
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    if (!file) return;
    this.archivo = file;
    this.nombreArchivo = file.name;
    this.detectadoEnXml = false;
    // Autodetección UX: leer el XML y auto-marcar si trae el bloque de reembolsos.
    const reader = new FileReader();
    reader.onload = (e) => {
      const contenido = (e.target?.result as string) || '';
      if (contenido.includes('<reembolsoDetalle>') || contenido.includes('<codDocReembolso>')) {
        this.esReembolso = true;
        this.detectadoEnXml = true;
      }
    };
    reader.readAsText(file, 'UTF-8');
    input.value = '';
  }

  /** Decodifica entidades HTML (ej: &#xf3; → ó) que vienen del SRI en tipoComprobante */
  decodeHtml(str: string | null | undefined): string {
    if (!str) return '';
    const txt = document.createElement('textarea');
    txt.innerHTML = str;
    return txt.value;
  }

  cancelar(): void { this.ref.close(null); }

  subir(): void {
    if (!this.archivo) return;
    this.ref.close({ file: this.archivo, esReembolso: this.esReembolso });
  }
}
