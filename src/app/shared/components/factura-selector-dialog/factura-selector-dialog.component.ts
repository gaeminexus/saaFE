import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FacturaEmitir } from '../../../modules/cxc/model/factura-emitir';
import { FacturaEmitirService } from '../../../modules/cxc/service/emitir/factura-emitir.service';
import { DetalleSriService } from '../../../modules/cxc/service/detalle-sri.service';
import { DatosBusqueda } from '../../model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda as TipoDatos } from '../../model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../model/datos-busqueda/tipo-comandos-busqueda';

export interface FacturaSelectorDialogData {
  codigoTitular: number;
  nombreTitular: string;
}

@Component({
  selector: 'app-factura-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './factura-selector-dialog.component.html',
})
export class FacturaSelectorDialogComponent implements OnInit {
  cargando = signal(false);
  error = signal('');
  estadosEmision = signal<Array<{ value: string; label: string }>>([]);

  todasLasFacturas: FacturaEmitir[] = [];
  dataSource = new MatTableDataSource<FacturaEmitir>([]);
  columnas = ['id', 'numero', 'fecha', 'total', 'estado', 'accion'];

  textoBusqueda = '';
  protected readonly Number = Number;

  constructor(
    private dialogRef: MatDialogRef<FacturaSelectorDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: FacturaSelectorDialogData,
    private facturaService: FacturaEmitirService,
    private detalleSriService: DetalleSriService,
  ) {}

  ngOnInit(): void {
    this.cargarEstadosYFacturas();
  }

  cargarEstadosYFacturas(): void {
    const LSRI_ESTADOS = '603';
    this.cargando.set(true);
    this.error.set('');
    this.detalleSriService.getAll().subscribe({
      next: (detalles) => {
        const estados = (detalles || [])
          .filter((d) => d.estado === 1 && this.getTablaCodigo(d.lsri) === LSRI_ESTADOS)
          .map((d) => ({ value: d.codigo, label: d.detalle }));
        this.estadosEmision.set(estados);
        this.cargarFacturas();
      },
      error: () => {
        this.estadosEmision.set([]);
        this.cargarFacturas();
      },
    });
  }

  private getTablaCodigo(lsri: number | { tabla?: string }): string {
    if (typeof lsri === 'object' && lsri?.tabla) return String(lsri.tabla);
    return typeof lsri === 'number' ? String(lsri) : '';
  }

  cargarFacturas(): void {
    if (!this.data.codigoTitular) {
      this.error.set('No se especificó el cliente');
      this.cargando.set(false);
      return;
    }

    const criterios: DatosBusqueda[] = [];

    const cTitular = new DatosBusqueda();
    cTitular.asignaValorConCampoPadre(
      TipoDatos.LONG, 'titular', 'codigo', String(this.data.codigoTitular), TipoComandosBusqueda.IGUAL
    );
    cTitular.setNumeroCampoRepetido(0);
    criterios.push(cTitular);

    this.facturaService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        // Ordenar localmente por id DESC, solo facturas activas primero
        const lista = (data || []).sort((a, b) => (b.id || 0) - (a.id || 0));
        this.todasLasFacturas = lista;
        this.dataSource.data = [...lista];
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudieron cargar las facturas del cliente');
        this.cargando.set(false);
      },
    });
  }

  filtrar(): void {
    const termino = this.textoBusqueda.trim().toLowerCase();
    if (!termino) {
      this.dataSource.data = [...this.todasLasFacturas];
      return;
    }
    this.dataSource.data = this.todasLasFacturas.filter((f) =>
      (f.numero || '').toLowerCase().includes(termino) ||
      String(f.id || '').includes(termino)
    );
  }

  seleccionar(factura: FacturaEmitir): void {
    this.dialogRef.close(factura);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  formatFecha(fecha: Date | string | null | undefined): string {
    if (!fecha) return '-';
    const d = new Date(fecha);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-EC', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /** estadoEmision: usa tabla LSRI 603, igual que consulta-facturas */
  estadoLabel(estadoEmision: number | null | undefined): string {
    const codigo = String(Number(estadoEmision || 0));
    return this.estadosEmision().find((e) => e.value === codigo)?.label || `Estado ${codigo}`;
  }

  esAnulada(row: FacturaEmitir): boolean {
    const label = this.estadoLabel(row.estadoEmision).toLowerCase();
    return label.includes('anul');
  }
}
