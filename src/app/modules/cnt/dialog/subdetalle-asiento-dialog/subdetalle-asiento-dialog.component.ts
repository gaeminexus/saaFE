import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { SubdetalleAsientoService } from '../../service/subdetalle-asiento.service';

/** Representa un subdetalle de activo fijo en memoria (antes de persistir). */
export interface SubdetalleItem {
  /** Código del registro en BD si ya existe (undefined para nuevos). */
  _codigo?: number;
  codigoActivo: string;
  nombreBien: string;
  categoria: string;
  tipo: string;
  /** ISO date string yyyy-MM-dd */
  fechaAdquisicion: string;
  costoAdquisicion: number | null;
  mejorasCapitalizadas: number | null;
  valorResidual: number | null;
  baseDepreciar: number | null;
  vidaUtilTotal: number | null;
  vidaUtilRemanente: number | null;
  porcentajeDepreciacion: number | null;
  cuotaDepreciacion: number | null;
  depreciacionAcumulada: number | null;
  valorNetoLibros: number | null;
  ubicacionGeneral: string;
  ubicacionEspecifica: string;
  responsable: string;
  estadoFisico: string;
  factura: string;
  observaciones: string;
}

export interface SubdetalleDialogData {
  /** Texto informativo de la cuenta padre para el título del diálogo. */
  cuentaInfo: string;
  /** Si se provee, el diálogo cargará subdetalles existentes vía API. */
  codigoDetalle?: number;
  /** Subdetalles actualmente en memoria (pueden estar vacíos). */
  subdetalles: SubdetalleItem[];
}

/** Resultado que devuelve el diálogo al cerrarse. */
export interface SubdetalleDialogResult {
  items: SubdetalleItem[];
  /** Códigos de subdetalles que el usuario eliminó de la tabla. */
  deletedCodes: number[];
}

