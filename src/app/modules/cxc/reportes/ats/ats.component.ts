import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppStateService } from '../../../../shared/services/app-state.service';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import { Facturador } from '../../model/facturador';
import { FacturadorService } from '../../service/facturador.service';
import { ResultadoGeneracionAts } from '../../model/ats';
import { AtsService } from '../../service/ats.service';
import { Cuadre103Response, Cuadre104Response } from '../../model/cuadre-sri';
import { CuadreSriService } from '../../service/cuadre-sri.service';

/**
 * Generación del ATS + reporte de apoyo al cuadre de los formularios 103/104 (Fase 5 de
 * docs/logica-negocio/sri/LEVANTAMIENTO-ATS-103-104.md en saaBE, §10.7). No genera los
 * formularios 103/104 en sí — esos se llenan en el portal del SRI; esta pantalla solo da los
 * totales que el sistema puede calcular para contrastarlos.
 *
 * El ZIP del ATS nunca se validó contra el validador oficial del SRI (§10.1 en saaBE) — se
 * avisa siempre, además de los `avisos` puntuales que devuelve cada generación.
 */
@Component({
  selector: 'app-ats',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './ats.component.html',
  styleUrls: ['./ats.component.scss'],
})
export class AtsComponent implements OnInit {
  private facturadorS = inject(FacturadorService);
  private atsS = inject(AtsService);
  private cuadreS = inject(CuadreSriService);
  private appState = inject(AppStateService);

  facturadores = signal<Facturador[]>([]);
  facturadorSeleccionado = signal<Facturador | null>(null);
  /** "yyyy-MM" del input type="month". */
  periodoMes = signal<string>(this.mesAnteriorISO());

  anio = computed(() => Number(this.periodoMes().split('-')[0]) || 0);
  mes = computed(() => Number(this.periodoMes().split('-')[1]) || 0);
  private periodoValido = computed(() => this.anio() > 0 && this.mes() >= 1 && this.mes() <= 12);

  generando = signal(false);
  errorGeneracion = signal('');
  resultadoGeneracion = signal<ResultadoGeneracionAts | null>(null);

  cargandoCuadre104 = signal(false);
  errorCuadre104 = signal('');
  cuadre104 = signal<Cuadre104Response | null>(null);

  cargandoCuadre103 = signal(false);
  errorCuadre103 = signal('');
  cuadre103 = signal<Cuadre103Response | null>(null);

  puedeGenerar = computed(() => !!this.facturadorSeleccionado() && this.periodoValido() && !this.generando());
  puedeConsultarCuadres = computed(
    () => !!this.facturadorSeleccionado() && this.periodoValido()
      && !this.cargandoCuadre104() && !this.cargandoCuadre103(),
  );

  ngOnInit(): void {
    this.cargarFacturadores();
  }

  /** Mismo criterio que "Cargar Extracto"/"Tablero de Cumplimiento": el mes anterior al actual, el que casi siempre se declara. */
  private mesAnteriorISO(): string {
    const hoy = new Date();
    let mes = hoy.getMonth(); // 0-based: mes actual - 1, ya "anterior"
    let anio = hoy.getFullYear();
    if (mes === 0) {
      mes = 12;
      anio -= 1;
    }
    return `${anio}-${String(mes).padStart(2, '0')}`;
  }

  private cargarFacturadores(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    this.facturadorS.getAll().subscribe({
      next: (data) => {
        const todos = Array.isArray(data) ? data : [];
        const filtrados = idEmpresa != null
          ? todos.filter((f) => f.empresa?.codigo === idEmpresa)
          : todos;
        this.facturadores.set(filtrados.length > 0 ? filtrados : todos);
        this.preseleccionarFacturador();
      },
      error: () => this.facturadores.set([]),
    });
  }

  /** Precarga el facturador de la sesión actual (mismo que usan las pantallas de emisión) si está en la lista. */
  private preseleccionarFacturador(): void {
    const raw = sessionStorage.getItem('facturador') || localStorage.getItem('facturador');
    let idSesion: number | null = null;
    if (raw) {
      try {
        idSesion = (JSON.parse(raw) as Facturador)?.id ?? null;
      } catch {
        idSesion = null;
      }
    }
    const lista = this.facturadores();
    const encontrado = idSesion != null ? lista.find((f) => f.id === idSesion) : null;
    this.facturadorSeleccionado.set(encontrado ?? lista[0] ?? null);
  }

  etiquetaFacturador(f: Facturador): string {
    return `${f.razonSocial || f.nombre} — ${f.numDoc}`;
  }

  generarAts(): void {
    const facturador = this.facturadorSeleccionado();
    if (!this.puedeGenerar() || !facturador) return;

    this.generando.set(true);
    this.errorGeneracion.set('');
    this.resultadoGeneracion.set(null);

    this.atsS.generar({ idFacturador: facturador.id, anio: this.anio(), mes: this.mes() }).subscribe({
      next: (resp) => {
        this.generando.set(false);
        this.resultadoGeneracion.set(resp);
      },
      error: (err: Error) => {
        this.generando.set(false);
        this.errorGeneracion.set(mensajeDeError(err, 'No se pudo generar el ATS'));
      },
    });
  }

  /** Decodifica `contenidoBase64` y dispara la descarga del ZIP — no llega como octet-stream. */
  descargarZip(): void {
    const resultado = this.resultadoGeneracion();
    if (!resultado) return;

    const binario = atob(resultado.contenidoBase64);
    const bytes = new Uint8Array(binario.length);
    for (let i = 0; i < binario.length; i++) {
      bytes[i] = binario.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);

    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = resultado.nombreArchivo || 'ats.zip';
    enlace.click();
    URL.revokeObjectURL(url);
  }

  consultarCuadres(): void {
    const facturador = this.facturadorSeleccionado();
    if (!this.puedeConsultarCuadres() || !facturador) return;

    const idFacturador = facturador.id;
    const anio = this.anio();
    const mes = this.mes();

    this.cargandoCuadre104.set(true);
    this.errorCuadre104.set('');
    this.cuadre104.set(null);
    this.cuadreS.cuadre104(idFacturador, anio, mes).subscribe({
      next: (resp) => {
        this.cargandoCuadre104.set(false);
        this.cuadre104.set(resp);
      },
      error: (err: Error) => {
        this.cargandoCuadre104.set(false);
        this.errorCuadre104.set(mensajeDeError(err, 'No se pudo calcular el cuadre del 104'));
      },
    });

    this.cargandoCuadre103.set(true);
    this.errorCuadre103.set('');
    this.cuadre103.set(null);
    this.cuadreS.cuadre103(idFacturador, anio, mes).subscribe({
      next: (resp) => {
        this.cargandoCuadre103.set(false);
        this.cuadre103.set(resp);
      },
      error: (err: Error) => {
        this.cargandoCuadre103.set(false);
        this.errorCuadre103.set(mensajeDeError(err, 'No se pudo calcular el cuadre del 103'));
      },
    });
  }
}
