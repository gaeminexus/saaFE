import { CommonModule } from '@angular/common';
import { Component, Inject, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { InlineAutocompleteComponent } from '../../comunes/inline-autocomplete/inline-autocomplete.component';

export interface RegistrarPlanillaDialogData {
  /** Rubro 330: fija el título y no es editable — la fila desde la que se abrió ya lo decidió. */
  tipo: number;
  tipoLabel: string;
}

export interface RenglonForm {
  concepto: string;
  conceptoTipo: number | null;
  valorIess: string | number;
}

/** Lo que el diálogo devuelve: los escalares del comprobante más sus renglones ya validados. */
export interface RegistrarPlanillaDialogResult {
  numeroComprobante: string;
  fechaEmision: string;
  fechaMaximaPago: string;
  valorIess: number;
  observacion: string | null;
  renglones: { concepto: string; conceptoTipo: number | null; valorIess: number }[];
}

/**
 * Alta de una planilla del IESS: captura del comprobante que emitió el portal.
 *
 * **Por qué cada renglón lleva un concepto de una lista cerrada, y no es cosmético.** El
 * comprobante trae texto libre («APORTE PERSONAL», «AP. PATRONAL»…), pero emparejarlo contra la
 * planilla de control adivinando por palabras dentro del texto rompe en silencio: dos renglones
 * con la misma palabra reciben el mismo total de control y la conciliación queda mal hecha sin que
 * nadie lo note (`docs/rrh/API-PLANILLA-IESS.md` §3.4). El concepto normalizado (rubro 331) es lo
 * único de lo que depende esa comparación.
 */
@Component({
  selector: 'app-registrar-planilla-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    InlineAutocompleteComponent,
  ],
  templateUrl: './registrar-planilla-dialog.component.html',
  styleUrls: ['./registrar-planilla-dialog.component.scss'],
})
export class RegistrarPlanillaDialogComponent {
  readonly conceptos: DetalleRubro[];

  numeroComprobante = '';
  fechaEmision: Date | null = new Date();
  fechaMaximaPago: Date | null = null;
  valorIess: string | number = '';
  observacion = '';

  renglones = signal<RenglonForm[]>([{ concepto: '', conceptoTipo: null, valorIess: '' }]);

  readonly aviso = signal<string | null>(null);

  private numero(valor: unknown): number {
    const n = parseFloat(String(valor ?? '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  }

  /** Suma de los renglones cargados — el backend exige que cuadre con `valorIess` dentro de un centavo. */
  readonly sumaRenglones = computed(() =>
    this.renglones().reduce((total, r) => total + this.numero(r.valorIess), 0),
  );

  /** Sólo compara cuando hay al menos un renglón con valor: sin renglones, el comprobante viaja sin desglose. */
  readonly renglonesDescuadran = computed(() => {
    const hayRenglonesConValor = this.renglones().some((r) => this.numero(r.valorIess) > 0);
    if (!hayRenglonesConValor) return false;
    return Math.abs(this.sumaRenglones() - this.numero(this.valorIess)) > 0.01;
  });

  constructor(
    private detalleRubroService: DetalleRubroService,
    public dialogRef: MatDialogRef<RegistrarPlanillaDialogComponent, RegistrarPlanillaDialogResult | null>,
    @Inject(MAT_DIALOG_DATA) public data: RegistrarPlanillaDialogData,
  ) {
    this.conceptos = this.detalleRubroService.getDetallesByParent(RubrosRrh.CONCEPTO_PLANILLA_IESS);
  }

  readonly etiquetaConcepto = (c: DetalleRubro): string => c.descripcion;
  readonly valorConcepto = (c: DetalleRubro): number => c.codigoAlterno;

  agregarRenglon(): void {
    this.renglones.update((filas) => [...filas, { concepto: '', conceptoTipo: null, valorIess: '' }]);
  }

  quitarRenglon(indice: number): void {
    this.renglones.update((filas) => filas.filter((_, i) => i !== indice));
  }

  private fechaISO(fecha: Date | null): string {
    if (!fecha) return '';
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
  }

  get formValido(): boolean {
    return !!this.numeroComprobante.trim()
      && !!this.fechaEmision
      && !!this.fechaMaximaPago
      && this.numero(this.valorIess) > 0;
  }

  guardar(): void {
    if (!this.formValido) {
      this.aviso.set('Complete comprobante, fechas y el valor total del IESS.');
      return;
    }
    if (this.renglonesDescuadran()) {
      this.aviso.set(
        `Los renglones suman ${this.sumaRenglones().toFixed(2)} y el total del IESS es `
        + `${this.numero(this.valorIess).toFixed(2)}: el backend va a rechazar el descuadre.`,
      );
      return;
    }

    const renglones = this.renglones()
      .filter((r) => r.concepto.trim() || this.numero(r.valorIess) > 0)
      .map((r) => ({
        concepto: r.concepto.trim(),
        conceptoTipo: r.conceptoTipo,
        valorIess: this.numero(r.valorIess),
      }));

    this.aviso.set(null);
    this.dialogRef.close({
      numeroComprobante: this.numeroComprobante.trim(),
      fechaEmision: this.fechaISO(this.fechaEmision),
      fechaMaximaPago: this.fechaISO(this.fechaMaximaPago),
      valorIess: this.numero(this.valorIess),
      observacion: this.observacion.trim() || null,
      renglones,
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
