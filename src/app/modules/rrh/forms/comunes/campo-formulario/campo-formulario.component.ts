import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, signal } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { DetalleRubro } from '../../../../../shared/model/detalle-rubro';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { OPCIONES_ESTADO, OPCIONES_SI_NO } from '../../parametrizacion/utiles-parametrizacion';
import { CampoFormulario } from '../modelo-formulario';

/**
 * Pinta un `CampoFormulario` contra un control de un `FormGroup` ya construido.
 *
 * Los combos de rubro leen del catálogo por código alterno, nunca por PK. Los de tabla
 * (`referencia`) son autocompletables y **filtran por todas las propiedades de `buscarPor`**,
 * que la regla del proyecto exige que sean al menos dos.
 */
@Component({
  selector: 'app-campo-formulario',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './campo-formulario.component.html',
  styleUrls: ['./campo-formulario.component.scss'],
})
export class CampoFormularioComponent implements OnInit {
  @Input({ required: true }) campo!: CampoFormulario;
  @Input({ required: true }) formulario!: FormGroup;
  /**
   * Dónde va la etiqueta. `izquierda` es la disposición de ficha de datos: etiqueta a un lado y
   * control al otro, que lee más rápido en un formulario largo que una columna de etiquetas
   * flotantes.
   */
  @Input() disposicion: 'encima' | 'izquierda' = 'encima';

  readonly opcionesSiNo = OPCIONES_SI_NO;
  readonly opcionesEstado = OPCIONES_ESTADO;

  detallesRubro: DetalleRubro[] = [];

  /** Texto tecleado en el autocompletar de una referencia. */
  private busqueda = signal<string>('');

  readonly sugerencias = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    const filas = this.campo?.coleccion ?? [];
    if (!texto) return filas.slice(0, 50);
    return filas.filter((fila) => this.coincide(fila, texto)).slice(0, 50);
  });

  constructor(private detalleRubroService: DetalleRubroService) {}

  ngOnInit(): void {
    if (this.campo.tipo === 'rubro' && this.campo.rubro !== undefined) {
      this.detallesRubro = this.detalleRubroService.getDetallesByParent(this.campo.rubro) ?? [];
    }
  }

  get control() {
    return this.formulario.get(this.campo.name);
  }

  get invalido(): boolean {
    const control = this.control;
    return !!control && control.invalid && (control.dirty || control.touched);
  }

  alTeclear(valor: string): void {
    this.busqueda.set(valor ?? '');
  }

  /** Un elemento seleccionado se muestra por su etiqueta; mientras se teclea, por el texto. */
  etiquetaDe = (fila: any): string => {
    if (fila === null || fila === undefined) return '';
    if (typeof fila !== 'object') return String(fila);
    return this.partesBuscables(fila).join(' · ');
  };

  private coincide(fila: any, texto: string): boolean {
    return this.partesBuscables(fila).some((parte) => parte.toLowerCase().includes(texto));
  }

  /** Valores de las propiedades de `buscarPor`, admitiendo rutas como `departamento.nombre`. */
  private partesBuscables(fila: any): string[] {
    const rutas = this.campo.buscarPor ?? ['nombre'];
    const partes: string[] = [];
    for (const ruta of rutas) {
      const valor = ruta.split('.').reduce((acc: any, tramo) => acc?.[tramo], fila);
      if (valor !== null && valor !== undefined && String(valor).trim() !== '') {
        partes.push(String(valor));
      }
    }
    return partes.length > 0 ? partes : [String(fila.codigo ?? '')];
  }
}
