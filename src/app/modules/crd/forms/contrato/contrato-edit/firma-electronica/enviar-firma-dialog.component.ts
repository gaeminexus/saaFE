import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

export interface EnviarFirmaDialogData {
  titulo: string;
  nombres: string;
  cedula: string;
  correo: string;
  celular: string;
}

/**
 * Confirmación de «Enviar a firmar». Pide el código dactilar del reverso de la cédula del socio
 * (6 caracteres alfanuméricos, en mayúsculas). Se devuelve solo al confirmar y vive únicamente en
 * este diálogo: no se guarda en ningún almacenamiento y se pierde al cerrarlo.
 */
@Component({
  selector: 'app-enviar-firma-dialog',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <p>
        Se enviará el contrato en PDF y los datos del partícipe a Security Data.
        Security Data enviará al socio un enlace con un código por correo y WhatsApp;
        al firmar el socio, se aplica la firma del representante legal.
      </p>
      <ul class="datos">
        <li><b>Partícipe:</b> {{ data.nombres }}</li>
        <li><b>Cédula:</b> {{ data.cedula }}</li>
        <li><b>Correo:</b> {{ data.correo || '—' }}</li>
        <li><b>Celular:</b> {{ data.celular || '—' }}</li>
      </ul>
      <mat-form-field appearance="outline" class="campo">
        <mat-label>Código dactilar</mat-label>
        <input matInput maxlength="6" autocomplete="off" [ngModel]="codigo" (ngModelChange)="cambiar($event)" required>
        <mat-hint>6 caracteres, del reverso de la cédula del socio. No se guarda.</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="cancelar()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" [disabled]="!valido()" (click)="confirmar()">
        <mat-icon>send</mat-icon> {{ data.titulo === 'Enviar a firmar' ? 'Enviar a firmar' : 'Reintentar' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .datos { margin: 0 0 1rem; padding-left: 1.2rem; }
    .campo { width: 100%; }
  `],
})
export class EnviarFirmaDialogComponent {
  data = inject<EnviarFirmaDialogData>(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef<EnviarFirmaDialogComponent, string | null>);

  codigo = '';

  cambiar(valor: string): void {
    this.codigo = (valor || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  valido(): boolean {
    return /^[A-Z0-9]{6}$/.test(this.codigo);
  }

  confirmar(): void {
    if (!this.valido()) return;
    const codigo = this.codigo;
    this.codigo = '';
    this.ref.close(codigo);
  }

  cancelar(): void {
    this.codigo = '';
    this.ref.close(null);
  }
}
