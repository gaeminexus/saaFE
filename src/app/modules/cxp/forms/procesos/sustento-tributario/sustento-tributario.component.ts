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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';

import { AppStateService } from '../../../../../shared/services/app-state.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { CatalogoSustento, FacturaSustentoPendiente } from '../../../model/sustento-tributario';
import { SustentoTributarioService } from '../../../service/sustento-tributario.service';

/** Estado editable de una fila: qué código tiene elegido ahora mismo y si ya se guardó. */
interface EstadoFila {
  sustento: string | null;
  guardando: boolean;
  guardado: boolean;
  error: string;
}

/**
 * Corrección de sustento tributario (Tabla 5 del ATS) de facturas de compra.
 * Ver docs/logica-negocio/sri/LEVANTAMIENTO-ATS-103-104.md §3.6/§4.2 en
 * saaBE — sin este dato el ATS no valida. El sistema propone un valor
 * (sustentoSugerido); esta pantalla es donde contabilidad lo revisa/corrige
 * antes de generar el anexo.
 */
@Component({
  selector: 'app-sustento-tributario',
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
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  templateUrl: './sustento-tributario.component.html',
  styleUrls: ['./sustento-tributario.component.scss'],
})
export class SustentoTributarioComponent implements OnInit {
  private sustentoS = inject(SustentoTributarioService);
  private appState = inject(AppStateService);
  private funcionesDatosS = inject(FuncionesDatosService);
  private snackBar = inject(MatSnackBar);

  catalogo = signal<CatalogoSustento>({});
  catalogoOpciones = computed(() =>
    Object.entries(this.catalogo())
      .map(([codigo, descripcion]) => ({ codigo, descripcion }))
      .sort((a, b) => a.codigo.localeCompare(b.codigo)),
  );

  facturas = signal<FacturaSustentoPendiente[]>([]);
  /** Estado editable por id de factura — separado de `facturas` para que los computed() sean siempre sobre signals. */
  estadoFilas = signal<Record<number, EstadoFila>>({});

  cargando = signal(false);
  errorCarga = signal('');

  filtroSustento = signal<string | null>(null);
  filtroDesde = signal<string>('');
  filtroHasta = signal<string>('');

  columnas = ['numero', 'fecha', 'proveedor', 'total', 'iva', 'sustento', 'acciones'];

  filtradas = computed(() => {
    const desde = this.filtroDesde();
    const hasta = this.filtroHasta();
    const sustento = this.filtroSustento();
    const estados = this.estadoFilas();

    return this.facturas().filter((f) => {
      if (sustento && estados[f.id]?.sustento !== sustento) return false;
      const fecha = this.aFecha(f.fecha);
      if (desde && fecha && this.soloFecha(fecha) < this.soloFecha(new Date(desde))) return false;
      if (hasta && fecha && this.soloFecha(fecha) > this.soloFecha(new Date(hasta))) return false;
      return true;
    });
  });

  totalFacturas = computed(() => this.facturas().length);
  totalResueltas = computed(() => {
    const estados = this.estadoFilas();
    return this.facturas().filter((f) => estados[f.id]?.guardado).length;
  });
  totalFaltan = computed(() => this.totalFacturas() - this.totalResueltas());

  ngOnInit(): void {
    this.cargarCatalogo();
    this.cargar();
  }

  private cargarCatalogo(): void {
    this.sustentoS.catalogo().subscribe({
      next: (data) => this.catalogo.set(data || {}),
      error: () => this.catalogo.set({}),
    });
  }

  cargar(): void {
    const idEmpresa = this.appState.getEmpresa()?.codigo;
    if (!idEmpresa) {
      this.facturas.set([]);
      this.errorCarga.set('No se pudo determinar la empresa de la sesión');
      return;
    }

    this.cargando.set(true);
    this.errorCarga.set('');
    this.sustentoS.pendientes(idEmpresa).subscribe({
      next: (data) => {
        const lista = Array.isArray(data) ? data : [];
        this.facturas.set(lista);
        const estados: Record<number, EstadoFila> = {};
        for (const f of lista) {
          estados[f.id] = { sustento: f.sustentoSugerido ?? null, guardando: false, guardado: false, error: '' };
        }
        this.estadoFilas.set(estados);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.facturas.set([]);
        this.errorCarga.set(mensajeDeError(err, 'No se pudieron cargar las facturas pendientes de sustento'));
      },
    });
  }

  limpiarFiltros(): void {
    this.filtroSustento.set(null);
    this.filtroDesde.set('');
    this.filtroHasta.set('');
  }

  cambiarSustento(idFactura: number, sustento: string | null): void {
    this.estadoFilas.update((estados) => ({
      ...estados,
      [idFactura]: { ...estados[idFactura], sustento, guardado: false, error: '' },
    }));
  }

  estadoDe(idFactura: number): EstadoFila | undefined {
    return this.estadoFilas()[idFactura];
  }

  /**
   * Guardado por fila, no "guardar todo": si falla a mitad de una lista
   * larga, el usuario tiene que saber exactamente cuál quedó sin grabar, y
   * un botón por fila con su propio estado de carga/éxito lo deja inequívoco.
   */
  guardarFila(f: FacturaSustentoPendiente): void {
    const estado = this.estadoFilas()[f.id];
    if (!estado?.sustento || estado.guardando) return;

    this.estadoFilas.update((estados) => ({
      ...estados,
      [f.id]: { ...estados[f.id], guardando: true, error: '' },
    }));

    this.sustentoS.corregir(f.id, estado.sustento).subscribe({
      next: () => {
        this.estadoFilas.update((estados) => ({
          ...estados,
          [f.id]: { ...estados[f.id], guardando: false, guardado: true },
        }));
      },
      error: (err) => {
        const mensaje = mensajeDeError(err, 'No se pudo guardar el sustento');
        this.estadoFilas.update((estados) => ({
          ...estados,
          [f.id]: { ...estados[f.id], guardando: false, guardado: false, error: mensaje },
        }));
        this.snackBar.open(`Factura ${f.numero}: ${mensaje}`, 'Cerrar', { duration: 6000, panelClass: ['snackbar-error'] });
      },
    });
  }

  descripcionCatalogo(codigo: string | null): string {
    if (!codigo) return '';
    return this.catalogo()[codigo] || '';
  }

  fechaDisplay(fecha: unknown): string {
    return this.funcionesDatosS.formatoFecha(fecha as any, FuncionesDatosService.SOLO_FECHA) || '—';
  }

  private aFecha(fecha: unknown): Date | null {
    return this.funcionesDatosS.convertirFechaDesdeBackend(fecha as any);
  }

  private soloFecha(d: Date): number {
    const v = new Date(d);
    v.setHours(0, 0, 0, 0);
    return v.getTime();
  }
}
