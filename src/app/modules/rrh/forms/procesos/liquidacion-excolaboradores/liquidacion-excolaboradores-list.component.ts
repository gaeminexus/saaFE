import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { PermisosService } from '../../../../../shared/services/permisos.service';
import {
  ESTADO_LIQUIDACION_EXTERNA_LABELS,
  EstadoLiquidacionExterna,
  LiquidacionExterna,
} from '../../../model/liquidacion-externa';
import { PermisosRrh } from '../../../model/permisos-rrh';
import { LiquidacionExternaService } from '../../../service/liquidacion-externa.service';
import { EstadoLista, EstadoListaService } from '../../comunes/estado-lista.service';
import { mensajeDeError } from '../../comunes/mensajes';
import { ColumnaTabla, TonoPastilla } from '../../comunes/modelo-formulario';
import { TablaRrhComponent } from '../../comunes/tabla-rrh/tabla-rrh.component';
import { opcionesAviso } from '../../comunes/avisos';

const CLAVE_LISTA = 'procesos:liquidaciones-excolaboradores';

/**
 * Liquidaciones de ex-colaboradores de la administración anterior — `RHH.LQEX`. Contrato:
 * `docs/rrh/API-LIQUIDACION-EXCOLABORADORES.md`.
 *
 * No son `Empleado`: la persona nunca se crea como colaborador (D1 del contrato), por eso esta
 * pantalla vive aparte de `Colaboradores` y de `Liquidación de haberes` (`RHH.LQDC`), que exige un
 * contrato vigente.
 */
@Component({
  selector: 'app-liquidacion-excolaboradores-list',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatSelectModule, TablaRrhComponent],
  templateUrl: './liquidacion-excolaboradores-list.component.html',
  styleUrls: ['./liquidacion-excolaboradores-list.component.scss'],
})
export class LiquidacionExcolaboradoresListComponent implements OnInit {
  readonly filas = signal<any[]>([]);
  readonly cargando = signal<boolean>(true);
  readonly filtroEstado = signal<number | null>(null);

  readonly estadoOptions = Object.entries(ESTADO_LIQUIDACION_EXTERNA_LABELS).map(([codigo, texto]) => ({
    codigo: Number(codigo),
    texto,
  }));

  readonly filasFiltradas = computed(() => {
    const estado = this.filtroEstado();
    const filas = this.filas();
    return estado === null ? filas : filas.filter((f) => Number(f.estado) === estado);
  });

  estadoLista: EstadoLista = { filtro: '', ordenPor: null, ascendente: true, scroll: 0, destacado: null };

  readonly columnas: ColumnaTabla[] = [
    { campo: 'codigo', titulo: 'Nº', ancho: '6%', alinear: 'centro' },
    { campo: 'identificacion', titulo: 'Identificación', ancho: '14%' },
    { campo: 'nombreCompleto', titulo: 'Nombre', ancho: '26%' },
    { campo: 'fechaSalida', titulo: 'Fecha de salida', ancho: '14%', formato: 'fecha' },
    { campo: 'neto', titulo: 'Neto', ancho: '12%', formato: 'dinero', alinear: 'derecha' },
    { campo: 'estadoLabel', titulo: 'Estado', ancho: '14%', pastilla: (fila) => this.tonoEstado(fila) },
    { campo: 'fechaPago', titulo: 'Fecha de pago', ancho: '14%', formato: 'fecha' },
  ];

  constructor(
    private liquidacionExternaService: LiquidacionExternaService,
    private funcionesDatosS: FuncionesDatosService,
    private estadoListaService: EstadoListaService,
    private router: Router,
    private snackBar: MatSnackBar,
    private permisosService: PermisosService,
  ) {}

  ngOnInit(): void {
    this.estadoLista = this.estadoListaService.recuperar(CLAVE_LISTA);
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.liquidacionExternaService.getAll().subscribe({
      next: (filas) => {
        this.filas.set(this.formatear(filas ?? []));
        this.cargando.set(false);
      },
      error: (err) => {
        this.filas.set([]);
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar las liquidaciones.'), true);
      },
    });
  }

  private formatear(filas: LiquidacionExterna[]): any[] {
    return filas.map((fila) => ({
      ...fila,
      nombreCompleto: `${fila.apellidos ?? ''} ${fila.nombres ?? ''}`.trim(),
      fechaSalida: this.fecha(fila.fechaSalida),
      fechaPago: this.fecha(fila.fechaPago),
      estadoLabel: ESTADO_LIQUIDACION_EXTERNA_LABELS[Number(fila.estado)] || `Estado ${fila.estado}`,
    }));
  }

  /** Anulada en rojo, pagada en verde, en tesorería en aviso (esperando a Tesorería), el resto neutro. */
  private tonoEstado(fila: any): TonoPastilla {
    const estado = Number(fila.estado);
    if (estado === EstadoLiquidacionExterna.ANULADA) return 'error';
    if (estado === EstadoLiquidacionExterna.PAGADA) return 'ok';
    if (estado === EstadoLiquidacionExterna.EN_TESORERIA) return 'aviso';
    return 'neutro';
  }

  private fecha(valor: any): Date | null {
    if (!valor) return null;
    const f = this.funcionesDatosS.convertirFechaDesdeBackend(valor);
    return f instanceof Date && !Number.isNaN(f.getTime()) ? f : null;
  }

  nuevo(): void {
    this.permisosService.ejecutarSiPermitido(
      PermisosRrh.FORMULARIO_LIQUIDACION_EXCOLABORADOR,
      () => this.router.navigate(['/menurecursoshumanos/procesos/liquidaciones-excolaboradores', 'nuevo']),
      (mensaje) => this.avisar(mensaje.toUpperCase(), true),
    );
  }

  abrir(fila: any): void {
    this.permisosService.ejecutarSiPermitido(
      PermisosRrh.FORMULARIO_LIQUIDACION_EXCOLABORADOR,
      () => this.router.navigate(['/menurecursoshumanos/procesos/liquidaciones-excolaboradores', fila.codigo]),
      (mensaje) => this.avisar(mensaje.toUpperCase(), true),
    );
  }

  recordarEstado(estado: Partial<EstadoLista>): void {
    this.estadoListaService.guardar(CLAVE_LISTA, estado);
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(esError, mensaje));
  }
}
