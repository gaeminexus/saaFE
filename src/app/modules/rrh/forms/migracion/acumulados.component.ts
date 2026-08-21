import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../shared/services/export.service';
import { AcumuladoNomina } from '../../model/acumulado-nomina';
import { registrarEjercicios } from '../comunes/ejercicios';
import { mensajeDeError } from '../comunes/mensajes';
import { Empleado } from '../../model/empleado';
import { RubrosRrh } from '../../model/rubros-rrh';
import { AcumuladoNominaService } from '../../service/acumulado-nomina.service';
import { EmpleadoService } from '../../service/empleado.service';
import {
  aniosDisponibles,
  criteriosPorEmpresa,
  filtrarPorAnio,
} from '../parametrizacion/utiles-parametrizacion';

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

/**
 * Consulta de acumulados del colaborador (RHH.ACMN).
 *
 * Es la pantalla que hace verificable el corte de apertura: muestra, por tipo de base y mes, lo
 * que quedó acumulado, distinguiendo lo que vino de la migración de lo que generó la operación.
 *
 * Es de solo lectura a propósito. Los acumulados los escribe `cerrarPeriodo`, no el usuario;
 * corregir uno a mano descuadraría las bases de los décimos y de la proyección de impuesto.
 */
@Component({
  selector: 'app-acumulados',
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
  templateUrl: './acumulados.component.html',
  styleUrls: ['./acumulados.component.scss'],
})
export class AcumuladosComponent implements OnInit {
  meses = MESES;
  anios = aniosDisponibles();
  columnas = ['tipo', ...MESES.map((_, i) => `mes${i + 1}`), 'total'];

  empleados = signal<Empleado[]>([]);
  empleadoSeleccionado = signal<number | null>(null);
  anio = signal<number>(new Date().getFullYear());
  acumulados = signal<AcumuladoNomina[]>([]);
  cargando = signal<boolean>(false);

  /** Una fila por tipo de acumulado, con los doce meses en columnas. */
  filas = computed(() => {
    const porTipo = new Map<number, any>();

    for (const acumulado of this.acumulados()) {
      const tipo = Number(acumulado.tipoAcumulado);
      if (!porTipo.has(tipo)) {
        porTipo.set(tipo, {
          tipo,
          tipoLabel: this.rubro(RubrosRrh.TIPO_ACUMULADO, tipo),
          aperturaMigracion: false,
          total: 0,
        });
      }

      const fila = porTipo.get(tipo);
      const mes = Number(acumulado.mes);
      const valor = Number(acumulado.valor ?? 0);

      fila[`mes${mes}`] = Number(fila[`mes${mes}`] ?? 0) + valor;
      fila.total += valor;
      if (acumulado.aperturaMigracion === 'S') fila.aperturaMigracion = true;
    }

    return [...porTipo.values()].sort((a, b) => a.tipoLabel.localeCompare(b.tipoLabel));
  });

  hayApertura = computed(() => this.filas().some((f) => f.aperturaMigracion));

  constructor(
    private acumuladoService: AcumuladoNominaService,
    private empleadoService: EmpleadoService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (data) => this.empleados.set(data ?? []),
      error: (err) => {
        this.empleados.set([]);
        this.avisar(mensajeDeError(err, 'No se pudo cargar la lista de colaboradores'));
      },
    });
  }

  onFiltroChange(): void {
    const empleado = this.empleadoSeleccionado();
    if (empleado === null) {
      this.acumulados.set([]);
      return;
    }

    this.cargando.set(true);
    this.acumuladoService.selectByCriteria(this.criterios(empleado)).subscribe({
      next: (data) => {
        this.cargando.set(false);
        registrarEjercicios(data ?? []);
        this.anios = aniosDisponibles();
        this.acumulados.set(filtrarPorAnio(data, this.anio()));
      },
      error: (err) => {
        this.cargando.set(false);
        this.acumulados.set([]);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar los acumulados'));
      },
    });
  }

  /** El año se filtra en el cliente (ver `filtrarPorAnio`); aquí solo se acota el colaborador. */
  private criterios(empleado: number): DatosBusqueda[] {
    const dbEmpleado = new DatosBusqueda();
    dbEmpleado.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'empleado',
      'codigo',
      empleado.toString(),
      TipoComandosBusqueda.IGUAL,
    );

    const orden = new DatosBusqueda();
    orden.orderBy('mes');

    return [dbEmpleado, orden];
  }

  exportarCsv(): void {
    const encabezados = ['Tipo de acumulado', ...MESES, 'Total'];
    const claves = ['tipoLabel', ...MESES.map((_, i) => `mes${i + 1}`), 'total'];
    this.exportService.exportToCSV(this.filas(), 'acumulados', encabezados, claves);
  }

  etiquetaEmpleado(empleado: Empleado): string {
    return `${empleado.identificacion} — ${empleado.apellidos ?? ''} ${empleado.nombres ?? ''}`.trim();
  }

  private rubro(rubroAlterno: number, valor: number): string {
    return this.detalleRubroService.getDescripcionByParentAndAlterno(rubroAlterno, valor) || '—';
  }

  private avisar(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 8000,
      panelClass: ['snackbar-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }
}
