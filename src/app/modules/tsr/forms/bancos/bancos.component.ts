import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DatosBusqueda } from '../../../../shared/model/datos-busqueda/datos-busqueda';
import { DetalleRubro } from '../../../../shared/model/detalle-rubro';
import { TipoComandosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-comandos-busqueda';
import { TipoDatosBusqueda } from '../../../../shared/model/datos-busqueda/tipo-datos-busqueda';
import { DetalleRubroService } from '../../../../shared/services/detalle-rubro.service';
import { ExportService } from '../../../../shared/services/export.service';
import { mensajeDeError } from '../../../../shared/utils/mensaje-error.util';
import { Banco } from '../../model/banco';
import { BancoService } from '../../service/banco.service';

/** Rubro 24: tipo de banco. No hay una clase de constantes de rubro en `tsr` (a diferencia de
 *  `RubrosRrh` en `rrh`); se deja el número acá, igual que ya estaba en el `regConfig` original. */
const RUBRO_TIPO_BANCO = 24;

/**
 * Bancos (`TSR.BNCO`) — rediseño de 2026-09-01. Deja de colgar de `app-table-basic-hijos`.
 *
 * Catálogo chico (nombre, tipo, si concilia descuadre, estado): edición en línea, sin vista
 * propia ni navegación — no hay adónde navegar, todo se edita acá mismo.
 *
 * **Autocontenida a propósito.** `tsr` no tiene equivalente de `app-tabla-rrh` ni de
 * `forms/comunes/` de `rrh`, y esta pantalla no importa nada de ahí: es la única de `tsr` con esta
 * forma hoy, así que sacar una pieza compartida para un solo consumidor sería la abstracción
 * prematura que la propia orden de rediseño ya evitó una vez con el piloto de `contratos`.
 */
@Component({
  selector: 'app-bancos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './bancos.component.html',
  styleUrls: ['./bancos.component.scss'],
})
export class BancosComponent implements OnInit {
  bancos = signal<Banco[]>([]);
  cargando = signal<boolean>(true);
  filtro = signal<string>('');

  /**
   * `tipo` (`rubroTipoBancoH`) se guarda como el `codigoAlterno` numérico, no como el objeto
   * `DetalleRubro`. Verificado contra `AutocompleteComponent.seleccion()` del widget viejo
   * (`dynamic-form/components/autocomplete/autocomplete.component.ts:192-201`): cuando el campo
   * tiene `rubroAlterno`, ya asignaba `item.option.value.codigoAlterno` al control — nunca el
   * objeto completo. Por eso el `extraerCodigo` local, que prueba `codigo` antes que
   * `codigoAlterno`, nunca tocaba este campo en la pantalla vieja: le llegaba un número, no un
   * objeto, y su rama de objeto no se ejecutaba nunca para `tipo`. Mismo criterio acá: el
   * `mat-select` de tipo vale directo el `codigoAlterno`.
   */
  tipos: DetalleRubro[] = [];
  readonly estados = [
    { codigo: 1, descripcion: 'Activo' },
    { codigo: 0, descripcion: 'Inactivo' },
  ];
  readonly opcionesConcilia = [
    { codigo: 1, descripcion: 'Sí' },
    { codigo: 0, descripcion: 'No' },
  ];

  // ─── Alta ────────────────────────────────────────────────────────────────
  creando = signal<boolean>(false);
  formulario: FormGroup | null = null;
  guardando = signal<boolean>(false);
  errorCreacion = signal<string | null>(null);

  // ─── Edición en sitio ───────────────────────────────────────────────────
  editando = signal<number | null>(null);
  edicion: FormGroup | null = null;
  guardandoEdicion = signal<boolean>(false);
  errorEdicion = signal<string | null>(null);

  visibles = computed(() => {
    const texto = this.filtro().trim().toLowerCase();
    if (!texto) return this.bancos();
    return this.bancos().filter((b) => (b.nombre ?? '').toLowerCase().includes(texto));
  });

  constructor(
    private fb: FormBuilder,
    private bancoService: BancoService,
    private detalleRubroService: DetalleRubroService,
    private exportService: ExportService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    this.tipos = this.detalleRubroService.getDetallesByParent(RUBRO_TIPO_BANCO);
    this.cargar();
  }

  private getEmpresaCodigo(): number | null {
    const raw = localStorage.getItem('idEmpresa');
    return raw ? parseInt(raw, 10) : null;
  }

  private cargar(): void {
    const empresaCodigo = this.getEmpresaCodigo();
    const criterios: DatosBusqueda[] = [];

    if (empresaCodigo) {
      const db = new DatosBusqueda();
      db.asignaValorConCampoPadre(
        TipoDatosBusqueda.LONG,
        'empresa',
        'codigo',
        empresaCodigo.toString(),
        TipoComandosBusqueda.IGUAL,
      );
      criterios.push(db);
    }

    const orden = new DatosBusqueda();
    orden.orderBy('nombre');
    criterios.push(orden);

    this.cargando.set(true);
    this.bancoService.selectByCriteria(criterios).subscribe({
      next: (data) => {
        this.cargando.set(false);
        this.bancos.set(Array.isArray(data) ? data : []);
      },
      error: (err) => {
        this.cargando.set(false);
        this.bancos.set([]);
        this.avisar(mensajeDeError(err, 'No se pudieron cargar los bancos.'), true);
      },
    });
  }

  tipoLabel(valor: number | null | undefined): string {
    if (valor === null || valor === undefined) return '—';
    return this.detalleRubroService.getDescripcionByParentAndAlterno(RUBRO_TIPO_BANCO, valor) || '—';
  }

  /**
   * La misma arrow que ya vivía en el `onBeforeSave` original, sin tocar: primero `codigo`,
   * después `codigoAlterno`. ⛔ **No reemplazar por la de `rrh` ni por ninguna otra**: tienen el
   * mismo nombre y el criterio invertido — acá gana `codigo`, en `rrh` gana `codigoAlterno`. Un
   * cambio así compila sin ningún aviso y graba la fila equivocada (caso real documentado: un
   * préstamo hipotecario quedó guardado como «Seguro privado»).
   */
  private extraerCodigo(valor: any): any {
    if (valor === null || valor === undefined) {
      return null;
    }
    if (typeof valor === 'object' && valor.codigo !== undefined) {
      return valor.codigo;
    }
    if (typeof valor === 'object' && valor.codigoAlterno !== undefined) {
      return valor.codigoAlterno;
    }
    return valor;
  }

  // ─── Alta ────────────────────────────────────────────────────────────────

  abrirCreacion(): void {
    this.cancelarEdicion();
    this.creando.set(true);
    this.errorCreacion.set(null);
    this.formulario = this.fb.group({
      nombre: ['', Validators.required],
      tipo: [null as number | null, Validators.required],
      concilia: [0],
      estado: [1],
    });
  }

  cancelarCreacion(): void {
    this.creando.set(false);
    this.formulario = null;
    this.errorCreacion.set(null);
  }

  confirmarCreacion(): void {
    if (!this.formulario || this.guardando()) return;
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const empresaCodigo = this.getEmpresaCodigo();
    if (!empresaCodigo) {
      this.errorCreacion.set('No se pudo determinar la empresa actual. Cierre sesión y vuelva a iniciar.');
      return;
    }

    const v = this.formulario.value;
    const cuerpo = {
      nombre: (v.nombre as string).trim().toUpperCase(),
      rubroTipoBancoH: this.extraerCodigo(v.tipo),
      conciliaDescuadre: this.extraerCodigo(v.concilia),
      estado: this.extraerCodigo(v.estado),
      empresa: empresaCodigo,
    };

    this.guardando.set(true);
    this.errorCreacion.set(null);
    this.bancoService.add(cuerpo).subscribe({
      next: (creado) => {
        this.guardando.set(false);
        if (creado) this.bancos.set([...this.bancos(), creado]);
        this.cancelarCreacion();
        this.avisar('Banco creado.');
      },
      error: (err) => {
        this.guardando.set(false);
        this.errorCreacion.set(mensajeDeError(err, 'No se pudo crear el banco.'));
      },
    });
  }

  // ─── Edición en sitio ───────────────────────────────────────────────────

  editar(banco: Banco): void {
    if (this.editando() === banco.codigo) return;
    this.cancelarCreacion();
    this.editando.set(banco.codigo);
    this.errorEdicion.set(null);
    this.edicion = this.fb.group({
      nombre: [banco.nombre, Validators.required],
      tipo: [banco.rubroTipoBancoH ?? null, Validators.required],
      concilia: [banco.conciliaDescuadre ?? 0],
      estado: [banco.estado],
    });
  }

  cancelarEdicion(): void {
    this.editando.set(null);
    this.edicion = null;
    this.errorEdicion.set(null);
  }

  /**
   * `original` es la fila cruda de `selectByCriteria`, sin adornos de presentación — a diferencia
   * del diálogo viejo de `table-basic-hijos`, que mandaba la fila ya formateada para la tabla
   * (con `conciliaLabel`/`estadoLabel` incluidas). El backend lo toleraba, pero no hay motivo para
   * seguir mandando columnas que no existen en la entidad.
   */
  confirmarEdicion(): void {
    const codigo = this.editando();
    if (codigo === null || !this.edicion || this.guardandoEdicion()) return;
    if (this.edicion.invalid) {
      this.edicion.markAllAsTouched();
      return;
    }

    const original = this.bancos().find((b) => b.codigo === codigo);
    if (!original) return;

    const v = this.edicion.value;
    const cuerpo = {
      ...original,
      nombre: (v.nombre as string).trim().toUpperCase(),
      rubroTipoBancoH: this.extraerCodigo(v.tipo),
      conciliaDescuadre: this.extraerCodigo(v.concilia),
      estado: this.extraerCodigo(v.estado),
    };

    this.guardandoEdicion.set(true);
    this.errorEdicion.set(null);
    this.bancoService.update(cuerpo).subscribe({
      next: (actualizado) => {
        this.guardandoEdicion.set(false);
        if (actualizado) {
          this.bancos.set(this.bancos().map((b) => (b.codigo === codigo ? actualizado : b)));
        }
        this.cancelarEdicion();
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.errorEdicion.set(mensajeDeError(err, 'No se pudo guardar el banco.'));
      },
    });
  }

  private readonly encabezadosExportacion = ['Descripción', 'Tipo', 'Permite Descuadre', 'Estado'];
  private readonly clavesExportacion = ['nombre', 'tipoDesc', 'conciliaLabel', 'estadoLabel'];

  private datosExportacion(): any[] {
    return this.bancos().map((b) => ({
      nombre: b.nombre ?? '',
      tipoDesc: this.tipoLabel(b.rubroTipoBancoH),
      conciliaLabel: b.conciliaDescuadre ? 'Sí' : 'No',
      estadoLabel: b.estado === 1 ? 'Activo' : 'Inactivo',
    }));
  }

  exportarCsv(): void {
    this.exportService.exportToCSV(this.datosExportacion(), 'bancos', this.encabezadosExportacion, this.clavesExportacion);
  }

  exportarPdf(): void {
    const data = this.datosExportacion();
    try {
      this.exportService.exportToPDF(data, 'bancos', 'Bancos', this.encabezadosExportacion, this.clavesExportacion);
    } catch {
      const w = window as any;
      if (typeof w.loadJsPDF === 'function') {
        w.loadJsPDF().then(() =>
          this.exportService.exportToPDF(data, 'bancos', 'Bancos', this.encabezadosExportacion, this.clavesExportacion),
        );
      }
    }
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
