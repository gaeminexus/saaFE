import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  computed,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EstadoLista } from '../estado-lista.service';
import { ColumnaTabla, TonoPastilla } from '../modelo-formulario';

/**
 * Tabla de lectura del módulo: cabecera fija, filtro sobre todas las columnas, orden por
 * columna y estado vacío que explica qué falta.
 *
 * No edita: editar es otra vista. Y **devuelve su estado hacia fuera** —filtro, orden y
 * posición— para que al volver del formulario la lista esté como se dejó.
 *
 * Para volúmenes grandes —marcaciones son miles de filas— aquí es donde entra el scroll
 * virtual; con las decenas de filas de la ficha, la cabecera fija basta.
 */
@Component({
  selector: 'app-tabla-rrh',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
  ],
  templateUrl: './tabla-rrh.component.html',
  styleUrls: ['./tabla-rrh.component.scss'],
})
export class TablaRrhComponent implements AfterViewInit {
  @Input({ required: true }) columnas: ColumnaTabla[] = [];
  @Input() set filas(valor: any[]) {
    this.origen.set(valor ?? []);
  }
  @Input() cargando = false;
  @Input() permiteEditar = true;
  @Input() permiteBorrar = false;
  @Input() mensajeVacio = 'Todavía no hay registros.';

  /** Estado con el que se abre la lista: el que tenía al salir. */
  @Input() set estadoInicial(estado: EstadoLista | null) {
    if (!estado) return;
    this.filtro.set(estado.filtro ?? '');
    this.ordenPor.set(estado.ordenPor);
    this.ascendente.set(estado.ascendente ?? true);
    this.destacado.set(estado.destacado);
    this.scrollPendiente = estado.scroll ?? 0;
  }

  @Output() editar = new EventEmitter<any>();
  @Output() borrar = new EventEmitter<any>();
  @Output() estadoCambia = new EventEmitter<Partial<EstadoLista>>();

  @ViewChild('marco') marco?: ElementRef<HTMLDivElement>;

  readonly origen = signal<any[]>([]);
  readonly filtro = signal<string>('');
  readonly ordenPor = signal<string | null>(null);
  readonly ascendente = signal<boolean>(true);
  readonly destacado = signal<number | null>(null);

  private scrollPendiente = 0;

  readonly visibles = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    const columna = this.ordenPor();

    let filas = this.origen();
    if (texto) {
      filas = filas.filter((fila) =>
        this.columnas.some((c) => String(fila?.[c.campo] ?? '').toLowerCase().includes(texto)),
      );
    }
    if (!columna) return filas;

    const signo = this.ascendente() ? 1 : -1;
    return [...filas].sort((a, b) => signo * this.comparar(a?.[columna], b?.[columna]));
  });

  ngAfterViewInit(): void {
    if (this.scrollPendiente && this.marco) {
      // Tras pintar: restaurar la posición en la que se dejó la lista
      setTimeout(() => this.marco!.nativeElement.scrollTo({ top: this.scrollPendiente }), 0);
    }
  }

  alFiltrar(valor: string): void {
    this.filtro.set(valor ?? '');
    this.emitirEstado();
  }

  ordenarPor(columna: ColumnaTabla): void {
    if (this.ordenPor() === columna.campo) {
      this.ascendente.set(!this.ascendente());
    } else {
      this.ordenPor.set(columna.campo);
      this.ascendente.set(true);
    }
    this.emitirEstado();
  }

  alEditar(fila: any): void {
    this.destacado.set(fila?.codigo ?? null);
    this.emitirEstado();
    this.editar.emit(fila);
  }

  private emitirEstado(): void {
    this.estadoCambia.emit({
      filtro: this.filtro(),
      ordenPor: this.ordenPor(),
      ascendente: this.ascendente(),
      scroll: this.marco?.nativeElement.scrollTop ?? 0,
      destacado: this.destacado(),
    });
  }

  /** Números y fechas se comparan por valor; lo demás, como texto y sin distinguir acentos. */
  private comparar(a: any, b: any): number {
    if (a === null || a === undefined) return b === null || b === undefined ? 0 : 1;
    if (b === null || b === undefined) return -1;

    if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
    if (typeof a === 'number' && typeof b === 'number') return a - b;

    return String(a).localeCompare(String(b), 'es', { sensitivity: 'base', numeric: true });
  }

  tono(columna: ColumnaTabla, fila: any): TonoPastilla | null {
    return columna.pastilla ? columna.pastilla(fila) : null;
  }

  clase(columna: ColumnaTabla): string {
    if (columna.alinear === 'centro') return 'al-centro';
    if (columna.alinear === 'derecha') return 'a-la-derecha';
    return '';
  }

  identidad = (indice: number, fila: any) => fila?.codigo ?? indice;
}
