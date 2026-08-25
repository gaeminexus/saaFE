import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { FuncionesDatosService } from '../../../../../shared/services/funciones-datos.service';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { SALIDAS_GENERABLES, SalidaOficial, TipoSalidaOficial } from '../../../model/salida-oficial';
import { SalidaOficialService } from '../../../service/salida-oficial.service';
import { mensajeDeError } from '../../comunes/mensajes';
import { ColumnaTabla, TonoPastilla } from '../../comunes/modelo-formulario';
import { TablaRrhComponent } from '../../comunes/tabla-rrh/tabla-rrh.component';
import { aniosDisponibles } from '../../parametrizacion/utiles-parametrizacion';
import { guardarArchivo } from '../descarga-reporte';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Salidas a los organismos: RDEP y 107 al SRI, planilla al IESS, formularios del MDT.
 *
 * La tabla registra **el hecho**, no el contenido: lo que se presentó se reconstruye desde los
 * renglones, los acumulados y los beneficios. Por eso «generada» y «presentada» son dos columnas
 * distintas y no una sola fecha — entre una y otra pasan días, y esa espera es el estado normal.
 */
@Component({
  selector: 'app-salidas-oficiales',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    TablaRrhComponent,
  ],
  templateUrl: './salidas-oficiales.component.html',
  styleUrls: ['./salidas-oficiales.component.scss'],
})
export class SalidasOficialesComponent implements OnInit {
  readonly filas = signal<SalidaOficial[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly ocupado = signal<boolean>(false);
  readonly anio = signal<number>(new Date().getFullYear());
  readonly anios = aniosDisponibles();

  /** Fila a la que se le está registrando la presentación; `null` mientras no haya ninguna. */
  readonly presentando = signal<any | null>(null);
  fechaPresentacion = '';
  numeroComprobante = '';

  readonly visibles = computed(() =>
    this.filas().filter((f) => Number(f.anio) === Number(this.anio())),
  );

  readonly columnas: ColumnaTabla[] = [
    { campo: 'tipoLabel', titulo: 'Salida', ancho: '24%' },
    { campo: 'periodo', titulo: 'Ejercicio', ancho: '12%', alinear: 'centro' },
    { campo: 'colaborador', titulo: 'Colaborador', ancho: '20%' },
    { campo: 'fechaGeneracion', titulo: 'Generada', ancho: '13%', formato: 'fecha' },
    { campo: 'fechaPresentacion', titulo: 'Presentada', ancho: '13%', formato: 'fecha' },
    { campo: 'numeroComprobante', titulo: 'Comprobante', ancho: '12%' },
    {
      campo: 'situacion',
      titulo: 'Situación',
      ancho: '14%',
      pastilla: (fila) => (fila.fechaPresentacion ? 'ok' : 'aviso') as TonoPastilla,
    },
  ];

  constructor(
    private salidaService: SalidaOficialService,
    private detalleRubroService: DetalleRubroService,
    private funcionesDatosS: FuncionesDatosService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.salidaService.getAll().subscribe({
      next: (filas) => {
        this.filas.set(this.formatear(filas ?? []));
        this.cargando.set(false);
      },
      error: (err) => {
        this.filas.set([]);
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar las salidas oficiales.'), true);
      },
    });
  }

  private formatear(filas: any[]): any[] {
    return filas.map((fila) => ({
      ...fila,
      fechaGeneracion: this.fecha(fila.fechaGeneracion),
      fechaPresentacion: this.fecha(fila.fechaPresentacion),
      tipoLabel:
        this.detalleRubroService.getDescripcionByParentAndAlterno(
          RubrosRrh.TIPO_SALIDA_OFICIAL,
          Number(fila.tipoSalida),
        ) || '—',
      periodo: fila.mes ? `${fila.anio}-${String(fila.mes).padStart(2, '0')}` : `${fila.anio}`,
      colaborador: fila.empleado
        ? `${fila.empleado.apellidos ?? ''} ${fila.empleado.nombres ?? ''}`.trim()
        : 'Consolidada',
      situacion: fila.fechaPresentacion ? 'Presentada' : 'Pendiente de presentar',
    }));
  }

  /** El RDEP es hoy la única salida que el sistema genera; el resto solo se registra. */
  generarRdep(): void {
    this.ocupado.set(true);
    this.salidaService.generarRdep(this.anio()).subscribe({
      next: (blob) => {
        this.ocupado.set(false);
        guardarArchivo(blob, `rdep-${this.anio()}.xml`);
        this.avisar('RDEP generado. El registro queda en la lista.');
        this.cargar();
      },
      error: async (err) => {
        this.ocupado.set(false);
        this.avisar(await this.mensajeDeBlob(err), true);
      },
    });
  }

  abrirPresentacion(fila: any): void {
    this.presentando.set(fila);
    this.fechaPresentacion = '';
    this.numeroComprobante = fila.numeroComprobante ?? '';
  }

  cerrarPresentacion(): void {
    this.presentando.set(null);
  }

  confirmarPresentacion(): void {
    const fila = this.presentando();
    if (!fila) return;

    if (!this.fechaPresentacion) {
      this.avisar('Indique la fecha en que el organismo recibió la salida.', true);
      return;
    }

    this.ocupado.set(true);
    this.salidaService
      .registrarPresentacion(fila.codigo, this.fechaPresentacion, this.numeroComprobante || null)
      .subscribe({
        next: () => {
          this.ocupado.set(false);
          this.cerrarPresentacion();
          this.avisar('Presentación registrada.');
          this.cargar();
        },
        error: (err) => {
          this.ocupado.set(false);
          this.avisar(mensajeDeError(err, 'No se pudo registrar la presentación.'), true);
        },
      });
  }

  puedeGenerar(): boolean {
    return SALIDAS_GENERABLES.includes(TipoSalidaOficial.RDEP);
  }

  private fecha(valor: any): Date | null {
    if (!valor) return null;
    const f = this.funcionesDatosS.convertirFechaDesdeBackend(valor);
    return f instanceof Date && !Number.isNaN(f.getTime()) ? f : null;
  }

  /** Un error de una descarga viene como blob: hay que leerlo antes de poder mostrarlo. */
  private async mensajeDeBlob(error: any): Promise<string> {
    const cuerpo = error?.error instanceof Blob ? await error.error.text() : error?.error;
    return mensajeDeError(cuerpo ?? error, 'No se pudo generar el RDEP.');
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
