import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { RubrosRrh } from '../../../model/rubros-rrh';
import {
  EstadoLiquidacion,
  etiquetaEstadoLiquidacion,
  salidaEjecutada,
} from '../../../model/estados-liquidacion';
import { LiquidacionService } from '../../../service/liquidacion.service';
import { EstadoLista, EstadoListaService } from '../../comunes/estado-lista.service';
import { mensajeDeError } from '../../comunes/mensajes';
import { ColumnaTabla, TonoPastilla } from '../../comunes/modelo-formulario';
import { TablaRrhComponent } from '../../comunes/tabla-rrh/tabla-rrh.component';

const CLAVE_LISTA = 'procesos:liquidacion';

/**
 * Bandeja de finiquitos. La lista y el finiquito son dos vistas con su ruta.
 *
 * El estado se ve sin abrir nada: la pastilla lleva el color del rubro 196 y el asiento aparece
 * en su columna en cuanto se contabiliza.
 */
@Component({
  selector: 'app-liquidacion-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TablaRrhComponent],
  templateUrl: './liquidacion-list.component.html',
  styleUrls: ['./liquidacion-list.component.scss'],
})
export class LiquidacionListComponent implements OnInit {
  readonly filas = signal<any[]>([]);
  readonly cargando = signal<boolean>(true);

  estadoLista: EstadoLista = { filtro: '', ordenPor: null, ascendente: true, scroll: 0, destacado: null };

  readonly columnas: ColumnaTabla[] = [
    { campo: 'codigo', titulo: 'Nº', ancho: '8%', alinear: 'centro' },
    { campo: 'colaborador', titulo: 'Colaborador', ancho: '26%' },
    { campo: 'identificacion', titulo: 'Identificación', ancho: '14%' },
    { campo: 'fechaSalida', titulo: 'Salida', ancho: '12%', formato: 'fecha' },
    { campo: 'causalLabel', titulo: 'Causal', ancho: '18%' },
    { campo: 'neto', titulo: 'Neto', ancho: '12%', formato: 'dinero', alinear: 'derecha' },
    {
      campo: 'estadoLabel',
      titulo: 'Estado',
      ancho: '14%',
      pastilla: (fila) => this.tonoEstado(fila),
    },
  ];

  constructor(
    private liquidacionService: LiquidacionService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private estadoListaService: EstadoListaService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.estadoLista = this.estadoListaService.recuperar(CLAVE_LISTA);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.liquidacionService.getAll().subscribe({
      next: (filas) => {
        this.filas.set(this.formatear(filas ?? []));
        this.cargando.set(false);
      },
      error: (err) => {
        this.filas.set([]);
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar los finiquitos.'), true);
      },
    });
  }

  private formatear(filas: any[]): any[] {
    return filas.map((fila) => ({
      ...fila,
      fechaSalida: this.fecha(fila.fechaSalida),
      colaborador: `${fila.empleado?.apellidos ?? ''} ${fila.empleado?.nombres ?? ''}`.trim(),
      identificacion: fila.empleado?.identificacion ?? '—',
      causalLabel: fila.causalTerminacion?.nombre ?? '—',
      estadoLabel: etiquetaEstadoLiquidacion(
        fila,
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.ESTADO_LIQUIDACION,
          Number(fila.estado),
        ) || '—',
      ),
    }));
  }

  /**
   * Anulada en rojo, pagada en verde, el resto neutro: el color no sustituye a la etiqueta.
   *
   * **`APROBADA` se parte en dos**, y el color va con el trabajo pendiente, no con el avance:
   * el aviso se reserva para el finiquito cuya salida **todavía no se ha ejecutado**, que es el
   * único sobre el que el botón irreversible hace algo. Una salida ya ejecutada es un hecho
   * consumado y va en neutro. Mientras las tres cosas eran el mismo naranja, la pastilla decía
   * «te falta algo» sobre cuatro finiquitos a los que no les faltaba nada.
   */
  private tonoEstado(fila: any): TonoPastilla {
    const estado = Number(fila.estado);
    if (estado === EstadoLiquidacion.ANULADA) return 'error';
    if (estado === EstadoLiquidacion.PAGADA) return 'ok';
    if (estado === EstadoLiquidacion.APROBADA) {
      return salidaEjecutada(fila) === 'si' ? 'neutro' : 'aviso';
    }
    return 'neutro';
  }

  private fecha(valor: any): Date | null {
    if (!valor) return null;
    const f = this.funcionesDatosS.convertirFechaDesdeBackend(valor);
    return f instanceof Date && !Number.isNaN(f.getTime()) ? f : null;
  }

  nuevo(): void {
    this.router.navigate(['/menurecursoshumanos/procesos/liquidacion', 'nuevo']);
  }

  abrir(fila: any): void {
    this.router.navigate(['/menurecursoshumanos/procesos/liquidacion', fila.codigo]);
  }

  recordarEstado(estado: Partial<EstadoLista>): void {
    this.estadoListaService.guardar(CLAVE_LISTA, estado);
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: esError ? 8000 : 4000,
      panelClass: [esError ? 'snackbar-error' : 'snackbar-success'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
