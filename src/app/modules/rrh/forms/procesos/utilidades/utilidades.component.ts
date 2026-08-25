import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { Utilidad } from '../../../model/utilidad';
import { UtilidadService } from '../../../service/utilidad.service';
import { mensajeDeError } from '../../comunes/mensajes';
import { ColumnaTabla } from '../../comunes/modelo-formulario';
import { TablaRrhComponent } from '../../comunes/tabla-rrh/tabla-rrh.component';
import { aniosDisponibles, filtrarPorAnio } from '../../parametrizacion/utiles-parametrizacion';
import { opcionesAviso } from '../../comunes/avisos';

/**
 * Reparto anual de utilidades.
 *
 * La utilidad contable la escribe el usuario —sale del balance, no de la nómina— y el motor la
 * reparte: una parte por días trabajados y otra por cargas familiares, con el tope por
 * trabajador; lo que pasa del tope no se reparte entre los demás, va al IESS.
 *
 * ASOPREP no reparte utilidades. La pantalla existe igual, y si la bandera de la empresa está
 * apagada el backend lo dice con su mensaje en vez de callar.
 */
@Component({
  selector: 'app-utilidades',
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
  templateUrl: './utilidades.component.html',
  styleUrls: ['./utilidades.component.scss'],
})
export class UtilidadesComponent implements OnInit {
  readonly anio = signal<number>(new Date().getFullYear() - 1);
  readonly anios = aniosDisponibles();
  readonly utilidad = signal<Utilidad | null>(null);
  readonly detalle = signal<any[]>([]);
  readonly cargando = signal<boolean>(false);
  readonly ocupado = signal<boolean>(false);

  utilidadContable: number | null = null;

  readonly columnas: ColumnaTabla[] = [
    { campo: 'colaborador', titulo: 'Colaborador', ancho: '26%' },
    { campo: 'dias', titulo: 'Días', ancho: '10%', formato: 'numero', alinear: 'derecha' },
    { campo: 'numeroCargas', titulo: 'Cargas', ancho: '10%', alinear: 'centro' },
    { campo: 'valorPorDias', titulo: 'Por días', ancho: '13%', formato: 'dinero', alinear: 'derecha' },
    {
      campo: 'valorPorCargas',
      titulo: 'Por cargas',
      ancho: '13%',
      formato: 'dinero',
      alinear: 'derecha',
    },
    { campo: 'excedente', titulo: 'Excedente', ancho: '13%', formato: 'dinero', alinear: 'derecha' },
    { campo: 'valorPagar', titulo: 'A pagar', ancho: '15%', formato: 'dinero', alinear: 'derecha' },
  ];

  constructor(
    private utilidadService: UtilidadService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  /** El año se filtra en el cliente: el DAO genérico no sabe enlazar `Integer`. */
  cargar(): void {
    this.cargando.set(true);
    this.utilidad.set(null);
    this.detalle.set([]);

    this.utilidadService.getAll().subscribe({
      next: (filas) => {
        const delAnio = filtrarPorAnio(filas ?? [], this.anio());
        const utilidad = delAnio[0] ?? null;
        this.utilidad.set(utilidad);
        this.utilidadContable = utilidad?.utilidadContable ?? null;
        this.cargando.set(false);
        if (utilidad) this.cargarDetalle(utilidad.codigo);
      },
      error: (err) => {
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo consultar el reparto.'), true);
      },
    });
  }

  private cargarDetalle(idUtilidad: number): void {
    const db = new DatosBusqueda();
    db.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'utilidad',
      'codigo',
      String(idUtilidad),
      TipoComandosBusqueda.IGUAL,
    );

    this.utilidadService.detalle([db]).subscribe({
      next: (filas) =>
        this.detalle.set(
          (filas ?? []).map((f: any) => ({
            ...f,
            colaborador: `${f.empleado?.apellidos ?? ''} ${f.empleado?.nombres ?? ''}`.trim(),
          })),
        ),
      error: () => this.detalle.set([]),
    });
  }

  calcular(): void {
    if (this.utilidadContable === null || Number(this.utilidadContable) <= 0) {
      this.avisar('Indique la utilidad contable del ejercicio, que sale del balance.', true);
      return;
    }

    this.ocupado.set(true);
    this.utilidadService.calcular(this.anio(), Number(this.utilidadContable)).subscribe({
      next: () => {
        this.ocupado.set(false);
        this.avisar('Reparto calculado.');
        this.cargar();
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(mensajeDeError(err, 'No se pudo calcular el reparto.'), true);
      },
    });
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      ...opcionesAviso(esError, mensaje),
    });
  }
}
