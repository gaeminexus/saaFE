import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MaterialFormModule } from '../../../../../shared/modules/material-form.module';
import { FilaDecision, etiquetaTipo } from '../../../model/seguimiento-novedades';
import { formatoFecha } from '../../../service/cierre-periodo.service';
import { SeguimientoNovedadesService } from '../../../service/seguimiento-novedades.service';
import { NavegacionReferenciasService } from '../referencias/navegacion-referencias.service';
import { TextoEnlazadoComponent } from '../referencias/texto-enlazado.component';

const QUIEN: Record<string, string> = {
  CONTABILIDAD_ASOPREP: 'Contabilidad de ASOPREP',
  RESPONSABLE_ASOPREP: 'Responsable de ASOPREP',
  GERENCIA: 'Gerencia',
  LIDER_PROYECTO: 'Líder del proyecto',
  GAEMII: 'GAEMII',
};

/**
 * C25b — Decisiones tomadas (pestaña de Seguimiento Novedades): todas las D-nnn de CNT.DCSN con fecha, tema, la
 * decisión completa, quién decide, evidencia, resumen y razones, y las novedades vinculadas (cada una abre su
 * detalle). Toda referencia del texto es un enlace. `seleccion` abre y resalta una decisión (enlaces D-nnn).
 */
@Component({
  selector: 'app-decisiones-tomadas',
  standalone: true,
  imports: [CommonModule, FormsModule, MaterialFormModule, TextoEnlazadoComponent],
  templateUrl: './decisiones-tomadas.component.html',
  styleUrl: './decisiones-tomadas.component.scss',
})
export class DecisionesTomadasComponent {
  private servicio = inject(SeguimientoNovedadesService);
  private nav = inject(NavegacionReferenciasService);

  idEmpresa = input<number | null>(null);
  anio = input<number | null>(null);
  mes = input<number | null>(null);
  /** Número D-nnn a abrir y resaltar. */
  seleccion = input<string | null>(null);

  readonly formatoFecha = formatoFecha;
  readonly etiquetaTipo = etiquetaTipo;
  filas = signal<FilaDecision[]>([]);
  texto = signal('');
  soloConNovedades = signal(false);
  abiertas = signal<Set<string>>(new Set());
  cargando = signal(false);
  error = signal<string | null>(null);
  private cargadas = false;

  constructor() {
    effect(() => {
      const e = this.idEmpresa();
      if (e && !this.cargadas) {
        this.cargadas = true;
        this.cargar();
      }
    });
    effect(() => {
      const s = this.seleccion();
      if (s) this.enfocar(s);
    });
  }

  cargar(): void {
    const e = this.idEmpresa();
    if (!e) return;
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listadoDecisiones(e, this.texto().trim() || null).subscribe({
      next: (f) => {
        this.filas.set(f ?? []);
        this.cargando.set(false);
        const s = this.seleccion();
        if (s) this.enfocar(s);
      },
      error: (m: string) => {
        this.cargando.set(false);
        this.error.set(m);
      },
    });
  }

  visibles(): FilaDecision[] {
    return this.soloConNovedades() ? this.filas().filter((f) => f.totalNovedades > 0) : this.filas();
  }

  quien(t: string): string {
    return QUIEN[t] ?? t;
  }

  alternar(numero: string): void {
    const s = new Set(this.abiertas());
    if (s.has(numero)) s.delete(numero);
    else s.add(numero);
    this.abiertas.set(s);
  }

  enfocar(numero: string): void {
    const s = new Set(this.abiertas());
    s.add(numero);
    this.abiertas.set(s);
    setTimeout(() => document.getElementById('decision-' + numero)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  }

  abrirNovedad(id: number): void {
    this.nav.abrirNovedad(id);
  }
}
