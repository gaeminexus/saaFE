import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { TableBasicHijosComponent } from '../../../../../shared/basics/table/forms/table-basic-hijos/table-basic-hijos.component';
import { TableConfig } from '../../../../../shared/basics/table/model/table-interface';
import { DetalleRubroService } from '../../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../../shared/services/export.service';
import { usuarioSesion } from '../../../../../shared/services/usuario-sesion';
import { Empleado } from '../../../model/empleado';
import { EntidadesRrh } from '../../../model/entidades-rrh';
import { RubrosRrh } from '../../../model/rubros-rrh';
import { EmpleadoService } from '../../../service/empleado.service';
import { criteriosPorEmpresa, referenciaEmpresa } from '../../parametrizacion/utiles-parametrizacion';

/**
 * Listado de colaboradores. Es la puerta de entrada a la ficha: al pulsar una fila se abre su
 * ficha completa con pestañas.
 *
 * El alta y la edición de los datos del colaborador viven en la ficha, no aquí; esta pantalla
 * solo busca y navega.
 */
@Component({
  selector: 'app-colaboradores',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, TableBasicHijosComponent],
  templateUrl: './colaboradores.component.html',
  styleUrls: ['./colaboradores.component.scss'],
})
export class ColaboradoresComponent implements OnInit {
  tableConfig?: TableConfig;
  exportData = signal<Empleado[]>([]);
  cargando = signal<boolean>(true);

  constructor(
    private empleadoService: EmpleadoService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.empleadoService.selectByCriteria(criteriosPorEmpresa('apellidos')).subscribe({
      next: (data) => this.construirTabla(data ?? []),
      error: () => {
        this.avisar('No se pudieron cargar los colaboradores');
        this.construirTabla([]);
      },
    });
  }

  private construirTabla(registros: Empleado[]): void {
    this.exportData.set(registros);
    this.cargando.set(false);

    this.tableConfig = {
      entidad: EntidadesRrh.EMPLEADO,
      titulo: 'Colaboradores',
      registros: this.formatear(registros),
      fields: [
        { column: 'identificacion', header: 'Identificación', fWidth: '16%' },
        { column: 'nombreCompleto', header: 'Colaborador', fWidth: '30%' },
        { column: 'regionLabel', header: 'Región 14º', fWidth: '16%' },
        { column: 'telefono', header: 'Teléfono', fWidth: '14%' },
        { column: 'email', header: 'Correo', fWidth: '18%' },
        { column: 'estadoLabel', header: 'Estado', fWidth: '10%' },
      ],
      regConfig: [
        {
          type: 'input',
          name: 'identificacion',
          label: 'Identificación',
          inputType: 'text',
          validations: [
            {
              name: 'required',
              validator: Validators.required,
              message: 'La identificación es requerida',
            },
          ],
        },
        {
          type: 'input',
          name: 'apellidos',
          label: 'Apellidos',
          inputType: 'text',
          transformToUppercase: true,
          validations: [
            { name: 'required', validator: Validators.required, message: 'Los apellidos son requeridos' },
          ],
        },
        {
          type: 'input',
          name: 'nombres',
          label: 'Nombres',
          inputType: 'text',
          transformToUppercase: true,
          validations: [
            { name: 'required', validator: Validators.required, message: 'Los nombres son requeridos' },
          ],
        },
      ],
      add: true,
      edit: false,
      remove: false,
      paginator: true,
      filter: true,
      fSize: 'em-1',
      row_size: 's08',
      // Sin empresa el alta no volvería a aparecer en el listado, que ya filtra por ella
      onBeforeSave: (datos: any) => ({
        ...datos,
        empresa: referenciaEmpresa(),
        estado: 'A',
        usuarioRegistro: usuarioSesion(),
      }),
      onDataUpdate: (data: Empleado[]) => {
        this.exportData.set(data ?? []);
        return this.formatear(data ?? []);
      },
    };
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
      estadoLabel: String(row.estado ?? '').toUpperCase().startsWith('A') ? 'Activo' : 'Inactivo',
    }));
  }

  abrirFicha(registro: Empleado): void {
    if (!registro?.codigo) return;
    this.router.navigate(['/menurecursoshumanos/personal/ficha', registro.codigo]);
  }

  onTableError(errorData: { mensaje: string; codigoHttp?: number }): void {
    const exito =
      errorData.codigoHttp != null && errorData.codigoHttp >= 200 && errorData.codigoHttp < 300;
    this.snackBar.open(errorData.mensaje, 'Cerrar', {
      duration: exito ? 4000 : 8000,
      panelClass: [exito ? 'snackbar-success' : 'snackbar-error'],
      horizontalPosition: 'end',
      verticalPosition: 'top',
    });
  }

  exportarCsv(): void {
    this.exportService.exportToCSV(
      this.formatear(this.exportData()),
      'colaboradores',
      ['Identificación', 'Colaborador', 'Región 14º', 'Teléfono', 'Correo', 'Estado'],
      ['identificacion', 'nombreCompleto', 'regionLabel', 'telefono', 'email', 'estadoLabel'],
    );
  }

  private avisar(mensaje: string): void {
    this.onTableError({ mensaje });
  }
}
