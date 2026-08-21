import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { DatosBusqueda } from '../../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { ExportService } from '../../../../../shared/services/export.service';
import { Empleado } from '../../../model/empleado';
import { ProyeccionImpuestoRenta } from '../../../model/proyeccion-impuesto-renta';
import { EmpleadoService } from '../../../service/empleado.service';
import { ProyeccionImpuestoRentaService } from '../../../service/proyeccion-impuesto-renta.service';
import {
  aniosDisponibles,
  criteriosPorEmpresa,
  filtrarPorAnio,
} from '../../parametrizacion/utiles-parametrizacion';
import { RENGLONES_PROYECCION } from './proyeccion-ir.renglones';

/**
 * Proyección anual del impuesto a la renta (RHH.PYIR).
 *
 * Muestra el desglose completo del cálculo, no solo la retención resultante: es lo que permite
 * explicarle a un colaborador por qué se le retiene lo que se le retiene, y detectar a tiempo
 * una proyección que quedó desactualizada tras un cambio de sueldo.
 *
 * "Proyectar todos" es la corrida de enero; la individual se usa al ingresar alguien, al
 * cambiarle el sueldo o cuando presenta su anexo de gastos personales.
 */
@Component({
  selector: 'app-proyeccion-ir',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
  ],
  templateUrl: './proyeccion-ir.component.html',
  styleUrls: ['./proyeccion-ir.component.scss'],
})
export class ProyeccionIrComponent implements OnInit {
  renglones = RENGLONES_PROYECCION;
  columnas = ['concepto', 'valor'];

  anios = aniosDisponibles();
  anio = signal<number>(new Date().getFullYear());
  empleados = signal<Empleado[]>([]);
  empleadoSeleccionado = signal<number | null>(null);
  proyeccion = signal<ProyeccionImpuestoRenta | null>(null);
  sinProyeccion = signal<boolean>(false);
  ocupado = signal<boolean>(false);

  constructor(
    private proyeccionService: ProyeccionImpuestoRentaService,
    private empleadoService: EmpleadoService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (data) => this.empleados.set(data ?? []),
      error: () => {
        this.empleados.set([]);
        this.avisar('No se pudo cargar la lista de colaboradores', true);
      },
    });
  }

  onFiltroChange(): void {
    const empleado = this.empleadoSeleccionado();
    if (empleado === null) {
      this.proyeccion.set(null);
      this.sinProyeccion.set(false);
      return;
    }
    this.consultar(empleado);
  }

  private consultar(idEmpleado: number): void {
    this.ocupado.set(true);
    this.proyeccionService.selectByCriteria(this.criterios(idEmpleado)).subscribe({
      next: (data) => {
        this.ocupado.set(false);
        const delAnio = filtrarPorAnio(data, this.anio());
        const vigente = delAnio.find((p) => p.vigente === 'S') ?? delAnio[0] ?? null;
        this.proyeccion.set(vigente);
        this.sinProyeccion.set(!vigente);
      },
      error: () => {
        this.ocupado.set(false);
        this.proyeccion.set(null);
        this.sinProyeccion.set(true);
        this.avisar('No se pudo leer la proyección', true);
      },
    });
  }

  /** El mes desde el que rige la reproyección es el actual: lo ya retenido no se toca. */
  proyectar(): void {
    const empleado = this.empleadoSeleccionado();
    if (empleado === null) return;

    this.ocupado.set(true);
    this.proyeccionService.proyectar(empleado, this.anio(), new Date().getMonth() + 1).subscribe({
      next: (resultado) => {
        this.ocupado.set(false);
        this.avisar(
          `Retención mensual resultante: ${(resultado?.retencionMensual ?? 0).toFixed(2)}`,
        );
        this.consultar(empleado);
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(this.mensajeDeError(err), true);
      },
    });
  }

  proyectarTodos(): void {
    this.ocupado.set(true);
    this.proyeccionService.proyectarTodos(this.anio()).subscribe({
      next: (cantidad) => {
        this.ocupado.set(false);
        this.avisar(`${cantidad} colaborador(es) reproyectados para ${this.anio()}.`);
        const empleado = this.empleadoSeleccionado();
        if (empleado !== null) this.consultar(empleado);
      },
      error: (err) => {
        this.ocupado.set(false);
        this.avisar(this.mensajeDeError(err), true);
      },
    });
  }

  valorDe(campo: keyof ProyeccionImpuestoRenta): number | null {
    const proyeccion = this.proyeccion();
    if (!proyeccion) return null;
    const valor = proyeccion[campo];
    return typeof valor === 'number' ? valor : null;
  }

  exportarCsv(): void {
    const proyeccion = this.proyeccion();
    if (!proyeccion) return;

    const filas = this.renglones.map((renglon) => ({
      concepto: renglon.etiqueta,
      valor: this.valorDe(renglon.campo) ?? 0,
    }));
    this.exportService.exportToCSV(filas, 'proyeccion-ir', ['Concepto', 'Valor'], ['concepto', 'valor']);
  }

  /** El año se filtra en el cliente (ver `filtrarPorAnio`); aquí solo se acota el colaborador. */
  private criterios(idEmpleado: number): DatosBusqueda[] {
    const dbEmpleado = new DatosBusqueda();
    dbEmpleado.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      idEmpleado.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('mesDesde');

    return [dbEmpleado, orden];
  }

  etiquetaEmpleado(empleado: Empleado): string {
    return `${empleado.identificacion} — ${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  private mensajeDeError(error: any): string {
    if (typeof error === 'string') return error;
    return error?.message || 'No se pudo ejecutar la proyección';
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
