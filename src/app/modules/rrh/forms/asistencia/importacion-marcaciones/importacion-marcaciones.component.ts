import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { CargaMarcaciones, ResultadoImportacionMarcaciones } from '../../../model/carga-marcaciones';
import { FormatoMarcacion } from '../../../model/formato-marcacion';
import { CargaMarcacionesService } from '../../../service/carga-marcaciones.service';
import { FormatoMarcacionService } from '../../../service/formato-marcacion.service';
import { criteriosPorEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { MotivoDialogComponent } from '../../procesos/periodo-nomina/motivo-dialog.component';

/**
 * Importación del archivo del reloj biométrico (RHH.CRMR).
 *
 * Asistente de tres pasos: elegir archivo y formato → **previsualizar**, que no persiste nada y
 * dice qué entraría → confirmar. El historial de lotes queda abajo, con la opción de anular.
 *
 * La previsualización existe porque un archivo del reloj trae de todo: líneas repetidas dentro
 * del propio fichero, marcaciones ya cargadas antes y líneas mal formadas. Ver el recuento antes
 * de comprometer evita tener que anular después.
 */
@Component({
  selector: 'app-importacion-marcaciones',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './importacion-marcaciones.component.html',
  styleUrls: ['./importacion-marcaciones.component.scss'],
})
export class ImportacionMarcacionesComponent implements OnInit {
  columnas = ['archivo', 'formato', 'fechaCarga', 'rango', 'lineas', 'acciones'];

  formatos = signal<FormatoMarcacion[]>([]);
  formatoSeleccionado = signal<number | null>(null);
  archivo = signal<File | null>(null);

  previsualizacion = signal<ResultadoImportacionMarcaciones | null>(null);
  cargas = signal<CargaMarcaciones[]>([]);
  ocupado = signal<boolean>(false);

  puedePrevisualizar = computed(
    () => this.archivo() !== null && this.formatoSeleccionado() !== null && !this.ocupado(),
  );

  /** Confirmar exige haber previsualizado antes: es el paso que da sentido al asistente. */
  puedeConfirmar = computed(() => this.previsualizacion() !== null && !this.ocupado());

  nombreArchivo = computed(() => this.archivo()?.name ?? '');

  constructor(
    private cargaService: CargaMarcacionesService,
    private formatoService: FormatoMarcacionService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargarFormatos();
    this.cargarHistorial();
  }

  private cargarFormatos(): void {
    this.formatoService.selectByCriteria(criteriosPorEmpresa('nombre')).subscribe({
      next: (data) => this.formatos.set((data ?? []).filter((f) => Number(f.estado) === 1)),
      error: () => {
        this.formatos.set([]);
        this.avisar('No se pudieron cargar los formatos de marcación', true);
      },
    });
  }

  private cargarHistorial(): void {
    const orden = new DatosBusqueda();
    orden.orderBy('fechaCarga');

    this.cargaService.selectByCriteria([...criteriosPorEmpresa(), orden]).subscribe({
      next: (data) => this.cargas.set(data ?? []),
      error: () => this.cargas.set([]),
    });
  }

  onArchivo(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    this.archivo.set(input.files?.length ? input.files[0] : null);
    // Cambiar de archivo invalida lo previsualizado: no se confirma lo que ya no se está viendo
    this.previsualizacion.set(null);
  }

  onFormatoChange(codigo: number | null): void {
    this.formatoSeleccionado.set(codigo);
    this.previsualizacion.set(null);
  }

  previsualizar(): void {
    if (!this.puedePrevisualizar()) return;

    this.ocupado.set(true);
    this.cargaService.previsualizar(this.archivo()!, this.formatoSeleccionado()!).subscribe({
      next: (resultado) => {
        this.ocupado.set(false);
        this.previsualizacion.set(resultado);
      },
      error: (err) => {
        this.ocupado.set(false);
        this.previsualizacion.set(null);
        this.avisar(this.mensajeDeError(err, 'No se pudo previsualizar el archivo.'), true);
      },
    });
  }

  confirmar(): void {
    if (!this.puedeConfirmar()) return;

    this.ocupado.set(true);
    this.cargaService.confirmar(this.archivo()!, this.formatoSeleccionado()!).subscribe({
      next: (resultado) => {
        this.ocupado.set(false);
        this.avisar(`${resultado?.lineasOk ?? 0} marcación(es) importadas.`);
        this.previsualizacion.set(null);
        this.archivo.set(null);
        this.cargarHistorial();
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(this.mensajeDeError(err, 'No se pudo confirmar la importación.'), true);
      },
    });
  }

  /**
   * Anular retira el lote. El backend lo **rechaza si alguna marcación ya se consolidó**, porque
   * quitarla dejaría el resumen diario apoyado en datos inexistentes.
   */
  anular(carga: CargaMarcaciones): void {
    this.dialog
      .open(MotivoDialogComponent, {
        width: '520px',
        data: { titulo: `Anular la carga ${carga.nombreArchivo}`, etiqueta: 'Motivo de la anulación' },
      })
      .afterClosed()
      .subscribe((motivo: string | null) => {
        if (!motivo) return;

        this.ocupado.set(true);
        this.cargaService.anular(carga.codigo, motivo).subscribe({
          next: () => {
            this.ocupado.set(false);
            this.avisar('Carga anulada.');
            this.cargarHistorial();
          },
          error: (err) => {
            this.ocupado.set(false);
            this.avisar(this.mensajeDeError(err, 'No se pudo anular la carga.'), true);
          },
        });
      });
  }

  etiquetaFormato(formato: any): string {
    if (!formato) return '—';
    return formato.nombre ?? `#${formato.codigo}`;
  }

  private mensajeDeError(error: any, generico: string): string {
    if (typeof error === 'string' && error.trim()) return error;
    return error?.mensaje || error?.message || generico;
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: esError ? 9000 : 4000,
      panelClass: [esError ? 'snackbar-error' : 'snackbar-success'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
