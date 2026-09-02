import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { mensajeDeError } from '../../../../../shared/utils/mensaje-error.util';
import { Empleado } from '../../../model/empleado';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { EmpleadoService } from '../../../service/empleado.service';
import { criteriosPorEmpresa, referenciaEmpresa } from '../../parametrizacion/utiles-parametrizacion';
import { EstadoLista, EstadoListaService } from '../../comunes/estado-lista.service';
import { ColumnaTabla, TonoPastilla } from '../../comunes/modelo-formulario';
import { TablaRrhComponent } from '../../comunes/tabla-rrh/tabla-rrh.component';
import { opcionesAviso } from '../../comunes/avisos';

const CLAVE_LISTA = 'personal:colaboradores';

/**
 * Listado de colaboradores — rediseño de 2026-09-01, molde de `app-tabla-rrh` (el mismo de
 * `liquidacion-list`), no el de vista propia de `contratos` ni el de edición en línea de
 * `descuentos-recurrentes`: acá no se edita nada en la lista, es la puerta de entrada a la ficha
 * (`personal/ficha`, ya en la forma nueva). `app-tabla-rrh` lo dice en su propio comentario: "No
 * edita: editar es otra vista."
 *
 * El alta es la excepción — antes vivía en el diálogo de `table-basic-hijos` (3 campos: sirve
 * solo para crear el registro mínimo; el resto se completa en la ficha). Sigue siendo mínima,
 * pero ahora en un panel en línea, no en un modal.
 */
@Component({
  selector: 'app-colaboradores',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    TablaRrhComponent,
  ],
  templateUrl: './colaboradores.component.html',
  styleUrls: ['./colaboradores.component.scss'],
})
export class ColaboradoresComponent implements OnInit {
  readonly filas = signal<any[]>([]);
  readonly cargando = signal<boolean>(true);

  readonly creando = signal<boolean>(false);
  readonly guardando = signal<boolean>(false);
  readonly errorCreacion = signal<string | null>(null);
  formulario: FormGroup | null = null;

  estadoLista: EstadoLista = { filtro: '', ordenPor: null, ascendente: true, scroll: 0, destacado: null };

  readonly columnas: ColumnaTabla[] = [
    { campo: 'identificacion', titulo: 'Identificación', ancho: '16%' },
    { campo: 'nombreCompleto', titulo: 'Colaborador', ancho: '30%' },
    { campo: 'regionLabel', titulo: 'Región 14º', ancho: '16%' },
    { campo: 'telefono', titulo: 'Teléfono', ancho: '14%' },
    { campo: 'email', titulo: 'Correo', ancho: '18%' },
    { campo: 'estadoLabel', titulo: 'Estado', ancho: '10%', pastilla: (fila) => this.tonoEstado(fila) },
  ];

  constructor(
    private fb: FormBuilder,
    private empleadoService: EmpleadoService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
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
    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (data) => {
        this.filas.set(this.formatear(data ?? []));
        this.cargando.set(false);
      },
      error: (err) => {
        this.filas.set([]);
        this.cargando.set(false);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar los colaboradores.'), true);
      },
    });
  }

  private formatear(registros: Empleado[]): any[] {
    return registros.map((row) => ({
      ...row,
      nombreCompleto: `${row.apellidos ?? ''} ${row.nombres ?? ''}`.trim(),
      regionLabel:
        row.region === null || row.region === undefined
          ? '—'
          : this.detalleRubroService.getDescripcionByParentAndAlterno(
              RubrosRrh.REGION_DECIMO_CUARTO,
              row.region,
            ) || '—',
      estadoLabel: this.activo(row.estado) ? 'Activo' : 'Inactivo',
    }));
  }

  private activo(estado: unknown): boolean {
    return String(estado ?? '').toUpperCase().startsWith('A');
  }

  private tonoEstado(fila: any): TonoPastilla {
    return this.activo(fila.estado) ? 'ok' : 'neutro';
  }

  // ─── Alta rápida ────────────────────────────────────────────────────────

  abrirCreacion(): void {
    this.creando.set(true);
    this.errorCreacion.set(null);
    this.formulario = this.fb.group({
      identificacion: ['', Validators.required],
      apellidos: ['', Validators.required],
      nombres: ['', Validators.required],
    });
  }

  cancelarCreacion(): void {
    this.creando.set(false);
    this.formulario = null;
    this.errorCreacion.set(null);
  }

  /** El registro nace mínimo — identificación y nombre — y se completa en la ficha, como antes. */
  confirmarCreacion(): void {
    if (!this.formulario || this.guardando()) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const v = this.formulario.value;
    const cuerpo = {
      identificacion: (v.identificacion as string).trim(),
      apellidos: (v.apellidos as string).trim().toUpperCase(),
      nombres: (v.nombres as string).trim().toUpperCase(),
      empresa: referenciaEmpresa(),
      estado: 'A',
      usuarioRegistro: usuarioSesion(),
    };

    this.guardando.set(true);
    this.errorCreacion.set(null);
    this.empleadoService.add(cuerpo).subscribe({
      next: (creado) => {
        this.guardando.set(false);
        this.cancelarCreacion();
        if (creado?.codigo) {
          this.abrir(creado);
        } else {
          this.avisar('Colaborador creado.');
          this.cargar();
        }
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorCreacion.set(mensajeDeError(err, 'No se pudo crear el colaborador.'));
      },
    });
  }

  abrir(fila: Empleado): void {
    if (!fila?.codigo) return;
    this.router.navigate(['/menurecursoshumanos/personal/ficha', fila.codigo]);
  }

  recordarEstado(estado: Partial<EstadoLista>): void {
    this.estadoListaService.guardar(CLAVE_LISTA, estado);
  }

  exportarCsv(): void {
    this.exportService.exportToCSV(
      this.filas(),
      'colaboradores',
      ['Identificación', 'Colaborador', 'Región 14º', 'Teléfono', 'Correo', 'Estado'],
      ['identificacion', 'nombreCompleto', 'regionLabel', 'telefono', 'email', 'estadoLabel'],
    );
  }

  private avisar(mensaje: string, esError = false): void {
    this.snackBar.open(mensaje, 'Cerrar', opcionesAviso(esError, mensaje));
  }
}