@Component({
  selector: 'app-subdetalle-asiento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatExpansionModule,
    MatSnackBarModule,
  ],
  templateUrl: './subdetalle-asiento-dialog.component.html',
  styleUrl: './subdetalle-asiento-dialog.component.scss',
})
export class SubdetalleAsientoDialogComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  form: FormGroup;
  loading = false;
  /** Copia plana de rows.controls con nueva referencia en cada mutación para que MatTable refresque. */
  tableRows: AbstractControl[] = [];
  /** Códigos BD de subdetalles que existían al abrir el diálogo (para calcular eliminados). */
  private _codigosIniciales = new Set<number>();

  /** Orden de columnas para importación CSV (debe coincidir con el archivo). */
  readonly csvColumnsOrder: string[] = [
    'codigoActivo',
    'nombreBien',
    'categoria',
    'tipo',
    'fechaAdquisicion',
    'costoAdquisicion',
    'mejorasCapitalizadas',
    'valorResidual',
    'baseDepreciar',
    'vidaUtilTotal',
    'vidaUtilRemanente',
    'porcentajeDepreciacion',
    'cuotaDepreciacion',
    'depreciacionAcumulada',
    'valorNetoLibros',
    'ubicacionGeneral',
    'ubicacionEspecifica',
    'responsable',
    'estadoFisico',
    'factura',
    'observaciones',
  ];

  readonly displayedColumns: string[] = [
    'acciones',
    'codigoActivo',
    'nombreBien',
    'categoria',
    'tipo',
    'fechaAdquisicion',
    'costoAdquisicion',
    'mejorasCapitalizadas',
    'valorResidual',
    'baseDepreciar',
    'vidaUtilTotal',
    'vidaUtilRemanente',
    'porcentajeDepreciacion',
    'cuotaDepreciacion',
    'depreciacionAcumulada',
    'valorNetoLibros',
    'ubicacionGeneral',
    'ubicacionEspecifica',
    'responsable',
    'estadoFisico',
    'factura',
    'observaciones',
  ];

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<SubdetalleAsientoDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SubdetalleDialogData,
    private subdetalleService: SubdetalleAsientoService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({ rows: this.fb.array([]) });
    (data.subdetalles ?? []).forEach((s) => {
      this.rows.push(this.createRow(s));
      if (s._codigo) this._codigosIniciales.add(s._codigo);
    });
    this.tableRows = [...this.rows.controls];
  }

  ngOnInit(): void {
    // Si no hay subdetalles en memoria y existe un detalle guardado → cargar desde BD
    if (this.rows.length === 0 && this.data.codigoDetalle) {
      this.cargarSubdetallesExistentes();
    }
  }

  get rows(): FormArray {
    return this.form.get('rows') as FormArray;
  }

  createRow(sub?: Partial<SubdetalleItem>): FormGroup {
    return this.fb.group({
      _codigo: [sub?._codigo ?? null],
      codigoActivo: [sub?.codigoActivo ?? ''],
      nombreBien: [sub?.nombreBien ?? ''],
      categoria: [sub?.categoria ?? ''],
      tipo: [sub?.tipo ?? ''],
      fechaAdquisicion: [sub?.fechaAdquisicion ?? ''],
      costoAdquisicion: [sub?.costoAdquisicion ?? null],
      mejorasCapitalizadas: [sub?.mejorasCapitalizadas ?? null],
      valorResidual: [sub?.valorResidual ?? null],
      baseDepreciar: [sub?.baseDepreciar ?? null],
      vidaUtilTotal: [sub?.vidaUtilTotal ?? null],
      vidaUtilRemanente: [sub?.vidaUtilRemanente ?? null],
      porcentajeDepreciacion: [sub?.porcentajeDepreciacion ?? null],
      cuotaDepreciacion: [sub?.cuotaDepreciacion ?? null],
      depreciacionAcumulada: [sub?.depreciacionAcumulada ?? null],
      valorNetoLibros: [sub?.valorNetoLibros ?? null],
      ubicacionGeneral: [sub?.ubicacionGeneral ?? ''],
      ubicacionEspecifica: [sub?.ubicacionEspecifica ?? ''],
      responsable: [sub?.responsable ?? ''],
      estadoFisico: [sub?.estadoFisico ?? ''],
      factura: [sub?.factura ?? ''],
      observaciones: [sub?.observaciones ?? ''],
    });
  }

  agregarFila(): void {
    this.rows.push(this.createRow());
    this.refreshTable();
  }

  eliminarFila(index: number): void {
    this.rows.removeAt(index);
    this.refreshTable();
  }

  private refreshTable(): void {
    this.tableRows = [...this.rows.controls];
    this.cdr.detectChanges();
  }

  private cargarSubdetallesExistentes(): void {
    this.loading = true;
    const criterio = new DatosBusqueda();
    criterio.asignaValorConCampoPadre(
      TipoDatosBusqueda.LONG,
      'detalleAsiento',
      'codigo',
      String(this.data.codigoDetalle),
      TipoComandosBusqueda.IGUAL
    );
    this.subdetalleService.selectByCriteria([criterio]).subscribe({
      next: (data) => {
        this.loading = false;
        if (data && data.length > 0) {
          data.forEach((s) =>
            this.rows.push(

              this.createRow({
                _codigo: s.codigo,
                codigoActivo: s.codigoActivo ?? '',
                nombreBien: s.nombreBien ?? '',
                categoria: s.categoria ?? '',
                tipo: s.tipo ?? '',
                fechaAdquisicion: s.fechaAdquisicion ?? '',
                costoAdquisicion: s.costoAdquisicion ?? null,
                mejorasCapitalizadas: s.mejorasCapitalizadas ?? null,
                valorResidual: s.valorResidual ?? null,
                baseDepreciar: s.baseDepreciar ?? null,
                vidaUtilTotal: s.vidaUtilTotal ?? null,
                vidaUtilRemanente: s.vidaUtilRemanente ?? null,
                porcentajeDepreciacion: s.porcentajeDepreciacion ?? null,
                cuotaDepreciacion: s.cuotaDepreciacion ?? null,
                depreciacionAcumulada: s.depreciacionAcumulada ?? null,
                valorNetoLibros: s.valorNetoLibros ?? null,
                ubicacionGeneral: s.ubicacionGeneral ?? '',
                ubicacionEspecifica: s.ubicacionEspecifica ?? '',
                responsable: s.responsable ?? '',
                estadoFisico: s.estadoFisico ?? '',
                factura: s.factura ?? '',
                observaciones: s.observaciones ?? '',
              })
            )
          );
          // Registrar los códigos cargados desde BD como iniciales para calcular eliminados
          data.forEach((s) => { if (s.codigo) this._codigosIniciales.add(s.codigo); });
          this.refreshTable();
        }
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('No se pudieron cargar los subdetalles existentes', 'Cerrar', {
          duration: 3000,
          panelClass: ['warning-snackbar'],
        });
      },
    });
  }

  abrirSelectorArchivo(): void {
    this.fileInputRef.nativeElement.click();
  }

  importarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      this.parsearCSV(content);
    };
    reader.readAsText(file, 'UTF-8');
    // Resetear el input para permitir reimportar el mismo archivo
    input.value = '';
  }

  private parsearCSV(content: string): void {
    const lines = content.split('\n').filter((l) => l.trim());
    if (lines.length === 0) {
      this.snackBar.open('El archivo está vacío', 'Cerrar', { duration: 3000 });
      return;
    }

    // Detectar si la primera línea es encabezado
    const firstLine = lines[0].toLowerCase();
    const hasHeader = this.csvColumnsOrder.some((c) => firstLine.includes(c.toLowerCase()));
    const startIndex = hasHeader ? 1 : 0;
    const dataLines = lines.slice(startIndex);

    let importados = 0;
    dataLines.forEach((line) => {
      const cols = this.parseCsvLine(line);
      if (cols.every((c) => !c)) return; // saltar filas vacías

      const sub: Partial<SubdetalleItem> = {
        codigoActivo: cols[0] ?? '',
        nombreBien: cols[1] ?? '',
        categoria: cols[2] ?? '',
        tipo: cols[3] ?? '',
        fechaAdquisicion: cols[4] ?? '',
        costoAdquisicion: this.toNum(cols[5]),
        mejorasCapitalizadas: this.toNum(cols[6]),
        valorResidual: this.toNum(cols[7]),
        baseDepreciar: this.toNum(cols[8]),
        vidaUtilTotal: this.toInt(cols[9]),
        vidaUtilRemanente: this.toInt(cols[10]),
        porcentajeDepreciacion: this.toNum(cols[11]),
        cuotaDepreciacion: this.toNum(cols[12]),
        depreciacionAcumulada: this.toNum(cols[13]),
        valorNetoLibros: this.toNum(cols[14]),
        ubicacionGeneral: cols[15] ?? '',
        ubicacionEspecifica: cols[16] ?? '',
        responsable: cols[17] ?? '',
        estadoFisico: cols[18] ?? '',
        factura: cols[19] ?? '',
        observaciones: cols[20] ?? '',
      };
      this.rows.push(this.createRow(sub));
      importados++;
    });

    this.refreshTable();
    this.snackBar.open(
      importados > 0
        ? `✅ ${importados} registro(s) importados correctamente`
        : '⚠️ No se encontraron datos válidos en el archivo',
      'Cerrar',
      {
        duration: 3000,
        panelClass: importados > 0 ? ['success-snackbar'] : ['warning-snackbar'],
      }
    );
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private toNum(val: string | undefined): number | null {
    const n = parseFloat((val ?? '').replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  private toInt(val: string | undefined): number | null {
    const n = parseInt(val ?? '', 10);
    return isNaN(n) ? null : n;
  }

  guardar(): void {
    const items: SubdetalleItem[] = this.rows.value as SubdetalleItem[];
    const currentCodes = new Set(items.filter(s => !!s._codigo).map(s => s._codigo!));
    const deletedCodes = [...this._codigosIniciales].filter(c => !currentCodes.has(c));
    this.dialogRef.close({ items, deletedCodes } as SubdetalleDialogResult);
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }
}
