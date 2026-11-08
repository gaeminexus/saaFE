import { Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { MaterialFormModule } from '../../../../shared/modules/material-form.module';
import { Participe } from '../../model/participe';
import { ParticipeService } from '../../service/participe.service';

export interface ParticipeElegido {
  codigoParticipe: number;
  /** Código de la entidad: es el `idEntidad` que piden los endpoints del otorgamiento. */
  codigoEntidad: number;
  numeroIdentificacion: string;
  nombre: string;
  label: string;
}

/**
 * Buscador de partícipe por cédula o nombre (dos campos, regla de combos de CLAUDE.md). Carga la lista
 * una vez y filtra en el cliente, igual que `prestamo-edit`. Emite `elegido` con el partícipe, o `null`
 * si el usuario borra o edita el texto después de elegir.
 */
@Component({
  selector: 'app-participe-selector',
  standalone: true,
  imports: [MaterialFormModule],
  template: `
    <mat-form-field appearance="outline" class="selector-participe">
      <mat-label>{{ etiqueta }}</mat-label>
      <input
        matInput
        [value]="consulta()"
        (input)="alEscribir($event)"
        [matAutocomplete]="auto"
        [disabled]="cargando()"
        placeholder="Buscar por cédula o nombre"
      />
      <mat-icon matSuffix>search</mat-icon>
      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="alElegir($event.option.value)">
        @for (p of filtrados(); track p.codigoParticipe) {
          <mat-option [value]="p.codigoParticipe">{{ p.label }}</mat-option>
        }
      </mat-autocomplete>
      @if (cargando()) {
        <mat-hint>Cargando partícipes…</mat-hint>
      }
    </mat-form-field>
  `,
  styles: [':host { display: block; } .selector-participe { width: 100%; max-width: 520px; }'],
})
export class ParticipeSelectorComponent implements OnInit {
  private participeService = inject(ParticipeService);

  etiqueta = 'Partícipe';
  elegido = output<ParticipeElegido | null>();

  cargando = signal(false);
  consulta = signal('');
  private opciones = signal<ParticipeElegido[]>([]);

  filtrados = computed(() => {
    const q = this.consulta().trim().toLowerCase();
    const todos = this.opciones();
    if (!q) return todos.slice(0, 50);
    return todos
      .filter((p) => p.numeroIdentificacion.toLowerCase().includes(q) || p.nombre.toLowerCase().includes(q))
      .slice(0, 50);
  });

  ngOnInit(): void {
    this.cargando.set(true);
    this.participeService
      .getAll()
      .pipe(finalize(() => this.cargando.set(false)))
      .subscribe({
        next: (lista) => this.opciones.set(this.mapear(lista || [])),
        error: () => this.opciones.set([]),
      });
  }

  alEscribir(evento: Event): void {
    this.consulta.set((evento.target as HTMLInputElement).value || '');
    this.elegido.emit(null);
  }

  alElegir(codigoParticipe: number): void {
    const p = this.opciones().find((o) => o.codigoParticipe === codigoParticipe);
    if (!p) return;
    this.consulta.set(p.label);
    this.elegido.emit(p);
  }

  limpiar(): void {
    this.consulta.set('');
    this.elegido.emit(null);
  }

  private mapear(lista: Participe[]): ParticipeElegido[] {
    return lista
      .filter((p) => p?.codigo && p?.entidad?.codigo)
      .map((p) => {
        const numeroIdentificacion = String(p.entidad.numeroIdentificacion || '-');
        const nombre = String(p.entidad.razonSocial || p.entidad.nombreComercial || 'Sin nombre');
        return {
          codigoParticipe: p.codigo,
          codigoEntidad: p.entidad.codigo,
          numeroIdentificacion,
          nombre,
          label: `${numeroIdentificacion} - ${nombre}`,
        };
      });
  }
}
